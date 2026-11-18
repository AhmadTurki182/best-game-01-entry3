// combat.js — the battle update: tower targeting and fire, projectiles,
// enemy movement, burns and slows, leaks, kills, and the wave lifecycle.

import { TILE, PLAY_TOP, switchRealm, waveComp, clamp, dist } from './state.js';
import { towerStats } from './towers.js';
import { ENEMY_DEFS, spawnEnemy, buildWaveQueue } from './enemies.js';
import { rollRelicChoices } from './relics.js';
import { sfx } from './audio.js';

export function startWave(G) {
  if (G.state !== 'build' || G.waveActive) return;
  G.wave++;
  G.waveInRealm = ((G.wave - 1) % 10) + 1;
  const realm = Math.floor((G.wave - 1) / 10);
  if (realm !== G.realm) {
    switchRealm(G, realm);
    G.message = `Realm ${realm + 1} — ${['Emberwood', 'Frostmire', 'Ashen Deep'][realm]}!`;
    G.messageUntil = G.time + 3;
  }
  G.spawnQueue = buildWaveQueue(G, waveComp(G.wave));
  G.enemiesToSpawn = G.spawnQueue.length;
  G.spawnTimer = 0.8;
  G.waveActive = true;
  G.state = 'wave';
  G.bossWarned = false;
  const isBoss = G.waveInRealm === 10;
  if (isBoss) {
    G.message = `BOSS — ${['Frostmaw the Pale', 'Matriarch of Hollows', 'The Hollow King'][realm]} approaches!`;
    G.messageUntil = G.time + 4;
    sfx(G, 'boss');
  } else {
    sfx(G, 'horn');
  }
}

function pathProgress(e) {
  return e.pathIdx * 1000 + e.x + e.y;
}

export function updateCombat(G, dt) {
  G.time += dt;
  updateSpawning(G, dt);
  updateTowers(G, dt);
  updateProjectiles(G, dt);
  updateEnemies(G, dt);
  updateParticles(G, dt);
  updateFloaters(G, dt);
  if (G.messageUntil && G.time > G.messageUntil) G.message = '';
  checkWaveEnd(G);
}

function updateSpawning(G, dt) {
  if (!G.waveActive || G.spawnQueue.length === 0) return;
  G.spawnTimer -= dt;
  if (G.spawnTimer <= 0) {
    const next = G.spawnQueue.shift();
    spawnEnemy(G, next.type);
    G.spawnTimer = next.delay;
    if (next.type === 'frostmaw' || next.type === 'matriarch' || next.type === 'hollowking') {
      G.message = `${ENEMY_DEFS[next.type].name} has entered the grove!`;
      G.messageUntil = G.time + 3;
    }
  }
}

