-- ============================================================
-- 中温 Talent Management System - Initial Schema
-- ============================================================
-- Designed for: 株式会社中温（食品加工・水煮野菜）
-- Employees: ~250, foreign (Indonesia, Technical Intern) majority
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

create type user_role as enum (
  'master',        -- 経営者 / 最上位管理者
  'hr_admin',      -- 人事・労務担当
  'line_manager',  -- 班長・ライン管理者
  'employee'       -- 一般従業員（自分のデータのみ閲覧）
);

create type employment_type as enum (
  'regular',           -- 正社員
  'contract',          -- 契約社員
  'part_time',         -- パート・アルバイト
  'technical_intern',  -- 技能実習生
  'specified_skill',   -- 特定技能
  'engineer'           -- 技術・人文知識・国際業務
);

create type visa_status as enum (
  'japanese',              -- 日本人
  'permanent',             -- 永住者
  'long_term',             -- 定住者
  'spouse',                -- 日本人配偶者等
  'technical_intern_1',    -- 技能実習1号
  'technical_intern_2',    -- 技能実習2号
  'technical_intern_3',    -- 技能実習3号
  'specified_skill_1',     -- 特定技能1号
  'specified_skill_2',     -- 特定技能2号
  'engineer_humanities',   -- 技人国
  'other'
);

create type nationality as enum (
  'JP', 'ID', 'VN', 'PH', 'CN', 'NP', 'MM', 'KH', 'TH', 'BR', 'OTHER'
);

create type gender as enum ('male', 'female', 'other', 'prefer_not');

create type language as enum ('ja', 'id', 'vi', 'en');

create type jlpt_level as enum ('none', 'N5', 'N4', 'N3', 'N2', 'N1');

create type employee_status as enum (
  'active',      -- 在籍中
  'on_leave',    -- 休職中
  'retired',     -- 退職済み
  'returned',    -- 帰国済（実習生等）
  'transferred'  -- 異動済
);

create type condition_level as enum ('great', 'ok', 'tired', 'bad');

-- ------------------------------------------------------------
-- CORE TABLES
-- ------------------------------------------------------------

-- 組織（工場・ライン）
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- 例: "本社工場"
  name_id text,                          -- インドネシア語表示名
  parent_id uuid references organizations(id),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table organizations is '工場・ライン・班などの組織階層';

-- 従業員マスタ
create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique not null,    -- 社員番号

  -- 認証リンク（Supabase auth.users への紐付け。本人ログインに使う）
  auth_user_id uuid unique,              -- auth.users.id への参照（optional）

  -- 基本情報
  last_name text not null,
  first_name text not null,
  last_name_kana text,
  first_name_kana text,
  last_name_native text,                 -- 母国語表記（例: インドネシア語の氏名）
  first_name_native text,
  display_name text generated always as (last_name || ' ' || first_name) stored,

  birth_date date,
  gender gender,
  nationality nationality not null default 'JP',
  native_language language not null default 'ja',
  preferred_language language not null default 'ja',  -- UI言語選好
  photo_url text,

  -- 連絡先
  phone text,
  email text,
  address_jp text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,

  -- 家族（母国）
  home_family_name text,                 -- 家族代表
  home_family_contact text,              -- メール or LINE
  is_family_sharing_enabled boolean default false,

  -- 雇用
  employment_type employment_type not null,
  organization_id uuid references organizations(id),
  hired_at date not null,
  retired_at date,
  status employee_status not null default 'active',

  -- 日本語
  jlpt_level jlpt_level default 'none',
  jlpt_certified_at date,
  japanese_speaking_level int default 1 check (japanese_speaking_level between 1 and 5),

  -- 宗教・配慮
  religion text,                         -- 例: 'muslim', 'buddhist', null
  dietary_restriction text,              -- 例: 'halal', 'vegetarian'
  needs_prayer_room boolean default false,

  -- キャリア
  career_level int default 1 check (career_level between 1 and 7),

  -- 健康
  has_allergy boolean default false,
  allergy_notes text,

  -- メタ
  notes text,                            -- 管理者メモ
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index employees_status_idx on employees(status) where status = 'active';
create index employees_organization_idx on employees(organization_id);
create index employees_nationality_idx on employees(nationality);
create index employees_career_level_idx on employees(career_level);

comment on table employees is '従業員マスタ。全ての人事データの中心';

-- 在留資格（期限管理の核）
create table visa_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  visa_status visa_status not null,
  residence_card_no text,                -- 在留カード番号
  issued_at date,
  expires_at date,                       -- これが最重要
  next_renewable_from date,              -- 更新可能開始日
  is_current boolean default true,       -- 現行の在留資格か
  transition_target visa_status,         -- 次に移行したいビザ
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index visa_records_employee_idx on visa_records(employee_id);
create index visa_records_expires_idx on visa_records(expires_at) where is_current = true;
create index visa_records_current_idx on visa_records(employee_id) where is_current = true;

