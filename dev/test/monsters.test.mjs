import assert from "node:assert";
import { phaseAt, firstAt, spawnTile, sightTiles, stepToward, pickTarget, nextTarget, patrolStep, monsterTile, hostOf, STEP_MS, PLAYER_STEP_MS, RETARGET_MS, DETECT, PATROL_DETECT } from "../game/monsters.js";
import { MAP, MAPS } from "../game/maps.js";
import { seekStep, doorWait, DOOR_WAIT_MS, SEEK_MS } from "../game/monsters.js";

// 속도: 학생보다 약 20% 빠름
const ratio = PLAYER_STEP_MS / STEP_MS; assert.ok(ratio > 1.18 && ratio < 1.22, "속도 비율 " + ratio);
// 일정: 첫 등장 60~120초, 예고 2초 → 추격 20초 → 쉼 3분
for (let s = 1; s < 500; s++) { const f = firstAt(s); assert.ok(f >= 60000 && f < 120000); }
const f = firstAt(42);
assert.equal(phaseAt(f - 1, 42).phase, "rest");
assert.equal(phaseAt(f, 42).phase, "warn");
assert.equal(phaseAt(f + 2000, 42).phase, "chase");
assert.equal(phaseAt(f + 21999, 42).phase, "chase");
assert.equal(phaseAt(f + 22000, 42).phase, "rest");
assert.deepEqual([phaseAt(f + 60000, 42).phase, phaseAt(f + 60000, 42).n], ["warn", 1]); // 1분마다
assert.equal(phaseAt(-1, 42).phase, "rest");
// 등장 위치(1층 실제 지도): 괴물이 갈 수 있는 칸, 같은 입력이면 같은 칸, 가장 가까운 학생과 8~10칸이 골고루
const F1a = MAPS[1], players = [{ x: 20, y: 56 }, { x: 60, y: 57 }], got = new Set();
assert.equal(PATROL_DETECT, 8);
for (let n = 0; n < 200; n++) {
  const t = spawnTile(F1a, players, 11, n), d = Math.min(...players.map(p => Math.abs(p.x - t.x) + Math.abs(p.y - t.y)));
  assert.ok(monsterTile(F1a, t.x, t.y)); assert.deepEqual(t, spawnTile(F1a, players, 11, n));
  assert.ok(d >= 8 && d <= 10, "등장 거리 " + d); got.add(d);
}
assert.deepEqual([...got].sort((a, b) => a - b), [8, 9, 10], "8~10칸이 골고루 나오지 않음");
// 순찰 인식(1층): 복도에서 걸어서 8칸까지, 9칸은 못 봄. 벽 너머 옆 교실(돌아가면 먼 곳)은 못 봄
assert.equal(nextTarget(F1a, { x: 20, y: 56 }, [{ id: "A", x: 28, y: 56 }], null, 0)?.id, "A", "8칸은 알아챔");
assert.equal(nextTarget(F1a, { x: 20, y: 56 }, [{ id: "A", x: 29, y: 56 }], null, 0), null, "9칸은 못 알아챔");
assert.equal(nextTarget(MAPS[2], { x: 24, y: 49 }, [{ id: "A", x: 28, y: 49 }], null, 0), null, "벽 너머 옆 교실은 못 봄");
{ const at2 = ch => { for (let y = 0; y < MAPS[2].length; y++) { const x = MAPS[2][y].indexOf(ch); if (x >= 0) return [x, y]; } };
  for (const ch of "DBPEUFNO") { const q = at2(ch); if (q) assert.ok(!monsterTile(MAPS[2], ...q), ch + " 가구를 지나감"); } }
// 순찰 인식 범위: 걸어서 6칸. 벽 너머(직선 2칸이지만 돌아가면 8칸)는 못 봄
const vis = sightTiles(MAP, { x: 2, y: 10 }, 6); // 작은 지도에서는 6칸으로 시험
assert.ok(vis.has("2,7") && vis.get("2,7") === 3, "열린 곳 3칸은 보여야 함");
assert.ok(!vis.has("2,12"), "벽 너머는 못 봐야 함");
assert.ok([...vis.values()].every(d => d <= 6));
assert.ok([...vis.keys()].every(k => { const [x, y] = k.split(",").map(Number); return monsterTile(MAP, x, y) || (x === 2 && y === 10); }));
assert.equal(nextTarget(MAP, { x: 2, y: 10 }, [{ id: "W", x: 2, y: 12 }], { id: "gone", x: 0, y: 0, at: 0 }, 0).id, "W", "추격 중(표적 잃은 순간)엔 벽 너머도 알아챔");

