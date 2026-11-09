# 把 pic/ 裡 Gemini 生的圖整理成遊戲用的圖集：
#   去掉洋紅色背景 → 修邊 → 裁切 → 縮到需要的大小 → 打包成 art/atlas.png + art/atlas.json
#   遠景與 Logo 另外存成 art/pano_*.png、art/logo.png
# 用法：python tools/build_art.py
# 之後如果換了新圖，只要改下面的 SHEETS / PICK 對應表再跑一次
import json
import os
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from art_components import components  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIC = os.path.join(ROOT, 'pic')
OUT = os.path.join(ROOT, 'art')
OUTLINE = (26, 16, 40)

SHEETS = {
    'bikeSide': 'Snipaste_2026-11-09_12-33-50.png',   # 4x4：每列一個角色，第 4 欄是摔車慘死
    'wallsA': 'Snipaste_2026-11-09_12-36-54.png',     # 4x2：海嘯、推土機（正面）、殭屍、電網
    'muscle': 'Snipaste_2026-11-09_12-37-14.png',     # 肌肉阿伯完整背影 12 格
    'wallsB': 'Snipaste_2026-11-09_12-37-58.png',     # 4x2：第二版死亡之牆
    'icons': 'Snipaste_2026-11-09_12-39-31.png',      # 6x5 圖示
    'pano': 'Snipaste_2026-11-09_12-40-13.png',       # 4 條遠景
    'logo': 'Snipaste_2026-11-09_12-40-42.png',
    'contact': 'Snipaste_2026-11-09_12-41-32.png',    # 總表
}

CHARS = ['muscle', 'ninja', 'butcher', 'courier']
ICON_NAMES = [
    'axe', 'oil', 'spikes', 'adren', 'fireball',
    'chain', 'freeze', 'gas', 'darts', 'missile',
    'laser', 'drone', 'storm', 'blizzard', 'acid',
    'sk_headbutt', 'sk_dumbbell', 'sk_bull', 'sk_dashslash', 'sk_shuriken',
    'sk_smoke', 'sk_cleaver', 'sk_hook', 'sk_spin', 'sk_box',
    'sk_soup', 'sk_nitro', 'bounty', 'crown', 'qbox',
]

# (名稱, 圖表, 第幾塊 或 (x0,y0,x1,y1), 目標高度, 目標寬度)
PICK = []
def cell(col, row, W=837, H=468, cols=4, rows=4):
    """整齊表格：直接用固定格子切（上下排太近時自動切法會黏在一起）"""
    return (round(W * col / cols) + 2, round(H * row / rows) + 2, round(W * (col + 1) / cols) - 2, round(H * (row + 1) / rows) - 2)


for i, c in enumerate(CHARS):
    PICK.append((f'{c}_corpse', 'bikeSide', cell(3, i), None, 110))
    PICK.append((f'{c}_atk', 'bikeSide', cell(2, i), 96, None))
for i, c in enumerate(CHARS):
    PICK.append((f'{c}_bike0', 'contact', 7 + i, 96, None))
    PICK.append((f'{c}_run0', 'contact', 22 + i, 96, None))
    PICK.append((f'{c}_portrait', 'contact', 11 + i, 96, None))
for k, n in enumerate(['swim0', 'swim1', 'swim2', 'bike0', 'bike1', 'bikeL', 'run0', 'run1', 'runL', 'portrait', 'corpse2', 'head']):
    PICK.append((f'muscle_{n}' if n not in ('bike0', 'portrait') else f'muscle_{n}_hd', 'muscle', k, 96 if n not in ('portrait',) else 110, None))
PICK += [
    ('wall_tsunami0', 'wallsB', 0, None, 320), ('wall_tsunami1', 'wallsB', 1, None, 320),
    ('wall_grinder0', 'wallsA', 2, None, 300), ('wall_grinder1', 'wallsA', 3, None, 300),
    ('wall_zombies0', 'wallsA', 4, None, 320), ('wall_zombies1', 'wallsA', 5, None, 320),
    ('wall_fence0', 'wallsA', 6, None, 300), ('wall_fence1', 'wallsA', 7, None, 300),
    ('fx_boom', 'contact', 62, 96, None), ('fx_ice', 'contact', 57, 96, None),
    ('fx_gas', 'contact', 63, 96, None), ('fx_fireball', 'contact', 58, 72, None),
    ('prop_beach', 'contact', (22, 355, 137, 449), 110, None),
    ('prop_pine', 'contact', (139, 355, 199, 449), 110, None),
    ('prop_farm', 'contact', (200, 355, 290, 449), 90, None),
    ('prop_lamp', 'contact', (293, 357, 375, 449), 110, None),
    ('prop_hydrant', 'contact', (377, 357, 399, 449), 50, None),
    ('prop_cone', 'contact', (401, 357, 427, 449), 40, None),
]
for i, n in enumerate(ICON_NAMES):
    PICK.append((f'icon_{n}', 'icons', i, 48, None))


