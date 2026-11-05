// 통신 담당 파일. Firebase 관련 코드는 모두 여기에만 둔다. 설정값은 config.js에 있다.
import config from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, set as fbSet, get, update as fbUpdate, push, onValue, onDisconnect, runTransaction as fbTx } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const auth = getAuth(initializeApp(config));
const db = getDatabase();
const R = p => ref(db, p);
// 선생님이 '처음부터 다시'를 누르면 학생 기기는 지우는 동안 아무것도 쓰지 않음(옛 게임 기록이 되살아나지 않게)
let frozen = false;
export const freeze = () => { frozen = true; };
const set = (...a) => frozen ? Promise.resolve() : fbSet(...a);
const update = (...a) => frozen ? Promise.resolve() : fbUpdate(...a);
const runTransaction = (...a) => frozen ? Promise.resolve({ committed: false, snapshot: { val: () => null } }) : fbTx(...a);
let uid, sid, team, memberRef;

let offset = 0; // 기기 시계가 틀려도 모두 같은 시각을 쓰도록 서버 시각 기준
onValue(R(".info/serverTimeOffset"), s => { offset = s.val() || 0; });
export const serverNow = () => Date.now() + offset;

// ───────── 학생 ─────────
// 실패하면 Error("NOCODE" | "KICKED" | "FULL")
export async function join(code, nick, avatar) {
  uid = (await signInAnonymously(auth)).user.uid; // 같은 기기는 같은 uid → 재접속하면 같은 자리
  sid = (await get(R(`codes/${code}`))).val();
  if (!sid) throw new Error("NOCODE");
  team = code;
  const base = `sessions/${sid}/teams/${team}`;
  if ((await get(R(`${base}/kicked/${uid}`))).exists()) throw new Error("KICKED");

  // 팀 인원 제한: 선생님이 만든 빈자리(false)를 하나 차지한다. 동시에 같은 자리를 노리면 보안 규칙이 한 명만 허락한다.
  const slots = (await get(R(`${base}/slots`))).val() || {};
  let slot = Object.keys(slots).find(k => slots[k] === uid);
  for (const k of Object.keys(slots)) {
    if (slot) break;
    if (slots[k] !== false) continue;
    try { await set(R(`${base}/slots/${k}`), uid); slot = k; } catch {}
  }
  if (!slot) throw new Error("FULL");

  // 다른 팀 코드로 들어갔다가 바꾼 경우: 예전 팀 자리를 비워 그 팀 인원이 줄지 않게 한다(새 자리를 얻은 뒤에만)
  const old = (await get(R(`sessions/${sid}/players/${uid}`))).val();
  if (old && old.team !== team) {
    const ob = `sessions/${sid}/teams/${old.team}`;
    await Promise.all([set(R(`${ob}/members/${uid}`), null), set(R(`${ob}/pos/${uid}`), null)]).catch(() => {});
    await set(R(`${ob}/slots/${old.slot}`), false).catch(() => {});
  }
  await set(R(`sessions/${sid}/players/${uid}`), { team, slot }); // 보안 규칙이 이 값으로 팀을 확인
  memberRef = R(`${base}/members/${uid}`);
  await set(memberRef, { nick, avatar, online: true });
  // 연결될 때마다 접속 표시를 다시 켠다(창 닫힘·화면 꺼짐·와이파이 끊김 뒤 복귀 대비)
  onValue(R(".info/connected"), s => {
    if (!s.val()) return;
    onDisconnect(memberRef).update({ online: false });
    update(memberRef, { online: true }).catch(() => {}); // 내보내진 뒤에는 규칙이 막음
  });
  const last = (await get(R(`${base}/pos/${uid}`))).val();
  return { uid, last };
}

// jail: 보충수업실에서 풀려나는 서버 시각(0이면 자유), f: 층
// seen: 사물함에 숨는 걸 괴물에게 들킴(괴물이 그 사물함을 열어 봄)
export const move = (x, y, d, jail = 0, f = 0, seen = 0) => set(R(`sessions/${sid}/teams/${team}/pos/${uid}`), { x, y, d, jail, f, seen }).catch(() => {});

// 팀 진행 { floor, score, wrong, solved: {퍼즐id: true}, tries: {퍼즐id: 횟수}, escaped, escapedAt }
// 팀원 여럿이 동시에 풀어도 점수가 두 번 오르지 않게 트랜잭션으로 고친다. fn은 바꾼 값을, 바꿀 것이 없으면 undefined를 돌려준다
export const NEW_PROGRESS = { floor: 0, score: 0, wrong: 0 };
export const changeProgress = fn => runTransaction(R(`sessions/${sid}/teams/${team}/progress`),
  cur => fn(structuredClone(cur || NEW_PROGRESS))).catch(e => console.error(e));
