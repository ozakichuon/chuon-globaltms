-- ============================================================
-- ビュー・関数：ダッシュボード用クエリを簡素化
-- ============================================================

-- 現行在留資格 + 期限までの日数
create or replace view v_current_visa as
select
  vr.*,
  e.employee_code,
  e.display_name,
  e.nationality,
  e.employment_type,
  e.status as employee_status,
  case
    when vr.expires_at is null then null
    else (vr.expires_at - current_date)
  end as days_until_expiry,
  case
    when vr.expires_at is null then 'none'
    when vr.expires_at < current_date then 'expired'
    when vr.expires_at - current_date <= 90 then 'critical'
    when vr.expires_at - current_date <= 180 then 'warning'
    when vr.expires_at - current_date <= 365 then 'notice'
    else 'safe'
  end as alert_level
from visa_records vr
join employees e on e.id = vr.employee_id
where vr.is_current = true
  and e.status = 'active';

-- 従業員サマリ（一覧画面用）
create or replace view v_employee_summary as
select
  e.id,
  e.employee_code,
  e.display_name,
  e.last_name_native,
  e.first_name_native,
  e.nationality,
  e.native_language,
  e.preferred_language,
  e.employment_type,
  e.status,
  e.hired_at,
  e.jlpt_level,
  e.career_level,
  cl.name_ja as career_level_name_ja,
  cl.name_id as career_level_name_id,
  o.name as organization_name,
  vr.visa_status as current_visa_status,
  vr.expires_at as visa_expires_at,
  case
    when vr.expires_at is null then null
    else (vr.expires_at - current_date)
  end as visa_days_until_expiry,
  extract(year from age(current_date, e.hired_at))::int * 12
    + extract(month from age(current_date, e.hired_at))::int as tenure_months,
  (
    select count(*) from employee_skills es
    where es.employee_id = e.id and es.level > 0
  ) as skill_count
from employees e
left join organizations o on o.id = e.organization_id
left join career_levels cl on cl.level = e.career_level
left join visa_records vr on vr.employee_id = e.id and vr.is_current = true;

-- 離職率計算（月次）
create or replace view v_turnover_monthly as
with monthly as (
  select
    date_trunc('month', generate_series(
      date_trunc('month', current_date - interval '23 months'),
      date_trunc('month', current_date),
      interval '1 month'
    ))::date as month_start
),
retired as (
  select
    date_trunc('month', retired_at)::date as month_start,
    count(*) as retired_count,
    count(*) filter (where nationality != 'JP') as retired_foreign
  from employees
  where retired_at is not null
  group by 1
),
active_start as (
  select
    m.month_start,
    (
      select count(*) from employees e
      where e.hired_at <= m.month_start
        and (e.retired_at is null or e.retired_at > m.month_start)
    ) as active_count,
    (
      select count(*) from employees e
      where e.hired_at <= m.month_start
        and (e.retired_at is null or e.retired_at > m.month_start)
        and e.nationality != 'JP'
    ) as active_foreign
  from monthly m
)
select
  m.month_start,
  coalesce(a.active_count, 0) as active_count,
  coalesce(a.active_foreign, 0) as active_foreign,
  coalesce(r.retired_count, 0) as retired_count,
  coalesce(r.retired_foreign, 0) as retired_foreign,
  case when coalesce(a.active_count, 0) = 0 then 0
       else round(coalesce(r.retired_count, 0)::numeric / a.active_count * 100, 2)
  end as turnover_rate_pct,
  case when coalesce(a.active_foreign, 0) = 0 then 0
       else round(coalesce(r.retired_foreign, 0)::numeric / a.active_foreign * 100, 2)
  end as turnover_rate_foreign_pct
from monthly m
left join active_start a using (month_start)
left join retired r using (month_start)
order by month_start;

-- 組織別人員構成
create or replace view v_workforce_composition as
select
  o.id as organization_id,
  o.name as organization_name,
  e.nationality,
  e.employment_type,
  count(*) as headcount
from employees e
left join organizations o on o.id = e.organization_id
where e.status = 'active'
group by o.id, o.name, e.nationality, e.employment_type;

-- 個人のキャリア進捗
create or replace function fn_career_progress(p_employee_id uuid)
returns table (
  current_level int,
  next_level int,
  skill_count int,
  required_skill_count int,
  current_jlpt jlpt_level,
  required_jlpt jlpt_level,
  tenure_months int,
  required_tenure_months int,
  completion_pct int
) language plpgsql as $$
declare
  v_emp employees%rowtype;
  v_cur_lv career_levels%rowtype;
  v_next_lv career_levels%rowtype;
  v_skill_count int;
  v_tenure_months int;
  v_completion int := 0;
  v_total_gates int := 3;
  v_passed_gates int := 0;
begin
  select * into v_emp from employees where id = p_employee_id;
  if not found then return; end if;

  select * into v_cur_lv from career_levels where level = v_emp.career_level;
  select * into v_next_lv from career_levels where level = v_emp.career_level + 1;

  select count(*) into v_skill_count from employee_skills
    where employee_id = p_employee_id and level > 0;

  v_tenure_months := extract(year from age(current_date, v_emp.hired_at))::int * 12
    + extract(month from age(current_date, v_emp.hired_at))::int;

  if v_next_lv.level is null then
    -- 最高位到達
    return query select v_emp.career_level, null::int, v_skill_count, 0, v_emp.jlpt_level, 'none'::jlpt_level, v_tenure_months, 0, 100;
    return;
  end if;

  if v_skill_count >= coalesce(v_next_lv.min_skill_count, 0) then
    v_passed_gates := v_passed_gates + 1;
  end if;
  if v_emp.jlpt_level::text >= v_next_lv.min_jlpt_level::text then
    v_passed_gates := v_passed_gates + 1;
  end if;
  if v_tenure_months >= coalesce(v_next_lv.min_tenure_months, 0) then
    v_passed_gates := v_passed_gates + 1;
  end if;

  v_completion := (v_passed_gates * 100) / v_total_gates;

  return query select
    v_emp.career_level,
    v_next_lv.level,
    v_skill_count,
    coalesce(v_next_lv.min_skill_count, 0),
    v_emp.jlpt_level,
    v_next_lv.min_jlpt_level,
    v_tenure_months,
    coalesce(v_next_lv.min_tenure_months, 0),
    v_completion;
end;
$$;
