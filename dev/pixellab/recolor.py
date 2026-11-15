# 2번(검은 긴 생머리) 그림 → 4번 금발 생머리(블레이저 없이 흰 셔츠). 머리 색은 밝기에 맞춰 금발 색으로, 치마 위 남색(블레이저)은 흰 셔츠 색으로
from PIL import Image
def lerp(ramp, t):
    t = max(0, min(1, t)) * (len(ramp) - 1); i = min(int(t), len(ramp) - 2); f = t - i
    return tuple(round(a + (b - a) * f) for a, b in zip(ramp[i], ramp[i + 1]))
GOLD = [(70, 40, 18), (128, 82, 32), (190, 135, 50), (228, 182, 82), (248, 222, 140), (255, 244, 200)]
SHIRT = [(120, 124, 140), (190, 195, 210), (226, 229, 237), (246, 247, 250), (255, 255, 255)]
SKIRT_TOP = {'south': 86, 'north': 84, 'south-east': 86, 'south-west': 86, 'north-east': 85, 'north-west': 85, 'east': 87, 'west': 87}
def hair(r, g, b, y): return y < 96 and r < 135 and g < 105 and b <= r + 8 and 6 <= r - g <= 40 and r - b <= 35 and r + g + b > 70
def navy(r, g, b): return b > r + 10 and b > g + 5
for d, top in SKIRT_TOP.items():
    im = Image.open(f'long_{d}.png').convert('RGBA'); px = im.load()
    for y in range(128):
        for x in range(128):
            r, g, b, a = px[x, y]
            if not a: continue
            L = (r + g + b) / 3
            if hair(r, g, b, y): px[x, y] = lerp(GOLD, (L - 25) / 90) + (a,)
            elif y < top and navy(r, g, b): px[x, y] = lerp(SHIRT, (L - 22) / 75) + (a,)
    src = Image.open(f'long_{d}.png').convert('RGBA').load(); fix = []          # 머리 속 검은 가닥선 → 진한 갈색(금발에 검은 줄이 튀지 않게)
    for y in range(1, 95):
        for x in range(1, 127):
            r, g, b, a = px[x, y]
            if a and r + g + b < 75 and sum(hair(*src[x + dx, y + dy][:3], y) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) >= 2: fix.append((x, y))
    for x, y in fix: px[x, y] = (88, 52, 20, 255)
    im.save(f'blond_{d}.png')
ims = [Image.open(f'blond_{d}.png') for d in ['south', 'east', 'north', 'west']]
o = Image.new('RGBA', (512, 128), (200, 207, 216, 255))
for i, im in enumerate(ims): o.alpha_composite(im, (i * 128, 0))
o.resize((1536, 384), Image.NEAREST).save('blond_sheet.png')
