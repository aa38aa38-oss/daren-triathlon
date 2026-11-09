# 打架版美術：把 pic/001～012 切成一格一格的動作圖，打包成 art/brawl_atlas.png + brawl_atlas.json
# 角色圖：同一張表用同一個縮放比例（以站姿高度為準），錨點在腳底中央
# 用法：python tools/build_brawl_art.py
import json
import os
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from art_components import components  # noqa: E402
from build_art import key_out, trim, pack  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIC = os.path.join(ROOT, 'pic')
OUT = os.path.join(ROOT, 'art')

A16 = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'jump', 'jkick', 'fall', 'jab', 'cross', 'kick', 'hurt', 'flyback', 'lie', 'getup', 'dizzy']
A18 = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'jump', 'jkick', 'fall', 'jab', 'cross', 'kick', 'hurt', 'flyback', 'lie', 'getup', 'dizzy']
B12 = ['skA0', 'skA1', 'skB0', 'skB1', 'skC0', 'skC1', 'ready', 'swing', 'throw', 'roll', 'corpse', 'head']
# 肌肉阿伯的招式表多了一列（16 格），依照實際位置對應
MUSCLE_B = {0: 'skA0', 1: 'skA1', 2: 'skB0', 3: 'skB1', 4: 'skC0', 5: 'skCair', 9: 'skC1', 6: 'ready', 7: 'swing', 8: 'throw', 13: 'roll', 14: 'corpse', 15: 'head'}

CHAR_SHEETS = [
    ('muscle', '001.png', A16, 'idle0', None),
    ('muscle', '003.png', MUSCLE_B, 'ready', None),
    ('ninja', '002.png', A16, 'idle0', None),
    ('ninja', '004.png', B12, 'ready', None),
    ('butcher', '005.png', A16, 'idle0', (4, 4)),   # 這張排得太密，直接用 4x4 格子切
    ('butcher', '006.png', B12, 'ready', None),
    ('courier', '007.png', A18, 'idle0', None),
    ('courier', '008.png', B12, 'ready', None),
]
CHAR_H = 72  # 站姿在圖集裡的高度（遊戲裡會再縮小畫）

# 道具、特效、陷阱：(名稱, 目標寬, 目標高)
PROPS = {
    '009.png': [('fx_slashS', 48, 0), ('fx_slashB', 64, 0), ('fx_sparkY', 34, 0), ('fx_sparkR', 34, 0),
                ('fx_dust', 72, 0), ('fx_bombbox', 30, 0), ('fx_fire', 72, 0), ('fx_smoke', 64, 0),
                ('fx_bloodburst', 44, 0), ('fx_puddle', 44, 0), ('fx_stars', 40, 0), ('fx_splash', 40, 0)],
    '010.png': [('it_harpoon', 56, 0), ('it_surfboard', 52, 0), ('it_coconut', 18, 0), ('it_bottle', 0, 22),
                ('shark_fall', 0, 64), ('shark_flop', 78, 0), ('shark_bite', 78, 0), ('shark_fin', 34, 0),
                ('prop_tower', 0, 80), ('prop_umbrella', 0, 56), ('prop_sharksign', 0, 40), ('prop_crab', 30, 0)],
    '011.png': [('dozer0', 150, 0), ('dozer1', 150, 0), ('prop_barrier', 50, 0), ('prop_barrel', 0, 34),
                ('it_pitchfork', 56, 0), ('it_bat', 44, 0), ('it_tire', 30, 0), ('it_chainsaw', 52, 0)],
    '012.png': [('zombie0', 0, 72), ('zombie1', 0, 72), ('zombie_bite', 0, 72), ('zombie_dead', 80, 0),
                ('prop_lamp', 0, 84), ('prop_trash', 0, 38), ('prop_hydrant', 0, 32), ('prop_cone', 0, 28)],
}


def grid_boxes(im, cols, rows):
    W, H = im.size
    m = 12
    out = []
    for r in range(rows):
        for c in range(cols):
            x0 = m + (W - 2 * m) * c // cols; x1 = m + (W - 2 * m) * (c + 1) // cols
            y0 = m + (H - 2 * m) * r // rows; y1 = m + (H - 2 * m) * (r + 1) // rows
            out.append((x0, y0, x1, y1, 0))
    return out


def resize(img, k):
    w, h = img.size
    if k != 1:
        img = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    a = np.array(img)
    a[..., 3] = np.where(a[..., 3] >= 110, 255, 0)
    return Image.fromarray(a, 'RGBA')


def main():
    items, anchors = [], {}
    for who, fname, names, ref, grid in CHAR_SHEETS:
        im, boxes = components(os.path.join(PIC, fname))
        if grid:
            boxes = grid_boxes(im, *grid)
        pieces = {}
        seq = names.items() if isinstance(names, dict) else enumerate(names)
        for idx, name in seq:
            if idx >= len(boxes):
                print('  缺少', who, name)
                continue
            pieces[name] = trim(key_out(im.crop(tuple(int(v) for v in boxes[idx][:4]))))
        k = CHAR_H / pieces[ref].size[1]
        for name, p in pieces.items():
            img = resize(p, k)
            key = f'{who}_{name}'
            items.append((key, img))
            anchors[key] = [img.size[0] // 2, img.size[1]]
        print(fname, who, len(pieces), 'frames, scale', round(k, 3))
    for fname, specs in PROPS.items():
        im, boxes = components(os.path.join(PIC, fname))
        if len(boxes) != len(specs):
            print('  注意', fname, '切出', len(boxes), '塊，預期', len(specs))
        for (name, tw, th), b in zip(specs, boxes):
            p = trim(key_out(im.crop(tuple(int(v) for v in b[:4]))))
            w, h = p.size
            k = (tw / w) if tw else (th / h)
            img = resize(p, min(k, 1.0))
            items.append((name, img))
            anchors[name] = [img.size[0] // 2, img.size[1]]
        print(fname, len(specs), 'props')
    atlas, pos = pack(items)
    atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(OUT, 'brawl_atlas.png'), optimize=True)
    meta = {k: list(pos[k]) + anchors[k] for k in pos}
    with open(os.path.join(OUT, 'brawl_atlas.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f)
    print('atlas', atlas.size, len(meta), 'sprites', os.path.getsize(os.path.join(OUT, 'brawl_atlas.png')) // 1024, 'KB')


if __name__ == '__main__':
    main()
