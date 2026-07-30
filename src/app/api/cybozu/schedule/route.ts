import { NextResponse } from "next/server";

const ICAL_URL = process.env.CYBOZU_ICAL_URL ?? "";

type CybozuEvent = {
  id: string;
  title: string;
  start: string; // "2026-07-28" or "2026-07-28T13:00:00"
  end: string;
  allDay: boolean;
  location: string;
  memo: string;
};

function unfold(ics: string): string[] {
  // ICS の折り返し行（次行が半角スペース/タブで始まる）を結合
  const rawLines = ics.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// "20260728" → "2026-07-28"　/ "20260728T130000" → "2026-07-28T13:00:00"
function toIsoLike(raw: string): { value: string; allDay: boolean } {
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/;
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/;
  let m = raw.match(dateTime);
  if (m) {
    return { value: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`, allDay: false };
  }
  m = raw.match(dateOnly);
  if (m) {
    return { value: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
  }
  return { value: raw, allDay: false };
}

function parseIcs(ics: string): CybozuEvent[] {
  const lines = unfold(ics);
  const events: CybozuEvent[] = [];
  let cur: Record<string, string> | null = null;
  let idx = 0;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const startRaw = cur["DTSTART"] ?? "";
        const endRaw = cur["DTEND"] ?? startRaw;
        const start = toIsoLike(startRaw);
        const end = toIsoLike(endRaw);
        events.push({
          id: cur["UID"] ?? `ev-${idx++}`,
          title: unescapeText(cur["SUMMARY"] ?? "(無題)"),
          start: start.value,
          end: end.value,
          allDay: start.allDay,
          location: unescapeText(cur["LOCATION"] ?? ""),
          memo: unescapeText(cur["DESCRIPTION"] ?? ""),
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const rawKey = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    // "DTSTART;VALUE=DATE" や "DTSTART;TZID=Asia/Tokyo" のようなパラメータ付きキーに対応
    const key = rawKey.split(";")[0].toUpperCase();
    if (["DTSTART", "DTEND", "SUMMARY", "LOCATION", "DESCRIPTION", "UID"].includes(key)) {
      cur[key] = value;
    }
  }

  return events;
}

export async function GET() {
  if (!ICAL_URL) {
    return NextResponse.json({ error: "CYBOZU_ICAL_URL 環境変数が未設定です" }, { status: 500 });
  }

  try {
    const res = await fetch(ICAL_URL, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `iCalendar取得エラー: ${res.status}` }, { status: 500 });
    }
    const ics = await res.text();
    const events = parseIcs(ics);
    events.sort((a, b) => a.start.localeCompare(b.start));
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "通信エラー" }, { status: 500 });
  }
}
