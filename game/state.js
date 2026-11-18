// state.js — the single game state, realm maps, wave tables and helpers.
// EMBERHOLD: defend the Last Hearth across 3 realms, 10 waves each.
// Every other module reads and mutates this one object (G).

export const TILE = 80;
export const COLS = 16;
export const ROWS = 9;
export const W = 1280;
export const H = 720;
export const HUD_H = 64;      // top bar height (drawn inside the canvas)
export const SHOP_H = 96;     // bottom shop bar height
export const PLAY_TOP = HUD_H;
export const PLAY_H = H - HUD_H - SHOP_H; // 560px = 7 rows of tiles

// Waypoints are tile coords; the path snakes through rows 0..6 of the play area.
export const REALMS = [
  {
    name: 'Emberwood',
    sub: 'Realm I — the burning grove',
    sky: ['#1d2b1a', '#0d1a0c'],
    ground: '#22301f',
    groundAlt: '#1f2c1d',
    path: '#5a4632',
    pathEdge: '#3d2f21',
    accent: '#ffb347',
    accent2: '#ff7b2f',
    decor: 'tree',
    waypoints: [[-1, 1], [12, 1], [12, 4], [3, 4], [3, 6], [16, 6]],
  },
  {
    name: 'Frostmire',
    sub: 'Realm II — the frozen marsh',
    sky: ['#16222e', '#0a121c'],
    ground: '#1e2c38',
    groundAlt: '#1b2934',
    path: '#7d94a6',
    pathEdge: '#556775',
    accent: '#7fd4ff',
    accent2: '#b8ecff',
    decor: 'crystal',
    waypoints: [[-1, 6], [4, 6], [4, 1], [11, 1], [11, 4], [16, 4]],
  },
  {
    name: 'Ashen Deep',
    sub: 'Realm III — the hollow below',
    sky: ['#2b1620', '#140a10'],
    ground: '#2e1f26',
    groundAlt: '#2a1c23',
    path: '#4a3a44',
    pathEdge: '#33262e',
    accent: '#c77dff',
    accent2: '#ff5d8f',
    decor: 'bone',
    waypoints: [[-1, 3], [5, 3], [5, 0], [12, 0], [12, 6], [16, 6]],
  },
];

// Seeded RNG so decor and screenshot scenes are stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pathTilesFor(realm) {
  const tiles = new Set();
  const pts = realm.waypoints;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
    let x = x0, y = y0;
    while (true) {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS - 2) tiles.add(x + ',' + y);
      if (x === x1 && y === y1) break;
      x += dx; y += dy;
    }
  }
  return tiles;
}

export function waypointsPx(realm) {
  return realm.waypoints.map(([tx, ty]) => ({
    x: (tx + 0.5) * TILE,
    y: PLAY_TOP + (ty + 0.5) * TILE,
  }));
}

// Wave composition: returns [{type, count, gap}] for wave 1..30.
export function waveComp(wave) {
  const realm = Math.floor((wave - 1) / 10);
  const w = ((wave - 1) % 10) + 1; // 1..10 inside the realm
  const list = [];
  const add = (type, count, gap) => { if (count > 0) list.push({ type, count, gap }); };
  const pool = realm === 0
    ? ['imp', 'moth', 'husk']
    : realm === 1
      ? ['imp', 'moth', 'husk', 'shade', 'splitter']
      : ['imp', 'moth', 'husk', 'shade', 'splitter', 'wisp', 'golem', 'eater'];
  const n = 5 + w * 2 + realm * 3;
  for (let i = 0; i < n; i++) {
    const t = pool[(i * 7 + w) % pool.length];
    add(t, 1, 0.55);
  }
  if (w >= 3) add('golem', Math.floor(w / 3), 1.2);
  if (w >= 5) add('eater', Math.floor((w - 3) / 2), 1.4);
  if (w === 10) {
    const boss = realm === 0 ? 'frostmaw' : realm === 1 ? 'matriarch' : 'hollowking';
    add(boss, 1, 2.0);
    add('imp', 6, 0.4);
  }
  return list;
}

export function createGame(seed = 20261118) {
  const realm = REALMS[0];
  return {
    seed,
    rng: mulberry32(seed),
    state: 'title', // title | build | wave | relic | victory | defeat
    time: 0,
    realm: 0,
    wave: 0,              // waves cleared (0..30)
    waveInRealm: 0,
    hearthHP: 20,
    hearthMax: 20,
    embers: 220,
    score: 0,
    kills: 0,
    leaks: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    floaters: [],
    relics: [],
    relicChoices: [],
    selected: null,       // selected tower (placed)
    buildType: 'ember',   // tower type chosen in shop
    hover: null,          // {tx,ty} hovered tile
    mouse: { x: 0, y: 0 },
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    enemiesToSpawn: 0,
    speed: 1,
    paused: false,
    muted: false,
    phoenixUsed: false,
    stats: { placed: 0, upgraded: 0, earned: 0, damage: 0 },
    pathTiles: pathTilesFor(realm),
    pathPx: waypointsPx(realm),
    hearthPos: tileCenter(15, 6),
    decor: makeDecor(realm, seed),
    message: '',
    messageUntil: 0,
    titleT: 0,
    bossWarned: false,
  };
}

export function makeDecor(realm, seed) {
  const rng = mulberry32(seed + realm.name.length * 977);
  const out = [];
  for (let i = 0; i < 46; i++) {
    const tx = Math.floor(rng() * COLS);
    const ty = Math.floor(rng() * (ROWS - 2));
    out.push({ tx, ty, s: 0.6 + rng() * 0.9, a: 0.25 + rng() * 0.5, ph: rng() * 6.28 });
  }
  return out;
}

export function switchRealm(G, realmIdx) {
  const realm = REALMS[realmIdx];
  G.realm = realmIdx;
  G.pathTiles = pathTilesFor(realm);
  G.pathPx = waypointsPx(realm);
  const hw = realm.waypoints[realm.waypoints.length - 1];
  G.hearthPos = tileCenter(Math.min(COLS - 1, hw[0]), hw[1]);
  G.decor = makeDecor(realm, G.seed + realmIdx * 131);
}

export function hearthTile(G) {
  const last = REALMS[G.realm].waypoints[REALMS[G.realm].waypoints.length - 1];
  return { tx: Math.min(COLS - 1, last[0]), ty: last[1] };
}

export function isPathTile(G, tx, ty) { return G.pathTiles.has(tx + ',' + ty); }
export function isHearthTile(G, tx, ty) {
  const h = hearthTile(G);
  return tx === h.tx && ty === h.ty;
}
export function towerAt(G, tx, ty) {
  return G.towers.find((t) => t.tx === tx && t.ty === ty) || null;
}
export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: PLAY_TOP + (ty + 0.5) * TILE };
}
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
