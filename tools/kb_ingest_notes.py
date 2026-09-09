#!/usr/bin/env python3
"""수집 노트(md) → knowledge/facts.json 사실 추가.
노트 형식: '## <모듈 제목>' 아래 '### Key facts' 절의 '- ' 불릿 하나 = 사실 하나.
약제 관련 불릿(분자명·계열)은 게임 정책상 건너뛴다. 이미 같은 문장이 있으면 중복 추가하지 않는다.
실행: python3 tools/kb_ingest_notes.py <notes.md> <source_prefix> [--skip-module '패턴']
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
notes, prefix = sys.argv[1], sys.argv[2]
skip = sys.argv[sys.argv.index('--skip-module') + 1] if '--skip-module' in sys.argv else None
DRUG = re.compile(r'orlistat|phentermine|liraglutide|semaglutide|tirzepatide|naltrexone|bupropion|lorcaserin|sibutramine|rimonabant|topiramate|metformin|thiazolidinedione|GLP-1|DPP-4|SGLT2|insulin\b|statin|pharmacother', re.I)
fp = os.path.join(ROOT, 'knowledge', 'facts.json')
facts = json.load(open(fp, encoding='utf-8'))
have = {re.sub(r'\s+', ' ', f.get('statement_en', '')).strip().lower() for f in facts}
n0 = len(facts); seq = sum(1 for f in facts if f['id'].startswith('F-src-'))
module, section, added, skipped = None, None, 0, 0
onto = json.load(open(os.path.join(ROOT, 'knowledge', 'ontology.json'), encoding='utf-8'))
def tags(text):
    out = []
    for c in onto['concepts']:
        for k in c.get('keys', []):
            hit = re.search(r'(?<![A-Za-z])' + re.escape(k) + r'(?![A-Za-z])', text) if (len(k) <= 4 and k.isupper()) else (k.lower() in text.lower())
            if hit: out.append(c['id']); break
    if 'obesity' in out and len(out) > 1: out.remove('obesity')
    return out or ['obesity']
for line in open(notes, encoding='utf-8'):
    if line.startswith('## '): module = line[3:].strip(); section = None; continue
    if line.startswith('### '): section = line[4:].strip().lower(); continue
    if not (module and section and ('key facts' in section or section.startswith('conclusions')) and line.startswith('- ')): continue
    if skip and re.search(skip, module): skipped += 1; continue
    text = re.sub(r'\s+', ' ', line[2:]).strip()
    text = re.sub(r'\s*\(?Source:.*$', '', text).strip()
    if len(text) < 25 or DRUG.search(text): skipped += 1; continue
    if text.lower() in have: continue
    seq += 1
    facts.append({'id': f'F-src-{seq:03d}', 'set': 'source', 'statement_ko': text, 'statement_en': text, 'concepts': tags(text), 'concepts_manual': False,
                  'source': f'{prefix} › {module}', 'source_family': 'SCOPE e-learning', 'diff': 'mid'})
    have.add(text.lower()); added += 1
json.dump(facts, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'added {added} (skipped {skipped}) → total {len(facts)}')
