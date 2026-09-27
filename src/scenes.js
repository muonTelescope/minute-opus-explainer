// gLOWCOST explainer — every frame is drawn here from a time value, so a render
// is deterministic: the same timeline always produces the same video.
// Palette, type and shapes follow the gLOWCOST iPhone app (violet & phosphor).

const W = 1920, H = 1080;
const C = {
  ground: '#120E1A', panel: '#1C1628', sheen: '#231C33', raised: '#261E35',
  hairline: '#3A2F4F', edge: '#5E4A93', ink: '#EEE9F5', muted: '#A89CBF',
  violet: '#9B7BFF', lilac: '#C9B6FF', phosphor: '#5BE3A0', mint: '#A6F5CF', pink: '#FF8FB1',
};
const PAIRS = [C.phosphor, C.mint, C.lilac];
const SANS = 'Raleway', MONO = '"IBM Plex Mono"';

// ---------- small utilities ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const ramp = (t, a, b) => clamp((t - a) / (b - a));            // 0→1 between a and b
const win = (t, a, b, f = 0.4) => Math.min(ramp(t, a, a + f), 1 - ramp(t, b - f, b)); // fade in/out

function rng(seed) {                                            // mulberry32
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function font(px, weight = 600, family = SANS) { return `${weight} ${px}px ${family}`; }

function text(g, s, x, y, { size = 32, weight = 600, family = SANS, color = C.ink, align = 'left', alpha = 1, base = 'alphabetic', track = 0 } = {}) {
  g.save(); g.globalAlpha *= alpha; g.font = font(size, weight, family); g.fillStyle = color;
  g.textAlign = align; g.textBaseline = base; if (track) g.letterSpacing = `${track}px`;
  g.fillText(s, x, y); g.restore();
}

// Uppercase caption, as used for section labels in the app.
const cap = (g, s, x, y, o = {}) => text(g, s.toUpperCase(), x, y, { size: 22, weight: 600, color: C.muted, track: 3, ...o });

// Chamfered panel: top-right and bottom-left corners cut, like the app's cards.
function chamferPath(g, x, y, w, h, c) {
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w - c, y); g.lineTo(x + w, y + c); g.lineTo(x + w, y + h);
  g.lineTo(x + c, y + h); g.lineTo(x, y + h - c); g.closePath();
}
function panel(g, x, y, w, h, { c = 28, alpha = 1, border = C.hairline, fill = null } = {}) {
  g.save(); g.globalAlpha *= alpha; chamferPath(g, x, y, w, h, c);
  if (fill) g.fillStyle = fill; else { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, C.sheen); gr.addColorStop(0.42, C.panel); g.fillStyle = gr; }
  g.fill(); g.strokeStyle = border; g.lineWidth = 2; g.stroke(); g.restore();
}
function chip(g, s, x, y, color, alpha = 1, size = 24) {
  g.save(); g.globalAlpha *= alpha; g.font = font(size, 700); const w = g.measureText(s).width + size * 1.1, h = size * 1.55, c = size * 0.35;
  g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w - c, y); g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h);
  g.lineTo(x + c, y + h); g.lineTo(x, y + h - c); g.lineTo(x, y + c); g.closePath();
  g.fillStyle = hexA(color, 0.16); g.fill(); g.strokeStyle = hexA(color, 0.5); g.lineWidth = 2; g.stroke();
  g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(s, x + size * 0.55, y + h / 2 + 1); g.restore(); return w;
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }

// CH label with stacked paddle digits and colour over/underline (app legend style).
function chLabel(g, i, x, y, { size = 40, color = C.muted, line = PAIRS[i], alpha = 1 } = {}) {
  const pair = [['0', '1'], ['0', '2'], ['1', '2']][i];
  g.save(); g.globalAlpha *= alpha; g.font = font(size, 500, MONO); g.fillStyle = color; g.textBaseline = 'middle';
  const w = g.measureText('CH').width; g.fillText('CH', x, y);
  g.fillStyle = line; g.fillRect(x, y - size * 0.62, w, 3); g.fillRect(x, y + size * 0.56, w, 3);
  g.fillStyle = color; g.font = font(Math.round(size * 0.55), 500, MONO);
  g.fillText(pair[0], x + w + 3, y - size * 0.24); g.fillText(pair[1], x + w + 3, y + size * 0.3);
  g.restore(); return w + size * 0.45;
}

// Muon glyph from the app icon: two tracks crossing a paddle.
function muonMark(g, x, y, s, color = C.lilac, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = Math.max(2, s / 9); g.lineCap = 'square'; const w = s * 0.8;
  g.beginPath(); g.moveTo(x + w * .22, y); g.lineTo(x + w * .40, y + s); g.moveTo(x + w * .52, y); g.lineTo(x + w * .78, y + s);
  g.moveTo(x + w * .08, y + s * .52); g.lineTo(x + w * .92, y + s * .52); g.stroke(); g.restore();
}

