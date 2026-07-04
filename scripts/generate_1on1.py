#!/usr/bin/env python3
"""
1on1面談データのモック生成。
実際の従業員データ（employees.json）に紐付く現実味のあるデータを生成。
"""
import json
import os
import random
import uuid
from datetime import datetime, timedelta

random.seed(42)  # 再現性のため固定

BASE = '/Users/yuyu24/2ndBrain/chuon-tms'
IN = f'{BASE}/src/lib/data/employees.json'
OUT_DIR = f'{BASE}/src/lib/data'


def make_id(prefix, key):
    ns = uuid.NAMESPACE_URL
    return str(uuid.uuid5(ns, f'chuon:1on1:{prefix}:{key}'))


with open(IN, encoding='utf-8') as f:
    all_employees = json.load(f)

# 在籍中の外国人のみ対象（Japanese staff would mentor them）
mentees = [e for e in all_employees if not e['retired'] and e['nationality'] != 'JP']
# メンター候補（実データの尾崎・池内・新開工場長など履歴シートから）
mentors = ['尾崎', '池内', '新開工場長', '渡部', '能勢', '山本真悟', '宮内', '猪川']

# カテゴリ
CATEGORIES = [
    ('work',     '仕事'),
    ('life',     '生活'),
    ('language', '日本語'),
    ('family',   '家族'),
    ('health',   '健康'),
    ('money',    'お金・送金'),
    ('career',   'キャリア'),
    ('religion', '宗教・文化'),
    ('community','同僚関係'),
    ('other',    'その他'),
]

KINDS = ['question', 'concern', 'task', 'request', 'praise']

