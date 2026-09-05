# -*- coding: utf-8 -*-
"""가로로 나란히 그려진 2프레임 시트를 각각의 투명 PNG로 자른다.

흰 배경을 먼저 키잉한 뒤, 알파가 비어 있는 세로 띠(프레임 사이 간격)를 찾아 분할한다.
  python3 split_frames.py raw/fries_walk.png fries --max 512
"""
import sys, os, argparse
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from key_alpha import key_out, trim, fit


def split(img, min_gap_ratio=0.02):
    a = np.array(img)
    col = (a[:, :, 3] > 8).sum(axis=0)          # 열마다 불투명 픽셀 수
    empty = col == 0
    # 빈 열이 연속된 구간(=프레임 사이 간격) 찾기
    runs, start = [], None
    for x, e in enumerate(empty):
        if e and start is None: start = x
        elif not e and start is not None: runs.append((start, x)); start = None
    if start is not None: runs.append((start, len(empty)))
    W = img.width
    inner = [r for r in runs if r[0] > W * 0.15 and r[1] < W * 0.85]
    if not inner:
        return None
    gap = max(inner, key=lambda r: r[1] - r[0])
    if gap[1] - gap[0] < W * min_gap_ratio:
        return None
    mid = (gap[0] + gap[1]) // 2
    return img.crop((0, 0, mid, img.height)), img.crop((mid, 0, W, img.height))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("name")
    ap.add_argument("--out", default=None)
    ap.add_argument("--max", type=int, default=512)
    ap.add_argument("--tol", type=int, default=34)
    args = ap.parse_args()

    here = os.path.dirname(os.path.abspath(__file__))
    outdir = args.out or os.path.join(here, "..", "assets", "sprites")
    keyed = key_out(Image.open(args.src), tol=args.tol)
    parts = split(keyed)
    if not parts:
        print("프레임 간격을 못 찾았습니다. 한 장으로 저장합니다.")
        p = os.path.join(outdir, args.name + ".png")
        fit(trim(keyed), args.max).save(p, "PNG", optimize=True)
        print(p)
        sys.exit(0)
    for i, part in enumerate(parts):
        out = fit(trim(part), args.max)
        p = os.path.join(outdir, f"{args.name}_{i}.png")
        os.makedirs(outdir, exist_ok=True)
        out.save(p, "PNG", optimize=True)
        print(f"프레임 {i}: {out.width}x{out.height} → {os.path.basename(p)}")
