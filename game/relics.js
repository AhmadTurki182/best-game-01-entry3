// relics.js — the twelve relics. After each boss falls (waves 10, 20, 30 is
// the win) the player picks one of three; relics stack and shape the build.

export const RELICS = {
  'kindled-heart':   { name: 'Kindled Heart',   icon: '🔥', desc: 'Ember Spires deal +30% damage and burn hotter.' },
  'permafrost':      { name: 'Permafrost',      icon: '❄',  desc: 'Frost Shards slow +15% harder and 0.5s longer.' },
  'bramble-crown':   { name: 'Bramble Crown',   icon: '🌿', desc: 'Thorn Brambles splash +40% wider.' },
  'storm-rod':       { name: 'Storm Rod',       icon: '⚡', desc: 'Gale Bells chain lightning to +1 more foe.' },
  'deep-pockets':    { name: 'Deep Pockets',    icon: '🪙', desc: 'Every kill pays +25% more embers.' },
  'keen-eyes':       { name: 'Keen Eyes',       icon: '👁', desc: 'All towers gain +15% range.' },
  'overclock':       { name: 'Overclock',       icon: '⏱', desc: 'All towers fire +15% faster.' },
  'sharpened':       { name: 'Sharpened Tips',  icon: '🗡', desc: 'All towers deal +20% damage.' },
  'hearthstone':     { name: 'Hearthstone',     icon: '🛡', desc: 'The Hearth gains +10 max HP and heals 10 now.' },
  'ember-vein':      { name: 'Ember Vein',      icon: '💎', desc: 'A rich seam: +120 embers at once.' },
  'phoenix-feather': { name: 'Phoenix Feather', icon: '🪶', desc: 'Once: a lethal leak leaves the Hearth at 1 HP.' },
  'hunter-mark':     { name: 'Hunter’s Mark',   icon: '🎯', desc: 'Bosses take +25% damage from every tower.' },
};

export const RELIC_IDS = Object.keys(RELICS);

export function rollRelicChoices(G) {
  const pool = RELIC_IDS.filter((id) => !G.relics.includes(id));
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

export function applyRelic(G, id) {
  if (G.relics.includes(id)) return false;
  G.relics.push(id);
  if (id === 'hearthstone') {
    G.hearthMax += 10;
    G.hearthHP = Math.min(G.hearthMax, G.hearthHP + 10);
  }
  if (id === 'ember-vein') G.embers += 120;
  G.relicChoices = [];
  G.state = 'build';
  G.message = `Relic claimed: ${RELICS[id].name}! Build, then start wave ${G.wave + 1}.`;
  G.messageUntil = G.time + 4;
  return true;
}
