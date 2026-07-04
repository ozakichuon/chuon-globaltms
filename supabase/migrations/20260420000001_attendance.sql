-- ============================================================
-- 勤怠管理 + 残業アラート
-- ============================================================
-- 36協定・労基法準拠の閾値設計
-- ・月45時間：原則上限（36協定）
-- ・月60時間：割増賃金50%ライン
-- ・月80時間：過労死ライン（複数月平均）
-- ・月100時間：単月の絶対上限（特別条項）
-- ============================================================

create type attendance_status as enum (
  'normal',      -- 通常勤務
  'paid_leave',  -- 有給
  'absent',      -- 欠勤
  'late',        -- 遅刻
  'early_leave', -- 早退
  'holiday',     -- 公休
  'business_trip' -- 出張
);

create type overtime_alert as enum (
  'safe',        -- 0-30h    緑
  'notice',      -- 30-45h   黄
  'warning',     -- 45-60h   橙（36協定超過）
  'critical',    -- 60-80h   赤
  'danger'       -- 80h+     濃赤（過労死ライン）
);

-- 日次勤怠記録
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  status attendance_status not null default 'normal',

  -- 打刻
  clock_in timestamptz,
  clock_out timestamptz,
  break_minutes int default 60,

  -- 計算値（打刻から自動算出、または手入力）
  worked_minutes int default 0,           -- 実労働時間（分）
  overtime_minutes int default 0,          -- 法定外残業（分）— 日8時間超過分
  late_night_minutes int default 0,        -- 深夜労働（22:00-5:00）
  holiday_work_minutes int default 0,      -- 休日労働

  -- メタ
  note text,
  approved_by uuid references employees(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (employee_id, date)
);

create index attendance_employee_date_idx on attendance_records(employee_id, date desc);
create index attendance_date_idx on attendance_records(date desc);
create index attendance_overtime_idx on attendance_records(overtime_minutes) where overtime_minutes > 0;

comment on table attendance_records is '日次勤怠。clock_in/outから worked/overtime を自動計算するトリガを想定';

-- 月次サマリビュー（残業アラート判定）
create or replace view v_attendance_monthly as
with monthly as (
  select
    employee_id,
    date_trunc('month', date)::date as month_start,
    sum(worked_minutes) / 60.0 as worked_hours,
    sum(overtime_minutes) / 60.0 as overtime_hours,
    sum(late_night_minutes) / 60.0 as late_night_hours,
    sum(holiday_work_minutes) / 60.0 as holiday_work_hours,
    count(*) filter (where status = 'normal') as worked_days,
    count(*) filter (where status = 'paid_leave') as paid_leave_days,
    count(*) filter (where status = 'absent') as absent_days,
    count(*) filter (where status = 'late') as late_days
  from attendance_records
  group by employee_id, date_trunc('month', date)
)
select
  m.*,
  e.employee_code,
  e.display_name,
  e.nationality,
  e.employment_type,
  e.organization_id,
  case
    when m.overtime_hours >= 80 then 'danger'
    when m.overtime_hours >= 60 then 'critical'
    when m.overtime_hours >= 45 then 'warning'
    when m.overtime_hours >= 30 then 'notice'
    else 'safe'
  end::overtime_alert as alert_level,
  -- 直近3ヶ月平均（過労死ライン判定用、別途計算）
  (
    select avg(m2.overtime_hours) from (
      select sum(overtime_minutes) / 60.0 as overtime_hours
      from attendance_records ar2
      where ar2.employee_id = m.employee_id
        and ar2.date >= m.month_start - interval '2 months'
        and ar2.date < m.month_start + interval '1 month'
      group by date_trunc('month', ar2.date)
    ) m2
  ) as overtime_hours_3m_avg
from monthly m
join employees e on e.id = m.employee_id
order by month_start desc, overtime_hours desc;

-- 最新月（今日を含む月）のダッシュボード用
create or replace view v_attendance_current_month as
select *
from v_attendance_monthly
where month_start = date_trunc('month', current_date)::date;

-- 労基法違反アラート：特別条項の上限超過検知
-- （月100時間超 or 複数月平均80時間超）
create or replace view v_attendance_violations as
select
  employee_id,
  employee_code,
  display_name,
  nationality,
  month_start,
  overtime_hours,
  overtime_hours_3m_avg,
  case
    when overtime_hours >= 100 then '月100時間超（特別条項上限超）'
    when overtime_hours_3m_avg >= 80 then '3ヶ月平均80時間超（過労死ライン）'
    when overtime_hours >= 80 then '月80時間超（過労死ライン）'
  end as violation_reason
from v_attendance_monthly
where overtime_hours >= 80 or overtime_hours_3m_avg >= 80
order by month_start desc, overtime_hours desc;

-- RLS
alter table attendance_records enable row level security;

create policy "att_read_self_or_admin"
  on attendance_records for select
  to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());

create policy "att_insert_self"
  on attendance_records for insert
  to authenticated
  with check (employee_id = current_user_employee_id() or is_hr_admin());

create policy "att_update_admin_or_unapproved_self"
  on attendance_records for update
  to authenticated
  using (
    is_hr_admin()
    or (employee_id = current_user_employee_id() and approved_at is null)
  )
  with check (
    is_hr_admin()
    or (employee_id = current_user_employee_id() and approved_at is null)
  );

create policy "att_delete_admin"
  on attendance_records for delete
  to authenticated
  using (is_hr_admin());

create trigger trg_attendance_updated before update on attendance_records
  for each row execute function set_updated_at();
