// 도트 캐릭터(128×128 픽셀, 직접 디자인한 학생 8명 + 48×48 보충쌤). 앞(d)·뒤(u)·옆(l·r) × 서 있기(0)·걸음(1·2).
// 그림 파일 없이 코드로 점을 찍어 만들고, 한 번 만든 그림은 기억해 둔다(sprite).
// 교복: 검은 머리 학생은 남색 블레이저 + 흰 셔츠, 금발 학생은 블레이저 없이 흰 셔츠. 여학생 붉은 리본 + 남색 치마, 남학생 붉은 넥타이 + 남색 바지
export const CHARS = [
  { name: "보브 안경", emoji: "👓", girl: 1, hair: "bob", color: "black", glasses: 1, png: "bob" }, // png: chars/ 폴더의 PixelLab 그림을 씀
  { name: "긴 생머리", emoji: "👩", girl: 1, hair: "long", color: "black", png: "long" },
  { name: "땋은 머리", emoji: "👧", girl: 1, hair: "braid", color: "black", png: "braid" },
  { name: "금발 생머리", emoji: "👱‍♀️", girl: 1, hair: "long", color: "blond", png: "blond" },
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

// 128×128 학생(큰 머리 치비 도트): 큰 눈(흰자·홍채 3단·동공·반짝임), 눈썹, 웃는 입, 볼터치, 3~4단 명암 머리 가닥.
// 머리카락은 끝이 뾰족한 가닥(clump)을 손으로 배치. 외곽선은 다 그린 뒤 자동으로 두름(outline)
const PAL = {
  skin: ["#ffe2cc", "#f4bf9e", "#e0977c"], black: ["#2f3550", "#1f2338", "#4a5578", "#7484b0", "#141626"], blond: ["#f2c14e", "#d0952f", "#ffe08a", "#fff3c4", "#a8691f"],
  navy: ["#2c3b70", "#1c264d", "#41549a", "#131a38"], shirt: ["#ffffff", "#d5dbea", "#ffffff", "#aab3c8"], red: ["#dd3640", "#9b1e2b", "#f5717a"], shoe: ["#3d2b25", "#6b4a3c", "#24180f"],
};
const IRIS = { black: ["#3a2016", "#7a4a2c", "#b98252"], blond: ["#14306a", "#2f6fc4", "#7fbcf2"] }, PUPIL = "#170d0a", LASH = "#1c1420", FRAME = "#33304a", BLUSH = "rgba(244,128,140,0.55)", MOUTH = "#a8433c";
function student(ctx, ch, dir, frame) {
  const { px: P, rect: R, oval: O } = painter(ctx), side = dir === "l" || dir === "r", back = dir === "u", front = !side && !back;
  const [H, Hs, Hh, Hh2, Hd] = PAL[ch.color], [S, Ss, Sd] = PAL.skin, blazer = ch.color === "black", top = blazer ? PAL.navy : PAL.shirt, red = PAL.red, hs = ch.hair, nv = PAL.navy;
  const I = IRIS[ch.color];
  // 머리 가닥: (x,y)부터 폭 w → 1로 가늘어지며 len줄. lean: 끝이 옆으로 휘는 정도(+오른쪽), up: 위로 뻗침. 오른쪽 1/3 그늘·가장자리 진한 그늘, 위쪽 왼편 윤기
  const clump = (x, y, w, len, lean = 0, up = false) => { for (let k = 0; k < len; k++) {
    const t = k / len, ww = Math.max(1, Math.round(w * (1 - t))), xx = Math.round(x + (w - ww) / 2 + lean * t * t), yy = up ? y - k : y + k;
    R(xx, yy, ww, 1, H); if (ww > 3) R(xx + Math.ceil(ww * 0.66), yy, Math.floor(ww / 3), 1, Hs); if (ww > 2) P(xx + ww - 1, yy, Hd);
    if (ww > 4 && t < 0.45) { P(xx + 1, yy, Hh); if (t < 0.2) P(xx + 2, yy, Hh2); } } };
  const mclump = (x, y, w, len, lean = 0, up = false) => clump(128 - x - w, y, w, len, -lean, up);   // 좌우 대칭 가닥
  const curls = (pts, r = 7) => pts.forEach(([x, y]) => { O(x, y, r, r, Hd); O(x - 1, y - 1, r - 1, r - 1, Hs); O(x - 2, y - 2, r - 2, r - 2, H); O(x - 3, y - 3, 2, 1, Hh); P(x - 4, y - 2, Hh2); });
  const braid = (x, y0, y1) => { for (let y = y0; y < y1; y += 6) { O(x, y + 3, 5, 3, Hs); O(x - 1, y + 2, 4, 2, H); R(x - 3, y + 1, 2, 1, Hh); } R(x - 4, y1, 9, 3, red[0]); R(x - 3, y1, 3, 1, red[2]); clump(x - 4, y1 + 3, 9, 8); };
  const cap = (yb, ry = 28, rx = 32, cy = 40) => { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 128, yb); ctx.clip(); O(64, cy, rx, ry, H); ctx.restore(); }; // 앞쪽 머리 윗부분(둥근 머리 모양 그대로 yb까지)
  const ring = (y, x0, x1) => { R(x0 + 6, y, x1 - x0 - 12, 2, Hh); R(x0 + 1, y + 2, 6, 2, Hh); R(x1 - 7, y + 2, 6, 2, Hh); for (let x = x0 + 9; x < x1 - 8; x += 7) R(x, y, 3, 1, Hh2); }; // 윤기 링
  const lift = i => (frame === 1 && i === 0) || (frame === 2 && i === 1) ? 3 : 0;
  const stride = i => side && frame ? ((frame === 1) === (i === 0) ? 6 : -6) : 0;
  const sw = frame ? (frame === 1 ? 2 : -2) : 0;
  const shoe = (x, y, w, toe = 0) => { R(x, y, w + toe, 4, PAL.shoe[0]); R(x + 1, y, 3, 1, PAL.shoe[1]); R(x, y + 4, w + toe, 1, PAL.shoe[2]); };
  const legG = (x, y) => { R(x, y, 6, 7, S); R(x + 4, y, 2, 7, Ss); R(x, y + 6, 6, 5, "#ffffff"); R(x + 4, y + 6, 2, 5, PAL.shirt[1]); };
  const legB = (x, y, h = 19) => { R(x, y, 10, h, nv[0]); R(x + 7, y, 3, h, nv[1]); R(x + 4, y + 3, 1, h - 5, nv[1]); };
  const hand = (x, y) => { O(x, y, 4, 3, S); R(x + 1, y + 2, 3, 1, Ss); };

  if (side) { // ── 옆모습(오른쪽을 봄. 왼쪽은 뒤집어 씀)
    if (hs === "long") { R(36, 40, 22, 60, H); R(38, 70, 6, 28, Hs); for (const x of [34, 41, 48]) clump(x, 98, 9, 10, -2); }
    if (hs === "bob") { R(36, 40, 22, 28, H); for (const x of [35, 42, 49]) clump(x, 66, 9, 6, 1); }
    if (hs === "braid") braid(44, 62, 98);
    [56, 62].forEach((x, i) => { const y = -lift(i), sx = x + stride(i);
      if (ch.girl) { legG(sx, 106 + y); shoe(sx - 1, 117 + y, 8, 3); } else { legB(sx - 2, 98 + y); shoe(sx - 2, 117 + y, 10, 3); }
      if (!i) R(sx - 2, 98 + y, 12, 24, "rgba(0,0,0,0.12)"); });                                              // 뒤쪽 다리 그늘
    if (ch.girl) for (let y = 95; y < 109; y++) { const w = 14 + ((y - 95) >> 1); R(65 - w, y, w * 2, 1, y > 106 ? nv[1] : nv[0]); }
    if (ch.girl) for (let x = 54; x < 78; x += 5) R(x, 99, 1, 8, nv[1]);
    R(54, 76, 22, 24, top[0]); R(54, 78, 4, 22, top[1]); R(56, 74, 16, 2, top[0]); if (blazer) R(54, 97, 22, 3, nv[1]);
    R(72, 75, 4, 12, "#ffffff"); R(73, 79, 3, ch.girl ? 5 : 16, red[0]); P(73, 79, red[2]);                     // 앞섶: 셔츠 + 리본·넥타이
    if (!ch.girl && !blazer) R(54, 96, 22, 3, PAL.shoe[0]);
    R(60 + sw, 78, 9, 19, top[0]); R(60 + sw, 78, 2, 19, top[1]); R(66 + sw, 78, 3, 19, top[2]); if (blazer) R(60 + sw, 95, 9, 2, "#ffffff"); hand(64 + sw, 100); // 팔
    R(62, 68, 10, 9, Ss);                                                                                       // 목
    O(60, 42, 29, 28, H); O(60, 50, 26, 20, Hs);                                                                // 뒤통수
    O(70, 53, 22, 22, Ss); O(68, 51, 21, 21, S); O(72, 63, 15, 12, S); R(88, 56, 3, 4, S); P(91, 58, S); P(90, 59, Ss); // 얼굴·턱·코
    O(57, 57, 4, 6, S); O(57, 58, 2, 3, Ss);                                                                   // 귀
    R(76, 42, 9, 2, Hd); P(84, 44, Hd);                                                                         // 눈썹
    R(74, 47, 10, 2, LASH); P(84, 46, LASH); P(85, 45, LASH); R(76, 49, 7, 12, "#ffffff"); O(79, 55, 3, 6, I[1]); R(77, 49, 6, 2, I[0]); R(78, 59, 3, 2, I[2]);
    O(79, 55, 1, 3, PUPIL); R(77, 50, 2, 3, "#ffffff"); P(81, 58, "#ffffff"); R(77, 61, 6, 1, Ss);               // 눈
    O(76, 66, 3, 2, BLUSH); R(83, 68, 5, 1, MOUTH); P(82, 67, MOUTH);                                            // 볼·입
    // 앞머리(앞으로 휨)·옆머리
    if (hs === "buzz") { O(62, 38, 27, 18, H); R(66, 26, 22, 8, H); for (let x = 42; x < 86; x += 5) R(x, 26 + ((x >> 2) % 3), 3, 1, Hh); }
    else if (hs === "perm") curls([[40, 22], [50, 13], [62, 10], [74, 12], [84, 18], [88, 28], [36, 34], [36, 46], [40, 58], [48, 66]]);
    else { O(60, 36, 29, 20, H); for (const [x, w, ln, l] of [[64, 11, 16, 6], [72, 11, 16, 8], [80, 10, 15, 7], [87, 7, 10, 5]]) clump(x, 30, w, ln, l); clump(52, 36, 11, 24, -2); ring(18, 40, 82); }
    if (hs === "shaggy") { for (const [x, l] of [[46, -4], [58, 0], [70, 4]]) clump(x, 22, 10, 11, l, true); clump(88, 34, 8, 10, 6); }
    if (hs === "dandy") clump(62, 26, 22, 18, 10);
    if (ch.glasses) { R(73, 45, 13, 2, FRAME); R(73, 62, 13, 2, FRAME); R(73, 45, 2, 19, FRAME); R(84, 45, 2, 19, FRAME); R(58, 52, 15, 2, FRAME); R(81, 48, 2, 1, "#ffffff"); P(82, 49, "#ffffff"); }
    return;
  }

  // ── 앞·뒷모습
  if (front && hs === "long") { R(32, 40, 64, 64, H); R(40, 74, 48, 28, Hs); }                                  // 몸 뒤로 넘어간 긴 머리
  if (front && hs === "bob") R(32, 40, 64, 32, H);
  [53, 69].forEach((x, i) => { const y = -lift(i);
    if (ch.girl) { legG(x, 106 + y); shoe(x - 1, 117 + y, 8); } else { legB(x - 2, 98 + y); shoe(x - 3, 117 + y, 12); } });
  if (!ch.girl) R(51, 97, 26, 4, nv[0]);                                                                        // 바지 윗부분
  if (ch.girl) { for (let y = 95; y < 109; y++) { const w = 17 + ((y - 95) * 5 / 13 | 0); R(64 - w, y, w * 2, 1, y > 106 ? nv[1] : nv[0]); } for (let x = 50; x < 80; x += 5) R(x, 99, 2, 8, nv[1]); }
  // 몸통
  for (let y = 75; y < 101; y++) { const w = y < 80 ? 10 + (y - 75) * 1 : 15; R(64 - w, y, w * 2, 1, top[0]); }
  R(73, 79, 6, 21, top[1]); R(49, 80, 2, 20, top[2]); if (blazer) R(49, 98, 30, 2, nv[1]);
  for (const [ax, d] of [[40, 1], [80, -1]]) { const ay = 78 + sw * d;                                          // 팔
    R(ax + 1, ay, 7, 2, top[0]); R(ax, ay + 2, 9, 19, top[0]); R(d > 0 ? ax + 7 : ax, ay + 2, 2, 19, top[1]); R(d > 0 ? ax : ax + 7, ay + 2, 1, 19, top[2]);
    if (blazer) R(ax, ay + 19, 9, 2, "#ffffff"); hand(ax + 4, ay + 24); }
  if (!ch.girl && !blazer) { R(49, 96, 30, 3, PAL.shoe[0]); R(62, 96, 4, 3, "#c9a84a"); }                        // 허리띠
  if (back) {
    if (blazer) R(63, 80, 2, 18, nv[1]); else R(63, 82, 2, 14, PAL.shirt[1]);
    O(38, 56, 4, 6, S); O(90, 56, 4, 6, S);                                                                   // 귀
    O(64, 42, 32, 30, H); O(64, 54, 28, 18, Hs); O(64, 40, 30, 26, H); ring(18, 38, 90);                      // 뒤통수 + 윤기 링
    if (hs === "long") { R(32, 52, 64, 46, H); for (const x of [44, 54, 64, 74, 84]) R(x, 60, 2, 34, Hs); for (let x = 32; x < 96; x += 8) clump(x, 97, 9, 10, x < 62 ? -2 : 2); }
    if (hs === "bob") { R(32, 52, 64, 16, H); for (let x = 32; x < 96; x += 8) clump(x, 67, 9, 6); }
    if (hs === "braid") { braid(52, 64, 98); braid(76, 64, 98); }
    if (hs === "perm") curls([[36, 26], [92, 26], [34, 40], [94, 40], [38, 54], [90, 54], [46, 64], [58, 68], [70, 68], [82, 64], [48, 14], [64, 10], [80, 14]]);
    if (hs === "shaggy" || hs === "dandy") for (let x = 38; x < 90; x += 10) clump(x, 64, 11, 10, x < 62 ? -2 : 2);
    if (hs === "buzz") { R(52, 64, 24, 6, Ss); for (let y = 22; y < 62; y += 8) for (let x = 40; x < 88; x += 9) R(x + (y % 16 ? 4 : 0), y, 3, 1, Hh); }
    return;
  }
  // 앞모습: V자 셔츠·깃·단추·리본·넥타이
  if (blazer) { for (let y = 75; y < 91; y++) { const w = Math.max(1, 8 - ((y - 75) >> 1)); R(64 - w, y, w * 2, 1, "#ffffff"); R(64 - w - 2, y, 2, 1, nv[2]); R(64 + w, y, 2, 1, nv[2]); }
    for (const y of [92, 97]) R(67, y, 2, 2, "#e6c25a"); R(51, 91, 8, 1, nv[1]); R(70, 91, 8, 1, nv[1]); }
  else { R(63, 82, 2, 14, PAL.shirt[1]); for (const y of [85, 90]) P(65, y, PAL.shirt[3]); }
  for (let k = 0; k < 5; k++) { R(55 + k, 74 + k, 8 - k, 1, "#ffffff"); R(65, 74 + k, 8 - k, 1, "#ffffff"); P(55 + k, 75 + k, PAL.shirt[1]); }    // 셔츠 깃
  if (ch.girl) { O(57, 81, 5, 3, red[0]); O(71, 81, 5, 3, red[0]); R(55, 79, 3, 1, red[2]); R(69, 79, 3, 1, red[2]); R(62, 78, 4, 6, red[1]);
    for (const [x, l] of [[59, -1], [67, 1]]) for (let k = 0; k < 7; k++) R(x + (l * k >> 1), 84 + k, 3, 1, red[0]); }                          // 리본
  else { R(62, 77, 4, 4, red[1]); for (let y = 81; y < (blazer ? 91 : 96); y++) R(62 - (y > 85 ? 1 : 0), y, y > 85 ? 6 : 4, 1, red[0]); R(62, 81, 1, 10, red[2]); }
  // 얼굴
  R(57, 66, 14, 12, Ss); R(57, 72, 14, 2, Sd);                                                                 // 목(턱 그늘)
  if (hs === "buzz") O(64, 42, 29, 24, H); else if (hs !== "perm") O(64, 40, 32, 28, H);                       // 머리 뒤판
  if (hs === "perm") curls([[38, 30], [90, 30], [37, 42], [91, 42], [39, 54], [89, 54], [44, 20], [84, 20], [54, 14], [64, 12], [74, 14]], 7);
  O(40, 57, 4, 6, S); O(88, 57, 4, 6, S); O(40, 58, 2, 3, Ss); O(88, 58, 2, 3, Ss);                             // 귀
  O(66, 52, 25, 21, Ss); O(66, 63, 18, 13, Ss); O(64, 51, 24, 21, S); O(64, 62, 18, 13, S);                     // 얼굴(오른쪽 아래 그늘)
  R(42, 38, 44, 4, Ss);                                                                                        // 앞머리 그늘
  const brow = (x, d) => { R(x, 42, 10, 2, Hd); P(d > 0 ? x + 10 : x - 1, 43, Hd); };
  brow(46, 1); brow(72, -1);
  const eye = (x, out) => {
    R(x, 47, 11, 2, LASH); R(out < 0 ? x - 2 : x + 11, 48, 2, 2, LASH); P(out < 0 ? x - 3 : x + 13, 50, LASH);
    R(x, 49, 11, 12, "#ffffff"); P(x, 60, S); P(x + 10, 60, S);
    O(x + 5, 55, 4, 6, I[1]); R(x + 1, 49, 9, 2, I[0]); R(x + 3, 58, 5, 2, I[2]); O(x + 5, 55, 2, 3, PUPIL);
    R(x + 2, 50, 3, 3, "#ffffff"); R(x + 7, 58, 2, 1, "#ffffff"); R(x + 2, 61, 7, 1, Ss); };
  eye(46, -1); eye(71, 1);
  R(63, 63, 2, 2, Ss); O(48, 66, 4, 2, BLUSH); O(80, 66, 4, 2, BLUSH);                                           // 코·볼
  P(59, 67, MOUTH); R(60, 68, 8, 1, MOUTH); P(68, 67, MOUTH); R(61, 69, 6, 1, "#d9736a");                        // 웃는 입
  // 앞머리·옆머리
  if (hs === "bob") { cap(34); ring(18, 38, 90); for (let x = 35; x < 90; x += 7) clump(x, 32, 9, 10); clump(32, 36, 11, 36, 4); mclump(32, 36, 11, 36, 4); }
  if (hs === "long" || hs === "braid") { cap(30); ring(18, 38, 90); R(63, 12, 2, 16, Hs);
    for (const [x, w, ln, l] of [[35, 12, 22, -5], [44, 11, 21, -3], [53, 10, 16, -2]]) { clump(x, 26, w, ln, l); mclump(x, 26, w, ln, l); }
    const sl = hs === "long" ? 72 : 28; clump(27, 32, 13, sl, 0); mclump(27, 32, 13, sl, 0);
    if (hs === "braid") { braid(34, 58, 96); braid(94, 58, 96); } }
  if (hs === "shaggy") { cap(30); ring(18, 38, 90);
    for (const [x, l, ln] of [[38, -4, 10], [50, -1, 12], [62, 2, 13], [74, 5, 10]]) clump(x, 22, 10, ln, l, true);
    for (const [x, w, ln, l] of [[33, 12, 18, -3], [41, 11, 22, 2], [50, 10, 17, -2], [58, 11, 23, 1], [67, 10, 18, 3], [75, 11, 20, -1], [84, 11, 17, 4]]) clump(x, 26, w, ln, l);
    clump(26, 34, 10, 18, -6); mclump(26, 34, 10, 18, -6); }
  if (hs === "perm") { cap(34, 24, 30, 42); curls([[45, 35], [55, 37], [65, 36], [75, 37], [84, 35], [52, 26], [64, 24], [76, 26]], 6); }
  if (hs === "buzz") { cap(34, 24, 29, 42); R(36, 32, 5, 14, H); R(87, 32, 5, 14, H); P(63, 34, H); P(64, 34, H);
    for (let y = 24; y < 32; y += 4) for (let x = 44; x < 82; x += 6) R(x + (y % 8 ? 3 : 0), y, 3, 1, Hh); }
  if (hs === "dandy") { cap(30); ring(18, 38, 90);
    for (const [x, w, ln, l] of [[33, 13, 24, 10], [41, 13, 24, 9], [50, 12, 22, 8], [58, 11, 18, 6], [66, 10, 14, 4]]) clump(x, 26, w, ln, l);
    clump(80, 28, 10, 14, 2); clump(28, 32, 11, 20, 0); mclump(28, 32, 11, 20, 0); }
  if (ch.glasses) { for (const x of [46, 71]) { R(x - 3, 45, 17, 2, FRAME); R(x - 3, 62, 17, 2, FRAME); R(x - 3, 45, 2, 19, FRAME); R(x + 12, 45, 2, 19, FRAME);
    R(x + 8, 48, 2, 1, "#ffffff"); R(x + 9, 49, 1, 2, "#ffffff"); } R(59, 52, 10, 2, FRAME); }
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
  const N = kind === "teacher" ? 48 : 128; // 학생 128×128, 보충쌤 48×48(화면에서는 칸 크기에 맞춰 그림)
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const ctx = cv.getContext("2d");
  const ch = CHARS[kind];
  if (ch?.png) { // PixelLab 그림: 파일이 늦게 오므로 받는 즉시 같은 캔버스에 그림(걸을 때는 2px 위로)
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, frame ? -2 : 0); ctx.globalCompositeOperation = "destination-over"; painter(ctx).oval(64, 121, 22, 3, SHADOW); };
    img.src = new URL(`./chars/${ch.png}_${{ d: "south", u: "north", r: "east", l: "west" }[dir]}.png`, import.meta.url).href;
    cache.set(key, cv); return cv;
  }
  if (dir === "l") { ctx.translate(N, 0); ctx.scale(-1, 1); } // 왼쪽은 오른쪽 모습을 뒤집음
  if (frame) ctx.translate(0, kind === "teacher" ? -1 : -2); // 걸을 때 몸이 살짝 통통 튐
  if (kind === "teacher") teacher(ctx, dir, frame);
  else { student(ctx, CHARS[kind] ?? CHARS[0], dir, frame); outline(ctx, N); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "destination-over"; painter(ctx).oval(64, 122, 24, 3, SHADOW); }
  cache.set(key, cv); return cv;
}
