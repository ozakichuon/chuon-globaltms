/**
 * スプレッドシートの管理表・履歴を走査し、
 * 参照されている画像・PDFのDrive URLを自動取得して
 * support_img_map シート と photo_map シートを更新する。
 *
 * 使い方:
 *   スプレッドシート > 拡張機能 > Apps Script にこのコードを貼り付け
 *   → 「TMS ツール」メニューから実行
 *     - 画像マップを更新（新規のみ）: 通常運用。マップ未登録のファイルだけDrive検索するので高速
 *     - 画像マップを完全再スキャン: ファイルを同名で差し替えた等、既存分のURLも更新したいとき用
 *       （時間切れで中断しても、次回実行時は続きから再開します。最初からやり直したい場合は
 *        「完全再スキャンをリセット」を実行してください）
 */

const PROP_PREFIX = 'IMG_MAP_PROGRESS_';

function updateImageMapsIncremental() {
  updateImageMaps_(false);
}

function updateImageMapsFull() {
  updateImageMaps_(true);
}

function resetImageMapsFullProgress() {
  PropertiesService.getScriptProperties().deleteProperty(PROP_PREFIX + 'full');
  SpreadsheetApp.getUi().alert('完全再スキャンの進捗をリセットしました。次回実行時は最初から処理します。');
}

function updateImageMaps_(full) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const progressKey = PROP_PREFIX + (full ? 'full' : 'incremental');

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
  // full=true : 全件をDrive再検索し、差し替えられたファイルのURLも更新
  const supportTargets = (full ? [...supportFilenames] : [...supportFilenames].filter((fn) => !imgMap[fn])).sort();
  const photoTargets = (full ? [...photoFilenames] : [...photoFilenames].filter((fn) => !photoMap[fn])).sort();

  // ===== 前回の続きがあれば再開（対象件数が同じ場合のみ有効） =====
  let supportIndex = 0, photoIndex = 0;
  let cumSupportAdded = 0, cumSupportUpdated = 0, cumPhotoAdded = 0, cumPhotoUpdated = 0;
  const savedRaw = props.getProperty(progressKey);
  if (savedRaw) {
    try {
      const saved = JSON.parse(savedRaw);
      if (saved.supportTotal === supportTargets.length && saved.photoTotal === photoTargets.length) {
        supportIndex = saved.supportIndex || 0;
        photoIndex = saved.photoIndex || 0;
        cumSupportAdded = saved.supportAdded || 0;
        cumSupportUpdated = saved.supportUpdated || 0;
        cumPhotoAdded = saved.photoAdded || 0;
        cumPhotoUpdated = saved.photoUpdated || 0;
      }
    } catch (e) {
      // 壊れていた場合は無視して最初から
    }
  }

  const TIME_LIMIT_MS = 5 * 60 * 1000; // 5分でDrive検索を打ち切る（トリガー上限は6分）
  const startTime = Date.now();
  let timedOut = false;

  const supportNewRows = []; // 新規追加分（末尾に一括追加）
  const photoNewRows = [];

  for (; supportIndex < supportTargets.length; supportIndex++) {
    if (Date.now() - startTime > TIME_LIMIT_MS) { timedOut = true; break; }
    const filename = supportTargets[supportIndex];
    const url = findDriveUrl(filename);
    if (!url) continue;
    if (imgMap[filename]) {
      imgSheet.getRange(imgMap[filename], 2).setValue(url);
      cumSupportUpdated++;
    } else {
      supportNewRows.push([filename, url]);
      cumSupportAdded++;
    }
  }

  if (!timedOut) {
    for (; photoIndex < photoTargets.length; photoIndex++) {
      if (Date.now() - startTime > TIME_LIMIT_MS) { timedOut = true; break; }
      const filename = photoTargets[photoIndex];
      const url = findDriveUrl(filename);
      if (!url) continue;
      if (photoMap[filename]) {
        photoSheet.getRange(photoMap[filename], 3).setValue(url);
        cumPhotoUpdated++;
      } else {
        photoNewRows.push([filename, '', url]);
        cumPhotoAdded++;
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

  if (timedOut) {
    // 続きから再開できるよう進捗を保存
    props.setProperty(progressKey, JSON.stringify({
      supportTotal: supportTargets.length,
      photoTotal: photoTargets.length,
      supportIndex, photoIndex,
      supportAdded: cumSupportAdded, supportUpdated: cumSupportUpdated,
      photoAdded: cumPhotoAdded, photoUpdated: cumPhotoUpdated,
    }));
    const doneCount = supportIndex + photoIndex;
    const totalCount = supportTargets.length + photoTargets.length;
    SpreadsheetApp.getUi().alert(
      `⚠ 時間切れのため中断しました（${doneCount}/${totalCount}件処理済み）。\n` +
      `もう一度メニューから実行すると続きから再開します。\n\n` +
      `ここまでの結果 — support_img_map: ${cumSupportAdded}件追加 / ${cumSupportUpdated}件更新\n` +
      `photo_map: ${cumPhotoAdded}件追加 / ${cumPhotoUpdated}件更新`
    );
  } else {
    // 完了したので進捗をクリア
    props.deleteProperty(progressKey);
    SpreadsheetApp.getUi().alert(
      `完了！\n` +
      `support_img_map: ${cumSupportAdded}件追加 / ${cumSupportUpdated}件更新\n` +
      `photo_map: ${cumPhotoAdded}件追加 / ${cumPhotoUpdated}件更新`
    );
  }
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
    .addItem('完全再スキャンをリセット', 'resetImageMapsFullProgress')
    .addToUi();
}
