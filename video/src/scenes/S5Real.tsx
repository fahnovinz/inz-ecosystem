import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Staggered} from '../components/Text';
import {COPY, getLayout} from '../layout';
import {C, LH, T} from '../theme';
import {S4, S5, STAGGER_EXIT, STAGGER_WORD} from '../timing';
import {headline} from './common';

/** Beat 5 — the proof: real tools, built with AI. The line stands beside it as a bar. */
export const S5Real: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S4.out || frame > S5.out + 24) return null;
  const L = getLayout().s5;
  const lh = T.h1 * LH;
  const nA = COPY.s5a.split(' ').length;
  return (
    <>
      <Staggered
        text={COPY.s5a}
        start={S5.wordsIn}
        stagger={STAGGER_WORD}
        outStart={S5.out}
        color={C.ink}
        style={{...headline(T.h1), left: L.textX, top: L.top}}
      />
      <Staggered
        text={COPY.s5b}
        start={S5.wordsIn + nA * STAGGER_WORD}
        stagger={STAGGER_WORD}
        outStart={S5.out + nA * STAGGER_EXIT}
        color={C.ink}
        style={{...headline(T.h1), left: L.textX, top: L.top + lh}}
      />
    </>
  );
};
