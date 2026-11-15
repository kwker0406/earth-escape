import assert from "node:assert";
import { buildPuzzles, check, clueSpots, clueOwner, dropSpot, scatter, norm, FLOOR_NAMES, EVENT_YEARS, ROLL } from "../game/puzzles.js";
import { MAPS } from "../game/maps.js";

const SYM = ROLL.split(" · ").map(s => s.split(" ")[1]);
const words = new Set();
for (let no = 1; no <= 6; no++) {
  const T = buildPuzzles(123456, "AB" + no + "Z", no);
  assert.equal(T.floors.length, FLOOR_NAMES.length);
  // 층마다 지도 위 퍼즐 칸 수 = 퍼즐 수
  T.floors.forEach((fl, f) => assert.equal(MAPS[f].join("").replace(/[^0-9]/g, "").length, fl.length + (f === 2 ? 2 : 0), `층 ${f} 퍼즐 칸 수`)); // 2층 4·5칸은 쉬움 전용
  const E = buildPuzzles(123456, "AB" + no + "Z", no, "easy");                  // 쉬움: 1·2층만, 2층에 5개(엘니뇨·사막 포함), 손전등은 라운지
  assert.equal(E.floors[2].length, 5); assert.ok(E.floors[3].every(p => p.off), "쉬움 3층 퍼즐이 켜져 있음");
  assert.ok(E.floors[2].find(p => p.id === "f2a").gives.flash && !E.floors[2].some(p => p.gives?.up), "쉬움 손전등·계단");
  assert.ok(E.pieceFrom.every(id => E.floors[2].some(p => p.id === id && !p.off)), "쉬움 조각이 2층 밖에서 나옴");
  // 최종 암호: 조각을 연도 순으로 놓고 원자 번호→기호로 읽으면 단어
  const byYear = [...T.pieces].sort((a, b) => ["유엔 기후 변화 협약", "교토 의정서", "파리 협정", "IPCC 6차 보고서", "우리나라 탄소 중립 목표"].indexOf(a.event) - ["유엔 기후 변화 협약", "교토 의정서", "파리 협정", "IPCC 6차 보고서", "우리나라 탄소 중립 목표"].indexOf(b.event));
  const decoded = byYear.map(p => SYM[p.num - 1]).join("").toUpperCase();
  assert.equal(decoded, T.word, "조각을 풀면 정답 단어");
  assert.ok(T.pieces.every(p => p.num >= 1 && p.num <= 20));
  words.add(T.word);
  for (const fl of T.floors) for (const pz of fl) {
    if (pz.type === "pair") {
      assert.ok(check(pz, pz.left.map((_, i) => [i, i])), pz.id + " 정답 짝");
      assert.ok(!check(pz, pz.left.map((_, i) => [i, (i + 1) % pz.left.length])), pz.id + " 틀린 짝");
    } else {
      assert.ok(check(pz, " " + pz.answer.toLowerCase() + " "), pz.id + " 정답(공백·소문자 허용)");
      assert.ok(!check(pz, pz.answer + "9"), pz.id + " 오답");
      if (pz.type === "choice") assert.ok(pz.options.includes(pz.answer));
      if (pz.type === "choice" || pz.type === "lever") assert.ok(pz.clues.filter(c => c.startsWith("🔖")).length === (pz.levers || pz.options).length, pz.id + " 기호 뜻은 단서에만");
      if (pz.type === "lever") { // 엘니뇨: 무역풍 약(▼)·용승 약(▼)·동태평양 수온 높음(▲)·서태평양 강수 적음(▼). 레버 뜻 카드대로 읽으면 정답
        const want = { "무역풍 세기": "D", "동태평양 용승": "D", "동태평양 바닷물 온도": "U", "서태평양(인도네시아) 강수량": "D" };
        const fromCards = pz.levers.map((_, k) => want[pz.clues.find(c => c.startsWith(`🔖 레버 ${k + 1}:`)).match(/: (.+) \(/)[1]]).join("");
        assert.equal(fromCards, pz.answer, "레버 정답"); }
      if (pz.type === "seq") { // 해들리 순환: 상승 → 극 쪽 → 하강 → 적도 쪽
        const want = ["⬆ 위로 올라감", "➡ 높은 하늘에서 극 쪽으로", "⬇ 아래로 내려옴", "⬅ 지표를 따라 적도 쪽으로"];
        assert.deepEqual([...pz.answer].map(i => pz.options[+i]), want, "순서 정답"); }
    }
    assert.equal(pz.hints.length, 3, pz.id + " 힌트 3단계");
    assert.ok(pz.clues.length >= 4, pz.id + " 단서 4장 이상");
  }
  // 학습지 값 확인
  const f1a = T.floors[1][1]; assert.ok(["156", "145"].includes(f1a.answer));
  assert.equal(23 + 104 + 24 + 5, 156); assert.equal(58 + 98, 156); assert.equal(47 + 98, 145); assert.equal(116 + 24 + 5, 145); assert.equal(12 + 58, 70);
  const f4b = T.floors[3].find(p => p.id === "f4b"); assert.equal(f4b.answer.length, 2, "사막 병은 2개");
  assert.ok(f4b.answer[0] < f4b.answer[1], "작은 수부터");
  const f4c = T.floors[3].find(p => p.id === "f4c"); const human = f4c.clues.filter(c => /과잉 방목|삼림 벌채/.test(c)).map(c => +c.match(/카드 (\d)/)[1]);
  assert.equal(human.length, 2); assert.equal(+f4c.answer, human.reduce((a, b) => a + b), "사람 원인 2장 합");
  // 단서 위치: 층마다 그 층에 놓인 단서(다른 층 퍼즐 것 포함)가 서로 다른 바닥 칸(.)에
  const allClues = T.floors.flatMap(fl => fl.flatMap(p => p.clues)).length;
  let placed = 0;
  T.floors.forEach((fl, f) => {
    const sp = clueSpots(123456, "AB" + no + "Z", T.floors, f, MAPS[f]); placed += sp.length;
    assert.equal(new Set(sp.map(c => c.x + "," + c.y)).size, sp.length, `층 ${f} 단서 칸 겹침`);
    assert.ok(sp.every(c => "DBPEY".includes(MAPS[f][c.y][c.x])), `층 ${f} 단서가 책상·칠판·컴퓨터·이젤·벽 온도계가 아님`);
    assert.ok(sp.every(c => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => MAPS[f][c.y + dy]?.[c.x + dx] === ".")), `층 ${f} 단서 옆에 설 바닥이 없음(잠긴 방·보충실)`);
    for (let n = 2; n <= 4; n++) { // 2명 이상이면 모두가 단서를 1장 이상 받음
      const ids = Array.from({ length: n }, (_, i) => "u" + i), own = new Set(sp.map(c => clueOwner(c, ids)));
      if (sp.length >= n) assert.equal(own.size, n, `층 ${f} ${n}명 분배`);
    }
  });
  assert.equal(placed, allClues, "놓이지 않은 단서가 있음");
  // 연결이 막히지 않는지: 1층에서 시작해 규칙대로 움직이며 풀 수 있는 퍼즐을 계속 풀면 모두 풀려야 함(조소 2실 IPCC는 손전등 필요)
  const lockOf = (f, ch) => { // 퍼즐 칸에서 문까지 퍼져 나가 만난 문 문자(+면 잠기지 않음)
    const m = MAPS[f]; let s0; m.forEach((r, y) => { const x = r.indexOf(ch); if (x >= 0) s0 = [x, y]; });
    const seen = new Set([s0 + ""]), q = [s0], doors = new Set();
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, c = m[ny][nx], k = nx + "," + ny;
      if (seen.has(k) || c === "#") continue; seen.add(k); if ("+abcrG".includes(c)) { doors.add(c); continue; } q.push([nx, ny]); } }
    return [...doors].find(d => "abcr".includes(d)) && !doors.has("+") ? [...doors].find(d => "abcr".includes(d)) : null;
  };
  const st = { reach: new Set([1]), keys: new Set(), flash: false, solved: new Set() };
  const where = {}; T.floors.forEach((fl, f) => fl.forEach((pz, i) => where[pz.id] = { f, pz, lock: lockOf(f, String(i + 1)) }));
  for (let changed = true; changed;) {
    changed = false;
    for (const f of [...st.reach]) { // 계단: 위층은 그 층 관문 퍼즐을 풀어야, 아래층은 언제나(1층→지하 X), 엘리베이터 3↔지하는 손전등
      const gate = T.floors[f]?.find(p => p.gives?.up);
      if (f >= 1 && f <= 2 && gate && st.solved.has(gate.id) && !st.reach.has(f + 1)) { st.reach.add(f + 1); changed = true; }
    }
    for (const [id, w] of Object.entries(where)) {
      if (st.solved.has(id) || !st.reach.has(w.f) || (w.lock && !st.keys.has(w.lock))) continue;
      if (w.pz.needs && !st.solved.has(w.pz.needs)) continue;
      if (id === "r1" && !st.flash) continue; // 어두운 조소 2실
      if (w.pz.final && !T.pieceFrom.every(x => st.solved.has(x))) continue;
      if (!w.pz.clues.every((_, j) => st.reach.has(w.pz.at?.[j] ?? w.f))) continue;
      st.solved.add(id); changed = true;
      if (w.pz.gives?.key) st.keys.add(w.pz.gives.key);
      if (w.pz.gives?.flash) st.flash = true;
    }
  }
  assert.equal(st.solved.size, Object.keys(where).length, "막힌 퍼즐: " + Object.keys(where).filter(id => !st.solved.has(id)));
  // 잠긴 방 3곳: 열쇠를 주는 퍼즐이 그 방 밖에 있어야 함. 탈출문(현관)은 잠긴 방이 아님
  assert.deepEqual(["f2b", "f3c", "f4b", "f4c", "r2"].map(id => where[id].lock), ["a", "b", "c", "c", null], "잠긴 방 배치");
  assert.equal(where.r2.f, 1, "탈출문은 1층"); assert.equal(MAPS[1][MAPS[1].findIndex(r => r.includes("4"))].indexOf("4") + 1, MAPS[1][MAPS[1].findIndex(r => r.includes("S"))].indexOf("S"), "탈출문은 현관 바로 옆");
  // 다른 층에서 단서를 가져와야 하는 퍼즐이 층마다 있음(관문 퍼즐은 그 층 단서만으로 풀림)
  for (const f of [1, 2]) {
    const gate = T.floors[f].find(p => p.gives?.up);
    assert.ok(!gate.at, `층 ${f} 관문 퍼즐은 그 층에서 풀려야 함`);
  }
}
assert.equal(words.size, 6, "팀마다 다른 단어");
assert.deepEqual(EVENT_YEARS, [1992, 1997, 2015, 2021, 2050]);
assert.equal(norm(" ch o co "), "CHOCO");
// 같은 팀은 언제 계산해도 같은 문제(기기마다 같아야 함)
assert.deepEqual(JSON.stringify(buildPuzzles(7, "QWER", 3)), JSON.stringify(buildPuzzles(7, "QWER", 3)));
assert.notEqual(buildPuzzles(7, "QWER", 3).floors[3][3].answer + buildPuzzles(7, "QWER", 3).floors[3][4].answer,
  buildPuzzles(7, "ZXCV", 3).floors[3][3].answer + buildPuzzles(7, "ZXCV", 3).floors[3][4].answer, "다른 팀이면 숫자가 다름(대체로)");
