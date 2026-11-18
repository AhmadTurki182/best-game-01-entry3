// render.js — every pixel of EMBERHOLD is drawn here on one canvas:
// the realm, the winding path, the Hearth, towers, enemies, projectiles,
// particles, the HUD, the shop, and the title / relic / victory / defeat screens.

import { TILE, COLS, PLAY_TOP, SHOP_H, W, H, REALMS, tileCenter, hearthTile } from './state.js';
import { TOWER_DEFS, TOWER_ORDER, towerStats, upgradeCost, sellValue } from './towers.js';
import { ENEMY_DEFS } from './enemies.js';
import { RELICS } from './relics.js';

export function shopCardRect(i) {
  return { x: 16 + i * 150, y: H - SHOP_H + 10, w: 140, h: 76 };
}
export function startButtonRect() {
  return { x: 786, y: H - SHOP_H + 10, w: 180, h: 76 };
}
export function hudButtonRect(i) {
  // i: 0 speed, 1 pause, 2 mute — top-right of the HUD bar.
  return { x: W - 16 - (3 - i) * 48, y: 12, w: 40, h: 40 };
}
export function towerPanelRects() {
  return {
    box: { x: 976, y: 84, w: 288, h: 196 },
    upgrade: { x: 992, y: 228, w: 128, h: 36 },
    sell: { x: 1128, y: 228, w: 120, h: 36 },
  };
}
export function relicCardRect(i) {
  return { x: 140 + i * 340, y: 250, w: 300, h: 230 };
}
export function inRect(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function render(G, ctx) {
  const realm = REALMS[G.realm];
  drawBackground(G, ctx, realm);
  drawPath(G, ctx, realm);
  drawDecor(G, ctx, realm);
  drawHearth(G, ctx, realm);
  drawTowers(G, ctx);
  drawEnemies(G, ctx);
  drawProjectiles(G, ctx);
  drawParticles(G, ctx);
  drawFloaters(G, ctx);
  drawHover(G, ctx);
  drawHud(G, ctx, realm);
  drawShop(G, ctx);
  if (G.selected) drawTowerPanel(G, ctx);
  if (G.message) drawMessage(G, ctx);
  if (G.state === 'title') drawTitle(G, ctx);
  if (G.state === 'relic') drawRelicModal(G, ctx);
  if (G.state === 'victory') drawEndScreen(G, ctx, true);
  if (G.state === 'defeat') drawEndScreen(G, ctx, false);
  if (G.paused && (G.state === 'wave' || G.state === 'build')) drawPaused(G, ctx);
}

function drawBackground(G, ctx, realm) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, realm.sky[0]);
  g.addColorStop(1, realm.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Ground checkerboard in the play area.
  for (let ty = 0; ty < 7; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? realm.ground : realm.groundAlt;
      ctx.fillRect(tx * TILE, PLAY_TOP + ty * TILE, TILE, TILE);
    }
  }
}

