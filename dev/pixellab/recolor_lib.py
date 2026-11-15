def lerp(ramp, t):
    t = max(0, min(1, t)) * (len(ramp) - 1); i = min(int(t), len(ramp) - 2); f = t - i
    return tuple(round(a + (b - a) * f) for a, b in zip(ramp[i], ramp[i + 1]))
GOLD = [(70, 40, 18), (128, 82, 32), (190, 135, 50), (228, 182, 82), (248, 222, 140), (255, 244, 200)]
