#!/usr/bin/env python3
"""1on1依頼データのモック生成（従業員が/my画面から依頼を出すシナリオ）"""
import json
import random
import uuid
from datetime import datetime, timedelta

random.seed(7)

BASE = '/Users/yuyu24/2ndBrain/chuon-tms'
OUT = f'{BASE}/src/lib/data/one_on_one_requests.json'

with open(f'{BASE}/src/lib/data/employees.json', encoding='utf-8') as f:
    all_employees = json.load(f)
mentees = [e for e in all_employees if not e['retired'] and e['nationality'] != 'JP']

mentors = ['尾崎', '池内', '新開工場長', '渡部', '能勢', '宮内', '猪川', '（誰でも良い）']

TOPICS = [
    ('career', '将来のキャリアについて相談したい'),
    ('life', '生活のことで困っている'),
    ('work', '仕事の進め方について相談したい'),
    ('health', '体調のことで話したい'),
    ('money', 'お金・送金のことで質問がある'),
    ('family', '家族のことで相談したい'),
    ('language', '日本語学習について相談したい'),
    ('religion', '宗教・文化的な配慮の相談'),
    ('other', 'その他、話したいことがある'),
]

URGENCY = [('low', '急ぎません'), ('medium', '今月中に'), ('high', '今週中に'), ('critical', '至急')]
URGENCY_WEIGHTS = [3, 4, 2, 0.5]

def make_id(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'chuon:1on1req:{key}'))

today = datetime(2026, 4, 21)

requests = []
# 15件ほど生成。新しいものほど未対応
sample = random.sample(mentees, min(15, len(mentees)))
for i, m in enumerate(sample):
    # 古いものから新しいものへ
    days_ago = int(30 * (1 - i / len(sample)))
    requested_at = today - timedelta(days=days_ago, hours=random.randint(0, 23))

    cat, topic_label = random.choice(TOPICS)
    urg_code, urg_label = random.choices(URGENCY, weights=URGENCY_WEIGHTS)[0]
    mentor_req = random.choice(mentors)

    # ステータス: 新しいほど pending
    if days_ago < 3:
        status = random.choices(['pending', 'accepted'], weights=[8, 2])[0]
    elif days_ago < 10:
        status = random.choices(['pending', 'accepted', 'scheduled'], weights=[2, 5, 3])[0]
    elif days_ago < 20:
        status = random.choices(['accepted', 'scheduled', 'completed'], weights=[1, 3, 4])[0]
    else:
        status = random.choices(['scheduled', 'completed'], weights=[1, 9])[0]

    scheduled_at = None
    if status in ('scheduled', 'completed'):
        scheduled_at = (requested_at + timedelta(days=random.randint(2, 7))).strftime('%Y-%m-%d')

    # 短いメモ（本人が入れる想定）
    notes = [
        None,
        '少し疲れていて相談したいです',
        'Saya ingin berbicara tentang keluarga saya.',  # 家族について話したい（イ）
        'Tôi cần được giúp đỡ.',  # 助けが必要（越）
        '日本語で話せる人がいい',
        '30分くらいで',
        'プライベートで相談したい',
    ]

    requests.append({
        'id': make_id(f"{m['employee_code']}-{i}"),
        'employee_id': m['id'],
        'employee_code': m['employee_code'],
        'employee_name': m['display_name'],
        'employee_nationality': m['nationality'],
        'requested_at': requested_at.strftime('%Y-%m-%dT%H:%M:%S'),
        'topic_category': cat,
        'topic_label': topic_label,
        'preferred_mentor': mentor_req,
        'urgency': urg_code,
        'urgency_label': urg_label,
        'language': 'id' if m['nationality'] == 'ID' else 'vi' if m['nationality'] == 'VN' else 'ja',
        'note': random.choice(notes),
        'status': status,  # pending / accepted / scheduled / completed / cancelled
        'scheduled_at': scheduled_at,
        'assigned_mentor': mentor_req if status != 'pending' and mentor_req != '（誰でも良い）'
                           else (random.choice(mentors[:7]) if status != 'pending' else None),
        'one_on_one_id': None,  # 完了時にリンクする想定
    })

requests.sort(key=lambda r: r['requested_at'], reverse=True)

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(requests, f, ensure_ascii=False, indent=2)

print(f'requests: {len(requests)}')
by_status = {}
for r in requests:
    by_status[r['status']] = by_status.get(r['status'], 0) + 1
print(f'  status: {by_status}')
