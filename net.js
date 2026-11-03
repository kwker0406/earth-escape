// 통신 담당 파일. Firebase 관련 코드는 모두 여기에만 둔다. 설정값은 config.js에 있다.
import config from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, push, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const auth = getAuth(initializeApp(config));
const db = getDatabase();
const R = p => ref(db, p);
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

export const move = (x, y, d) => set(R(`sessions/${sid}/teams/${team}/pos/${uid}`), { x, y, d }).catch(() => {});

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
export async function createClass(name, teamCount, maxMembers, minutes) {
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
  up[`sessions/${id}/meta`] = { name, state: "wait", remain: minutes * 60000, maxMembers, teams };
  up[`classes/${id}`] = { name, createdAt: serverNow() };
  await update(R("/"), up);
  return id;
}

// 반 상태와 팀별 접속자를 지켜본다. 위치(pos)는 받지 않아 데이터를 아낀다. 반환값을 부르면 그만 본다.
export function watchClass(id, cb) {
  const data = { meta: null, members: {} }, offs = [];
  offs.push(onValue(R(`sessions/${id}/meta`), s => {
    data.meta = s.val(); cb(data);
    for (const code in data.meta?.teams || {}) if (!(code in data.members)) {
      data.members[code] = {};
      offs.push(onValue(R(`sessions/${id}/teams/${code}/members`), s2 => { data.members[code] = s2.val() || {}; cb(data); }));
    }
  }));
  return () => offs.forEach(off => off());
}

export async function control(id, action) {
  const m = (await get(R(`sessions/${id}/meta`))).val(), now = serverNow();
  const left = m.state === "play" ? m.endsAt - now : m.remain;
  const change =
    action === "start" ? { state: "play", endsAt: now + Math.max(0, left) } :
    action === "pause" ? { state: "pause", remain: Math.max(0, left) } :
    action === "end"   ? { state: "end", remain: 0 } :
    /* plus5 */ m.state === "play" ? { endsAt: Math.max(now, m.endsAt) + 300000 } : { remain: Math.max(0, m.remain) + 300000 };
  await update(R(`sessions/${id}/meta`), change);
}

// 내보내기: 자리를 비우고, 같은 기기로는 다시 못 들어오게 표시
export async function kick(id, code, kid) {
  const slot = (await get(R(`sessions/${id}/players/${kid}/slot`))).val();
  const t = `sessions/${id}/teams/${code}`;
  await update(R("/"), {
    [`sessions/${id}/players/${kid}`]: null, [`${t}/members/${kid}`]: null, [`${t}/pos/${kid}`]: null,
    [`${t}/kicked/${kid}`]: true, ...(slot ? { [`${t}/slots/${slot}`]: false } : {}),
  });
}

// 반 전체 삭제(초기화): 기록·코드 모두 지운다
export async function deleteClass(id) {
  const teams = (await get(R(`sessions/${id}/meta/teams`))).val() || {};
  const up = { [`sessions/${id}`]: null, [`classes/${id}`]: null };
  for (const code in teams) up[`codes/${code}`] = null;
  await update(R("/"), up);
}
