// 勤怠データ：実績月はPDFから取得、他はモック生成

import { getAllEmployeesAsSummary } from "./excel-data";
import type { AttendanceDay, AttendanceMonthly, OvertimeAlert } from "./types";
import overtimeReal04 from "./data/overtime_2026_04.json";
import overtimeReal05 from "./data/overtime_2026_05.json";
import overtimeReal06 from "./data/overtime_2026_06.json";

const employeesMock = getAllEmployeesAsSummary();

function alertFromOvertime(h: number): OvertimeAlert {
  if (h >= 80) return "danger";
  if (h >= 60) return "critical";
  if (h >= 45) return "warning";
  if (h >= 30) return "notice";
  return "safe";
}

// 社員ごとの「残業傾向」を疑似設定（employee_code末尾で決める）
function overtimeProfile(code: string): "heavy" | "medium" | "light" {
  const last = code.slice(-1);
  // E0007 Ahmad, E0011 Siti → heavy
  if (code === "E0007" || code === "E0011") return "heavy";
  if (code === "E0003" || code === "E0005" || code === "E0018") return "heavy";
  if (code === "E0009" || code === "E0012") return "medium";
  const n = parseInt(last, 10);
  if (Number.isNaN(n)) return "medium";
  if (n % 3 === 0) return "heavy";
  if (n % 3 === 1) return "medium";
  return "light";
}

function baseOvertimeHours(profile: ReturnType<typeof overtimeProfile>, monthOffset: number): number {
  // monthOffset: 0 = 今月, -1 = 先月, -2 = 2ヶ月前
  const seed = Math.abs(monthOffset) * 7 + (profile === "heavy" ? 50 : profile === "medium" ? 30 : 10);
  switch (profile) {
    case "heavy":
      return 55 + (monthOffset === 0 ? 30 : monthOffset === -1 ? 25 : 20) + (seed % 15);
    case "medium":
      return 25 + (monthOffset === 0 ? 10 : 8) + (seed % 10);
    case "light":
      return 5 + (seed % 12);
  }
}

function baseWorkedHours(profile: ReturnType<typeof overtimeProfile>, monthOffset: number): number {
  return 160 + baseOvertimeHours(profile, monthOffset) * 0.6;
}

type RealEntry = {
  worked_hours: number;
  overtime_hours: number;
  midnight_hours: number;
};
// 実績データ: month_start → { code → RealEntry }
const realDataByMonth: Record<string, Record<string, RealEntry>> = {};
for (const src of [overtimeReal04, overtimeReal05, overtimeReal06] as any[]) {
  const monthStart: string = src.month_start;
  const map: Record<string, RealEntry> = {};
  for (const [code, val] of Object.entries(src.data as Record<string, RealEntry>)) {
    map[code] = val;
  }
  realDataByMonth[monthStart] = map;
}

// 管理表の社員コードが「旧\n新」の形式の場合、両方で検索
function findOvertime(employeeCode: string, monthStart: string): RealEntry | undefined {
  const map = realDataByMonth[monthStart];
  if (!map) return undefined;
  const codes = employeeCode.split("\n").map((c) => c.trim());
  for (const c of codes) {
    if (map[c]) return map[c];
  }
  return undefined;
}

