// Excelから抽出したJSONを読み込むデータ層
import type {
  AlertLevel,
  EmployeeSummary,
  VisaAlert,
  VisaStatus,
  Nationality,
  EmploymentType,
  JLPTLevel,
} from "./types";
import type {
  Certification,
  Dormitory,
  DormitoryAssignment,
  DormitoryRoom,
  EmployeeCertification,
  ExcelEmployee,
  ManagerCertification,
  OneOnOne,
  OneOnOneItem,
  OneOnOneRequest,
  Purchase,
  RecruitmentPipeline,
  SupportAgency,
  SupportTicket,
} from "./excel-types";

import oneOnOnesJson from "./data/one_on_ones.json";
import oneOnOneItemsJson from "./data/one_on_one_items.json";
import oneOnOneRequestsJson from "./data/one_on_one_requests.json";
import employeesJson from "./data/employees.json";
import visaJson from "./data/visa_records.json";
import agenciesJson from "./data/support_agencies.json";
import certsJson from "./data/certifications.json";
import empCertsJson from "./data/employee_certifications.json";
import ticketsJson from "./data/support_tickets.json";
import dormsJson from "./data/dormitories.json";
import roomsJson from "./data/rooms.json";
import assignmentsJson from "./data/dormitory_assignments.json";
import mgrCertsJson from "./data/manager_certifications.json";
import pipelineJson from "./data/recruitment_pipeline.json";
import purchasesJson from "./data/purchases.json";

export const excelEmployees = employeesJson as unknown as ExcelEmployee[];
export const excelAgencies = agenciesJson as unknown as SupportAgency[];
export const excelCertifications = certsJson as unknown as Certification[];
export const excelEmployeeCerts = empCertsJson as unknown as EmployeeCertification[];
export const excelSupportTickets = ticketsJson as unknown as SupportTicket[];
export const excelDormitories = dormsJson as unknown as Dormitory[];
export const excelRooms = roomsJson as unknown as DormitoryRoom[];
export const excelAssignments = assignmentsJson as unknown as DormitoryAssignment[];
export const excelManagerCerts = mgrCertsJson as unknown as ManagerCertification[];
export const excelPipeline = pipelineJson as unknown as RecruitmentPipeline[];
export const excelPurchases = purchasesJson as unknown as Purchase[];
export const excelOneOnOnes = oneOnOnesJson as unknown as OneOnOne[];
export const excelOneOnOneItems = oneOnOneItemsJson as unknown as OneOnOneItem[];
export const excelOneOnOneRequests = oneOnOneRequestsJson as unknown as OneOnOneRequest[];

const NAT_JP: Record<string, string> = {
  日本: "JP", インドネシア: "ID", ベトナム: "VN", フィリピン: "PH",
  中国: "CN", ネパール: "NP", ミャンマー: "MM", カンボジア: "KH",
  タイ: "TH", ブラジル: "BR",
};

// -----------------------------------------------------
// ExcelEmployee → EmployeeSummary 変換
// -----------------------------------------------------

function daysFromNow(d: string | null): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (isNaN(t)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((t - now.getTime()) / 86400000);
}

function parseFlexDate(s: string): Date {
  const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}

function tenureMonths(hiredAt: string | null): number {
  if (!hiredAt) return 0;
  const h = parseFlexDate(hiredAt);
  if (isNaN(h.getTime())) return 0;
  const now = new Date();
  return (now.getFullYear() - h.getFullYear()) * 12 + (now.getMonth() - h.getMonth());
}

// 工場名 → 組織表示名
function workplaceToOrg(workplace: string | null): string | null {
  if (!workplace) return null;
  const map: Record<string, string> = {
    本社: "本社（小栗）",
    小栗: "本社（小栗）",
    津吉: "津吉工場",
    西条: "西条工場",
    西条ファーム: "西条ファーム",
    協同本社: "協同本社",
  };
  return map[workplace] ?? workplace;
}

