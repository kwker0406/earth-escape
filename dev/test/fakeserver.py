"""시험용 가짜 Firebase 서버(경로별 저장소 /__db) + 게임 폴더 정적 파일. check.py·perf.py가 함께 씀."""
import pathlib, json, threading, functools, re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
root = pathlib.Path(__file__).resolve().parent.parent
# 시험용 서버: game 폴더를 보여 주고, /__db 에 가짜 Firebase 데이터를 경로별로 저장(창끼리 덮어쓰지 않게)
DB, LOCK = {}, threading.Lock()
def _at(o, p):
    for k in [k for k in p.split("/") if k]: o = o.get(k) if isinstance(o, dict) else None
    return o
def _put(p, v):
    global DB
    ks = [k for k in p.split("/") if k]
    if not ks: DB = v or {}; return
    o, chain = DB, []
    for k in ks[:-1]:
        if not isinstance(o.get(k), dict): o[k] = {}
        chain.append((o, k)); o = o[k]
    if v is None: o.pop(ks[-1], None)
    else: o[ks[-1]] = json.loads(json.dumps(v))
    for parent, k in reversed(chain):
        if parent[k] == {}: parent.pop(k)
class H(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, body, code=200, ctype="application/json"):  # 자물쇠 밖에서 보냄(끊긴 창에 보내다 멈추면 다른 창이 모두 기다리게 되므로)
        self.send_response(code); self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if self.path.startswith("/__db"):
            with LOCK: body = json.dumps(DB).encode()
            return self._send(body)
        path = self.path.split("?")[0]
        if path == "/__fake.js": return self._send(fake.encode(), ctype="text/javascript")
        if path.endswith((".js", ".html", "/")):  # Firebase 주소를 가짜 파일로 바꿔서 줌(브라우저에서 요청을 가로채면 새로고침이 가끔 멈춤)
            f = root / "game" / (path.lstrip("/") or "index.html")
            if f.is_file(): return self._send(re.sub(r"https://www\.gstatic\.com/firebasejs/[^\"']*/(firebase-\w+)\.js", r"/__fake.js?\1", f.read_text()).encode(),
                                              ctype="text/html" if f.suffix == ".html" else "text/javascript")
        return super().do_GET()
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers["Content-Length"])) or b"{}"); code = 200
        with LOCK:
            if "replace" in b: _put("", b["replace"])
            elif "set" in b: _put(b["set"], b["v"])
            elif "update" in b:
                for k, v in b["obj"].items(): _put(b["update"] + "/" + k, v)
            elif "cas" in b:
                if json.dumps(_at(DB, b["cas"]), sort_keys=True) != json.dumps(json.loads(b["expect"]), sort_keys=True): code = 409
                else: _put(b["cas"], b["v"])
            body = json.dumps(DB).encode()
        self._send(body, code)
ThreadingHTTPServer.request_queue_size = 256  # 여러 창이 자주 물어봐도 연결이 거절되지 않게
srv = ThreadingHTTPServer(("localhost", 8765), functools.partial(H, directory=str(root / "game")))
srv.handle_error = lambda *a: None  # 새로고침으로 끊긴 요청(Broken pipe)은 무시
threading.Thread(target=srv.serve_forever, daemon=True).start()
fake = (root / "test/fake-firebase.js").read_text()
out = root / "test/shots"; out.mkdir(exist_ok=True)
URL = "http://localhost:8765/"
