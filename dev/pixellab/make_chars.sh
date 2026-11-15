#!/bin/bash
# 캐릭터 그림을 원본(PixelLab)에서 다시 만든다. dev/setup.sh 를 먼저 한 번 돌릴 것. 결과: chars/<이름>_<방향>.png
set -e; cd "$(dirname "$0")"
for n in bob long braid buzz shaggy; do python3 fit.py $n $n; done          # 1·2·3·7·5번: 원본 그대로 크기만 맞춤
python3 shirt2.py && python3 fit.py blond blond                               # 4번: 2번(long)을 금발 + 흰 셔츠로
python3 recolor_boy.py shaggy dandy2 && python3 compose_boy2.py && python3 fit.py dandy4 dandy   # 8번: 5번 몸·머리(금발) + 7번 얼굴
