import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import { excelSupportTickets, excelEmployees, employeePhotoMap } from "@/lib/excel-data";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import { FileHeart, Filter, LayoutGrid, List } from "lucide-react";
import type { SupportTicket } from "@/lib/excel-types";

export const dynamic = "force-dynamic";

// 社員コード → 氏名・国籍のマップ
const empByCode = new Map(excelEmployees.map((e) => [e.employee_code, e]));

const KIND_STYLES: Record<string, string> = {
  病院: "bg-red-50 text-red-700 border border-red-200",
  修理: "bg-amber-50 text-amber-700 border border-amber-200",
  問合せ: "bg-slate-50 text-slate-700 border border-slate-200",
  一時帰国: "bg-blue-50 text-blue-700 border border-blue-200",
  退職: "bg-slate-100 text-slate-600 border border-slate-300",
  クレーム: "bg-orange-50 text-orange-700 border border-orange-200",
  妊娠: "bg-pink-50 text-pink-700 border border-pink-200",
  結婚: "bg-rose-50 text-rose-700 border border-rose-200",
  携帯: "bg-sky-50 text-sky-700 border border-sky-200",
  紛失: "bg-amber-50 text-amber-700 border border-amber-200",
  購入: "bg-slate-50 text-slate-700 border border-slate-200",
  帰国: "bg-indigo-50 text-indigo-700 border border-indigo-200",
};

const STATUS_STYLES: Record<string, string> = {
  完了: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  対応中: "bg-amber-50 text-amber-700 border border-amber-200",
  未着手: "bg-slate-100 text-slate-700 border border-slate-300",
};

type StatusKey = "未着手" | "対応中" | "完了";

function normalizeStatus(s: string | null): StatusKey {
  if (s === "完了") return "完了";
  if (s === "対応中") return "対応中";
  return "未着手";
}

const COLUMNS: { key: StatusKey; color: string; ring: string; head: string }[] = [
  { key: "未着手", color: "bg-slate-50", ring: "border-slate-300", head: "text-slate-700" },
  { key: "対応中", color: "bg-amber-50", ring: "border-amber-300", head: "text-amber-800" },
  { key: "完了",   color: "bg-emerald-50", ring: "border-emerald-300", head: "text-emerald-800" },
];

type ViewMode = "board" | "list";

const SITE_FILTERS = [
  { key: "小栗工場", workplaces: ["本社", "小栗"] },
  { key: "津吉工場", workplaces: ["津吉"] },
  { key: "西条工場", workplaces: ["西条"] },
];

