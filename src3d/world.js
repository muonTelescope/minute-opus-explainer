// gLOWCOST in 3D: the same palette, chamfered panels, CH labels and real counts as the 2D video,
// staged as lit, glowing objects. window.render3d(sceneId, t) draws one frame deterministically.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W3 = 1920, H3 = 1080;
const col = h => new THREE.Color(h);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W3, H3); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ---------- shared building blocks ----------
function chamferShape(w, h, c) {                                     // top-right and bottom-left cut, like the app's panels
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x, y + c); s.lineTo(x + c, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h - c); s.lineTo(x + w - c, y + h); s.lineTo(x, y + h); s.closePath();
  return s;
}
function slab(w, h, d, c, mat) {
  const g = new THREE.ExtrudeGeometry(chamferShape(w, h, c), { depth: d, bevelEnabled: true, bevelThickness: d * 0.12, bevelSize: Math.min(w, h) * 0.02, bevelSegments: 3 });
  g.translate(0, 0, -d / 2); return new THREE.Mesh(g, mat);
}
const MAT = {
  panel: () => new THREE.MeshPhysicalMaterial({ color: col(C.panel), roughness: 0.55, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.4 }),
  glass: (tint = C.violet, op = 0.35) => new THREE.MeshPhysicalMaterial({ color: col(tint), roughness: 0.12, metalness: 0, transmission: 0.0, transparent: true, opacity: op, clearcoat: 1, emissive: col(tint), emissiveIntensity: 0.12 }),
  glow: (h, k = 2.6) => new THREE.MeshBasicMaterial({ color: col(h).multiplyScalar(k), toneMapped: false }),
  edge: (h, op = 0.9) => new THREE.LineBasicMaterial({ color: col(h), transparent: true, opacity: op }),
};
function edges(mesh, h, op) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), MAT.edge(h, op)); mesh.add(e); return mesh; }

// Text and 2D UI are painted with the 2D video's helpers onto canvas textures, then placed in space.
function card(wPx, hPx, paint, worldW, { panelBg = true, cut = 28 } = {}) {
  const cv = document.createElement('canvas'); cv.width = wPx; cv.height = hPx; const g = cv.getContext('2d');
  if (panelBg) panel(g, 2, 2, wPx - 4, hPx - 4, { c: cut });
  paint(g); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldW * hPx / wPx), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.9) }));
  return m;
}
function tube(points, r, mat, seg = 64) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, 10), mat); }
function stars(n, R, seed) { const r = rng(seed), p = []; for (let i = 0; i < n; i++) { const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); p.push(R * s * Math.cos(th), R * u, R * s * Math.sin(th)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: col(C.ink), size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7 })); }
function lights(scene, key = C.lilac) {
  scene.add(new THREE.AmbientLight(col(C.ink), 0.25));
  const k = new THREE.DirectionalLight(col('#ffffff'), 1.4); k.position.set(4, 6, 8); scene.add(k);
  const r = new THREE.PointLight(col(key), 30, 30); r.position.set(-5, 3, 4); scene.add(r);
}
function newScene() { const s = new THREE.Scene(); s.background = col(C.ground); s.fog = new THREE.FogExp2(col(C.ground), 0.018); return s; }
function watermark3d(scene, cam) {                                  // screen-anchored logo, top-left
  const m = card(420, 90, g => { muonMark(g, 18, 22, 44, C.lilac); text(g, 'gLOWCOST', 70, 62, { size: 38, weight: 700 }); }, 1.4, { panelBg: false });
  cam.add(m); m.position.set(-3.2, 1.72, -5); scene.add(cam);
}

// ---------- scenes ----------
const SCENES3D = {};

