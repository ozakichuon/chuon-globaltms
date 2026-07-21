import { NextResponse } from "next/server";
import https from "https";

const SUBDOMAIN = process.env.CYBOZU_SUBDOMAIN ?? "";
const LOGIN = process.env.CYBOZU_LOGIN ?? "";
const PASSWORD = process.env.CYBOZU_PASSWORD ?? "";

function toISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+09:00`;
}

function postXml(body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64");
    const url = `https://${SUBDOMAIN}.cybozu.com/office/api.cgi`;
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
        "X-Cybozu-Authorization": auth,
        "Content-Length": Buffer.byteLength(body, "utf8"),
      },
    };
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
    req.write(body, "utf8");
    req.end();
  });
}

function parseEvents(xml: string): { id: string; title: string; start: string; end: string; allDay: boolean; location: string; memo: string }[] {
  const events: { id: string; title: string; start: string; end: string; allDay: boolean; location: string; memo: string }[] = [];
  const eventMatches = xml.matchAll(/<schedule_event[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/schedule_event>/g);
  for (const m of eventMatches) {
    const id = m[1];
    const inner = m[2];
    const title = (inner.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? "";
    const location = (inner.match(/<location>([\s\S]*?)<\/location>/) ?? [])[1] ?? "";
    const memo = (inner.match(/<memo>([\s\S]*?)<\/memo>/) ?? [])[1] ?? "";
    // when要素
    const whenStart = (inner.match(/<when>[\s\S]*?<start>([\s\S]*?)<\/start>/) ?? [])[1] ?? "";
    const whenEnd = (inner.match(/<when>[\s\S]*?<end>([\s\S]*?)<\/end>/) ?? [])[1] ?? "";
    // allday
    const dateStart = (inner.match(/<date start="([^"]*)"/) ?? [])[1] ?? "";
    const allDay = !!dateStart;
    events.push({
      id,
      title: title.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
      start: dateStart || whenStart,
      end: whenEnd || dateStart,
      allDay,
      location: location.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
      memo: memo.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
    });
  }
  return events;
}

export async function GET() {
  if (!SUBDOMAIN || !LOGIN || !PASSWORD) {
    return NextResponse.json({ error: "CYBOZU_* 環境変数が未設定です" }, { status: 500 });
  }

  const now = new Date();
  // JSTで当日0時
  const jstOffset = 9 * 60 * 60 * 1000;
  const todayJST = new Date(Math.floor((now.getTime() + jstOffset) / 86400000) * 86400000 - jstOffset);
  // 30日後
  const endDate = new Date(todayJST.getTime() + 30 * 24 * 60 * 60 * 1000);

  const startStr = toISO(todayJST);
  const endStr = toISO(endDate);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ScheduleGetEvents>
      <parameters>
        <start>${startStr}</start>
        <end>${endStr}</end>
      </parameters>
    </ScheduleGetEvents>
  </soap:Body>
</soap:Envelope>`;

  try {
    const xml = await postXml(body);
    if (xml.includes("Fault") || xml.includes("error")) {
      return NextResponse.json({ error: xml.slice(0, 500) }, { status: 500 });
    }
    const events = parseEvents(xml);
    // 開始日順にソート
    events.sort((a, b) => a.start.localeCompare(b.start));
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "通信エラー" }, { status: 500 });
  }
}