function glowLine(g, x1, y1, x2, y2, color, width = 2, alpha = 1, glow = 14) {
  g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round';
  g.shadowColor = color; g.shadowBlur = glow; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
function dot(g, x, y, r, color, alpha = 1, glow = 12) {
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = glow;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.restore();
}

// Faint background tracks, as on the app's Now hero card.
function backdrop(g, t, alpha = 1) {
  g.fillStyle = C.ground; g.fillRect(0, 0, W, H);
  const r = rng(7);
  for (let i = 0; i < 16; i++) {
    const x = r() * W * 1.2 - W * 0.1, dx = (r() - 0.5) * 500, a = 0.03 + r() * 0.05, drift = Math.sin(t * 0.1 + i) * 20;
    glowLine(g, x + drift, 0, x + dx + drift, H, C.lilac, 1.5, a * alpha, 0);
  }
}

function watermark(g, alpha) {
  muonMark(g, 64, 52, 30, C.lilac, alpha * 0.8);
  text(g, 'gLOWCOST', 102, 78, { size: 26, weight: 700, alpha: alpha * 0.8 });
}

// =====================================================================
// Scene 1 — cosmic ray air shower
// =====================================================================
const shower = (() => {
  const r = rng(42), segs = [];
  const topY = 250, groundY = 1000, x0 = 1040;
  function grow(x, y, ang, depth, t0, kind) {
    const len = kind === 'muon' ? (groundY - y) / Math.cos(ang) : 80 + r() * 90;
    const x2 = x + Math.sin(ang) * len, y2 = Math.min(groundY, y + Math.cos(ang) * len);
    const dur = (y2 - y) / 520;                                                     // seconds to draw
    segs.push({ x, y, x2, y2, t0, dur, kind, depth });
    if (kind === 'muon' || depth > 5) return;
    const n = depth < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spread = 0.12 + depth * 0.05, a2 = ang + (r() - 0.5) * spread * 2;
      const becomesMuon = depth >= 2 && r() < 0.35;
      grow(x2, y2, a2, depth + 1, t0 + dur, becomesMuon ? 'muon' : 'hadron');
    }
  }
  grow(x0, topY, 0.05, 0, 0, 'hadron');
  return { segs, topY, groundY, x0 };
})();

function sceneSky(g, t, D) {
  backdrop(g, t, 0.5);
  // stars
  const r = rng(3);
  for (let i = 0; i < 220; i++) {
    const x = r() * W, y = r() * 260, s = r() * 1.8 + 0.4, tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + i);
    dot(g, x, y, s, C.ink, (0.25 + 0.5 * tw) * r(), 0);
  }
  // atmosphere band
  const topY = shower.topY, gy = shower.groundY;
  const band = g.createLinearGradient(0, topY - 30, 0, gy);
  band.addColorStop(0, hexA(C.violet, 0.16)); band.addColorStop(0.25, hexA(C.violet, 0.05)); band.addColorStop(1, hexA(C.violet, 0.0));
  g.fillStyle = band; g.fillRect(0, topY - 30, W, gy - topY + 30);
  glowLine(g, 0, topY - 30, W, topY - 30, C.violet, 1.5, 0.35, 6);
  cap(g, 'Top of the atmosphere · ~15 km up', W - 120, topY + 44, { align: 'right', alpha: ramp(t, 0.6, 1.4) }); if (0) cap(g, '', 0, 0, { alpha: ramp(t, 0.6, 1.4) });
  // ground
  g.fillStyle = C.panel; g.fillRect(0, gy, W, H - gy); glowLine(g, 0, gy, W, gy, C.hairline, 2, 1, 0);
  cap(g, 'Ground', 120, gy + 46, { alpha: ramp(t, 0.6, 1.4) });

  // incoming primary (a proton from deep space)
  const hitT = 2.4, x0 = shower.x0;
  const p = ramp(t, 0.6, hitT), sx = lerp(x0 + 520, x0, easeOut(p)), sy = lerp(-60, topY, easeOut(p));
  if (t < hitT + 0.1) {
    glowLine(g, lerp(x0 + 520, x0, Math.max(0, easeOut(p) - 0.12)), lerp(-60, topY, Math.max(0, easeOut(p) - 0.12)), sx, sy, C.ink, 4, 1, 20);
    dot(g, sx, sy, 7, C.ink, 1, 24);
  }
  if (t > 0.8) {
    text(g, 'proton', x0 + 380, 120, { size: 30, weight: 600, color: C.ink, alpha: win(t, 0.9, hitT + 0.8) });
    text(g, 'from deep space', x0 + 380, 156, { size: 24, weight: 500, color: C.muted, alpha: win(t, 0.9, hitT + 0.8) });
  }
  // collision flash
  const fl = win(t, hitT, hitT + 0.9, 0.15);
  if (fl > 0) { dot(g, x0, topY, 30 * fl, C.ink, fl * 0.8, 60); }

  // shower
  const st = t - hitT;
  for (const s of shower.segs) {
    const k = clamp((st - s.t0) / s.dur); if (k <= 0) continue;
    const x2 = lerp(s.x, s.x2, k), y2 = lerp(s.y, s.y2, k);
    const muon = s.kind === 'muon', color = muon ? C.lilac : C.violet;
    glowLine(g, s.x, s.y, x2, y2, color, muon ? 3 : 1.6, muon ? 0.95 : 0.55, muon ? 14 : 6);
    if (k < 1) dot(g, x2, y2, muon ? 5 : 3, muon ? C.lilac : C.violet, 1, 14);
  }
  // labels
  const la = ramp(t, 5.8, 6.6);
  if (la > 0) {
    const muonSeg = shower.segs.filter(s => s.kind === 'muon').sort((a, b) => b.x2 - a.x2)[0];
    const lx = muonSeg.x2 + 40, ly = 800;
    panel(g, lx, ly - 70, 470, 150, { alpha: la, c: 20 });
    text(g, 'muon  μ', lx + 30, ly - 20, { size: 38, weight: 700, color: C.lilac, alpha: la });
    text(g, 'about 200× the mass of an electron', lx + 30, ly + 28, { size: 24, weight: 500, color: C.muted, alpha: la });
    text(g, 'passes through almost anything', lx + 30, ly + 60, { size: 24, weight: 500, color: C.muted, alpha: la });
  }
  cap(g, 'Cosmic-ray air shower', 120, 140, { size: 26, color: C.lilac, alpha: ramp(t, 3, 3.8) });
  text(g, 'One collision, thousands of particles', 120, 196, { size: 44, weight: 700, alpha: ramp(t, 3.2, 4.0) });
}

