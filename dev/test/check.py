import re
"""1~2단계 시험: 가짜 Firebase로 교사·학생 흐름 + 휴대폰 조작·회전."""
import time, sys, pathlib, base64, json, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from fakeserver import root, fake, out, URL, DB, LOCK  # 가짜 Firebase 서버가 여기서 켜짐

def touch_drag(page, x0, y0, x1, y1, hold_ms):
    cdp = page.context.new_cdp_session(page)
    pt = lambda x, y: [{"x": x, "y": y, "id": 1}]
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": pt(x0, y0)})
    for i in range(1, 6):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": pt(x0 + (x1 - x0) * i / 5, y0 + (y1 - y0) * i / 5)})
    page.wait_for_timeout(hold_ms)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})

errors = []
def new_page(ctx):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return pg

def student(ctx, code, nick, av=0):
    pg = new_page(ctx); pg.goto(URL)
    pg.fill("#code", code); pg.fill("#nick", nick)
    pg.locator("#avatars button").nth(av).click(); pg.click("#go")
    pg.wait_for_function("""document.getElementById('game').classList.contains('on') ||
        (document.getElementById('msg').textContent && !document.getElementById('msg').textContent.includes('접속 중'))""")
    return pg

def me_pos(pg):  # 내 위치를 가짜 DB에서 직접 읽음
    return pg.evaluate("""(() => { const db = fakeGet(); const uid = sessionStorage.fakeuid;
        for (const s of Object.values(db.sessions || {})) for (const t of Object.values(s.teams || {})) if (t.pos?.[uid]) return t.pos[uid]; })()""")

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(**p.devices["iPhone 13"])
        # 이야기·연습 방은 따로 시험(주소에 ?intro가 있을 때만 보이게)
        ctx.add_init_script("try { location.search.includes('intro') ? localStorage.removeItem('escape-intro-done') : localStorage.setItem('escape-intro-done', '1'); } catch (e) {}")

        # ── 교사: 로그인, 반 만들기(2팀, 팀당 2명) ──
        t = new_page(ctx); t.set_viewport_size({"width": 1100, "height": 800})
        t.on("dialog", lambda d: d.accept("테스트반") if d.type == "prompt" else d.accept())
        t.goto(URL + "teacher.html"); t.click("#loginBtn"); t.wait_for_selector("#main", state="visible")
        t.fill("[name=name]", "테스트반"); t.select_option("[name=teams]", "2"); t.select_option("[name=size]", "3"); t.fill("[name=min]", "5"); t.select_option("[name=level]", "hard")  # 흐름 시험은 전체(어려움)로
        t.click("#newClass button"); t.wait_for_selector(".team .code")
        codes = t.locator(".code").all_inner_texts(); print("codes", codes)
        assert len(codes) == 2 and all(len(c) == 4 for c in codes)

        # ── 처음 하는 기기: 이야기 컷신 → 혼자 연습 방(초록 칸까지 걸으면 다음 단계) → 건너뛰기 ──
        i = new_page(ctx); i.goto(URL + "?intro"); i.fill("#code", codes[1]); i.fill("#nick", "연습생"); i.click("#go")
        i.wait_for_selector("#story", timeout=8000); i.locator("#story button", has_text="다음").click(); i.wait_for_timeout(200)
        print("story:", i.inner_text("#story p")[:40]); i.locator("#story button", has_text="건너뛰기").click()
        i.wait_for_function("document.getElementById('alert').textContent.includes('연습 1/7')", timeout=4000)
        for key in ["ArrowLeft"] * 3 + ["ArrowUp"]:
            i.keyboard.down(key); i.wait_for_timeout(120); i.keyboard.up(key); i.wait_for_timeout(250)
        i.wait_for_function("document.getElementById('alert').textContent.includes('연습 2/7')", timeout=3000)
        i.screenshot(path=str(out / "tutorial.png"))
        i.locator("button", has_text="연습 건너뛰기").click()
        i.wait_for_function("document.getElementById('floorName').textContent.startsWith('1층')", timeout=3000)  # 층 이름은 0.5초마다 바뀜
        assert i.inner_text("#floorName").startswith("1층") and i.evaluate("localStorage.getItem('escape-intro-done')") == "1", "연습 방이 안 끝남"
        i.click("#out"); i.wait_for_selector("#join.on"); print("intro ✓"); i.close()  # 나가서 자리 비움
        # ── 팀 코드를 바꿔 다시 들어가면 예전 팀 자리가 비워져야 함 ──
        e = student(ctx, codes[0], "전학")
        e.click("#out"); e.wait_for_selector("#join.on")
        e.fill("#code", codes[1]); e.click("#go"); e.wait_for_selector("#game.on")
        e.wait_for_function(f"Object.values(Object.values(fakeGet().sessions)[0].teams['{codes[0]}'].slots).every(v => v === false)", timeout=5000)  # 자리 비우기가 서버에 닿을 때까지
        teams = e.evaluate("Object.values(fakeGet().sessions)[0].teams")
        print("team1 slots after switch:", teams[codes[0]]["slots"], "| team1 members:", list((teams[codes[0]].get("members") or {}).values()))
        assert all(v is False for v in teams[codes[0]]["slots"].values()), "예전 팀 자리가 남음"
        assert not teams[codes[0]].get("members"), "예전 팀에 이름이 남음"
        assert any(m["nick"] == "전학" for m in teams[codes[1]]["members"].values())
        e.close()

        # ── 학생: 잘못된 코드, 정원 초과(팀당 3명 → 4번째 거절) ──
        bad = student(ctx, "ZZZZ", "틀림"); assert "없는 방 코드" in bad.inner_text("#msg"); bad.close()
        a = student(ctx, codes[0], "민지", 1); c = student(ctx, codes[0], "준호", 3); d = student(ctx, codes[0], "서연", 5)
        full = student(ctx, codes[0], "지수", 2); print("full msg:", full.inner_text("#msg"))
        assert "자리가 다 찼어요" in full.inner_text("#msg"); full.close()
        d.close()
        # 가짜 Firebase에는 접속 끊김 처리(onDisconnect)가 없으므로, 닫은 창을 직접 '접속 끊김'으로 표시
        a.evaluate("""() => { const db = fakeGet();
            for (const s of Object.values(db.sessions)) for (const t of Object.values(s.teams))
              for (const m of Object.values(t.members || {})) if (m.nick === '서연') m.online = false;
            fakeSet(db); }""")

        # ── 시작 전에는 못 움직임 ──
        a.wait_for_timeout(300)
        a.wait_for_function("document.getElementById('status').textContent.includes('선생님이 시작하면')", timeout=3000)
        start = me_pos(a)
        pad = a.locator("#pad").bounding_box(); cx, cy = pad["x"] + pad["width"] / 2, pad["y"] + pad["height"] / 2
        touch_drag(a, cx, cy, cx + 60, cy, 400)
        assert me_pos(a) == start, "시작 전에 움직임"

        # ── 시작 → 이동·동기화 ──
        t.click("[data-act=start]"); a.wait_for_timeout(700)
        assert not a.locator("#status").is_visible(), "시작 후에도 안내가 가림"
        print("timer", a.inner_text("#timer"))
        touch_drag(a, cx, cy, cx, cy - 60, 500); mid = me_pos(a)   # 1층 현관에서 위(복도) → 오른쪽
        touch_drag(a, cx, cy - 60, cx + 60, cy, 500); end = me_pos(a)
        print("start", start, "afterUp", mid, "afterRight", end)
        assert mid["y"] < start["y"] and end["x"] > mid["x"], "방향키 이동 실패"
        cvb = a.locator("#cv").bounding_box()
        touch_drag(a, cvb["x"] + 50, cvb["y"] + 200, cvb["x"] + 50, cvb["y"] + 20, 100)
        assert a.evaluate("[scrollY, document.body.getBoundingClientRect().top, visualViewport.scale]") == [0, 0, 1], "화면이 움직임"
        c.wait_for_function("document.getElementById('team').textContent.includes('민지')", timeout=3000)
        a.screenshot(path=str(out / "phone.png"))

        # ── 교사 화면: 접속 현황 ──
        t.wait_for_timeout(300)
        card = t.locator(".team").first.inner_text(); print("team card:", card.replace("\n", " | "))
        assert "민지" in card and "준호" in card
        # 학생이 움직이는 동안 교사 화면의 버튼이 다시 만들어지지 않아야 클릭이 씹히지 않음
        t.evaluate("window.__btn = document.querySelector('.team li button')")
        for _ in range(4):
            a.keyboard.down("ArrowDown"); a.wait_for_timeout(150); a.keyboard.up("ArrowDown")
            a.keyboard.down("ArrowUp"); a.wait_for_timeout(150); a.keyboard.up("ArrowUp")
        t.wait_for_timeout(600)
        assert t.evaluate("window.__btn.isConnected"), "교사 화면 버튼이 다시 만들어짐"
        print("teacher buttons stable ✓")
        # 진행 상황(3단계에서 학생이 기록할 값)을 가짜 DB에 넣어 순위·막대·작은 지도 확인
        a.evaluate("""([c1, c2]) => { const db = fakeGet(); const s = Object.values(db.sessions)[0];
            s.teams[c1].progress = { floor: 1, at: 1, solved: { f1a: true, x: true, y: true }, wrong: 1, score: 0 };
            s.teams[c2].progress = { floor: 3, at: 3, solved: { f1a: true }, wrong: 2, score: 0 };
            fakeSet(db); }""", codes)
        t.wait_for_timeout(600)
        rk = t.inner_text("#ranking"); print("ranking:", rk.replace("\n", " | "))
        assert rk.index("1위 2팀") < rk.index("2위 1팀"), "순위 계산 오류"
        first = t.locator(".team").first.inner_text()
        assert "1층" in first and "해결 3 · 오답 1" in first
        a.wait_for_function("document.getElementById('floorName').textContent.startsWith('1층')", timeout=3000)  # 팀 전체가 1층으로
        dots = t.evaluate("""(() => { const c = document.querySelector('.team canvas'); const g = c.getContext('2d');
            const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0;
            for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i+1] > 120) n++; return n; })()""")
        print("minimap bright px", dots); assert dots > 20, "작은 지도에 캐릭터가 안 그려짐"
        t.screenshot(path=str(out / "teacher.png"))

        # ── 일시정지 → 이동 불가 ──
        t.click("[data-act=pause]")
        a.wait_for_function("document.getElementById('status').textContent.includes('잠깐 멈춤')", timeout=3000)  # 받아 오기 0.25초 + 화면 갱신 0.5초
        before = me_pos(a); touch_drag(a, cx, cy, cx, cy - 60, 400); assert me_pos(a) == before, "일시정지 중 움직임"
        t.click("[data-act=start]")

        # ── 내보내기: 준호 → 첫 화면, 같은 기기로 재입장 불가 ──
        t.locator(".team").first.locator("li", has_text="준호").locator("button").click()
        c.wait_for_selector("#join.on"); print("kicked msg:", c.inner_text("#msg"))
        assert "내보냈" in c.inner_text("#msg")
        c.fill("#code", codes[0]); c.click("#go"); c.wait_for_timeout(500)
        assert "내보냈어요" in c.inner_text("#msg"), "내보낸 기기가 다시 들어옴"
        t.wait_for_timeout(300)
        members_txt = t.locator(".team").first.locator("ul").first.inner_text()
        assert "준호" not in members_txt and "준호" in t.locator(".team .kicked").inner_text(), "내보낸 학생 목록에 없음"
        # ── 다시 받아 주기 → 같은 기기로 재입장 성공 ──
        t.locator(".team .kicked button").click(); t.wait_for_timeout(300)
        c.click("#go"); c.wait_for_selector("#game.on", timeout=5000)
        t.wait_for_function("!document.querySelector('.team .kicked') && document.querySelector('.team').innerText.includes('준호')", timeout=5000)  # 선생님 화면에 반영될 때까지
        assert t.locator(".team .kicked").count() == 0 and "준호" in t.locator(".team").first.inner_text(), "다시 받기 실패"

        # ── 보충수업실: 잡힌 상태(jail)로 재접속 → 대기 → 오답 → 10초 잠금 → 정답 → 시작점 ──
        a.evaluate("""() => { const db = fakeGet(); const uid = sessionStorage.fakeuid;
            for (const s of Object.values(db.sessions)) for (const t of Object.values(s.teams)) if (t.pos?.[uid]) t.pos[uid].jail = Date.now() + 1500;
            fakeSet(db); }""")
        a.reload(); a.click("#go"); a.wait_for_selector("#jail.on", timeout=5000)
        print("jail wait:", a.inner_text("#jailMsg"))
        t.wait_for_timeout(600); assert "🔒 1명" in t.locator(".team").first.inner_text(), "교사 화면에 보충실 인원 없음"
        a.wait_for_selector("#jailQ button", timeout=5000)
        ans = a.evaluate("""async () => { const { JAIL_QUESTIONS } = await import('./questions.js');
            const q = document.querySelector('#jailQ p').textContent; const shown = [...document.querySelectorAll('#jailQ button')].map(b => b.textContent); const Q = JAIL_QUESTIONS.find(x => x.q === q && x.c.every(c => shown.includes(c))); return Q.c[Q.a]; }""")
        a.locator("#jailQ button").filter(has_not_text=ans).first.click(); a.wait_for_timeout(300)
        print("after wrong:", a.inner_text("#jailMsg")); assert "아쉬워요" in a.inner_text("#jailMsg")
        a.wait_for_selector("#jailQ button", timeout=13000)
        ans = a.evaluate("""async () => { const { JAIL_QUESTIONS } = await import('./questions.js');
            const q = document.querySelector('#jailQ p').textContent; const shown = [...document.querySelectorAll('#jailQ button')].map(b => b.textContent); const Q = JAIL_QUESTIONS.find(x => x.q === q && x.c.every(c => shown.includes(c))); return Q.c[Q.a]; }""")
        a.get_by_role("button", name=ans, exact=True).click(); a.wait_for_timeout(400)
        assert not a.locator("#jail").is_visible(), "정답 후에도 보충실"
        gate_out = a.evaluate("""import('./maps.js').then(({ MAPS }) => { const m = MAPS[1], y = m.findIndex(r => r.includes('G')), x = m[y].indexOf('G'); return [x, y - 1]; })""")
        pos = me_pos(a); print("after escape:", pos, "gate front", gate_out)
        assert [pos["x"], pos["y"]] == gate_out and pos["jail"] == 0, "보충실 문 앞으로 나오지 않음"
        a.screenshot(path=str(out / "phone_monsters.png"))

        # ── 추격형 괴물: a는 사물함(1,7)에 숨고 c는 복도(6,8) → 예고 → 등장 → c만 잡힘 ──
        def set_pos(pg, x, y, f=None):
            pg.evaluate("""([x, y, f]) => { const db = fakeGet(); const uid = sessionStorage.fakeuid;
                for (const s of Object.values(db.sessions)) for (const t of Object.values(s.teams)) if (t.pos?.[uid]) t.pos[uid] = { x, y, d: 'd', jail: 0, f: f ?? t.pos[uid].f ?? 0 };
                fakeSet(db); }""", [x, y, f])
            pg.reload(); pg.click("#go"); pg.wait_for_selector("#game.on")
        set_pos(a, 12, 58); set_pos(c, 35, 56)
        # ── 사물함 재사용 대기: 나오자마자 다시 들어가려 하면 막힘 ──
        def step(pg, key):
            pg.keyboard.down(key); pg.wait_for_timeout(90); pg.keyboard.up(key); pg.wait_for_timeout(200)
        step(a, "ArrowRight"); out_pos = me_pos(a); print("left locker to", out_pos)
        assert (out_pos["x"], out_pos["y"]) == (13, 58)
        step(a, "ArrowLeft"); back = me_pos(a); print("try re-enter ->", back, "|", a.inner_text("#alert"))
        assert (back["x"], back["y"]) == (13, 58) and "다시 숨을 수 있어요" in a.inner_text("#alert"), "15초 안에 다시 숨어짐"
        a.wait_for_timeout(600); a.reload(); a.click("#go"); a.wait_for_selector("#game.on")
        step(a, "ArrowLeft"); print("after reload re-enter ->", me_pos(a))
        assert (me_pos(a)["x"], me_pos(a)["y"]) == (13, 58), "새로고침으로 재사용 대기가 풀림"
        set_pos(a, 12, 58)  # 시험을 위해 사물함 칸에 직접 놓음(걸어 들어가는 것만 막힘)
        a.evaluate("""async () => { const { firstAt } = await import('./monsters.js'); const db = fakeGet();
            const s = Object.values(db.sessions)[0];
            // 배터리가 갑자기 꺼져 '접속 중'으로 남은 유령 기기(uid가 가장 작아 첫 방장이 됨) → 1.5초 뒤 다른 기기가 이어받아야 함
            for (const t of Object.values(s.teams)) if (t.pos) { t.members['!ghost'] = { nick: '유령', avatar: 0, online: true };
              t.pos['!ghost'] = { x: 11, y: 14, f: 1, jail: Date.now() + 9e6 }; } // 같은 층·보충실(표적은 아니고 방장 후보만)
            Object.assign(s.meta, { state: 'play', playedMs: firstAt(s.meta.seed) - 800,
              startedAt: Date.now(), endsAt: Date.now() + 600000 }); fakeSet(db); }""")
        a.wait_for_function("document.getElementById('alert').textContent.includes('곧 나타나요')", timeout=4000)
        print("warn:", a.inner_text("#alert"))
        c.wait_for_function("/순찰 중|추격 중|쫓아온다/.test(document.getElementById('alert').textContent)", timeout=7000)
        getm = lambda: c.evaluate("Object.values(Object.values(fakeGet().sessions)[0].teams).find(t => t.monster).monster")
        m0 = getm(); d0 = min(abs(m0["x"] - 35) + abs(m0["y"] - 56), abs(m0["x"] - 12) + abs(m0["y"] - 58))
        print("monster spawn:", m0, "dist to c:", d0)
        assert d0 >= 7, "너무 가까이 등장"  # 8~10칸에 나타남(나타난 뒤 1.5초는 두리번거리며 멈춤)
        seen = set()
        for _ in range(6): c.wait_for_timeout(450); m1 = getm(); seen.add((m1["x"], m1["y"]))  # 왔다 갔다 해서 같은 칸에 돌아올 수 있어 여러 번 봄
        if d0 > 8 and m1.get("tid") is None:  # 8칸 밖: 쫓지 않고 순찰해야 함(문을 지나면 2초 멈춤)
            assert len(seen | {(m0["x"], m0["y"])}) > 1 or m1.get("w"), "순찰하지 않고 멈춰 있음"
            print("patrol ✓", m0, "->", m1)
        # c를 괴물 바로 근처(2~3칸)로 옮김 → 알아채고 쫓아와 잡아야 함
        c.wait_for_function("(() => { const m = Object.values(Object.values(fakeGet().sessions)[0].teams).find(t => t.monster).monster; return !(m.w > Date.now()); })()", timeout=4000)
        m1 = getm()
        near = c.evaluate("""async ([mx, my]) => { const { MAPS } = await import('./maps.js'); const { sightTiles } = await import('./monsters.js');
            for (const [k, d] of sightTiles(MAPS[1], { x: mx, y: my })) if (d >= 2 && d <= 3) return k.split(',').map(Number); }""", [m1["x"], m1["y"]])
        a.screenshot(path=str(out / "phone_patrol.png"))
        set_pos(c, *near); print("c moved near monster:", near)
        c.wait_for_selector("#jail.on", timeout=8000); print("c spotted & caught ✓")
        # 쫓을 사람이 없으면(a는 숨음, c는 보충실) 멈추지 않고 순찰
        c.wait_for_timeout(300); p0 = getm(); c.wait_for_timeout(1500); p1 = getm()
        print("after catch:", p0, "->", p1)
        assert p1.get("tid") is None and ((p0["x"], p0["y"]) != (p1["x"], p1["y"]) or p0.get("w") or p1.get("w")), "표적이 없을 때 순찰하지 않음"
        a.wait_for_timeout(300)
        print("a alert:", a.inner_text("#alert"))
        assert not a.locator("#jail").is_visible() and "숨는 중" in a.inner_text("#alert"), "숨었는데 잡힘"
        a.screenshot(path=str(out / "phone_chase.png"))
        # ── 구출: a가 보충실 문 앞에서 '구출' → c가 바로 문 앞 복도로 ──
        cin = me_pos(c); print("c in jail at", cin)
        assert c.evaluate(f"import('./maps.js').then(m => m.MAPS[1][{cin['y']}][{cin['x']}])") == "j", "잡히면 보충실 안으로 가야 함"
        a.evaluate("""async () => { const { firstAt } = await import('./monsters.js'); const db = fakeGet(); const s = Object.values(db.sessions)[0];
            Object.assign(s.meta, { playedMs: firstAt(s.meta.seed) + 22100, startedAt: Date.now() }); // 괴물 쉬는 시간(구출 중에 잡히지 않게)
            for (const tm of Object.values(s.teams)) if (tm.progress) delete tm.progress.noise; // 어려움 깜짝 등장 기록도 지움
            fakeSet(db); }""")
        set_pos(a, *gate_out); a.wait_for_function("document.getElementById('actBtn').textContent.includes('구출')", timeout=3000)
        a.click("#actBtn"); c.wait_for_function("!document.getElementById('jail').classList.contains('on')", timeout=4000)
        cout = me_pos(c); print("rescued ->", cout)
        assert [cout["x"], cout["y"]] == gate_out and cout["jail"] == 0, "구출 실패"
        t.wait_for_function("/보충 [1-9]/.test(document.querySelector('.team').innerText)", timeout=3000)  # 한 번 이상(괴물이 또 잡을 수도 있음)
        # ── 층 이동: 계단 색칠 칸(1칸 안)에 접속 팀원 과반수(3명 중 2명)가 3초 머물면 버튼 없이 자동 이동. 갇힌 유령은 빠져도 됨 ──
        cs = c.evaluate("import('./maps.js').then(m => { const r = m.MAPS[1], y = r.findIndex(l => l.includes('C')); return [r[y].indexOf('C'), y]; })")
        set_pos(a, cs[0], cs[1] + 2, 1); a.wait_for_timeout(800)
        print("locked:", a.inner_text("#alert")); assert "잠겨" in a.inner_text("#alert"), "관문 퍼즐 전에 계단이 열림"
        a.evaluate("""async ([c1]) => { const { firstAt } = await import('./monsters.js'); const db = fakeGet(); const s = Object.values(db.sessions)[0];
            s.teams[c1].progress.solved.f1b = true; for (const tm of Object.values(s.teams)) if (tm.progress) delete tm.progress.noise; Object.assign(s.meta, { playedMs: firstAt(s.meta.seed) + 22100, startedAt: Date.now() }); // 괴물 쉬는 시간
            fakeSet(db); }""", [codes[0]])
        a.wait_for_function("document.getElementById('alert').textContent.includes('모이는 중 (1/3명')", timeout=3000)
        print("alone:", a.inner_text("#alert"))
        set_pos(c, cs[0] + 1, cs[1] + 2, 1)
        a.wait_for_function("/초 뒤 2층으로 이동/.test(document.getElementById('alert').textContent)", timeout=3000); print("countdown:", a.inner_text("#alert"))
        for pg in (a, c): pg.wait_for_function("document.getElementById('floorName').textContent.startsWith('2층')", timeout=6000)
        print("majority moved the team up:", me_pos(a), me_pos(c))
        # ── 물건 주고받기: 내려놓고 → 친구가 그 칸을 밟아 줍기(가짜 DB는 탭끼리 덮어쓸 수 있어 두 사람 위치를 다시 놓음) ──
        set_pos(c, 25, 56, 2); set_pos(a, 24, 56, 2)
        a.evaluate("""([c1]) => { const db = fakeGet(); Object.values(db.sessions)[0].teams[c1].items = { b: { by: sessionStorage.fakeuid } };
            fakeSet(db); }""", [codes[0]])
        a.wait_for_timeout(300); a.click("#bagBtn"); a.wait_for_selector("#bag .drop", timeout=3000)
        assert a.locator("#bag .give").count() == 0, "주기 버튼이 남아 있음"
        a.locator("#bag .drop").first.click(); a.wait_for_timeout(300)
        it = lambda pg: pg.evaluate(f"Object.values(fakeGet().sessions)[0].teams['{codes[0]}'].items.b")
        print("dropped:", it(a)); assert it(a)["by"] is None and (it(a)["x"], it(a)["y"], it(a)["f"]) == (24, 56, 2), "내려놓기 실패"
        c.wait_for_timeout(300); step(c, "ArrowLeft"); c.wait_for_timeout(400)
        assert it(c)["by"] is None, "밟기만 했는데 주워짐"
        c.wait_for_function("document.getElementById('actBtn').textContent.includes('줍기')", timeout=3000); c.click("#actBtn"); c.wait_for_timeout(400)
        assert it(c)["by"] == c.evaluate("sessionStorage.fakeuid"), "조사 버튼으로 줍기 실패"
        print("hand-over ✓")
        # ── 조소 2실(1층, 어두운 미로): 손전등 빛 3칸 밖이면 '시선' 경고 2초 → 1층 보충실 ──
        zs = c.evaluate("import('./maps.js').then(({ MAPS }) => { const m = MAPS[1], out = []; m.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'z') out.push([x, y]); })); return out; })")
        entry = max(zs, key=lambda p: p[1]); far = min(zs, key=lambda p: p[0] + p[1])  # 입구 칸(맨 아래), 가장 먼 칸(왼쪽 위)
        a.evaluate("""([c1]) => { const db = fakeGet(); const t = Object.values(db.sessions)[0].teams[c1];
            Object.assign(t.progress, { at: 1 }); t.items = { flash: { by: sessionStorage.fakeuid } };
            t.monster2 = { n: 0, x: 0, y: 0, rest: Date.now() + 1e7, cid: "none", by: "test", t: Date.now() + 1e7 }; // 이 시험은 어둠만 봄: 미로 보충쌤은 멈춰 둠
            fakeSet(db); }""", [codes[0]])
        for pg in (a, c): pg.wait_for_function("document.getElementById('floorName').textContent.startsWith('1층')", timeout=4000)
        set_pos(a, *entry, 1); set_pos(c, *far, 1)  # 손전등(a)에서 멀리
        c.wait_for_function("document.getElementById('alert').textContent.includes('시선이 느껴진다')", timeout=4000)
        c.wait_for_selector("#jail.on", timeout=4000); print("dark jail:", c.inner_text("#jailMsg"))
        assert "어두운 곳은 위험해요" in c.inner_text("#jailMsg")
        cj = me_pos(c); assert cj["f"] == 1 and c.evaluate(f"import('./maps.js').then(m => m.MAPS[1][{cj['y']}][{cj['x']}])") == "j", "1층 보충실로 안 감"
        assert not a.locator("#jail").is_visible(), "손전등 든 학생이 잡힘"
        a.screenshot(path=str(out / "phone_maze.png"))
        t.wait_for_timeout(500); t.screenshot(path=str(out / "teacher_chase.png"))


        # ── 퍼즐 전체 흐름: 새 팀(2팀) 혼자 1층 → 2·3층(손전등) → 1층 조소 1실(조각상) → 2실(어두운 미로, IPCC) → 현관 탈출 ──
        a.evaluate("""async ([c2]) => { const { firstAt } = await import('./monsters.js'); const db = fakeGet();
            const s = Object.values(db.sessions)[0]; delete s.teams[c2].progress; delete s.teams[c2].members; delete s.teams[c2].pos;
            Object.keys(s.teams[c2].slots).forEach(k => s.teams[c2].slots[k] = false);
            for (const tm of Object.values(s.teams)) if (tm.progress) delete tm.progress.noise; Object.assign(s.meta, { playedMs: firstAt(s.meta.seed) + 22100, startedAt: Date.now(), endsAt: Date.now() + 600000 }); // 괴물 쉬는 시간
            fakeSet(db); }""", [codes[1]])
        g = student(ctx, codes[1], "혼자", 6); g.wait_for_timeout(300)
        PZS = g.evaluate("""async () => { const { buildPuzzles } = await import('./puzzles.js');
            const db = fakeGet(), m = Object.values(db.sessions)[0].meta, code = JSON.parse(localStorage['escape-profile']).code;
            return buildPuzzles(m.seed, code, m.teams[code]).floors; }""")
        MAPS = g.evaluate("import('./maps.js').then(m => m.MAPS)")
        find = lambda f, ch: next((x, y) for y, row in enumerate(MAPS[f]) for x, c in enumerate(row) if c == ch)
        assert g.inner_text("#floorName").startswith("1층"), "1층 현관에서 시작하지 않음"
        # 반짝이는 단서: 옆 칸에서 걸어 들어가면 내 가방에 들어감
        sp, n1 = g.evaluate("""async () => { const { buildPuzzles, clueSpots } = await import('./puzzles.js'); const { MAPS } = await import('./maps.js');
            const db = fakeGet(), m = Object.values(db.sessions)[0].meta, code = JSON.parse(localStorage['escape-profile']).code;
            const { miniGameOf } = await import('./puzzles.js');
            const all = clueSpots(m.seed, code, buildPuzzles(m.seed, code, m.teams[code]).floors, 1, MAPS[1]); return [all.find(c => !miniGameOf(c, MAPS[1], m.seed + code)), all.length]; }""")
        for key, dx, dy in [("ArrowRight", -1, 0), ("ArrowLeft", 1, 0), ("ArrowDown", 0, -1), ("ArrowUp", 0, 1)]:
            if MAPS[1][sp["y"] + dy][sp["x"] + dx] == ".": break
        set_pos(g, sp["x"] + dx, sp["y"] + dy, 1); step(g, key); g.wait_for_timeout(300)
        assert not g.evaluate(f"(fakeGet().sessions && Object.values(fakeGet().sessions)[0].teams[JSON.parse(localStorage['escape-profile']).code].got || {{}})['{sp['key']}']"), "밟기만 했는데 단서가 주워짐"
        onB = MAPS[1][sp["y"]][sp["x"]] == "B"  # 칠판 위 단서는 '칠판 보기'로 주움
        g.wait_for_function("/단서|칠판|조사 \\(/.test(document.getElementById('actBtn').textContent)", timeout=3000); g.click("#actBtn")
        if g.locator("#pz h2", has_text="무엇을 할까").count(): g.locator("#pz .opt", has_text="칠판" if onB else "단서").first.click()
        g.wait_for_timeout(600); g.screenshot(path=str(out / "ui_found.png"))
        if onB: assert sp["t"] in g.inner_text("#pz .board"), "칠판에 단서가 안 보임"; g.click("#pz .close")
        g.click("#bagBtn"); bagtxt = g.inner_text("#bag"); print("bag:", bagtxt.replace("\n", " | ")[:160])
        assert sp["t"].split(": ", 1)[-1] in bagtxt and f"못 주운 내 단서 {n1 - 1}개" in bagtxt, "단서 줍기 실패"
        g.click("#bag .close")
        def zone(f, ch):  # 계단·엘리베이터 바로 옆 바닥 칸(초록 칸)
            x, y = find(f, ch)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                if MAPS[f][y + dy][x + dx] == ".": return x + dx, y + dy
        def ride(f, ch, label, to):  # 혼자라 색칠 칸에 서면 바로 과반수 → 3초 뒤 자동 이동
            calm(); zx, zy = zone(f, ch); set_pos(g, zx, zy, f)
            g.wait_for_function(f"document.getElementById('floorName').textContent.startsWith({to!r})", timeout=7000)
            print("moved", f, "->", to, me_pos(g))
        zx, zy = zone(1, "K"); set_pos(g, zx, zy, 1); g.wait_for_function("document.getElementById('alert').textContent.includes('잠겨')", timeout=3000)
        team = lambda: g.evaluate("Object.values(fakeGet().sessions)[0].teams[JSON.parse(localStorage['escape-profile']).code]")
        shot_kinds = set()
        def investigate(pick="🔍"):  # 조사 버튼. 할 일이 여럿이면 고르는 창에서 pick으로 시작하는 것
            g.wait_for_function("!document.getElementById('actBtn').disabled", timeout=3000); g.click("#actBtn")
            if g.locator("#pz h2", has_text="무엇을 할까").count(): g.locator("#pz .opt", has_text=pick).first.click()
        # 겹침: 퍼즐 칸 위에 물건이 떨어져 있으면 '조사 (2)' → 고르는 창
        sx, sy = find(1, "1")
        g.evaluate("""([x, y]) => { const db = fakeGet(); const t = Object.values(db.sessions)[0].teams[JSON.parse(localStorage['escape-profile']).code];
            t.items = { b: { by: null, f: 1, x, y } }; fakeSet(db); }""", [sx, sy])
        set_pos(g, sx, sy, 1); g.wait_for_function("/조사 \\([2-9]\\)/.test(document.getElementById('actBtn').textContent)", timeout=3000)
        g.click("#actBtn"); assert g.locator("#pz .opt").count() >= 2, "고르는 창이 안 뜸"
        g.locator("#pz .opt", has_text="줍기").click()
        g.wait_for_timeout(700)
        assert team()["items"]["b"]["by"] == g.evaluate("sessionStorage.fakeuid"), "고르는 창에서 줍기 실패"
        print("overlap chooser ✓")
        # 칠판 보기: 칠판 옆에서 조사 → 확대 화면
        bx, by = g.evaluate("""import('./maps.js').then(({ MAPS }) => { const m = MAPS[1]; for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++)
            if (m[y][x] === 'B' && m[y][x + 1] === '.') return [x + 1, y]; })""")
        set_pos(g, bx, by, 1); investigate("🧑‍🏫"); g.wait_for_selector("#pz .board", timeout=3000)
        print("board:", g.inner_text("#pz .board").replace("\n", " | ")[:120]); g.screenshot(path=str(out / "board.png")); g.click("#pz .close")
        def calm():  # 퍼즐 흐름 시험 중에는 보충쌤이 끼어들지 않게: 쉬는 시간의 시작으로 되돌리고 깜짝 등장 기록도 지움(1분마다 오므로)
            g.evaluate("""async () => { const { firstAt } = await import('./monsters.js'); const db = fakeGet(), s = Object.values(db.sessions)[0];
                for (const tm of Object.values(s.teams)) if (tm.progress) delete tm.progress.noise;
                Object.assign(s.meta, { playedMs: firstAt(s.meta.seed) + 22100, startedAt: Date.now() }); fakeSet(db); }""")
        def solve(f, i):
            calm(); pz = PZS[f][i]; sx, sy = find(f, str(i + 1)); set_pos(g, sx, sy, f)
            investigate("🔍")
            box = g.locator("#pz")
            kind = pz["type"] + ("_dial" if box.locator(".dial").count() else "")
            if kind not in shot_kinds: shot_kinds.add(kind); g.wait_for_timeout(200); g.screenshot(path=str(out / f"ui_pz_{kind}.png"))
            if f == 1 and i == 0:  # 번호 다이얼: ▲ 한 번 → 1000(오답) → 속마음 힌트 1개
                assert box.locator(".dial").count() == len(pz["answer"]), "번호 다이얼이 아님"
                box.locator(".wheel button").first.click(); box.get_by_role("button", name="확인").click(); g.wait_for_timeout(300)
                assert box.locator(".hint").count() == 0 and "단서를 다 모으면" in box.inner_text(), "단서 없이 힌트가 나옴"
                box.get_by_role("button", name="확인").click(); g.wait_for_timeout(300)
                assert "초 뒤에 다시" in box.inner_text(), "틀린 뒤 잠금이 안 됨"
                g.wait_for_timeout(5200)  # 5초 잠금이 풀릴 때까지
            if pz["id"] == "r2": assert solved_r1[0], "r2 순서"
            if pz["type"] == "code":
                ins = box.locator("input")
                if box.locator(".dial").count(): [ins.nth(k).fill(ch) for k, ch in enumerate(pz["answer"])]
                else: ins.fill(pz["answer"].lower())
                box.get_by_role("button", name="확인").click()
            elif pz["type"] == "choice":
                box.get_by_role("button", name=pz["answer"], exact=True).click()
            elif pz["type"] == "lever":  # 처음엔 모두 ▲ → ▼인 레버만 누름
                for k, ch in enumerate(pz["answer"]):
                    if ch == "D": box.locator(".lever").nth(k).click()
                box.get_by_role("button", name="레버 고정하기").click()
            elif pz["type"] == "seq":
                for ch in pz["answer"]: box.locator(".opt").nth(int(ch)).click()
            else:
                for k in range(len(pz["left"])):
                    box.locator(".cols > div").nth(0).locator("button").nth(k).click()
                    box.locator(".cols > div").nth(1).get_by_role("button", name=pz["right"][k], exact=True).click()
            if pz.get("final"): return
            box.locator(".fb.ok").wait_for(timeout=3000); g.click("#pz .close")
        solved_r1 = [False]
        mini_done = [False]
        def mini_check(f):  # 이 층에 넌센스 책상이 있으면: 틀리면 2초 잠김, 맞히면 '단서 꺼내기' → 가방에(층마다 한 번 찾아봄)
            if mini_done[0]: return
            mg = g.evaluate("""async ([f]) => { const { buildPuzzles, clueSpots, miniGameOf } = await import('./puzzles.js'); const { MAPS } = await import('./maps.js');
                const db = fakeGet(), m = Object.values(db.sessions)[0].meta, code = JSON.parse(localStorage['escape-profile']).code, T = buildPuzzles(m.seed, code, m.teams[code]).floors;
                return clueSpots(m.seed, code, T, f, MAPS[f]).find(c => miniGameOf(c, MAPS[f], m.seed + code) === 'nonsense') ?? null; }""", [f])
            if not mg: return
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                if MAPS[f][mg["y"] + dy][mg["x"] + dx] == ".": break
            set_pos(g, mg["x"] + dx, mg["y"] + dy, f); g.wait_for_function("document.getElementById('actBtn').textContent.includes('🎲') || /조사 \\(/.test(document.getElementById('actBtn').textContent)", timeout=3000)
            g.click("#actBtn")
            if g.locator("#pz h2", has_text="무엇을 할까").count(): g.locator("#pz .opt", has_text="🎲").first.click()
            ask = g.inner_text("#pz .ask"); ans = g.evaluate("([q]) => import('./minigames.js').then(m => m.NONSENSE.find(n => n[0] === q)[1])", [ask])
            g.locator("#pz .opt", has_text=ans).click(); g.get_by_role("button", name="📜 단서 꺼내기").click(); g.wait_for_timeout(400)
            assert team()["got"][mg["key"]] == g.evaluate("sessionStorage.fakeuid"), "미니게임 단서를 못 얻음"
            print("mini game (nonsense) ✓", f, "층", ask, "→", ans); mini_done[0] = True
        mini_check(1)
        solve(1, 0)
        nz = team()["progress"].get("noise"); g.wait_for_timeout(300); al = g.inner_text("#alert"); print("noise:", nz, al)
        assert nz is not None and "시끄러워" in al, "어려움: 퍼즐을 풀어도 보충쌤이 깜짝 등장하지 않음"
        solve(1, 1)  # 1층의 나머지(경고판·탈출문)는 마지막에
        assert team()["items"]["a"]["by"] == g.evaluate("sessionStorage.fakeuid"), "열쇠가 가방에 없음"
        ride(1, "K", "2층", "2층")
        mini_check(2)
        dx_, dy_ = find(2, "a"); set_pos(g, dx_, dy_ - 1, 2); step(g, "ArrowDown")  # 열쇠를 가지고 잠긴 문으로 → 열림
        g.wait_for_timeout(400); tm = team()
        assert tm["progress"].get("keys", {}).get("a") and not tm.get("items", {}).get("a"), "열쇠로 문이 안 열림"
        print("key opened the door ✓")
        for i in range(len(PZS[2])): solve(2, i)
        ride(2, "K", "3층", "3층")
        mini_check(3)
        for i in range(len(PZS[3])): solve(3, i)
        assert g.evaluate("Object.values(fakeGet().sessions)[0].teams[JSON.parse(localStorage['escape-profile']).code].items.flash.by === sessionStorage.fakeuid"), "손전등을 못 얻음"
        ride(3, "W", "2층", "2층"); ride(2, "W", "1층", "1층")
        # 조소 1실: 조각상을 밀면 팀 기록(progress.statues)이 바뀌고, 조사 → 되돌리기로 처음 자리
        home = g.evaluate("import('./maps.js').then(({ MAPS }) => { const m = MAPS[1], out = []; m.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'Q') out.push([x, y]); })); return out; })")
        qx, qy = max(home, key=lambda p: p[1])  # 입구 줄의 조각상
        set_pos(g, qx - 1, qy, 1); step(g, "ArrowRight"); g.wait_for_timeout(500)
        assert f"{qx + 1},{qy}" in (team()["progress"].get("statues") or []) and (me_pos(g)["x"], me_pos(g)["y"]) == (qx, qy), "조각상이 안 밀림"
        print("statue pushed ✓", team()["progress"]["statues"])
        investigate("🗿"); g.wait_for_timeout(500); assert not team()["progress"].get("statues"), "되돌리기 실패"
        print("statues reset ✓")
        sx, sy = find(1, "4"); set_pos(g, sx, sy, 1); investigate("🔍")  # 현관 탈출문은 경고판(r1)을 풀기 전엔 잠김
        assert "먼저" in g.inner_text("#pz") and g.locator("#pz input").count() == 0, "탈출문이 먼저 열림"; g.click("#pz .close")
        solve(1, 2); solved_r1[0] = True  # 조소 2실 맨 끝 경고판(손전등을 들고 있어 안전)
        assert not g.locator("#jail").is_visible(), "손전등 들고도 잡힘"
        solve(1, 3)
        g.wait_for_selector("#end.on", timeout=3000)
        g.evaluate("document.getElementById('end').classList.remove('on')")
        g.evaluate("""() => { const db = fakeGet();  // 출석부는 출석부 쪽지(r2-0)를 팀이 주운 뒤에만 가방에 나옴
            for (const s of Object.values(db.sessions)) for (const t of Object.values(s.teams)) (t.got ??= {})['r2-0'] = 'x';
            fakeSet(db); }""")
        g.wait_for_timeout(300); g.click("#bagBtn")
        g.wait_for_timeout(300)
        assert g.locator("#bag .card", has_text=re.compile(r" — \d+$")).count() == 5 and "출석부" in g.inner_text("#bag"), "조각·출석부 없음"
        assert "팀원별 남은 별" in g.inner_text("#bag") and "1층" in g.inner_text("#bag"), "팀원별 남은 별 없음"; print("stars:", [l for l in g.inner_text("#bag").split("\n") if "층 " in l and "—" in l][:3])
        keys = [f"{pz['id']}-{j}" for fl in PZS for pz in fl if not pz.get("off") for j in range(len(pz["clues"]))]
        g.evaluate("""(keys) => { const db = fakeGet(), uid = sessionStorage.fakeuid;  // 화면 확인용: 모든 단서를 내 가방에 넣고 종류별로 찍어 둠
            for (const s of Object.values(db.sessions)) for (const t of Object.values(s.teams)) if (t.members?.[uid]) for (const k of keys) (t.got ??= {})[k] = uid;
            fakeSet(db); }""", keys)
        g.wait_for_timeout(600); g.evaluate("document.querySelectorAll('#bag details').forEach(d => d.open = true)")
        for n, sel in enumerate(["note", "index", "plaque", "sketch", "form", "label", "whisper"]):
            if g.locator(f"#bag .paper.{sel}").count(): g.locator(f"#bag .paper.{sel}").first.scroll_into_view_if_needed(); g.wait_for_timeout(150); g.screenshot(path=str(out / f"ui_bag_{sel}.png"))
        g.evaluate("document.getElementById('end').classList.add('on')")
        total = sum(len(x) for x in PZS); print("end:", g.inner_text("#end").replace("\n", " | "))
        assert "탈출 시간" in g.inner_text("#end") and "보충 명부" in g.inner_text("#end"), "엔딩 화면 오류"
        g.screenshot(path=str(out / "phone_end.png"))
        t.wait_for_timeout(600); assert "탈출" in t.locator(".team").nth(1).inner_text(), "교사 화면에 탈출 표시 없음"
        print("puzzle flow ✓")

        # ── 회전: 키보드로 높이만 줄면 세로 유지, 실제 가로면 큰 지도 ──
        cdp = a.context.new_cdp_session(a)
        def emulate(w, h, orient):
            cdp.send("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 3, "mobile": True,
                     "screenOrientation": {"type": orient, "angle": 90 if orient.startswith("landscape") else 0}})
            a.wait_for_timeout(300)
        land = lambda: a.evaluate("document.body.classList.contains('land')")
        emulate(390, 300, "portraitPrimary"); assert land() is False, "키보드 때문에 가로 배치"
        for w, h in [(844, 390), (667, 375)]:
            emulate(w, h, "landscapePrimary")
            cv = a.locator("#cv").bounding_box(); print("landscape", w, cv)
            assert land() and cv["height"] / 7 >= 45, "가로 지도 작음"
            (out / f"land{w}.png").write_bytes(base64.b64decode(cdp.send("Page.captureScreenshot")["data"]))
        emulate(390, 844, "portraitPrimary")
        px = a.evaluate("""(() => { const c = document.getElementById('cv'); return [c.width, c.getContext('2d').getImageData(c.width/2, c.height/2, 1, 1).data[3]]; })()""")
        assert px[0] > 300 and px[1] > 0, "세로 복귀 후 지도 안 그려짐"

        # ── 시간: 종료 후 +10분 → 일시정지(이어서 가능), 처음부터 다시 → 시작 전·진행 기록 지움·학생 자동 재입장 ──
        meta = lambda: t.evaluate("Object.values(fakeGet().sessions)[0].meta")
        t.click("[data-act=end]"); t.wait_for_timeout(400); assert meta()["state"] == "end"
        t.click("[data-act=plus10]"); t.wait_for_timeout(400); m = meta(); print("after end +10:", m["state"], m["remain"])
        assert m["state"] == "pause" and m["remain"] == 600000, "종료 후 시간 추가 실패"
        seed0 = m["seed"]
        t.click("#reset"); t.wait_for_function("(() => { const m = Object.values(fakeGet().sessions)[0].meta; return m.state === 'wait' && !m.resetting; })()", timeout=8000); m = meta()
        assert m["state"] == "wait" and m["seed"] != seed0 and m["playedMs"] == 0, "처음부터 다시 실패"
        assert not any(tm.get("progress") for tm in t.evaluate("Object.values(Object.values(fakeGet().sessions)[0].teams)")), "진행 기록이 남음"
        a.wait_for_timeout(1500); a.wait_for_selector("#game.on", timeout=8000); assert "선생님이 시작하면" in a.inner_text("#status"), "새 게임 대기 화면이 아님"
        t.wait_for_timeout(500); assert not any((tm.get("progress") or {}).get("solved") for tm in t.evaluate("Object.values(Object.values(fakeGet().sessions)[0].teams)")), "옛 기록이 되살아남"
        print("reset ✓ remain", m["remain"], "| student:", a.inner_text("#status")[:30])
        # ── 반 삭제 → 학생은 첫 화면으로 ──
        t.click("#del"); a.wait_for_function("document.getElementById('msg').textContent.includes('종료')", timeout=5000)  # #join.on은 새로고침 직후 바로 보여 기다림으로 부족
        print("after delete:", a.inner_text("#msg"))
        assert "종료" in a.inner_text("#msg") and t.locator("#classes button").count() == 0

        print("errors", errors); assert not errors
        print("OK")
finally:
    if errors: print("page errors:", errors[:3])
    __import__("fakeserver").srv.shutdown()
