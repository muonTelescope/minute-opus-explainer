// Narration with klattsch, a Klatt-style parallel-formant synthesiser (MIT, github.com/tgies/klattsch).
// English text → ARPABET via the CMU Pronouncing Dictionary (+ a small lexicon for
// words it lacks) → klattsch phoneme string with stress marks, pauses and a simple
// intonation contour → WAV.
//
//   node scripts/klattsch-voice.mjs              all scenes → audio/NN-id.wav
//   node scripts/klattsch-voice.mjs 1 2          only scenes 1 and 2
//   node scripts/klattsch-voice.mjs --out build/klattsch 1 2   write samples elsewhere
// The phoneme string for each clip is saved next to it (.txt) for hand-tuning.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dictionary } from 'cmu-pronouncing-dictionary';
import { compileString, renderToBuffer, encodeWav } from 'klattsch';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/script.json'), 'utf8'));

// Voice: bright, clear, mid-high narrator. b = base pitch (Hz), s = formant scale
// (>1 = shorter vocal tract), r = ms per phoneme, h = breathiness, g = glottal effort.
const VOICE = { base: 196, scale: 1.12, rate: 80, aspiration: 0.08, effort: 0.5 };

const LEXICON = {                                                  // words missing from CMUdict
  muon: 'M Y UW1 AA0 N', muons: 'M Y UW1 AA0 N Z',
  photomultiplier: 'F OW2 T OW0 M AH1 L T AH0 P L AY2 ER0',
  glowcost: 'G L OW1 K AO1 S T', scintillator: 'S IH1 N T AH0 L EY2 T ER0',
};

// Function words are spoken unstressed in running speech.
const FUNCTION = new Set('a an the and but or of to in into on for from at by with as is are was were be that this these those it its our their they them we us he she his her so not just than then there each every about one'.split(' '));

function phones(word) {
  const w = word.toLowerCase();
  const entry = LEXICON[w] || dictionary[w] || dictionary[w.replace(/'s$/, '')];
  if (!entry) return null;
  const weak = FUNCTION.has(w);
  return entry.split(' ').map(p => { const m = p.match(/^([A-Z]+)([012])?$/); return { code: m[1], stress: weak ? '0' : m[2] }; });
}

// Split into phrases at punctuation; each phrase gets a falling pitch line, a small
// rise before a comma/colon (continuation) and a deeper fall at a full stop.
function toKlattsch(text) {
  const tokens = text.replace(/<[^>]+>/g, ' ').match(/[A-Za-z']+|[,;:.!?]/g);
  const phrases = []; let cur = [];
  for (const t of tokens) { if (/[,;:.!?]/.test(t)) { phrases.push({ words: cur, end: t }); cur = []; } else cur.push(t); }
  if (cur.length) phrases.push({ words: cur, end: '.' });
  const out = [`b${VOICE.base}`, `s${VOICE.scale}`, `r${VOICE.rate}`, `h${VOICE.aspiration}`, `g${VOICE.effort}`];
  const missing = [];
  for (const ph of phrases) {
    const n = ph.words.length, final = ph.end === '.' || ph.end === '!' || ph.end === '?';
    ph.words.forEach((w, i) => {
      const p = phones(w); if (!p) { missing.push(w); return; }
      const k = n > 1 ? i / (n - 1) : 1;
      let f0 = VOICE.base + 22 - 34 * k;                            // declination across the phrase
      if (i === n - 1) f0 += final ? -18 : 14;                      // final fall / continuation rise
      out.push(`b${Math.round(f0)}`);
      for (const q of p) {
        if (q.stress === '1') out.push(`${q.code}'` + (i === n - 1 && final ? '-20' : '+12'));   // pitch accent on stressed vowels
        else out.push(q.code);
      }
    });
    out.push(ph.end === ',' || ph.end === ':' ? ',' : ph.end === ';' ? ';' : '.');
  }
  return { klattsch: out.join(' '), missing };
}

const args = process.argv.slice(2);
const outDir = args.includes('--out') ? path.resolve(ROOT, args[args.indexOf('--out') + 1]) : path.join(ROOT, 'audio');
const pick = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--out').map(Number);
fs.mkdirSync(outDir, { recursive: true });
const sampleRate = 48000;
for (const [i, s] of script.scenes.entries()) {
  if (pick.length && !pick.includes(i + 1)) continue;
  const { klattsch, missing } = toKlattsch(s.narration.replace(/gLOWCOST/g, 'glowcost'));
  if (missing.length) console.warn(`scene ${i + 1}: no pronunciation for ${missing.join(', ')} (add to LEXICON)`);
  const { voices, totalMs, warnings } = compileString(klattsch);
  if (warnings.length) console.warn(`scene ${i + 1}: ${warnings.join('; ')}`);
  const buf = new Float32Array(Math.ceil(totalMs * sampleRate / 1000));
  for (const v of voices) { if (!v.schedule.length) continue; const vb = renderToBuffer({ sampleRate, schedule: v.schedule, totalMs: v.totalMs }); for (let j = 0; j < Math.min(buf.length, vb.length); j++) buf[j] += vb[j]; }
  const { bytes } = encodeWav(buf, sampleRate);
  const base = path.join(outDir, `${String(i + 1).padStart(2, '0')}-${s.id}`);
  fs.writeFileSync(base + '.wav', bytes); fs.writeFileSync(base + '.txt', klattsch + '\n');
  console.log(`${path.relative(ROOT, base)}.wav  ${(totalMs / 1000).toFixed(1)} s`);
}
