// 지도 도트 타일(32×32). 위에서 내려다보되 벽 앞면·책상 옆면·그림자를 그려 입체처럼 보이게 한다.
// 그림 파일 없이 코드로 점을 찍고, 같은 모양은 한 번만 만들어 기억해 둔다.
const S = 32, cache = new Map();
const WALL = "#", BOUND = "#+Gabcr", FURN = "DBTLH";
const hash = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;

function art(key, paint) {
  let cv = cache.get(key);
  if (!cv) {
    cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d");
    paint((x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, g);
    cache.set(key, cv);
  }
  return cv;
}

// 칸마다 바닥 종류: hall 복도, room 교실, lock 잠긴 방, jail 보충실, roof 옥상, maze 지하. 벽·문으로 나뉜 구역 단위로 정함
// 교실은 칠판이 있는 쪽(face: l·r·u·d)도 함께 기억 → 책상·의자가 칠판을 바라보게
const kinds = new WeakMap();
function kindsOf(map, f) {
  if (kinds.has(map)) return kinds.get(map);
  const W = map[0].length, H = map.length, out = new Array(W * H).fill("hall"), face = new Array(W * H).fill("l"), seen = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen[y * W + x] || BOUND.includes(map[y][x])) continue;
    const cells = [], boards = [], q = [[x, y]]; seen[y * W + x] = 1; let has = "";
    while (q.length) {
      const [a, b] = q.pop(); cells.push(b * W + a); const c = map[b][a]; if (!has.includes(c)) has += c;
      if (c === "B") boards.push([a, b]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = a + dx, ny = b + dy, ch = map[ny]?.[nx];
        if (ch && !BOUND.includes(ch) && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; q.push([nx, ny]); }
      }
    }
    const furn = /[DBTL]/.test(has), k = f === 0 ? "maze" : has.includes("j") ? "jail" : has.includes(",") ? (furn ? "lock" : "roof") : furn ? "room" : "hall";
    let fc = "l";
    if (boards.length) {
      const avg = (arr, j) => arr.reduce((t, p) => t + (j ? Math.floor(p / W) : p % W), 0) / arr.length;
      const dx = boards.reduce((t, p) => t + p[0], 0) / boards.length - avg(cells, 0), dy = boards.reduce((t, p) => t + p[1], 0) / boards.length - avg(cells, 1);
      fc = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "l" : "r") : (dy < 0 ? "u" : "d");
    }
    for (const i of cells) { out[i] = k; face[i] = fc; }
  }
  const res = { k: out, face }; kinds.set(map, res); return res;
}