// 1. Sky: the curved limb of the Earth, a glowing atmosphere shell and a 3D air shower.
SCENES3D.sky = t => {
  const s = newScene(); s.fog = null; const cam = new THREE.PerspectiveCamera(38, W3 / H3, 0.1, 400);
  cam.position.set(0, 3.2 + t * 0.05, 15 - t * 0.2); cam.lookAt(0, 0.6, 0); lights(s);
  s.add(stars(1600, 150, 3));
  const R = 40, earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.MeshStandardMaterial({ color: col('#161022'), roughness: 0.95 }));
  earth.position.set(0, -R - 2.2, 0); s.add(earth);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R + 1.2, 128, 96), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide,
    uniforms: { c: { value: col(C.violet) } }, vertexShader: 'varying vec3 n;varying vec3 v;void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 c;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(n,v)),6.);gl_FragColor=vec4(c*1.3,f*.8);}' }));
  atmo.position.copy(earth.position); s.add(atmo);
  // shower: branching tracks from the first collision down to the ground, grown over time
  const r = rng(42), top = new THREE.Vector3(0.4, 4.6, 0), grow = THREE.MathUtils.clamp((t - 1.2) / 5, 0, 1);
  function branch(p, dir, depth, t0) {
    const len = 1.1 + r() * 0.8, q = p.clone().addScaledVector(dir, len), muon = depth >= 2 && r() < 0.4;
    const k = THREE.MathUtils.clamp((grow * 6 - t0) / 1, 0, 1); if (k <= 0) return;
    const end = p.clone().lerp(q, k);
    s.add(tube([p, end], muon ? 0.022 : 0.012, MAT.glow(muon ? C.lilac : C.violet, muon ? 2.6 : 1.5), 4));
    if (muon && k >= 1) { const g2 = q.clone(); g2.y = -2.2; s.add(tube([q, g2], 0.022, MAT.glow(C.lilac, 2.6), 4)); return; }
    if (depth > 3) return;
    for (let i = 0; i < 2 + (depth < 1 ? 1 : 0); i++) { const d = dir.clone().add(new THREE.Vector3((r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.7)).normalize(); branch(q, d, depth + 1, t0 + 1); }
  }
  branch(top, new THREE.Vector3(0.05, -1, 0).normalize(), 0, 0);
  const inT = THREE.MathUtils.clamp(t / 1.2, 0, 1), start = new THREE.Vector3(6, 11, -4);
  s.add(tube([start, start.clone().lerp(top, inT)], 0.03, MAT.glow(C.ink, 3), 8));
  if (t > 1.1) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.25 * Math.max(0, 1 - (t - 1.2) * 0.6), 24, 16), MAT.glow(C.ink, 4)); f.position.copy(top); s.add(f); }
  const lab = card(760, 220, g => { cap(g, 'Cosmic-ray air shower', 40, 70, { color: C.lilac, size: 26 }); text(g, 'One collision,', 40, 130, { size: 50, weight: 700 }); text(g, 'thousands of particles', 40, 188, { size: 50, weight: 700 }); }, 4.2);
  lab.position.set(-4.6, 3.4, 1.5); lab.rotation.y = 0.25; s.add(lab);
  if (t > 5) { const m = card(640, 200, g => { text(g, 'muon  μ', 40, 80, { size: 50, weight: 700, color: C.lilac }); text(g, '~200× the mass of an electron', 40, 140, { size: 30, weight: 500, color: C.muted }); }, 3.2); m.position.set(4.2, -0.6, 1.8); m.rotation.y = -0.3; s.add(m); }
  watermark3d(s, cam); return { s, cam };
};

