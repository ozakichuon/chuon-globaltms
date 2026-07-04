import { KpiCard } from "@/components/KpiCard";
import { DailyMemo } from "@/components/DailyMemo";
import { TodayAutoTasks } from "@/components/TodayAutoTasks";
import {
  getKpiSnapshot,
  getTopOvertimeCurrentMonth,
  getTurnover,
  getVisaAlerts,
} from "@/lib/data";
import {
  excelPipeline,
  excelSupportTickets,
  employeePhotoMap,
} from "@/lib/excel-data";
import { alertColor, formatDate, nationalityFlag, hoursToHHMM } from "@/lib/utils";
import {
  overtimeAlertColor,
  overtimeAlertShort,
} from "@/lib/overtime";
import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import Link from "next/link";
import {
  Users,
  Globe2,
  AlertTriangle,
  CalendarClock,
  TrendingDown,
  Plane,
  ArrowRight,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpi, alerts, turnover, overtimeTop] = await Promise.all([
    getKpiSnapshot(),
    getVisaAlerts(),
    getTurnover(),
    getTopOvertimeCurrentMonth(5),
  ]);

  const critical = alerts.filter(
    (a) => a.alert_level === "critical" || a.alert_level === "expired"
  );

  const overtimeRisk = overtimeTop.filter(
    (r) =>
      r.alert_level === "warning" ||
      r.alert_level === "critical" ||
      r.alert_level === "danger"
  ).length;

  // 追加KPI
  const pipelineCount = excelPipeline.length;
  const supportInProgress = excelSupportTickets.filter((t) => t.status === "対応中").length;

  // 過去12ヶ月の離職率推移（グラフ代わりのバー可視化）
  const maxRate = Math.max(...turnover.map((t) => t.turnover_rate_pct), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">
          株式会社中温 / タレントマネジメント MVP
        </p>
      </div>

      {/* 今日のタスク */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayAutoTasks />
        <DailyMemo />
      </div>

      {/* KPI群 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        <KpiCard label="在籍中" value={kpi.activeCount} unit="名" icon={Users} />
        <KpiCard
          label="外国人"
          value={kpi.foreignCount}
          unit="名"
          icon={Globe2}
          sub={`${Math.round((kpi.foreignCount / kpi.activeCount) * 100)}%`}
        />
        <KpiCard
          label="在留 90日以内"
          value={kpi.visaCritical}
          unit="件"
          icon={AlertTriangle}
          tone={kpi.visaCritical > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="在留 180日以内"
          value={kpi.visaWarning}
          unit="件"
          icon={CalendarClock}
          tone={kpi.visaWarning > 0 ? "warn" : "default"}
        />
        <KpiCard
          label="残業 警告以上"
          value={overtimeRisk}
          unit="名"
          icon={Clock}
          tone={overtimeRisk > 0 ? "warn" : "success"}
          sub="45h/月 超過"
        />
        <KpiCard
          label="12ヶ月離職率"
          value={kpi.turnover12mPct}
          unit="%"
          icon={TrendingDown}
          tone={kpi.turnover12mPct > 20 ? "danger" : kpi.turnover12mPct > 15 ? "warn" : "success"}
        />
        <KpiCard
          label="外国人離職率"
          value={kpi.turnoverForeign12mPct}
          unit="%"
          icon={Plane}
          tone={
            kpi.turnoverForeign12mPct > 25
              ? "danger"
              : kpi.turnoverForeign12mPct > 18
              ? "warn"
              : "success"
          }
        />
        <KpiCard
          label="入社予定"
          value={pipelineCount}
          unit="名"
          icon={Users}
          sub="採用パイプライン"
        />
        <KpiCard
          label="サポート対応中"
          value={supportInProgress}
          unit="件"
          icon={AlertTriangle}
          tone={supportInProgress > 5 ? "warn" : "default"}
        />
      </div>

      {/* 残業アラート（TOP5） */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Clock size={18} /> 今月の残業時間 ワースト5
            </h2>
            <p className="text-xs text-slate-500">
              36協定上限（45h/月）と過労死ライン（80h/月）を監視
            </p>
          </div>
          <Link
            href="/attendance"
            className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            勤怠管理を開く <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-2">
          {overtimeTop.slice(0, 5).map((r) => {
            const pct = Math.min((r.overtime_hours / 100) * 100, 100);
            return (
              <div
                key={r.employee_id}
                className="flex items-center gap-3 py-1"
              >
                <div className="w-48 flex items-center gap-2 text-sm">
                  <MiniAvatar name={r.display_name} nationality={r.nationality} photoUrl={employeePhotoMap.get(r.employee_id)} size={28} />
                  <Link
                    href={`/employees/${r.employee_id}`}
                    className="hover:text-brand-600 font-medium truncate"
                  >
                    {r.display_name}
                  </Link>
                </div>
                <div className="flex-1 relative bg-slate-100 rounded-full h-4 overflow-hidden">
                  {/* 閾値マーカー */}
                  <div className="absolute top-0 bottom-0 border-r-2 border-orange-400" style={{ left: "45%" }} />
                  <div className="absolute top-0 bottom-0 border-r-2 border-red-700" style={{ left: "80%" }} />
                  <div
                    className={
                      r.alert_level === "danger"
                        ? "bg-red-700 h-full"
                        : r.alert_level === "critical"
                        ? "bg-red-500 h-full"
                        : r.alert_level === "warning"
                        ? "bg-orange-500 h-full"
                        : r.alert_level === "notice"
                        ? "bg-yellow-500 h-full"
                        : "bg-emerald-500 h-full"
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-16 text-right font-mono text-sm">
                  {hoursToHHMM(r.overtime_hours)}
                </div>
                <Badge className={overtimeAlertColor(r.alert_level)}>
                  {overtimeAlertShort(r.alert_level)}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* 緊急在留アラート */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">在留期限アラート（90日以内）</h2>
            <p className="text-xs text-slate-500">
              期限切れリスクを最優先で表示。更新手続きの開始を忘れないこと。
            </p>
          </div>
          <Link
            href="/visa"
            className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            すべて見る <ArrowRight size={14} />
          </Link>
        </div>

        {critical.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">
            90日以内に期限を迎える従業員はいません 👍
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2">社員番号</th>
                  <th className="py-2">氏名</th>
                  <th className="py-2">国籍</th>
                  <th className="py-2">在留資格</th>
                  <th className="py-2">期限</th>
                  <th className="py-2">残日数</th>
                  <th className="py-2">アラート</th>
                  <th className="py-2">手続区分</th>
                </tr>
              </thead>
              <tbody>
                {critical.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2.5 font-mono text-xs">
                      {a.employee_code}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <MiniAvatar name={a.display_name} nationality={a.nationality} photoUrl={employeePhotoMap.get(a.employee_id)} size={26} />
                        <Link
                          href={`/employees/${a.employee_id}`}
                          className="font-medium hover:text-brand-600"
                        >
                          {a.display_name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs">{a.nationality}</td>
                    <td className="py-2.5">{visaLabel(a.visa_status)}</td>
                    <td className="py-2.5">{formatDate(a.expires_at)}</td>
                    <td className="py-2.5">
                      {a.days_until_expiry < 0 ? (
                        <span className="text-red-700 font-bold">
                          {Math.abs(a.days_until_expiry)}日経過
                        </span>
                      ) : (
                        <span className="font-semibold">
                          あと{a.days_until_expiry}日
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className={`badge ${alertColor(a.alert_level)}`}>
                        {alertLabel(a.alert_level)}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-600">
                      {a.residence_card_procedure ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 離職率推移 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">月次離職率推移（直近12ヶ月）</h2>
            <p className="text-xs text-slate-500">
              全体 vs 外国人を比較。外国人離職率が高ければ実習生の定着策を強化。
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {turnover.map((t) => (
            <div key={t.month_start} className="grid grid-cols-12 gap-2 items-center text-xs">
              <div className="col-span-2 text-slate-500">
                {formatDate(t.month_start).slice(0, 7)}
              </div>
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full"
                      style={{
                        width: `${(t.turnover_rate_pct / maxRate) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs w-12 text-right">
                    {t.turnover_rate_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">全体</div>
              </div>
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full"
                      style={{
                        width: `${(t.turnover_rate_foreign_pct / maxRate) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs w-12 text-right">
                    {t.turnover_rate_foreign_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">外国人</div>
              </div>
              <div className="col-span-2 text-right text-slate-500">
                退職 {t.retired_count}名
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 次のアクション */}
      <div className="card bg-brand-50 border-brand-100">
        <h3 className="font-bold">今月の推奨アクション</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>• 在留期限 90日以内の {kpi.visaCritical} 名について更新書類準備を開始</li>
          <li>• 技能実習2号 → 特定技能1号 の移行対象者に試験スケジュールを案内</li>
          <li>• 離職率が閾値を超えた月は現場ヒアリングを実施</li>
        </ul>
      </div>
    </div>
  );
}

// ラベル関数
function visaLabel(s: string): string {
  const map: Record<string, string> = {
    japanese: "日本人",
    permanent: "永住者",
    long_term: "定住者",
    spouse: "日本人配偶者",
    technical_intern_1: "技能実習1号",
    technical_intern_2: "技能実習2号",
    technical_intern_3: "技能実習3号",
    specified_skill_1: "特定技能1号",
    specified_skill_2: "特定技能2号",
    engineer_humanities: "技人国",
    other: "その他",
  };
  return map[s] ?? s;
}

function alertLabel(level: string): string {
  const map: Record<string, string> = {
    expired: "期限切れ",
    critical: "90日以内",
    warning: "180日以内",
    notice: "1年以内",
    safe: "安全",
    none: "—",
  };
  return map[level] ?? level;
}
