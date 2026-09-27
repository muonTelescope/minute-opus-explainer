// Contact sheet of single frames:  node scripts/stills.js 5 14.5 27 …  → build/stills/t-XX.png
const fs = require('fs'), path = require('path'), { chromium } = require('playwright-core'), { ROOT, buildTimeline } = require('./lib');
(async () => {
  const tl = buildTimeline(), times = process.argv.slice(2).map(Number);
  const b = await chromium.launch({ executablePath: process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined), args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto('file://' + path.join(ROOT, 'src/index.html') + '?render'); await p.waitForFunction(() => window.ready === true);
  fs.mkdirSync(path.join(ROOT, 'build/stills'), { recursive: true });
  for (const t of times) {
    const b64 = await p.evaluate(([t, tl]) => { const c = document.getElementById('c'); window.renderFrame(c, tl, t); return c.toDataURL('image/png').split(',')[1]; }, [t, tl]);
    fs.writeFileSync(path.join(ROOT, `build/stills/t-${t}.png`), Buffer.from(b64, 'base64')); console.log(`build/stills/t-${t}.png`);
  }
  await b.close();
})();
