// audio.js — all sound is synthesized with WebAudio: no audio files.
// Short blips for shots and coins, a horn for waves, jingles for win/loss,
// and a quiet pentatonic pluck loop that keeps the grove alive.

let ctx = null;
let master = null;
let musicTimer = 0;
let nextNote = 0;

export function initAudio(G) {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, lowpass) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

const SFX = {
  shoot: () => tone(520 + Math.random() * 120, 0.08, 'square', 0.05, 260),
  zap: () => { tone(1200, 0.09, 'sawtooth', 0.05, 300); noise(0.06, 0.03, 4000); },
  thud: () => tone(180, 0.12, 'sine', 0.09, 70),
  boom: () => { noise(0.25, 0.12, 900); tone(90, 0.2, 'sine', 0.1, 40); },
  pop: () => tone(700 + Math.random() * 200, 0.07, 'triangle', 0.06, 900),
  coin: () => { tone(880, 0.07, 'sine', 0.05); setTimeout(() => tone(1320, 0.09, 'sine', 0.05), 60); },
  place: () => { tone(300, 0.1, 'triangle', 0.12, 500); noise(0.05, 0.04, 2000); },
  upgrade: () => { [440, 554, 659].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.1), i * 70)); },
  horn: () => { tone(196, 0.5, 'sawtooth', 0.08, 196); tone(294, 0.5, 'sawtooth', 0.05, 294); },
  boss: () => { tone(110, 0.9, 'sawtooth', 0.14, 55); noise(0.7, 0.08, 500); },
  bossdie: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.1), i * 90)); },
  leak: () => { tone(220, 0.25, 'sawtooth', 0.12, 110); },
  clear: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.09), i * 80)); },
  relic: () => { [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.09), i * 90)); },
  phoenix: () => { [659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.1), i * 110)); },
  win: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.11), i * 130)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sawtooth', 0.08), i * 180)); },
  click: () => tone(600, 0.05, 'square', 0.04),
  error: () => tone(140, 0.15, 'square', 0.07, 90),
};

export function sfx(G, name) {
  if (!G || G.muted) return;
  const fn = SFX[name];
  if (fn) fn();
}

// A sparse pentatonic pluck loop; called every frame from the main loop.
export function updateMusic(G, dt) {
  if (!ctx || G.muted || G.state === 'title') return;
  musicTimer -= dt;
  if (musicTimer > 0) return;
  musicTimer = 0.9 + Math.random() * 1.6;
  const scale = [220, 261.6, 293.7, 329.6, 392, 440];
  const f = scale[Math.floor(Math.random() * scale.length)];
  tone(f, 1.4, 'sine', 0.035);
  if (Math.random() < 0.3) setTimeout(() => tone(f * 1.5, 1.2, 'sine', 0.025), 220);
}
