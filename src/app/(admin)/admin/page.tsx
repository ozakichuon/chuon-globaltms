import { isSupabaseConfigured } from "@/lib/supabase/server";
import { Settings, Database, CheckCircle2, XCircle } from "lucide-react";

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
        {!configured && (
          <div className="mt-3 text-xs bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-900">
            <div className="font-semibold">セットアップ手順</div>
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              <li>supabase CLI をインストール（brew install supabase/tap/supabase）</li>
              <li>
                プロジェクト直下で <code className="bg-white px-1 rounded">supabase start</code>
              </li>
              <li>
                表示された URL と ANON KEY を{" "}
                <code className="bg-white px-1 rounded">.env.local</code> に貼り付け
              </li>
              <li>
                <code className="bg-white px-1 rounded">supabase db reset</code>{" "}
                でマイグレーションとシードを適用
              </li>
              <li>ブラウザをリロード</li>
            </ol>
          </div>
        )}
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
          <li>✅ RLSによる権限分離（master / hr_admin / line_manager / employee）</li>
        </ul>
      </section>

      <section className="card">
        <h3 className="font-bold">次フェーズ候補</h3>
        <ul className="mt-3 text-sm space-y-1.5 text-slate-600">
          <li>• リファーラル採用LP自動生成</li>
          <li>• PDF履歴書のVision AI取込</li>
          <li>• メンター制度のワークフロー</li>
          <li>• ゲーミフィケーション（中温コイン）</li>
          <li>• 1on1支援・エンゲージメントサーベイ</li>
          <li>• eラーニング動画・自動字幕翻訳</li>
          <li>• KraftLine Excel 自動取込</li>
        </ul>
      </section>
    </div>
  );
}
