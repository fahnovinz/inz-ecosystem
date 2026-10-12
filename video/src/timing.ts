// Every timing number in the video lives here. Frames at 30 fps.
// Music is 120 BPM: one beat = 15 frames, one bar = 60 frames.

export const FPS = 30;
export const BPM = 120;
export const BEAT = 15;
export const BAR = 4 * BEAT;
export const DURATION = 900; // 30 s

// Generic motion constants.
export const ENTER = 14; // frames for an ease-out entrance
export const EXIT = 10; // frames for an ease-in exit
export const STAGGER_WORD = 3;
export const STAGGER_LETTER = 2;
export const STAGGER_CARD = 4;
export const STAGGER_EXIT = 2;
export const STAGGER_EXIT_FAST = 1; // exits that must clear the frame before the line moves
export const EXIT_FAST = 8;
export const RISE = 48; // px travelled by entering/exiting text

// Cuts. Each one lands on a beat (multiples of BEAT).
export const CUT = {
  s1s2: 135, // beat 9
  s2s3: 240, // bar 5, the drop
  s3s4: 345, // beat 23
  s4s5: 570, // beat 38
  s5s6: 720, // bar 13, final hit
} as const;

// Scene windows: [first frame drawn, last frame drawn]. Windows overlap around cuts.
export const S1 = {
  wordsIn: 0,
  cursorBlink: BEAT, // blink period (machine, linear)
  wordsOut: 118,
};
export const S2 = {
  wordsIn: 134,
  wordsOut: 229, // fast exit: gone by the drop at 240
};
export const S3 = {
  lettersIn: CUT.s2s3, // letters start the moment the line lands
  taglineIn: CUT.s2s3 + 12,
  out: 330, // fast exit: gone by 344, before the line rises through
  taglineOut: 330,
};
export const S4 = {
  headerIn: CUT.s3s4,
  dropsIn: 360, // bus lands on beat 24; drops + cards follow
  cardsIn: 362,
  pulse: 450, // bar 8 downbeat: one signal runs the bus (machine, linear)
  pulseLen: BEAT * 2,
  dropDur: 10, // a drop line draws from the bus into its card
  labelLag: 3, // card label starts this many frames after its card
  nameLag: 5, // card name after its card
  dropsOut: 549, // drops retract into the bus first, rightmost first
  dropOutDur: 6,
  dropOutStagger: 1,
  cardsOut: 551, // then the cards fall away, 2 frames apart, gone by 567
  cardExitStagger: 2,
  out: 566, // header leaves as "Real tools." arrives, so the frame never empties
};
export const S5 = {
  wordsIn: CUT.s4s5,
  out: 704, // fast exit while the line runs underneath; gone by 716
};
export const S6 = {
  lettersIn: CUT.s5s6,
  lineIn: CUT.s5s6 + 14,
  urlIn: CUT.s5s6 + 22,
};

// Thread keyframes (the accent line). Between two keyframes it moves with ease-in-out;
// it holds still from one keyframe's end to the next one's start.
export const THREAD = {
  s1ToS2a: [118, 126], // cursor flattens and drops below the baseline
  s1ToS2b: [126, 140], // then slides under "ship"
  s2ToS3a: [230, 238], // widens to the name's width, still below the words
  s2ToS3b: [238, CUT.s2s3], // and snaps up onto the drop
  s3ToS4: [338, 360], // rises into the bus once the name has gone
  s4ToS5a: [555, 562], // bus shrinks to a short bar at the left
  s4ToS5b: [562, 574], // bar stands up beside "Real tools."
  s5ToS6a: [700, 708], // bar folds down to its foot, left of the words
  s5ToS6b: [708, 716], // runs right underneath the words
  s5ToS6c: [716, CUT.s5s6], // and rises into place under the name on the hit
} as const;

// Camera: the dot grid pans one step on each cut.
export const CAMERA_STEPS = [
  [116, 140],
  [228, 248],
  [330, 360],
  [550, 578],
  [700, 724],
] as const;

// Sound design: about one action in five gets a sound.
export const SFX = {
  impact: CUT.s2s3,
  chime: CUT.s4s5,
  final: CUT.s5s6,
} as const;

// Key visual hits that must land on a music beat (checked by scripts/checks.mjs).
export const KEY_HITS = [
  {name: 'cut s1→s2', frame: CUT.s1s2},
  {name: 'line lands under VRAXTAL (drop)', frame: CUT.s2s3},
  {name: 'cut s3→s4', frame: CUT.s3s4},
  {name: 'bus lands, tools drop in', frame: S4.dropsIn},
  {name: 'signal pulse', frame: S4.pulse},
  {name: 'Real tools in', frame: CUT.s4s5},
  {name: 'end card, final hit', frame: CUT.s5s6},
];

// Illustrations (art). Entrances overlap the words; exits clear before the Thread moves through.
export const ART = {
  s1EditorIn: 6,
  s1BubbleIn: 28,
  s1TypeStart: 14, // code lines type in one after another (machine: linear)
  s1TypeLine: 6,
  s1TypeGap: 3,
  s1Out: 102, // editor + bubble gone by 116, before the cursor moves
  s2RocketIn: 142,
  s2Shake: 222, // rocket trembles (machine) and the flame lights
  s2Launch: 234, // lifts off, ease in, and is gone by 254: the drop pushes it out
  s2LaunchDur: 20,
  s2PuffEvery: 2,
  s2PuffLife: 22,
  s3Burst: CUT.s2s3, // confetti bursts out of the line on the drop
  s3BurstDur: 22,
  s3TilesIn: 258,
  s3Out: 322, // gone by 336, before the line rises
  s4IconLag: 7, // card icon after its card
  s4PopRise: 4,
  s4PopFall: 10,
  s5TilesIn: 578,
  s5SparkIn: 594,
  s5Out: 690, // gone by ~708, before the line runs underneath
  s6Burst: CUT.s5s6,
  s6BurstDur: 24,
  stagger: 4,
  enter: 16,
  exit: 12,
};
