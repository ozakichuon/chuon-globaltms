// データアクセス層: Supabase接続があれば本物、なければモック
import { isSupabaseConfigured, createClient } from "./supabase/server";
import {
  careerLevels as mockCareer,
  kpiSnapshot as mockKpi,
  turnoverMock,
} from "./mock-data";
import { getAttendanceMonthly, getAttendanceDaysFor, getTopOvertime } from "./mock-attendance";
import {
  getAllEmployeesAsSummary,
  getAllVisaAlerts,
} from "./excel-data";
import type {
  AttendanceDay,
  AttendanceMonthly,
  CareerLevel,
  EmployeeSummary,
  TurnoverPoint,
  VisaAlert,
} from "./types";

// Excel実データを優先使用
const employeesMock = getAllEmployeesAsSummary();
const visaAlertsMock = getAllVisaAlerts();

export async function getEmployees(): Promise<EmployeeSummary[]> {
  if (!isSupabaseConfigured()) return employeesMock;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_employee_summary")
      .select("*")
      .eq("status", "active")
      .order("career_level", { ascending: false });
    if (error) throw error;
    return (data as EmployeeSummary[]) ?? employeesMock;
  } catch (e) {
    console.warn("Supabase fetch failed, using mock:", e);
    return employeesMock;
  }
}

export async function getEmployeeById(id: string): Promise<EmployeeSummary | null> {
  const all = await getEmployees();
  return all.find((e) => e.id === id) ?? null;
}

export async function getVisaAlerts(): Promise<VisaAlert[]> {
  if (!isSupabaseConfigured()) return visaAlertsMock;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_current_visa")
      .select("*")
      .order("days_until_expiry", { ascending: true });
    if (error) throw error;
    return (data as VisaAlert[]) ?? visaAlertsMock;
  } catch (e) {
    console.warn("Supabase fetch failed, using mock:", e);
    return visaAlertsMock;
  }
}

export async function getCareerLevels(): Promise<CareerLevel[]> {
  if (!isSupabaseConfigured()) return mockCareer;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("career_levels")
      .select("*")
      .order("level");
    if (error) throw error;
    return (data as CareerLevel[]) ?? mockCareer;
  } catch {
    return mockCareer;
  }
}

export async function getTurnover(): Promise<TurnoverPoint[]> {
  if (!isSupabaseConfigured()) return turnoverMock;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_turnover_monthly")
      .select("*")
      .order("month_start");
    if (error) throw error;
    return (data as TurnoverPoint[]) ?? turnoverMock;
  } catch {
    return turnoverMock;
  }
}

export async function getAttendanceMonthlyAll(): Promise<AttendanceMonthly[]> {
  if (!isSupabaseConfigured()) return getAttendanceMonthly();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_attendance_monthly")
      .select("*")
      .order("month_start", { ascending: false });
    if (error) throw error;
    return (data as AttendanceMonthly[]) ?? getAttendanceMonthly();
  } catch {
    return getAttendanceMonthly();
  }
}

export async function getTopOvertimeCurrentMonth(limit = 10): Promise<AttendanceMonthly[]> {
  if (!isSupabaseConfigured()) return getTopOvertime(limit);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_attendance_current_month")
      .select("*")
      .order("overtime_hours", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as AttendanceMonthly[]) ?? getTopOvertime(limit);
  } catch {
    return getTopOvertime(limit);
  }
}

export async function getAttendanceDays(
  employeeId: string,
  monthStart: string
): Promise<AttendanceDay[]> {
  if (!isSupabaseConfigured()) return getAttendanceDaysFor(employeeId, monthStart);
  try {
    const supabase = await createClient();
    const start = new Date(monthStart);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await supabase
      .from("attendance_records")
      .select("date,status,worked_minutes,overtime_minutes,clock_in,clock_out")
      .eq("employee_id", employeeId)
      .gte("date", monthStart)
      .lte("date", end)
      .order("date");
    if (error) throw error;
    return (data as AttendanceDay[]) ?? getAttendanceDaysFor(employeeId, monthStart);
  } catch {
    return getAttendanceDaysFor(employeeId, monthStart);
  }
}

export async function getKpiSnapshot() {
  if (!isSupabaseConfigured()) return mockKpi();
  const [employees, alerts, turnover] = await Promise.all([
    getEmployees(),
    getVisaAlerts(),
    getTurnover(),
  ]);
  const active = employees.filter((e) => e.status === "active");
  const foreign = active.filter((e) => e.nationality !== "JP");
  const critical = alerts.filter(
    (a) => a.alert_level === "critical" || a.alert_level === "expired"
  ).length;
  const warning = alerts.filter((a) => a.alert_level === "warning").length;
  const totalRetired12m = turnover.reduce((s, p) => s + p.retired_count, 0);
  const totalRetiredForeign12m = turnover.reduce(
    (s, p) => s + p.retired_foreign,
    0
  );
  const avgActive = Math.round(
    turnover.reduce((s, p) => s + p.active_count, 0) / Math.max(turnover.length, 1)
  );
  const avgActiveForeign = Math.round(
    turnover.reduce((s, p) => s + p.active_foreign, 0) /
      Math.max(turnover.length, 1)
  );
  return {
    activeCount: active.length,
    foreignCount: foreign.length,
    visaCritical: critical,
    visaWarning: warning,
    turnover12mPct: avgActive
      ? Math.round((totalRetired12m / avgActive) * 10000) / 100
      : 0,
    turnoverForeign12mPct: avgActiveForeign
      ? Math.round((totalRetiredForeign12m / avgActiveForeign) * 10000) / 100
      : 0,
  };
}