// 추격: 한 걸음씩 다가가 결국 따라잡음, 벽·사물함·안전 구역은 지나가지 않음
let m = { x: 11, y: 14 }; const target = { x: 3, y: 8 };
for (let i = 0; i < 60 && (m.x !== target.x || m.y !== target.y); i++) {
  const nx = stepToward(MAP, m, target);
  assert.equal(Math.abs(nx.x - m.x) + Math.abs(nx.y - m.y), 1, "한 칸씩");
  assert.ok(monsterTile(MAP, nx.x, nx.y) || (nx.x === target.x && nx.y === target.y));
  m = nx;
}
assert.deepEqual(m, target, "따라잡지 못함");
// 표적 고르기: 사물함에 숨은 학생·보충실 학생·안전 구역 학생은 제외
const H = (() => { for (let y in MAP) { const x = MAP[y].indexOf("H"); if (x >= 0) return { x, y: +y }; } })();
assert.equal(pickTarget(MAP, { x: 6, y: 8 }, [{ ...H }, { x: 1, y: 1 }, { x: 5, y: 8, jail: 99 }]), null);
assert.deepEqual(pickTarget(MAP, { x: 6, y: 8 }, [{ x: 3, y: 8 }, { x: 10, y: 10 }]), { x: 3, y: 8 });
// 방장: 접속 중인 uid 중 가장 작은 것
const mates = { b: { online: true }, a: { online: false }, c: { online: true } };
assert.equal(hostOf(mates, null, 1000, 1000), "b", "처음엔 접속 중인 uid 중 가장 작은 기기");
assert.equal(hostOf(mates, null, 2600, 1000), "c", "1.5초 동안 소식이 없으면 다음 기기");
assert.equal(hostOf(mates, { by: "c", t: 2700 }, 3000, 1000), "c", "이어받은 기기가 계속 담당");
assert.equal(hostOf(mates, { by: "c", t: 2700 }, 4300, 1000), "c", "c도 멈추면 순서대로 돌아감(k=1)");
assert.equal(hostOf(mates, { by: "a", t: 2900 }, 3000, 1000), "b", "접속 끊긴 기기의 기록은 무시");
assert.equal(hostOf({}, null, 0, 0), null);
// 표적: 한 번 쫓으면 숨을 때까지 계속(0.5초마다 위치 갱신), 잃으면 6칸 안에서만 새로 알아챔, 없으면 순찰(null)
const mon = { x: 6, y: 8 };
let cur = nextTarget(MAP, mon, [{ id: "A", x: 5, y: 8 }, { id: "B", x: 10, y: 10 }], null, 0); // 순찰 중: 보이는 학생 중 가장 가까운
assert.equal(cur.id, "A", "6칸 안의 가장 가까운 학생");
assert.deepEqual(nextTarget(MAP, mon, [{ id: "A", x: 4, y: 8 }], cur, 100), cur, "0.5초 안에는 처음 본 자리로");
assert.equal(nextTarget(MAP, { x: 5, y: 8 }, [{ id: "A", x: 4, y: 8 }], cur, 100).x, 4, "옛 자리에 도착하면 0.5초 전이라도 바로 새 위치로(제자리 멈춤 방지)");
const re = nextTarget(MAP, mon, [{ id: "A", x: 4, y: 8 }, { id: "B", x: 7, y: 8 }], cur, RETARGET_MS);
assert.deepEqual([re.id, re.x], ["A", 4], "더 가까운 학생이 있어도 쫓던 학생을 계속(위치만 갱신)");
assert.equal(nextTarget(MAP, mon, [{ id: "A", ...H }, { id: "B", x: 8, y: 10 }], cur, 100).id, "B", "숨으면 6칸 안의 다른 학생");
assert.equal(nextTarget(MAP, mon, [{ id: "A", ...H }, { id: "B", x: 11, y: 6 }], cur, 100), null, "숨었는데 6칸 안에 아무도 없으면 순찰");
assert.equal(nextTarget(MAP, mon, [{ id: "B", x: 11, y: 6 }], cur, 100), null, "표적이 나가도 6칸 밖이면 순찰");
assert.equal(DETECT, 6);
// 순찰: 한 칸씩, 괴물이 갈 수 있는 칸만, 지도를 고루 돌아다님, 막다른 길에서는 되돌아감
let seed = 1; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let pm = { x: 11, y: 14 }, h = 2; const visited = new Set();
for (let i = 0; i < 600; i++) {
  const nx = patrolStep(MAP, pm, h, rand);
  assert.equal(Math.abs(nx.x - pm.x) + Math.abs(nx.y - pm.y), 1, "순찰도 한 칸씩");
  assert.ok(monsterTile(MAP, nx.x, nx.y), "순찰이 벽·사물함·안전 구역에 들어감");
  pm = nx; h = nx.h; visited.add(nx.x + "," + nx.y);
}
assert.ok(visited.size > 40, "순찰 범위가 좁음: " + visited.size);
const dead = patrolStep(["#####", "#S#.#", "#####"].concat(Array(0)), { x: 3, y: 1 }, 0, rand);
assert.deepEqual([dead.x, dead.y], [3, 1], "갈 곳이 없으면 제자리");
console.log("monsters OK");

