// 도트 캐릭터(32×32 픽셀, 직접 디자인한 동물 8종 + 보충쌤). 앞(d)·뒤(u)·옆(l·r) × 서 있기(0)·걸음(1·2).
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

function teacher(ctx, dir, frame) { // 보충쌤: 흰 가운, 안경, 빨간 넥타이
  const { px, rect, oval, blob } = painter(ctx), side = dir === "l" || dir === "r";
  const SKIN = "#f2c9a0", HAIR = "#3a2a20", COAT = "#f4f4f4", LINE = "#2a2a35", PANTS = "#3a3f5a";
  oval(16, 30, 7, 1, SHADOW);
  const lift = i => (frame === 1 && i === 0) || (frame === 2 && i === 1) ? 2 : 0;
  const stride = i => side && frame ? (frame === 1) === (i === 0) ? 2 : -2 : 0;
  (side ? [14, 16] : [12, 17]).forEach((x, i) => { rect(x + stride(i), 24 - lift(i), 3, 5, PANTS); rect(x + stride(i), 28 - lift(i), 3, 1, LINE); });
  rect(side ? 11 : 9, 14, side ? 11 : 14, 11, LINE); rect(side ? 12 : 10, 15, side ? 9 : 12, 9, COAT); // 가운
  if (!side && dir !== "u") { rect(15, 15, 2, 6, "#c83030"); px(15, 15, "#8a1a1a"); }
  const swing = frame ? (frame === 1 ? 1 : -1) : 0; // 팔 흔들기
  if (side) rect(15 + swing, 16, 3, 7, COAT), rect(15 + swing, 22, 3, 1, SKIN);
  else { rect(7, 15 + swing, 2, 8, COAT); rect(23, 15 - swing, 2, 8, COAT); rect(7, 23 + swing, 2, 1, SKIN); rect(23, 23 - swing, 2, 1, SKIN); }
  const hx = side ? 17 : 16;
  blob(hx, 9, 6, 6, SKIN, LINE);
  blob(hx, dir === "u" ? 8 : 5, 7, dir === "u" ? 6 : 3, HAIR, LINE); // 머리카락
  if (dir === "u") return;
  if (side) { rect(hx + 1, 8, 4, 3, LINE); rect(hx + 2, 9, 2, 1, "#bfe3ff"); px(hx + 6, 11, "#d9a57c"); rect(hx + 2, 13, 2, 1, "#a0523a"); }
  else { for (const gx of [hx - 5, hx + 1]) { rect(gx, 8, 4, 3, LINE); rect(gx + 1, 9, 2, 1, "#bfe3ff"); } rect(hx - 1, 9, 2, 1, LINE); rect(hx - 1, 13, 3, 1, "#a0523a"); }
}

// kind: 캐릭터 번호 또는 "teacher". dir: d·u·l·r. frame: 0 서 있기, 1·2 걸음
export function sprite(kind, dir = "d", frame = 0) {
  const key = `${kind}|${dir}|${frame}`;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement("canvas"); cv.width = cv.height = 32;
  const ctx = cv.getContext("2d");
  if (dir === "l") { ctx.translate(32, 0); ctx.scale(-1, 1); } // 왼쪽은 오른쪽 모습을 뒤집음
  if (frame) ctx.translate(0, -1); // 걸을 때 몸이 살짝 통통 튐
  kind === "teacher" ? teacher(ctx, dir, frame) : animal(ctx, CHARS[kind] ?? CHARS[0], dir, frame);
  cache.set(key, cv); return cv;
}
