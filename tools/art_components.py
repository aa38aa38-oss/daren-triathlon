# 把 Gemini 生的圖（洋紅色背景）自動切成一塊一塊，輸出編號預覽圖，方便對應每塊是什麼
# 方法：XY-cut，反覆用「整排都是背景」的空白帶把圖切開
# 用法：python tools/art_components.py pic/xxx.png out_preview.png
import sys
import numpy as np
from PIL import Image, ImageDraw


def fg_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    magenta = (r > 150) & (b > 150) & (g < 130) & (np.abs(r - b) < 100)
    fg = ~magenta
    m = 12  # 截圖邊緣的黑框（有些比較粗）
    fg[:m, :] = False; fg[-m:, :] = False; fg[:, :m] = False; fg[:, -m:] = False
    return fg


def runs(profile, min_gap, thresh):
    """回傳非空白區段 [(start, end), ...]"""
    segs, start, empty = [], None, 0
    for i, v in enumerate(profile):
        if v > thresh:
            if start is None:
                start = i
            empty = 0
        else:
            if start is not None:
                empty += 1
                if empty >= min_gap:
                    segs.append((start, i - empty + 1)); start = None; empty = 0
    if start is not None:
        segs.append((start, len(profile)))
    return segs


def xycut(fg, x0, y0, x1, y1, depth=0, min_gap=3, out=None):
    out = [] if out is None else out
    sub = fg[y0:y1, x0:x1]
    if sub.sum() < 80:
        return out
    # 收緊邊界
    ys = np.where(sub.any(axis=1))[0]; xs = np.where(sub.any(axis=0))[0]
    y0, y1 = y0 + ys[0], y0 + ys[-1] + 1
    x0, x1 = x0 + xs[0], x0 + xs[-1] + 1
    sub = fg[y0:y1, x0:x1]
    order = ['h', 'v'] if depth % 2 == 0 else ['v', 'h']
    for d in order:
        prof = sub.sum(axis=1) if d == 'h' else sub.sum(axis=0)
        segs = runs(prof, min_gap, 1)
        if len(segs) > 1:
            for s, e in segs:
                if d == 'h':
                    xycut(fg, x0, y0 + s, x1, y0 + e, depth + 1, min_gap, out)
                else:
                    xycut(fg, x0 + s, y0, x0 + e, y1, depth + 1, min_gap, out)
            return out
    out.append((x0, y0, x1, y1, int(sub.sum())))
    return out


def components(path, min_gap=3, min_area=150):
    im = Image.open(path).convert('RGB')
    fg = fg_mask(np.array(im))
    H, W = fg.shape
    boxes = [b for b in xycut(fg, 0, 0, W, H, 0, min_gap) if b[4] >= min_area]
    boxes = merge_small(boxes)
    boxes = sort_rows(boxes)
    return im, boxes


def merge_small(boxes, frac=0.22):
    """小碎片（星星、灰塵、手裏劍）併到最近的大塊"""
    if len(boxes) < 3:
        return boxes
    areas = sorted(b[4] for b in boxes)
    med = areas[len(areas) // 2]
    big = [list(b) for b in boxes if b[4] >= med * frac]
    for b in boxes:
        if b[4] >= med * frac:
            continue
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        tgt = min(big, key=lambda B: max(0, B[0] - cx, cx - B[2]) + max(0, B[1] - cy, cy - B[3]))
        tgt[0] = min(tgt[0], b[0]); tgt[1] = min(tgt[1], b[1]); tgt[2] = max(tgt[2], b[2]); tgt[3] = max(tgt[3], b[3]); tgt[4] += b[4]
    return [tuple(b) for b in big]


def sort_rows(boxes):
    """依照「列」排序：中心高度相近的算同一列，列內由左到右"""
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        if cur and cy - (cur[0][1] + cur[0][3]) / 2 > max(25, (cur[0][3] - cur[0][1]) * 0.5):
            rows.append(cur); cur = []
        cur.append(b)
    if cur:
        rows.append(cur)
    out = []
    for r in rows:
        out += sorted(r, key=lambda b: b[0])
    return out


if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    gap = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    im, boxes = components(src, gap)
    d = ImageDraw.Draw(im)
    for i, (x0, y0, x1, y1, area) in enumerate(boxes):
        d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(0, 255, 0), width=1)
        d.rectangle([x0, y0, x0 + 20, y0 + 12], fill=(0, 0, 0))
        d.text((x0 + 3, y0 + 1), str(i), fill=(255, 255, 0))
    im.save(out)
    for i, b in enumerate(boxes):
        print(i, b)
