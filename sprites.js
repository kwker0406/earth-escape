// 도트 캐릭터(64×64 픽셀, 직접 디자인한 학생 8명 + 48×48 보충쌤). 앞(d)·뒤(u)·옆(l·r) × 서 있기(0)·걸음(1·2).
// 그림 파일 없이 코드로 점을 찍어 만들고, 한 번 만든 그림은 기억해 둔다(sprite).
// 교복: 검은 머리 학생은 남색 블레이저 + 흰 셔츠, 금발 학생은 블레이저 없이 흰 셔츠. 여학생 붉은 리본 + 남색 치마, 남학생 붉은 넥타이 + 남색 바지
export const CHARS = [
  { name: "보브 안경", emoji: "👓", girl: 1, hair: "bob", color: "black", glasses: 1 },
  { name: "긴 생머리", emoji: "👩", girl: 1, hair: "long", color: "black" },
  { name: "땋은 머리", emoji: "👧", girl: 1, hair: "braid", color: "black" },
  { name: "금발 생머리", emoji: "👱‍♀️", girl: 1, hair: "long", color: "blond" },
  { name: "더벅머리 안경", emoji: "🤓", girl: 0, hair: "shaggy", color: "black", glasses: 1 },
  { name: "파마머리", emoji: "👨‍🦱", girl: 0, hair: "perm", color: "black" },
  { name: "스포츠머리", emoji: "👦", girl: 0, hair: "buzz", color: "black" },
  { name: "금발 댄디컷", emoji: "👱‍♂️", girl: 0, hair: "dandy", color: "blond" },
];
const SHADOW = "rgba(0,0,0,0.28)";
const cache = new Map();

function painter(ctx) {
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const oval = (cx, cy, rx, ry, c) => { ctx.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.5)) ** 2)); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); } };
  const blob = (cx, cy, rx, ry, fill, line) => { oval(cx, cy, rx + 1, ry + 1, line); oval(cx, cy, rx, ry, fill); }; // 테두리 있는 타원
  return { px, rect, oval, blob };
}

