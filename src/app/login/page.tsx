"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "otp">("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  function goNext(data: { must_change?: boolean }) {
    setMustChange(!!data.must_change);
    if (data.must_change) {
      router.push("/change-password");
    } else {
      router.push("/");
    }
  }

  async function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }
      if (data.otp_required) {
        setMustChange(!!data.must_change);
        setStep("otp");
      } else {
        goNext(data);
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "認証に失敗しました");
        return;
      }
      goNext(data);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-slate-800">中温 TMS</div>
          <div className="text-sm text-slate-500 mt-1">タレントマネジメントシステム</div>
        </div>

        {step === "password" ? (
          <form onSubmit={handleSubmitPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ログインID"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="パスワード"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitOtp} className="space-y-4">
            <p className="text-sm text-slate-600">
              登録メールアドレスに送信された4桁の認証コードを入力してください。
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">認証コード</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0000"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 4}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "確認中..." : "認証する"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("password"); setCode(""); setError(""); }}
              className="w-full text-xs text-slate-400 hover:text-slate-600"
            >
              ← IDに戻る
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