export const onProgress = cb => onValue(R(`sessions/${sid}/teams/${team}/progress`), s => cb(s.val() || NEW_PROGRESS), () => {});
// 보충 명부: 내가 잡힌 횟수 +1
export const addCaught = n => update(memberRef, { caught: n }).catch(() => {});
// 주운 단서 { 단서key: 주운 uid }
export const onGot = cb => onValue(R(`sessions/${sid}/teams/${team}/got`), s => cb(s.val() || {}), () => {});
export const pickClue = key => set(R(`sessions/${sid}/teams/${team}/got/${key}`), uid).catch(() => {});
// 물건(팀에 하나씩: flash 손전등, a·b·c 열쇠): { by: 가진 학생 uid } 또는 바닥에 떨어져 있으면 { by: null, x, y, f }
export const onItems = cb => onValue(R(`sessions/${sid}/teams/${team}/items`), s => cb(s.val() || {}), () => {});
export const setItem = (id, v) => set(R(`sessions/${sid}/teams/${team}/items/${id}`), v).catch(() => {});
export const grabItem = id => runTransaction(R(`sessions/${sid}/teams/${team}/items/${id}`),
  cur => cur && !cur.by ? { by: uid } : undefined).catch(() => {}); // 떨어진 것만 주울 수 있음(동시에 둘이 주워도 한 명만)
// 보충수업실 구출 { f: 층, at: 시각 } → 그 층 보충실에 갇힌 팀원이 모두 풀려남
export const rescue = f => set(R(`sessions/${sid}/teams/${team}/rescue`), { f, at: serverNow() }).catch(() => {});
export const onRescue = cb => onValue(R(`sessions/${sid}/teams/${team}/rescue`), s => cb(s.val()), () => {});
// 선생님 힌트 { text, at }
export const onHint = cb => onValue(R(`sessions/${sid}/teams/${team}/hint`), s => cb(s.val()), () => {});

// 괴물 계산용 게임 시간. 시작 전이면 -1, 일시정지·종료 중에는 멈춘다.
export const gameMs = m => m.state === "wait" ? -1 : (m.playedMs || 0) + (m.state === "play" ? serverNow() - m.startedAt : 0);

// 같은 팀의 닉네임·아바타·위치가 바뀔 때마다 cb({uid: {...}})
export function onTeam(cb) {
  const base = `sessions/${sid}/teams/${team}`;
  let members = {}, pos = {};
  const emit = () => {
    const out = {};
    for (const id in members) if (members[id].nick) out[id] = { ...members[id], ...(pos[id] || {}) };
    cb(out);
  };
  onValue(R(`${base}/members`), s => { members = s.val() || {}; emit(); }, () => {});
  onValue(R(`${base}/pos`), s => { pos = s.val() || {}; emit(); }, () => {});
}

// 괴물 상태 { n: 몇 번째 등장, x, y } — 방장 기기가 올리고 팀원 모두 받는다
export const setMonster = m => set(R(`sessions/${sid}/teams/${team}/monster`), m).catch(() => {});
export const onMonster = cb => onValue(R(`sessions/${sid}/teams/${team}/monster`), s => cb(s.val()), () => {});

// 게임 상태: { state: "wait"|"play"|"pause"|"end", endsAt, remain }
export const onMeta = cb => onValue(R(`sessions/${sid}/meta`), s => cb(s.val() || { state: "end", remain: 0 }));

// 선생님이 내보내거나 반을 삭제하면 cb()
export const onKicked = cb => onValue(R(`sessions/${sid}/players/${uid}`), s => {
  if (s.exists()) return;
  onDisconnect(memberRef).cancel(); // 나간 뒤 '접속 끊김' 기록이 다시 생기지 않게
  cb();
});

export const leave = () => update(memberRef, { online: false }).catch(() => {});

// ───────── 교사 ─────────
export async function teacherLogin() {
  await auth.authStateReady();
  const u = auth.currentUser?.email ? auth.currentUser : (await signInWithPopup(auth, new GoogleAuthProvider())).user;
  uid = u.uid;
  return u.email;
}

export const onClasses = (cb, onErr) => onValue(R("classes"), s => cb(s.val() || {}), onErr);

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 O·0·I·1 제외
export async function createClass(name, teamCount, maxMembers, minutes, jailSec) {
  const id = push(R("sessions")).key;
  const used = new Set(Object.keys((await get(R("codes"))).val() || {}));
  const teams = {}, up = {};
  for (let t = 1; t <= teamCount; t++) {
    let code;
    do code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    while (used.has(code));
    used.add(code); teams[code] = t;
    up[`codes/${code}`] = id;
    for (let s = 1; s <= maxMembers; s++) up[`sessions/${id}/teams/${code}/slots/s${s}`] = false;
  }
  up[`sessions/${id}/meta`] = { name, state: "wait", remain: minutes * 60000, minutes, maxMembers, teams, jailSec,
    seed: Math.floor(Math.random() * 1e9), playedMs: 0 };
  up[`classes/${id}`] = { name, createdAt: serverNow() };
  await update(R("/"), up);
  return id;
}

