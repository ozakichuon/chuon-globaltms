import Link from "next/link";
import { Badge } from "./Badge";
import { Avatar } from "./Avatar";
import {
  alertColor,
  careerLevelBadge,
  tenureString,
} from "@/lib/utils";
import { employmentTypeLabel, visaLabel } from "@/lib/labels";
import type { EmployeeSummary } from "@/lib/types";

export function EmployeeCard({ e }: { e: EmployeeSummary }) {
  const alertLv =
    e.visa_days_until_expiry === null
      ? "none"
      : e.visa_days_until_expiry < 0
      ? "expired"
      : e.visa_days_until_expiry <= 90
      ? "critical"
      : e.visa_days_until_expiry <= 180
      ? "warning"
      : e.visa_days_until_expiry <= 365
      ? "notice"
      : "safe";

  const hasVisaBadge = e.current_visa_status && e.current_visa_status !== "japanese";

  const nameFontClass =
    e.display_name.length > 22 ? "text-[11px]" :
    e.display_name.length > 16 ? "text-xs" :
    e.display_name.length > 12 ? "text-sm" : "text-base";

  const furigana = [e.last_name_native, e.first_name_native].filter(Boolean).join(" ");
  const furiganaFontClass =
    furigana.length > 16 ? "text-[10px]" : "text-xs";

  return (
    <Link
      href={`/employees/${e.id}`}
      className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-brand-200 transition-all p-5"
    >
      <div className="flex items-center gap-4">
        <Avatar employee={e} size={88} />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className={`font-bold leading-tight group-hover:text-brand-700 transition-colors whitespace-nowrap ${nameFontClass}`}>
            {e.display_name}
          </div>
          {furigana && (
            <div className={`text-slate-500 mt-0.5 whitespace-nowrap ${furiganaFontClass}`}>
              {furigana}
            </div>
          )}
          <div className="text-xs text-slate-400 font-mono mt-1">
            {e.employee_code}
          </div>
          {e.nickname && (
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${e.gender === "female" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
              {e.nickname}
            </span>
          )}
        </div>
      </div>

      {hasVisaBadge && e.residence_card_procedure && (
        <div className="mt-3 flex justify-end">
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
            {e.residence_card_procedure}
          </span>
        </div>
      )}
      <div className={`flex flex-wrap gap-1.5 items-center ${hasVisaBadge && e.residence_card_procedure ? "mt-1" : "mt-4"}`}>
        <Badge className={careerLevelBadge(e.career_level)}>
          Lv{e.career_level} {e.career_level_name_ja}
        </Badge>
        <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
          {employmentTypeLabel(e.employment_type)}
        </Badge>
        {e.jlpt_level !== "none" && (
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
            {e.jlpt_level}
          </Badge>
        )}
        {hasVisaBadge && (
          <span className={`badge ${alertColor(alertLv)} ml-auto`} title="在留期限">
            {alertLv === "expired"
              ? "期限切れ"
              : `あと${e.visa_days_until_expiry ?? "—"}日`}
          </span>
        )}
      </div>

      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-slate-400">組織</dt>
          <dd className="text-slate-700 text-right truncate max-w-[60%]">
            {e.organization_name ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-400">勤続</dt>
          <dd className="text-slate-700">{tenureString(e.hired_at)}</dd>
        </div>
        {hasVisaBadge && (
          <div className="flex justify-between">
            <dt className="text-slate-400">在留</dt>
            <dd className="text-slate-700">{e.visa_type_jp ?? visaLabel(e.current_visa_status)}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
