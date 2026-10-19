# Hold the Keep

A small castle-building and siege-defense game for phones, inspired by classic castle sims. Plain HTML, JS, and canvas, with no build step. It works offline as a PWA.

- Play: https://danielo3222.github.io/castle-game/
- Test: `python3 -m http.server 8797` then `python tests/smoke.py` (needs Playwright and Chrome)

## Map Editor (v1.3.0)
Open **🛠 Map Editor** on the start screen. You can:
- Paint grass, trees, stone, iron, water, dirt and marsh with a 1, 3 or 5 tile brush.
- Use forest scatter, the eraser, and flood fill.
- Turn on mirror painting (↔, ↕ or 4-way).
- Place the keep and up to 8 enemy spawn points.
- Generate random land or start from blank, on a 48, 64 or 96 tile map.
- Undo and redo, and pan and pinch-zoom the map.

**Map settings**
- Starting goods
- Peasants
- Difficulty
- First wave timer and the gap between waves
- Win after N waves, or endless
- Siege engines on or off

**Saving and sharing**
- Maps save automatically in your browser.
- From the map list you can edit, play, rename, copy, share or delete a map.
- Share a map as an `HTK1.` code or a `.json` file, and import either one.

**Before you play**
The editor checks that the keep is placed, that there is at least one spawn point, and that enemies can actually reach the keep.

Start a game on your map with **Play Custom Map**.
