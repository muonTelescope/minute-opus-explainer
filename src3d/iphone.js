// iPhone screen renderer that mirrors MuonMonitor/Widget/LiveActivityWidget.swift point for point.
// Everything is laid out in points on a 393 × 852 pt iPhone 15 Pro screen and rendered at 3×
// (1179 × 2556 px), the same as the device. Values quoted in comments are the Swift ones.
// System chrome (clock, date, status icons) uses Raleway in place of SF Pro, which cannot be bundled.

const PT = 3, SW = 393, SH = 852;
const ISLAND = { w: 126.0, h: 37.33, y: 11.0 };                  // Dynamic Island hardware cut-out

function sfont(size, weight = 600) { return `${weight} ${size}px Raleway`; }
function mfont(size, weight = 400) { return `${weight} ${size}px "IBM Plex Mono"`; }

// MuonGlyph + MuonMark: width = 0.8·size, stroke max(1.4, size/9), square caps.
function glyph(g, x, y, size, color) {
  const w = size * 0.8; g.save(); g.strokeStyle = color; g.lineWidth = Math.max(1.4, size / 9); g.lineCap = 'square';
  g.beginPath(); g.moveTo(x + w * 0.22, y); g.lineTo(x + w * 0.40, y + size); g.moveTo(x + w * 0.52, y); g.lineTo(x + w * 0.78, y + size);
  g.moveTo(x + w * 0.08, y + size * 0.52); g.lineTo(x + w * 0.92, y + size * 0.52); g.stroke(); g.restore(); return w;
}
function textW(g, s, f) { g.font = f; return g.measureText(s).width; }
function say(g, s, x, y, f, color, align = 'left', base = 'alphabetic') { g.font = f; g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); }

// PhasePill: Raleway 11 bold, padding 7 h / 2 v, chamfer 4, fill tint 16 %, 1 pt stroke tint 45 %.
function phasePill(g, x, cy, label, tint) {
  const f = sfont(11, 700), tw = textW(g, label, f), w = tw + 14, h = 11 * 1.2 + 4, y = cy - h / 2, c = 4;
  g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w - c, y); g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h);
  g.lineTo(x + c, y + h); g.lineTo(x, y + h - c); g.lineTo(x, y + c); g.closePath();
  g.fillStyle = hexA(tint, 0.16); g.fill(); g.strokeStyle = hexA(tint, 0.45); g.lineWidth = 1; g.stroke();
  say(g, label, x + 7, cy + 0.5, f, tint, 'left', 'middle'); return w;
}

// ChannelLabel(size 12, fixed, legendColor): "CH" mono 12 medium, 2 pt vertical padding,
// 1.5 pt rules above/below in the pair colour; stacked digits mono max(11, round(12·0.72)) = 11,
// VStack spacing −digit·0.28, HStack spacing 1.
function channelLabel(g, i, x, cy, size = 12) {
  const pair = [['0', '1'], ['0', '2'], ['1', '2']][i], digit = Math.max(11, Math.round(size * 0.72));
  const f = mfont(size, 500), w = textW(g, 'CH', f), capH = size * 0.72;
  say(g, 'CH', x, cy, f, C.muted, 'left', 'middle');
  g.fillStyle = PAIRS[i]; g.fillRect(x, cy - capH / 2 - 2 - 1.5, w, 1.5); g.fillRect(x, cy + capH / 2 + 2, w, 1.5);
  const df = mfont(digit, 500), dx = x + w + 1, step = digit - digit * 0.28;
  say(g, pair[0], dx, cy - step / 2, df, C.muted, 'left', 'middle'); say(g, pair[1], dx, cy + step / 2, df, C.muted, 'left', 'middle');
  return w + 1 + textW(g, '0', df);
}

