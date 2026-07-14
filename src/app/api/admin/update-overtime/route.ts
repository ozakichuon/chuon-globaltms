import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { commitFileToGitHub } from "@/lib/github-commit";
import fs from "fs";
import path from "path";
import https from "https";

const DRIVE_FOLDER_ID = "1HYb16p25qiagDJS-cIFxi2Uu6EtEDB2a";
const API_KEY = process.env.GOOGLE_API_KEY ?? "";

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    }).on("error", reject);
  });
}

function httpsGetBinary(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGetBinary(res.headers.location).then(resolve).catch(reject);
        return;
      }
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

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
              monthLabel = `${m[1]}-${m[2]}`;
              const s = `${m[3]}-${m[4].padStart(2, "0")}-${m[5].padStart(2, "0")}`;
              const e = `${m[6]}-${m[7].padStart(2, "0")}-${m[8].padStart(2, "0")}`;
              period = `${s}_${e}`;
              monthStart = `${m[1]}-${m[2]}-01`;
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
    // pdf2json accepts Buffer via parseBuffer
    (parser as any).parseBuffer(buf);
  });
}

async function trashDriveFile(fileId: string, accessToken: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const body = JSON.stringify({ trashed: true });
    const req = https.request(
      {
        hostname: "www.googleapis.com",
        path: `/drive/v3/files/${fileId}`,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 300) resolve();
        else reject(new Error(`Trash failed: ${res.statusCode}`));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function getAccessToken(): Promise<string | null> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;
  try {
    const sa = JSON.parse(saJson);
    // Simple JWT for service account (RS256) — use fetch to Google's token endpoint
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const payload = btoa(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    // Sign with private key
    const { createSign } = await import("crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(sa.private_key, "base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${header}.${payload}.${sig}`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json() as any;
    return tokenData.access_token ?? null;
  } catch { return null; }
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
  if (!API_KEY) {
    return NextResponse.json({ error: "GOOGLE_API_KEY が設定されていません" }, { status: 500 });
  }

  try {
    // List PDF files in folder
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${DRIVE_FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`)}&key=${API_KEY}&fields=files(id,name)`;
    const listData = JSON.parse(await httpsGet(listUrl)) as any;
    const files: { id: string; name: string }[] = listData.files ?? [];

    if (files.length === 0) {
      return NextResponse.json({ ok: true, message: "PDFファイルなし", processed: 0 });
    }

    const accessToken = await getAccessToken();
    const processed: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const dlUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
        const pdfBuf = await httpsGetBinary(dlUrl);
        const parsed = await parsePdfBuffer(pdfBuf);

        if (!parsed.month_label) {
          errors.push(`${file.name}: 期間解析失敗`);
          continue;
        }

        const [year, month] = parsed.month_label.split("-");
        const filePath = `src/lib/data/overtime_${year}_${month}.json`;
        const content = JSON.stringify(parsed, null, 2);
        const now = new Date().toISOString();

        if (process.env.VERCEL) {
          await commitFileToGitHub(filePath, content, `chore: 残業データ自動更新 ${parsed.month_label} ${now}`);
        } else {
          fs.writeFileSync(path.join(process.cwd(), filePath), content, "utf-8");
        }

        if (accessToken) {
          await trashDriveFile(file.id, accessToken);
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
