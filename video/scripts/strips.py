"""Contact strip per cut: python3 -I scripts/strips.py <dir> <out> <name>:<f,f,...> ..."""
import sys
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 18)
except OSError:
    font = ImageFont.load_default()
for spec in sys.argv[3:]:
    name, fs = spec.split(':')
    frames = [int(f) for f in fs.split(',')]
    ims = [Image.open(f'{d}/full-{f:04d}.png').convert('RGB') for f in frames]
    w, h = ims[0].size
    sheet = Image.new('RGB', (w, (h + 30) * len(ims)), (20, 22, 26))
    dr = ImageDraw.Draw(sheet)
    for i, (f, im) in enumerate(zip(frames, ims)):
        y = i * (h + 30)
        dr.text((8, y + 6), f'frame {f}  ({f/30:.2f} s)', fill=(160, 170, 180), font=font)
        sheet.paste(im, (0, y + 30))
    sheet.save(f'{out}/{name}.png')
    print(f'{out}/{name}.png')
