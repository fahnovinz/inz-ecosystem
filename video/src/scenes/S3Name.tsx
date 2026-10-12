import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Staggered} from '../components/Text';
import {COPY, getLayout} from '../layout';
import {C, T} from '../theme';
import {S2, S3, STAGGER_LETTER, STAGGER_WORD} from '../timing';
import {label, name} from './common';

/** Beat 3 — the name lands on the line (the drop), with what it covers underneath. */
export const S3Name: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S2.wordsOut || frame > S3.out + 20) return null;
  const L = getLayout();
  return (
    <>
      <Staggered
        text={COPY.name}
        by="letter"
        start={S3.lettersIn}
        stagger={STAGGER_LETTER}
        outStart={S3.out}
        color={C.ink}
        style={{...name(T.name), top: L.s3.top}}
      />
      <Staggered
        text={COPY.s3tag}
        start={S3.taglineIn}
        stagger={STAGGER_WORD}
        outStart={S3.taglineOut}
        color={C.muted}
        style={{...label(T.body), left: 0, right: 0, textAlign: 'center', top: L.s3.tagTop}}
      />
    </>
  );
};
