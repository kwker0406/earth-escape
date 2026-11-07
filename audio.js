// 배경 음악: 파일 없이 브라우저에서 바로 만드는 소리(Web Audio). 직접 작곡한 것.
// ambient: 낮게 웅웅거리는 소리 + 바람 + 가끔 울리는 오르골 음. chase: 빠르게 몰아치는 베이스·북·불협화음.
// 폰은 사용자가 화면을 누른 뒤에만 소리를 낼 수 있어서 '입장하기'를 누를 때 initAudio()를 부른다.
let ac = null, master, amb, chase, mode = "", beat = 0, nextT = 0, timer = 0, bellTimer = 0;
const KEY = "escape-muted";
export const isMuted = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export function initAudio() {
  if (ac) { ac.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = isMuted() ? 0 : 0.8; master.connect(ac.destination);
  amb = ac.createGain(); amb.gain.value = 0; amb.connect(master);
  chase = ac.createGain(); chase.gain.value = 0; chase.connect(master);
  buildAmbient();
  timer = setInterval(scheduleChase, 50);
}

export function setMode(m) { // "ambient" | "chase"
  if (!ac || m === mode) return; mode = m;
  const t = ac.currentTime;
  amb.gain.setTargetAtTime(m === "ambient" ? 0.55 : 0.12, t, 0.6);   // 추격 중에도 바닥에 낮게 깔림
  chase.gain.setTargetAtTime(m === "chase" ? 0.5 : 0, t, m === "chase" ? 0.08 : 1.2);
  if (m === "chase") { beat = 0; nextT = t + 0.05; }
}

export function toggleMute() {
  const m = !isMuted(); try { localStorage.setItem(KEY, m ? "1" : "0"); } catch {}
  if (ac) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.1);
  return m;
}

function noiseBuffer(sec) {
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function buildAmbient() {
  // 낮은 웅웅거림: 살짝 어긋난 두 음이 천천히 맥놀이
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220; lp.connect(amb);
  for (const [f, type, v] of [[55, "sawtooth", 0.18], [55.7, "triangle", 0.22], [82.4, "sine", 0.1]]) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(lp); o.start();
  }
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  // 바람: 걸러 낸 잡음이 천천히 높아졌다 낮아짐
  const n = ac.createBufferSource(); n.buffer = noiseBuffer(4); n.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.8;
  const ng = ac.createGain(); ng.gain.value = 0.05; n.connect(bp); bp.connect(ng); ng.connect(amb); n.start();
  const wl = ac.createOscillator(), wg = ac.createGain(); wl.frequency.value = 0.05; wg.gain.value = 300; wl.connect(wg); wg.connect(bp.frequency); wl.start();
  // 오르골: 4~9초마다 어긋난 음 하나가 메아리치며 사라짐
  const echo = ac.createDelay(1); echo.delayTime.value = 0.42; const fb = ac.createGain(); fb.gain.value = 0.45;
  echo.connect(fb); fb.connect(echo); echo.connect(amb);
  const NOTES = [659.3, 622.3, 493.9, 523.3, 392.0, 369.99, 739.99]; // 반음씩 비껴가는 음들
  const bell = () => {
    if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = NOTES[Math.floor(Math.random() * NOTES.length)] / (Math.random() < 0.5 ? 2 : 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    o.connect(g); g.connect(amb); g.connect(echo); o.start(t); o.stop(t + 2.6);
    bellTimer = setTimeout(bell, 4000 + Math.random() * 5000);
  };
  bellTimer = setTimeout(bell, 2500);
}

// 추격: 1분에 168박, 8분음표로 미리 조금씩 예약(끊김 없게)
const BASS = [41.2, 41.2, 43.65, 41.2, 41.2, 58.27, 41.2, 43.65, 41.2, 41.2, 43.65, 41.2, 49.0, 46.25, 43.65, 41.2]; // 직접 만든 16칸 베이스(반음·셋온음으로 불안하게)
function scheduleChase() {
  if (!ac || mode !== "chase") return;
  const step = 60 / 168 / 2;
  while (nextT < ac.currentTime + 0.15) {
    const t = nextT, i = beat % 16;
    tone(t, BASS[i], "sawtooth", 0.32, step * 0.9, 900);                  // 베이스
    tone(t, BASS[i] * 2, "square", 0.06, step * 0.5, 1600);               // 한 옥타브 위 겹침
    if (i % 4 === 0) kick(t);                                             // 큰북
    hat(t, i % 2 ? 0.05 : 0.09);                                          // 작은 금속음
    if (i === 0 || i === 10) for (const f of [311.1, 329.6, 466.2]) tone(t, f, "square", 0.05, step * 2.5, 2400); // 불협화음 찌르기
    if (beat % 64 === 48) tone(t, 880, "triangle", 0.08, step * 8, 3000, 1.06); // 4마디마다 위로 미끄러지는 경고음
    nextT += step; beat++;
  }
}
function tone(t, f, type, v, dur, cut, glide = 1) {
  const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(f, t); if (glide !== 1) o.frequency.exponentialRampToValueAtTime(f * glide, t + dur);
  lp.type = "lowpass"; lp.frequency.value = cut;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(chase); o.start(t); o.stop(t + dur + 0.02);
}
function kick(t) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(chase); o.start(t); o.stop(t + 0.2);
}
let hatBuf = null;
function hat(t, v) {
  hatBuf ??= noiseBuffer(0.1);
  const n = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
  n.buffer = hatBuf; hp.type = "highpass"; hp.frequency.value = 7000;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  n.connect(hp); hp.connect(g); g.connect(chase); n.start(t); n.stop(t + 0.06);
}
