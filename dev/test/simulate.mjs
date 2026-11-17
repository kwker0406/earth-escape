// 한 판 시뮬레이션(추정 모형). 실제 지도·퍼즐·단서 위치로 걷는 거리를 재고, 실력별로 생각 시간·오답·길 헤맴·보충쌤 위험을 가정해 몬테카를로로 돌린다.
// 실행: node test/simulate.mjs  (가정값은 아래 SKILL 표. 실제 수업 기록이 생기면 이 값을 고쳐 맞춘다)
const { MAPS } = await import(process.env.MAPS_FILE ?? "../game/maps.js"); // 지도 비교용: MAPS_FILE=다른 maps.js
import { buildPuzzles, clueSpots, clueOwner, miniGameOf } from "../game/puzzles.js";
import { firstAt } from "../game/monsters.js";

const ENGAGE = !!process.env.ENGAGE; // ENGAGE=1: 5명 팀(낮음 2·중간 2·높음 1) 4팀의 사람별 활동·기다림·보충실 시간을 냄
const SPEED = 6, TEAM = ENGAGE ? 5 : 4, LIMIT = 40 * 60, RUNS = 2000, JAIL = 30;
let PAR = 1; // 1: 퍼즐을 한 번에 하나씩, 0.65: 같은 층 퍼즐을 팀원이 나눠 동시에 풂(생각·맞춰 보기 시간이 겹침)
const SKILL = {
  "텅텅 조": { think: 2.4, pWrong: 0.6, walk: 2.3, talk: 80, move: 50, caught: 0.35, quiz: 0.45, hide: 12 },
  "중간 조": { think: 1.4, pWrong: 0.35, walk: 1.7, talk: 40, move: 30, caught: 0.2, quiz: 0.7, hide: 8 },
  "우수 조": { think: 0.8, pWrong: 0.15, walk: 1.3, talk: 20, move: 20, caught: 0.1, quiz: 0.9, hide: 6 },
  // 섞인 조(우수 1·중간 1·텅텅 2): 생각은 우수 학생이 이끌고(think·오답은 우수~중간), 단서 줍기·이동은 텅텅 학생도 잘함(선생님 관찰, walk·move는 중간 수준),
  // 단서를 말로 전하느라 대화 시간이 조금 늘고(talk), 잡히는 건 텅텅 학생이 조금 더(caught·quiz)
  "섞인 조": { think: 1.0, pWrong: 0.22, walk: 1.5, talk: 45, move: 30, caught: 0.22, quiz: 0.65, hide: 8 },
};
// 사람별 가정(ENGAGE): walk 길 헤맴 배수(선생님 관찰: 수준 낮은 학생도 단서는 잘 주움 → 중간과 같게), mini 책상 미니게임 배수,
// eThink·eWrong 팀이 퍼즐을 생각할 때·틀려서 다시 볼 때 그 학생이 실제로 머리를 쓰고 있을 비율, eSoko 조각상 밀기에 끼는 비율, caught·quiz 잡힐 확률·보충실 문제 정답률, maze 미로에서 잡힐 확률
const IND = {
  L: { walk: 1.7, mini: 2.0, eThink: 0.35, eWrong: 0.2, eSoko: 0.4, caught: 0.3, quiz: 0.45, maze: 0.45 },
  M: { walk: 1.6, mini: 1.4, eThink: 0.65, eWrong: 0.5, eSoko: 0.7, caught: 0.2, quiz: 0.7, maze: 0.3 },
  H: { walk: 1.3, mini: 0.8, eThink: 1.0, eWrong: 0.9, eSoko: 1.0, caught: 0.1, quiz: 0.9, maze: 0.2 },
};
const ROLES = ["L", "L", "M", "M", "H"];
// 퍼즐별 기본 생각 시간(초, 중간 정도 학생이 단서를 다 모은 뒤 푸는 데 걸리는 시간)
const BASE = { b1: 50, f1b: 90, f1a: 100, f2a: 50, f2b: 70, f3a: 50, f3b: 90, f3c: 70, f4a: 70, f4b: 70, f4c: 80, r1: 70, r2: 150 }; // f3b 레버 4개 조합, f4a 순서 버튼
// 책상 미니게임(초, 중간 정도 학생 혼자): 넌센스(틀리면 2초 잠금), 전선 돌리기, 사진 조각 바꾸기
const MINI = { nonsense: 25, wire: 60, picture: 70 };
const STAIR_WAIT = 3; // 과반수가 모인 뒤 자동 이동까지
// 바꿔 보기(환경 변수): CLUES=3 퍼즐당 단서 최대 개수. 오픈북은 쉬움·보통에서 학습지 쪽수를 보여 주므로 늘 켜짐(찾는 시간 15초)
const ENV = process.env, CLUES = +ENV.CLUES || 0;
const SOKO = 150, MAZE = 130; // 조소 1실 조각상(중간 학생 기준 초, 최소 10번 밀기) · 조소 2실 어두운 미로(막다른 길 포함 걷는 칸 수 추정)
// 오픈북: 퍼즐마다 '교과서에서 찾으면 풀리는 정도'(0~1). 넌센스(b1)·표 읽기(r1)는 거의 도움 안 됨
const CONCEPT = { b1: 0, f1b: 0.7, f1a: 0.3, f2a: 0.4, f2b: 0.6, f3a: 0.7, f3b: 0.6, f3c: 0.6, f4a: 0.7, f4b: 0.8, f4c: 0.6, r1: 0.1, r2: 0.7 };
// 실력별: think 생각 시간 감소율, wrong 오답 감소율, look 책을 찾아 펴는 시간(초, 쪽수를 알려 주면 15초)
const OB = { "섞인 조": { think: 0.35, wrong: 0.4, look: 40 }, "텅텅 조": { think: 0.35, wrong: 0.45, look: 60 }, "중간 조": { think: 0.4, wrong: 0.4, look: 35 }, "우수 조": { think: 0.25, wrong: 0.3, look: 20 } };