// 64×64 학생(쯔꾸르풍): 몸·얼굴은 한 칸씩 찍은 도트 지도(아래 문자열), 머리카락은 손으로 배치한 머리 가닥(clump)으로 그림.
// 외곽선은 다 그린 뒤 자동으로 두름(outline). 앞·뒷모습 몸은 왼쪽 절반만 적고 좌우를 뒤집어 붙임
const PAL = {
  skin: ["#ffe3cf", "#f3c09f", "#e39d84"], black: ["#2e2b40", "#1b1928", "#4d4a6a", "#7d79a6"], blond: ["#f4c95d", "#d39a3a", "#ffe79c", "#fff7d6"],
  navy: ["#2c3b70", "#1c264d", "#41549a"], shirt: ["#ffffff", "#d5dbea", "#ffffff"], red: ["#dd3640", "#9b1e2b", "#f5717a"], shoe: ["#3d2b25", "#6b4a3c"],
};
const IRIS = { black: ["#2a1712", "#6b3f2c", "#b8845a"], blond: ["#16326a", "#3474c8", "#86c2f5"] }, LASH = "#1c1420", FRAME = "#3a3550", BLUSH = "#f7a7ae", MOUTH = "#b4524a";
const half = rows => rows.map(r => r + [...r].reverse().join(""));        // 왼쪽 절반 → 좌우 대칭 한 줄
const M = { // 도트 지도. J 윗옷 j 윗옷 그늘 k 윗옷 밝은 곳 W 셔츠 s 피부 t 피부 그늘 B 치마·바지 b 그늘 X 양말 x 양말 그늘 Z 구두 z 구두 광
  upF: half([ // y31~44, x20~43
    "..........tt", "........JWWt", ".....jJJJkWW", "....jJJJJJkW", "...jJJjJJJkW", "...JJJjJJJJk", "...JJJjJJJJJ",
    "...JJJjJJJJJ", "...JJJjJJJJJ", "...JJJjJJJJJ", "...WWWjJJJJJ", "...sssjJJJJJ", "...ssttJJJJJ", "....tt.jjjjj"]),
  skirtF: half(["......BBBBBB", ".....BBBBBBB", ".....BbBBBbB", "....BBbBBBbB", "....BbBBBbBB", "....bbbbbbbb"]), // y43~48
  legG: [".sss.", ".sss.", ".sts.", ".XXX.", ".XXX.", ".XXx.", "ZZZZ.", "zZZZ."],                                 // y49~56
  legB: ["BBBBB", "BBBBb", "BBBBb", "BBBBb", "BBBBb", "BBBBb", "BBBBb", "BBBBb", "BBBBb", "bbbbb", "ZZZZZ", "zZZZZ"], // y45~56
  upS: [ // 옆모습 y31~44, x20~43
    "..........ttt", ".........JJJWW", "........JJJJJJW", "........JJJJJJk", "........jJJJJJJ", "........jJJJJJJ", "........jJJJJJJ",
    "........jJJJJJJ", "........jJJJJJJ", "........jJJJJJJ", "........jJJJJJJ", "........jJJJJJJ", "........jJJJJJJ", "........jjjjjjj"],
  skirtS: [".......BBBBBBBB", "......BBBBBBBBBB", "......BbBBbBBbBB", ".....BBbBBbBBbBBB", ".....BbBBbBBbBBBB", ".....bbbbbbbbbbbb"],
  legGS: [".sss.", ".sss.", ".sts.", ".XXX.", ".XXX.", ".XXx.", ".ZZZZ", ".zZZZ"],
  legBS: ["BBBB.", "BBBB.", "BBBB.", "BBBB.", "BBBB.", "BBBB.", "BBBB.", "BBBB.", "BBBB.", "bbbb.", "ZZZZZ", "zZZZZ"],
  faceF: [ // y11~31, x20~43
    ".....ssssssssssssss.....", "...ssssssssssssssssss...", "..ssssssssssssssssssss..", ".ssssssssssssssssssssss.",
    ...Array(11).fill("ssssssssssssssssssssssss"), ".ssssssssssssssssssssss.", ".ssssssssssssssssssssss.", "..ssssssssssssssssssss..",
    "...ssssssssssssssssss...", ".....ssssssssssssss.....", "........ssssssss........"],
  faceS: [ // y11~30, x22~45 (오른쪽을 봄)
    "......ssssssssss........", "....ssssssssssssss......", "...ssssssssssssssss.....", "..ssssssssssssssssss....", ".sssssssssssssssssss....",
    ...Array(7).fill(".sssssssssssssssssssss.."), ".ssssssssssssssssssssss.", ".sssssssssssssssssssss..", ".ssssssssssssssssssss...",
    ".ssssssssssssssssssss...", "..sssssssssssssssssss...", "..ssssssssssssssssss....", "...ssssssssssssssss.....", ".....ssssssssssss......."],
};
function student(ctx, ch, dir, frame) {
  const { px: P, rect: R, oval: O } = painter(ctx), side = dir === "l" || dir === "r", back = dir === "u", front = !side && !back;
  const [H, Hs, Hh, Hh2] = PAL[ch.color], [S, Ss] = PAL.skin, blazer = ch.color === "black", top = blazer ? PAL.navy : PAL.shirt, red = PAL.red, hs = ch.hair;
  const C = { J: top[0], j: top[1], k: blazer ? top[2] : "#ffffff", W: "#ffffff", s: S, t: Ss, B: PAL.navy[0], b: PAL.navy[1], X: "#ffffff", x: PAL.shirt[1], Z: PAL.shoe[0], z: PAL.shoe[1] };
  const map = (rows, x0, y0, sub = {}) => rows.forEach((r, y) => [...r].forEach((c, x) => { const col = sub[c] ?? C[c]; if (col) P(x0 + x, y0 + y, col); }));
  const flip = rows => rows.map(r => [...r].reverse().join(""));
  // 머리 가닥: (x,y)에서 시작해 폭 w → 1로 가늘어지며 len줄 내려감. lean: 끝이 옆으로 휘는 정도(+오른쪽). 오른쪽 가장자리 그늘, 위쪽 윤기
  const clump = (x, y, w, len, lean = 0, up = false) => { for (let k = 0; k < len; k++) {
    const ww = Math.max(1, Math.round(w * (1 - k / len))), xx = Math.round(x + (w - ww) / 2 + lean * (k / len) ** 2), yy = up ? y - k : y + k;
    R(xx, yy, ww, 1, H); if (ww > 2) P(xx + ww - 1, yy, Hs); if (ww > 3 && k < len / 3) P(xx + 1, yy, Hh); } };
  const curls = (pts, r = 4) => pts.forEach(([x, y]) => { O(x, y, r, r, Hs); O(x - 1, y - 1, r - 1, r - 1, H); P(x - 2, y - 2, Hh); P(x - 1, y - 2, Hh); P(x - 2, y - 1, Hh); });
  const braid = (x, y0, y1) => { for (let y = y0; y < y1; y += 4) { O(x, y + 2, 3, 2, H); R(x - 2, y + 3, 5, 1, Hs); P(x - 1, y + 1, Hh); } R(x - 2, y1, 5, 2, red[0]); P(x - 2, y1, red[2]); clump(x - 2, y1 + 2, 5, 4); };
  const ring = (y, x0, x1) => { R(x0 + 2, y, x1 - x0 - 4, 1, Hh); R(x0, y + 1, 3, 1, Hh); R(x1 - 3, y + 1, 3, 1, Hh); for (let x = x0 + 4; x < x1 - 3; x += 5) P(x, y - 1, Hh2); }; // 윤기 링
  const lift = i => (frame === 1 && i === 0) || (frame === 2 && i === 1) ? 2 : 0;
  const stride = i => side && frame ? ((frame === 1) === (i === 0) ? 3 : -3) : 0;

  if (side) { // ── 옆모습(오른쪽을 봄)
    if (hs === "long") { R(18, 14, 12, 30, H); R(19, 30, 3, 12, Hs); for (const x of [17, 21, 25]) clump(x, 40, 6, 7, -1); }
    if (hs === "bob") for (const x of [17, 21, 25]) clump(x, 14, 6, 19, 1);
    if (hs === "braid") braid(22, 24, 42);
    [27, 30].forEach((x, i) => map(ch.girl ? M.legGS : M.legBS, x + stride(i), (ch.girl ? 49 : 45) - lift(i), i ? {} : { s: Ss, B: PAL.navy[1] }));
    if (ch.girl) map(M.skirtS, 20, 43);
    map(M.upS, 20, 31);
    R(33, 33, 2, ch.girl ? 3 : 9, red[0]); P(34, 33, red[2]);                                                // 리본·넥타이 끝
    const sw = frame ? (frame === 1 ? 2 : -2) : 0;                                                          // 팔
    R(29 + sw, 33, 4, 8, top[0]); R(29 + sw, 33, 1, 8, top[1]); R(29 + sw, 41, 4, 1, "#ffffff"); R(29 + sw, 42, 4, 2, S); R(29 + sw, 43, 4, 1, Ss);
    O(29, 16, 14, 13, H);                                                                                  // 뒤통수
    map(M.faceS, 22, 11); R(29, 19, 3, 5, S); P(30, 20, Ss); P(30, 21, Ss); P(30, 22, Ss);                    // 얼굴 + 귀
    R(36, 18, 5, 1, LASH); P(41, 17, LASH); R(37, 19, 3, 2, IRIS[ch.color][0]); P(37, 19, "#ffffff"); P(38, 19, "#ffffff"); P(37, 20, "#ffffff");
    R(37, 21, 3, 2, IRIS[ch.color][1]); P(38, 22, IRIS[ch.color][2]);                                        // 눈
    R(35, 25, 3, 1, BLUSH); P(44, 23, Ss); R(40, 27, 2, 1, MOUTH);
    // 앞머리(앞으로 휨)·옆머리
    if (hs === "buzz") { O(30, 13, 13, 8, H); R(32, 9, 12, 3, H); for (let x = 22; x < 42; x += 3) P(x, 9, Hh); }
    else if (hs === "perm") curls([[20, 10], [25, 5], [31, 3], [37, 4], [42, 8], [43, 13], [18, 18], [21, 25], [26, 27]]);
    else { O(30, 12, 14, 9, H); for (const [x, l, ln] of [[30, 7, 6], [34, 6, 7], [38, 6, 6], [41, 4, 5]]) clump(x, 10, l, ln, 2); clump(25, 12, 6, 12, -1); }
    if (hs === "shaggy") { for (const x of [24, 30, 36]) clump(x, 4, 5, 4, 1, true); clump(42, 12, 4, 6, 2); }
    if (hs === "dandy") { clump(31, 8, 10, 9, 4); }
    if (hs !== "perm" && hs !== "buzz") ring(6, 22, 40);
    if (ch.glasses) { R(35, 17, 6, 1, FRAME); R(35, 23, 6, 1, FRAME); R(35, 17, 1, 7, FRAME); R(40, 17, 1, 7, FRAME); R(29, 19, 6, 1, FRAME); P(39, 18, "#ffffff"); }
    return;
  }

  // ── 앞·뒷모습
  if (front && hs === "long") { R(18, 16, 28, 30, H); R(21, 30, 22, 15, Hs); }                            // 몸 뒤로 넘어간 긴 머리
  if (front && hs === "bob") R(18, 16, 28, 15, H);
  [26, 33].forEach((x, i) => { const L = ch.girl ? M.legG : M.legB; map(i ? flip(L) : L, x, (ch.girl ? 49 : 45) - lift(i)); });
  if (!ch.girl) R(26, 45, 12, 2, PAL.navy[0]);                                                            // 바지 위쪽(가랑이)
  if (ch.girl) map(M.skirtF, 20, 43);
  const sw = frame ? (frame === 1 ? 1 : -1) : 0;
  map(M.upF.map((r, y) => y < 2 ? r : r.slice(0, 7).replace(/./g, c => c) + r.slice(7)), 20, 31, back ? { W: top[0], k: top[0] } : {});
  if (sw) { R(23, 41 + sw, 3, 3, S); R(38, 41 - sw, 3, 3, S); }                                             // 걸을 때 손이 앞뒤로
  if (!ch.girl && !blazer) { R(26, 44, 12, 2, PAL.shoe[0]); R(31, 44, 2, 2, "#c9a84a"); }                   // 허리띠
  if (back) {
    if (blazer) R(31, 36, 2, 9, top[1]);
    R(18, 19, 2, 5, S); R(44, 19, 2, 5, S);                                                               // 귀
    O(32, 16, 15, 14, H); ring(6, 21, 43);
    if (hs === "long") { R(17, 22, 30, 20, H); for (const x of [22, 27, 32, 37, 42]) R(x, 26, 1, 14, Hs); for (const x of [17, 22, 27, 32, 37, 41]) clump(x, 41, 6, 6, x < 31 ? -1 : 1); }
    if (hs === "bob") { R(17, 22, 30, 7, H); for (const x of [17, 22, 27, 32, 37, 42]) clump(x, 28, 5, 4); R(17, 24, 30, 1, Hs); }
    if (hs === "braid") { braid(26, 26, 42); braid(38, 26, 42); }
    if (hs === "perm") curls([[19, 12], [45, 12], [18, 20], [46, 20], [21, 27], [43, 27], [27, 30], [32, 31], [37, 30], [24, 5], [32, 3], [40, 5]]);
    if (hs === "shaggy" || hs === "dandy") for (const x of [20, 25, 30, 35, 40]) clump(x, 26, 5, 6);
    if (hs === "buzz") { R(26, 28, 12, 3, S); for (let x = 21; x < 43; x += 3) for (let y = 10; y < 26; y += 5) P(x + (y % 2), y, Hh); }
    return;
  }

  // 앞모습: 셔츠 깃·리본·넥타이·단추
  if (blazer) { P(34, 39, "#e6c25a"); P(34, 42, "#e6c25a"); }
  else { R(31, 36, 2, 8, top[1]); }
  if (ch.girl) { R(26, 33, 5, 4, red[0]); R(33, 33, 5, 4, red[0]); R(30, 33, 4, 3, red[1]); P(27, 33, red[2]); P(34, 33, red[2]); R(28, 37, 2, 3, red[0]); R(34, 37, 2, 3, red[0]); }
  else { R(31, 33, 2, 2, red[1]); R(31, 35, 2, blazer ? 4 : 8, red[0]); P(31, 35, red[2]); }
  // 얼굴
  if (hs === "buzz") O(32, 15, 14, 10, H); else if (hs !== "perm") O(32, 15, 15, 12, H);                  // 머리 뒤판
  if (hs === "perm") curls([[19, 13], [45, 13], [19, 20], [45, 20], [20, 26], [44, 26], [22, 6], [42, 6], [27, 3], [32, 2], [37, 3]], 4);
  R(18, 19, 2, 5, S); R(44, 19, 2, 5, S); P(19, 20, Ss); P(44, 20, Ss);                                    // 귀
  map(M.faceF, 20, 11); R(21, 15, 22, 1, Ss);                                                            // 얼굴 + 앞머리 그늘
  const eye = x => { R(x - 1, 18, 6, 1, LASH); R(x, 19, 4, 4, IRIS[ch.color][0]); R(x, 21, 4, 2, IRIS[ch.color][1]); R(x + 1, 23, 2, 1, IRIS[ch.color][2]); R(x, 19, 2, 2, "#ffffff"); P(x + 3, 22, "#ffffff"); };
  eye(24); eye(36); P(23, 17, LASH); P(40, 17, LASH);                                                    // 눈 + 눈꼬리
  R(21, 25, 3, 1, BLUSH); R(40, 25, 3, 1, BLUSH); P(31, 24, Ss); R(31, 27, 2, 1, MOUTH);
  // 앞머리·옆머리
  if (hs === "bob") { R(19, 8, 26, 6, H); for (let x = 19; x < 44; x += 4) clump(x, 13, 5, 4); clump(16, 12, 6, 20, 1); clump(42, 12, 6, 20, -1); }
  if (hs === "long" || hs === "braid") { R(20, 8, 24, 3, H); P(31, 8, Hs); P(32, 9, Hs);
    for (const [x, ln, l] of [[19, 9, -2], [23, 9, -1], [27, 7, -1]]) { clump(x, 9, 6, ln, l); clump(64 - x - 6, 9, 6, ln, -l); }
    const sl = hs === "long" ? 32 : 13; clump(16, 12, 6, sl, 0); clump(42, 12, 6, sl, 0);
    if (hs === "braid") { braid(19, 24, 40); braid(45, 24, 40); } }
  if (hs === "shaggy") { R(19, 7, 26, 4, H); for (const [x, ln, l] of [[18, 9, -1], [22, 10, 1], [26, 8, -1], [30, 9, 1], [34, 10, -1], [38, 8, 1], [41, 9, 1]]) clump(x, 9, 6, ln, l);
    for (const x of [22, 30, 38]) clump(x, 5, 5, 4, x - 30 >> 2, true); }
  if (hs === "perm") { R(21, 6, 22, 5, H); curls([[22, 11], [28, 12], [34, 12], [40, 11], [25, 6], [32, 5], [39, 6]], 4); }
  if (hs === "buzz") { R(20, 8, 24, 3, H); R(19, 11, 3, 6, H); R(42, 11, 3, 6, H); R(24, 11, 16, 1, H); for (let x = 22; x < 43; x += 3) P(x, 9, Hh); R(27, 6, 10, 1, Hh); }
  if (hs === "dandy") { R(19, 8, 26, 4, H); for (const [x, ln] of [[18, 10], [22, 11], [26, 10], [30, 8], [34, 6]]) clump(x, 10, 7, ln, 5); clump(41, 10, 4, 5, 0); clump(16, 12, 5, 9, 0); clump(43, 12, 5, 9, 0); }
  if (hs !== "perm" && hs !== "buzz") ring(6, 21, 43);
  if (ch.glasses) { for (const x of [24, 36]) { R(x - 2, 17, 8, 1, FRAME); R(x - 2, 24, 8, 1, FRAME); R(x - 2, 17, 1, 8, FRAME); R(x + 5, 17, 1, 8, FRAME); P(x + 3, 19, "#ffffff"); P(x + 4, 20, "#ffffff"); } R(30, 20, 4, 1, FRAME); }
}
// 다 그린 뒤 빈 칸 중 그림에 닿은 칸을 이웃 색의 어두운 버전으로 칠함 → 깔끔한 외곽선
function outline(ctx, N) {
  const im = ctx.getImageData(0, 0, N, N), d = im.data, out = new Uint8ClampedArray(d);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4; if (d[i + 3]) continue;
    let b = -1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
      const j = (yy * N + xx) * 4; if (d[j + 3] > 200 && (b < 0 || d[j] + d[j + 1] + d[j + 2] < d[b] + d[b + 1] + d[b + 2])) b = j; }
    if (b >= 0) { out[i] = d[b] * 0.3 + 10; out[i + 1] = d[b + 1] * 0.25 + 8; out[i + 2] = d[b + 2] * 0.35 + 20; out[i + 3] = 255; }
  }
  im.data.set(out); ctx.putImageData(im, 0, 0);
}

