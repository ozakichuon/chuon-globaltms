import { Badge } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { excelSupportTickets, excelEmployees, employeePhotoMap } from "@/lib/excel-data";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileHeart, MapPin, User, MessageSquare, StickyNote } from "lucide-react";
import type { EmployeeSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

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

function normalizeStatus(s: string | null) {
  if (s === "完了") return "完了";
  if (s === "対応中") return "対応中";
  return "未着手";
}

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = excelSupportTickets.find((t) => t.id === id);
  if (!ticket) notFound();

  const emp = ticket.target_employee_code ? empByCode.get(ticket.target_employee_code) : null;
  const photoUrl = emp ? employeePhotoMap.get(emp.id) ?? null : null;
  const status = normalizeStatus(ticket.status);

  // 同じ従業員の他チケット
  const relatedTickets = ticket.target_employee_code
    ? excelSupportTickets
        .filter((t) => t.target_employee_code === ticket.target_employee_code && t.id !== ticket.id)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 戻るリンク */}
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} />
        生活サポート履歴に戻る
      </Link>

      {/* ヘッダー */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Badge className={KIND_STYLES[ticket.kind ?? ""] ?? "bg-slate-100"}>
              {ticket.kind ?? "—"}
            </Badge>
            <Badge className={STATUS_STYLES[status]}>{status}</Badge>
            <span className="text-xs text-slate-500 font-mono">#{ticket.seq}</span>
          </div>
          <span className="text-sm text-slate-500">{formatDate(ticket.date)}</span>
        </div>

        {/* 従業員情報 */}
        {emp ? (
          <div className="mt-4 flex items-center gap-4">
            <Avatar
              employee={{
                display_name: emp.display_name,
                last_name_native: (emp as any).last_name_native ?? null,
                first_name_native: (emp as any).first_name_native ?? null,
                nationality: emp.nationality,
                photo_url: photoUrl,
              } as EmployeeSummary}
              size={64}
            />
            <div>
              <Link
                href={`/employees/${emp.employee_code}`}
                className="text-lg font-bold hover:text-brand-600"
              >
                {emp.display_name}
              </Link>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                #{emp.employee_code}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{emp.nationality}</div>
            </div>
          </div>
        ) : ticket.target_employee_code ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <User size={14} />
            <span className="font-mono">{ticket.target_employee_code}</span>
          </div>
        ) : null}

        {/* 場所・記録者 */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          {ticket.place && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {ticket.place}
            </span>
          )}
          {ticket.recorder && (
            <span className="flex items-center gap-1">
              <User size={12} />
              記録者: {ticket.recorder}
            </span>
          )}
          {ticket.time && <span>受付時刻: {ticket.time}</span>}
        </div>
      </div>

      {/* 登録内容 */}
      {(ticket.request_note || (ticket as any).reg_img1_url || (ticket as any).reg_img2_url) && (
        <div className="card">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <FileHeart size={14} />
            登録内容
          </div>
          {ticket.request_note && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">
              {ticket.request_note}
            </p>
          )}
          {((ticket as any).reg_img1_url || (ticket as any).reg_img2_url) && (
            <div className="flex flex-wrap gap-3 mt-2">
              {(ticket as any).reg_img1_url && (
                <a href={(ticket as any).reg_img1_url} target="_blank" rel="noopener noreferrer">
                  <img src={(ticket as any).reg_img1_url} alt="登録画像1" className="max-h-48 rounded-lg border border-slate-200 object-contain cursor-zoom-in" />
                </a>
              )}
              {(ticket as any).reg_img2_url && (
                <a href={(ticket as any).reg_img2_url} target="_blank" rel="noopener noreferrer">
                  <img src={(ticket as any).reg_img2_url} alt="登録画像2" className="max-h-48 rounded-lg border border-slate-200 object-contain cursor-zoom-in" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* 対応履歴 */}
      {ticket.responses.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
            <MessageSquare size={14} />
            対応履歴
            <span className="ml-1 text-xs font-mono text-slate-400">
              {ticket.responses.length} 件
            </span>
          </div>
          <div className="space-y-4">
            {ticket.responses.map((r, i) => (
              <div key={i} className="relative pl-5">
                {/* タイムライン縦線 */}
                {i < ticket.responses.length - 1 && (
                  <div className="absolute left-[7px] top-5 bottom-0 w-px bg-slate-200" />
                )}
                {/* ドット */}
                <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-brand-400 bg-white" />

                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-2 text-xs text-slate-500">
                    {r.date && <span className="font-medium text-slate-700">{formatDate(r.date)}</span>}
                    {r.responder && (
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {r.responder}
                      </span>
                    )}
                    <span className="ml-auto text-slate-400">対応 {i + 1}</span>
                  </div>
                  {r.note && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {r.note}
                    </p>
                  )}
                  {((r as any).img1_url || (r as any).img2_url) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(r as any).img1_url && (
                        <a href={(r as any).img1_url} target="_blank" rel="noopener noreferrer">
                          <img src={(r as any).img1_url} alt="対応画像1" className="max-h-40 rounded-lg border border-slate-200 object-contain cursor-zoom-in" />
                        </a>
                      )}
                      {(r as any).img2_url && (
                        <a href={(r as any).img2_url} target="_blank" rel="noopener noreferrer">
                          <img src={(r as any).img2_url} alt="対応画像2" className="max-h-40 rounded-lg border border-slate-200 object-contain cursor-zoom-in" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 備考 */}
      {ticket.overall_note && (
        <div className="card bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
            <StickyNote size={14} />
            備考
          </div>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{ticket.overall_note}</p>
        </div>
      )}

      {/* 同一従業員の他チケット */}
      {relatedTickets.length > 0 && (
        <div className="card">
          <div className="text-sm font-bold text-slate-700 mb-3">
            {emp?.display_name ?? "同一従業員"} の他の履歴
          </div>
          <div className="space-y-2">
            {relatedTickets.map((t) => (
              <Link
                key={t.id}
                href={`/support/${t.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-sm"
              >
                <Badge className={cn("shrink-0", KIND_STYLES[t.kind ?? ""] ?? "bg-slate-100")}>
                  {t.kind ?? "—"}
                </Badge>
                <span className="text-xs text-slate-500">{formatDate(t.date)}</span>
                <span className="text-slate-600 truncate">{t.request_note}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