console.log("puzzles OK:", [...words].join(", "));

// 물건 옮겨 둘 자리: 보충실 문·모서리 계단·엘리베이터에서 2칸 안 복도(.)이고, 바로 앞 칸은 아니며, 문을 건너지 않은 곳
const region = (m, s) => { const seen = new Set([s.x + "," + s.y]), q = [s]; while (q.length) { const p = q.pop();
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const n = { x: p.x + dx, y: p.y + dy }, c = m[n.y]?.[n.x], k = n.x + "," + n.y;
    if (!c || seen.has(k) || "#+Gabcrj".includes(c)) continue; seen.add(k); q.push(n); } } return seen; };
MAPS.forEach((m, f) => {
  for (const ch of "GKY") {
    let t; m.forEach((r, y) => { const x = r.indexOf(ch); if (x >= 0 && !t) t = { x, y }; }); if (!t) continue;
    const front = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy })).find(p => m[p.y]?.[p.x] === ".");
    const hall = region(m, front), got = new Set();
    for (const key of ["flash", "a", "b", "c", "x1", "x2"]) {
      const p = dropSpot(m, t, key); got.add(p.x + "," + p.y);
      assert.equal(m[p.y][p.x], ".", `층 ${f} ${ch} ${key}: 바닥이 아님`);
      assert.ok(Math.abs(p.x - t.x) + Math.abs(p.y - t.y) <= 2, `층 ${f} ${ch}: 2칸 밖`);
      assert.ok(p.x !== front.x || p.y !== front.y, `층 ${f} ${ch}: 바로 앞 칸`);
      assert.ok(hall.has(p.x + "," + p.y), `층 ${f} ${ch}: 복도가 아닌 곳(교실·잠긴 방)`);
      assert.deepEqual(p, dropSpot(m, t, key), "같은 물건은 늘 같은 자리");
    }
    assert.ok(got.size >= 2, `층 ${f} ${ch}: 물건이 한 칸에 몰림`);
  }
});
console.log("dropSpot OK");

