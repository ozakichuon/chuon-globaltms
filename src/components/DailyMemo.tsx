"use client";

import { useState, useEffect } from "react";
import { Pencil, Save, X, StickyNote } from "lucide-react";

const STORAGE_KEY = "chuon_daily_memo";

interface MemoData {
  text: string;
  updatedAt: string;
}

export function DailyMemo() {
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMemo(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  function startEdit() {
    setDraft(memo?.text ?? "");
    setEditing(true);
  }

  function save() {
    const data: MemoData = {
      text: draft,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setMemo(data);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  const updatedAt = memo?.updatedAt
    ? new Date(memo.updatedAt).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <StickyNote size={18} /> 今週すること
        </h2>
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
          >
            <Pencil size={14} /> 編集
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full border border-slate-200 rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            rows={6}
            placeholder="今日の指示・連絡事項を入力してください&#10;例）&#10;・〇〇さんの在留更新書類を準備&#10;・午後3時に〇〇工場へ巡回"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancel}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <X size={14} /> キャンセル
            </button>
            <button
              onClick={save}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              <Save size={14} /> 保存
            </button>
          </div>
        </div>
      ) : memo?.text ? (
        <div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
            {memo.text}
          </p>
          {updatedAt && (
            <p className="text-xs text-slate-400 mt-2">最終更新: {updatedAt}</p>
          )}
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="w-full py-6 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
        >
          クリックして今週することを追加
        </button>
      )}
    </div>
  );
}
