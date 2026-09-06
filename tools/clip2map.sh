#!/bin/bash
# 클립보드의 맵 이미지(불투명 플레이트)를 assets/maps/<키>.jpg 로 저장 (키잉 없음, 긴 변 1920)
set -e
NAME="$1"; [ -z "$NAME" ] && { echo "사용법: clip2map.sh <map_key>"; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)"
RAW="$DIR/raw/$NAME.png"
osascript -e "set p to (the clipboard as «class PNGf»)
set f to open for access POSIX file \"$RAW\" with write permission
set eof f to 0
write p to f
close access f"
python3 - "$RAW" "$DIR/../assets/maps/$NAME.jpg" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
if im.width > 1920:
    im = im.resize((1920, round(im.height * 1920 / im.width)), Image.LANCZOS)
im.save(dst, "JPEG", quality=90, optimize=True)
print(f"{dst.split('/')[-1]} {im.width}x{im.height} 비율 {im.width/im.height:.2f}")
PY