// 보충쌤(48×48, 직접 디자인): 얼룩 묻은 흰 가운, 동그란 안경, 매서운 눈썹, 반쯤 센 가르마 머리, 줄무늬 넥타이, 손에는 출석부
function teacher(ctx, dir, frame) {
  const { px, rect, oval, blob } = painter(ctx), side = dir === "l" || dir === "r", back = dir === "u";
  const SKIN = "#f0c7a0", SKIN_D = "#d49e76", HAIR = "#2b2420", GRAY = "#8f8a86", LINE = "#24222c";
  const COAT = "#f5f5f2", COAT_D = "#d8dbe2", COAT_M = "#e7e8ec", PANTS = "#2f3347", PANTS_L = "#454a63", SHOE = "#4a2e1c";
  oval(24, 46, 11, 2, SHADOW);
  // 다리·구두: 걸을 때 한쪽씩 들고, 옆모습은 앞뒤로 벌림
  const lift = i => (frame === 1 && i === 0) || (frame === 2 && i === 1) ? 3 : 0;
  const stride = i => side && frame ? ((frame === 1) === (i === 0) ? 3 : -3) : 0;
  (side ? [21, 25] : [18, 26]).forEach((x, i) => {
    const lx = x + stride(i), ly = 36 - lift(i);
    rect(lx - 1, ly, 6, 9, LINE); rect(lx, ly, 4, 8, PANTS); rect(lx + 1, ly, 1, 7, PANTS_L);           // 바지(주름선)
    rect(lx - 1 + (side ? 1 : 0), ly + 7, side ? 6 : 5, 3, LINE); rect(lx + (side ? 1 : 0), ly + 7, side ? 5 : 4, 2, SHOE); px(lx + 1 + (side ? 3 : 0), ly + 7, "#7a5236"); // 구두 + 광
  });
  // 가운: 아래로 갈수록 살짝 퍼짐
  const cx0 = side ? 17 : 13, cw = side ? 15 : 23;
  rect(cx0, 19, cw, 20, LINE); rect(cx0 - 1, 33, cw + 2, 6, LINE);
  rect(cx0 + 1, 20, cw - 2, 18, COAT); rect(cx0, 33, cw, 5, COAT);
  rect(cx0 + cw - 4, 20, 3, 18, COAT_D); rect(cx0 + 1, 34, cw - 2, 1, COAT_M);                          // 오른쪽 그늘·주름
  if (back) {
    rect(24, 22, 1, 15, COAT_D); rect(19, 30, 11, 2, COAT_M); rect(19, 30, 11, 1, COAT_D);              // 등 솔기·허리 띠
  } else if (side) {
    rect(29, 21, 2, 6, "#b9d4f0"); rect(30, 22, 1, 7, "#8e1f2a");                                        // 옆으로 보이는 셔츠·넥타이 끝
    rect(19, 32, 5, 1, COAT_D); px(20, 36, "#7fae5a"); px(21, 37, "#7fae5a");                            // 주머니·약품 얼룩
  } else {
    rect(21, 19, 6, 9, "#b9d4f0");                                                                       // 셔츠(V)
    for (let k = 0; k < 9; k++) { px(20 + Math.floor(k / 3), 19 + k, COAT_D); px(27 - Math.floor(k / 3), 19 + k, COAT_D); } // 옷깃
    rect(23, 20, 2, 11, "#8e1f2a"); for (let y = 22; y < 31; y += 3) rect(23, y, 2, 1, "#c94a52"); px(23, 20, "#5e1018"); // 넥타이 줄무늬
    for (const y of [31, 34]) px(26, y, "#c7c9d0");                                                      // 단추
    rect(28, 24, 4, 1, COAT_D); rect(28, 21, 1, 3, "#c83030"); rect(30, 21, 1, 3, "#2f5fb0");             // 가슴 주머니 + 빨강·파랑 펜
    rect(15, 33, 5, 1, COAT_D); rect(28, 33, 5, 1, COAT_D);                                              // 아래 주머니
    px(16, 36, "#7fae5a"); px(17, 37, "#7fae5a"); px(16, 37, "#9cc47a");                                  // 약품 얼룩
  }
  // 팔: 걸음에 맞춰 흔들고, 앞·옆모습은 출석부를 듦
  const sw = frame ? (frame === 1 ? 2 : -2) : 0;
  const board = (bx, by) => { rect(bx, by, 8, 10, LINE); rect(bx + 1, by + 1, 6, 8, "#8a5a2e"); rect(bx + 2, by + 2, 4, 6, "#f4f1e8");
    for (let y = by + 3; y < by + 8; y += 2) rect(bx + 2, y, 3, 1, "#9aa0aa"); rect(bx + 3, by, 2, 2, "#c0c4cc"); };
  if (side) {
    rect(23 + sw, 21, 5, 11, LINE); rect(24 + sw, 22, 3, 9, COAT); rect(24 + sw, 30, 3, 1, COAT_D); rect(24 + sw, 31, 3, 2, SKIN);
    if (!back) board(27, 25);
  } else {
    rect(9, 20 + sw, 5, 13, LINE); rect(10, 21 + sw, 3, 11, COAT); rect(10, 31 + sw, 3, 1, COAT_D); rect(10, 32 + sw, 3, 2, SKIN);
    rect(34, 20 - sw, 5, 13, LINE); rect(35, 21 - sw, 3, 11, COAT); rect(35, 31 - sw, 3, 1, COAT_D); rect(35, 32 - sw, 3, 2, SKIN);
    if (!back) board(5, 28 + sw);
  }
  // 목·머리
  const hx = side ? 25 : 24;
  rect(hx - 2, 16, 5, 4, SKIN_D);
  blob(hx, 10, side ? 7 : 8, 8, SKIN, LINE);
  if (!side) { rect(hx - 9, 9, 2, 4, SKIN); rect(hx + 8, 9, 2, 4, SKIN); px(hx - 9, 10, SKIN_D); px(hx + 9, 10, SKIN_D); } // 귀
  else { rect(hx - 4, 9, 2, 4, SKIN_D); }
  // 머리카락: 옆가르마, 희끗한 줄
  if (back) { // 뒷모습: 귀가 살짝 보이고, 뒷머리 끝이 목덜미에서 정리됨. 새치는 몇 가닥만
    rect(hx - 9, 9, 2, 4, SKIN); rect(hx + 8, 9, 2, 4, SKIN);
    blob(hx, 8, 8, 7, HAIR, LINE); rect(hx - 5, 14, 11, 1, "#3a302a"); px(hx - 3, 5, GRAY); px(hx - 2, 6, GRAY); px(hx + 3, 4, GRAY); px(hx + 4, 9, GRAY);
    rect(hx - 4, 1, 8, 1, "#4a3f38"); return; }
  oval(hx, 3, side ? 7 : 8, 3, HAIR); rect(hx - (side ? 7 : 8), 3, side ? 4 : 2, side ? 8 : 6, HAIR); if (!side) rect(hx + 7, 3, 2, 6, HAIR);
  px(hx - 7, 5, GRAY); px(hx - 7, 7, GRAY); px(hx + 7, 6, GRAY); rect(hx - 2, 1, 7, 1, "#4a3f38"); px(hx - 3, 2, "#4a3f38"); // 관자놀이 새치·가르마 윤기
  if (side) { // 옆얼굴: 안경 옆면, 매부리코, 굳게 다문 입
    rect(hx + 3, 6, 4, 1, LINE); rect(hx + 1, 8, 6, 4, LINE); rect(hx + 2, 9, 4, 2, "#cfe8ff"); px(hx + 2, 9, "#ffffff"); px(hx + 4, 10, LINE);
    rect(hx - 1, 9, 2, 1, LINE); px(hx + 8, 11, SKIN); px(hx + 8, 12, SKIN_D); px(hx + 9, 12, SKIN_D);
    rect(hx + 3, 15, 4, 1, "#7a2a2a"); px(hx + 6, 14, "#7a2a2a");
    return;
  }
  for (const [x, d] of [[hx - 6, 1], [hx + 2, -1]]) { // 매서운 눈썹(안쪽이 내려감)
    rect(x, 5, 4, 1, HAIR); px(d > 0 ? x + 3 : x, 6, HAIR); px(d > 0 ? x + 4 : x - 1, 6, HAIR);
  }
  for (const gx of [hx - 7, hx + 1]) { rect(gx, 7, 6, 5, LINE); rect(gx + 1, 8, 4, 3, "#cfe8ff"); px(gx + 1, 8, "#ffffff"); px(gx + 2, 8, "#ffffff"); rect(gx + 2, 9, 2, 2, LINE); } // 동그란 안경 + 반짝임 + 눈
  rect(hx - 1, 9, 2, 1, LINE);                                                                          // 안경 다리 사이
  px(hx, 12, SKIN_D); px(hx, 13, SKIN_D); px(hx - 1, 13, SKIN_D);                                      // 코
  for (const gx of [hx - 6, hx + 2]) rect(gx, 12, 4, 1, SKIN_D);                                      // 다크서클(밤샘 채점)
  rect(hx - 3, 15, 6, 1, "#6a2424"); px(hx + 3, 14, "#6a2424"); px(hx + 4, 13, "#6a2424");             // 한쪽만 올라간 비웃음
  rect(hx - 3, 17, 6, 1, SKIN_D);                                                                       // 턱 그늘
}

// kind: 캐릭터 번호 또는 "teacher". dir: d·u·l·r. frame: 0 서 있기, 1·2 걸음
export function sprite(kind, dir = "d", frame = 0) {
  const key = `${kind}|${dir}|${frame}`;
  if (cache.has(key)) return cache.get(key);
  const N = kind === "teacher" ? 48 : 64; // 학생 64×64, 보충쌤 48×48(화면에서는 칸 크기에 맞춰 그림)
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const ctx = cv.getContext("2d");
  if (dir === "l") { ctx.translate(N, 0); ctx.scale(-1, 1); } // 왼쪽은 오른쪽 모습을 뒤집음
  if (frame) ctx.translate(0, -1); // 걸을 때 몸이 살짝 통통 튐
  if (kind === "teacher") teacher(ctx, dir, frame);
  else { student(ctx, CHARS[kind] ?? CHARS[0], dir, frame); outline(ctx, N); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "destination-over"; painter(ctx).oval(32, 57, 12, 2, SHADOW); }
  cache.set(key, cv); return cv;
}
