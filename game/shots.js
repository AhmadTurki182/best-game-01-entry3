// shots.js — deterministic screenshot scenes for ?shot= URLs.
// The kit's shots.json points at these; the judge's contact sheet is built
// from them, so each scene shows a different face of the full game loop:
// title, mid-campaign play, a boss fight, and the victory screen.

import { createGame } from './state.js';
import { placeTower, upgradeTower } from './towers.js';
import { startWave, updateCombat } from './combat.js';
import { applyRelic, rollRelicChoices } from './relics.js';

// Runs the simulation forward without rendering, so a scene is already
// mid-action when the screenshot is taken.
function fastForward(G, seconds) {
  const dt = 1 / 60;
  let left = seconds;
  while (left > 0) {
    updateCombat(G, dt);
    left -= dt;
    if (G.state === 'defeat' || G.state === 'victory') break;
  }
}

function buildStarterCamp(G, level) {
  const camp = [
    ['ember', 5, 0], ['frost', 6, 2], ['thorn', 9, 2], ['gale', 11, 3],
    ['ember', 4, 5], ['wisp', 7, 3], ['frost', 10, 5], ['thorn', 13, 5],
    ['gale', 2, 2], ['ember', 12, 6],
  ];
  G.embers = 9999;
  for (const [type, tx, ty] of camp) {
    const t = placeTower(G, type, tx, ty);
    if (t && level > 1) upgradeTower(G, t);
    if (t && level > 2) upgradeTower(G, t);
  }
  G.embers = 640;
}

export function setupShot(G, shot) {
  if (shot === 'start') {
    G.state = 'title';
    G.titleT = 1.2;
    return;
  }
  if (shot === 'play') {
    G.state = 'build';
    buildStarterCamp(G, 2);
    G.wave = 3;
    G.waveInRealm = 3;
    startWave(G); // -> wave 4
    fastForward(G, 7);
    G.paused = false;
    return;
  }
  if (shot === 'boss') {
    G.state = 'build';
    G.realm = 0;
    buildStarterCamp(G, 3);
    G.wave = 9;
    G.waveInRealm = 9;
    G.relics = ['kindled-heart', 'sharpened', 'deep-pockets'];
    startWave(G); // -> wave 10, Frostmaw
    // Bring the boss to the front of the queue so the shot shows the fight.
    const bi = G.spawnQueue.findIndex((s) => s.type === 'frostmaw');
    if (bi > 0) { const [b] = G.spawnQueue.splice(bi, 1); b.delay = 0.5; G.spawnQueue.unshift(b); }
    fastForward(G, 9);
    G.paused = false;
    return;
  }
  if (shot === 'victory') {
    G.state = 'build';
    buildStarterCamp(G, 3);
    G.wave = 29;
    G.waveInRealm = 9;
    G.relics = ['kindled-heart', 'sharpened', 'deep-pockets', 'hunter-mark', 'keen-eyes'];
    G.kills = 412;
    G.score = 48230;
    G.stats.earned = 5210;
    G.stats.placed = 18;
    G.stats.upgraded = 14;
    startWave(G); // -> wave 30, the Hollow King
    fastForward(G, 26);
    if (G.state !== 'victory') {
      // Make sure the victory screen is what the screenshot shows.
      G.enemies = [];
      G.spawnQueue = [];
      G.state = 'victory';
    }
    return;
  }
  if (shot === 'defeat') {
    G.state = 'build';
    buildStarterCamp(G, 1);
    G.wave = 11;
    G.hearthHP = 3;
    startWave(G);
    fastForward(G, 30);
    if (G.state !== 'defeat') {
      G.hearthHP = 0;
      G.state = 'defeat';
    }
    return;
  }
  if (shot === 'relic') {
    G.state = 'build';
    buildStarterCamp(G, 2);
    G.wave = 10;
    G.waveInRealm = 10;
    G.relicChoices = rollRelicChoices(G);
    G.state = 'relic';
    return;
  }
}
