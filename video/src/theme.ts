// Palette, type scale and grid. See design/LOOK.md.

export const C = {
  bg: '#15123B', // deep indigo
  ink: '#FFF7EC', // warm white
  muted: '#B4B0E0', // lavender
  accent: '#FFD84D', // the Thread: sunny yellow, the one thing to look at
  cardFill: 'rgba(255,247,236,0.05)',
  cardLine: 'rgba(255,247,236,0.14)',
  grid: 'rgba(180,176,224,0.14)',
  panel: '#221E55', // illustration surfaces (editor window), bg lifted toward ink
  panelDark: '#0E0C2A', // glyphs drawn on coloured tiles
};

// Illustration palette: one colour per tool / topic. Never used for text.
export const P = {
  coral: '#FF6F61',
  teal: '#2DD4BF',
  sky: '#5AB8FF',
  violet: '#B48CFF',
};
export const TOOL_COLOR = [P.coral, P.teal, P.sky, P.violet]; // POS, VAULT, SIGNAL, Chatbot

const step = (n: number) => Math.round(30 * Math.pow(1.25, n) * 100) / 100;
export const T = {
  label: step(0), // 30
  body: step(1), // 37.5
  h3: step(3), // 58.59
  h2: step(4), // 73.24
  h1: step(5), // 91.55
  name: step(7), // 143.05
  nameEnd: step(6), // 114.44
};

export const FONT = {
  head: 'Space Grotesk',
  body: 'Inter',
};

export const W = 1920;
export const H = 1080;
export const SAFE = {
  title: {x0: 96, y0: 54, x1: 1824, y1: 1026},
  action: {x0: 67, y0: 38, x1: 1853, y1: 1042},
};
export const COL = 192; // left text column
export const LH = 1.05; // headline line height
export const TRACK_HEAD = -0.02; // em
export const TRACK_NAME = 0.04; // em
export const TRACK_LABEL = 0.14; // em
export const THREAD_W = 6;
export const BUS_W = 4;