// 새 학교 지도: 괴물은 계단·보충실·사물함·잠긴 문·조소실에 못 들어가고, 교실 문(+)은 지나다님
const F1 = MAPS[2].map((r, y) => y === 58 ? r.slice(0, 12) + "H" + r.slice(13) : r); // 복도 (12,58)에 숨는 사물함을 둔 시험용 지도(실제 지도는 사물함을 줄여 위치가 바뀜)
const at = ch => { for (let y = 0; y < F1.length; y++) { const x = F1[y].indexOf(ch); if (x >= 0) return { x, y }; } };
for (const ch of "CKRVWXjGHa") { const p = at(ch); assert.ok(!monsterTile(F1, p.x, p.y), ch + " 칸에 괴물이 들어감"); }
for (const ch of "mzQ") { const y = MAPS[1].findIndex(r => r.includes(ch)); assert.ok(y >= 0 && !monsterTile(MAPS[1], MAPS[1][y].indexOf(ch), y), ch + " 조소실에 괴물이 들어감"); }
const door = { x: F1[54].indexOf("+"), y: 54 }; assert.ok(monsterTile(F1, door.x, door.y), "문을 못 지나감");
assert.equal(F1[door.y + 1][door.x], ".", "문 아래는 복도");
// 문으로 들어선 걸음이면 2초 멈춤, 제자리·문 아닌 칸은 0
assert.equal(DOOR_WAIT_MS, 2000);
assert.equal(doorWait(F1, { x: door.x, y: door.y + 1 }, door, 1000), 3000);
assert.equal(doorWait(F1, door, door, 1000), 0);
assert.equal(doorWait(F1, { x: door.x, y: door.y + 1 }, { x: door.x + 1, y: door.y + 1 }, 1000), 0);
// 숨는 걸 본 사물함: 들킨 학생(seen)만 표적이 됨. 복도 사물함 (12,70)
const L = { x: 12, y: 58 }; assert.equal(F1[58][12], "H");
assert.equal(pickTarget(F1, { x: 14, y: 57 }, [{ ...L }]), null, "들키지 않은 숨은 학생은 표적 아님");
assert.deepEqual(pickTarget(F1, { x: 14, y: 57 }, [{ ...L, seen: 1 }]), { ...L, seen: 1 });
// 찾아가는 순서: 멀면 다가가며 "어디에~", 옆이면 SEEK_MS 동안 멈췄다가 "여기있네!" 하고 사물함 칸으로
const go = { x: 13, y: 57, h: 0 };
assert.deepEqual(seekStep(F1, { x: 14, y: 57 }, L, go, 0), { step: go, say: "어디에 숨었을까~", s1: 0 });
let sk = seekStep(F1, { x: 13, y: 58 }, L, go, 5000);
assert.deepEqual([sk.step.x, sk.step.y, sk.say, sk.s1], [13, 58, "어디에 숨었을까~", 5000], "옆에 오면 멈춰서 두리번");
sk = seekStep(F1, { x: 13, y: 58, s1: 5000 }, L, go, 5000 + SEEK_MS);
assert.deepEqual([sk.step.x, sk.step.y, sk.say], [12, 58, "여기있네!"], "잠시 뒤 사물함을 엶");
assert.equal(seekStep(F1, { x: 14, y: 57 }, { x: 13, y: 57 }, go, 0), null, "숨지 않은 학생이면 보통 추격");
console.log("monsters(rooms) OK");
// 쉬움: 1분 30초마다 12초 추격
{ const f0 = firstAt(42);
  assert.equal(phaseAt(f0 + 2000, 42, "easy").phase, "chase"); assert.equal(phaseAt(f0 + 14000, 42, "easy").phase, "rest");
  assert.deepEqual([phaseAt(f0 + 90000, 42, "easy").phase, phaseAt(f0 + 90000, 42, "easy").n], ["warn", 1]);
  assert.equal(phaseAt(f0 + 21999, 42, "normal").phase, "chase", "보통·어려움은 20초 추격"); console.log("easy monster OK"); }
