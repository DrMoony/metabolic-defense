#!/usr/bin/env python3
"""원자 사실 JSON(facts_*.json) → knowledge/facts.json 병합.
입력 항목: statement_en, statement_ko, concepts[], source, refs[], year, drug, dated, suggest_concept?
- 같은 source_family(기본 'SCOPE e-learning')의 기존 사실 중 문항 없는 것(F-src-*)은 교체한다(초기 거친 추출분 정리).
- 온톨로지에 없는 concept id는 버리고, 하나도 안 남으면 'obesity'로 둔다. suggest_concept는 보고만 한다.
실행: python3 tools/kb_ingest_facts.py <facts.json>... [--family 'SCOPE e-learning'] [--replace]
"""
import json, os, sys, re
from collections import Counter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = os.path.join(ROOT, 'knowledge')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
family = sys.argv[sys.argv.index('--family') + 1] if '--family' in sys.argv else 'SCOPE e-learning'
replace = '--replace' in sys.argv
onto = json.load(open(os.path.join(K, 'ontology.json'), encoding='utf-8'))
ids = {c['id'] for c in onto['concepts']}
fp = os.path.join(K, 'facts.json')
facts = json.load(open(fp, encoding='utf-8'))
if replace:
    before = len(facts)
    facts = [f for f in facts if not (f.get('source_family') == family and 'question_index' not in f)]
    print(f'replaced {before - len(facts)} old {family} facts')
seq = sum(1 for f in facts if f['id'].startswith('F-src-'))
have = {re.sub(r'\s+', ' ', f.get('statement_en', '')).strip().lower() for f in facts}
# 추출 에이전트가 제안한 개념명 → 온톨로지 id
SUGGEST_MAP = {'genetic-obesity-syndromes':'syndromic-obesity','prader-willi':'syndromic-obesity','ciliopathy':'syndromic-obesity','bardet-biedl':'syndromic-obesity',
 'mc4r-deficiency':'monogenic-obesity','monogenic-obesity':'monogenic-obesity','leptin-melanocortin-pathway':'monogenic-obesity','hyperphagia':'monogenic-obesity','leptin-deficiency':'monogenic-obesity',
 'genetics-of-obesity':'genetics-of-obesity','genetic-testing':'genetics-of-obesity','heritability':'genetics-of-obesity','genomic-imprinting':'genetics-of-obesity','copy-number-variant':'genetics-of-obesity',
 'precision-medicine-genetic-obesity':'genetics-of-obesity','gene-environment-interaction':'genetics-of-obesity','diet-gene-interaction':'genetics-of-obesity','polygenic-risk-score':'polygenic-obesity','polygenic-obesity':'polygenic-obesity',
 'medical-nutrition-therapy':'medical-nutrition-therapy','intermittent-fasting':'medical-nutrition-therapy','low-carbohydrate-diet':'medical-nutrition-therapy','ketogenic-diet':'medical-nutrition-therapy',
 'very-low-calorie-diet':'medical-nutrition-therapy','vegetarian-diet':'medical-nutrition-therapy','dietary-adherence':'medical-nutrition-therapy','meal-replacement':'medical-nutrition-therapy','dash-diet':'medical-nutrition-therapy',
 'energy-balance':'energy-balance','hypothalamic-appetite-regulation':'energy-balance','appetite-regulation':'energy-balance','obesity-staging-system':'eoss','eoss':'eoss',
 'chronic-kidney-disease':'ckd','ckd':'ckd','pcos':'pcos','cushing-syndrome':'secondary-obesity','hypogonadism':'hypogonadism','cardiovascular-disease':'cvd','heart-failure':'cvd',
 'physical-activity':'physical-activity-guidance','screen-time':'physical-activity-guidance','growth-charts':'childhood-assessment','childhood-assessment':'childhood-assessment','history-taking':'assessment-history-exam','physical-examination':'assessment-history-exam',
 '5as':'communication','patient-communication':'communication','weight-stigma':'stigma','gut-microbiota':'environment','sleep':'environment','stress':'environment','environmental-factors':'environment','bone-mineral-density':'osteoarthritis','insulin-resistance':'insulin-resistance','lean-masld':'lean-masld','liver-blood-tests':'liver-blood-tests','mri-pdff':'mri-pdff','mre':'mri-pdff','models-of-care':'models-of-care','cv-risk-score':'cv-risk','steatosis-scores':'liver-blood-tests','liver-biopsy':'liver-biopsy','prader-willi-syndrome':'syndromic-obesity','heritability-of-body-weight':'genetics-of-obesity','precision-medicine-for-genetic-obesity':'genetics-of-obesity','eating-behaviour':'eating-behaviour','physical-fitness':'physical-fitness','psychosocial':'psychosocial','double-burden-malnutrition':'child-nutrition','micronutrient-deficiency':'child-nutrition','growth-chart':'childhood-assessment','first-1000-days':'early-life','adiposity-rebound':'early-life','sedentary-screen-time':'physical-activity-guidance','asthma':'asthma','syndromic-obesity':'syndromic-obesity'}
suggest, added, dropped = Counter(), 0, 0
for path in args:
    for it in json.load(open(path, encoding='utf-8')):
        en = re.sub(r'\s+', ' ', it.get('statement_en', '')).strip()
        if len(en) < 15 or en.lower() in have: dropped += 1; continue
        concepts = [c for c in it.get('concepts', []) if c in ids]
        raw = it.get('suggest_concept') or []
        for sg in (raw if isinstance(raw, list) else [raw]):
            sg = str(sg).strip().lower().replace(' ', '-')
            if not sg: continue
            if SUGGEST_MAP.get(sg) in ids:
                if SUGGEST_MAP[sg] not in concepts: concepts.append(SUGGEST_MAP[sg])
            elif sg in ids:
                if sg not in concepts: concepts.append(sg)
            else: suggest[sg] += 1
        concepts = concepts or ['obesity']
        seq += 1
        facts.append({'id': f'F-src-{seq:03d}', 'set': 'source', 'statement_ko': it.get('statement_ko') or en, 'statement_en': en,
                      'concepts': concepts, 'concepts_manual': True, 'source': it.get('source', ''), 'source_family': family,
                      'refs': [r for r in it.get('refs', []) if r], 'year': it.get('year'), 'drug': bool(it.get('drug')), 'dated': bool(it.get('dated')),
                      'diff': 'mid'})
        have.add(en.lower()); added += 1
json.dump(facts, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'added {added}, dropped {dropped} (dup/short) → total {len(facts)}')
print('drug', sum(1 for f in facts if f.get('drug')), 'dated', sum(1 for f in facts if f.get('dated')))
print('suggested concepts:', suggest.most_common(30))
