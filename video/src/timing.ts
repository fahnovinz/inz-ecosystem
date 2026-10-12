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
  wordsOut: 230,
};
export const S3 = {
  lettersIn: CUT.s2s3, // letters start the moment the line lands
  taglineIn: CUT.s2s3 + 12,
  out: 330,
  taglineOut: 334,
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
  out: 552,
  exitStagger: 3,
  cardExitLag: 2, // card leaves after its drop starts retracting
};
export const S5 = {
  wordsIn: CUT.s4s5,
  out: 702,
};
export const S6 = {
  lettersIn: CUT.s5s6,
  lineIn: CUT.s5s6 + 14,
  urlIn: CUT.s5s6 + 22,
};

// Thread keyframes (the accent line). Between two keyframes it moves with ease-in-out;
// it holds still from one keyframe's end to the next one's start.
export const THREAD = {
  s1ToS2: [118, 140],
  s2ToS3: [230, CUT.s2s3], // the line leaves first and lands on the drop
  s3ToS4: [332, 360],
  s4ToS5a: [552, 564], // bus shrinks to a short bar at the left
  s4ToS5b: [564, 578], // bar stands up beside "Real tools."
  s5ToS6a: [702, 712], // bar lies down
  s5ToS6b: [712, CUT.s5s6], // and runs out under the name
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
