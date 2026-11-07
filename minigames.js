// 책상 위 미니게임: 이걸 풀어야 그 책상의 단서를 얻는다(책상 단서 4개 중 1개꼴, puzzles.js의 miniGameOf가 정함).
// nonsense 넌센스 퀴즈 · wire 전선 돌려 전구 켜기 · picture 그림 조각 바꿔 맞추기. 혼자 푸는 것이라 서버에 쓰지 않음.
// open({ el, box, kind, seed, onWin, onClose }) — box(퍼즐 창)에 그림

export const NONSENSE = [ // [질문, 정답, 오답, 오답]
  ["세상에서 가장 가난한 왕은?", "최저임금", "킹콩", "왕자"],
  ["왕이 넘어지면?", "킹콩", "왕따", "킹크랩"],
  ["소가 웃으면?", "우하하", "소하하", "음메롱"],
  ["바나나가 웃으면?", "바나나킥", "바나나우유", "바나나맛"],
  ["세상에서 가장 쉬운 숫자는?", "190000 (십구만)", "1", "0"],
  ["딸기가 직장을 잃으면?", "딸기시럽", "딸기우유", "딸기잼"],
  ["미국에서 비가 오면?", "USB (유에스비)", "아메리카노", "레인보우"],
  ["아몬드가 죽으면?", "다이아몬드", "땅콩", "호두"],
  ["오리가 얼면?", "언덕", "얼음오리", "오리털"],
  ["세상에서 가장 지루한 중학교는?", "로딩중", "수업중", "방학중"],
  ["펭귄이 다니는 중학교는?", "냉방중", "남극중", "얼음중"],
  ["개가 사람을 가르치면?", "개인지도", "개학", "개교"],
];
const rng = s => () => { s = Math.imul(s ^ s >>> 15, 0x2c1b3c6d) + 0x6d2b79f5 | 0; return ((s ^ s >>> 13) >>> 0) / 4294967296; };
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const TITLES = { nonsense: "🤔 책상 위 넌센스 쪽지", wire: "💡 끊어진 전선", picture: "🧩 찢어진 사진" };

