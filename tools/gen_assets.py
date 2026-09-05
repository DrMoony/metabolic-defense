# -*- coding: utf-8 -*-
"""Gemini(Nano Banana Pro)로 스프라이트 원본을 생성한다.

★ 과금 주의: 기본은 드라이런이다. 실제 호출은 --go 를 명시해야 한다.
  python3 gen_assets.py                      # 무엇을 얼마에 만들지만 출력
  python3 gen_assets.py --only burger,liver --go
  python3 gen_assets.py --go --model flash   # 훨씬 싼 대신 품질 낮음
"""
import os, sys, json, time, base64, argparse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prompts import ASSETS, prompt_for

PRO = "gemini-3-pro-image-preview"
FLASH = "gemini-2.5-flash-image"
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
KRW = 1350


def api_key():
    k = os.environ.get("GEMINI_API_KEY")
    if k:
        return k
    env = os.path.expanduser("~/.hseng-secrets/env.sh")
    if os.path.exists(env):
        for line in open(env, encoding="utf-8"):
            line = line.strip()
            if "GEMINI_API_KEY" in line and "=" in line:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def generate(prompt, out_path, model, key, temperature=0.55):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}],
               "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "temperature": temperature}}
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    res = json.loads(urllib.request.urlopen(req, timeout=240).read())
    el = time.time() - t0
    u = res.get("usageMetadata", {})
    ti, to = u.get("promptTokenCount", 0), u.get("candidatesTokenCount", 0)
    cost = (ti * 0.15 + to * 0.60) / 1e6 if "flash" in model else (ti * 1.25 + to * 10.0) / 1e6
    saved = None
    for part in (res.get("candidates") or [{}])[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(part["inlineData"]["data"]))
            saved = out_path
    return {"path": saved, "cost": cost, "krw": round(cost * KRW), "sec": round(el, 1)}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None, help="쉼표로 구분한 에셋 키")
    ap.add_argument("--cat", default=None, help="분류로 필터 (몬스터/보스/장기/무기/아이템/소품)")
    ap.add_argument("--model", default="pro", choices=["pro", "flash"])
    ap.add_argument("--go", action="store_true", help="실제 호출 (없으면 드라이런)")
    ap.add_argument("--out", default=RAW)
    args = ap.parse_args()

    picks = [(k, c) for k, c, _ in ASSETS]
    if args.only:
        want = {s.strip() for s in args.only.split(",")}
        picks = [(k, c) for k, c in picks if k in want]
    if args.cat:
        picks = [(k, c) for k, c in picks if c == args.cat]

    model = PRO if args.model == "pro" else FLASH
    per = 22 if args.model == "pro" else 2      # 실측 전 보수적 추정치(원)
    print(f"모델 {model} · 대상 {len(picks)}종 · 예상 {len(picks) * per:,}원 (장당 약 {per}원)")
    for k, c in picks:
        print(f"  {k:16s} {c}")
    if not args.go:
        print("\n드라이런입니다. 실제 생성하려면 --go 를 붙이세요.")
        sys.exit(0)

    key = api_key()
    if not key:
        sys.exit("GEMINI_API_KEY 를 찾지 못했습니다.")
    total = 0.0
    for i, (k, c) in enumerate(picks, 1):
        try:
            r = generate(prompt_for(k), os.path.join(args.out, f"{k}.png"), model, key)
            total += r["cost"]
            print(f"[{i}/{len(picks)}] {k:16s} {'OK ' + r['path'] if r['path'] else '이미지 없음'}  "
                  f"{r['krw']}원 {r['sec']}s")
        except Exception as e:
            print(f"[{i}/{len(picks)}] {k:16s} 실패: {e}")
    print(f"\n합계 ${total:.4f} ≈ {round(total * KRW):,}원")
