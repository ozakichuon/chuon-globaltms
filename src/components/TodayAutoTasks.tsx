import { getVisaAlerts, getTopOvertimeCurrentMonth } from "@/lib/data";
import { excelSupportTickets, excelOneOnOneRequests } from "@/lib/excel-data";
import { CheckCircle2, AlertCircle, Clock, MessageSquare, FileWarning } from "lucide-react";
import Link from "next/link";

export async function TodayAutoTasks() {
  const [alerts, overtime] = await Promise.all([
    getVisaAlerts(),
    getTopOvertimeCurrentMonth(100),
  ]);

  const tasks: { icon: React.ReactNode; text: React.ReactNode; level: "danger" | "warn" | "info" }[] = [];

  // 在留期限切れ
  const expired = alerts.filter((a) => a.alert_level === "expired");
  if (expired.length > 0) {
    tasks.push({
      level: "danger",
      icon: <AlertCircle size={15} />,
      text: (
        <>
          <Link href="/visa" className="underline hover:text-red-800">
            在留資格が期限切れ
          </Link>{" "}
          の従業員が <strong>{expired.length}名</strong> います — 至急対応してください
        </>
      ),
    });
  }

  // 90日以内
  const critical = alerts.filter((a) => a.alert_level === "critical");
  if (critical.length > 0) {
    tasks.push({
      level: "danger",
      icon: <FileWarning size={15} />,
      text: (
        <>
          在留期限まで <strong>90日以内</strong> の従業員が{" "}
          <Link href="/visa" className="underline hover:text-red-800">
            {critical.length}名
          </Link>{" "}
          — 更新書類の準備を開始
        </>
      ),
    });
  }

  // 残業危険ライン（80h超）
  const overDanger = overtime.filter((r) => r.alert_level === "danger");
  if (overDanger.length > 0) {
    tasks.push({
      level: "danger",
      icon: <Clock size={15} />,
      text: (
        <>
          残業時間が<strong>過労死ライン（80h）超過</strong>の従業員が{" "}
          <Link href="/attendance" className="underline hover:text-red-800">
            {overDanger.length}名
          </Link>{" "}
          — 業務量を確認してください
        </>
      ),
    });
  }

  // 残業警告（45h超）
  const overWarn = overtime.filter((r) => r.alert_level === "critical" || r.alert_level === "warning");
  if (overWarn.length > 0) {
    tasks.push({
      level: "warn",
      icon: <Clock size={15} />,
      text: (
        <>
          残業45h超過の従業員が{" "}
          <Link href="/attendance" className="underline hover:text-amber-800">
            {overWarn.length}名
          </Link>
        </>
      ),
    });
  }

  // サポート対応中
  const inProgress = excelSupportTickets.filter((t) => t.status === "対応中");
  if (inProgress.length > 0) {
    tasks.push({
      level: "warn",
      icon: <MessageSquare size={15} />,
      text: (
        <>
          サポートチケット対応中が{" "}
          <Link href="/support" className="underline hover:text-amber-800">
            {inProgress.length}件
          </Link>
        </>
      ),
    });
  }

  // 未対応サポート
  const notStarted = excelSupportTickets.filter((t) => t.status === "未着手");
  if (notStarted.length > 0) {
    tasks.push({
      level: "warn",
      icon: <MessageSquare size={15} />,
      text: (
        <>
          未対応のサポートチケットが{" "}
          <Link href="/support" className="underline hover:text-amber-800">
            {notStarted.length}件
          </Link>
        </>
      ),
    });
  }

  // 1on1リクエスト未対応
  const pendingOnOnOne = excelOneOnOneRequests.filter((r) => r.status === "pending");
  if (pendingOnOnOne.length > 0) {
    tasks.push({
      level: "info",
      icon: <MessageSquare size={15} />,
      text: (
        <>
          1on1リクエストが未対応{" "}
          <Link href="/one-on-ones" className="underline hover:text-blue-800">
            {pendingOnOnOne.length}件
          </Link>
        </>
      ),
    });
  }

  const levelStyle = {
    danger: "bg-red-50 border-red-200 text-red-800",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div className="card">
      <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
        <CheckCircle2 size={18} /> 今日の対応タスク（自動）
      </h2>
      {tasks.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 py-4 justify-center">
          <CheckCircle2 size={16} /> 現在、緊急対応が必要な項目はありません
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg border ${levelStyle[t.level]}`}
            >
              <span className="mt-0.5 shrink-0">{t.icon}</span>
              <span>{t.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
