# CKM 디펜스 — ICDM 2026 자디앙 부스 빌드

배포 주소: https://drmoony.github.io/metabolic-defense/icdm2026/
소스 브랜치: `ICDM2026` (`astra/` 폴더가 이 폴더와 같은 내용)

## 구성

- **맵 3종** — 자디앙 국내 적응증에 맞췄어요.
  - 01 심혈관 (만성 심부전) · 02 신장 (만성 신장병) · 03 췌장 랑게르한스섬 (제2형 당뇨병)
- **아군 장기** — 콩팥 가디언(주기적으로 콩팥 웨이브를 내보내 지상 적에게 피해), 췌장 포탑(당류 적 자동 요격).
- **보급 아이템 3종** — 신장 보호(콩팥 회복·생명 +6), 요당 배출(콩팥 웨이브 증폭), 심장 부담 완화(지상 적 9초 감속). 약물 이미지는 쓰지 않아요.
- **장애물** — 포도당 둔덕(쏘아서 파괴), 고혈당 덫(자물쇠를 쏘면 코어 회복).
- **퀴즈** — `../assets/quiz_dm_empa_ko.json` / `_en.json`만 출제해요. 최근 24문항은 다시 나오지 않고, 보기 순서는 매번 섞여요.
- 저장 키 접두사는 `icdm_`예요 (`/astra/`와 분리).

## 실행

저장소 루트에서 `python -m http.server 8765` 후 `http://localhost:8765/icdm2026/`를 열어요. 빌드 도구는 없어요.
R은 경로선 표시, D는 경로 편집기예요.

## 파일

- `maps/` — `coronary.js`·`glomerulus.js`·`islet.js`와 플레이트 경로·장기 위치(`plates.js`). 장기 크기는 `plates.js`의 `ORGAN_SCALE`.
- `main.js` — 전투·퀴즈·HUD·아이템, `world.js` — 렌더러·장기·적, `quiz.js` — 문제은행, `sprites.js` — 이미지 로딩.
- 스프라이트: `../assets/kidney.png`, `../assets/sprites/item_kidney.png`·`item_t2d.png`·`item_hf.png`·`age_deposit.png`(포도당 둔덕).
