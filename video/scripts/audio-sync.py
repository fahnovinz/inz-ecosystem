"""sync check: every key visual hit has a music onset within 2 frames.

usage: python3 -I scripts/audio-sync.py <audio-or-mp4> <frame>[,<frame>...]
Onset strength = rise in log energy over 5 ms hops; a hit passes when the strongest onset within
±0.5 beat sits within ±2 frames (±66.7 ms) of the hit.
"""
import subprocess
import sys
import numpy as np

src, frames = sys.argv[1], [int(f) for f in sys.argv[2].split(',')]
SR, FPS, HOP = 48000, 30, 240  # 5 ms
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
n = len(x) // HOP
e = np.log10(np.square(x[:n * HOP].reshape(n, HOP)).mean(axis=1) + 1e-9)
onset = np.maximum(0, np.diff(e, prepend=e[0]))
fails = 0
for f in frames:
    t = f / FPS
    lo, hi = int((t - 0.25) * SR / HOP), int((t + 0.25) * SR / HOP)
    k = lo + int(np.argmax(onset[lo:hi]))
    err = (k * HOP / SR - t) * FPS
    ok = abs(err) <= 2
    fails += not ok
    print(f'frame {f:4d}  nearest onset {err:+.2f} frames  {"ok" if ok else "OFF"}')
print('FAIL' if fails else 'PASS', fails)
sys.exit(1 if fails else 0)