function floor(kind, v, sh) { // v: 무늬 변화(0~3), sh: 그림자(1 위쪽 벽·가구, 2 왼쪽 벽)
  return art(`F${kind}${v}${sh}`, (r) => {
    if (kind === "hall") { // 복도: 베이지 리놀륨 바둑판
      for (let i = 0; i < 4; i++) r((i & 1) * 16, (i >> 1) * 16, 16, 16, ((i & 1) ^ (i >> 1)) ? "#b4ad9f" : "#c2bbad");
      r(0, 15, 32, 1, "#9f988b"); r(15, 0, 1, 32, "#9f988b"); r(0, 31, 32, 1, "#9f988b"); r(31, 0, 1, 32, "#9f988b");
      for (let i = 0; i < 5; i++) { const h = hash(v * 7 + i, i * 3); r(h % 30 + 1, (h >> 8) % 30 + 1, 1, 1, "#a8a194"); }
    } else if (kind === "roof") { // 옥상: 콘크리트
      r(0, 0, 32, 32, "#8e959c"); r(0, 31, 32, 1, "#767d84"); r(31, 0, 1, 32, "#767d84");
      for (let i = 0; i < 9; i++) { const h = hash(v * 11 + i, i * 5 + 1); r(h % 31, (h >> 8) % 31, 1 + (h >> 20) % 2, 1, (h >> 16) & 1 ? "#7f868d" : "#9ea5ac"); }
      if (v === 3) r(6, 20, 9, 4, "#7c8a86"); // 물 얼룩
    } else if (kind === "maze") { // 지하: 흙바닥과 자갈
      r(0, 0, 32, 32, "#5b4a3a");
      for (let i = 0; i < 10; i++) { const h = hash(v * 13 + i, i * 7 + 2); r(h % 30, (h >> 8) % 30, 2, 2, (h >> 16) & 1 ? "#4c3d30" : "#6b5946"); }
    } else { // 교실·잠긴 방·보충실: 아이보리 톤 밝은 테라코타 타일(16×16 네 장)
      const [a, b, grout, dot] = kind === "jail" ? ["#d9b1a0", "#d1a693", "#a87a68", "#c4957f"] : kind === "lock" ? ["#cfc6b8", "#c7bdae", "#a0968a", "#b8ae9f"]
        : ["#efdcc4", "#e8d2b6", "#c9a888", "#dcc0a0"];
      for (let i = 0; i < 4; i++) {
        const tx = (i & 1) * 16, ty = (i >> 1) * 16, h = hash(v * 5 + i, i);
        r(tx, ty, 16, 16, (h & 1) ? a : b);
        r(tx + 1, ty + 1, 14, 1, "rgba(255,255,255,0.25)");          // 유약 광
        r(tx + 2 + h % 10, ty + 4 + (h >> 8) % 9, 2, 1, dot);         // 흙 얼룩
      }
      r(0, 15, 32, 1, grout); r(15, 0, 1, 32, grout); r(0, 31, 32, 1, grout); r(31, 0, 1, 32, grout);
    }
    if (sh & 1) { r(0, 0, 32, 4, "rgba(0,0,0,0.28)"); r(0, 4, 32, 2, "rgba(0,0,0,0.12)"); }
    if (sh & 2) r(0, 0, 3, 32, "rgba(0,0,0,0.2)");
  });
}

function wall(face, edge, maze) { // face: 아래가 트여 앞면이 보임, edge: 트인 쪽(1 위 2 오른쪽 4 아래 8 왼쪽)
  return art(`W${face}${edge}${maze}`, (r) => {
    const top = maze ? "#2e2620" : "#2a2440", rim = maze ? "#4a3e33" : "#4b4468";
    r(0, 0, 32, 32, top);
    if (edge & 1) r(0, 0, 32, 2, rim); if (edge & 8) r(0, 0, 2, 32, rim); if (edge & 2) r(30, 0, 2, 32, rim);
    if (!face) return;
    if (maze) { // 바위 앞면
      r(0, 10, 32, 22, "#4a3e33"); for (let i = 0; i < 6; i++) r((i * 11) % 28, 12 + (i * 7) % 16, 6, 4, i & 1 ? "#3e332a" : "#56493c");
      r(0, 10, 32, 1, "#62533f"); return;
    }
    r(0, 8, 32, 1, rim);                // 벽 윗면 모서리
    r(0, 9, 32, 13, "#ddd3bd");         // 회벽
    r(0, 9, 32, 1, "#efe6d2");
    r(0, 22, 32, 8, "#6d8a6c");         // 아래쪽 판벽(초록)
    r(0, 22, 32, 1, "#86a585"); r(0, 30, 32, 2, "#3e4f3e"); // 걸레받이
    for (const x of [7, 23]) r(x, 23, 1, 7, "#5b765a");
  });
}

