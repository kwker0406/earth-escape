// 층별 퍼즐(통합과학2 학습지 36·37·41~45쪽). 팀마다 숫자·질문이 달라 옆 팀 답을 베끼면 틀린다.
// 퍼즐 유형: code(자물쇠에 입력), choice(하나 고르기), pair(왼쪽-오른쪽 짝짓기), lever(레버 ▲▼ 조합), seq(버튼을 순서대로)
// 단서(clues)는 지도 곳곳에 흩어 두고, 팀원마다 자기 몫만 반짝여 보인다 → 모아서 말로 알려 줘야 풀린다.
// pair·choice는 보기를 기호(㉠·레버 1 등)로 가리고 그 뜻을 단서에 적는다 → 아는 것만으로는 못 푼다.
// shortcut: 정답은 코드에서 계산할 수 있어 코딩을 아는 학생은 찾을 수 있음. 서버 검증은 유료 요금제가 필요해 쓰지 않음.

export const FLOOR_NAMES = ["지하 · 미로", "1층", "2층", "3층", "4층 · 옥상"];
export const MONSTER_FLOORS = [1, 2, 3, 4]; // 지하(튜토리얼)와 옥상에는 괴물이 없음

const SYMBOLS = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca"];
// 팀 번호별 최종 암호(원자 번호 1~20번 기호로만 만든 쉬운 단어). 난이도마다 조각 수(5·4·3)만큼의 글자
const WORDS4 = [["B", "O", "O", "K"], ["S", "O", "C", "K"], ["C", "O", "O", "K"], ["S", "H", "O", "P"], ["K", "N", "O", "B"], ["C", "H", "O", "P"]];
const WORDS3 = [["Li", "O", "N"], ["Ne", "O", "N"], ["B", "O", "Ne"], ["C", "O", "Ne"], ["B", "Ar", "N"], ["S", "Ca", "N"]];
// 난이도: hard 전체 13개(조각 5) / normal 지하 칠판·사막화 원인 빼고 11개(조각 4, 지하 안 감) / easy 9개(조각 3, 다른 층 단서 없음 → 층을 한 방향으로만 올라감)
export const LEVELS = { easy: "쉬움", normal: "보통", hard: "어려움" };
const OFF = { hard: [], normal: ["b1", "f4c"], easy: ["b1", "f4c", "f4a", "f4b"] };
const PIECES = { hard: ["f1a", "f2b", "f3c", "f4b", "f4c"], normal: ["f1a", "f2b", "f3c", "f4b"], easy: ["f1a", "f2b", "f3c"] };
const OVERRIDE = {
  normal: { f3b: { gives: { key: "b", name: "관측실 열쇠" } } },                    // 지하에 안 가므로 관측실 열쇠를 3층에서 바로
  easy: { f3b: { gives: { key: "b", name: "관측실 열쇠" } }, f1a: { at: {} }, f2b: { at: {} }, r1: { at: {} } }, // at: {} = 단서가 모두 그 층에
};
const WORDS = [["B", "O", "O", "K", "S"], ["S", "P", "O", "O", "N"], ["S", "O", "C", "K", "S"], ["S", "H", "O", "C", "K"], ["P", "H", "O", "Ne", "S"], ["C", "H", "O", "C", "O"]];
// 45쪽 연표(연도 순). 조각 카드에는 사건 이름만 적고 연도는 학생이 떠올려야 한다
const EVENTS = ["유엔 기후 변화 협약", "교토 의정서", "파리 협정", "IPCC 6차 보고서", "우리나라 탄소 중립 목표"];
export const EVENT_YEARS = [1992, 1997, 2015, 2021, 2050];

