"use client";

import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";

type CybozuEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  memo: string;
};

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eventDateKey(ev: CybozuEvent): string {
  return ev.start.slice(0, 10);
}

function eventTimeLabel(ev: CybozuEvent): string {
  if (ev.allDay) return "";
  const t = ev.start.slice(11, 16);
  return t;
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

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return d;
  });

  const eventsByDate: Record<string, CybozuEvent[]> = {};
  for (const ev of events) {
    const key = eventDateKey(ev);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  }

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

      {!loading && !error && (
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const key = toDateOnly(d);
            const dow = d.getDay();
            const isToday = key === toDateOnly(today);
            const dayEvents = eventsByDate[key] ?? [];
            const bg = isToday
              ? "bg-sky-50 border-sky-300"
              : dow === 0
              ? "bg-rose-50 border-rose-100"
              : dow === 6
              ? "bg-sky-50/40 border-sky-100"
              : "bg-white border-slate-200";
            return (
              <div key={key} className={`border rounded-lg p-1.5 min-h-[140px] ${bg}`}>
                <div
                  className={`text-xs font-bold mb-1 ${
                    isToday ? "text-sky-700" : dow === 0 ? "text-rose-500" : dow === 6 ? "text-sky-500" : "text-slate-600"
                  }`}
                >
                  {d.getDate()}（{WEEKDAY_JA[dow]}）
                </div>
                <div className="space-y-1">
                  {dayEvents.length === 0 && (
                    <div className="text-[11px] text-slate-300">-</div>
                  )}
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[11px] leading-tight bg-emerald-50 border border-emerald-100 rounded px-1 py-0.5 text-emerald-800 truncate"
                      title={`${ev.title}${ev.location ? " @" + ev.location : ""}`}
                    >
                      {eventTimeLabel(ev) && (
                        <span className="text-slate-400 mr-1">{eventTimeLabel(ev)}</span>
                      )}
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