// 학생 책상 + 의자(1칸). face: 칠판 쪽. 칠판이 왼쪽이면 의자는 오른쪽, 칠판이 위쪽이면 의자는 아래쪽
function seat(face) {
  return art(`P${face}`, (r, g) => {
    if (face === "r") { g.translate(S, 0); g.scale(-1, 1); }
    const top = "#d6ad75", hi = "#ecc893", side = "#9c6a3b", line = "#5a3a1e", chair = "#5f7fa8", chairD = "#3d5578", chairH = "#86a4c8";
    if (face === "u" || face === "d") { // 칠판이 위: 위쪽에 책상, 아래쪽에 의자(등받이가 맨 아래)
      r(4, 23, 24, 2, "rgba(0,0,0,0.2)");
      r(10, 17, 12, 8, chair); r(10, 17, 12, 1, chairH); r(10, 24, 12, 1, chairD); // 앉는 판
      r(9, 25, 14, 4, chairD); r(9, 25, 14, 1, chairH);                         // 등받이
      r(3, 14, 26, 3, "rgba(0,0,0,0.22)");
      r(3, 2, 26, 10, top); r(3, 2, 26, 1, line); r(4, 3, 24, 1, hi); r(3, 2, 1, 10, line); r(28, 2, 1, 10, line);
      r(3, 12, 26, 3, side); r(3, 15, 26, 1, line); r(4, 16, 2, 2, line); r(26, 16, 2, 2, line);
      r(9, 4, 8, 6, "#f2efe6"); r(9, 4, 8, 1, "#9aa6c8"); r(19, 6, 6, 1, "#d84a3a");
      return;
    }
    // 칠판이 왼쪽: 왼쪽에 책상, 오른쪽에 의자(등받이가 맨 오른쪽)
    r(21, 26, 10, 3, "rgba(0,0,0,0.2)");
    r(20, 10, 8, 13, chair); r(20, 10, 8, 1, chairH); r(20, 22, 8, 1, chairD);    // 앉는 판
    r(27, 7, 3, 19, chairD); r(27, 7, 1, 19, chairH);                             // 등받이
    r(20, 23, 2, 4, chairD); r(25, 23, 2, 4, chairD);                             // 의자 다리
    r(3, 27, 15, 3, "rgba(0,0,0,0.22)");
    r(3, 4, 15, 18, top); r(3, 4, 15, 1, line); r(4, 5, 13, 1, hi); r(3, 4, 1, 18, line); r(17, 4, 1, 18, line);
    r(3, 22, 15, 4, side); r(3, 26, 15, 1, line); r(4, 27, 2, 3, line); r(15, 27, 2, 3, line);
    r(6, 8, 7, 9, "#f2efe6"); r(6, 8, 1, 9, "#9aa6c8"); r(9, 18, 6, 1, "#d84a3a");  // 공책(칠판 쪽으로 펼침)과 연필
  });
}

function desk(m, teacher) { // 교탁·큰 실험 책상. m: 같은 가구가 붙은 쪽(1 위 2 오른쪽 4 아래 8 왼쪽) → 이어서 그림
  return art(`D${m}${teacher}`, (r) => {
    const [top, hi, face, line] = teacher ? ["#8d5a33", "#a56d42", "#5c381c", "#2e1a0c"] : ["#d6ad75", "#ecc893", "#9c6a3b", "#5a3a1e"];
    const n = m & 1, e = m & 2, s = m & 4, w = m & 8;
    const x0 = w ? 0 : 3, x1 = e ? 32 : 29, y0 = n ? 0 : 4, y1 = s ? 32 : 21;
    if (!s) r(x0 + 2, 28, x1 - x0 - 4, 3, "rgba(0,0,0,0.25)"); // 바닥 그림자
    r(x0, y0, x1 - x0, y1 - y0, top);
    if (!n) { r(x0, y0, x1 - x0, 1, line); r(x0 + (w ? 0 : 1), y0 + 1, x1 - x0 - (w ? 0 : 1) - (e ? 0 : 1), 1, hi); }
    if (!w) r(x0, y0, 1, y1 - y0, line);
    if (!e) r(x1 - 1, y0, 1, y1 - y0, line);
    if (!s) { // 앞면과 다리
      r(x0, y1, x1 - x0, 5, face); r(x0, y1 + 5, x1 - x0, 1, line);
      if (!w) r(x0 + 1, y1 + 6, 3, 4, line);
      if (!e) r(x1 - 4, y1 + 6, 3, 4, line);
      if (teacher) r(x0 + 3, y1 + 1, x1 - x0 - 6, 3, "#4a2c14"); // 교탁 앞판
    }
  });
}

