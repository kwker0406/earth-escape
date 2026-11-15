from PIL import Image
T={(251,252,255):'.',(228,233,245):'1',(200,209,230):'2',(168,180,210):'3',(100,112,150):'L',(176,187,214):'e',(255,255,255):'w'}
import sys
for d,(x0,x1) in {'south':(40,84),'east':(50,76),'west':(48,72)}.items():
    p=Image.open(f'blond_{d}.png').convert('RGBA').load(); print(d,'x0',x0)
    print('   '+''.join(str(x%10) for x in range(x0,x1)))
    for y in range(58,90):
        r=''
        for x in range(x0,x1):
            c=p[x,y]
            if not c[3]: r+=' '
            elif c[:3] in T: r+=T[c[:3]]
            elif c[0]>180 and c[0]>c[2]+30 and c[2]>120: r+='s'
            elif c[0]>c[1]+25 and c[0]>c[2]+15 and c[1]<90: r+='T'
            elif sum(c[:3])<150: r+='#'
            else: r+='h'
        print(y,r)
