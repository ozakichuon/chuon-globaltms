-- ============================================================
-- Excel取込：寮・生活サポート・採用パイプライン・備品購入履歴
-- ============================================================

-- 登録支援機関マスタ
create table if not exists support_agencies (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

-- employees に登録支援機関・呼名・フリガナ等を追加
alter table employees
  add column if not exists furigana text,
  add column if not exists nickname text,
  add column if not exists support_agency_id uuid references support_agencies(id),
  add column if not exists expected_return text,
  add column if not exists room_type text,
  add column if not exists rent_burden int,
  add column if not exists employment_insurance_no text,
  add column if not exists marital_status text,
  add column if not exists department_head text,
  add column if not exists salary_account text,
  add column if not exists temporary_retirement_date date,
  add column if not exists temporary_return_from date,
  add column if not exists temporary_return_to date,
  add column if not exists rejoined text,
  add column if not exists return_cost int,
  add column if not exists ss1_insurance text,
  add column if not exists ss1_entry_date date,
  add column if not exists ss1_insurance_period text,
  add column if not exists workplace text,
  add column if not exists section text;

comment on column employees.nickname is '呼名（実習生の通称）';
comment on column employees.workplace is '勤務地（本社/津吉/西条）';
comment on column employees.marital_status is '配偶者（有/無/夫婦 等）';

-- 寮マスタ
create table if not exists dormitories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  postal_code text,
  landlord text,
  landlord_contact text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 部屋マスタ
create table if not exists dormitory_rooms (
  id uuid primary key default gen_random_uuid(),
  dormitory_id uuid not null references dormitories(id) on delete cascade,
  room_no text,
  room_type_label text,
  rent int,
  common_fee int,
  parking_fee int,
  contract_from date,
  contract_to date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 入居割当
create table if not exists dormitory_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  resident_name text not null,
  dormitory_id uuid not null references dormitories(id),
  room_id uuid references dormitory_rooms(id),
  rent_burden int,
  moved_in_at date,
  moved_out_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index dorm_assign_emp_idx on dormitory_assignments(employee_id);
create index dorm_assign_room_idx on dormitory_assignments(room_id);

-- 生活サポート履歴
create type support_kind as enum (
  'hospital',      -- 病院
  'repair',        -- 修理
  'inquiry',       -- 問合せ
  'temp_return',   -- 一時帰国
  'resignation',   -- 退職
  'complaint',     -- クレーム
  'pregnancy',     -- 妊娠（要配慮個人情報）
  'marriage',      -- 結婚
  'phone',         -- 携帯
  'loss',          -- 紛失
  'purchase',      -- 購入
  'return_home',   -- 帰国
  'other'
);

create type support_status as enum (
  'open',
  'in_progress',   -- 対応中
  'completed',     -- 完了
  'cancelled'
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  seq int,
  opened_at timestamptz not null default now(),
  recorder text,
  employee_id uuid references employees(id) on delete set null,
  employee_code text,
  place text,
  kind support_kind not null default 'other',
  kind_label text,            -- 原文ラベル（互換性のため）
  status support_status not null default 'open',
  status_label text,
  request_note text,
  overall_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index support_tickets_employee_idx on support_tickets(employee_id);
create index support_tickets_opened_idx on support_tickets(opened_at desc);
create index support_tickets_kind_idx on support_tickets(kind);
create index support_tickets_status_idx on support_tickets(status);

-- サポート対応履歴
create table if not exists support_responses (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sequence int,
  responded_at timestamptz,
  responder text,
  note text,
  created_at timestamptz default now()
);

create index support_responses_ticket_idx on support_responses(ticket_id);

-- 採用パイプライン
create table if not exists recruitment_pipeline (
  id uuid primary key default gen_random_uuid(),
  workplace text,
  nationality text,
  furigana text,
  display_name text not null,
  nickname text,
  gender text,
  birth_date date,
  marital_status text,
  support_agency_id uuid references support_agencies(id),
  expected_hire_date_raw text,
  expected_return_raw text,
  visa_type_jp text,
  address_jp text,
  note text,
  stage text default 'planned',  -- planned / interview / decided / onboarding / hired / dropped
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index recruitment_stage_idx on recruitment_pipeline(stage);

-- 寮備品購入履歴
create table if not exists dormitory_purchases (
  id uuid primary key default gen_random_uuid(),
  purchased_at date,
  factory text,
  house text,
  category text,
  product_name text not null,
  maker text,
  model text,
  store text,
  amount int,
  warranty text,
  warranty_end date,
  created_at timestamptz default now()
);

create index dorm_purchases_house_idx on dormitory_purchases(house);

-- 日本人指導員の資格管理（技能実習制度）
create table if not exists manager_certifications (
  id uuid primary key default gen_random_uuid(),
  manager_name text not null,
  certification_name text not null,   -- 技能実習責任者 / 技能実習指導員 / 生活指導員
  acquired_at date,
  acquired_raw text,
  expires_at date,
  expires_raw text,
  issuer text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table support_agencies enable row level security;
alter table dormitories enable row level security;
alter table dormitory_rooms enable row level security;
alter table dormitory_assignments enable row level security;
alter table support_tickets enable row level security;
alter table support_responses enable row level security;
alter table recruitment_pipeline enable row level security;
alter table dormitory_purchases enable row level security;
alter table manager_certifications enable row level security;

-- マスタは全員読み取り可・管理者のみ書き込み
create policy "support_agencies_read" on support_agencies for select to authenticated using (true);
create policy "support_agencies_write" on support_agencies for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy "dormitories_read" on dormitories for select to authenticated using (true);
create policy "dormitories_write" on dormitories for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy "dorm_rooms_read" on dormitory_rooms for select to authenticated using (true);
create policy "dorm_rooms_write" on dormitory_rooms for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- 入居割当は本人と管理者
create policy "dorm_assign_read" on dormitory_assignments for select to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());
create policy "dorm_assign_write" on dormitory_assignments for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- 生活サポートは要配慮個人情報（妊娠・医療等）を含むためHRのみ
create policy "support_tickets_read_admin" on support_tickets for select to authenticated
  using (is_hr_admin());
create policy "support_tickets_write_admin" on support_tickets for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy "support_responses_read_admin" on support_responses for select to authenticated
  using (is_hr_admin());
create policy "support_responses_write_admin" on support_responses for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- 採用パイプラインはHRのみ
create policy "recruitment_read_admin" on recruitment_pipeline for select to authenticated
  using (is_hr_admin());
create policy "recruitment_write_admin" on recruitment_pipeline for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- 備品購入・指導員資格はHRのみ
create policy "dorm_purchases_admin" on dormitory_purchases for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy "mgr_cert_admin" on manager_certifications for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- 更新日時トリガ
create trigger trg_dormitories_updated before update on dormitories
  for each row execute function set_updated_at();
create trigger trg_dorm_rooms_updated before update on dormitory_rooms
  for each row execute function set_updated_at();
create trigger trg_dorm_assignments_updated before update on dormitory_assignments
  for each row execute function set_updated_at();
create trigger trg_support_tickets_updated before update on support_tickets
  for each row execute function set_updated_at();
create trigger trg_recruitment_updated before update on recruitment_pipeline
  for each row execute function set_updated_at();
create trigger trg_mgr_cert_updated before update on manager_certifications
  for each row execute function set_updated_at();
