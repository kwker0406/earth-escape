"""성능·안정성 시험(가짜 Firebase). 실행: python3 test/perf.py
A. 학생 폰(처리 속도 1·4·6배 느리게): 팀원 4명이 화면 안에서 계속 움직이고 보충쌤이 쫓는 최악의 화면 → 프레임 간격
B. 선생님 화면: 6팀 × 5명 = 30명이 동시에 움직일 때 → 프레임 간격·한 번 다시 그리는 시간
C. 동시 입장: 학생 창 30개(6팀 × 5명)가 한꺼번에 입장 → 모두 자리를 받는지, 같은 자리 중복이 없는지
D. 인터넷 끊김: 8초 끊겼다 돌아오면 오류 없이 이어지는지
E. 오래 켜 두기: 90초 동안 움직이며 메모리가 계속 늘어나는지
가짜 Firebase는 0.25초마다 전체 데이터를 동기식으로 받아 와서 진짜보다 화면을 더 막는다 → 여기 숫자는 '나쁜 쪽' 기준."""
import sys, pathlib, time, threading, random, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import fakeserver as fs
from playwright.sync_api import sync_playwright

def put(path, v):
    with fs.LOCK: fs._put(path, v)
def get(path):
    with fs.LOCK: return json.loads(json.dumps(fs._at(fs.DB, path)))

FRAME_JS = """(ms) => new Promise(ok => { const d = []; let last = performance.now(), end = last + ms;
  const f = t => { d.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else ok(d); }; requestAnimationFrame(f); })"""