// 어려움 깜짝 등장: 퍼즐을 푼 시각(noise)부터 바로 경고 → 추격, 그 뒤 다시 1분마다. 번호는 정해진 등장과 겹치지 않음
{ const f0 = firstAt(42), nz = f0 + 30000, a = phaseAt(nz, 42, "hard", nz), b = phaseAt(nz + 2000, 42, "hard", nz), c = phaseAt(nz + 22000, 42, "hard", nz), d = phaseAt(nz + 60000, 42, "hard", nz);
  assert.deepEqual([a.phase, a.noise, b.phase, b.noise, c.phase, d.phase, d.noise], ["warn", 1, "chase", 1, "rest", "warn", undefined]);
  assert.ok(a.n !== phaseAt(nz, 42, "hard").n && d.n === a.n + 1, "깜짝 등장 번호");
  assert.equal(phaseAt(nz - 1, 42, "hard", nz).phase, phaseAt(nz - 1, 42, "hard").phase, "푼 시각 전에는 원래 일정");
  console.log("noise monster OK"); }

// ── 조소 2실 상주 보충쌤 ──
{
  const { mazeOf, mazeTile, mazeStep, MAZE_STEP_MS, MAZE_GUARD } = await import("../game/monsters.js");
  const M = MAPS[1], mz = mazeOf(M);
  assert.ok(mz && mz.guard.size > 0 && mazeTile(M, mz.home.x, mz.home.y), "미로·안전 구역·시작 칸");
  assert.ok(Math.abs(MAZE_STEP_MS - 209) <= 1, "학생 속도의 80%");
  let m = { ...mz.home, h: 0, tid: null }, r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3000; i++) { m = { ...m, ...mazeStep(M, m, [], rnd) }; assert.ok(mazeTile(M, m.x, m.y), "순찰 중 안전 구역·벽에 들어감"); }
  // 걸어서 2칸 안 학생만 알아챔
  const at = (k) => { const ks = [...mz.guard]; return ks; };
  const zs = []; M.forEach((row, y) => [...row].forEach((c, x) => { if (c === "z" && mazeTile(M, x, y)) zs.push({ x, y }); }));
  const a = zs.find(p => zs.some(q => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) === 1 && zs.some(w => Math.abs(w.x - q.x) + Math.abs(w.y - q.y) === 1 && (w.x !== p.x || w.y !== p.y))));
  const q1 = zs.find(q => Math.abs(q.x - a.x) + Math.abs(q.y - a.y) === 1);
  assert.equal(mazeStep(M, { ...a, h: 0, tid: null }, [{ id: "s", ...q1 }]).tid, "s", "1칸 앞 학생을 알아챔");
  const far = zs.find(q => Math.abs(q.x - a.x) + Math.abs(q.y - a.y) >= 8);
  assert.equal(mazeStep(M, { ...a, h: 0, tid: null }, [{ id: "s", ...far }]).tid, null, "멀리 있는 학생은 못 알아챔");
  assert.equal(mazeStep(M, { ...a, h: 0, tid: "s" }, [{ id: "s", ...far }]).tid, null, "5칸 넘게 벌어지면 놓침");
  // 목표 칸 안쪽(안전 구역)에 있는 학생은 쫓지 않음
  const [gx, gy] = [...mz.guard][0].split(",").map(Number);
  assert.equal(mazeStep(M, { ...a, h: 0, tid: "s" }, [{ id: "s", x: gx, y: gy }]).tid, null, "안전 구역 학생은 안 쫓음");
  console.log("maze monster OK: 안전 구역", mz.guard.size, "칸, 시작", mz.home);
}