// 흩뿌리기: 사물함에서 잡히면 사물함 칸은 빼고 주변 바닥에 겹치지 않게, 2칸 안부터
{
  const m = MAPS[1]; let L; m.forEach((r, y) => { const x = r.indexOf("H"); if (x >= 0 && !L) L = { x, y }; });
  const sp = scatter(m, L, 4, new Set(), false), keys = sp.map(p => p.x + "," + p.y);
  assert.equal(new Set(keys).size, 4, "물건끼리 겹침");
  assert.ok(sp.every(p => m[p.y][p.x] === "." && !(p.x === L.x && p.y === L.y)), "사물함 칸이나 바닥 아닌 곳");
  assert.ok(sp.every(p => Math.abs(p.x - L.x) + Math.abs(p.y - L.y) <= 3), "3칸 밖");
  const busy = new Set(keys), more = scatter(m, L, 2, busy, false);
  assert.ok(more.every(p => !busy.has(p.x + "," + p.y)), "이미 놓인 칸에 또 둠");
  const open = scatter(m, { x: 30, y: 36 }, 1); assert.deepEqual(open[0], { x: 30, y: 36 }, "빈 칸이면 잡힌 자리 그대로");
  assert.ok(dropSpot(m, { x: 49, y: 37 }, "a", new Set(MAPS[1].flatMap((r, y) => [...r].map((_, x) => x + "," + y)).slice(0, 0))));
}
console.log("scatter OK");

