"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, RefreshCw } from "lucide-react";

type CybozuEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  memo: string;
};

function formatEventDate(dateStr: string, allDay: boolean): string {
  if (!dateStr) return "";
  // ISO日時 or YYYY-MM-DD
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  if (allDay) return `${mm}/${dd}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function CybozuSchedule() {
  const [events, setEvents] = useState<CybozuEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cybozu/schedule", { cache: "no-store" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEvents(data.events ?? []);
    } catch (e: any) {
      setError(e.message ?? "取得失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <CalendarDays size={18} /> サイボウズ スケジュール
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="更新"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && (
        <div className="text-sm text-slate-400 py-4 text-center">読み込み中...</div>
      )}

      {error && (
        <div className="text-sm text-red-500 py-4 text-center">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-sm text-slate-400 py-4 text-center">予定はありません</div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {events.map((ev) => {
            const today = isToday(ev.start);
            return (
              <div
                key={ev.id}
                className={`flex gap-3 p-2 rounded-lg text-sm ${today ? "bg-sky-50 border border-sky-100" : "hover:bg-slate-50"}`}
              >
                <div className={`w-16 shrink-0 font-mono text-xs pt-0.5 ${today ? "text-sky-600 font-bold" : "text-slate-400"}`}>
                  {formatEventDate(ev.start, ev.allDay)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${today ? "text-sky-800" : "text-slate-700"}`}>
                    {today && <span className="mr-1 text-xs bg-sky-500 text-white rounded px-1 py-0.5">今日</span>}
                    {ev.title}
                  </div>
                  {ev.location && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MapPin size={10} /> {ev.location}
                    </div>
                  )}
                  {ev.memo && (
                    <div className="text-xs text-slate-400 truncate mt-0.5">{ev.memo}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
