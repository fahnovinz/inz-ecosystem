import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Burst} from '../components/Burst';
import {Staggered} from '../components/Text';
import {S6_CONFETTI} from '../artLayout';
import {COPY, getLayout} from '../layout';
import {C, FONT, T} from '../theme';
import {ART, S5, S6, STAGGER_LETTER, STAGGER_WORD, RISE} from '../timing';
import {headline, name} from './common';

/** Beat 6 — end card: the name, the answer to beat 2, and where to go. Holds still to the end. */
export const S6End: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S5.out) return null;
  const L = getLayout().s6;
  return (
    <>
      <Burst
        pieces={S6_CONFETTI}
        from={[
          {x: L.endLine.x, y: L.endLine.y},
          {x: L.endLine.x + L.endLine.w, y: L.endLine.y},
        ]} start={ART.s6Burst} dur={ART.s6BurstDur} />
      <Staggered
        text={COPY.name}
        by="letter"
        inRise={-RISE} // drops onto the line instead of rising through it
        start={S6.lettersIn}
        stagger={STAGGER_LETTER}
        color={C.ink}
        style={{...name(T.nameEnd), top: L.top}}
      />
      <Staggered
        text={COPY.s6line}
        start={S6.lineIn}
        stagger={STAGGER_WORD}
        color={C.ink}
        style={{...headline(T.h3, 500), left: 0, right: 0, textAlign: 'center', top: L.lineTop}}
      />
      <Staggered
        text={COPY.url}
        start={S6.urlIn}
        stagger={STAGGER_WORD}
        color={C.muted}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          textAlign: 'center',
          top: L.urlTop,
          fontFamily: FONT.body,
          fontWeight: 400,
          fontSize: T.body,
          lineHeight: `${T.body * 1.3}px`,
        }}
      />
    </>
  );
};
