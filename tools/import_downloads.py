# -*- coding: utf-8 -*-
"""다운로드한 생성 이미지를 에셋키로 정리해 tools/raw/ 에 넣는다.

  python3 import_downloads.py --map burger,liver,pancreas      # 최근 3장을 순서대로 매핑
  python3 import_downloads.py --map burger --file ~/Downloads/foo.png
  python3 import_downloads.py --list                            # 최근 다운로드 이미지 확인
"""
import os, shutil, argparse, time

DL = os.path.expanduser("~/Downloads")
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
EXT = (".png", ".jpg", ".jpeg", ".webp")


def recent(n=20):
    items = [(os.path.join(DL, f), os.path.getmtime(os.path.join(DL, f)))
             for f in os.listdir(DL) if f.lower().endswith(EXT)]
    items.sort(key=lambda x: x[1], reverse=True)
    return items[:n]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--map", default=None, help="에셋키 목록(쉼표). 최근 다운로드와 '오래된→최신' 순으로 짝지음")
    ap.add_argument("--file", default=None, help="특정 파일 하나를 지정")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--move", action="store_true", help="복사 대신 이동")
    args = ap.parse_args()

    if args.list or not args.map:
        for p, t in recent():
            print(f"{time.strftime('%m-%d %H:%M', time.localtime(t))}  {os.path.basename(p)}")
        if not args.map:
            raise SystemExit("\n--map 으로 에셋키를 지정하세요.")

    keys = [k.strip() for k in args.map.split(",") if k.strip()]
    os.makedirs(RAW, exist_ok=True)
    if args.file:
        srcs = [os.path.expanduser(args.file)]
    else:
        srcs = [p for p, _ in reversed(recent(len(keys)))]     # 오래된 것부터
    if len(srcs) < len(keys):
        raise SystemExit(f"다운로드 이미지가 {len(srcs)}장인데 키는 {len(keys)}개입니다.")
    for k, s in zip(keys, srcs):
        dst = os.path.join(RAW, k + os.path.splitext(s)[1].lower())
        (shutil.move if args.move else shutil.copy2)(s, dst)
        print(f"{os.path.basename(s):40s} → raw/{os.path.basename(dst)}")
    print(f"\n{len(keys)}장 정리 완료. 다음: python3 key_alpha.py raw/ --out ../assets/sprites/ --max 512")
