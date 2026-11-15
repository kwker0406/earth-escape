#!/bin/bash
# 새 작업 환경 준비: 시험·도구가 찾는 dev/game 을 저장소 맨 위로 연결한다. (저장소를 받은 뒤 한 번만)
cd "$(dirname "$0")" && ln -sfn .. game && echo "준비 끝: 시험은 python3 dev/test/check.py"
