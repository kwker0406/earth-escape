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

// 64×64 학생: 2등신 치비 비율(머리 26px, 몸 30px), 큰 눈 + 반짝임, 머리 윤기 링. 외곽선은 다 그린 뒤 자동으로 두름(outline)
const PAL = {
  skin: ["#ffe3cf", "#f6c3a3", "#e39d84"], black: ["#2e2b40", "#1b1928", "#4d4a6a", "#7d79a6"], blond: ["#f4c95d", "#d39a3a", "#ffe79c", "#fff7d6"],
  navy: ["#2c3b70", "#1c264d", "#41549a"], shirt: ["#ffffff", "#d5dbea", "#ffffff"], red: ["#dd3640", "#9b1e2b", "#f5717a"], shoe: ["#3d2b25", "#6b4a3c"],
};
const IRIS = { black: ["#3b2420", "#7a4a36", "#c08a5c"], blond: ["#1d3f80", "#3a78d0", "#86c2f5"] }, LASH = "#1c1420", FRAME = "#3a3550", BLUSH = "#f7a0a8", MOUTH = "#b4524a";
function student(ctx, ch, dir, frame) {
  const { px: P, rect: R, oval: O } = painter(ctx), side = dir === "l" || dir === "r", back = dir === "u", front = !side && !back;
  const [H, Hs, Hh, Hh2] = PAL[ch.color], [S, Ss] = PAL.skin, blazer = ch.color === "black", top = blazer ? PAL.navy : PAL.shirt, [Nv, Nvs] = PAL.navy, red = PAL.red;
  const hs = ch.hair, longish = hs === "long" || hs === "bob";
  const bang = (x, w, len, y0 = 15, c = H) => { for (let k = 0; k < len; k++) { const cut = Math.floor(k * w / (2 * len)); R(x + cut, y0 + k, Math.max(1, w - cut * 2), 1, c); } }; // 아래로 뾰족한 앞머리 한 가닥
  const curls = (pts, r = 3) => pts.forEach(([x, y]) => { O(x, y, r, r, Hs); O(x - 1, y - 1, r - 1, r - 1, H); P(x - 1, y - 2, Hh); P(x - 2, y - 1, Hh); }); // 곱슬 한 덩이(그늘 + 윤기)
  // 다리: 걸을 때 한쪽씩 들고, 옆모습은 앞뒤로 벌림
  const lift = i => (frame === 1 && i === 0) || (frame === 2 && i === 1) ? 2 : 0;
  const stride = i => side && frame ? ((frame === 1) === (i === 0) ? 3 : -3) : 0;
  const legs = () => (side ? [29, 32] : [26, 34]).forEach((x, i) => {
    const lx = x + stride(i), ly = -lift(i);
    if (ch.girl) { R(lx, 50 + ly, 4, 4, S); R(lx + 3, 50 + ly, 1, 4, Ss); R(lx, 53 + ly, 4, 4, "#ffffff"); R(lx + 3, 53 + ly, 1, 4, PAL.shirt[1]); }
    else { R(lx - 1, 46 + ly, 6, 11, Nv); R(lx + 3, 46 + ly, 2, 11, Nvs); }
    R(lx - 1, 57 + ly, side ? 7 : 6, 3, PAL.shoe[0]); R(lx + (side ? 2 : 0), 57 + ly, 2, 1, PAL.shoe[1]);
  });
  const skirt = (cx, w0) => { for (let y = 44; y < 52; y++) { const w = w0 + ((y - 44) >> 1); R(cx - w, y, w * 2, 1, y > 49 ? Nvs : Nv); } for (let x = cx - w0 + 2; x < cx + w0; x += 4) R(x, 46, 1, 5, Nvs); };
  const sw = frame ? (frame === 1 ? 2 : -2) : 0;
  const hand = (x, y) => { R(x, y, 4, 3, S); R(x, y + 2, 4, 1, Ss); };

  if (side) { // ── 옆모습(오른쪽을 봄. 왼쪽은 뒤집어서 씀)
    if (hs === "long") { R(21, 16, 11, 31, H); R(23, 30, 2, 15, Hs); }
    if (hs === "bob") { R(21, 16, 11, 16, H); R(21, 30, 11, 1, Hs); }
    if (hs === "braid") { for (let y = 27; y < 43; y += 4) { O(24, y + 2, 2, 2, H); P(23, y + 1, Hh); } R(22, 43, 4, 2, red[0]); R(23, 45, 2, 3, H); }
    legs();
    if (ch.girl && blazer) skirt(32, 8);
    R(26, 33, 13, blazer ? 14 : 12, top[0]); R(26, 35, 2, 10, top[1]); R(27, 32, 10, 1, top[0]);
    R(37, 33, 2, 6, "#ffffff"); R(37, 35, 2, ch.girl ? 3 : 8, red[0]); P(38, 35, red[2]);              // 앞섶: 셔츠 + 리본·넥타이
    if (ch.girl && !blazer) skirt(32, 8);
    if (!ch.girl && !blazer) { R(26, 45, 13, 2, PAL.shoe[0]); }                                        // 허리띠
    R(30 + sw, 34, 4, 11, top[0]); R(30 + sw, 34, 1, 11, top[1]); if (blazer) R(30 + sw, 44, 4, 1, "#ffffff"); hand(30 + sw, 45);
    R(31, 30, 5, 4, Ss);
    O(29, 16, 13, 12, H); O(34, 20, 11, 11, S); R(34, 29, 6, 2, S);                                     // 뒷머리 → 얼굴
    R(28, 19, 3, 5, S); P(29, 20, Ss); P(29, 21, Ss);                                                   // 귀
    R(26, 6, 18, 9, H); bang(30, 6, 4, 15); bang(35, 6, 5, 15); bang(40, 5, 4, 15); // 앞머리·옆머리
    R(28, 7, 10, 1, Hh); R(26, 8, 3, 1, Hh); P(33, 6, Hh2);                                              // 윤기
    if (hs === "perm") curls([[20, 10], [24, 5], [30, 3], [37, 4], [43, 8], [19, 17], [22, 23], [27, 26]]);
    if (hs === "shaggy") { bang(42, 4, 4, 14); for (const x of [25, 31, 37]) bang(x, 5, 3, 2); }
    if (hs === "buzz") { R(26, 6, 18, 6, H); R(28, 12, 3, 4, S); for (let x = 27; x < 43; x += 3) P(x, 8, Hh); }
    if (hs === "dandy") { R(34, 9, 11, 4, H); bang(39, 6, 5, 13); }
    R(37, 19, 5, 1, LASH); R(38, 20, 4, 5, IRIS[ch.color][0]); R(38, 22, 4, 3, IRIS[ch.color][1]); R(39, 24, 2, 1, IRIS[ch.color][2]); R(38, 20, 2, 2, "#ffffff"); P(41, 23, "#ffffff");
    R(37, 26, 3, 1, BLUSH); P(45, 23, Ss); R(41, 28, 2, 1, MOUTH);
    if (ch.glasses) { R(36, 18, 7, 1, FRAME); R(36, 26, 7, 1, FRAME); R(36, 18, 1, 9, FRAME); R(42, 18, 1, 9, FRAME); R(29, 21, 7, 1, FRAME); P(41, 19, "#ffffff"); }
    return;
  }

  // ── 앞·뒷모습 공통: 긴 머리는 몸 뒤로
  if (front && hs === "long") { R(18, 16, 28, 31, H); R(20, 34, 24, 12, Hs); }
  if (front && hs === "bob") { R(18, 16, 28, 16, H); }
  legs();
  if (ch.girl && blazer) skirt(32, 10);
  R(23, 33, 18, blazer ? 14 : 13, top[0]); R(22, 35, 20, blazer ? 12 : 11, top[0]); R(38, 35, 3, blazer ? 12 : 11, top[1]); // 몸통(둥근 어깨)
  if (ch.girl && !blazer) skirt(32, 10);
  if (!ch.girl && !blazer) { R(22, 45, 20, 2, PAL.shoe[0]); R(31, 45, 3, 2, "#c9a84a"); }               // 허리띠 + 버클
  for (const [ax, d] of [[18, 1], [42, -1]]) { const ay = 34 + sw * d;                                      // 팔
    R(ax, ay, 4, 11, top[0]); R(ax + (d > 0 ? 3 : 0), ay, 1, 11, top[1]); if (blazer) R(ax, ay + 10, 4, 1, "#ffffff"); hand(ax, ay + 11); }

  if (back) {
    if (blazer) { R(32, 36, 1, 11, Nvs); R(23, 33, 18, 1, PAL.navy[2]); } else R(32, 37, 1, 8, top[1]);
    R(19, 20, 2, 4, S); R(43, 20, 2, 4, S);                                                              // 귀
    O(32, 17, 14, 13, H); R(25, 7, 14, 1, Hh); R(23, 8, 3, 1, Hh); R(38, 8, 3, 1, Hh); P(30, 6, Hh2);     // 뒤통수 + 윤기 링
    if (hs === "long") { R(19, 22, 26, 25, H); for (const x of [25, 32, 38]) R(x, 28, 1, 17, Hs); }
    if (hs === "bob") { R(19, 22, 26, 10, H); R(19, 31, 26, 1, Hs); }
    if (hs === "braid") for (const x of [25, 37]) { for (let y = 28; y < 44; y += 4) { O(x, y + 2, 2, 2, H); P(x - 1, y + 1, Hh); } R(x - 2, 43, 4, 2, red[0]); R(x - 1, 45, 2, 3, H); }
    if (hs === "perm") curls([[20, 12], [44, 12], [19, 20], [45, 20], [22, 27], [42, 27], [28, 30], [36, 30], [32, 4], [24, 6], [40, 6]]);
    if (hs === "shaggy" || hs === "dandy") for (const x of [23, 28, 33, 38]) bang(x, 5, 3, 29);
    if (hs === "buzz") { R(28, 29, 9, 2, S); for (let x = 22; x < 43; x += 3) P(x, 14, Hh); }
    return;
  }

  // ── 앞모습 몸 장식
  if (blazer) { for (let k = 0; k < 8; k++) { const c = k >> 1; R(28 + c, 33 + k, 8 - c * 2, 1, "#ffffff"); P(27 + c, 33 + k, PAL.navy[2]); P(36 - c, 33 + k, PAL.navy[2]); } // V자 셔츠 + 옷깃
    R(32, 41, 1, 6, Nvs); P(34, 43, "#e6c25a"); P(34, 46, "#e6c25a"); R(24, 42, 5, 1, Nvs); R(36, 42, 4, 1, Nvs); }
  else { R(32, 38, 1, 7, top[1]); P(33, 40, top[1]); P(33, 43, top[1]); }
  R(27, 32, 4, 2, "#ffffff"); R(33, 32, 4, 2, "#ffffff"); P(30, 33, PAL.shirt[1]); P(33, 33, PAL.shirt[1]); // 셔츠 깃
  if (ch.girl) { R(26, 34, 5, 3, red[0]); R(33, 34, 5, 3, red[0]); R(30, 34, 4, 3, red[1]); P(27, 34, red[2]); P(34, 34, red[2]); R(28, 37, 2, 3, red[0]); R(34, 37, 2, 3, red[0]); } // 리본
  else { R(31, 34, 2, 2, red[1]); R(31, 36, 2, blazer ? 5 : 8, red[0]); P(31, 36, red[2]); }            // 넥타이
  // ── 얼굴
  R(29, 30, 6, 4, Ss);                                                                                    // 목
  if (hs === "buzz") O(32, 14, 13, 8, H); else if (hs !== "perm") O(32, 14, 14, 9, H);                   // 머리 뒤판
  if (hs === "perm") curls([[19, 12], [45, 12], [19, 19], [45, 19], [20, 26], [44, 26], [22, 6], [42, 6], [27, 3], [32, 2], [37, 3]], 4);
  R(19, 20, 2, 4, S); R(43, 20, 2, 4, S); P(19, 21, Ss); P(44, 21, Ss);                                  // 귀
  O(32, 20, 12, 11, S); R(21, 16, 23, 1, Ss);                                                            // 얼굴 + 앞머리 그늘
  const eye = x => { R(x - 1, 19, 7, 1, LASH); R(x, 20, 5, 5, IRIS[ch.color][0]); R(x, 22, 5, 3, IRIS[ch.color][1]); R(x + 1, 24, 3, 1, IRIS[ch.color][2]); R(x, 20, 2, 2, "#ffffff"); P(x + 3, 23, "#ffffff"); };
  eye(24); eye(36); P(23, 20, LASH); P(41, 20, LASH);                                                    // 눈꼬리
  R(21, 26, 3, 1, BLUSH); R(41, 26, 3, 1, BLUSH); R(31, 28, 2, 1, MOUTH);
  // ── 앞머리
  const cap = () => { R(20, 8, 25, 7, H); R(25, 7, 14, 1, Hh); R(23, 8, 3, 1, Hh); R(38, 8, 3, 1, Hh); P(30, 6, Hh2); };
  if (hs === "bob") { cap(); R(20, 15, 25, 2, H); for (let x = 21; x < 44; x += 4) P(x, 17, H); R(17, 13, 4, 18, H); R(43, 13, 4, 18, H); R(20, 16, 1, 15, Hs); R(43, 16, 1, 15, Hs); }
  if (hs === "long" || hs === "braid") { cap(); P(32, 8, S); P(32, 9, S); bang(20, 6, 5); bang(25, 7, 4); bang(33, 7, 4); bang(39, 6, 5); // 가운데 가르마
    R(17, 13, 4, hs === "long" ? 22 : 14, H); R(43, 13, 4, hs === "long" ? 22 : 14, H);
    if (hs === "braid") for (const x of [19, 45]) { for (let y = 26; y < 42; y += 4) { O(x, y + 2, 2, 2, H); P(x - 1, y + 1, Hh); } R(x - 2, 42, 4, 2, red[0]); R(x - 1, 44, 2, 3, H); } }
  if (hs === "shaggy") { cap(); for (const [x, l] of [[19, 6], [23, 4], [27, 5], [31, 3], [35, 5], [39, 4], [42, 6]]) bang(x, 5, l); for (const x of [24, 31, 37]) bang(x, 5, 3, 4); R(18, 13, 3, 10, H); R(44, 13, 3, 10, H); }
  if (hs === "perm") { R(21, 6, 23, 5, H); curls([[22, 12], [27, 13], [32, 12], [37, 13], [42, 12], [25, 7], [32, 6], [39, 7]]); }
  if (hs === "buzz") { R(20, 8, 25, 4, H); R(20, 12, 2, 6, H); R(43, 12, 2, 6, H); for (let x = 22; x < 43; x += 3) P(x, 9, Hh); R(26, 7, 12, 1, Hh); }
  if (hs === "dandy") { cap(); for (let k = 0; k < 4; k++) R(20, 15 + k, 15 - k * 3, 1, H); bang(37, 5, 3); bang(41, 4, 3); R(18, 13, 3, 8, H); R(44, 13, 3, 8, H); R(22, 11, 8, 1, Hh2); }
  if (ch.glasses) { for (const x of [24, 36]) { R(x - 2, 18, 9, 1, FRAME); R(x - 2, 26, 9, 1, FRAME); R(x - 2, 18, 1, 9, FRAME); R(x + 6, 18, 1, 9, FRAME); P(x + 4, 20, "#ffffff"); P(x + 5, 21, "#ffffff"); } R(31, 21, 3, 1, FRAME); }
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
  else { student(ctx, CHARS[kind] ?? CHARS[0], dir, frame); outline(ctx, N); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "destination-over"; painter(ctx).oval(32, 61, 13, 2, SHADOW); }
  cache.set(key, cv); return cv;
}
