const https = require('https');
const fs = require('fs');

const SHEET_ID = '1yGxl2P1PCVTXQC0s-QhSEbJ1HkbUfFpcbWaNclalDcI';

function imgUrl(path, driveMap) {
  if (!path) return null;
  const filename = path.split('/').pop();
  return driveMap[filename] ?? null;
}

function fetchGviz(sheetName) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        const json = JSON.parse(data.replace(/^[^(]+\(/, '').replace(/\);\s*$/, ''));
        resolve(json.table);
      });
    }).on('error', reject);
  });
}

function v(cell) { return cell ? (cell.v !== undefined && cell.v !== null ? cell.v : '') : ''; }
function s(cell) { return cell ? (cell.f || String(cell.v ?? '')) : ''; }

// 在留資格の日本語 → visa_statusコード変換
function toVisaStatus(jp) {
  if (!jp) return 'other';
  if (jp.includes('技能実習1号')) return 'technical_intern_1';
  if (jp.includes('技能実習2号')) return 'technical_intern_2';
  if (jp.includes('技能実習3号')) return 'technical_intern_3';
  if (jp.includes('特定技能2号')) return 'specified_skill_2';
  if (jp.includes('特定技能1号') || jp.includes('特定技能')) return 'specified_skill_1';
  if (jp.includes('技術') || jp.includes('人文')) return 'engineer_humanities';
  if (jp.includes('永住')) return 'permanent';
  if (jp.includes('定住')) return 'long_term';
  if (jp.includes('配偶者')) return 'spouse';
  if (jp.includes('日本')) return 'japanese';
  return 'other';
}

// 性別の日本語 → male/female
function toGender(jp) {
  if (jp === '男') return 'male';
  if (jp === '女') return 'female';
  return null;
}

// 住所文字列から (dormitory_id, dormitory_name, room_no) を解析
const DORM_MAP = [
  { id: '025736f7-85cb-427e-8699-f58a9f2b4f54', name: 'アトム',               keyword: 'アトムスカイマンション' },
  { id: '5a232eb8-ad12-4afc-8918-0bb0a954941e', name: 'ビレッジハウス松山上野', keyword: 'ビレッジハウス松山上野' },
  { id: '55b291e2-adb1-49e2-bc5e-292e22ea5f12', name: 'コーポ津吉',            keyword: 'コーポ津吉' },
  { id: '8da6f587-e92b-4bd8-8f00-c016165be252', name: '東温市牛渕（個別）',    keyword: '東温市牛渕' },
  { id: '49bedc9c-8210-4fa6-990a-6632fc805eff', name: 'EARLS COURT東温Ⅱ',     keyword: 'EARLS' },
  { id: '9a822ea9-aa8b-470b-a0f5-98eec649ba15', name: 'シティハイム',           keyword: 'シティハイム' },
  { id: '3ab65e8c-d558-4360-afb1-c3117a7a29f6', name: '中野町',                keyword: '中野町' },
  { id: '2544426f-6562-43e5-9784-e8afd065171f', name: 'HAPPINESS',             keyword: 'HAPPINESS' },
];

function parseAddress(addr) {
  if (!addr) return null;
  const a = addr.trim().replace(/\s+/g, ' ');
  const dorm = DORM_MAP.find(d => a.includes(d.keyword));
  if (!dorm) return null;

  let room = '';
  if (dorm.keyword === 'アトムスカイマンション') {
    const m = a.match(/アトムスカイマンション(\S+)/);
    room = m ? m[1] : '';
  } else if (dorm.keyword === 'ビレッジハウス松山上野') {
    const m = a.match(/ビレッジハウス松山上野(\S+)/);
    room = m ? m[1] : '';
  } else if (dorm.keyword === 'コーポ津吉') {
    const m = a.match(/コーポ津吉(\S+)/);
    room = m ? m[1] : '';
  } else if (dorm.keyword === '東温市牛渕') {
    // 住所全体を部屋キーとして使う
    room = a.replace(/^.*東温市牛渕/, '東温市牛渕');
  } else if (dorm.keyword === 'EARLS') {
    const m = a.match(/(\d+)号/);
    room = m ? m[1] : a.replace(/.*COURT東温[ⅡII]+\s*/, '');
  } else if (dorm.keyword === 'シティハイム') {
    const m = a.match(/シティハイム(\S+)/);
    room = m ? m[1] : '';
  } else if (dorm.keyword === '中野町') {
    room = a;
  } else if (dorm.keyword === 'HAPPINESS') {
    const m = a.match(/HAPPINESS\s*(F棟\S+)/i);
    room = m ? m[1] : a.replace(/.*HAPPINESS\s*/i, '');
  }
  return { dormitory_id: dorm.id, dormitory_name: dorm.name, room_no: room || null };
}

