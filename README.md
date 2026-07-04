# 中温タレントマネジメントシステム (MVP)

**株式会社中温**（食品加工・野菜水煮）向けの社内タレントマネジメントシステムです。

従業員250名（うち外国人140名／主にインドネシア人技能実習生）の
**採用コスト削減**・**定着率向上**・**キャリア可視化**を目的としたMVP。

## 🎯 MVPスコープ

このリポジトリでは以下の2機能を実装:

1. **従業員DB + 在留資格ダッシュボード** — 離職率を"測れる"ようにし、ビザ期限を漏らさない
2. **キャリアパス可視化** — 技能実習→特定技能→永住の道筋を多言語で提示

（リファーラル採用LPは Phase 2 で追加予定）

## 🏗 技術スタック

| 層 | 採用技術 |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS |
| Backend | Supabase (Postgres + Auth + RLS) |
| Icons | lucide-react |
| Language | TypeScript |

既存のEhime Baseプロジェクトと共通スタックで、開発コスト圧縮。

## 📁 ディレクトリ構成

```
chuon-tms/
├── src/
│   ├── app/
│   │   ├── (admin)/           # 人事管理者向けUI
│   │   │   ├── page.tsx       # ダッシュボード
│   │   │   ├── employees/     # 従業員一覧・詳細
│   │   │   ├── visa/          # 在留資格ダッシュボード
│   │   │   ├── career/        # キャリアラダー
│   │   │   ├── my/            # 従業員マイページ（多言語）
│   │   │   └── admin/         # 管理設定
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/            # 共通UIコンポーネント
│   └── lib/
│       ├── data.ts            # データアクセス層
│       ├── mock-data.ts       # Supabase未接続時のモック
│       ├── i18n.ts            # 多言語辞書（日/イ/越）
│       ├── labels.ts          # ラベル整形
│       ├── types.ts           # 型定義
│       ├── utils.ts           # 整形関数
│       └── supabase/
│           ├── server.ts
│           └── client.ts
├── supabase/
│   ├── migrations/
│   │   ├── 20260415000001_initial_schema.sql   # テーブル定義
│   │   ├── 20260415000002_views_and_functions.sql
│   │   └── 20260415000003_rls_policies.sql     # 権限制御
│   └── seed.sql                                # マスタ・デモデータ
└── package.json
```

## 🚀 ローカル開発手順

### 1. 依存関係のインストール

```bash
cd /Users/yuyu24/2ndBrain/chuon-tms
npm install
```

### 2. 開発サーバーを起動（モックデータのまま）

Supabase未接続でもモックデータで全画面が動きます。

```bash
npm run dev
# → http://localhost:3000
```

アクセスできる画面:

| URL | 内容 |
|---|---|
| `/` | ダッシュボード（KPI・在留アラート・離職率推移） |
| `/employees` | 従業員一覧（検索・フィルタ） |
| `/employees/[id]` | 従業員詳細（基本・在留・キャリア進捗） |
| `/visa` | 在留資格ダッシュボード |
| `/career` | キャリアラダー（Lv1〜Lv7、国籍分布） |
| `/my` | 従業員向けマイページ（多言語切替 `?lang=id` / `?lang=vi`） |
| `/admin` | 管理設定（Supabase接続状態） |

### 3. Supabaseを接続する（本番運用時）

#### オプションA：ローカル Supabase（要 Docker）

```bash
# Supabase CLI インストール
brew install supabase/tap/supabase

# プロジェクト直下で起動
supabase start

# 表示された URL / anon key を .env.local に貼り付け
cp .env.local.example .env.local
vi .env.local

# マイグレーション + シード適用
supabase db reset
```

#### オプションB：クラウド Supabase

1. https://supabase.com/dashboard で新規プロジェクト作成
2. `supabase/migrations/` の3つのSQLをエディタで順に実行
3. `supabase/seed.sql` を実行（デモデータ）
4. Project Settings → API から URL / anon key を取得し `.env.local` に設定

## 📊 データモデル概要

主要テーブル:

- `employees` — 従業員マスタ（国籍・雇用形態・日本語レベル等）
- `visa_records` — 在留資格履歴（期限管理の核）
- `skills` / `employee_skills` — スキルマップ
- `career_levels` — Lv1〜7の昇格要件
- `visa_transition_plans` — ビザ移行計画
- `daily_conditions` — 日次コンディション
- `user_roles` — 権限管理（master / hr_admin / line_manager / employee）

RLSにより、各ロールが見られるデータを厳密に制御しています。

## 🌏 多言語対応

`/my` 画面で言語切替可能:
- `?lang=ja` 日本語
- `?lang=id` インドネシア語（Bahasa Indonesia）
- `?lang=vi` ベトナム語（Tiếng Việt）

辞書は `src/lib/i18n.ts` に集約。本番では next-intl への置換を推奨。

## 🔐 セキュリティ

- Supabase RLS による行レベルアクセス制御
- 本人は自分のデータのみ閲覧可
- HR管理者は全データ閲覧・更新可
- 監査ログ（`audit_logs` テーブル）で変更を追跡

## 🗺 ロードマップ（Phase 2以降）

- [ ] リファーラル採用LP自動生成
- [ ] 履歴書PDFの Claude Vision 自動取込
- [ ] ゲーミフィケーション（中温コイン）
- [ ] 1on1支援・エンゲージメントサーベイ
- [ ] eラーニング動画＋自動字幕翻訳
- [ ] KraftLine Excel 自動取込パイプライン
- [ ] メンター制度ワークフロー
- [ ] 出荷予測AI（別モジュール）

## 👥 想定ユーザー

| ロール | アクセス範囲 |
|---|---|
| **master（経営者）** | 全機能 |
| **hr_admin（人事担当）** | 従業員データ全件・編集可 |
| **line_manager（班長）** | 自組織配下の閲覧 |
| **employee（従業員）** | 自分のマイページのみ |

## 📝 ライセンス

社内利用。第三者への配布不可。
