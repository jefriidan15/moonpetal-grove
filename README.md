# Moonpetal Grove

[![Make the best game](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/jefriidan15/moonpetal-grove/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/jefriidan15/moonpetal-grove/reward.svg)](https://make.fun/bounty/best-game-01)

**Moonpetal Grove** — a garden-defense arcade game for the
[make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).
You are the Keeper of the last garden on a drifting asteroid. Seeds ride the
solar wind down from the sky: catch them in your basket, plant them in the
six soil beds, water them until they bloom — and swat blight meteors out of
the sky before they crush a plant. Reach **900 points before dusk**; lose a
plant to blight 5 times and the grove withers.

## How to play

| Control | Action |
|---|---|
| Mouse / ← → (A / D) | Move the Keeper |
| Click a bed (or keys 1–6) | Plant a carried seed / water a plant / clear scorch |
| Space | Water the bed nearest the Keeper |
| Click a meteor | Swat it out of the sky (+10) |
| P / Esc | Pause |
| M | Mute |
| R | Restart the day |
| Enter / click | Start, or play again after the day ends |

Seeds come in three kinds — **Moonpetal** (40 pts, fast), **Sunberry**
(80 pts), **Starfern** (150 pts, slow). A plant left dry stops growing and
droops until watered; a watered plant grows 2.5× faster. Catching seeds
without dropping one builds a combo worth up to +100% score. Every 200
points the night deepens: seeds and meteors fall faster. Rain showers refill
the well.

## Run it

No build step, no network: everything is static files under `game/`.

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

or open `game/index.html` from any static file server. All art is drawn in
code on canvas and all sound is synthesised with WebAudio — no assets are
fetched.

Screenshots are real renders of the game: `?shot=start|play|end&seed=7`
puts the game into a fixed state (see `shots.json`).

## Layout

- `game/index.html` + `game/src/` — the game (config, RNG, simulation,
  renderer, input, sound, screenshot presets)
- `screenshots/` — 3 screenshots taken by headless Chrome
- `main.ts` — hands `game/` + `screenshots/` to `/output` with a dossier
  (`vendor/makefun-game.ts`, the kit's copy, unchanged)
- `serve.ts` — tiny static server for local play

License: MIT. An entry for make.fun competition `best-game-01` by
[@golden-condor-22](https://make.fun) (wallet
`JR782RiBv2bdGFHuUzwhjPuWHxsURxcPVezBQyTR91H`).