// =====================================================================
// Scene 2 — time dilation
// =====================================================================
function sceneRelativity(g, t, D) {
  backdrop(g, t);
  const x = 420, top = 250, bot = 960;
  // altitude ruler
  glowLine(g, x, top, x, bot, C.hairline, 3, 1, 0);
  for (let km = 0; km <= 15; km += 5) {
    const y = lerp(bot, top, km / 15); glowLine(g, x - 16, y, x + 16, y, C.hairline, 3, 1, 0);
    text(g, `${km} km`, x - 34, y + 10, { size: 26, family: MONO, weight: 400, color: C.muted, align: 'right' });
  }
  // falling muon: real one reaches the ground
  const fall = ease(ramp(t, 0.6, 6.8)), my = lerp(top, bot, fall);
  glowLine(g, x, top, x, my, C.lilac, 4, 0.9, 16); dot(g, x, my, 9, C.lilac, 1, 26);
  // naive (no relativity) ghost: decays after ~660 m
  const ghostEnd = lerp(top, bot, 0.66 / 15), gp = ramp(t, 0.6, 2.0);
  const gx = x + 90, gy = lerp(top, ghostEnd, gp);
  if (t < 3.8) {
    glowLine(g, gx, top, gx, gy, C.pink, 3, 0.7 * (1 - ramp(t, 2.8, 3.8)), 10);
    if (gp >= 1) { const b = ramp(t, 2.0, 2.8); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; dot(g, gx + Math.cos(a) * 40 * b, ghostEnd + Math.sin(a) * 40 * b, 3, C.pink, 1 - b, 8); } }
    else dot(g, gx, gy, 7, C.pink, 0.8, 16);
  }
  const noteA = win(t, 1.6, 5.2);
  text(g, 'Without relativity it would decay', gx + 40, ghostEnd + 12, { size: 30, weight: 600, color: C.pink, alpha: noteA });
  text(g, 'after only ~660 m', gx + 40, ghostEnd + 50, { size: 30, weight: 600, color: C.pink, alpha: noteA });

  // clocks
  const cx = 1180, cy = 430, R = 150;
  function clock(x0, label, speed, color, a) {
    g.save(); g.globalAlpha *= a;
    g.beginPath(); g.arc(x0, cy, R, 0, Math.PI * 2); g.fillStyle = C.panel; g.fill(); g.strokeStyle = C.hairline; g.lineWidth = 3; g.stroke();
    for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; glowLine(g, x0 + Math.cos(an) * (R - 18), cy + Math.sin(an) * (R - 18), x0 + Math.cos(an) * (R - 6), cy + Math.sin(an) * (R - 6), C.muted, 3, 1, 0); }
    const an = -Math.PI / 2 + ramp(t, 3.2, 10.5) * speed * Math.PI * 2;
    glowLine(g, x0, cy, x0 + Math.cos(an) * (R - 30), cy + Math.sin(an) * (R - 30), color, 6, 1, 12);
    dot(g, x0, cy, 8, color, 1, 0);
    text(g, label, x0, cy + R + 56, { size: 30, weight: 700, align: 'center', color });
    g.restore();
  }
  const ca = ramp(t, 3.0, 3.8);
  clock(cx, 'Our clock', 3, C.ink, ca);
  clock(cx + 420, "Muon's clock", 0.12, C.lilac, ca);
  text(g, 'At 99.9 % of light speed, the muon’s time runs slow', 1380, 760, { size: 32, weight: 600, align: 'center', alpha: ramp(t, 4.0, 4.8) });
  text(g, 'time dilation', 1380, 810, { size: 28, weight: 500, family: MONO, color: C.phosphor, align: 'center', alpha: ramp(t, 4.4, 5.2) });

  // flux readout
  const fa = ramp(t, 7.4, 8.2);
  if (fa > 0) {
    panel(g, 980, 860, 800, 130, { alpha: fa, c: 22 });
    const n = Math.floor(ramp(t, 7.6, 10.6) * 60);
    // 1 cm² grid with arrivals
    for (let i = 0; i < 3; i++) g.strokeStyle = C.hairline;
    text(g, '≈ 1 muon', 1020, 925, { size: 44, weight: 500, family: MONO, alpha: fa });
    text(g, 'per cm² per minute at sea level', 1020, 965, { size: 26, weight: 500, color: C.muted, alpha: fa });
    const bx = 1660, by = 885; g.save(); g.globalAlpha *= fa; g.strokeStyle = C.phosphor; g.lineWidth = 3; g.strokeRect(bx, by, 80, 80); g.restore();
    text(g, '1 cm²', bx - 18, by + 48, { size: 22, family: MONO, weight: 400, color: C.muted, align: 'right', alpha: fa });
    const blink = win(t % 3, 1.2, 1.8, 0.15);
    if (t > 8) glowLine(g, bx + 36, by - 12, bx + 46, by + 92, C.lilac, 3, blink, 14);
  }
  cap(g, 'Why muons reach us', 120, 160, { size: 26, color: C.lilac, alpha: ramp(t, 0.2, 0.8) });
  text(g, 'Lifetime: 2.2 microseconds', 1180, 190, { size: 40, weight: 700, alpha: ramp(t, 0.6, 1.4) });
  text(g, 'Distance from the sky: ~15 km', 1180, 240, { size: 30, weight: 500, color: C.muted, alpha: ramp(t, 1.0, 1.8) });
}

