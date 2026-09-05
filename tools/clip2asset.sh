#!/bin/bash
# 클립보드의 PNG를 raw/<name>.png 로 저장하고 투명 키잉해 assets/sprites/<name>.png 생성
# 크롬이 chatgpt.com의 자동 다운로드를 막아버려서, 페이지에서 클립보드로 복사한 뒤 이 스크립트로 꺼낸다.
set -e
NAME="$1"; MAX="${2:-512}"
[ -z "$NAME" ] && { echo "사용법: clip2asset.sh <에셋키> [최대변]"; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)"
RAW="$DIR/raw/$NAME.png"
osascript -e "set p to (the clipboard as «class PNGf»)
set f to open for access POSIX file \"$RAW\" with write permission
set eof f to 0
write p to f
close access f"
python3 "$DIR/key_alpha.py" "$RAW" "$DIR/../assets/sprites/$NAME.png" --max "$MAX"