function updateTowers(G, dt) {
  for (const t of G.towers) {
    const s = towerStats(G, t);
    t.flash = Math.max(0, t.flash - dt);
    if (s.kind === 'aura' || s.rate <= 0) continue;
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    // Target: the enemy furthest along the path inside range.
    let best = null, bestScore = -1;
    for (const e of G.enemies) {
      const d = dist(t.x, t.y, e.x, e.y);
      if (d > s.range + e.radius) continue;
      const score = pathProgress(e) + (e.boss ? 5000 : 0);
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (!best) continue;
    t.angle = Math.atan2(best.y - t.y, best.x - t.x);
    t.cooldown = 1 / s.rate;
    fireProjectile(G, t, s, best);
    if (s.kind === 'storm') sfx(G, 'zap');
    else if (s.kind === 'fire') sfx(G, 'shoot');
    else if (s.kind === 'thorn') sfx(G, 'thud');
    else sfx(G, 'shoot');
  }
}

function fireProjectile(G, t, s, target) {
  G.projectiles.push({
    x: t.x, y: t.y - 14,
    target, lastX: target.x, lastY: target.y,
    speed: s.projSpeed, damage: s.damage,
    kind: s.kind, splash: s.splash, chain: s.chain,
    slow: s.slow, slowDur: s.slowDur,
    burnDps: s.burnDps, burnDur: s.burnDur,
    bossDmg: s.bossDmg || 1,
    color: s.color, color2: s.color2,
    life: 1.2,
  });
}

function updateProjectiles(G, dt) {
  const keep = [];
  for (const p of G.projectiles) {
    p.life -= dt;
    const tgt = p.target && p.target.hp > 0 ? p.target : null;
    const tx = tgt ? tgt.x : p.lastX;
    const ty = tgt ? tgt.y : p.lastY;
    if (tgt) { p.lastX = tgt.x; p.lastY = tgt.y; }
    const d = dist(p.x, p.y, tx, ty);
    const step = p.speed * dt;
    if (d <= step + 6 || p.life <= 0) {
      if (d <= step + 10) hitTarget(G, p, tgt, tx, ty);
      continue;
    }
    p.x += ((tx - p.x) / d) * step;
    p.y += ((ty - p.y) / d) * step;
    keep.push(p);
  }
  G.projectiles = keep;
}

function hitTarget(G, p, target, tx, ty) {
  if (p.kind === 'storm') {
    chainLightning(G, p, target, tx, ty);
    return;
  }
  if (p.splash > 0) {
    burst(G, tx, ty, p.color, 10, 90);
    for (const e of [...G.enemies]) {
      if (dist(e.x, e.y, tx, ty) <= p.splash + e.radius) {
        damageEnemy(G, e, p.damage * (e.boss ? p.bossDmg : 1), p);
      }
    }
    sfx(G, 'boom');
    return;
  }
  if (target) {
    damageEnemy(G, target, p.damage * (target.boss ? p.bossDmg : 1), p);
    burst(G, tx, ty, p.color, 4, 50);
  }
}

function chainLightning(G, p, first, tx, ty) {
  let current = first;
  let dmg = p.damage;
  const hit = new Set();
  let fromX = p.x, fromY = p.y;
  for (let i = 0; i <= p.chain && current; i++) {
    damageEnemy(G, current, dmg * (current.boss ? p.bossDmg : 1), p);
    hit.add(current);
    G.particles.push({ kind: 'bolt', x1: fromX, y1: fromY, x2: current.x, y2: current.y, life: 0.16, max: 0.16 });
    fromX = current.x; fromY = current.y;
    dmg *= 0.65;
    // Next nearest unhit enemy within 130px.
    let next = null, nd = 130;
    for (const e of G.enemies) {
      if (hit.has(e) || e.hp <= 0) continue;
      const d = dist(current.x, current.y, e.x, e.y);
      if (d < nd) { nd = d; next = e; }
    }
    current = next;
  }
}

export function damageEnemy(G, e, amount, src) {
  if (e.hp <= 0) return;
  e.hp -= amount;
  e.hitFlash = 0.12;
  G.stats.damage += amount;
  if (src) {
    if (src.slow > 0) { e.slowUntil = G.time + src.slowDur; e.slowFactor = 1 - src.slow; }
    if (src.burnDps > 0) { e.burnUntil = G.time + src.burnDur; e.burnDps = Math.max(e.burnDps, src.burnDps); }
  }
  if (G.floaters.length < 40 && amount >= 10) {
    G.floaters.push({ x: e.x + (Math.random() * 16 - 8), y: e.y - e.radius - 4, text: String(Math.round(amount)), life: 0.7, max: 0.7, color: src && src.kind === 'frost' ? '#bfe9ff' : '#ffe9a8' });
  }
  if (e.hp <= 0) killEnemy(G, e);
}

function killEnemy(G, e) {
  G.kills++;
  let bounty = e.reward;
  if (G.relics.includes('deep-pockets')) bounty = Math.round(bounty * 1.25);
  G.embers += bounty;
  G.stats.earned += bounty;
  G.score += bounty * 10 + (e.boss ? 1000 : 0);
  burst(G, e.x, e.y, e.color, e.boss ? 40 : 10, e.boss ? 200 : 90);
  if (e.boss) {
    G.message = `${e.name} is shattered!`;
    G.messageUntil = G.time + 3;
    sfx(G, 'bossdie');
  } else {
    sfx(G, 'pop');
  }
  if (e.splits > 0) {
    for (let i = 0; i < e.splits; i++) {
      const imp = spawnEnemy(G, 'imp');
      imp.x = e.x + (i === 0 ? -14 : 14);
      imp.y = e.y;
      imp.pathIdx = e.pathIdx;
    }
  }
  G.enemies = G.enemies.filter((o) => o !== e);
}

function updateEnemies(G, dt) {
  const keep = [];
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.wobble += dt * 6;
    // Burn damage over time.
    if (G.time < e.burnUntil && e.burnDps > 0) {
      e.hp -= e.burnDps * dt;
      if (Math.random() < dt * 8) G.particles.push({ kind: 'dot', x: e.x, y: e.y - 6, vx: 0, vy: -30, life: 0.4, max: 0.4, color: '#ff7b2f', size: 3 });
      if (e.hp <= 0) { killEnemy(G, e); continue; }
    }
    const slowed = G.time < e.slowUntil;
    const speed = e.speed * (slowed ? e.slowFactor : 1);
    // Boss minion spawns.
    if (e.boss) {
      e.minionTimer -= dt;
      if (e.minionTimer <= 0) {
        e.minionTimer = 4;
        const m = spawnEnemy(G, 'imp');
        m.x = e.x; m.y = e.y; m.pathIdx = e.pathIdx;
      }
    }
    // Walk the waypoints; the last waypoint is the hearth (clamped on-grid).
    const pts = G.pathPx;
    const lastIdx = pts.length - 1;
    const target = e.pathIdx >= lastIdx ? G.hearthPos : pts[e.pathIdx];
    const d = dist(e.x, e.y, target.x, target.y);
    const step = speed * dt;
    if (d <= step) {
      e.x = target.x; e.y = target.y;
      if (e.pathIdx >= lastIdx) {
        leakEnemy(G, e);
        continue;
      }
      e.pathIdx++;
    } else {
      e.x += ((target.x - e.x) / d) * step;
      e.y += ((target.y - e.y) / d) * step;
    }
    keep.push(e);
  }
  G.enemies = keep;
}

