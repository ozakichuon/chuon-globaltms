import { MiniAvatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { excelEmployees, employeePhotoMap } from "@/lib/excel-data";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OVERTIME_THRESHOLDS,
  overtimeAlertBarColor,
  overtimeAlertColor,
  overtimeAlertShort,
} from "@/lib/overtime";
import type { OvertimeAlert } from "@/lib/types";
import overtimeReal04 from "@/lib/data/overtime_2026_04.json";
import overtimeReal05 from "@/lib/data/overtime_2026_05.json";
import overtimeReal06 from "@/lib/data/overtime_2026_06.json";

export const dynamic = "force-dynamic";

// 全overtimeデータから日別マップを構築
const allDailyData: Record<string, Record<string, number>> = {};
for (const src of [overtimeReal04, overtimeReal05, overtimeReal06] as any[]) {
  for (const [code, val] of Object.entries(src.data as Record<string, any>)) {
    if (!allDailyData[code]) allDailyData[code] = {};
    if (val.daily) Object.assign(allDailyData[code], val.daily);
  }
}

// 今日より前の日付のみ対象（将来日付を除外）
const todayStr = new Date().toISOString().slice(0, 10);
const allDatesInDaily = new Set<string>();
for (const daily of Object.values(allDailyData)) {
  for (const d of Object.keys(daily)) {
    if (d < todayStr) allDatesInDaily.add(d);
  }
}
const sortedAllDates = [...allDatesInDaily].sort();
const recent3Dates = sortedAllDates.slice(-3); // 直近3日

// タブ定義：key = URL パラメータ値、workplaces = 対象 workplace 値
const SITE_TABS = [
  { key: "",          label: "すべて",       workplaces: ["本社", "津吉", "西条", "西条ファーム", "協同本社"] },
  { key: "kouri",     label: "小栗工場",     workplaces: ["本社", "協同本社"] },
  { key: "tsuyoshi",  label: "津吉工場",     workplaces: ["津吉"] },
  { key: "saijo",     label: "西条工場",     workplaces: ["西条"] },
  { key: "saijofarm", label: "西条ファーム", workplaces: ["西条ファーム"] },
] as const;

// workplace の表示名（本社 → 小栗工場）
const WORKPLACE_LABEL: Record<string, string> = {
  本社: "小栗工場",
  津吉: "津吉工場",
  西条: "西条工場",
  "西条ファーム": "西条ファーム",
  協同本社: "協同本社",
};

const WORKPLACE_ORDER = ["本社", "津吉", "西条", "西条ファーム", "協同本社"];

// 当月残業マップ（社員コード → 残業時間）
const now = new Date();
// 集計期間は21日〜翌月20日。20日以下は前月が当期
const periodDate = now.getDate() <= 20
  ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
  : new Date(now.getFullYear(), now.getMonth(), 1);
