// A trio sonata movement in the manner of Corelli (two violins over a continuo of
// cello and harpsichord), composed and synthesised in code. The harmony follows
// Corelli's habits: diatonic circle-of-fifths sequences, 4–3 suspensions in the
// upper parts, a walking-quaver bass and a trilled final cadence.
// Every free choice (phrase order, figures, suspensions, bass patterns) is driven
// by real detector counts from data/muon_20260616_131649.csv, one minute per half bar.
const fs = require('fs'), path = require('path'), { ROOT, buildTimeline } = require('./lib');

// ---------- data seed ----------
const csv = fs.readFileSync(path.join(ROOT, 'data/muon_20260616_131649.csv'), 'utf8').trim().split('\n').slice(1)
  .map(l => l.split(',')).map(c => ({ c01: +c[4], c02: +c[5], c12: +c[6], g6: +c[2], g5: +c[3] }))
  .slice(1);                                                       // first row is the start-up minute; skip it
let cursor = 0;
const minute = () => csv[cursor++ % csv.length];

// ---------- form ----------
const SR = 44100, timeline = buildTimeline(), seconds = timeline.at(-1).start + timeline.at(-1).duration + 2;
const BPM = 72, beat = 60 / BPM, bar = 4 * beat;
const bars = Math.max(3, Math.floor((seconds - 3.5) / bar));

// D major. Chords are scale degrees (0 = I). Two chords per bar.
const SCALE = [62, 64, 66, 67, 69, 71, 73];                        // D4 E F# G A B C#
const deg = (d, oct = 0) => { const o = Math.floor(d / 7); return SCALE[((d % 7) + 7) % 7] + 12 * (o + oct); };
const triad = r => [r, r + 2, r + 4];
const PHRASES = [
  [[0, 3], [4, 0], [5, 1], [4, 0]],                                // I IV | V I | vi ii | V I
  [[0, 3], [6, 2], [5, 1], [4, 0]],                                // circle of fifths: I IV | vii iii | vi ii | V I
  [[5, 2], [3, 0], [1, 4], [4, 0]],                                // vi iii | IV I | ii V | V I
  [[0, 4], [5, 2], [3, 1], [4, 0]],                                // I V | vi iii | IV ii | V I
];
const plan = [];
for (let p = 0; plan.length < bars; p++) {
  const m = minute(), ph = p === 0 ? PHRASES[0] : PHRASES[(m.c01 + m.c12) % PHRASES.length];
  for (const b of ph) plan.push(b);
}
plan.length = bars; plan[bars - 1] = [4, 0]; plan[bars - 2] = [1, 4];   // final cadence: ii V | V I

// ---------- voice leading ----------
const notes = [];                                                  // {voice, t, dur, midi, vel}
const add = (voice, t, dur, midi, vel = 0.8) => notes.push({ voice, t, dur, midi, vel });
const nearest = (target, pool) => pool.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
const chordPool = (root, lo, hi) => { const out = []; for (let o = -2; o <= 3; o++) for (const d of triad(root)) { const m = deg(d, o); if (m >= lo && m <= hi) out.push(m); } return out; };
const diatonic = []; for (let o = -3; o <= 2; o++) for (const s of SCALE) diatonic.push(s + 12 * o);

