# One-shot prompt

This prompt reproduces this project and its final render in one pass. Attach `data/muon_20260616_131649.csv` and a screenshot of the app's Live Activity tile when you use it.

---

**Goal.** Build a complete, reproducible project that renders an explainer video about **gLOWCOST**, a three-paddle cosmic-muon detector, for students and the general public. The video should be about 80–95 s long, 1920×1080 at 30 fps, H.264 MP4 with AAC 48 kHz audio, plus a separate `.srt` caption file (not burned in).

Everything visual must be drawn in code. The music must be composed and synthesised in code. The narration must come from a local speech engine. No stock footage, samples or paid APIs.

Put it in its own repository, not the app's. Commit and push. Then send me the MP4 and the SRT.

**Priority:** explain the physics more than the app.

**Credits:** credit no people. The only on-screen credit is the music line described in Scene 6.

## Toolchain (use exactly this)
- **Node 18+.** Use `playwright-core` driving headless Chromium to render frames from an HTML `<canvas>`. Use `/opt/pw-browsers/chromium-*/chrome-linux/chrome` if present, else a `CHROME` environment variable.
- **ffmpeg with libx264.** If there's no system ffmpeg, `pip install imageio-ffmpeg` and use its binary.
- **Speech:** `apt-get install espeak-ng mbrola mbrola-us1`.
- **Fonts:** vendor Raleway 500/600/700/800 and IBM Plex Mono 400/500 as woff2 files from `@fontsource`, with their OFL licences, into `assets/fonts/`. Explicitly load every weight before the first frame; otherwise the first frames fall back to a serif font.
- **Determinism:** every frame is a pure function of time. Seed all randomness (mulberry32). The same inputs must give byte-identical music.

## Repository layout
- `src/script.json`: holds, per scene:
  - `id`;
  - `seconds`: the authored length;
  - `narration`: the caption text;
  - `anchors`: authored-time beats, one per sentence;
  - optional `realtime`.

  It also holds the global `leadIn` 0.7 and `tailPad` 1.0.
- `src/scenes.js`: all drawing.
- `src/index.html`: the canvas page. It has a scrub bar for previews and a `?render` mode for capture.
- `scripts/lib.js`: builds the timeline.
- `scripts/espeak-voice.js`: the narration.
- `scripts/music.js`: the score.
- `scripts/captions.js`: the SRT.
- `scripts/render.js`: frames → video → mix. Takes `--preview`, `--from/--to` and `--name`.
- `scripts/stills.js`: single frames for checking.
- `data/`: the attached CSV.
- `audio/`: generated clips; git-ignored.
- `build/`: outputs; git-ignored.
- `media/`: the committed final render.
- `README.md` and `MUSIC.md`.
- `npm run render`: runs music, captions and render.

## Visual style (match the gLOWCOST iPhone app)
- **Palette:**
  - ground `#120E1A`, panel `#1C1628`, sheen `#231C33`, raised `#261E35`;
  - hairline `#3A2F4F`, edge `#5E4A93`;
  - ink `#EEE9F5`, muted `#A89CBF`;
  - violet `#9B7BFF` (pressure), lilac `#C9B6FF` (muons);
  - phosphor `#5BE3A0` (physics/data, temperature), mint `#A6F5CF`, pink `#FF8FB1` (alerts/noise only);
  - pair colours: CH⁰₁ phosphor, CH⁰₂ mint, CH¹₂ lilac.
- **Panels:** chamfered, with the top-right and bottom-left corners cut and a sheen→panel gradient.
- **Chips:** octagonal, with a 16% tint fill and a 50% tint border.
- **Section captions:** uppercase with letter-spacing. Titles are Raleway 700. Data text is IBM Plex Mono.
- **Channel labels** are drawn as `CH` followed by the two paddle digits stacked (upper over lower), with a coloured line above and below `CH` in that pair's colour.
- **Muon glyph** (the app icon): two slanted tracks crossing a horizontal paddle line.
- **Backdrop:** faint drifting lilac lines. Top-left watermark on every scene except the last: glyph plus "gLOWCOST".
- **Transitions:** a 0.35 s dip through the ground colour between scenes, and a 0.8 s fade-in at the start.
- **Layout rule:** no text may overlap another label, a line or a panel edge. Keep everything below the watermark (y ≥ 140) and inside panels. Callouts sit beside the data they describe, never on top of it.