// 반 상태와 팀별 접속자·진행 상황·위치를 지켜본다. 반환값을 부르면 그만 본다.
export function watchClass(id, cb) {
  const data = { meta: null, members: {}, kicked: {}, progress: {}, pos: {}, monster: {}, hint: {} }, offs = [];
  offs.push(onValue(R(`sessions/${id}/meta`), s => {
    data.meta = s.val(); cb(data);
    for (const code in data.meta?.teams || {}) if (!(code in data.members)) {
      data.members[code] = {};
      offs.push(onValue(R(`sessions/${id}/teams/${code}/members`), s2 => { data.members[code] = s2.val() || {}; cb(data); }));
      for (const key of ["kicked", "progress", "pos", "monster", "hint"]) // pos·monster는 작은 지도용
        offs.push(onValue(R(`sessions/${id}/teams/${code}/${key}`), s2 => { data[key][code] = s2.val() || {}; cb(data); }));
    }
  }));
  return () => offs.forEach(off => off());
}

export async function control(id, action) {
  const m = (await get(R(`sessions/${id}/meta`))).val(), now = serverNow();
  const left = m.state === "play" ? m.endsAt - now : m.remain;
  const played = (m.playedMs || 0) + (m.state === "play" ? now - m.startedAt : 0); // 괴물 시계
  const change =
    action === "start" ? { state: "play", endsAt: now + Math.max(0, left), startedAt: now, playedMs: played } :
    action === "pause" ? { state: "pause", remain: Math.max(0, left), playedMs: played } :
    action === "end"   ? { state: "end", remain: 0, playedMs: played } :
    // 시간 추가(plus5·plus10): 진행 중이면 끝나는 시각을 늦춤. 끝난 반이면 '일시정지'로 되돌려 ▶ 시작으로 이어서 하게 함
    m.state === "play" ? { endsAt: Math.max(now, m.endsAt) + addMs(action) }
    : { remain: Math.max(0, m.remain || 0) + addMs(action), ...(m.state === "end" ? { state: "pause" } : {}) };
  await update(R(`sessions/${id}/meta`), change);
}

const addMs = action => (action === "plus10" ? 10 : 5) * 60000;

// 처음부터 다시: 팀 진행·단서·물건·괴물·위치·보충 기록을 지우고 시작 전으로. 팀 코드와 자리(접속한 학생)는 그대로, 퍼즐 정답은 새로(seed)
// 순서: ① 시작 전으로 + resetting 표시 → 학생 기기가 쓰기를 멈춤 ② 2초 뒤 팀 기록 지움 ③ 표시를 지우면 학생 기기가 새로고침해 새 게임으로
export async function resetClass(id) {
  const m = (await get(R(`sessions/${id}/meta`))).val();
  await update(R(`sessions/${id}/meta`), { state: "wait", remain: (m.minutes || 40) * 60000, playedMs: 0, seed: Math.floor(Math.random() * 1e9),
    endsAt: null, startedAt: null, resetting: true });
  await new Promise(ok => setTimeout(ok, 2000));
  const up = {};
  for (const code in m.teams || {}) {
    const t = `sessions/${id}/teams/${code}`;
    for (const k of ["progress", "got", "items", "monster", "rescue", "hint", "pos"]) up[`${t}/${k}`] = null;
    const members = (await get(R(`${t}/members`))).val() || {};
    for (const kid in members) up[`${t}/members/${kid}/caught`] = null;
  }
  await update(R("/"), up);
  await update(R(`sessions/${id}/meta`), { resetting: null });
}

// 내보내기: 자리를 비우고, 같은 기기로는 다시 못 들어오게 표시(다시 받아 줄 때 알아보도록 닉네임을 남김)
export async function kick(id, code, kid) {
  const slot = (await get(R(`sessions/${id}/players/${kid}/slot`))).val();
  const t = `sessions/${id}/teams/${code}`;
  const nick = (await get(R(`${t}/members/${kid}/nick`))).val() || "이름 없음";
  await update(R("/"), {
    [`sessions/${id}/players/${kid}`]: null, [`${t}/members/${kid}`]: null, [`${t}/pos/${kid}`]: null,
    [`${t}/kicked/${kid}`]: nick, ...(slot ? { [`${t}/slots/${slot}`]: false } : {}),
  });
}

export const sendHint = (id, code, text) => set(R(`sessions/${id}/teams/${code}/hint`), { text, at: serverNow() });

// 다시 받아 주기: 표시만 지운다. 학생이 다시 입장하면 빈자리를 차지한다.
export const unkick = (id, code, kid) => update(R(`sessions/${id}/teams/${code}/kicked`), { [kid]: null });

// 반 전체 삭제(초기화): 기록·코드 모두 지운다
export async function deleteClass(id) {
  const teams = (await get(R(`sessions/${id}/meta/teams`))).val() || {};
  const up = { [`sessions/${id}`]: null, [`classes/${id}`]: null };
  for (const code in teams) up[`codes/${code}`] = null;
  await update(R("/"), up);
}