// =====================================================================
// Scene 3 — scintillator, fibre, SiPM, pulse
// =====================================================================
function sceneDetection(g, t, D) {
  backdrop(g, t);
  cap(g, 'How one muon becomes a signal', 120, 160, { size: 26, color: C.lilac, alpha: ramp(t, 0.2, 0.8) });
  // scintillator tile (perspective slab)
  const tx = 180, ty = 330, tw = 640, th = 90, dep = 120;
  const ta = ramp(t, 0.2, 1.0);
  g.save(); g.globalAlpha *= ta;
  g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + tw, ty); g.lineTo(tx + tw + dep, ty - dep * 0.5); g.lineTo(tx + dep, ty - dep * 0.5); g.closePath();
  g.fillStyle = C.raised; g.fill(); g.strokeStyle = C.edge; g.lineWidth = 2; g.stroke();
  chamferPath(g, tx, ty, tw, th, 16); g.fillStyle = C.panel; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(tx + tw, ty); g.lineTo(tx + tw + dep, ty - dep * 0.5); g.lineTo(tx + tw + dep, ty - dep * 0.5 + th); g.lineTo(tx + tw, ty + th); g.closePath(); g.fillStyle = C.sheen; g.fill(); g.stroke();
  g.restore();
  text(g, 'plastic scintillator tile', tx, ty + th + 60, { size: 30, weight: 700, alpha: ramp(t, 0.8, 1.6) });
  text(g, '20 × 20 cm, about 1 cm thick', tx, ty + th + 98, { size: 24, weight: 500, color: C.muted, alpha: ramp(t, 1.0, 1.8) });

  // muon crossing
  const hit = 1.6, mx = tx + 470, crossY = ty + th / 2;
  const mp = ramp(t, hit - 0.8, hit + 0.8);
  if (mp > 0) glowLine(g, mx - 50, 220, lerp(mx - 50, mx + 50, mp), lerp(220, 1000, mp), C.lilac, 4, 1 - ramp(t, 4, 5) * 0.6, 18);
  // scintillation flash + photons bouncing toward the fibre
  const fl = win(t, hit, hit + 1.0, 0.15);
  if (fl > 0) dot(g, mx, crossY, 60 * fl, C.phosphor, fl * 0.5, 60);
  const fibreStart = { x: tx + tw + 10, y: ty + th * 0.5 };
  const r = rng(11);
  const fibre = [[fibreStart.x, fibreStart.y], [fibreStart.x + 180, fibreStart.y], [fibreStart.x + 260, fibreStart.y + 120], [1260, 470]];
  function bez(k) { const [a, b, c, d] = fibre; const u = 1 - k;
    return [u*u*u*a[0] + 3*u*u*k*b[0] + 3*u*k*k*c[0] + k*k*k*d[0], u*u*u*a[1] + 3*u*u*k*b[1] + 3*u*k*k*c[1] + k*k*k*d[1]]; }
  // fibre drawn
  const fa = ramp(t, 0.8, 1.6);
  g.save(); g.globalAlpha *= fa; g.strokeStyle = hexA(C.phosphor, 0.35); g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(...fibre[0]); g.bezierCurveTo(...fibre[1], ...fibre[2], ...fibre[3]); g.stroke(); g.restore();
  text(g, 'wavelength-shifting fibre', 900, 640, { size: 26, weight: 600, color: C.phosphor, alpha: ramp(t, 3.0, 3.8) });
  for (let i = 0; i < 26; i++) {
    const t0 = hit + r() * 0.35, ang = r() * Math.PI * 2, spd = 200 + r() * 200;
    const k = t - t0; if (k < 0) continue;
    if (k < 0.8) { const px = mx + Math.cos(ang) * spd * k, py = crossY + Math.sin(ang) * 30 * k * 2;
      const bx = clamp(px, tx + 6, tx + tw - 6), by = clamp(py, ty + 6, ty + th - 6); dot(g, bx, by, 4, C.phosphor, 1 - k, 10); }
    // a share of photons enters the fibre and travels along it
    if (i % 3 === 0) { const q = ramp(t, t0 + 0.8, t0 + 2.2); if (q > 0 && q < 1) { const [fx, fy] = bez(q); dot(g, fx, fy, 5, C.phosphor, 1, 14); } }
  }
  // SiPM
  const sx = 1270, sy = 380, ss = 180;
  panel(g, sx, sy, ss, ss, { c: 16, alpha: ramp(t, 1.0, 1.8) });
  const cells = 10, cs = (ss - 28) / cells, fireT = hit + 2.3;
  const r2 = rng(5);
  for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
    const fires = r2() < 0.14, lit = fires ? win(t, fireT + r2() * 0.2, fireT + 1.4, 0.1) : 0;
    g.save(); g.globalAlpha *= ramp(t, 1.0, 1.8); g.fillStyle = lit > 0 ? hexA(C.phosphor, 0.25 + 0.75 * lit) : hexA(C.violet, 0.12);
    if (lit > 0) { g.shadowColor = C.phosphor; g.shadowBlur = 14 * lit; }
    g.fillRect(sx + 14 + i * cs + 1.5, sy + 14 + j * cs + 1.5, cs - 3, cs - 3); g.restore();
  }
  text(g, 'silicon photomultiplier', sx + ss / 2, sy - 56, { size: 28, weight: 700, align: 'center', alpha: ramp(t, 1.4, 2.2) });
  text(g, 'SiPM · thousands of tiny cells, ~55 V', sx + ss / 2, sy - 20, { size: 22, weight: 500, color: C.muted, align: 'center', alpha: ramp(t, 1.6, 2.4) });

  // pulse panel
  const pa = ramp(t, 4.2, 5.0);
  if (pa > 0) {
    const px = 1040, py = 700, pw = 740, ph = 280;
    panel(g, px, py, pw, ph, { alpha: pa });
    cap(g, 'amplified pulse', px + 30, py + 48, { alpha: pa, size: 20 });
    const thrY = py + ph - 150, baseY = py + ph - 40;
    g.save(); g.globalAlpha *= pa; g.setLineDash([10, 10]); g.strokeStyle = C.pink; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 30, thrY); g.lineTo(px + pw - 30, thrY); g.stroke(); g.restore();
    text(g, 'threshold', px + pw - 30, thrY - 14, { size: 22, weight: 600, color: C.pink, align: 'right', alpha: pa });
    const draw = ramp(t, 5.0, 7.0);
    g.save(); g.globalAlpha *= pa; g.strokeStyle = C.phosphor; g.lineWidth = 4; g.shadowColor = C.phosphor; g.shadowBlur = 10; g.beginPath();
    const n = 200, crossX = [];
    for (let i = 0; i <= n * draw; i++) {
      const u = i / n, x = px + 30 + u * (pw - 60);
      const s = u - 0.28, v = s > 0 ? (Math.exp(-s / 0.12) - Math.exp(-s / 0.02)) * 1.35 : 0;
      const y = baseY - v * 190 + Math.sin(u * 90) * 2;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      if (y < thrY) crossX.push(x);
    }
    g.stroke(); g.restore();
    if (crossX.length) {
      const ha = ramp(t, 6.0, 6.4);
      dot(g, crossX[0], thrY, 7, C.phosphor, ha * pa, 14);
      chip(g, 'HIT → counter', crossX.at(-1) + 40, thrY - 74, C.phosphor, ha * pa, 24);
    }
    text(g, 'amplified ~100× · compared to a threshold · one digital hit', px + 30, py + ph + 44, { size: 22, weight: 500, color: C.muted, alpha: ramp(t, 6.4, 7.2) });
  }
}

