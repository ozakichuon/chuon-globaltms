export type Nationality =
  | "JP" | "ID" | "VN" | "PH" | "CN" | "NP" | "MM" | "KH" | "TH" | "BR" | "OTHER";

export type Language = "ja" | "id" | "vi" | "en";

export type EmploymentType =
  | "regular"
  | "contract"
  | "part_time"
  | "technical_intern"
  | "specified_skill"
  | "engineer";

export type VisaStatus =
  | "japanese"
  | "permanent"
  | "long_term"
  | "spouse"
  | "technical_intern_1"
  | "technical_intern_2"
  | "technical_intern_3"
  | "specified_skill_1"
  | "specified_skill_2"
  | "engineer_humanities"
  | "other";

export type EmployeeStatus =
  | "active" | "on_leave" | "retired" | "returned" | "transferred" | "child";

export type JLPTLevel = "none" | "N5" | "N4" | "N3" | "N2" | "N1";

export type AlertLevel = "expired" | "critical" | "warning" | "notice" | "safe" | "none";

export type ConditionLevel = "great" | "ok" | "tired" | "bad";

export interface EmployeeSummary {
  id: string;
  employee_code: string;
  display_name: string;
  last_name_native: string | null;
  first_name_native: string | null;
  // 基本情報（日本人個人情報フォーマット準拠）
  birth_date: string | null;       // 生年月日
  phone: string | null;            // TEL
  address_jp: string | null;       // 住所
  postal_code: string | null;      // 〒
  nationality: Nationality;
  native_language: Language;
  preferred_language: Language;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  hired_at: string;
  jlpt_level: JLPTLevel;
  career_level: number;
  career_level_name_ja: string | null;
  career_level_name_id: string | null;
  organization_name: string | null;
  visa_type_jp: string | null;
  current_visa_status: VisaStatus | null;
  visa_expires_at: string | null;
  visa_days_until_expiry: number | null;
  residence_card_procedure: string | null;
  photo_url: string | null;
  tenure_months: number;
  skill_count: number;
  nickname: string | null;
  gender: "male" | "female" | null;
}

export interface VisaAlert {
  id: string;
  employee_id: string;
  employee_code: string;
  display_name: string;
  nationality: Nationality;
  employment_type: EmploymentType;
  visa_status: VisaStatus;
  residence_card_no: string | null;
  expires_at: string;
  next_renewable_from: string | null;
  days_until_expiry: number;
  alert_level: AlertLevel;
  transition_target: VisaStatus | null;
  residence_card_procedure: string | null;
}

export interface CareerLevel {
  level: number;
  name_ja: string;
  name_id: string;
  description_ja: string | null;
  description_id: string | null;
  min_skill_count: number;
  min_jlpt_level: JLPTLevel;
  min_tenure_months: number;
  min_mentor_count: number;
  hourly_wage_delta: number;
}

export interface TurnoverPoint {
  month_start: string;
  active_count: number;
  active_foreign: number;
  retired_count: number;
  retired_foreign: number;
  turnover_rate_pct: number;
  turnover_rate_foreign_pct: number;
}

export type OvertimeAlert = "safe" | "notice" | "warning" | "critical" | "danger";

export interface AttendanceMonthly {
  employee_id: string;
  employee_code: string;
  display_name: string;
  nationality: Nationality;
  employment_type: EmploymentType;
  month_start: string;
  worked_hours: number;
  overtime_hours: number;
  late_night_hours: number;
  holiday_work_hours: number;
  worked_days: number;
  paid_leave_days: number;
  absent_days: number;
  late_days: number;
  alert_level: OvertimeAlert;
  overtime_hours_3m_avg: number | null;
}

export interface AttendanceDay {
  date: string;
  status: "normal" | "paid_leave" | "absent" | "late" | "early_leave" | "holiday" | "business_trip";
  worked_minutes: number;
  overtime_minutes: number;
  clock_in: string | null;
  clock_out: string | null;
}