function leakEnemy(G, e) {
  G.leaks++;
  G.hearthHP -= e.dmg;
  G.enemies = G.enemies.filter((o) => o !== e);
  burst(G, G.hearthPos.x, G.hearthPos.y, '#ff5d5d', 14, 120);
  sfx(G, 'leak');
  G.floaters.push({ x: G.hearthPos.x, y: G.hearthPos.y - 46, text: `-${e.dmg} HEARTH`, life: 1, max: 1, color: '#ff8080' });
  if (G.hearthHP <= 0) {
    if (G.relics.includes('phoenix-feather') && !G.phoenixUsed) {
      G.phoenixUsed = true;
      G.hearthHP = 1;
      G.message = 'The Phoenix Feather burns — the Hearth holds at 1!';
      G.messageUntil = G.time + 4;
      burst(G, G.hearthPos.x, G.hearthPos.y, '#ffd76a', 40, 200);
      sfx(G, 'phoenix');
      return;
    }
    G.hearthHP = 0;
    G.state = 'defeat';
    G.waveActive = false;
    sfx(G, 'lose');
  }
}

function checkWaveEnd(G) {
  if (G.state !== 'wave' || !G.waveActive) return;
  if (G.spawnQueue.length === 0 && G.enemies.length === 0) {
    G.waveActive = false;
    const bonus = 30 + G.wave * 4;
    const interest = Math.min(50, Math.floor(G.embers * 0.05));
    G.embers += bonus + interest;
    G.stats.earned += bonus + interest;
    G.score += bonus * 5;
    if (G.wave >= 30) {
      G.state = 'victory';
      sfx(G, 'win');
      return;
    }
    if (G.waveInRealm === 10) {
      // Boss down: offer a relic.
      G.relicChoices = rollRelicChoices(G);
      G.state = 'relic';
      sfx(G, 'relic');
      return;
    }
    G.state = 'build';
    G.message = `Wave ${G.wave} cleared! +${bonus} embers${interest ? ` (+${interest} interest)` : ''} — build, then start wave ${G.wave + 1}.`;
    G.messageUntil = G.time + 4;
    sfx(G, 'clear');
  }
}

export function burst(G, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    G.particles.push({
      kind: 'dot', x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20,
      life: 0.4 + Math.random() * 0.35, max: 0.75,
      color, size: 2 + Math.random() * 3,
    });
  }
}

function updateParticles(G, dt) {
  const keep = [];
  for (const p of G.particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    if (p.kind === 'dot') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; }
    keep.push(p);
  }
  G.particles = keep;
}

function updateFloaters(G, dt) {
  const keep = [];
  for (const f of G.floaters) {
    f.life -= dt;
    if (f.life <= 0) continue;
    f.y -= 34 * dt;
    keep.push(f);
  }
  G.floaters = keep;
}

export function updateIdle(G, dt) {
  // Title screen ambience: slow ember drift over the hearth.
  G.time += dt;
  G.titleT += dt;
  if (Math.random() < dt * 6) {
    G.particles.push({
      kind: 'dot',
      x: G.hearthPos.x + (Math.random() * 60 - 30),
      y: G.hearthPos.y + (Math.random() * 20 - 10),
      vx: Math.random() * 10 - 5, vy: -26 - Math.random() * 20,
      life: 1 + Math.random(), max: 2, color: Math.random() < 0.5 ? '#ffb347' : '#ff7b2f', size: 2 + Math.random() * 2,
    });
  }
  updateParticles(G, dt);
  updateFloaters(G, dt);
}
