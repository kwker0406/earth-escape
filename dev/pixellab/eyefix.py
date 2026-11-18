# 앞모습 눈 좌우 맞추기: 화면 오른쪽 눈을 거울처럼 뒤집어 왼쪽 눈 자리에 덮음(원본 왼쪽 눈동자가 1칸 더 큼). 결과: <이름>_eye_<방향>.png
# 사용: python3 eyefix.py <이름>   — 설정은 아래 FIX(오른쪽 눈 x 범위, y 범위, 거울 축 x*2, 뒤집은 뒤 고칠 칸)
import sys
from PIL import Image
FIX = {
    "braid": ((65, 76), (45, 55), 122, {(55, 48): None, (55, 49): None, (51, 48): "hi", (51, 49): "hi"}),  # 눈빛은 두 눈 모두 왼쪽 위라 뒤집은 뒤 제자리로
    "perm": ((64, 72), (49, 57), 123, {}),                                                               # 눈빛이 원래 바깥쪽끼리 대칭
}
n = sys.argv[1]; (x0, x1), (y0, y1), ax, fix = FIX[n]
for d in ["south", "north", "east", "west"]:
    im = Image.open(f"{n}_{d}.png").convert("RGBA")
    if d == "south":
        src = im.copy()
        for y in range(y0, y1):
            for x in range(x0, x1): im.putpixel((ax - x, y), src.getpixel((x, y)))
        for (x, y), v in fix.items(): im.putpixel((x, y), (250, 250, 250, 255) if v == "hi" else src.getpixel((69, 50)))  # None → 눈동자 색
    im.save(f"{n}_eye_{d}.png")
