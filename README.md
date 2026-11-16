[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/usb-star001/threejs-fps-02/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/usb-star001/threejs-fps-02/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

# BRINEWORKS: SALTLINE

An original offline, round-based tactical FPS with bots, objective play, and weapon loadouts.

**Local candidate: v2.3.0**

This candidate features a compact, fictional decommissioned reactor and service facility: Site A is aboveground, Site B is underground, and two connectors support rotations between floors. T and CT have balanced approaches and retake routes. Choose a starting side before play; teams swap at halftime while the existing buy phase, economy, and weapon categories remain intact.

Rookline uses the Vandal-47 and Sumpguard uses the Sentinel-4. T-side AR headshots kill through helmets; CT-side AR headshots deplete a helmet and leave helmeted full-health targets at 10 HP, while unhelmeted targets are killed. Targeting, movement, objectives, projectiles, smoke, and utility account for floor. The five weapon categories have distinct faction-aware first-person models with aligned shot feedback. Warm sunset pools enter through west-facing clerestory openings above, while cool floor-mounted fixtures light the lower service level. Surface values are balanced for readability across the warm upper and cool lower palettes. The armory labels the active T/CT faction; the CT showcase equips Sentinel-4, vest, and helmet through paid purchases.

## Changelog

- **v2.3.0** — Reworked the arena as a compact, fictional decommissioned reactor and service facility across upper Site A and lower Site B, with balanced T/CT routes and playable floor connectors. Added pregame T/CT starting-side choice with the existing halftime swap and buy economy intact. Rookline’s Vandal-47 kills through helmets on AR headshots; Sumpguard’s Sentinel-4 depletes a helmet and leaves a helmeted full-health target at 10 HP, while unhelmeted headshots kill. Production targeting, movement, objectives, projectiles, smoke, and utility are floor-aware; five weapon categories now have distinct faction-aware first-person view models. Upper-floor west-window sunset pools contrast with cool lighting emitted from the lower-floor fixtures. Surface values balance warm upper and cool lower tones for readability. Bots carry category-matched faction weapon profiles and staggered fire delays, avoiding a simultaneous first-frame volley. The armory labels the active T/CT faction and displays the actually purchased weapon and protection state.
- **v2.2.0** — Added an original low-poly teal sleeve, copper cuff, and glove to make the first-person weapon read as held. Every fired shot produces a brief layered amber/copper muzzle flash and short light; confirmed visible hostile hits additionally produce a deterministic fading tracer and faceted impact feedback with explicit geometry/material cleanup. Existing combat, round, and economy rules are unchanged.
- **v2.1.2** — Minimap enemy contacts are shown only while currently visible through the shared cover- and smoke-aware visibility callback; allies, player, and core markers remain unchanged.
- **v2.1.1** — Reticle gap tracks the equipped gun's shot spread, movement, and crouch accuracy, while a separate vertical offset reflects recoil; successful body/head hits show brief confirmation with damage actually applied. Armor durability bars and incoming-hit feedback show the health and vest/helmet durability actually lost, alongside remaining ally/enemy counts and live player/bot plant or defuse progress. Utility projectiles advance on deterministic fixed steps, bounce from box and cylindrical arena cover, and retain floor-bounce behavior; existing hostile-only utility effects and limits are unchanged. Added collision, combat-feedback-state, and armor-feedback regression coverage.
- **v2.1.0** — Streamlined armory stat labels, clarified the two-item utility cap and G/H/T/F mapping, and verified the layout fits short desktop viewports.
- **v2.0.0** — Procedural harbor materials and set dressing; five original weapon classes with distinct stats and a persistent round economy; halftime team-role swap, objective-capable AI, and polished combat feedback. Firearm and grenade eliminations share exact 300-credit rewards and clear kill-feed causes. Buyable tactical vest (650 credits, 100 durability, 50% body reduction) and helmet (350 credits, 100 durability, 50% Pistol/SMG/LMG headshot reduction) add round-based protection; AR and Sniper headshots remain lethal. Four round-limited utilities—Frag (350), Incendiary (450), Smoke (300), and Flashbang (250)—add deterministic damage, fire, concealment, and blinding effects, with two total slots and dedicated hotkeys. The armory is responsive and readable, armor purchases are limited to once each per round, and the live-state no-op was removed.
- **v1.0.0** — Initial offline tactical FPS build with one compact arena, bot opponents, weapon purchases, and a site objective.

## Run it

Requires Node.js 22.18+.

```sh
node serve.ts
```

Then open http://127.0.0.1:8080.

[make.fun bounty](https://make.fun/bounty/threejs-fps-02)