// 2. Relativity: a glass altitude column, a falling muon with a trail, and two clocks as machined discs.
SCENES3D.relativity = t => {
  const s = newScene(); const cam = new THREE.PerspectiveCamera(36, W3 / H3, 0.1, 200);
  cam.position.set(-1.0 + t * 0.05, 0.4, 20); cam.lookAt(0.8, 0.2, 0); lights(s);
  const col3 = slab(0.6, 10, 0.6, 0.12, MAT.glass(C.violet, 0.18)); col3.position.set(-4.2, 0, 0); edges(col3, C.hairline, 0.8); s.add(col3);
  for (let km = 0; km <= 15; km += 5) { const y = -5 + km / 15 * 10; const tick = card(260, 60, g => text(g, `${km} km`, 250, 44, { size: 34, weight: 400, family: MONO, color: C.muted, align: 'right' }), 1.3, { panelBg: false }); tick.position.set(-5.3, y, 0.3); s.add(tick);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 8, 48), MAT.glow(C.hairline, 1.4)); ring.rotation.x = Math.PI / 2; ring.position.set(-4.2, y, 0); s.add(ring); }
  const fall = THREE.MathUtils.clamp(t / 7, 0, 1), my = 5 - fall * 10;
  s.add(tube([new THREE.Vector3(-4.2, 5, 0), new THREE.Vector3(-4.2, my, 0)], 0.035, MAT.glow(C.lilac, 2.4), 8));
  const mu = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), MAT.glow(C.lilac, 4)); mu.position.set(-4.2, my, 0); s.add(mu);
  function clock(x, speed, label, c) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.18, 96), MAT.panel()); d.rotation.x = Math.PI / 2; d.position.set(x, 1.1, 0); s.add(d);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.04, 12, 96), MAT.glow(C.hairline, 1.5)); rim.position.set(x, 1.1, 0.1); s.add(rim);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, tk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.04), MAT.glow(C.muted, 1)); tk.position.set(x + Math.sin(a) * 1.35, 1.1 + Math.cos(a) * 1.35, 0.12); tk.rotation.z = -a; s.add(tk); }
    const a = t * speed, hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.25, 0.05), MAT.glow(c, 2.6)); hand.geometry.translate(0, 0.62, 0);
    hand.position.set(x, 1.1, 0.16); hand.rotation.z = -a; s.add(hand);
    const lb = card(420, 80, g => text(g, label, 210, 56, { size: 40, weight: 700, color: c, align: 'center' }), 2.8, { panelBg: false }); lb.position.set(x, -0.95, 0.2); s.add(lb);
  }
  clock(1.0, 2.2, 'Our clock', C.ink); clock(5.0, 0.12, "Muon's clock", C.lilac);
  const hd = card(900, 170, g => { text(g, 'Lifetime: 2.2 microseconds', 40, 80, { size: 50, weight: 700 }); text(g, 'Distance from the sky: ~15 km', 40, 138, { size: 34, weight: 500, color: C.muted }); }, 7.0, { panelBg: false }); hd.position.set(3.4, 5.0, 0); s.add(hd);
  if (t > 3) { const td = card(1000, 150, g => { text(g, 'At 99.9 % of light speed, time runs slow', 500, 64, { size: 40, weight: 600, align: 'center' }); text(g, 'time dilation', 500, 124, { size: 36, weight: 500, family: MONO, color: C.phosphor, align: 'center' }); }, 7.6, { panelBg: false }); td.position.set(3.0, -2.4, 0.3); s.add(td); }
  if (t > 6) { const fx = card(900, 180, g => { text(g, '≈ 1 muon', 40, 90, { size: 60, weight: 500, family: MONO }); text(g, 'per cm² per minute at sea level', 40, 146, { size: 32, weight: 500, color: C.muted }); }, 4.4); fx.position.set(2.6, -3.9, 0.8); fx.rotation.x = -0.12; s.add(fx);
    const sq = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), MAT.glass(C.phosphor, 0.25)); edges(sq, C.phosphor, 1); sq.position.set(5.6, -3.9, 0.9); sq.rotation.set(0.4, 0.6 + t * 0.2, 0); s.add(sq); }
  watermark3d(s, cam); return { s, cam };
};

