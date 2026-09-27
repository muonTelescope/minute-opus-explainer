# gLOWCOST in one minute

A 60-second explainer about the gLOWCOST cosmic-muon detector, for students and the general public. Everything on screen is drawn in code on an HTML canvas in the style of the gLOWCOST iPhone app. The music is a trio sonata in the manner of Corelli, composed and synthesised in code, with its choices seeded by real detector minute counts (`data/muon_20260616_131649.csv`). The only external input is the narration from ElevenLabs.

**Output (1920×1080, 30 fps):** `build/gLOWCOST-explainer.mp4` plus closed captions `build/gLOWCOST-explainer.srt` (a separate file, not burned in).

## Story

| # | Scene | Physics |
|---|---|---|
| 1 | Sky | A cosmic-ray proton hits the upper atmosphere (~15 km) and makes an air shower; muons reach the ground. |
| 2 | Relativity | Muon lifetime 2.2 µs → ~660 m without relativity; time dilation lets them cross ~15 km. ≈1 muon / cm² / min at sea level. |
| 3 | Detection | Plastic scintillator → wavelength-shifting fibre → silicon photomultiplier (SiPM, ~55 V) → ~100× amplifier → threshold → digital hit. |
| 4 | Coincidence | SiPM dark counts are random; a hit only counts when two paddles fire within the FPGA's ±200 ns window. The outer pair sees fewer muons (smaller acceptance). |
| 5 | Weather | More air overhead absorbs more muons: about −0.15 % per hPa (provisional fit). **Simulated example data**, labelled on screen. |
| 6 | Close | Three paddles, readout logging to SD on its own, the phone Live Activity, title, music credit. |

Hardware facts come from [gLOWCOST-2v2-mppcInterface-](https://github.com/tharinduudu/gLOWCOST-2v2-mppcInterface-) (`docs/DETECTOR_FUNCTIONALITY.md`, commit `677fb1b`) and the ESP32-P4 firmware. Deliberate limits: coincidence channels are not described as exclusive subsets, the HV command is never shown as a measured voltage, and the pressure coefficient is labelled provisional.

## Build

Requirements: Node 18+, ffmpeg (or `pip install imageio-ffmpeg`), and Chromium/Chrome (set `CHROME=/path/to/chrome` if Playwright cannot find one).

```sh
npm install
npm run render:preview   # quick 960×540, 15 fps check
npm run render           # final 1080p video + captions + music
npm run preview          # scrub the animation in a browser
```

Useful pieces:
- `node scripts/stills.js 5 16 38` — single frames to `build/stills/`.
- `node scripts/render.js --from 20 --to 32` — render a section.
- `npm run timeline` — scene start times and durations.

## Adding the narration

Follow [ELEVENLABS.md](ELEVENLABS.md), or run `ELEVENLABS_API_KEY=… node scripts/voice.js --confirm`: six clips named `audio/01-sky.mp3` … `audio/06-close.mp3`, then `npm run render`. Each scene is re-timed to its clip (0.6 s lead-in, 0.7 s tail), the music ducks under the voice, the mix is loudness-normalised to −16 LUFS, and the captions are regenerated from the same timings. Scenes without a clip keep their default length.

## Layout

| Path | Purpose |
|---|---|
| `src/script.json` | Narration, ElevenLabs text, default scene lengths |
| `src/scenes.js` | All drawing: palette, app-style panels and CH labels, six scenes |
| `src/index.html` | Canvas page; open via `npm run preview` to scrub |
| `scripts/render.js` | Frame capture → H.264, audio mix |
| `scripts/music.js` | Trio sonata: two violins, cello and harpsichord continuo; data-seeded counterpoint with checks against parallel fifths/octaves |
| `scripts/voice.js` | ElevenLabs narration (dry run by default, `--confirm` to call the API) |
| `data/` | Real minute counts from 16 June 2026 used as the music seed |
| `scripts/captions.js` | SRT captions |
| `assets/fonts/` | Raleway and IBM Plex Mono (SIL Open Font License) |
| `audio/` | Your ElevenLabs clips (not generated) |

`build/` is ignored by git; renders are reproducible from source.
