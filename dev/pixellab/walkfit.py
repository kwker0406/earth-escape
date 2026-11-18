# PixelLab 걷기 프레임(128칸, 8장)을 서 있는 그림과 같은 배율·발 위치로 맞춰 한 줄 띠로 저장: chars/<이름>_walk_<방향>.png (프레임당 256×256, 2배)
# 사용: python3 walkfit.py <원본 접두어> <이름> <방향>   예) python3 walkfit.py buzz buzz south  (walk/<원본>_walk_<방향>_<0..7>.png 를 읽음)
# 서 있는 그림(fit.py)과 같은 계산: 4방향 원본의 바닥선 y1 과 배율 s 를 그대로 씀 → 걷다가 멈춰도 키·위치가 튀지 않음
import sys, pathlib
from PIL import Image
src, name, d = sys.argv[1:4]
HERE = pathlib.Path(__file__).resolve().parent
rot = [Image.open(HERE / f'{src}_{k}.png').convert('RGBA').getbbox() for k in ['south', 'north', 'east', 'west']]
y0, y1 = min(b[1] for b in rot), max(b[3] for b in rot); s = 111 / (y1 - y0); U = 2
frames = sorted((HERE / 'walk').glob(f'{src}_walk_{d}_*.png'), key=lambda p: int(p.stem.rsplit('_', 1)[1]))
assert frames, f'걷기 프레임 없음: walk/{src}_walk_{d}_*.png'
strip = Image.new('RGBA', (128 * U * len(frames), 128 * U), (0, 0, 0, 0))
for i, p in enumerate(frames):
    f = Image.open(p).convert('RGBA'); f = f.resize((128 * 8, 128 * 8), Image.NEAREST).convert('RGBa')
    f = f.resize((round(128 * s * U), round(128 * s * U)), Image.BOX).convert('RGBA')  # 칸을 고르게 키움(fit.py와 같은 방법)
    cell = Image.new('RGBA', (128 * U, 128 * U), (0, 0, 0, 0)); cell.alpha_composite(f, (round(64 * U - 64 * s * U), round(120 * U - y1 * s * U)))
    strip.alpha_composite(cell, (i * 128 * U, 0))
strip.save(HERE.parent / 'game' / 'chars' / f'{name}_walk_{d}.png', optimize=True)
print(name, d, len(frames), 'frames')
