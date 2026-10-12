import React from 'react';
import {useCurrentFrame} from 'remotion';
import {TOPIC_GLYPHS, Tile} from '../components/Art';
import {Burst} from '../components/Burst';
import {Staggered} from '../components/Text';
import {enter, exit} from '../lib/anim';
import {S3_CONFETTI, S3_TILE} from '../artLayout';
import {COPY, getLayout} from '../layout';
import {C, P, T} from '../theme';
import {ART, EXIT_FAST, S2, S3, STAGGER_EXIT_FAST, STAGGER_LETTER, STAGGER_WORD, RISE} from '../timing';
import {label, name} from './common';

const TOPIC_COLORS = [P.coral, P.sky, P.teal]; // art, markets, tools

/** Beat 3 — the name lands on the line (the drop); confetti bursts out of it; a tile under each topic. */
export const S3Name: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S2.wordsOut || frame > S3.out + 20) return null;
  const L = getLayout();
  const tileTop = L.s3.tagTop + 72;
  return (
    <>
      <Burst
        pieces={S3_CONFETTI}
        from={[
          {x: L.s3.base.x, y: L.s3.base.y},
          {x: L.s3.base.x + L.s3.base.w, y: L.s3.base.y},
        ]} start={ART.s3Burst} dur={ART.s3BurstDur} outStart={ART.s3Out} />
      {L.s3.tagCenters.map((cx, i) => {
        const p = enter(frame, ART.s3TilesIn + i * ART.stagger, ART.enter);
        const q = exit(frame, ART.s3Out + i * 2, ART.exit);
        return (
          <Tile
            key={i}
            x={cx - S3_TILE / 2}
            y={tileTop}
            size={S3_TILE}
            color={TOPIC_COLORS[i]}
            glyph={TOPIC_GLYPHS[i]}
            scale={(0.6 + 0.4 * p) * (1 - 0.4 * q)}
            opacity={p * (1 - q)}
          />
        );
      })}
      <Staggered
        text={COPY.name}
        by="letter"
        inRise={-RISE} // drops onto the line instead of rising through it
        start={S3.lettersIn}
        stagger={STAGGER_LETTER}
        outStart={S3.out} outStagger={STAGGER_EXIT_FAST} outDur={EXIT_FAST}
        color={C.ink}
        style={{...name(T.name), top: L.s3.top}}
      />
      <Staggered
        text={COPY.s3tag}
        start={S3.taglineIn}
        stagger={STAGGER_WORD}
        outStart={S3.taglineOut} outStagger={STAGGER_EXIT_FAST} outDur={EXIT_FAST}
        color={C.muted}
        style={{...label(T.body), left: 0, right: 0, textAlign: 'center', top: L.s3.tagTop}}
      />
    </>
  );
};
