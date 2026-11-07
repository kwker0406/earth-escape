// 처음 입장하면: ① 이야기 컷신(도트 장면 5장 + 자막) ② 혼자 연습 방(이동·조사·단서·자물쇠·칠판·사물함·현관).
// 서버에는 아무것도 쓰지 않는다(연습은 내 폰에서만). 끝나면 기기에 기억해 두고 다음부터는 건너뜀.
import { MAPS } from "./maps.js";
import { drawTile } from "./tiles.js";
import { sprite } from "./sprites.js";

const DONE_KEY = "escape-intro-done";
export const introDone = () => { try { return !!localStorage.getItem(DONE_KEY); } catch { return true; } };
export const resetIntro = () => { try { localStorage.removeItem(DONE_KEY); } catch {} };

// ── 연습 방 지도: 교실 하나 + 복도. 기호는 게임 지도와 같음(S = 나가는 현관 매트)
function tutMap() {
  const W = 18, H = 12, g = Array.from({ length: H }, () => Array(W).fill("#"));
  for (let y = 1; y <= 7; y++) for (let x = 1; x <= 11; x++) g[y][x] = ".";
  for (let y = 2; y <= 6; y++) g[y][1] = "B";
  g[3][3] = "T"; g[4][3] = "1";
  for (const x of [6, 8]) for (const y of [2, 4, 6]) g[y][x] = "D";
  for (let y = 1; y <= 7; y++) g[y][11] = "L";
  g[8][2] = "+"; g[8][10] = "+";
  for (let y = 9; y <= 10; y++) for (let x = 1; x <= 16; x++) g[y][x] = ".";
  g[9][14] = "H"; g[10][16] = "S";
  return g.map(r => r.join(""));
}
const TUT = tutMap(), CLUE = { x: 8, y: 4 }, NEAR = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
const STEPS = [
  "방향키(▲▼◀▶)로 걸어서 초록 칸까지 가 보세요.",
  "교실로 들어가, ✨가 반짝이는 책상 옆에서 🔍 조사를 누르세요.",
  "🎒 단서 버튼을 눌러 주운 단서를 읽어 보세요.",
  "교탁 위 🔍 자물쇠 옆에서 조사를 눌러 비밀번호를 넣으세요.",
  "칠판 옆에 서서 조사를 누르면 칠판을 크게 볼 수 있어요.",
  "복도의 주황색 사물함으로 걸어 들어가 숨어 보세요.",
  "사물함에서 나와, 빨간 현관 매트로 가면 팀이 있는 1층으로 나가요!",
];

