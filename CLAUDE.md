# TMS（タレントマネジメントシステム）

株式会社中温の**外国人従業員管理アプリ**。在留資格・勤怠・生活サポート・寮管理などを一元管理する。

## 基本設定

- **返答は日本語で簡潔に**
- コメントは原則書かない。書く場合は「なぜ（WHY）」が非自明な場合のみ1行で
- 不要な機能追加・抽象化・将来のための設計はしない
- 新しいファイルを作るより既存ファイルの編集を優先

## 技術スタック

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- データは JSON ファイルで管理（`src/lib/data/`）
- 開発サーバー: `npm run dev` → `http://localhost:3001`

## Vercel デプロイ構成

- `next.config.ts` に特別な設定は不要（App Router はそのまま動く）
- JSON データファイルはビルド時にバンドルされるため、Vercel でも動作する
- 環境変数が必要な場合は Vercel ダッシュボードの「Environment Variables」に設定
- デプロイ手順:
  1. GitHub にリポジトリを push
  2. https://vercel.com でリポジトリを import
  3. 「Deploy」ボタンを押すだけ（設定変更不要）

## データソース

**スプレッドシート:** https://docs.google.com/spreadsheets/d/1yGxl2P1PCVTXQC0s-QhSEbJ1HkbUfFpcbWaNclalDcI/edit?usp=sharing

| シート | 更新先 JSON |
|---|---|
| 管理表 | `employees.json`（256件）、`dormitory_assignments.json` |
| 履歴 | `support_tickets.json` |

```bash
node scripts/update_data.js   # スプレッドシート → JSON を更新
```

> **注意:** スプレッドシートのフィルターを**必ず解除してから**実行。フィルター中は visible rows のみ返る。

## 主要ファイル

| ファイル | 役割 |
|---|---|
| `src/lib/excel-data.ts` | JSON → EmployeeSummary 型変換、`employeePhotoMap` エクスポート |
| `src/lib/data.ts` | データ取得関数 |
| `src/lib/utils.ts` | `tenureString` / `hoursToHHMM` 等ユーティリティ |
| `src/lib/types.ts` | 型定義（`EmployeeStatus` に "child" を含む） |
| `src/lib/overtime.ts` | 残業アラート計算 |
| `scripts/update_data.js` | スプレッドシート → JSON 更新スクリプト |

## 従業員ステータス

| ステータス | 条件 |
|---|---|
| `active` | 在籍中 |
| `child` | 実習区分=特定活動 かつ 現在区=子供（在籍中カウントに含めない） |
| `retired` | 退職者 |

## 勤務地マッピング（`workplaceToOrg`）

新勤務地追加時は `excel-data.ts` の `workplaceToOrg` と各ページの `SITE_TABS` / `SITE_TO_ORG` を両方更新。

| スプレッドシート値 | 組織名 |
|---|---|
| 本社 / 小栗 | 本社（小栗） |
| 津吉 | 津吉工場 |
| 西条 | 西条工場 |
| 西条ファーム | 西条ファーム |
| 協同本社 | 協同本社 |

## 残業時間

- データは `src/lib/data/overtime_2026_XX.json` に格納
- PDF（勤務個人表）から `pdftotext -enc UTF-8` で抽出 → `scripts/parse_overtime.js` 相当の処理で JSON 生成
- 表示は `hoursToHHMM(hours)` で小数時間 → `HH:MM`（10分単位）に変換

## 注意事項

- OneDrive 同期で JSON ファイルが上書きされる場合あり → 変更後は確認
- `export const dynamic = "force-dynamic"` を各ページに付けること
- 写真 URL は `photo_url` フィールドに格納（Google Drive 直リンク）
- 破壊的な操作（ファイル削除・force push 等）の前は必ず確認を取る
