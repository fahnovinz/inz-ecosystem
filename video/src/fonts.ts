import {loadFont} from '@remotion/fonts';
import {continueRender, delayRender, staticFile} from 'remotion';
import {FONT} from './theme';

const faces = [
  {family: FONT.head, file: 'space-grotesk-latin-500-normal.woff2', weight: '500'},
  {family: FONT.head, file: 'space-grotesk-latin-700-normal.woff2', weight: '700'},
  {family: FONT.body, file: 'inter-latin-400-normal.woff2', weight: '400'},
  {family: FONT.body, file: 'inter-latin-500-normal.woff2', weight: '500'},
];

let ready = false;
const waiters: Array<() => void> = [];
const handle = delayRender('fonts');

Promise.all(
  faces.map((f) =>
    loadFont({family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight, format: 'woff2'}),
  ),
).then(() => {
  ready = true;
  waiters.splice(0).forEach((w) => w());
  continueRender(handle);
});

export const fontsReady = () => ready;
export const onFontsReady = (cb: () => void) => (ready ? cb() : waiters.push(cb));
