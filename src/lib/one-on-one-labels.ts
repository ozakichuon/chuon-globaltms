import type {
  OneOnOneItemCategory,
  OneOnOneItemKind,
  OneOnOneItemPriority,
  OneOnOneItemStatus,
  OneOnOneMood,
  OneOnOneRequestStatus,
  OneOnOneRequestUrgency,
} from "./excel-types";

export const CATEGORY_LABEL: Record<OneOnOneItemCategory, string> = {
  work: "仕事",
  life: "生活",
  language: "日本語",
  family: "家族",
  health: "健康",
  money: "お金・送金",
  career: "キャリア",
  religion: "宗教・文化",
  community: "同僚関係",
  other: "その他",
};

export const CATEGORY_STYLE: Record<OneOnOneItemCategory, string> = {
  work: "bg-blue-50 text-blue-700 border border-blue-200",
  life: "bg-sky-50 text-sky-700 border border-sky-200",
  language: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  family: "bg-rose-50 text-rose-700 border border-rose-200",
  health: "bg-red-50 text-red-700 border border-red-200",
  money: "bg-amber-50 text-amber-700 border border-amber-200",
  career: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  religion: "bg-purple-50 text-purple-700 border border-purple-200",
  community: "bg-teal-50 text-teal-700 border border-teal-200",
  other: "bg-slate-50 text-slate-700 border border-slate-200",
};

export const KIND_LABEL: Record<OneOnOneItemKind, string> = {
  question: "❓ 質問",
  concern: "⚠️ 悩み",
  task: "📌 タスク",
  request: "🙏 要望",
  praise: "🌟 称賛",
};

export const STATUS_LABEL: Record<OneOnOneItemStatus, string> = {
  open: "未対応",
  in_progress: "対応中",
  done: "完了",
  cancelled: "取消",
};

export const STATUS_STYLE: Record<OneOnOneItemStatus, string> = {
  open: "bg-slate-100 text-slate-700 border border-slate-300",
  in_progress: "bg-amber-50 text-amber-700 border border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-slate-50 text-slate-400 border border-slate-200",
};

export const PRIORITY_LABEL: Record<OneOnOneItemPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const PRIORITY_STYLE: Record<OneOnOneItemPriority, string> = {
  low: "bg-slate-50 text-slate-500",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

export const MOOD_EMOJI: Record<OneOnOneMood, string> = {
  great: "😊",
  ok: "😐",
  down: "😔",
  stressed: "😫",
};

export const MOOD_LABEL: Record<OneOnOneMood, string> = {
  great: "良好",
  ok: "普通",
  down: "落ち込み",
  stressed: "ストレス",
};

export const REQUEST_STATUS_LABEL: Record<OneOnOneRequestStatus, string> = {
  pending: "未確認",
  accepted: "受付済",
  scheduled: "日程調整済",
  completed: "完了",
  cancelled: "取消",
};

export const REQUEST_STATUS_STYLE: Record<OneOnOneRequestStatus, string> = {
  pending: "bg-red-100 text-red-700 border border-red-300",
  accepted: "bg-blue-50 text-blue-700 border border-blue-200",
  scheduled: "bg-amber-50 text-amber-700 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-slate-50 text-slate-500 border border-slate-200",
};

export const URGENCY_STYLE: Record<OneOnOneRequestUrgency, string> = {
  low: "bg-slate-50 text-slate-500 border border-slate-200",
  medium: "bg-sky-50 text-sky-700 border border-sky-200",
  high: "bg-amber-50 text-amber-700 border border-amber-200",
  critical: "bg-red-100 text-red-700 border border-red-300",
};
