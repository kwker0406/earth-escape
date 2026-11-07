// 도트 캐릭터(32×32 픽셀, 직접 디자인한 동물 8종 + 48×48 보충쌤). 앞(d)·뒤(u)·옆(l·r) × 서 있기(0)·걸음(1·2).
// 그림 파일 없이 코드로 점을 찍어 만들고, 한 번 만든 그림은 기억해 둔다(sprite).
export const CHARS = [
  { name: "얼룩냥", emoji: "🐱", body: "#f4f1ea", dark: "#6b625a", belly: "#ffffff", ear: "pointy", mark: "patch" },
  { name: "도토리곰", emoji: "🐻", body: "#b07a4a", dark: "#5a3a20", belly: "#e8c9a0", ear: "round", mark: "none" },
  { name: "레몬토끼", emoji: "🐰", body: "#f6d96b", dark: "#8a6a10", belly: "#fff3c4", ear: "long", mark: "none" },
  { name: "볼볼햄", emoji: "🐹", body: "#e9a35a", dark: "#7a4a18", belly: "#fff0dc", ear: "tiny", mark: "cheeks" },
  { name: "줄무늬범", emoji: "🐯", body: "#f29b38", dark: "#5a2e08", belly: "#fff3e0", ear: "round", mark: "stripes" },
  { name: "솜꼬리여우", emoji: "🦊", body: "#e2683a", dark: "#6a240c", belly: "#fff6ee", ear: "pointy", mark: "muzzle" },
  { name: "목도리펭", emoji: "🐧", body: "#3b4a6b", dark: "#151c2c", belly: "#f2f2f2", ear: "none", mark: "scarf" },
  { name: "별빛토끼", emoji: "⭐", body: "#b9a8f0", dark: "#4a3a8a", belly: "#efeaff", ear: "long", mark: "star" },
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

function animal(ctx, ch, dir, frame) {
  const { px, rect, oval, blob } = painter(ctx), side = dir === "l" || dir === "r", hx = side ? 17 : 16;
  oval(16, 30, 7, 1, SHADOW);
  // 다리: 걸을 때 한쪽씩 1칸 들어 올림
  const lift = i => (frame === 1 && i === 0) || (frame === 2 && i === 1) ? 2 : 0;
  const stride = i => side && frame ? (frame === 1) === (i === 0) ? 2 : -2 : 0; // 옆모습: 다리를 앞뒤로 벌림
  const legs = side ? [12, 18] : [11, 18];
  legs.forEach((x, i) => rect(x + stride(i), 26 - lift(i), 3, 3 + lift(i) / 2, ch.dark));
  // 몸통과 배
  blob(side ? 15 : 16, 22, side ? 6 : 7, 4, ch.body, ch.dark);
  if (dir !== "u") oval(side ? 16 : 16, 23, side ? 3 : 4, 2, ch.belly);
  if (side) blob(8, 21, 1, 1, ch.body, ch.dark); // 꼬리
  if (dir === "u") blob(16, 24, 2, 1, ch.belly, ch.dark);
  if (ch.mark === "scarf") rect(side ? 10 : 9, 18, side ? 12 : 15, 2, "#d83a3a");
  // 귀
  const ears = side ? [hx - 3] : [hx - 6, hx + 5];
  for (const ex of ears) {
    if (ch.ear === "round") { blob(ex, 6, 2, 2, ch.body, ch.dark); if (dir !== "u") px(ex, 6, PINK); }
    if (ch.ear === "pointy") for (let k = 0; k < 4; k++) { rect(ex - 1 + (k >> 1), 3 + k, 3 - (k >> 1), 1, k === 0 ? ch.dark : ch.body); px(ex - 2 + (k >> 1), 3 + k, ch.dark); }
    if (ch.ear === "long") { rect(ex - 2, -1, 4, 9, ch.dark); rect(ex - 1, 0, 2, 8, ch.body); if (dir !== "u") rect(ex - 1, 1, 1, 6, PINK); }
    if (ch.ear === "tiny") blob(ex, 7, 1, 1, ch.body, ch.dark);
  }
  // 머리
  blob(hx, 13, side ? 8 : 9, 7, ch.body, ch.dark);
  if (ch.mark === "stripes") for (const sx of (side ? [hx - 4, hx - 1] : [hx - 3, hx, hx + 3])) rect(sx, 6, 1, 3, ch.dark);
  if (ch.mark === "star") { const sx = side ? hx + 1 : hx; rect(sx - 1, 8, 3, 1, "#ffd84a"); rect(sx, 7, 1, 3, "#ffd84a"); }
  if (dir === "u") return; // 뒷모습은 얼굴 없음
  if (ch.mark === "patch" && !side) oval(hx - 4, 12, 3, 2, ch.dark);
  if (ch.mark === "muzzle") oval(side ? hx + 4 : hx, 16, side ? 3 : 4, 2, ch.belly);
  const eyes = side ? [hx + 4] : [hx - 4, hx + 3];
  for (const ex of eyes) { rect(ex, 12, 2, 3, EYE); px(ex, 12, "#ffffff"); }
  const cheeks = side ? [hx + 5] : ch.mark === "cheeks" ? [hx - 7, hx + 5] : [hx - 6, hx + 5];
  for (const cx of cheeks) rect(cx, 15, ch.mark === "cheeks" ? 3 : 2, ch.mark === "cheeks" ? 2 : 1, PINK);
  if (ch.ear === "none") rect(side ? hx + 6 : hx - 1, 15, side ? 3 : 3, 2, "#f2a33a"); // 부리
  else px(side ? hx + 7 : hx, 15, ch.dark); // 코
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
  kind === "teacher" ? teacher(ctx, dir, frame) : animal(ctx, CHARS[kind] ?? CHARS[0], dir, frame);
  cache.set(key, cv); return cv;
}
