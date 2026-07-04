import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import {
  getAttendanceMonthlyAll,
  getEmployees,
} from "@/lib/data";
import { employeePhotoMap } from "@/lib/excel-data";
import { cn, hoursToHHMM } from "@/lib/utils";
import { employmentTypeLabel } from "@/lib/labels";
import {
  OVERTIME_THRESHOLDS,
  overtimeAlertBarColor,
  overtimeAlertColor,
  overtimeAlertLabel,
  overtimeAlertShort,
} from "@/lib/overtime";
import Link from "next/link";
import { Clock, AlertTriangle, TrendingUp, CalendarRange } from "lucide-react";
import type { OvertimeAlert } from "@/lib/types";

export const dynamic = "force-dynamic";

const BAR_MAX = 100;

const SITE_TABS = [
  { key: "", label: "すべて" },
  { key: "津吉", label: "津吉" },
  { key: "小栗工場", label: "小栗工場" },
  { key: "西条工場", label: "西条工場" },
  { key: "西条ファーム", label: "西条ファーム" },
  { key: "協同本社", label: "協同本社" },
] as const;

const SITE_TO_ORG: Record<string, string> = {
  津吉: "津吉工場",
  小栗工場: "本社（小栗）",
  西条工場: "西条工場",
  西条ファーム: "西条ファーム",
  協同本社: "協同本社",
};

