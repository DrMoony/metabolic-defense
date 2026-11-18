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
