"use client";

import { useRef, useState } from "react";

type Status = "idle" | "loading" | "ok" | "error";

function EmployeesUpdateButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/update-employees", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error ?? "エラーが発生しました");
      } else {
        setStatus("ok");
        setMessage(`完了: 従業員${data.employees}件、寮${data.assignments}件、履歴${data.tickets}件を更新しました`);
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
        {status === "loading" ? "更新中..." : "管理情報更新"}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-green-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function OvertimeUpdateButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch("/api/admin/update-overtime", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error ?? "エラーが発生しました");
      } else {
        setStatus("ok");
        setMessage(`完了: ${data.month_label} / ${data.employees}名を更新しました`);
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message ?? "ネットワークエラー");
    }
    // reset so same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />
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
        {status === "loading" ? "解析中..." : "残業時間更新"}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-green-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function DeployButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    if (!confirm("本番環境にデプロイしますか？")) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error ?? "エラーが発生しました");
      } else {
        setStatus("ok");
        setMessage("デプロイを開始しました（反映まで1〜2分）");
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
        className={`px-4 py-2 rounded text-sm font-medium border-2 transition-colors ${
          status === "loading"
            ? "border-gray-300 text-gray-400 cursor-not-allowed"
            : status === "ok"
            ? "border-green-600 bg-green-600 text-white"
            : status === "error"
            ? "border-red-500 text-red-500 bg-white"
            : "border-green-600 text-green-600 bg-white hover:bg-green-50"
        }`}
      >
        {status === "loading" ? "デプロイ中..." : "データ更新"}
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
      <div className="flex flex-wrap gap-3 items-start">
        <EmployeesUpdateButton />
        <OvertimeUpdateButton />
        <div className="ml-auto">
          <DeployButton />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">残業時間更新：PDFファイルを選択するとデータを解析・更新します</p>
    </div>
  );
}