# 現実的な悩み・質問のサンプル（国籍別にバリエーション）
CONCERNS_TEMPLATES = [
    # 仕事関連
    ('work', 'concern', '作業スピードについていけない', '新しいライン配置に慣れずミスが増えている。もう少し指導してほしい。', 'medium'),
    ('work', 'concern', '体力的にきつい', '深夜の仕事で疲労が溜まっている。休憩時間を調整してほしい。', 'high'),
    ('work', 'question', '昇給の基準が分からない', 'Lv4 に上がるには何が必要か具体的に知りたい。', 'low'),
    ('work', 'request', 'シフトの調整希望', '来月の土曜日は家族とビデオ通話したいのでシフトを外してほしい。', 'low'),
    ('work', 'concern', '同僚とのトラブル', '別ラインの先輩からきつく指導されて辛い。配置換えを検討してほしい。', 'high'),
    ('work', 'praise', '新しい機械の操作を覚えた', 'フォークリフトの操作に慣れてきました。次の資格試験を受けたい。', 'low'),

    # 生活
    ('life', 'concern', '寮のエアコンが壊れた', '部屋のエアコンが効かない。夏場は厳しい。', 'high'),
    ('life', 'request', '自転車がパンクした', '自転車のタイヤ交換をお願いしたい。', 'medium'),
    ('life', 'question', 'ゴミの出し方が分からない', '可燃と不燃の区別が複雑。分かりやすい図が欲しい。', 'low'),
    ('life', 'concern', '隣の部屋がうるさい', '夜中に音が響いてあまり眠れない。', 'medium'),
    ('life', 'request', '日本食レシピを教えてほしい', '社食に慣れず自炊したいが、材料が分からない。', 'low'),

    # 日本語
    ('language', 'concern', 'N3 試験対策の時間が取れない', '残業が多く自習時間が取れない。会社のサポートがほしい。', 'medium'),
    ('language', 'request', '日本語教室を開いてほしい', '同僚と一緒に学びたい。週1回でも。', 'low'),
    ('language', 'question', '敬語の使い方が難しい', '先輩への話し方が不安。', 'low'),

    # 家族
    ('family', 'concern', '母国の家族が病気になった', '母が手術を受ける予定で心配。一時帰国できるか相談したい。', 'high'),
    ('family', 'request', '結婚休暇を取りたい', '来年3月に母国で結婚式を挙げたい。1ヶ月ほど休みたい。', 'medium'),
    ('family', 'concern', '子どもの学費が心配', '本国の子どもの学費が足りない。送金額を増やせないか。', 'high'),

    # 健康
    ('health', 'concern', '腰痛が続いている', '作業で腰を痛めた。病院に行きたい。', 'high'),
    ('health', 'request', '健康診断の結果を相談したい', '血圧が高いと指摘された。', 'medium'),
    ('health', 'concern', '眠れない日が続いている', '職場でのストレスで不眠。', 'high'),

    # お金
    ('money', 'question', '送金手数料を減らしたい', '毎月の送金コストが高い。会社推奨のサービスは？', 'medium'),
    ('money', 'concern', '給与明細の控除項目が分からない', '社会保険料の金額が気になる。説明してほしい。', 'low'),
    ('money', 'request', '税金の還付手続きを教えてほしい', '確定申告の手続きをサポートしてほしい。', 'medium'),

    # キャリア
    ('career', 'question', '特定技能2号への移行は可能か', '2号試験の合格率や必要資格を知りたい。', 'high'),
    ('career', 'concern', '永住権の取得まで何年かかるか不安', '具体的なロードマップを描きたい。', 'medium'),
    ('career', 'request', '将来、母国で中温の工場を作る手伝いがしたい', 'その場合の支援制度があるか聞きたい。', 'low'),

    # 宗教・文化
    ('religion', 'request', '礼拝時間の確保', '1日5回の礼拝のため、休憩時間を調整できないか。', 'medium'),
    ('religion', 'request', 'ラマダン期間の配慮希望', '断食中はシフトを軽めにしてほしい。', 'medium'),
    ('religion', 'concern', 'ハラール食材が手に入りにくい', '社食でハラール対応メニューを増やせないか。', 'medium'),

    # 同僚関係
    ('community', 'concern', '日本人の先輩と話しにくい', '言葉の壁があり距離を感じる。', 'medium'),
    ('community', 'request', '同国人同士の交流会を開きたい', '寮内で月1回集まれないか。', 'low'),

    # その他
    ('other', 'question', '緊急連絡網の使い方', '深夜に体調が悪くなったら誰に連絡すれば？', 'low'),
    ('other', 'praise', '工場長の対応に感謝', '先月のトラブル対応が迅速でありがたかった。', 'low'),
]

# 1on1セッションの想定テンプレート
SESSION_SUMMARIES = [
    '前回からの進捗確認と新しい課題のヒアリング',
    '入社後の適応状況を確認。生活面のフォロー中心',
    'キャリア相談。次のステップに向けた準備',
    'メンタル面のフォロー。最近の調子を確認',
    '業務上の課題を整理し、解決策を議論',
    '日本語学習の進捗と今後の試験対策',
    '家族の状況と精神的ケアについて',
    '緊急で相談したい件があるとのことで実施',
]

LOCATIONS = ['会議室A', '会議室B', '食堂（昼休み）', '事務所', '寮談話室', 'オンライン（LINE通話）']

MOOD = ['great', 'ok', 'down', 'stressed']
MOOD_WEIGHTS = [2, 5, 2, 1]

STATUS_WEIGHTS = [
    ('open', 1),        # 未対応
    ('in_progress', 2), # 対応中
    ('done', 5),        # 完了
    ('cancelled', 0.2),
]

# 過去6ヶ月にわたり、各mentee に複数回の1on1を設定
sessions = []
items = []

today = datetime(2026, 4, 21)

# 各メンティーに 3〜8 回のセッション
target_mentees = random.sample(mentees, min(40, len(mentees)))  # 40名程度に絞る

