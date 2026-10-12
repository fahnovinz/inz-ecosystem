import React from 'react';
import {COL, FONT, LH, T, TRACK_HEAD, TRACK_LABEL, TRACK_NAME} from '../theme';

export const headline = (size: number, weight = 700): React.CSSProperties => ({
  position: 'absolute',
  fontFamily: FONT.head,
  fontWeight: weight,
  fontSize: size,
  lineHeight: `${size * LH}px`,
  letterSpacing: `${TRACK_HEAD}em`,
});
export const name = (size: number): React.CSSProperties => ({
  ...headline(size),
  letterSpacing: `${TRACK_NAME}em`,
  left: 0,
  right: 0,
  textAlign: 'center',
});
export const label = (size = T.label): React.CSSProperties => ({
  position: 'absolute',
  fontFamily: FONT.body,
  fontWeight: 500,
  fontSize: size,
  lineHeight: `${size * 1.3}px`,
  letterSpacing: `${TRACK_LABEL}em`,
  textTransform: 'uppercase',
});
export const leftCol: React.CSSProperties = {left: COL};
