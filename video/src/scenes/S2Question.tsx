import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Staggered} from '../components/Text';
import {COPY, getLayout} from '../layout';
import {C, COL, T} from '../theme';
import {CUT, RISE, EXIT_FAST, S2, STAGGER_EXIT_FAST, STAGGER_WORD} from '../timing';
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
      inRise={-RISE} // drops in from above, like the cursor, so no word crosses the line under "ship"
      outStart={S2.wordsOut} outStagger={STAGGER_EXIT_FAST} outDur={EXIT_FAST}
      color={C.ink}
      style={{...headline(T.h1), left: COL, top: L.s2.top}}
    />
  );
};