function guessCareerLevel(emp: ExcelEmployee): number {
  const months = tenureMonths(emp.hired_at);
  const years = months / 12;
  const vs = emp.visa_status ?? "";
  if (vs === "specified_skill_2") return 5;
  if (vs === "specified_skill_1") {
    if (years >= 4) return 4;
    if (years >= 2) return 3;
    return 3;
  }
  if (vs === "technical_intern_3") return 3;
  if (vs === "technical_intern_2") return 3;
  if (vs === "technical_intern_1") return 2;
  return 1;
}

function careerLevelName(level: number): { ja: string; id: string } {
  const map = [
    ["見習い", "Pemula"],
    ["作業者", "Operator"],
    ["熟練工", "Operator Ahli"],
    ["リーダー", "Leader"],
    ["班長", "Kepala Tim"],
    ["現場管理者", "Manajer Lapangan"],
    ["工場幹部", "Eksekutif"],
  ];
  const p = map[level - 1] ?? map[0];
  return { ja: p[0], id: p[1] };
}

function mapVisaStatus(s: string): VisaStatus {
  const ok = [
    "technical_intern_1",
    "technical_intern_2",
    "technical_intern_3",
    "specified_skill_1",
    "specified_skill_2",
    "engineer_humanities",
    "permanent",
    "long_term",
    "spouse",
    "japanese",
    "other",
  ];
  return (ok.includes(s) ? s : "other") as VisaStatus;
}

function alertFromDays(d: number | null): AlertLevel {
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 90) return "critical";
  if (d <= 180) return "warning";
  if (d <= 365) return "notice";
  return "safe";
}

// employee_id / employee_code → photo_url のマップ（MiniAvatar等で利用）
// 旧\n新 形式の複数コードはそれぞれ個別にキー登録
export const employeePhotoMap: Map<string, string> = new Map(
  excelEmployees
    .filter((e) => (e as any).photo_url)
    .flatMap((e) => {
      const url = (e as any).photo_url as string;
      const codes = e.employee_code.split("\n").map((c: string) => c.trim()).filter(Boolean);
      return [
        [e.id, url],
        ...codes.map((c: string) => [c, url]),
      ] as [string, string][];
    })
);

export function getAllEmployeesAsSummary(): EmployeeSummary[] {
  return excelEmployees.map((e) => {
    const level = guessCareerLevel(e);
    const cname = careerLevelName(level);
    const expiresAt = e.residence_card_expires_at;
    const days = daysFromNow(expiresAt);
    // 氏名フリガナがあるなら display_name にフリガナ表記を混ぜるか、そのまま
    const displayName = e.display_name;
    // ベースNatコード（日本語名→コード変換も含む）
    const natCode = NAT_JP[e.nationality] ?? e.nationality;
    const nat: Nationality = (["JP", "ID", "VN", "PH", "CN", "NP", "MM", "KH", "TH", "BR"].includes(
      natCode
    )
      ? natCode
      : "OTHER") as Nationality;

    const vs = e.visa_status ?? "";
    const employmentType: EmploymentType = vs.startsWith("technical_intern")
      ? "technical_intern"
      : vs.startsWith("specified_skill")
      ? "specified_skill"
      : vs === "japanese"
      ? "regular"
      : "regular";

    const jlpt: JLPTLevel = (e.jlpt_level && ["N1", "N2", "N3", "N4", "N5"].includes(e.jlpt_level)
      ? e.jlpt_level
      : "none") as JLPTLevel;

    return {
      id: e.id,
      employee_code: e.employee_code,
      display_name: displayName,
      last_name_native: e.furigana,
      first_name_native: null,
      birth_date: e.birth_date,
      phone: null,
      address_jp: e.address_jp,
      postal_code: null,
      nationality: nat,
      native_language: nat === "ID" ? "id" : nat === "VN" ? "vi" : "ja",
      preferred_language: nat === "ID" ? "id" : nat === "VN" ? "vi" : "ja",
      employment_type: employmentType,
      status: e.retired ? "retired" : (e.section === "子供" && e.visa_type_jp === "特定活動") ? "child" : "active",
      hired_at: e.hired_at ?? "",
      jlpt_level: jlpt,
      career_level: level,
      career_level_name_ja: cname.ja,
      career_level_name_id: cname.id,
      organization_name: workplaceToOrg(e.workplace),
      visa_type_jp: e.visa_type_jp ?? null,
      current_visa_status: mapVisaStatus(e.visa_status),
      visa_expires_at: expiresAt,
      visa_days_until_expiry: days,
      residence_card_procedure: (e as any).residence_card_procedure ?? null,
      photo_url: (e as any).photo_url ?? null,
      tenure_months: tenureMonths(e.hired_at),
      skill_count: 0,
    };
  });
}

