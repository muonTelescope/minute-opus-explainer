# Narration for ElevenLabs

**Voice:** Lynda – Bright, Inviting, and Clear
**Model:** Eleven Multilingual v2 (or v3). Suggested settings: stability ≈ 0.55, similarity ≈ 0.75, style ≈ 0.15, speaker boost on.
**Output:** MP3 44.1 kHz. Generate **one clip per scene** and save them into `audio/` with exactly these names. Each scene stretches or shrinks to fit its clip, so natural pacing is fine.

Paste each block as-is; `<break>` tags become pauses. "gLOW COST" is written as two words so it is read "glow cost".

### audio/01-sky.mp3
```
Right now, particles from deep space are slamming into the top of our atmosphere. <break time="0.4s" /> Each collision sets off a shower, and among the debris are muons: heavier cousins of the electron.
```

### audio/02-relativity.mp3
```
A muon lives for just two millionths of a second. <break time="0.3s" /> That should not be long enough to reach the ground. <break time="0.3s" /> But they move so close to the speed of light that time stretches for them, and about one crosses every square centimetre of Earth each minute.
```

### audio/03-detection.mp3
```
To catch them, we use tiles of special plastic that glow when a muon passes through. <break time="0.3s" /> Optical fibres carry that faint flash to a silicon photomultiplier, a sensor so sensitive it can respond to single particles of light.
```

### audio/04-coincidence.mp3
```
But these sensors also fire at random, all on their own. <break time="0.3s" /> So we stack three tiles and only count a muon when two of them flash within the same few hundred billionths of a second. <break time="0.3s" /> Random noise almost never lines up like that. A real muon does.
```

### audio/05-weather.mp3
```
Count them minute by minute, and something surprising appears. <break time="0.3s" /> When air pressure rises, there is more air overhead to stop muons, and the count drops.
```

### audio/06-close.mp3
```
A small detector, logging on its own, watching particles made by the universe. <break time="0.3s" /> This is gLOW COST.
```

The same text (with `<break>` tags) lives in `src/script.json` → `elevenlabs`; the caption text is `narration`. If you edit one, edit both.
