"""ㄱ자 학교 지도 생성기(1~3층) → game/maps.js. 실행: python3 test/gen_maps.py
1층 오1 = 조소 1실(밝음, 조각상 밀기), 오2 = 조소 2실(어두운 미로, 1실 안쪽 문으로만 들어감). 탈출은 1층 현관."""
import random, json, pathlib
# 교실 안 9×12칸(긴 쪽 12칸이 복도에 붙음), 복도 너비 4칸. 세로 복도 왼쪽(왼1~4)에는 교실 없음
W, H = 100, 82
L, D = 12, 9
TOP = [(1, 12), (14, 25), (27, 38), (46, 57), (59, 70), (72, 83)]  # 위·아래 1~6 (x 범위). 위3·위4 사이(40~44)는 중앙 계단·현관
VROWS = [(55, 66), (42, 53), (29, 40), (16, 27)]                  # 오1~4 (y 범위): 세로 복도가 시작되는 곳(가로 복도 모서리)부터 위로 붙여 쌓음
VTOP = 13                                                          # 세로 복도 맨 위(우측 계단 자리). 그 위 빈 줄은 잘라 냄
CROP = VTOP - 1                                                    # 지도 위쪽에서 잘라 낼 줄 수(맨 윗줄은 벽으로 남김)
TY, BY, HC = (57, 65), (72, 80), (67, 70)                          # 위 교실·아래 교실·가로 복도의 y 범위
RX, VC = (90, 98), (85, 88)                                        # 오 교실·세로 복도의 x 범위
# 교실 안: B 칠판(짧은 쪽 벽), T 교탁, D 책상(보통 교실 1칸짜리 3×4 = 긴 쪽 3줄 × 짧은 쪽 4줄, 합친 방은 3×2칸 큰 책상 8개), L 사물함(칠판 반대쪽 벽, 가운데 하나는 숨을 수 있는 H)

