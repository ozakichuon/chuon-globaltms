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

// 期間内の全日付を生成
function periodDates(startStr: string, endStr: string): Date[] {
  const dates: Date[] = [];
  const cur = new Date(startStr);
  const end = new Date(endStr);
  while (cur <= end) { dates.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return dates;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function parsePdfBuffer(buf: Buffer, debug = false): Promise<{
  period: string;
  month_label: string;
  month_start: string;
  data: Record<string, { overtime_hours: number; worked_hours: number; midnight_hours: number; daily: Record<string, number | null> }>;
  debugRows?: any[];
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
      let periodStart = "";
      let periodEnd = "";
      const debugRows: any[] = [];

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
              monthLabel = `${m[3]}-${m[4]}`;
              periodStart = `${m[3]}-${m[4].padStart(2, "0")}-${m[5].padStart(2, "0")}`;
              periodEnd   = `${m[6]}-${m[7].padStart(2, "0")}-${m[8].padStart(2, "0")}`;
              period = `${periodStart}_${periodEnd}`;
              monthStart = `${m[3]}-${m[4]}-01`;
            }
          }
        }

        const findVal = (row: any[], xMin: number, xMax: number) => {
          const f = row.find((t: any) => t.x >= xMin && t.x <= xMax);
          return f ? f.text : null;
        };

        // 合計行を探す（「合計」テキストがある行）
        const goukeiText = texts.find((t: any) => t.text === "合計");
        const totalY = goukeiText ? goukeiText.y : 29;
        const totalRow = texts.filter((t: any) => Math.abs(t.y - totalY) < 0.6);

        const hayade   = parseTime(findVal(totalRow, 30.5, 32.5) ?? "");
        const futsu    = parseTime(findVal(totalRow, 32.5, 34.5) ?? "");
        const shinyaR  = parseTime(findVal(totalRow, 34.5, 36.5) ?? "");
        const shinyaJ  = parseTime(findVal(totalRow, 36.5, 38.5) ?? "");
        const kyujitsu = parseTime(findVal(totalRow, 38.5, 40.5) ?? "");
        const kyuDeep  = parseTime(findVal(totalRow, 40.5, 42.5) ?? "");
        const worked   = parseTime(findVal(totalRow, 47.5, 49.5) ?? "");

        // 日別残業を抽出
        const dailyMap: Record<string, number | null> = {};

        if (periodStart && periodEnd) {
          // y位置でグループ化
          const yGroups: Record<string, any[]> = {};
          for (const t of texts) {
            if (t.y > 4 && t.y < totalY - 0.3) {
              const key = t.y.toFixed(1);
              if (!yGroups[key]) yGroups[key] = [];
              yGroups[key].push(t);
            }
          }
          const sortedYs = Object.keys(yGroups).map(Number).sort((a, b) => a - b);

          // デバッグ：最初のページの全行を収集
          if (debug && pageIdx === 0) {
            for (const y of sortedYs) {
              const row = yGroups[y.toFixed(1)];
              debugRows.push({ y, texts: row.map((t: any) => ({ x: t.x, text: t.text })) });
            }
          }

          for (const y of sortedYs) {
            const row = yGroups[y.toFixed(1)];
            // MM/DD 形式の日付テキストを探す（例: 06/21）
            const dayText = row.find((t: any) => /^\d{1,2}\/\d{1,2}$/.test(t.text.trim()));
            if (!dayText) continue;
            const [mm, dd] = dayText.text.trim().split("/").map(Number);
            const year = periodStart.slice(0, 4);
            const dateStr = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
            // 期間外は除外
            if (dateStr < periodStart || dateStr > periodEnd) continue;

            // 実働合計 - 給与実働 = 残業
            // x座標はデバッグで確認後に調整（暫定値）
            const jitsuDoKeisan = findVal(row, 47.5, 52.0); // 実働合計
            const kyuyoJitsu   = findVal(row, 52.0, 56.5);  // 給与実働
            if (!jitsuDoKeisan && !kyuyoJitsu) {
              dailyMap[dateStr] = null; // 両方空欄 → "-"
            } else {
              const total = parseTime(jitsuDoKeisan ?? "");
              const kyu   = parseTime(kyuyoJitsu ?? "");
              dailyMap[dateStr] = Math.round(Math.max(0, total - kyu) * 100) / 100;
            }
          }
        }

        result[empCode] = {
          overtime_hours: Math.round((hayade + futsu + kyujitsu) * 100) / 100,
          worked_hours: Math.round(worked * 100) / 100,
          midnight_hours: Math.round((shinyaR + shinyaJ + kyuDeep) * 100) / 100,
          daily: dailyMap,
        };
      });

      resolve({ period, month_label: monthLabel, month_start: monthStart, data: result, debugRows: debug ? debugRows : undefined });
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

      const debugMode = new URL(req.url).searchParams.get("debug") === "1";
      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = await parsePdfBuffer(buf, debugMode);

      if (debugMode) {
        return NextResponse.json({ debug: true, debugRows: parsed.debugRows, month_label: parsed.month_label, employees: Object.keys(parsed.data).length });
      }

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