// PairLines: three pair series, min/max scaled together, 1.6 pt lines, 2 pt inset.
function pairLines(g, x, y, w, h, series) {
  const all = series.flat(), lo = Math.min(...all), hi = Math.max(Math.max(...all), lo + 1);
  x += 2; y += 2; w -= 4; h -= 4;
  series.forEach((vals, i) => { g.beginPath(); vals.forEach((v, k) => { const px = x + w * k / (vals.length - 1), py = y + h * (1 - (v - lo) / (hi - lo)); k ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.strokeStyle = PAIRS[i]; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); });
}

// Live data for time t (seconds): one detector minute every `period` s, from the real CSV counts.
function liveState(t, period = 2.4) {
  const idx = 29 + Math.floor(t / period) % (LIVE.length - 30), cur = LIVE[idx];
  return { pairs: cur, total: cur[0] + cur[1] + cur[2], series: [0, 1, 2].map(k => LIVE.slice(idx - 29, idx + 1).map(r => r[k])),
    age: Math.floor((t % period) / period * 55) + 3, pressure: 975.7, temperature: 24.8, phase: 'Physics' };
}

// RateReadout: mono 36 medium + 4 pt + "/min" mono 11 in data colour, first-baseline aligned.
function rateReadout(g, x, baseline, total) {
  const f = mfont(36, 500), w = textW(g, String(total), f);
  say(g, String(total), x, baseline, f, C.ink); say(g, '/min', x + w + 4, baseline, mfont(11), C.phosphor); return w + 4 + textW(g, '/min', mfont(11));
}

// ChannelEnvRow: legend (spacing 10, label–count spacing 3, count mono 12 medium) + spacer + EnvLine (mono 11).
function channelEnvRow(g, x, cy, w, s) {
  let cx = x;
  for (let i = 0; i < 3; i++) { cx += channelLabel(g, i, cx, cy) + 3; say(g, String(s.pairs[i]), cx, cy, mfont(12, 500), C.ink, 'left', 'middle'); cx += textW(g, String(s.pairs[i]), mfont(12, 500)) + 10; }
  const parts = [[`${s.pressure.toFixed(1)} hPa`, C.violet], [' · ', C.muted], [`${s.temperature.toFixed(1)} °C`, C.phosphor]];
  let ex = x + w - parts.reduce((a, [t]) => a + textW(g, t, mfont(11)), 0);
  for (const [t, col] of parts) { say(g, t, ex, cy, mfont(11), col, 'left', 'middle'); ex += textW(g, t, mfont(11)); }
}

// LockScreenActivity: padding 16 h / 12 v, VStack spacing 6.
function lockScreenActivity(g, x, y, w, s) {
  const pad = 16, top = y + 12, inner = w - 2 * pad;
  // row 1: glyph 14, spacing 6, "MuonP4" Raleway 14 bold, PhasePill, relative time mono 10 trailing
  const r1 = top + 9;
  let cx = x + pad + glyph(g, x + pad, r1 - 7, 14, C.lilac) + 6;
  say(g, 'MuonP4', cx, r1, sfont(14, 700), C.ink, 'left', 'middle'); cx += textW(g, 'MuonP4', sfont(14, 700)) + 6;
  phasePill(g, cx, r1, s.phase, C.phosphor);
  say(g, `${s.age} sec ago`, x + w - pad, r1, mfont(10), C.muted, 'right', 'middle');
  // row 2 (bottom aligned, spacing 12): RateReadout + ActivityPlot height 52
  const r2top = top + 18 + 6, r2bot = r2top + 52;
  const rw = rateReadout(g, x + pad, r2bot - 4, s.total);
  pairLines(g, x + pad + rw + 12, r2top, inner - rw - 12, 52, s.series);
  // row 3: ChannelEnvRow
  channelEnvRow(g, x + pad, r2bot + 6 + 10, inner, s);
  return 12 + 18 + 6 + 52 + 6 + 20 + 12;                           // height in points
}

function statusBar(g, lock, tint = C.ink) {
  if (!lock) say(g, '9:41', 52, 31, sfont(17, 700), tint, 'center', 'middle');
  // signal, Wi-Fi, battery (right of the island)
  const rx = 338; g.fillStyle = tint;
  for (let i = 0; i < 4; i++) g.fillRect(rx - 34 + i * 4.5, 35 - 4 - i * 2.2, 3, 4 + i * 2.2);
  g.strokeStyle = tint; g.lineWidth = 1.6; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(rx + 1, 36, 3 + k * 3.2, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
  g.beginPath(); g.roundRect(rx + 12, 25.5, 24, 12, 3.5); g.lineWidth = 1; g.globalAlpha = 0.45; g.stroke(); g.globalAlpha = 1;
  g.beginPath(); g.roundRect(rx + 14, 27.5, 16, 8, 2); g.fill();
}

function wallpaper(g, t) {
  const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, '#1d1530'); gr.addColorStop(0.55, '#120E1A'); gr.addColorStop(1, '#0a0710');
  g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
  const rg = g.createRadialGradient(SW * 0.7, SH * 0.28, 10, SW * 0.7, SH * 0.28, 300); rg.addColorStop(0, hexA(C.violet, 0.28)); rg.addColorStop(1, hexA(C.violet, 0));
  g.fillStyle = rg; g.fillRect(0, 0, SW, SH);
  const r = rng(12); g.lineCap = 'round';
  for (let i = 0; i < 14; i++) { const x = r() * SW, dx = (r() - 0.5) * 120; g.strokeStyle = hexA(C.lilac, 0.06 + r() * 0.08); g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + dx, SH); g.stroke(); }
}

function islandShape(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = '#000'; g.fill(); }

