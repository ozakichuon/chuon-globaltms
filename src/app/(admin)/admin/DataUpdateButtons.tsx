"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "ok" | "error";

function UpdateButton({
  label,
  endpoint,
}: {
  label: string;
  endpoint: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error ?? "エラーが発生しました");
      } else {
        setStatus("ok");
        if (data.employees !== undefined) {
          setMessage(`完了: 従業員${data.employees}件、寮${data.assignments}件、履歴${data.tickets}件を更新しました`);
        } else if (data.processed !== undefined) {
          if (data.processed.length === 0) {
            setMessage(data.message ?? "更新対象のPDFがありませんでした");
          } else {
            setMessage(`完了: ${data.processed.join(" / ")}${data.errors?.length ? ` ※エラー: ${data.errors.join(", ")}` : ""}`);
          }
        } else {
          setMessage("更新完了");
        }
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message ?? "ネットワークエラー");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
          status === "loading"
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : status === "ok"
            ? "bg-green-600 hover:bg-green-700 text-white"
            : status === "error"
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {status === "loading" ? "更新中..." : label}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-green-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function DataUpdateButtons() {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">データ更新</h2>
      <div className="flex flex-wrap gap-3">
        <UpdateButton label="管理情報更新" endpoint="/api/admin/update-employees" />
        <UpdateButton label="残業時間更新" endpoint="/api/admin/update-overtime" />
      </div>
    </div>
  );
}