## Scientific content (keep these exact limits)
- **Signal path:** a 20×20 cm plastic scintillator about 1 cm thick → wavelength-shifting fibre → a Hamamatsu MPPC/SiPM biased around 55 V → an amplifier (about 100×) → a comparator threshold → an FPGA.
- **Coincidence window:** ±200 ns.
- **Geometry:** three planes about 13 cm apart. The outer pair sees fewer muons because fewer paths cross both, and this depends on geometry.
- **Muons:** lifetime 2.2 µs. Without relativity they would decay after about 660 m. About 1 muon per cm² per minute at sea level.
- **Pressure effect:** about −0.15% per hPa, labelled as a provisional fit.
- **Wording limits:**
  - Never describe the coincidence channels as exclusive subsets.
  - Never show a high-voltage setting as a measured voltage.
  - Label every simulated chart "Example data" and "simulated example, not a measurement".

## Narration: one clip per scene (`audio/NN-id.wav`)
1. **sky:** "Right now, particles from deep space are slamming into the top of our atmosphere. Each collision sets off a shower, and among the debris are muons: heavier cousins of the electron."
2. **relativity:** "A muon lives for just two millionths of a second. That should not be long enough to reach the ground. But they move so close to the speed of light that time stretches for them, and about one crosses every square centimetre of Earth each minute."
3. **detection:** "To catch them, we use tiles of special plastic that glow when a muon passes through. Optical fibres carry that faint flash to a silicon photomultiplier, a sensor so sensitive it can respond to single particles of light."
4. **coincidence:** "But these sensors also fire at random, all on their own. So we stack three tiles and only count a muon when two of them flash within the same few hundred billionths of a second. Random noise almost never lines up like that. A real muon does."
5. **weather:** "Count them minute by minute, and something surprising appears. When air pressure rises, there is more air overhead to stop muons, and the count drops."
6. **close:** "A small detector, logging on its own, watching particles made by the universe. Even this music was shaped by the muons it counted. This is gLOWCOST." Speak "gLOWCOST" as "glow cost".

**Voice:** eSpeak NG with the MBROLA `mb-us1` American female voice. The goal is a smooth, unhurried and warm delivery that never sounds choppy.
- **eSpeak settings:** `-s 165 -p 55 -g 0`. No inserted word gaps; gaps make it choppy.
- **ffmpeg polish chain, in this order:**
  1. `aresample=48000:resampler=soxr`
  2. `atempo=0.9` (slows it down while keeping pitch)
  3. `highpass=f=90`
  4. `lowpass=f=6500`
  5. `equalizer=f=3000:t=q:w=1.2:g=-2`
  6. `equalizer=f=6000:t=q:w=2:g=-5`
  7. `equalizer=f=220:t=q:w=1:g=2`
  8. `acompressor=threshold=0.08:ratio=2.5:attack=15:release=250:makeup=1.5`
  9. `aecho=0.85:0.6:28|47:0.14|0.08`
  10. `loudnorm=I=-18:TP=-2`

## Timing: make it flow with the voice
- **Scene length** = `leadIn` 0.7 + clip length + `tailPad` 1.0. The last scene gets an extra 1.8 s so the title can hold.
- **Sentence detection:** in each clip, run `silencedetect=noise=-38dB:d=0.12`. The N−1 longest pauses, excluding the trailing silence, mark the N sentence starts.
- **Time warp:** warp each scene piecewise-linearly so each authored anchor lands exactly on its sentence start. After the last sentence, play at 1:1 speed; don't stretch.
- **Exception:** the coincidence scene is `realtime`. It plays at 1:1 for the whole clip, with its events generated for 40 s, because a warped scrolling timeline visibly speeds up and slows down.
- **Captions:** each sentence spans from its detected start to the next start; split into lines of at most 42 characters, two lines per cue.