for mentee in target_mentees:
    session_count = random.randint(2, 6)
    mentor = random.choice(mentors)
    base_date = today - timedelta(days=180)
    for si in range(session_count):
        # 日付: 過去6ヶ月間で散らばらせる（最新→最古）
        meeting_date = base_date + timedelta(days=(180 // session_count) * si + random.randint(0, 10))
        if meeting_date > today:
            continue
        session_id = make_id('session', f"{mentee['employee_code']}-{si}")
        session = {
            'id': session_id,
            'employee_id': mentee['id'],
            'employee_code': mentee['employee_code'],
            'employee_name': mentee['display_name'],
            'employee_nationality': mentee['nationality'],
            'mentor_name': mentor,
            'meeting_date': meeting_date.strftime('%Y-%m-%d'),
            'duration_min': random.choice([15, 20, 30, 45, 60]),
            'location': random.choice(LOCATIONS),
            'language': 'id' if mentee['nationality'] == 'ID' else 'vi' if mentee['nationality'] == 'VN' else 'ja',
            'mood': random.choices(MOOD, weights=MOOD_WEIGHTS)[0],
            'summary': random.choice(SESSION_SUMMARIES),
            'next_meeting_date': (meeting_date + timedelta(days=random.choice([14, 21, 28, 30]))).strftime('%Y-%m-%d')
            if si < session_count - 1 else None,
        }
        sessions.append(session)

        # アイテム（1〜4件をランダムに生成）
        item_count = random.randint(1, 4)
        templates = random.sample(CONCERNS_TEMPLATES, item_count)
        for ti, (cat, kind, title, detail, priority) in enumerate(templates):
            # 最新セッションほど未完了が多く、古いほど完了が多い
            age_weight = si / max(session_count - 1, 1)  # 0=古い, 1=新しい
            if age_weight > 0.7:
                status = random.choices(['open', 'in_progress', 'done'], weights=[4, 5, 3])[0]
            elif age_weight > 0.3:
                status = random.choices(['open', 'in_progress', 'done'], weights=[1, 3, 6])[0]
            else:
                status = random.choices(['open', 'in_progress', 'done'], weights=[0.5, 1, 9])[0]

            resolved_at = None
            resolution_note = None
            if status == 'done':
                resolved_at = (meeting_date + timedelta(days=random.randint(1, 21))).strftime('%Y-%m-%d')
                resolution_note = random.choice([
                    '対応完了。本人了承済み。',
                    '会社側で調整し解決。',
                    '該当部署に連絡し対応完了。',
                    'フォローアップ継続中だが一次対応完了。',
                ])

            assigned = random.choice(mentors + [None, None])
            due_date = (meeting_date + timedelta(days=random.randint(7, 30))).strftime('%Y-%m-%d')

            items.append({
                'id': make_id('item', f"{session_id}-{ti}"),
                'one_on_one_id': session_id,
                'employee_id': mentee['id'],
                'employee_code': mentee['employee_code'],
                'employee_name': mentee['display_name'],
                'employee_nationality': mentee['nationality'],
                'meeting_date': session['meeting_date'],
                'mentor_name': mentor,
                'kind': kind,
                'category': cat,
                'title': title,
                'detail': detail,
                'priority': priority,
                'status': status,
                'assigned_to': assigned,
                'due_date': due_date,
                'resolved_at': resolved_at,
                'resolution_note': resolution_note,
            })

# 日付降順でソート
sessions.sort(key=lambda s: s['meeting_date'], reverse=True)
items.sort(key=lambda i: i['meeting_date'], reverse=True)

with open(f'{OUT_DIR}/one_on_ones.json', 'w', encoding='utf-8') as f:
    json.dump(sessions, f, ensure_ascii=False, indent=2)
with open(f'{OUT_DIR}/one_on_one_items.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f'sessions: {len(sessions)}')
print(f'items: {len(items)}')
# 状態別件数
by_status = {}
for i in items:
    by_status[i['status']] = by_status.get(i['status'], 0) + 1
print(f'  status breakdown: {by_status}')
# カテゴリ別件数
by_cat = {}
for i in items:
    by_cat[i['category']] = by_cat.get(i['category'], 0) + 1
print(f'  category breakdown: {dict(sorted(by_cat.items(), key=lambda x: -x[1]))}')
