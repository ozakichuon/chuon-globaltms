# Windows セットアップ手順

## 📋 必要なもの

1. **Node.js 18 以上**（推奨: 20 LTS）
   - https://nodejs.org/ja/download から Windows Installer (.msi) をダウンロード
   - インストール時「Add to PATH」にチェック
2. **（任意）Python 3.9 以上** — Excel再取込が必要な場合のみ
   - https://www.python.org/downloads/
3. **（任意）Git** — コードを更新する場合
   - https://git-scm.com/download/win

## 🚀 起動手順

### 1. ZIP を展開

1. `chuon-tms.zip` を右クリック → 「すべて展開」
2. 展開先はどこでもOK（例: `C:\chuon-tms`）
3. **注意**: パスに日本語や長い文字列を含めないこと（Windows のパス長制限）

### 2. コマンドプロンプト（または PowerShell）を起動

スタートメニューで `cmd` または `powershell` を検索して起動。

### 3. プロジェクトフォルダへ移動

```cmd
cd C:\chuon-tms
```

展開先に合わせて変更してください。

### 4. 依存パッケージのインストール（初回のみ）

```cmd
npm install
```

- 完了まで 3〜5 分程度
- ネットワーク接続必須

### 5. 開発サーバー起動

```cmd
npm run dev
```

成功すると以下が表示されます：

```
▲ Next.js 15.5.x
- Local:  http://localhost:3000
```

### 6. ブラウザでアクセス

`http://localhost:3000` を開く。

## 🛑 停止方法

コマンドプロンプトで `Ctrl + C` を押す。

## ⚠️ トラブルシュート

### Q. `npm install` でエラー
- Node.js を最新の LTS に更新
- 管理者権限のコマンドプロンプトで実行
- アンチウイルスソフトが干渉している場合は一時的に無効化

### Q. `Error: listen EADDRINUSE: ... :3000`
すでにポート 3000 が使われています。
```cmd
npm run dev -- -p 3456
```
で別ポートで起動できます。

### Q. 画面が真っ白・エラー表示
- コマンドプロンプトに赤いエラーが出ていないか確認
- `.env.local` が不要（モックデータで動作するため）
- ブラウザをリロード（Ctrl + F5）

## 📂 フォルダ構成

```
chuon-tms/
├─ src/                 アプリケーションコード
├─ supabase/migrations/ DB設計SQL
├─ scripts/             Excel取込スクリプト（Python）
├─ 従業員情報/          元データのExcelファイル
├─ package.json
├─ README.md            詳細ドキュメント
└─ SETUP_WINDOWS.md     このファイル
```

## 🔒 取り扱い注意

このシステムには以下の**要配慮個人情報**が含まれます：

- 従業員 240 名の氏名・生年月日・在留カード番号
- 住所・電話番号・家族情報
- 医療相談・妊娠情報などのサポート履歴

**取り扱う際は**：
- 社外ネットワーク経由での共有は避ける
- 共有PCを使わない
- スクリーンショットの扱いに注意
- 不要になったら Shift + Delete で完全削除
