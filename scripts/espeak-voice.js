// Narration with eSpeak NG (github.com/espeak-ng/espeak-ng), optionally through an
// MBROLA diphone voice, which is much smoother than eSpeak's own formant voices.
//   node scripts/espeak-voice.js                 all scenes, default voice → audio/NN-id.wav
//   node scripts/espeak-voice.js --voice en-us+f3 --out build/espeak/f3 1 2
// Needs: espeak-ng (and mbrola + mbrola-us1 for the mb-us1 voice).
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { ROOT, script, ffmpeg } = require('./lib');

const args = process.argv.slice(2), opt = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const VOICE = opt('--voice', 'mb-us1');           // MBROLA US female; alternatives: en-us+f3, en-us+Annie, en-us+linda
const SPEED = +opt('--speed', 150);               // words per minute
const PITCH = +opt('--pitch', 55);                // 0–99, 50 = voice default

const outDir = path.resolve(ROOT, opt('--out', 'audio'));
const pick = args.filter((a, i) => /^\d+$/.test(a) && !['--speed', '--pitch'].includes(args[i - 1])).map(Number);

// Spoken forms for text eSpeak would otherwise read oddly.
const say = t => t.replace(/gLOWCOST/g, 'glow cost').replace(/<[^>]+>/g, ' ');

fs.mkdirSync(outDir, { recursive: true });
for (const [i, s] of script.scenes.entries()) {
  if (pick.length && !pick.includes(i + 1)) continue;
  const base = path.join(outDir, `${String(i + 1).padStart(2, '0')}-${s.id}`), raw = base + '.raw.wav';
  const r = spawnSync('espeak-ng', ['-v', VOICE, '-s', String(SPEED), '-p', String(PITCH), '-g', '3', '-w', raw, say(s.narration)], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(raw)) { console.error(r.stderr || `espeak-ng failed for ${VOICE}`); process.exit(1); }
  // Gentle polish: 48 kHz, trim the hiss above 7 kHz, soften sibilants, a touch of room.
  spawnSync(ffmpeg(), ['-y', '-loglevel', 'error', '-i', raw, '-af',
    'aresample=48000,highpass=f=80,lowpass=f=7000,equalizer=f=6500:t=q:w=2:g=-4,aecho=0.8:0.5:35:0.12,loudnorm=I=-18:TP=-2',
    '-ar', '48000', base + '.wav'], { stdio: 'inherit' });
  fs.unlinkSync(raw);
  console.log(`${path.relative(ROOT, base)}.wav  (${VOICE})`);
}
