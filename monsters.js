// 괴물 '보충쌤'. 등장 시각은 모든 기기가 같은 계산으로 알고(게임 시간 + 반의 씨앗값),
// 추격하는 20초 동안은 팀원 기기 한 대(방장)가 움직임을 계산해 서버에 올린다.
export const PLAYER_STEP_MS = 140;
export const STEP_MS = Math.round(PLAYER_STEP_MS / 1.1); // 학생보다 10% 빠름(127ms)
export const RETARGET_MS = 500;   // 노리는 학생 위치를 0.5초마다 갱신 → 모퉁이에서 따돌릴 틈
export const DETECT = 6;          // 알아채는 거리 6칸. 순찰 중엔 걸어서 6칸(벽 너머 X), 추격 중엔 직선 6칸(벽 너머 O)
export const PATROL_STEP_MS = 200; // 순찰할 때는 학생보다 느리게 걸음
export const WARN_MS = 2000, CHASE_MS = 20000, REST_MS = 180000;
const CYCLE = WARN_MS + CHASE_MS + REST_MS;
const SAFE_DIST = 4;              // 시작점 주변은 들어가지 않음
export const HIDE_WARN_MS = 45000, HIDE_MAX_MS = 60000;
export const HIDE_COOLDOWN_MS = 15000; // 사물함에서 나오면 15초 동안 다시 못 숨음(숨었다 나왔다 하며 괴물 유인 방지)

const rnd = s => { s = Math.imul(s ^ s >>> 16, 0x45d9f3b); s = Math.imul(s ^ s >>> 16, 0x45d9f3b); return ((s ^ s >>> 16) >>> 0) / 4294967296; };
export const firstAt = seed => 60000 + Math.floor(rnd(seed) * 60000); // 60~120초 사이

// 지금 괴물이 어떤 상태인지: { phase: "rest"|"warn"|"chase", n: 몇 번째 등장, left: 이 상태가 끝날 때까지 ms }
export function phaseAt(gameMs, seed) {
  const t = gameMs - firstAt(seed);
  if (gameMs < 0 || t < 0) return { phase: "rest", n: -1, left: -t };
  const n = Math.floor(t / CYCLE), p = t % CYCLE;
  if (p < WARN_MS) return { phase: "warn", n, left: WARN_MS - p };
  if (p < WARN_MS + CHASE_MS) return { phase: "chase", n, left: WARN_MS + CHASE_MS - p };
  return { phase: "rest", n, left: CYCLE - p };
}

const startOf = map => { for (let y = 0; y < map.length; y++) { const x = map[y].indexOf("S"); if (x >= 0) return [x, y]; } };
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
// 괴물이 갈 수 있는 칸: 바닥·출구(사물함·문·벽은 못 들어감), 시작점 안전 구역 밖
export function monsterTile(map, x, y) {
  const [sx, sy] = startOf(map);
  return ".E".includes(map[y]?.[x] ?? "#") && Math.abs(x - sx) + Math.abs(y - sy) > SAFE_DIST;
}

// 등장 위치: 등장마다 5~8칸 중 하나를 무작위로 정해, 가장 가까운 학생과 딱 그 거리인 칸에 나타남.
// 그런 칸이 없으면 5~8칸 중 되는 거리로, 그래도 없으면 5칸 이상 아무 곳. n·seed로 정해져 방장이 바뀌어도 같음
export function spawnTile(map, targets, seed, n) {
  const all = [];
  map.forEach((row, y) => [...row].forEach((_, x) => monsterTile(map, x, y) && all.push({ x, y })));
  const near = t => targets.length ? Math.min(...targets.map(p => dist(t, p))) : 99;
  const want = 5 + Math.floor(rnd(seed * 17 + n * 389) * 4);
  const pick = pool => pool[Math.floor(rnd(seed * 131 + n * 977) * pool.length)];
  for (const d of [want, 5, 6, 7, 8]) { const pool = all.filter(t => near(t) === d); if (pool.length) return pick(pool); }
  const far = all.filter(t => near(t) >= 5);
  return pick(far.length ? far : all);
}

// 순찰 중 인식 범위: 괴물이 걸어서 6칸 안에 갈 수 있는 칸들(벽에 막히면 못 봄). Map("x,y" → 걸음 수)
let sightMemo = { k: "", v: null };
export function sightTiles(map, m, r = DETECT) {
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

// 노릴 수 있는 학생: 보충실에 없고, 사물함에 숨지 않았고, 안전 구역 밖
const targetable = (map, p) => !p.jail && map[p.y]?.[p.x] !== "H" && monsterTile(map, p.x, p.y);
export function pickTarget(map, m, players) {
  return players.filter(p => targetable(map, p)).sort((a, b) => dist(m, a) - dist(m, b))[0] || null;
}

// 다음에 노릴 곳. cur = { id, x, y, at }. null이면 순찰.
// - 한 번 쫓기 시작한 학생은 숨거나 잡히거나 나갈 때까지 계속 쫓는다(0.5초마다 위치만 갱신 → 모퉁이에서 따돌릴 틈).
// - 쫓던 학생을 잃은 순간(추격 중)에는 벽 너머라도 직선 6칸 안의 학생을 알아챈다.
// - 순찰 중에는 걸어서 6칸 안(벽에 막히지 않은 곳)의 학생만 알아챈다. 아무도 없으면 순찰.
export function nextTarget(map, m, players, cur, now) {
  const live = cur && players.find(p => p.id === cur.id);
  if (live && targetable(map, live)) return now - cur.at < RETARGET_MS ? cur : { id: live.id, x: live.x, y: live.y, at: now };
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