## Scenes (authored seconds and anchors)
1. **sky** (10 s; anchors 0.5, 2.4):
   - a star field and a violet atmosphere band;
   - caption "Top of the atmosphere · ~15 km up", right-aligned just below the band line;
   - a ground strip with "GROUND";
   - a proton streaks in from the top right, labelled "proton / from deep space", and hits at 2.4 s with a flash;
   - a seeded branching air shower grows downward, with violet hadron branches and lilac muon tracks reaching the ground;
   - a panel reading "muon μ · about 200× the mass of an electron · passes through almost anything";
   - header "COSMIC-RAY AIR SHOWER / One collision, thousands of particles".
2. **relativity** (11 s; anchors 0.5, 1.6, 3.0):
   - an altitude ruler from 15 km to 0 km, starting below the section caption;
   - a lilac muon falls to the ground;
   - a pink ghost muon decays after 660 m, labelled "Without relativity it would decay / after only ~660 m";
   - two clock faces: "Our clock" runs fast and "Muon's clock" crawls;
   - "At 99.9% of light speed, the muon's time runs slow" and "time dilation" in mono phosphor;
   - a panel reading "≈ 1 muon per cm² per minute at sea level", with an 80 px phosphor square labelled "1 cm²" to its left and a muon blinking through it;
   - header "Lifetime: 2.2 microseconds / Distance from the sky: ~15 km".
3. **detection** (11 s; anchors 0.3, 2.5):
   - a perspective scintillator slab, labelled "plastic scintillator tile · 20 × 20 cm, about 1 cm thick";
   - a muon crosses to the right of the labels;
   - a phosphor flash, with photons bouncing inside the tile, then travelling along a curved fibre labelled "wavelength-shifting fibre";
   - a SiPM panel with a 10×10 grid of cells, where about 14% light up, labelled "silicon photomultiplier · SiPM · thousands of tiny cells, ~55 V";
   - an "AMPLIFIED PULSE" panel: the pulse is drawn and crosses a dashed pink threshold, with a dot at the crossing point;
   - the chip "HIT → counter" sits to the right of the peak, above the threshold, never on the line;
   - footnote "amplified ~100× · compared to a threshold · one digital hit".
4. **coincidence** (realtime; anchors 0.4, 2.0, 7.0, 8.3):
   - three stacked tiles, numbered 0–2, labelled "~13 cm apart";
   - three scrolling timelines, "paddle 0–2", covering 3 s of history;
   - pink random-noise ticks, with the legend "random sensor noise · ignored";
   - seeded muon tracks with random slopes cross the stack; hit paddles flash phosphor, their ticks line up, and a dashed window box marks each coincidence;
   - "coincidence window ± 200 ns";
   - a counter panel with the CH⁰₁/CH⁰₂/CH¹₂ labels and counts computed from the tracks' geometry;
   - "the outer pair sees fewer: fewer paths cross both";
   - header "REJECTING NOISE / Count only what lines up".
5. **weather** (9 s; anchors 0.5, 3.2):
   - a chart panel with the chip "Example data";
   - top trace: pressure in hPa (violet); bottom trace: muons per minute (phosphor);
   - simulated data: 72 three-hour bins over 9 days, pressure swinging about ±15 hPa, rate = 58·exp(−0.0015·ΔP) plus Poisson noise;
   - callout "pressure up → count down", between the two traces;
   - then a white dashed "corrected for pressure: steady" line;
   - footnote "about −0.15% per hPa (provisional fit) · simulated example, not a measurement";
   - header "MUONS AND THE WEATHER / More air overhead, fewer muons".