let v1 = 74, v2 = 69, bassPrev = deg(0, -2), bassLast = bassPrev;
for (let b = 0; b < bars; b++) {
  const t0 = 1 + b * bar, [c1, c2] = plan[b], last = b === bars - 1;
  for (let h = 0; h < 2; h++) {
    const root = h ? c2 : c1, tt = t0 + h * 2 * beat, m = minute();
    if (last && h === 1) break;                                     // the final tonic is written below
    // violin I: nearest chord tone, nudged up or down by the CH01 count
    const pool1 = chordPool(root, 69, 86), step = (m.c01 % 3) - 1;
    const bassNow = deg(root, -2);
    const par = n => { const a = ((v1 - bassLast) % 12 + 12) % 12, b = ((n - bassNow) % 12 + 12) % 12; return (a === b && (b === 0 || b === 7) && n !== v1) ? 20 : 0; };
    const next1 = pool1.reduce((a, b) => Math.abs(b - (v1 + step * 3)) + par(b) < Math.abs(a - (v1 + step * 3)) + par(a) ? b : a);
    // 4–3 suspension: hold the old note, resolve down by step, when it lies a step above the new target
    const susp = m.c12 % 2 === 0 && v1 - next1 > 0 && v1 - next1 <= 2 && b > 0;
    // violin II: a third or sixth below violin I, chosen by CH02
    // violin II: prefer a third or sixth below violin I, move smoothly, and avoid
    // parallel fifths/octaves with violin I; CH02 breaks ties between third and sixth
    const pool2 = diatonic.filter(n => n >= 62 && n <= 81 && n < next1 && triad(root).some(d => (deg(d) - n) % 12 === 0));
    const score = n => { const i = next1 - n, pi = v1 - v2; let s = Math.abs(n - v2);
      if (![3, 4, 8, 9].includes(i)) s += 12; if ((i % 12 === 7 || i % 12 === 0) && pi % 12 === i % 12 && next1 !== v1) s += 40;
      if ((m.c02 % 2 ? [3, 4] : [8, 9]).includes(i)) s -= 1.5;
      const pb = ((v2 - bassLast) % 12 + 12) % 12, nb = ((n - bassNow) % 12 + 12) % 12; if (pb === nb && (nb === 0 || nb === 7) && n !== v2) s += 40; return s; };
    const next2 = pool2.length ? pool2.reduce((a, b) => score(b) < score(a) ? b : a) : next1 - 3;
    if (last && h === 0) {                                          // cadential trill on the dominant
      for (let k = 0; k < 12; k++) add('v1', tt + k * beat / 6, beat / 6, k % 2 ? 76 : 78, 0.7);
      add('v2', tt, 2 * beat, 73, 0.75);
    } else if (susp) { add('v1', tt, beat, v1, 0.85); add('v1', tt + beat, beat, next1, 0.7); }
    else if (m.c01 % 4 === 1) {                                     // passing notes: two quavers then a crotchet
      const between = diatonic.filter(n => n > Math.min(v1, next1) && n < Math.max(v1, next1));
      const pass = between.length ? (next1 > v1 ? between[0] : between.at(-1)) : next1;
      add('v1', tt, beat / 2, v1, 0.75); add('v1', tt + beat / 2, beat / 2, pass, 0.7); add('v1', tt + beat, beat, next1, 0.8);
    } else add('v1', tt, 2 * beat, next1, 0.8);
    if (!(last && h === 0)) {
      // violin II enters half a beat late in imitation on some second halves
      if (h === 1 && m.c02 % 3 === 0) { add('v2', tt, beat / 2, v2, 0.65); add('v2', tt + beat / 2, 1.5 * beat, next2, 0.75); }
      else add('v2', tt, 2 * beat, next2, 0.72);
    }
    v1 = next1; v2 = next2;
    // continuo: walking quavers from this root toward the next
    let r0 = deg(root, -2); while (r0 - bassPrev > 7) r0 -= 12; while (bassPrev - r0 > 7) r0 += 12;
    if (r0 < 38) r0 += 12; if (r0 > 55) r0 -= 12;
    const third = diatonic.find(n => n > r0 && (n - r0 === 3 || n - r0 === 4)) ?? r0 + 4, fifth = r0 + 7;
    const pattern = (m.g6 + m.g5) % 3;
    const q = pattern === 0 ? [r0, r0 + 12, fifth, r0 + 12] : pattern === 1 ? [r0, third, fifth, third] : [r0, fifth, r0 + 12, fifth];
    q.forEach((n, i) => add('bass', tt + i * beat / 2, beat / 2 * 0.92, n, i ? 0.72 : 0.85));
    bassPrev = r0; bassLast = q[3];
    // harpsichord right hand: the chord on each half bar, lightly spread
    triad(root).map(d => deg(d, 0) - 12).sort((a, b) => a - b).forEach((n, i) => add('harp', tt + i * 0.018, 2 * beat, n, 0.55));
  }
  if (last) {                                                       // final D major, held
    const tf = t0 + 2 * beat, hold = 2.6 * beat;
    add('v1', tf, hold, 78, 0.85); add('v2', tf, hold, 74, 0.8); add('bass', tf, hold, 38, 0.85);
    [62, 66, 69].forEach((n, i) => add('harp', tf + i * 0.03, hold, n - 12, 0.6));
  }
}