// Screen states: 'lock' (Lock Screen Live Activity), 'compact' (Island while another app is open),
// 'expanded' (Island long-pressed). Returns a 1179 × 2556 canvas.
function drawIPhone(canvas, mode, t, appImage) {
  const g = canvas.getContext('2d'); canvas.width = SW * PT; canvas.height = SH * PT;
  g.setTransform(PT, 0, 0, PT, 0, 0); const s = liveState(t);
  if (mode === 'lock') {
    wallpaper(g, t); statusBar(g, true);
    say(g, 'Tuesday 30 September', SW / 2, 104, sfont(21, 600), hexA(C.ink, 0.85), 'center');
    say(g, '9:41', SW / 2, 196, sfont(100, 700), hexA(C.ink, 0.95), 'center');
    // Live Activity banner: system card, 14 pt side insets, 24 pt corners, ground tint 85 % over the wallpaper
    const bx = 14, bw = SW - 28, by = 596;
    g.save(); g.beginPath(); g.roundRect(bx, by, bw, 126, 24); g.fillStyle = hexA(C.ground, 0.85); g.fill(); g.restore();
    lockScreenActivity(g, bx, by, bw, s);                        // 12 + 18 + 6 + 52 + 6 + 20 + 12 = 126 pt tall
    // flashlight / camera buttons and home indicator
    for (const cx of [60, SW - 60]) { g.beginPath(); g.arc(cx, 784, 25, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill(); }
    glyphTorch(g, 60, 784); glyphCamera(g, SW - 60, 784);
    islandShape(g, (SW - ISLAND.w) / 2, ISLAND.y, ISLAND.w, ISLAND.h, ISLAND.h / 2);
  } else {
    // another app in front: the app's own screen, then the Island on top
    if (appImage) { const sc = SW / appImage.width; g.drawImage(appImage, 0, 0, appImage.width, SH / sc, 0, 0, SW, SH); } else { g.fillStyle = C.ground; g.fillRect(0, 0, SW, SH); }
    g.fillStyle = C.ground; g.fillRect(0, 0, SW, 54); statusBar(g, false);
    if (mode === 'compact') {
      // compact: leading MuonMark 14 lilac, trailing total mono 14 medium in data colour, either side of the cut-out
      const w = 200, x = (SW - w) / 2; islandShape(g, x, ISLAND.y, w, ISLAND.h, ISLAND.h / 2);
      glyph(g, x + 16, ISLAND.y + (ISLAND.h - 14) / 2, 14, C.lilac);
      say(g, String(s.total), x + w - 16, ISLAND.y + ISLAND.h / 2 + 0.5, mfont(14, 500), C.phosphor, 'right', 'middle');
    } else {
      // expanded: leading/trailing regions (padding 10 / top 8) and bottom region (padding 12 h, 4 top, 12 bottom)
      const x = 11, w = SW - 22, y = ISLAND.y, h = 192;
      islandShape(g, x, y, w, h, 44);
      const hy = y + 8 + 14;
      const gw = glyph(g, x + 22, hy - 8, 16, C.lilac); say(g, 'MuonP4', x + 22 + gw + 6, hy, sfont(15, 700), C.ink, 'left', 'middle');
      const pw = textW(g, s.phase, sfont(11, 700)) + 14; phasePill(g, x + w - 22 - pw, hy, s.phase, C.phosphor);
      const bx = x + 12 + 12, bw = w - 48, top = y + 8 + 28 + 4 + 6;
      const rw = rateReadout(g, bx, top + 48 - 4, s.total); pairLines(g, bx + rw + 12, top, bw - rw - 12, 48, s.series);
      channelEnvRow(g, bx, top + 48 + 6 + 10, bw, s);
      // Stop button: bordered capsule tinted violet 35 %, Raleway 11 bold, trailing
      const sw = textW(g, 'Stop', sfont(11, 700)) + 24, sy = top + 48 + 6 + 20 + 6;
      g.beginPath(); g.roundRect(bx + bw - sw, sy, sw, 26, 13); g.fillStyle = hexA(C.violet, 0.35); g.fill();
      say(g, 'Stop', bx + bw - sw / 2, sy + 13.5, sfont(11, 700), C.ink, 'center', 'middle');
    }
  }
  // home indicator
  g.beginPath(); g.roundRect((SW - 134) / 2, SH - 13, 134, 5, 2.5); g.fillStyle = hexA(C.ink, 0.85); g.fill();
  return canvas;
}
function glyphTorch(g, x, y) { g.strokeStyle = C.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 5, y - 9); g.lineTo(x + 5, y - 9); g.lineTo(x + 4, y - 3); g.lineTo(x - 4, y - 3); g.closePath(); g.moveTo(x - 4, y - 3); g.lineTo(x - 4, y + 10); g.lineTo(x + 4, y + 10); g.lineTo(x + 4, y - 3); g.stroke(); }
function glyphCamera(g, x, y) { g.strokeStyle = C.ink; g.lineWidth = 1.6; g.beginPath(); g.roundRect(x - 10, y - 6, 20, 14, 3); g.stroke(); g.beginPath(); g.arc(x, y + 1, 4, 0, Math.PI * 2); g.stroke(); }