// 난이도별: 켜진 퍼즐만으로 끝까지 풀리는지, 조각 수 = 단어 글자 수, 쉬움은 다른 층 단서가 없음, 단서는 퍼즐마다 4장
{
  const { LEVELS } = await import("../game/puzzles.js");
  for (const lv of Object.keys(LEVELS)) for (let no = 1; no <= 6; no++) {
    const P = buildPuzzles(321, "LV" + no, no, lv), on = P.floors.flatMap((fl, f) => fl.map(pz => ({ f, pz }))).filter(x => !x.pz.off);
    const r2 = on.find(x => x.pz.id === "r2").pz;
    assert.equal(P.pieces.length, P.pieceFrom.length); assert.ok(P.pieceFrom.every(id => on.some(x => x.pz.id === id)), lv + " 조각 퍼즐이 꺼짐");
    const letters = P.pieces.map(p => p).sort((a, b) => EVENT_YEARS[["유엔 기후 변화 협약", "교토 의정서", "파리 협정", "IPCC 6차 보고서", "우리나라 탄소 중립 목표"].indexOf(a.event)] - EVENT_YEARS[["유엔 기후 변화 협약", "교토 의정서", "파리 협정", "IPCC 6차 보고서", "우리나라 탄소 중립 목표"].indexOf(b.event)])
      .map(p => ["H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca"][p.num - 1]).join("").toUpperCase();
    assert.equal(letters, r2.answer, `${lv} 조각을 연도 순으로 읽으면 정답`);
    const keysGiven = new Set(on.map(x => x.pz.gives?.key).filter(Boolean));
    for (const [id, k] of [["f2b", "a"], ["f3c", "b"], ["f4b", "c"]]) if (on.some(x => x.pz.id === id && x.f === 3)) assert.ok(keysGiven.has(k), `${lv} ${id} 열쇠 ${k}를 주는 퍼즐이 없음`); // 쉬움에서 2층으로 옮긴 퍼즐은 잠긴 방이 아님
    assert.ok(on.every(x => x.f >= 1 && x.pz.clues.length === 5 && !Object.values(x.pz.at ?? {}).includes(0)), lv + " 0층·단서 5장(잡담 포함)");
    if (lv !== "hard") assert.ok(on.every(x => x.pz.page), lv + " 학습지 쪽수 없음");
    if (lv === "easy") assert.ok(on.every(x => !Object.keys(x.pz.at ?? {}).length), "쉬움에 다른 층 단서가 있음");
    const spots = MAPS.flatMap((m, f) => clueSpots(321, "LV" + no, P.floors, f, m)); assert.equal(spots.length, on.reduce((n, x) => n + x.pz.clues.length, 0), lv + " 단서 수");
  }
  console.log("levels OK:", Object.entries(LEVELS).map(([k, v]) => `${v} ${buildPuzzles(1, "A", 1, k).floors.flat().filter(p => !p.off).length}개`).join(", "));
}

// 책상 미니게임: 책상 단서만, 대략 8개 중 1개(여러 팀 합쳐서), 세 종류 모두 나옴, 쉬움에는 없음
{ const { miniGameOf } = await import("../game/puzzles.js");
  let desk = 0, games = 0, easy = 0; const kinds = new Set();
  for (let s = 1; s <= 30; s++) { const T = buildPuzzles(s, "Q" + s, 1 + s % 6);
    for (let f = 1; f <= 3; f++) for (const c of clueSpots(s, "Q" + s, T.floors, f, MAPS[f])) {
      const k = miniGameOf(c, MAPS[f], s + "Q" + s); if (miniGameOf(c, MAPS[f], s + "Q" + s, "easy")) easy++;
      if (MAPS[f][c.y][c.x] !== "D") { assert.equal(k, null, "책상이 아닌데 미니게임"); continue; }
      desk++; if (k) { games++; kinds.add(k); } } }
  assert.ok(games / desk > 0.06 && games / desk < 0.2, `미니게임 비율 ${games}/${desk}`);
  assert.equal(easy, 0, "쉬움에 미니게임"); assert.equal(kinds.size, 3, "세 종류 모두"); console.log("mini games", games, "/", desk); }
