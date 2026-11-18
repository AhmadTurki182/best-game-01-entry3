// enemies.js — enemy types, the three bosses, and wave spawning.
// Enemy HP scales with the wave so the late game stays threatening.

import { REALMS } from './state.js';

export const ENEMY_DEFS = {
  imp:     { name: 'Cinder Imp',   hp: 30,  speed: 58, reward: 4,  radius: 11, color: '#ff9d5c', dark: '#c25e1e', dmg: 1 },
  moth:    { name: 'Ash Moth',     hp: 22,  speed: 88, reward: 5,  radius: 10, color: '#d8c9ff', dark: '#8a76c9', dmg: 1 },
  husk:    { name: 'Hollow Husk',  hp: 130, speed: 34, reward: 8,  radius: 15, color: '#a8b8a0', dark: '#5d7057', dmg: 1 },
  shade:   { name: 'Shade',        hp: 48,  speed: 74, reward: 7,  radius: 11, color: '#7b6fd0', dark: '#453a8f', dmg: 1 },
  splitter:{ name: 'Splitter',     hp: 95,  speed: 42, reward: 9,  radius: 13, color: '#7ee081', dark: '#3d8b40', dmg: 1, splits: 2 },
  wisp:    { name: 'Gloom Wisp',   hp: 28,  speed: 104,reward: 6,  radius: 9,  color: '#8ef2ff', dark: '#2a9db5', dmg: 1 },
  golem:   { name: 'Ash Golem',    hp: 340, speed: 25, reward: 14, radius: 19, color: '#b09a8a', dark: '#6e5a4e', dmg: 2 },
  eater:   { name: 'Ember Eater',  hp: 210, speed: 31, reward: 12, radius: 16, color: '#ff5d5d', dark: '#a12727', dmg: 2 },
  frostmaw:{ name: 'Frostmaw the Pale', hp: 2200, speed: 23, reward: 160, radius: 30, color: '#bfe9ff', dark: '#5a8fb5', dmg: 5, boss: true },
  matriarch:{ name: 'Matriarch of Hollows', hp: 4200, speed: 21, reward: 260, radius: 32, color: '#d9a0ff', dark: '#7a3fa0', dmg: 6, boss: true },
  hollowking:{ name: 'The Hollow King', hp: 7000, speed: 19, reward: 500, radius: 36, color: '#ff5d8f', dark: '#8f1d47', dmg: 8, boss: true },
};

export function hpScale(wave) {
  // Gentle early ramp, steep late ramp: wave 30 enemies are ~9x wave 1.
  return 1 + 0.12 * (wave - 1) + 0.005 * (wave - 1) * (wave - 1);
}

export function spawnEnemy(G, type) {
  const def = ENEMY_DEFS[type];
  const hp = Math.round(def.hp * hpScale(Math.max(1, G.wave)));
  const start = G.pathPx[0];
  const e = {
    type, name: def.name, boss: !!def.boss,
    x: start.x, y: start.y,
    hp, maxHp: hp,
    speed: def.speed * (0.92 + Math.random() * 0.16),
    radius: def.radius, color: def.color, dark: def.dark,
    reward: def.reward, dmg: def.dmg,
    pathIdx: 1,
    slowUntil: 0, slowFactor: 1,
    burnUntil: 0, burnDps: 0,
    splits: def.splits || 0,
    wobble: Math.random() * 6.28,
    hitFlash: 0, spawnT: 0,
    minionTimer: 2 + Math.random() * 2,
  };
  G.enemies.push(e);
  return e;
}

// Build the spawn queue for the coming wave from state.waveComp.
export function buildWaveQueue(G, comp) {
  const q = [];
  for (const group of comp) {
    for (let i = 0; i < group.count; i++) q.push({ type: group.type, delay: group.gap });
  }
  return q;
}

export function bossOfRealm(realm) {
  return realm === 0 ? 'frostmaw' : realm === 1 ? 'matriarch' : 'hollowking';
}

export function realmName(realm) { return REALMS[realm].name; }
