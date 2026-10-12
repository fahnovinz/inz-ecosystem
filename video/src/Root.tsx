import React from 'react';
import {Composition} from 'remotion';
import {Intro, IntroProps} from './Intro';
import {H, W} from './theme';
import {DURATION, FPS} from './timing';

export const Root: React.FC = () => (
  <Composition
    id="Intro"
    component={Intro}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={DURATION}
    defaultProps={{mode: 'full', audio: false}}
  />
);