export function open({ el, box, kind, seed, onWin, onClose }) {
  const r = rng(seed), head = () => [el("button", { className: "close", textContent: "닫기 ✕", onclick: onClose }), el("h2", { textContent: TITLES[kind] })];
  const win = msg => { box.replaceChildren(...head(), el("p", { className: "fb ok", textContent: msg }), el("button", { className: "go", textContent: "📜 단서 꺼내기", onclick: onWin })); };

  if (kind === "nonsense") {
    let q = Math.floor(r() * NONSENSE.length), lock = 0;
    const draw = (fb = "") => {
      const [ask, ...opts] = NONSENSE[q], order = shuffle(opts, r);
      box.replaceChildren(...head(), el("p", { className: "sub", textContent: "서랍이 잠겨 있다. 쪽지의 수수께끼를 맞히면 열린다." }), el("p", { className: "ask", textContent: ask }),
        ...order.map(o => el("button", { className: "opt", textContent: o, onclick: () => {
          if (Date.now() < lock) return;
          if (o === opts[0]) return win("딸깍! 서랍이 열렸다.");
          lock = Date.now() + 2000; q = (q + 1 + Math.floor(r() * (NONSENSE.length - 1))) % NONSENSE.length; draw("❌ 땡! 2초 뒤 다른 문제");
          setTimeout(() => draw(), 2000);
        } })), el("p", { className: "fb no", textContent: fb }));
    };
    return draw();
  }

  if (kind === "wire") { // 3×4칸. 왼쪽 가운데 🔋 → 오른쪽 가운데 💡. 칸을 눌러 90°씩 돌림. 연결 = 비트(위1 오른쪽2 아래4 왼쪽8)
    const { grid, lit, rot } = wireBoard(r);
    const CH = { 5: "┃", 10: "━", 3: "┗", 6: "┏", 12: "┓", 9: "┛" };
    const draw = () => {
      const L = lit(grid);
      box.replaceChildren(...head(), el("p", { className: "sub", textContent: "책상 서랍에 손전등 전구가 달려 있다. 전선 조각을 눌러 돌려서 🔋에서 💡까지 이어 보자." }),
        el("div", { className: "wires" }, ...grid.flatMap((row, yy) => [el("span", { textContent: yy === 1 ? "🔋" : "" }),
          ...row.map((v, xx) => el("button", { className: "wire" + (L.on.has(xx + "," + yy) ? " on" : ""), textContent: CH[v] ?? "╋", ariaLabel: `전선 ${yy + 1}행 ${xx + 1}열 돌리기`,
            onclick: () => { grid[yy][xx] = rot(grid[yy][xx]); lit(grid).done ? win("💡 불이 켜졌다! 서랍 바닥에 뭔가 적혀 있다.") : draw(); } })),
          el("span", { className: "bulb" + (L.done ? "" : " off"), textContent: yy === 1 ? "💡" : "" })])));
    };
    return draw();
  }

  // picture: 3×3 조각을 두 개씩 눌러 자리를 바꿔 원래 그림으로
  const N = 3, P = 80, src = document.createElement("canvas"); src.width = src.height = N * P;
  const g = src.getContext("2d"), sky = g.createLinearGradient(0, 0, 0, N * P); sky.addColorStop(0, "#1b2a5a"); sky.addColorStop(1, "#6fa8dc");
  g.fillStyle = sky; g.fillRect(0, 0, N * P, N * P);
  g.fillStyle = "#ffd84a"; g.beginPath(); g.arc(45, 45, 30, 0, Math.PI * 2); g.fill();                    // 태양
  g.fillStyle = "#2e7dd1"; g.beginPath(); g.arc(150, 155, 62, 0, Math.PI * 2); g.fill();                  // 지구
  g.fillStyle = "#4caf50"; g.beginPath(); g.ellipse(130, 135, 26, 18, 0.6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(178, 178, 20, 12, -0.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#ffffffaa"; g.lineWidth = 6; g.beginPath(); g.arc(150, 155, 78, 0, Math.PI * 2); g.stroke(); // 대기
  g.strokeStyle = "#ff8a3d"; g.lineWidth = 5; g.beginPath(); g.moveTo(70, 60); g.lineTo(115, 105); g.stroke(); // 들어오는 햇빛
  g.fillStyle = "#fff"; g.font = "bold 26px sans-serif"; g.fillText("CO₂", 160, 60); g.fillText("CH₄", 20, 225);
  const pieces = Array.from({ length: N * N }, (_, i) => { const c = document.createElement("canvas"); c.width = c.height = P; c.getContext("2d").drawImage(src, (i % N) * P, Math.floor(i / N) * P, P, P, 0, 0, P, P); return c.toDataURL(); });
  let order; do order = shuffle([...Array(N * N).keys()], r); while (order.filter((v, i) => v === i).length > 1); // 제자리 조각은 많아야 1개
  let sel = null;
  const draw = () => {
    box.replaceChildren(...head(), el("p", { className: "sub", textContent: "책상 위 사진이 찢어져 있다. 조각 두 개를 차례로 누르면 자리가 바뀐다. 원래 그림으로 맞춰 보자." }),
      el("div", { className: "pic" }, ...order.map((p, i) => el("button", { className: "piece" + (sel === i ? " sel" : ""), ariaLabel: `조각 ${i + 1}`,
        style: `background-image:url(${pieces[p]})`, onclick: () => {
          if (sel == null) { sel = i; return draw(); }
          [order[sel], order[i]] = [order[i], order[sel]]; sel = null;
          order.every((v, k) => v === k) ? win("사진이 맞춰졌다! 뒷면에 글씨가 있다.") : draw();
        } }))));
  };
  draw();
}

// 전선판: 🔋(왼쪽 가운데)에서 💡(오른쪽 가운데)까지 겹치지 않는 길을 무작위로 만들고, 모든 칸을 아무렇게나 돌려 둠
const W_R = 3, W_C = 4, DIR = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]]; // dx, dy, 그쪽 비트, 반대쪽 비트
const rot = v => ((v << 1) | (v >> 3)) & 15; // 시계 방향 90°
export function lit(grid) { // 🔋에서 이어진 칸들, 💡까지 닿았는지
  const on = new Set(); let x = 0, y = 1, inn = 8, done = false;
  while (grid[y]?.[x] != null && (grid[y][x] & inn) && !on.has(x + "," + y)) {
    on.add(x + "," + y); const out = grid[y][x] ^ inn, d = DIR.find(([, , b]) => b === out); if (!d) break;
    if (x === W_C - 1 && y === 1 && out === 2) { done = true; break; }
    x += d[0]; y += d[1]; inn = d[3];
  }
  return { on, done };
}
export function wireBoard(r) {
  const seen = new Set(["0,1"]);
  const dfs = (x, y) => { // 방향은 무작위(가끔만 오른쪽 먼저) → 길이 구불구불
    if (x === W_C - 1 && y === 1) return [[x, y]];
    const dirs = shuffle(DIR, r); if (r() < 0.3) dirs.sort((a, b) => b[0] - a[0]);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (nx < 0 || nx >= W_C || ny < 0 || ny >= W_R || seen.has(k)) continue;
      seen.add(k); const rest = dfs(nx, ny); if (rest) return [[x, y], ...rest]; seen.delete(k);
    }
    return null;
  };
  const path = dfs(0, 1), grid = Array.from({ length: W_R }, () => Array(W_C).fill(0));
  const bit = (a, b) => DIR.find(([dx, dy]) => a[0] + dx === b[0] && a[1] + dy === b[1])[2];
  path.forEach((p, i) => { grid[p[1]][p[0]] = (i ? bit(p, path[i - 1]) : 8) | (i < path.length - 1 ? bit(p, path[i + 1]) : 2); });
  for (const row of grid) row.forEach((v, x) => { if (!v) row[x] = r() < 0.5 ? 5 : 3; }); // 길 밖 칸도 전선 조각(헷갈리게)
  for (const row of grid) row.forEach((v, x) => { for (let k = Math.floor(r() * 4); k > 0; k--) row[x] = rot(row[x]); });
  while (lit(grid).done) grid[1][0] = rot(grid[1][0]);
  return { grid, lit, rot };
}
