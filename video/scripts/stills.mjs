// Render stills: node scripts/stills.mjs <outDir> <mode> <frame>[,<frame>...] [scale]
import {renderStill} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {BROWSER, prepare} from './lib.mjs';

const [outDir = 'out/stills', mode = 'full', frameList = '0', scale = '1'] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const {serveUrl, composition, inputProps} = await prepare({mode, audio: false});
for (const f of frameList.split(',').map(Number)) {
  const output = path.join(outDir, `${mode}-${String(f).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame: f, output, inputProps, scale: Number(scale), browserExecutable: BROWSER});
  console.log(output);
}