function getTicketSite(t: SupportTicket): string | null {
  if (!t.target_employee_code) return null;
  const emp = empByCode.get(t.target_employee_code);
  if (!emp) return null;
  const wp = (emp as any).workplace ?? "";
  for (const sf of SITE_FILTERS) {
    if (sf.workplaces.some((w) => wp.includes(w))) return sf.key;
  }
  return null;
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<{ kind?: string; status?: string; view?: string; site?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const view: ViewMode = params.view === "list" ? "list" : "board";

  // kind・siteフィルタ適用
  const base = excelSupportTickets.filter((t) => {
    if (params.kind && t.kind !== params.kind) return false;
    if (params.site && getTicketSite(t) !== params.site) return false;
    return true;
  });

  const kindCounts: Record<string, number> = {};
  excelSupportTickets
    .filter((t) => !params.site || getTicketSite(t) === params.site)
    .forEach((t) => {
      if (t.kind) kindCounts[t.kind] = (kindCounts[t.kind] ?? 0) + 1;
    });

  // 状態別グループ
  const grouped: Record<StatusKey, SupportTicket[]> = {
    未着手: [],
    対応中: [],
    完了: [],
  };
  base.forEach((t) => {
    grouped[normalizeStatus(t.status)].push(t);
  });
  // 日付で新しい順
  (Object.keys(grouped) as StatusKey[]).forEach((k) => {
    grouped[k].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  });

  const totalCounts = {
    未着手: base.filter((t) => normalizeStatus(t.status) === "未着手").length,
    対応中: base.filter((t) => normalizeStatus(t.status) === "対応中").length,
    完了: base.filter((t) => normalizeStatus(t.status) === "完了").length,
  };

  const filteredList = base
    .filter((t) => (params.status ? normalizeStatus(t.status) === params.status : true))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileHeart size={22} /> 生活サポート履歴
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            実習生の病院・修理・生活相談等の対応管理。全 {excelSupportTickets.length} 件
            <span className="ml-3">
              未着手 <b>{totalCounts.未着手}</b> / 対応中 <b>{totalCounts.対応中}</b> / 完了 <b>{totalCounts.完了}</b>
            </span>
            <span className="block text-red-600 font-semibold mt-1">※要配慮個人情報を含むためアクセス権限は人事のみ</span>
          </p>
        </div>

        {/* 表示切替 */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <ViewLink
            active={view === "board"}
            view="board"
            params={params}
            label="看板"
            icon={<LayoutGrid size={14} />}
          />
          <ViewLink
            active={view === "list"}
            view="list"
            params={params}
            label="リスト"
            icon={<List size={14} />}
          />
        </div>
      </div>

      {/* フィルタ */}
      <div className="card space-y-3">
        {/* 工場フィルタ */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold shrink-0">工場</span>
          <Link
            href={withParams({ view, ...(params.kind ? { kind: params.kind } : {}), ...(params.status ? { status: params.status } : {}) }, "site", null)}
            className={`badge ${!params.site ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"}`}
          >
            すべて
          </Link>
          {SITE_FILTERS.map((sf) => {
            const count = excelSupportTickets.filter((t) => getTicketSite(t) === sf.key && (!params.kind || t.kind === params.kind)).length;
            return (
              <Link
                key={sf.key}
                href={withParams({ view, ...(params.kind ? { kind: params.kind } : {}), ...(params.status ? { status: params.status } : {}) }, "site", sf.key)}
                className={`badge ${params.site === sf.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"}`}
              >
                {sf.key} {count}
              </Link>
            );
          })}
        </div>

        {/* カテゴリフィルタ */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold mb-2">
            <Filter size={14} /> カテゴリ
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={withParams({ view, ...(params.site ? { site: params.site } : {}) }, "kind", null)}
              className={`badge ${!params.kind ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"}`}
            >
              すべて {excelSupportTickets.filter((t) => !params.site || getTicketSite(t) === params.site).length}
            </Link>
            {Object.entries(kindCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <Link
                  key={k}
                  href={withParams({ view, ...(params.status ? { status: params.status } : {}), ...(params.site ? { site: params.site } : {}) }, "kind", k)}
                  className={`badge ${
                    params.kind === k
                      ? "bg-brand-600 text-white"
                      : KIND_STYLES[k] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {k} {v}
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* 看板ビュー */}
      {view === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={cn("rounded-2xl border p-3 min-h-[400px]", col.color, col.ring)}
            >
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className={cn("font-bold text-sm", col.head)}>
                  {col.key}
                </h3>
                <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full bg-white/60", col.head)}>
                  {grouped[col.key].length}
                </span>
              </div>

              <div className="space-y-2">
                {grouped[col.key].length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-6">
                    (なし)
                  </div>
                )}
                {grouped[col.key].slice(0, 60).map((t) => (
                  <TicketCard key={t.id} t={t} />
                ))}
                {grouped[col.key].length > 60 && (
                  <div className="text-xs text-slate-500 text-center py-2">
                    残り {grouped[col.key].length - 60} 件はリスト表示で
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* リストビュー */}
      {view === "list" && (
        <>
          {/* 状態フィルタ */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href={withParams({ view: "list", ...(params.kind ? { kind: params.kind } : {}) }, "status", null)}
              className={`badge ${!params.status ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"}`}
            >
              全状態
            </Link>
            {(["未着手", "対応中", "完了"] as StatusKey[]).map((s) => (
              <Link
                key={s}
                href={withParams({ view: "list", ...(params.kind ? { kind: params.kind } : {}) }, "status", s)}
                className={`badge ${params.status === s ? "bg-brand-600 text-white" : STATUS_STYLES[s]}`}
              >
                {s} {grouped[s].length}
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            {filteredList.slice(0, 100).map((t) => {
              const emp = t.target_employee_code ? empByCode.get(t.target_employee_code) : null;
              return (
                <div key={t.id} className="card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className={KIND_STYLES[t.kind ?? ""] ?? "bg-slate-100"}>
                        {t.kind ?? "—"}
                      </Badge>
                      <Badge className={STATUS_STYLES[normalizeStatus(t.status)]}>
                        {normalizeStatus(t.status)}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(t.date)}
                      </span>
                      {t.recorder && (
                        <span className="text-xs text-slate-400">記録者: {t.recorder}</span>
                      )}
                    </div>
                    {emp && (
                      <Link href={`/support/${t.id}`} className="flex items-center gap-2 hover:opacity-80">
                        <MiniAvatar name={emp.display_name} nationality={emp.nationality} photoUrl={employeePhotoMap.get(emp.id)} size={32} />
                        <div>
                          <div className="text-sm font-medium hover:text-brand-600">{emp.display_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            #{t.target_employee_code}
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>

                  {t.request_note && (
                    <div className="mt-2 text-sm whitespace-pre-wrap bg-slate-50 rounded-lg p-2">
                      {t.request_note}
                    </div>
                  )}

                  {t.responses.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-slate-200 space-y-2">
                      {t.responses.map((r, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex items-center gap-2 text-slate-500">
                            {r.date && <span>{formatDate(r.date)}</span>}
                            {r.responder && <span>対応: {r.responder}</span>}
                          </div>
                          {r.note && (
                            <div className="mt-1 whitespace-pre-wrap text-slate-700">
                              {r.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredList.length > 100 && (
              <div className="text-xs text-slate-500 text-center">
                残り {filteredList.length - 100} 件はページネーション実装予定
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// 看板カード
function TicketCard({ t }: { t: SupportTicket }) {
  const emp = t.target_employee_code ? empByCode.get(t.target_employee_code) : null;
  const statusKey = normalizeStatus(t.status);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-brand-200 transition-shadow">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge className={KIND_STYLES[t.kind ?? ""] ?? "bg-slate-100 text-slate-700 border border-slate-200"}>
          {t.kind ?? "—"}
        </Badge>
        <span className="text-[10px] text-slate-500">{formatDate(t.date)}</span>
      </div>

      {emp && (
        <Link href={`/support/${t.id}`} className="flex items-center gap-2 mb-2 hover:opacity-80">
          <MiniAvatar name={emp.display_name} nationality={emp.nationality} photoUrl={employeePhotoMap.get(emp.id)} size={28} />
          <div className="min-w-0">
            <div className="text-xs font-medium truncate hover:text-brand-600">{emp.display_name}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              #{t.target_employee_code}
            </div>
          </div>
        </Link>
      )}

      {t.request_note && (
        <div className="text-xs text-slate-700 line-clamp-3">{t.request_note}</div>
      )}

      {t.responses.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <span>対応 {t.responses.length} 回</span>
          {statusKey === "対応中" && t.responses[t.responses.length - 1]?.date && (
            <span>最終 {formatDate(t.responses[t.responses.length - 1].date)}</span>
          )}
        </div>
      )}
    </div>
  );
}

// View切替リンク
function ViewLink({
  active,
  view,
  params,
  label,
  icon,
}: {
  active: boolean;
  view: ViewMode;
  params: { kind?: string; status?: string; view?: string };
  label: string;
  icon: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  if (params.kind) qs.set("kind", params.kind);
  if (params.status && view === "list") qs.set("status", params.status);
  qs.set("view", view);
  return (
    <Link
      href={`/support?${qs.toString()}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
        active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

// クエリパラメータ操作ヘルパー
function withParams(
  base: Record<string, string>,
  key: string,
  value: string | null
): string {
  const qs = new URLSearchParams(base);
  if (value === null) qs.delete(key);
  else qs.set(key, value);
  const str = qs.toString();
  return `/support${str ? `?${str}` : ""}`;
}
