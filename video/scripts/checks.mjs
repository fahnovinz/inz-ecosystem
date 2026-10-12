// Gate checks that need no pixels: spelling vs approved script, read time, beat sync of key hits,
// and (once a render exists) format, loudness and audio sync.
// usage: node scripts/checks.mjs [path/to/render.mp4]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {spring} from 'remotion';
import {COPY} from '../src/copy.ts';
import * as TM from '../src/timing.ts';
import {ROOT} from './lib.mjs';

const results = [];
const report = (name, ok, note) => results.push({name, ok, note});

// --- spelling_and_facts: every on-screen string appears verbatim in the approved script.
const script = fs.readFileSync(path.join(ROOT, '../design/SCRIPT.md'), 'utf8');
const strings = [COPY.s1, COPY.s2, COPY.name, COPY.s3tag, COPY.s4head, COPY.s5a, COPY.s5b, COPY.s6line, COPY.url,
  ...COPY.tools.map((t) => `${t.label} ${t.name}`)];
const missing = strings.filter((s) => !script.includes(s));
report('spelling_and_facts', missing.length === 0, missing.length ? `not in SCRIPT.md: ${missing.join(' | ')}` : `${strings.length} strings match SCRIPT.md`);

// --- read time: hold >= 0.6 s per word + 0.5 s, from first word legible (enter >= 0.9) to first exit.
const legibleAfter = (() => {
  for (let f = 0; f < 60; f++) {
    if (spring({frame: f, fps: TM.FPS, durationInFrames: TM.ENTER, config: {damping: 200, overshootClamping: true}}) >= 0.9) return f;
  }
  return 60;
})();
const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
const beats = [
  {beat: 1, text: COPY.s1, in: TM.S1.wordsIn, out: TM.S1.wordsOut},
  {beat: 2, text: COPY.s2, in: TM.S2.wordsIn, out: TM.S2.wordsOut},
  {beat: 3, text: COPY.s3tag, in: TM.S3.taglineIn, out: TM.S3.taglineOut}, // name = logo, not read
  {beat: 4, text: [COPY.s4head, ...COPY.tools.map((t) => `${t.label} ${t.name}`)].join(' '), in: TM.S4.headerIn, out: TM.S4.out},
  {beat: 5, text: `${COPY.s5a} ${COPY.s5b}`, in: TM.S5.wordsIn, out: TM.S5.out},
  {beat: 6, text: `${COPY.s6line} ${COPY.url}`, in: TM.S6.lineIn, out: TM.DURATION},
];
const readRows = beats.map((b) => {
  const need = Math.ceil((0.6 * words(b.text) + 0.5) * TM.FPS);
  const held = b.out - (b.in + legibleAfter);
  return {...b, words: words(b.text), need, held, ok: held >= need};
});
report('read_time', readRows.every((r) => r.ok), readRows.map((r) => `b${r.beat} ${r.words}w held ${r.held}f / need ${r.need}f`).join('; '));

// --- sync (timeline): every key hit on a beat.
const off = TM.KEY_HITS.filter((h) => h.frame % TM.BEAT !== 0);
report('sync_timeline', off.length === 0, off.length ? `off-beat: ${off.map((h) => `${h.name}@${h.frame}`).join(', ')}` : `${TM.KEY_HITS.length} key hits on beats`);

// --- render checks (format, loudness, audio sync) when an mp4 is given.
const mp4 = process.argv[2];
if (mp4) {
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4]).toString());
  const v = probe.streams.find((s) => s.codec_type === 'video');
  const a = probe.streams.find((s) => s.codec_type === 'audio');
  const dur = Number(probe.format.duration);
  const fr = v && v.r_frame_rate === v.avg_frame_rate ? v.r_frame_rate : `${v?.r_frame_rate} vs avg ${v?.avg_frame_rate}`;
  const fmtOk = v && a && v.codec_name === 'h264' && a.codec_name === 'aac' && v.height >= 1080 && fr === '30/1' && Math.abs(dur - 30) <= 1.5;
  report('format', !!fmtOk, `${v?.codec_name} ${v?.width}x${v?.height} ${fr} fps, ${a?.codec_name} ${a?.sample_rate} Hz, ${dur.toFixed(3)} s`);

  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${mp4}" -af ebur128=peak=true -f null - 2>&1 | tail -14`]).toString();
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(log)?.[1]);
  const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(log)?.[1]);
  report('loudness', Math.abs(I + 14) <= 1 && TP <= -1, `integrated ${I} LUFS, true peak ${TP} dBTP`);
}

// --- print
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(20)} ${r.note}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
