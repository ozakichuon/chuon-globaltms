import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import {
  getOneOnOneById,
  getOneOnOneItems,
} from "@/lib/excel-data";
import {
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  KIND_LABEL,
  MOOD_EMOJI,
  MOOD_LABEL,
  PRIORITY_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
} from "@/lib/one-on-one-labels";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OneOnOneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = getOneOnOneById(id);
  if (!session) notFound();

  const items = getOneOnOneItems(id);
  const openCount = items.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href="/one-on-ones"
        className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> 1on1 面談管理へ戻る
      </Link>

      {/* ヘッダー */}
      <div className="card">
        <div className="flex items-start gap-4 flex-wrap">
          <MiniAvatar
            name={session.employee_name}
            nationality={session.employee_nationality}
            size={64}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/employees/${session.employee_id}`}
                className="text-xl font-bold hover:text-brand-600"
              >
                {session.employee_name}
              </Link>
              <span className="font-mono text-xs text-slate-500">
                #{session.employee_code}
              </span>
            </div>
            <div className="text-sm text-slate-600 mt-1">
              メンター: <span className="font-medium">{session.mentor_name}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Calendar size={14} /> {formatDate(session.meeting_date)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} /> {session.duration_min}分
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {session.location}
              </span>
              <span className="inline-flex items-center gap-1">
                言語: {session.language === "id" ? "🇮🇩 Bahasa" : session.language === "vi" ? "🇻🇳 Tiếng Việt" : "🇯🇵 日本語"}
              </span>
              <span
                className="inline-flex items-center gap-1"
                title={MOOD_LABEL[session.mood]}
              >
                気分: {MOOD_EMOJI[session.mood]} {MOOD_LABEL[session.mood]}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
          {session.summary}
        </div>

        {session.next_meeting_date && (
          <div className="mt-3 text-xs text-slate-500">
            次回予定: <b>{formatDate(session.next_meeting_date)}</b>
          </div>
        )}
      </div>

      {/* アイテム一覧 */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">
            議論内容 ({items.length})
            {openCount > 0 && (
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 ml-2">
                未完了 {openCount}
              </Badge>
            )}
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">
            議論事項はありません
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <div
                key={i.id}
                className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={CATEGORY_STYLE[i.category]}>
                      {CATEGORY_LABEL[i.category]}
                    </Badge>
                    <span className="text-sm">{KIND_LABEL[i.kind]}</span>
                    <span className="font-medium">{i.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={PRIORITY_STYLE[i.priority]}>
                      優先度 {i.priority === "high" ? "高" : i.priority === "medium" ? "中" : "低"}
                    </Badge>
                    <Badge className={STATUS_STYLE[i.status]}>
                      {STATUS_LABEL[i.status]}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {i.detail}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  {i.assigned_to && <span>担当: {i.assigned_to}</span>}
                  {i.due_date && <span>期限: {formatDate(i.due_date)}</span>}
                  {i.resolved_at && (
                    <span className="text-emerald-700">
                      解決 {formatDate(i.resolved_at)}
                    </span>
                  )}
                </div>
                {i.resolution_note && (
                  <div className="mt-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 rounded p-2">
                    ✓ {i.resolution_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
