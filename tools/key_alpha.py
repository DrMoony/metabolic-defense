# -*- coding: utf-8 -*-
"""생성된 흰 배경 이미지 → 투명 PNG 스프라이트.

Gemini·ChatGPT 모두 진짜 알파를 안 뱉기 때문에, 순백 배경 위에 그리게 한 뒤
'테두리에서 연결된 흰색'만 지운다. 피사체 안쪽의 흰색(참깨, 하이라이트, 뼈)은
외곽선에 막혀 살아남는다. 예전 간·췌장 키잉에 쓴 방식과 같다.

사용:
  python3 key_alpha.py raw/burger.png ../assets/sprites/burger.png --max 512
  python3 key_alpha.py raw/ --out ../assets/sprites/ --max 512      # 폴더 일괄
"""
import sys, os, argparse
import numpy as np
from PIL import Image, ImageFilter
from collections import deque


def key_out(img: Image.Image, tol: int = 34, feather: float = 0.8) -> Image.Image:
    img = img.convert("RGBA")
    a = np.array(img)
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(np.int16)

    # 테두리 픽셀의 중앙값을 배경색으로 본다 (순백이 아니어도 대응)
    edge = np.concatenate([rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1]])
    bg = np.median(edge, axis=0)

    near = (np.abs(rgb - bg).max(axis=2) <= tol)

    # 테두리에서 연결된 near 픽셀만 BFS로 제거 (안쪽 흰색 보호)
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not visited[y, x]:
                visited[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not visited[y, x]:
                visited[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True; q.append((ny, nx))

    alpha = np.where(visited, 0, 255).astype(np.uint8)
    am = Image.fromarray(alpha)
    if feather:
        am = am.filter(ImageFilter.GaussianBlur(feather))
    a[:, :, 3] = np.array(am)
    return Image.fromarray(a)


def trim(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l = max(0, l - pad); t = max(0, t - pad)
    r = min(img.width, r + pad); b = min(img.height, b + pad)
    return img.crop((l, t, r, b))


def fit(img: Image.Image, maxdim: int) -> Image.Image:
    if max(img.size) <= maxdim:
        return img
    s = maxdim / max(img.size)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def process(src, dst, tol, maxdim, pad):
    img = Image.open(src)
    out = fit(trim(key_out(img, tol=tol), pad=pad), maxdim)
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    out.save(dst, "PNG", optimize=True)
    opaque = int((np.array(out)[:, :, 3] > 8).sum())
    total = out.width * out.height
    return {"src": os.path.basename(src), "dst": dst, "size": f"{out.width}x{out.height}",
            "채움": f"{opaque * 100 // max(1, total)}%"}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst", nargs="?")
    ap.add_argument("--out", default=None, help="폴더 일괄 처리 시 출력 폴더")
    ap.add_argument("--tol", type=int, default=34, help="배경색 허용 오차 (기본 34)")
    ap.add_argument("--max", type=int, default=512, help="긴 변 최대 픽셀")
    ap.add_argument("--pad", type=int, default=6)
    args = ap.parse_args()

    if os.path.isdir(args.src):
        outdir = args.out or (args.dst or "keyed")
        rows = []
        for f in sorted(os.listdir(args.src)):
            if not f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                continue
            name = os.path.splitext(f)[0] + ".png"
            rows.append(process(os.path.join(args.src, f), os.path.join(outdir, name), args.tol, args.max, args.pad))
        for r in rows:
            print(f"{r['src']:22s} → {r['dst']}  {r['size']}  채움 {r['채움']}")
        print(f"\n{len(rows)}장 처리 완료")
    else:
        dst = args.dst or (os.path.splitext(args.src)[0] + "_keyed.png")
        print(process(args.src, dst, args.tol, args.max, args.pad))
