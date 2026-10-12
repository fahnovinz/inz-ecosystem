// Render video: node scripts/render.mjs <out.mp4> [scale=1] [from-to] [audio=1]
import {renderMedia} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {BROWSER, prepare} from './lib.mjs';

const [out = 'out/intro.mp4', scale = '1', range, audio = '1'] = process.argv.slice(2);
fs.mkdirSync(path.dirname(out), {recursive: true});
const {serveUrl, composition, inputProps} = await prepare({mode: 'full', audio: audio === '1'});
const frameRange = range ? range.split('-').map(Number) : undefined;
await renderMedia({
  serveUrl,
  composition,
  inputProps,
  codec: 'h264',
  audioCodec: 'aac',
  audioBitrate: '320k',
  crf: 16,
  pixelFormat: 'yuv420p',
  scale: Number(scale),
  frameRange,
  outputLocation: out,
  browserExecutable: BROWSER,
  concurrency: 4,
});
console.log(out);