function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
function shuffle(arr, r) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const LABELS = ["㉠", "㉡", "㉢"];
// 보기를 기호로 가림: 기호가 무엇인지는 단서 카드에만 있다. 원래 설명 단서는 몇 장만 남겨 단서 수를 4장으로 맞춤
function hide(pz, r, name) {
  const keep = n => pz.clues.slice(0, Math.max(1, 4 - n));
  if (pz.type === "pair") {
    const lab = shuffle(LABELS.slice(0, pz.right.length), r);
    return { ...pz, right: lab, clues: [...pz.right.map((t, i) => `🔖 ${lab[i]} 카드: ${t}`), ...keep(lab.length)] };
  }
  const order = shuffle(pz.options, r), opts = order.map((_, k) => `${name} ${k + 1}`);
  return { ...pz, options: opts, answer: opts[order.indexOf(pz.answer)], clues: [...order.map((t, k) => `🔖 ${opts[k]}: ${t}`), ...keep(opts.length)] };
}
export const norm = s => String(s).replace(/\s+/g, "").toUpperCase();
// 레버: 순서를 섞어 '레버 1~4'로 보여 주고, 레버 뜻은 🔖 카드로. 정답은 U(▲)·D(▼) 글자열
function levers(pz, r) {
  const order = shuffle(pz.levers.map((_, i) => i), r);
  return { ...pz, levers: order.map((_, k) => `레버 ${k + 1}`), answer: order.map(i => pz.levers[i][3]).join(""),
    clues: [...order.map((i, k) => `🔖 레버 ${k + 1}: ${pz.levers[i][0]} (▲ ${pz.levers[i][1]} / ▼ ${pz.levers[i][2]})`), ...pz.clues] };
}
// 순서 버튼: 자리를 섞어 보여 주고, 정답은 누를 버튼 자리 번호(0~3)를 이은 글자열
function sequence(pz, r) {
  const order = shuffle(pz.steps.map((_, i) => i), r);
  return { ...pz, options: order.map(i => pz.steps[i]), answer: pz.steps.map((_, i) => order.indexOf(i)).join("") };
}
const prep = (pz, r, name) => pz.type === "code" ? pz : pz.type === "lever" ? levers(pz, r) : pz.type === "seq" ? sequence(pz, r) : hide(pz, r, name);

