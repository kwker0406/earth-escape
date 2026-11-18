import pathlib
# PixelLab 128 그림을 다른 학생과 같은 키(111칸)·발 위치(120)로 맞춰 game/chars/<이름>_<방향>.png(512×512, 128칸 기준 4배)로 저장. 사용: python3 fit.py <원본 접두어> <이름>
import sys
from PIL import Image
src, name = sys.argv[1], sys.argv[2]
ds = ['south', 'north', 'east', 'west']
ims = {d: Image.open(f'{src}_{d}.png').convert('RGBA') for d in ds}
bb = [ims[d].getbbox() for d in ds]; x0 = min(b[0] for b in bb); y0 = min(b[1] for b in bb); x1 = max(b[2] for b in bb); y1 = max(b[3] for b in bb)
s = 111 / (y1 - y0)
U = 4  # 4배 크기로 저장(512×512). 1.25배 같은 어중간한 확대를 칸 단위로 하면 눈동자·눈빛 같은 1칸짜리가 사라지거나 두꺼워짐 → 8배로 키운 뒤 면적 평균으로 줄여 모든 칸이 고르게 커지게
for d in ds:
    c = ims[d].crop((x0, y0, x1, y1)); c = c.resize((c.width * 8, c.height * 8), Image.NEAREST).convert('RGBa')
    c = c.resize((round(c.width / 8 * s * U), round(c.height / 8 * s * U)), Image.BOX).convert('RGBA')
    o = Image.new('RGBA', (128 * U, 128 * U), (0, 0, 0, 0)); o.alpha_composite(c, (max(0, round((64 - (64 - x0) * s) * U)), 120 * U - c.height))
    o.save(pathlib.Path(__file__).resolve().parent.parent / 'game' / 'chars' / f'{name}_{d}.png', optimize=True)  # dev/game = 저장소 맨 위(setup.sh가 연결)
print(name, 'scale', round(s, 3))
