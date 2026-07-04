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

  return (
    <Link
      href={`/employees/${e.id}`}
      className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-brand-200 transition-all p-5"
    >
      {hasVisaBadge && alertLv !== "safe" && alertLv !== "none" && (
        <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
          {e.residence_card_procedure && (
            <span className="badge bg-blue-50 text-blue-700 border border-blue-200 shadow-sm text-[10px]">
              {e.residence_card_procedure}
            </span>
          )}
          <span
            className={`badge ${alertColor(alertLv)} shadow-sm`}
            title="在留期限"
          >
            {alertLv === "expired"
              ? "期限切れ"
              : `あと${e.visa_days_until_expiry}日`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Avatar employee={e} size={88} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base leading-tight group-hover:text-brand-700 transition-colors truncate">
            {e.display_name}
          </div>
          {e.last_name_native && (
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {e.last_name_native} {e.first_name_native}
            </div>
          )}
          <div className="text-xs text-slate-400 font-mono mt-1">
            {e.employee_code}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
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
            <dd className="text-slate-700">{visaLabel(e.current_visa_status)}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
