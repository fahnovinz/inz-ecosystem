import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Sparkle, TOOL_GLYPHS, Tile} from '../components/Art';
import {Staggered} from '../components/Text';
import {enter, exit} from '../lib/anim';
import {S5_SPARKS, S5_TILES} from '../artLayout';
import {COPY, getLayout} from '../layout';
import {C, LH, T, TOOL_COLOR} from '../theme';
import {ART, EXIT_FAST, S4, S5, STAGGER_EXIT_FAST, STAGGER_WORD} from '../timing';
import {headline} from './common';

/** Beat 5 — the proof: real tools, built with AI. The four tool tiles and AI sparkles sit beside it. */
export const S5Real: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S4.cardsOut || frame > S5.out + 24) return null;
  const L = getLayout().s5;
  const lh = T.h1 * LH;
  const nA = COPY.s5a.split(' ').length;
  const G = S5_TILES;
  return (
    <>
      {TOOL_COLOR.map((col, i) => {
        const p = enter(frame, ART.s5TilesIn + i * ART.stagger, ART.enter);
        const q = exit(frame, ART.s5Out + i * 2, ART.exit);
        return (
          <Tile
            key={i}
            x={G.x + (i % 2) * (G.size + G.gap)}
            y={G.y + Math.floor(i / 2) * (G.size + G.gap)}
            size={G.size}
            color={col}
            glyph={TOOL_GLYPHS[i]}
            scale={(0.6 + 0.4 * p) * (1 - 0.4 * q)}
            rotate={(1 - p) * -8}
            opacity={p * (1 - q)}
          />
        );
      })}
      {S5_SPARKS.map((s, i) => {
        const p = enter(frame, ART.s5SparkIn + i * ART.stagger, ART.enter);
        const q = exit(frame, ART.s5Out + 4 + i * 2, ART.exit);
        return <Sparkle key={i} {...s} color={C.accent} scale={p * (1 - q)} opacity={p * (1 - q)} />;
      })}
      <Staggered
        text={COPY.s5a}
        start={S5.wordsIn}
        stagger={STAGGER_WORD}
        outStart={S5.out} outStagger={STAGGER_EXIT_FAST} outDur={EXIT_FAST}
        color={C.ink}
        style={{...headline(T.h1), left: L.textX, top: L.top}}
      />
      <Staggered
        text={COPY.s5b}
        start={S5.wordsIn + nA * STAGGER_WORD}
        stagger={STAGGER_WORD}
        outStart={S5.out + nA * STAGGER_EXIT_FAST} outStagger={STAGGER_EXIT_FAST} outDur={EXIT_FAST}
        color={C.ink}
        style={{...headline(T.h1), left: L.textX, top: L.top + lh}}
      />
    </>
  );
};
