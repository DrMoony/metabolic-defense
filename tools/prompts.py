# -*- coding: utf-8 -*-
"""메타볼릭 디펜스 스프라이트 생성 프롬프트 팩.

어떤 생성 경로(Gemini API / ChatGPT / 그 외)를 쓰더라도 STYLE 블록을 그대로 붙여야
35종이 한 가족처럼 보인다. 배경은 반드시 순백 + 피사체를 감싸는 어두운 외곽선으로 뽑아야
key_alpha.py 의 테두리 플러드필이 깔끔하게 먹는다.
"""

# 배경 bg.jpg(MS Designer 3D 카툰 렌더)와 같은 결을 맞추기 위한 공통 스타일
STYLE = (
    "3D cartoon render in the style of a stylized Pixar-like video game asset, "
    "chunky rounded forms with soft bevels, glossy subsurface sheen, "
    "soft studio key light from upper left with a warm rim light, "
    "warm peach-gold and coral palette that fits a whimsical intra-abdominal fantasy world, "
    "crisp readable silhouette, high detail, three-quarter front view at eye level, "
    "centered square composition, "
    "isolated on a pure flat white background (#FFFFFF), "
    "the subject fully enclosed by a subtle dark outline so it separates cleanly from the white, "
    "no cast shadow, no ground plane, no floor, no text, no logo, no watermark, no border"
)

# 무기는 1인칭 뷰모델이라 카메라 규약이 다르다
STYLE_GUN = (
    "3D cartoon render in the style of a stylized video game first-person viewmodel, "
    "the weapon seen from the player's own eyes at the bottom of the screen, "
    "barrel pointing away from the viewer toward the horizon with a slight downward tilt, "
    "chunky rounded forms with soft bevels, soft studio lighting with a warm rim light, "
    "crisp readable silhouette, high detail, "
    "isolated on a pure flat white background (#FFFFFF), "
    "the weapon fully enclosed by a subtle dark outline, "
    "no hands, no arms, no cast shadow, no text, no logo, no watermark, no border"
)

# 몬스터 전용: 귀엽게 (유저 지시 2026-09-06). 무섭기보다 장난꾸러기 마스코트.
STYLE_CUTE = (
    "3D cartoon render in the style of a cute collectible vinyl toy or a Pixar-style mascot, "
    "chibi proportions with an oversized head and tiny stubby limbs, "
    "soft squishy rounded forms with glossy highlights, "
    "bright candy-like saturated colors, soft studio key light from upper left with a warm rim light, "
    "appealing and huggable, mischievous rather than scary, "
    "crisp readable silhouette, high detail, three-quarter front view at eye level, "
    "centered square composition, "
    "isolated on a pure flat white background (#FFFFFF), "
    "the subject fully enclosed by a subtle dark outline so it separates cleanly from the white, "
    "no cast shadow, no ground plane, no floor, no text, no logo, no watermark, no border"
)

# 보스 전용: 귀엽지 않게, 위협적으로
BOSS_FACE = (
    "a menacing cartoon face with narrowed glowing eyes, heavy furrowed brows, "
    "a wide jagged grin, and thick powerful arms"
)

# 몬스터 공통 얼굴: 크고 반짝이는 눈 + 장난스러운 표정
FACE = (
    "a cute chibi mascot face with big glossy round eyes with bright catchlights, "
    "small mischievous eyebrows, a tiny open mouth, rosy cheeks, "
    "and short stubby arms and legs"
)

