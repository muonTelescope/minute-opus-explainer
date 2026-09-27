# Music

## Generated score (default)

`scripts/music.js` composes and synthesises the score from scratch; no samples or recordings:

- **Form:** a trio sonata movement in the manner of Arcangelo Corelli. Two violins over a continuo of cello and harpsichord, D major, 72 bpm, 4/4, about 17 bars, ending with a trilled cadence.
- **Harmony:** four-bar diatonic phrases (I–IV–V–I, a circle-of-fifths sequence I–IV–vii–iii–vi–ii–V–I, and two relatives) with a final ii–V–I cadence.
- **Voice leading:**
  - violin I moves to the nearest chord tone, with 4–3 suspensions and passing notes;
  - violin II keeps mostly a third or sixth below;
  - the continuo walks in quavers;
  - both violins avoid parallel fifths and octaves.
- **Data seed:** each half bar reads the next minute of `data/muon_20260616_131649.csv`, skipping the start-up row. The counts choose:
  - `ch01+ch12`: the phrase order;
  - `ch01`: violin I's direction and figures;
  - `ch12`: whether a suspension happens;
  - `ch02`: violin II's third or sixth, and its imitation;
  - `gpio5+gpio6`: the bass pattern.
- **Synthesis:** band-limited string wavetables with delayed vibrato, and Karplus–Strong strings for the harpsichord, in a small-hall reverb. Output is deterministic: the same data always gives the same file.

Run `npm run music` to write `build/music.wav`.

## ElevenLabs Music alternative

To use an ElevenLabs track instead, save it as `audio/music.mp3`; the renderer uses it in place of the generated score and still ducks it under the voice.

**Prompt** (ElevenLabs Music, length 65 s, instrumental):

> Instrumental Baroque trio sonata in the style of Arcangelo Corelli, slow and graceful Grave–Andante at about 72 BPM in D major, 4/4. Two solo violins in close imitation, moving mostly in thirds and sixths with gentle 4–3 suspensions, over a basso continuo of cello playing a steady walking bass in eighth notes and a harpsichord realising the chords. Circle-of-fifths sequences, clear four-bar phrases, and a final cadence with a violin trill resolving to a held D major chord. Period instruments, gut strings, little vibrato, intimate chamber-hall acoustic, warm and luminous, contemplative and quietly wondrous. Leave room for a spoken narration: moderate dynamics, no sudden accents, no percussion, no choir, no synthesizers. Fade in over the first second and end cleanly on the final chord at about 64 seconds.

The generated score is actually shaped by the detector data; an ElevenLabs track only matches its style, so the on-screen credit ("composed from real minute counts") should be removed if you use one.
