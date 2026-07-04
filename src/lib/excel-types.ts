// Excelから抽出した実データ用の型定義

export interface ExcelEmployee {
  id: string;
  employee_code: string;
  display_name: string;
  furigana: string | null;
  nickname: string | null;
  nationality: string;
  nationality_jp: string | null;
  gender: "male" | "female" | null;
  birth_date: string | null;
  marital_status: string | null;
  support_agency: string | null;
  hired_at: string | null;
  expected_return: string | null;
  visa_type_jp: string | null;
  visa_status: string | null;
  address_jp: string | null;
  room_type: string | null;
  rent_burden: number | null;
  residence_card_no: string | null;
  residence_card_expires_at: string | null;
  employment_insurance_no: string | null;
  jlpt_level: string | null;
  department_head: string | null;
  temporary_retirement_date: string | null;
  temporary_return_from: string | null;
  temporary_return_to: string | null;
  rejoined: string | null;
  retired: boolean;
  retired_mark: string | null;
  retired_at: string | null;
  return_cost: number | null;
  ss1_insurance: string | null;
  ss1_entry_date: string | null;
  ss1_insurance_period: string | null;
  salary_account: string | null;
  note: string | null;
  photo_path: string | null;
  workplace: string | null;
  section: string | null;
  no: number | null;
}

export interface SupportAgency {
  id: string;
  name: string;
}

export interface Certification {
  id: string;
  name: string;
}

export interface EmployeeCertification {
  id: string;
  employee_id: string | null;
  employee_name: string;
  certification_id: string;
  certification_name: string;
  acquired_at: string | null;
  points: number | null;
  acquired_before_hire: boolean;
  workplace: string | null;
}

export interface SupportTicketResponse {
  date: string | null;
  time: string | null;
  responder: string | null;
  img1: string | null;
  img2: string | null;
  note: string | null;
}

export interface SupportTicket {
  id: string;
  seq: number | null;
  date: string | null;
  time: string | null;
  recorder: string | null;
  target_employee_code: string | null;
  target_employee_id: string | null;
  place: string | null;
  kind: string | null;
  status: string | null;
  reg_img1: string | null;
  reg_img2: string | null;
  request_note: string | null;
  responses: SupportTicketResponse[];
  overall_note: string | null;
}

export interface Dormitory {
  id: string;
  name: string;
  address: string;
  sheet_source: string;
}

export interface DormitoryRoom {
  id: string;
  dormitory_id: string;
  dormitory_name: string;
  room_no: string | null;
  room_type_label: string | null;
}

export interface DormitoryAssignment {
  id: string;
  dormitory_id: string;
  dormitory_name: string;
  room_id: string;
  room_no: string | null;
  resident_name: string;
  employee_id: string | null;
  employee_code: string | null;
  photo_url: string | null;
  rent_burden: number | null;
  workplace: string | null;
  nationality: string | null;
  visa_type: string | null;
  gender: string | null;
}

export interface ManagerCertification {
  id: string;
  name: string;
  certification_name: string;
  acquired_raw: string | null;
  expires_raw: string | null;
}

export interface RecruitmentPipeline {
  id: string;
  workplace: string | null;
  nationality: string | null;
  furigana: string | null;
  display_name: string;
  nickname: string | null;
  gender: string | null;
  birth_date: string | null;
  age: number | null;
  marital_status: string | null;
  support_agency: string | null;
  expected_hire_date_raw: string | null;
  expected_return_raw: string | null;
  visa_type_jp: string | null;
  address_jp: string | null;
  note: string | null;
}

export type OneOnOneRequestStatus = "pending" | "accepted" | "scheduled" | "completed" | "cancelled";
export type OneOnOneRequestUrgency = "low" | "medium" | "high" | "critical";

export interface OneOnOneRequest {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  employee_nationality: string;
  requested_at: string;
  topic_category: string;
  topic_label: string;
  preferred_mentor: string;
  urgency: OneOnOneRequestUrgency;
  urgency_label: string;
  language: "ja" | "id" | "vi" | "en";
  note: string | null;
  status: OneOnOneRequestStatus;
  scheduled_at: string | null;
  assigned_mentor: string | null;
  one_on_one_id: string | null;
}

export type OneOnOneMood = "great" | "ok" | "down" | "stressed";
export type OneOnOneItemKind = "question" | "concern" | "task" | "request" | "praise";
export type OneOnOneItemCategory =
  | "work" | "life" | "language" | "family" | "health"
  | "money" | "career" | "religion" | "community" | "other";
export type OneOnOneItemStatus = "open" | "in_progress" | "done" | "cancelled";
export type OneOnOneItemPriority = "low" | "medium" | "high";

export interface OneOnOne {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  employee_nationality: string;
  mentor_name: string;
  meeting_date: string;
  duration_min: number;
  location: string;
  language: "ja" | "id" | "vi" | "en";
  mood: OneOnOneMood;
  summary: string;
  next_meeting_date: string | null;
}

export interface OneOnOneItem {
  id: string;
  one_on_one_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  employee_nationality: string;
  meeting_date: string;
  mentor_name: string;
  kind: OneOnOneItemKind;
  category: OneOnOneItemCategory;
  title: string;
  detail: string;
  priority: OneOnOneItemPriority;
  status: OneOnOneItemStatus;
  assigned_to: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface Purchase {
  id: string;
  purchased_at: string | null;
  factory: string | null;
  house: string | null;
  category: string | null;
  product_name: string;
  maker: string | null;
  model: string | null;
  store: string | null;
  amount: number | null;
  warranty: string | null;
  warranty_end: string | null;
}
