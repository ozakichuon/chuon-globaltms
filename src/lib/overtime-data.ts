// src/lib/data/overtime_YYYY_MM.json を自動検出して読み込む
// （月が変わるたびに import 文を手動追加する必要がなくなり、追加漏れによる
//   ダミー値混入バグを防ぐ）
import fs from "fs";
import path from "path";

export type OvertimeEntry = {
  overtime_hours: number;
  worked_hours: number;
  midnight_hours: number;
  daily?: Record<string, number | null>;
};

export type OvertimeSource = {
  period: string;
  month_label: string;
  month_start: string;
  print_date?: string;
  data: Record<string, OvertimeEntry>;
};

const DATA_DIR = path.join(process.cwd(), "src/lib/data");

function loadAllOvertimeSources(): OvertimeSource[] {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^overtime_\d{4}_\d{2}\.json$/.test(f));
  const sources = files.map(
    (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8")) as OvertimeSource
  );
  sources.sort((a, b) => a.month_start.localeCompare(b.month_start));
  return sources;
}

// month_start昇順（古い→新しい）
export const allOvertimeSources: OvertimeSource[] = loadAllOvertimeSources();

// 全overtimeデータから日別マップを構築（社員コード → 日付 → 残業時間）
export const allDailyData: Record<string, Record<string, number | null>> = {};
for (const src of allOvertimeSources) {
  for (const [code, val] of Object.entries(src.data)) {
    if (!allDailyData[code]) allDailyData[code] = {};
    if (val.daily) Object.assign(allDailyData[code], val.daily);
  }
}

// 実績データ: month_start → { code → OvertimeEntry }
export const realDataByMonth: Record<string, Record<string, OvertimeEntry>> = {};
for (const src of allOvertimeSources) {
  const map: Record<string, OvertimeEntry> = {};
  for (const [code, val] of Object.entries(src.data)) {
    map[code] = val;
  }
  realDataByMonth[src.month_start] = map;
}

// 最新の残業取込日時（print_date）
export const latestOvertimePrintDate: string =
  [...allOvertimeSources].reverse().find((s) => s.print_date)?.print_date ?? "";