ASSETS = [
    # ---- 지상 몬스터 8종 ----
    ("soda", "몬스터", f"A giant swirl lollipop on a white paper stick, {FACE}. "
     "The candy disc is a bright orange-and-cream spiral, glossy like hard candy."),
    ("fries", "몬스터", f"A red-and-yellow fast-food fries carton overflowing with golden french fries, {FACE} on the carton. "
     "Grease sheen on the fries."),
    ("burger", "몬스터", f"A double cheeseburger with a sesame seed bun, melting cheese drip, lettuce and a thick patty, {FACE} on the patty layer."),
    ("pizza", "몬스터", f"A thick greasy pepperoni pizza slice standing upright, stretchy melted cheese strings, {FACE} on the cheese."),
    ("ramen", "몬스터", f"An instant cup-noodle container with the lid half peeled back and noodles spilling over the rim, {FACE} on the cup. "
     "A salt-shaker motif printed on the cup."),
    ("icecream", "몬스터", f"A mint-chocolate-chip ice cream cone, pale mint green scoop flecked with dark chocolate chips on a golden waffle cone, {FACE} on the scoop. "
     "One drip running down the cone."),
    ("ciga", "몬스터", f"A stubbed-out cigarette butt with a tan filter and crumpled white paper, faint smoke curling from the tip, {FACE} on the filter."),
    ("soju", "몬스터", f"A green Korean soju bottle with a white label and a metal cap, {FACE} on the bottle body. "
     "A little liquid sloshing inside."),

    # ---- 비행 몬스터 4종 ----
    ("donut", "몬스터", f"A pink-glazed ring donut with rainbow sprinkles, {FACE}, "
     "with small white feathery wings spread on both sides. Flying pose."),
    ("moth", "몬스터", f"A blue foil potato-chip snack bag with crimped serrated top and bottom edges, {FACE} on the bag, "
     "with two pale translucent moth wings spread on both sides and thin antennae. Flying pose."),
    ("bat", "몬스터", f"A dark chocolate bat with milk-chocolate chunk markings, pointed ears, tiny white fangs, "
     f"{FACE}, with scalloped chocolate wings spread wide. Flying pose."),
    ("wing", "몬스터", f"A crispy fried chicken wing drumette with golden craggy batter and a white bone handle wrapped in foil at the bottom, "
     f"{FACE} on the batter, with cream feathery wings spread on both sides. Flying pose."),

    # ---- 보스 3종 + 조각 ----
    ("syrup", "보스", f"A huge industrial barrel drum of high-fructose corn syrup, burnt-orange metal with dark reinforcing bands, "
     "a transparent window on the front showing sloshing amber syrup, syrup droplets dripping down the sides, "
     f"and a prominent glowing golden pressure valve with a round handwheel on top, {BOSS_FACE}. "
     "Imposing boss scale, menacing, clearly a boss enemy."),
    ("cancer", "보스", f"A menacing magenta-and-crimson cancer cell blob with an irregular lumpy membrane, "
     f"visible darker nucleus, and small budding lobes ready to split off, {BOSS_FACE}. Imposing boss scale, clearly a boss enemy."),
    ("plaque", "보스", f"A hulking atherosclerotic plaque monster, dark crimson fibrous mass studded with sharp white "
     f"cholesterol crystal shards, {BOSS_FACE}. Imposing boss scale, built like a battering ram."),
    ("cancerlet", "몬스터", f"A small magenta cancer-cell fragment blob, a miniature version of a cancer cell with a lumpy membrane, {FACE}."),

    # ---- 장기(가디언/포탑) 2종 ----
    ("liver", "장기", "A heroic guardian liver: a large glossy reddish-brown liver organ rendered as a benevolent fantasy "
     "guardian tower, standing on an ornate golden-green pedestal ring, with softly glowing emerald energy veins "
     "tracing across its surface and a radiant golden core emblem at its center. Majestic, protective, no face. "
     "Front view, symmetric."),
    ("pancreas", "장기", "A pancreas rendered as a fantasy artillery turret: an elongated tan-and-coral pancreas organ "
     "mounted on an ornate coral-reef base, with a glowing cyan crystal cannon barrel projecting from one end and "
     "faint blue insulin energy wisps around the muzzle. Mechanical yet organic. Side view facing left, no face."),

    # ---- 무기 12종 (1인칭 뷰모델) ----
    ("w00_slingshot", "무기", "A wooden Y-frame slingshot with a thick brown rubber band pulled back and a smooth gray pebble loaded."),
    ("w01_crossbow", "무기", "A compact wooden crossbow with a steel prod, taut bowstring and a short bolt seated in the groove."),
    ("w02_matchlock", "무기", "An antique matchlock musket with a long dark iron barrel, brass bands and a smoldering slow-match cord."),
    ("w03_pistol", "무기", "A chunky cartoon semi-automatic pistol with a slide, serrations and iron sights, gunmetal gray."),
    ("w04_shotgun", "무기", "A stubby double-barrel pump shotgun with a wooden pump grip and a shell belt wrapped near the receiver."),
    ("w05_magnum", "무기", "A large-caliber magnum revolver with a six-round fluted cylinder, vented rib barrel, "
     "a red front sight blade and a warm wooden grip."),
    ("w06_smg", "무기", "A compact submachine gun with a long curved magazine, foregrip and a folding wire stock."),
    ("w07_rifle", "무기", "A modern assault rifle with a telescopic scope, ribbed handguard and a flash hider."),
    ("w08_mg", "무기", "A heavy machine gun with a thick ribbed barrel, cooling fins, an ammunition belt feeding in and a folded bipod."),
    ("w09_bazooka", "무기", "An olive-drab shoulder-fired rocket launcher tube with a blast cone at the rear, a small blast shield, "
     "an optical sight and a red rocket warhead with white fins protruding from the muzzle."),
    ("w10_homing", "무기", "A boxy four-tube homing missile launcher with glowing cyan missile tips in each tube, "
     "a small radar dish on top and a red lock-on lamp."),
    ("w11_laser", "무기", "A futuristic laser rifle with a dark teal shell, glowing cyan energy rings along the barrel, "
     "heat-sink fins and a bright emitter lens at the muzzle."),

    # ---- 아이템·소품 5종 ----
    ("item_glp1", "아이템", f"A sleek blue medical injector pen floating upright, with a soft blue glow halo around it, "
     "a small window showing a dose dial, no branding, no text on the device."),
    ("item_gcgr", "아이템", f"A sleek amber-orange medical injector pen floating upright, with a warm orange glow halo around it, "
     "a small window showing a dose dial, no branding, no text on the device."),
    ("fatwall", "소품", "A mound of glossy pale-yellow visceral fat globules clustered together like a soft barricade, "
     "oily sheen, rounded blobby forms, no face."),
    ("trapcage", "소품", "An ornate metal birdcage made of thin gray bars with a domed top, empty inside, front view, no face."),
    ("traplock", "소품", "A large bright red padlock with a polished white shackle and a white keyhole, glossy, "
     "slightly menacing, front view, no face."),
]

