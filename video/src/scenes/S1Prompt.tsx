import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Staggered} from '../components/Text';
import {COPY, getLayout} from '../layout';
import {C, COL, T} from '../theme';
import {CUT, S1, STAGGER_WORD} from '../timing';
import {headline} from './common';

/** Beat 1 — "Vibe coders build with AI." with the cursor waiting after it. */
export const S1Prompt: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > CUT.s1s2 + 10) return null;
  const L = getLayout();
  return (
    <Staggered
      text={COPY.s1}
      start={S1.wordsIn}
      stagger={STAGGER_WORD}
      outStart={S1.wordsOut}
      color={C.ink}
      style={{...headline(T.h1), left: COL, top: L.s1.top}}
    />
  );
};
