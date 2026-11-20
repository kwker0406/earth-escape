// 걸어서 닿는지: 층마다 계단·현관·엘리베이터에서 출발해 걸을 수 있는 칸(잠긴 문은 열쇠가 있다고 보고 통과)으로 퍼짐.
// 퍼즐 칸과 모든 단서 칸이 '서 있을 수 있는 칸 + 상하좌우 1칸' 안에 있는지 확인
import { MAPS } from "../game/maps.js";
import { buildPuzzles, clueSpots } from "../game/puzzles.js";
const WALK = c => c && !"#DGjBTLHPEUFNO".includes(c) ; // 사물함 H는 숨기용이라 지나가는 길에서 뺌(사물함 안에서 조사하는 일은 없다고 봄)
let bad = 0;
for (const seed of [1, 7, 12345, 999]) for (const [code, no] of [["AAAA", 1], ["BCDE", 2], ["ZZZZ", 6]]) {
  const PZ = buildPuzzles(seed, code, no);
  MAPS.forEach((m, f) => {
    const start = []; m.forEach((row, y) => [...row].forEach((c, x) => { if ("SCKRVWXY".includes(c)) start.push([x, y]); }));
    const seen = new Set(start.map(p => p + "")), q = [...start];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (!seen.has(k) && WALK(m[ny]?.[nx])) { seen.add(k); q.push([nx, ny]); } } }
    const near = (x, y) => [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => seen.has((x + dx) + "," + (y + dy)));
    PZ.floors[f].forEach((pz, i) => { let ok = false; m.forEach((row, y) => [...row].forEach((c, x) => { if (c === String(i + 1) && near(x, y)) ok = true; })); if (!ok) { bad++; console.log("퍼즐 칸 못 감", f, pz.id); } });
    for (const c of clueSpots(seed, code, PZ.floors, f, m)) if (!near(c.x, c.y)) { bad++; console.log("단서 못 감", f, c.key, c.x, c.y, m[c.y][c.x]); }
  });
}
console.log(bad ? "문제 " + bad : "모든 퍼즐 칸·단서 칸에 걸어서 닿음");
// 숨는 사물함(H)은 모두 바로 옆에 바닥이 있어야 들어갈 수 있음(앞을 가구가 막으면 못 숨음)
{ const { MAPS: M } = await import("../game/maps.js"); let n = 0;
  M.forEach((m, f) => m?.forEach((r, y) => [...r].forEach((c, x) => { if (c !== "H") return; n++;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ".,mz".includes(m[y + dy]?.[x + dx] ?? "#"))) throw new Error(`막힌 사물함 ${f}층 (${x},${y})`); })));
  console.log("lockers reachable OK", n); }