// ---------- synthesis (deterministic) ----------
const N = Math.ceil(seconds * SR), L = new Float32Array(N), R = new Float32Array(N);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// band-limited bowed-string wavetables: sawtooth with a gentle body resonance
function table(harm, bright, formant) {
  const T = new Float32Array(4096);
  for (let k = 1; k <= harm; k++) { const a = Math.pow(k, -bright) * (1 + 0.6 * Math.exp(-((k - formant) ** 2) / 6)); for (let i = 0; i < 4096; i++) T[i] += a * Math.sin(2 * Math.PI * k * i / 4096); }
  let p = 0; for (const x of T) p = Math.max(p, Math.abs(x)); return T.map(x => x / p);
}
const VIOLIN = table(24, 1.1, 4), CELLO = table(36, 1.2, 6);
const PAN = { v1: -0.45, v2: 0.45, bass: 0.05, harp: 0.25 };
function bowed(n, tab, level, vibDepth, voice) {
  const f = hz(n.midi), s0 = Math.floor(n.t * SR), len = Math.floor((n.dur + 0.14) * SR), att = 0.07, rel = 0.14;
  let ph = (n.midi * 311) % 4096;
  for (let i = 0; i < len && s0 + i < N; i++) {
    const t = i / SR, vib = 1 + vibDepth * Math.min(1, t / 0.35) * Math.sin(2 * Math.PI * 5.3 * t + n.midi);
    const env = Math.min(1, t / att) * (t > n.dur ? Math.max(0, 1 - (t - n.dur) / rel) : 1);
    ph = (ph + 4096 * f * vib / SR) % 4096; const j = ph | 0, fr = ph - j;
    const v = (tab[j] * (1 - fr) + tab[(j + 1) & 4095] * fr) * env * level * n.vel;
    L[s0 + i] += v * (1 - PAN[voice]) * 0.5; R[s0 + i] += v * (1 + PAN[voice]) * 0.5;
  }
}
function pluck(n, level) {                                           // Karplus–Strong harpsichord string
  const f = hz(n.midi), P = Math.max(2, Math.round(SR / f)), buf = new Float32Array(P), s0 = Math.floor(n.t * SR), len = Math.floor(Math.min(n.dur + 0.5, 2.5) * SR);
  let s = (n.midi * 7919 + Math.round(n.t * 1000)) >>> 0;
  for (let i = 0; i < P; i++) { s = (s * 1103515245 + 12345) >>> 0; buf[i] = (s / 4294967296) * 2 - 1; }
  let prev = 0;
  for (let i = 0; i < len && s0 + i < N; i++) {
    const k = i % P, out = buf[k]; buf[k] = 0.995 * 0.5 * (out + prev); prev = out;
    const fade = i > len - 3000 ? (len - i) / 3000 : 1, v = out * level * n.vel * fade;
    L[s0 + i] += v * (1 - PAN.harp) * 0.5; R[s0 + i] += v * (1 + PAN.harp) * 0.5;
  }
}
for (const n of notes) {
  if (n.voice === 'v1' || n.voice === 'v2') bowed(n, VIOLIN, 0.15, 0.006, n.voice);
  else if (n.voice === 'bass') { bowed(n, CELLO, 0.2, 0.003, 'bass'); pluck({ ...n, vel: n.vel * 0.7 }, 0.2); }
  else pluck(n, 0.13);
}
// small-hall reverb (Schroeder: 4 damped combs + 2 all-passes per side)
function reverb(x, spread) {
  const out = new Float32Array(x.length);
  for (const d of [1557, 1617, 1491, 1422].map(d => d + spread)) { const b = new Float32Array(d); let k = 0, lp = 0; for (let i = 0; i < x.length; i++) { const y = b[k]; lp = y * 0.6 + lp * 0.4; b[k] = x[i] + lp * 0.8; out[i] += y * 0.25; k = (k + 1) % d; } }
  for (const d of [225, 556]) { const b = new Float32Array(d); let k = 0; for (let i = 0; i < x.length; i++) { const y = b[k], v = out[i]; b[k] = v + y * 0.5; out[i] = y - v * 0.5; k = (k + 1) % d; } }
  return out;
}
const RL = reverb(L, 0), RR = reverb(R, 23);
let peak = 0;
for (let i = 0; i < N; i++) { const t = i / SR, fade = Math.min(1, t / 0.8, (seconds - t) / 2.0); L[i] = (L[i] * 0.8 + RL[i] * 0.3) * fade; R[i] = (R[i] * 0.8 + RR[i] * 0.3) * fade; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }

const buf = Buffer.alloc(44 + N * 4), w = (o, s) => buf.write(s, o);
w(0, 'RIFF'); buf.writeUInt32LE(36 + N * 4, 4); w(8, 'WAVE'); w(12, 'fmt '); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); w(36, 'data'); buf.writeUInt32LE(N * 4, 40);
const g = 0.8 / peak; for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'build/music.wav'), buf);
console.log(`music: trio sonata in D, ${bars} bars at ${BPM} bpm, ${notes.length} notes seeded by ${cursor} detector minutes → build/music.wav`);
