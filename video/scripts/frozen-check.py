"""Approved style frames stay frozen: the current render of each must match its approved PNG.

usage: python3 -I scripts/frozen-check.py <dir with full-NNNN.png>
"""
import sys
import numpy as np
from PIL import Image

FROZEN = [(60, 'sf1-beat1'), (200, 'sf2-beat2'), (300, 'sf3-beat3'), (500, 'sf4-beat4'), (880, 'sf5-beat6')]
fails = 0
for f, name in FROZEN:
    a = np.array(Image.open(f'{sys.argv[1]}/full-{f:04d}.png').convert('RGB')).astype(int)
    b = np.array(Image.open(f'../design/style-frames/{name}.png').convert('RGB')).astype(int)
    diff = int((np.abs(a - b).max(axis=2) > 8).sum())
    fails += diff > 0
    print(f'{name}: {"identical" if diff == 0 else f"{diff} px differ"}')
print('FAIL' if fails else 'PASS', fails)
sys.exit(1 if fails else 0)
