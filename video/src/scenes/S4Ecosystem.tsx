import React from 'react';
import {useCurrentFrame} from 'remotion';
import {TOOL_GLYPHS, Tile} from '../components/Art';
import {Staggered} from '../components/Text';
import {S4_ICON} from '../artLayout';
import {E, enter, exit, tween} from '../lib/anim';
import {useFillColor, useShapeColor, useTextColor} from '../lib/mode';
import {COPY, getLayout} from '../layout';
import {BUS_W, C, COL, T, TOOL_COLOR} from '../theme';
import {ART, ENTER, EXIT, EXIT_FAST, RISE, S4, STAGGER_CARD, STAGGER_EXIT_FAST, STAGGER_WORD} from '../timing';
import {headline, label} from './common';

const PAD = 32;
const NODE = 16;

/** Beat 4 — one ecosystem: the line becomes a bus and feeds four real tools. */
export const S4Ecosystem: React.FC = () => {
  const frame = useCurrentFrame();
  const tc = useTextColor();
  const sc = useShapeColor();
  const fc = useFillColor();
  if (frame < S4.headerIn - 4 || frame > S4.cardsOut + 30) return null;
  const L = getLayout().s4;
  const busY = L.bus.y;

  // One signal runs the bus once, left to right (machine: linear).
  const pulseX = tween(frame, S4.pulse, S4.pulse + S4.pulseLen, L.bus.x - 80, L.bus.x + L.bus.w, E.linear);
  const pulseOn = frame >= S4.pulse && frame <= S4.pulse + S4.pulseLen;

  return (
    <>
      <Staggered
        text={COPY.s4head}
        start={S4.headerIn}
        stagger={STAGGER_WORD}
        outStart={S4.out}
        outStagger={STAGGER_EXIT_FAST}
        outDur={EXIT_FAST}
        color={C.ink}
        style={{...headline(T.h2), left: COL, top: L.headTop}}
      />
      {pulseOn ? (
        <div style={{position: 'absolute', left: L.bus.x, top: busY, width: L.bus.w, height: BUS_W, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: pulseX - L.bus.x, top: 0, width: 80, height: BUS_W, background: sc(C.ink)}} />
        </div>
      ) : null}
      {COPY.tools.map((t, i) => {
        const cx = L.centers[i];
        const x = L.cardsX + i * (L.cardW + L.gap);
        const d = tween(frame, S4.dropsIn + i * STAGGER_CARD, S4.dropsIn + i * STAGGER_CARD + S4.dropDur, 0, 1, E.out);
        const dOut = exit(frame, S4.dropsOut + (COPY.tools.length - 1 - i) * S4.dropOutStagger, S4.dropOutDur);
        const p = enter(frame, S4.cardsIn + i * STAGGER_CARD, ENTER);
        const q = exit(frame, S4.cardsOut + i * S4.cardExitStagger, EXIT);
        const y = (1 - p) * RISE + q * RISE * 1.5;
        const op = p * (1 - q);
        const lp = enter(frame, S4.cardsIn + i * STAGGER_CARD + S4.labelLag, ENTER);
        const np = enter(frame, S4.cardsIn + i * STAGGER_CARD + S4.nameLag, ENTER);
        const dropH = L.cardTop - (busY + BUS_W);
        const col = TOOL_COLOR[i];
        const ip = enter(frame, S4.cardsIn + i * STAGGER_CARD + ART.s4IconLag, ENTER);
        // The signal reaches this node: its icon gives one small pop.
        const hit = S4.pulse + ((cx - (L.bus.x - 80)) / (L.bus.w + 80)) * S4.pulseLen;
        const pop =
          tween(frame, hit, hit + ART.s4PopRise, 0, 1, E.out) * (1 - tween(frame, hit + ART.s4PopRise, hit + ART.s4PopFall, 0, 1, E.inOut));
        return (
          <React.Fragment key={t.name}>
            {/* drop from the bus into the card */}
            <div
              style={{
                position: 'absolute',
                left: cx - BUS_W / 2,
                top: busY + BUS_W,
                width: BUS_W,
                height: dropH * d * (1 - dOut),
                background: sc(col),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: x,
                top: L.cardTop,
                width: L.cardW,
                height: L.cardH,
                transform: `translateY(${y}px)`,
                opacity: op,
                borderRadius: 16,
                background: fc(`${col}24`), // tool colour at 14 %
                boxSizing: 'border-box',
                border: `2px solid ${sc(`${col}73`)}`, // tool colour at 45 %
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: L.cardW / 2 - NODE / 2,
                  top: -NODE / 2,
                  width: NODE,
                  height: NODE,
                  borderRadius: NODE,
                  background: sc(col),
                }}
              />
              <Tile
                x={L.cardW - PAD - S4_ICON}
                y={PAD - 4}
                size={S4_ICON}
                color={col}
                glyph={TOOL_GLYPHS[i]}
                scale={(0.6 + 0.4 * ip) * (1 + 0.12 * pop)}
                opacity={ip}
              />
              <div
                style={{
                  ...label(),
                  left: PAD,
                  top: PAD + 8,
                  color: tc(C.muted),
                  opacity: lp,
                  transform: `translateY(${(1 - lp) * 16}px)`,
                }}
              >
                {t.label}
              </div>
              <div
                style={{
                  ...headline(T.h3),
                  left: PAD,
                  bottom: PAD,
                  color: tc(C.ink),
                  opacity: np,
                  transform: `translateY(${(1 - np) * 24}px)`,
                }}
              >
                {t.name}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};
