import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import {
  excelOneOnOneItems,
  excelOneOnOnes,
  excelOneOnOneRequests,
} from "@/lib/excel-data";
import {
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  MOOD_EMOJI,
  MOOD_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_STYLE,
  URGENCY_STYLE,
} from "@/lib/one-on-one-labels";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  MessageCircle,
  Inbox,
  ListChecks,
  Calendar,
  ArrowRight,
  BellRing,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function OneOnOnesPage() {
  const sessions = excelOneOnOnes;
  const items = excelOneOnOneItems;
  const requests = excelOneOnOneRequests;

  const pending = requests.filter((r) => r.status === "pending");
  const accepted = requests.filter((r) => r.status === "accepted" || r.status === "scheduled");

  const openItems = items.filter((i) => i.status === "open" || i.status === "in_progress");

  // カテゴリ別の悩み集計
  const byCategory: Record<string, number> = {};
  openItems.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
  });

  // 最近30日のセッション
  const today = new Date();
  const thirtyAgo = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const recentSessions = sessions.filter((s) => s.meeting_date >= thirtyAgo);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle size={22} /> 1on1 面談管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            メンターと従業員の面談履歴・悩み・要望の集約管理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/one-on-ones/concerns"
            className="btn-ghost"
          >
            <ListChecks size={16} /> 悩み集約ボード
          </Link>
          <button className="btn-primary">
            <Calendar size={16} /> 新規セッション
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-slate-500">面談実施（30日）</div>
          <div className="text-2xl font-bold mt-1">
            {recentSessions.length}
            <span className="text-xs font-normal text-slate-500 ml-1">回</span>
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">累計 面談</div>
          <div className="text-2xl font-bold mt-1">
            {sessions.length}
            <span className="text-xs font-normal text-slate-500 ml-1">回</span>
          </div>
        </div>
        <div className={`card ${pending.length > 0 ? "bg-red-50 border-red-200" : ""}`}>
          <div className="text-xs text-slate-600 flex items-center gap-1">
            <BellRing size={12} />
            依頼 未確認
          </div>
          <div className={`text-2xl font-bold mt-1 ${pending.length > 0 ? "text-red-700" : ""}`}>
            {pending.length}
            <span className="text-xs font-normal text-slate-500 ml-1">件</span>
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">未完了の悩み</div>
          <div className="text-2xl font-bold mt-1">
            {openItems.length}
            <span className="text-xs font-normal text-slate-500 ml-1">件</span>
          </div>
        </div>
      </div>

      {/* 依頼ボックス（本人アプリから来た依頼） */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Inbox size={18} /> 面談依頼（従業員のスマホから）
          </h2>
          <div className="text-xs text-slate-500">
            未確認 <b className="text-red-700">{pending.length}</b> ・ 受付済/日程調整済 <b>{accepted.length}</b>
          </div>
        </div>

        {pending.length === 0 && accepted.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-6">
            現在未処理の依頼はありません
          </div>
        ) : (
          <div className="space-y-2">
            {[...pending, ...accepted].map((r) => (
              <div
                key={r.id}
                className={`rounded-lg p-3 border flex items-start justify-between gap-3 ${
                  r.status === "pending"
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <MiniAvatar
                    name={r.employee_name}
                    nationality={r.employee_nationality}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/employees/${r.employee_id}`}
                        className="font-medium hover:text-brand-600"
                      >
                        {r.employee_name}
                      </Link>
                      <span className="text-xs text-slate-400 font-mono">
                        #{r.employee_code}
                      </span>
                      <Badge className={REQUEST_STATUS_STYLE[r.status]}>
                        {REQUEST_STATUS_LABEL[r.status]}
                      </Badge>
                      <Badge className={URGENCY_STYLE[r.urgency]}>
                        {r.urgency_label}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-slate-700">{r.topic_label}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        希望メンター: {r.preferred_mentor}
                      </span>
                    </div>
                    {r.note && (
                      <div className="mt-1 text-xs text-slate-600 bg-white rounded px-2 py-1">
                        💬 {r.note}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs flex-shrink-0">
                  <div className="text-slate-500">
                    依頼: {formatDate(r.requested_at.slice(0, 10))}
                  </div>
                  {r.scheduled_at && (
                    <div className="text-amber-700 font-semibold mt-1">
                      面談予定: {formatDate(r.scheduled_at)}
                    </div>
                  )}
                  {r.assigned_mentor && (
                    <div className="text-slate-600 mt-1">担当: {r.assigned_mentor}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* カテゴリ別ヒートマップ */}
      <section className="card">
        <h2 className="font-bold mb-3">未解決の悩みカテゴリ分布</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <Link
                key={cat}
                href={`/one-on-ones/concerns?category=${cat}`}
                className={`rounded-lg p-3 text-center transition-all hover:scale-105 ${
                  CATEGORY_STYLE[cat as keyof typeof CATEGORY_STYLE]
                }`}
              >
                <div className="text-xs font-medium">
                  {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL]}
                </div>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </Link>
            ))}
        </div>
      </section>

      {/* 直近のセッション */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">直近の面談セッション</h2>
        </div>
        <div className="space-y-2">
          {sessions.slice(0, 20).map((s) => {
            const sessionItems = items.filter((i) => i.one_on_one_id === s.id);
            const openCount = sessionItems.filter(
              (i) => i.status === "open" || i.status === "in_progress"
            ).length;
            return (
              <Link
                key={s.id}
                href={`/one-on-ones/${s.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <MiniAvatar
                  name={s.employee_name}
                  nationality={s.employee_nationality}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{s.employee_name}</span>
                    <span className="text-xs text-slate-400">× {s.mentor_name}</span>
                    <span className="text-base" title={MOOD_LABEL[s.mood]}>
                      {MOOD_EMOJI[s.mood]}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {s.summary}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-500">
                    {formatDate(s.meeting_date)}
                  </div>
                  {openCount > 0 && (
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 mt-1">
                      未完了 {openCount}
                    </Badge>
                  )}
                </div>
                <ArrowRight size={14} className="text-slate-300" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
