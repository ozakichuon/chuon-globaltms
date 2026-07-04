import { getVisaAlerts } from "@/lib/data";
import { employeePhotoMap } from "@/lib/excel-data";
import { alertColor, formatDate } from "@/lib/utils";
import { employmentTypeLabel, visaLabel } from "@/lib/labels";
import { MiniAvatar } from "@/components/Avatar";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const GROUPS = [
  { key: "expired", label: "期限切れ", tone: "bg-red-50 border-red-200" },
  { key: "critical", label: "90日以内", tone: "bg-red-50 border-red-200" },
  { key: "warning", label: "180日以内", tone: "bg-amber-50 border-amber-200" },
  { key: "notice", label: "1年以内", tone: "bg-yellow-50 border-yellow-200" },
  { key: "safe", label: "1年以上", tone: "bg-emerald-50 border-emerald-200" },
] as const;

export default async function VisaPage() {
  const alerts = await getVisaAlerts();
  const grouped = Object.fromEntries(
    GROUPS.map((g) => [g.key, alerts.filter((a) => a.alert_level === g.key)])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={22} />
          在留資格ダッシュボード
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          140名の外国人労働者（主に技能実習生）の在留期限をまとめて管理。
          更新・移行のタイミングを逃さないための一元表示です。
        </p>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {GROUPS.map((g) => (
          <div
            key={g.key}
            className={`rounded-xl border p-4 ${g.tone}`}
          >
            <div className="text-xs text-slate-600">{g.label}</div>
            <div className="text-2xl font-bold mt-1">
              {grouped[g.key].length}
              <span className="text-xs font-normal text-slate-500 ml-1">件</span>
            </div>
          </div>
        ))}
      </div>

      {/* グループごと */}
      {GROUPS.map((g) => {
        const items = grouped[g.key];
        if (items.length === 0) return null;
        return (
          <section key={g.key} className="card">
            <h2 className="font-bold flex items-center gap-2">
              <span className={`badge ${alertColor(g.key)}`}>{g.label}</span>
              <span className="text-sm text-slate-500">{items.length}名</span>
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b">
                    <th className="py-2 px-2">社員番号</th>
                    <th className="py-2 px-2">氏名</th>
                    <th className="py-2 px-2">国籍</th>
                    <th className="py-2 px-2">雇用形態</th>
                    <th className="py-2 px-2">現行資格</th>
                    <th className="py-2 px-2">期限</th>
                    <th className="py-2 px-2">残日数</th>
                    <th className="py-2 px-2">手続区分</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-mono text-xs">
                        {a.employee_code}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <MiniAvatar name={a.display_name} nationality={a.nationality} photoUrl={employeePhotoMap.get(a.employee_id)} size={28} />
                          <Link
                            href={`/employees/${a.employee_id}`}
                            className="font-medium hover:text-brand-600"
                          >
                            {a.display_name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-xs">{a.nationality}</td>
                      <td className="py-2.5 px-2 text-xs">
                        {employmentTypeLabel(a.employment_type)}
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        {visaLabel(a.visa_status)}
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        {formatDate(a.expires_at)}
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        {a.days_until_expiry < 0
                          ? `${Math.abs(a.days_until_expiry)}日経過`
                          : `${a.days_until_expiry}日`}
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        {a.residence_card_procedure ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {alerts.length === 0 && (
        <div className="card text-center py-12">
          <ShieldCheck className="mx-auto text-emerald-500" size={36} />
          <p className="mt-3 text-slate-600">
            現在、期限管理が必要な外国人従業員はいません。
          </p>
        </div>
      )}
    </div>
  );
}

