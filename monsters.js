// 괴물 위치 계산. 서버 없이 모든 기기가 같은 씨앗값·같은 게임 시간으로 계산하므로 모두 같은 괴물을 본다.
export const STEP_MS = 450;      // 괴물 한 칸 이동 시간(학생은 140ms)
export const WAVE_MS = 40000;    // 40초마다 사라졌다가 다른 곳에 다시 나타남
export const SAFE_MS = 900;      // 막 나타난 괴물은 잠깐 잡지 못함(눈앞에 나타나 바로 잡히는 일 방지)
const COUNT = 3, PATH = 40, SAFE_DIST = 4;

function rng(a) { // mulberry32
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

let cache = { key: null, paths: null };
function paths(seed, wave, map) {
  const key = `${seed}:${wave}`;
  if (cache.key === key) return cache.paths;
  let sx = 0, sy = 0;
  map.forEach((row, y) => { const x = row.indexOf("S"); if (x >= 0) { sx = x; sy = y; } });
  // 시작점 근처는 괴물이 들어가지 않는 안전 구역
  const ok = (x, y) => ".E".includes(map[y]?.[x] ?? "#") && Math.abs(x - sx) + Math.abs(y - sy) > SAFE_DIST;
  const tiles = [];
  map.forEach((row, y) => [...row].forEach((_, x) => ok(x, y) && tiles.push([x, y])));
  const out = [];
  for (let i = 0; i < COUNT; i++) {
    const r = rng(seed * 31 + wave * 7919 + i * 104729);
    let p = tiles[Math.floor(r() * tiles.length)], prev = null;
    const path = [p];
    while (path.length < PATH) {
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p[0] + dx, p[1] + dy]).filter(([x, y]) => ok(x, y));
      const fwd = nb.filter(q => !prev || q[0] !== prev[0] || q[1] !== prev[1]); // 되돌아가기는 막다른 길에서만
      const pick = (fwd.length ? fwd : nb)[Math.floor(r() * (fwd.length || nb.length))] ?? p;
      prev = p; p = pick; path.push(p);
    }
    out.push(path);
  }
  cache = { key, paths: out };
  return out;
}

// gameMs: 진행된 게임 시간(일시정지 동안은 멈춤). 반환: [{x, y, fresh}] — fresh면 아직 잡지 못함
export function monstersAt(gameMs, seed, map) {
  if (gameMs < 0) return [];
  const wave = Math.floor(gameMs / WAVE_MS), inWave = gameMs % WAVE_MS;
  const k = Math.floor(inWave / STEP_MS), cyc = 2 * PATH - 2, j = k % cyc;
  return paths(seed, wave, map).map(path => {
    const [x, y] = path[j < PATH ? j : cyc - j]; // 갔던 길을 되돌아오며 왕복
    return { x, y, fresh: inWave < SAFE_MS };
  });
}

// 내 칸에 막 나타난 괴물이 아닌 괴물이 있으면 잡힘
export const caught = (mons, x, y) => mons.some(m => !m.fresh && m.x === x && m.y === y);