// 팀마다 다른 문제 세트. seed: 반의 씨앗값, code: 팀 코드, no: 팀 번호(1~6)
export function buildPuzzles(seed, code, no, level = "hard") {
  if (!OFF[level]) level = "hard";
  const r = rng(seed ^ hash(code)), pieceFrom = PIECES[level], k = pieceFrom.length;
  const word = (k === 5 ? WORDS : k === 4 ? WORDS4 : WORDS3)[(no - 1) % WORDS.length];
  // 조각 k장. 사건 k개를 골라 연도 순서대로 글자를 하나씩 붙임. 어느 퍼즐이 어느 사건 조각을 주는지는 팀마다 섞음
  const perm = shuffle([0, 1, 2, 3, 4], r), sel = perm.slice(0, k), byYear = [...sel].sort((a, b) => a - b);
  const pieces = sel.map(e => ({ event: EVENTS[e], num: SYMBOLS.indexOf(word[byYear.indexOf(e)]) + 1 }));
  const nums = k => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, k);

  // 1층: 열수지 장부 — 학습지 36쪽 표의 값
  const ledger = [
    ["대기가 흡수한 에너지를 모두 더하면?", "156"], ["대기가 내보낸 에너지를 모두 더하면?", "156"],
    ["지표가 흡수한 에너지를 모두 더하면?", "145"], ["지표가 내보낸 에너지를 모두 더하면?", "145"],
  ][Math.floor(r() * 4)];
  // 4층: 모래 표본병 — 연강수량 250 mm 이하가 사막(43쪽)
  const bottleNo = nums(5);
  const bottles = [["0°", 2400], ["60°N", 500], ["30°N", 120], ["30°S", 600], ["25°N", 80]].map(([lat, rain], i) => ({ no: bottleNo[i], lat, rain }));
  const desertAns = bottles.filter(b => b.rain <= 250).map(b => b.no).sort((a, b) => a - b).join("");
  // 4층: 사막화 원인 카드 — 사람의 활동 4가지(44쪽) + 기후 변화 1 + 피해 1(함정)
  const causeNo = nums(6);
  const causes = [["과잉 경작", 1], ["과잉 방목", 1], ["무분별한 삼림 벌채", 1], ["부실한 수자원 관리", 1],
    ["대기 대순환 변화로 강수량 감소", 0], ["황사가 이웃 나라까지 날아감", 0]].map(([t, human], i) => ({ t, human, no: causeNo[i] }));
  const causeAns = String(causes.filter(c => c.human).reduce((s, c) => s + c.no, 0));
  // 옥상: IPCC 표(45쪽, 산업화 이전 대비)
  const ipcc = [["+2 ℃일 때 극한 가뭄 횟수는 몇 배?", "2.4"], ["+4 ℃일 때 폭우 횟수는 몇 배?", "2.7"],
    ["+1.5 ℃일 때 가장 더운 날 기온은 몇 ℃ 오를까?", "1.9"], ["+4 ℃일 때 극한 가뭄 횟수는 몇 배?", "4.1"],
    ["+2 ℃일 때 폭우 횟수는 몇 배?", "1.7"], ["+4 ℃일 때 가장 더운 날 기온은 몇 ℃ 오를까?", "5.1"]][Math.floor(r() * 6)];

  const floors = [
    [ // 지하
      { id: "b1", title: "칠판 자물쇠", type: "code", ask: "칠판 쪽지를 모아 자물쇠를 열어라.", answer: "1000",
        clues: ["📝 칠판 쪽지 ①: \"세상에서 가장 뜨거운\"", "📝 칠판 쪽지 ②: \"과일은 무엇일까?\"", "📝 칠판 쪽지 ③: \"정답은 그 과일의 온도를 숫자로\"", "📝 칠판 쪽지 ④: \"복숭아의 한 종류야\""],
        hints: ["(과일 이름 안에 온도가 숨어 있어.)", "(천… 도…? 복숭아 이름 중에 있었는데.)", "(천도복숭아! '천 도'를 숫자로 바꿔 써 봐.)"] },
    ],
    [ // 1층 · 36쪽
      { id: "f1b", title: "복사 평형 저울", type: "code", ask: "지구가 흡수한 에너지만큼 우주로 나가는 두 갈래의 숫자를 작은 수부터 붙여 써라. (예: 3과 40 → 340)", answer: "1258",
        clues: ["🃏 카드: 태양 복사 100 중 지구가 흡수한 것은 70", "🃏 카드: 지표면에서 우주로 바로 빠져나감 12", "🃏 카드: 대기가 우주로 복사 58", "🃏 카드: 지표면 반사 7", "🃏 카드: 대기의 반사 및 산란 23"],
        hints: ["(반사는 흡수되지 않고 튕겨 나간 거잖아…)", "(흡수한 에너지가 나가는 길은 '복사'나 '손실'이야. 반사 카드는 빼자.)", "(흡수한 70 = 지표에서 바로 나간 것 + 대기가 복사한 것. 그 두 숫자를 작은 수부터!)"] },
      { id: "f1a", title: "열수지 장부", type: "code", ask: ledger[0] + " (숫자만)", answer: ledger[1],
        clues: ["📒 장부 ①: 대기가 받은 것 — 태양 복사 흡수 23, 지표면 방출 104", "📒 장부 ②: 대기가 받은 것 — 물의 증발 24, 대류와 전도 5 / 대기가 내보낸 것 — 우주로 복사 58",
          "📒 장부 ③: 지표가 받은 것 — 태양 복사 47, 대기의 재복사 98 / 대기가 내보낸 것 — 지표로 재복사 98", "📒 장부 ④: 지표가 내보낸 것 — 지표면 방출 116, 물의 증발 24, 대류와 전도 5"],
        hints: ["(장부가 네 장으로 찢어져 있어. 팀원 것까지 다 모아야 해.)", "(물어본 곳이 '대기'인지 '지표'인지, '받은 것'인지 '내보낸 것'인지 골라서 더하자.)", "(복사 평형이라 받은 것의 합 = 내보낸 것의 합. 물어본 쪽 장부만 빠짐없이 더하면 돼!)"] },
    ],
    [ // 2층 · 37쪽
      { id: "f2a", title: "두 개의 온도계", type: "code", ask: "온실 효과 덕분에 지구 평균 기온은 약 몇 ℃ 높아졌을까? (숫자만)", answer: "33",
        clues: ["🌡 온도계 A: 대기가 없는 지구의 평균 기온 약 −18 ℃", "🌡 온도계 B: 대기가 있는 지구의 평균 기온 약 15 ℃", "📝 쪽지: 대기는 지구 복사 에너지를 붙잡았다가 일부를 지표로 되돌린다", "📝 쪽지: 높아진 만큼 = B − A"],
        hints: ["(온도계 두 개를 비교해야 해.)", "(영하에서 영상으로 올라간 거니까 빼기를 조심!)", "(B − A인데 A가 영하야. 음수를 빼면 더하기가 돼!)"] },
      { id: "f2b", title: "온실 기체 짝짓기", type: "pair", ask: "온실 기체와, 그 기체가 주로 나오는 곳을 짝지어라.",
        left: ["이산화 탄소", "메테인", "수증기"], right: ["화석 연료를 태울 때·숲이 사라질 때", "가축을 기를 때·유기물이 썩을 때", "바다와 호수에서 물이 증발할 때"],
        clues: ["🔬 메모: 온실 기체 방출량 중 가장 많은 기체", "🔬 메모: 양은 적지만 열을 잘 붙잡는 기체", "🔬 메모: 대기 중 양이 거의 일정한 기체", "🔬 메모: 세 짝을 모두 맞혀야 문이 열린다"],
        hints: ["(공장 굴뚝, 소 농장, 바다… 어디서 무엇이 나올까?)", "(유기물이 썩을 때 나오는 기체는 이름에 '메'가 들어가.)", "(이산화 탄소-화석 연료, 메테인-가축, 수증기-증발)"] },
    ],
    [ // 3층 · 41~42쪽
      { id: "f3a", title: "바람의 지구본", type: "pair", ask: "지구 전체를 도는 바람과 그 바람이 부는 위도를 짝지어라.",
        left: ["무역풍", "편서풍", "극동풍"], right: ["적도 ~ 위도 30°", "위도 30° ~ 60°", "위도 60° ~ 극"],
        clues: ["🌐 메모: 적도의 따뜻한 공기는 올라가고, 극의 차가운 공기는 내려온다", "🌐 메모: 저위도의 바닷물은 동쪽에서 서쪽으로 부는 바람에 밀려 서쪽으로 흐른다", "🌐 메모: 중위도의 바닷물은 서쪽에서 불어오는 바람에 밀려 동쪽으로 흐른다", "🌐 메모: 극에서 부는 바람은 가장 높은 위도에"],
        hints: ["(적도에서 극까지 바람대가 세 칸으로 나뉘어 있어.)", "(무역풍은 적도 쪽, 극동풍은 이름처럼 극 쪽.)", "(무역풍 0~30°, 편서풍 30~60°, 극동풍 60°~극)"] },
      // 레버 4개(▲·▼)의 조합 16가지. 레버마다 무엇을 조절하는지는 단서 카드(🔖)에만 있고, 레버 순서는 팀마다 섞음
      { id: "f3b", title: "고장 난 무역풍 선풍기", type: "lever",
        ask: "쪽지: \"동태평양 바다에 열이 나게 하라(엘니뇨).\" 레버 네 개를 그때의 상태로 올리거나(▲) 내려라(▼).",
        levers: [["무역풍 세기", "강하게", "약하게", "D"], ["동태평양 용승", "강하게", "약하게", "D"], ["동태평양 바닷물 온도", "높게", "낮게", "U"], ["서태평양(인도네시아) 강수량", "많게", "적게", "D"]],
        clues: ["📈 관측 기록: 평상시 무역풍은 따뜻한 해수를 서쪽(인도네시아)으로 밀어낸다", "📈 관측 기록: 동쪽(페루)에서는 깊은 곳의 차가운 해수가 올라온다(용승)"],
        hints: ["(동쪽 바다를 데우려면 따뜻한 물이 동쪽에 남아야 해.)", "(바람이 약해지면 차가운 물을 끌어올리는 용승은 어떻게 될까?)", "(비구름은 따뜻한 바다를 따라 동쪽으로 옮겨 가. 그럼 서태평양의 비는?)"] },
      { id: "f3c", title: "엘니뇨 피해 지도", type: "pair", ask: "무역풍이 약해졌을 때(엘니뇨) 각 지역에 생기는 피해를 짝지어라.",
        left: ["서태평양(인도네시아)", "동태평양(페루)"], right: ["가뭄·산불", "홍수·어획량 감소"],
        clues: ["☁ 메모: 따뜻한 바다 위에서는 공기가 올라가 구름과 비가 많아진다", "☁ 메모: 엘니뇨 때 비가 많이 오는 곳은 동쪽으로 옮겨 간다", "🐟 메모: 깊은 곳의 영양분이 덜 올라오면 물고기가 줄어든다", "☀ 메모: 비구름이 떠난 곳은 메마른다"],
        hints: ["(비구름이 어디로 옮겨 갔는지 생각해 봐.)", "(비가 많아진 쪽은 홍수, 비구름이 떠난 쪽은 가뭄.)", "(서태평양: 가뭄·산불 / 동태평양: 홍수·어획량 감소)"] },
    ],
    [ // 4층 · 43~45쪽(옥상 포함)
      // 버튼 4개를 순서대로 4번(같은 버튼 여러 번 가능 → 256가지). 버튼 자리는 팀마다 섞음
      { id: "f4a", title: "공기 흐름의 문", type: "seq",
        ask: "문 글씨: \"사막 표본실 문은 적도에서 출발한 공기가 한 바퀴 도는 순서대로 눌러야 열린다.\" 버튼을 순서대로 네 번 눌러라.",
        steps: ["⬆ 위로 올라감", "➡ 높은 하늘에서 극 쪽으로", "⬇ 아래로 내려옴", "⬅ 지표를 따라 적도 쪽으로"],
        clues: ["🏜 메모: 적도에서 데워진 공기는 위로 올라가며 비를 뿌린다", "🏜 메모: 올라간 공기는 높은 하늘에서 극 쪽으로 이동한다",
          "🏜 메모: 비를 뿌린 마른 공기는 위도 30° 부근에서 아래로 내려온다 — 그래서 사막이 생긴다", "🏜 메모: 내려온 공기는 지표를 따라 적도로 돌아간다(무역풍)"],
        hints: ["(적도는 뜨거워. 뜨거운 공기는 어느 쪽으로 움직일까?)", "(올라간 공기는 어디로 가야 다시 내려올 수 있을까?)", "(사막은 공기가 내려오는 위도 30° 근처. 내려온 공기는 무역풍이 되어…)"] },
      { id: "f4b", title: "모래 표본병", type: "code", ask: "진짜 사막 모래가 든 표본병의 번호를 작은 수부터 붙여 써라.", answer: desertAns,
        clues: bottles.map(b => `🧪 표본병 ${b.no}: 위도 ${b.lat}, 1년 강수량 ${b.rain} mm`).concat(["📝 쪽지: 위도만 보고 고르면 함정에 빠진다"]),
        hints: ["(사막을 정하는 기준은 위도가 아니라 비의 양이야.)", "(사막은 1년 강수량이 몇 mm 이하인 곳이었더라… 250 mm!)", "(강수량 250 mm 이하인 병 두 개를 찾아.)"] },
      { id: "f4c", title: "사막화 원인 카드", type: "code", ask: "사람의 활동 때문에 생긴 사막화 원인 카드의 숫자를 모두 더하면?", answer: causeAns,
        clues: causes.map(c => `🗂 카드 ${c.no}: ${c.t}`),
        hints: ["(카드 중에는 원인이 아닌 것, 사람 탓이 아닌 것이 섞여 있어.)", "(황사는 원인이 아니라 피해! 강수량 감소는 기후 변화 탓.)", "(과잉 경작·과잉 방목·삼림 벌채·수자원 관리, 네 장을 더해.)"] },
      { id: "r1", title: "IPCC 경고판", type: "code", ask: `${ipcc[0]} (숫자만, 예: 3.5)`, answer: ipcc[1],
        clues: ["📊 지금(+1.1 ℃): 가장 더운 날 1.2 ℃↑, 극한 가뭄 1.7배, 폭우 1.3배, 강설량 1 % 감소", "📊 +1.5 ℃: 가장 더운 날 1.9 ℃↑, 극한 가뭄 2.0배, 폭우 1.5배, 강설량 5 % 감소",
          "📊 +2 ℃: 가장 더운 날 2.6 ℃↑, 극한 가뭄 2.4배, 폭우 1.7배, 강설량 9 % 감소", "📊 +4 ℃: 가장 더운 날 5.1 ℃↑, 극한 가뭄 4.1배, 폭우 2.7배, 강설량 26 % 감소"],
        hints: ["(경고판이 네 조각으로 나뉘어 있어. 물어본 온도의 조각을 가진 사람을 찾아.)", "(산업화 이전보다 몇 ℃ 올랐을 때인지 먼저 확인!)", "(그 조각에서 물어본 항목의 숫자를 그대로 써.)"] },
      { id: "r2", title: "탈출문", type: "code", final: true, needs: "r1",
        ask: "탈출문 자물쇠(영어 대문자). 문에 새겨진 글: \"조각을 연도 순서대로 놓아라. 보충쌤은 출석을 원자 번호로만 부른다.\"", answer: word.join("").toUpperCase(),
        clues: ["📜 조각 카드는 '단서' 가방에 있다(팀 공용)", "📜 보충쌤 출석부(원자 번호 1~20)도 가방에 있다", "📝 쪽지: 사건이 일어난(정해진) 해를 떠올려라", "📝 쪽지: 얻은 순서대로 놓으면 함정"],
        hints: ["(조각에 적힌 사건들, 45쪽 연표에서 봤어.)", "(1992 협약 → 1997 교토 → 2015 파리 → 2021 IPCC → 2050 탄소 중립)", "(순서대로 놓은 숫자를 출석부에서 원소 기호로 바꿔 읽어!)"] },
    ],
  ];
  const NAMES = {};
  // 뺀 퍼즐은 자리(퍼즐 칸 번호)를 지키려고 off로만 표시 → 지도에 안 보이고 단서도 안 놓임
  const off = new Set(OFF[level]), over = OVERRIDE[level] ?? {};
  return { level, floors: floors.map(fl => fl.map(pz => ({ ...prep(pz, r, NAMES[pz.id]), ...LINKS[pz.id], ...(over[pz.id] ?? {}), ...(off.has(pz.id) ? { off: true } : {}) }))),
    pieces, pieceFrom, word: word.join("").toUpperCase() };
}

