# 인수인계 — Metabolic Defense (다른 컴퓨터에서 이어서 작업하기)

> 2026-08-27 작성. Mac Mini에서 여기까지 만들었고, **XGunner가 macOS에서 USB 인식이 안 되어** Windows PC로 넘어갑니다.
> 이 문서 하나만 읽으면 어디서든 이어서 작업할 수 있습니다.

## 1. 지금 어디서 볼 수 있나

| | 주소 |
|---|---|
| 깃허브 리포 | https://github.com/DrMoony/metabolic-defense |
| 안정판 (플레이) | https://drmoony.github.io/metabolic-defense/ |
| 베타 (최신 기능 전부) | https://drmoony.github.io/metabolic-defense/beta/ |
| 입력 테스트 | https://drmoony.github.io/metabolic-defense/input-test.html |
| 문제은행 관리 | https://drmoony.github.io/metabolic-defense/quiz-admin.html |

인터넷만 되면 설치 없이 바로 플레이됩니다. **작업은 베타(`beta/`)에서 하세요.** 안정판(루트)은 롤백용으로 손대지 않습니다.

## 2. 새 컴퓨터에서 시작하기

```bash
git clone https://github.com/DrMoony/metabolic-defense.git
cd metabolic-defense
python -m http.server 8765          # Windows는 python, mac은 python3
# 브라우저에서 http://localhost:8765/beta/
```