export function getAttendanceMonthly(): AttendanceMonthly[] {
  const now = new Date();
  // 集計期間は21日〜翌月20日。20日以下は前月が当期
  const periodBase = now.getDate() <= 20
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const results: AttendanceMonthly[] = [];

  const active = employeesMock.filter((e) => e.status === "active");

  for (let offset = 0; offset >= -2; offset--) {
    const monthStart = new Date(periodBase.getFullYear(), periodBase.getMonth() + offset, 1);
    const y = monthStart.getFullYear();
    const m = String(monthStart.getMonth() + 1).padStart(2, "0");
    const monthStartStr = `${y}-${m}-01`;
    for (const e of active) {
      const profile = overtimeProfile(e.employee_code);
      const realEntry = findOvertime(e.employee_code, monthStartStr);
      const isRealMonth = monthStartStr in realDataByMonth;
      const overtime = realEntry != null
        ? Math.round(realEntry.overtime_hours * 10) / 10
        : isRealMonth ? 0 : Math.round(baseOvertimeHours(profile, offset) * 10) / 10;
      const worked = realEntry != null
        ? Math.round(realEntry.worked_hours * 10) / 10
        : isRealMonth ? 0 : Math.round(baseWorkedHours(profile, offset) * 10) / 10;
      const lateNight = realEntry != null
        ? Math.round(realEntry.midnight_hours * 10) / 10
        : isRealMonth ? 0 : Math.round(overtime * 0.2 * 10) / 10;
      // 前2ヶ月（当期の前月・前々月）の平均残業
      const prev1 = new Date(periodBase.getFullYear(), periodBase.getMonth() - 1, 1);
      const prev2 = new Date(periodBase.getFullYear(), periodBase.getMonth() - 2, 1);
      const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const prev1Key = toKey(prev1);
      const prev2Key = toKey(prev2);
      const p1 = findOvertime(e.employee_code, prev1Key);
      const p2 = findOvertime(e.employee_code, prev2Key);
      const avg3m = (p1 != null || p2 != null)
        ? ((p1?.overtime_hours ?? 0) + (p2?.overtime_hours ?? 0)) / ((p1 != null ? 1 : 0) + (p2 != null ? 1 : 0))
        : (baseOvertimeHours(profile, -1) + baseOvertimeHours(profile, -2)) / 2;

      results.push({
        employee_id: e.id,
        employee_code: e.employee_code,
        display_name: e.display_name,
        nationality: e.nationality,
        employment_type: e.employment_type,
        month_start: monthStartStr,
        worked_hours: worked,
        overtime_hours: overtime,
        late_night_hours: lateNight,
        holiday_work_hours: profile === "heavy" ? 8 : 0,
        worked_days: 20,
        paid_leave_days: profile === "heavy" ? 0 : 1,
        absent_days: 0,
        late_days: profile === "light" ? 0 : 1,
        alert_level: alertFromOvertime(overtime),
        overtime_hours_3m_avg: Math.round(avg3m * 10) / 10,
      });
    }
  }

  return results;
}

export function getAttendanceDaysFor(
  employeeId: string,
  monthStart: string
): AttendanceDay[] {
  const emp = employeesMock.find((e) => e.id === employeeId);
  if (!emp) return [];
  const profile = overtimeProfile(emp.employee_code);
  const start = new Date(monthStart);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const days: AttendanceDay[] = [];
  for (let d = 1; d <= end.getDate(); d++) {
    const date = new Date(start.getFullYear(), start.getMonth(), d);
    const dow = date.getDay();
    const iso = date.toISOString().slice(0, 10);
    if (dow === 0) {
      days.push({
        date: iso,
        status: "holiday",
        worked_minutes: 0,
        overtime_minutes: 0,
        clock_in: null,
        clock_out: null,
      });
      continue;
    }
    // 平日・土曜
    const base = profile === "heavy" ? 8 * 60 : 8 * 60;
    const extra =
      profile === "heavy" ? (dow === 6 ? 300 : 150) : profile === "medium" ? 60 : 15;
    const worked = base + extra;
    const overtime = Math.max(0, worked - 8 * 60);
    const clockInH = 8;
    const clockOutH = 8 + Math.floor(worked / 60) + 1; // +1h for break
    days.push({
      date: iso,
      status: dow === 6 && profile !== "heavy" ? "holiday" : "normal",
      worked_minutes: worked,
      overtime_minutes: overtime,
      clock_in: `${iso}T${String(clockInH).padStart(2, "0")}:00:00+09:00`,
      clock_out: `${iso}T${String(clockOutH).padStart(2, "0")}:00:00+09:00`,
    });
  }
  return days;
}

// 残業時間が高い社員トップN（現在月）
export function getTopOvertime(limit = 20): AttendanceMonthly[] {
  const current = getAttendanceMonthly();
  const now = new Date();
  const periodBase = now.getDate() <= 20
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = `${periodBase.getFullYear()}-${String(periodBase.getMonth() + 1).padStart(2, "0")}-01`;
  return current
    .filter((r) => r.month_start === thisMonth)
    .sort((a, b) => b.overtime_hours - a.overtime_hours)
    .slice(0, limit);
}
