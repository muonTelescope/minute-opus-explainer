// Renders every frame in headless Chromium and pipes PNGs into ffmpeg, then mixes
// narration (if present in audio/) over the generated music, ducking the music
// under the voice.   node scripts/render.js [--preview] [--from S --to S]
const fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright-core');
const { ROOT, script, ffmpeg, buildTimeline } = require('./lib');

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : +args[i + 1]; };
const preview = args.includes('--preview');
const fps = preview ? 15 : script.fps, scale = preview ? 0.5 : 1;

function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const p of ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) if (fs.existsSync(p)) return p;
  return undefined;                                                    // let Playwright find its own browser
}

(async () => {
  const timeline = buildTimeline(), total = timeline.at(-1).start + timeline.at(-1).duration;
  const from = arg('--from', 0), to = Math.min(arg('--to', total), total);
  const out = path.join(ROOT, 'build', preview ? 'preview-silent.mp4' : 'video-silent.mp4');
  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920 * scale, height: 1080 * scale }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'src/index.html') + '?render');
  await page.waitForFunction(() => window.ready === true);
  await page.evaluate(tl => { window.timeline = tl; }, timeline);
  const ff = spawn(ffmpeg(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-vf', `scale=${1920 * scale}:${1080 * scale}`, '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'slow', '-crf', preview ? '26' : '16',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round((to - from) * fps), started = Date.now();
  for (let f = 0; f < frames; f++) {
    const t = from + f / fps;
    const b64 = await page.evaluate(t => { const c = document.getElementById('c'); window.renderFrame(c, window.timeline, t); return c.toDataURL('image/png').split(',')[1]; }, t);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (fps * 5) === 0) process.stdout.write(`\rframe ${f}/${frames}  ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
  console.log(`\nvideo: ${path.relative(ROOT, out)}`);

  // audio mix
  const music = path.join(ROOT, 'build/music.wav');
  if (!fs.existsSync(music)) require('./music');
  const voices = timeline.filter(s => s.voice);
  const inputs = ['-i', out, '-i', music], filters = [];
  voices.forEach((s, k) => { inputs.push('-i', path.join(ROOT, s.voice)); const ms = Math.round((s.voiceStart - from) * 1000);
    filters.push(`[${k + 2}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.max(0, ms)}|${Math.max(0, ms)}[v${k}]`); });
  let graph;
  if (voices.length) {
    filters.push(`${voices.map((_, k) => `[v${k}]`).join('')}amix=inputs=${voices.length}:normalize=0,asplit=2[voice][key]`);
    filters.push(`[1:a]atrim=start=${from},asetpts=PTS-STARTPTS,volume=0.55[bed]`);
    filters.push(`[bed][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600[duck]`);
    filters.push(`[duck][voice]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`);
  } else {
    filters.push(`[1:a]atrim=start=${from},asetpts=PTS-STARTPTS,volume=0.8,loudnorm=I=-18:TP=-1.5[a]`);
  }
  graph = filters.join(';');
  const final = path.join(ROOT, 'build', preview ? 'gLOWCOST-explainer-preview.mp4' : 'gLOWCOST-explainer.mp4');
  const r = spawnSync(ffmpeg(), ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', '-shortest', final], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
  console.log(`final: ${path.relative(ROOT, final)}  (${voices.length}/${timeline.length} narration clips)`);
})();
