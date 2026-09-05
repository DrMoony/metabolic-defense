# -*- coding: utf-8 -*-
"""브라우저에서 생성 이미지를 직접 받아 raw/ 에 저장하는 수신 서버.

크롬이 같은 페이지의 연속 자동 다운로드를 막기 때문에, a[download] 대신
페이지에서 이 서버로 POST 하게 한다. CORS 허용 + OPTIONS 프리플라이트 처리.
  python3 recv.py &          # 8799 포트
"""
import os, http.server, socketserver, urllib.parse

RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
PORT = 8799


class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "text/plain; charset=utf-8"); self.end_headers()
        n = len([f for f in os.listdir(RAW)]) if os.path.isdir(RAW) else 0
        self.wfile.write(f"recv ok, raw/ has {n} files\n".encode())

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = (q.get("name") or ["unnamed"])[0]
        name = "".join(c for c in name if c.isalnum() or c in "_-")[:60] or "unnamed"
        n = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(n)
        os.makedirs(RAW, exist_ok=True)
        p = os.path.join(RAW, name + ".png")
        with open(p, "wb") as f:
            f.write(data)
        print(f"saved {p} ({len(data)//1024} KB)", flush=True)
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "text/plain"); self.end_headers()
        self.wfile.write(f"ok {len(data)}".encode())

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), H) as s:
        print(f"수신 서버 http://localhost:{PORT} → {RAW}", flush=True)
        s.serve_forever()
