import { Badge } from "@/components/Badge";
import { EmployeeCard } from "@/components/EmployeeCard";
import { getEmployees } from "@/lib/data";
import {
  alertColor,
  careerLevelBadge,
  formatDate,
  nationalityFlag,
  tenureString,
} from "@/lib/utils";
import { employmentTypeLabel, visaLabel } from "@/lib/labels";
import Link from "next/link";
import { UserPlus, Search, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ViewMode = "card" | "list";

const SITE_TABS = [
  { key: "", label: "すべて" },
  { key: "小栗工場", label: "小栗工場" },
  { key: "協同本社", label: "協同本社" },
  { key: "津吉", label: "津吉" },
  { key: "西条工場", label: "西条工場" },
  { key: "西条ファーム", label: "西条ファーム" },
] as const;

const SITE_TO_ORG: Record<string, string> = {
  津吉: "津吉工場",
  小栗工場: "本社（小栗）",
  西条工場: "西条工場",
  西条ファーム: "西条ファーム",
  協同本社: "協同本社",
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; nat?: string; type?: string; view?: string; status?: string; site?: string }>;
}) {
  const params = await searchParams;
  const view: ViewMode = params.view === "list" ? "list" : "card";
  const all = await getEmployees();

  const showRetired = params.status === "retired";
  const showKids = params.status === "kids";

  const activeOnly = showRetired
    ? all.filter((e) => e.status === "retired")
    : showKids
    ? all.filter((e) => e.status === "child")
    : all.filter((e) => e.status === "active");

  const filtered = activeOnly.filter((e) => {
    if (params.q) {
      const q = params.q.toLowerCase();
      const hit =
        e.display_name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        (e.last_name_native ?? "").toLowerCase().includes(q) ||
        (e.first_name_native ?? "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (params.nat && e.nationality !== params.nat) return false;
    if (params.type && e.employment_type !== params.type) return false;
    if (params.site) {
      const orgName = SITE_TO_ORG[params.site];
      if (orgName && e.organization_name !== orgName) return false;
    }
    return true;
  });

  // 在留カード残日数の昇順（null = 日本人等は末尾）
  filtered.sort((a, b) => {
    if (a.visa_days_until_expiry === null && b.visa_days_until_expiry === null) return 0;
    if (a.visa_days_until_expiry === null) return 1;
    if (b.visa_days_until_expiry === null) return -1;
    return a.visa_days_until_expiry - b.visa_days_until_expiry;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">従業員一覧</h1>
          <p className="text-sm text-slate-500 mt-1">
            {showRetired ? "退職者" : showKids ? "子供" : "在籍中"}{" "}
            {filtered.length} 名
            （全社 {all.filter((e) => e.status === "active" || e.status === "child").length} /
            子供 {all.filter((e) => e.status === "child").length} /
            退職 {all.filter((e) => e.status === "retired").length}）
            {showRetired || showKids ? (
              <Link href={`/employees?view=${view}`} className="ml-2 text-brand-600 hover:underline">
                在籍中を表示
              </Link>
            ) : null}
            {!showRetired && (
              <Link href={`/employees?view=${view}&status=retired`} className="ml-2 text-brand-600 hover:underline">
                退職者を表示
              </Link>
            )}
            {!showKids && (
              <Link href={`/employees?view=${view}&status=kids`} className="ml-2 text-brand-600 hover:underline">
                子供を表示
              </Link>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 表示切替 */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <ViewToggleLink
              active={view === "card"}
              view="card"
              params={params}
              label="カード"
              icon={<LayoutGrid size={14} />}
            />
            <ViewToggleLink
              active={view === "list"}
              view="list"
              params={params}
              label="リスト"
              icon={<List size={14} />}
            />
          </div>
          <button className="btn-primary">
            <UserPlus size={16} /> 従業員を追加
          </button>
        </div>
      </div>

      {/* 工場タブ */}
      <div className="flex gap-1 border-b border-slate-200">
        {SITE_TABS.map((tab) => {
          const qs = new URLSearchParams();
          if (params.q) qs.set("q", params.q);
          if (params.nat) qs.set("nat", params.nat);
          if (params.type) qs.set("type", params.type);
          if (params.view) qs.set("view", params.view);
          if (params.status) qs.set("status", params.status);
          if (tab.key) qs.set("site", tab.key);
          const active = (params.site ?? "") === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/employees?${qs.toString()}`}
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

      {/* フィルタ */}
      <form className="card flex flex-wrap items-center gap-3">
        <input type="hidden" name="site" value={params.site ?? ""} />
        <div className="flex-1 min-w-[220px] relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="氏名 / 社員番号 / 母国語氏名で検索"
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <label className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">国籍</span>
          <select
            name="nat"
            defaultValue={params.nat ?? ""}
            className="border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
          >
            <option value="">すべて</option>
            <option value="JP">🇯🇵 日本</option>
            <option value="ID">🇮🇩 インドネシア</option>
            <option value="VN">🇻🇳 ベトナム</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">雇用形態</span>
          <select
            name="type"
            defaultValue={params.type ?? ""}
            className="border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
          >
            <option value="">すべて</option>
            <option value="regular">正社員</option>
            <option value="part_time">パート</option>
            <option value="technical_intern">技能実習</option>
            <option value="specified_skill">特定技能</option>
          </select>
        </label>

        <button className="btn-primary" type="submit">
          検索
        </button>
      </form>

      {/* カード表示 */}
      {view === "card" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((e) => (
            <EmployeeCard key={e.id} e={e} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 text-sm">
              該当する従業員はいません
            </div>
          )}
        </div>
      )}

      {/* リスト表示 */}
      {view === "list" && (
      <><div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs text-slate-500 border-b">
                <th className="py-3 px-4">社員番号</th>
                <th className="py-3 px-4">氏名</th>
                <th className="py-3 px-4">国籍</th>
                <th className="py-3 px-4">雇用形態</th>
                <th className="py-3 px-4">組織</th>
                <th className="py-3 px-4">キャリアLv</th>
                <th className="py-3 px-4">日本語</th>
                <th className="py-3 px-4">勤続</th>
                <th className="py-3 px-4">在留資格</th>
                <th className="py-3 px-4">期限</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
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
                return (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-mono text-xs">{e.employee_code}</td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/employees/${e.id}`}
                        className="font-medium hover:text-brand-600"
                      >
                        {e.display_name}
                      </Link>
                      {e.last_name_native && (
                        <div className="text-xs text-slate-500">
                          {e.last_name_native} {e.first_name_native}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-lg mr-1">
                        {nationalityFlag(e.nationality)}
                      </span>
                      <span className="text-xs">{e.nationality}</span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {employmentTypeLabel(e.employment_type)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {e.organization_name ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={careerLevelBadge(e.career_level)}>
                        Lv{e.career_level} {e.career_level_name_ja}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs">{e.jlpt_level}</td>
                    <td className="py-3 px-4 text-xs">
                      {e.status === "retired"
                        ? <span className="badge bg-slate-100 text-slate-600 border border-slate-300">退職</span>
                        : tenureString(e.hired_at)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {visaLabel(e.current_visa_status)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        {e.residence_card_procedure && (
                          <span className="badge bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            {e.residence_card_procedure}
                          </span>
                        )}
                        {e.visa_expires_at ? (
                          <span className={`badge ${alertColor(alertLv)}`}>
                            {formatDate(e.visa_expires_at)}
                            {e.visa_days_until_expiry !== null &&
                              e.visa_days_until_expiry >= 0 &&
                              ` (${e.visa_days_until_expiry}日)`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function ViewToggleLink({
  active,
  view,
  params,
  label,
  icon,
}: {
  active: boolean;
  view: ViewMode;
  params: { q?: string; nat?: string; type?: string; view?: string; site?: string; status?: string };
  label: string;
  icon: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.nat) qs.set("nat", params.nat);
  if (params.type) qs.set("type", params.type);
  if (params.site) qs.set("site", params.site);
  if (params.status) qs.set("status", params.status);
  qs.set("view", view);
  return (
    <Link
      href={`/employees?${qs.toString()}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
        active
          ? "bg-brand-600 text-white"
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
