# PixelLab 원본이 없는 캐릭터(4·8번)의 걷기 8장: 확정된 서 있는 그림의 윗몸 + 바탕 캐릭터 걷기 프레임의 다리
# 사용: python3 walkpaste.py <서 있는 그림 접두어> <바탕 원본 접두어> <걷기 이름> <방향> <자르는 줄>
#   예) python3 walkpaste.py blond long blond south 92  → walk/blond_walk_south_<0..7>.png
# 바탕 원본(long_<방향>.png)을 걷기 프레임에 맞춰 보며 위치(dx, dy)를 찾고, 그 자리에 서 있는 그림의 윗몸(자르는 줄 위)을 얹음
#   → 얼굴·옷 크기가 모든 장에서 같고, 걸을 때 몸이 오르내리는 것은 그대로 따라감. 팔은 흔들지 않음(서 있는 팔 그대로)
import sys, pathlib
from PIL import Image, ImageChops
top, base, name, d, cut = sys.argv[1:6]; cut = int(cut)
HERE = pathlib.Path(__file__).resolve().parent
S = Image.open(HERE / f'{top}_{d}.png').convert('RGBA'); B = Image.open(HERE / f'{base}_{d}.png').convert('RGBA')
def fit(W):
    best = None
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            sh = Image.new('RGBA', B.size); sh.alpha_composite(B, (dx, dy))
            box = (0, 0, 128, cut + dy)
            diff = sum(ImageChops.difference(sh.crop(box), W.crop(box)).convert('L').get_flattened_data())
            if best is None or diff < best[0]: best = (diff, dx, dy)
    return best[1:]
for i in range(8):
    W = Image.open(HERE / 'walk' / f'{base}_walk_{d}_{i}.png').convert('RGBA')
    dx, dy = fit(W)
    out = Image.new('RGBA', W.size); out.paste(W.crop((0, cut + dy, 128, 128)), (0, cut + dy))  # 아래: 걷는 다리
    px = out.load(); seen = set()                                                                # 흔드는 손끝처럼 떨어진 작은 조각(30칸 미만)은 지움
    for p0 in [(x, y) for y in range(128) for x in range(128) if px[x, y][3]]:
        if p0 in seen: continue
        comp, todo = [], [p0]; seen.add(p0)
        while todo:
            x, y = todo.pop(); comp.append((x, y))
            for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= q[0] < 128 and 0 <= q[1] < 128 and q not in seen and px[q][3]: seen.add(q); todo.append(q)
        if len(comp) < 30:
            for q in comp: px[q] = (0, 0, 0, 0)
    up = Image.new('RGBA', S.size); up.paste(S.crop((0, 0, 128, cut)), (0, 0))
    out.alpha_composite(up, (dx, dy))                                                            # 위: 서 있는 그림의 윗몸
    out.save(HERE / 'walk' / f'{name}_walk_{d}_{i}.png'); print(d, i, dx, dy)
