#!/usr/bin/env python3
"""지식 베이스 빌더.
문제은행(assets/quiz_*_{ko,en}.json)에서 '사실(fact)'을 뽑아 온톨로지 개념에 태깅하고,
knowledge/facts.json(사실 원장)과 knowledge/kb.json(위키 뷰어 번들)을 만든다.

- 사실 ID는 세트+문항 순번(F-ob-001, F-ma-001)이며, 한 번 부여된 ID는 facts.json에 남아 있으면 유지한다.
- 개념 태깅은 ontology.json의 keys 키워드 매칭 + facts.json에 사람이 적어 둔 concepts 수동 태그를 합친다.
  (수동 태그가 있으면 자동 태그보다 우선하고, 새 문항만 자동 태깅한다.)
- SCOPE 노트 등 문항 밖의 사실은 facts.json에 직접 추가한다(source, concepts, statement 필수).
실행: python3 tools/kb_build.py
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets'); K = os.path.join(ROOT, 'knowledge')
load = lambda p: json.load(open(p, encoding='utf-8'))
onto = load(os.path.join(K, 'ontology.json'))
concepts = {c['id']: c for c in onto['concepts']}
existing = {}
fp = os.path.join(K, 'facts.json')
if os.path.exists(fp):
    for f in load(fp):
        existing[f['id']] = f

def auto_tags(text):
    tags = []
    low = text.lower()
    for c in onto['concepts']:
        for k in c.get('keys', []):
            # 짧은 대문자 약어(CAP, ELF, HCC…)는 대소문자 구분 + 단어 경계로만 맞춘다. 'capture'가 CAP로 잡히지 않게.
            hit = re.search(r'(?<![A-Za-z])' + re.escape(k) + r'(?![A-Za-z])', text) if (len(k) <= 4 and k.isupper()) else (k.lower() in low)
            if hit:
                tags.append(c['id']); break
    # 세부 비만 개념이 잡혔으면 뿌리 '비만' 태그는 뺀다 (모든 사실이 뿌리에 몰리지 않게)
    if 'obesity' in tags and any(concepts[t]['parent'] == 'obesity' for t in tags):
        tags.remove('obesity')
    return tags or ['obesity']

def source_family(src):
    s = (src or '').lower()
    for key, fam in [('lancet', 'Lancet Commission 2025'), ('대한비만학회 2025', 'KSSO 팩트시트 2025'), ('팩트시트 2024', 'KSSO 팩트시트 2024'),
                     ('진료지침 2022', 'KSSO 진료지침 2022'), ('대한비만학회 진료지침', 'KSSO 진료지침 2022'), ('2023 당뇨병', 'KDA 진료지침 2023'),
                     ('diabetes fact sheet', 'KDA DFS 2024'), ('대한간학회', 'KASL 가이드라인 2025'), ('fatty liver & diabetes', 'KDA 지방간 통계'),
                     ('slide', 'AASLD MASLD 덱'), ('scope', 'SCOPE e-learning'), ('aha', 'AHA CKM 2023'), ('asmbs', 'ASMBS/IFSO 2022'),
                     ('easo', 'EASO 2024'), ('iarc', 'IARC/WHO')]:
        if key in s: return fam
    return src or '(출처 없음)'

facts, questions = [], []
for set_id, file_key in [('ob', 'obesity'), ('ma', 'aasld')]:
    ko = load(os.path.join(A, f'quiz_{file_key}_ko.json')); en = load(os.path.join(A, f'quiz_{file_key}_en.json'))
    for i, (q, e) in enumerate(zip(ko, en)):
        fid = f'F-{set_id}-{i+1:03d}'
        prev = existing.get(fid, {})
        text = ' '.join([q['q'], q['a'][q['correct']], e['q'], e['a'][e['correct']], q.get('src', '')])
        tags = prev.get('concepts') if prev.get('concepts_manual') else auto_tags(text)
        fact = {
            'id': fid, 'set': 'obesity' if set_id == 'ob' else 'masld',
            'statement_ko': prev.get('statement_ko') or f"{q['q']} → {q['a'][q['correct']]}",
            'statement_en': prev.get('statement_en') or f"{e['q']} → {e['a'][e['correct']]}",
            'concepts': tags, 'concepts_manual': prev.get('concepts_manual', False),
            'source': q.get('src', ''), 'source_family': source_family(q.get('src', '')),
            'diff': q['diff'], 'question_index': i,
        }
        facts.append(fact)
        questions.append({'id': f"{fact['set']}:{i}", 'fact': fid, 'q': q['q'], 'a': q['a'], 'correct': q['correct'], 'diff': q['diff']})
# 문항 밖에서 사람이 추가한 사실(문항 인덱스 없음)은 그대로 보존
for f in existing.values():
    if 'question_index' not in f:
        facts.append(f)

json.dump(facts, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
bundle = {'built': __import__('datetime').date.today().isoformat(), 'ontology': onto, 'facts': facts, 'questions': questions}
json.dump(bundle, open(os.path.join(K, 'kb.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
cnt = Counter(t for f in facts for t in f['concepts'])
print(f'facts {len(facts)} questions {len(questions)}')
print('untagged concepts:', [c for c in concepts if cnt[c] == 0])
print('top:', cnt.most_common(12))