export function getAllVisaAlerts(): VisaAlert[] {
  return excelEmployees
    .filter(
      (e) => !e.retired && e.residence_card_expires_at && e.visa_status !== "japanese"
    )
    .map((e) => {
      const days = daysFromNow(e.residence_card_expires_at)!;
      return {
        id: e.id + "-v",
        employee_id: e.id,
        employee_code: e.employee_code,
        display_name: e.display_name,
        nationality: (["JP", "ID", "VN", "PH"].includes(NAT_JP[e.nationality] ?? e.nationality)
          ? (NAT_JP[e.nationality] ?? e.nationality)
          : "OTHER") as Nationality,
        employment_type: (e.visa_status.startsWith("technical_intern")
          ? "technical_intern"
          : "specified_skill") as EmploymentType,
        visa_status: mapVisaStatus(e.visa_status),
        residence_card_no: e.residence_card_no,
        expires_at: e.residence_card_expires_at!,
        next_renewable_from: null,
        days_until_expiry: days,
        alert_level: alertFromDays(days),
        transition_target:
          e.visa_status === "technical_intern_1"
            ? ("technical_intern_2" as VisaStatus)
            : e.visa_status === "technical_intern_2"
            ? ("specified_skill_1" as VisaStatus)
            : e.visa_status === "specified_skill_1"
            ? ("specified_skill_2" as VisaStatus)
            : null,
        residence_card_procedure: (e as any).residence_card_procedure ?? null,
      };
    })
    .sort((a, b) => a.days_until_expiry - b.days_until_expiry);
}

export function findEmployeeById(id: string): ExcelEmployee | null {
  return excelEmployees.find((e) => e.id === id) ?? null;
}

export function getEmployeeSupportTickets(employeeId: string): SupportTicket[] {
  return excelSupportTickets
    .filter((t) => t.target_employee_id === employeeId)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function getEmployeeCertifications(employeeId: string): EmployeeCertification[] {
  return excelEmployeeCerts.filter((c) => c.employee_id === employeeId);
}

export function getEmployeeAssignments(employeeId: string): DormitoryAssignment[] {
  return excelAssignments.filter((a) => a.employee_id === employeeId);
}

export function getEmployeeOneOnOnes(employeeId: string): OneOnOne[] {
  return excelOneOnOnes
    .filter((s) => s.employee_id === employeeId)
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
}

export function getOneOnOneById(id: string): OneOnOne | null {
  return excelOneOnOnes.find((s) => s.id === id) ?? null;
}

export function getOneOnOneItems(oneOnOneId: string): OneOnOneItem[] {
  return excelOneOnOneItems.filter((i) => i.one_on_one_id === oneOnOneId);
}

export function getEmployeeOneOnOneItems(employeeId: string): OneOnOneItem[] {
  return excelOneOnOneItems
    .filter((i) => i.employee_id === employeeId)
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
}

export function getEmployeeOneOnOneRequests(employeeId: string): OneOnOneRequest[] {
  return excelOneOnOneRequests
    .filter((r) => r.employee_id === employeeId)
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
}