// =====================================================================
// Scene 4 — coincidences reject noise
// =====================================================================
const coinc = (() => {
  const r = rng(99), noise = [[], [], []], tracks = [];
  for (let ch = 0; ch < 3; ch++) for (let i = 0; i < 70; i++) noise[ch].push(r() * 12);
  const times = [2.2, 3.6, 5.0, 6.1, 7.3, 8.4, 9.3, 10.2, 11.0];
  for (const tt of times) tracks.push({ t: tt, x: 0.2 + r() * 0.6, slope: (r() - 0.5) * 0.9 });
  return { noise, tracks };
})();

function sceneCoincidence(g, t, D) {
  backdrop(g, t);
  cap(g, 'Rejecting noise', 120, 150, { size: 26, color: C.lilac, alpha: ramp(t, 0.2, 0.8) });
  text(g, 'Count only what lines up', 120, 210, { size: 48, weight: 700, alpha: ramp(t, 0.4, 1.2) });
  // three stacked tiles
  const lx = 150, lw = 460, ys = [330, 520, 710], th = 46;
  for (let i = 0; i < 3; i++) {
    panel(g, lx, ys[i], lw, th, { c: 12, alpha: ramp(t, 0.3 + i * 0.15, 1.0 + i * 0.15) });
    text(g, `${i}`, lx - 30, ys[i] + 34, { size: 32, weight: 500, family: MONO, color: C.muted, align: 'right', alpha: ramp(t, 0.6, 1.2) });
  }
  text(g, '~13 cm apart', lx + lw + 30, 560, { size: 22, weight: 500, color: C.muted, alpha: ramp(t, 1.0, 1.6) });

  // timelines
  const rx = 820, rw = 980, rows = [370, 540, 710], span = 3.0;       // seconds of history shown
  const ta = ramp(t, 0.6, 1.4);
  for (let i = 0; i < 3; i++) {
    glowLine(g, rx, rows[i], rx + rw, rows[i], C.hairline, 2, ta, 0);
    text(g, `paddle ${i}`, rx, rows[i] - 52, { size: 22, weight: 600, color: C.muted, alpha: ta });
  }
  cap(g, 'time →', rx + rw, 300, { align: 'right', size: 18, alpha: ta });
  const xAt = when => rx + rw - (t - when) / span * rw;
  // random dark counts (pink = alone, rejected)
  for (let ch = 0; ch < 3; ch++) for (const n of coinc.noise[ch]) {
    if (n > t || t - n > span) continue; const x = xAt(n);
    glowLine(g, x, rows[ch] - 30, x, rows[ch] + 4, C.pink, 3, 0.75 * ta, 6);
  }
  // muon tracks: which paddles does each track cross?
  const counts = [0, 0, 0];
  for (const tr of coinc.tracks) {
    const hits = ys.map(y => { const u = tr.x + tr.slope * (y - ys[1]) / 400; return u > 0.02 && u < 0.98 ? u : null; });
    const pairs = [[0, 1], [0, 2], [1, 2]];
    if (t >= tr.t) pairs.forEach(([a, b], k) => { if (hits[a] !== null && hits[b] !== null) counts[k]++; });
    const age = t - tr.t;
    if (age >= -0.35 && age < 0.9) {                                  // draw the track through the stack
      const u0 = tr.x + tr.slope * (250 - ys[1]) / 400, u1 = tr.x + tr.slope * (820 - ys[1]) / 400, k = ramp(age, -0.35, 0.05);
      const x0 = lx + u0 * lw, x1 = lx + u1 * lw;
      glowLine(g, x0, 250, lerp(x0, x1, k), lerp(250, 820, k), C.lilac, 4, 1 - ramp(age, 0.5, 0.9), 16);
      hits.forEach((u, i) => { if (u !== null && age >= 0) dot(g, lx + u * lw, ys[i] + th / 2, 16, C.phosphor, 1 - ramp(age, 0.2, 0.9), 30); });
    }
    if (age >= 0 && age <= span) {
      const x = xAt(tr.t), lit = hits.filter(h => h !== null).length >= 2;
      hits.forEach((u, i) => { if (u !== null) glowLine(g, x, rows[i] - 36, x, rows[i] + 4, C.phosphor, 5, ta, 14); });
      if (lit) { g.save(); g.globalAlpha *= ta * (0.6 + 0.4 * (1 - ramp(age, 0, 0.8))); g.strokeStyle = C.phosphor; g.lineWidth = 2;
        g.setLineDash([8, 6]); g.strokeRect(x - 18, rows[0] - 60, 36, rows[2] - rows[0] + 80); g.restore(); }
    }
  }
  // window label
  const wa = win(t, 2.6, 7.0);
  text(g, 'coincidence window ± 200 ns', rx + rw - 30, 800, { size: 24, weight: 500, family: MONO, color: C.phosphor, align: 'right', alpha: wa * ta });
  // legend: pink dark counts
  const leg = ramp(t, 1.4, 2.0);
  glowLine(g, rx, 820, rx, 846, C.pink, 3, leg, 6); text(g, 'random sensor noise · ignored', rx + 20, 842, { size: 22, weight: 500, color: C.muted, alpha: leg });

  // counters, app legend style
  const ca = ramp(t, 2.0, 2.8);
  panel(g, 150, 880, 1650, 140, { alpha: ca, c: 24 });
  cap(g, 'coincidences', 190, 935, { alpha: ca, size: 20 });
  for (let k = 0; k < 3; k++) {
    const x = 190 + k * 330; const w = chLabel(g, k, x, 980, { size: 40, alpha: ca });
    text(g, String(counts[k]), x + w + 18, 994, { size: 44, weight: 500, family: MONO, alpha: ca });
  }
  text(g, 'the outer pair sees fewer: fewer paths cross both', 1770, 994, { size: 22, weight: 500, color: C.muted, align: 'right', alpha: ramp(t, 8.0, 8.8) * ca });
}