def prompt_for(key):
    """분류별 스타일 규약: 몬스터=귀엽게, 보스·장기=묵직하고 화려하게, 무기=1인칭 뷰모델."""
    for k, cat, body in ASSETS:
        if k == key:
            if cat == "무기":
                style = STYLE_GUN
            elif cat in ("몬스터", "아이템", "소품"):
                style = STYLE_CUTE
            else:                      # 보스, 장기
                style = STYLE
            return f"{body} {style}"
    raise KeyError(key)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(prompt_for(sys.argv[1]))
    else:
        for k, cat, _ in ASSETS:
            print(f"{k:16s} {cat}")
        print(f"\n총 {len(ASSETS)}종")


# ---------- 2프레임 걷기 사이클 ----------
# 생성 1회로 두 자세를 얻어 반으로 자른다. 두 자세가 동일 캐릭터로 나오는 게 관건이라
# "같은 캐릭터, 같은 크기, 같은 조명"을 반복해서 못 박는다.
WALK_RULE = (
    "IMPORTANT: this is a two-frame walk-cycle reference sheet. "
    "Draw the SAME single character TWICE, side by side, on one pure white background. "
    "LEFT frame: the character mid-stride with its left leg forward and right arm forward. "
    "RIGHT frame: the exact same character mid-stride with its right leg forward and left arm forward. "
    "Both frames must be the identical character with identical design, identical proportions, "
    "identical colors, identical lighting and identical size. "
    "Leave a clear empty white vertical gap between the two frames. "
    "Both frames face the viewer. No numbering, no labels, no captions, no frame borders."
)

def walk_prompt(key):
    """2프레임 걷기 시트용 프롬프트."""
    for k, cat, body in ASSETS:
        if k == key:
            style = STYLE_CUTE if cat in ("몬스터", "아이템", "소품") else STYLE
            return f"{body} {WALK_RULE} {style}"
    raise KeyError(key)


