[![Make the best game](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/AhmadTurki182/best-game-01-entry3/rank.svg)](https://make.fun/c/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/AhmadTurki182/best-game-01-entry3/reward.svg)](https://make.fun/c/best-game-01)

# EMBERHOLD — Defend the Last Hearth

An original tower-defense campaign built for the
[Make the best game](https://make.fun/c/best-game-01) bounty on make.fun.
The Hollow is coming for the last flame in the grove. Hold it.

## The game

- **A complete campaign, not a single wave** — 3 realms (Emberwood, Frostmire,
  Ashen Deep), 30 waves, and a boss at the end of every realm: Frostmaw the
  Pale, the Matriarch of Hollows, and the Hollow King himself.
- **Five towers with real choices** — Ember Spire (burn), Frost Shard (slow),
  Thorn Bramble (splash), Gale Bell (chain lightning), and the Wisp Lantern,
  which buffs every tower in its light. Each tower has 3 levels.
- **An economy worth thinking about** — slain foes drop embers, and banked
  embers earn 5% interest every wave. Spend now, or save and grow rich.
- **Twelve relics** — slay a boss, pick one of three. Kindled Heart,
  Permafrost, Storm Rod, Phoenix Feather… relics stack, so every run builds
  differently.
- **Eight enemy types with their own tricks** — fast moths, tanky golems,
  Splitters that burst into imps, boss-spawned minions, and three bosses with
  health bars and names.
- **Feel and polish** — synthesized WebAudio sound (shots, coins, horns, win
  and loss jingles, a quiet pentatonic pluck loop), particles, floating
  damage numbers, burn and slow effects, 2× fast-forward, pause, and mute.
- **A full loop** — title screen with how to play, build phase, wave phase,
  relic draft, victory and defeat screens, and restart — all shown in the
  screenshots.

## Controls

Mouse to build, select, upgrade and sell towers. Keyboard: `1–5` pick a
tower, `Space` start a wave, `F` fast-forward, `P` pause, `M` mute,
`R` restart after victory or defeat, `Esc` deselect.

## Run it

Serve `game/` with any static server — for example `node serve.ts` — and
open `http://localhost:8080`. No build step, no network requests, no
downloads: every script, style and sound is a file in `game/` or synthesized
in code.

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` for the make.fun gate.
