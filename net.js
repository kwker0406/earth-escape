// 통신 담당 파일. Firebase 관련 코드는 모두 여기에만 둔다.
// ▼ Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에서 복사한 값으로 바꾸세요.
const firebaseConfig = {
  apiKey: "AIzaSyA3MB2gR46yUJhyxvZxdWDy5m3z1Jdo1m0",
  authDomain: "mini-game-f56d8.firebaseapp.com",
  databaseURL: "https://mini-game-f56d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mini-game-f56d8",
  storageBucket: "mini-game-f56d8.firebasestorage.app",
  messagingSenderId: "463946557473",
  appId: "1:463946557473:web:79c0838aae3fc03e289b60",
  measurementId: "G-6VST22CF0V"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// shortcut: 반(세션)이 'test' 하나로 고정. 2단계 교사 화면에서 반별 세션으로 바꾼다.
const SID = "test";
let uid, team;

// 방에 들어간다. 예전에 같은 방에 있었다면 마지막 위치를 돌려준다.
export async function join(code, nick, avatar) {
  uid = (await signInAnonymously(auth)).user.uid; // 같은 기기는 같은 uid 유지 → 재접속 가능
  team = code;
  const base = `sessions/${SID}/teams/${team}`;
  await set(ref(db, `sessions/${SID}/players/${uid}`), { team }); // 보안 규칙이 이 값으로 팀을 확인
  const memberRef = ref(db, `${base}/members/${uid}`);
  await set(memberRef, { nick, avatar, online: true });
  // 연결될 때마다 접속 표시를 다시 켠다(창 하나 닫힘·화면 꺼짐·와이파이 끊김 뒤 복귀 대비)
  onValue(ref(db, ".info/connected"), s => {
    if (!s.val()) return;
    onDisconnect(memberRef).update({ online: false });
    update(memberRef, { online: true });
  });
  const last = (await get(ref(db, `${base}/pos/${uid}`))).val();
  return { uid, last };
}

export function move(x, y, d) {
  set(ref(db, `sessions/${SID}/teams/${team}/pos/${uid}`), { x, y, d });
}

// 같은 팀의 닉네임·아바타·위치가 바뀔 때마다 cb({uid: {...}})를 부른다.
export function onTeam(cb) {
  const base = `sessions/${SID}/teams/${team}`;
  let members = {}, pos = {};
  const emit = () => {
    const out = {};
    for (const id in members) out[id] = { ...members[id], ...(pos[id] || {}) };
    cb(out);
  };
  onValue(ref(db, `${base}/members`), s => { members = s.val() || {}; emit(); });
  onValue(ref(db, `${base}/pos`), s => { pos = s.val() || {}; emit(); });
}

export function leave() {
  return update(ref(db, `sessions/${SID}/teams/${team}/members/${uid}`), { online: false });
}
