import React from 'react';
import {useCurrentFrame} from 'remotion';
import {tween} from '../lib/anim';
import {useShapeColor} from '../lib/mode';
import {getLayout, Rect} from '../layout';
import {C, BUS_W, THREAD_W} from '../theme';
import {S1, THREAD} from '../timing';

const lerpRect = (f: number, [a, b]: readonly [number, number], r0: Rect, r1: Rect): Rect => ({
  x: tween(f, a, b, r0.x, r1.x),
  y: tween(f, a, b, r0.y, r1.y),
  w: tween(f, a, b, r0.w, r1.w),
  h: tween(f, a, b, r0.h, r1.h),
});

/** The accent line that carries every cut. */
export const Thread: React.FC = () => {
  const frame = useCurrentFrame();
  const sc = useShapeColor();
  const L = getLayout();

  const A = L.s1.cursor;
  const B = L.s2.underline;
  const Cc = L.s3.base;
  const D = L.s4.bus;
  const D2: Rect = {x: L.s5.bar.x, y: D.y, w: L.s5.bar.w, h: BUS_W};
  const Ee = L.s5.bar;
  const E2: Rect = {x: Ee.x, y: Ee.y + Ee.h + 24, w: Ee.w, h: THREAD_W}; // foot of the bar, below the words
  const F2: Rect = {x: L.s6.endLine.x, y: E2.y, w: L.s6.endLine.w, h: THREAD_W};
  const F = L.s6.endLine;

  const A2: Rect = {x: A.x, y: B.y, w: A.w, h: THREAD_W};
  const B2: Rect = {x: Cc.x, y: B.y, w: Cc.w, h: THREAD_W};
  const legs: Array<[readonly [number, number], Rect, Rect]> = [
    [THREAD.s1ToS2a, A, A2],
    [THREAD.s1ToS2b, A2, B],
    [THREAD.s2ToS3a, B, B2],
    [THREAD.s2ToS3b, B2, Cc],
    [THREAD.s3ToS4, Cc, D],
    [THREAD.s4ToS5a, D, D2],
    [THREAD.s4ToS5b, D2, Ee],
    [THREAD.s5ToS6a, Ee, E2],
    [THREAD.s5ToS6b, E2, F2],
    [THREAD.s5ToS6c, F2, F],
  ];
  let r = A;
  for (const [span, r0, r1] of legs) {
    if (frame >= span[0]) r = lerpRect(frame, span, r0, r1);
  }

  // The cursor blinks on the beat while it waits (machine: hard on/off).
  const blinking = frame < THREAD.s1ToS2a[0];
  const on = !blinking || frame % S1.cursorBlink < 9;

  return (
    <div
      style={{
        position: 'absolute',
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        background: sc(C.accent),
        opacity: on ? 1 : 0,
      }}
    />
  );
};