// organization_name が null の場合も考慮
function orgMatches(orgName: string | null | undefined, site: string): boolean {
  if (!site) return true;
  return orgName === SITE_TO_ORG[site];
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const params = await searchParams;
  const [allMonthly, employees] = await Promise.all([
    getAttendanceMonthlyAll(),
    getEmployees(),
  ]);

  // 工場フィルタ用: employee_id → organization_name
  const orgByEmpId = new Map(employees.map((e) => [e.id, e.organization_name]));

  function matchesSite(employeeId: string): boolean {
    if (!params.site) return true;
    return orgMatches(orgByEmpId.get(employeeId), params.site);
  }

  const filteredMonthly = allMonthly.filter((r) => matchesSite(r.employee_id));

  const now = new Date();
  // 集計期間は21日〜翌月20日。20日以下は前月が当期
  const periodDate = now.getDate() <= 20
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, "0")}-01`;

  const currentMonth = filteredMonthly.filter((r) => r.month_start === thisMonth);

  // 当月ランキング（残業時間降順、上位40名）
  const filteredTop = [...currentMonth]
    .sort((a, b) => b.overtime_hours - a.overtime_hours)
    .slice(0, 40);

  // 集計
  const counts: Record<OvertimeAlert, number> = {
    safe: 0,
    notice: 0,
    warning: 0,
    critical: 0,
    danger: 0,
  };
  currentMonth.forEach((r) => counts[r.alert_level]++);

  const violations = filteredMonthly.filter(
    (r) =>
      r.month_start === thisMonth &&
      (r.overtime_hours >= 80 ||
        (r.overtime_hours_3m_avg !== null && r.overtime_hours_3m_avg >= 80))
  );

  // 月別推移（過去3ヶ月）
  const months = Array.from(
    new Set(filteredMonthly.map((r) => r.month_start))
  ).sort();
  const trendByMonth = months.map((m) => {
    const rs = filteredMonthly.filter((r) => r.month_start === m);
    return {
      month: m,
      avg: rs.reduce((s, r) => s + r.overtime_hours, 0) / Math.max(rs.length, 1),
      max: Math.max(...rs.map((r) => r.overtime_hours), 0),
      warningPlus: rs.filter(
        (r) =>
          r.alert_level === "warning" ||
          r.alert_level === "critical" ||
          r.alert_level === "danger"
      ).length,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock size={22} /> 勤怠管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          残業時間の監視と36協定・過労死ラインのアラート。外国人技能実習生の労働時間は特に厳格な管理が必要です。
        </p>
      </div>

      {/* 工場タブ */}
      <div className="flex gap-1 border-b border-slate-200">
        {SITE_TABS.map((tab) => {
          const href = tab.key ? `/attendance?site=${tab.key}` : "/attendance";
          const active = (params.site ?? "") === tab.key;
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* 閾値の説明 */}
      <div className="card bg-slate-50">
        <h3 className="font-bold text-sm">残業アラート基準（月間）</h3>
        <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
          <ThresholdChip level="safe" label="〜30h" note="安全" />
          <ThresholdChip level="notice" label="30〜45h" note="注意" />
          <ThresholdChip level="warning" label="45〜60h" note="36協定超" />
          <ThresholdChip level="critical" label="60〜80h" note="危険" />
          <ThresholdChip level="danger" label="80h〜" note="過労死ライン" />
        </div>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["safe", "notice", "warning", "critical", "danger"] as OvertimeAlert[]).map(
          (lv) => (
            <div
              key={lv}
              className={cn(
                "rounded-xl border p-4",
                lv === "safe"
                  ? "bg-emerald-50 border-emerald-200"
                  : lv === "notice"
                  ? "bg-yellow-50 border-yellow-200"
                  : lv === "warning"
                  ? "bg-orange-50 border-orange-200"
                  : lv === "critical"
                  ? "bg-red-50 border-red-200"
                  : "bg-red-100 border-red-300"
              )}
            >
              <div className="text-xs text-slate-600">
                {overtimeAlertLabel(lv)}
              </div>
              <div className="text-2xl font-bold mt-1">
                {counts[lv]}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  名
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* 労基法違反リスク */}
      {violations.length > 0 && (
        <div className="card border-red-300 bg-red-50">
          <h2 className="font-bold text-lg text-red-700 flex items-center gap-2">
            <AlertTriangle size={20} />
            労基法違反リスク {violations.length}名
          </h2>
          <p className="text-xs text-red-600 mt-1">
            月80時間超、または前2ヶ月平均80時間超。特別条項上限を超過する恐れがあり、至急対応が必要です。
          </p>
          <div className="mt-3 space-y-2">
            {violations.map((v) => (
              <div
                key={v.employee_id}
                className="bg-white rounded-lg p-3 flex items-center justify-between gap-3 border border-red-200"
              >
                <div className="flex items-center gap-3 flex-1">
                  <MiniAvatar name={v.display_name} nationality={v.nationality} photoUrl={employeePhotoMap.get(v.employee_id)} size={36} />
                  <div>
                    <Link
                      href={`/employees/${v.employee_id}`}
                      className="font-medium hover:text-red-700"
                    >
                      {v.display_name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {v.employee_code} ・ {employmentTypeLabel(v.employment_type)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-xs text-slate-500">当月残業</div>
                    <div className="font-bold text-red-700">
                      {hoursToHHMM(v.overtime_hours)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">2ヶ月平均</div>
                    <div className="font-bold text-red-700">
                      {v.overtime_hours_3m_avg != null ? hoursToHHMM(v.overtime_hours_3m_avg) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 月別推移 */}
      <div className="card">
        <h3 className="font-bold flex items-center gap-2">
          <TrendingUp size={18} /> 月別残業推移（従業員平均 vs 最大）
        </h3>
        <div className="mt-4 space-y-3">
          {trendByMonth.map((t) => (
            <div key={t.month} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2 text-xs text-slate-500">
                {t.month.slice(0, 7)}
              </div>
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full"
                      style={{ width: `${(t.avg / BAR_MAX) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-14 text-right">
                    {t.avg.toFixed(1)}h
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">平均</div>
              </div>
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${(t.max / BAR_MAX) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-14 text-right">
                    {t.max.toFixed(1)}h
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">最大</div>
              </div>
              <div className="col-span-2 text-right text-xs text-slate-600">
                警告以上 {t.warningPlus}名
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 個人別ランキング */}
      <div className="card">
        <h3 className="font-bold flex items-center gap-2">
          <CalendarRange size={18} /> 今月の残業ランキング
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          赤・橙ゾーンの従業員は業務分担の見直しを推奨
        </p>
        <div className="mt-4 space-y-1.5">
          {filteredTop.map((r, i) => {
            const pct = Math.min((r.overtime_hours / BAR_MAX) * 100, 100);
            return (
              <div
                key={r.employee_id}
                className="grid grid-cols-12 gap-3 items-center py-2 px-3 rounded-lg hover:bg-slate-50"
              >
                <div className="col-span-1 text-xs text-slate-400 font-mono">
                  #{i + 1}
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <MiniAvatar name={r.display_name} nationality={r.nationality} photoUrl={employeePhotoMap.get(r.employee_id)} size={26} />
                    <div className="min-w-0">
                      <Link
                        href={`/employees/${r.employee_id}`}
                        className="font-medium text-sm hover:text-brand-600 block truncate"
                      >
                        {r.display_name}
                      </Link>
                      <div className="text-[10px] text-slate-400 truncate">
                        {employmentTypeLabel(r.employment_type)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-6">
                  <div className="relative bg-slate-100 rounded-full h-5 overflow-hidden">
                    {/* 閾値ライン */}
                    <div
                      className="absolute top-0 bottom-0 border-r-2 border-amber-300"
                      style={{ left: `${(OVERTIME_THRESHOLDS.notice / BAR_MAX) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 border-r-2 border-orange-400"
                      style={{ left: `${(OVERTIME_THRESHOLDS.warning / BAR_MAX) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 border-r-2 border-red-500"
                      style={{ left: `${(OVERTIME_THRESHOLDS.critical / BAR_MAX) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 border-r-2 border-red-700"
                      style={{ left: `${(OVERTIME_THRESHOLDS.danger / BAR_MAX) * 100}%` }}
                    />
                    <div
                      className={cn("h-full", overtimeAlertBarColor(r.alert_level))}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-[10px] font-mono font-bold">
                        {hoursToHHMM(r.overtime_hours)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <Badge className={overtimeAlertColor(r.alert_level)}>
                    {overtimeAlertShort(r.alert_level)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        {/* 凡例 */}
        <div className="mt-4 pt-3 border-t flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-3 bg-amber-300" /> 30h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-3 bg-orange-400" /> 45h（36協定）
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-3 bg-red-500" /> 60h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-3 bg-red-700" /> 80h（過労死ライン）
          </span>
        </div>
      </div>
    </div>
  );
}

function ThresholdChip({
  level,
  label,
  note,
}: {
  level: OvertimeAlert;
  label: string;
  note: string;
}) {
  return (
    <div className={cn("rounded-lg px-3 py-2", overtimeAlertColor(level))}>
      <div className="font-bold">{label}</div>
      <div className="text-[10px] opacity-80">{note}</div>
    </div>
  );
}
