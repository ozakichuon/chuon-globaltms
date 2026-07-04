-- ============================================================
-- Seed Data: マスタとデモ用従業員20名
-- ============================================================

-- ------------------------------------------------------------
-- 組織
-- ------------------------------------------------------------
insert into organizations (id, name, name_id, sort_order) values
  ('00000000-0000-0000-0000-000000000001', '本社工場', 'Pabrik Utama', 1),
  ('00000000-0000-0000-0000-000000000002', '第1ライン（たけのこ）', 'Line 1 (Rebung)', 10),
  ('00000000-0000-0000-0000-000000000003', '第2ライン（里芋）', 'Line 2 (Talas)', 20),
  ('00000000-0000-0000-0000-000000000004', '第3ライン（じゃがいも）', 'Line 3 (Kentang)', 30),
  ('00000000-0000-0000-0000-000000000005', '品質管理部', 'Dept QC', 40),
  ('00000000-0000-0000-0000-000000000006', '管理部門', 'Dept Admin', 50);

update organizations set parent_id = '00000000-0000-0000-0000-000000000001'
  where id in (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006'
  );

-- ------------------------------------------------------------
-- キャリアレベル
-- ------------------------------------------------------------
insert into career_levels (level, name_ja, name_id, description_ja, description_id,
  min_skill_count, min_jlpt_level, min_tenure_months, min_mentor_count, hourly_wage_delta, sort_order) values
  (1, '見習い',     'Pemula',          '入社直後。OJT中心', 'Baru masuk. OJT utama',
    0,  'none', 0,  0, 0, 1),
  (2, '作業者',     'Operator',        '単独作業が可能', 'Dapat bekerja mandiri',
    5,  'N5',   3,  0, 50, 2),
  (3, '熟練工',     'Operator Ahli',   '自己判断で品質担保', 'Menjamin kualitas sendiri',
    10, 'N5',   6,  0, 100, 3),
  (4, 'リーダー',   'Leader',          '新人指導を担当', 'Bimbing karyawan baru',
    20, 'N4',   12, 1, 150, 4),
  (5, '班長',       'Kepala Tim',      '班の運営・シフト管理', 'Kelola tim & shift',
    30, 'N3',   24, 3, 250, 5),
  (6, '現場管理者', 'Manajer Lapangan', 'ライン全体の責任者', 'Bertanggung jawab atas seluruh line',
    45, 'N3',   36, 5, 400, 6),
  (7, '工場幹部',   'Eksekutif',        '経営視点で工場を運営', 'Kelola pabrik dari perspektif bisnis',
    60, 'N2',   60, 10, 600, 7);

-- ------------------------------------------------------------
-- スキルカテゴリ
-- ------------------------------------------------------------
insert into skill_categories (id, name, name_id, sort_order) values
  ('10000000-0000-0000-0000-000000000001', '原料処理', 'Pengolahan Bahan Baku', 1),
  ('10000000-0000-0000-0000-000000000002', '加熱工程', 'Proses Pemanasan', 2),
  ('10000000-0000-0000-0000-000000000003', '充填・包装', 'Pengisian & Pengemasan', 3),
  ('10000000-0000-0000-0000-000000000004', '品質管理', 'Kontrol Kualitas', 4),
  ('10000000-0000-0000-0000-000000000005', '機械操作・保守', 'Operasi & Pemeliharaan Mesin', 5),
  ('10000000-0000-0000-0000-000000000006', 'マネジメント', 'Manajemen', 6);

