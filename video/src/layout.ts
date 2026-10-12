// Positions in px (1920×1080). Text widths are measured from the loaded fonts,
// so lines that sit under words always match the real glyphs.
import {measureText} from '@remotion/layout-utils';
import {COPY} from './copy';
import {COL, FONT, LH, T, TRACK_HEAD, TRACK_LABEL, TRACK_NAME, THREAD_W, BUS_W, W} from './theme';


const width = (text: string, size: number, weight: string, trackEm: number, family = FONT.head) =>
  measureText({text, fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: `${trackEm}em`}).width;
export {COPY};

export type Rect = {x: number; y: number; w: number; h: number};

let cache: ReturnType<typeof build> | null = null;
export const getLayout = () => (cache ??= build());

function build() {
  const lh1 = T.h1 * LH;

  // S1 — one line, vertically centred, cursor right after the full stop.
  const s1Top = 540 - lh1 / 2;
  const s1W = width(COPY.s1, T.h1, '700', TRACK_HEAD);
  const cursor: Rect = {x: COL + s1W + 14, y: s1Top + lh1 * 0.17, w: 0.46 * T.h1, h: 0.7 * T.h1};

  // S2 — same line as S1; the cursor drops into the underline under "ship".
  const s2Top = s1Top;
  const preW = width(COPY.s2pre, T.h1, '700', TRACK_HEAD);
  const shipW = width(COPY.s2key, T.h1, '700', TRACK_HEAD);
  const underline: Rect = {x: COL + preW, y: s2Top + lh1 + 16, w: shipW, h: THREAD_W};

  // S3 — name centred, base line, tagline.
  const s3Top = 405;
  const nameW = width(COPY.name, T.name, '700', TRACK_NAME);
  const base: Rect = {x: (W - nameW) / 2, y: s3Top + T.name * LH + 24, w: nameW, h: THREAD_W};
  const s3TagTop = base.y + 40;
  // Centre x of each tagline word (art, markets, tools), so a tile can sit under each one.
  const units = COPY.s3tag.toUpperCase().split(' ');
  const uw = (t: string) => width(t, T.body, '500', TRACK_LABEL, FONT.body);
  const space = uw(' ');
  const total = units.reduce((a, u) => a + uw(u), 0) + space * (units.length - 1);
  let cx = (W - total) / 2;
  const tagCenters: number[] = [];
  units.forEach((u) => {
    if (u !== '·') tagCenters.push(cx + uw(u) / 2);
    cx += uw(u) + space;
  });

  // S4 — header, bus, four cards.
  const cardW = 360;
  const gap = 32;
  const cardsX = COL;
  const cardTop = 500;
  const cardH = 300;
  const centers = COPY.tools.map((_, i) => cardsX + i * (cardW + gap) + cardW / 2);
  const busY = 430;
  const bus: Rect = {x: centers[0] - BUS_W / 2, y: busY, w: centers[3] - centers[0] + BUS_W, h: BUS_W};
  const s4HeadTop = 250;

  // S5 — vertical bar beside two lines.
  const s5Top = 540 - lh1;
  const bar: Rect = {x: COL, y: s5Top + 6, w: 8, h: 2 * lh1 - 12};
  const s5TextX = COL + 48;

  // S6 — end card.
  const s6Top = 370;
  const endW = width(COPY.name, T.nameEnd, '700', TRACK_NAME);
  const endLine: Rect = {x: (W - endW) / 2, y: s6Top + T.nameEnd * LH + 22, w: endW, h: THREAD_W};
  const s6LineTop = endLine.y + 46;
  const s6UrlTop = s6LineTop + T.h3 * LH + 30;

  return {
    s1: {top: s1Top, cursor},
    s2: {top: s2Top, underline},
    s3: {top: s3Top, base, tagTop: s3TagTop, tagCenters},
    s4: {headTop: s4HeadTop, cardW, cardH, cardTop, cardsX, gap, centers, bus},
    s5: {top: s5Top, bar, textX: s5TextX},
    s6: {top: s6Top, endLine, lineTop: s6LineTop, urlTop: s6UrlTop},
  };
}
