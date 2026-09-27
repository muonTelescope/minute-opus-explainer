// Writes build/gLOWCOST-explainer.srt. Each scene's narration is split into caption
// lines of at most ~42 characters and spread across the voice clip (or the scene)
// in proportion to their length. Re-run after replacing the audio.
const fs = require('fs'), path = require('path'), { ROOT, script, buildTimeline } = require('./lib');

function lines(textIn, max = 42) {
  const out = [];
  for (const sentence of textIn.match(/[^.!?]+[.!?]+/g) || [textIn]) {
    const words = sentence.trim().split(/\s+/); let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) out.push(cur);
  }
  // pair short lines into two-line cues
  const cues = []; for (let i = 0; i < out.length; i += 2) cues.push(out.slice(i, i + 2).join('\n')); return cues;
}
const stamp = s => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };

const timeline = buildTimeline(); let n = 1, srt = '';
script.scenes.forEach((s, i) => {
  const tl = timeline[i], t0 = tl.voice ? tl.voiceStart : tl.start + 0.4, len = tl.voice ? tl.voiceLen : tl.duration - 0.8;
  const sentences = s.narration.match(/[^.!?]+[.!?]+/g) || [s.narration];
  const starts = tl.sentences && tl.sentences.length === sentences.length ? tl.sentences : null;
  if (!starts) {
    const cues = lines(s.narration), total = cues.reduce((a, c) => a + c.length, 0); let t = t0;
    for (const c of cues) { const d = len * c.length / total; srt += `${n++}\n${stamp(t)} --> ${stamp(t + d - 0.05)}\n${c}\n\n`; t += d; }
    return;
  }
  sentences.forEach((sent, k) => {                                  // each sentence spans to the next one's start
    const a = starts[k], b = k + 1 < starts.length ? starts[k + 1] - 0.15 : tl.voiceStart + tl.voiceLen;
    const cues = lines(sent), total = cues.reduce((x, c) => x + c.length, 0); let t = a;
    for (const c of cues) { const d = (b - a) * c.length / total; srt += `${n++}\n${stamp(t)} --> ${stamp(t + d - 0.05)}\n${c}\n\n`; t += d; }
  });
});
fs.writeFileSync(path.join(ROOT, 'build/gLOWCOST-explainer.srt'), srt);
console.log(`captions: ${n - 1} cues → build/gLOWCOST-explainer.srt`);
