# 7번(검은 짧은 머리 남학생) 그림 → 8번 금발. 머리만 금발 색으로 바꿈(머리 꼭대기에서 이어진 회색 머리칼만 골라 눈·눈썹은 그대로)
from PIL import Image
import sys
from recolor_lib import lerp, GOLD
SRC, OUT = (sys.argv + ["buzz", "dandy"])[1:3]  # 원본 이름, 결과 이름
def hairish(c): r, g, b, a = c; return a and -10 <= b - r <= 16 and 0 <= r - g <= 14 and 19 <= (r + g + b) / 3 <= 100
for d in ['south', 'east', 'north', 'west']:
    im = Image.open(f'{SRC}_{d}.png').convert('RGBA'); px = im.load(); top = im.getbbox()[1]
    seen = set(); todo = [(x, y) for y in range(top, top + 6) for x in range(128) if hairish(px[x, y])]
    while todo:
        x, y = todo.pop()
        if (x, y) in seen or not hairish(px[x, y]) or y > top + (44 if d == 'north' else 34): continue
        seen.add((x, y)); todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    assert len(seen) > 300, (d, len(seen))
    for x, y in seen: px[x, y] = lerp(GOLD, (sum(px[x, y][:3]) / 3 - 18) / 62) + (255,)
    im.save(f'{OUT}_{d}.png')
o = Image.new('RGBA', (512, 128), (200, 207, 216, 255))
for i, d in enumerate(['south', 'east', 'north', 'west']): o.alpha_composite(Image.open(f'{OUT}_{d}.png'), (i * 128, 0))
o.resize((1536, 384), Image.NEAREST).save(f'{OUT}_sheet.png')