export function startIntro(api) {
  const { $, el } = api;
  let step = 0, me = { x: 5, y: 10, rx: 5, ry: 10, d: "r" }, last = 0, lastT = 0, active = true, hidden = false;
  const box = $("pz"), close = () => box.classList.remove("on");
  const show = (...kids) => { box.replaceChildren(el("button", { className: "close", textContent: "닫기 ✕", onclick: () => { close(); afterClose?.(); afterClose = null; } }), ...kids); box.classList.add("on"); };
  let afterClose = null, sayText = "", sayUntil = 0;
  const say = (t, ms = 2500) => { sayText = t; sayUntil = performance.now() + ms; };
  const near = ch => NEAR.some(([dx, dy]) => TUT[me.y + dy]?.[me.x + dx] === ch);
  const nearClue = () => NEAR.some(([dx, dy]) => me.x + dx === CLUE.x && me.y + dy === CLUE.y);
  const finish = () => { active = false; close(); try { localStorage.setItem(DONE_KEY, "1"); } catch {} skipBtn.remove(); api.onDone(); };
  const skipBtn = el("button", { textContent: "연습 건너뛰기 ⏭", onclick: finish,
    style: "position:absolute; right:12px; bottom:calc(env(safe-area-inset-bottom) + 96px); z-index:4; padding:8px 12px; border-radius:10px; border:1px solid #fff4; background:#0008; color:#fff;" });
  $("mapbox").append(skipBtn);

  const actions = () => {
    const out = [];
    if (step === 1 && nearClue()) out.push(["📜 단서", () => { step = 2; say("📜 단서를 주웠다! 🎒에서 확인하세요"); }]);
    if (step >= 3 && near("1")) out.push(["🔍 조사", openLock]);
    if (step >= 4 && near("B")) out.push(["🧑‍🏫 칠판", openBoard]);
    return out;
  };
  const openLock = () => {
    const dials = [0, 1, 2].map(i => el("input", { className: "dial", inputMode: "numeric", value: "0", ariaLabel: `${i + 1}번째 자리` }));
    const spin = (w, d) => { w.value = String(((+w.value || 0) + d + 10) % 10); };
    const fb = el("p", { className: "fb" });
    show(el("h2", { textContent: "🔍 연습 자물쇠" }), el("p", { className: "ask", textContent: "쪽지에 적힌 비밀번호(세 자리)를 넣어라." }),
      el("div", { className: "dials" }, ...dials.map(w => el("div", { className: "wheel" }, el("button", { textContent: "▲", onclick: () => spin(w, 1) }), w, el("button", { textContent: "▼", onclick: () => spin(w, -1) })))),
      el("button", { className: "go", textContent: "🔓 확인", onclick: () => {
        if (dials.map(w => w.value).join("") === "100") { fb.className = "fb ok"; fb.textContent = "✅ 열렸다! 진짜 게임에서는 단서를 모아야 비밀번호를 알 수 있어요."; if (step === 3) step = 4; }
        else { fb.className = "fb no"; fb.textContent = "❌ 틀렸어요. 진짜 게임에서는 틀리면 5초 동안 못 돌려요. 쪽지를 다시 볼까요?"; } } }), fb,
      el("p", { className: "sub", textContent: "▲▼로 숫자를 돌리거나, 칸을 눌러 숫자를 바로 넣을 수 있어요." }));
  };
  const openBoard = () => {
    show(el("h2", { textContent: "🧑‍🏫 연습 교실 칠판" }), el("div", { className: "board" },
      el("p", { textContent: "오늘의 규칙" }), el("p", { textContent: "단서는 팀원마다 다르게 보여요!" }), el("p", { textContent: "주운 단서는 말로 알려 주기" }),
      el("p", { className: "clue", textContent: "✎ 보충쌤이 오면 사물함에 숨기" })));
    if (step === 4) afterClose = () => { step = 5; };
  };
  api.onAct(() => { const a = actions(); if (a.length) a[0][1](); });
  api.onBag(() => {
    show(el("h2", { textContent: "🎒 내 단서 (연습)" }), step >= 2 ? el("div", { className: "card" }, "📝 연습 쪽지: 물이 끓는 온도(℃)가 비밀번호야.", el("small", { textContent: "진짜 게임에서는 이 가방에 단서와 열쇠·손전등이 모여요." }))
      : el("p", { className: "sub", textContent: "아직 주운 단서가 없어요." }));
    if (step === 2) afterClose = () => { step = 3; };
  });

  return {
    get active() { return active; },
    ui() { const a = actions(); $("actBtn").disabled = !a.length; $("actBtn").textContent = a[0]?.[0] ?? "🔍 조사"; },
    frame(now) {
      if (!active) return;
      const dir = api.getDir(), STEP = api.stepMs;
      if (dir && now - last >= STEP && !box.classList.contains("on")) {
        last = now; me.d = dir; const [dx, dy] = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[dir], nx = me.x + dx, ny = me.y + dy, c = TUT[ny]?.[nx];
        if (c && !"#DBTL1".includes(c)) { me.x = nx; me.y = ny; }
      }
      const dt = lastT ? Math.min(now - lastT, 250) : 0; lastT = now;
      const v = dt / STEP; for (const k of ["x", "y"]) { const r = "r" + k, d = me[k] - me[r]; me[r] += Math.abs(d) <= v ? d : Math.sign(d) * v; }
      hidden = TUT[me.y][me.x] === "H";
      if (step === 0 && me.x === 2 && me.y === 9) step = 1;
      if (step === 5 && hidden) { say("🫣 숨었다! 보충쌤은 숨은 학생을 못 봐요. 단, 60초까지만!", 3500); step = 6; }
      if (step === 6 && me.x === 16 && me.y === 10) {
        step = 7; show(el("h2", { textContent: "🎉 연습 끝!" }),
          el("div", { className: "card" }, "🟩 계단 앞 색칠된 칸에 팀원 절반 넘게 모여 3초 기다리면 자동으로 층을 옮겨요."),
          el("div", { className: "card" }, "🔒 보충쌤에게 잡히면 보충수업실로! 친구가 보충실 문 앞에서 🔍 조사하면 구출돼요."),
          el("div", { className: "card" }, "📜 단서는 팀원마다 다르게 보여요. 주운 단서는 꼭 말로 알려 주세요."),
          el("button", { className: "go", textContent: "팀에게 가기 ▶", onclick: finish }));
        afterClose = finish;
      }
      // 그리기
      const { ctx } = api, T = api.getT(), [VW, VH] = api.getView(), W = TUT[0].length, H = TUT.length;
      const cx = Math.max(0, Math.min(W - VW, me.rx - (VW - 1) / 2)), cy = Math.max(-1, Math.min(H - VH, me.ry - (VH - 1) / 2));
      ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#05040a"; ctx.fillRect(0, 0, VW * T + T, VH * T + T);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drawTile(ctx, TUT, 5, x, y, Math.round((x - cx) * T), Math.round((y - cy) * T), T);
      const at = (x, y) => [(x - cx) * T + T / 2, (y - cy) * T + T / 2];
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (step === 0) { ctx.fillStyle = "rgba(60,200,90,0.45)"; ctx.fillRect((2 - cx) * T, (9 - cy) * T, T, T); }
      if (step <= 1) { const [px, py] = at(CLUE.x, CLUE.y); ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 300); ctx.font = `${T * 0.38}px sans-serif`; ctx.fillText("✨", px, py); ctx.globalAlpha = 1; }
      if (step >= 3) { const [px, py] = at(3, 4); ctx.font = `${T * 0.6}px sans-serif`; ctx.fillText(step === 3 ? "🔍" : "✅", px, py); }
      if (step === 6) { ctx.fillStyle = "rgba(60,200,90,0.35)"; ctx.fillRect((16 - cx) * T, (10 - cy) * T, T, T); }
      if (!hidden) { const [px, py] = at(me.rx, me.ry), moving = Math.abs(me.rx - me.x) + Math.abs(me.ry - me.y) > 0.02;
        ctx.drawImage(sprite(api.avatar, me.d, moving ? 1 + Math.floor(now / 160) % 2 : 0), px - T / 2, py - T * 0.55, T, T);
        ctx.font = `bold ${Math.max(10, T * 0.32)}px sans-serif`; ctx.fillStyle = "#fff"; ctx.fillText(api.nick, px, py - T * 0.62); }
      else { const [px, py] = at(me.rx, me.ry), gr = ctx.createRadialGradient(px, py, T * 1.2, px, py, T * 3.6);
        gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.93)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW * T, VH * T); }
      const msg = now < sayUntil ? sayText : "🧭 연습 " + Math.min(step + 1, STEPS.length) + "/" + STEPS.length + " · " + (STEPS[step] ?? "");
      if ($("alert").textContent !== msg) $("alert").textContent = msg;
      $("alert").classList.add("on");
    },
  };
}