const thisMonthKey = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, "0")}-01`;
const allOvertimeSrcs = [overtimeReal04, overtimeReal05, overtimeReal06] as Array<{
  month_start: string;
  data: Record<string, { overtime_hours: number }>;
}>;
const currentOvertimeData = allOvertimeSrcs.find((s) => s.month_start === thisMonthKey)?.data ?? {};

function getOvertime(employeeCode: string): number {
  const codes = employeeCode.split("\n").map((c) => c.trim());
  for (const c of codes) {
    if (currentOvertimeData[c] != null) return currentOvertimeData[c].overtime_hours;
  }
  return 0;
}

function overtimeLevel(h: number): OvertimeAlert {
  if (h >= OVERTIME_THRESHOLDS.danger) return "danger";
  if (h >= OVERTIME_THRESHOLDS.critical) return "critical";
  if (h >= OVERTIME_THRESHOLDS.warning) return "warning";
  if (h >= OVERTIME_THRESHOLDS.notice) return "notice";
  return "safe";
}

const BAR_MAX = 80;

function dailyHHMM(val: number | null | undefined): string {
  if (val === null || val === undefined) return "-";
  const totalMin = Math.round(val * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function visaGroup(visaTypeJp: string | null): string {
  if (!visaTypeJp) return "その他";
  if (visaTypeJp.includes("特定技能")) return "特定技能";
  if (visaTypeJp.includes("技能実習")) return "技能実習";
  return "その他";
}

type Emp = (typeof excelEmployees)[number];

function empCode(e: Emp): string {
  const codes = e.employee_code.split("\n").map((c) => c.trim());
  return codes[codes.length - 1];
}

function GenderBox({ label, people, color }: { label: string; people: Emp[]; color: "blue" | "rose" }) {
  const styles = { blue: "border-blue-200 bg-blue-50 text-blue-700", rose: "border-rose-200 bg-rose-50 text-rose-700" };
  return (
    <div className={`border rounded-lg p-2 text-xs ${styles[color]}`}>
      <div className="font-semibold mb-1.5 flex items-center">
        <span>{label} {people.length}名</span>
        {recent3Dates.length > 0 && (
          <div className="flex gap-0.5 ml-auto">
            {recent3Dates.map((d) => {
              const mm = d.slice(5, 7).replace(/^0/, "");
              const dd = d.slice(8, 10).replace(/^0/, "");
              return (
                <div key={d} className="w-10 text-center text-[8px] text-slate-400">{mm}/{dd}</div>
              );
            })}
          </div>
        )}
      </div>
      {people.length === 0 ? (
        <div className="text-slate-400">—</div>
      ) : (
        <div className="space-y-1">
          {[...people].sort((a, b) => getOvertime(b.employee_code) - getOvertime(a.employee_code))
            .map((e) => <PersonRow key={e.id} e={e} />)}
        </div>
      )}
    </div>
  );
}

function PersonRow({ e }: { e: Emp }) {
  const code = empCode(e);
  const ot = getOvertime(e.employee_code);
  const level = overtimeLevel(ot);
  const pct = Math.min((ot / BAR_MAX) * 100, 100);
  const daily = allDailyData[code] ?? allDailyData[e.employee_code] ?? {};

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <MiniAvatar
        name={e.display_name}
        nationality={(e as any).nationality}
        photoUrl={employeePhotoMap.get(code) ?? employeePhotoMap.get(e.employee_code)}
        size={22}
      />
      <Link href={`/employees/${code}`} className="hover:text-brand-600 truncate flex-1 min-w-0">
        {e.display_name}
      </Link>
      {/* 直近3日の残業（値のみ・日付はGenderBoxヘッダーに表示） */}
      {recent3Dates.length > 0 && (
        <div className="flex gap-0.5 shrink-0 ml-auto">
          {recent3Dates.map((d) => (
            <div key={d} className="w-10 text-center text-[9px] font-mono text-slate-600">
              {dailyHHMM(daily[d] as number | null)}
            </div>
          ))}
        </div>
      )}
      {/* 残業バー */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <div className="relative flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="absolute top-0 bottom-0 border-r border-amber-300"
            style={{ left: `${(OVERTIME_THRESHOLDS.notice / BAR_MAX) * 100}%` }} />
          <div className="absolute top-0 bottom-0 border-r border-orange-400"
            style={{ left: `${(OVERTIME_THRESHOLDS.warning / BAR_MAX) * 100}%` }} />
          <div className="absolute top-0 bottom-0 border-r border-red-500"
            style={{ left: `${(OVERTIME_THRESHOLDS.critical / BAR_MAX) * 100}%` }} />
          <div className={cn("h-full", overtimeAlertBarColor(level))} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[9px] font-mono w-9 text-right shrink-0">{ot.toFixed(1)}h</span>
        <span className={cn("text-[9px] px-1 py-0.5 rounded shrink-0", overtimeAlertColor(level))}>
          {overtimeAlertShort(level)}
        </span>
      </div>
    </div>
  );
}

export default async function WorkplacePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const params = await searchParams;
  const activeTab = SITE_TABS.find((t) => t.key === (params.site ?? "")) ?? SITE_TABS[0];

  const active = excelEmployees.filter((e) => !(e as any).retired);

  // タブに対応する workplace でフィルタ
  const filtered = active.filter((e) =>
    (activeTab.workplaces as readonly string[]).includes((e as any).workplace || "")
  );

  // 小栗工場タブ（または全表示）では 本社＋協同本社 を "本社" にまとめる
  const mergeKouri = activeTab.key === "kouri" || activeTab.key === "";
  const byWorkplace: Record<string, Emp[]> = {};
  for (const e of filtered) {
    const raw = (e as any).workplace || "不明";
    const w = mergeKouri && raw === "協同本社" ? "本社" : raw;
    if (!byWorkplace[w]) byWorkplace[w] = [];
    byWorkplace[w].push(e);
  }

  const workplaces = WORKPLACE_ORDER.filter((w) => byWorkplace[w]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 size={22} /> 作業区管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">勤務地・作業区・男女ごとのメンバー一覧</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b border-slate-200">
        {SITE_TABS.map((tab) => {
          const href = tab.key ? `/workplace?site=${tab.key}` : "/workplace";
          const isActive = tab.key === (params.site ?? "");
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4">
        {workplaces.map((workplace) => {
          const members = byWorkplace[workplace] ?? [];

          const bySec: Record<string, Emp[]> = {};
          for (const e of members) {
            const sec = ((e as any).section ?? "").trim() || "—";
            if (!bySec[sec]) bySec[sec] = [];
            bySec[sec].push(e);
          }

          const natCounts: Record<string, number> = {};
          members.forEach((e) => {
            const k = (e as any).nationality || "不明";
            natCounts[k] = (natCounts[k] ?? 0) + 1;
          });

          const sections = Object.keys(bySec).sort((a, b) => {
            if (a === "—") return 1;
            if (b === "—") return -1;
            return a.localeCompare(b, "ja");
          });

          const displayName = WORKPLACE_LABEL[workplace] ?? workplace;
          const isKouri = workplace === "本社";

          return (
            <div key={workplace} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <h2 className="font-bold text-lg">{displayName}</h2>
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">作業区</div>
                    <div className="font-bold">{sections.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">在籍</div>
                    <div className="font-bold">{members.length}名</div>
                  </div>
                </div>
              </div>

              {/* 国籍内訳 */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {Object.entries(natCounts).map(([k, v]) => (
                  <Badge key={k} className="bg-slate-100 text-slate-700 border border-slate-200">
                    {k} {v}名
                  </Badge>
                ))}
              </div>

              {/* 作業区別 */}
              <div className="mt-4 space-y-3">
                {isKouri ? (
                  // 小栗工場（本社）：現在区 → 特定技能 / 技能実習 × 男女
                  sections.map((sec) => {
                    const secPeople = bySec[sec];
                    return (
                      <div key={sec}>
                        <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1 border-b border-slate-200 pb-1">
                          {sec}　{secPeople.length}名
                        </div>
                        <div className="space-y-2 mt-2">
                          {["特定技能", "技能実習", "その他"].map((vg) => {
                            const people = secPeople.filter((e) => visaGroup((e as any).visa_type_jp) === vg);
                            if (people.length === 0) return null;
                            const males = people.filter((e) => (e as any).gender === "male");
                            const females = people.filter((e) => (e as any).gender === "female");
                            return (
                              <div key={vg}>
                                <div className="text-[11px] text-slate-400 mb-1 px-0.5">{vg}　{people.length}名</div>
                                {vg === "技能実習" ? (
                                  <div className="border-2 border-green-600 bg-green-100 rounded-lg p-2">
                                    <div className="flex flex-col gap-2">
                                      <GenderBox label="男性" people={males} color="blue" />
                                      <GenderBox label="女性" people={females} color="rose" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <GenderBox label="男性" people={males} color="blue" />
                                    <GenderBox label="女性" people={females} color="rose" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // その他：作業区 × 男女
                  sections.map((sec) => {
                    const people = bySec[sec];
                    const males = people.filter((e) => (e as any).gender === "male");
                    const females = people.filter((e) => (e as any).gender === "female");
                    const others = people.filter((e) => (e as any).gender !== "male" && (e as any).gender !== "female");
                    return (
                      <div key={sec}>
                        <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">
                          {sec}　{people.length}名
                        </div>
                        <div className="flex flex-col gap-2">
                          <GenderBox label="男性" people={males} color="blue" />
                          <GenderBox label="女性" people={females} color="rose" />
                        </div>
                        {others.length > 0 && (
                          <div className="mt-1 border border-slate-200 bg-slate-50 rounded-lg p-2 text-xs">
                            <div className="font-semibold text-slate-600 mb-1">その他 {others.length}名</div>
                            <div className="space-y-1">{others.map((e) => <PersonRow key={e.id} e={e} />)}</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