// 3. Detection: a translucent scintillator slab, a glowing fibre and a SiPM chip with lit microcells.
SCENES3D.detection = t => {
  const s = newScene(); const cam = new THREE.PerspectiveCamera(32, W3 / H3, 0.1, 200);
  cam.position.set(-3 + t * 0.15, 5.5, 13); cam.lookAt(0.8, -0.2, 0); lights(s, C.phosphor);
  const tile = slab(6, 6, 0.5, 0.6, MAT.glass(C.violet, 0.32)); tile.rotation.x = -Math.PI / 2 + 0.05; tile.position.set(-2, 0, 0); edges(tile, C.edge, 1); s.add(tile);
  const hitT = 1.4, hit = new THREE.Vector3(-1.6, 0, 0.6);
  if (t > 0.6) { const k = THREE.MathUtils.clamp((t - 0.6) / 1.4, 0, 1); s.add(tube([new THREE.Vector3(-2.2, 6, 0.2), new THREE.Vector3(-2.2, 6, 0.2).lerp(new THREE.Vector3(-1.0, -6, 1.0), k)], 0.035, MAT.glow(C.lilac, 2.6), 8)); }
  if (t > hitT) { const f = Math.max(0, 1 - (t - hitT) * 0.5); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.2 + 0.6 * f, 24, 16), new THREE.MeshBasicMaterial({ color: col(C.phosphor).multiplyScalar(3), transparent: true, opacity: 0.6 * f + 0.1, toneMapped: false })); fl.position.copy(hit); s.add(fl);
    const pl = new THREE.PointLight(col(C.phosphor), 40 * f + 4, 8); pl.position.copy(hit); s.add(pl);
    const r = rng(8); for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = r() * 2.6 * Math.min(1, (t - hitT) * 1.2); const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), MAT.glow(C.phosphor, 3)); p.position.set(hit.x + Math.cos(a) * d, 0.05, hit.z + Math.sin(a) * d * 0.9); s.add(p); } }
  const fib = [new THREE.Vector3(1.0, 0, 0), new THREE.Vector3(2.5, 0.2, 0.4), new THREE.Vector3(3.6, 0.6, -0.4), new THREE.Vector3(4.8, 1.0, -0.2)];
  s.add(tube(fib, 0.06, MAT.glow(C.phosphor, 1.3), 64));
  if (t > hitT + 0.8) { const cur = new THREE.CatmullRomCurve3(fib), k = THREE.MathUtils.clamp((t - hitT - 0.8) / 1.6, 0, 1); for (let j = 0; j < 4; j++) { const kk = k - j * 0.06; if (kk < 0 || kk > 1) continue; const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), MAT.glow(C.phosphor, 4)); p.position.copy(cur.getPoint(kk)); s.add(p); } }
  const chip = new THREE.Mesh(new RoundedBoxGeometry(1.8, 1.8, 0.35, 4, 0.08), MAT.panel()); chip.position.set(5.8, 1.1, -0.2); chip.rotation.y = -0.5; s.add(chip);
  const cellsOn = t > hitT + 2.4, r2 = rng(5);
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { const on = cellsOn && r2() < 0.16, c = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.05), on ? MAT.glow(C.phosphor, 3) : new THREE.MeshStandardMaterial({ color: col(C.raised), emissive: col(C.violet), emissiveIntensity: 0.15 }));
    c.position.set(-0.72 + i * 0.16, -0.72 + j * 0.16, 0.19); chip.add(c); }
  const l1 = card(900, 170, g => { text(g, 'plastic scintillator tile', 40, 76, { size: 46, weight: 700 }); text(g, '20 × 20 cm, about 1 cm thick', 40, 134, { size: 32, weight: 500, color: C.muted }); }, 4.2, { panelBg: false }); l1.position.set(-3.6, -1.6, 2.6); l1.rotation.x = -0.2; s.add(l1);
  const l2 = card(900, 170, g => { text(g, 'silicon photomultiplier', 40, 76, { size: 46, weight: 700 }); text(g, 'SiPM · thousands of tiny cells, ~55 V', 40, 134, { size: 32, weight: 500, color: C.muted }); }, 4.0, { panelBg: false }); l2.position.set(5.6, 3.0, -0.4); l2.rotation.y = -0.4; s.add(l2);
  const l3 = card(700, 80, g => text(g, 'wavelength-shifting fibre', 20, 56, { size: 38, weight: 600, color: C.phosphor }), 3.0, { panelBg: false }); l3.position.set(3.2, -0.5, 1.2); l3.rotation.x = -0.4; s.add(l3);
  if (t > 4) { const pulse = card(900, 360, g => { cap(g, 'amplified pulse', 40, 64, { size: 24 }); g.setLineDash([12, 12]); g.strokeStyle = C.pink; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 170); g.lineTo(860, 170); g.stroke(); g.setLineDash([]);
      g.strokeStyle = C.phosphor; g.lineWidth = 5; g.shadowColor = C.phosphor; g.shadowBlur = 12; g.beginPath(); for (let i = 0; i <= 200; i++) { const u = i / 200, x = 40 + u * 820, sx = u - 0.28, v = sx > 0 ? (Math.exp(-sx / 0.12) - Math.exp(-sx / 0.02)) * 1.35 : 0, y = 300 - v * 200; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.shadowBlur = 0;
      text(g, 'threshold', 860, 154, { size: 26, weight: 600, color: C.pink, align: 'right' }); }, 4.2); pulse.position.set(4.6, -2.6, 1.2); pulse.rotation.set(-0.15, -0.35, 0); s.add(pulse); }
  watermark3d(s, cam); return { s, cam };
};