// 층을 오가게 만드는 연결. gives: 풀면 얻는 것(up 위층 계단, key 열쇠 문자, flash 손전등),
// at: { 단서 번호: 그 단서가 놓인 층 } — 다른 층에서 단서를 가져와야 풀린다
const LINKS = {
  f1b: { gives: { up: 1 } },
  f1a: { gives: { key: "a", name: "온실 실험실 열쇠" }, at: { 3: 2 } },          // 장부 ④는 2층
  f2a: { gives: { up: 1 } },
  f2b: { at: { 2: 3 } },                                                       // 세 번째 기호 카드는 3층
  f3a: { gives: { up: 1 } },
  f3b: { gives: { flash: 1, name: "손전등" } },
  f3c: {},
  b1: { gives: { key: "b", name: "관측실 열쇠" } },
  f4a: { gives: { key: "c", name: "표본실 열쇠" } },
  f4b: { at: { 2: 2, 3: 2 } },                                                 // 표본병 2개 정보는 2층
  f4c: { at: { 2: 0, 3: 0 } },                                                 // 사람 원인 카드 2장은 지하 미로
  r1: { gives: { key: "r", name: "옥상 문" }, at: { 0: 2, 1: 2, 2: 3, 3: 3 } }, // 옥상 비밀번호(IPCC 표)는 아래층에서
};