// ── 이야기 컷신: 도트 장면 5장. 화면을 누르거나 '다음'으로 넘김
const SCENES = [
  { text: "통합과학 시험이 끝난 날 밤…", draw: "night" },
  { text: "시험을 망친 우리는 '밤 보충수업'에 불려 왔다. 학교에는 아무도 없다.", draw: "hall" },
  { text: "보충쌤: \"지구 환경 문제를 다 풀기 전엔… 아무도 집에 못 간다!\"", draw: "teacher" },
  { text: "보충쌤에게 잡히면 보충수업실로 끌려간다. 사물함에 숨거나, 친구를 구출하자.", draw: "locker" },
  { text: "학교 곳곳의 단서를 모아 퍼즐을 풀고, 1층 현관 자물쇠를 열어 탈출하자!", draw: "stairs" },
];
export function playStory(api) {
  const { $, el } = api;
  return new Promise(done => {
    const cv = el("canvas", { width: 312, height: 216, style: "width:min(92vw,520px); image-rendering:pixelated; border-radius:10px; box-shadow:0 0 0 3px #3a3150;" });
    const cap = el("p", { style: "min-height:4.5em; margin:14px 4px 0; font-size:18px; line-height:1.5; text-align:center; color:#f3eefc;" });
    const next = el("button", { className: "big", textContent: "다음 ▶" }), skip = el("button", { textContent: "건너뛰기", style: "background:none; border:1px solid #fff4; color:#cfc6e6; border-radius:10px; padding:10px 14px;" });
    const wrap = el("div", { id: "story", style: "position:fixed; inset:0; z-index:20; background:#05040a; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; gap:6px;" },
      cv, cap, el("div", { style: "display:flex; gap:10px; margin-top:12px;" }, skip, next));
    document.body.append(wrap);
    const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
    let i = 0, typed = 0, raf = 0;
    const end = () => { cancelAnimationFrame(raf); wrap.remove(); done(); };
    const tiles = (x0, y0, w, h, T = 24) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (MAPS[1][y0 + y]?.[x0 + x]) drawTile(g, MAPS[1], 1, x0 + x, y0 + y, x * T, y * T, T); };
    const dark = a => { g.fillStyle = `rgba(5,4,20,${a})`; g.fillRect(0, 0, 312, 216); };
    const who = (k, x, y, d = "u", s = 24) => g.drawImage(sprite(k, d, 0), x, y, s, s);
    const draw = (now) => {
      const sc = SCENES[i];
      g.fillStyle = "#05040a"; g.fillRect(0, 0, 312, 216);
      if (sc.draw === "night") { // 밤하늘 + 학교 실루엣
        const gr = g.createLinearGradient(0, 0, 0, 216); gr.addColorStop(0, "#0b0a24"); gr.addColorStop(1, "#2a1f3d"); g.fillStyle = gr; g.fillRect(0, 0, 312, 216);
        for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(now / 400 + k)})`; g.fillRect((k * 73) % 312, (k * 37) % 110, 2, 2); }
        g.fillStyle = "#f3e9b0"; g.beginPath(); g.arc(250, 40, 16, 0, 7); g.fill(); g.fillStyle = "#0b0a24"; g.beginPath(); g.arc(258, 35, 14, 0, 7); g.fill();
        g.fillStyle = "#1a1528"; g.fillRect(30, 110, 252, 106); g.fillRect(130, 80, 52, 30);
        for (let y = 124; y < 200; y += 22) for (let x = 44; x < 270; x += 26) { g.fillStyle = (x * y) % 7 === 0 ? "#ffd86a" : "#2c2440"; g.fillRect(x, y, 12, 10); }
      } else if (sc.draw === "hall") { tiles(36, 53, 13, 9); dark(0.35); [0, 1, 2, 3].forEach((k, j) => who(j === 0 ? api.avatar : (api.avatar + j * 2) % 8, 108 + j * 26, 150, "u")); }
      else if (sc.draw === "teacher") { tiles(36, 53, 13, 9); dark(0.5); who("teacher", 140, 60, "d", 32);
        g.fillStyle = "#fff"; g.fillRect(70, 22, 172, 26); g.fillStyle = "#c02626"; g.font = "bold 12px sans-serif"; g.textAlign = "center"; g.fillText("아무도 집에 못 간다!", 156, 39);
        [0, 1, 2].forEach(j => who((api.avatar + j * 3) % 8, 110 + j * 30, 160, "u")); }
      else if (sc.draw === "locker") { tiles(6, 53, 13, 9); dark(0.3); who("teacher", 190, 120, "l", 28);
        const gr = g.createRadialGradient(156, 150, 20, 156, 150, 150); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.85)"); g.fillStyle = gr; g.fillRect(0, 0, 312, 216); }
      else { tiles(36, 47, 13, 9); dark(0.25); [0, 1, 2, 3].forEach((k, j) => who(j === 0 ? api.avatar : (api.avatar + j * 2) % 8, 100 + j * 22, 110, "u")); }
      if (sc.draw !== "night" && sc.draw !== "teacher") { g.fillStyle = "rgba(0,0,0,0.15)"; for (let y = 0; y < 216; y += 3) g.fillRect(0, y, 312, 1); } // 옛날 화면 줄무늬
      typed = Math.min(sc.text.length, typed + 0.6); cap.textContent = sc.text.slice(0, Math.floor(typed));
      raf = requestAnimationFrame(draw);
    };
    const go = () => { if (typed < SCENES[i].text.length) { typed = SCENES[i].text.length; return; } if (++i >= SCENES.length) return end(); typed = 0; next.textContent = i === SCENES.length - 1 ? "연습하러 가기 ▶" : "다음 ▶"; };
    next.onclick = go; cv.onclick = go; skip.onclick = end;
    raf = requestAnimationFrame(draw);
  });
}
