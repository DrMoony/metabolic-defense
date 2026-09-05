# 스프라이트 교체 파이프라인

「메타볼릭 디펜스」의 절차 생성 3D 도형을 **고품질 스프라이트**로 갈아끼우기 위한 도구 3종.
생성 경로(Gemini / ChatGPT / 그 외)와 무관하게 프롬프트와 키잉은 공용이다.

| 파일 | 역할 |
|---|---|
| `prompts.py` | 35종 프롬프트 + 공통 스타일 블록. `python3 prompts.py` 목록, `python3 prompts.py burger` 단건 출력 |
| `key_alpha.py` | 흰 배경 이미지 → 투명 PNG (테두리 연결 플러드필 + 자동 트림 + 리사이즈) |
| `gen_assets.py` | Gemini(Nano Banana Pro) 생성기. **기본 드라이런**, 실제 호출은 `--go` |
| `chatgpt_prompts.txt` | 35종 프롬프트를 붙여넣기 좋게 풀어놓은 파일 (ChatGPT 등 웹 UI용) |
| `import_downloads.py` | 다운로드한 이미지를 에셋키 이름으로 `raw/` 에 정리 |

## 왜 흰 배경 + 외곽선인가
Gemini도 ChatGPT도 진짜 알파 채널을 안 뱉는다. 그래서 순백 배경 위에 그리게 한 뒤
**테두리에서 연결된 흰색만** 지운다. 피사체 안쪽의 흰색(참깨·하이라이트·뼈)은 외곽선에 막혀 살아남는다.
예전 간·췌장 키잉에 쓴 방식과 같다.

## 사용
```bash
# 1) 프롬프트 확인
python3 tools/prompts.py                 # 35종 목록
python3 tools/prompts.py burger          # 개별 프롬프트 (복사해서 ChatGPT에 붙여넣기 가능)

# 2-A) Gemini로 자동 생성 (과금)
python3 tools/gen_assets.py --cat 장기            # 드라이런: 대상·예상비용만
python3 tools/gen_assets.py --cat 장기 --go       # 실제 생성 → tools/raw/

# 2-B) 직접 만든 이미지를 쓸 때는 tools/raw/ 에 <에셋키>.png 로 저장

# 3) 투명 PNG로 키잉
python3 tools/key_alpha.py tools/raw/ --out assets/sprites/ --max 512
```

## 비용 (Gemini Pro 기준)
장당 약 22원 → 35종 1회 **약 770원**, 2~3회 반복해도 2,000원 안쪽. `--model flash` 는 장당 2원 수준(품질 낮음).

## 에셋 키
몬스터 13(soda fries burger pizza ramen icecream ciga soju donut moth bat wing cancerlet) ·
보스 3(syrup cancer plaque) · 장기 2(liver pancreas) · 무기 12(w00~w11) · 아이템 2(item_glp1 item_gcgr) ·
소품 3(fatwall trapcage traplock)

## ChatGPT 웹으로 뽑을 때
```bash
open tools/chatgpt_prompts.txt          # 블록 본문을 하나씩 붙여넣기
# 이미지를 내려받은 뒤 (여러 장을 순서대로 받았다면)
python3 tools/import_downloads.py --map burger,liver,pancreas
python3 tools/key_alpha.py tools/raw/ --out assets/sprites/ --max 512
```

## ChatGPT 웹 자동화 레시피 (실측 검증됨)
1. chatgpt.com 새 대화. **입력창은 textarea가 아니라 contenteditable div** 다.
   value 세터로 넣으면 React가 인식 못 해 전송 버튼이 안 생긴다. 반드시 이렇게:
   ```js
   // 좌표 계산: 스크린샷 배율 = 1400 / innerWidth
   const ce = document.querySelector('div[contenteditable="true"]');
   const r = ce.getBoundingClientRect();   // 이 중심을 실제 클릭으로 포커스
   ce.focus(); document.execCommand('insertText', false, PROMPT);
   [...document.querySelectorAll('button')]
     .find(b => /프롬프트 보내기/.test(b.getAttribute('aria-label')||'')).click();
   ```
   프롬프트 앞에 `Generate one image.` 를 붙인다.
2. 생성까지 30~45초. `document.querySelectorAll('img')` 중 naturalWidth>600 인 것이 결과물
3. **다운로드 버튼은 안 먹는다.** 대신 페이지에서 blob으로 직접 받아야 한다:
   ```js
   const img = [...document.querySelectorAll('img')].filter(i=>i.naturalWidth>600)[0];
   const b = await (await fetch(img.currentSrc, {credentials:'include'})).blob();
   const u = URL.createObjectURL(b); const a = document.createElement('a');
   a.href = u; a.download = '<에셋키>.png'; document.body.appendChild(a); a.click(); a.remove();
   ```
4. 에디터의 '배경 제거'는 반응이 없었다 → 흰 배경 그대로 받아 `key_alpha.py` 로 키잉하면 깔끔하다
5. 이미지 src를 JS 반환값으로 내보내면 확장이 차단하므로, URL은 페이지 안에서만 쓸 것
