import type { OvertimeAlert } from "./types";

export const OVERTIME_THRESHOLDS = {
  notice: 30,    // 30h〜 注意
  warning: 45,   // 45h〜 警告（36協定原則上限）
  critical: 60,  // 60h〜 危険
  danger: 80,    // 80h〜 過労死ライン
} as const;

export function overtimeAlertColor(level: OvertimeAlert): string {
  switch (level) {
    case "safe":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "notice":
      return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "warning":
      return "bg-orange-100 text-orange-700 border border-orange-300";
    case "critical":
      return "bg-red-100 text-red-700 border border-red-300";
    case "danger":
      return "bg-red-600 text-white border border-red-700";
  }
}

export function overtimeAlertBarColor(level: OvertimeAlert): string {
  switch (level) {
    case "safe":
      return "bg-emerald-500";
    case "notice":
      return "bg-yellow-500";
    case "warning":
      return "bg-orange-500";
    case "critical":
      return "bg-red-500";
    case "danger":
      return "bg-red-700";
  }
}

export function overtimeAlertLabel(level: OvertimeAlert): string {
  switch (level) {
    case "safe":
      return "安全";
    case "notice":
      return "注意（30h超）";
    case "warning":
      return "警告（36協定超）";
    case "critical":
      return "危険（60h超）";
    case "danger":
      return "過労死ライン";
  }
}

export function overtimeAlertShort(level: OvertimeAlert): string {
  switch (level) {
    case "safe":
      return "安全";
    case "notice":
      return "注意";
    case "warning":
      return "警告";
    case "critical":
      return "危険";
    case "danger":
      return "過労";
  }
}
