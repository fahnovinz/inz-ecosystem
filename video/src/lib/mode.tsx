import React, {createContext, useContext} from 'react';

/**
 * full   – the real picture.
 * text   – text only, white on black (safe-area + collision checks).
 * shapes – lines, borders and dots only, white on black (collision checks).
 */
export type Mode = 'full' | 'text' | 'shapes';
const Ctx = createContext<Mode>('full');
export const ModeProvider: React.FC<{mode: Mode; children: React.ReactNode}> = ({mode, children}) => (
  <Ctx.Provider value={mode}>{children}</Ctx.Provider>
);
export const useMode = () => useContext(Ctx);

/** Colour for text in the current mode. */
export const useTextColor = () => {
  const m = useMode();
  return (c: string) => (m === 'full' ? c : m === 'text' ? '#FFFFFF' : 'transparent');
};
/** Colour for shapes (lines, borders, dots) in the current mode. */
export const useShapeColor = () => {
  const m = useMode();
  return (c: string) => (m === 'full' ? c : m === 'shapes' ? '#FFFFFF' : 'transparent');
};
/** Fills are hidden in both check modes. */
export const useFillColor = () => {
  const m = useMode();
  return (c: string) => (m === 'full' ? c : 'transparent');
};
