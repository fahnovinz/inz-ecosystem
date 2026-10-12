import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {tween} from '../lib/anim';
import {useMode} from '../lib/mode';
import {C} from '../theme';
import {CAMERA_STEPS} from '../timing';

const CELL = 48;

/** Flat background + static dot grid that pans two cells upward on every cut (the camera). */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const mode = useMode();
  const pan = CAMERA_STEPS.reduce((acc, [a, b]) => acc + tween(frame, a, b, 0, -2 * CELL), 0);
  if (mode !== 'full') return <AbsoluteFill style={{background: '#000'}} />;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${C.grid} 1.2px, transparent 1.6px)`,
          backgroundSize: `${CELL}px ${CELL}px`,
          backgroundPosition: `${CELL / 2}px ${(pan % CELL) + CELL / 2}px`,
        }}
      />
    </AbsoluteFill>
  );
};
