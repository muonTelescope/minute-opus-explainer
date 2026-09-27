// Narration with eSpeak NG (github.com/espeak-ng/espeak-ng), optionally through an
// MBROLA diphone voice, which is much smoother than eSpeak's own formant voices.
//   node scripts/espeak-voice.js                 all scenes, default voice → audio/NN-id.wav
//   node scripts/espeak-voice.js --voice en-us+f3 --out build/espeak/f3 1 2
// Needs: espeak-ng (and mbrola + mbrola-us1 for the mb-us1 voice).
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { ROOT, script, ffmpeg } = require('./lib');

const args = process.argv.slice(2), opt = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const VOICE = opt('--voice', 'mb-us1');           // MBROLA US female; alternatives: en-us+f3, en-us+Annie, en-us+linda
const SPEED = +opt('--speed', 165);               // words per minute
const PITCH = +opt('--pitch', 55);
const TEMPO = +opt('--tempo', 0.9);               // pitch-preserving slow-down applied afterwards (smoother than a slow espeak rate)                // 0–99, 50 = voice default

const outDir = path.resolve(ROOT, opt('--out', 'audio'));
const pick = args.filter((a, i) => /^\d+$/.test(a) && !['--speed', '--pitch', '--tempo'].includes(args[i - 1])).map(Number);

// Spoken forms for text eSpeak would otherwise read oddly.
const say = t => t.replace(/gLOWCOST/g, 'glow cost').replace(/<[^>]+>/g, ' ');

fs.mkdirSync(outDir, { recursive: true });
for (const [i, s] of script.scenes.entries()) {
  if (pick.length && !pick.includes(i + 1)) continue;
  const base = path.join(outDir, `${String(i + 1).padStart(2, '0')}-${s.id}`), raw = base + '.raw.wav';
  const r = spawnSync('espeak-ng', ['-v', VOICE, '-s', String(SPEED), '-p', String(PITCH), '-g', '0', '-w', raw, say(s.narration)], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(raw)) { console.error(r.stderr || `espeak-ng failed for ${VOICE}`); process.exit(1); }
  // Smoothing: high-quality resample, pitch-preserving tempo, remove hiss above 6.5 kHz,
  // soften sibilants and the diphone "buzz" around 3 kHz, even out levels, add a small room.
  spawnSync(ffmpeg(), ['-y', '-loglevel', 'error', '-i', raw, '-af',
    `aresample=48000:resampler=soxr,atempo=${TEMPO},highpass=f=90,lowpass=f=6500,equalizer=f=3000:t=q:w=1.2:g=-2,equalizer=f=6000:t=q:w=2:g=-5,equalizer=f=220:t=q:w=1:g=2,` +
    'acompressor=threshold=0.08:ratio=2.5:attack=15:release=250:makeup=1.5,aecho=0.85:0.6:28|47:0.14|0.08,loudnorm=I=-18:TP=-2',
    '-ar', '48000', base + '.wav'], { stdio: 'inherit' });
  fs.unlinkSync(raw);
  console.log(`${path.relative(ROOT, base)}.wav  (${VOICE})`);
}
