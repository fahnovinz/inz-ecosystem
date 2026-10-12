# VRAXTAL intro (Remotion)

30 s brand intro for vibe coders. Design docs live in `../design/` (LOOK.md, SCRIPT.md, style frames).

```bash
cd video && npm ci
node scripts/stills.mjs out/sf full 60,200,300,500,880     # stills (also: text | shapes masks)
python3 -I scripts/frame-checks.py out/sf 60,200,300,500,880 # safe area, collisions, contrast
node scripts/checks.mjs [out/intro.mp4]                      # spelling, read time, sync, format, loudness
```

- A frame is a pure function of its frame number: no timers, no randomness, fonts and audio are local files.
- Every timing number is in `src/timing.ts`; every word on screen is in `src/copy.ts`.
- One component per beat in `src/scenes/`; the accent line that carries every cut is `src/components/Thread.tsx`.
- Fonts: Space Grotesk and Inter, SIL OFL 1.1 (licences in `public/fonts/`).
