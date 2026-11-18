# Fighter visual regressions

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/fighter/tests/visual.html` in a WebGL2 browser.
The page runs automatically using the production models, geometry, simulation,
camera and renderer. The final line must be `ALL VISUAL REGRESSIONS PASSED`.
Structured results are available at `window.VISUAL` (`done`, `results`, `failures`).

Coverage:

- 1,248 down/getup frames across all 12 characters and both directions, checking
  actual mesh vertices against the floor and asserting rendering leaves the
  simulation state untouched.
- Visceral jab forward travel and alignment with its attack range in both directions.
- 393 camera frames: all 84 specials in both directions, continuous heart uppercut,
  and both stage edges with airborne bosses.
- A held airborne pose to catch repeated camera zoom pulsing.
- The arcade menu's four-fight description.

These checks cover geometric framing and WebGL initialization, not every possible
pixel, animation transition, browser or GPU. Inspect representative screenshots
alongside the numeric assertions.

## Solo campaign and localization

Serve the repository root (for example `python3 -m http.server 8877`).

- `fighter/mission.html`: Korean solo run-and-gun campaign.
- `fighter/mission.html?lang=en`: English campaign.
- `fighter/?lang=en`: English fighting game. Both routes have language links; query parameters such as `bank` are preserved.

Run the dependency-free checks from the repository root:

```sh
node fighter/tests/mission.test.mjs
node fighter/tests/locale.test.mjs
```

The campaign suite exercises movement/platforms, every minion type, supply crates, all five operative abilities, boss gates/telegraphs/attacks, deaths/checkpoints, screen blasts, 35 operative/boss combinations, and five complete seven-sector runs with ordinary inputs. The locale suite checks all 12 fighters, 84 command names/descriptions and the displayed fields of the 23-question English default bank, and verifies that localization preserves combat data. Original-language source quotations in quiz metadata are preserved.

Campaign controls: A/D movement, W/Space jump, S crouch, G fire (hold), H melee, G+H screen blast at full meter, Esc/P pause, M sound. Arrows with Z/X, first gamepad and on-screen buttons also work. In the briefing, A/D or the first gamepad's horizontal directions select an operative; Punch/G deploys or confirms a result. Enter also starts/confirms. Defeat all 15 invaders to open a sector's boss gate. Crouch-fire or melee supply crates; green heals, amber grants 15 seconds of spread fire, blue absorbs one hit. Boss deaths refill health on the next sector, while a player's death spends one of three lives and retries the current sector or its unlocked boss checkpoint.

For browser development, `MISSION` exposes `sim`, `renderer`, `start()`, `pause()`, `proceed()`, `run(frames, input)` and a `freeze` flag that stops simulation while allowing rendering. Reload after using development handles to restore normal play. Visual tests need a real browser with WebGL and should also check the live title, controls, pause, boss warning, checkpoint retry and sector/result panels in both locales. The campaign uses the existing GLB characters and procedural scenery/minions; no remote runtime dependencies were added.

Open `fighter/tests/mission-visual.html?lang=en` for the campaign's WebGL regression suite: 275 sampled actor frames cover ground contact, normal attacks, jump apexes, rising boss attacks, and both horizontal edges. It verifies that rendered geometry stays above the floor and outside the HUD. `MISSION_VISUAL.done`, `results` and `failures` expose the outcome. This is sampled regression coverage, not exhaustive coverage of every animation frame or hardware/browser combination.