export const ROLL = SYMBOLS.map((s, i) => `${i + 1} ${s}`).join(" · "); // 보충쌤 출석부

// 정답 확인. pair는 [[왼쪽 번호, 오른쪽 번호]...]로, 정답은 같은 번호끼리(왼쪽 i ↔ 오른쪽 i)
export function check(pz, input) {
  if (pz.type === "pair") return input.length === pz.left.length && input.every(([l, rr]) => l === rr);
  return norm(input) === norm(pz.answer);
}

// 층의 단서를 지도 바닥 칸(시작점에서 3칸 이상)에 팀마다 다르게 흩뿌림 → [{ key, pz, t, p, j, x, y }]
export function clueSpots(seed, code, floors, f, map) {
  const all = floors.flatMap((fl, ff) => fl.map(pz => [ff, pz])).filter(([, pz]) => !pz.off); // 전체 퍼즐 순번 p로 단서 주인을 돌림
  const r = rng(seed ^ hash(code + "spots" + f)), sy = map.findIndex(row => row.includes("S")), sx = sy < 0 ? -99 : map[sy].indexOf("S");
  const far = (x, y) => Math.abs(x - sx) + Math.abs(y - sy) > 2;
  // 단서는 책상(D)·칠판(B) 위. 바로 옆에 바닥(.)이 있어야 함 → 잠긴 방(,)·보충실 안은 빠짐. 책상이 없는 층(지하)은 바닥에
  const nearFloor = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map[y + dy]?.[x + dx] === ".");
  let pool = map.flatMap((row, y) => [...row].flatMap((c, x) => "DB".includes(c) && nearFloor(x, y) && far(x, y) ? [[x, y]] : []));
  if (!pool.length) pool = map.flatMap((row, y) => [...row].flatMap((c, x) => c === "." && far(x, y) ? [[x, y]] : []));
  const tiles = shuffle(pool, r);
  return all.flatMap(([ff, pz], p) => pz.clues.map((t, j) => ({ key: `${pz.id}-${j}`, pz: pz.title, t, p, j, f: pz.at?.[j] ?? ff })))
    .filter(c => c.f === f).map((c, i) => ({ ...c, x: tiles[i % tiles.length][0], y: tiles[i % tiles.length][1] }));
}
// 책상 미니게임: 책상(D) 위 단서 4개 중 1개꼴로, 그 단서는 미니게임을 풀어야 나옴. salt(반 씨앗값+팀 코드)·단서 키로 정해져 팀원 기기가 모두 같음
export const MINI_KINDS = ["nonsense", "wire", "picture"];
export function miniGameOf(c, map, salt = "") {
  if (map[c.y]?.[c.x] !== "D") return null;
  const h = hash(salt + c.key + "mini") >>> 0;
  return h % 4 === 0 ? MINI_KINDS[(h >>> 4) % 3] : null;
}
// 단서 주인: 접속 중인 팀원(uid 정렬)에게 돌아가며. 팀원이 나가면 남은 사람끼리 다시 나눔
export const clueOwner = (c, ids) => { const s = [...ids].sort(); return s[(c.j + c.p) % s.length]; };