# ---------- 멀티맵 배경 (16:9 월드 플레이트) ----------
# beta의 bg.jpg 방식: 그림 배경 위에 경로를 추적하고 간·췌장을 얹는다. 경로가 그림에 "길"로 그려져 있어야
# Codex가 이미지를 보고 스플라인을 딸 수 있다. 캐릭터·텍스트 금지.
# 경로 구조(topology)는 맵마다 다르게 — 전부 '중앙 분기 후 합류'면 식상하다(유저 지적).
MAP_STYLE = (
    "Wide 16:9 landscape game background plate, no characters, no creatures, no text, no UI. "
    "3D cartoon render in the style of a whimsical intra-abdominal fantasy world (matching a Pixar-like MS Designer look), "
    "chunky rounded organic forms, glossy subsurface sheen, soft studio key light with warm rim light, atmospheric depth haze, "
    "fixed slightly elevated camera. Roads must be clearly readable as paths with distinct edges. "
    "Cinematic, high detail, no watermark, no border."
)
MAPS = [
    ("map_coronary", "관상동맥",
     "Inside a coronary artery: glossy crimson vessel walls, red blood cell discs drifting in the haze, crimson-and-gold palette. "
     "ROUTE LAYOUT: TWO separate vessel roads enter from the far upper-left and far upper-right corners and MERGE into one wide "
     "artery road at the bottom-center foreground (a Y shape). A yellow atherosclerotic plaque mound narrows each road once before the merge. "
     "An open flat plaza sits left of center at mid-distance for a guardian monument; an open ledge at the right foreground for a turret."),
    ("map_omentum", "내장지방·장간막",
     "Inside visceral fat and the omentum: rolling hills of glossy pale-yellow fat globules, red capillaries threading over the fat, "
     "clusters of purple inflammatory cells, golden-yellow palette with peach highlights. "
     "ROUTE LAYOUT: ONE long serpentine pink road with three switchback curves, snaking from the far upper-right down over the hills "
     "to the bottom-center foreground, no forks. The guardian plaza is on a hilltop at the left mid-distance overlooking the road; "
     "the turret ledge is at the right foreground."),
    ("map_sinusoid", "간 소엽·시누소이드",
     "Inside a liver lobule: rows of glossy reddish-brown hepatocyte blocks, blue-and-red sinusoid channels, pale fibrous bands, "
     "warm mahogany-and-amber palette. "
     "ROUTE LAYOUT: THREE straight radial channel roads converge like spokes from the far-left, far-center and far-right "
     "(three portal vein entrances) toward a round central-vein pool at the bottom-center foreground. No forks, no merging before the pool. "
     "The guardian plaza is directly behind the pool at center mid-distance; the turret ledge at the right foreground."),
    ("map_carotid", "경동맥",
     "Inside the carotid artery: a wide red vessel, the far distance glows soft violet-blue like brain tissue, crimson-and-violet palette. "
     "ROUTE LAYOUT: ONE wide road in the foreground that SPLITS only at the far end into two branches at a bulbous carotid bulb "
     "(an upside-down Y): both far branches rise toward the violet glow at the top corners, and a large plaque mound sits in the crotch of the fork. "
     "The guardian plaza is on the near side of the fork, center mid-distance; the turret ledge at the LEFT foreground."),
    ("map_stomach", "위",
     "Inside the stomach: pink mucosal ridges (rugae), shallow acid pools glowing pale green, a ring-shaped pyloric gate, pink-and-coral palette. "
     "ROUTE LAYOUT: a wide open basin. The road hugs the LEFT wall along the rugae ridges from the pyloric gate in the far upper-left, "
     "then crosses the basin diagonally over a shallow acid lake on flat stepping-stone slabs to reach the bottom-center foreground. "
     "The guardian plaza is an island in the middle of the acid lake; the turret ledge at the right foreground."),
    ("map_glomerulus", "신장 사구체·요관",
     "Inside the kidney: a tangle of glossy capillary loops of a glomerulus, coiled tubules, rosy-pink and cream palette with amber fluid. "
     "ROUTE LAYOUT: a SWITCHBACK descent like a nephron tubule — ONE road leaves the round Bowman capsule at the far upper-left, "
     "runs right across a high terrace, hairpins back to the left on a lower terrace, hairpins right again on a third terrace, "
     "and ends at the bottom-center foreground. Three clearly separated stepped terraces, no spiral, no coil, no concentric rings. "
     "The guardian plaza is a raised rock shelf tucked in the crook of the middle hairpin; the turret ledge at the right foreground."),
    ("map_islet", "췌장 랑게르한스섬",
     "Inside a pancreatic islet: clustered pale-peach beta-cell islands, tiny blue insulin granules glowing, soft peach-and-cyan palette. "
     "ROUTE LAYOUT: an ARCHIPELAGO — several beta-cell islands in a cyan fluid channel, connected by narrow bridges. "
     "TWO parallel roads run from the far end, one along the left islands and one along the right islands, never merging, "
     "each ending at the bottom foreground (left-bottom and right-bottom). The guardian plaza is the largest island at center; "
     "the turret ledge at the bottom-center between the two road endings."),
]
def map_prompt(key):
    for k, name, body in MAPS:
        if k == key:
            return f"Generate one image. {body} {MAP_STYLE}"
    raise KeyError(key)