function board(m, v) { // 칠판: 나무 틀 + 짙은 초록 판 + 분필 글씨 + 분필 받침. 이어진 쪽으로 길게, 칸마다 글씨가 다름
  return art(`B${m}${v}`, (r, g) => {
    const vert = (m & 5) || !(m & 10), n = m & 1, s2 = m & 4, e = m & 2, w = m & 8;
    if (!vert) { g.translate(S, 0); g.rotate(Math.PI / 2); } // 가로 칠판은 세로 칠판을 돌려서
    const a = vert ? n : e, b = vert ? s2 : w;                 // 칠판의 두 끝(이어지면 틀 없음). 돌리면 오른쪽 끝이 위로 감
    const y0 = a ? 0 : 3, y1 = b ? 32 : 29;
    r(4, y0, 4, y1 - y0, "rgba(0,0,0,0.25)");                   // 벽에 진 그림자
    r(6, y0, 18, y1 - y0, "#7a5230"); r(6, y0, 1, y1 - y0, "#4a2e16"); r(23, y0, 1, y1 - y0, "#4a2e16"); // 나무 틀
    if (!a) { r(6, y0, 18, 3, "#7a5230"); r(6, y0, 18, 1, "#a8784a"); }
    if (!b) r(6, y1 - 3, 18, 3, "#7a5230");
    const by0 = a ? 0 : y0 + 3, by1 = b ? 32 : y1 - 3;
    r(8, by0, 14, by1 - by0, "#1f3d2c"); r(9, by0, 1, by1 - by0, "#2c5240");   // 판 + 빛 반사
    const h = hash(m, v * 7 + 3);
    for (let i = 0; i < 4; i++) { const yy = by0 + 3 + i * 6; if (yy + 1 < by1) r(11 + (h >> i) % 3, yy, 4 + (h >> (i + 4)) % 6, 1, "#dfe8df"); } // 분필 글씨 줄
    if (v === 1) { r(12, by0 + 10, 7, 7, "#1f3d2c"); r(12, by0 + 10, 7, 1, "#f0e6a0"); r(12, by0 + 16, 7, 1, "#f0e6a0"); r(12, by0 + 10, 1, 7, "#f0e6a0"); r(18, by0 + 10, 1, 7, "#f0e6a0"); } // 노란 분필 그림
    r(24, y0, 4, y1 - y0, "#9a7048"); r(27, y0, 1, y1 - y0, "#5a3a1e");      // 분필 받침
    if (v === 2) { r(24, 9, 3, 2, "#ffffff"); r(24, 13, 3, 2, "#f2c84a"); r(24, 17, 3, 5, "#3a3a46"); } // 분필·지우개
  });
}

function locker(m, hide) { // 교실 사물함(L)과 숨을 수 있는 사물함(H)
  return art(`L${m}${hide}`, (r) => {
    const [body, dark, hi] = hide ? ["#c08a4a", "#6e4a22", "#dcae72"] : ["#6c7b93", "#3c4558", "#8d9bb2"];
    const n = m & 1, s = m & 4, x0 = 3, x1 = 29, y0 = n ? 0 : 2, y1 = s ? 32 : 28;
    if (!s) r(x0 + 1, 29, x1 - x0 - 2, 3, "rgba(0,0,0,0.25)");
    r(x0, y0, x1 - x0, y1 - y0, body); r(x0, y0, 1, y1 - y0, dark); r(x1 - 1, y0, 1, y1 - y0, dark);
    if (!n) { r(x0, y0, x1 - x0, 1, dark); r(x0 + 1, y0 + 1, x1 - x0 - 2, 2, hi); }
    if (!s) r(x0, y1 - 1, x1 - x0, 1, dark);
    r(15, y0 + 1, 1, y1 - y0 - 2, dark);                          // 문 두 짝
    for (const vy of [6, 9, 12]) { r(6, vy, 6, 1, dark); r(19, vy, 6, 1, dark); } // 통풍구
    r(12, 17, 2, 4, "#e8e2d0"); r(18, 17, 2, 4, "#e8e2d0");      // 손잡이
    if (hide) { r(15, y0 + 1, 2, y1 - y0 - 2, "#2a1a0a"); r(13, 23, 6, 2, "#fff2b0"); } // 살짝 열린 틈과 표시
  });
}

