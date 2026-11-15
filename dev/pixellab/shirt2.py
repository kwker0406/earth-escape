# 4번 금발: 2번 그림의 블레이저를 '교복 와이셔츠'로. 원본의 옷 주름 명암은 살리되 아주 밝게 옮기고,
# 옷깃·주머니 구분선은 둘레 셔츠 색으로 메워 없앰. 금단추 → 작은 셔츠 단추, 끈넥타이는 원래 색
import sys, os; HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); os.chdir(HERE)
from PIL import Image
exec(open(os.path.join(HERE, 'recolor.py')).read())            # 머리 금발 + 기본 판 다시 만들기(SKIRT_TOP, navy, lerp)
RAMP = [(214, 219, 233), (232, 235, 244), (246, 247, 251), (255, 255, 255)]   # 가장 어두운 주름도 옅은 회청색
red = lambda c: c[0] > c[1] + 25 and c[0] > c[2] + 15 and c[0] < 230
skin = lambda c: c[0] > 180 and c[0] > c[2] + 30 and c[2] > 120
D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
for d, top in SKIRT_TOP.items():
    src = Image.open(f'long_{d}.png').convert('RGBA').load(); im = Image.open(f'blond_{d}.png').convert('RGBA'); px = im.load()
    cloth = {(x, y) for y in range(top) for x in range(128) if src[x, y][3] and navy(*src[x, y][:3])}
    if not cloth: continue
    for x, y in cloth: px[x, y] = (255, 255, 255, 255)
    mx = sorted(x for x, y in cloth)[len(cloth) // 2]
    tie = {(x, y) for y in range(top) for x in range(mx - 10, mx + 11) if src[x, y][3] and red(src[x, y]) and src[x, y][1] < 90 and any((x + dx, y + dy) in cloth for dx in (-2, 0, 2) for dy in (-2, 0, 2))}
    if tie:                                                         # 가운데 덩어리만 넥타이(금단추·머리끝 제외)
        cx_, cy_ = sorted(t[0] for t in tie)[len(tie) // 2], sorted(t[1] for t in tie)[len(tie) // 2]
        tie = {t for t in tie if abs(t[0] - cx_) <= 6 and abs(t[1] - cy_) <= 7}
    ty1 = max((y for x, y in tie), default=0)
    L = lambda p: sum(src[p][:3]) / 3
    med = sorted(L(p) for p in cloth)[len(cloth) // 2]
    arm = {(x, y) for x, y in cloth if L((x, y)) < med * 0.8 and abs(x - mx) >= 7}      # 팔과 몸통 사이 선 후보(원본의 어두운 세로선)
    def reach(x, y, dx, dy, n=4): return any((x + dx * i, y + dy * i) in cloth for i in range(1, n + 1))
    for _ in range(4):                                              # 옷 안쪽에 갇힌 선·단추·주머니: 네 방향 모두 셔츠에 닿으면 셔츠로
        add = [(x, y) for y in range(top) for x in range(4, 124) if (x, y) not in cloth and (x, y) not in tie and src[x, y][3] and not skin(src[x, y])
               and not (red(src[x, y]) and y <= ty1 + 1) and all(reach(x, y, dx, dy) for dx, dy in D4)]
        for p in add:
            if L(p) < 60: arm.add(p)
        cloth |= set(add)
    gold = lambda c: c[0] - c[2] > 80 and c[1] - c[2] > 20 and not skin(c)
    cloth |= {(x, y) for y in range(ty1 + 2, top + 2) for x in range(1, 127) if src[x, y][3] and gold(src[x, y]) and any((x + dx, y + dy) in cloth for dx in (-1, 0, 1) for dy in (-1, 0, 1))}
    for y in range(ty1 - 4, top):                                   # 가로로 셔츠 사이에 낀 원본의 검은 선 → 셔츠에 넣고 팔 선 후보로
        for x in range(2, 126):
            if (y > ty1 or abs(x - mx) >= 8) and (x, y) not in cloth and (x, y) not in tie and src[x, y][3] and sum(src[x, y][:3]) < 200 and reach(x, y, 1, 0, 2) and reach(x, y, -1, 0, 2): arm.add((x, y))
    cloth |= arm
    cand, arm, lines = {p for p in arm if p[1] > ty1 - 5}, set(), []
    for side in (-1, 1):                                            # 팔 선은 후보가 가장 많은 세로줄 하나로 곧게 다시 그림(깨진 선 방지)
        c = [p for p in cand if (p[0] - mx) * side >= (5 if d in ('south', 'north') else 0)]
        if len(c) < 6 or (d not in ('south', 'north') and side == 1 and lines): continue
        if d not in ('south', 'north'): c = list(cand)
        lx = max({p[0] for p in c}, key=lambda v: sum(p[0] == v for p in c))
        ys = [p[1] for p in c if abs(p[0] - lx) <= 1]
        lines.append((lx, min(ys), max(y for x, y in cloth if x == lx)))
        arm |= {(lx, y) for y in range(lines[-1][1], lines[-1][2] + 1) if (lx, y) in cloth}
    def gap(x, y, dx, dy):                                          # 그 방향으로 셔츠 밖(또는 팔 선)까지 몇 칸인지
        n = 1
        while n < 5 and (x + dx * n, y + dy * n) in cloth and (x + dx * n, y + dy * n) not in arm: n += 1
        return n
    TONE = [(251, 252, 255), (228, 233, 245), (200, 209, 230), (168, 180, 210)]
    for x, y in cloth:                                              # 음영 새로 넣기: 빛은 왼쪽 위. 오른쪽·아래 가장자리와 턱·머리 밑이 어두움
        s = 3 if (x, y) in arm else max(3 - gap(x, y, 1, 0), 3 - gap(x, y, 0, 1), 3 - gap(x, y, 0, -1), 2 - gap(x, y, -1, 0), 0)
        px[x, y] = TONE[1 if s == 3 else s] + (255,)
    LINE, SEAM = (100, 112, 150, 255), (176, 187, 214, 255)         # 윤곽선(팔·옷깃·단추) / 옅은 옷선(앞단·소매 끝)
    CUFF = (125, 138, 176, 255)
    def put(x, y, c):
        if (x, y) in cloth: px[x, y] = c
    for p in arm: px[p] = LINE
    for lx, y0, y1 in lines:                                        # 소매 끝(커프스): 손 위 3칸에 가로선 한 줄, 팔 선에서 소매 바깥 끝까지
        hand = [(x, y) for y in range(y1 - 6, min(128, y1 + 6)) for x in range(lx - 9, lx + 10) if src[x, y][3] and skin(src[x, y])]
        if not hand: continue
        sgn = 1 if sum(x > lx for x, y in hand) > len(hand) / 2 else -1
        if d == 'south': sgn = 1 if lx > mx else -1
        cy = min(y for x, y in hand if (x - lx) * sgn >= 0) - (3 if d == 'south' else 4); x = lx + sgn
        slope = lambda x: cy + (2 - abs(x - lx) // 3 if d == 'south' else 0)   # 정면은 팔이 바깥으로 벌어져 있어 소매 끝이 사선(바깥쪽이 높음)
        while (x, slope(x)) in cloth: px[x, slope(x)] = CUFF; x += sgn
    knot = [t for t in tie if abs(t[0] - mx) <= 2] or list(tie)
    if d in ('south', 'south-east', 'south-west') and knot:        # 앞모습: 옷깃 두 장 + 앞단 + 단추
        kt = min(t[1] for t in knot)
        for sgn in (-1, 1):
            for dy, (o, i) in enumerate(((6, 1), (6, 1), (5, 2), (5, 2), (4, 3)), 1):
                for k in range(i, o + 1): put(mx + sgn * k, kt + dy, LINE if k in (i, o) and dy > 1 or dy == 5 else (255, 255, 255, 255))
        for y in range(ty1 + 1, top): put(mx, y, LINE if (y - ty1) % 4 == 3 else SEAM)
    elif knot:                                                      # 옆모습: 넥타이 뒤로 옷깃 한 장
        f = 1 if sum(t[0] for t in tie) / len(tie) > mx else -1; kt = min(t[1] for t in tie)
        bx = (min if f > 0 else max)(t[0] for t in tie) - f
        if all((bx - f * k, kt + 5 - k) in cloth for k in range(4)):  # 자리가 모자라면(선이 끊기면) 그리지 않음
            for k in range(4):
                put(bx - f * k, kt + 5 - k, LINE)
                for yy in range(kt, kt + 5 - k): put(bx - f * k, yy, (255, 255, 255, 255))
    for x, y in tie: px[x, y] = src[x, y]                           # 끈넥타이 원래 색
    if tie:
        tx0, tx1, ty0 = min(t[0] for t in tie), max(t[0] for t in tie), min(t[1] for t in tie)
        for y in range(ty0, ty1 + 1):
            for x in range(tx0, tx1 + 1):
                if (x, y) not in cloth and src[x, y][3] and sum(src[x, y][:3]) < 200: px[x, y] = src[x, y]
    im.save(f'blond_{d}.png')
ims = [Image.open(f'blond_{k}.png').convert('RGBA') for k in ['south', 'east', 'north', 'west']]
o = Image.new('RGBA', (512, 128), (200, 207, 216, 255))
for i, im in enumerate(ims): o.alpha_composite(im, (i * 128, 0))
o.resize((1536, 384), Image.NEAREST).save('blond_shirt2_sheet.png')
a = Image.open('blond_south.png').crop((36, 52, 92, 96)).resize((392, 308), Image.NEAREST); a.save('shirt2_zoom.png')