// 4. Coincidence: three stacked glass paddles, muon tracks through the stack, and floating counters.
SCENES3D.coincidence = t => {
  const s = newScene(); const cam = new THREE.PerspectiveCamera(34, W3 / H3, 0.1, 200);
  cam.position.set(6 - t * 0.15, 3.6, 16); cam.lookAt(-0.2, 0.9, 0); lights(s);
  const ys = [2.2, 0, -2.2];
  ys.forEach((y, i) => { const p = slab(5, 5, 0.35, 0.5, MAT.glass(C.violet, 0.28)); p.rotation.x = -Math.PI / 2; p.position.set(-2, y, 0); edges(p, C.edge, 0.9); s.add(p);
    const lb = card(160, 80, g => text(g, String(i), 80, 60, { size: 56, weight: 500, family: MONO, color: C.muted, align: 'center' }), 0.7, { panelBg: false }); lb.position.set(-5.2, y, 2.4); s.add(lb); });
  const r = rng(99), counts = [0, 0, 0];
  for (let k = 0; k < 14; k++) { const tt = 0.6 + k * 0.9, x = -3.6 + r() * 3.2, z = -1.8 + r() * 3.6, sx = (r() - 0.5) * 1.2, sz = (r() - 0.5) * 1.2;
    const at = y => new THREE.Vector3(x + sx * (y - 0) / 2.2, y, z + sz * (y - 0) / 2.2);
    const hits = ys.map(y => { const p = at(y); return Math.abs(p.x + 2) < 2.5 && Math.abs(p.z) < 2.5 ? p : null; });
    [[0, 1], [0, 2], [1, 2]].forEach(([a, b], j) => { if (t >= tt && hits[a] && hits[b]) counts[j]++; });
    const age = t - tt; if (age < 0 || age > 1.6) continue;
    const kk = THREE.MathUtils.clamp(age / 0.4, 0, 1), top = at(4.5), bot = at(-4.5);
    s.add(tube([top, top.clone().lerp(bot, kk)], 0.03, new THREE.MeshBasicMaterial({ color: col(C.lilac).multiplyScalar(2.4), transparent: true, opacity: 1 - Math.max(0, age - 1) / 0.6, toneMapped: false }), 6));
    hits.forEach(p => { if (!p || age < 0.2) return; const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2 + age * 0.4, 0.03, 8, 40), new THREE.MeshBasicMaterial({ color: col(C.phosphor).multiplyScalar(3), transparent: true, opacity: Math.max(0, 1 - age / 1.6), toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.copy(p); s.add(ring); }); }
  // random dark counts: pink sparks that light only one paddle
  const rn = rng(7); for (let i = 0; i < 60; i++) { const tt = rn() * 14, age = t - tt; if (age < 0 || age > 0.5) continue; const sp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), MAT.glow(C.pink, 2.5 * (1 - age * 2))); sp.position.set(-4.3 + rn() * 4.6, ys[i % 3] + 0.2, -2.3 + rn() * 4.6); s.add(sp); }
  const hd = card(1000, 190, g => { cap(g, 'Rejecting noise', 40, 64, { color: C.lilac, size: 26 }); text(g, 'Count only what lines up', 40, 142, { size: 58, weight: 700 }); }, 7.2, { panelBg: false }); hd.position.set(-2.0, 5.4, -1.5); s.add(hd);
  const ct = card(1200, 250, g => { cap(g, 'coincidences', 40, 60, { size: 24 }); for (let k = 0; k < 3; k++) { const x = 40 + k * 380, w = chLabel(g, k, x, 150, { size: 60 }); text(g, String(counts[k]), x + w + 24, 172, { size: 66, weight: 500, family: MONO }); }
    text(g, '± 200 ns window', 1160, 226, { size: 26, weight: 500, family: MONO, color: C.phosphor, align: 'right' }); }, 5.0); ct.position.set(3.4, -1.6, 1.8); ct.rotation.y = -0.3; s.add(ct);
  const nz = card(760, 70, g => { g.fillStyle = C.pink; g.beginPath(); g.arc(24, 36, 10, 0, 7); g.fill(); text(g, 'random sensor noise · ignored', 50, 48, { size: 32, weight: 500, color: C.muted }); }, 3.2, { panelBg: false }); nz.position.set(3.2, 0.9, 1.6); nz.rotation.y = -0.3; s.add(nz);
  watermark3d(s, cam); return { s, cam };
};