def stats(d):
    d = sorted(d); n = len(d)
    return {"fps": round(1000 / (sum(d) / n), 1), "p50": round(d[n // 2], 1), "p95": round(d[int(n * .95)], 1), "max": round(d[-1], 1), "끊김(>50ms)": sum(x > 50 for x in d)}

errors = []
def page(ctx):
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); return pg
def student(ctx, code, nick, av=0):
    pg = page(ctx); pg.goto(fs.URL); pg.fill("#code", code); pg.fill("#nick", nick); pg.locator("#avatars button").nth(av).click(); pg.click("#go")
    try: pg.wait_for_selector("#game.on", timeout=30000)
    except Exception: print("입장 실패:", nick, pg.inner_text("#msg")); raise
    return pg

stop = threading.Event()
def walkers(sid, team_ids, f=1, y0=56):  # 가짜 팀원: 복도에서 좌우로 계속 걸음(학생 걸음 속도)
    xs = {k: 20 + i * 2 for i, k in enumerate(team_ids)}
    while not stop.is_set():
        for (code, uid), x in list(xs.items()):
            nx = x + random.choice([-1, 1]); nx = max(5, min(60, nx)); xs[(code, uid)] = nx
            put(f"sessions/{sid}/teams/{code}/pos/{uid}", {"x": nx, "y": y0 + (hash(uid) % 3), "d": "r", "jail": 0, "f": f, "seen": 0})
        time.sleep(0.167)

result = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(**p.devices["iPhone 13"])
    ctx.add_init_script("try { localStorage.setItem('escape-intro-done', '1'); } catch (e) {}")
    t = page(ctx); t.set_viewport_size({"width": 1280, "height": 900})
    t.on("dialog", lambda d: d.accept())
    t.goto(fs.URL + "teacher.html"); t.click("#loginBtn"); t.wait_for_selector("#main", state="visible")
    t.fill("[name=name]", "성능반"); t.select_option("[name=teams]", "6"); t.select_option("[name=size]", "5"); t.select_option("[name=level]", "hard")
    t.click("#newClass button"); t.wait_for_selector(".team .code")
    codes = t.locator(".code").all_inner_texts(); sid = next(iter(get("sessions")))
    t.click("[data-act=start]")

    # ── C. 동시 입장: 30개 창(6팀 × 5명) ──
    t0 = time.time(); got = []; a = None  # 창 30개를 한 대에서 한꺼번에 띄우면 시험 기계가 못 버팀 → 6명(팀마다 1명)씩 5번에 나눠 입장
    for w in range(5):
        pgs = [student(ctx, codes[k], f"학생{w}{k}", (w + k) % 8) for k in range(6)]
        for k, pg in enumerate(pgs):
            uid = pg.evaluate("sessionStorage.fakeuid"); held = [s for s, v in (get(f"sessions/{sid}/teams/{codes[k]}/slots") or {}).items() if v == uid]
            got.append((codes[k], held[0] if len(held) == 1 else None))
        for pg in pgs:
            if a is None: a = pg
            else: pg.close()
    ok = [g for g in got if g[1] is not None]
    result["C 입장"] = {"학생": 30, "자리 받음": len(ok), "같은 자리 중복": len(ok) - len(set(ok)), "걸린 시간(초)": round(time.time() - t0, 1)}
    code_a = codes[0]

    # 가짜 팀원 4명(a의 팀) + 나머지 5팀 × 5명 = 29명이 움직임
    fakes = []
    for ci, c in enumerate(codes):
        n = 4 if c == code_a else 5
        for k in range(n):
            uid = f"!sim{ci}{k}"; fakes.append((c, uid))
            put(f"sessions/{sid}/teams/{c}/members/{uid}", {"nick": f"가짜{ci}{k}", "avatar": k % 8, "online": True})
    th = threading.Thread(target=walkers, args=(sid, fakes), daemon=True); th.start()
    a.evaluate("""() => { const db = fakeGet(); const uid = sessionStorage.fakeuid;
        for (const s of Object.values(db.sessions)) for (const t of Object.values(s.teams)) if (t.pos?.[uid]) t.pos[uid] = { x: 24, y: 56, d: 'd', jail: 0, f: 1, seen: 0 }; fakeSet(db); }""")
    a.reload(); a.fill("#code", code_a); a.click("#go")  # 창들이 저장소를 같이 써서 마지막 학생의 방 코드가 남아 있음 → 내 코드를 다시 적음
    try: a.wait_for_selector("#game.on", timeout=15000)
    except Exception: print("다시 입장 실패:", a.inner_text("#msg"), "| 오류:", errors[-3:]); a.screenshot(path=str(fs.out / "perf_fail.png")); raise
    # 보충쌤 추격 시간대로 맞춤(괴물·추격 음악까지 켜진 상태)
    a.evaluate("""async () => { const { firstAt } = await import('./monsters.js'); const db = fakeGet(), s = Object.values(db.sessions)[0];
        Object.assign(s.meta, { state: 'play', playedMs: firstAt(s.meta.seed) + 2500, startedAt: Date.now(), endsAt: Date.now() + 1800000 }); fakeSet(db); }""")
    a.wait_for_timeout(1500)

    # ── A. 학생 폰 프레임(처리 속도 1·4·6배 느리게) ──
    cdp = ctx.new_cdp_session(a)
    for rate in [1, 4, 6]:
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
        a.keyboard.down("ArrowRight"); d = a.evaluate(FRAME_JS, 6000); a.keyboard.up("ArrowRight")
        result[f"A 학생 폰 ×{rate} 느리게"] = stats(d)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    a.screenshot(path=str(fs.out / "perf_student.png"))

    # ── B. 선생님 화면(30명 움직임) ──
    d = t.evaluate(FRAME_JS, 6000); result["B 선생님 화면"] = stats(d)
    tc = ctx.new_cdp_session(t); tc.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    d = t.evaluate(FRAME_JS, 6000); result["B 선생님 화면 ×4 느리게(오래된 노트북)"] = stats(d); tc.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    t.screenshot(path=str(fs.out / "perf_teacher.png"))

    # ── D. 인터넷 8초 끊김 ──
    e0 = len(errors); ctx.set_offline(True); a.keyboard.down("ArrowLeft"); a.wait_for_timeout(8000); a.keyboard.up("ArrowLeft"); ctx.set_offline(False); a.wait_for_timeout(3000)
    alive = a.evaluate("new Promise(ok => requestAnimationFrame(() => ok(true)))")
    result["D 인터넷 8초 끊김"] = {"새 오류": errors[e0:][:3], "화면 계속 그림": alive, "게임 화면": a.locator("#game.on").count() == 1}

    # ── E. 90초 켜 두기(걷기·추격 반복) ──
    heap = lambda: a.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6 * 10) / 10 : -1")
    a.evaluate("() => { if (window.gc) gc(); }"); h0 = heap(); marks = []
    for k in range(9):
        key = ["ArrowRight", "ArrowLeft"][k % 2]; a.keyboard.down(key); a.wait_for_timeout(10000); a.keyboard.up(key); marks.append(heap())
    result["E 90초 메모리(MB)"] = {"처음": h0, "10초마다": marks}
    stop.set()
    result["페이지 오류 전체"] = len(errors)
    b.close()

for k, v in result.items(): print(k, "→", v)