function door(vert, kind) { // vert: 좌우로 통하는 문(세로 벽). kind: + 교실 문, a·b·c 열쇠 문, r 옥상 문, G 보충실 문
  return art(`O${vert}${kind}`, (r) => {
    const panel = kind === "G" ? "#8a2a2a" : kind === "r" ? "#8a929c" : "abc".includes(kind) ? "#6a5a7a" : "#9c6b3c";
    const frame = "#3e2a18", glass = kind === "G" ? "#2a1010" : "#a9d3e6";
    if (vert) { // 세로 벽(복도 옆)의 문: 위에서 보면 벽 줄을 따라 선 얇은 문짝. 위아래는 벽 끝(문설주), 양옆은 문턱
      r(0, 0, 32, 32, "#8b6a4a"); r(0, 0, 32, 32, "rgba(0,0,0,0.15)");      // 나무 문턱
      r(10, 0, 12, 4, "#2a2440"); r(10, 28, 12, 4, "#2a2440"); r(10, 3, 12, 1, "#4b4468"); r(10, 28, 12, 1, "#4b4468"); // 문설주
      r(12, 4, 8, 24, panel); r(12, 4, 1, 24, "#00000055"); r(19, 4, 1, 24, "#ffffff33"); // 문짝(두께)
      r(14, 8, 4, 7, glass); r(14, 8, 4, 1, frame);                         // 문 유리(좁게)
      if (kind === "G") for (const y of [9, 12]) r(14, y, 4, 1, "#5a5a60");
      r(10, 18, 2, 3, "#f0d27a"); r(20, 18, 2, 3, "#f0d27a");               // 양쪽 손잡이
      if ("abc".includes(kind)) r(12, 21, 8, 3, "#c8c8d0");
      r(0, 30, 32, 2, "rgba(0,0,0,0.25)");
      return;
    }
    r(0, 0, 32, 32, frame); r(0, 0, 32, 2, "#4b4468");
    r(4, 3, 24, 29, panel); r(4, 3, 24, 1, "#c8a070");
    r(8, 7, 16, 9, frame); r(9, 8, 14, 7, glass);                  // 문 유리창
    if (kind === "G") for (const x of [11, 15, 19]) r(x, 8, 1, 7, "#5a5a60"); // 쇠창살
    r(8, 19, 16, 1, frame); r(8, 25, 16, 1, frame);
    r(23, 20, 2, 3, "#f0d27a");                                     // 손잡이
    if ("abc".includes(kind)) r(21, 18, 5, 6, "#c8c8d0");           // 자물쇠 판
  });
}

// 계단 2×2칸을 64×64 한 장으로 그리고 칸마다 4분의 1씩 씀 → 화살표는 계단마다 하나.
// 들어오는 쪽(from: 0 아래에서, 1 위에서)을 기준으로, 올라가는 계단은 멀어질수록 밝고 단마다 앞면(챌판)이 보이며,
// 내려가는 계단은 멀어질수록 어둡고 단 끝 너머로 그림자가 진다
function stairs(up, from, qx, qy) {
  return art(`S${up}${from}${qx}${qy}`, (r, g) => {
    g.translate(-qx * S, -qy * S);
    if (from) { g.translate(0, 2 * S); g.scale(1, -1); }       // 위에서 들어오면 위아래를 뒤집어 그림
    const N = 8, H = 64 / N;
    for (let i = 0; i < N; i++) {                              // i=0이 가장 먼 단(화면 위쪽)
      const t = i / (N - 1), y = i * H;
      if (up) {
        const L = Math.round(225 - t * 60), tread = `rgb(${L},${L - 6},${L - 18})`, riser = `rgb(${L - 70},${L - 74},${L - 84})`;
        r(0, y, 64, H - 3, tread); r(0, y, 64, 1, `rgb(${L + 15},${L + 10},${L})`); r(0, y + H - 3, 64, 3, riser);
      } else {
        const L = Math.round(90 + t * 110), tread = `rgb(${L},${L - 6},${L - 18})`;
        r(0, y, 64, H, tread); r(0, y, 64, 2, `rgba(0,0,0,${0.45 - t * 0.3})`); r(0, y + H - 1, 64, 1, `rgb(${L + 25},${L + 20},${L + 10})`); // 단 끝 모서리(밝음)
      }
    }
    if (!up) { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    r(0, 0, 3, 64, "#4a4458"); r(61, 0, 3, 64, "#4a4458"); r(3, 0, 1, 64, "#6a6480"); // 양옆 난간
    if (from) { g.translate(0, 2 * S); g.scale(1, -1); }       // 화살표는 뒤집지 않고 위(올라감)·아래(내려감)로
    const ac = up ? "#ffd84a" : "#7fc4ff", dk = "#2a2438", ay = up ? 18 : 46, d = up ? 1 : -1;
    for (let k = 0; k < 8; k++) { r(32 - k - 1, ay + d * k - 1, 2 * k + 4, 3, dk); }
    for (let k = 0; k < 8; k++) { r(32 - k, ay + d * k, 2 * k + 2, 2, ac); }
    r(28, ay + d * 8, 8, d * 16, dk); r(29, ay + d * 8, 6, d * 15, ac);
  });
}

const elevator = () => art("Y", (r) => {
  r(0, 0, 32, 32, "#5c6470"); r(2, 4, 28, 28, "#a8b1bb"); r(15, 4, 2, 28, "#5c6470");
  r(2, 4, 28, 1, "#d0d7de"); r(13, 1, 6, 2, "#ffcc4a");           // 층 표시등
  r(26, 14, 2, 4, "#e05050");
});

const mat = () => art("M", (r) => { // 현관 매트
  r(3, 5, 26, 22, "#7a2e2a"); r(3, 5, 26, 1, "#a8473f"); for (let y = 9; y < 26; y += 4) r(5, y, 22, 1, "#5e221f");
});

const FURN_M = (map, x, y, set) => [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]].reduce((m, [dx, dy, b]) => set.includes(map[y + dy]?.[x + dx]) ? m | b : m, 0);

