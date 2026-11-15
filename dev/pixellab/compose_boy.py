# 8번 금발 남학생: 얼굴·몸은 7번(스포츠머리, 금발로 바꾼 dandy_*.png), 머리 모양은 5번 더벅머리(shaggy)의 금발판을 얹음
# 왼쪽 보는 모습은 더벅머리 원본이 얼굴을 다 가려서, 오른쪽 보는 머리를 뒤집어 씀
from PIL import Image, ImageOps
from recolor_lib import lerp, GOLD
from recolor_boy import hairish  # 주의: recolor_boy를 불러오면 그 스크립트가 한 번 돌아 dandy_*.png(금발 스포츠머리)를 다시 만듦
skin = lambda c: c[3] and c[0] > 180 and c[0] > c[2] + 30 and c[2] > 110
def chin(px, top):  # 턱 근처 살색의 (가운데 x, 맨 아래 y)
    pts = [(x, y) for y in range(top, top + 48) for x in range(128) if skin(px[x, y])]
    by = max(y for x, y in pts); xs = [x for x, y in pts if by - 6 <= y <= by - 1]
    return sum(xs) / len(xs), by
def body(im):  # 몸통 가운데 x
    xs = [x for y in range(66, 82) for x in range(128) if im.getpixel((x, y))[3]]; return sum(xs) / len(xs)
for d in ['south', 'east', 'north', 'west']:
    base = Image.open(f'dandy_{d}.png').convert('RGBA'); bp = base.load()
    hair = Image.open(f"shaggy_{'east' if d == 'west' else d}.png").convert('RGBA')
    if d == 'west': hair = ImageOps.mirror(hair)
    hp = hair.load(); top = hair.getbbox()[1]
    seen = set(); todo = [(x, y) for y in range(top, top + 6) for x in range(128) if hairish(hp[x, y])]
    while todo:
        x, y = todo.pop()
        if (x, y) in seen or not (0 <= x < 128) or not hairish(hp[x, y]) or y > top + (44 if d == 'north' else 36): continue
        seen.add((x, y)); todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    while True:  # 안경테(한 칸 굵기의 고리)는 머리칼이 아님: 눈높이 아래에서 이웃이 2칸 이하인 가는 선을 벗겨 냄
        thin = {(x, y) for x, y in seen if y > top + 22 and sum((x + i, y + j) in seen for i in (-1, 0, 1) for j in (-1, 0, 1)) <= 3}
        if not thin: break
        seen -= thin
    edge = {(x + dx, y + dy) for x, y in seen for dx in (-1, 0, 1) for dy in (-1, 0, 1)} - seen
    edge = {p for p in edge if 0 <= p[0] < 128 and hp[p][3] and sum(hp[p][:3]) < 110}       # 머리 윤곽선(어두운 칸)
    edge = {(x, y) for x, y in edge if y <= top + 22 or sum((x + i, y + j) in seen for i in (-1, 0, 1) for j in (-1, 0, 1)) >= 3}  # 눈높이 아래는 머리칼에 바짝 붙은 선만(안경테 찌꺼기 제외)
    if d == 'north': dx, dy = round(body(base) - body(hair)), 0
    else:
        (bx, by), (hx, hy) = chin(bp, base.getbbox()[1]), chin(hp, top); dx, dy = round(bx - hx), by - hy
    for x, y in seen | edge:
        X, Y = x + dx, y + dy
        if 0 <= X < 128 and 0 <= Y < 128: bp[X, Y] = (lerp(GOLD, (sum(hp[x, y][:3]) / 3 - 18) / 62) + (255,)) if (x, y) in seen else hp[x, y]
    print(d, 'dx dy', dx, dy, 'hair', len(seen)); base.save(f'dandy3_{d}.png')
o = Image.new('RGBA', (512, 128), (200, 207, 216, 255))
for i, d in enumerate(['south', 'east', 'north', 'west']): o.alpha_composite(Image.open(f'dandy3_{d}.png'), (i * 128, 0))
o.resize((1536, 384), Image.NEAREST).save('dandy3_sheet.png')
