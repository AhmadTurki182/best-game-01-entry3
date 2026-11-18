// ui.js — mouse and keyboard input: shop cards, the start button, HUD buttons,
// tower selection / upgrade / sell, relic picks, and every screen transition.

import { TILE, PLAY_TOP, COLS, towerAt } from './state.js';
import { TOWER_ORDER, TOWER_DEFS, placeTower, upgradeTower, sellTower, canPlace } from './towers.js';
import { startWave } from './combat.js';
import { applyRelic } from './relics.js';
import { initAudio, sfx } from './audio.js';
import {
  shopCardRect, startButtonRect, hudButtonRect, towerPanelRects, relicCardRect, inRect,
} from './render.js';

function canvasPos(e) {
  const r = e.target.getBoundingClientRect();
  const scaleX = 1280 / r.width;
  const scaleY = 720 / r.height;
  return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
}

export function attachInput(G, canvas, restart) {
  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    G.mouse = p;
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor((p.y - PLAY_TOP) / TILE);
    G.hover = { tx, ty };
  });
  canvas.addEventListener('mouseleave', () => { G.hover = null; });

  canvas.addEventListener('click', (e) => {
    initAudio(G);
    const p = canvasPos(e);
    handleClick(G, p, restart);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); if (G.state === 'build') { initAudio(G); startWave(G); } return; }
    if (k === 'f') { G.speed = G.speed === 1 ? 2 : 1; return; }
    if (k === 'p') { if (G.state === 'wave' || G.state === 'build') G.paused = !G.paused; return; }
    if (k === 'm') { G.muted = !G.muted; return; }
    if (k === 'r') { if (G.state === 'victory' || G.state === 'defeat') restart(); return; }
    if (k === 'escape') { G.selected = null; return; }
    if (G.state === 'relic' && ['1', '2', '3'].includes(k)) {
      const id = G.relicChoices[Number(k) - 1];
      if (id) { applyRelic(G, id); sfx(G, 'relic'); }
      return;
    }
    const idx = TOWER_ORDER.findIndex((t) => TOWER_DEFS[t].key === k);
    if (idx >= 0 && (G.state === 'build' || G.state === 'wave')) {
      G.buildType = TOWER_ORDER[idx];
      G.selected = null;
      sfx(G, 'click');
    }
  });
}

function handleClick(G, p, restart) {
  // Title / end screens: any click advances.
  if (G.state === 'title') {
    G.state = 'build';
    G.message = 'Build your first towers, then press START WAVE.';
    G.messageUntil = G.time + 5;
    sfx(G, 'horn');
    return;
  }
  if (G.state === 'victory' || G.state === 'defeat') { restart(); return; }

  // Relic modal.
  if (G.state === 'relic') {
    for (let i = 0; i < G.relicChoices.length; i++) {
      if (inRect(relicCardRect(i), p.x, p.y)) {
        applyRelic(G, G.relicChoices[i]);
        sfx(G, 'relic');
        return;
      }
    }
    return;
  }

  // HUD buttons.
  for (let i = 0; i < 3; i++) {
    if (inRect(hudButtonRect(i), p.x, p.y)) {
      if (i === 0) G.speed = G.speed === 1 ? 2 : 1;
      if (i === 1 && (G.state === 'wave' || G.state === 'build')) G.paused = !G.paused;
      if (i === 2) G.muted = !G.muted;
      sfx(G, 'click');
      return;
    }
  }

  // Selected tower panel buttons.
  if (G.selected) {
    const R = towerPanelRects();
    if (inRect(R.upgrade, p.x, p.y)) {
      if (upgradeTower(G, G.selected)) sfx(G, 'upgrade'); else sfx(G, 'error');
      return;
    }
    if (inRect(R.sell, p.x, p.y)) {
      sellTower(G, G.selected);
      sfx(G, 'coin');
      return;
    }
  }

  // Shop cards.
  if (p.y >= 720 - 96) {
    for (let i = 0; i < TOWER_ORDER.length; i++) {
      if (inRect(shopCardRect(i), p.x, p.y)) {
        G.buildType = TOWER_ORDER[i];
        G.selected = null;
        sfx(G, 'click');
        return;
      }
    }
    if (inRect(startButtonRect(), p.x, p.y)) {
      if (G.state === 'build') startWave(G);
      return;
    }
    return;
  }

  // Play area: select a placed tower, or build on an empty tile.
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor((p.y - PLAY_TOP) / TILE);
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= 7) return;
  const existing = towerAt(G, tx, ty);
  if (existing) {
    G.selected = existing;
    sfx(G, 'click');
    return;
  }
  if (G.state === 'build' || G.state === 'wave') {
    const t = placeTower(G, G.buildType, tx, ty);
    if (t) { sfx(G, 'place'); G.selected = null; }
    else sfx(G, 'error');
  }
}