// 決定論的UUID生成（dormitory_id + room_no から）
function stableId(base) {
  let h = 0x811c9dc5;
  for (let i = 0; i < base.length; i++) { h ^= base.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  const hex = h.toString(16).padStart(8, '0');
  return `${hex.slice(0,8)}-${hex.slice(0,4)}-5${hex.slice(1,4)}-${((parseInt(hex.slice(0,2), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(2,6)}-${hex}${hex.slice(0,4)}`;
}

async function main() {
  // 生活サポート画像マップ（support_img_map シート）
  let supportImgMap = {};
  try {
    console.log('support_img_mapを取得中...');
    const imgMapTable = await fetchGviz('support_img_map');
    for (const row of imgMapTable.rows) {
      const c = row.c;
      const filename = c && c[0] ? String(c[0].v ?? '').trim() : '';
      const url = c && c[1] ? String(c[1].v ?? '').trim() : '';
      if (filename && url) supportImgMap[filename] = url;
    }
    console.log('support_img_map取得完了:', Object.keys(supportImgMap).length, '件');
  } catch (e) {
    console.log('support_img_map未作成 → 画像URLスキップ');
  }

  // === 管理表 → employees.json ===
  console.log('管理表を取得中...');
  const empTable = await fetchGviz('管理表');
  const rows = empTable.rows;

  // photo_map シートから最新のphoto_urlを取得
  console.log('photo_mapを取得中...');
  const photoTable = await fetchGviz('photo_map');
  // photo_map: ファイル名 → URL のマップを構築
  const photoMapByFilename = {};
  for (const row of photoTable.rows) {
    const c = row.c;
    if (!c || !c[0] || !c[0].v) continue;
    const filename = String(c[0].v).trim();
    const url = c[2] ? String(c[2].v) : null;
    if (filename && url) photoMapByFilename[filename] = url;
  }

  const existing = JSON.parse(fs.readFileSync('src/lib/data/employees.json', 'utf8'));
  const existingPhotoMap = {};
  for (const e of existing) { if (e.photo_url) existingPhotoMap[e.employee_code] = e.photo_url; }

  const employees = [];
  for (const row of rows) {
    const c = row.c;
    if (!c || !c[4] || !c[4].v) continue;
    const code = String(v(c[4])).trim();
    const retireStatus = s(c[35]);
    const visaTypeJp = s(c[16]);
    employees.push({
      id: code,
      employee_code: code,
      display_name: s(c[7]),
      furigana: s(c[6]) || null,
      nickname: s(c[8]) || null,
      nationality: s(c[3]),
      nationality_jp: s(c[3]) || null,
      gender: toGender(s(c[9])),
      birth_date: s(c[10]) || null,
      marital_status: null,
      support_agency: null,
      hired_at: s(c[14]) || null,
      expected_return: null,
      visa_type_jp: visaTypeJp || null,
      visa_status: toVisaStatus(visaTypeJp),
      address_jp: s(c[17]) || null,
      room_type: s(c[18]) || null,
      rent_burden: null,
      residence_card_no: s(c[23]) || null,
      residence_card_expires_at: s(c[21]) || null,
      employment_insurance_no: null,
      jlpt_level: s(c[29]) || null,
      department_head: null,
      temporary_retirement_date: null,
      temporary_return_from: null,
      temporary_return_to: null,
      rejoined: null,
      // 「退職」のみ退職扱い。一時退職・退職予定・一時帰国等はすべて在籍中(false)
      retired: retireStatus.trim() === '退職',
      retired_mark: retireStatus || null,
      retired_at: s(c[36]) || null,
      return_cost: null,
      ss1_insurance: null,
      ss1_entry_date: null,
      ss1_insurance_period: null,
      salary_account: null,
      note: null,
      photo_path: null,
      photo_url: (() => {
        // 管理表の写真列からファイル名を取得し、photo_mapのURLを引く
        const photoPath = s(c[5]);
        if (photoPath) {
          const filename = photoPath.split('/').pop();
          if (filename && photoMapByFilename[filename]) return photoMapByFilename[filename];
        }
        // なければ既存のphoto_urlを継続使用
        return existingPhotoMap[code] || null;
      })(),
      // 追加フィールド（旧形式との互換）
      section: s(c[0]),
      workplace: s(c[2]),
      residence_card_procedure: s(c[24]),
    });
  }
  fs.writeFileSync('src/lib/data/employees.json', JSON.stringify(employees, null, 2), 'utf8');
  console.log('employees.json 更新完了:', employees.length, '件');

  // === 管理表 → dormitory_assignments.json ===
  // 住所列から寮・部屋を解析し、在籍中従業員の寮割当を生成
  // employees配列から社員コード→性別マップを構築
  const genderByCode = {};
  for (const e of employees) { if (e.gender) genderByCode[e.employee_code] = e.gender; }
  console.log('寮割当を生成中...');
  const assignments = [];
  for (const row of rows) {
    const c = row.c;
    if (!c || !c[4] || !c[4].v) continue;
    const code = String(v(c[4])).trim();
    const retireStatus = s(c[35]);
    // 退職者は除外
    if (retireStatus.trim() === '退職') continue;
    const addr = s(c[17]);
    if (!addr) continue;
    const parsed = parseAddress(addr);
    if (!parsed) continue;

    // photo_url を管理表の写真列から取得
    const photoPath = s(c[5]);
    let photoUrl = null;
    if (photoPath) {
      const filename = photoPath.split('/').pop();
      if (filename && photoMapByFilename[filename]) photoUrl = photoMapByFilename[filename];
    }
    if (!photoUrl) photoUrl = existingPhotoMap[code] || null;

    const roomId = stableId(parsed.dormitory_id + ':' + (parsed.room_no || ''));
    const assignId = stableId(code + ':' + parsed.dormitory_id + ':' + (parsed.room_no || ''));

    assignments.push({
      id: assignId,
      dormitory_id: parsed.dormitory_id,
      dormitory_name: parsed.dormitory_name,
      room_id: roomId,
      room_no: parsed.room_no,
      resident_name: s(c[6]) || s(c[7]),
      employee_id: assignId,
      employee_code: code,
      photo_url: photoUrl,
      rent_burden: null,
      workplace: s(c[2]) || null,
      nationality: s(c[3]) || null,
      visa_type: s(c[16]) || null,
      gender: genderByCode[code] === 'male' ? '男' : genderByCode[code] === 'female' ? '女' : null,
    });
  }
  fs.writeFileSync('src/lib/data/dormitory_assignments.json', JSON.stringify(assignments, null, 2), 'utf8');
  console.log('dormitory_assignments.json 更新完了:', assignments.length, '件');

  // === 履歴 → support_tickets.json ===
  // 列構造: 0=seq, 1=date, 2=time, 3=recorder, 4=employee_code, 5=place,
  //         6=kind, 7=status, 8=reg_img1, 9=reg_img2, 10=request_note,
  //         11+i*6: 対応i (date=+0, time=+1, responder=+2, img1=+3, img2=+4, note=+5), 41=overall_note
  console.log('履歴を取得中...');
  const tickTable = await fetchGviz('履歴');
  const tickRows = tickTable.rows;

  const tickets = [];
  for (const row of tickRows) {
    const c = row.c;
    if (!c || !c[0] || !c[0].v) continue;
    const empCode = s(c[4]);
    const responses = [];
    for (let i = 0; i < 5; i++) {
      const base = 11 + i * 6;
      const date = s(c[base]);
      const time = s(c[base + 1]);
      const responder = s(c[base + 2]);
      const img1 = s(c[base + 3]);
      const img2 = s(c[base + 4]);
      const note = s(c[base + 5]);
      if (date || responder || note) responses.push({
        date: date || null,
        time: time || null,
        responder: responder || null,
        img1: img1 || null,
        img1_url: imgUrl(img1, supportImgMap),
        img2: img2 || null,
        img2_url: imgUrl(img2, supportImgMap),
        note: note || null,
      });
    }
    const ri1 = s(c[8]) || null;
    const ri2 = s(c[9]) || null;
    tickets.push({
      id: String(v(c[0])),
      seq: v(c[0]),
      date: s(c[1]) || null,
      time: s(c[2]) || null,
      recorder: s(c[3]) || null,
      target_employee_code: empCode || null,
      target_employee_id: empCode || null,
      place: s(c[5]) || null,
      kind: s(c[6]) || null,
      status: s(c[7]) || null,
      reg_img1: ri1,
      reg_img1_url: imgUrl(ri1, supportImgMap),
      reg_img2: ri2,
      reg_img2_url: imgUrl(ri2, supportImgMap),
      request_note: s(c[10]) || null,
      responses,
      overall_note: s(c[41]) || null,
    });
  }
  fs.writeFileSync('src/lib/data/support_tickets.json', JSON.stringify(tickets, null, 2), 'utf8');
  console.log('support_tickets.json 更新完了:', tickets.length, '件');
}

main().catch(e => { console.error(e); process.exit(1); });
