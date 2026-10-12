// Flat, rounded illustrations drawn in code (SVG). No outlines, no gradients, no shadows.
// Every colour goes through useArtColor so the check masks can see the shapes.
import React from 'react';
import {useShapeColor} from '../lib/mode';
import {C, P} from '../theme';

export const useArtColor = useShapeColor;

type Glyph = React.FC<{c: string; k?: string}>; // drawn in a 100×100 box; k = knockout (the tile colour)

export const Receipt: Glyph = ({c, k}) => (
  <g fill={c}>
    <path d="M28 18h44v62l-7.3-6-7.4 6-7.3-6-7.3 6-7.4-6-7.3 6z" />
    <rect x="36" y="30" width="28" height="6" rx="3" fill={k} />
    <rect x="36" y="42" width="20" height="6" rx="3" fill={k} />
    <rect x="36" y="54" width="24" height="6" rx="3" fill={k} />
  </g>
);
export const Lock: Glyph = ({c, k}) => (
  <g>
    <path d="M34 44V34a16 16 0 0 1 32 0v10" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round" />
    <rect x="24" y="42" width="52" height="40" rx="10" fill={c} />
    <circle cx="50" cy="58" r="6" fill={k} />
    <rect x="47" y="58" width="6" height="12" rx="3" fill={k} />
  </g>
);
export const ChartUp: Glyph = ({c}) => (
  <g fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 72l20-20 14 12 28-28" />
    <path d="M62 34h18v18" />
  </g>
);
export const Bot: Glyph = ({c, k}) => (
  <g>
    <rect x="46" y="12" width="8" height="14" rx="4" fill={c} />
    <circle cx="50" cy="12" r="6" fill={c} />
    <path d="M22 26h56a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H46l-16 12V76h-8a10 10 0 0 1-10-10V36a10 10 0 0 1 10-10z" fill={c} />
    <circle cx="38" cy="51" r="7" fill={k} />
    <circle cx="62" cy="51" r="7" fill={k} />
  </g>
);
export const Brush: Glyph = ({c}) => (
  <g fill={c}>
    <rect x="47" y="8" width="14" height="48" rx="7" transform="rotate(35 54 32)" />
    <path d="M24 66c6-10 18-12 24-6s2 18-10 22c-8 3-17 1-22-2 6-2 6-8 8-14z" />
  </g>
);
export const Candles: Glyph = ({c}) => (
  <g fill={c}>
    <rect x="22" y="40" width="14" height="30" rx="4" />
    <rect x="27" y="30" width="4" height="50" rx="2" />
    <rect x="43" y="26" width="14" height="34" rx="4" />
    <rect x="48" y="16" width="4" height="54" rx="2" />
    <rect x="64" y="18" width="14" height="28" rx="4" />
    <rect x="69" y="10" width="4" height="46" rx="2" />
  </g>
);
export const Cube: Glyph = ({c}) => (
  <g fill="none" stroke={c} strokeWidth="8" strokeLinejoin="round">
    <path d="M50 14l32 18v36L50 86 18 68V32z" />
    <path d="M18 32l32 18 32-18M50 50v36" />
  </g>
);

export const TOOL_GLYPHS = [Receipt, Lock, ChartUp, Bot];
export const TOPIC_GLYPHS = [Brush, Candles, Cube];

/** A rounded colour tile with a dark glyph on it. */
export const Tile: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  glyph: Glyph;
  scale?: number;
  opacity?: number;
  rotate?: number;
}> = ({x, y, size, color, glyph: G, scale = 1, opacity = 1, rotate = 0}) => {
  const ac = useArtColor();
  const pad = size * 0.16;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        overflow: 'visible',
      }}
    >
      <rect width={size} height={size} rx={size * 0.28} fill={ac(color)} />
      <g transform={`translate(${pad} ${pad}) scale(${(size - 2 * pad) / 100})`}>
        <G c={ac(C.panelDark)} k={ac(color)} />
      </g>
    </svg>
  );
};

/** Four-point sparkle, the shorthand for "AI". */
export const Sparkle: React.FC<{x: number; y: number; size: number; color: string; scale?: number; opacity?: number}> = ({
  x,
  y,
  size,
  color,
  scale = 1,
  opacity = 1,
}) => {
  const ac = useArtColor();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{position: 'absolute', left: x - size / 2, top: y - size / 2, transform: `scale(${scale})`, opacity}}
    >
      <path d="M50 0C54 34 66 46 100 50 66 54 54 66 50 100 46 66 34 54 0 50 34 46 46 34 50 0z" fill={ac(color)} />
    </svg>
  );
};

