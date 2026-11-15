// 시험 전용 가짜 Firebase. 데이터는 시험용 로컬 서버(check.py의 /__db)에 두고 경로별로 바꾼다
// → 창끼리 DB 전체를 덮어쓰는 일이 없음. 보안 규칙은 흉내 내지 않는다.
const parts = p => p.split("/").filter(Boolean);
const at = (obj, p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), obj);
function req(body) { // 동기 요청(가짜라서 단순하게)
  const x = new XMLHttpRequest(); x.open(body ? "POST" : "GET", "/__db", false);
  x.send(body ? JSON.stringify(body) : null); return { status: x.status, db: JSON.parse(x.responseText || "{}") };
}
// 같은 파일이 firebase-app·auth·database 세 주소로 세 번 불려도 저장소·구독·받아오기는 하나만
const F = window.__fake ??= { cache: {}, listeners: new Set() };
const listeners = F.listeners;
function notify() {
  for (const l of listeners) {
    const v = at(F.cache, l.path), j = JSON.stringify(v ?? null);
    if (j !== l.last) { l.last = j; l.cb(snap(l.path, v)); }
  }
}
const snap = (path, v) => ({ val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))), exists: () => v !== undefined && v !== null, key: parts(path).at(-1) });
function write(body) { F.wv = (F.wv || 0) + 1; F.cache = req(body).db; notify(); }
// 다른 창의 변경 받기. 받아 오는 사이에 이 창이 썼으면 그 응답은 옛날 것(내 쓰기가 잠깐 사라져 보이는 문제)
F.poll ??= setInterval(() => { const v = F.wv || 0; fetch("/__db").then(r => r.json()).then(db => { F.cache = (F.wv || 0) === v ? db : req().db; notify(); }).catch(() => {}); }, 250); // 그사이 썼으면 옛 응답 대신 바로 다시 받음
// 시험 코드가 DB를 직접 보고 고칠 때
window.fakeGet = () => (F.cache = req().db);
window.fakeSet = db => write({ replace: db });

export const initializeApp = () => ({});
const uid = sessionStorage.getItem("fakeuid") || "u" + Math.random().toString(36).slice(2, 8);
sessionStorage.setItem("fakeuid", uid);
const auth = { currentUser: null, authStateReady: async () => {} };
export const getAuth = () => auth;
export async function signInAnonymously() { auth.currentUser = { uid }; return { user: auth.currentUser }; }
export class GoogleAuthProvider {}
export async function signInWithPopup() { auth.currentUser = { uid: "teacher", email: "teacher@example.com" }; return { user: auth.currentUser }; }
export const getDatabase = () => ({});
export const ref = (_, path = "/") => ({ path });
export async function set(r, v) { write({ set: r.path, v: v ?? null }); }
export async function update(r, obj) { write({ update: r.path, obj }); }
export async function get(r) { F.cache = req().db; return snap(r.path, at(F.cache, r.path)); }
export const push = r => ({ key: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), path: r.path });
export function onValue(r, cb) {
  if (r.path === ".info/connected") { cb(snap("", true)); return () => {}; }
  if (r.path === ".info/serverTimeOffset") { cb(snap("", 0)); return () => {}; }
  const l = { path: r.path, cb, last: undefined }; listeners.add(l);
  F.cache = req().db; queueMicrotask(notify);
  return () => listeners.delete(l);
}
export const onDisconnect = () => ({ update: async () => {}, cancel: async () => {} });
export const serverTimestamp = () => Date.now();
// undefined를 돌려주면 취소(실제 Firebase와 같음). 읽은 값이 그대로일 때만 쓰고, 아니면 다시 시도
export async function runTransaction(r, fn) {
  for (let i = 0; i < 20; i++) {
    const cur = at(req().db, r.path) ?? null, v = fn(cur === null ? null : JSON.parse(JSON.stringify(cur)));
    if (v === undefined) return { committed: false, snapshot: snap(r.path, cur) };
    const res = req({ cas: r.path, expect: JSON.stringify(cur), v });
    if (res.status === 200) { F.wv = (F.wv || 0) + 1; F.cache = res.db; notify(); return { committed: true, snapshot: snap(r.path, at(F.cache, r.path)) }; }
  }
  return { committed: false, snapshot: snap(r.path, at(F.cache, r.path)) };
}
