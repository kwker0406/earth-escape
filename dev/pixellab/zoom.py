from PIL import Image
o=Image.new('RGBA',(4*56,44),(200,207,216,255))
for i,d in enumerate(['south','east','north','west']): o.alpha_composite(Image.open(f'blond_{d}.png').convert('RGBA').crop((36,52,92,96)),(i*56,0))
o.resize((4*56*7,44*7),Image.NEAREST).save('shirt2_zoom.png')
