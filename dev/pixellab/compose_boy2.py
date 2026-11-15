# 8번 다른 판: 몸은 5번 더벅머리(shaggy) 그대로, 머리(턱 위)는 compose_boy.py가 만든 dandy3(스포츠머리 얼굴 + 금발 더벅머리)를 얹음 = "더벅머리 금발에서 안경만 벗긴" 모습
from PIL import Image
from compose_boy import chin, body, skin  # 불러오면 dandy3_*.png를 다시 만듦
for d in ['south', 'east', 'north', 'west']:
    head = Image.open(f'dandy3_{d}.png').convert('RGBA'); base = Image.open(f'dandy2_{d}.png').convert('RGBA'); bp, hp = base.load(), head.load()  # base: 금발 더벅머리(안경 있음)
    if d == 'north': base.save(f'dandy4_{d}.png'); continue   # 뒷모습은 안경이 안 보임 → 그대로
    (hx, hy), (bx, cy) = chin(hp, head.getbbox()[1]), chin(bp, base.getbbox()[1])
    dx, dy = (round(body(base) - body(head)) if d == 'west' else round(bx - hx)), cy - hy
    for y in range(cy + 1):
        row = [x for x in range(128) if 0 <= x - dx < 128 and skin(hp[x - dx, y - dy])] if y > cy - 4 else None  # 턱 근처 줄은 얼굴 너비 안쪽만 바꿈(어깨·옷깃은 몸 쪽 것을 그대로)
        for x in range(128):
            if row is not None and not (row and min(row) - 1 <= x <= max(row) + 1): continue
            X, Y = x - dx, y - dy; bp[x, y] = hp[X, Y] if 0 <= X < 128 and 0 <= Y < 128 else (0, 0, 0, 0)
    print(d, dx, dy, cy); base.save(f'dandy4_{d}.png')
o = Image.new('RGBA', (512, 128), (200, 207, 216, 255))
for i, d in enumerate(['south', 'east', 'north', 'west']): o.alpha_composite(Image.open(f'dandy4_{d}.png'), (i * 128, 0))
o.resize((1536, 384), Image.NEAREST).save('dandy4_sheet.png')
