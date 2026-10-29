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

## Weapons economy (v1.4.0)
Soldiers now need weapons, as in Stronghold. Every workshop needs a peasant and delivers to an **Armory**; its worker carries each finished weapon there.

| Workshop | Makes | Uses |
|---|---|---|
| Fletcher | 🏹 bows | 3 wood |
| Poleturner | 🔱 spears | 2 wood |
| Blacksmith | 🗡 swords or 🔨 maces (switch in its panel) | 2 iron |
| Armorer | 🛡 armor | 2 iron |

Recruiting at the Barracks costs a weapon plus gold and one peasant:

| Soldier | Cost |
|---|---|
| Archer | bow + 12🪙 |
| Spearman | spear + 8🪙 |
| Maceman | mace + 15🪙 |
| Swordsman | sword + armor + 20🪙 |

A new game starts with 4 bows and 4 spears. The ⚔ chip in the top bar shows your weapon total. Tap it for the breakdown.

The **Market** buys and sells every good (wood, stone, iron, food and all five weapons), and the sell price is always lower than the buy price.

## v1.5.0
- **Placement aims above your finger.** When you drag a building or tower, or draw a wall, the preview sits about 72 px above your finger, with a crosshair on the exact spot. The map editor brush works the same way.
- **Engineer's Guild.**
  - Its engineer walks to damaged walls, towers, gates and the keep and hammers them back to full. Repairs cost 1 stone per 100 hp (wood for palisades).
  - The guild also builds player **Catapults** (50🪙 40🪵 20🪨).
- **Enemy catapults** now arrive from wave 7. They stop at range and lob stones in a visible arc at your walls and towers.
- **Killing Pits** (6🪵). Enemies can't see them. The first enemy to step in takes 120 damage (siege engines take 60), and the pit is used up.
- **Taxes** (tap the Keep). Four levels, None, Low, High and Harsh, trade gold against how fast peasants move in.
- **⚔ Vs Computer** (Easy, Normal or Hard).
  - An 88×88 mirrored map with you in the west and an AI lord in the east.
  - The lord gathers resources, builds farms and woodcutters, a quarry, a mine and hovels, a barracks, a stone wall ring with a gatehouse, and corner towers.
  - He trains raiders, archers and brutes, plus rams and catapults later. His troops defend his castle, and he attacks you every few minutes.
  - Select soldiers and tap any enemy building to storm his castle. Destroy his keep to win.

## v1.5.1
- **Momentum panning**: a quick swipe keeps the map gliding and slowing down like an iPhone list (game, Vs Computer and the Map Editor). Touching the map stops it at once; pausing before lifting gives no glide. Placing, wall drawing, box select and pinch zoom are unchanged.
