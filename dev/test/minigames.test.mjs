// 전선판: 항상 풀 수 있고(각 칸을 0~3번 돌려 💡까지 이어지는 조합이 있음), 처음엔 안 켜져 있음
import assert from "node:assert";
globalThis.document = { createElement: () => ({}) };
const { wireBoard, lit } = await import("../game/minigames.js");
const rot = v => ((v << 1) | (v >> 3)) & 15;
for (let s = 1; s <= 300; s++) {
  let a = s; const r = () => { a = Math.imul(a ^ a >>> 15, 0x2c1b3c6d) + 0x6d2b79f5 | 0; return ((a ^ a >>> 13) >>> 0) / 4294967296; };
  const { grid } = wireBoard(r);
  assert.ok(!lit(grid).done, "처음부터 켜져 있음");
  // 풀이 찾기: 칸마다 돌린 횟수 4^12 → 길 따라가며 깊이 우선(작은 판이라 충분히 빠름)
  const solve = (g, x = 0, y = 1, inn = 8, used = new Set()) => {
    if (x < 0 || x > 3 || y < 0 || y > 2 || used.has(x + "," + y)) return false;
    for (let k = 0; k < 4; k++) {
      const v = g[y][x]; if (v & inn) { const out = v ^ inn;
        if (x === 3 && y === 1 && out === 2) return true;
        const d = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]].find(([, , b]) => b === out);
        if (d) { used.add(x + "," + y); if (solve(g, x + d[0], y + d[1], d[3], used)) return true; used.delete(x + "," + y); } }
      g[y][x] = rot(g[y][x]);
    }
    return false;
  };
  assert.ok(solve(grid.map(row => [...row])), "풀 수 없는 판 " + s);
}
console.log("minigames OK");
