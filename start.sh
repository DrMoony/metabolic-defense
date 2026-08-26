#!/bin/bash
# 메타볼릭 디펜스 실행 (부스/키오스크용)
# 사용: ./start.sh          → 일반 창으로 열기
#       ./start.sh kiosk    → 크롬 전체화면 키오스크 (크롬이 완전히 꺼진 상태에서 실행해야 --kiosk 적용됨)
cd "$(dirname "$0")"
if ! curl -s -o /dev/null http://localhost:8765; then
  (python3 -m http.server 8765 >/dev/null 2>&1 &)
  sleep 1
fi
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "이 컴퓨터에서:      http://localhost:8765"
[ -n "$IP" ] && echo "같은 Wi-Fi 기기에서: http://$IP:8765"
if [ "$1" = "kiosk" ]; then
  open -na "Google Chrome" --args --kiosk --autoplay-policy=no-user-gesture-required http://localhost:8765/index.html
else
  open http://localhost:8765/index.html
fi
