/**
 * Google Drive の photograph フォルダからファイルID一覧を取得し
 * employees.json の photo_path を Drive サムネイルURLに更新します。
 *
 * 初回実行時にブラウザが開いてGoogle認証が必要です。
 * 認証後、token.json が保存され次回以降は自動認証されます。
 *
 * 使い方: node scripts/get_photo_ids.js
 *
 * 事前準備:
 *   1. https://console.cloud.google.com で新規プロジェクト作成
 *   2. Google Drive API を有効化
 *   3. OAuth 2.0 クライアントID（デスクトップアプリ）を作成
 *   4. credentials.json をこのプロジェクトルートに保存
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const EMPLOYEES_PATH = path.join(__dirname, '..', 'src', 'lib', 'data', 'employees.json');

const PHOTO_FOLDER_IDS = [
  '1KLNXE0t2rugK9XSYgEIXUbo5-ioPNkeU',
  '1T4N_VA2lKz_N95SQzP42i1mopIPHOGd0',
  '1qTBFxlIYpyjs67oIAXBKncB7C-xbJGQy',
];

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('credentials.json が見つかりません。');
    console.error('Google Cloud Console でOAuth2クライアントIDを作成し、');
    console.error('credentials.json をプロジェクトルートに置いてください。');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3333/callback');

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // OAuth フロー
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n以下のURLをブラウザで開いてください:\n');
  console.log(authUrl);
  console.log('\n認証後、自動的に続行します...\n');

  const { exec } = require('child_process');
  exec(`start "" "${authUrl}"`);

  const code = await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const q = url.parse(req.url, true);
      if (q.pathname === '/callback' && q.query.code) {
        res.end('<h1>認証完了！このタブを閉じてください。</h1>');
        server.close();
        resolve(q.query.code);
      }
    }).listen(3333);
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('token.json を保存しました。');
  return oAuth2Client;
}

async function listFilesInFolder(drive, folderId) {
  const files = {};
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 1000,
      pageToken: pageToken || undefined,
    });
    for (const f of res.data.files || []) {
      if (/\.(jpg|jpeg|png)$/i.test(f.name)) {
        files[f.name] = f.id;
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return files;
}

async function main() {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  console.log('写真フォルダを検索中...');
  const allFiles = {};
  for (const folderId of PHOTO_FOLDER_IDS) {
    console.log(`  フォルダ ${folderId} を確認中...`);
    const files = await listFilesInFolder(drive, folderId);
    Object.assign(allFiles, files);
    console.log(`  → ${Object.keys(files).length} 件の画像`);
  }
  console.log(`\n合計: ${Object.keys(allFiles).length} 件の画像ファイル`);

  // employees.json を更新
  const employees = JSON.parse(fs.readFileSync(EMPLOYEES_PATH));
  let updated = 0;
  let notFound = 0;

  for (const emp of employees) {
    if (!emp.photo_path) continue;
    const filename = emp.photo_path.split('/').pop();
    const fileId = allFiles[filename];
    if (fileId) {
      emp.photo_url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`;
      updated++;
    } else {
      notFound++;
    }
  }

  fs.writeFileSync(EMPLOYEES_PATH, JSON.stringify(employees, null, 2));
  console.log(`\nemployees.json 更新完了:`);
  console.log(`  photo_url 設定: ${updated} 件`);
  console.log(`  ファイル未発見: ${notFound} 件`);

  // マッピングファイルも保存
  fs.writeFileSync(
    path.join(__dirname, 'photo_id_map.json'),
    JSON.stringify(allFiles, null, 2)
  );
  console.log(`\nscripts/photo_id_map.json にマッピングを保存しました。`);
}

main().catch(console.error);
