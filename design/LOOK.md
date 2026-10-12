# VRAXTAL intro — LOOK

Written before any frame was drawn. Approved frames freeze this file; change it only through a note.

## Idea in one picture
**The Thread.** One accent line carries the whole video: it is the prompt cursor, then the underline under
"shipping", the base under the name, the bus that connects the four tools, the bar beside "Real tools", and
finally the underline on the end card. The accent always marks the one thing to look at, and it is also the
carrier for every cut. Flat, colourful illustrations around the words show what each beat is about.

## Palette (hex)
Revised after the gate-4 note "too plain, make it colourful with illustrations" (taste).

| Role | Hex | Use |
|---|---|---|
| Background | `#15123B` | Deep indigo, every frame. Never replaced by a flat-colour dip. |
| Neutral 1 (ink) | `#FFF7EC` | Headlines, names. Warm white. |
| Neutral 2 (muted) | `#B4B0E0` | Labels, URL, dot grid (at 14 % alpha). Lavender. |
| Accent | `#FFD84D` | The Thread only (cursor, underline, bus, bar). Still the one thing to look at. |

**Illustration set** (shapes only, never text): coral `#FF6F61` · teal `#2DD4BF` · sky `#5AB8FF` · violet `#B48CFF`.
One colour per tool, the same everywhere: POS coral, VAULT teal, SIGNAL sky, Chatbot violet.
Topics: art coral, markets sky, tools teal. Surfaces: panel `#221E55`, glyphs on tiles `#0E0C2A`.

This widens the brief's "1 accent" rule on purpose: the four illustration colours carry the
illustrations, while the yellow accent alone marks what to look at. Text stays ink or muted.

Contrast (WCAG): ink on bg 16.7:1 · muted on bg 8.7:1 · muted on the darkest tool-tinted card 6.7:1 ·
accent on bg 12.9:1.

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
- Rounded and friendly: card radius 16 px, tiles radius 28 % of their size, round dots, square line caps on the Thread.
- Flat colour illustrations drawn in code: no outlines on fills, no gradients, no glow, no drop shadows, no 3D.
- Motifs: a code editor and an AI prompt bubble (beat 1), a rocket that launches on the drop (beat 2),
  topic tiles and confetti (beat 3), tool icons on tinted cards (beat 4), the four tool tiles with AI sparkles
  (beat 5), confetti around the end card (beat 6).
- Line weights: Thread 6 px (4 px as the tool bus), card borders 2 px, glyph strokes 8–9 % of the tile.
- Texture: static dot grid, 2 px dots every 48 px. It pans with the "camera" on cuts.
- Illustrations never touch text and never sit on the Thread's routes (checked on every frame in motion).

## Motion
- 120 BPM: 1 beat = 15 frames, 1 bar = 60 frames. Every cut and key hit sits on a beat.
- Entrances ease out (`Easing.out(Easing.cubic)` / critically damped springs with no overshoot), exits ease in.
- Words and letters stagger 2–4 frames; the next element starts before the last one settles.
- Only machine things move linearly: the cursor blink, code typing in the editor, the rocket's tremble and the signal pulse.
- The key idea sits still: after a scene settles nothing moves until its exit.

## Logo
`./brand` has no logo yet. Until the file arrives, the name **VRAXTAL** is typeset in Space Grotesk 700 as a
placeholder and flagged at every gate. The real logo replaces it before the build, used as given, never redrawn.
