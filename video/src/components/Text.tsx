import React from 'react';
import {useCurrentFrame} from 'remotion';
import {enter, exit} from '../lib/anim';
import {useTextColor} from '../lib/mode';
import {ENTER, EXIT, RISE, STAGGER_EXIT} from '../timing';

type Props = {
  text: string;
  start: number; // first unit starts entering
  stagger: number; // frames between units
  outStart?: number; // first unit starts leaving
  outRise?: number; // px travelled on exit (negative = up)
  by?: 'word' | 'letter';
  color: string;
  style: React.CSSProperties;
};

/** Text that enters and leaves word by word (or letter by letter): ease out in, ease in out. */
export const Staggered: React.FC<Props> = ({text, start, stagger, outStart, outRise = -RISE, by = 'word', color, style}) => {
  const frame = useCurrentFrame();
  const tc = useTextColor();
  const units = by === 'word' ? text.split(' ') : Array.from(text);
  return (
    <div style={{...style, color: tc(color), whiteSpace: 'pre'}}>
      {units.map((u, i) => {
        const p = enter(frame, start + i * stagger, ENTER);
        const q = outStart === undefined ? 0 : exit(frame, outStart + i * STAGGER_EXIT, EXIT);
        const y = (1 - p) * RISE + q * outRise;
        return (
          <React.Fragment key={i}>
            <span style={{display: 'inline-block', transform: `translateY(${y}px)`, opacity: p * (1 - q)}}>{u}</span>
            {by === 'word' && i < units.length - 1 ? ' ' : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
