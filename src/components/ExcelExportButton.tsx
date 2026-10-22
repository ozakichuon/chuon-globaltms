"use client";

import { Download } from "lucide-react";

type Cell = string | number | null;

export function ExcelExportButton({
  headers,
  rows,
  filename,
  sheetName,
}: {
  headers: string[];
  rows: Cell[][];
  filename: string;
  sheetName: string;
}) {
  async function handleClick() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(10, h.length * 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
    >
      <Download size={13} /> Excel出力
    </button>
  );
}