// =====================================================================
// Scene 5 — pressure and the counting rate (EXAMPLE DATA)
// =====================================================================
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }
const weather = (() => {
  const r = rng(2024), n = 72, P = [], N = [], Nc = [];
  const beta = 0.0015, P0 = 982.9, N0 = 58;                         // rate falls ~0.15 % per hPa (provisional)
  for (let i = 0; i < n; i++) {
    // weather-front sized swings (±15 hPa) over 9 days, 3-hour bins
    const p = P0 + 11 * Math.sin(i / n * Math.PI * 2 * 1.4) + 4 * Math.sin(i / 5) + (r() - 0.5);
    const mean = N0 * Math.exp(-beta * (p - P0));
    const sigma = Math.sqrt(N0 * 180) / 180;                            // Poisson error of a 3-hour bin, per minute
    const noisy = mean + gauss(r) * sigma;
    P.push(p); N.push(noisy); Nc.push(noisy * Math.exp(beta * (p - P0)));
  }
  return { P, N, Nc };
})();

function sceneWeather(g, t, D) {
  backdrop(g, t);
  cap(g, 'Muons and the weather', 120, 150, { size: 26, color: C.lilac, alpha: ramp(t, 0.2, 0.8) });
  text(g, 'More air overhead, fewer muons', 120, 210, { size: 48, weight: 700, alpha: ramp(t, 0.4, 1.2) });
  const px = 120, py = 260, pw = 1680, ph = 620;
  panel(g, px, py, pw, ph, { alpha: ramp(t, 0.3, 1.0) });
  chip(g, 'Example data', px + pw - 250, py + 30, C.muted, ramp(t, 0.6, 1.2), 22);
  const { P, N, Nc } = weather, n = P.length;
  const plotX = px + 60, plotW = pw - 120;
  const draw = ramp(t, 1.0, 5.0);
  function series(vals, y0, h, lo, hi, color, width, alpha, dash) {
    g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = width; g.shadowColor = color; g.shadowBlur = 8; g.lineJoin = 'round';
    if (dash) g.setLineDash(dash); g.beginPath();
    const m = Math.max(1, Math.floor(n * draw));
    for (let i = 0; i < m; i++) { const x = plotX + i / (n - 1) * plotW, y = y0 + h - (vals[i] - lo) / (hi - lo) * h; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.restore();
  }
  const pl = Math.min(...P) - 1, phi = Math.max(...P) + 1, nl = Math.min(...N, ...Nc) - 1, nh = Math.max(...N, ...Nc) + 1;
  // pressure (top), counts (bottom), axes labels
  text(g, 'pressure · hPa', plotX, py + 70, { size: 24, weight: 500, family: MONO, color: C.violet, alpha: ramp(t, 0.8, 1.4) });
  series(P, py + 90, 200, pl, phi, C.violet, 4, ramp(t, 0.8, 1.2));
  text(g, 'muons per minute', plotX, py + 350, { size: 24, weight: 500, family: MONO, color: C.phosphor, alpha: ramp(t, 0.8, 1.4) });
  const corr = ramp(t, 6.0, 7.0);
  series(N, py + 370, 230, nl, nh, C.phosphor, 4, ramp(t, 0.8, 1.2) * (1 - 0.6 * corr));
  if (corr > 0) {
    series(Nc, py + 370, 230, nl, nh, C.ink, 4, corr, [12, 8]);
    text(g, 'corrected for pressure: steady', plotX + plotW, py + 350, { size: 24, weight: 600, color: C.ink, align: 'right', alpha: corr });
  }
  // up/down callout
  const ca = win(t, 3.2, 6.2);
  text(g, 'pressure up  →  count down', px + pw / 2, py + 330, { size: 30, weight: 700, align: 'center', color: C.ink, alpha: ca });
  text(g, 'about −0.15 % per hPa (provisional fit) · simulated example, not a measurement', px + pw / 2, py + ph + 56, { size: 22, weight: 500, color: C.muted, align: 'center', alpha: ramp(t, 4.0, 4.8) });
  text(g, '9 days of 1-minute counts, averaged every 3 hours', plotX, py + ph - 20, { size: 20, weight: 500, family: MONO, color: C.muted, alpha: ramp(t, 1.0, 1.8) * (1 - ca) });
}

// =====================================================================
// Scene 6 — the detector and the title
// =====================================================================
function sceneClose(g, t, D) {
  backdrop(g, t);
  const fade = 1 - ramp(t, D - 1.0, D);
  g.save(); g.globalAlpha = fade;
  // detector sketch: three paddles, readout board
  const a1 = ramp(t, 0.2, 1.0);
  for (let i = 0; i < 3; i++) panel(g, 110, 300 + i * 120, 360, 40, { c: 10, alpha: a1 });
  panel(g, 530, 380, 200, 160, { c: 18, alpha: a1, border: C.edge });
  text(g, 'readout', 630, 450, { size: 24, weight: 600, align: 'center', alpha: a1 });
  text(g, 'SD log', 630, 486, { size: 22, weight: 500, family: MONO, color: C.muted, align: 'center', alpha: a1 });
  for (let i = 0; i < 3; i++) glowLine(g, 470, 320 + i * 120, 530, 460, C.hairline, 2, a1, 0);
  // passing muons keep ticking
  for (let k = 0; k < 4; k++) { const tt = (t + k * 1.3) % 5.2; const x = 190 + k * 70; glowLine(g, x, 240, x + 30, 700, C.lilac, 3, win(tt, 0, 0.8, 0.2) * a1, 14); }
  // phone with live tile
  const a2 = ramp(t, 0.8, 1.6), fx = 820, fy = 190;
  g.save(); g.globalAlpha *= a2; g.beginPath(); g.roundRect(fx, fy, 330, 660, 52); g.fillStyle = '#0B0812'; g.fill(); g.strokeStyle = C.hairline; g.lineWidth = 4; g.stroke(); g.restore();
  panel(g, fx + 22, fy + 400, 286, 150, { c: 18, alpha: a2 });
  muonMark(g, fx + 40, fy + 420, 20, C.lilac, a2);
  text(g, 'MuonP4', fx + 70, fy + 438, { size: 20, weight: 700, alpha: a2 });
  const live = 19 + 16 + 21;                                    // total = sum of the three pairs shown
  text(g, String(live), fx + 40, fy + 500, { size: 46, weight: 500, family: MONO, alpha: a2 });
  text(g, '/min', fx + 108, fy + 500, { size: 18, weight: 400, family: MONO, color: C.phosphor, alpha: a2 });
  for (let k = 0; k < 3; k++) { const w = chLabel(g, k, fx + 40 + k * 90, fy + 528, { size: 18, alpha: a2 }); text(g, String([19, 16, 21][k]), fx + 44 + k * 90 + w, fy + 535, { size: 18, weight: 500, family: MONO, alpha: a2 }); }
  // title
  const a3 = ramp(t, 5.4, 6.2);
  muonMark(g, 1240, 372, 76, C.lilac, a3);
  text(g, 'gLOWCOST', 1320, 440, { size: 96, weight: 800, alpha: a3 });
  text(g, 'a cosmic-muon telescope you can build', 1240, 506, { size: 32, weight: 500, color: C.muted, alpha: ramp(t, 5.9, 6.6) });
  text(g, 'three paddles · coincidence counting', 1240, 560, { size: 22, weight: 500, family: MONO, color: C.phosphor, alpha: ramp(t, 6.3, 7.0) });
  text(g, 'logs every minute, with or without a phone', 1240, 594, { size: 22, weight: 500, family: MONO, color: C.phosphor, alpha: ramp(t, 6.5, 7.2) });
  text(g, 'music: a trio sonata composed from real minute counts · 16 June 2026', 1240, 680, { size: 20, weight: 500, color: C.muted, alpha: ramp(t, 3.0, 3.8) });
  g.restore();
}

const SCENES = { sky: sceneSky, relativity: sceneRelativity, detection: sceneDetection, coincidence: sceneCoincidence, weather: sceneWeather, close: sceneClose };

// timeline: [{id, start, duration, authored}] — scenes are authored against their
// default length and time-scaled when narration makes a scene longer or shorter.
window.renderFrame = function (canvas, timeline, t) {
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = C.ground; g.fillRect(0, 0, W, H);
  const sc = timeline.find(s => t >= s.start && t < s.start + s.duration) || timeline[timeline.length - 1];
  // piecewise-linear warp so each sentence's visuals start with its narration
  const rt = t - sc.start, w = sc.warp || { real: [0, sc.duration], auth: [0, sc.authored] };
  let k = 0; while (k < w.real.length - 2 && rt > w.real[k + 1]) k++;
  const local = w.auth[k] + (rt - w.real[k]) * (w.auth[k + 1] - w.auth[k]) / (w.real[k + 1] - w.real[k]);
  g.save(); SCENES[sc.id](g, local, sc.authored); g.restore();
  if (sc.id !== 'close') watermark(g, 1);
  // short dip between scenes
  const edge = Math.min(t - sc.start, sc.start + sc.duration - t);
  const isFirst = sc === timeline[0], isLast = sc === timeline[timeline.length - 1];
  const fadeIn = isFirst ? ramp(t - sc.start, 0, 0.8) : ramp(t - sc.start, 0, 0.35);
  const fadeOut = isLast ? 1 : ramp(sc.start + sc.duration - t, 0, 0.35);
  const a = 1 - Math.min(fadeIn, fadeOut);
  if (a > 0) { g.globalAlpha = a; g.fillStyle = C.ground; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
};