def key_out(img):
    """去掉洋紅色背景，邊緣半透明的洋紅改成深色描邊"""
    a = np.array(img.convert('RGBA')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g
    bg = (m > 60) & (r > 120) & (b > 120)
    fringe = (m > 22) & ~bg & (r > 90) & (b > 90)
    a[..., 3] = np.where(bg, 0, 255)
    for ch, v in enumerate(OUTLINE):
        a[..., ch] = np.where(fringe, v, a[..., ch])
        a[..., ch] = np.where(bg, v, a[..., ch])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def trim(img):
    a = np.array(img)
    ys, xs = np.where(a[..., 3] > 0)
    if len(xs) == 0:
        return img
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def shrink(img, th=None, tw=None):
    w, h = img.size
    k = min((th / h) if th else 9, (tw / w) if tw else 9, 1.0)
    if k < 1:
        img = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    a = np.array(img)
    a[..., 3] = np.where(a[..., 3] >= 110, 255, 0)
    return Image.fromarray(a, 'RGBA')


def pack(items, width=1024, pad=2):
    items = sorted(items, key=lambda kv: -kv[1].size[1])
    x = y = rowh = 0
    pos = {}
    for name, im in items:
        w, h = im.size
        if x + w + pad > width:
            x = 0; y += rowh + pad; rowh = 0
        pos[name] = (x, y, w, h)
        x += w + pad
        rowh = max(rowh, h)
    H = y + rowh
    atlas = Image.new('RGBA', (width, H), (0, 0, 0, 0))
    for name, im in items:
        x, y, w, h = pos[name]
        atlas.paste(im, (x, y))
    return atlas, pos


def main():
    os.makedirs(OUT, exist_ok=True)
    cache = {}

    def sheet(key):
        if key not in cache:
            im, boxes = components(os.path.join(PIC, SHEETS[key]))
            cache[key] = (im, boxes)
        return cache[key]

    items = []
    for name, key, which, th, tw in PICK:
        im, boxes = sheet(key)
        box = which if isinstance(which, tuple) else boxes[which][:4]
        piece = trim(key_out(im.crop(tuple(int(v) for v in box))))
        items.append((name, shrink(piece, th, tw)))

    # 總表裡的游泳那一排：先切掉標題字，再依空白欄切成 4 個
    im, boxes = sheet('contact')
    band = key_out(im.crop((16, 172, 405, 228)))
    a = np.array(band)[..., 3] > 0
    prof = a.sum(axis=0)
    segs, s = [], None
    for i, v in enumerate(prof):
        if v > 2 and s is None:
            s = i
        if v <= 2 and s is not None:
            if i - s > 12:
                segs.append((s, i))
            s = None
    if s is not None:
        segs.append((s, len(prof)))
    for c, (x0, x1) in zip(CHARS, segs):
        items.append((f'{c}_swimSide', shrink(trim(band.crop((x0, 0, x1, band.size[1]))), None, 110)))

    atlas, pos = pack(items)
    # 壓成 256 色，手機載入比較快（像素圖看不出差別）
    atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(OUT, 'atlas.png'), optimize=True)
    with open(os.path.join(OUT, 'atlas.json'), 'w', encoding='utf-8') as f:
        json.dump(pos, f, ensure_ascii=False, indent=0)

    # 遠景（不去背，只裁掉洋紅色邊）與 Logo
    im, boxes = sheet('pano')
    for n, b in zip(['swim', 'bike', 'run', 'arena'], boxes):
        x0, y0, x1, y1 = b[:4]
        p = im.crop((x0 + 2, y0 + 2, x1 - 2, y1 - 2)).convert('RGB')
        k = 128 / p.size[1]
        p = p.resize((round(p.size[0] * k), 128), Image.LANCZOS)
        p.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(OUT, f'pano_{n}.png'), optimize=True)
    im, boxes = sheet('logo')
    logo = trim(key_out(im.crop(tuple(int(v) for v in boxes[0][:4]))))
    shrink(logo, None, 480).save(os.path.join(OUT, 'logo.png'), optimize=True)

    print('atlas', atlas.size, len(pos), 'sprites;', os.path.getsize(os.path.join(OUT, 'atlas.png')) // 1024, 'KB')
    for n in sorted(pos):
        print(' ', n, pos[n][2:])


if __name__ == '__main__':
    main()
