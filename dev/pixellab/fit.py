import pathlib
# PixelLab 128 그림을 다른 학생과 같은 키(111칸)·발 위치(120)로 맞춰 game/chars/<이름>_<방향>.png 로 저장. 사용: python3 fit.py <원본 접두어> <이름>
import sys
from PIL import Image
src, name = sys.argv[1], sys.argv[2]
ds = ['south', 'north', 'east', 'west']
ims = {d: Image.open(f'{src}_{d}.png').convert('RGBA') for d in ds}
bb = [ims[d].getbbox() for d in ds]; x0 = min(b[0] for b in bb); y0 = min(b[1] for b in bb); x1 = max(b[2] for b in bb); y1 = max(b[3] for b in bb)
s = 111 / (y1 - y0)
for d in ds:
    c = ims[d].crop((x0, y0, x1, y1)); c = c.resize((round(c.width * s), round(c.height * s)), Image.NEAREST)
    o = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); o.alpha_composite(c, (max(0, 64 - round((64 - x0) * s)), 120 - c.height))
    o.save(pathlib.Path(__file__).resolve().parent.parent / 'game' / 'chars' / f'{name}_{d}.png')  # dev/game = 저장소 맨 위(setup.sh가 연결)
print(name, 'scale', round(s, 3))