-- ------------------------------------------------------------
-- スキル
-- ------------------------------------------------------------
insert into skills (category_id, code, name, name_id, description, max_level, required_for_career_level, points_contribution, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'RAW_TAKENOKO_PEEL',  'たけのこ皮むき',     'Mengupas rebung',         '皮むきの基本作業', 3, 2, 10, 1),
  ('10000000-0000-0000-0000-000000000001', 'RAW_SATOIMO_PREP',   '里芋下処理',         'Pengolahan talas',        '洗浄・皮むき', 3, 2, 10, 2),
  ('10000000-0000-0000-0000-000000000001', 'RAW_POTATO_CUT',     'じゃがいもカット',   'Memotong kentang',        '規格通りのカット', 3, 2, 10, 3),
  ('10000000-0000-0000-0000-000000000001', 'RAW_FOREIGN_CHECK',  '異物判定',           'Pemeriksaan benda asing', '目視による異物検出', 3, 3, 15, 4),
  ('10000000-0000-0000-0000-000000000002', 'HEAT_KAMA_IN',       '釜投入',             'Memasukkan ke kama',      'タイミング・量の判断', 3, 3, 15, 10),
  ('10000000-0000-0000-0000-000000000002', 'HEAT_TEMP_CONTROL',  '温度管理',           'Kontrol suhu',            '中温・高温の使い分け', 3, 4, 20, 11),
  ('10000000-0000-0000-0000-000000000002', 'HEAT_COOLING',       '冷却・ハンドリング', 'Pendinginan',             'HACCP対応の冷却', 3, 4, 20, 12),
  ('10000000-0000-0000-0000-000000000003', 'PACK_FILL_MANUAL',   '手詰め充填',         'Pengisian manual',        '手作業の袋詰め', 3, 2, 10, 20),
  ('10000000-0000-0000-0000-000000000003', 'PACK_FILL_MACHINE',  '機械充填',           'Mesin pengisian',         '充填機の操作', 3, 3, 15, 21),
  ('10000000-0000-0000-0000-000000000003', 'PACK_WEIGHT',        '計量',               'Penimbangan',             '±3%以内の精度', 3, 3, 15, 22),
  ('10000000-0000-0000-0000-000000000003', 'PACK_METAL_DETECT',  '金属探知機操作',     'Operasi detektor logam',  '金探・X線検査', 3, 4, 20, 23),
  ('10000000-0000-0000-0000-000000000004', 'QC_VISUAL',          '官能検査',           'Pemeriksaan sensorik',    '色・香り・食感の評価', 3, 4, 20, 30),
  ('10000000-0000-0000-0000-000000000004', 'QC_HACCP',           'HACCP衛生管理',      'Manajemen HACCP',         '衛生基準の維持', 3, 5, 25, 31),
  ('10000000-0000-0000-0000-000000000005', 'MACH_CLEAN',         '機械清掃',           'Pembersihan mesin',       '日次清掃', 3, 3, 10, 40),
  ('10000000-0000-0000-0000-000000000005', 'MACH_MAINT',         '機械保守',           'Pemeliharaan mesin',      'トラブル一次対応', 3, 5, 25, 41),
  ('10000000-0000-0000-0000-000000000006', 'MGMT_MENTOR',        '新人指導',           'Membimbing pemula',       'メンター', 3, 4, 30, 50),
  ('10000000-0000-0000-0000-000000000006', 'MGMT_SHIFT',         'シフト管理',         'Manajemen shift',         '班のシフト作成', 3, 5, 35, 51),
  ('10000000-0000-0000-0000-000000000006', 'MGMT_INTERPRET',     '多言語通訳',         'Penerjemahan',            '日本語↔インドネシア語', 3, 4, 30, 52);

-- ------------------------------------------------------------
-- 資格マスタ
-- ------------------------------------------------------------
insert into certifications (name, issuer, is_japanese_language, expires_after_months) values
  ('JLPT N5', '国際交流基金', true, null),
  ('JLPT N4', '国際交流基金', true, null),
  ('JLPT N3', '国際交流基金', true, null),
  ('JLPT N2', '国際交流基金', true, null),
  ('HACCP基礎', '日本食品衛生協会', false, 36),
  ('食品衛生責任者', '各都道府県食品衛生協会', false, null),
  ('フォークリフト運転技能講習', '各教習所', false, null),
  ('特定技能試験（製造業/食品製造）', '厚生労働省', false, null);