6. **close** (10 s; anchors 0.2, 5.0, 7.0; no watermark):
   - left: three paddles wired to a "readout / SD log" box, with muons ticking through;
   - centre: a phone (490×880, radius 64, with a Dynamic Island pill) showing a Lock Screen with "Sunday, September 27" and "9:41", and at the bottom a **Live Activity tile matching the attached screenshot, in the app's style**:
     - dark translucent rounded rectangle;
     - header: glyph, "MuonP4", a green "Physics" chip, and "N sec ago" right-aligned;
     - a large mono rate with "/min" in phosphor;
     - three pair-coloured lines for the last 30 minutes filling the rest of that row;
     - bottom row: CH labels with counts on the left, and "975.7 hPa · 24.8 °C" (violet · phosphor) right-aligned.

     The tile animates: every 2.4 s of video it advances one real minute from the CSV (CH01/CH02/CH12 columns, skipping the start-up row). The rate equals the sum of the three pairs, and "sec ago" counts up and resets on each update.
   - right: title block, revealed **in reading order**:
     1. glyph plus "gLOWCOST" (Raleway 800, 96 px) at about 2.2 s;
     2. "a cosmic-muon telescope you can build";
     3. "three paddles · coincidence counting";
     4. "logs every minute, with or without a phone";
     5. "music: a trio sonata composed from real minute counts · 16 June 2026", on sentence 2.

     The title glows on "This is gLOWCOST". Fade out over the last second.

## Music (`scripts/music.js`): a trio sonata in the manner of Corelli
- **Scoring:** two violins over a continuo of cello and harpsichord, in D major, 4/4, 72 bpm. Its length matches the timeline.
- **Harmony:** four-bar diatonic phrases chosen from:
  - I IV | V I | vi ii | V I
  - I IV | vii iii | vi ii | V I (circle of fifths)
  - vi iii | IV I | ii V | V I
  - I V | vi iii | IV ii | V I

  End with ii V | V I, a trill on the dominant, and a held D major chord with the first violin on F♯.
- **Voice leading:**
  - violin I moves to the nearest chord tone, with 4–3 suspensions and passing quavers;
  - violin II stays mostly a third or sixth below, with occasional imitation half a beat late;
  - the continuo walks in quavers, choosing from three patterns;
  - the harpsichord plays lightly spread triads each half bar;
  - **no parallel fifths or octaves** between any two voices. Verify this with a script and report the count; it must be 0.
- **Data seed:** one CSV minute per half bar, skipping the start-up row:
  - `ch01+ch12`: phrase choice;
  - `ch01`: violin I direction and figures;
  - `ch12`: whether a suspension happens;
  - `ch02`: violin II's third or sixth, and its imitation;
  - `gpio5+gpio6`: the bass pattern.
- **Synthesis:**
  - band-limited sawtooth wavetables with a body resonance and delayed 5.3 Hz vibrato, for the strings;
  - Karplus–Strong strings for the harpsichord, which also doubles the bass;
  - Schroeder reverb (four damped combs and two all-passes);
  - a gentle fade in and out;
  - 16-bit 44.1 kHz WAV output.

## Mix and render
- **Frame capture:** capture each frame with `canvas.toDataURL` and pipe PNGs to `libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart`.
- **Mix:**
  - place each clip at scene start + `leadIn` with `adelay`, mix the clips, then `apad`;
  - music bed at `volume=0.25`, **side-chain ducked** under the voice with `sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600`;
  - then `loudnorm=I=-16:TP=-1.5:LRA=11`, AAC 192 kbps at 48 kHz;
  - set the length with `-t` to the full timeline. Do **not** use `-shortest`, or the ending gets cut off.
- **Section renders:** `--from/--to` should only mix clips inside that range.
- **Speed:** a full render should take about a minute.

## Quality checks before delivering (do them and report the results)
1. Render a contact sheet with one frame every 2.5 s, plus close-up stills of every labelled panel. Fix any text overlap, any label crossing a line or border, anything cut off at the frame edge, and any black frames before the end.
2. Confirm each scene's visual beat starts with its sentence, that motion never visibly speeds up or slows down, and that the ending holds the title for at least 2 s.
3. Music check: parallel fifths/octaves = 0; violins mostly in thirds and sixths; every voice within its range.
4. Confirm the durations of the clips, scenes and final MP4; the audio is 48 kHz, stereo and not clipped; and the SRT cues line up with the detected sentences.
5. State what you could not verify, such as listening to the audio yourself.

**Deliver:** the pushed repo, the MP4 and SRT (also copied into `media/`), and a short summary of the timeline (scene starts and lengths) and anything left unverified.