function drawPath(G, ctx, realm) {
  ctx.fillStyle = realm.path;
  for (const key of G.pathTiles) {
    const [tx, ty] = key.split(',').map(Number);
    ctx.fillRect(tx * TILE + 2, PLAY_TOP + ty * TILE + 2, TILE - 4, TILE - 4);
  }
  ctx.strokeStyle = realm.pathEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, PLAY_TOP + (G.pathPx[0].y - PLAY_TOP));
  for (const p of G.pathPx) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function drawDecor(G, ctx, realm) {
  for (const d of G.decor) {
    if (G.pathTiles.has(d.tx + ',' + d.ty)) continue;
    const c = tileCenter(d.tx, d.ty);
    const s = d.s * 22;
    ctx.save();
    ctx.globalAlpha = d.a;
    if (realm.decor === 'tree') {
      ctx.fillStyle = '#2f4a26';
      ctx.beginPath(); ctx.moveTo(c.x, c.y - s); ctx.lineTo(c.x - s * 0.7, c.y + s * 0.6); ctx.lineTo(c.x + s * 0.7, c.y + s * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3d5c31';
      ctx.beginPath(); ctx.moveTo(c.x, c.y - s * 1.5); ctx.lineTo(c.x - s * 0.5, c.y); ctx.lineTo(c.x + s * 0.5, c.y); ctx.closePath(); ctx.fill();
    } else if (realm.decor === 'crystal') {
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath(); ctx.moveTo(c.x, c.y - s * 1.2); ctx.lineTo(c.x - s * 0.45, c.y + s * 0.5); ctx.lineTo(c.x + s * 0.45, c.y + s * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d6f4ff';
      ctx.beginPath(); ctx.moveTo(c.x - s * 0.4, c.y - s * 0.4); ctx.lineTo(c.x - s * 0.7, c.y + s * 0.5); ctx.lineTo(c.x - s * 0.1, c.y + s * 0.5); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = '#cbb8c2';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(c.x - s * 0.6, c.y + s * 0.4); ctx.lineTo(c.x, c.y - s * 0.5); ctx.lineTo(c.x + s * 0.6, c.y + s * 0.4); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawHearth(G, ctx) {
  const hp = G.hearthPos;
  const t = G.time;
  // Stone ring.
  ctx.fillStyle = '#4a4a52';
  ctx.beginPath(); ctx.arc(hp.x, hp.y + 8, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#33333a';
  ctx.beginPath(); ctx.arc(hp.x, hp.y + 8, 26, 0, Math.PI * 2); ctx.fill();
  // Flame: three layered flickering teardrops.
  const flick = Math.sin(t * 9) * 3 + Math.sin(t * 23) * 2;
  const layers = [
    { r: 24 + flick * 0.4, c: '#ff7b2f', y: 0 },
    { r: 16 + flick * 0.3, c: '#ffb347', y: -4 },
    { r: 9 + flick * 0.25, c: '#fff3a0', y: -8 },
  ];
  for (const l of layers) {
    ctx.fillStyle = l.c;
    ctx.beginPath();
    ctx.moveTo(hp.x, hp.y - l.r * 1.5 + l.y);
    ctx.quadraticCurveTo(hp.x + l.r, hp.y - l.r * 0.3 + l.y, hp.x, hp.y + l.r * 0.5 + l.y);
    ctx.quadraticCurveTo(hp.x - l.r, hp.y - l.r * 0.3 + l.y, hp.x, hp.y - l.r * 1.5 + l.y);
    ctx.fill();
  }
  // Glow.
  const glow = ctx.createRadialGradient(hp.x, hp.y, 10, hp.x, hp.y, 90);
  glow.addColorStop(0, 'rgba(255,150,50,0.25)');
  glow.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(hp.x - 90, hp.y - 90, 180, 180);
  // Hearth HP pips above.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, hp.x - 34, hp.y - 58, 68, 16, 8); ctx.fill();
  ctx.fillStyle = '#ff5d5d';
  const w = 60 * (G.hearthHP / G.hearthMax);
  rr(ctx, hp.x - 30, hp.y - 54, Math.max(0, w), 8, 4); ctx.fill();
}

function drawTowers(G, ctx) {
  for (const t of G.towers) {
    const s = towerStats(G, t);
    const def = TOWER_DEFS[t.type];
    // Base.
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath(); ctx.arc(t.x, t.y + 6, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c3038';
    ctx.beginPath(); ctx.arc(t.x, t.y + 6, 18, 0, Math.PI * 2); ctx.fill();
    if (t.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${t.flash})`;
      ctx.beginPath(); ctx.arc(t.x, t.y, 26, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.type === 'ember') {
      ctx.rotate(t.angle);
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.color2;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'frost') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t.angle * 0.2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        ctx.lineTo(Math.cos(a + 0.3) * 8, Math.sin(a + 0.3) * 8);
      }
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'thorn') {
      ctx.fillStyle = def.color2;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + G.time * 0.4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'gale') {
      ctx.fillStyle = '#8a7a2e';
      ctx.fillRect(-3, -18, 6, 26);
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(14, -4); ctx.lineTo(-14, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath(); ctx.arc(0, -12, 4, 0, Math.PI * 2); ctx.fill();
    } else { // wisp lantern
      const bob = Math.sin(G.time * 2 + t.tx) * 3;
      ctx.fillStyle = '#6b5a8f';
      ctx.fillRect(-2, -6, 4, 16);
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, -12 + bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, -12 + bob, 5, 0, Math.PI * 2); ctx.fill();
      const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, s.range);
      aura.addColorStop(0, 'rgba(224,179,255,0.10)');
      aura.addColorStop(1, 'rgba(224,179,255,0)');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(0, 0, s.range, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // Level pips.
    for (let i = 0; i < t.level; i++) {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(t.x - 12 + i * 12, t.y + 26, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Range ring when selected.
    if (G.selected === t) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(t.x, t.y, s.range, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawEnemies(G, ctx) {
  for (const e of G.enemies) {
    const bob = Math.sin(e.wobble) * 2;
    ctx.save();
    ctx.translate(e.x, e.y + bob * 0.3);
    if (e.boss) {
      // Boss aura.
      const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, e.radius + 26);
      aura.addColorStop(0, 'rgba(255,80,120,0.22)');
      aura.addColorStop(1, 'rgba(255,80,120,0)');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 26, 0, Math.PI * 2); ctx.fill();
    }
    // Body.
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.dark;
    ctx.beginPath(); ctx.arc(0, e.radius * 0.35, e.radius * 0.8, 0, Math.PI); ctx.fill();
    // Eyes.
    ctx.fillStyle = e.boss ? '#ff2d55' : '#fff';
    const eyeY = -e.radius * 0.2;
    ctx.beginPath(); ctx.arc(-e.radius * 0.35, eyeY, e.radius * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius * 0.35, eyeY, e.radius * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-e.radius * 0.35, eyeY, e.radius * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius * 0.35, eyeY, e.radius * 0.08, 0, Math.PI * 2); ctx.fill();
    // Slow tint.
    if (G.time < e.slowUntil) {
      ctx.strokeStyle = 'rgba(127,212,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2); ctx.stroke();
    }
    // Burn flame.
    if (G.time < e.burnUntil) {
      ctx.fillStyle = '#ff7b2f';
      ctx.beginPath(); ctx.arc(0, -e.radius - 2, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // HP bar.
    const w = e.boss ? 64 : 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = e.boss ? '#ff2d55' : '#7ee081';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * Math.max(0, e.hp / e.maxHp), 5);
    if (e.boss) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name, e.x, e.y - e.radius - 18);
    }
  }
}

function drawProjectiles(G, ctx) {
  for (const p of G.projectiles) {
    if (p.kind === 'storm') continue; // lightning is drawn as particles
    ctx.fillStyle = p.color2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.kind === 'thorn' ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.kind === 'thorn' ? 4 : 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles(G, ctx) {
  for (const p of G.particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.kind === 'bolt') {
      ctx.strokeStyle = `rgba(255,240,150,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const mx = (p.x1 + p.x2) / 2 + (Math.random() * 16 - 8);
      const my = (p.y1 + p.y2) / 2 + (Math.random() * 16 - 8);
      ctx.moveTo(p.x1, p.y1); ctx.lineTo(mx, my); ctx.lineTo(p.x2, p.y2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawFloaters(G, ctx) {
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHover(G, ctx) {
  if (!G.hover || G.state === 'title') return;
  const { tx, ty } = G.hover;
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= 7) return;
  const c = tileCenter(tx, ty);
  const def = TOWER_DEFS[G.buildType];
  const ok = !G.selected && (G.state === 'build' || G.state === 'wave') && !G.pathTiles.has(tx + ',' + ty) && !G.towers.some((t) => t.tx === tx && t.ty === ty);
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,80,80,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(tx * TILE + 3, PLAY_TOP + ty * TILE + 3, TILE - 6, TILE - 6);
  if (ok && (G.state === 'build' || G.state === 'wave')) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(tx * TILE + 3, PLAY_TOP + ty * TILE + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(c.x, c.y, def.range, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawHud(G, ctx, realm) {
  ctx.fillStyle = 'rgba(10,12,16,0.92)';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = realm.accent;
  ctx.fillRect(0, 64, W, 3);
  // Hearth.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🔥 HEARTH', 16, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  rr(ctx, 16, 34, 150, 14, 7); ctx.fill();
  ctx.fillStyle = G.hearthHP <= 5 ? '#ff2d55' : '#ff5d5d';
  rr(ctx, 16, 34, 150 * Math.max(0, G.hearthHP / G.hearthMax), 14, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${G.hearthHP}/${G.hearthMax}`, 172, 46);
  // Wave + realm.
  ctx.textAlign = 'center';
  ctx.fillStyle = realm.accent;
  ctx.font = 'bold 20px sans-serif';
  const waveLabel = G.wave === 0 ? 'Prepare — wave 1 next' : G.state === 'victory' ? 'All 30 waves cleared!' : `Wave ${G.wave} / 30`;
  ctx.fillText(waveLabel, W / 2, 26);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${realm.name} — ${realm.sub}   •   Score ${G.score.toLocaleString()}   •   ${G.kills} slain`, W / 2, 48);
  // Embers.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`🪙 ${G.embers}`, W - 170, 28);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '12px sans-serif';
  ctx.fillText('embers', W - 170, 46);
  // HUD buttons: speed, pause, mute.
  const labels = [G.speed === 1 ? '1×' : '2×', G.paused ? '▶' : '⏸', G.muted ? '🔇' : '🔊'];
  labels.forEach((lab, i) => {
    const r = hudButtonRect(i);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lab, r.x + r.w / 2, r.y + 26);
  });
  // Relic icons owned.
  let rx = 190;
  ctx.textAlign = 'left';
  for (const id of G.relics) {
    ctx.font = '16px sans-serif';
    ctx.fillText(RELICS[id].icon, rx, 26);
    rx += 22;
  }
  // Boss HP bar.
  const boss = G.enemies.find((e) => e.boss);
  if (boss) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    rr(ctx, W / 2 - 200, 56, 400, 8, 4); ctx.fill();
    ctx.fillStyle = '#ff2d55';
    rr(ctx, W / 2 - 200, 56, 400 * Math.max(0, boss.hp / boss.maxHp), 8, 4); ctx.fill();
  }
}

function drawShop(G, ctx) {
  ctx.fillStyle = 'rgba(10,12,16,0.94)';
  ctx.fillRect(0, H - SHOP_H, W, SHOP_H);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, H - SHOP_H, W, 1);
  TOWER_ORDER.forEach((type, i) => {
    const def = TOWER_DEFS[type];
    const r = shopCardRect(i);
    const afford = G.embers >= def.cost;
    const active = G.buildType === type && !G.selected;
    ctx.fillStyle = active ? 'rgba(255,179,71,0.25)' : 'rgba(255,255,255,0.07)';
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = active ? '#ffb347' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = active ? 2 : 1;
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(r.x + 22, r.y + 22, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(def.name, r.x + 40, r.y + 20);
    ctx.fillStyle = '#cfd6de';
    ctx.font = '11px sans-serif';
    const stat = def.kind === 'aura' ? `Buff +${Math.round(def.buff * 100)}% dmg` : `DMG ${def.damage} · RNG ${def.range}`;
    ctx.fillText(stat, r.x + 12, r.y + 42);
    ctx.fillStyle = afford ? '#ffb347' : '#ff8080';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`🪙 ${def.cost}   [${def.key}]`, r.x + 12, r.y + 62);
  });
  // Start wave button.
  const b = startButtonRect();
  const canStart = G.state === 'build';
  ctx.fillStyle = canStart ? '#2e7d32' : 'rgba(255,255,255,0.10)';
  rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
  ctx.strokeStyle = canStart ? '#7ee081' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(canStart ? '▶ START WAVE' : G.state === 'wave' ? 'WAVE…' : '—', b.x + b.w / 2, b.y + 32);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '12px sans-serif';
  ctx.fillText(canStart ? `Wave ${G.wave + 1} of 30  [Space]` : G.state === 'wave' ? `${G.enemies.length + G.spawnQueue.length} foes left` : '', b.x + b.w / 2, b.y + 56);
}

function drawTowerPanel(G, ctx) {
  const t = G.selected;
  if (!t) return;
  const def = TOWER_DEFS[t.type];
  const s = towerStats(G, t);
  const R = towerPanelRects();
  ctx.fillStyle = 'rgba(8,10,14,0.95)';
  rr(ctx, R.box.x, R.box.y, R.box.w, R.box.h, 12); ctx.fill();
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 2;
  rr(ctx, R.box.x, R.box.y, R.box.w, R.box.h, 12); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${def.name}  •  Lv ${t.level}`, R.box.x + 16, R.box.y + 28);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '13px sans-serif';
  const lines = def.kind === 'aura'
    ? [`Buffs neighbours +${Math.round(s.buff * 100)}% damage`, `Aura range ${Math.round(s.range)}`]
    : [`Damage ${Math.round(s.damage)}${s.kind === 'fire' ? ` + burn ${Math.round(s.burnDps)}/s` : ''}${s.kind === 'frost' ? ` + slow ${Math.round(s.slow * 100)}%` : ''}`, `Range ${Math.round(s.range)}  •  ${s.rate.toFixed(2)}/s${s.splash ? `  •  Splash ${Math.round(s.splash)}` : ''}${s.chain ? `  •  Chain ${s.chain}` : ''}`];
  lines.forEach((ln, i) => ctx.fillText(ln, R.box.x + 16, R.box.y + 54 + i * 20));
  ctx.fillText(def.desc, R.box.x + 16, R.box.y + 98);
  ctx.fillStyle = '#8a94a3';
  ctx.font = '12px sans-serif';
  ctx.fillText('Click another tile to move selection. Esc to close.', R.box.x + 16, R.box.y + 122);
  const up = R.upgrade, sell = R.sell;
  const upCost = upgradeCost(G, t);
  ctx.fillStyle = upCost != null && G.embers >= upCost ? '#2e7d32' : 'rgba(255,255,255,0.12)';
  rr(ctx, up.x, up.y, up.w, up.h, 8); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(upCost != null ? `⬆ Upgrade 🪙${upCost}` : '⬆ MAX LEVEL', up.x + up.w / 2, up.y + 23);
  ctx.fillStyle = '#7a2e2e';
  rr(ctx, sell.x, sell.y, sell.w, sell.h, 8); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(`Sell 🪙${sellValue(t)}`, sell.x + sell.w / 2, sell.y + 23);
}

function drawMessage(G, ctx) {
  ctx.fillStyle = 'rgba(8,10,14,0.85)';
  const text = G.message;
  ctx.font = 'bold 16px sans-serif';
  const w = ctx.measureText(text).width + 36;
  rr(ctx, W / 2 - w / 2, 78, w, 36, 18); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, 101);
}

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(6,8,12,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function drawTitle(G, ctx) {
  overlay(ctx, 0.72);
  const cx = W / 2;
  // Big ember glow behind the title.
  const glow = ctx.createRadialGradient(cx, 210, 10, cx, 210, 260);
  glow.addColorStop(0, 'rgba(255,150,50,0.35)');
  glow.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 260, -50, 520, 520);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('EMBERHOLD', cx, 210);
  ctx.fillStyle = '#fff';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('Defend the Last Hearth', cx, 252);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '16px sans-serif';
  ctx.fillText('Three realms. Thirty waves. Three bosses. One flame that must not die.', cx, 292);
  const lines = [
    '🖱  Click a tower card, then click a tile to build it. Click a placed tower to upgrade or sell it.',
    '🔥  Enemies march the path to your Hearth — every leak costs Hearth HP. Lose it all and the flame dies.',
    '🪙  Slain foes drop embers. Banked embers earn 5% interest each wave — spend, or save and grow rich.',
    '👑  Every 10th wave a boss comes. Slay it and choose a relic — twelve relics, endless builds.',
    '⌨  [1–5] pick a tower   [Space] start wave   [F] fast-forward   [P] pause   [M] mute',
  ];
  lines.forEach((ln, i) => ctx.fillText(ln, cx, 340 + i * 28));
  // Pulsing start prompt.
  const pulse = 0.65 + Math.sin(G.titleT * 3) * 0.35;
  ctx.fillStyle = `rgba(255,179,71,${pulse})`;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('— CLICK ANYWHERE TO BEGIN —', cx, 520);
  ctx.fillStyle = '#8a94a3';
  ctx.font = '13px sans-serif';
  ctx.fillText('A complete tower-defense campaign: build phase, 30 waves, bosses, relics, victory and defeat.', cx, 556);
  ctx.fillText('Original art, music and sound — all drawn and synthesized in code. No downloads, no accounts.', cx, 578);
}

function drawRelicModal(G, ctx) {
  overlay(ctx, 0.6);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('👑  BOSS SLAIN — CHOOSE A RELIC', W / 2, 200);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '16px sans-serif';
  ctx.fillText('One relic joins your build. It stays with you for the rest of the campaign.', W / 2, 228);
  G.relicChoices.forEach((id, i) => {
    const r = relicCardRect(i);
    const relic = RELICS[id];
    ctx.fillStyle = 'rgba(20,24,32,0.97)';
    rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.stroke();
    ctx.font = '44px sans-serif';
    ctx.fillText(relic.icon, r.x + r.w / 2, r.y + 70);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(relic.name, r.x + r.w / 2, r.y + 112);
    ctx.fillStyle = '#cfd6de';
    ctx.font = '14px sans-serif';
    wrapText(ctx, relic.desc, r.x + r.w / 2, r.y + 146, 260, 20);
    ctx.fillStyle = '#8a94a3';
    ctx.font = '12px sans-serif';
    ctx.fillText(`[${i + 1}]`, r.x + r.w / 2, r.y + 208);
  });
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => ctx.fillText(ln, cx, y + i * lh));
}

function drawEndScreen(G, ctx, won) {
  overlay(ctx, 0.78);
  const cx = W / 2;
  ctx.fillStyle = won ? '#7ee081' : '#ff5d5d';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(won ? 'THE HEARTH ENDURES' : 'THE FLAME HAS DIED', cx, 210);
  ctx.fillStyle = '#fff';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText(
    won ? 'Thirty waves. Three bosses. The Hollow King is ash — dawn breaks over the grove.'
        : 'The Hollow swallowed the last ember… but a spark remains. Try a new build.',
    cx, 252);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '17px sans-serif';
  const stats = [
    `Score  ${G.score.toLocaleString()}      Waves cleared  ${G.wave} / 30`,
    `Foes slain  ${G.kills}      Embers earned  ${G.stats.earned}      Towers built  ${G.stats.placed}`,
    `Relics claimed  ${G.relics.length}  —  ${G.relics.map((id) => RELICS[id].name).join(', ') || 'none'}`,
  ];
  stats.forEach((ln, i) => ctx.fillText(ln, cx, 310 + i * 30));
  const pulse = 0.65 + Math.sin(G.titleT * 3) * 0.35;
  ctx.fillStyle = `rgba(255,179,71,${pulse})`;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('— CLICK TO PLAY AGAIN [R] —', cx, 470);
  ctx.fillStyle = '#8a94a3';
  ctx.font = '13px sans-serif';
  ctx.fillText('EMBERHOLD — an original tower-defense campaign. Every run, a new build.', cx, 510);
}

function drawPaused(G, ctx) {
  overlay(ctx, 0.45);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.fillStyle = '#cfd6de';
  ctx.font = '16px sans-serif';
  ctx.fillText('Press [P] or click ▶ to resume.', W / 2, H / 2 + 34);
}

export { TILE, ENEMY_DEFS };
