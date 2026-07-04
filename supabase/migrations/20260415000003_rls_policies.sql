-- ============================================================
-- Row Level Security Policies
-- ============================================================
-- 原則:
-- - master / hr_admin: 全データ読み書き
-- - line_manager: 自組織配下のみ読み取り
-- - employee: 自分のデータのみ
-- ============================================================

alter table organizations enable row level security;
alter table employees enable row level security;
alter table visa_records enable row level security;
alter table skill_categories enable row level security;
alter table skills enable row level security;
alter table employee_skills enable row level security;
alter table certifications enable row level security;
alter table employee_certifications enable row level security;
alter table career_levels enable row level security;
alter table career_history enable row level security;
alter table daily_conditions enable row level security;
alter table visa_transition_plans enable row level security;
alter table audit_logs enable row level security;
alter table user_roles enable row level security;

-- Helper: 現在ユーザーのロール取得
create or replace function current_user_role()
returns user_role
language sql stable security definer
as $$
  select role from user_roles where user_id = auth.uid();
$$;

-- Helper: 現在ユーザーの employee_id
create or replace function current_user_employee_id()
returns uuid
language sql stable security definer
as $$
  select employee_id from user_roles where user_id = auth.uid();
$$;

-- Helper: 管理者か
create or replace function is_hr_admin()
returns boolean
language sql stable security definer
as $$
  select coalesce(current_user_role() in ('master', 'hr_admin'), false);
$$;

-- ---------- organizations ----------
create policy "org_read_all_authenticated"
  on organizations for select
  to authenticated using (true);

create policy "org_write_hr_admin"
  on organizations for all
  to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

-- ---------- employees ----------
create policy "emp_read_self"
  on employees for select
  to authenticated
  using (id = current_user_employee_id() or is_hr_admin());

create policy "emp_write_hr_admin"
  on employees for all
  to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

create policy "emp_update_self_limited"
  on employees for update
  to authenticated
  using (id = current_user_employee_id())
  with check (id = current_user_employee_id());

-- ---------- visa_records ----------
create policy "visa_read_self_or_admin"
  on visa_records for select
  to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());

create policy "visa_write_hr_admin"
  on visa_records for all
  to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

-- ---------- skill_categories / skills / certifications （マスタ） ----------
create policy "skill_cat_read_all" on skill_categories for select to authenticated using (true);
create policy "skill_cat_write_admin" on skill_categories for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy "skills_read_all" on skills for select to authenticated using (true);
create policy "skills_write_admin" on skills for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy "cert_read_all" on certifications for select to authenticated using (true);
create policy "cert_write_admin" on certifications for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- ---------- employee_skills ----------
create policy "emp_skills_read_self_or_admin"
  on employee_skills for select
  to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());

create policy "emp_skills_write_admin"
  on employee_skills for all
  to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- ---------- employee_certifications ----------
create policy "emp_cert_read_self_or_admin"
  on employee_certifications for select
  to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());

create policy "emp_cert_write_admin"
  on employee_certifications for all
  to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- ---------- career_levels （マスタ） ----------
create policy "career_lv_read_all" on career_levels for select to authenticated using (true);
create policy "career_lv_write_admin" on career_levels for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- ---------- career_history ----------
create policy "career_hist_read_self_or_admin"
  on career_history for select
  to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());

create policy "career_hist_write_admin"
  on career_history for all
  to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- ---------- daily_conditions ----------
create policy "cond_read_self_or_admin"
  on daily_conditions for select
  to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());

create policy "cond_insert_self"
  on daily_conditions for insert
  to authenticated
  with check (employee_id = current_user_employee_id());

create policy "cond_update_self"
  on daily_conditions for update
  to authenticated
  using (employee_id = current_user_employee_id())
  with check (employee_id = current_user_employee_id());

-- ---------- visa_transition_plans ----------
create policy "plan_read_self_or_admin"
  on visa_transition_plans for select
  to authenticated
  using (employee_id = current_user_employee_id() or is_hr_admin());

create policy "plan_write_admin"
  on visa_transition_plans for all
  to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- ---------- audit_logs ----------
create policy "audit_read_admin"
  on audit_logs for select
  to authenticated
  using (is_hr_admin());

create policy "audit_insert_any"
  on audit_logs for insert
  to authenticated
  with check (true);

-- ---------- user_roles ----------
create policy "roles_read_self_or_admin"
  on user_roles for select
  to authenticated
  using (user_id = auth.uid() or is_hr_admin());

create policy "roles_write_master"
  on user_roles for all
  to authenticated
  using (current_user_role() = 'master')
  with check (current_user_role() = 'master');
