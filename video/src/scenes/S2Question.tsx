import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Rocket, useArtColor} from '../components/Art';
import {Staggered} from '../components/Text';
import {E, enter, exit, tween} from '../lib/anim';
import {jitter, S2_ROCKET} from '../artLayout';
import {COPY, getLayout} from '../layout';
import {C, COL, P, T} from '../theme';
import {ART, CUT, EXIT_FAST, RISE, S2, STAGGER_EXIT_FAST, STAGGER_WORD} from '../timing';
import {headline} from './common';

const PUFF_COLORS = [P.coral, C.accent, P.violet, P.sky];

/** Beat 2 — "But does it ship?" A rocket waits on its pad, then lifts off into the drop. */
export const S2Question: React.FC = () => {
  const frame = useCurrentFrame();
  const ac = useArtColor();
  const L = getLayout();
  const flightEnd = ART.s2Launch + ART.s2LaunchDur;
  if (frame < S2.wordsIn || frame > flightEnd + ART.s2PuffLife) return null;

  const rocketY = (f: number) =>
    S2_ROCKET.y + (1 - enter(f, ART.s2RocketIn, ART.enter)) * RISE * 2 + tween(f, ART.s2Launch, flightEnd, 0, -(S2_ROCKET.y + 420), E.in);
  const shaking = frame >= ART.s2Shake && frame < flightEnd;
  const shake = shaking ? Math.sin(frame * 2.4) * 3 : 0; // machine tremble
  const flame = tween(frame, ART.s2Shake, ART.s2Launch, 0, 1, E.out);
  const rocketIn = enter(frame, ART.s2RocketIn, ART.enter);

  const puffs = [];
  for (let k = 0; k * ART.s2PuffEvery < ART.s2LaunchDur; k++) {
    const fs = ART.s2Launch + k * ART.s2PuffEvery;
    const t = (frame - fs) / ART.s2PuffLife;
    if (t < 0 || t > 1) continue;
    const r = 18 + 34 * E.out(t);
    puffs.push(
      <div
        key={k}
        style={{
          position: 'absolute',
          left: S2_ROCKET.x + (90 + jitter(k) * 26) * S2_ROCKET.size - r,
          top: rocketY(fs) + 262 * S2_ROCKET.size - r,
          width: 2 * r,
          height: 2 * r,
          borderRadius: r,
          background: ac(PUFF_COLORS[k % PUFF_COLORS.length]),
          opacity: 1 - E.in(t),
        }}
      />,
    );
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: S2_ROCKET.x - 30,
          top: S2_ROCKET.y + 246 * S2_ROCKET.size,
          width: 180 * S2_ROCKET.size + 60,
          height: 14,
          borderRadius: 7,
          background: ac(C.panel),
          opacity: rocketIn * (1 - exit(frame, ART.s2Launch + ART.s2LaunchDur, ART.exit)),
        }}
      />
      {puffs}
      {frame < flightEnd ? (
        <div style={{position: 'absolute', inset: 0, opacity: rocketIn, transform: `translateX(${shake}px)`}}>
          <Rocket x={S2_ROCKET.x} y={rocketY(frame)} flame={flame} size={S2_ROCKET.size} />
        </div>
      ) : null}
      {frame <= CUT.s2s3 + 4 ? (
        <Staggered
          text={COPY.s2}
          start={S2.wordsIn}
          stagger={STAGGER_WORD}
          inRise={-RISE} // drops in from above, like the cursor, so no word crosses the line under "ship"
          outStart={S2.wordsOut}
          outStagger={STAGGER_EXIT_FAST}
          outDur={EXIT_FAST}
          color={C.ink}
          style={{...headline(T.h1), left: COL, top: L.s2.top}}
        />
      ) : null}
    </>
  );
};