# 방 꾸밈(교실 안 좌표 u: 긴 쪽 0=칠판 쪽, v: 짧은 쪽 0=안쪽 벽 D-1=복도 쪽). 새 가구:
# P 컴퓨터 책상 · E 이젤 · U 좌대(석고상) · F 전시 패널(그림) · N 보건실 침대 · O 복사기
def furnish(put, n, horiz, style):
    if style == 'gallery':                                   # 안쪽 벽을 따라 그림 패널, 가운데 줄에 좌대
        for u in range(1, n - 1, 2): put(u, 0, 'F')
        for u in range(3, n - 2, 4): put(u, 4, 'U')
        for u in range(5, n - 3, 4): put(u, 7, 'U')              # 둘째 줄(엇갈리게)
        return
    if style == 'artpile':                                   # 작품 보관실: 캔버스·액자 더미(A)를 아무렇게나. 복도 쪽 3줄은 비워 길을 남김
        r = random.Random(n * 7 + 3)
        for u in range(1, n - 1):
            for v in range(0, D - 3):
                if r.random() < (0.55 if v < 2 else 0.25): put(u, v, 'A')
        return
    if style == 'storage':                                   # 선반 줄(사이사이 통로), 맨 끝에 숨는 사물함
        for v in (1, 2, 5, 6):
            for u in range(2, n - 2):
                if u % 4 != 1: put(u, v, 'L')
        put(n - 1, D // 2, 'H'); return
    for v in range(2, D - 2): put(0, v, 'B')               # 칠판(화이트보드)
    for v in (4, 5): put(2, v, 'T')                          # 교탁·부장 책상 2칸
    if style == 'office':                                    # 2×3 책상 묶음 위에 컴퓨터 6대(긴 방은 묶음 여러 개)
        for u0 in range(4, n - 3, 4):                         # 묶음 = 긴 쪽 2칸 × 짧은 쪽 3칸(복도 쪽으로 짧은 면)
            for du in range(2):
                for v in (3, 4, 5): put(u0 + du, v, 'P')
        put(n - 2, 1, 'O')                                   # 복사기
    elif style == 'pc':                                      # 만화·애니메이션: 컴퓨터(태블릿) 책상 3×4
        for u in (5, 7, 9):
            for v in (1, 3, 5, 7): put(u, v, 'P')
    elif style == 'easel':                                   # 소묘·서양화: 가운데 석고상을 둘러싼 이젤
        for cu in ([n // 2 + 1] if n < 16 else [n // 4 + 2, 3 * n // 4]):
            put(cu, 4, 'U')
            for du, v in ((-3, 2), (-3, 4), (-3, 6), (3, 2), (3, 4), (3, 6), (-1, 1), (1, 1), (-1, 7), (1, 7)):
                if 3 < cu + du < n - 1: put(cu + du, v, 'E')
    elif style == 'health':                                  # 보건실: 침대 줄
        for u in (4, 6, 8, 10):
            if u < n - 2: put(u, 1, 'N')
    elif style == 'print':                                   # 등사실: 복사기 줄 + 종이 선반
        for u in (4, 6, 8): put(u, 1, 'O')
        for u in range(4, 9): put(u, 7, 'L')
    elif n == L and style == 'class':                        # 보통 교실: 1칸 책상 3×4(교탁 앞 2칸, 사물함 앞 1칸 통로)
        for u in (5, 7, 9):
            for v in (1, 3, 5, 7): put(u, v, 'D')
    else:  # 과학실·라운지·한국화실·합친 교실: 긴 쪽 3칸 × 짧은 쪽 2칸 큰 책상을 2줄 × 4개
        lu, lv = (3, 2) if horiz else (2, 3)
        k = min(4, (n - 8) // (lu + 1))
        for i in range(k):
            u0 = 5 + round(i * (n - 9 - lu) / max(1, k - 1))
            for v0 in ((1, 6) if horiz else (1, 5)):
                for du in range(lu):
                    for dv in range(lv): put(u0 + du, v0 + dv, 'D')
    for v in range(D): put(n - 1, v, 'L')                    # 뒤쪽 사물함(가운데는 숨을 수 있는 H)
    put(n - 1, D // 2, 'H')

def floor_map(f, spec):
    g = [['#'] * (W + (9 if f == 1 else 0)) for _ in range(H)]     # 1층은 조소 2실을 2배로 넓히느라 9칸 더 넓음
    def fill(x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): g[y][x] = c
    fill(1, HC[0], VC[1], HC[1], '.'); fill(VC[0], VTOP, VC[1], HC[1], '.')   # 가로·세로 복도
    rooms, local, areas = [], {}, []
    def room(name, x0, y0, x1, y1, side, kind='.', style='class'):
        # 교실 안 좌표 (u: 긴 쪽, 0=칠판 쪽 / v: 짧은 쪽, D-1=복도 쪽) → 지도 좌표
        horiz = side in ('top', 'bot'); n = (x1 - x0 + 1) if horiz else (y1 - y0 + 1)
        def at(u, v):
            if side == 'top': return (x0 + u, y0 + v)
            if side == 'bot': return (x0 + u, y1 - v)
            if side == 'left': return (x0 + v, y0 + u)
            return (x1 - v, y0 + u)
        def put(u, v, c): x, y = at(u, v); g[y][x] = c
        def door(u):  # 복도 쪽 벽 칸
            x, y = at(u, D - 1); dx, dy = {'top': (0, 1), 'bot': (0, -1), 'left': (1, 0), 'right': (-1, 0)}[side]; return (x + dx, y + dy)
        fill(x0, y0, x1, y1, ',' if kind in 'abc' else 'j' if kind == 'G' else '.')
        if kind != 'G': furnish(put, n, horiz, style)
        local[name] = at
        if style == 'gallery':                                 # 갤러리: 복도 쪽 벽이 없음(복도와 한 공간)
            for u in range(n): x, y = door(u); g[y][x] = '.'
            areas.append({"kind": "gallery", "x0": x0, "y0": y0, "x1": x1, "y1": y1, "name": name}); return
        doors = [door(1)] + ([door(n - 2)] if kind == '.' else [])
        for x, y in doors: g[y][x] = '+' if kind == '.' else kind
        rooms.append({"name": name, "door": list(doors[0])})
    slots = {}
    for i, (a, b) in enumerate(TOP):
        slots[f"위{i+1}"] = (a, TY[0], b, TY[1], 'top'); slots[f"아래{i+1}"] = (a, BY[0], b, BY[1], 'bot')
    for i, (a, b) in enumerate(VROWS):
        slots[f"오{i+1}"] = (RX[0], a, RX[1], b, 'right')
    used = set()
    for name, parts, kind, *st in spec.get("rooms", []):  # parts: 합칠 칸 이름들 또는 직접 좌표, st: 꾸밈 스타일
        if isinstance(parts, tuple): x0, y0, x1, y1, side = parts
        else:
            ss = [slots[p] for p in parts]; used.update(parts)
            x0, y0, x1, y1, side = min(s[0] for s in ss), min(s[1] for s in ss), max(s[2] for s in ss), max(s[3] for s in ss), ss[0][4]
        room(name, x0, y0, x1, y1, side, kind, st[0] if st else 'class')
    for s, (x0, y0, x1, y1, side) in slots.items():      # 이름 없는 나머지 교실(임시 이름)
        if s in used or s in spec.get("skip", ()): continue
        room(f"{f}층 {s}", x0, y0, x1, y1, side)
    # 계단: 올라가는 계단(C·K·R)과 내려가는 계단(V·W·X)을 각 2칸 너비로 나란히. 갈 수 없는 쪽(1층 아래, 4층 위, 3층 중앙 위)은 만들지 않음
    def stairs(x, y, up, down, can_up, can_down, gap=0):  # (x, y)부터 세로 2칸: 왼쪽 2칸 위로, (gap칸 띄우고) 오른쪽 2칸 아래로
        for dy in range(2):
            for dx in range(2):
                if can_up: g[y + dy][x + dx] = up
                if can_down: g[y + dy][x + 2 + gap + dx] = down
    if True:                                              # 중앙 계단: 위3과 위4 사이 홈(아래3·아래4 사이엔 계단 없음)
        fill(40, 61, 44, 66, '.'); stairs(40, 61, 'C', 'V', f <= 2, f >= 2, gap=1); g[61][42] = g[62][42] = '#'  # 가운데 난간
    if f == 1:                                            # 현관: 아래3과 아래4 사이, 시작점
        fill(41, 71, 43, 74, '.'); g[74][42] = 'S'; rooms.append({"name": "현관", "door": [43, 71]})
    fill(85, 71, 88, 75, '.'); stairs(85, 74, 'K', 'W', f <= 2, f >= 2)  # 모서리 계단: 아래6 바로 옆 홈(복도 모서리 아래). 3층이 꼭대기
    stairs(85, VTOP, 'R', 'X', f <= 2, f >= 2)           # 우측 계단: 세로 복도 맨 위
    if f == 1: sculpture_rooms(g, rooms)                  # 조소 1·2실
    for (name, u, v), c in spec.get("put", {}).items():   # 퍼즐 칸: 교실 이름과 교실 안 좌표, 또는 ("", x, y) 복도
        x, y = local[name](u, v) if name else (u, v); g[y][x] = c
    for x, y in spec.get("lockers", []): g[y][x] = 'H'
    hs = sorted((x, y) for y in range(H) for x in range(len(g[0])) if g[y][x] == 'H')
    for i, (x, y) in enumerate(hs):                        # 숨는 사물함은 3개 중 1개만 남김(긴장감). 나머지는 보통 사물함
        if i % 3: g[y][x] = 'L'
        else:                                              # 숨는 사물함 앞이 이젤·책상 등으로 막혀 있으면 그 가구를 치워 들어갈 수 있게
            nb = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < H and 0 <= x + dx < len(g[0])]
            if not any(g[b][a] in '.,mz' for a, b in nb):
                a, b = next((a, b) for a, b in nb if g[b][a] in 'EDPUNOA'); g[b][a] = '.'
    for x, y in spec.get("walls", []): g[y][x] = 'Y'       # 벽에 붙은 온도계(단서)
    return [''.join(r) for r in g], rooms, areas

# 조소 1실(오1~2, 밝음): 조각상(Q)을 밀어 길을 만듦. 바닥 m(보충쌤 못 들어옴). 복도 문은 아래쪽 하나, 위쪽 벽 문(x=96)으로 2실에 들어감
# 조각상 11개(길을 막는 것 + 헷갈리게 하는 것), 최소 12번 밀어야 함(test/statues.test.mjs가 확인). 입구 (0,23) → 출구 (6,0)
SOKO = ["######.##",
        "#...Q...#",
        "#.#####Q#",
        "#.......#",
        "####.####",
        "#.......#",
        "#.##.##.#",
        "#.......#",
        "##Q###.##",
        "#....Q..#",
        "#.##.##.#",
        "#..Q....#",
        "######.##",
        "######.##",
        "#....#..#",
        "#.##Q#.##",
        "#..#...##",
        "##.##.#.#",
        "#...#...#",
        "#.#..Q#.#",
        "#.#.#.#Q#",
        "#..Q#...#",
        "##.##Q#.#",
        "..Q....##",
        "#########"]
def sculpture_rooms(g, rooms):
    y1a, y1b = VROWS[1][0], VROWS[0][1]                    # 1실 = 오2 위 ~ 오1 아래(25줄)
    y2a, y2b = VROWS[3][0], VROWS[2][1]                    # 2실 = 오4 위 ~ 오3 아래(25줄)
    for y in range(y1a, y1b + 1):
        for x in range(RX[0], RX[1] + 1):
            c = SOKO[y - y1a][x - RX[0]]; g[y][x] = 'm' if c == '.' else c
    g[y1a + 23][RX[0] - 1] = '+'                           # 1실 복도 문(아래쪽)
    g[y1a - 1][RX[0] + 6] = '+'                            # 1실 → 2실 문(두 방 사이 벽)
    W2, H2 = 2 * (RX[1] - RX[0] + 1), y2b - y2a + 1          # 2실: 다른 방의 2배 너비(18×25). 칸은 짝수 좌표(0~16), 맨 오른쪽 줄은 더미 벽
    ENT, GOAL = (6, H2 - 1), (8, 12)                          # 입구(1실에서 올라오는 문 앞) · 목표(미로 한가운데)
    D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    inside = lambda k: 0 <= k[0] < W2 - 1 and 0 <= k[1] < H2
    def bfs(grid, src):                                       # 걸음 수 지도
        d = {src: 0}; q = [src]
        for x, y in q:
            for dx, dy in D4:
                k = (x + dx, y + dy)
                if inside(k) and grid[k[1]][k[0]] == 'z' and k not in d: d[k] = d[(x, y)] + 1; q.append(k)
        return d
    def maze(seed):                                           # 자라는 나무(절반은 막 판 길 이어 파기 = 긴 복도, 절반은 아무 데서나 가지 = 갈림길)
        r = random.Random(seed); m = [['#'] * W2 for _ in range(H2)]; m[GOAL[1]][GOAL[0]] = 'z'; live = [GOAL]
        while live:
            i = len(live) - 1 if r.random() < 0.5 else r.randrange(len(live)); x, y = live[i]
            nb = [(x + dx, y + dy, dx, dy) for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)) if inside((x + dx, y + dy)) and m[y + dy][x + dx] == '#']
            if not nb: live.pop(i); continue
            nx, ny, dx, dy = r.choice(nb); m[y + dy // 2][x + dx // 2] = 'z'; m[ny][nx] = 'z'; live.append((nx, ny))
        return m
    def score(m):                                             # 난관 점수: 정답 길 위 갈림길 수(헷갈림) + 막다른 길 수 + 길이
        d = bfs(m, ENT); n = d.get(GOAL)
        if not n or not 80 <= n <= 130: return -1, 0, 0, 0
        g2 = bfs(m, GOAL); path = [k for k in d if d[k] + g2.get(k, 999) == n]
        deg = lambda k: sum(inside((k[0] + dx, k[1] + dy)) and m[k[1] + dy][k[0] + dx] == 'z' for dx, dy in D4)
        forks = sum(deg(k) >= 3 for k in path); dead = sum(deg(k) == 1 for k in d)
        goal_side = sum(m[GOAL[1] + dy][GOAL[0] + dx] == 'z' for dx, dy in D4) == 1   # 목표로 들어가는 입구는 하나
        return forks * 3 + dead + n / 5 + (20 if goal_side else 0), n, forks, dead
    seed = max(range(1500), key=lambda s: score(maze(s))[0]); m = maze(seed)
    # 고리 3개: 벽 한 칸씩 터서 보충쌤을 빙 돌려 따돌릴 곳. 길이는 85% 넘게 지키고, 고리 둘레 14~50칸, 서로 6칸 넘게 떨어지게, 목표 둘레(5칸 안)는 피함
    d0 = bfs(m, ENT)[GOAL]; picked = []
    for _ in range(3):
        best = None; dg = bfs(m, GOAL)
        for y in range(H2):
            for x in range(W2 - 1):
                if m[y][x] != '#' or (x % 2) == (y % 2): continue  # 두 칸 사이의 벽만
                a1, a2 = ((x - 1, y), (x + 1, y)) if x % 2 else ((x, y - 1), (x, y + 1))
                if not all(inside(c) and m[c[1]][c[0]] == 'z' for c in (a1, a2)): continue
                if min(dg.get(a1, 99), dg.get(a2, 99)) <= 5 or any(abs(x - px) + abs(y - py) <= 6 for px, py in picked): continue
                ring = bfs(m, a1)[a2] + 1; m[y][x] = 'z'; d1 = bfs(m, ENT)[GOAL]; m[y][x] = '#'
                if d1 >= 0.85 * d0 and 14 <= ring <= 50 and (best is None or ring > best[0]): best = (ring, x, y)
        if best: m[best[2]][best[1]] = 'z'; picked.append(best[1:])
    best = None; dg = bfs(m, GOAL)                            # 4번째 고리: 왼쪽 아래(입구 쪽)에 하나 더
    for y in range(H2 // 2 + 1, H2):
        for x in range(0, 8):
            if m[y][x] != '#' or (x % 2) == (y % 2): continue
            a1, a2 = ((x - 1, y), (x + 1, y)) if x % 2 else ((x, y - 1), (x, y + 1))
            if not all(inside(c) and m[c[1]][c[0]] == 'z' for c in (a1, a2)): continue
            ring = bfs(m, a1)[a2] + 1; m[y][x] = 'z'; d1 = bfs(m, ENT)[GOAL]; m[y][x] = '#'
            if d1 >= 0.85 * d0 and 10 <= ring <= 50 and (best is None or ring > best[0]): best = (ring, x, y)  # 지름길이 되면 안 됨
    if best: m[best[2]][best[1]] = 'z'; picked.append(best[1:])
    print("조소 2실 미로: 씨앗", seed, "길", bfs(m, ENT)[GOAL], "점수", score(m)[1:], "고리", picked)
    m[GOAL[1]][GOAL[0]] = '3'                                 # 미로 한가운데에 IPCC 경고판 퍼즐 칸
    for y in range(H2):                                       # 미로 벽은 w(조각상·책상 더미). 바깥 벽(#)과 구분
        for x in range(W2): g[y2a + y][RX[0] + x] = 'w' if m[y][x] == '#' else m[y][x]
    rooms.append({"name": "조소 1실", "door": [RX[0] - 1, y1a + 23]}); rooms.append({"name": "조소 2실", "door": [RX[0] + 6, y1a - 1]})

TD = (2, 4)                                               # 퍼즐 칸 = 교탁 가운데
LOCK_CORR = [(12, 70), (33, 67), (88, 60), (85, 20)]     # 복도 사물함(복도 가장자리)
A = lambda *names: list(names)
# 층별 교실(선생님 배치표). (이름, 합칠 칸 또는 좌표, 문 종류, 꾸밈). 문 종류: . 보통, G 보충학습실, a·b·c 열쇠로 여는 방
SPEC = {
  1: {"rooms": [("과학실", A("위1", "위2"), '.', 'lab'), ("과학준비실", A("위3"), '.', 'storage'),
                ("예원갤러리", A("위4", "위5"), '.', 'gallery'), ("작품 보관실", A("위6"), '.', 'artpile'),
                ("등사실", A("아래1"), '.', 'print'), ("보충학습실", A("아래2"), 'G'), ("행정실", A("아래3"), '.', 'office'),
                ("소묘 1실", (46, BY[0], 64, BY[1], 'bot'), '.', 'easel'), ("소묘 2실", (66, BY[0], 83, BY[1], 'bot'), '.', 'easel')],
      "skip": ("아래4", "아래5", "아래6", "오1", "오2", "오3", "오4"),          # 오1~4는 조소 1·2실(따로 만듦)
      "put": {("과학실", *TD): '1', ("소묘 1실", *TD): '2', ("", 41, 74): '4'},   # 3은 조소 2실 맨 끝, 4는 현관 탈출문
      "lockers": LOCK_CORR},
  2: {"rooms": [("2-1반", A("위1"), '.'), ("2교무실", A("위2"), '.', 'office'), ("보건실", A("위3"), 'a', 'health'),
                ("보충학습실", A("위4"), 'G'), ("아르떼라운지", A("위5", "위6"), '.', 'lounge'),
                ("2-2반", A("아래1"), '.'), ("2-3반", A("아래2"), '.'), ("2-4반", A("아래3"), '.'), ("2-5반", A("아래4"), '.'),
                ("3-4반", A("아래5"), '.'), ("3-5반", A("아래6"), '.'),
                ("서양화 1실", A("오1", "오2"), '.', 'easel'), ("서양화 2실", A("오3", "오4"), '.', 'easel')],
      "put": {("아르떼라운지", *TD): '1', ("보건실", *TD): '2', ("2교무실", *TD): '3',
              ("2-3반", *TD): '4', ("서양화 1실", *TD): '5'},                         # 4·5는 쉬움 전용(엘니뇨 채점표·사막 모래병)
      "walls": [(66, TY[0] - 1), (76, TY[0] - 1)],                                    # 아르떼라운지 위쪽 벽 온도계 2개
      "lockers": LOCK_CORR},
  3: {"rooms": [("1교무실", A("위1"), '.', 'office'), ("본교무실", A("위2", "위3"), '.', 'office'), ("평가실", A("위4"), 'b', 'office'),
                ("만화실", A("위5"), '.', 'pc'), ("애니메이션실", A("위6"), '.', 'pc'),
                ("1-1반", A("아래1"), '.'), ("1-2반", A("아래2"), '.'), ("1-3반", A("아래3"), '.'), ("1-4반", A("아래4"), '.'), ("1-5반", A("아래5"), '.'),
                ("3교무실", A("아래6"), 'c', 'office'), ("한국화 1실", A("오1", "오2"), '.', 'ink'), ("한국화 2실", A("오3", "오4"), '.', 'ink'),
                ("보충학습실", (40, BY[0], 44, BY[1], 'bot'), 'G')],                   # 중앙 계단 맞은편 빈 공간
      "put": {("본교무실", *TD): '1', ("만화실", *TD): '2', ("평가실", *TD): '3', ("3교무실", *TD): '4', ("3교무실", 9, 7): '5'},
      "lockers": LOCK_CORR},
}

maps, rooms, areas = [["#"]], [[]], [[]]                 # 0번은 비워 둠(층 번호 = 배열 번호를 지키려고). 지하 없음
for f in (1, 2, 3):
    rows, rm, ar = floor_map(f, SPEC[f])
    rows = rows[CROP:]                                    # 세로 복도 위쪽 빈 공간을 잘라 지도를 줄임
    for r in rm: r["door"][1] -= CROP
    for a in ar: a["y0"] -= CROP; a["y1"] -= CROP
    maps.append(rows); rooms.append(rm); areas.append(ar)
names = ["(없음)", "1층", "2층", "3층"]
out = ["// 층별 지도(test/gen_maps.py가 만듦 — 고칠 땐 생성기를 고치고 다시 실행). 학생 화면과 교사 작은 지도가 함께 쓴다.",
       "// # 벽 . 바닥 , 잠긴 방·옥상 바닥(단서 안 놓임) + 교실 문 a·b·c 열쇠로 여는 문 r 옥상 문(비밀번호) H 사물함(숨기)",
       "// B 칠판 T 교탁 D 책상 L 사물함·선반 P 컴퓨터 책상 E 이젤 U 좌대 F 전시 패널 N 침대 O 복사기 — 단서는 칠판·책상·컴퓨터·이젤에 놓임",
       "// 1~5 퍼즐 칸(그 층 퍼즐 번호) S 현관(시작·탈출) 올라가는 계단 C 중앙 K 모서리 R 우측 / 내려가는 계단 V 중앙 W 모서리 X 우측",
       "// j 보충수업실 안 G 보충수업실 문(옆에서 구출). m 조소 1실 바닥 Q 조각상 처음 자리 z 조소 2실(어두운 미로) — 보충쌤 못 들어옴",
       "export const MAPS = ["]
for n, rows in zip(names, maps):
    out.append(f"  [ // {n}"); out += [f'    "{r}",' for r in rows]; out.append("  ],")
out.append("];")
out.append("export const FLOORS = 3; // 꼭대기 층 번호")
out.append("// 교실 명패: 층마다 { name, door: [x, y] }. 이름 없는 교실은 '2층 위3' 같은 임시 이름")
out.append("export const ROOMS = " + json.dumps(rooms, ensure_ascii=False) + ";")
out.append("// 바닥만 따로 칠할 곳(예원갤러리는 복도와 벽 없이 이어짐)")
out.append("export const AREAS = " + json.dumps(areas, ensure_ascii=False) + ";")
root = pathlib.Path(__file__).resolve().parent.parent
old = (root / "game/maps.js").read_text(encoding="utf-8")
legacy = old[old.index("export const MAP = ["):]                 # 괴물 계산 시험용 옛 지도는 그대로
out.append("// 괴물 계산 시험용 옛 지도(13×16)")
(root / "game/maps.js").write_text("\n".join(out) + "\n" + legacy, encoding="utf-8")
print("ok")