// 5. Weather: an atmosphere column that thickens with pressure over a 3D ribbon chart (example data).
SCENES3D.weather = t => {
  const s = newScene(); const cam = new THREE.PerspectiveCamera(34, W3 / H3, 0.1, 200);
  cam.position.set(-1.5 + t * 0.2, 3.6, 17); cam.lookAt(0, 0.6, 0); lights(s);
  const n = 72, rr = rng(2024), P = [], N = [];
  for (let i = 0; i < n; i++) { const p = 982.9 + 11 * Math.sin(i / n * Math.PI * 2 * 1.4) + 4 * Math.sin(i / 5); P.push(p); const g1 = Math.sqrt(-2 * Math.log(rr() + 1e-12)) * Math.cos(2 * Math.PI * rr()); N.push(58 * Math.exp(-0.0015 * (p - 982.9)) + g1 * 0.57); }
  const draw = THREE.MathUtils.clamp(t / 4, 0, 1), m = Math.max(2, Math.floor(n * draw));
  function ribbon(vals, lo, hi, y0, h, z, c) { const pts = []; for (let i = 0; i < m; i++) pts.push(new THREE.Vector3(-6 + i / (n - 1) * 12, y0 + (vals[i] - lo) / (hi - lo) * h, z)); s.add(tube(pts, 0.05, MAT.glow(c, 1.8), m * 3));
    const shape = new THREE.BufferGeometry(), pos = []; for (let i = 0; i < m - 1; i++) { const a = pts[i], b = pts[i + 1]; pos.push(a.x, y0 - 0.2, z, a.x, a.y, z, b.x, b.y, z, a.x, y0 - 0.2, z, b.x, b.y, z, b.x, y0 - 0.2, z); }
    shape.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); s.add(new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ color: col(c), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }))); }
  ribbon(P, Math.min(...P), Math.max(...P), 1.2, 2.2, -1, C.violet);
  ribbon(N, Math.min(...N) - 1, Math.max(...N) + 1, -2.6, 2.2, 1, C.phosphor);
  const base = slab(13, 7.4, 0.2, 0.6, MAT.panel()); base.rotation.x = -Math.PI / 2; base.position.set(0, -3.2, 0); edges(base, C.hairline, 0.8); s.add(base);
  const hd = card(1100, 190, g => { cap(g, 'Muons and the weather', 40, 64, { color: C.lilac, size: 26 }); text(g, 'More air overhead, fewer muons', 40, 142, { size: 58, weight: 700 }); }, 8.2, { panelBg: false }); hd.position.set(-1.6, 5.4, -1.5); s.add(hd);
  const l1 = card(600, 70, g => text(g, 'pressure · hPa', 10, 50, { size: 38, weight: 500, family: MONO, color: C.violet }), 2.6, { panelBg: false }); l1.position.set(-5.6, 4.0, -1); s.add(l1);
  const l2 = card(600, 70, g => text(g, 'muons per minute', 10, 50, { size: 38, weight: 500, family: MONO, color: C.phosphor }), 2.6, { panelBg: false }); l2.position.set(-5.6, -0.1, 1); s.add(l2);
  const ex = card(420, 100, g => chip(g, 'Example data', 20, 20, C.muted, 1, 36), 1.8, { panelBg: false }); ex.position.set(5.4, 4.2, -1); s.add(ex);
  if (t > 2.5) { const cl = card(900, 90, g => text(g, 'pressure up  →  count down', 450, 62, { size: 50, weight: 700, align: 'center' }), 4.4, { panelBg: false }); cl.position.set(0.5, 0.2, 2.2); s.add(cl); }
  watermark3d(s, cam); return { s, cam };
};