// 한 칸 그리기: 바닥 → 그 위의 물건(가구·계단·문) 순서
export function drawTile(ctx, map, f, x, y, px, py, T) {
  const c = map[y][x], K = kindsOf(map, f), k = K.k[y * map[0].length + x], put = cv => ctx.drawImage(cv, px, py, T + 1, T + 1);
  if (c === WALL) {
    const below = map[y + 1]?.[x], edge = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]].reduce((m, [dx, dy, b]) => { const n = map[y + dy]?.[x + dx]; return n && n !== WALL ? m | b : m; }, 0);
    return put(wall(below && below !== WALL && !BOUND.includes(below) ? 1 : 0, edge, f === 0 ? 1 : 0)); // 아래가 문이면(세로 벽의 문) 앞면 없음
  }
  if (BOUND.includes(c)) return put(door(map[y][x - 1] !== WALL && map[y][x + 1] !== WALL ? 1 : 0, c));
  if (c === "Y") return put(elevator());
  const up = map[y - 1]?.[x], left = map[y]?.[x - 1];
  const sh = (up === WALL || FURN.includes(up ?? "") ? 1 : 0) | (left === WALL ? 2 : 0);
  put(floor(k, hash(x, y) & 3, FURN.includes(c) || "CKRVWX".includes(c) ? 0 : sh));
  if (c === "D") { const dm = FURN_M(map, x, y, "D"); put(dm ? desk(dm, 0) : seat(K.face[y * map[0].length + x])); } // 1칸 책상은 의자와 함께
  else if (c === "T" || (/\d/.test(c) && FURN_M(map, x, y, "T"))) put(desk(FURN_M(map, x, y, "T0123456789"), 1)); // 교탁 위 퍼즐 칸도 교탁으로
  else if (c === "B") put(board(FURN_M(map, x, y, "B"), hash(x, y) % 3));
  else if (c === "L" || c === "H") put(locker(FURN_M(map, x, y, "LH"), c === "H" ? 1 : 0));
  else if ("CKRVWX".includes(c)) { // 2×2 계단에서 이 칸의 자리(왼쪽 위·오른쪽 위·…)와 들어오는 쪽
    const qx = map[y][x - 1] === c ? 1 : 0, qy = map[y - 1]?.[x] === c ? 1 : 0, top = y - qy;
    put(stairs("CKR".includes(c) ? 1 : 0, map[top - 1]?.[x] === "." ? 1 : 0, qx, qy));
  }
  else if (c === "S") put(mat());
}
