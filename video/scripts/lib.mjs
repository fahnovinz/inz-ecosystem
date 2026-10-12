import {bundle} from '@remotion/bundler';
import {selectComposition} from '@remotion/renderer';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

export async function prepare(inputProps = {mode: 'full', audio: false}) {
  const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts')});
  const composition = await selectComposition({serveUrl, id: 'Intro', inputProps, browserExecutable: BROWSER});
  return {serveUrl, composition, inputProps};
}
