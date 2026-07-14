import { isSupabaseConfigured } from "@/lib/supabase/server";
import { Settings, Database, CheckCircle2, XCircle, Users } from "lucide-react";
import { UserManagement } from "./UserManagement";
import DataUpdateButtons from "./DataUpdateButtons";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const configured = isSupabaseConfigured();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings size={22} /> 管理設定
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          システム設定・データ接続・マスタ管理
        </p>
      </div>

      <DataUpdateButtons />

      <section className="card">
        <h3 className="font-bold flex items-center gap-2">
          <Users size={18} /> ユーザー管理
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          ログインIDとパスワードを管理します。
        </p>
        <UserManagement />
      </section>

      <section className="card">
        <h3 className="font-bold flex items-center gap-2">
          <Database size={18} /> データ接続
        </h3>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {configured ? (
            <>
              <CheckCircle2 className="text-emerald-600" size={18} />
              <span>Supabase 接続済み</span>
            </>
          ) : (
            <>
              <XCircle className="text-amber-500" size={18} />
              <span>Supabase 未接続 — モックデータを表示しています</span>
            </>
          )}
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold">MVP 実装済み機能</h3>
        <ul className="mt-3 text-sm space-y-1.5">
          <li>✅ 従業員データベース（PDF/Excel取込前提の設計）</li>
          <li>✅ 在留資格ダッシュボード（期限アラート）</li>
          <li>✅ キャリアラダー可視化（Lv1 〜 Lv7）</li>
          <li>✅ スキルマップ（18項目・カテゴリ別）</li>
          <li>✅ 多言語対応（日本語・インドネシア語・ベトナム語）</li>
          <li>✅ 従業員向けマイページ（母語UI）</li>
          <li>✅ 離職率ダッシュボード</li>
        </ul>
      </section>
    </div>
  );
}
