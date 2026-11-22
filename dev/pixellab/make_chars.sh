#!/bin/bash
# 캐릭터 그림을 원본(PixelLab)에서 다시 만든다. dev/setup.sh 를 먼저 한 번 돌릴 것. 결과: chars/<이름>_<방향>.png
set -e; cd "$(dirname "$0")"
for n in bob long buzz; do python3 fit.py $n $n; done                     # 1·2·7번: 원본 그대로 크기만 맞춤
for n in braid perm; do python3 eyefix.py $n && python3 fit.py ${n}_eye $n; done   # 3·6번: 앞모습 두 눈 크기를 맞춘 뒤
python3 -c "                                                                  # 5번: 안경 렌즈 때문에 눈빛이 없음 → 앞모습 두 눈에 흰 눈빛 2칸씩
from PIL import Image
for d in ['south', 'north', 'east', 'west']:
    im = Image.open(f'shaggy_{d}.png').convert('RGBA')
    if d == 'south':
        for x, y in [(54, 48), (54, 49), (65, 48), (65, 49)]: im.putpixel((x, y), (250, 250, 252, 255))
    im.save(f'shaggy_lit_{d}.png')" && python3 fit.py shaggy_lit shaggy          # 1·2·3·7·5·6번: 원본 그대로 크기만 맞춤
python3 shirt2.py && python3 fit.py blond blond                               # 4번: 2번(long)을 금발 + 흰 셔츠로
python3 recolor_boy.py shaggy dandy2 && python3 compose_boy2.py && python3 fit.py dandy4 dandy   # 8번: 5번 몸·머리(금발) + 7번 얼굴
# 걷기 8장(PixelLab V3 Walking, 방향당 2~3회): walk/<원본>_walk_<방향>_<0..7>.png → chars/<이름>_walk_<방향>.png. sprites.js CHARS에 walk: "dur" 처럼 방향을 적음(왼쪽은 오른쪽을 뒤집음)
for n in buzz shaggy perm bob; do for d in south east north; do python3 walkfit.py $n $n $d; done; done
