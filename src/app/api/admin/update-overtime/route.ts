import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { commitFileToGitHub } from "@/lib/github-commit";
import fs from "fs";
import path from "path";

function parseTime(str: string): number {
  if (!str || !str.includes(":")) return 0;
  const [h, m] = str.split(":").map(Number);
  return h + m / 60;
}

async function parsePdfBuffer(buf: Buffer): Promise<{
  period: string;
  month_label: string;
  month_start: string;
  data: Record<string, { overtime_hours: number; worked_hours: number; midnight_hours: number }>;
}> {
  const PDFParser = (await import("pdf2json")).default;
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();
    parser.on("pdfParser_dataError", (e: any) => reject(new Error(e.parserError)));
    parser.on("pdfParser_dataReady", (pdfData: any) => {
      const result: Record<string, any> = {};
      let period = "";
      let monthLabel = "";
      let monthStart = "";

      pdfData.Pages.forEach((page: any, pageIdx: number) => {
        const texts = page.Texts.map((t: any) => ({
          x: Math.round(t.x * 10) / 10,
          y: Math.round(t.y * 10) / 10,
          text: decodeURIComponent(t.R.map((r: any) => r.T).join("")),
        })).sort((a: any, b: any) => a.y !== b.y ? a.y - b.y : a.x - b.x);

        const empLine = texts.find((t: any) => t.text.startsWith("社員CD："));
        if (!empLine) return;
        const empMatch = empLine.text.match(/社員CD：(\d+)/);
        if (!empMatch) return;
        const empCode = empMatch[1];

        if (pageIdx === 0) {
          const periodLine = texts.find((t: any) => t.text.includes("～"));
          if (periodLine) {
            const m = periodLine.text.match(/(\d{4})年(\d{2})月\[(\d{4})年(\d{2})月(\d{2})日.*～(\d{4})年(\d{2})月(\d{2})日/);
            if (m) {
              // 期間の開始月を月ラベルとして使用（例：6/21〜7/20は6月分）
              monthLabel = `${m[3]}-${m[4]}`;
              const s = `${m[3]}-${m[4].padStart(2, "0")}-${m[5].padStart(2, "0")}`;
              const e = `${m[6]}-${m[7].padStart(2, "0")}-${m[8].padStart(2, "0")}`;
              period = `${s}_${e}`;
              monthStart = `${m[3]}-${m[4]}-01`;
            }
          }
        }

        const totalRow = texts.filter((t: any) => Math.abs(t.y - 29) < 0.6);
        const findVal = (xMin: number, xMax: number) => {
          const f = totalRow.find((t: any) => t.x >= xMin && t.x <= xMax);
          return f ? f.text : null;
        };

        const hayade = parseTime(findVal(30.5, 32.5) ?? "");
        const futsu = parseTime(findVal(32.5, 34.5) ?? "");
        const shinyaR = parseTime(findVal(34.5, 36.5) ?? "");
        const shinyaJ = parseTime(findVal(36.5, 38.5) ?? "");
        const kyujitsu = parseTime(findVal(38.5, 40.5) ?? "");
        const kyuDeep = parseTime(findVal(40.5, 42.5) ?? "");
        const worked = parseTime(findVal(47.5, 49.5) ?? "");

        result[empCode] = {
          overtime_hours: Math.round((hayade + futsu + kyujitsu) * 100) / 100,
          worked_hours: Math.round(worked * 100) / 100,
          midnight_hours: Math.round((shinyaR + shinyaJ + kyuDeep) * 100) / 100,
        };
      });

      resolve({ period, month_label: monthLabel, month_start: monthStart, data: result });
    });
    (parser as any).parseBuffer(buf);
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}` && !!process.env.CRON_SECRET;
  if (!isCron) {
    const userId = await getSessionUserId();
    if (userId !== "admin") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";

    // PDFアップロード（手動更新）
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("pdf") as File | null;
      if (!file) return NextResponse.json({ error: "PDFファイルがありません" }, { status: 400 });

      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = await parsePdfBuffer(buf);

      if (!parsed.month_label) {
        return NextResponse.json({ error: "PDFから期間情報を読み取れませんでした" }, { status: 400 });
      }

      const [year, month] = parsed.month_label.split("-");
      const filePath = `src/lib/data/overtime_${year}_${month}.json`;
      const content = JSON.stringify(parsed, null, 2);
      const now = new Date().toISOString();

      if (process.env.VERCEL) {
        await commitFileToGitHub(filePath, content, `chore: 残業データ更新 ${parsed.month_label} ${now}`);
      } else {
        fs.writeFileSync(path.join(process.cwd(), filePath), content, "utf-8");
      }

      return NextResponse.json({
        ok: true,
        month_label: parsed.month_label,
        employees: Object.keys(parsed.data).length,
      });
    }

    // Driveからの自動取得（cronまたはGOOGLE_API_KEY設定済みの場合）
    const API_KEY = process.env.GOOGLE_API_KEY ?? "";
    if (!API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY が設定されていません" }, { status: 500 });
    }

    const DRIVE_FOLDER_ID = "1HYb16p25qiagDJS-cIFxi2Uu6EtEDB2a";
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${DRIVE_FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`)}&key=${API_KEY}&fields=files(id,name)`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json() as any;
    const files: { id: string; name: string }[] = listData.files ?? [];

    if (files.length === 0) {
      return NextResponse.json({ ok: true, message: "PDFファイルなし", processed: [] });
    }

    const processed: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`);
        const buf = Buffer.from(await dlRes.arrayBuffer());
        const parsed = await parsePdfBuffer(buf);

        if (!parsed.month_label) { errors.push(`${file.name}: 期間解析失敗`); continue; }

        const [year, month] = parsed.month_label.split("-");
        const filePath = `src/lib/data/overtime_${year}_${month}.json`;
        const content = JSON.stringify(parsed, null, 2);
        const now = new Date().toISOString();

        if (process.env.VERCEL) {
          await commitFileToGitHub(filePath, content, `chore: 残業データ自動更新 ${parsed.month_label} ${now}`);
        } else {
          fs.writeFileSync(path.join(process.cwd(), filePath), content, "utf-8");
        }

        processed.push(`${file.name} → ${filePath} (${Object.keys(parsed.data).length}名)`);
      } catch (e: any) {
        errors.push(`${file.name}: ${e?.message}`);
      }
    }

    return NextResponse.json({ ok: true, processed, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "不明なエラー" }, { status: 500 });
  }
}
