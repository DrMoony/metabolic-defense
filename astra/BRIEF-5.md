# ASTRA 5차 브리프 — 생성 스프라이트 채택 + 플레이트 원근 스케일

## 배경
4차 플레이트 모드는 성공했다. 남은 격차는 **캐릭터**다. beta는 `../assets/sprites/`의 생성 이미지(2프레임 걷기/날갯짓)를 쓰고,
astra는 아직 절차 3D 몬스터라 플레이트 위에서 작고 밋밋하게 보인다. 분업 원칙: 이미지는 사람이 만들고, 배치·연출은 astra가 한다.

## 에셋 (`../assets/sprites/`, 투명 PNG)
- 몬스터 13종 2프레임: `soda fries burger pizza ramen icecream ciga soju cancerlet`(걷기, `_0/_1`, bottom 정렬) ·
  `donut moth bat wing`(날갯짓, `_0/_1`, center 정렬)
- 보스 3종 단일: `syrup cancer plaque` · 장기: `../assets/liver.png`, `../assets/pancreas.png`(이미 교체된 고품질본)
- 소품: `fatwall`, `trapcage`, `traplock` · 아이템: `item_glp1`, `item_gcgr`
- 무기 1인칭 뷰모델 12종: `w00_slingshot … w11_laser`
beta/main.js의 `ENEMY_SPRITES`/`makeEnemySprite`/`spriteAnim`/`WEAPON_SPRITES`/`buildGunSprite` 를 참고하되 복사하지 말고 astra 구조에 맞게 새로 써라.

## 해야 할 일
1. **몬스터·보스를 스프라이트 빌보드로**: alphaTest 평면(불투명 패스, depthWrite)로 그려 플레이트 오클루더와 깊이가 맞게.
   2프레임은 초당 5~9회 교체 + 약한 스쿼시, 단일 프레임은 스쿼시를 크게. 피격 플래시(재질 색 틴트)·넉백·사망 회전 유지.
2. **원근 스케일**: 플레이트의 원근에 맞춰 몬스터 크기가 멀리선 작고 가까이선 크게 보이도록 카메라·바닥 평면 투영을 맵별로 맞춰라.
   지금은 경로 중간에서도 점처럼 작다. 화면 하단 합류 지점에서 몬스터 높이가 화면의 12~18%가 되게.
3. **장기·소품·아이템·무기**도 위 에셋으로 교체. 무기는 카메라 자식 평면 뷰모델(반동·총구 화염 유지).
4. 7맵 모두에서 동작 확인. `ASTRA.setManual/step`으로 웨이브·보스·퀴즈 자동 검증 유지.

## 지킬 것
astra/ 밖 수정 금지(assets 읽기만). 문제은행 공유·drug 제외·Fisher-Yates·`astra_` 프리픽스. 빌드 도구 금지, ../vendor/three.module.js.
60fps·자동 품질 조절 유지. 커밋 금지, 변경 요약을 써라.
