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

// Voice: a soft, clear female narrator (see klattsch src/engine/synth-core.js).
//   b  base pitch, Hz: adult female speech sits around 190–230 Hz
//   s  formant scale: ×1.17 ≈ a shorter (female) vocal tract, raising F1–F3
//   r  ms per phoneme (stressed vowels are held 1.5×)
//   h  aspiration 0–1: a little breath softens the buzz of the pulse source
//   g  glottal effort 0–1: low = lax, rounded pulse with fewer harsh high harmonics
//   t  spectral tilt −0.95…0.95: negative = darker/less harsh (one-pole low-pass)
//   v/w vibrato depth (Hz) and rate: a slight wobble keeps sustained vowels from sounding mechanical
const VOICE = { base: 214, scale: 1.17, rate: 80, aspiration: 0.2, effort: 0.28, tilt: -0.6, vibrato: 1.5, vibratoRate: 5 };
const ACCENT = 16;                                                  // Hz lift on stressed vowels

// Hand-written General American IPA for the science words and names in the script;
// these override CMUdict. To fix a word, edit its IPA here.
const IPA = {
  muon: 'ˈmjuːɑn', muons: 'ˈmjuːɑnz',
  debris: 'dəˈbɹiː',
  atmosphere: 'ˈæt.məsˌfɪɹ',
  particles: 'ˈpɑɹ.tɪ.kəlz',
  collision: 'kəˈlɪʒ.ən',
  shower: 'ˈʃaʊ.ɚ',
  heavier: 'ˈhɛv.i.ɚ',
  cousins: 'ˈkʌz.ənz',
  electron: 'ɪˈlɛk.tɹɑn',
  millionths: 'ˈmɪl.jənθs',
  second: 'ˈsɛk.ənd',
  centimetre: 'ˈsɛn.tɪˌmiː.tɚ',
  earth: 'ɝθ',
  minute: 'ˈmɪn.ɪt',
  photomultiplier: 'ˌfoʊ.toʊˈmʌl.tɪ.plaɪ.ɚ',
  scintillator: 'ˈsɪn.tɪ.leɪ.tɚ',
  glowcost: 'ˈɡloʊˌkɔst',
};
// IPA → ARPABET (longest match first). ˈ marks the next vowel primary-stressed, ˌ secondary.
const IPA_MAP = [
  ['aɪ', 'AY'], ['aʊ', 'AW'], ['eɪ', 'EY'], ['oʊ', 'OW'], ['ɔɪ', 'OY'], ['tʃ', 'CH'], ['dʒ', 'JH'], ['ɪɹ', 'IH R'],
  ['iː', 'IY'], ['uː', 'UW'], ['ɑː', 'AA'], ['ɔː', 'AO'], ['ɜː', 'ER'], ['ɝ', 'ER'], ['ɚ', 'ER'],
  ['i', 'IY'], ['ɪ', 'IH'], ['e', 'EH'], ['ɛ', 'EH'], ['æ', 'AE'], ['ɑ', 'AA'], ['ɒ', 'AA'], ['ɔ', 'AO'], ['ʌ', 'AH'], ['ə', 'AH'], ['ʊ', 'UH'], ['u', 'UW'],
  ['p', 'P'], ['b', 'B'], ['t', 'T'], ['d', 'D'], ['k', 'K'], ['ɡ', 'G'], ['g', 'G'], ['f', 'F'], ['v', 'V'], ['θ', 'TH'], ['ð', 'DH'],
  ['s', 'S'], ['z', 'Z'], ['ʃ', 'SH'], ['ʒ', 'ZH'], ['h', 'HH'], ['m', 'M'], ['n', 'N'], ['ŋ', 'NG'], ['l', 'L'], ['ɹ', 'R'], ['r', 'R'], ['j', 'Y'], ['w', 'W'],
];
const VOWELS = new Set(['AY', 'AW', 'EY', 'OW', 'OY', 'IY', 'UW', 'AA', 'AO', 'ER', 'IH', 'EH', 'AE', 'AH', 'UH']);
function ipaToArpabet(ipa) {
  const out = []; let stress = '0', i = 0; ipa = ipa.replace(/[.\/]/g, '');
  while (i < ipa.length) {
    const ch = ipa[i];
    if (ch === 'ˈ') { stress = '1'; i++; continue; } if (ch === 'ˌ') { stress = '2'; i++; continue; }
    const hit = IPA_MAP.find(([k]) => ipa.startsWith(k, i));
    if (!hit) { i++; continue; }
    for (const code of hit[1].split(' ')) { if (VOWELS.has(code)) { out.push(code + stress); stress = '0'; } else out.push(code); }
    i += hit[0].length;
  }
  if (!out.some(p => /[12]$/.test(p))) { const k = out.findIndex(p => /0$/.test(p)); if (k >= 0) out[k] = out[k].slice(0, -1) + '1'; }
  return out.join(' ');
}
const LEXICON = Object.fromEntries(Object.entries(IPA).map(([w, ipa]) => [w, ipaToArpabet(ipa)]));

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
  const out = [`b${VOICE.base}`, `s${VOICE.scale}`, `r${VOICE.rate}`, `h${VOICE.aspiration}`, `g${VOICE.effort}`, `t=${VOICE.tilt}`, `v${VOICE.vibrato}`, `w${VOICE.vibratoRate}`];
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
        if (q.stress === '1') out.push(`${q.code}'` + (i === n - 1 && final ? '-20' : `+${ACCENT}`));   // pitch accent on stressed vowels
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
  if (process.env.SHOW_LEXICON) console.log(LEXICON);
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