// 걸음 거리(BFS). 잠긴 문은 열렸다고 보고 계산
const WALK = c => c && !"#DGjBTLHPEUFNO".includes(c);
const distCache = new Map();
function distFrom(f, x, y) {
  const k = `${f},${x},${y}`; if (distCache.has(k)) return distCache.get(k);
  const m = MAPS[f], W = m[0].length, d = new Int32Array(W * m.length).fill(-1), q = [[x, y]]; d[y * W + x] = 0;
  for (let i = 0; i < q.length; i++) { const [a, b] = q[i]; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = a + dx, ny = b + dy; if (WALK(m[ny]?.[nx]) && d[ny * W + nx] < 0) { d[ny * W + nx] = d[b * W + a] + 1; q.push([nx, ny]); } } }
  const res = (tx, ty) => { let best = 1e9; for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) { const v = d[(ty + dy) * W + tx + dx]; if (v >= 0 && v < best) best = v; } return best; };
  distCache.set(k, res); return res;
}
const find = (f, ch) => { const m = MAPS[f]; for (let y = 0; y < m.length; y++) { const x = m[y].indexOf(ch); if (x >= 0) return [x, y]; } };
const tour = (f, from, pts, to) => { // 가까운 곳부터 들르는 길(근사)
  let cur = from, sum = 0, left = [...pts];
  while (left.length) { const D = distFrom(f, ...cur); left.sort((a, b) => D(...a) - D(...b)); sum += D(...left[0]); cur = left.shift(); }
  return sum + (to ? distFrom(f, ...cur)(...to) : 0);
};

