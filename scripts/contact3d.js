// 3D style exploration: renders two stills per scene, the three iPhone screen states at device
// resolution, and a contact sheet.   node scripts/contact3d.js  → build/3d/
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { chromium } = require('playwright-core'), { ROOT, ffmpeg } = require('./lib');
const SHOTS = [['sky', 2.0], ['sky', 7.0], ['relativity', 2.5], ['relativity', 8.0], ['detection', 2.2], ['detection', 6.0],
  ['coincidence', 3.0], ['coincidence', 9.5], ['weather', 1.8], ['weather', 5.5], ['close', 0.8, 'lock'], ['close', 4.0, 'expanded']];
(async () => {
  const out = path.join(ROOT, 'build/3d'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('page error:', e.message)); p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await p.goto('file://' + path.join(ROOT, 'src3d/index.html')); await p.waitForFunction(() => window.ready3d === true, null, { timeout: 60000 });
  const files = [];
  for (const [id, t, phone] of SHOTS) {
    const t0 = Date.now(), d = await p.evaluate(([id, t, phone]) => window.render3d(id, t, { phone }), [id, t, phone]);
    const f = path.join(out, `${id}-${t}.png`); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); files.push(f);
    console.log(`${path.relative(ROOT, f)}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  for (const mode of ['lock', 'compact', 'expanded']) {
    const d = await p.evaluate(m => window.phoneScreen(m, 4.0), mode);
    fs.writeFileSync(path.join(out, `iphone-${mode}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log(`build/3d/iphone-${mode}.png`);
  }
  await b.close();
  // contact sheet: 3 × 4 grid of 640 × 360 tiles, captioned by scene and time
  const inputs = files.flatMap(f => ['-i', f]), n = files.length;
  const scaled = files.map((f, i) => `[${i}]scale=640:360[v${i}]`).join(';');
  const layout = files.map((_, i) => `${(i % 3) * 640}_${Math.floor(i / 3) * 360}`).join('|');
  const r = spawnSync(ffmpeg(), ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${scaled};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout}`, path.join(out, 'contact-sheet.png')], { stdio: 'inherit' });
  if (r.status === 0) console.log('build/3d/contact-sheet.png');
  const ph = ['lock', 'compact', 'expanded'].flatMap(m => ['-i', path.join(out, `iphone-${m}.png`)]);
  spawnSync(ffmpeg(), ['-y', '-loglevel', 'error', ...ph, '-filter_complex', '[0]scale=590:-1[a];[1]scale=590:-1[b];[2]scale=590:-1[c];[a][b][c]hstack=3', path.join(out, 'iphone-states.png')], { stdio: 'inherit' });
  console.log('build/3d/iphone-states.png');
})();
