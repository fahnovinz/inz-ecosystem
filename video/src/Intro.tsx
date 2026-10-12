import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {Background} from './components/Background';
import {Thread} from './components/Thread';
import {fontsReady, onFontsReady} from './fonts';
import {Mode, ModeProvider} from './lib/mode';
import {S1Prompt} from './scenes/S1Prompt';
import {S2Question} from './scenes/S2Question';
import {S3Name} from './scenes/S3Name';
import {S4Ecosystem} from './scenes/S4Ecosystem';
import {S5Real} from './scenes/S5Real';
import {S6End} from './scenes/S6End';

export type IntroProps = {mode: Mode; audio: boolean};

export const Intro: React.FC<IntroProps> = ({mode, audio}) => {
  // Text widths are measured from the real fonts, so nothing draws until they are loaded.
  const [ready, setReady] = useState(fontsReady());
  useEffect(() => {
    onFontsReady(() => setReady(true));
  }, []);
  return (
    <ModeProvider mode={mode}>
      <AbsoluteFill>
        <Background />
        {ready ? (
          <>
            <S1Prompt />
            <S2Question />
            <S3Name />
            <S4Ecosystem />
            <S5Real />
            <S6End />
            <Thread />
          </>
        ) : null}
        {audio && mode === 'full' ? <Audio src={staticFile('audio/soundtrack.wav')} /> : null}
      </AbsoluteFill>
    </ModeProvider>
  );
};
