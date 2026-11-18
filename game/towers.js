// towers.js — the five tower types, placement, upgrades and selling.
// Each tower has 3 levels; the Wisp Lantern buffs its neighbours instead of shooting.

import { tileCenter, clamp } from './state.js';

export const TOWER_DEFS = {
  ember: {
    name: 'Ember Spire', short: 'Ember', key: '1',
    desc: 'Hurls fireballs that set enemies burning.',
    cost: 50, range: 135, damage: 14, rate: 1.25, projSpeed: 420,
    kind: 'fire', burnDps: 7, burnDur: 2, splash: 0, chain: 0, slow: 0, slowDur: 0,
    color: '#ff7b2f', color2: '#ffb347',
    up: [
      { cost: 45, damage: 24, burnDps: 11, range: 145 },
      { cost: 80, damage: 50, burnDps: 18, range: 155, splash: 45 },
    ],
  },
  frost: {
    name: 'Frost Shard', short: 'Frost', key: '2',
    desc: 'Chills enemies, slowing them to a crawl.',
    cost: 60, range: 125, damage: 9, rate: 1.0, projSpeed: 480,
    kind: 'frost', burnDps: 0, burnDur: 0, splash: 0, chain: 0, slow: 0.45, slowDur: 1.6,
    color: '#7fd4ff', color2: '#d6f4ff',
    up: [
      { cost: 50, damage: 15, slow: 0.55, slowDur: 1.9, range: 135 },
      { cost: 90, damage: 32, slow: 0.65, slowDur: 2.2, range: 145 },
    ],
  },
  thorn: {
    name: 'Thorn Bramble', short: 'Thorn', key: '3',
    desc: 'Lobs bursting seed-pods: heavy splash damage.',
    cost: 80, range: 115, damage: 22, rate: 0.75, projSpeed: 300,
    kind: 'thorn', burnDps: 0, burnDur: 0, splash: 55, chain: 0, slow: 0, slowDur: 0,
    color: '#9dff57', color2: '#4caf50',
    up: [
      { cost: 65, damage: 36, splash: 70, range: 125 },
      { cost: 110, damage: 68, splash: 90, range: 135 },
    ],
  },
  gale: {
    name: 'Gale Bell', short: 'Gale', key: '4',
    desc: 'Rings storm-bells: lightning chains between foes.',
    cost: 100, range: 195, damage: 13, rate: 0.9, projSpeed: 900,
    kind: 'storm', burnDps: 0, burnDur: 0, splash: 0, chain: 2, slow: 0, slowDur: 0,
    color: '#ffe45e', color2: '#fff3a0',
    up: [
      { cost: 85, damage: 21, chain: 3, range: 210 },
      { cost: 140, damage: 40, chain: 4, range: 225 },
    ],
  },
  wisp: {
    name: 'Wisp Lantern', short: 'Wisp', key: '5',
    desc: 'No attack — its light empowers nearby towers.',
    cost: 70, range: 120, damage: 0, rate: 0, projSpeed: 0,
    kind: 'aura', burnDps: 0, burnDur: 0, splash: 0, chain: 0, slow: 0, slowDur: 0,
    color: '#e0b3ff', color2: '#f3e5ff',
    buff: 0.25,
    up: [
      { cost: 60, buff: 0.35, range: 130 },
      { cost: 100, buff: 0.5, range: 145 },
    ],
  },
};

export const TOWER_ORDER = ['ember', 'frost', 'thorn', 'gale', 'wisp'];

export function towerStats(G, t) {
  const def = TOWER_DEFS[t.type];
  const s = { ...def, level: t.level };
  for (let i = 0; i < t.level - 1; i++) Object.assign(s, def.up[i]);
  // Relic modifiers
  if (G.relics.includes('keen-eyes')) s.range *= 1.15;
  if (G.relics.includes('overclock')) s.rate *= 1.15;
  if (G.relics.includes('sharpened')) s.damage *= 1.2;
  if (G.relics.includes('kindled-heart') && s.kind === 'fire') { s.damage *= 1.3; s.burnDps *= 1.3; }
  if (G.relics.includes('permafrost') && s.kind === 'frost') { s.slow = Math.min(0.85, s.slow + 0.15); s.slowDur += 0.5; }
  if (G.relics.includes('bramble-crown') && s.kind === 'thorn') s.splash *= 1.4;
  if (G.relics.includes('storm-rod') && s.kind === 'storm') s.chain += 1;
  if (G.relics.includes('hunter-mark')) s.bossDmg = 1.25;
  // Wisp aura: buff from neighbouring lanterns
  if (t.type !== 'wisp') {
    let buff = 0;
    for (const o of G.towers) {
      if (o.type !== 'wisp' || o === t) continue;
      const os = towerStatsNoAura(G, o);
      const d = Math.hypot(o.x - t.x, o.y - t.y);
      if (d <= os.range + 40) buff += os.buff;
    }
    if (buff > 0) s.damage *= 1 + buff;
  }
  return s;
}

// Stats without aura recursion (used for lanterns themselves).
function towerStatsNoAura(G, t) {
  const def = TOWER_DEFS[t.type];
  const s = { ...def, level: t.level };
  for (let i = 0; i < t.level - 1; i++) Object.assign(s, def.up[i]);
  if (G.relics.includes('keen-eyes')) s.range *= 1.15;
  return s;
}

export function canPlace(G, tx, ty) {
  if (tx < 0 || tx >= 16 || ty < 0 || ty >= 7) return false;
  if (G.pathTiles.has(tx + ',' + ty)) return false;
  const h = (G.pathPx[G.pathPx.length - 1]);
  const htx = Math.floor(h.x / 80), hty = Math.floor((h.y - 64) / 80);
  if (tx === htx && ty === hty) return false;
  if (G.towers.some((t) => t.tx === tx && t.ty === ty)) return false;
  return true;
}

export function placeTower(G, type, tx, ty) {
  const def = TOWER_DEFS[type];
  if (!def || !canPlace(G, tx, ty)) return null;
  if (G.embers < def.cost) return null;
  const c = tileCenter(tx, ty);
  const t = {
    type, tx, ty, x: c.x, y: c.y, level: 1,
    cooldown: 0, invested: def.cost, angle: -Math.PI / 2, flash: 0,
  };
  G.embers -= def.cost;
  G.towers.push(t);
  G.stats.placed++;
  return t;
}

export function upgradeCost(G, t) {
  const def = TOWER_DEFS[t.type];
  if (t.level >= 3) return null;
  return def.up[t.level - 1].cost;
}

export function upgradeTower(G, t) {
  const cost = upgradeCost(G, t);
  if (cost == null || G.embers < cost) return false;
  G.embers -= cost;
  t.invested += cost;
  t.level++;
  t.flash = 0.5;
  G.stats.upgraded++;
  return true;
}

export function sellValue(t) { return Math.floor(t.invested * 0.7); }

export function sellTower(G, t) {
  G.embers += sellValue(t);
  G.towers = G.towers.filter((o) => o !== t);
  if (G.selected === t) G.selected = null;
}

export function towerValue(G, t) {
  const s = towerStats(G, t);
  return { def: TOWER_DEFS[t.type], stats: s, upCost: upgradeCost(G, t), sell: sellValue(t) };
}

export function clampTile(v) { return clamp(v, 0, 15); }
