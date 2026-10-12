# VRAXTAL intro — LOOK

Written before any frame was drawn. Approved frames freeze this file; change it only through a note.

## Idea in one picture
**The Thread.** One accent line carries the whole video: it is the prompt cursor, then the underline under
"shipping", the base under the name, the bus that connects the four tools, the bar beside "Real tools", and
finally the underline on the end card. The accent always marks the one thing to look at, and it is also the
carrier for every cut.

## Palette (hex)
| Role | Hex | Use |
|---|---|---|
| Background | `#07090D` | Every frame. Never replaced by a flat-colour dip. |
| Neutral 1 (ink) | `#EEF2F6` | Headlines, names. |
| Neutral 2 (muted) | `#8A94A3` | Labels, URL, dot grid (at 16 % alpha). |
| Accent | `#0EA5E9` | The Thread and nodes only. One accent thing per frame. |

Card surfaces are Neutral 1 at 4 % alpha (fill) and 12 % alpha (2 px border): tints, not new colours.
The cyan comes from the existing VRAXTAL VAULT flagship badge in the repo README.

Contrast (WCAG): ink on bg 17.7:1 · muted on bg 6.5:1 · muted on card 5.97:1 · accent on bg 7.2:1.

## Type
- Headline: **Space Grotesk** 500/700 (SIL OFL 1.1, `public/fonts/OFL-SpaceGrotesk.txt`).
- Body: **Inter** 400/500 (SIL OFL 1.1, `public/fonts/OFL-Inter.txt`).
- Scale: base 30 px × 1.25ⁿ → 24 · 30 · 37.5 · 46.88 · 58.59 · 73.24 · 91.55 · 114.44 · 143.05.
- Headlines use 58.59 or larger (≥ 5 % of 1080 = 54 px). H1 = 91.55, H2 = 73.24, H3 = 58.59, name = 143.05 / 114.44.
- Body / labels: 37.5 and 30. Labels set in caps, tracking +0.14 em.
- Headline tracking −0.02 em, line height 1.05. Body line height 1.3.

## Grid (1920 × 1080)
- Title-safe 5 %: x 96–1824, y 54–1026. Every text box lives inside this.
- Action-safe 3.5 %: x 67–1853, y 38–1042. Every meaningful shape lives inside this.
- Left text column starts at x 192 (10 %). Centered scenes use the frame centre.
- 12-column feel at 48 px dot grid; the dot grid is the only texture.

## Shape language
- Rounded but tight: card radius 16 px, node dots round, line caps square (it reads as a cursor/machine).
- Flat. No gradients, no glow, no drop shadows, no 3D.
- Line weights: Thread 6 px (4 px as the tool bus), card borders 2 px.
- Texture: static dot grid, 2 px dots every 48 px, muted at 16 % alpha. It pans with the "camera" on cuts.

## Motion
- 120 BPM: 1 beat = 15 frames, 1 bar = 60 frames. Every cut and key hit sits on a beat.
- Entrances ease out (`Easing.out(Easing.cubic)` / critically damped springs with no overshoot), exits ease in.
- Words and letters stagger 2–4 frames; the next element starts before the last one settles.
- Only machine things move linearly: the cursor blink and the signal pulse along the bus.
- The key idea sits still: after a scene settles nothing moves until its exit.

## Logo
`./brand` has no logo yet. Until the file arrives, the name **VRAXTAL** is typeset in Space Grotesk 700 as a
placeholder and flagged at every gate. The real logo replaces it before the build, used as given, never redrawn.
