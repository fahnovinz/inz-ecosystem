# Notes for Claude

## Working with Fahrezi
- Call them Rez / Rezi / Res; you are "Humam" (refer to yourself as Humam). Always reply in Indonesian, casual and natural.
- Develop on branch `claude/vrax-world-project-wksynj`; commit and push there. No PR unless asked.

## VRAX World (`packages/vrax-world`)
Browser city sandbox (three.js r160 via importmap, plain ES modules, no build). Typed EN/ID commands change the city; everything reacts.
Read `packages/vrax-world/README.md` for features and the file map; `CHANGELOG.md` (Unreleased) for what was done.

Key facts:
- `src/sim/` runs in Node (plain-data state, `structuredClone` for undo). `src/render/` three.js. `src/audio/` Web Audio synth (music moods via `moodFor`, city ambience). `src/ui/`, `src/interpreter.js` (EN/ID rules), `src/i18n.js` (EN and ID must have the same keys).
- Layout is parametric in `src/world/layout.js` (2 lanes each way, LANE 3.5, SIDEWALK 3, STRIP_W 18, city 194×120 m). Parking driveway = 4th arm of junction (33, 0).
- Traffic (`src/sim/vehicles.js`): path-based following (`pathGap`), junction reservations (`claimFree`/`addClaim`, fair requests, stuck-holder breaker), stop line behind zebra, box rule, reversing out of stalls, detours. Nobody should drive/walk through anybody — don't reintroduce "impatient drive-through" rules.

## Checks before pushing
- `npm test` (VRAX tests in `test/vrax-world.test.js`, incl. gridlock test) and `node --check` on every file in `packages/vrax-world/src`.
- Visual check: serve `packages/vrax-world` (`python3 -m http.server 8822`) and screenshot with Playwright (Chromium at /opt/pw-browsers; three.js CDN may need routing to a local copy).

## Published preview
Artifact https://claude.ai/artifact/KbrnWaz113CHCYZ93CY3Fu — page = `index.html` contents with `style.css` inlined, `src/**/*.js` published as files. Republish with `url` set to keep the link.
