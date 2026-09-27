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

// Sentence starts inside a narration clip: the longest pauses (excluding the trailing
// silence) mark the sentence boundaries of the scene's text.
function sentenceStarts(file, textIn) {
  const n = (textIn.match(/[.!?]+/g) || ['.']).length, len = audioSeconds(file);
  const r = spawnSync(ffmpeg(), ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-38dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' });
  const gaps = []; let st = null;
  for (const m of r.stderr.matchAll(/silence_(start|end): ([\d.]+)/g)) { if (m[1] === 'start') st = +m[2]; else if (st !== null) { gaps.push({ s: st, e: +m[2] }); st = null; } }
  const inner = gaps.filter(g => g.s > 0.05 && g.e < len - 0.05);
  const onset = gaps.length && gaps[0].s <= 0.05 ? gaps[0].e : 0;
  const cuts = inner.sort((a, b) => (b.e - b.s) - (a.e - a.s)).slice(0, n - 1).map(g => g.e).sort((a, b) => a - b);
  return [onset, ...cuts];
}

function buildTimeline() {
  let start = 0;
  const scenes = script.scenes.map((s, i) => {
    const voice = voiceFile(i, s.id), voiceLen = voice ? audioSeconds(voice) : null;
    const hold = i === script.scenes.length - 1 ? 1.8 : 0;                    // let the title breathe at the end
    const duration = voice ? Math.max(4, script.leadIn + voiceLen + script.tailPad + hold) : s.seconds;
    const e = { id: s.id, start: +start.toFixed(3), duration: +duration.toFixed(3), authored: s.seconds, voice: voice && path.relative(ROOT, voice), voiceStart: +(start + script.leadIn).toFixed(3), voiceLen };
    // time warp: scene-local real seconds → authored seconds, pinned at each sentence start
    const real = [0], auth = [0];
    if (voice && s.anchors) {
      const starts = sentenceStarts(voice, s.narration).map(x => x + script.leadIn);
      e.sentences = starts.map(x => +(start + x).toFixed(3));
      s.anchors.forEach((a, k) => { if (starts[k] !== undefined && starts[k] > real.at(-1) + 0.2 && a > auth.at(-1)) { real.push(+starts[k].toFixed(3)); auth.push(a); } });
    }
    // after the last sentence, play the choreography at normal speed if there is room
    const rest = s.seconds - auth.at(-1);
    if (e.duration - real.at(-1) > rest + 0.05) { real.push(+(real.at(-1) + rest).toFixed(3)); auth.push(s.seconds); }
    real.push(e.duration); auth.push(s.seconds); e.warp = { real, auth };
    start += duration; return e;
  });
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'build/timeline.json'), JSON.stringify(scenes, null, 2));
  return scenes;
}

module.exports = { ROOT, script, ffmpeg, audioSeconds, buildTimeline };
