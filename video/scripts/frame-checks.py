"""Pixel checks on rendered masks.

usage: python3 -I scripts/frame-checks.py <dir> <frame>[,<frame>...]
Expects <dir>/text-NNNN.png and <dir>/shapes-NNNN.png (from stills.mjs in 'text' / 'shapes' mode).
- text_safe_area: every text pixel inside title-safe (5 %).
- shapes in action-safe (3.5 %).
- no_collisions: no pixel is both text and shape (after a 2 px dilation of shapes).
- text_contrast: conservative WCAG ratio between the darkest text colour (>=40 solid px) and the
  brightest 5 % of the ring just around the text, measured in <dir>/full-NNNN.png. Needs >= 4.5.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

d, frames = sys.argv[1], [int(f) for f in sys.argv[2].split(',')]
W, H = 1920, 1080
TS = (int(W * .05), int(H * .05), W - int(W * .05), H - int(H * .05))
AS = (int(W * .035), int(H * .035), W - int(W * .035), H - int(H * .035))
fails = 0

def lum(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]

def contrast(f):
    m = load('text', f)
    core = np.array(m.filter(ImageFilter.MinFilter(3))) > 250
    ring = (np.array(m.filter(ImageFilter.MaxFilter(11))) > 0) & ~(np.array(m.filter(ImageFilter.MaxFilter(5))) > 0)
    if core.sum() == 0:
        return None
    full = np.array(Image.open(f'{d}/full-{f:04d}.png').convert('RGB')).astype(float)
    L = lum(full)
    # darkest text colour used by at least 150 solid pixels (so each text style counts, however small)
    bins = np.round(L[core] * 200).astype(int)
    vals, counts = np.unique(bins, return_counts=True)
    lt = vals[counts >= 40].min() / 200 if (counts >= 40).any() else np.percentile(L[core], 2)
    lb = np.percentile(L[ring], 95)
    return (max(lt, lb) + 0.05) / (min(lt, lb) + 0.05)

def load(kind, f):
    im = Image.open(f'{d}/{kind}-{f:04d}.png').convert('L')
    return im

def bbox(a):
    ys, xs = np.nonzero(a)
    return None if len(xs) == 0 else (xs.min(), ys.min(), xs.max(), ys.max())

def inside(b, r):
    return b is None or (b[0] >= r[0] and b[1] >= r[1] and b[2] < r[2] and b[3] < r[3])

for f in frames:
    t = np.array(load('text', f)) > 24
    sim = load('shapes', f).filter(ImageFilter.MaxFilter(5))
    s = np.array(sim) > 24
    tb, sb = tuple(map(int, bbox(t) or ())) or None, bbox(np.array(load('shapes', f)) > 24)
    hit = int((t & s).sum())
    ok_t, ok_s, ok_c = inside(tb, TS), inside(sb, AS), hit == 0
    cr = contrast(f)
    ok_k = cr is None or cr >= 4.5
    fails += (not ok_t) + (not ok_s) + (not ok_c) + (not ok_k)
    print(f'frame {f:4d}  text bbox {tb} {"ok" if ok_t else "OUTSIDE title-safe"}  '
          f'shape bbox {sb} {"ok" if ok_s else "OUTSIDE action-safe"}  '
          f'collision px {hit} {"ok" if ok_c else "COLLIDES"}  '
          f'contrast {"-" if cr is None else round(cr, 2)} {"ok" if ok_k else "LOW"}')
print('FAIL' if fails else 'PASS', fails)
sys.exit(1 if fails else 0)