function runOnce(name, S, rnd, level) {
  const PZ = buildPuzzles(Math.floor(rnd() * 1e9), "SIMU", 1 + Math.floor(rnd() * 6), level), seed = 1;
  if (CLUES) PZ.floors.flat().forEach(p => { p.clues = p.clues.slice(0, CLUES); });
  const ids = ["u1", "u2", "u3", "u4", "u5"].slice(0, TEAM), all = PZ.floors.flat();
  const spots = MAPS.map((m, f) => clueSpots(seed, "SIMU", PZ.floors, f, m)); // 꺼진 퍼즐 단서는 안 놓임
  const own = ids.map(() => 0), idle = ids.map(() => 0), jailT = ids.map(() => 0), hits = ids.map(() => 0); let sweepSum = 0, soko = 0, mazeT = 0, wrongN = 0; // 사람별: 내 단서 줍기, 남을 기다림, 보충실, 잡힌 횟수
  const t = { walk: 0, think: 0, wrong: 0, talk: 0, move: 0, monster: 0 };
  const station = id => { for (let f = 0; f < 5; f++) { const i = PZ.floors[f].findIndex(p => p.id === id); if (i >= 0) return [f, find(f, String(i + 1))]; } };
  const swept = new Set(), solved = new Set(), log = [];
  let at = 1, pos = find(1, "S");
  const go = to => { // 층 이동: 가장 가까운 계단까지 걷고 모이기
    if (to === at) return;
    const via = (at === 0 || to === 0) ? ["Y"] : (to > at ? ["C", "K", "R"] : ["V", "W", "X"]);
    const D = distFrom(at, ...pos), st = via.map(c => find(at, c)).filter(Boolean).sort((a, b) => D(...a) - D(...b))[0];
    t.walk += D(...st) * S.walk / SPEED; t.move += S.move + STAIR_WAIT;
    at = to; pos = find(to, via[0] === "Y" ? "Y" : ({ C: "V", K: "W", R: "X", V: "C", W: "K", X: "R" })[via[0]]) ?? find(to, "K") ?? find(to, "W") ?? find(to, "S");
  };
  const sweep = () => { // 이 층 단서를 팀원이 나눠 줍기(각자 자기 몫만 보임, 책상 미니게임도 각자) → 가장 오래 걸린 사람 기준
    if (swept.has(at)) return; swept.add(at);
    const mine = id => spots[at].filter(c => clueOwner(c, ids) === id);
    const person = (id, i) => { const P = ENGAGE ? IND[ROLES[i]] : { walk: S.walk, mini: S.think };
      return tour(at, pos, mine(id).map(c => [c.x, c.y]), pos) * P.walk / SPEED
      + mine(id).reduce((sum, c) => { const k = miniGameOf(c, MAPS[at], "1SIMU", level); return sum + (k ? MINI[k] * P.mini * (0.7 + rnd() * 0.6) : 0); }, 0); };
    const ts = ids.map(person), mx = Math.max(...ts); t.walk += mx; sweepSum += mx;
    ts.forEach((v, i) => { own[i] += v; idle[i] += mx - v; });  // 먼저 끝낸 사람은 가장 늦은 사람을 기다림
  };
  const solve = id => {
    const [f, st] = station(id); go(f); sweep();
    t.walk += distFrom(f, ...pos)(...st) * S.walk / SPEED; pos = st;
    t.talk += S.talk * PAR;                                 // 모여서 단서를 말로 맞춰 보기
    let p = S.pWrong, think = BASE[id] * S.think * (0.7 + rnd() * 0.6) * PAR;
    if (level !== "hard" && CONCEPT[id]) { const o = OB[name], c = CONCEPT[id]; think = think * (1 - c * o.think) + 15 * c * PAR; p *= 1 - c * o.wrong; } // 오픈북 + 쪽수 안내
    t.think += think;
    let tries = 0;
    while (rnd() < p) { tries++; wrongN++; t.wrong += 5 + 30 * S.think * rnd(); p *= level === "easy" ? 0.5 : 0.6; // 쉬움은 단서 반만 모아도 힌트    // 틀림: 5초 잠금 + 다시 생각, 힌트가 하나씩 나와 점점 쉬워짐
      if (tries >= 6) { t.wrong += 120; break; } }                                  // 그래도 못 풀면 선생님 힌트(약 2분)
    solved.add(id); log.push([id, t.walk + t.think + t.wrong + t.talk + t.move]);
  };
  // 실제로 가장 그럴듯한 순서(앞 단계 결과가 있어야 다음이 됨)
  // 흐름: 1층 → 2층 → 3층(손전등) → 1층 조소 1실(조각상 밀기) → 조소 2실(어두운 미로 끝 IPCC) → 현관 탈출문
  const finale = () => { // 1층으로 내려와 조각상 → 어두운 미로 → 경고판 → 현관
    go(1); t.walk += distFrom(1, ...pos)(...find(1, "Q")) * S.walk / SPEED;
    soko = SOKO * S.think * (0.7 + rnd() * 0.6); while (rnd() < S.pWrong * 0.6) soko += 40 * S.think; t.think += soko; // 막히면 되돌리고 다시
    mazeT = MAZE * 1.5 * S.walk / SPEED; t.walk += mazeT; pos = find(1, "3"); solve("r1"); solve("r2");
  };
  if (level === "easy") {
    sweep(); solve("f1b"); solve("f1a"); go(2); sweep(); solve("f2a"); solve("f2b"); solve("f3c"); solve("f4b"); finale(); // 쉬움은 1·2층만(엘니뇨·사막 퍼즐이 2층에 있음)
  } else {
    sweep(); solve("f1b"); go(2); sweep(); solve("f2a"); go(1); solve("f1a"); go(2); solve("f4a");   // 장부 ④는 2층 → 1층으로 돌아가 열쇠a, 2층 지리실에서 열쇠c
    go(3); sweep(); solve("f3a"); solve("f3b"); go(2); solve("f2b"); go(3);                          // 온실 짝짓기 카드 하나는 3층 → 열쇠b
    solve("f3c"); solve("f4b"); if (level === "hard") solve("f4c");
    go(2); finale();
  }
  // 보충쌤: 1분 30초마다 20초 추격(쉬움은 12초). 추격마다 숨느라 멈추고, 팀원이 잡히면 보충실(30초 + 문제)
  const busy = t.walk + t.think + t.wrong + t.talk + t.move, easy = level === "easy", chases = Math.max(0, Math.floor((busy - firstAt(seed) / 1000) / 90) + 1) + (level === "hard" ? Math.round(log.length * 0.76) : 0); // 모든 난이도 1분 30초마다. 어려움은 쉬는 중(76%)에 푼 퍼즐마다 깜짝 등장(일정이 새로 시작되므로 근사)
  const jail1 = (i) => { const P = ENGAGE ? IND[ROLES[i]] : S; let jail = JAIL; while (rnd() > P.quiz) jail += 10; jailT[i] += jail; hits[i]++; t.monster += jail * 0.5; }; // 한 명이 잡혀도 나머지는 일부 계속 움직임
  for (let c = 0; c < chases; c++) { t.monster += S.hide * (easy ? 0.6 : 1);   // 쉬움: 12초만 추격
    for (let k = 0; k < TEAM; k++) if (rnd() < (ENGAGE ? IND[ROLES[k]].caught : S.caught) * (easy ? 0.6 : 1)) jail1(k); }
  if (ENGAGE && !easy) for (let k = 0; k < TEAM; k++) if (rnd() < IND[ROLES[k]].maze) jail1(k); // 조소 2실 미로 보충쌤(보통·어려움)
  const total = Object.values(t).reduce((a, b) => a + b, 0), k = total / busy; // 보충쌤 시간은 고르게 끼어든다고 봄
  // 사람별 시간: 활동(내 단서 줍기·이동·말로 맞추기·미로·숨기 + 생각에 끼는 만큼) / 구경·기다림 / 보충실
  const shared = t.walk - sweepSum + t.talk + t.move + chases * S.hide * (easy ? 0.6 : 1), think = t.think - soko;
  const per = ids.map((_, i) => { const P = IND[ROLES[i] ?? "M"], act = own[i] + shared + think * P.eThink + t.wrong * P.eWrong + soko * P.eSoko;
    return { act, watch: idle[i] + think * (1 - P.eThink) + t.wrong * (1 - P.eWrong) + soko * (1 - P.eSoko), jail: jailT[i], hits: hits[i] }; });
  const gaps = log.map(([, c], i) => (c - (i ? log[i - 1][1] : 0)) * k);
  return { total, t, n: log.length, doneBy40: log.filter(([, c]) => c * k <= LIMIT).map(([id]) => id), per, maxGap: Math.max(...gaps), wrongN, chases };
}