/** Confetti piece: circle, ring, triangle, squiggle or plus. */
export type Piece = {x: number; y: number; kind: 'dot' | 'ring' | 'tri' | 'squig' | 'plus'; color: string; size: number; rot: number};
export const ConfettiPiece: React.FC<{p: Piece; dx: number; dy: number; scale: number; rot: number; opacity: number}> = ({
  p,
  dx,
  dy,
  scale,
  rot,
  opacity,
}) => {
  const ac = useArtColor();
  const c = ac(p.color);
  const s = p.size;
  const shape =
    p.kind === 'dot' ? (
      <circle cx="50" cy="50" r="40" fill={c} />
    ) : p.kind === 'ring' ? (
      <circle cx="50" cy="50" r="34" fill="none" stroke={c} strokeWidth="16" />
    ) : p.kind === 'tri' ? (
      <path d="M50 10l42 74H8z" fill={c} strokeLinejoin="round" />
    ) : p.kind === 'squig' ? (
      <path d="M6 60c11-24 22-24 33 0s22 24 33 0 18-24 22-12" fill="none" stroke={c} strokeWidth="14" strokeLinecap="round" />
    ) : (
      <path d="M50 10v80M10 50h80" stroke={c} strokeWidth="18" strokeLinecap="round" />
    );
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      style={{
        position: 'absolute',
        left: p.x - s / 2 + dx,
        top: p.y - s / 2 + dy,
        transform: `rotate(${p.rot + rot}deg) scale(${scale})`,
        opacity,
        overflow: 'visible',
      }}
    >
      {shape}
    </svg>
  );
};

/** Code editor window with typed lines; `typed` 0..1 reveals the lines left to right. */
export const Editor: React.FC<{x: number; y: number; w: number; h: number; typed: number[]}> = ({x, y, w, h, typed}) => {
  const ac = useArtColor();
  const lines = [
    {indent: 0, len: 0.55, c: P.violet},
    {indent: 1, len: 0.62, c: P.sky},
    {indent: 1, len: 0.4, c: P.teal},
    {indent: 2, len: 0.5, c: P.coral},
    {indent: 1, len: 0.3, c: P.sky},
    {indent: 0, len: 0.22, c: P.violet},
  ];
  const top = 64;
  const gap = (h - top - 30) / lines.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}>
      <rect width={w} height={h} rx="22" fill={ac(C.panel)} />
      {[P.coral, C.accent, P.teal].map((c, i) => (
        <circle key={c} cx={30 + i * 26} cy="30" r="8" fill={ac(c)} />
      ))}
      {lines.map((l, i) => (
        <rect
          key={i}
          x={30 + l.indent * 30}
          y={top + i * gap}
          width={Math.max(0, (w - 60 - l.indent * 30) * l.len * (typed[i] ?? 0))}
          height="14"
          rx="7"
          fill={ac(l.c)}
        />
      ))}
    </svg>
  );
};

/** Chat bubble holding the AI sparkle. */
export const PromptBubble: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => {
  const ac = useArtColor();
  return (
    <svg width={w} height={h + 24} viewBox={`0 0 ${w} ${h + 24}`} style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}>
      <path d={`M24 0h${w - 48}a24 24 0 0 1 24 24v${h - 48}a24 24 0 0 1-24 24H64l-28 24v-24H24A24 24 0 0 1 0 ${h - 24}V24A24 24 0 0 1 24 0z`} fill={ac(P.violet)} />
      <g transform={`translate(${w / 2 - 28} ${h / 2 - 28}) scale(0.56)`}>
        <path d="M50 0C54 34 66 46 100 50 66 54 54 66 50 100 46 66 34 54 0 50 34 46 46 34 50 0z" fill={ac(C.accent)} />
      </g>
    </svg>
  );
};

/** Rocket on a pad. `flame` 0..1 grows the exhaust. */
export const Rocket: React.FC<{x: number; y: number; flame: number; size?: number}> = ({x, y, flame, size = 1}) => {
  const ac = useArtColor();
  return (
    <svg width={180 * size} height={300 * size} viewBox="0 0 180 300" style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}>
      {flame > 0 ? (
        <g transform={`translate(90 236) scale(1 ${0.4 + flame})`}>
          <path d="M-26 0c0 30 14 52 26 70 12-18 26-40 26-70z" fill={ac(P.coral)} />
          <path d="M-13 0c0 18 7 32 13 44 6-12 13-26 13-44z" fill={ac(C.accent)} />
        </g>
      ) : null}
      <path d="M50 170l-34 44v26l38-20z" fill={ac(P.coral)} />
      <path d="M130 170l34 44v26l-38-20z" fill={ac(P.coral)} />
      <path d="M90 0c34 26 50 70 50 120v100a10 10 0 0 1-10 10H50a10 10 0 0 1-10-10V120C40 70 56 26 90 0z" fill={ac(C.ink)} />
      <path d="M90 0c20 15 33 36 41 60H49c8-24 21-45 41-60z" fill={ac(P.coral)} />
      <circle cx="90" cy="118" r="24" fill={ac(P.sky)} />
      <circle cx="90" cy="118" r="12" fill={ac(C.panel)} />
      <rect x="62" y="232" width="56" height="10" rx="5" fill={ac(P.violet)} />
    </svg>
  );
};
