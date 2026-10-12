import {Easing, interpolate, spring} from 'remotion';
import {FPS} from '../timing';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const E = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  linear: (t: number) => t, // machines only
};

/** Clamped tween of `frame` over [a, b] from v0 to v1. */
export const tween = (frame: number, a: number, b: number, v0: number, v1: number, easing = E.inOut) =>
  interpolate(frame, [a, b], [v0, v1], {...clamp, easing});

/** 0→1 entrance progress, critically damped spring (no overshoot), clamped both sides. */
export const enter = (frame: number, start: number, durationInFrames = 14) =>
  interpolate(
    spring({frame: frame - start, fps: FPS, durationInFrames, config: {damping: 200, overshootClamping: true}}),
    [0, 1],
    [0, 1],
    clamp,
  );

/** 0→1 exit progress with ease-in. */
export const exit = (frame: number, start: number, duration = 10) => tween(frame, start, start + duration, 0, 1, E.in);
