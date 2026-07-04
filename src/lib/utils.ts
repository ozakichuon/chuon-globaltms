import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "2018年12月1日" 形式を Date に変換
function parseJpDate(s: string): Date {
  const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? parseJpDate(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 干支（えと）計算
const ZODIAC = ["申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未"] as const;
export function zodiacOf(birthDate: string | Date | null | undefined): string {
  if (!birthDate) return "—";
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(d.getTime())) return "—";
  return ZODIAC[(d.getFullYear() - 4 + 1200) % 12];
}

// 年齢計算
export function ageAt(birthDate: string | Date | null | undefined, ref: Date = new Date()): number | null {
  if (!birthDate) return null;
  const bd = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(bd.getTime())) return null;
  let age = ref.getFullYear() - bd.getFullYear();
  const m = ref.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < bd.getDate())) age--;
  return age;
}

export function tenureString(hiredAt: string | Date | null | undefined, now: Date = new Date()): string {
  if (!hiredAt) return "";
  const h = typeof hiredAt === "string" ? parseJpDate(hiredAt) : hiredAt;
  const months =
    (now.getFullYear() - h.getFullYear()) * 12 + (now.getMonth() - h.getMonth());
  if (months < 12) return `${months}ヶ月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y}年` : `${y}年${m}ヶ月`;
}

export function nationalityFlag(n: string): string {
  const map: Record<string, string> = {
    JP: "🇯🇵",
    ID: "🇮🇩",
    VN: "🇻🇳",
    PH: "🇵🇭",
    CN: "🇨🇳",
    NP: "🇳🇵",
    MM: "🇲🇲",
    KH: "🇰🇭",
    TH: "🇹🇭",
    BR: "🇧🇷",
  };
  return map[n] ?? "🌏";
}

export function alertColor(level: string): string {
  switch (level) {
    case "expired":
      return "bg-red-600 text-white";
    case "critical":
      return "bg-red-100 text-red-700 border border-red-200";
    case "warning":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "notice":
      return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    case "safe":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

// 小数時間 → HH:MM（10分単位に丸め）例: 43.5 → "43:30"
export function hoursToHHMM(h: number): string {
  const totalMin = Math.round(h * 60 / 10) * 10;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

export function careerLevelBadge(level: number): string {
  if (level >= 6) return "bg-purple-100 text-purple-700 border border-purple-200";
  if (level >= 5) return "bg-indigo-100 text-indigo-700 border border-indigo-200";
  if (level >= 4) return "bg-blue-100 text-blue-700 border border-blue-200";
  if (level >= 3) return "bg-sky-100 text-sky-700 border border-sky-200";
  if (level >= 2) return "bg-slate-100 text-slate-700 border border-slate-200";
  return "bg-slate-50 text-slate-500 border border-slate-200";
}
