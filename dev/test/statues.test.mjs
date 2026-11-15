// 조소 1실 조각상 퍼즐: 입구에서 2실 문까지, 조각상 없이는 못 가고(밀어야 함), 밀면 갈 수 있음(최소 밀기 수 확인)
import assert from "node:assert";
import { MAPS } from "../game/maps.js";
const M = MAPS[1], H = M.length, W = M[0].length;
const door1 = (() => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M[y][x] === "+" && M[y][x + 1] === "m") return [x + 1, y]; })(); // 복도 문 안쪽 칸
const door2 = (() => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M[y][x] === "+" && M[y + 1]?.[x] === "m" && M[y - 1]?.[x] === "z") return [x, y + 1]; })(); // 2실 문 앞 칸
assert.ok(door1 && door2, "조소실 문을 못 찾음");
const floor = (x, y) => "mQ".includes(M[y]?.[x]);
const start = new Set(M.flatMap((r, y) => [...r].flatMap((c, x) => c === "Q" ? [`${x},${y}`] : [])));
const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const reach = (p, S) => { const seen = new Set([p + ""]), q = [p]; for (const [a, b] of q) for (const [dx, dy] of D) { const n = [a + dx, b + dy]; if (floor(...n) && !S.has(n + "") && !seen.has(n + "")) { seen.add(n + ""); q.push(n); } } return seen; };
function solve(S0) { // 너비 우선: (사람이 닿는 구역, 조각상 자리)
  const key = (p, S) => [...reach(p, S)].sort()[0] + "|" + [...S].sort().join(";");
  const dist = new Map([[key(door1, S0), 0]]), q = [[door1, S0]];
  for (const [p, S] of q) {
    const R = reach(p, S), d = dist.get(key(p, S));
    if (R.has(door2 + "")) return d;
    for (const s of S) { const [sx, sy] = s.split(",").map(Number);
      for (const [dx, dy] of D) if (R.has(`${sx - dx},${sy - dy}`) && floor(sx + dx, sy + dy) && !S.has(`${sx + dx},${sy + dy}`)) {
        const S2 = new Set(S); S2.delete(s); S2.add(`${sx + dx},${sy + dy}`); const k = key([sx, sy], S2);
        if (!dist.has(k)) { dist.set(k, d + 1); q.push([[sx, sy], S2]); } } }
  }
  return null;
}
assert.equal(start.size, 11, "조각상 11개");
const n = solve(start); assert.ok(n >= 12 && n <= 16, "최소 밀기 " + n);
assert.ok(!reach(door1, start).has(door2 + ""), "조각상을 안 밀어도 지나갈 수 있음");
// 2실: 입구에서 IPCC 퍼즐 칸(3)까지 z로 이어짐
const goal = (() => { for (let y = 0; y < H; y++) { const x = M[y].indexOf("3"); if (x >= 0) return [x, y]; } })();
const z = new Set([door2.map((v, i) => i ? v - 2 : v) + ""]), qz = [[door2[0], door2[1] - 2]];
for (const [a, b] of qz) for (const [dx, dy] of D) { const k = [a + dx, b + dy]; if ("z3".includes(M[k[1]]?.[k[0]]) && !z.has(k + "")) { z.add(k + ""); qz.push(k); } }
assert.ok(z.has(goal + ""), "2실 미로 끝에 닿지 못함");
console.log("statues OK: 최소", n, "번 밀기, 2실 미로", z.size, "칸");
