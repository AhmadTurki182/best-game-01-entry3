// main.js — boot, the fixed-timestep game loop, and the debug handle.
// EMBERHOLD is a single canvas game: one requestAnimationFrame loop drives
// combat (or the title ambience), music, and rendering at 1280x720.

import { createGame, W, H } from './state.js';
import { updateCombat, updateIdle } from './combat.js';
import { render } from './render.js';
import { attachInput } from './ui.js';
import { updateMusic, initAudio } from './audio.js';
import { setupShot } from './shots.js';

let G = createGame();
let canvas, ctx;
let last = 0;
let acc = 0;
const STEP = 1 / 60;

function restart() {
  // Mutate the same object in place: input handlers captured this reference.
  const seed = G.seed + 1;
  const muted = G.muted;
  const fresh = createGame(seed);
  fresh.muted = muted;
  fresh.state = 'build';
  fresh.message = 'A new campaign begins — build, then start wave 1.';
  fresh.messageUntil = 5;
  for (const k of Object.keys(G)) delete G[k];
  Object.assign(G, fresh);
  window.__game = G;
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (!last) last = ts;
  let dt = (ts - last) / 1000;
  last = ts;
  if (dt > 0.25) dt = 0.25;

  if (!G.paused) {
    acc += dt * G.speed;
    let guard = 0;
    while (acc >= STEP && guard++ < 8) {
      acc -= STEP;
      if (G.state === 'wave') updateCombat(G, STEP);
      else updateIdle(G, STEP);
    }
    updateMusic(G, dt);
  }
  render(G, ctx);
}

function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  attachInput(G, canvas, restart);
  canvas.addEventListener('pointerdown', () => initAudio(G), { once: true });

  // Screenshot scenes: ?shot=start|play|boss|victory|defeat|relic&seed=N
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  const seed = Number(q.get('seed') || 20261118);
  if (seed) G.seed = seed;
  if (shot) {
    setupShot(G, shot);
    window.__shotReady = true;
  } else {
    window.__shotReady = true;
  }

  window.__game = G;
  window.__restart = restart;
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