comment on table visa_records is '在留資格履歴。current=trueのものが現行。期限アラートはここから';

-- ------------------------------------------------------------
-- スキル・資格
-- ------------------------------------------------------------

create table skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- 例: "原料処理"
  name_id text,                          -- インドネシア語
  description text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references skill_categories(id),
  code text unique not null,             -- 例: "RAW_TAKENOKO_PEEL"
  name text not null,                    -- 例: "たけのこ皮むき"
  name_id text,
  description text,
  max_level int default 3 check (max_level between 1 and 5),
  required_for_career_level int,         -- このスキルがLv◯昇格に必須
  points_contribution int default 10,    -- 昇格ポイントへの寄与
  sort_order int default 0,
  created_at timestamptz default now()
);

create table employee_skills (
  employee_id uuid not null references employees(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  level int not null default 0 check (level between 0 and 5),
  acquired_at date,
  verified_by uuid references employees(id), -- 上司承認
  verified_at timestamptz,
  notes text,
  updated_at timestamptz default now(),
  primary key (employee_id, skill_id)
);

create index employee_skills_employee_idx on employee_skills(employee_id);

-- 資格（外部資格：HACCP、JLPTなど）
create table certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- 例: "HACCP基礎"
  issuer text,                           -- 発行機関
  is_japanese_language boolean default false,
  expires_after_months int,              -- 有効期限月数（nullなら永続）
  created_at timestamptz default now()
);

create table employee_certifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  certification_id uuid not null references certifications(id),
  acquired_at date not null,
  expires_at date,
  certificate_url text,                  -- 証明書PDFのstorage URL
  created_at timestamptz default now()
);

create index employee_certifications_employee_idx on employee_certifications(employee_id);

-- ------------------------------------------------------------
-- キャリアラダー
-- ------------------------------------------------------------

create table career_levels (
  level int primary key check (level between 1 and 7),
  name_ja text not null,                 -- "見習い", "作業者", etc
  name_id text not null,                 -- インドネシア語
  description_ja text,
  description_id text,
  min_skill_count int default 0,         -- 必要スキル数
  min_jlpt_level jlpt_level default 'none',
  min_tenure_months int default 0,
  min_mentor_count int default 0,
  hourly_wage_delta int default 0,       -- このLvでの時給増加分（円）
  sort_order int
);

-- 昇格履歴
create table career_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  from_level int,
  to_level int not null,
  promoted_at date not null,
  approved_by uuid references employees(id),
  reason text,
  created_at timestamptz default now()
);

create index career_history_employee_idx on career_history(employee_id);

-- ------------------------------------------------------------
-- エンゲージメント：日次コンディション
-- ------------------------------------------------------------

create table daily_conditions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  level condition_level not null,
  note text,                             -- 自由入力（母語OK）
  created_at timestamptz default now(),
  unique (employee_id, date)
);

create index daily_conditions_employee_date_idx on daily_conditions(employee_id, date desc);
create index daily_conditions_date_idx on daily_conditions(date desc);

-- ------------------------------------------------------------
-- ビザ移行プラン（「残る理由」を可視化するための計画）
-- ------------------------------------------------------------

create table visa_transition_plans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  target_status visa_status not null,
  planned_transition_date date,
  required_jlpt jlpt_level,
  required_skill_exam text,              -- 技能試験名
  jlpt_exam_fee_covered boolean default true,   -- 会社が受験料負担
  skill_exam_fee_covered boolean default true,
  estimated_income_5yr bigint,           -- 5年継続した場合の想定収入
  estimated_income_10yr bigint,          -- 永住到達時の想定収入
  status text default 'planning',        -- planning / in_progress / achieved / abandoned
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index visa_transition_plans_employee_idx on visa_transition_plans(employee_id);

-- ------------------------------------------------------------
-- 監査ログ
-- ------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,                         -- auth.users.id
  action text not null,
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);
create index audit_logs_actor_idx on audit_logs(actor_id);
create index audit_logs_created_idx on audit_logs(created_at desc);

-- ------------------------------------------------------------
-- 権限管理（Supabase Auth連携）
-- ------------------------------------------------------------

create table user_roles (
  user_id uuid primary key,              -- auth.users.id
  employee_id uuid references employees(id),
  role user_role not null default 'employee',
  granted_at timestamptz default now(),
  granted_by uuid
);

-- ------------------------------------------------------------
-- 更新日時の自動更新トリガ
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();
create trigger trg_employees_updated before update on employees
  for each row execute function set_updated_at();
create trigger trg_visa_records_updated before update on visa_records
  for each row execute function set_updated_at();
create trigger trg_employee_skills_updated before update on employee_skills
  for each row execute function set_updated_at();
create trigger trg_visa_transition_plans_updated before update on visa_transition_plans
  for each row execute function set_updated_at();
