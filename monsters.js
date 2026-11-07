// 괴물 '보충쌤'. 등장 시각은 모든 기기가 같은 계산으로 알고(게임 시간 + 반의 씨앗값),
// 추격하는 20초 동안은 팀원 기기 한 대(방장)가 움직임을 계산해 서버에 올린다.
export const PLAYER_STEP_MS = 167; // 학생 걸음: 초당 약 6칸
export const STEP_MS = Math.round(PLAYER_STEP_MS / 1.2); // 학생보다 20% 빠름(139ms) — 책상을 빙빙 돌아도 결국 따라잡힘
export const RETARGET_MS = 500;   // 노리는 학생 위치를 0.5초마다 갱신 → 모퉁이에서 따돌릴 틈
export const DETECT = 6;          // 쫓던 학생을 놓친 순간 직선 6칸 안(벽 너머 O)의 학생을 알아챔
export const PATROL_DETECT = 8;   // 순찰 중엔 걸어서 8칸 안(벽 너머 X). 이 범위를 바닥에 빨갛게 보여 줌
export const PATROL_STEP_MS = 200; // 순찰할 때는 학생보다 느리게 걸음
export const WARN_MS = 2000, CHASE_MS = 20000, REST_MS = 180000;
// 난이도 '쉬움': 약 5분마다(2+12+286초) 12초만 추격
const TIMING = { easy: [12000, 286000] };
const SAFE_DIST = 4;              // 시작점 주변은 들어가지 않음
export const HIDE_WARN_MS = 45000, HIDE_MAX_MS = 60000;
export const HIDE_COOLDOWN_MS = 15000; // 사물함에서 나오면 15초 동안 다시 못 숨음(숨었다 나왔다 하며 괴물 유인 방지)

const rnd = s => { s = Math.imul(s ^ s >>> 16, 0x45d9f3b); s = Math.imul(s ^ s >>> 16, 0x45d9f3b); return ((s ^ s >>> 16) >>> 0) / 4294967296; };
export const firstAt = seed => 60000 + Math.floor(rnd(seed) * 60000); // 60~120초 사이

// 지금 괴물이 어떤 상태인지: { phase: "rest"|"warn"|"chase", n: 몇 번째 등장, left: 이 상태가 끝날 때까지 ms }
export function phaseAt(gameMs, seed, level) {
  const [chase, rest] = TIMING[level] ?? [CHASE_MS, REST_MS], CYCLE = WARN_MS + chase + rest;
  const t = gameMs - firstAt(seed);
  if (gameMs < 0 || t < 0) return { phase: "rest", n: -1, left: -t };
  const n = Math.floor(t / CYCLE), p = t % CYCLE;
  if (p < WARN_MS) return { phase: "warn", n, left: WARN_MS - p };
  if (p < WARN_MS + chase) return { phase: "chase", n, left: WARN_MS + chase - p, chase };
  return { phase: "rest", n, left: CYCLE - p };
}

const starts = new WeakMap(); // 지도마다 시작점(S)을 한 번만 찾음. S가 없는 층은 안전 구역 없음
const startOf = map => { if (!starts.has(map)) { const y = map.findIndex(r => r.includes("S")); starts.set(map, y < 0 ? null : [map[y].indexOf("S"), y]); } return starts.get(map); };
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
// 괴물이 갈 수 있는 칸: 벽·사물함·계단·보충실·잠긴 문·조소실이 아닌 칸, 현관(S) 안전 구역 밖. 교실 문(+)과 퍼즐 칸은 다님
export function monsterTile(map, x, y) {
  const c = map[y]?.[x], s = startOf(map);
  return c !== undefined && !"#DHSjGabcrCKRYVWXBTLmzQPEUFNO".includes(c) && (!s || Math.abs(x - s[0]) + Math.abs(y - s[1]) > SAFE_DIST); // m·z·Q: 조소 1·2실(보충쌤 못 들어감)
}
export const DOOR_WAIT_MS = 2000; // 문을 지나면 2초 뒤에 따라 들어옴
export const SEEK_MS = 1500;      // 사물함 앞에서 "어디에 숨었을까~" 하고 기다리는 시간
export const SEEK_DIST = 2;       // 이 거리 안에서 숨는 걸 보면 그 사물함을 열어 봄

