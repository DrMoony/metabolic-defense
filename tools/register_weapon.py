# -*- coding: utf-8 -*-
"""키잉된 무기 PNG 크기를 읽어 beta/main.js WEAPON_SPRITES에 한 줄 추가한다.
  python3 register_weapon.py 4 w04_shotgun 1.5
"""
import sys, re, os
from PIL import Image
tier, key, w = int(sys.argv[1]), sys.argv[2], float(sys.argv[3])
here = os.path.dirname(os.path.abspath(__file__))
png = os.path.join(here, "..", "assets", "sprites", key + ".png")
W, H = Image.open(png).size
main = os.path.join(here, "..", "beta", "main.js")
s = open(main, encoding="utf-8").read()
line = f"  {tier}: {{ file: '../assets/sprites/{key}.png', w: {w}, ratio: {H} / {W}, mz: [0.0, {round(w*H/W*0.55,2)}, -0.08] }},"
if f"  {tier}: {{ file:" in s:
    s = re.sub(rf"^  {tier}: \{{ file:.*$", line, s, count=1, flags=re.M); act = "갱신"
else:
    s = s.replace("const WEAPON_SPRITES = {\n", "const WEAPON_SPRITES = {\n" + line + "\n", 1); act = "추가"
open(main, "w", encoding="utf-8").write(s)
idx = os.path.join(here, "..", "beta", "index.html")
h = open(idx, encoding="utf-8").read()
m = re.search(r"main\.js\?v=b(\d+)", h); n = int(m.group(1)) + 1
open(idx, "w", encoding="utf-8").write(h.replace(m.group(0), f"main.js?v=b{n}"))
print(f"{act}: tier {tier} ← {key} {W}x{H}  (캐시 b{n})")
