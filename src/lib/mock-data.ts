// Supabase 未接続時のモックデータ（キャリアレベル・離職率ダミー・KPI集計）
// 従業員データは excel-data.ts から Excel 由来の実データを利用
import { getAllEmployeesAsSummary, getAllVisaAlerts } from "./excel-data";
import type { CareerLevel, TurnoverPoint } from "./types";

export const careerLevels: CareerLevel[] = [
  { level: 1, name_ja: "見習い",     name_id: "Pemula",           description_ja: "入社直後。OJT中心",         description_id: "Baru masuk. OJT utama",          min_skill_count: 0,  min_jlpt_level: "none", min_tenure_months: 0,  min_mentor_count: 0,  hourly_wage_delta: 0 },
  { level: 2, name_ja: "作業者",     name_id: "Operator",         description_ja: "単独作業が可能",              description_id: "Dapat bekerja mandiri",          min_skill_count: 5,  min_jlpt_level: "N5",   min_tenure_months: 3,  min_mentor_count: 0,  hourly_wage_delta: 50 },
  { level: 3, name_ja: "熟練工",     name_id: "Operator Ahli",    description_ja: "自己判断で品質担保",          description_id: "Menjamin kualitas sendiri",      min_skill_count: 10, min_jlpt_level: "N5",   min_tenure_months: 6,  min_mentor_count: 0,  hourly_wage_delta: 100 },
  { level: 4, name_ja: "リーダー",   name_id: "Leader",           description_ja: "新人指導を担当",              description_id: "Bimbing karyawan baru",          min_skill_count: 20, min_jlpt_level: "N4",   min_tenure_months: 12, min_mentor_count: 1,  hourly_wage_delta: 150 },
  { level: 5, name_ja: "班長",       name_id: "Kepala Tim",       description_ja: "班の運営・シフト管理",        description_id: "Kelola tim & shift",             min_skill_count: 30, min_jlpt_level: "N3",   min_tenure_months: 24, min_mentor_count: 3,  hourly_wage_delta: 250 },
  { level: 6, name_ja: "現場管理者", name_id: "Manajer Lapangan", description_ja: "ライン全体の責任者",          description_id: "Bertanggung jawab atas seluruh line", min_skill_count: 45, min_jlpt_level: "N3", min_tenure_months: 36, min_mentor_count: 5, hourly_wage_delta: 400 },
  { level: 7, name_ja: "工場幹部",   name_id: "Eksekutif",        description_ja: "経営視点で工場を運営",        description_id: "Kelola pabrik dari perspektif bisnis", min_skill_count: 60, min_jlpt_level: "N2", min_tenure_months: 60, min_mentor_count: 10, hourly_wage_delta: 600 },
];

// 下位互換（他ファイルが依然参照している場合向け）
export const employeesMock = getAllEmployeesAsSummary();
export const visaAlertsMock = getAllVisaAlerts();

// 離職率ダミー（直近12ヶ月）— 実データでは employees.retired_at を集計
export const turnoverMock: TurnoverPoint[] = (() => {
  const out: TurnoverPoint[] = [];
  const now = new Date();
  const active = employeesMock.filter((e) => e.status === "active").length;
  const activeF = employeesMock.filter((e) => e.status === "active" && e.nationality !== "JP").length;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const retired = Math.round(Math.random() * 4);
    const retiredF = Math.round(Math.random() * 3);
    out.push({
      month_start: d.toISOString().slice(0, 10),
      active_count: active + Math.round(Math.random() * 5),
      active_foreign: activeF,
      retired_count: retired,
      retired_foreign: retiredF,
      turnover_rate_pct: active ? Math.round((retired / active) * 10000) / 100 : 0,
      turnover_rate_foreign_pct: activeF ? Math.round((retiredF / activeF) * 10000) / 100 : 0,
    });
  }
  return out;
})();

export function kpiSnapshot() {
  const active = employeesMock.filter((e) => e.status === "active");
  const foreign = active.filter((e) => e.nationality !== "JP");
  const critical = visaAlertsMock.filter(
    (a) => a.alert_level === "critical" || a.alert_level === "expired"
  ).length;
  const warning = visaAlertsMock.filter((a) => a.alert_level === "warning").length;
  const totalRetired12m = turnoverMock.reduce((s, p) => s + p.retired_count, 0);
  const totalRetiredForeign12m = turnoverMock.reduce((s, p) => s + p.retired_foreign, 0);
  const avgActive = Math.round(
    turnoverMock.reduce((s, p) => s + p.active_count, 0) / turnoverMock.length
  );
  const avgActiveForeign = Math.round(
    turnoverMock.reduce((s, p) => s + p.active_foreign, 0) / turnoverMock.length
  );
  return {
    activeCount: active.length,
    foreignCount: foreign.length,
    visaCritical: critical,
    visaWarning: warning,
    turnover12mPct: avgActive ? Math.round((totalRetired12m / avgActive) * 10000) / 100 : 0,
    turnoverForeign12mPct: avgActiveForeign
      ? Math.round((totalRetiredForeign12m / avgActiveForeign) * 10000) / 100
      : 0,
  };
}