// 등장 위치: 등장마다 8~10칸 중 하나를 무작위로 정해, 가장 가까운 학생과 딱 그 거리인 칸에 나타남.
// 그런 칸이 없으면 8~10칸 중 되는 거리로, 그래도 없으면 8칸 이상 아무 곳. n·seed로 정해져 방장이 바뀌어도 같음
export const SPAWN = [8, 10];
export const LOOK_MS = 1500; // 나타난 뒤 1.5초는 두리번거리기만(나타나자마자 덮치지 않게)
export function spawnTile(map, targets, seed, n) {
  const all = [];
  map.forEach((row, y) => [...row].forEach((_, x) => monsterTile(map, x, y) && all.push({ x, y })));
  const near = t => targets.length ? Math.min(...targets.map(p => dist(t, p))) : 99;
  const want = SPAWN[0] + Math.floor(rnd(seed * 17 + n * 389) * (SPAWN[1] - SPAWN[0] + 1)); // 8~10칸
  const pick = pool => pool[Math.floor(rnd(seed * 131 + n * 977) * pool.length)];
  for (const d of [want, SPAWN[0], SPAWN[0] + 1, SPAWN[1]]) { const pool = all.filter(t => near(t) === d); if (pool.length) return pick(pool); }
  const far = all.filter(t => near(t) >= SPAWN[0]);
  return pick(far.length ? far : all);
}

// 순찰 중 인식 범위: 괴물이 걸어서 8칸 안에 갈 수 있는 칸들(벽에 막히면 못 봄). Map("x,y" → 걸음 수)
let sightMemo = { k: "", v: null };
export function sightTiles(map, m, r = PATROL_DETECT) {
  const k = `${m.x},${m.y},${r}`;
  if (sightMemo.k === k && sightMemo.map === map) return sightMemo.v;
  const seen = new Map([[`${m.x},${m.y}`, 0]]), q = [[m.x, m.y, 0]];
  while (q.length) {
    const [x, y, d] = q.shift();
    if (d === r) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (seen.has(key) || !monsterTile(map, nx, ny)) continue;
      seen.set(key, d + 1); q.push([nx, ny, d + 1]);
    }
  }
  sightMemo = { k, v: seen, map };
  return seen;
}

// 괴물 m에서 표적 target 쪽으로 한 칸(최단 경로). 길이 없으면 제자리
export function stepToward(map, m, target) {
  if (!target || (m.x === target.x && m.y === target.y)) return { x: m.x, y: m.y };
  const key = (x, y) => y * 1000 + x, prev = new Map([[key(target.x, target.y), null]]);
  const q = [[target.x, target.y]]; // 표적에서 거꾸로 퍼져 나가 괴물에 닿으면 그 직전 칸이 다음 걸음
  const ok = (x, y) => monsterTile(map, x, y) || (x === target.x && y === target.y);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k)) continue;
      if (nx === m.x && ny === m.y) return { x, y };
      if (!ok(nx, ny)) continue;
      prev.set(k, true); q.push([nx, ny]);
    }
  }
  return { x: m.x, y: m.y };
}

// 노릴 수 있는 학생: 보충실에 없고, 안전 구역 밖. 사물함에 숨었으면 숨는 걸 들킨 경우(seen)만
const targetable = (map, p) => !p.jail && (map[p.y]?.[p.x] === "H" ? !!p.seen : monsterTile(map, p.x, p.y));
export function pickTarget(map, m, players) {
  return players.filter(p => targetable(map, p)).sort((a, b) => dist(m, a) - dist(m, b))[0] || null;
}