빌드 도구가 없습니다. HTML/JS 정적 파일이라 저장하고 새로고침하면 끝입니다.
파일을 더블클릭해서 열면(file://) 모듈·JSON 로딩이 막혀 **안 돌아갑니다. 반드시 서버로 여세요.**

수정 후 배포:
```bash
git add -A && git commit -m "..." && git push
# 1~2분 뒤 GitHub Pages에 자동 반영
```
> Mac에서는 `env -u GITHUB_TOKEN git push`가 필요했습니다(환경변수 토큰에 권한이 없어서).
> Windows에서는 그냥 `git push`로 하고, 인증은 GitHub 계정 **DrMoony** 로 하세요.

## 3. 파일 구조

```
metabolic-defense/
├── index.html, main.js        ← 안정판 (건드리지 않음)
├── beta/index.html, main.js   ← 작업 대상 (TODO 전부 적용된 최신판)
├── beta/README.md             ← 베타에 뭐가 들어갔는지 요약
├── assets/                    ← 배경·포탑 이미지, 퀴즈 JSON (베타가 ../assets로 공유)
│   ├── bg.jpg                 ← MS Designer 생성 배경 (Intra-Abdominal World)
│   ├── liver.png, pancreas.png ← 포탑 스프라이트
│   ├── quiz_aasld_ko.json / _en.json  ← AASLD 덱 추출 문제 46문 × 2언어
│   └── aasld_slides.json      ← 원본 슬라이드 전문
├── vendor/three.module.js     ← Three.js r170 (로컬 고정)
├── input-test.html            ← XGunner 입력 진단 페이지
├── TODO.md                    ← 백로그 (다음 할 일)
└── HANDOFF.md                 ← 이 문서
```

## 4. ★ Windows에서 XGunner 테스트 (제일 먼저 할 일)

macOS에서는 동글이 USB 열거조차 되지 않았습니다(HID 목록에 USB 입력장치 0개). Windows 전용으로 보입니다.

1. 동글을 꽂고 **장치 관리자**에서 HID 마우스로 잡히는지 확인
2. **https://drmoony.github.io/metabolic-defense/input-test.html** 열기
3. 총으로 화면 여기저기를 조준해 쏘기
4. 패널에서 확인할 것:
   - **이동 방식**이 `절대좌표 (라이트건)`으로 뜨는가 ← 이게 핵심
   - 방아쇠가 `button 0`(좌클릭)으로 들어오는가
   - 화면 밖을 조준했을 때 어떻게 동작하는가 (오프스크린 리로드)
   - 좌표가 조준한 지점과 실제로 일치하는가 (캘리브레이션)
5. 절대좌표로 확인되면 **베타를 전체화면으로 열고 실사격 테스트**

부스 운영 시: 크롬 전체화면(F11) 또는 `chrome --kiosk <URL>`.

### 알려진 제약
- **2인 이상 동시 플레이는 웹으로 불가.** OS가 마우스 여러 개를 커서 하나로 합칩니다.
  다인 플레이가 필요하면 Windows Raw Input이 되는 Unity/Godot로 옮겨야 합니다.
- 브라우저 탭이 백그라운드로 가면 게임이 멈춥니다(rAF 정지). 부스는 전면 전체화면이라 무관.

## 5. 개발할 때 알아야 할 것 (함정 포함)

- **캐시**: `beta/index.html`에 `main.js?v=bNN` 버전 쿼리가 있습니다. **코드를 고치면 이 숫자를 올리세요.**
  안 올리면 GitHub Pages 10분 캐시 때문에 옛 코드가 돌아갑니다. 로컬 테스트는 **Ctrl+Shift+R(강력 새로고침)**.
- **디버그 핸들**: 콘솔에서 `window.DBG` 로 `G`(게임상태), `enemies`, `traps`, `fatWalls`, `drops`,
  `ROUTES`, `WEAPONS`, `step(dt)`, `spawnEnemy(type)`, `applyWeaponVisual()` 등을 씁니다.
  자동 플레이 검증은 `DBG.step(1/60)`을 루프로 돌리는 방식(rAF에 의존하지 않음).
- **인게임 편집 키** (배치를 바꾸고 저장할 수 있음, localStorage에 남음)

  | 키 | 기능 |
  |---|---|
  | `D` | 디버그 켜기/끄기 (경로 마커 + 커서 좌표) |
  | `1` `2` `3` | 적 진입 루트 그리기 (터널 / 심장 / 파이프) — 클릭으로 점, `Enter` 저장 |
  | `F` | 지방 둔덕 배치 (빈 땅 클릭=추가 최대 6, 둔덕 클릭=제거) |
  | `4` `5` | 간 가디언 / 췌장 포탑 위치 이동 |
  | `9` | **현재 배치를 주소로 복사** (다른 컴퓨터에 그대로 전달 가능) |
  | `0` | 전부 기본값 복원 |
  | `Esc` | 편집 취소 |

  > `9`로 복사한 주소를 새 컴퓨터에서 열면 배치가 그대로 적용됩니다(`?layout=...`).
  > **2026-08-27 유저가 그린 배치가 이미 코드 기본값으로 박혀 있습니다**
  > (`DEFAULT_ROUTES` 3종 / `DEFAULT_WALL_POS` 4개 / `ORGAN_DEFAULTS`).
  > 루트 길이가 63·127·97로 제각각이라 `routeSpeedMul()`로 **주파 시간을 1번 루트 기준(약 28초)으로 정규화**해 뒀습니다.
  > 배치를 새로 잡으면 9키로 주소를 뽑아 이 세 상수만 교체하면 됩니다.
- **한글 IME 주의**: 단축키는 `e.code`(물리 키) 기준이라 한/영 상태와 무관하게 동작합니다.

## 6. 게임 규칙 요약 (설계 의도)

- **CKLM 프레임**: 지켜야 할 것 = 심장·콩팥·뇌(CORE), 함께 싸우는 것 = 간 가디언(L)·췌장 포탑, 관리 = 대사·혈당
- **간 가디언** = 대사 건강의 **허브**. 놓친 적을 흡수하고 정화 파동으로 광역 딜.
  굳을수록(지방간→MASH→섬유화) 파동이 느려지고 **재장전·인슐린 지원까지 느려짐**
- **췌장 포탑** = T2D 흐름. 과로 시 데미지 100→70→45→20%로 **무력화(계속 쏘지만 안 먹힘)**,
  그 상태가 12초 지속되면 **췌장부전**(그 판 영구 정지). 조기에 당류 적을 정리하면 막을 수 있음
- **HUD 지표 3개**: ❤️생명(0이면 끝) / 🎯명중률(높으면 대사↑·재장전↑) / 🧠퀴즈(정답 시 생명 회복+무기 승급)
  대사·혈당은 숨기고 이상할 때만 경고 배지
- **무기 10단**: 새총→석궁→화승총→권총→샷건→기관단총→소총→기관총(3점사)→바주카(광역)→레이저.
  퀴즈 정답 +1, 점수 18,000마다 +1 → 한 판에 완주 가능
- **약물 아이템**: 잡몹 드롭(7~9%), 보스는 확정 드롭.
  💊 GLP-1 RA = 혈당↓ 췌장↑ 간 조금↑ / 💉 GCGR 작용제 = **간 크게 회복** (Survodutide 이중작용 서사)
- **퀴즈 세트 2종**: `MASLD/MASH`(AASLD 덱 46문) + `Clinical obesity`(Lancet Commission 2025·SELECT·STEP·SURMOUNT·대한비만학회 기반 32문), 각 한/영·난이도 3단
  - 학회 성격에 맞춰 비율 조절: 게임 시작화면에서 **A키 → 어드민**(MASLD 100 / 70:30 / 50:50 / 30:70 / 비만 100)
  - 문항 수정은 **quiz-admin.html** 에서 → JSON 내려받아 `assets/`에 덮어쓰고 커밋
- **난이도**: EASY는 탄약 무제한, NORMAL부터 재장전 + 우클릭 무기 교체

## 7. 다음 할 일

`TODO.md`가 백로그 정본입니다. 지금 우선순위는:

1. **XGunner 실기기 검증** (위 4번) ← 최우선
2. ~~유저 배치를 코드 기본값으로 커밋~~ ✅ 2026-08-27 완료
3. 베타 충분히 검증되면 **루트(안정판)로 승격**
4. 적 캐릭터를 Designer 스프라이트로 교체 (배경 화풍 통일)
   - 배경/포탑 이미지는 MS Designer로 만들었고, 체커보드가 픽셀에 박힌 가짜 투명이라
     PIL 플러드필로 배경을 지워서 넣었습니다(무채색·밝기>148, 테두리 연결 픽셀만).
5. 무기별 발사음 차별화, 재장전 사운드

## 8. 백업

- Google Drive: `내 드라이브/1_BI/Metabolic Defense/` (백업 zip + 이 문서)
- 원본 배경/포탑 이미지: `1_BI/Survodutide/1_Presentation Slides/Designer (3~5).png`
- AASLD 원본 덱: `1_BI/Survodutide/1_Presentation Slides/AASLD_Unmasking MASH and MASLD .pptx`
