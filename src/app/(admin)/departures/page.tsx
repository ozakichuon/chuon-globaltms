import { excelEmployees, employeePhotoMap } from "@/lib/excel-data";
import { MiniAvatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { formatDate, tenureString, nationalityFlag } from "@/lib/utils";
import { visaLabel } from "@/lib/labels";
import Link from "next/link";
import { PlaneTakeoff, LogOut, Clock, CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

// "2025/09" や "2025-09" → その月の1日のDate
function parseYearMonth(s: string | null): Date | null {
  if (!s) return null;
  const normalized = s.replace("/", "-");
  const m = normalized.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, 1);
}

function monthsFromNow(d: Date): number {
  const now = new Date();
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}

function formatYearMonth(s: string | null): string {
  if (!s) return "—";
  const d = parseYearMonth(s);
  if (!d) return s;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

const RETURN_GROUPS = [
  { key: "past",   label: "期限超過",   tone: "bg-red-50 border-red-200",     textColor: "text-red-700",    months: [-Infinity, 0] },
  { key: "3m",     label: "3ヶ月以内",  tone: "bg-orange-50 border-orange-200", textColor: "text-orange-700", months: [0, 3] },
  { key: "6m",     label: "6ヶ月以内",  tone: "bg-amber-50 border-amber-200", textColor: "text-amber-700",  months: [3, 6] },
  { key: "1y",     label: "1年以内",    tone: "bg-yellow-50 border-yellow-200", textColor: "text-yellow-700", months: [6, 12] },
  { key: "over1y", label: "1年以上先",  tone: "bg-slate-50 border-slate-200", textColor: "text-slate-600",  months: [12, Infinity] },
] as const;

type GroupKey = typeof RETURN_GROUPS[number]["key"];

const SITE_FILTERS = [
  { key: "小栗工場", workplaces: ["本社", "小栗"] },
  { key: "津吉工場", workplaces: ["津吉"] },
  { key: "西条工場", workplaces: ["西条"] },
];

function matchSite(workplace: string | null | undefined, site: string): boolean {
  if (!site) return true;
  const wp = workplace ?? "";
  const filter = SITE_FILTERS.find((f) => f.key === site);
  if (!filter) return true;
  return filter.workplaces.some((kw) => wp.includes(kw));
}

export default function DeparturesPage({
  searchParams,
}: {
  searchParams?: { site?: string };
}) {
  const site = searchParams?.site ?? "";
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // 退職予定（マーク付き・未退職）
  const scheduled = excelEmployees
    .filter((e) => !e.retired && e.retired_mark === "退職予定" && matchSite(e.workplace, site))
    .sort((a, b) => (a.retired_at ?? "").localeCompare(b.retired_at ?? ""));

  // 帰国予定（在籍中で expected_return あり）
  const activeWithReturn = excelEmployees
    .filter((e) => !e.retired && e.expected_return && matchSite(e.workplace, site))
    .map((e) => {
      const d = parseYearMonth(e.expected_return);
      const months = d ? monthsFromNow(d) : null;
      return { ...e, returnDate: d, monthsFromNow: months };
    })
    .sort((a, b) => {
      if (!a.returnDate) return 1;
      if (!b.returnDate) return -1;
      return a.returnDate.getTime() - b.returnDate.getTime();
    });

  const grouped: Record<GroupKey, typeof activeWithReturn> = {
    past: [], "3m": [], "6m": [], "1y": [], over1y: [],
  };
  for (const e of activeWithReturn) {
    const m = e.monthsFromNow;
    if (m === null) continue;
    if (m < 0) grouped.past.push(e);
    else if (m < 3) grouped["3m"].push(e);
    else if (m < 6) grouped["6m"].push(e);
    else if (m < 12) grouped["1y"].push(e);
    else grouped.over1y.push(e);
  }

  // 退職済み（直近12ヶ月）
  const recentRetired = excelEmployees
    .filter((e) => e.retired && e.retired_at && new Date(e.retired_at) >= oneYearAgo && matchSite(e.workplace, site))
    .sort((a, b) => new Date(b.retired_at ?? 0).getTime() - new Date(a.retired_at ?? 0).getTime());

  // 一時帰国：複数（改行区切り）対応・To経過後3日まで表示
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  function parseTripDates(from: string | null, to: string | null) {
    const froms = (from ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    const tos = (to ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    const count = Math.max(froms.length, tos.length, 1);
    return Array.from({ length: count }, (_, i) => ({
      from: froms[i] ?? null,
      to: tos[i] ?? null,
    }));
  }

  function hasActiveTrip(from: string | null, to: string | null): boolean {
    const trips = parseTripDates(from, to);
    return trips.some(({ from: f, to: t }) => {
      const toDate = t ? new Date(t.replace(/\//g, "-")) : null;
      const fromDate = f ? new Date(f.replace(/\//g, "-")) : null;
      if (toDate) return toDate >= threeDaysAgo;
      if (fromDate) return fromDate >= threeDaysAgo;
      return false;
    });
  }

  const tempReturns = excelEmployees
    .filter((e) => !e.retired && matchSite(e.workplace, site) && hasActiveTrip(e.temporary_return_from, e.temporary_return_to))
    .sort((a, b) => {
      const aTrips = parseTripDates(a.temporary_return_from, a.temporary_return_to);
      const bTrips = parseTripDates(b.temporary_return_from, b.temporary_return_to);
      const aFirst = aTrips[0]?.from ?? "";
      const bFirst = bTrips[0]?.from ?? "";
      return aFirst.localeCompare(bFirst);
    });

  // 帰国中（fromDate <= now && toDate >= now）の人数
  const ongoingCount = tempReturns.filter((e) =>
    parseTripDates(e.temporary_return_from, e.temporary_return_to).some(({ from: f, to: t }) => {
      const fromDate = f ? new Date(f.replace(/\//g, "-")) : null;
      const toDate = t ? new Date(t.replace(/\//g, "-")) : null;
      return fromDate && fromDate <= now && (!toDate || toDate >= now);
    })
  ).length;

  // 一時帰国予定（fromDate > now）の人数
  const upcomingCount = tempReturns.filter((e) =>
    parseTripDates(e.temporary_return_from, e.temporary_return_to).some(({ from: f }) => {
      const fromDate = f ? new Date(f.replace(/\//g, "-")) : null;
      return fromDate && fromDate > now;
    })
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlaneTakeoff size={22} className="text-sky-500" />
          帰国・退職予定ダッシュボード
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          在籍者の帰国・退職スケジュールを一元管理。人員補充計画に活用してください。
        </p>
      </div>

      {/* 工場フィルター */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500">工場：</span>
        {[{ key: "", label: "すべて" }, ...SITE_FILTERS.map((f) => ({ key: f.key, label: f.key }))].map((tab) => (
          <Link
            key={tab.key}
            href={tab.key ? `/departures?site=${encodeURIComponent(tab.key)}` : "/departures"}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              site === tab.key
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-sky-400"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-red-50 border-red-200 p-4">
          <div className="text-xs text-slate-500">退職予定（マーク付き）</div>
          <div className="text-3xl font-bold text-red-700 mt-1">
            {scheduled.length}
            <span className="text-sm font-normal text-slate-500 ml-1">名</span>
          </div>
        </div>
        <div className="rounded-xl border bg-indigo-50 border-indigo-200 p-4">
          <div className="text-xs text-slate-500">帰国中</div>
          <div className="text-3xl font-bold text-indigo-700 mt-1">
            {ongoingCount}
            <span className="text-sm font-normal text-slate-500 ml-1">名</span>
          </div>
        </div>
        <div className="rounded-xl border bg-sky-50 border-sky-200 p-4">
          <div className="text-xs text-slate-500">一時帰国予定</div>
          <div className="text-3xl font-bold text-sky-700 mt-1">
            {upcomingCount}
            <span className="text-sm font-normal text-slate-500 ml-1">名</span>
          </div>
        </div>
        <div className="rounded-xl border bg-slate-50 border-slate-200 p-4">
          <div className="text-xs text-slate-500">直近12ヶ月の退職者</div>
          <div className="text-3xl font-bold text-slate-700 mt-1">
            {recentRetired.length}
            <span className="text-sm font-normal text-slate-500 ml-1">名</span>
          </div>
        </div>
      </div>

      {/* 退職予定（マーク付き）*/}
      {scheduled.length > 0 && (
        <section className="card border-l-4 border-l-red-400">
          <h2 className="font-bold flex items-center gap-2 text-red-700">
            <LogOut size={16} />
            退職予定（要対応）
            <span className="text-sm text-slate-500 font-normal">{scheduled.length}名</span>
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 px-2">社員番号</th>
                  <th className="py-2 px-2">氏名</th>
                  <th className="py-2 px-2">国籍</th>
                  <th className="py-2 px-2">在留資格</th>
                  <th className="py-2 px-2">入社日</th>
                  <th className="py-2 px-2">勤続</th>
                  <th className="py-2 px-2">退職予定日</th>
                  <th className="py-2 px-2">帰国予定</th>
                  <th className="py-2 px-2">備考</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-mono text-xs">{e.employee_code}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <MiniAvatar name={e.display_name} nationality={e.nationality} photoUrl={employeePhotoMap.get(e.id)} size={28} />
                        <Link href={`/employees/${e.id}`} className="font-medium hover:text-sky-600">
                          {e.display_name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs">
                      {nationalityFlag(e.nationality)} {e.nationality}
                    </td>
                    <td className="py-2.5 px-2 text-xs">{visaLabel(e.visa_status)}</td>
                    <td className="py-2.5 px-2 text-xs">{formatDate(e.hired_at)}</td>
                    <td className="py-2.5 px-2 text-xs">
                      {e.hired_at ? tenureString(e.hired_at) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-xs font-medium text-red-700">
                      {formatDate(e.retired_at)}
                    </td>
                    <td className="py-2.5 px-2 text-xs">
                      {formatYearMonth(e.expected_return)}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-500 max-w-xs truncate">
                      {e.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 帰国予定（タイムライン別） */}
      <div>
        <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
          <PlaneTakeoff size={18} className="text-sky-500" />
          帰国予定タイムライン
        </h2>

        {RETURN_GROUPS.map((g) => {
          const items = grouped[g.key];
          if (items.length === 0) return null;
          return (
            <section key={g.key} className="card mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className={`badge ${g.tone} ${g.textColor} border`}>{g.label}</span>
                <span className="text-sm text-slate-500">{items.length}名</span>
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b">
                      <th className="py-2 px-2">社員番号</th>
                      <th className="py-2 px-2">氏名</th>
                      <th className="py-2 px-2">国籍</th>
                      <th className="py-2 px-2">在留資格</th>
                      <th className="py-2 px-2">勤務地</th>
                      <th className="py-2 px-2">入社日</th>
                      <th className="py-2 px-2">勤続</th>
                      <th className="py-2 px-2">帰国予定</th>
                      <th className="py-2 px-2">支援機関</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e) => (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2.5 px-2 font-mono text-xs">{e.employee_code}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <MiniAvatar name={e.display_name} nationality={e.nationality} photoUrl={employeePhotoMap.get(e.id)} size={28} />
                            <Link href={`/employees/${e.id}`} className="font-medium hover:text-sky-600">
                              {e.display_name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-xs">
                          {nationalityFlag(e.nationality)} {e.nationality}
                        </td>
                        <td className="py-2.5 px-2 text-xs">{visaLabel(e.visa_status)}</td>
                        <td className="py-2.5 px-2 text-xs">{e.workplace ?? "—"}</td>
                        <td className="py-2.5 px-2 text-xs">{formatDate(e.hired_at)}</td>
                        <td className="py-2.5 px-2 text-xs">
                          {e.hired_at ? tenureString(e.hired_at) : "—"}
                        </td>
                        <td className={`py-2.5 px-2 text-xs font-medium ${g.textColor}`}>
                          {formatYearMonth(e.expected_return)}
                        </td>
                        <td className="py-2.5 px-2 text-xs text-slate-500">
                          {e.support_agency ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* 一時帰国 */}
      {tempReturns.length > 0 && (
        <section className="card">
          <h2 className="font-bold flex items-center gap-2">
            <CalendarClock size={16} className="text-indigo-500" />
            一時帰国
            <span className="text-sm text-slate-500 font-normal">{tempReturns.length}名</span>
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 px-2">社員番号</th>
                  <th className="py-2 px-2">氏名</th>
                  <th className="py-2 px-2">国籍</th>
                  <th className="py-2 px-2">在留資格</th>
                  <th className="py-2 px-2">一時帰国（出発）</th>
                  <th className="py-2 px-2">一時帰国（帰任）</th>
                  <th className="py-2 px-2">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {tempReturns.map((e) => {
                  const trips = parseTripDates(e.temporary_return_from, e.temporary_return_to);
                  return (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-mono text-xs">{e.employee_code}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <MiniAvatar name={e.display_name} nationality={e.nationality} photoUrl={employeePhotoMap.get(e.id)} size={28} />
                          <Link href={`/employees/${e.id}`} className="font-medium hover:text-sky-600">
                            {e.display_name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        {nationalityFlag(e.nationality)} {e.nationality}
                      </td>
                      <td className="py-2.5 px-2 text-xs">{visaLabel(e.visa_status)}</td>
                      <td className="py-2.5 px-2 text-xs">
                        {trips.map((t, i) => (
                          <div key={i}>{t.from ? formatDate(t.from.replace(/\//g, "-")) : "—"}</div>
                        ))}
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        {trips.map((t, i) => (
                          <div key={i}>{t.to ? formatDate(t.to.replace(/\//g, "-")) : "—"}</div>
                        ))}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex flex-col gap-1">
                          {trips.map((t, i) => {
                            const fromDate = t.from ? new Date(t.from.replace(/\//g, "-")) : null;
                            const toDate = t.to ? new Date(t.to.replace(/\//g, "-")) : null;
                            const isOngoing = fromDate && fromDate <= now && (!toDate || toDate >= now);
                            const isUpcoming = fromDate && fromDate > now;
                            return (
                              <span key={i}>
                                {isOngoing ? (
                                  <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200">帰国中</Badge>
                                ) : isUpcoming ? (
                                  <Badge className="bg-sky-100 text-sky-700 border border-sky-200">予定</Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-500 border border-slate-200">完了</Badge>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 退職済み（直近12ヶ月） */}
      {recentRetired.length > 0 && (
        <section className="card">
          <h2 className="font-bold flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            退職済み（直近12ヶ月）
            <span className="text-sm text-slate-500 font-normal">{recentRetired.length}名</span>
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 px-2">社員番号</th>
                  <th className="py-2 px-2">氏名</th>
                  <th className="py-2 px-2">国籍</th>
                  <th className="py-2 px-2">在留資格</th>
                  <th className="py-2 px-2">勤務地</th>
                  <th className="py-2 px-2">入社日</th>
                  <th className="py-2 px-2">勤続</th>
                  <th className="py-2 px-2">退職日</th>
                  <th className="py-2 px-2">区分</th>
                </tr>
              </thead>
              <tbody>
                {recentRetired.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-mono text-xs">{e.employee_code}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <MiniAvatar name={e.display_name} nationality={e.nationality} photoUrl={employeePhotoMap.get(e.id)} size={28} />
                        <Link href={`/employees/${e.id}`} className="font-medium hover:text-sky-600 text-slate-500">
                          {e.display_name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs">
                      {nationalityFlag(e.nationality)} {e.nationality}
                    </td>
                    <td className="py-2.5 px-2 text-xs">{visaLabel(e.visa_status)}</td>
                    <td className="py-2.5 px-2 text-xs">{e.workplace ?? "—"}</td>
                    <td className="py-2.5 px-2 text-xs">{formatDate(e.hired_at)}</td>
                    <td className="py-2.5 px-2 text-xs">
                      {e.hired_at && e.retired_at
                        ? tenureString(e.hired_at, new Date(e.retired_at))
                        : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-xs font-medium">{formatDate(e.retired_at)}</td>
                    <td className="py-2.5 px-2">
                      <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
                        {e.retired_mark ?? "退職"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
