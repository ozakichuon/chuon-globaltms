const PDFParser = require('pdf2json');
const fs = require('fs');
const path = require('path');

const pdfPath = process.argv[2];
const outputPath = process.argv[3];

if (!pdfPath) {
  console.error('Usage: node parse_overtime_pdf.js <pdf_path> [output.json]');
  process.exit(1);
}

// HH:MM → decimal hours
function parseTime(str) {
  if (!str || !str.includes(':')) return 0;
  const [h, m] = str.split(':').map(Number);
  return h + m / 60;
}

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', err => {
  console.error('Parse error:', err.parserError);
  process.exit(1);
});

pdfParser.on('pdfParser_dataReady', pdfData => {
  const result = {};
  let period = '';
  let monthLabel = '';
  let monthStart = '';

  pdfData.Pages.forEach((page, pageIdx) => {
    const texts = page.Texts.map(t => ({
      x: Math.round(t.x * 10) / 10,
      y: Math.round(t.y * 10) / 10,
      text: decodeURIComponent(t.R.map(r => r.T).join(''))
    })).sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

    // Extract employee code: "社員CD：XXXXXXXX 氏名"
    const empLine = texts.find(t => t.text.startsWith('社員CD：'));
    if (!empLine) return;
    const empMatch = empLine.text.match(/社員CD：(\d+)/);
    if (!empMatch) return;
    const empCode = empMatch[1];

    // Extract period from first page
    if (pageIdx === 0) {
      const periodLine = texts.find(t => t.text.includes('～'));
      if (periodLine) {
        const m = periodLine.text.match(/(\d{4})年(\d{2})月\[(\d{4})年(\d{2})月(\d{2})日.*～(\d{4})年(\d{2})月(\d{2})日/);
        if (m) {
          monthLabel = `${m[1]}-${m[2]}`;
          const s = `${m[3]}-${m[4].padStart(2,'0')}-${m[5].padStart(2,'0')}`;
          const e = `${m[6]}-${m[7].padStart(2,'0')}-${m[8].padStart(2,'0')}`;
          period = `${s}_${e}`;
          monthStart = `${m[1]}-${m[2]}-01`;
        }
      }
    }

    // Find 合計行 (y ≈ 29)
    const totalRow = texts.filter(t => Math.abs(t.y - 29) < 0.6);

    // Column mapping based on x positions:
    // x≈31.6: 早出残業, x≈33.4: 普通残業, x≈35.2: 深夜残業
    // x≈37: 深夜時間, x≈38.9: 休日時間, x≈40.7: 休日深夜
    // x≈46.4: 給与実働, x≈48.2: 実働合計
    function findVal(xMin, xMax) {
      const found = totalRow.find(t => t.x >= xMin && t.x <= xMax);
      return found ? found.text : null;
    }

    const hayadeStr   = findVal(30.5, 32.5); // 早出残業
    const futsūStr    = findVal(32.5, 34.5); // 普通残業
    const shinyaRStr  = findVal(34.5, 36.5); // 深夜残業
    const shinyaJStr  = findVal(36.5, 38.5); // 深夜時間
    const kyūjitsuStr = findVal(38.5, 40.5); // 休日時間
    const kyūDeepStr  = findVal(40.5, 42.5); // 休日深夜
    const workedStr   = findVal(47.5, 49.5); // 実働合計

    const hayade   = parseTime(hayadeStr);
    const futsū    = parseTime(futsūStr);
    const shinyaR  = parseTime(shinyaRStr);
    const shinyaJ  = parseTime(shinyaJStr);
    const kyūjitsu = parseTime(kyūjitsuStr);
    const kyūDeep  = parseTime(kyūDeepStr);
    const worked   = parseTime(workedStr);

    // overtime = 早出 + 普通 + 休日
    const overtime = Math.round((hayade + futsū + kyūjitsu) * 100) / 100;
    // midnight = 深夜残業 + 深夜時間 + 休日深夜
    const midnight = Math.round((shinyaR + shinyaJ + kyūDeep) * 100) / 100;

    result[empCode] = {
      overtime_hours: overtime,
      worked_hours: Math.round(worked * 100) / 100,
      midnight_hours: midnight,
    };
  });

  const output = { period, month_label: monthLabel, month_start: monthStart, data: result };

  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Saved to ${outputPath} (${Object.keys(result).length} employees)`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
});

pdfParser.loadPDF(pdfPath);