-- ------------------------------------------------------------
-- デモ用従業員20名
-- ------------------------------------------------------------
-- 経営者・管理者
insert into employees (id, employee_code, last_name, first_name, last_name_kana, first_name_kana,
  birth_date, gender, nationality, native_language, preferred_language,
  employment_type, organization_id, hired_at, jlpt_level, japanese_speaking_level, career_level) values
  ('20000000-0000-0000-0000-000000000001', 'E0001', '中温', '社長', 'チュウオン', 'シャチョウ',
    '1970-05-10', 'male', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000006', '2000-04-01', 'N1', 5, 7),
  ('20000000-0000-0000-0000-000000000002', 'E0002', '山田', '花子', 'ヤマダ', 'ハナコ',
    '1982-09-20', 'female', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000006', '2005-04-01', 'N1', 5, 6),
  ('20000000-0000-0000-0000-000000000003', 'E0003', '鈴木', '一郎', 'スズキ', 'イチロウ',
    '1978-03-15', 'male', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000002', '2002-04-01', 'N1', 5, 6),
  ('20000000-0000-0000-0000-000000000004', 'E0004', '佐藤', '美咲', 'サトウ', 'ミサキ',
    '1990-07-22', 'female', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000005', '2015-04-01', 'N1', 5, 5);

-- 日本人班長・作業者
insert into employees (id, employee_code, last_name, first_name, last_name_kana, first_name_kana,
  birth_date, gender, nationality, native_language, preferred_language,
  employment_type, organization_id, hired_at, jlpt_level, japanese_speaking_level, career_level) values
  ('20000000-0000-0000-0000-000000000005', 'E0005', '田中', '健太', 'タナカ', 'ケンタ',
    '1985-11-08', 'male', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000003', '2010-04-01', 'N1', 5, 5),
  ('20000000-0000-0000-0000-000000000006', 'E0006', '伊藤', '由美', 'イトウ', 'ユミ',
    '1995-02-14', 'female', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000004', '2018-04-01', 'N1', 5, 4);

-- インドネシア人技能実習生
insert into employees (id, employee_code, last_name, first_name, last_name_native, first_name_native,
  birth_date, gender, nationality, native_language, preferred_language,
  employment_type, organization_id, hired_at, jlpt_level, japanese_speaking_level, career_level,
  religion, dietary_restriction, needs_prayer_room,
  home_family_name, home_family_contact, is_family_sharing_enabled) values
  ('20000000-0000-0000-0000-000000000007', 'E0007', 'プトラ', 'アフマド', 'Putra', 'Ahmad',
    '1998-06-15', 'male', 'ID', 'id', 'id', 'technical_intern',
    '00000000-0000-0000-0000-000000000002', '2024-02-01', 'N4', 3, 3,
    'muslim', 'halal', true,
    'Putra Family', 'putra.family@example.com', true),
  ('20000000-0000-0000-0000-000000000008', 'E0008', 'サリ', 'デヴィ', 'Sari', 'Dewi',
    '2000-01-20', 'female', 'ID', 'id', 'id', 'technical_intern',
    '00000000-0000-0000-0000-000000000003', '2024-05-15', 'N5', 2, 2,
    'muslim', 'halal', true,
    'Sari Family', 'sari.family@example.com', false),
  ('20000000-0000-0000-0000-000000000009', 'E0009', 'ワヒュ', 'ブディ', 'Wahyu', 'Budi',
    '1997-03-30', 'male', 'ID', 'id', 'id', 'technical_intern',
    '00000000-0000-0000-0000-000000000002', '2023-08-01', 'N4', 3, 3,
    'muslim', 'halal', true,
    null, null, false),
  ('20000000-0000-0000-0000-000000000010', 'E0010', 'ニングシ', 'リナ', 'Ningsih', 'Rina',
    '1999-09-10', 'female', 'ID', 'id', 'id', 'technical_intern',
    '00000000-0000-0000-0000-000000000004', '2024-10-01', 'N5', 2, 2,
    'muslim', 'halal', true,
    null, null, false),
  ('20000000-0000-0000-0000-000000000011', 'E0011', 'ハルヨ', 'シティ', 'Haryo', 'Siti',
    '1996-12-05', 'female', 'ID', 'id', 'id', 'specified_skill',
    '00000000-0000-0000-0000-000000000002', '2022-04-01', 'N3', 4, 4,
    'muslim', 'halal', true,
    'Haryo Family', 'haryo.family@example.com', true),
  ('20000000-0000-0000-0000-000000000012', 'E0012', 'プルノモ', 'ジョコ', 'Purnomo', 'Joko',
    '1995-07-18', 'male', 'ID', 'id', 'id', 'specified_skill',
    '00000000-0000-0000-0000-000000000003', '2021-10-01', 'N3', 4, 4,
    'muslim', 'halal', true,
    null, null, false);

-- ベトナム人実習生
insert into employees (id, employee_code, last_name, first_name, last_name_native, first_name_native,
  birth_date, gender, nationality, native_language, preferred_language,
  employment_type, organization_id, hired_at, jlpt_level, japanese_speaking_level, career_level) values
  ('20000000-0000-0000-0000-000000000013', 'E0013', 'グエン', 'ヴァン', 'Nguyen', 'Van',
    '1998-04-25', 'male', 'VN', 'vi', 'vi', 'technical_intern',
    '00000000-0000-0000-0000-000000000004', '2024-01-10', 'N5', 2, 2),
  ('20000000-0000-0000-0000-000000000014', 'E0014', 'チャン', 'ティ', 'Tran', 'Thi',
    '2001-08-14', 'female', 'VN', 'vi', 'vi', 'technical_intern',
    '00000000-0000-0000-0000-000000000005', '2024-07-20', 'N5', 2, 2);

-- 日本人パート・作業者
insert into employees (id, employee_code, last_name, first_name, last_name_kana, first_name_kana,
  birth_date, gender, nationality, native_language, preferred_language,
  employment_type, organization_id, hired_at, jlpt_level, japanese_speaking_level, career_level) values
  ('20000000-0000-0000-0000-000000000015', 'E0015', '渡辺', '雅子', 'ワタナベ', 'マサコ',
    '1965-04-12', 'female', 'JP', 'ja', 'ja', 'part_time',
    '00000000-0000-0000-0000-000000000002', '2015-06-01', 'N1', 5, 3),
  ('20000000-0000-0000-0000-000000000016', 'E0016', '高橋', '愛', 'タカハシ', 'アイ',
    '1988-11-25', 'female', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000005', '2012-04-01', 'N1', 5, 4),
  ('20000000-0000-0000-0000-000000000017', 'E0017', '小林', '剛', 'コバヤシ', 'ツヨシ',
    '1993-02-28', 'male', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000004', '2016-04-01', 'N1', 5, 4),
  ('20000000-0000-0000-0000-000000000018', 'E0018', '加藤', '直樹', 'カトウ', 'ナオキ',
    '1980-06-10', 'male', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000003', '2008-04-01', 'N1', 5, 5),
  ('20000000-0000-0000-0000-000000000019', 'E0019', '吉田', '麻衣', 'ヨシダ', 'マイ',
    '1997-09-03', 'female', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000002', '2020-04-01', 'N1', 5, 3),
  ('20000000-0000-0000-0000-000000000020', 'E0020', '松本', '翔', 'マツモト', 'ショウ',
    '2001-01-15', 'male', 'JP', 'ja', 'ja', 'regular',
    '00000000-0000-0000-0000-000000000004', '2023-04-01', 'N1', 5, 2);

-- ------------------------------------------------------------
-- 在留資格
-- ------------------------------------------------------------
insert into visa_records (employee_id, visa_status, residence_card_no, issued_at, expires_at, next_renewable_from, is_current, transition_target) values
  ('20000000-0000-0000-0000-000000000007', 'technical_intern_2', 'AB12345678CD', '2024-02-01', '2027-02-01', '2026-11-01', true, 'specified_skill_1'),
  ('20000000-0000-0000-0000-000000000008', 'technical_intern_1', 'AB23456789CD', '2024-05-15', '2025-05-15', '2025-02-15', true, 'technical_intern_2'),
  ('20000000-0000-0000-0000-000000000009', 'technical_intern_2', 'AB34567890CD', '2023-08-01', '2026-08-01', '2026-05-01', true, 'specified_skill_1'),
  ('20000000-0000-0000-0000-000000000010', 'technical_intern_1', 'AB45678901CD', '2024-10-01', '2025-10-01', '2025-07-01', true, 'technical_intern_2'),
  ('20000000-0000-0000-0000-000000000011', 'specified_skill_1', 'AB56789012CD', '2022-04-01', '2026-07-01', '2026-04-01', true, 'specified_skill_2'),
  ('20000000-0000-0000-0000-000000000012', 'specified_skill_1', 'AB67890123CD', '2021-10-01', '2026-05-20', '2026-02-20', true, 'specified_skill_2'),
  ('20000000-0000-0000-0000-000000000013', 'technical_intern_1', 'AB78901234CD', '2024-01-10', '2025-01-10', '2024-10-10', true, 'technical_intern_2'),
  ('20000000-0000-0000-0000-000000000014', 'technical_intern_1', 'AB89012345CD', '2024-07-20', '2025-07-20', '2025-04-20', true, 'technical_intern_2');

-- ------------------------------------------------------------
-- 従業員スキル（サンプル）
-- ------------------------------------------------------------
-- Ahmad（E0007）: 原料処理・充填に強い
insert into employee_skills (employee_id, skill_id, level, acquired_at) values
  ('20000000-0000-0000-0000-000000000007', (select id from skills where code='RAW_TAKENOKO_PEEL'), 3, '2024-05-01'),
  ('20000000-0000-0000-0000-000000000007', (select id from skills where code='RAW_SATOIMO_PREP'), 2, '2024-06-01'),
  ('20000000-0000-0000-0000-000000000007', (select id from skills where code='PACK_FILL_MANUAL'), 3, '2024-04-15'),
  ('20000000-0000-0000-0000-000000000007', (select id from skills where code='PACK_FILL_MACHINE'), 2, '2024-08-01'),
  ('20000000-0000-0000-0000-000000000007', (select id from skills where code='PACK_WEIGHT'), 2, '2024-07-01'),
  ('20000000-0000-0000-0000-000000000007', (select id from skills where code='HEAT_KAMA_IN'), 2, '2024-09-01'),
  ('20000000-0000-0000-0000-000000000007', (select id from skills where code='MACH_CLEAN'), 2, '2024-05-15');

-- Siti（E0011、特定技能、リーダー候補）: スキル多め
insert into employee_skills (employee_id, skill_id, level, acquired_at) values
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='RAW_TAKENOKO_PEEL'), 3, '2022-07-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='RAW_SATOIMO_PREP'), 3, '2022-08-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='RAW_FOREIGN_CHECK'), 3, '2023-01-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='PACK_FILL_MANUAL'), 3, '2022-06-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='PACK_FILL_MACHINE'), 3, '2023-03-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='PACK_WEIGHT'), 3, '2022-09-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='PACK_METAL_DETECT'), 2, '2023-06-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='HEAT_KAMA_IN'), 3, '2023-02-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='HEAT_TEMP_CONTROL'), 2, '2023-08-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='QC_VISUAL'), 2, '2024-02-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='MACH_CLEAN'), 3, '2022-07-15'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='MGMT_MENTOR'), 2, '2024-06-01'),
  ('20000000-0000-0000-0000-000000000011', (select id from skills where code='MGMT_INTERPRET'), 3, '2023-10-01');

-- ------------------------------------------------------------
-- ビザ移行プラン
-- ------------------------------------------------------------
insert into visa_transition_plans (employee_id, target_status, planned_transition_date,
  required_jlpt, required_skill_exam, estimated_income_5yr, estimated_income_10yr, status) values
  ('20000000-0000-0000-0000-000000000007', 'specified_skill_1', '2027-02-01',
    'N4', '特定技能試験（食品製造）', 15000000, 32000000, 'in_progress'),
  ('20000000-0000-0000-0000-000000000011', 'specified_skill_2', '2026-07-01',
    'N3', '特定技能2号試験', 20000000, 45000000, 'in_progress'),
  ('20000000-0000-0000-0000-000000000012', 'specified_skill_2', '2026-05-20',
    'N3', '特定技能2号試験', 20000000, 45000000, 'in_progress');

-- ------------------------------------------------------------
-- 過去の退職者（離職率計算用）
-- ------------------------------------------------------------
insert into employees (employee_code, last_name, first_name, nationality, native_language, preferred_language,
  employment_type, organization_id, hired_at, retired_at, status, career_level) values
  ('E9001', '退職者', 'A', 'ID', 'id', 'id', 'technical_intern',
    '00000000-0000-0000-0000-000000000002', '2021-04-01', '2024-03-31', 'returned', 2),
  ('E9002', '退職者', 'B', 'ID', 'id', 'id', 'technical_intern',
    '00000000-0000-0000-0000-000000000003', '2021-10-01', '2024-09-30', 'returned', 2),
  ('E9003', '退職者', 'C', 'JP', 'ja', 'ja', 'part_time',
    '00000000-0000-0000-0000-000000000002', '2020-04-01', '2025-03-31', 'retired', 3),
  ('E9004', '退職者', 'D', 'VN', 'vi', 'vi', 'technical_intern',
    '00000000-0000-0000-0000-000000000004', '2022-01-01', '2025-12-31', 'returned', 2),
  ('E9005', '退職者', 'E', 'ID', 'id', 'id', 'technical_intern',
    '00000000-0000-0000-0000-000000000003', '2023-04-01', '2025-11-15', 'retired', 1);

-- ------------------------------------------------------------
-- 最近のコンディション（Ahmadサンプル）
-- ------------------------------------------------------------
insert into daily_conditions (employee_id, date, level, note) values
  ('20000000-0000-0000-0000-000000000007', current_date - 7, 'great', 'Hari yang baik'),
  ('20000000-0000-0000-0000-000000000007', current_date - 6, 'ok', null),
  ('20000000-0000-0000-0000-000000000007', current_date - 5, 'ok', null),
  ('20000000-0000-0000-0000-000000000007', current_date - 4, 'tired', 'Kurang tidur'),
  ('20000000-0000-0000-0000-000000000007', current_date - 3, 'ok', null),
  ('20000000-0000-0000-0000-000000000007', current_date - 2, 'great', null),
  ('20000000-0000-0000-0000-000000000007', current_date - 1, 'ok', null);
