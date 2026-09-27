// Generates the six narration clips with ElevenLabs.
//   ELEVENLABS_API_KEY=… node scripts/voice.js            → dry run: shows what would be sent
//   ELEVENLABS_API_KEY=… node scripts/voice.js --confirm  → calls the API, writes audio/NN-id.mp3
//   add --only 3 to regenerate a single scene.
// The voice is looked up by name from src/script.json ("voice"); set ELEVENLABS_VOICE_ID to skip the lookup.
const fs = require('fs'), path = require('path'), { ROOT, script } = require('./lib');
const args = process.argv.slice(2), confirm = args.includes('--confirm'), only = args.includes('--only') ? +args[args.indexOf('--only') + 1] : null;
const key = process.env.ELEVENLABS_API_KEY, API = 'https://api.elevenlabs.io';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const SETTINGS = { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true };

(async () => {
  const jobs = script.scenes.map((s, i) => ({ n: i + 1, id: s.id, text: s.elevenlabs, file: path.join(ROOT, 'audio', `${String(i + 1).padStart(2, '0')}-${s.id}.mp3`) }))
    .filter(j => only === null || j.n === only);
  console.log(`voice "${script.voice}", model ${MODEL}, ${jobs.length} clip(s), ~${jobs.reduce((a, j) => a + j.text.length, 0)} characters`);
  for (const j of jobs) console.log(`  ${path.relative(ROOT, j.file)}: ${j.text}`);
  if (!confirm) { console.log('\nDry run. Nothing sent. Re-run with --confirm to generate.'); return; }
  if (!key) throw new Error('Set ELEVENLABS_API_KEY');
  let voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    const name = script.voice.split(' - ')[0];
    const r = await fetch(`${API}/v2/voices?search=${encodeURIComponent(name)}&page_size=50`, { headers: { 'xi-api-key': key } });
    if (!r.ok) throw new Error(`voice search failed: ${r.status} ${await r.text()}`);
    const voices = (await r.json()).voices || [];
    const v = voices.find(v => v.name === script.voice) || voices.find(v => v.name.startsWith(name));
    if (!v) throw new Error(`voice "${script.voice}" not found in this account's voices; add it from the Voice Library or set ELEVENLABS_VOICE_ID. Found: ${voices.map(v => v.name).join(', ')}`);
    voiceId = v.voice_id; console.log(`voice id ${voiceId} (${v.name})`);
  }
  fs.mkdirSync(path.join(ROOT, 'audio'), { recursive: true });
  for (const j of jobs) {
    const r = await fetch(`${API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: j.text, model_id: MODEL, voice_settings: SETTINGS }) });
    if (!r.ok) throw new Error(`${j.id}: ${r.status} ${await r.text()}`);
    fs.writeFileSync(j.file, Buffer.from(await r.arrayBuffer())); console.log(`wrote ${path.relative(ROOT, j.file)}`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