// 다음에 노릴 곳. cur = { id, x, y, at }. null이면 순찰.
// - 한 번 쫓기 시작한 학생은 숨거나 잡히거나 나갈 때까지 계속 쫓는다(0.5초마다 위치만 갱신 → 모퉁이에서 따돌릴 틈).
// - 쫓던 학생을 잃은 순간(추격 중)에는 벽 너머라도 직선 6칸 안의 학생을 알아챈다.
// - 순찰 중에는 걸어서 8칸 안(벽에 막히지 않은 곳)의 학생만 알아챈다. 아무도 없으면 순찰.
export function nextTarget(map, m, players, cur, now) {
  const live = cur && players.find(p => p.id === cur.id);
  // 옛 위치에 이미 도착했으면 0.5초를 기다리지 않고 바로 새 위치로(기다리면 제자리에 서서 추격이 끊겨 보임)
  if (live && targetable(map, live)) return now - cur.at < RETARGET_MS && (m.x !== cur.x || m.y !== cur.y) ? cur : { id: live.id, x: live.x, y: live.y, at: now };
  const sees = cur ? p => dist(m, p) <= DETECT : (vis => p => vis.has(`${p.x},${p.y}`))(sightTiles(map, m));
  const t = pickTarget(map, m, players.filter(sees));
  return t ? { id: t.id, x: t.x, y: t.y, at: now } : null;
}

// 순찰: 지금 방향(h: 0~3)으로 걷다가, 갈림길에서는 가끔 방향을 바꾸고, 막히면 되돌아간다. 시작점 안전 구역에는 들어가지 않음
const DIR4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export function patrolStep(map, m, h, random = Math.random) {
  const open = DIR4.map(([dx, dy], i) => monsterTile(map, m.x + dx, m.y + dy) ? i : -1).filter(i => i >= 0);
  if (!open.length) return { x: m.x, y: m.y, h };
  const back = (h + 2) % 4, side = open.filter(i => i !== h && i !== back);
  let nh = open.includes(h) && !(side.length && random() < 0.35) ? h // 대체로 직진, 갈림길에서 35% 확률로 꺾음
    : side.length ? side[Math.floor(random() * side.length)] : back;
  return { x: m.x + DIR4[nh][0], y: m.y + DIR4[nh][1], h: nh };
}

// 방장(괴물을 움직이는 기기). 방장은 움직일 때마다 by·t(시각)를 남긴다.
// 1.5초 동안 소식이 없으면(배터리 꺼짐 등) 접속 중인 팀원 순서대로 다음 기기가 이어받는다.
export const STALE_MS = 1500;
export function hostOf(mates, mon, now, since) {
  const ids = Object.keys(mates).filter(id => mates[id].online).sort();
  if (!ids.length) return null;
  if (mon && now - mon.t < STALE_MS && ids.includes(mon.by)) return mon.by;
  const k = Math.max(0, Math.floor((now - (mon?.t ?? since)) / STALE_MS)); // since: 이번 추격이 시작된 시각
  return ids[k % ids.length];
}

// 숨는 걸 본 사물함(tp가 H 위)을 찾아감: 떨어져 있으면 다가가며 "어디에 숨었을까~",
// 바로 옆에 오면 SEEK_MS 동안 두리번거린 뒤 "여기있네!" 하며 사물함 칸으로 들어감(= 잡힘). 아니면 null
export function seekStep(map, mon, tp, step, t) {
  if (!tp || map[tp.y]?.[tp.x] !== "H") return null;
  if (Math.abs(tp.x - mon.x) + Math.abs(tp.y - mon.y) > 1) return { step, say: "어디에 숨었을까~", s1: 0 };
  const s1 = mon.s1 || t;
  return t - s1 < SEEK_MS ? { step: { x: mon.x, y: mon.y, h: mon.h ?? 0 }, say: "어디에 숨었을까~", s1 }
    : { step: { x: tp.x, y: tp.y, h: mon.h ?? 0 }, say: "여기있네!", s1 };
}
// 문(+)으로 들어선 걸음이면 2초 동안 멈춤(그동안 안 보임) → 멈춤이 끝나는 시각, 아니면 0
export const doorWait = (map, from, to, t) => (from.x !== to.x || from.y !== to.y) && map[to.y]?.[to.x] === "+" ? t + DOOR_WAIT_MS : 0;
