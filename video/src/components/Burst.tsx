import React from 'react';
import {useCurrentFrame} from 'remotion';
import {E, exit, tween} from '../lib/anim';
import {ART} from '../timing';
import {ConfettiPiece, Piece} from './Art';

/**
 * Confetti flies out of the nearer end of the line (`from` = [left end, right end]) with ease-out,
 * settles, and (optionally) shrinks away with ease-in. Leaving from the ends keeps it off the name.
 */
export const Burst: React.FC<{
  pieces: Piece[];
  from: [{x: number; y: number}, {x: number; y: number}];
  start: number;
  dur: number;
  outStart?: number;
}> = ({
  pieces,
  from,
  start,
  dur,
  outStart,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {pieces.map((p, i) => {
        const s0 = start + (i % 4); // 0–3 frame stagger
        const t = tween(frame, s0, s0 + dur, 0, 1, E.out);
        const q = outStart === undefined ? 0 : exit(frame, outStart + (i % 4), ART.exit);
        if (t <= 0) return null;
        const origin = p.x < (from[0].x + from[1].x) / 2 ? from[0] : from[1];
        return (
          <ConfettiPiece
            key={i}
            p={p}
            dx={(origin.x - p.x) * (1 - t)}
            dy={(origin.y - p.y) * (1 - t)}
            scale={(0.3 + 0.7 * t) * (1 - q)}
            rot={(1 - t) * -90}
            opacity={Math.min(1, t * 3) * (1 - q)}
          />
        );
      })}
    </>
  );
};
