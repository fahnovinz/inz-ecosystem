import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Editor, PromptBubble} from '../components/Art';
import {Staggered} from '../components/Text';
import {E, enter, exit, tween} from '../lib/anim';
import {S1_BUBBLE, S1_EDITOR} from '../artLayout';
import {COPY, getLayout} from '../layout';
import {C, COL, T} from '../theme';
import {ART, CUT, RISE, S1, STAGGER_WORD} from '../timing';
import {headline} from './common';

/** Beat 1 — "Vibe coders build with AI." with the cursor waiting after it; an editor fills with code beside it. */
export const S1Prompt: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > CUT.s1s2 + 10) return null;
  const L = getLayout();
  const pe = enter(frame, ART.s1EditorIn, ART.enter);
  const pb = enter(frame, ART.s1BubbleIn, ART.enter);
  const qe = exit(frame, ART.s1Out, ART.exit);
  const qb = exit(frame, ART.s1Out + ART.stagger, ART.exit);
  const typed = Array.from({length: 6}, (_, i) => {
    const a = ART.s1TypeStart + i * (ART.s1TypeLine + ART.s1TypeGap);
    return tween(frame, a, a + ART.s1TypeLine, 0, 1, E.linear);
  });
  return (
    <>
      <div style={{position: 'absolute', inset: 0, opacity: pe * (1 - qe), transform: `translateY(${(1 - pe) * RISE - qe * RISE}px)`}}>
        <Editor {...S1_EDITOR} typed={typed} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: pb * (1 - qb),
          transform: `translateY(${(1 - pb) * RISE - qb * RISE}px)`,
        }}
      >
        <PromptBubble {...S1_BUBBLE} />
      </div>
      <Staggered
        text={COPY.s1}
        start={S1.wordsIn}
        stagger={STAGGER_WORD}
        outStart={S1.wordsOut}
        color={C.ink}
        style={{...headline(T.h1), left: COL, top: L.s1.top}}
      />
    </>
  );
};