// 6. Close: a 3D iPhone whose screen is drawn from the Swift layout, next to the detector stack, and the title.
let appImg = null;
SCENES3D.close = (t, opts = {}) => {
  const s = newScene(); s.fog = null; const cam = new THREE.PerspectiveCamera(30, W3 / H3, 0.1, 200);
  cam.position.set(1.0 + Math.sin(t * 0.2) * 0.5, 0.4, 19); cam.lookAt(0.6, 0.35, 0); lights(s);
  const env = new THREE.PointLight(col(C.violet), 60, 30); env.position.set(4, 4, 6); s.add(env);
  // detector stack
  [1.6, 0.4, -0.8].forEach(y => { const p = slab(3, 3, 0.22, 0.3, MAT.glass(C.violet, 0.3)); p.rotation.set(-Math.PI / 2 + 0.35, 0.5, 0); p.position.set(-5.6, y, 0); edges(p, C.edge, 0.9); s.add(p); });
  for (let k = 0; k < 3; k++) { const tt = (t + k * 1.4) % 4.2; if (tt < 1) { const x = -6.2 + k * 0.5; s.add(tube([new THREE.Vector3(x, 4, 0.6), new THREE.Vector3(x + 0.4, -3.5, 0.2)], 0.025, MAT.glow(C.lilac, 2.6 * (1 - tt)), 4)); } }
  const rd = card(420, 200, g => { text(g, 'readout', 210, 90, { size: 44, weight: 600, align: 'center' }); text(g, 'SD log', 210, 146, { size: 36, weight: 500, family: MONO, color: C.muted, align: 'center' }); }, 1.9); rd.position.set(-5.4, -2.6, 0.8); s.add(rd);
  // phone: titanium body, glass front, screen texture from iphone.js
  const phone = new THREE.Group(); const bw = 3.93 * 0.9, bh = 8.52 * 0.9;
  const body = new THREE.Mesh(new RoundedBoxGeometry(bw + 0.12, bh + 0.12, 0.42, 8, 0.55), new THREE.MeshPhysicalMaterial({ color: col('#2a2433'), metalness: 0.85, roughness: 0.3, clearcoat: 0.5 })); phone.add(body);
  const cv = document.createElement('canvas'); drawIPhone(cv, opts.phone || 'lock', t, appImg);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const scr = new THREE.Mesh(new RoundedPlane(bw, bh, 0.5), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.9) })); scr.position.z = 0.215; phone.add(scr);
  const glassF = new THREE.Mesh(new RoundedPlane(bw, bh, 0.5), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.05, clearcoat: 1 })); glassF.position.z = 0.22; phone.add(glassF);
  phone.position.set(0.2, 0, 0); phone.rotation.set(-0.06, -0.32 + Math.sin(t * 0.3) * 0.05, 0.02); s.add(phone);
  // title
  if (t > 1.5) { const a = THREE.MathUtils.clamp((t - 1.5) / 1, 0, 1); const ti = card(1300, 560, g => { g.globalAlpha = a; muonMark(g, 20, 40, 120, C.lilac); text(g, 'gLOWCOST', 150, 150, { size: 140, weight: 800 });
      text(g, 'a cosmic-muon telescope you can build', 24, 250, { size: 50, weight: 500, color: C.muted }); text(g, 'three paddles · coincidence counting', 24, 340, { size: 36, weight: 500, family: MONO, color: C.phosphor });
      text(g, 'logs every minute, with or without a phone', 24, 390, { size: 36, weight: 500, family: MONO, color: C.phosphor }); text(g, 'music: a trio sonata composed from real minute counts · 16 June 2026', 24, 480, { size: 28, weight: 500, color: C.muted }); }, 6.2, { panelBg: false });
    ti.position.set(6.0, 0.4, -1); ti.rotation.y = -0.25; s.add(ti); }
  return { s, cam };
};
class RoundedPlane extends THREE.ShapeGeometry {
  constructor(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); super(s, 24);
    const p = this.attributes.position, uv = []; for (let i = 0; i < p.count; i++) uv.push((p.getX(i) - x) / w, (p.getY(i) - y) / h); this.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); }
}

// ---------- render ----------
window.render3d = (id, t, opts) => {
  const { s, cam } = SCENES3D[id](t, opts || {});
  const composer = new EffectComposer(renderer); composer.setSize(W3, H3);
  composer.addPass(new RenderPass(s, cam));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W3, H3), 0.55, 0.35, 0.96));
  composer.addPass(new OutputPass()); composer.render();
  s.traverse(o => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach(m => { m.map?.dispose?.(); m.dispose(); }); });
  composer.dispose();
  return renderer.domElement.toDataURL('image/png');
};
window.phoneScreen = (mode, t) => drawIPhone(document.createElement('canvas'), mode, t, appImg).toDataURL('image/png');
(async () => {
  await Promise.all(['500', '600', '700', '800'].map(w => document.fonts.load(`${w} 40px Raleway`)).concat(['400', '500'].map(w => document.fonts.load(`${w} 40px "IBM Plex Mono"`))));
  appImg = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'now-screen.png'; });
  window.ready3d = true;
})();
