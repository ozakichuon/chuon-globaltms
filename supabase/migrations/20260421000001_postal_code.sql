-- 従業員マスタに郵便番号を追加（日本人個人情報フォーマット対応）
alter table employees
  add column if not exists postal_code text;

comment on column employees.postal_code is '郵便番号（ハイフン有り: 790-0842 形式）';

-- サマリビューを更新（postal_code / birth_date / phone / address_jp を含める）
drop view if exists v_employee_summary cascade;

create or replace view v_employee_summary as
select
  e.id,
  e.employee_code,
  e.display_name,
  e.last_name,
  e.first_name,
  e.last_name_kana,
  e.first_name_kana,
  e.last_name_native,
  e.first_name_native,
  e.birth_date,
  e.phone,
  e.address_jp,
  e.postal_code,
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
