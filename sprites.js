// 도트 캐릭터(32×32 픽셀, 직접 디자인한 학생 8명 + 48×48 보충쌤). 앞(d)·뒤(u)·옆(l·r) × 서 있기(0)·걸음(1·2).
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
const PINK = "#f5a3b5", EYE = "#1b1b24", SHADOW = "rgba(0,0,0,0.28)";
const cache = new Map();

function painter(ctx) {
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const oval = (cx, cy, rx, ry, c) => { ctx.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.5)) ** 2)); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); } };
  const blob = (cx, cy, rx, ry, fill, line) => { oval(cx, cy, rx + 1, ry + 1, line); oval(cx, cy, rx, ry, fill); }; // 테두리 있는 타원
  return { px, rect, oval, blob };
}

const HAIRC = { black: ["#1e1b24", "#3b3646"], blond: ["#e3b94e", "#f6dc8a"] }; // [기본, 윤기]
const NAVY = "#25305c", NAVY_L = "#34427a", NAVY_D = "#18203f", SHIRT = "#f6f6f8", SHIRT_D = "#d6d9e0", RED = "#c62f35", RED_D = "#8e1f26";
const SKIN = "#f3d0b0", SKIN_D = "#dcaa84", LINE = "#24222c";
function student(ctx, ch, dir, frame) {
  const { px, rect, oval, blob } = painter(ctx), side = dir === "l" || dir === "r", back = dir === "u";
  const [H, HL] = HAIRC[ch.color], blazer = ch.color === "black", hx = side ? 17 : 16;
  oval(16, 30, 7, 1, SHADOW);
  // 다리: 걸을 때 한쪽씩 들고, 옆모습은 앞뒤로 벌림
  const lift = i => (frame === 1 && i === 0) || (frame === 2 && i === 1) ? 2 : 0;
  const stride = i => side && frame ? ((frame === 1) === (i === 0) ? 2 : -2) : 0;
  (side ? [14, 17] : [12, 17]).forEach((x, i) => {
    const lx = x + stride(i), ly = 25 - lift(i);
    if (ch.girl) { rect(lx, ly, 3, 3, SKIN); rect(lx, ly + 2, 3, 2, "#ffffff"); }      // 다리 + 흰 양말
    else { rect(lx - 1, ly, 5, 4, LINE); rect(lx, ly, 3, 4, NAVY); }                 // 남색 바지
    rect(lx - (side ? 0 : 1), ly + 3, 4, 2, LINE); px(lx + 1, ly + 3, "#4a3a30");     // 구두
  });
  // 긴 머리·땋은 머리는 몸 뒤로 내려옴(앞모습에서는 어깨 옆으로)
  if (!side && !back && (ch.hair === "long")) { rect(hx - 9, 11, 4, 12, LINE); rect(hx + 6, 11, 4, 12, LINE); rect(hx - 8, 11, 2, 11, H); rect(hx + 7, 11, 2, 11, H); }
  // 몸통: 블레이저(검은 머리) 또는 흰 셔츠(금발)
  const bx = side ? 12 : 10, bw = side ? 9 : 13;
  if (ch.girl) { rect(side ? 11 : 9, 22, side ? 11 : 15, 5, LINE); rect(side ? 12 : 10, 22, side ? 9 : 13, 4, NAVY); for (let x = side ? 13 : 11; x < (side ? 21 : 23); x += 3) rect(x, 23, 1, 3, NAVY_D); } // 남색 주름치마
  rect(bx - 1, 17, bw + 2, 7, LINE); rect(bx, 18, bw, 5, blazer ? NAVY : SHIRT);
  if (back) { if (blazer) { rect(15, 18, 1, 5, NAVY_D); rect(bx, 18, bw, 1, NAVY_L); } else rect(bx, 18, bw, 1, SHIRT_D); }
  else if (side) { rect(19, 18, 2, 3, SHIRT); px(20, 19, RED); if (blazer) rect(bx, 18, 2, 5, NAVY_L); }
  else {
    rect(14, 17, 4, 4, SHIRT); px(14, 17, SHIRT_D); px(17, 17, SHIRT_D);              // 셔츠 깃(V)
    if (ch.girl) { rect(12, 20, 3, 2, RED); rect(17, 20, 3, 2, RED); rect(15, 20, 2, 2, RED_D); px(14, 22, RED); px(17, 22, RED); } // 실리본(턱 아래로 보이게)
    else { rect(15, 18, 2, 5, RED); px(15, 18, RED_D); px(16, 18, RED_D); }           // 넥타이
    if (blazer) { px(13, 21, NAVY_L); px(18, 21, NAVY_L); px(18, 22, "#c9a84a"); }    // 옷깃 끝·단추
    else { rect(bx, 22, bw, 1, SHIRT_D); }
  }
  // 팔: 걸음에 맞춰 흔들림
  const sw = frame ? (frame === 1 ? 1 : -1) : 0, sleeve = blazer ? NAVY : SHIRT;
  if (side) { rect(16 + sw, 18, 3, 6, LINE); rect(17 + sw, 18, 2, 5, sleeve); rect(17 + sw, 23, 2, 1, SKIN); }
  else { for (const [ax, d] of [[7, 1], [23, -1]]) { rect(ax, 17 + sw * d, 3, 7, LINE); rect(ax + 1, 18 + sw * d, 1, 5, sleeve); rect(ax + 1, 23 + sw * d, 1, 1, SKIN); } }
  // 머리: 얼굴 → 머리카락
  blob(hx, 11, side ? 7 : 8, 7, SKIN, LINE);
  const hair = (x, y, w, h) => rect(x, y, w, h, H);
  if (back) {
    blob(hx, 9, 8, 7, H, LINE); rect(hx - 4, 4, 5, 1, HL);
    if (ch.hair === "long") { rect(hx - 7, 12, 15, 11, LINE); rect(hx - 6, 12, 13, 10, H); rect(hx - 3, 14, 1, 7, HL); }
    if (ch.hair === "bob") { rect(hx - 8, 12, 17, 5, LINE); rect(hx - 7, 12, 15, 4, H); }
    if (ch.hair === "braid") for (const bxx of [hx - 4, hx + 3]) { rect(bxx - 1, 14, 4, 9, LINE); rect(bxx, 14, 2, 8, H); for (let y = 15; y < 22; y += 2) px(bxx, y, HL); rect(bxx, 21, 2, 1, RED); }
    if (ch.hair === "perm") for (const [cx, cy] of [[hx - 6, 6], [hx - 2, 4], [hx + 3, 4], [hx + 6, 7], [hx - 6, 11], [hx + 6, 11], [hx, 13]]) blob(cx, cy, 2, 2, H, LINE);
    return;
  }
  if (side) { // 옆모습: 뒤통수 쪽 머리 + 앞머리
    blob(hx - 3, 6, 6, 4, H, LINE); hair(hx - 3, 3, 9, 3); px(hx, 3, HL);
    if (ch.hair === "long" || ch.hair === "bob") { rect(hx - 8, 10, 5, ch.hair === "long" ? 13 : 7, LINE); rect(hx - 7, 10, 3, ch.hair === "long" ? 12 : 6, H); }
    if (ch.hair === "braid") { rect(hx - 7, 12, 4, 10, LINE); rect(hx - 6, 12, 2, 9, H); rect(hx - 6, 20, 2, 1, RED); }
    if (ch.hair === "perm") for (const [cx, cy] of [[hx - 5, 5], [hx - 1, 3], [hx + 3, 4], [hx - 6, 10]]) blob(cx, cy, 2, 2, H, LINE);
    if (ch.hair === "shaggy") for (let x = hx; x < hx + 6; x += 2) px(x, 8, H);
    if (ch.hair === "buzz") { rect(hx - 2, 4, 8, 2, H); }
    if (ch.hair === "dandy") { hair(hx + 1, 6, 5, 2); px(hx + 5, 8, H); }
    rect(hx + 3, 11, 2, 3, LINE); px(hx + 3, 11, "#ffffff"); px(hx + 7, 13, SKIN_D); rect(hx + 4, 15, 2, 1, PINK); px(hx + 4, 16, "#a0523a");
    if (ch.glasses) { rect(hx + 2, 10, 5, 1, LINE); rect(hx + 2, 14, 5, 1, LINE); px(hx + 2, 11, LINE); px(hx + 2, 13, LINE); rect(hx - 2, 11, 4, 1, LINE); }
    return;
  }
  // 앞모습 머리 모양(앞머리는 눈썹 위까지만 → 얼굴이 보이게)
  const cap = (ry = 4) => { blob(hx, 5, 9, ry, H, LINE); rect(hx - 3, 2, 4, 1, HL); };
  if (ch.hair === "bob") { cap(); rect(hx - 9, 6, 3, 10, LINE); rect(hx + 7, 6, 3, 10, LINE); rect(hx - 8, 6, 2, 9, H); rect(hx + 7, 6, 2, 9, H); hair(hx - 7, 6, 15, 2); }
  if (ch.hair === "long") { cap(); rect(hx - 9, 6, 3, 7, LINE); rect(hx + 7, 6, 3, 7, LINE); rect(hx - 8, 6, 2, 7, H); rect(hx + 7, 6, 2, 7, H); hair(hx - 7, 6, 6, 1); hair(hx + 2, 6, 6, 1); } // 가운데 가르마
  if (ch.hair === "braid") { cap(); hair(hx - 7, 6, 15, 1);
    for (const bxx of [hx - 10, hx + 8]) { rect(bxx, 8, 4, 13, LINE); rect(bxx + 1, 8, 2, 12, H); for (let y = 9; y < 19; y += 2) px(bxx + 1, y, HL); rect(bxx + 1, 19, 2, 1, RED); } }
  if (ch.hair === "shaggy") { cap(); for (let x = hx - 7; x <= hx + 6; x += 2) rect(x, 6, 2, x % 4 ? 2 : 3, H); rect(hx - 9, 6, 2, 5, H); rect(hx + 8, 6, 2, 5, H); }
  if (ch.hair === "perm") { for (const [cx, cy] of [[hx - 7, 5], [hx - 3, 2], [hx + 2, 2], [hx + 6, 4], [hx - 8, 9], [hx + 8, 9]]) blob(cx, cy, 3, 3, H, LINE); hair(hx - 6, 4, 13, 3); for (const [cx, cy] of [[hx - 3, 1], [hx + 3, 1], [hx - 7, 4]]) px(cx, cy, HL); }
  if (ch.hair === "buzz") { blob(hx, 5, 8, 3, H, LINE); for (let x = hx - 5; x < hx + 6; x += 3) px(x, 4, HL); }
  if (ch.hair === "dandy") { cap(); hair(hx - 7, 6, 9, 2); hair(hx - 7, 8, 3, 1); rect(hx - 9, 6, 2, 4, H); rect(hx + 8, 6, 2, 4, H); } // 옆으로 넘긴 앞머리
  // 얼굴: 눈·볼·입, 안경
  for (const ex of [hx - 4, hx + 3]) { rect(ex, 11, 2, 2, EYE); px(ex, 11, "#ffffff"); }
  for (const cx of [hx - 6, hx + 5]) rect(cx, 14, 2, 1, PINK);
  rect(hx - 1, 16, 2, 1, "#a0523a");
  if (ch.glasses) { for (const gx of [hx - 6, hx + 1]) { rect(gx, 10, 6, 1, LINE); rect(gx, 14, 6, 1, LINE); rect(gx, 10, 1, 5, LINE); rect(gx + 5, 10, 1, 5, LINE); } rect(hx - 1, 11, 2, 1, LINE); }
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
  const N = kind === "teacher" ? 48 : 32; // 보충쌤은 48×48로 더 세밀하게(화면에서는 같은 크기로 그림)
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const ctx = cv.getContext("2d");
  if (dir === "l") { ctx.translate(N, 0); ctx.scale(-1, 1); } // 왼쪽은 오른쪽 모습을 뒤집음
  if (frame) ctx.translate(0, -1); // 걸을 때 몸이 살짝 통통 튐
  kind === "teacher" ? teacher(ctx, dir, frame) : student(ctx, CHARS[kind] ?? CHARS[0], dir, frame);
  cache.set(key, cv); return cv;
}
