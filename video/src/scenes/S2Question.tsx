import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Staggered} from '../components/Text';
import {COPY, getLayout} from '../layout';
import {C, COL, T} from '../theme';
import {CUT, S2, STAGGER_WORD} from '../timing';
import {headline} from './common';

/** Beat 2 — "But does it ship?" The cursor drops into the line under "ship". */
export const S2Question: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S2.wordsIn || frame > CUT.s2s3 + 4) return null;
  const L = getLayout();
  return (
    <Staggered
      text={COPY.s2}
      start={S2.wordsIn}
      stagger={STAGGER_WORD}
      outStart={S2.wordsOut}
      color={C.ink}
      style={{...headline(T.h1), left: COL, top: L.s2.top}}
    />
  );
};
