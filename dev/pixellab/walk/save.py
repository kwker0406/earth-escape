# 브라우저에서 받은 걷기 프레임(data URL JSON 결과 파일)을 walk/<이름>_walk_<방향>_<n>.png로 저장. 사용: python3 walk/save.py <결과파일> <이름> <방향>
import json, base64, sys, pathlib
raw = json.load(open(sys.argv[1])); o = json.loads(json.JSONDecoder().raw_decode(raw[0]['text'])[0]); o.pop('pad', None)
for k, v in o.items(): (pathlib.Path(__file__).parent / f'{sys.argv[2]}_walk_{sys.argv[3]}_{k}.png').write_bytes(base64.b64decode(v.split(',')[1]))
print(len(o), 'frames')