let seedR = 42; const rnd = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647;
const LV = { easy: "쉬움", normal: "보통", hard: "어려움" };
if (ENGAGE) { // 가상의 4팀(구성은 같고 손발 맞는 정도만 다름: 팀 전체 속도 배수). 팀·난이도마다 400판의 가운데값
  const TEAMS = { "1팀(손발 잘 맞음)": 0.85, "2팀": 1.0, "3팀": 1.0, "4팀(자주 헤맴)": 1.2 }, base = { think: 0.95, pWrong: 0.2, walk: 1.5, talk: 50, move: 30, caught: 0.22, quiz: 0.65, hide: 8 };
  PAR = 0.8; const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)], N = 400, out = {};
  for (const [lv, lvName] of Object.entries(LV)) { out[lvName] = {};
    for (const [team, m] of Object.entries(TEAMS)) {
      const S = { ...base, think: base.think * m, walk: base.walk * m, talk: base.talk * m, pWrong: Math.min(0.6, base.pWrong * m) };
      const rs = Array.from({ length: N }, () => runOnce("섞인 조", S, rnd, lv)), role = r => ROLES.map((x, i) => x === r ? i : -1).filter(i => i >= 0);
      const row = { "걸린 시간(분)": +(med(rs.map(r => r.total)) / 60).toFixed(0), "40분 안에 탈출(%)": Math.round(rs.filter(r => r.total <= LIMIT).length / N * 100), "45분 안에(%)": Math.round(rs.filter(r => r.total <= 45 * 60).length / N * 100),
        "오답 횟수": med(rs.map(r => r.wrongN)), "추격 횟수": med(rs.map(r => r.chases)), "퍼즐 사이 가장 긴 공백(분)": +(med(rs.map(r => r.maxGap)) / 60).toFixed(1) };
      for (const [r, nm] of [["L", "낮음"], ["M", "중간"], ["H", "높음"]]) { const pick = f => med(rs.flatMap(x => role(r).map(i => f(x.per[i], x.total))));
        row[nm] = { "활동(%)": Math.round(pick((p, T) => p.act / T * 100)), "구경·기다림(%)": Math.round(pick((p, T) => p.watch / T * 100)), "보충실(분)": +(rs.reduce((a, x) => a + role(r).reduce((b, i) => b + x.per[i].jail, 0), 0) / N / role(r).length / 60).toFixed(1),
          "잡힌 횟수(평균)": +(rs.reduce((a, x) => a + role(r).reduce((b, i) => b + x.per[i].hits, 0), 0) / N / role(r).length).toFixed(1) }; }
      out[lvName][team] = row; } }
  console.log(JSON.stringify(out, null, 1)); process.exit(0);
}
for (const par of [1, 0.65]) { PAR = par; console.log(par === 1 ? "\n■ 가정 A: 퍼즐을 하나씩 차례로 푼다" : "\n■ 가정 B: 같은 층 퍼즐을 팀원이 나눠 동시에 푼다");
  for (const [name, S] of Object.entries(SKILL)) {
    const row = Object.entries(LV).map(([lv, lvName]) => {
      const res = Array.from({ length: RUNS }, () => runOnce(name, S, rnd, lv)).sort((a, b) => a.total - b.total);
      const med = res[Math.floor(RUNS / 2)], win = res.filter(r => r.total <= LIMIT).length / RUNS;
      return `${lvName} ${(med.total / 60).toFixed(0)}분·${(win * 100).toFixed(0)}%·40분에 ${med.doneBy40.length}/${med.n}`;
    });
    console.log(`  ${name}: ${row.join("  |  ")}`);
  }
}
