// Generates an original ambient pad (build/music.wav) entirely in code: slow
// detuned sine/triangle voices on a four-chord loop, a soft sub, and a sparse
// high "sparkle" for particle hits. Deterministic, royalty-free by construction.
const fs = require('fs'), path = require('path'), { ROOT, buildTimeline } = require('./lib');
const SR = 44100, timeline = buildTimeline(), seconds = timeline.at(-1).start + timeline.at(-1).duration + 1;
const N = Math.ceil(seconds * SR), L = new Float32Array(N), R = new Float32Array(N);
let seed = 17; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
// D minor-ish, open voicings: Dm9 – Bbmaj7 – Fmaj7 – Cadd9
const chords = [[50, 57, 60, 64, 69], [46, 53, 57, 62, 65], [41, 48, 57, 60, 64], [48, 55, 62, 64, 67]];
const chordLen = 7.5;
for (let c = 0; c * chordLen < seconds; c++) {
  const notes = chords[c % chords.length], t0 = c * chordLen, len = chordLen * 1.6;
  notes.forEach((m, k) => {
    const f = midi(m), det = [0.997, 1.003], pan = (k / (notes.length - 1)) * 1.2 - 0.6, amp = 0.05 / (1 + k * 0.25);
    const s0 = Math.floor(t0 * SR), s1 = Math.min(N, Math.floor((t0 + len) * SR));
    for (let i = s0; i < s1; i++) {
      const t = (i - s0) / SR, env = Math.sin(Math.PI * Math.min(1, t / len)) ** 2;
      let v = 0; for (const d of det) v += Math.sin(2 * Math.PI * f * d * t) + 0.25 * Math.sin(2 * Math.PI * 2 * f * d * t);
      v *= amp * env * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.11 * t + k));
      L[i] += v * (1 - pan) * 0.5; R[i] += v * (1 + pan) * 0.5;
    }
  });
  // sub
  const f = midi(notes[0] - 12), s0 = Math.floor(t0 * SR), s1 = Math.min(N, Math.floor((t0 + chordLen * 1.2) * SR));
  for (let i = s0; i < s1; i++) { const t = (i - s0) / SR, env = Math.sin(Math.PI * Math.min(1, t / (chordLen * 1.2))) ** 2, v = 0.06 * env * Math.sin(2 * Math.PI * f * t); L[i] += v; R[i] += v; }
}
// sparkles: soft bell pings from a pentatonic set
const bells = [74, 76, 79, 81, 86, 88];
for (let t0 = 1.5; t0 < seconds - 2; t0 += 0.9 + rnd() * 1.8) {
  const f = midi(bells[Math.floor(rnd() * bells.length)]), pan = rnd() * 1.6 - 0.8, s0 = Math.floor(t0 * SR), dur = 2.2;
  for (let i = s0; i < Math.min(N, s0 + dur * SR); i++) { const t = (i - s0) / SR, v = 0.018 * Math.exp(-t * 2.6) * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * t)); L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
}
// simple stereo feedback delay as a room, then master fades and normalise
const dly = Math.floor(0.37 * SR);
for (let i = dly; i < N; i++) { L[i] += 0.32 * R[i - dly]; R[i] += 0.32 * L[i - dly]; }
let peak = 0; for (let i = 0; i < N; i++) { const t = i / SR, fade = Math.min(1, t / 2.5, (seconds - t) / 3); L[i] *= fade; R[i] *= fade; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const buf = Buffer.alloc(44 + N * 4); const w = (o, s) => buf.write(s, o);
w(0, 'RIFF'); buf.writeUInt32LE(36 + N * 4, 4); w(8, 'WAVE'); w(12, 'fmt '); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); w(36, 'data'); buf.writeUInt32LE(N * 4, 40);
const g = 0.7 / peak; for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'build/music.wav'), buf);
console.log(`music: ${seconds.toFixed(1)} s → build/music.wav`);