// 물건을 흩뿌릴 자리: center에서 걸어서 2칸 안(모자라면 3칸, 그래도 모자라면 더 멀리)의 바닥(.)에 하나씩, 이미 물건이 있는 칸(taken)은 피함.
// 문·벽·보충실을 넘지 않음(같은 교실·복도 안). allowCenter=false면 center(예: 숨어 있던 사물함)에는 두지 않음
export function scatter(map, center, n, taken = new Set(), allowCenter = true) {
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]], step = new Map([[center.x + "," + center.y, 0]]), q = [center];
  for (let i = 0; i < q.length; i++) { // 걸음 수 순서로 넓혀 감
    const p = q[i], d = step.get(p.x + "," + p.y);
    for (const [dx, dy] of D) {
      const n2 = { x: p.x + dx, y: p.y + dy }, c = map[n2.y]?.[n2.x], k = n2.x + "," + n2.y;
      if (!c || step.has(k) || "#+GabcrjDBTL".includes(c)) continue;
      step.set(k, d + 1); q.push(n2);
    }
  }
  const free = q.filter((p, i) => !taken.has(p.x + "," + p.y) && (map[p.y][p.x] === "." || (i === 0 && allowCenter && !"H".includes(map[p.y][p.x]))));
  return free.slice(0, n); // q가 이미 가까운 순 → 2칸 안부터 채우고, 모자라면 3칸·그 너머
}
// 물건을 옮겨 둘 자리: target(보충실 문·계단·엘리베이터)에서 2칸 안의 복도 바닥(.) 중, 바로 앞 칸은 빼고 고른다(모자라면 3칸).
// 벽·잠긴 방·교실 안·보충실 안에는 두지 않는다(문을 건너지 않고 바로 앞 칸에서 이어지는 곳만). key로 정해 여러 기기가 같은 자리를 고름
export function dropSpot(map, target, key, taken = new Set()) {
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]], dist = p => Math.abs(p.x - target.x) + Math.abs(p.y - target.y);
  const front = D.map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy })).find(p => map[p.y]?.[p.x] === ".");
  if (!front) return target;
  const seen = new Map([[front.x + "," + front.y, front]]), q = [front];
  while (q.length) {
    const p = q.pop();
    for (const [dx, dy] of D) {
      const n = { x: p.x + dx, y: p.y + dy }, c = map[n.y]?.[n.x], k = n.x + "," + n.y;
      if (!c || seen.has(k) || "#+GabcrjDBTL".includes(c) || dist(n) > 4) continue; // 문을 넘지 않음 → 복도(지하는 미로 통로)만
      seen.set(k, n); q.push(n);
    }
  }
  for (const r of [2, 3]) {
    const cands = [...seen.values()].filter(p => map[p.y][p.x] === "." && dist(p) <= r && (p.x !== front.x || p.y !== front.y) && !taken.has(p.x + "," + p.y))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    if (cands.length) return cands[(hash(key) >>> 0) % cands.length];
  }
  return scatter(map, front, 1, taken)[0] ?? front; // 그래도 없으면 가장 가까운 빈 바닥
}
