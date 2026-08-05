/**
 * スプレッドシートの管理表・履歴を走査し、
 * 参照されている画像・PDFのDrive URLを自動取得して
 * support_img_map シート と photo_map シートを更新する。
 *
 * 使い方:
 *   スプレッドシート > 拡張機能 > Apps Script にこのコードを貼り付け
 *   → 「TMS ツール」メニューから実行
 *     - 画像マップを更新（新規のみ）: 通常運用。マップ未登録のファイルだけDrive検索するので高速
 *     - 画像マップを完全再スキャン: ファイルを同名で差し替えた等、既存分のURLも更新したいとき用（時間がかかる場合あり）
 */

function updateImageMapsIncremental() {
  updateImageMaps_(false);
}

function updateImageMapsFull() {
  updateImageMaps_(true);
}

function updateImageMaps_(full) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ===== support_img_map の既存エントリを読み込む =====
  const imgSheet = ss.getSheetByName('support_img_map');
  if (!imgSheet) {
    SpreadsheetApp.getUi().alert('support_img_map シートが見つかりません');
    return;
  }
  const imgData = imgSheet.getDataRange().getValues();
  const imgMap = {}; // filename → row index (1-based)
  for (let i = 1; i < imgData.length; i++) {
    const fn = String(imgData[i][0] || '').trim();
    if (fn) imgMap[fn] = i + 1;
  }

  // ===== photo_map の既存エントリを読み込む =====
  const photoSheet = ss.getSheetByName('photo_map');
  if (!photoSheet) {
    SpreadsheetApp.getUi().alert('photo_map シートが見つかりません');
    return;
  }
  const photoData = photoSheet.getDataRange().getValues();
  const photoMap = {}; // filename → row index (1-based)
  for (let i = 1; i < photoData.length; i++) {
    const fn = String(photoData[i][0] || '').trim();
    if (fn) photoMap[fn] = i + 1;
  }

  // ===== 管理表から参照ファイル名を収集 =====
  const kanriSheet = ss.getSheetByName('管理表');
  if (!kanriSheet) {
    SpreadsheetApp.getUi().alert('管理表 シートが見つかりません');
    return;
  }
  const kanriData = kanriSheet.getDataRange().getValues();

  // support_img_map 対象: 列 AS〜BH (0-indexed: 44〜55)
  const supportFilenames = new Set();
  // photo_map 対象: 列 F (0-indexed: 5)
  const photoFilenames = new Set();

  for (let i = 1; i < kanriData.length; i++) {
    const row = kanriData[i];
    // 写真列 (photo_map)
    extractFilename(row[5], photoFilenames);
    // 書類列 (support_img_map)
    for (let j = 44; j <= 55; j++) {
      extractFilename(row[j], supportFilenames);
    }
  }

  // ===== 履歴から参照ファイル名を収集 =====
  const rireiSheet = ss.getSheetByName('履歴');
  if (rireiSheet) {
    const rireiData = rireiSheet.getDataRange().getValues();
    for (let i = 1; i < rireiData.length; i++) {
      const row = rireiData[i];
      // 登録画像1,2 (0-indexed: 8,9)
      extractFilename(row[8], supportFilenames);
      extractFilename(row[9], supportFilenames);
      // 対応履歴の画像 (i*6+11 〜 i*6+16, img1=+3, img2=+4, for i=0..4)
      for (let k = 0; k < 5; k++) {
        const base = 11 + k * 6;
        extractFilename(row[base + 3], supportFilenames);
        extractFilename(row[base + 4], supportFilenames);
      }
    }
  }

  // full=false: マップ未登録の新規ファイルのみDrive検索（高速）
  // full=true : 全件をDrive再検索し、差し替えられたファイルのURLも更新（時間がかかる場合あり）
  const supportTargets = full ? [...supportFilenames] : [...supportFilenames].filter((fn) => !imgMap[fn]);
  const photoTargets = full ? [...photoFilenames] : [...photoFilenames].filter((fn) => !photoMap[fn]);

  const TIME_LIMIT_MS = 5 * 60 * 1000; // 5分でDrive検索を打ち切る（トリガー上限は6分）
  const startTime = Date.now();
  let timedOut = false;

  let supportAdded = 0, supportUpdated = 0;
  let photoAdded = 0, photoUpdated = 0;
  const supportNewRows = []; // 新規追加分（末尾に一括追加）
  const photoNewRows = [];

  for (const filename of supportTargets) {
    if (Date.now() - startTime > TIME_LIMIT_MS) { timedOut = true; break; }
    const url = findDriveUrl(filename);
    if (!url) continue;
    if (imgMap[filename]) {
      imgSheet.getRange(imgMap[filename], 2).setValue(url);
      supportUpdated++;
    } else {
      supportNewRows.push([filename, url]);
      supportAdded++;
    }
  }

  if (!timedOut) {
    for (const filename of photoTargets) {
      if (Date.now() - startTime > TIME_LIMIT_MS) { timedOut = true; break; }
      const url = findDriveUrl(filename);
      if (!url) continue;
      if (photoMap[filename]) {
        photoSheet.getRange(photoMap[filename], 3).setValue(url);
        photoUpdated++;
      } else {
        photoNewRows.push([filename, '', url]);
        photoAdded++;
      }
    }
  }

  // ===== 新規分は一括書き込み（1件ずつ setValue するより大幅に高速） =====
  if (supportNewRows.length > 0) {
    const startRow = imgSheet.getLastRow() + 1;
    imgSheet.getRange(startRow, 1, supportNewRows.length, 2).setValues(supportNewRows);
  }
  if (photoNewRows.length > 0) {
    const startRow = photoSheet.getLastRow() + 1;
    photoSheet.getRange(startRow, 1, photoNewRows.length, 3).setValues(photoNewRows);
  }

  SpreadsheetApp.getUi().alert(
    (timedOut ? '⚠ 時間切れのため途中で中断しました。もう一度メニューから実行してください。\n\n' : '完了！\n') +
    `support_img_map: ${supportAdded}件追加 / ${supportUpdated}件更新\n` +
    `photo_map: ${photoAdded}件追加 / ${photoUpdated}件更新`
  );
}

/** セル値からファイル名を抽出して Set に追加 */
function extractFilename(val, set) {
  const str = String(val || '').trim();
  if (!str) return;
  // すでに Drive URL なら不要（route.ts 側で直接処理済み）
  if (str.includes('drive.google.com')) return;
  const filename = str.split('/').pop();
  if (filename) set.add(filename);
}

/** ファイル名でマイドライブ全体を検索し、サムネイルURLを返す */
function findDriveUrl(filename) {
  try {
    // シングルクォートをエスケープ
    const escaped = filename.replace(/'/g, "\\'");
    const files = DriveApp.searchFiles(`title = '${escaped}' and trashed = false`);
    if (files.hasNext()) {
      const file = files.next();
      return `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w800`;
    }
  } catch (e) {
    Logger.log('検索エラー: ' + filename + ' / ' + e);
  }
  return null;
}

/** スプレッドシートにメニューを追加 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('TMS ツール')
    .addItem('画像マップを更新（新規のみ）', 'updateImageMapsIncremental')
    .addItem('画像マップを完全再スキャン（差し替え反映）', 'updateImageMapsFull')
    .addToUi();
}
