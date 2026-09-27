// Shared helpers: ffmpeg lookup, audio durations, the timeline and SRT timing.
const fs = require('fs'), path = require('path'), { execFileSync, spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/script.json'), 'utf8'));

function ffmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  try { return execFileSync('python3', ['-c', 'import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())']).toString().trim(); }
  catch { throw new Error('ffmpeg not found: install ffmpeg or `pip install imageio-ffmpeg`, or set FFMPEG'); }
}

function audioSeconds(file) {
  const r = spawnSync(ffmpeg(), ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr); if (!m) throw new Error(`cannot read duration of ${file}`);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}

// audio/01-sky.mp3 … audio/06-close.mp3 (any of mp3/wav/m4a) — optional.
function voiceFile(i, id) {
  for (const ext of ['mp3', 'wav', 'm4a']) { const f = path.join(ROOT, 'audio', `${String(i + 1).padStart(2, '0')}-${id}.${ext}`); if (fs.existsSync(f)) return f; }
  return null;
}

function buildTimeline() {
  let start = 0;
  const scenes = script.scenes.map((s, i) => {
    const voice = voiceFile(i, s.id), voiceLen = voice ? audioSeconds(voice) : null;
    const duration = voice ? Math.max(4, script.leadIn + voiceLen + script.tailPad) : s.seconds;
    const e = { id: s.id, start: +start.toFixed(3), duration: +duration.toFixed(3), authored: s.seconds, voice: voice && path.relative(ROOT, voice), voiceStart: +(start + script.leadIn).toFixed(3), voiceLen };
    start += duration; return e;
  });
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'build/timeline.json'), JSON.stringify(scenes, null, 2));
  return scenes;
}

module.exports = { ROOT, script, ffmpeg, audioSeconds, buildTimeline };
