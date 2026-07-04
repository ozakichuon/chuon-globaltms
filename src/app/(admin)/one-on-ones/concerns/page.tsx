import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import { excelOneOnOneItems } from "@/lib/excel-data";
import {
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  KIND_LABEL,
  PRIORITY_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
} from "@/lib/one-on-one-labels";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ListChecks, ArrowLeft, Filter } from "lucide-react";
import type {
  OneOnOneItem,
  OneOnOneItemCategory,
  OneOnOneItemKind,
  OneOnOneItemStatus,
} from "@/lib/excel-types";

export const dynamic = "force-dynamic";

const COLUMNS: {
  key: OneOnOneItemStatus;
  color: string;
  ring: string;
  head: string;
}[] = [
  { key: "open", color: "bg-slate-50", ring: "border-slate-300", head: "text-slate-700" },
  { key: "in_progress", color: "bg-amber-50", ring: "border-amber-300", head: "text-amber-800" },
  { key: "done", color: "bg-emerald-50", ring: "border-emerald-300", head: "text-emerald-800" },
];

export default async function ConcernsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; kind?: string }>;
}) {
  const params = (await searchParams) ?? {};

  const filtered = excelOneOnOneItems.filter((i) => {
    if (params.category && i.category !== params.category) return false;
    if (params.kind && i.kind !== params.kind) return false;
    return true;
  });

  // ステータス別にグループ
  const grouped: Record<OneOnOneItemStatus, OneOnOneItem[]> = {
    open: [],
    in_progress: [],
    done: [],
    cancelled: [],
  };
  filtered.forEach((i) => {
    if (i.status in grouped) grouped[i.status].push(i);
  });
  (Object.keys(grouped) as OneOnOneItemStatus[]).forEach((k) => {
    grouped[k].sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
  });

  // カテゴリ・種別のカウント
  const catCounts: Record<string, number> = {};
  const kindCounts: Record<string, number> = {};
  excelOneOnOneItems.forEach((i) => {
    catCounts[i.category] = (catCounts[i.category] ?? 0) + 1;
    kindCounts[i.kind] = (kindCounts[i.kind] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/one-on-ones"
            className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <ArrowLeft size={12} /> 1on1 面談管理へ戻る
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-2">
            <ListChecks size={22} /> 悩み集約ボード
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            全 1on1 セッションで挙がった悩み・質問・タスクを横断して管理
          </p>
        </div>
      </div>

      {/* フィルタ */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Filter size={14} /> カテゴリ
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={!params.category}
            href={filterHref({ ...params, category: undefined })}
            label="すべて"
            count={excelOneOnOneItems.length}
          />
          {Object.entries(catCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, c]) => (
              <FilterChip
                key={k}
                active={params.category === k}
                href={filterHref({ ...params, category: k })}
                label={CATEGORY_LABEL[k as OneOnOneItemCategory] ?? k}
                count={c}
                tone={CATEGORY_STYLE[k as OneOnOneItemCategory]}
              />
            ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold pt-2">
          <Filter size={14} /> 種別
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={!params.kind}
            href={filterHref({ ...params, kind: undefined })}
            label="すべて"
            count={excelOneOnOneItems.length}
          />
          {Object.entries(kindCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, c]) => (
              <FilterChip
                key={k}
                active={params.kind === k}
                href={filterHref({ ...params, kind: k })}
                label={KIND_LABEL[k as OneOnOneItemKind] ?? k}
                count={c}
              />
            ))}
        </div>
      </div>

      {/* 看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={cn("rounded-2xl border p-3 min-h-[500px]", col.color, col.ring)}
          >
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className={cn("font-bold text-sm", col.head)}>
                {STATUS_LABEL[col.key]}
              </h3>
              <span
                className={cn(
                  "text-xs font-mono px-2 py-0.5 rounded-full bg-white/60",
                  col.head
                )}
              >
                {grouped[col.key].length}
              </span>
            </div>

            <div className="space-y-2">
              {grouped[col.key].length === 0 && (
                <div className="text-xs text-slate-400 text-center py-6">(なし)</div>
              )}
              {grouped[col.key].slice(0, 80).map((i) => (
                <ConcernCard key={i.id} item={i} />
              ))}
              {grouped[col.key].length > 80 && (
                <div className="text-xs text-slate-500 text-center py-2">
                  残り {grouped[col.key].length - 80} 件
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConcernCard({ item }: { item: OneOnOneItem }) {
  return (
    <Link
      href={`/one-on-ones/${item.one_on_one_id}`}
      className="block bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge className={CATEGORY_STYLE[item.category]}>
          {CATEGORY_LABEL[item.category]}
        </Badge>
        <span className="text-[10px] text-slate-500">{formatDate(item.meeting_date)}</span>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <MiniAvatar
          name={item.employee_name}
          nationality={item.employee_nationality}
          size={24}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium truncate">{item.employee_name}</div>
          <div className="text-[10px] text-slate-400 truncate">
            メンター: {item.mentor_name}
          </div>
        </div>
        <Badge className={cn("text-[10px]", PRIORITY_STYLE[item.priority])}>
          {item.priority === "high" ? "高" : item.priority === "medium" ? "中" : "低"}
        </Badge>
      </div>

      <div className="text-xs font-medium text-slate-800 mb-1">
        {KIND_LABEL[item.kind]} {item.title}
      </div>
      <div className="text-xs text-slate-600 line-clamp-2">{item.detail}</div>

      {item.status === "done" && item.resolution_note && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-emerald-700">
          ✓ {item.resolution_note}
        </div>
      )}

      {item.assigned_to && item.status !== "done" && (
        <div className="mt-2 text-[10px] text-slate-500">担当: {item.assigned_to}</div>
      )}
    </Link>
  );
}

function FilterChip({
  active,
  href,
  label,
  count,
  tone,
}: {
  active: boolean;
  href: string;
  label: string;
  count: number;
  tone?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "badge",
        active
          ? "bg-brand-600 text-white"
          : tone ?? "bg-slate-100 text-slate-700 border border-slate-200"
      )}
    >
      {label} <span className="ml-1 font-mono">{count}</span>
    </Link>
  );
}

function filterHref(p: { category?: string; kind?: string }): string {
  const qs = new URLSearchParams();
  if (p.category) qs.set("category", p.category);
  if (p.kind) qs.set("kind", p.kind);
  const s = qs.toString();
  return `/one-on-ones/concerns${s ? `?${s}` : ""}`;
}
