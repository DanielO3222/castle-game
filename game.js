'use strict';
(() => {
const VERSION = '1.5.1';
const T = 32, SAVE_KEY = 'htk-save-v1', TUT_KEY = 'htk-tut-done';
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const mini = $('mini'), mctx = mini.getContext('2d');

// ---------- definitions ----------
const B = {
  keep:      {name:'Keep', w:3,h:3,hp:3000, spr:'keep', sw:3.4, cost:{}, house:8, shoot:{r:6.5,d:10,cd:1.1}, desc:'Your seat of power. If it falls, the game is lost. Shoots arrows at nearby enemies.'},
  stockpile: {name:'Stockpile', w:2,h:2,hp:200, spr:'stockpile', sw:2.3, cost:{wood:5}, drop:['wood','stone','iron'], desc:'Workers drop wood, stone and iron here. Build more near far-away woodcutters and quarries.'},
  granary:   {name:'Granary', w:2,h:2,hp:250, spr:'granary', sw:2.2, cost:{wood:10}, drop:['food'], desc:'Farmers bring food here.'},
  woodcutter:{name:'Woodcutter', w:2,h:2,hp:150, spr:'woodcutter', sw:2.2, cost:{wood:10}, prod:'wood', amt:6, work:5, near:1, nearR:5, chop:1, desc:'Its worker walks out, chops down nearby trees and hauls the logs to the stockpile. Felled trees are gone for good, opening up the land. Build it near a forest. Needs 1 peasant.'},
  quarry:    {name:'Quarry', w:2,h:2,hp:200, spr:'quarry', sw:2.4, cost:{wood:20}, prod:'stone', amt:6, work:8, on:2, mine:1, desc:'Cuts stone. Must be built right on top of gray stone rocks. Needs 1 peasant.'},
  mine:      {name:'Iron Mine', w:2,h:2,hp:220, spr:'mine', sw:2.4, cost:{wood:20,stone:10}, prod:'iron', amt:3, work:10, on:5, mine:1, desc:'Digs iron ore. Must be built right on top of rusty red iron rocks. Needs 1 peasant. Iron buys Swordsmen.'},
  farm:      {name:'Apple Farm', w:3,h:3,hp:120, spr:'farm', sw:3.3, cost:{wood:15}, prod:'food', amt:8, work:9, desc:'Grows apples. Needs 1 peasant.'},
  hovel:     {name:'Hovel', w:2,h:2,hp:150, spr:'house', sw:2.0, cost:{wood:12}, house:6, desc:'Houses 6 more people. Peasants move in while you have food.'},
  market:    {name:'Market', w:2,h:2,hp:150, spr:null, cost:{wood:20}, desc:'Trade goods for gold, or gold for goods.'},
  armory:    {name:'Armory', w:2,h:2,hp:300, spr:'armory', sw:2.2, cost:{wood:15}, drop:['bow','spear','mace','sword','armor'], sign:'🛡', desc:'Weapons and armor are stored here. Workshops need one to deliver to. Recruiting takes weapons from here.'},
  fletcher:  {name:'Fletcher', w:2,h:2,hp:150, spr:'fletcher', sw:2.0, cost:{wood:20}, prod:'bow', inp:{wood:3}, amt:1, work:12, craft:1, sign:'🏹', desc:'Carves bows from 3 wood. Bows arm Archers. Needs 1 peasant and an Armory.'},
  poleturner:{name:'Poleturner', w:2,h:2,hp:150, spr:'poleturner', sw:2.0, cost:{wood:15}, prod:'spear', inp:{wood:2}, amt:1, work:10, craft:1, sign:'🔱', desc:'Turns 2 wood into a spear. Spears arm Spearmen. Needs 1 peasant and an Armory.'},
  blacksmith:{name:'Blacksmith', w:2,h:2,hp:200, spr:'blacksmith', sw:2.0, cost:{wood:20,stone:10}, prod:'sword', alt:'mace', inp:{iron:2}, amt:1, work:14, craft:1, sign:'⚒', desc:'Forges swords (or maces) from 2 iron. Tap it to switch. Needs 1 peasant and an Armory.'},
  armorer:   {name:'Armorer', w:2,h:2,hp:200, spr:'armorer', sw:2.0, cost:{wood:20,stone:10}, prod:'armor', inp:{iron:2}, amt:1, work:14, craft:1, sign:'🛡', desc:'Hammers 2 iron into metal armor. Swordsmen need armor. Needs 1 peasant and an Armory.'},
  guild:     {name:"Engineer's Guild", w:2,h:2,hp:250, spr:'guild', sw:2.1, cost:{wood:25,stone:15}, prod:'repair', repair:1, sign:'🔧', desc:'Its engineer walks to damaged walls, towers, gates and the keep and repairs them, using a little stone (wood for palisades). Also builds Catapults. Needs 1 peasant.'},
  barracks:  {name:'Barracks', w:3,h:3,hp:500, spr:'barracks', sw:3.3, cost:{wood:30,stone:20}, desc:'Turn idle peasants into soldiers.'},
  tower:     {name:'Tower', w:2,h:2,hp:1000, spr:'tower', sw:2.0, cost:{stone:25}, walk:1, shoot:{r:7,d:12,cd:1.2}, desc:'A lookout tower with its own archer. Put more archers on it for extra range.'},
  wall:      {name:'Stone Wall', w:1,h:1,hp:500, cost:{stone:2}, line:1, walk:1, desc:'Strong wall. Archers standing on it get extra range and are safe from swords.'},
  palisade:  {name:'Palisade', w:1,h:1,hp:200, cost:{wood:2}, line:1, walk:1, desc:'Cheap wooden wall. Weaker than stone.'},
  pit:       {name:'Killing Pit', w:1,h:1,hp:1, cost:{wood:6}, pit:1, desc:'A hidden spiked pit. Enemies can\'t see it: the first one to step in takes 120 damage (siege engines 60). Then it is used up.'},
  gate:      {name:'Gatehouse', w:1,h:1,hp:1200, cost:{stone:15}, walk:1, gate:1, desc:'Your soldiers walk through it, enemies have to smash it. Place it in a wall line.'},
};
const PRODS = ['woodcutter','quarry','mine','farm'];
const TREE_WOOD = 18, STUMP_CLEAR = 20;  // wood per tree tile; a felled tree leaves a stump that clears to grass after 20 s
const UNIT = {
  archer: {name:'Archer', hp:50, dmg:10, cd:1.2, spd:1.4, range:5.5, cost:{gold:12,bow:1}},
  spear:  {name:'Spearman', hp:130, dmg:15, cd:1.0, spd:1.45, aggro:3.5, cost:{gold:8,spear:1}},
  mace:   {name:'Maceman', hp:170, dmg:22, cd:.9, spd:1.6, aggro:4, cost:{gold:15,mace:1}},
  sword:  {name:'Swordsman', hp:240, dmg:26, cd:1.1, spd:1.15, aggro:3.5, cost:{gold:20,sword:1,armor:1}},
  raider: {name:'Raider', hp:60, dmg:8, sdmg:8, cd:1.0, spd:1.1},
  earcher:{name:'Enemy Archer', hp:40, dmg:6, sdmg:4, cd:1.6, spd:1.0, range:5},
  brute:  {name:'Brute', hp:260, dmg:12, sdmg:40, cd:1.2, spd:0.65},
  // siege equipment: ignores soldiers, shrugs off some of the arrow damage
  ram:      {name:'Battering Ram', hp:320, dmg:0, sdmg:60, cd:2.0, spd:0.45, armor:.5, siege:1},
  stower:   {name:'Siege Tower', hp:520, dmg:0, sdmg:10, cd:2.0, spd:0.4, armor:.5, siege:1, crew:4},
  catapult: {name:'Catapult', hp:220, dmg:0, sdmg:70, cd:4.5, spd:0.5, armor:1, siege:1, range:9, cost:{gold:50,wood:40,stone:20}},
};
const RES = ['wood','stone','iron','food','gold'];
const WEAP = ['bow','spear','mace','sword','armor'];
const ICON = {wood:'🪵', stone:'🪨', iron:'🔩', food:'🍎', gold:'🪙', pop:'👥', bow:'🏹', spear:'🔱', mace:'🔨', sword:'🗡', armor:'🛡'};
const GNAME = {wood:'wood', stone:'stone', iron:'iron', food:'food', gold:'gold', bow:'bows', spear:'spears', mace:'maces', sword:'swords', armor:'armor'};
const START_WEAP = {bow:4, spear:4, mace:0, sword:0, armor:0};
// market prices: raw goods per 10, weapons per 1 (you always sell for less than you buy)
const TRADE = {lot:{wood:10, stone:10, iron:10, food:10, bow:1, spear:1, mace:1, sword:1, armor:1},
  sell:{wood:5, stone:7, iron:12, food:5, bow:8, spear:5, mace:10, sword:14, armor:14}, buy:{wood:12, stone:16, iron:28, food:12, bow:20, spear:14, mace:26, sword:36, armor:36}};
const costTxt = c => Object.entries(c).map(([k,v]) => v + ICON[k]).join(' ') || 'free';

// ---------- assets ----------
const IMG = {};
const SPR = ['keep','stockpile','granary','woodcutter','quarry','farm','house','barracks','tower','trees','rock','gate'];
function tinted(im, col, a) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; }
function loadAssets() {
  return Promise.all(SPR.map(n => new Promise(res => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = res; im.src = 'assets/' + n + '.png'; })))
    .then(() => { if (IMG.rock) IMG.iron = tinted(IMG.rock, '#b4441c', .5); if (IMG.quarry) IMG.mine = tinted(IMG.quarry, '#8a2e12', .35);
      if (IMG.house) { IMG.fletcher = tinted(IMG.house, '#3f7a34', .28); IMG.poleturner = tinted(IMG.house, '#b8862a', .28); IMG.blacksmith = tinted(IMG.house, '#2a2a30', .45); IMG.armorer = tinted(IMG.house, '#4a5a78', .4); IMG.guild = tinted(IMG.house, '#7a3a20', .35); }
      if (IMG.granary) IMG.armory = tinted(IMG.granary, '#3a4250', .5); });
}

// ---------- rng / noise ----------
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vnoise(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const u = fx*fx*(3-2*fx), v = fy*fy*(3-2*fy);
  const a = hash(ix,iy,s), b = hash(ix+1,iy,s), c = hash(ix,iy+1,s), d = hash(ix+1,iy+1,s); return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v; }

// ---------- state ----------
let N = 64;                  // map size in tiles (48 / 64 / 96 for custom maps)
let S = null;               // saved game state
let ter = new Uint8Array(N*N);   // 0 grass 1 forest 2 rock 3 water
let occ = new Int32Array(N*N);   // building id per tile
let byId = new Map();
let flow = new Float32Array(N*N), flowP = new Float32Array(N*N), flowDirty = true;
let terrainCv = null, miniBase = null;
let projectiles = [], particles = [], workers = new Map();
let paused = false, speedIdx = 0; const SPEEDS = [1,2,3];
const idx = (x, y) => y*N + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
let KX = 31, KY = 31;   // keep top-left tile
// terrain codes: 0 grass, 1 trees, 2 stone, 3 water, 4 stump, 5 iron, 6 dirt (decorative), 7 marsh (decorative, slow, can't build)
function setMapSize(n) { N = n; ter = new Uint8Array(N*N); occ = new Int32Array(N*N); flow = new Float32Array(N*N); flowP = new Float32Array(N*N); }
const DEFAULT_CFG = {diff:'normal', first:240, between:90, win:0, siege:true};
const TAX = [{n:'None', g:0, imm:3, d:'No gold, but people flock in fast'}, {n:'Low', g:.05, imm:5, d:'Normal'}, {n:'High', g:.1, imm:10, d:'Double gold, slow immigration'}, {n:'Harsh', g:.16, imm:0, leave:25, d:'Triple gold, nobody moves in, people slowly leave'}];
const DIFF = {easy:{count:.7, hp:.85}, normal:{count:1, hp:1}, hard:{count:1.35, hp:1.15}};
const cfg = () => (S && S.cfg) || DEFAULT_CFG;

function genTerrain(seed, n = 64) {
  setMapSize(n); KX = KY = Math.floor(n/2) - 1; const sc = n/64;
  const r = rng(seed);
  const kc = {x:KX+1.5, y:KY+1.5};
  const blob = (cx, cy, rad, type) => {
    for (let y = Math.floor(cy-rad-3); y <= cy+rad+3; y++) for (let x = Math.floor(cx-rad-3); x <= cx+rad+3; x++) {
      if (!inb(x,y)) continue;
      const d = Math.hypot(x+.5-cx, y+.5-cy), n = vnoise(x*.35, y*.35, seed + type*17);
      if (d < rad*(0.7 + 0.6*n) && ter[idx(x,y)] === 0) ter[idx(x,y)] = type;
    }
    if (type === 2 || type === 5) { const ox = Math.floor(cx) - 1, oy = Math.floor(cy) - 1;   // solid 3x3 core so a 2x2 quarry/mine always fits
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (inb(ox+i, oy+j) && ter[idx(ox+i, oy+j)] <= 1) ter[idx(ox+i, oy+j)] = type; }
  };
  const at = (ang, dist) => ({x: kc.x + Math.cos(ang)*dist, y: kc.y + Math.sin(ang)*dist});
  const a0 = r()*Math.PI*2;
  let p = at(a0, 11.5); blob(p.x, p.y, 4.2, 1);
  p = at(a0 + 2.3, 11); blob(p.x, p.y, 2.6, 2);
  for (let i = 0; i < Math.round(7*sc*sc); i++) { p = at(r()*Math.PI*2, (15 + r()*15)*sc); blob(p.x, p.y, 3 + r()*4, 1); }
  for (let i = 0; i < Math.round(4*sc*sc); i++) { p = at(r()*Math.PI*2, (14 + r()*14)*sc); blob(p.x, p.y, 2 + r()*1.8, 2); }
  for (let i = 0; i < Math.round(2*sc*sc); i++) { p = at(r()*Math.PI*2, (17 + r()*10)*sc); blob(p.x, p.y, 2.5 + r()*1.5, 3); }
  const r2 = rng(seed ^ 0x51ed);   // iron uses its own rng so older saves keep the same map
  for (let i = 0; i < Math.round(3*sc*sc); i++) { const q = at(r2()*Math.PI*2, (16 + r2()*10)*sc); blob(q.x, q.y, 2 + r2()*.8, 5); }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (Math.hypot(x+.5-kc.x, y+.5-kc.y) < 7) ter[idx(x,y)] = 0;
    if (x === 0 || y === 0 || x === N-1 || y === N-1) { if (ter[idx(x,y)] >= 2) ter[idx(x,y)] = 0; }
  }
}

function newState(seed) {
  S = {v:1, ver:VERSION, seed, t:0, res:{wood:150, stone:80, iron:0, food:80, gold:60, ...START_WEAP}, tw:{}, stumps:{}, pop:6, b:[], u:[], nid:1,
       wave:{n:0, next:240, active:false}, kills:0, over:false, tut:0, starveT:0, popT:0};
  genTerrain(seed);
  addB('keep', KX, KY); addB('stockpile', KX+4, KY+1); addB('granary', KX-3, KY+1);
  reocc(); workers.clear(); projectiles = []; particles = []; stones = [];
}
// ---------- custom maps ----------
function rleEncode(a) { let out = '', i = 0; while (i < a.length) { let j = i; while (j < a.length && a[j] === a[i]) j++; out += a[i] + (j - i).toString(36) + ','; i = j; } return out; }
function rleDecode(str, n) { const a = new Uint8Array(n*n); let p = 0; for (const run of str.split(',')) { if (!run) continue; const v = +run[0], c = parseInt(run.slice(1), 36); a.fill(v, p, p + c); p += c; } return a; }
function nearSpot(k, cx, cy) { let best = null, bd = 1e9; for (let y = cy - 8; y <= cy + 8; y++) for (let x = cx - 8; x <= cx + 8; x++) { const c = canPlace(k, x, y); if (!(c.ok || c.poor)) continue; const d = Math.hypot(x - cx, y - cy); if (d < bd) { bd = d; best = {x, y}; } } return best; }
function newStateFromMap(m) {
  const st = m.settings || {};
  S = {v:1, ver:VERSION, seed:0, t:0, res:{wood:150, stone:80, iron:0, food:80, gold:60, ...START_WEAP, ...(st.res || {})}, tw:{}, stumps:{}, pop:st.pop ?? 6, b:[], u:[], nid:1,
       wave:{n:0, next:(st.first ?? DEFAULT_CFG.first), active:false}, kills:0, over:false, tut:0, starveT:0, popT:0,
       cfg:{...DEFAULT_CFG, ...st, res:undefined, pop:undefined}, custom:{name:m.name, id:m.id, size:m.size, ter:m.ter, keep:m.keep, spawns:m.spawns}};
  loadCustomTerrain(S.custom);
  addB('keep', KX, KY); reocc();
  for (const [k, dx] of [['stockpile', 4], ['granary', -3]]) { const p = nearSpot(k, KX + dx, KY + 1); if (p) { addB(k, p.x, p.y); reocc(); } }
  workers.clear(); projectiles = []; particles = []; stones = [];
}
function loadCustomTerrain(c) {
  setMapSize(c.size); ter = rleDecode(c.ter, c.size); KX = c.keep.x; KY = c.keep.y;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) ter[idx(KX+i, KY+j)] = 0;
}
function dirName(x, y) { const a = Math.atan2(y - (KY + 1.5), x - (KX + 1.5)); return ['east','south-east','south','south-west','west','north-west','north','north-east'][(Math.round(a/(Math.PI/4)) + 8) % 8]; }
function addB(k, x, y, hp) { const b = {id:S.nid++, k, x, y, hp: hp ?? B[k].hp, cd:0}; S.b.push(b); byId.set(b.id, b); return b; }
function reocc() {
  occ.fill(0); byId.clear();
  for (const b of S.b) { byId.set(b.id, b); const d = B[b.k]; if (d.pit) continue; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) occ[idx(b.x+i, b.y+j)] = b.id; }
  flowDirty = true;
}
const bAt = (x, y) => inb(x,y) ? (byId.get(occ[idx(x,y)]) || pitAt(x, y)) : null;
const pitAt = (x, y) => S.b.find(b => b.k === 'pit' && b.x === x && b.y === y) || null;
const keep = () => S.b.find(b => b.k === 'keep' && !b.tm);
const aiKeep = () => S.b.find(b => b.k === 'keep' && b.tm === 1);
const count = k => S.b.reduce((n, b) => n + (b.k === k && !b.tm), 0);
const soldiers = () => S.u.filter(u => u.tm === 0);
const cap = () => S.b.reduce((n, b) => n + (b.tm ? 0 : B[b.k].house || 0), 0);
const prodBs = () => S.b.filter(b => B[b.k].prod && !b.tm);
const employed = () => Math.min(S.pop, prodBs().length);
const idle = () => S.pop - employed();
const afford = c => Object.entries(c).every(([k,v]) => S.res[k] >= v);
const pay = c => { for (const [k,v] of Object.entries(c)) S.res[k] -= v; };
const refund = (c, f) => { for (const [k,v] of Object.entries(c)) S.res[k] += Math.floor(v*f); };
function flashRes(c) { for (const k of Object.keys(c)) if ((S.res[k] || 0) < c[k]) { const e = $(WEAP.includes(k) ? 'r-arms' : 'r-'+k); if (!e) continue; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); } }

// ---------- placement ----------
function canPlace(k, x, y) {
  if (B[k] && !B[k].line) { const d = B[k]; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) if (inb(x+i, y+j) && pitAt(x+i, y+j)) return {ok:false, why:'A killing pit is already there'}; }
  const d = B[k];
  if (x < 1 || y < 1 || x + d.w > N-1 || y + d.h > N-1) return {ok:false, why:'Too close to the map edge'};
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const t = ter[idx(x+i, y+j)], o = occ[idx(x+i, y+j)];
    if (d.on) { if (t !== d.on) return {ok:false, why: d.on === 2 ? 'A Quarry must sit right on gray stone rocks 🪨' : 'An Iron Mine must sit right on rusty red iron rocks 🔩'}; }
    else if (t !== 0 && t !== 4 && t !== 6 && !(t === 1 && k === 'gate')) return {ok:false, why: t === 7 ? 'Too marshy to build here' : t === 2 || t === 5 ? 'Can\'t build on rocks' : t === 3 ? 'Can\'t build on water' : t === 1 ? 'Trees are in the way. Pick open grass' : 'Needs open grass'};
    if (o) { const ob = byId.get(o); if (!((k === 'gate' || k === 'tower') && ob && (ob.k === 'wall' || ob.k === 'palisade'))) return {ok:false, why:'Something is already there'}; continue; }
  }
  if (d.near) {
    let n = 0; const R = d.nearR;
    for (let j = -R; j < d.h + R; j++) for (let i = -R; i < d.w + R; i++) if (inb(x+i, y+j) && ter[idx(x+i, y+j)] === d.near) n++;
    if (n < 6) return {ok:false, why: n ? `Only ${n} tree${n > 1 ? 's' : ''} in reach. Move closer to the forest 🌲` : 'Build it closer to a forest 🌲'};
  }
  const net = netCost(k, x, y);
  if (!afford(net)) return {ok:false, why:'Not enough ' + Object.keys(net).filter(r => S.res[r] < net[r]).join(' & '), poor:true};
  return {ok:true};
}
// towers and gatehouses can be dropped into a wall line: the wall sections they replace pay toward them
function replacedWalls(k, x, y) { if (k !== 'tower' && k !== 'gate') return []; const d = B[k], out = new Set();
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) { const o = bAt(x+i, y+j); if (o && !o.tm && (o.k === 'wall' || o.k === 'palisade')) out.add(o); } return [...out]; }
function netCost(k, x, y) { const c = {...B[k].cost}; for (const w of replacedWalls(k, x, y)) for (const [r, v] of Object.entries(B[w.k].cost)) c[r] = (c[r] || 0) - v;
  for (const r in c) if (c[r] <= 0) delete c[r]; return c; }
function place(k, x, y) {
  const c = canPlace(k, x, y); if (!c.ok) return c;
  const net = netCost(k, x, y); pay(net); const repl = replacedWalls(k, x, y);
  // refund whatever the replaced sections were worth beyond the price (e.g. wood from palisades)
  const paidBy = {}; for (const w of repl) for (const [r, v] of Object.entries(B[w.k].cost)) paidBy[r] = (paidBy[r] || 0) + v;
  for (const [r, v] of Object.entries(paidBy)) { const extra = v - (B[k].cost[r] || 0); if (extra > 0) S.res[r] += extra; }
  if (repl.length) S.b = S.b.filter(b => !repl.includes(b));
  if (k === 'tower') for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) clearTree(x+i, y+j);
  if (k === 'gate') clearTree(x, y); const b = addB(k, x, y); reocc(); puff((x + B[k].w/2)*T, (y + B[k].h)*T, '#c9b48a', 10);
  return {ok:true, b, paid:net, replaced:repl.length};
}
function snapLine(x0, y0, x1, y1) {
  let dx = x1 - x0, dy = y1 - y0; const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax > 2*ay) dy = 0; else if (ay > 2*ax) dx = 0; else { const l = Math.max(ax, ay); dx = Math.sign(dx)*l; dy = Math.sign(dy)*l; }
  const n = Math.max(Math.abs(dx), Math.abs(dy)), sx = Math.sign(dx), sy = Math.sign(dy), out = [];
  for (let i = 0; i <= n; i++) out.push({x:x0 + sx*i, y:y0 + sy*i});
  return out;
}
function wallPlan(k, x0, y0, x1, y1) {
  const tiles = snapLine(x0, y0, x1, y1), per = B[k].cost; let n = 0;
  for (const t of tiles) {
    if (!inb(t.x, t.y) || t.x < 1 || t.y < 1 || t.x > N-2 || t.y > N-2 || (ter[idx(t.x,t.y)] > 1 && ter[idx(t.x,t.y)] !== 4 && ter[idx(t.x,t.y)] !== 6)) { t.s = 'bad'; continue; }
    const o = bAt(t.x, t.y);
    if (o) { t.s = (o.k === k || o.k === 'gate' || o.k === 'tower' || (o.k === 'wall' && k === 'palisade')) ? 'skip' : (o.k === 'palisade' && k === 'wall') ? 'up' : 'bad'; if (t.s === 'up') n++; continue; }
    t.s = 'ok'; n++;
  }
  const cost = {}; for (const [r,v] of Object.entries(per)) cost[r] = v*n;
  return {tiles, n, cost, ok: n > 0 && afford(cost)};
}
function commitWall(k, x0, y0, x1, y1) {
  const p = wallPlan(k, x0, y0, x1, y1);
  if (!p.n) return {ok:false, why:'Nothing to build there'};
  if (!p.ok) return {ok:false, why:'Not enough ' + Object.keys(p.cost)[0] + ' for ' + p.n + ' sections (' + costTxt(p.cost) + ')', poor:true, cost:p.cost};
  pay(p.cost); const ids = [];
  for (const t of p.tiles) if (t.s === 'ok' || t.s === 'up') {
    if (t.s === 'up') { const o = bAt(t.x, t.y); S.b = S.b.filter(b => b !== o); }
    clearTree(t.x, t.y); const b = addB(k, t.x, t.y); b.rise = 0; ids.push(b.id);
  }
  reocc(); return {ok:true, ids, cost:p.cost, n:p.n};
}
function clearTree(x, y) { const i = idx(x, y); if (ter[i] === 4) { ter[i] = 0; delete S.stumps[i]; (S.cleared = S.cleared || []).push(i); return; } if (ter[i] !== 1) return; ter[i] = 0; (S.cleared = S.cleared || []).push(i); treeList = treeList.filter(t => !(Math.floor(t.x) === x && Math.floor(t.y - .5) === y)); }
function demolish(b, frac = 0.5) {
  if (!b || b.k === 'keep' || b.tm) return false;
  refund(B[b.k].cost, frac); S.b = S.b.filter(x => x !== b); workers.delete(b.id); reocc();
  puff((b.x + B[b.k].w/2)*T, (b.y + B[b.k].h)*T, '#9a8a70', 12); return true;
}
function destroyB(b) {
  S.b = S.b.filter(x => x !== b); workers.delete(b.id); reocc();
  const d = B[b.k]; for (let i = 0; i < 18; i++) puff((b.x + Math.random()*d.w)*T, (b.y + Math.random()*d.h)*T, '#8a7c66', 1);
  if (b.tm === 1) { flowDirty = true; if (b.k === 'keep') vsWin(); else if (!d.line) toast('🔥 Enemy ' + d.name + ' destroyed!', 'big'); return; }
  if (b.k === 'keep') gameOver(); else if (!d.line) toast(d.name + ' destroyed!', 'bad');
}
function repairCost(b) { const d = B[b.k], f = 1 - b.hp/d.hp; const c = {}; for (const [r,v] of Object.entries(d.cost)) c[r] = Math.ceil(v*f*0.6); if (b.k === 'keep') c.stone = Math.ceil(f*60); return c; }

// ---------- pathing ----------
const passT = i => ter[i] === 0 || ter[i] === 4 || ter[i] === 6 || ter[i] === 7;   // trees, rocks, iron and water block all soldiers and enemies
const walkF = i => { if (!passT(i)) return false; const o = occ[i]; if (!o) return true; const b = byId.get(o); return !!(b && B[b.k].walk); };
class Heap { constructor() { this.a = []; } push(n, p) { const a = this.a; a.push([p,n]); let i = a.length-1; while (i > 0) { const q = (i-1) >> 1; if (a[q][0] <= a[i][0]) break; [a[q],a[i]] = [a[i],a[q]]; i = q; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2*i+1, r = l+1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m],a[i]] = [a[i],a[m]]; i = m; } } return top[1]; }
  get size() { return this.a.length; } }
const DIRS = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
function enterCost(i) {
  if (!passT(i)) return Infinity;
  let c = ter[i] === 7 ? 1.6 : 1; const o = occ[i];
  if (o) { const b = byId.get(o); if (b.tm === 1) return B[b.k].walk ? 1.2 : Infinity; if (b.k === 'keep') return 0; if (b.bridge) return 1; c += B[b.k].hp / 25; }
  return c;
}
// cost for the player's soldiers marching on the enemy lord's castle (Vs Computer)
function enterCostP(i) {
  if (!passT(i)) return Infinity;
  let c = ter[i] === 7 ? 1.6 : 1; const o = occ[i];
  if (o) { const b = byId.get(o); if (!b.tm) return B[b.k].walk ? 1 : Infinity; if (b.k === 'keep') return 0; c += B[b.k].hp / 25; }
  return c;
}
const openE = i => passT(i) && !occ[i];
function computeFlow() {
  fieldFrom(flow, KX, KY, enterCost);
  const ak = S && S.mode === 'vs' && aiKeep(); if (ak) fieldFrom(flowP, ak.x, ak.y, enterCostP);
  flowDirty = false;
}
function fieldFrom(F, kx, ky, EC) {
  F.fill(Infinity); const h = new Heap();
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const k = idx(kx+i, ky+j); F[k] = 0; h.push(k, 0); }
  while (h.size) {
    const u = h.pop(), ux = u % N, uy = (u / N) | 0, du = F[u], ec = EC(u);
    for (const [dx,dy,m] of DIRS) {
      const vx = ux + dx, vy = uy + dy; if (!inb(vx, vy)) continue; const v = idx(vx, vy);
      if (!passT(v)) continue;
      if (m > 1 && (occ[u] || !openE(idx(ux, vy)) || !openE(idx(vx, uy)))) continue;
      const nd = du + ec*m; if (nd < F[v]) { F[v] = nd; h.push(v, nd); }
    }
  }
}
function bestStep(tx, ty, pl) {
  const F = pl ? flowP : flow, EC = pl ? enterCostP : enterCost;
  const v = idx(tx, ty); let best = -1, bd = Infinity;
  for (const [dx,dy,m] of DIRS) {
    const ux = tx + dx, uy = ty + dy; if (!inb(ux, uy)) continue; const u = idx(ux, uy);
    if (m > 1 && (occ[u] || !openE(idx(ux, ty)) || !openE(idx(tx, uy)))) continue;
    const c = EC(u); if (c === Infinity) continue; const d = F[u] + c*m;
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}
function astar(sx, sy, gx, gy, wf0 = walkF, cap = 6000) {
  const s = idx(sx, sy), g = idx(gx, gy); if (s === g) return []; const walkF = wf0 === undefined ? null : (i => i === g || wf0(i));
  const gs = new Float32Array(N*N).fill(Infinity), from = new Int32Array(N*N).fill(-1), h = new Heap();
  gs[s] = 0; h.push(s, 0); let n = 0;
  while (h.size && n++ < cap) {
    const u = h.pop(); if (u === g) break; const ux = u % N, uy = (u / N) | 0;
    for (const [dx,dy,m] of DIRS) {
      const vx = ux + dx, vy = uy + dy; if (!inb(vx, vy)) continue; const v = idx(vx, vy);
      if (!walkF(v)) continue; if (m > 1 && (!walkF(idx(ux, vy)) || !walkF(idx(vx, uy)))) continue;
      const nd = gs[u] + m; if (nd < gs[v]) { gs[v] = nd; from[v] = u; const hx = Math.abs(vx-gx), hy = Math.abs(vy-gy); h.push(v, nd + Math.max(hx,hy) + 0.414*Math.min(hx,hy)); }
    }
  }
  if (from[g] < 0) return null;
  const path = []; for (let c = g; c !== s; c = from[c]) path.push(c); return path.reverse();
}

// ---------- units ----------
function addU(k, tm, x, y) { const d = UNIT[k]; const u = {id:S.nid++, k, tm, x, y, hp:d.hp, mhp:d.hp, cd:Math.random(), px:x, py:y, path:[], jx:(Math.random()-.5)*.45, jy:(Math.random()-.5)*.45, an:Math.random()*9}; S.u.push(u); return u; }
function recruit(k) {
  const br = S.b.find(b => b.k === (k === 'catapult' ? 'guild' : 'barracks') && !b.tm);
  if (!br) return {ok:false, why: k === 'catapult' ? "Build an Engineer's Guild first (Military tab)" : 'Build a Barracks first (Military tab)'};
  if (idle() < 1) return {ok:false, why:'No idle peasants. Build a Hovel or free up workers', pop:true};
  if (!afford(UNIT[k].cost)) { const miss = Object.keys(UNIT[k].cost).filter(r => S.res[r] < UNIT[k].cost[r]), w = miss.filter(r => WEAP.includes(r));
    return {ok:false, why: w.length ? 'No ' + w.map(r => ICON[r] + ' ' + GNAME[r]).join(' or ') + ' in the Armory. Make them in a workshop or buy them at the Market' : 'Not enough ' + miss.join(' & '), poor:true, cost:UNIT[k].cost}; }
  pay(UNIT[k].cost); S.pop--;
  const u = addU(k, 0, br.x + B[br.k].w/2, br.y + B[br.k].h + .4); u.px = u.x; u.py = u.y;
  puff(u.x*T, u.y*T, '#e7d9b0', 6); return {ok:true, u};
}
const uById = id => S.u.find(u => u.id === id);
const tileOf = u => idx(Math.floor(u.x), Math.floor(u.y));
function elevated(u) { const o = occ[tileOf(u)]; if (!o) return false; const b = byId.get(o); return !!(b && B[b.k].walk); }
function orderMove(ids, tx, ty) {
  const units = ids.map(uById).filter(Boolean); if (!units.length) return 0;
  if (!inb(tx, ty)) return 0;
  const t0 = idx(tx, ty), onStruct = !!occ[t0] && walkF(t0);
  // BFS from target over tiles of same kind (wall tiles stay on walls)
  const seen = new Uint8Array(N*N), q = [t0], spots = []; seen[t0] = 1;
  const kindOk = i => walkF(i) && (!!occ[i] === onStruct);
  if (!walkF(t0)) { // tapped a blocked tile: find nearest walkable
    let best = -1, bd = 1e9; for (let i = 0; i < N*N; i++) if (walkF(i)) { const d = Math.hypot(i % N - tx, ((i/N)|0) - ty); if (d < bd) { bd = d; best = i; } }
    if (best < 0) return 0; q[0] = best; seen[best] = 1;
  }
  while (q.length && spots.length < units.length*2) {
    const c = q.shift(); if (kindOk(c) || spots.length === 0 && walkF(c)) spots.push(c);
    const cx = c % N, cy = (c / N) | 0;
    for (const [dx,dy] of DIRS.slice(0,4)) { const nx = cx+dx, ny = cy+dy; if (!inb(nx,ny)) continue; const n = idx(nx,ny); if (seen[n]) continue; seen[n] = 1; if (walkF(n) && (kindOk(n) || !onStruct || Math.hypot(nx-tx,ny-ty) < 6)) q.push(n); }
  }
  let ok = 0;
  units.forEach((u, i) => {
    const g = spots[i % spots.length]; const p = astar(Math.floor(u.x), Math.floor(u.y), g % N, (g / N) | 0);
    if (p) { u.path = p; u.px = g % N + .5; u.py = ((g / N) | 0) + .5; u.tg = 0; u.raid = 0; ok++; }
  });
  return ok;
}
function nearestEnemyOf(u, r) { let best = null, bd = r; for (const e of S.u) if (e.tm !== u.tm && e.hp > 0) { const d = Math.hypot(e.x-u.x, e.y-u.y); if (d < bd) { bd = d; best = e; } } return best; }
function shoot(fx, fy, tgt, dmg, team, h0 = 10, src = 0) {
  const d = Math.hypot(tgt.x - fx, tgt.y - fy);
  projectiles.push({sx:fx, sy:fy, tid:tgt.id, tx:tgt.x, ty:tgt.y, t:0, dur:Math.max(.15, d/13), dmg, team, h0, src});
}
function hurtU(u, dmg) { u.hp -= dmg; if (u.hp <= 0 && !u.dead) { u.dead = true; puff(u.x*T, u.y*T, u.tm ? '#7a2a20' : '#2f4f8a', 6); if (u.tm === 1) S.kills++; } }
function hurtB(b, dmg) { if (!byId.has(b.id) || S.over) return; b.hp -= dmg; if (Math.random() < .3) puff((b.x + B[b.k].w*Math.random())*T, (b.y + B[b.k].h*.6)*T, '#b5a68a', 1); if (b.hp <= 0) destroyB(b); }
function moveTo(u, tx, ty, spd, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy); if (d < 1e-3) return true;
  const s = Math.min(d, spd*dt); u.x += dx/d*s; u.y += dy/d*s; u.an += s*6; u.fx = dx < 0 ? -1 : 1; return s >= d - 1e-4;
}
function stepPlayerUnit(u, dt) {
  const d = UNIT[u.k]; u.cd -= dt; const el = elevated(u); u.el = el;
  if (u.path.length) { const n = u.path[0]; if (!walkF(n)) { const p = astar(Math.floor(u.x), Math.floor(u.y), Math.floor(u.px), Math.floor(u.py)); u.path = p || []; return; }
    if (moveTo(u, n % N + .5 + (u.path.length === 1 ? u.jx*.6 : 0), ((n / N) | 0) + .5 + (u.path.length === 1 ? u.jy*.6 : 0), d.spd, dt)) u.path.shift(); }
  if (u.k === 'catapult') { stepPlayerCatapult(u, d, dt); return; }
  if (u.raid && !u.path.length) {
    if (!aiKeep()) u.raid = 0;
    else { const foe = nearestEnemyOf(u, u.k === 'archer' ? d.range : 2.4);
      if (foe) { const dd = Math.hypot(foe.x - u.x, foe.y - u.y);
        if (u.k === 'archer') { if (u.cd <= 0) { shoot(u.x, u.y, foe, d.dmg, 0, 12); u.cd = d.cd; u.fx = foe.x < u.x ? -1 : 1; } }
        else if (dd < .75) { if (u.cd <= 0) { hurtU(foe, d.dmg); u.cd = d.cd; u.atk = .2; } } else if (!stepDirect(u, foe.x, foe.y, d.spd, dt)) stepMove(u, d, dt); }
      else stepMove(u, d, dt);
      if (u.atk) u.atk = Math.max(0, u.atk - dt); return; } }
  if (u.k === 'archer') {
    const tg = nearestEnemyOf(u, d.range + (el ? 2.5 : 0));
    if (tg && u.cd <= 0) { shoot(u.x, u.y, tg, d.dmg, 0, el ? 26 : 12); u.cd = d.cd; u.fx = tg.x < u.x ? -1 : 1; }
  } else if (!u.path.length) {
    let tg = null, bd = d.aggro;
    for (const e of S.u) if (e.tm === 1 && e.hp > 0) { const dp = Math.hypot(e.x-u.px, e.y-u.py); if (dp < bd && !elevatedE(e)) { bd = dp; tg = e; } }
    if (!tg && u.hitBy) { const a = uById(u.hitBy); if (a && a.hp > 0 && Math.hypot(a.x-u.px, a.y-u.py) < 8) tg = a; else u.hitBy = 0; }
    if (tg) {
      const dd = Math.hypot(tg.x-u.x, tg.y-u.y);
      if (dd < .75) { if (u.cd <= 0) { hurtU(tg, d.dmg); u.cd = d.cd; u.atk = .2; } }
      else stepDirect(u, tg.x, tg.y, d.spd, dt);
    } else if (Math.hypot(u.px-u.x, u.py-u.y) > .3) {
      if (!stepDirect(u, u.px, u.py, d.spd, dt)) { const p = astar(Math.floor(u.x), Math.floor(u.y), Math.floor(u.px), Math.floor(u.py)); if (p) u.path = p; }
    }
  }
  if (u.atk) u.atk = Math.max(0, u.atk - dt);
}
function elevatedE() { return false; }
function stepPlayerCatapult(u, d, dt) {
  if (u.fire) u.fire = Math.max(0, u.fire - dt);
  if (u.path.length) return;
  if ((u.scan = (u.scan || 0) - dt) <= 0) { u.scan = 1; u.tgB = 0; u.tgU = 0; let bd = d.range;
    for (const b of S.b) if (b.tm === 1) { const dd = Math.hypot(b.x + B[b.k].w/2 - u.x, b.y + B[b.k].h/2 - u.y); if (dd < bd) { bd = dd; u.tgB = b.id; } }
    if (!u.tgB) { const e = nearestEnemyOf(u, d.range); if (e && Math.hypot(e.x - u.x, e.y - u.y) > 1.5) u.tgU = e.id; } }
  if (!u.tgB && !u.tgU && u.raid && aiKeep()) { stepMove(u, d, dt); return; }
  if (u.cd > 0) return;
  let tx, ty, bid = 0; const b = u.tgB && byId.get(u.tgB);
  if (b) { tx = b.x + B[b.k].w/2; ty = b.y + B[b.k].h/2; bid = b.id; }
  else { const e = u.tgU && uById(u.tgU); if (!e || e.hp <= 0) { u.tgU = 0; return; } tx = e.x; ty = e.y; }
  u.cd = d.cd; u.fire = .6; u.fx = tx < u.x ? -1 : 1;
  stones.push({sx:u.x, sy:u.y - .4, tx:tx + (Math.random() - .5)*.6, ty:ty + (Math.random() - .5)*.6, t:0, dur:1.4, bid, dmg:d.sdmg, team:0, udmg:50});
}
function orderRaid(ids) { const us = ids.map(uById).filter(Boolean); for (const u of us) { u.raid = 1; u.path = []; u.nt = -1; } return us.length; }
function stepDirect(u, tx, ty, spd, dt) {
  const ox = u.x, oy = u.y; moveTo(u, tx, ty, spd, dt);
  if (!walkF(tileOf(u))) { const nx = u.x; u.x = ox; if (!walkF(tileOf(u))) { u.x = nx; u.y = oy; if (!walkF(tileOf(u))) { u.x = ox; u.y = oy; return false; } } }
  return true;
}
const onWall = u => { const o = occ[tileOf(u)]; const b = o && byId.get(o); return !!(b && B[b.k].walk); };
function stepCatapult(u, d, dt) {
  if (u.fire) u.fire = Math.max(0, u.fire - dt);
  if (!u.tgB || !byId.has(u.tgB) || (u.scan = (u.scan || 0) - dt) <= 0) { u.scan = 1; let best = 0, bd = d.range;
    for (const b of S.b) { if (b.tm || B[b.k].pit) continue; const bd2 = Math.hypot(b.x + B[b.k].w/2 - u.x, b.y + B[b.k].h/2 - u.y); if (bd2 < bd) { bd = bd2; best = b.id; } } u.tgB = best; }
  if (!u.tgB) return false;
  if (u.cd <= 0) { const b = byId.get(u.tgB); u.cd = d.cd; u.fire = .6; u.fx = b.x < u.x ? -1 : 1;
    stones.push({sx:u.x, sy:u.y - .4, tx:b.x + B[b.k].w/2 + (Math.random() - .5)*.6, ty:b.y + B[b.k].h/2 + (Math.random() - .5)*.6, t:0, dur:1.4, bid:b.id, dmg:d.sdmg, team:1, udmg:25}); }
  return true;
}
function dockSiegeTower(u, b) {
  u.dock = b.id; b.bridge = u.id; flowDirty = true;
  for (let i = 0; i < UNIT.stower.crew; i++) { const c = addU('raider', 1, u.x + (Math.random() - .5)*.4, u.y + (Math.random() - .5)*.4); c.hp = c.mhp = Math.round(UNIT.raider.hp*(1 + .08*(S.wave.n - 1))); c.edge = u.edge; }
  toast('🗼 A siege tower reached your wall! Enemies are climbing over', 'bad');
}
function stepEnemy(u, dt) {
  const d = UNIT[u.k]; u.cd -= dt; if (u.atk) u.atk = Math.max(0, u.atk - dt);
  if (u.k === 'catapult' && stepCatapult(u, d, dt)) return;
  if (u.k === 'stower' && u.dock) { if (!byId.has(u.dock)) u.dock = 0; return; }
  if (u.guard) return stepGuard(u, d, dt);
  if (d.siege) return stepMove(u, d, dt);
  // fight nearby soldiers on the ground
  let foe = null, fd = u.k === 'earcher' ? d.range : 1.8;
  const high = onWall(u);
  for (const p of S.u) if (p.tm === 0 && p.hp > 0 && (u.k === 'earcher' || !p.el || high)) { const dd = Math.hypot(p.x-u.x, p.y-u.y); if (dd < fd) { fd = dd; foe = p; } }
  if (foe) {
    if (u.k === 'earcher') { if (u.cd <= 0) { shoot(u.x, u.y, foe, d.dmg, 1, 10, u.id); u.cd = d.cd; } return; }
    if (fd < .75) { if (u.cd <= 0) { hurtU(foe, d.dmg); u.cd = d.cd; u.atk = .2; } return; }
    const ox = u.x, oy = u.y; moveTo(u, foe.x, foe.y, d.spd, dt); const ti = tileOf(u), ob = occ[ti] && byId.get(occ[ti]); if (!passT(ti) || (ob && !ob.bridge && !(high && B[ob.k].walk))) { u.x = ox; u.y = oy; } else return;
  }
  stepMove(u, d, dt);
}
function stepGuard(u, d, dt) {   // the enemy lord's troops at home: defend, then go back to their post
  const ak = aiKeep(), R = S.ai && S.ai.alarm ? 15 : 8; let foe = null, fd = 1e9;
  for (const p of S.u) if (p.tm === 0 && p.hp > 0) { const dh = Math.hypot(p.x - u.hx, p.y - u.hy), dd = Math.hypot(p.x - u.x, p.y - u.y); if ((dh < R || dd < (d.range || 1.8)) && dd < fd) { fd = dd; foe = p; } }
  if (foe && !d.siege) { if (u.k === 'earcher') { if (fd < d.range) { if (u.cd <= 0) { shoot(u.x, u.y, foe, d.dmg, 1, 10, u.id); u.cd = d.cd; } return; } }
    else if (fd < .75) { if (u.cd <= 0) { hurtU(foe, d.dmg); u.cd = d.cd; u.atk = .2; } return; }
    guardWalk(u, foe.x, foe.y, d.spd, dt); return; }
  if (!ak) { u.guard = 0; return; }
  if (Math.hypot(u.hx - u.x, u.hy - u.y) > .3) guardWalk(u, u.hx, u.hy, d.spd, dt);
}
function guardWalk(u, tx, ty, spd, dt) { const ox = u.x, oy = u.y; moveTo(u, tx, ty, spd, dt); const ti = tileOf(u), ob = occ[ti] && byId.get(occ[ti]);
  if (!passT(ti) || (ob && !(ob.tm === 1 && B[ob.k].walk) && !ob.bridge)) { u.x = ox; u.y = oy; const m = moveTo(u, tx, oy, spd, dt), t2 = tileOf(u), o2 = occ[t2] && byId.get(occ[t2]); if (!passT(t2) || (o2 && !(o2.tm === 1 && B[o2.k].walk))) { u.x = ox; u.y = oy; } } }
function stepMove(u, d, dt) {
  const tx = Math.floor(u.x), ty = Math.floor(u.y), pl = u.tm === 0;
  if (u.nt == null || u.nt < 0 || u.fv !== fieldVer) { u.nt = bestStep(tx, ty, pl); u.fv = fieldVer; }
  if (u.nt < 0) return;
  const o = occ[u.nt], ob = o && byId.get(o), own = ob && (ob.tm | 0) === u.tm;
  if (o && !(ob && ob.bridge) && !own) {
    const b = ob; const bx = u.nt % N + .5, by = ((u.nt / N) | 0) + .5;
    if (u.k === 'stower' && Math.hypot(bx - u.x, by - u.y) < 1.15 && (b.k === 'wall' || b.k === 'palisade' || b.k === 'gate' || b.k === 'tower')) { dockSiegeTower(u, b); return; }
    if (Math.hypot(bx - u.x, by - u.y) < 1.15) { if (u.cd <= 0) { hurtB(b, d.sdmg ?? d.dmg); u.cd = d.cd; u.atk = .2; u.fx = bx < u.x ? -1 : 1; } }
    else moveTo(u, tx + .5, ty + .5, d.spd, dt);
    return;
  }
  const gx = u.nt % N + .5 + u.jx, gy = ((u.nt / N) | 0) + .5 + u.jy;
  moveTo(u, gx, gy, d.spd, dt);
  if (tileOf(u) === u.nt && Math.hypot(gx - u.x, gy - u.y) < .2) u.nt = -1;
}
let fieldVer = 0; let stones = [];

// ---------- waves ----------
const EDGE_NAMES = ['north','east','south','west'];
function waveComp(n) {
  const cf = cfg(), df = DIFF[cf.diff] || DIFF.normal, hpm = (1 + 0.08*(n-1))*df.hp, list = [], cm = v => Math.round(v*df.count);
  for (let i = 0; i < Math.max(2, cm(3 + Math.floor(1.4*n))); i++) list.push('raider');
  for (let i = 0; i < (n >= 3 ? cm(Math.ceil((n-2)*0.75)) : 0); i++) list.push('earcher');
  for (let i = 0; i < (n >= 4 ? cm(Math.floor((n-2)/2)) : 0); i++) list.push('brute');
  if (cf.siege === false) return {list, hpm};
  for (let i = 0; i < (n >= 5 ? Math.floor((n-3)/2) : 0); i++) list.push('ram');   // wave 5-6: 1, 7-8: 2 ...
  for (let i = 0; i < (n >= 7 ? Math.floor((n-5)/2) : 0); i++) list.push('stower');
  for (let i = 0; i < (n >= 7 ? Math.floor((n-5)/2) : 0); i++) list.push('catapult');
  return {list, hpm};
}
const PLURAL = {raider:['raider','raiders'], earcher:['archer','archers'], brute:['brute','brutes'], ram:['battering ram','battering rams'], stower:['siege tower','siege towers'], catapult:['catapult','catapults']};
function waveText(n) { const c = {}; for (const k of waveComp(n).list) c[k] = (c[k] || 0) + 1; return Object.entries(c).map(([k, v]) => v + ' ' + PLURAL[k][v > 1 ? 1 : 0]).join(', '); }
function spawnWave() {
  if (flowDirty) { computeFlow(); fieldVer++; }
  S.wave.n++; const n = S.wave.n, {list, hpm} = waveComp(n);
  const sp = S.custom && S.custom.spawns && S.custom.spawns.length ? S.custom.spawns : null;
  const edges = (sp ? sp.map((_, i) => 10 + i) : [0,1,2,3]).sort(() => Math.random() - .5).slice(0, n < 3 ? 1 : n < 6 ? 2 : 3);
  const cands = edges.map(e => { const c = [];
    if (e >= 10) { const q = sp[e - 10]; for (let y = q.y - 2; y <= q.y + 2; y++) for (let x = q.x - 2; x <= q.x + 2; x++) if (inb(x, y) && isFinite(flow[idx(x,y)]) && !occ[idx(x,y)]) c.push([x,y]); return c; }
    for (let i = 4; i < N-4; i++) { const [x,y] = e === 0 ? [i,0] : e === 1 ? [N-1,i] : e === 2 ? [i,N-1] : [0,i]; if (isFinite(flow[idx(x,y)])) c.push([x,y]); } return c; });
  const centers = cands.map(c => c[Math.floor(Math.random()*c.length)] || [0,0]);
  list.forEach((k, i) => {
    const ei = i % edges.length, c = cands[ei]; if (!c.length) return;
    const [cx, cy] = centers[ei]; const near = c.filter(([x,y]) => Math.abs(x-cx) + Math.abs(y-cy) < 6); const [x,y] = near[Math.floor(Math.random()*near.length)] || c[0];
    const u = addU(k, 1, x + .5, y + .5); u.hp = u.mhp = Math.round(UNIT[k].hp * hpm); u.edge = edges[ei];
  });
  S.wave.active = true; S.wave.next = S.t + Math.max(150, cfg().between + 60);  // next wave waits until this one is beaten (or 2:30 max)
  toast('⚔ Wave ' + n + ' from the ' + [...new Set(edges.map(e => e >= 10 ? dirName(sp[e-10].x, sp[e-10].y) : EDGE_NAMES[e]))].join(' & ') + ': ' + waveText(n), 'bad big', 4000);
}
function sendWave() { if (S.over) return; S.wave.next = S.t; }

// ---------- simulation ----------
function dropFor(res, fromX, fromY) {
  let best = null, bd = Infinity;
  const weap = WEAP.includes(res);
  for (const b of S.b) { const d = B[b.k]; if (b.tm) continue; if ((b.k !== 'keep' || weap) && !(d.drop && d.drop.includes(res))) continue; const dist = Math.hypot(b.x + d.w/2 - fromX, b.y + d.h - fromY) + (b.k === 'keep' ? 4 : 0); if (dist < bd) { bd = dist; best = b; } }
  return best;
}
function stepEconomy(dt) {
  const people = S.pop + soldiers().length;
  // food & starvation
  S.res.food -= people * dt / 20;
  if (S.res.food <= 0) { S.res.food = 0; S.starveT += dt; if (S.starveT > 6 && S.pop > 0) { S.starveT = 0; S.pop--; toast('People are starving and leaving! Build farms 🍎', 'bad'); } } else S.starveT = 0;
  const tx = TAX[S.tax ?? 1]; S.res.gold += S.pop * tx.g * dt;
  // immigration depends on the tax level (a tiny bit of Stronghold popularity)
  if (S.res.food > 0 && people < cap() && tx.imm) { S.popT += dt; if (S.popT > tx.imm) { S.popT = 0; S.pop++; } } else S.popT = 0;
  if (tx.leave && S.pop > 4) { S.leaveT = (S.leaveT || 0) + dt; if (S.leaveT > tx.leave) { S.leaveT = 0; S.pop--; toast('A peasant left because of harsh taxes', 'bad'); } }
  // workers
  const prods = prodBs().sort((a, b) => a.id - b.id), staffed = employed();
  prods.forEach((b, i) => {
    const d = B[b.k];
    b.staffed = i < staffed;
    if (!b.staffed) { workers.delete(b.id); return; }
    let w = workers.get(b.id); const door = {x: b.x + d.w/2, y: b.y + d.h + .3};
    if (!w) { w = {st:0, t:Math.random()*2, x:door.x, y:door.y, an:0}; workers.set(b.id, w); }
    if (d.repair) { stepRepairer(b, w, door, dt); return; }
    if (d.chop && w.st !== 1 && w.st !== 2) { stepChopper(b, d, w, door, dt); return; }
    if (d.craft && w.st === 0) { const out = b.out || d.prod;
      if (!w.has) { b.need = !dropFor(out, door.x, door.y) ? 'armory' : !afford(d.inp) ? Object.keys(d.inp).find(r => S.res[r] < d.inp[r]) : null;
        w.x = door.x; w.y = door.y; w.sw = 0; if (b.need) return; pay(d.inp); w.has = 1; w.t = 0; }
      b.need = null; w.t += dt; w.x = door.x - .4; w.y = door.y - .15; w.sw = (w.t % .7)/.7; const imp = Math.floor(w.t/.7); if (imp !== w.imp) { w.imp = imp; if (imp % 2 === 0 && particles.length < 250) puff(w.x*T + 9, w.y*T - 2, out === 'bow' || out === 'spear' ? '#b89868' : '#9a8a78', 1); }
      if (w.t >= d.work) { const dp = dropFor(out, door.x, door.y); w.to = dp ? dp.id : 0; w.st = 1; w.carry = d.amt; w.what = out; w.has = 0; w.sw = 0; } return; }
    if (d.mine && w.st === 0) { w.t += dt; w.x = door.x - .4; w.y = door.y - .15; w.sw = (w.t % .8)/.8; const imp = Math.floor(w.t/.8); if (imp !== w.imp) { w.imp = imp; if (particles.length < 250) puff(w.x*T + 9, w.y*T - 4, d.on === 5 ? '#a8502c' : '#a8a49a', 2); }
      if (w.t >= d.work) { const dp = dropFor(d.prod, door.x, door.y); w.to = dp ? dp.id : 0; w.st = 1; w.carry = d.amt; w.sw = 0; } return; }
    if (w.st === 0) { w.t += dt; w.x = door.x + Math.sin(S.t*2 + b.id)*.3; w.y = door.y; if (w.t >= d.work) { const dp = dropFor(d.prod, door.x, door.y); w.to = dp ? dp.id : 0; w.st = 1; w.carry = d.amt; } }
    else if (w.st === 1) { const dp = byId.get(w.to); if (!dp) { w.st = 0; w.t = 0; return; } const tx = dp.x + B[dp.k].w/2, ty = dp.y + B[dp.k].h + .2; w.an += dt*8;
      if (walkLeg(w, tx, ty, dt)) { const g = w.what || d.prod; S.res[g] = (S.res[g] || 0) + w.carry; w.carry = 0; w.st = 2; w.what = null; floatTxt(tx*T, ty*T - 20, '+' + d.amt + ICON[g]); } }
    else { if (walkLeg(w, door.x, door.y, dt)) { w.st = 0; w.t = 0; } }
  });
}
const REPAIR_HP = 30;   // hp per second an engineer restores
function stepRepairer(b, w, door, dt) {
  if (w.st === 0) { w.x = door.x + Math.sin(S.t*2 + b.id)*.25; w.y = door.y; w.sw = 0;
    if ((w.scan = (w.scan || 0) - dt) > 0) return; w.scan = 1; let best = null, bs = 1e9;
    for (const x of S.b) { if (x.tm) continue; const dx = B[x.k]; if (x.hp >= dx.hp*.97 || !(dx.line || dx.walk || dx.gate || x.k === 'keep')) continue;
      const dist = Math.hypot(x.x + dx.w/2 - door.x, x.y + dx.h/2 - door.y); if (dist > 34) continue; const sc = dist - (1 - x.hp/dx.hp)*25; if (sc < bs) { bs = sc; best = x; } }
    if (best) { w.tgt = best.id; w.st = 5; } return; }
  if (w.st === 5 || w.st === 6) { const t = byId.get(w.tgt), dt2 = t && B[t.k]; if (!t || t.hp >= dt2.hp) { w.st = 2; w.sw = 0; b.need = null; return; }
    if (w.st === 5) { const tx = t.k === 'keep' ? t.x + 1.5 : t.x + .5, ty = t.k === 'keep' ? t.y + 3.3 : t.y + .5; w.an += dt*8; if (walkLeg(w, tx, ty, dt)) w.st = 6; return; }
    const mat = t.k === 'palisade' ? 'wood' : 'stone', need = REPAIR_HP*dt/100;   // 1 stone per 100 hp
    if (S.res[mat] < need) { b.need = mat; w.sw = 0; return; } b.need = null;
    S.res[mat] -= need; t.hp = Math.min(dt2.hp, t.hp + REPAIR_HP*dt); w.t = (w.t || 0) + dt; w.sw = (w.t % .6)/.6;
    const imp = Math.floor(w.t/.6); if (imp !== w.imp) { w.imp = imp; if (particles.length < 250) puff(w.x*T + 8, w.y*T - 6, '#d8c8a8', 1); } return; }
  if (walkLeg(w, door.x, door.y, dt)) { w.st = 0; w.t = 0; }
}
const walkPeasant = i => { if (!passT(i)) return false; const o = occ[i]; if (!o) return true; const b = byId.get(o); return !!(b && B[b.k].walk); };
function walkLeg(w, tx, ty, dt) {   // peasants follow a path around trees, rocks, water and buildings
  const key = Math.floor(tx) + ',' + Math.floor(ty);
  if (w.leg !== key) { w.leg = key; const fx = Math.floor(w.x), fy = Math.floor(w.y); const p = inb(fx, fy) ? astar(fx, fy, Math.floor(tx), Math.floor(ty), walkPeasant, N*N) : null;
    if (!p) { w.x = tx; w.y = ty; w.leg = null; return true; }   // no dry route at all: never wade through water or trees, just arrive
    w.path = p; if (w.path.length) w.path.pop(); }
  w.an += dt*8;
  if (w.path && w.path.length) { const n = w.path[0]; if (moveTo(w, n % N + .5, ((n / N) | 0) + .5, 1.8, dt)) w.path.shift(); return false; }
  const done = moveTo(w, tx, ty, 1.8, dt); if (done) w.leg = null; return done;
}
function findTree(b, door, w) {
  const d = B[b.k], R = d.nearR, taken = new Set(); for (const [id, o] of workers) if (o !== w && o.tree != null) taken.add(o.tree);
  let best = -1, bd = 1e9, best2 = -1, bd2 = 1e9;
  for (let y = b.y - R; y < b.y + d.h + R; y++) for (let x = b.x - R; x < b.x + d.w + R; x++) { if (!inb(x, y)) continue; const i = idx(x, y); if (ter[i] !== 1) continue;
    const dist = Math.hypot(x + .5 - door.x, y + .9 - door.y); if (taken.has(i)) { if (dist < bd2) { bd2 = dist; best2 = i; } } else if (dist < bd) { bd = dist; best = i; } }
  return best >= 0 ? best : best2;
}
const CHOP_SWING = .75;
function stepChopper(b, d, w, door, dt) {
  if (w.st === 0) { w.t += dt; w.sw = 0; w.x = door.x + Math.sin(S.t*2 + b.id)*.25; w.y = door.y;
    if (w.t >= .8) { w.t = 0; const i = findTree(b, door, w); if (i < 0) { b.noTrees = true; w.tree = null; return; } b.noTrees = false; w.tree = i; w.st = 3; } return; }
  const i = w.tree; if (i == null || ter[i] !== 1) { w.st = 0; w.t = .8; w.tree = null; w.sw = 0; return; }
  const sx = i % N + .5 - .42, sy = ((i / N) | 0) + .86;
  if (w.st === 3) { if (walkLeg(w, sx, sy, dt)) { w.st = 4; w.t = 0; w.fx = 1; } return; }
  // st 4: chopping
  w.t += dt; w.fx = 1; w.sw = (w.t % CHOP_SWING)/CHOP_SWING; const imp = Math.floor((w.t + CHOP_SWING*.35)/CHOP_SWING);
  if (imp !== w.imp) { w.imp = imp; shake.set(i, performance.now()); if (particles.length < 250) puff((i % N + .5)*T - 4, ((i / N) | 0)*T + T*.7, '#c8a060', 2); }
  if (w.t >= d.work) {
    const left = (S.tw[i] ?? TREE_WOOD) - d.amt;
    if (left <= 0) { ter[i] = 4; S.stumps[i] = S.t; delete S.tw[i]; falls.push({i, t0:performance.now()}); flowDirty = true; } else S.tw[i] = left;
    const dp = dropFor('wood', w.x, w.y); w.to = dp ? dp.id : 0; w.st = 1; w.carry = d.amt; w.sw = 0; w.tree = null;
  }
}
const shake = new Map(); let falls = []; let regrowT = 0;
const treesLeft = () => { let n = 0; for (let i = 0; i < N*N; i++) n += ter[i] === 1; return n; };
function step(dt) {
  if (S.over) return;
  regrowT += dt; if (regrowT > 1) { regrowT = 0; for (const k in S.stumps) { const i = +k; if (ter[i] !== 4) { delete S.stumps[k]; continue; } if (S.t - S.stumps[k] > STUMP_CLEAR) { ter[i] = 0; delete S.stumps[k]; (S.cleared = S.cleared || []).push(i); } } }
  S.t += dt;
  if (flowDirty) { computeFlow(); fieldVer++; }
  stepEconomy(dt);
  if (S.mode === 'vs') stepAI(dt);
  stepPits();
  if (S.t >= S.wave.next) spawnWave();
  for (const u of S.u) { if (u.hp <= 0) continue; if (u.tm === 0) stepPlayerUnit(u, dt); else stepEnemy(u, dt); }
  // shooting structures
  for (const b of S.b) { const sh = B[b.k].shoot; if (!sh) continue; b.cd -= dt; if (b.cd > 0) continue;
    const cx = b.x + B[b.k].w/2, cy = b.y + B[b.k].h/2; let tg = null, bd = sh.r;
    const team = b.tm ? 1 : 0;
    for (const e of S.u) if (e.tm !== team && e.hp > 0) { const d = Math.hypot(e.x-cx, e.y-cy); if (d < bd) { bd = d; tg = e; } }
    if (tg) { shoot(cx, cy, tg, sh.d, team, b.k === 'keep' ? 60 : 50); b.cd = sh.cd; } }
  // projectiles
  for (const p of projectiles) { p.t += dt; const tg = uById(p.tid); if (tg && tg.hp > 0) { p.tx = tg.x; p.ty = tg.y; }
    if (p.t >= p.dur) { p.done = true; if (tg && tg.hp > 0 && Math.hypot(tg.x-p.tx, tg.y-p.ty) < .6) { hurtU(tg, p.dmg*(UNIT[tg.k].armor ?? 1)); if (p.src) tg.hitBy = p.src; } } }
  projectiles = projectiles.filter(p => !p.done);
  for (const st of stones) { st.t += dt; if (st.t >= st.dur) { st.done = true; const b = byId.get(st.bid); puff(st.tx*T, st.ty*T, '#8a8478', 8); if (b) hurtB(b, st.dmg);
    const tm = st.team ?? 1; for (const v of S.u) if (v.tm !== tm && v.hp > 0 && Math.hypot(v.x - st.tx, v.y - st.ty) < .9) hurtU(v, (st.udmg ?? 25)*(UNIT[v.k].armor ?? 1)); } }
  stones = stones.filter(st => !st.done);
  for (const u of S.u) if (u.dead && u.k === 'stower' && u.dock) { const b = byId.get(u.dock); if (b && b.bridge === u.id) { b.bridge = 0; flowDirty = true; } }
  if (S.u.some(u => u.dead)) { S.u = S.u.filter(u => !u.dead); sel = sel.filter(id => uById(id)); }
  for (const b of S.b) if (b.rise != null) { b.rise += dt*2.5; if (b.rise >= 1) delete b.rise; }
  if (S.wave.active && !S.u.some(u => u.tm === 1) && S.wave.n > 0) {
    S.wave.active = false; S.beaten = (S.beaten || 0) + 1; const bonus = 10 + 5*S.wave.n; S.res.gold += bonus;
    toast('🏆 Wave ' + S.wave.n + ' defeated! +' + bonus + '🪙', 'big', 3500);
    S.wave.next = Math.min(S.wave.next, S.t + cfg().between);
    if (cfg().win > 0 && S.beaten >= cfg().win && !S.won) { S.won = true; setTimeout(() => victory(), 1200); }
  }
}

function stepPits() { let fired = false;
  for (const b of S.b) { if (b.k !== 'pit' || b.tm) continue;
    for (const u of S.u) if (u.tm === 1 && u.hp > 0 && Math.floor(u.x) === b.x && Math.floor(u.y) === b.y) { const dmg = UNIT[u.k].siege ? 60 : 120; hurtU(u, dmg); b.hp = 0; fired = true;
      for (let i = 0; i < 6; i++) puff((b.x + .5)*T, (b.y + .5)*T, '#6a4a28', 1); floatTxt((b.x + .5)*T, b.y*T - 4, '💥 ' + dmg); break; } }
  if (fired) S.b = S.b.filter(b => !(b.k === 'pit' && b.hp <= 0)); }
// ---------- particles ----------
function puff(x, y, c, n) { for (let i = 0; i < n; i++) particles.push({x, y, vx:(Math.random()-.5)*40, vy:-Math.random()*30-5, life:.6+Math.random()*.6, l0:1.2, c, s:3+Math.random()*4}); }
function floatTxt(x, y, txt) { if (particles.length < 300) particles.push({x, y, vx:0, vy:-18, life:1.4, l0:1.4, txt}); }

// ---------- camera / view ----------
let W = 0, H = 0, DPR = 1;
const cam = {x:(KX+1.5)*T, y:(KY+3)*T, z:1.1};
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR); clampCam(); }
function minZ() { return Math.max(W, H) / (N*T) * 0.9; }
function clampCam() { cam.z = Math.max(minZ(), Math.min(3, cam.z)); const m = N*T; cam.x = Math.max(0, Math.min(m, cam.x)); cam.y = Math.max(0, Math.min(m, cam.y)); }
const s2w = (sx, sy) => ({x: cam.x + (sx - W/2)/cam.z, y: cam.y + (sy - H/2)/cam.z});
const w2s = (wx, wy) => ({x: (wx - cam.x)*cam.z + W/2, y: (wy - cam.y)*cam.z + H/2});
function viewRect() { const t = $('top').getBoundingClientRect().bottom, b = $('bottom').getBoundingClientRect().top; return {t, b}; }

// ---------- terrain art ----------
function buildTerrain() {
  const s = 512, nc = document.createElement('canvas'); nc.width = nc.height = s; const nx = nc.getContext('2d'), id = nx.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const tx = Math.floor(x/(512/N)), ty = Math.floor(y/(512/N)), t = ter[idx(tx, ty)];
    const n = vnoise(x*.05, y*.05, 7)*.6 + vnoise(x*.2, y*.2, 9)*.4;
    let r, g, b;
    if (t === 3) { r = 52 + n*20; g = 96 + n*25; b = 130 + n*30; }
    else if (t === 2) { r = 112 + n*30; g = 112 + n*26; b = 96 + n*22; }
    else if (t === 5) { r = 120 + n*30; g = 84 + n*20; b = 64 + n*16; }
    else if (t === 6) { r = 134 + n*30; g = 106 + n*24; b = 70 + n*16; }
    else if (t === 7) { r = 62 + n*20; g = 92 + n*24; b = 72 + n*20; }
    else if (t === 1) { r = 54 + n*18; g = 84 + n*24; b = 38 + n*12; }
    else { r = 92 + n*36; g = 128 + n*34; b = 56 + n*16; }
    const dk = Math.hypot(tx - KX - 1.5, ty - KY - 1.5); if (t === 0 && dk < 6.5) { const f = Math.max(0, 1 - dk/6.5)*.55; r += (150-r)*f; g += (128-g)*f; b += (84-b)*f; }
    const o = (y*s + x)*4; id.data[o] = r; id.data[o+1] = g; id.data[o+2] = b; id.data[o+3] = 255;
  }
  nx.putImageData(id, 0, 0);
  terrainCv = document.createElement('canvas'); terrainCv.width = terrainCv.height = N*T; const c = terrainCv.getContext('2d');
  c.imageSmoothingEnabled = true; c.drawImage(nc, 0, 0, N*T, N*T);
  const r = rng(S.seed + 3);
  // grass tufts and flowers
  for (let i = 0; i < 9000; i++) { const x = r()*N*T, y = r()*N*T, t = ter[idx(Math.floor(x/T), Math.floor(y/T))]; if (t !== 0) continue;
    c.strokeStyle = r() < .5 ? '#6f9a3c' : '#4f7a2c'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1.5, y - 4); c.moveTo(x, y); c.lineTo(x + 1.5, y - 4); c.stroke();
    if (r() < .04) { c.fillStyle = ['#f2e27a','#f4f0e6','#d77ab0'][Math.floor(r()*3)]; c.fillRect(x, y - 2, 2, 2); } }
  // water shimmer + shore
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (ter[idx(x,y)] !== 3) continue; c.strokeStyle = '#8fc3e0aa'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x*T + 6 + r()*8, y*T + 10 + r()*12); c.lineTo(x*T + 16 + r()*8, y*T + 10 + r()*12); c.stroke(); }
  // marsh reeds
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (ter[idx(x,y)] !== 7) continue; c.strokeStyle = '#3f6a3a'; c.lineWidth = 1.2; for (let k = 0; k < 4; k++) { const px = x*T + 4 + r()*24, py = y*T + 8 + r()*22; c.beginPath(); c.moveTo(px, py); c.lineTo(px + (r()-.5)*3, py - 7); c.stroke(); } c.fillStyle = '#5a8aa066'; c.fillRect(x*T + 6 + r()*10, y*T + 6 + r()*14, 9, 3); }
  // rocks (baked)
  const rocks = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ter[idx(x,y)] === 2 || ter[idx(x,y)] === 5) rocks.push([x, y]);
  if (IMG.rock) for (const [x, y] of rocks) { const im = ter[idx(x,y)] === 5 ? IMG.iron : IMG.rock, w = T*1.5, h = w*IMG.rock.height/IMG.rock.width; c.drawImage(im, x*T + T/2 - w/2 + (r()-.5)*6, (y+1)*T - h + 4 + (r()-.5)*4, w, h); }
  // forest floor shadow
  c.fillStyle = '#00000022'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ter[idx(x,y)] === 1 || ter[idx(x,y)] === 4) { c.beginPath(); c.ellipse(x*T + T/2, y*T + T*.7, T*.7, T*.35, 0, 0, 7); c.fill(); }
  // minimap base
  miniBase = document.createElement('canvas'); miniBase.width = miniBase.height = N; const m = miniBase.getContext('2d');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const t = ter[idx(x,y)]; m.fillStyle = ['#5d8a3a','#2f5a22','#8a8a7a','#3a6a94','#4a7030','#a0522d','#8a6a44','#4a6a4a'][t]; m.fillRect(x, y, 1, 1); }
  treeList = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ter[idx(x,y)] === 1 || ter[idx(x,y)] === 4) treeList.push({i: idx(x,y), x: x + .5 + (hash(x,y,1)-.5)*.3, y: y + .9 + (hash(x,y,2)-.5)*.2, s: 1.45 + hash(x,y,3)*.35, f: hash(x,y,4) < .5});
  treeById = new Map(treeList.map(t => [t.i, t]));
}
let treeList = [], treeById = new Map();

// ---------- drawing helpers ----------
function hull(pts) { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]); const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length-2], lo[lo.length-1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length-2], up[up.length-1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); }
const WCOL = {wall:{top:'#a7a39a', side:'#6e6a62', line:'#5a564f', mer:'#8a867d'}, palisade:{top:'#9a6e3e', side:'#6a4524', line:'#4a2e16', mer:'#b0844e'}, gate:{top:'#a7a39a', side:'#6e6a62', line:'#5a564f', mer:'#8a867d'}};
const isWallish = k => k === 'wall' || k === 'palisade' || k === 'gate' || k === 'tower';
function wallShapes(x, y, conn) {
  const cx = (x+.5)*T, cy = (y+.5)*T, hw = T*.34, shapes = [[[cx-hw,cy-hw],[cx+hw,cy-hw],[cx+hw,cy+hw],[cx-hw,cy+hw]]];
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (conn(x+dx, y+dy)) { const ex = cx + dx*T*.52, ey = cy + dy*T*.52;
    shapes.push(dx ? [[cx,cy-hw],[ex,cy-hw],[ex,cy+hw],[cx,cy+hw]] : [[cx-hw,cy],[cx+hw,cy],[cx+hw,ey],[cx-hw,ey]]); }
  for (const [dx, dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) if (conn(x+dx, y+dy) && !conn(x+dx, y) && !conn(x, y+dy)) {
    const ex = cx + dx*T*.5, ey = cy + dy*T*.5, px = -dy*hw*.75, py = dx*hw*.75;
    shapes.push([[cx+px,cy+py],[ex+px,ey+py],[ex-px,ey-py],[cx-px,cy-py]]); }
  return shapes;
}
function drawWall(c, x, y, k, hpf, rise, conn) {
  const col = WCOL[k], Hh = (k === 'palisade' ? 13 : 18) * (rise ?? 1), shapes = wallShapes(x, y, conn);
  c.fillStyle = '#00000030'; for (const s of shapes) { poly(c, s.map(p => [p[0] + 3, p[1] + 3])); c.fill(); }
  c.fillStyle = col.side; for (const s of shapes) { poly(c, hull(s.concat(s.map(p => [p[0], p[1] - Hh])))); c.fill(); }
  // mortar / stake lines on the front of the centre block
  const cx = (x+.5)*T, cy = (y+.5)*T, hw = T*.34;
  c.strokeStyle = col.line; c.lineWidth = 1;
  if (k === 'palisade') { c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(cx + i*4.5, cy + hw); c.lineTo(cx + i*4.5, cy + hw - Hh); } c.stroke(); }
  else { c.beginPath(); c.moveTo(cx-hw, cy+hw-Hh*.5); c.lineTo(cx+hw, cy+hw-Hh*.5); c.moveTo(cx-2, cy+hw-Hh*.5); c.lineTo(cx-2, cy+hw); c.moveTo(cx+5, cy+hw-Hh); c.lineTo(cx+5, cy+hw-Hh*.5); c.stroke(); }
  c.fillStyle = col.top; for (const s of shapes) { poly(c, s.map(p => [p[0], p[1] - Hh])); c.fill(); }
  // merlons
  c.fillStyle = col.mer; const m = 4.5;
  if (k === 'palisade') { c.fillStyle = '#c69a5e'; for (const [ox, oy] of [[-hw+2,-hw+2],[hw-6,-hw+2],[-hw+2,hw-6],[hw-6,hw-6]]) { c.beginPath(); c.arc(cx+ox+2, cy+oy+2-Hh, 2.6, 0, 7); c.fill(); } }
  else for (const [ox, oy] of [[-hw,-hw],[hw-m,-hw],[-hw,hw-m],[hw-m,hw-m]]) { c.fillRect(cx+ox, cy+oy-Hh-2, m, m); }
  if (k === 'gate') { c.fillStyle = '#3a2614'; c.beginPath(); c.moveTo(cx-7, cy+hw); c.lineTo(cx-7, cy+hw-Hh+7); c.arc(cx, cy+hw-Hh+7, 7, Math.PI, 0); c.lineTo(cx+7, cy+hw); c.fill();
    c.fillStyle = '#7a4e26'; c.fillRect(cx-5.5, cy+hw-Hh+7, 11, Hh-7); c.strokeStyle = '#2a1a0c'; c.beginPath(); c.moveTo(cx, cy+hw-Hh+3); c.lineTo(cx, cy+hw); c.stroke();
    c.fillStyle = '#b8322a'; c.fillRect(cx-3, cy-hw-Hh-9, 6, 8); }
  if (hpf < .5) { c.strokeStyle = '#2a2622'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx-6, cy-hw-Hh+3); c.lineTo(cx-1, cy-Hh+1); c.lineTo(cx-4, cy+hw-Hh+3); c.moveTo(cx+4, cy-Hh-2); c.lineTo(cx+8, cy-Hh+6); c.stroke(); }
}
function drawMarket(c, cx, by, w) {
  const s = w/64; c.save(); c.translate(cx, by); c.scale(s, s);
  c.fillStyle = '#00000030'; c.beginPath(); c.ellipse(0, -6, 32, 9, 0, 0, 7); c.fill();
  c.fillStyle = '#7a5230'; c.fillRect(-26, -26, 52, 18); c.fillStyle = '#5a3a20'; c.fillRect(-28, -10, 56, 6);
  for (let i = 0; i < 4; i++) { c.fillStyle = ['#c9a14a','#b84a2a','#6a9a3a','#8a8a80'][i]; c.beginPath(); c.arc(-18 + i*12, -27, 5, 0, 7); c.fill(); }
  c.fillStyle = '#4a2e16'; c.fillRect(-27, -50, 3, 42); c.fillRect(24, -50, 3, 42);
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#efe2c0' : '#b8322a'; c.beginPath(); c.moveTo(-30 + i*10, -52); c.lineTo(-20 + i*10, -52); c.lineTo(-20 + i*10, -38); c.quadraticCurveTo(-25 + i*10, -33, -30 + i*10, -38); c.fill(); }
  c.fillStyle = '#e7b84a'; c.beginPath(); c.moveTo(0, -66); c.lineTo(10, -52); c.lineTo(-10, -52); c.fill();
  c.restore();
}
function pennant(c, x, y, col) { c.strokeStyle = '#3a2a18'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x, y - 8); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 11, y - 4); c.lineTo(x, y); c.fill(); }
function drawPit(c, x, y) { c.fillStyle = '#3a2a1888'; c.fillRect(x*T + 3, y*T + 3, T - 6, T - 6); c.strokeStyle = '#8a6a3a'; c.lineWidth = 1; c.setLineDash([3, 3]); c.strokeRect(x*T + 3, y*T + 3, T - 6, T - 6); c.setLineDash([]);
  c.fillStyle = '#c8b090'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const px = x*T + 9 + i*7, py = y*T + 11 + j*7; c.beginPath(); c.moveTo(px - 2, py + 2); c.lineTo(px, py - 3); c.lineTo(px + 2, py + 2); c.fill(); } }
function drawBuildingSprite(c, k, x, y, alpha) {
  const d = B[k], cx = (x + d.w/2)*T, by = (y + d.h)*T + T*.12;
  c.globalAlpha = alpha ?? 1;
  if (d.pit) { drawPit(c, x, y); c.globalAlpha = 1; return; }
  if (k === 'market') drawMarket(c, cx, by, d.w*T*1.05);
  else { const im = IMG[d.spr]; if (im) { const w = d.sw*T, h = w*im.height/im.width; c.drawImage(im, cx - w/2, by - h, w, h); } else { c.fillStyle = '#8a6a3a'; c.fillRect(x*T, y*T, d.w*T, d.h*T); } }
  if (d.sign) { const sx = cx + d.w*T*.32, sy = by - d.h*T*.42; c.strokeStyle = '#3a2a18'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx - 9, sy - 13); c.lineTo(sx + 9, sy - 13); c.stroke();
    c.fillStyle = '#e8d4a0'; c.strokeStyle = '#5a3e22'; c.lineWidth = 1.5; c.beginPath(); c.rect(sx - 9, sy - 11, 18, 15); c.fill(); c.stroke(); c.font = '11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(d.sign, sx, sy - 3.5); c.textBaseline = 'alphabetic'; }
  c.globalAlpha = 1;
}
function drawFigure(c, x, y, k, tm, an, fx, atk, carry, tool, swing) {
  c.save(); c.translate(x, y); const big = k === 'brute' ? 1.7 : 1.2; c.scale((fx || 1)*big, big);
  c.fillStyle = '#0000003a'; c.beginPath(); c.ellipse(0, 0, 5.5, 2.2, 0, 0, 7); c.fill();
  const bob = Math.sin(an || 0), tun = tm === 1 ? (k === 'brute' ? '#5a1a14' : '#a8322b') : k === 'peasant' ? '#8a6a3e' : '#2f5fa8';
  c.strokeStyle = '#2a2018'; c.lineWidth = 2; c.beginPath(); c.moveTo(-2, -5); c.lineTo(-2 + bob*1.5, 0); c.moveTo(2, -5); c.lineTo(2 - bob*1.5, 0); c.stroke();
  c.fillStyle = tun; c.beginPath(); c.roundRect ? c.roundRect(-4.5, -13, 9, 9, 2) : c.rect(-4.5, -13, 9, 9); c.fill();
  if (tm === 0 && k !== 'peasant') { c.fillStyle = '#e7b84a'; c.fillRect(-4.5, -9.5, 9, 1.5); }
  c.fillStyle = '#e8c29a'; c.beginPath(); c.arc(0, -16, 3.3, 0, 7); c.fill();
  if (k !== 'peasant') { c.fillStyle = tm === 1 ? '#3a3330' : '#9aa0a8'; c.beginPath(); c.arc(0, -16.8, 3.5, Math.PI, 0); c.fill(); }
  else { c.fillStyle = '#c9a86a'; c.beginPath(); c.ellipse(0, -18, 4.5, 1.6, 0, 0, 7); c.fill(); }
  const sw = atk ? -0.7 : 0;
  if (tool) { const a = swing < .6 ? -2.2 + swing/.6*.6 : -1.6 + Math.min(1, (swing - .6)/.15)*2.5; c.save(); c.translate(2, -11); c.rotate(a);   // wind up, then strike
    c.strokeStyle = '#7a5230'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(11, 0); c.stroke();
    if (tool === 'hammer') { c.fillStyle = '#5a5a60'; c.fillRect(9, -3, 5, 6); }
    else if (tool === 'knife') { c.fillStyle = '#d8dce2'; c.beginPath(); c.moveTo(9, -1.2); c.lineTo(15, 0); c.lineTo(9, 1.2); c.fill(); }
    else if (tool === 'axe') { c.fillStyle = '#c8ccd2'; c.beginPath(); c.moveTo(9, -1); c.lineTo(13, -4.5); c.lineTo(13.5, 3); c.lineTo(9, 1.2); c.fill(); }
    else { c.strokeStyle = '#9aa0a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(11, -5); c.quadraticCurveTo(13.5, 0, 11, 5); c.stroke(); }
    c.restore(); }
  if (k === 'sword') { c.save(); c.translate(5, -8); c.rotate(sw*1.2 + .1); c.strokeStyle = '#dfe4ea'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -13); c.stroke(); c.strokeStyle = '#8a6a28'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, 2); c.lineTo(3, 2); c.stroke(); c.restore();
    c.fillStyle = '#6a7078'; c.strokeStyle = '#e7b84a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8.5, -12); c.lineTo(-1.5, -12); c.lineTo(-1.5, -6); c.lineTo(-5, -2.5); c.lineTo(-8.5, -6); c.closePath(); c.fill(); c.stroke(); }
  if (k === 'mace') { c.save(); c.translate(5, -8); c.rotate(sw*1.3 + .2); c.strokeStyle = '#6a4a28'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, 3); c.lineTo(0, -9); c.stroke(); c.fillStyle = '#5a5a62'; c.beginPath(); c.arc(0, -10.5, 3.2, 0, 7); c.fill();
    c.fillStyle = '#9aa0a8'; for (let q = 0; q < 6; q++) { const a = q*Math.PI/3; c.fillRect(Math.cos(a)*3.6 - .8, -10.5 + Math.sin(a)*3.6 - .8, 1.6, 1.6); } c.restore(); }
  if (k === 'spear' || k === 'raider') { c.save(); c.translate(5, -8); c.rotate(sw + .15); c.strokeStyle = '#6a4a28'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -16); c.stroke(); c.fillStyle = '#ccd'; c.beginPath(); c.moveTo(-2, -15); c.lineTo(2, -15); c.lineTo(0, -21); c.fill(); c.restore();
    if (k === 'spear') { c.fillStyle = '#2f5fa8'; c.strokeStyle = '#e7b84a'; c.lineWidth = 1; c.beginPath(); c.arc(-4.5, -9, 3.6, 0, 7); c.fill(); c.stroke(); } }
  if (k === 'archer' || k === 'earcher') { c.strokeStyle = '#6a4a28'; c.lineWidth = 1.5; c.beginPath(); c.arc(4, -10, 6, -1.2, 1.2); c.stroke(); c.strokeStyle = '#ddd'; c.lineWidth = .6; c.beginPath(); c.moveTo(4 + 6*Math.cos(-1.2), -10 + 6*Math.sin(-1.2)); c.lineTo(4 + 6*Math.cos(1.2), -10 + 6*Math.sin(1.2)); c.stroke(); }
  if (k === 'brute') { c.save(); c.translate(5, -9); c.rotate(sw*1.4); c.strokeStyle = '#4a3020'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -10); c.stroke(); c.fillStyle = '#555'; c.fillRect(-3.5, -14, 7, 6); c.restore(); }
  if (carry && WEAP.includes(carry)) { c.save(); c.translate(-5, -15); c.rotate(-.35);
    if (carry === 'bow') { c.strokeStyle = '#6a4a28'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 5, -1.3, 1.3); c.stroke(); }
    else if (carry === 'spear') { c.strokeStyle = '#7a5230'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-1, 7); c.lineTo(-1, -9); c.stroke(); c.fillStyle = '#ccd'; c.beginPath(); c.moveTo(-3, -8); c.lineTo(1, -8); c.lineTo(-1, -13); c.fill(); }
    else if (carry === 'sword') { c.strokeStyle = '#e0e4ea'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, 5); c.lineTo(0, -8); c.stroke(); c.strokeStyle = '#8a6a28'; c.beginPath(); c.moveTo(-3, 4); c.lineTo(3, 4); c.stroke(); }
    else if (carry === 'mace') { c.strokeStyle = '#6a4a28'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -5); c.stroke(); c.fillStyle = '#6a6a72'; c.beginPath(); c.arc(0, -6, 3, 0, 7); c.fill(); }
    else { c.fillStyle = '#9aa4b0'; c.strokeStyle = '#4a5260'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -5); c.lineTo(4, -5); c.lineTo(3.4, 4); c.lineTo(-3.4, 4); c.closePath(); c.fill(); c.stroke(); }
    c.restore(); }
  else if (carry) { c.fillStyle = carry === 'wood' ? '#8a5a2a' : carry === 'stone' ? '#9a968c' : '#c8342a'; c.beginPath(); c.arc(-4, -14, 3.6, 0, 7); c.fill(); }
  c.restore();
}
function drawSiege(c, x, y, u) {
  c.save(); c.translate(x, y); c.scale(u.fx || 1, 1);
  const wheel = (wx, r) => { c.fillStyle = '#3a2614'; c.beginPath(); c.arc(wx, -r, r, 0, 7); c.fill(); c.strokeStyle = '#7a5a32'; c.lineWidth = 1; c.beginPath(); c.arc(wx, -r, r*.5, 0, 7); c.stroke(); };
  c.fillStyle = '#0000003a'; c.beginPath(); c.ellipse(0, 0, 18, 5, 0, 0, 7); c.fill();
  if (u.k === 'ram') { const hit = u.atk ? 4 : 0;
    c.fillStyle = '#8a5a2e'; c.fillRect(-13 + hit, -11, 30, 4);  c.fillStyle = '#5a5a5a'; c.fillRect(15 + hit, -12.5, 5, 7);   // the log and its iron head
    c.fillStyle = '#6a4424'; c.fillRect(-14, -14, 26, 10); c.fillStyle = '#7a2a1c'; c.beginPath(); c.moveTo(-16, -13); c.lineTo(0, -24); c.lineTo(14, -13); c.closePath(); c.fill();
    c.strokeStyle = '#3a2614'; c.lineWidth = 1; for (let i = -12; i < 12; i += 5) { c.beginPath(); c.moveTo(i, -14); c.lineTo(i, -4); c.stroke(); }
    wheel(-9, 3.5); wheel(7, 3.5); }
  else if (u.k === 'stower') {
    c.fillStyle = '#6a4424'; c.fillRect(-10, -50, 20, 46); c.strokeStyle = '#3a2614'; c.lineWidth = 1;
    for (let yy = -46; yy < -4; yy += 6) { c.beginPath(); c.moveTo(-10, yy); c.lineTo(10, yy); c.stroke(); }
    c.fillStyle = '#8a5a2e'; c.fillRect(-12, -54, 24, 5); c.fillStyle = '#4a2e16'; for (let i = -11; i < 12; i += 6) c.fillRect(i, -58, 3, 4);
    c.strokeStyle = '#2a1a0c'; c.beginPath(); c.moveTo(0, -58); c.lineTo(0, -68); c.stroke(); c.fillStyle = '#a8322b'; c.fillRect(0, -68, 8, 5);
    if (u.dock) { c.fillStyle = '#8a5a2e'; c.save(); c.translate(10, -40); c.rotate(.25); c.fillRect(0, -2, 16, 4); c.restore(); }
    wheel(-7, 4); wheel(7, 4); }
  else { const f = u.fire ? Math.max(0, u.fire/.6) : 0, arm = -0.3 - (1 - f)*0 + f*1.4;
    c.fillStyle = '#6a4424'; c.fillRect(-14, -9, 28, 5); c.fillStyle = '#5a3a20'; c.beginPath(); c.moveTo(-4, -9); c.lineTo(0, -20); c.lineTo(4, -9); c.fill();
    c.save(); c.translate(0, -18); c.rotate(-arm); c.strokeStyle = '#8a5a2e'; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 0); c.lineTo(10, 0); c.stroke();
    c.fillStyle = '#4a2e16'; c.beginPath(); c.arc(-14, -2, 3.5, 0, 7); c.fill(); if (!f) { c.fillStyle = '#8a8478'; c.beginPath(); c.arc(-14, -4, 2.5, 0, 7); c.fill(); } c.restore();
    wheel(-9, 3.5); wheel(9, 3.5); }
  c.restore();
}
function statusBubble(c, x, y, icon, cross) { c.fillStyle = '#f3e6c4'; c.strokeStyle = '#7a5a32'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y - 9, 9, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(x - 3, y - 1); c.lineTo(x, y + 3); c.lineTo(x + 3, y - 1); c.fill(); c.font = '11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(icon, x, y - 8.5); c.textBaseline = 'alphabetic';
  if (cross) { c.strokeStyle = '#d0302a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, y - 15); c.lineTo(x + 6, y - 3); c.stroke(); } }
function hpBar(c, x, y, w, f) { if (f >= .999) return; c.fillStyle = '#000a'; c.fillRect(x - w/2 - 1, y - 1, w + 2, 5); c.fillStyle = f > .5 ? '#5ac24a' : f > .25 ? '#e0b030' : '#e04030'; c.fillRect(x - w/2, y, w*Math.max(0, f), 3); }

// ---------- input state ----------
let tool = null;           // building key, 'demolish', or null
let sel = [];              // selected unit ids
let selB = null;           // selected building id
let ghost = null;          // {x,y}
let drag = null;           // {k, x0,y0,x1,y1}
let lastFinger = null;
const FOFF = 72; let fOff = 0;   // touch placement aims this many px above the finger so it isn't hidden
const pointers = new Map(); let gest = null;
// ---------- inertial panning (iPhone-style fling) ----------
// track(): record finger samples while panning; release(): returns screen velocity (px/s) from the last ~100ms, or null if the finger paused;
// stepFling(): friction decay, frame-rate independent (x0.94 per 16.7ms), stops when slow.
function makeFling() { const F = {samples:[], v:null,
  start() { F.v = null; F.samples = []; },
  track(x, y) { const t = performance.now(); F.samples.push({t, x, y}); while (F.samples.length > 2 && t - F.samples[0].t > 120) F.samples.shift(); },
  release() { const s = F.samples, now = performance.now(); F.samples = []; if (s.length < 2) return F.v = null;
    const l = s[s.length - 1]; if (now - l.t > 60) return F.v = null;            // finger paused before lift: no fling
    let i = 0; while (i < s.length - 2 && l.t - s[i].t > 100) i++; const a = s[i], dt = (l.t - a.t)/1000; if (dt < .008) return F.v = null;
    let vx = (l.x - a.x)/dt, vy = (l.y - a.y)/dt; const sp = Math.hypot(vx, vy); if (sp < 120) return F.v = null;
    if (sp > 4000) { vx *= 4000/sp; vy *= 4000/sp; } return F.v = {x:vx, y:vy}; },
  stop() { F.v = null; },
  step(dt, cam, z, clamp) { if (!F.v) return false; const k = Math.pow(.94, dt*60); const ox = cam.x, oy = cam.y;
    cam.x -= F.v.x*dt/z; cam.y -= F.v.y*dt/z; clamp(); if (cam.x === ox) F.v.x = 0; if (cam.y === oy) F.v.y = 0;
    F.v.x *= k; F.v.y *= k; if (Math.hypot(F.v.x, F.v.y) < 20) F.v = null; return true; } }; return F; }
const fling = makeFling();
function tileAtScreen(sx, sy) { const w = s2w(sx, sy); return {x: Math.floor(w.x/T), y: Math.floor(w.y/T)}; }
function ghostTile(sx, sy) { const d = B[tool], w = s2w(sx, sy); return {x: Math.round(w.x/T - d.w/2), y: Math.round(w.y/T - d.h/2)}; }
cv.addEventListener('pointerdown', e => {
  if (!running) return; fling.stop();
  cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId, {x:e.clientX, y:e.clientY}); hideUndoSoon();
  if (pointers.size === 1) {
    lastFinger = {x:e.clientX, y:e.clientY}; fOff = e.pointerType === 'mouse' ? 0 : FOFF;
    if (tool && B[tool] && B[tool].line) { const t = tileAtScreen(e.clientX, e.clientY - fOff); drag = {k:tool, x0:t.x, y0:t.y, x1:t.x, y1:t.y}; gest = {kind:'wall'}; }
    else if (tool && B[tool]) { ghost = ghostTile(e.clientX, e.clientY - fOff); gest = {kind:'place'}; }
    else if (tool === 'demolish') { gest = {kind:'demo', hit:new Set()}; demoAt(e.clientX, e.clientY, gest.hit); }
    else { gest = {kind:'tap', sx:e.clientX, sy:e.clientY, t0:performance.now()}; const g = gest;
      g.timer = setTimeout(() => { if (gest === g && g.kind === 'tap') { g.kind = 'box'; g.ex = lastFinger ? lastFinger.x : g.sx; g.ey = lastFinger ? lastFinger.y : g.sy; try { navigator.vibrate && navigator.vibrate(15); } catch (er) {} } }, HOLD_MS); }
  } else if (pointers.size === 2) {
    if (gest && gest.timer) clearTimeout(gest.timer);
    drag = null; const [a, b] = [...pointers.values()];
    gest = {kind:'pinch', d0:Math.hypot(a.x-b.x, a.y-b.y), z0:cam.z, w0:s2w((a.x+b.x)/2, (a.y+b.y)/2)};
  }
});
cv.addEventListener('pointermove', e => {
  if (!running) return;
  if (!pointers.has(e.pointerId)) { hoverMouse(e); return; }
  const p = pointers.get(e.pointerId), px = p.x, py = p.y; p.x = e.clientX; p.y = e.clientY; lastFinger = {x:e.clientX, y:e.clientY};
  if (!gest) return;
  if (gest.kind === 'pinch' && pointers.size >= 2) { const [a, b] = [...pointers.values()]; cam.z = gest.z0 * Math.hypot(a.x-b.x, a.y-b.y) / Math.max(1, gest.d0); clampCam();
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2; cam.x = gest.w0.x - (mx - W/2)/cam.z; cam.y = gest.w0.y - (my - H/2)/cam.z; clampCam(); }
  else if (gest.kind === 'wall') { const t = tileAtScreen(e.clientX, e.clientY - fOff); drag.x1 = t.x; drag.y1 = t.y; }
  else if (gest.kind === 'place') ghost = ghostTile(e.clientX, e.clientY - fOff);
  else if (gest.kind === 'demo') demoAt(e.clientX, e.clientY, gest.hit);
  else if (gest.kind === 'tap') { if (Math.hypot(e.clientX - gest.sx, e.clientY - gest.sy) > 9) { gest.kind = 'pan'; clearTimeout(gest.timer); fling.start(); fling.track(px, py); } }
  else if (gest.kind === 'box') { gest.ex = e.clientX; gest.ey = e.clientY; }
  if (gest.kind === 'pan' || gest.kind === 'pan2') { cam.x -= (e.clientX - px)/cam.z; cam.y -= (e.clientY - py)/cam.z; clampCam(); fling.track(e.clientX, e.clientY); }
});
function endPointer(e, cancel) {
  if (!running) return;
  if (!pointers.has(e.pointerId)) return; pointers.delete(e.pointerId);
  if (gest && gest.kind === 'pinch') { gest = pointers.size === 1 ? {kind:'pan2'} : null; fling.start(); ghost = tool && B[tool] && !B[tool].line ? ghost : null; return; }
  if (pointers.size) return;
  const g = gest; gest = null; lastFinger = null; if (g && g.timer) clearTimeout(g.timer); if (!g || cancel) { drag = null; return; }
  if (g.kind === 'pan' || g.kind === 'pan2') { fling.release(); return; }
  if (g.kind === 'box') { boxSelect(g.sx, g.sy, g.ex, g.ey); return; }
  if (g.kind === 'wall' && drag) { const r = commitWall(drag.k, drag.x0, drag.y0, drag.x1, drag.y1); if (r.ok) { offerUndo(r.ids, r.cost); tutCheck(); } else if (!(drag.x0 === drag.x1 && drag.y0 === drag.y1 && !r.poor)) { toast(r.why, 'bad'); if (r.cost) flashRes(r.cost); } drag = null; }
  else if (g.kind === 'place' && ghost) { const r = place(tool, ghost.x, ghost.y); if (r.ok) { offerUndo([r.b.id], r.paid); if (r.replaced) toast(B[tool].name + ' built into the wall'); tutCheck(); if (!afford(B[tool].cost)) setTool(null); } else { toast(r.why, 'bad'); if (r.poor) flashRes(B[tool].cost); } }
  else if (g.kind === 'tap') handleTap(e.clientX, e.clientY);
}
cv.addEventListener('pointerup', e => endPointer(e, false));
cv.addEventListener('pointercancel', e => endPointer(e, true));
cv.addEventListener('wheel', e => { if (!running) return; e.preventDefault(); fling.stop(); const w0 = s2w(e.clientX, e.clientY); cam.z *= Math.exp(-e.deltaY*.0015); clampCam(); cam.x = w0.x - (e.clientX - W/2)/cam.z; cam.y = w0.y - (e.clientY - H/2)/cam.z; clampCam(); }, {passive:false});
function hoverMouse(e) { if (e.pointerType === 'mouse' && tool && B[tool] && !B[tool].line) ghost = ghostTile(e.clientX, e.clientY); }
function demoAt(sx, sy, hit) { const t = tileAtScreen(sx, sy), b = bAt(t.x, t.y); if (b && !hit.has(b.id)) { hit.add(b.id); if (b.tm) toast('That belongs to the enemy. Attack it with soldiers', 'bad'); else if (b.k === 'keep') toast("You can't demolish the Keep", 'bad'); else demolish(b, .5); } }
function handleTap(sx, sy) {
  const w = s2w(sx, sy), tx = Math.floor(w.x/T), ty = Math.floor(w.y/T);
  // tap own unit?
  let hit = null, hd = 22/cam.z;
  for (const u of S.u) if (u.tm === 0) { const uy = u.y*T - (u.el ? 18 : 0) - 8, d = Math.hypot(u.x*T - w.x, uy - w.y); if (d < Math.max(hd, 12)) { hd = d; hit = u; } }
  if (sel.length && !hit) { const tb = bAt(tx, ty); if (tb && tb.tm === 1) { const n = orderRaid(sel); toast('⚔ ' + n + ' soldier' + (n === 1 ? '' : 's') + ' attacking the enemy castle!'); marker = {x:(tx+.5)*T, y:(ty+.5)*T, t:1}; return; }
    const n = orderMove(sel, tx, ty); if (n) { marker = {x:(tx+.5)*T, y:(ty+.5)*T, t:1}; tutCheck(); } else toast("They can't get there", 'bad'); return; }
  if (hit) { sel = [hit.id]; selB = null; renderSheet(); updateHint(); return; }
  const b = bAt(tx, ty);
  if (b) { selB = b.id; sel = []; renderSheet(true); updateHint(); return; }
  selB = null; renderSheet(); updateHint();
}
let marker = null;
const HOLD_MS = 350;
function boxSelect(x0, y0, x1, y1) {
  const l = Math.min(x0, x1), r = Math.max(x0, x1), t = Math.min(y0, y1), b = Math.max(y0, y1);
  if (r - l < 12 && b - t < 12) { handleTap(x0, y0); return; }   // a hold without dragging acts like a tap
  const ids = soldiers().filter(u => { const s = w2s(u.x*T, u.y*T - (u.el ? 18 : 0) - 8); return s.x >= l - 6 && s.x <= r + 6 && s.y >= t - 6 && s.y <= b + 6; }).map(u => u.id);
  sel = ids; selB = null; tool = null; renderSheet(); updateHint(); refreshItems(); $('btn-army').classList.toggle('sel', !!ids.length);
  if (!ids.length) toast('No soldiers in that box'); else try { navigator.vibrate && navigator.vibrate(8); } catch (er) {}
}

// ---------- UI ----------
function toast(msg, cls = '', ms = 2600) {
  const box = $('toasts'); while (box.children.length > 1) box.firstChild.remove();
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = msg; box.appendChild(el); setTimeout(() => el.remove(), ms);
}
const TABS = {eco:['woodcutter','quarry','mine','farm','hovel','stockpile','granary','market'], castle:['wall','palisade','tower','gate','pit','demolish'], mil:['barracks','guild','armory','fletcher','poleturner','blacksmith','armorer','r:archer','r:spear','r:mace','r:sword','r:catapult']};
let curTab = 'eco';
const iconCache = {};
function iconFor(k) {
  if (iconCache[k]) return iconCache[k].cloneNode ? cloneCv(iconCache[k]) : iconCache[k];
  const c = document.createElement('canvas'); c.width = 104; c.height = 80; const g = c.getContext('2d');
  if (k === 'wall' || k === 'palisade' || k === 'gate') { g.save(); g.translate(52 - 1.5*T, 52 - .5*T); const set = k === 'gate' ? [[0,'wall'],[1,'gate'],[2,'wall']] : [[0,k],[1,k],[2,k]];
    for (const [i, kk] of set) drawWall(g, i, 0, kk, 1, 1, (x, y) => y === 0 && x >= 0 && x <= 2); g.restore(); }
  else if (k === 'demolish') { g.font = '44px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔨', 52, 42); }
  else if (k === 'r:catapult') { g.save(); g.translate(52, 72); g.scale(1.6, 1.6); drawSiege(g, 0, 0, {k:'catapult', tm:0, fx:1}); g.restore(); }
  else if (k === 'pit') { g.save(); g.translate(52 - T/2*1.6, 40 - T/2*1.6); g.scale(1.6, 1.6); drawPit(g, 0, 0); g.restore(); }
  else if (k.startsWith('r:')) { g.save(); g.translate(52, 70); g.scale(2.6, 2.6); drawFigure(g, 0, 0, k.slice(2), 0, 0, 1); g.restore(); }
  else if (k === 'market') drawMarket(g, 52, 76, 80);
  else { const im = IMG[B[k].spr]; if (im) { const s = Math.min(100/im.width, 78/im.height); g.drawImage(im, 52 - im.width*s/2, 79 - im.height*s, im.width*s, im.height*s); } }
  iconCache[k] = c; return cloneCv(c);
}
function cloneCv(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); return n; }
function renderItems() {
  const box = $('items'); box.innerHTML = '';
  for (const k of TABS[curTab]) {
    const el = document.createElement('button'); el.className = 'it'; el.dataset.k = k;
    let name, cost;
    if (k === 'demolish') { name = 'Demolish'; cost = '½ refund'; }
    else if (k.startsWith('r:')) { const u = UNIT[k.slice(2)]; name = u.name; cost = costTxt(u.cost) + ' 1👥'; }
    else { name = B[k].name.replace('Apple ', ''); cost = costTxt(B[k].cost) + (B[k].line ? ' ea' : ''); }
    el.appendChild(iconFor(k)); el.insertAdjacentHTML('beforeend', `<span class="n">${name}</span><span class="c">${cost}</span>`);
    el.addEventListener('click', () => onItem(k)); box.appendChild(el);
  }
  refreshItems();
}
function refreshItems() {
  for (const el of $('items').children) { const k = el.dataset.k; let ok = true;
    if (k.startsWith('r:')) ok = afford(UNIT[k.slice(2)].cost) && idle() > 0 && count(k === 'r:catapult' ? 'guild' : 'barracks') > 0; else if (B[k]) ok = afford(B[k].cost);
    el.classList.toggle('no', !ok); el.classList.toggle('on', tool === k); }
}
function onItem(k) {
  if (k.startsWith('r:')) { const r = recruit(k.slice(2)); if (r.ok) { toast(UNIT[k.slice(2)].name + ' ready at the Barracks'); tutCheck(); } else { toast(r.why, 'bad'); if (r.cost) flashRes(r.cost); if (r.pop) flashRes({}); } refreshItems(); return; }
  setTool(tool === k ? null : k);
}
function setTool(k) {
  tool = k; ghost = null; drag = null; sel = []; selB = null; renderSheet(); updateHint(); refreshItems();
  if (k && B[k] && !B[k].line) { const w = s2w(W/2, H/2), d = B[k]; ghost = {x: Math.round(w.x/T - d.w/2), y: Math.round(w.y/T - d.h/2)}; }
  $('btn-army').classList.remove('sel');
}
function updateHint() {
  const h = $('hint'), t = $('hint-t'); let txt = '';
  if (tool === 'demolish') txt = '🔨 Tap or drag over things to knock them down (½ refund)';
  else if (tool && B[tool].line) txt = `✍ Drag your finger to draw ${B[tool].name.toLowerCase()} · ${costTxt(B[tool].cost)} per section`;
  else if (tool) txt = `Drag to position the ${B[tool].name}, lift to build · ${costTxt(B[tool].cost)}`;
  else if (sel.length) txt = `⚔ ${sel.length} selected. Tap the ground or a wall to send them`;
  h.classList.toggle('hidden', !txt); t.textContent = txt;
  $('hint-x').textContent = sel.length ? '✕ Deselect' : '✕ Cancel';
  $('build').classList.toggle('hidden', !!selB);
}
$('hint-x').addEventListener('click', () => { setTool(null); sel = []; updateHint(); $('btn-army').classList.remove('sel'); });
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { curTab = b.dataset.tab; document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b)); renderItems(); }));
$('btn-army').addEventListener('click', () => {
  const all = soldiers().map(u => u.id);
  if (!all.length) { toast('No soldiers yet. Build a Barracks and recruit some', 'bad'); return; }
  tool = null; ghost = null; selB = null; renderSheet();
  sel = sel.length === all.length ? [] : all; $('btn-army').classList.toggle('sel', !!sel.length); updateHint(); refreshItems();
});
let sheetKey = '';
function renderSheet(force) {
  const sh = $('sheet'); const b = selB && byId.get(selB);
  if (!b) { if (selB) selB = null; sh.classList.add('hidden'); $('build').classList.remove('hidden'); sheetKey = ''; return; }
  const d = B[b.k];
  if (b.tm) { const h = `<button class="x" data-a="close">✕</button><h3>🚩 Enemy ${d.name}</h3><div class="hpbar"><i style="width:${Math.max(0, b.hp/d.hp*100).toFixed(0)}%"></i></div><p>Belongs to the enemy lord. Select soldiers (⚔ Army, or hold + drag) and tap any enemy building to attack the castle. Catapults smash buildings from range.</p>`;
    if (force || h !== sheetKey) { sh.innerHTML = h; sheetKey = h; } sh.classList.remove('hidden'); $('build').classList.add('hidden'); return; }
  let html = `<button class="x" data-a="close">✕</button><h3>${d.name}</h3><div class="hpbar"><i style="width:${Math.max(0, b.hp/d.hp*100).toFixed(0)}%"></i></div><p>${d.desc}</p>`;
  if (d.craft) { const out = b.out || d.prod; html += `<p>${!b.staffed ? '💤 <b>No worker</b>. Needs an idle peasant (build Hovels)' : b.need === 'armory' ? '🛡 <b>No Armory</b> to deliver to. Build one (Military tab)' : b.need ? '⏳ Waiting for ' + costTxt(d.inp) + ' (not enough ' + b.need + ')' : '🔨 Making ' + ICON[out] + ' ' + GNAME[out] + ' from ' + costTxt(d.inp)}</p><p>In the Armory: ${ICON[out]} ${S.res[out] || 0}</p>`;
    if (d.alt) html += `<div class="row"><button class="btn ${out === d.prod ? 'green' : ''}" data-a="out:${d.prod}">Make swords 🗡</button><button class="btn ${out === d.alt ? 'green' : ''}" data-a="out:${d.alt}">Make maces 🔨</button></div>`; }
  else if (d.repair) html += `<p>${!b.staffed ? '💤 <b>No engineer</b>. Needs an idle peasant (build Hovels)' : b.need ? '⏳ Out of ' + b.need + ' for repairs' : '🔧 Engineer on duty: repairs walls, towers, gates and the keep (1🪨 per 100 hp)'}</p>`;
  else if (d.prod) html += `<p>${!b.staffed ? '💤 <b>No worker</b>. Needs an idle peasant (build Hovels)' : b.noTrees ? '🪓 <b>No trees left in range.</b> Build a new Woodcutter by a forest.' : '👷 Working: +' + d.amt + ICON[d.prod] + ' per trip'}</p>`;
  if (d.chop) { let n = 0; const R = d.nearR; for (let y = b.y - R; y < b.y + d.h + R; y++) for (let x = b.x - R; x < b.x + d.w + R; x++) if (inb(x, y) && ter[idx(x, y)] === 1) n++; html += `<p>🌲 ${n} trees in reach</p>`; }
  if (b.k === 'armory' || b.k === 'barracks') html += `<div class="arms">${WEAP.map(r => `<span>${ICON[r]} <b>${S.res[r] || 0}</b> ${GNAME[r]}</span>`).join('')}</div>`;
  if (d.house) html += `<p>🏠 Houses ${d.house} · People ${S.pop + soldiers().length}/${cap()}</p>`;
  const rows = [];
  if (b.k === 'barracks') rows.push(`<button class="btn" data-a="r:archer">Recruit Archer<small>${costTxt(UNIT.archer.cost)} 1👥</small></button><button class="btn" data-a="r:spear">Recruit Spearman<small>${costTxt(UNIT.spear.cost)} 1👥</small></button><button class="btn" data-a="r:mace">Recruit Maceman<small>${costTxt(UNIT.mace.cost)} 1👥</small></button><button class="btn" data-a="r:sword">Recruit Swordsman<small>${costTxt(UNIT.sword.cost)} 1👥</small></button>`);
  if (b.k === 'market') html += `<div class="mkt"><div class="mh"><span>Good</span><span>Have</span><span>Buy</span><span>Sell</span></div>${[...RES.filter(r => r !== 'gold'), ...WEAP].map(r => `<div class="mr"><span>${ICON[r]} ${GNAME[r]}${TRADE.lot[r] > 1 ? ' ×' + TRADE.lot[r] : ''}</span><b>${fmt(S.res[r] || 0)}</b><button class="sm" data-a="buy:${r}">−${TRADE.buy[r]}🪙</button><button class="sm" data-a="sell:${r}">+${TRADE.sell[r]}🪙</button></div>`).join('')}</div>`;
  if (b.k === 'guild') rows.push(`<button class="btn" data-a="r:catapult">Build Catapult<small>${costTxt(UNIT.catapult.cost)} 1👥</small></button>`);
  if (b.k === 'keep') rows.push(TAX.map((t, i) => `<button class="btn ${(S.tax ?? 1) === i ? 'green' : ''}" data-a="tax:${i}">Tax: ${t.n}<small>${t.d}</small></button>`).join(''));
  if (b.k === 'keep') { const dmg = S.b.filter(x => x.hp < B[x.k].hp && x.k !== 'keep' && !x.tm); rows.push(`<button class="btn" data-a="repairall" ${dmg.length ? '' : 'disabled'}>Repair everything<small>${dmg.length} damaged</small></button>`); }
  const row2 = [];
  if (b.hp < d.hp) row2.push(`<button class="btn" data-a="repair">Repair<small>${costTxt(repairCost(b))}</small></button>`);
  if (b.k !== 'keep') row2.push(`<button class="btn red" data-a="demo">Demolish<small>½ refund</small></button>`);
  html += rows.map(r => `<div class="row">${r}</div>`).join('') + (row2.length ? `<div class="row">${row2.join('')}</div>` : '');
  if (force || html !== sheetKey) { sh.innerHTML = html; sheetKey = html; }
  sh.classList.remove('hidden'); $('build').classList.add('hidden');
}
$('sheet').addEventListener('click', e => {
  const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; const b = byId.get(selB);
  if (a === 'close') { selB = null; renderSheet(); updateHint(); return; }
  if (!b) return;
  if (a.startsWith('r:')) { const r = recruit(a.slice(2)); toast(r.ok ? UNIT[a.slice(2)].name + ' recruited' : r.why, r.ok ? '' : 'bad'); if (r.cost && !r.ok) flashRes(r.cost); tutCheck(); }
  else if (a.startsWith('sell:') || a.startsWith('buy:')) { const r = trade(a.split(':')[0], a.split(':')[1]); if (!r.ok) { toast(r.why, 'bad'); flashRes(r.cost); } }
  else if (a.startsWith('tax:')) { S.tax = +a.slice(4); toast('Tax set to ' + TAX[S.tax].n + ': ' + TAX[S.tax].d); }
  else if (a.startsWith('out:')) { b.out = a.slice(4) === B[b.k].prod ? undefined : a.slice(4); toast('Now making ' + GNAME[a.slice(4)]); }
  else if (a === 'repair') { const c = repairCost(b); if (afford(c)) { pay(c); b.hp = B[b.k].hp; puff((b.x + B[b.k].w/2)*T, (b.y + B[b.k].h)*T, '#e7d9b0', 6); } else { toast('Not enough to repair', 'bad'); flashRes(c); } }
  else if (a === 'repairall') { let n = 0, poor = false; for (const x of S.b) if (x.hp < B[x.k].hp && x.k !== 'keep' && !x.tm) { const c = repairCost(x); if (afford(c)) { pay(c); x.hp = B[x.k].hp; n++; } else poor = true; } toast(n ? 'Repaired ' + n + (poor ? ' (ran out of materials)' : '') : 'Not enough materials', n ? '' : 'bad'); }
  else if (a === 'demo') { demolish(b, .5); selB = null; updateHint(); }
  renderSheet(true); refreshItems();
});
function trade(kind, r) { const lot = TRADE.lot[r]; if (!lot) return {ok:false, why:'Can\'t trade that', cost:{}};
  if (kind === 'sell') { if ((S.res[r] || 0) < lot) return {ok:false, why:'Not enough ' + GNAME[r] + ' to sell', cost:{[r]:lot}}; S.res[r] -= lot; S.res.gold += TRADE.sell[r]; return {ok:true}; }
  if (S.res.gold < TRADE.buy[r]) return {ok:false, why:'Not enough gold', cost:{gold:TRADE.buy[r]}}; S.res.gold -= TRADE.buy[r]; S.res[r] = (S.res[r] || 0) + lot; return {ok:true}; }
let undo = null;
function offerUndo(ids, cost) { undo = {ids, cost, until: performance.now() + 6000}; $('btn-undo').classList.remove('hidden'); }
function hideUndoSoon() {}
$('btn-undo').addEventListener('click', () => { if (!undo) return; let any = false; for (const id of undo.ids) { const b = byId.get(id); if (b) { S.b = S.b.filter(x => x !== b); any = true; } } if (any) { refund(undo.cost, 1); reocc(); toast('Undone, materials returned'); } undo = null; $('btn-undo').classList.add('hidden'); });

// speed / pause / menu / send
function setSpeedLabel() { $('btn-speed').textContent = SPEEDS[speedIdx] + '×'; $('btn-pause').textContent = paused ? '▶' : '⏸'; $('btn-pause').classList.toggle('on', paused); }
$('btn-speed').addEventListener('click', () => { speedIdx = (speedIdx + 1) % SPEEDS.length; paused = false; setSpeedLabel(); });
$('btn-pause').addEventListener('click', () => { paused = !paused; setSpeedLabel(); });
$('btn-send').addEventListener('click', () => { if (S.wave.active) { toast('Beat this wave first', 'bad'); return; } sendWave(); });
$('btn-menu').addEventListener('click', () => showMenu());
$('wave').addEventListener('click', () => toast('Wave ' + (S.wave.n + (S.wave.active ? 0 : 1)) + ': ' + waveText(S.wave.n + (S.wave.active ? 0 : 1))));
mini.addEventListener('pointerdown', e => { fling.stop(); const r = mini.getBoundingClientRect(); cam.x = (e.clientX - r.left)/r.width*N*T; cam.y = (e.clientY - r.top)/r.height*N*T; clampCam(); });

// ---------- tutorial ----------
const TUT = [
  {t:'Build a <b>Woodcutter</b> next to the forest 🌲 (tap it below, then drag on the map)', ok:() => count('woodcutter') > 0},
  {t:'Build a <b>Quarry</b> right on top of the gray rocks 🪨 (the outlined tiles)', ok:() => count('quarry') > 0},
  {t:'Build an <b>Apple Farm</b> so your people have food 🍎', ok:() => count('farm') > 0},
  {t:'Build a <b>Hovel</b> so more peasants move in 👥', ok:() => count('hovel') > 0},
  {t:'Castle tab → <b>Stone Wall</b>, then drag your finger to draw a wall line', ok:() => count('wall') + count('palisade') >= 4},
  {t:'Military tab → build a <b>Barracks</b>, then recruit an <b>Archer</b>', ok:() => soldiers().length > 0},
  {t:'Tap <b>⚔ Army</b>, then tap a wall to put your archers on it (more range!)', ok:() => soldiers().some(u => u.el || u.path.length && occ[u.path[u.path.length-1]])},
  {t:'Survive the first wave! Tap <b>⚔ Send</b> when you are ready', ok:() => (S.beaten || 0) >= 1},
];
function tutCheck() {
  if (S.tut >= TUT.length) { $('tut').classList.add('hidden'); return; }
  while (S.tut < TUT.length && TUT[S.tut].ok()) { S.tut++; if (S.tut < TUT.length) toast('✓ Nice!'); else { toast('Tutorial done. Hold the keep as long as you can!', 'big'); try { localStorage.setItem(TUT_KEY, '1'); } catch (e) {} } }
  if (S.tut >= TUT.length) { $('tut').classList.add('hidden'); return; }
  $('tut').classList.remove('hidden'); $('tut-t').innerHTML = `<b>${S.tut + 1}/${TUT.length}</b> ` + TUT[S.tut].t;
}
$('tut-x').addEventListener('click', () => { S.tut = TUT.length; $('tut').classList.add('hidden'); try { localStorage.setItem(TUT_KEY, '1'); } catch (e) {} });

// ---------- HUD update ----------
const fmt = n => n >= 10000 ? (n/1000).toFixed(0) + 'k' : String(Math.floor(n));
let hudT = 0;
function updateHud() {
  for (const r of RES) $('r-' + r).lastChild.textContent = fmt(S.res[r]);
  $('r-arms').lastChild.textContent = WEAP.reduce((a, r) => a + (S.res[r] || 0), 0);
  $('r-pop').querySelector('b').textContent = `${S.pop + soldiers().length}/${cap()}`; $('r-pop').querySelector('sup').textContent = idle() + ' idle';
  const en = S.u.filter(u => u.tm === 1).length;
  const wv = $('wave'); $('btn-send').classList.toggle('hidden', S.mode === 'vs');
  if (S.mode === 'vs') { const A = S.ai, att = S.u.filter(u => u.tm === 1 && !u.guard).length, home = en - att, s = Math.max(0, Math.ceil(A.nextAttack - S.t));
    $('wave-n').textContent = '🚩 Enemy lord'; $('wave-t').textContent = att ? `· ${att} attacking!` : `· army ${home} · attack ~${Math.floor(s/60)}:${String(s % 60).padStart(2, '0')}`;
    wv.classList.toggle('danger', att > 0 || s < 20); const ab = S.b.filter(b => b.tm === 1), ak = aiKeep();
    $('wave-p').textContent = `Enemy castle: ${ab.filter(b => !B[b.k].line).length} buildings, ${ab.filter(b => B[b.k].line).length} walls · keep ${ak ? Math.round(ak.hp/B.keep.hp*100) : 0}%`;
    $('army-n').textContent = soldiers().length; if (undo && performance.now() > undo.until) { undo = null; $('btn-undo').classList.add('hidden'); } refreshItems(); if (selB) renderSheet(); return; }
  $('wave-p').textContent = 'Next · Wave ' + (S.wave.n + 1) + ': ' + waveText(S.wave.n + 1);
  if (S.wave.active) { $('wave-n').textContent = 'Wave ' + S.wave.n; $('wave-t').textContent = '· ' + en + ' enemies left'; wv.classList.add('danger'); }
  else { const s = Math.max(0, Math.ceil(S.wave.next - S.t)); $('wave-n').textContent = 'Wave ' + (S.wave.n + 1); $('wave-t').textContent = 'in ' + Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0'); wv.classList.toggle('danger', s < 15); }
  $('army-n').textContent = soldiers().length;
  if (undo && performance.now() > undo.until) { undo = null; $('btn-undo').classList.add('hidden'); }
  refreshItems(); if (selB) renderSheet(); tutCheck();
}

// ---------- render ----------
function render(now) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#16200f'; c.fillRect(0, 0, cv.width, cv.height);
  const z = cam.z*DPR; c.setTransform(z, 0, 0, z, (W/2 - cam.x*cam.z)*DPR, (H/2 - cam.y*cam.z)*DPR);
  c.imageSmoothingEnabled = true;
  if (terrainCv) c.drawImage(terrainCv, 0, 0);
  const tl = s2w(0, 0), br = s2w(W, H), x0 = Math.max(0, Math.floor(tl.x/T) - 2), y0 = Math.max(0, Math.floor(tl.y/T) - 1), x1 = Math.min(N-1, Math.ceil(br.x/T) + 2), y1 = Math.min(N-1, Math.ceil(br.y/T) + 4);
  const vis = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  // selection footprint
  const sb = selB && byId.get(selB);
  if (sb) { const d = B[sb.k]; c.strokeStyle = '#ffe28a'; c.lineWidth = 2/cam.z + 1; c.setLineDash([6, 4]); c.strokeRect(sb.x*T, sb.y*T, d.w*T, d.h*T); c.setLineDash([]); }
  // drawables
  const dl = [];
  const nowMs = performance.now();
  const drawTree = (t, sc, ox, rot, alpha) => { const im = IMG.trees; if (!im) return; const w = T*t.s*sc, h = w*im.height/im.width; c.save(); c.globalAlpha = alpha ?? 1; c.translate(t.x*T + ox, t.y*T); if (rot) c.rotate(rot); if (t.f) c.scale(-1, 1); c.drawImage(im, -w/2, -h, w, h); c.restore(); };
  const drawStump = t => { const x = t.x*T, y = t.y*T - 3; c.fillStyle = '#00000030'; c.beginPath(); c.ellipse(x + 2, y + 2, 7, 3, 0, 0, 7); c.fill(); c.fillStyle = '#6a4424'; c.fillRect(x - 5, y - 6, 10, 6); c.fillStyle = '#c9a26a'; c.beginPath(); c.ellipse(x, y - 6, 5, 2.2, 0, 0, 7); c.fill(); c.strokeStyle = '#8a6438'; c.lineWidth = .8; c.beginPath(); c.ellipse(x, y - 6, 2.5, 1.1, 0, 0, 7); c.stroke(); };
  for (const t of treeList) { if (!vis(Math.floor(t.x), Math.floor(t.y))) continue; const tt = ter[t.i];
    if (tt === 1) { const sh = shake.get(t.i); let ox = 0; if (sh) { const e = nowMs - sh; if (e < 260) ox = Math.sin(e/22)*2.2*(1 - e/260); else shake.delete(t.i); } dl.push({y:t.y*T, f:() => drawTree(t, 1, ox)}); }
    else if (tt === 4) { const p = Math.min(1, (S.t - (S.stumps[t.i] ?? S.t))/STUMP_CLEAR); dl.push({y:t.y*T, f:() => { c.globalAlpha = p > .75 ? (1 - p)*4 : 1; drawStump(t); c.globalAlpha = 1; }}); } }
  falls = falls.filter(f => nowMs - f.t0 < 1100);
  for (const f of falls) { const t = treeById.get(f.i); if (!t) continue; const e = (nowMs - f.t0)/1100, ang = Math.min(1, e/.7)**2*1.45; dl.push({y:t.y*T + 1, f:() => drawTree(t, 1, 0, ang, e < .7 ? 1 : 1 - (e - .7)/.3)}); }
  const conn = (x, y) => { const b = bAt(x, y); return b && isWallish(b.k); };
  for (const b of S.b) { const d = B[b.k]; if (!vis(b.x, b.y) && !vis(b.x + d.w, b.y + d.h)) continue;
    if (d.line || d.gate) dl.push({y:(b.y + 1)*T - 1, f:() => drawWall(c, b.x, b.y, b.k, b.hp/d.hp, b.rise != null ? b.rise : 1, conn)});
    else dl.push({y:(b.y + d.h)*T, f:() => { if (b.k === 'tower') for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) drawWall(c, b.x + i, b.y + j, 'wall', b.hp/d.hp, 1, conn);
      drawBuildingSprite(c, b.k, b.x, b.y); if (b.tm === 1) pennant(c, (b.x + d.w/2)*T, b.y*T - (b.k === 'keep' ? 40 : 10), '#c8302a'); if (d.prod && !b.tm && (!b.staffed || b.noTrees || b.need)) statusBubble(c, (b.x + d.w/2)*T, b.y*T - 4, !b.staffed ? '💤' : b.noTrees ? '🌲' : b.need === 'armory' ? '🛡' : ICON[b.need], b.staffed); }}); }
  for (const [id, w] of workers) { const b = byId.get(id); if (!b) continue; dl.push({y:w.y*T, f:() => drawFigure(c, w.x*T, w.y*T, 'peasant', 0, w.st === 4 || w.st === 6 || ((B[b.k].mine || B[b.k].craft) && w.st === 0) ? 0 : w.an, w.st === 2 ? -1 : 1, 0, w.st === 1 ? (w.what || B[b.k].prod) : null, w.st === 4 ? 'axe' : w.st === 6 ? 'hammer' : B[b.k].mine && w.st === 0 ? 'pick' : B[b.k].craft && w.st === 0 && w.has ? (B[b.k].inp.wood ? 'knife' : 'hammer') : null, w.sw || 0)}); }
  // idle peasants by the keep
  const nIdle = Math.min(idle(), 10);
  for (let i = 0; i < nIdle; i++) { const a = i/Math.max(1, nIdle)*Math.PI + .2, px = (KX + 1.5 + Math.cos(a)*1.6)*T, py = (KY + 4.3 + Math.sin(a)*.8)*T; dl.push({y:py, f:() => drawFigure(c, px, py, 'peasant', 0, 0, Math.cos(a) > 0 ? -1 : 1)}); }
  dl.push({y:(KY + 4.3)*T, f:() => { const fx = (KX + 1.5)*T, fy = (KY + 4.4)*T; c.fillStyle = '#5a3a20'; c.fillRect(fx - 5, fy - 2, 10, 3); const fl = 3 + Math.sin(now/90)*1.2; c.fillStyle = '#f0a020'; c.beginPath(); c.moveTo(fx - 4, fy - 1); c.quadraticCurveTo(fx, fy - 8 - fl, fx + 4, fy - 1); c.fill(); c.fillStyle = '#ffe070'; c.beginPath(); c.moveTo(fx - 2, fy - 1); c.quadraticCurveTo(fx, fy - 4 - fl*.6, fx + 2, fy - 1); c.fill(); }});
  for (const u of S.u) { if (!vis(Math.floor(u.x), Math.floor(u.y))) continue; const el = u.tm === 0 && u.el, oy = el ? 18 : 0;
    dl.push({y:el ? (Math.floor(u.y) + 1)*T : u.y*T, f:() => { const sx = u.x*T, sy = u.y*T - oy;
      if (sel.includes(u.id)) { c.strokeStyle = '#ffe28a'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(sx, sy, 8, 3.5, 0, 0, 7); c.stroke(); }
      if (UNIT[u.k].siege) { drawSiege(c, sx, sy, u); if (u.tm === 0) pennant(c, sx - 2, sy - 34, '#2f6fd0'); hpBar(c, sx, sy - (u.k === 'stower' ? 58 : 34), 26, u.hp/u.mhp); }
      else { drawFigure(c, sx, sy, u.k, u.tm, u.an, u.fx, u.atk); hpBar(c, sx, sy - (u.k === 'brute' ? 32 : 24), 14, u.hp/u.mhp); } }}); }
  dl.sort((a, b) => a.y - b.y); for (const d of dl) d.f();
  // building hp bars
  for (const b of S.b) { const d = B[b.k]; if (b.hp < d.hp && vis(b.x, b.y)) hpBar(c, (b.x + d.w/2)*T, b.y*T - (d.line ? 22 : 8), Math.min(40, d.w*T*.8), b.hp/d.hp); }
  // projectiles
  c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.4;
  for (const p of projectiles) { const f = p.t/p.dur, x = (p.sx + (p.tx - p.sx)*f)*T, y = (p.sy + (p.ty - p.sy)*f)*T - p.h0*(1 - f) - Math.sin(f*Math.PI)*14 - 8;
    const f2 = Math.min(1, f + .05), x2 = (p.sx + (p.tx - p.sx)*f2)*T, y2 = (p.sy + (p.ty - p.sy)*f2)*T - p.h0*(1 - f2) - Math.sin(f2*Math.PI)*14 - 8; const a = Math.atan2(y2 - y, x2 - x);
    c.beginPath(); c.moveTo(x - Math.cos(a)*6, y - Math.sin(a)*6); c.lineTo(x + Math.cos(a)*3, y + Math.sin(a)*3); c.stroke(); }
  for (const st of stones) { const f = st.t/st.dur, x = (st.sx + (st.tx - st.sx)*f)*T, y = (st.sy + (st.ty - st.sy)*f)*T - Math.sin(f*Math.PI)*90;
    c.fillStyle = '#0000002a'; c.beginPath(); c.ellipse((st.sx + (st.tx - st.sx)*f)*T, (st.sy + (st.ty - st.sy)*f)*T, 4, 2, 0, 0, 7); c.fill();
    c.fillStyle = '#7a766c'; c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill(); c.fillStyle = '#a8a49a'; c.beginPath(); c.arc(x - 1.2, y - 1.2, 1.8, 0, 7); c.fill(); }
  // particles
  for (const p of particles) { const a = Math.max(0, p.life/p.l0); if (p.txt) { c.globalAlpha = a; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#000'; c.fillText(p.txt, p.x + 1, p.y + 1); c.fillStyle = '#fff'; c.fillText(p.txt, p.x, p.y); }
    else { c.globalAlpha = a*.8; c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.s*(1.5 - a*.5), 0, 7); c.fill(); } }
  c.globalAlpha = 1;
  // move marker
  if (marker) { c.strokeStyle = `rgba(255,226,138,${marker.t})`; c.lineWidth = 2; c.beginPath(); c.ellipse(marker.x, marker.y, 14*(1.5 - marker.t*.5), 6*(1.5 - marker.t*.5), 0, 0, 7); c.stroke(); }
  // placement ghost
  let ghostWhy = null;
  if (tool && B[tool] && !B[tool].line && ghost) { const d = B[tool], v = canPlace(tool, ghost.x, ghost.y); if (!v.ok) ghostWhy = {why:v.why, x:(ghost.x + d.w/2)*T, y:ghost.y*T};
    if (d.on) for (let y = ghost.y - 8; y < ghost.y + 10; y++) for (let x = ghost.x - 8; x < ghost.x + 10; x++) if (inb(x, y) && ter[idx(x, y)] === d.on && !occ[idx(x, y)]) { c.strokeStyle = '#ffe28a99'; c.lineWidth = 1.5; c.strokeRect(x*T + 3, y*T + 3, T - 6, T - 6); }
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) { c.fillStyle = v.ok ? '#50e05055' : '#ff303066'; c.fillRect((ghost.x + i)*T + 1, (ghost.y + j)*T + 1, T - 2, T - 2); }
    if (d.near) { c.strokeStyle = '#ffffff55'; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.strokeRect((ghost.x - d.nearR)*T, (ghost.y - d.nearR)*T, (d.w + 2*d.nearR)*T, (d.h + 2*d.nearR)*T); c.setLineDash([]); }
    if (d.gate) drawWall(c, ghost.x, ghost.y, 'gate', 1, 1, conn); else drawBuildingSprite(c, tool, ghost.x, ghost.y, .7);
    if (d.shoot) { c.strokeStyle = '#ffffff40'; c.beginPath(); c.arc((ghost.x + d.w/2)*T, (ghost.y + d.h/2)*T, d.shoot.r*T, 0, 7); c.stroke(); } }
  // wall drag preview
  let label = null;
  if (drag) { const p = wallPlan(drag.k, drag.x0, drag.y0, drag.x1, drag.y1); const okc = p.ok ? '#50e050' : '#ff4040';
    for (const t of p.tiles) { c.fillStyle = t.s === 'bad' ? '#ff303077' : t.s === 'skip' ? '#ffffff22' : okc + '66'; c.fillRect(t.x*T + 1, t.y*T + 1, T - 2, T - 2); }
    c.globalAlpha = .75; const set = new Set(p.tiles.filter(t => t.s === 'ok' || t.s === 'up' || t.s === 'skip').map(t => t.x + ',' + t.y));
    const cn = (x, y) => set.has(x + ',' + y) || conn(x, y);
    for (const t of p.tiles) if (t.s === 'ok' || t.s === 'up') drawWall(c, t.x, t.y, drag.k, 1, 1, cn);
    c.globalAlpha = 1; const last = p.tiles[p.tiles.length - 1]; label = {p, x:(last.x + .5)*T, y:last.y*T}; }
  // screen space overlays
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const dlab = $('draglabel');
  if (!label && ghostWhy) { const s = w2s(ghostWhy.x, ghostWhy.y); dlab.textContent = '✕ ' + ghostWhy.why; dlab.className = 'poor'; const dw = dlab.offsetWidth;
    dlab.style.left = Math.max(dw/2 + 6, Math.min(W - dw/2 - 6, s.x)) + 'px'; dlab.style.top = Math.max(viewRect().t + 24, s.y - 30) + 'px'; }
  else if (!label) dlab.classList.add('hidden');
  if (label) { const s = w2s(label.x, label.y), txt = `${label.p.n} × ${costTxt(B[drag.k].cost)} = ${costTxt(label.p.cost)}`; c.font = 'bold 16px -apple-system,system-ui,sans-serif'; const tw = c.measureText(txt).width + 20;
    let lx = Math.max(tw/2 + 6, Math.min(W - tw/2 - 6, s.x)), ly = Math.max(viewRect().t + 30, s.y - 46);
    if (lastFinger) { lx = Math.max(tw/2 + 6, Math.min(W - tw/2 - 6, lastFinger.x)); ly = lastFinger.y - fOff - 52; if (ly < viewRect().t + 20) ly = lastFinger.y + 56; }
    dlab.textContent = label.p.ok ? `${label.p.n} sections · ${costTxt(label.p.cost)}` : `${label.p.n} sections · ${costTxt(label.p.cost)} · need ` + Object.entries(label.p.cost).filter(([r,v]) => v > S.res[r]).map(([r,v]) => Math.ceil(v - S.res[r]) + ICON[r]).join(' ') + ' more';
    dlab.className = label.p.ok ? '' : 'poor'; const dw = dlab.offsetWidth || tw; lx = Math.max(dw/2 + 6, Math.min(W - dw/2 - 6, lastFinger ? lastFinger.x : lx)); dlab.style.left = lx + 'px'; dlab.style.top = ly + 'px';
    if (false) { c.fillStyle = label.p.ok ? '#1f3a18ee' : '#5a1410ee'; c.strokeStyle = label.p.ok ? '#7cd06a' : '#ff6a5a'; c.lineWidth = 2; c.beginPath(); c.roundRect ? c.roundRect(lx - tw/2, ly - 16, tw, 32, 10) : c.rect(lx - tw/2, ly - 16, tw, 32); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, lx, ly + 1); c.textBaseline = 'alphabetic'; } }
  if (gest && (gest.kind === 'place' || gest.kind === 'wall') && lastFinger && fOff) { const fx = lastFinger.x, fy = lastFinger.y, ay = fy - fOff;
    c.strokeStyle = '#ffffffb0'; c.lineWidth = 1.5; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(fx, fy - 14); c.lineTo(fx, ay + 9); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#000a'; c.lineWidth = 4; c.beginPath(); c.arc(fx, ay, 6, 0, 7); c.moveTo(fx - 13, ay); c.lineTo(fx - 8, ay); c.moveTo(fx + 8, ay); c.lineTo(fx + 13, ay); c.moveTo(fx, ay - 13); c.lineTo(fx, ay - 8); c.moveTo(fx, ay + 8); c.lineTo(fx, ay + 13); c.stroke();
    c.strokeStyle = '#ffe28a'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(fx, ay, 1.8, 0, 7); c.fill();
    c.fillStyle = '#ffffff40'; c.beginPath(); c.arc(fx, fy, 12, 0, 7); c.fill(); }
  if (gest && gest.kind === 'box') { const l = Math.min(gest.sx, gest.ex), t = Math.min(gest.sy, gest.ey), w = Math.abs(gest.ex - gest.sx), h = Math.abs(gest.ey - gest.sy);
    c.fillStyle = 'rgba(255,226,138,.16)'; c.strokeStyle = '#ffe28a'; c.lineWidth = 1.5; c.setLineDash([6, 4]); c.fillRect(l, t, w, h); c.strokeRect(l, t, w, h); c.setLineDash([]);
    for (const u of soldiers()) { const s = w2s(u.x*T, u.y*T - (u.el ? 18 : 0)); if (s.x >= l - 6 && s.x <= l + w + 6 && s.y - 8 >= t - 6 && s.y - 8 <= t + h + 6) { c.strokeStyle = '#ffe28a'; c.beginPath(); c.ellipse(s.x, s.y, 9*cam.z, 4*cam.z, 0, 0, 7); c.stroke(); } } }
  else if (gest && gest.kind === 'tap' && gest.t0) { const p = (performance.now() - gest.t0)/HOLD_MS; if (p > .3 && p < 1) { c.strokeStyle = `rgba(255,226,138,${p})`; c.lineWidth = 3; c.beginPath(); c.arc(gest.sx, gest.sy, 26, -Math.PI/2, -Math.PI/2 + p*Math.PI*2); c.stroke(); } }
  // off-screen enemy arrows
  const groups = {}; for (const u of S.u) if (u.tm === 1 && !u.guard) { const g = groups[u.edge] = groups[u.edge] || {x:0, y:0, n:0}; g.x += u.x; g.y += u.y; g.n++; }
  const vr = viewRect();
  for (const g of Object.values(groups)) { const s = w2s(g.x/g.n*T, g.y/g.n*T); if (s.x > 0 && s.x < W && s.y > vr.t && s.y < vr.b) continue;
    const cx = W/2, cy = (vr.t + vr.b)/2, a = Math.atan2(s.y - cy, s.x - cx), rx = W/2 - 26, ry = (vr.b - vr.t)/2 - 26; const k = Math.min(rx/Math.abs(Math.cos(a) || 1e-6), ry/Math.abs(Math.sin(a) || 1e-6));
    const px = cx + Math.cos(a)*k, py = cy + Math.sin(a)*k; c.save(); c.translate(px, py); c.rotate(a); c.fillStyle = '#e0402e'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 0); c.lineTo(-8, -12); c.lineTo(-3, 0); c.lineTo(-8, 12); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText(g.n, px - Math.cos(a)*22, py - Math.sin(a)*22 + 4); }
}
let miniT = 0;
function renderMini() {
  const m = mctx, s = mini.width/N; m.imageSmoothingEnabled = false; if (miniBase) m.drawImage(miniBase, 0, 0, mini.width, mini.height);
  for (const b of S.b) { const d = B[b.k]; m.fillStyle = b.tm ? (b.k === 'keep' ? '#ff5040' : '#b04838') : b.k === 'keep' ? '#ffe28a' : d.line || d.gate ? (b.k === 'palisade' ? '#a07040' : '#d8d4cc') : '#c08850'; m.fillRect(b.x*s, b.y*s, d.w*s, d.h*s); }
  for (const u of S.u) { m.fillStyle = u.tm ? '#ff3020' : '#40a0ff'; m.fillRect(u.x*s - 2, u.y*s - 2, 4, 4); }
  const tl = s2w(0, 0), br = s2w(W, H); m.strokeStyle = '#fff'; m.lineWidth = 2; m.strokeRect(tl.x/T*s, tl.y/T*s, (br.x - tl.x)/T*s, (br.y - tl.y)/T*s);
}

// ---------- loop ----------
let last = performance.now(), acc = 0, saveT = 0; const DT = 1/30;
function frame(now) {
  const dt = Math.min(.1, (now - last)/1000); last = now;
  if (S && running) {
    if (!paused && !S.over) { acc += dt*SPEEDS[speedIdx]; let n = 0; while (acc >= DT && n++ < 12) { step(DT); acc -= DT; } if (n >= 12) acc = 0; }
    if (!gest || pointers.size === 0) fling.step(dt, cam, cam.z, clampCam); else fling.stop();
    // edge auto-scroll while drawing walls / placing
    if (lastFinger && gest && (gest.kind === 'wall' || gest.kind === 'place')) { const vr = viewRect(), m = 44, sp = 420*dt/cam.z; let mx = 0, my = 0;
      if (lastFinger.x < m) mx = -1; else if (lastFinger.x > W - m) mx = 1; if (lastFinger.y - fOff < vr.t + m) my = -1; else if (lastFinger.y > vr.b - m) my = 1;
      if (mx || my) { cam.x += mx*sp; cam.y += my*sp; clampCam(); if (gest.kind === 'wall') { const t = tileAtScreen(lastFinger.x, lastFinger.y - fOff); drag.x1 = t.x; drag.y1 = t.y; } else ghost = ghostTile(lastFinger.x, lastFinger.y - fOff); } }
    for (const p of particles) { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; if (!p.txt) { p.vx *= .95; p.vy *= .95; } }
    particles = particles.filter(p => p.life > 0);
    for (const b of S.b) if (b.hp < B[b.k].hp*.4 && Math.random() < dt*1.5 && !B[b.k].line) puff((b.x + B[b.k].w*Math.random())*T, (b.y + B[b.k].h*.3)*T, '#55504a', 1);
    if (marker) { marker.t -= dt*1.2; if (marker.t <= 0) marker = null; }
    render(now);
    hudT += dt; if (hudT > .25) { hudT = 0; updateHud(); }
    miniT += dt; if (miniT > .3) { miniT = 0; renderMini(); }
    saveT += dt; if (saveT > 10) { saveT = 0; save(); }
  }
  requestAnimationFrame(frame);
}

// ---------- Vs Computer: map + AI lord ----------
const VS_N = 88;
function genVsTerrain(seed) {
  const n = VS_N, half = n/2; setMapSize(n); KX = 9; KY = 42; const AX = n - 1 - (KX + 2), r = rng(seed ^ 0x7a11), kc = {x:KX + 1.5, y:KY + 1.5};
  const blob = (cx, cy, rad, type) => {
    for (let y = Math.floor(cy-rad-3); y <= cy+rad+3; y++) for (let x = Math.floor(cx-rad-3); x <= cx+rad+3; x++) {
      if (!inb(x,y) || x >= half) continue; const d = Math.hypot(x+.5-cx, y+.5-cy), q = vnoise(x*.35, y*.35, seed + type*17);
      if (d < rad*(0.7 + 0.6*q) && ter[idx(x,y)] === 0) ter[idx(x,y)] = type; }
    if (type === 2 || type === 5) { const ox = Math.floor(cx) - 1, oy = Math.floor(cy) - 1; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (inb(ox+i, oy+j) && ox+i < half) ter[idx(ox+i, oy+j)] = type; } };
  const far = (x, y) => Math.hypot(x - kc.x, y - kc.y) > 10;
  blob(kc.x + 10, kc.y - 9, 4.4, 1); blob(kc.x + 5, kc.y + 12, 3.8, 1); blob(kc.x + 9, kc.y + 7, 2.6, 2); blob(kc.x + 15, kc.y - 15, 2.3, 5);
  for (let i = 0, k = 0; i < 11 && k < 200; k++) { const x = 3 + r()*(half - 6), y = 3 + r()*(n - 6); if (!far(x, y)) continue; blob(x, y, 2.5 + r()*3.5, 1); i++; }
  for (let i = 0, k = 0; i < 3 && k < 200; k++) { const x = 4 + r()*(half - 8), y = 4 + r()*(n - 8); if (!far(x, y)) continue; blob(x, y, 2 + r()*1.5, i === 2 ? 5 : 2); i++; }
  for (let i = 0; i < 3; i++) blob(half - 4 - r()*10, 6 + r()*(n - 12), 2.4 + r()*1.6, 3);
  for (let y = 0; y < n; y++) for (let x = 0; x < half; x++) ter[idx(n - 1 - x, y)] = ter[idx(x, y)];   // mirror: both lords get the same land
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = idx(x, y);
    if (Math.hypot(x + .5 - kc.x, y + .5 - kc.y) < 9 || Math.hypot(x + .5 - (AX + 1.5), y + .5 - kc.y) < 9) ter[i] = 0;
    if ((x === 0 || y === 0 || x === n-1 || y === n-1) && ter[i] >= 2) ter[i] = 0; }
  // make sure the two castles can reach each other; otherwise cut a dirt road
  const seen = new Uint8Array(n*n), q = [idx(KX + 1, KY + 1)]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const x = q[h] % n, y = (q[h]/n) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (!seen[j] && passT(j)) { seen[j] = 1; q.push(j); } } }
  if (!seen[idx(AX + 1, KY + 1)]) for (let x = KX; x <= AX + 2; x++) for (let y = KY; y <= KY + 2; y++) if (!passT(idx(x, y))) ter[idx(x, y)] = 6;
  return AX;
}
const AIDIFF = {easy:{inc:.65, first:540, every:260, min:5, cap:14, train:12}, normal:{inc:1, first:420, every:200, min:7, cap:22, train:8}, hard:{inc:1.35, first:330, every:160, min:9, cap:30, train:6}};
const AI_GOALS = [['woodcutter',1],['farm',1],['woodcutter',2],['quarry',1],['hovel',1],['barracks',1],['farm',2],['ring',1],['tower',2],['mine',1],['hovel',2],['farm',3],['gate',1],['tower',4],['woodcutter',3],['hovel',3],['farm',4]];
const AI_UNIT_COST = {raider:{gold:10, food:5}, earcher:{gold:14, wood:6}, brute:{gold:28, iron:3}, ram:{wood:50, gold:30}, catapult:{wood:60, stone:30, gold:40}};
function newVsState(seed, diff = 'normal') {
  S = {v:1, ver:VERSION, seed, mode:'vs', vs:{seed, diff}, t:0, res:{wood:150, stone:80, iron:0, food:80, gold:60, ...START_WEAP}, tw:{}, stumps:{}, pop:6, b:[], u:[], nid:1,
       wave:{n:0, next:1e12, active:false}, kills:0, over:false, tut:99, starveT:0, popT:0, tax:1,
       ai:{res:{wood:150, stone:80, food:80, gold:60, iron:0}, t:0, trainT:0, trained:0, nextAttack:(AIDIFF[diff] || AIDIFF.normal).first, attacks:0, alarm:0, skip:{}}};
  const AX = genVsTerrain(seed);
  addB('keep', KX, KY); addB('stockpile', KX+4, KY+1); addB('granary', KX-3, KY+1);
  for (const [k, x] of [['keep', AX], ['stockpile', AX-3], ['granary', AX+4]]) addB(k, x, KY).tm = 1;
  S.b.find(b => b.tm === 1 && b.k === 'stockpile').y = KY + 1; S.b.find(b => b.tm === 1 && b.k === 'granary').y = KY + 1;
  reocc(); workers.clear(); projectiles = []; particles = []; stones = []; flowDirty = true;
}
function aiRing(ak) { return {x0:ak.x - 7, x1:ak.x + 9, y0:ak.y - 7, y1:ak.y + 9, gx:ak.x - 7, gy:ak.y + 1}; }
const wallOk = i => ter[i] === 0 || ter[i] === 1 || ter[i] === 4 || ter[i] === 6;
function aiFits(k, x, y, R, inside) {
  const d = B[k];
  for (let j = -1; j <= d.h; j++) for (let i = -1; i <= d.w; i++) { const tx = x + i, ty = y + j; if (!inb(tx, ty) || tx < 1 || ty < 1 || tx > N - 2 || ty > N - 2) return false;
    const foot = i >= 0 && j >= 0 && i < d.w && j < d.h, t = idx(tx, ty);
    if (foot) { const tt = ter[t]; if (d.on ? tt !== d.on : !(tt === 0 || tt === 4 || tt === 6)) return false; if (occ[t] || pitAt(tx, ty)) return false;
      const inR = tx > R.x0 && tx < R.x1 && ty > R.y0 && ty < R.y1, nearR = tx >= R.x0 - 1 && tx <= R.x1 + 1 && ty >= R.y0 - 1 && ty <= R.y1 + 1;
      if (inside ? !inR : nearR) return false; if (!inside && tx < N/2 + 1) return false; }
    else if (occ[t] && !(B[byId.get(occ[t])?.k]?.line)) return false; }
  return true;
}
function aiFind(k, ak, R) {
  const d = B[k], cx = ak.x + 1, cy = ak.y + 1, inside = k === 'barracks' || k === 'hovel'; let best = null, bs = 1e9;
  for (let y = cy - 24; y <= cy + 24; y++) for (let x = cx - 24; x <= cx + 24; x++) {
    if (!aiFits(k, x, y, R, inside)) continue; let sc = Math.hypot(x + d.w/2 - cx, y + d.h/2 - cy);
    if (k === 'woodcutter') { let tr = 0; for (let j = y - 5; j < y + d.h + 5; j++) for (let i = x - 5; i < x + d.w + 5; i++) if (inb(i, j) && ter[idx(i, j)] === 1) tr++; if (tr < 8) continue; sc -= tr*.15; }
    if (sc < bs) { bs = sc; best = {x, y}; } }
  return best;
}
function aiAdd(k, x, y, R) { const b = addB(k, x, y); b.tm = 1; if (B[k].line || k === 'gate' || k === 'tower') for (let j = 0; j < B[k].h; j++) for (let i = 0; i < B[k].w; i++) clearTree(x + i, y + j);
  b.rise = 0; reocc(); flowDirty = true; return b; }
const aiPay = (R, c) => { for (const [k, v] of Object.entries(c)) if ((R[k] || 0) < v) return false; for (const [k, v] of Object.entries(c)) R[k] -= v; return true; };
function aiBuild(A, R, cnt, ak) {
  const ring = aiRing(ak);
  for (const [k, want] of AI_GOALS) {
    if (A.skip[k]) continue;
    if (k === 'ring') { const todo = [];
      for (let y = ring.y0; y <= ring.y1; y++) for (let x = ring.x0; x <= ring.x1; x++) { if (x !== ring.x0 && x !== ring.x1 && y !== ring.y0 && y !== ring.y1) continue; if (x === ring.gx && y === ring.gy) continue;
        if (!inb(x, y) || occ[idx(x, y)] || !wallOk(idx(x, y))) continue; todo.push({x, y}); }
      if (!todo.length) continue; todo.sort((a, b) => a.x - b.x || Math.abs(a.y - ring.gy) - Math.abs(b.y - ring.gy));
      let n = 0; for (const t of todo) { if (n >= 6 || R.stone < 2) break; R.stone -= 2; aiAdd('wall', t.x, t.y, ring); n++; } return; }
    if (cnt(k) >= want) continue;
    if (k === 'gate') { const o = bAt(ring.gx, ring.gy); if (o && o.k === 'gate') continue; if (!aiPay(R, {...B.gate.cost})) return; if (o) { S.b = S.b.filter(b => b !== o); reocc(); } if (wallOk(idx(ring.gx, ring.gy))) aiAdd('gate', ring.gx, ring.gy, ring); else A.skip.gate = 1; return; }
    if (k === 'tower') { const spots = [[ring.x0 + 1, ring.y0 + 1], [ring.x0 + 1, ring.y1 - 2], [ring.x1 - 2, ring.y0 + 1], [ring.x1 - 2, ring.y1 - 2]];
      const sp = spots.find(([x, y]) => [0,1].every(j => [0,1].every(i => inb(x+i, y+j) && !occ[idx(x+i, y+j)] && wallOk(idx(x+i, y+j)))));
      if (!sp) { A.skip.tower = 1; continue; } if (!aiPay(R, {...B.tower.cost})) return; aiAdd('tower', sp[0], sp[1], ring); return; }
    const c = B[k].cost; if (Object.entries(c).some(([r, v]) => (R[r] || 0) < v)) return;   // save up for it
    const p = aiFind(k, ak, ring); if (!p) { A.skip[k] = 1; continue; }
    aiPay(R, c); aiAdd(k, p.x, p.y, ring); return;
  }
}
function aiHome(ak, k) { for (let tries = 0; tries < 20; tries++) { const x = ak.x + 1.5 + (k === 'earcher' ? -4 : 0) + (Math.random() - .5)*(k === 'earcher' ? 3 : 10), y = ak.y + 1.5 + (Math.random() - .5)*10;
    const i = idx(Math.floor(x), Math.floor(y)); if (inb(Math.floor(x), Math.floor(y)) && passT(i) && !occ[i]) return {x, y}; } return {x:ak.x + 1.5, y:ak.y + 3.6}; }
function stepAI(dt) {
  const A = S.ai; A.t += dt; if (A.t < 1) return; const t1 = A.t; A.t = 0;
  const ak = aiKeep(); if (!ak) return;
  const D = AIDIFF[S.vs.diff] || AIDIFF.normal, R = A.res, mine = S.b.filter(b => b.tm === 1), cnt = k => mine.reduce((n, b) => n + (b.k === k), 0);
  R.wood += (.3 + .8*cnt('woodcutter'))*D.inc*t1; R.stone += (.2 + .6*cnt('quarry'))*D.inc*t1; R.food += (.25 + .8*cnt('farm'))*D.inc*t1;
  R.gold += (.45 + .15*cnt('hovel'))*D.inc*t1; R.iron += .25*cnt('mine')*D.inc*t1;
  const army = S.u.filter(u => u.tm === 1); R.food = Math.max(0, R.food - army.length*.03*t1);
  A.alarm = S.u.some(u => u.tm === 0 && Math.hypot(u.x - ak.x - 1.5, u.y - ak.y - 1.5) < 16) ? 1 : 0;
  // the lord's masons patch the most damaged structure
  let dmg = null; for (const b of mine) if (b.hp < B[b.k].hp && (!dmg || b.hp/B[b.k].hp < dmg.hp/B[dmg.k].hp)) dmg = b;
  if (dmg && R.stone >= 1) { const add = Math.min(B[dmg.k].hp - dmg.hp, 35*D.inc*t1); dmg.hp += add; R.stone -= add/100; }
  aiBuild(A, R, cnt, ak);
  // train troops at the barracks
  A.trainT += t1; const br = mine.find(b => b.k === 'barracks');
  if (br && A.trainT >= D.train && army.length < D.cap) {
    const pat = ['raider','earcher','raider','brute','earcher','raider'], has = k => army.some(u => u.k === k);
    let k = A.attacks >= 2 && !has('ram') && Math.random() < .5 ? 'ram' : A.attacks >= 3 && !has('catapult') && Math.random() < .5 ? 'catapult' : pat[A.trained % pat.length];
    if (k === 'brute' && !cnt('mine')) k = 'raider';
    if (aiPay(R, AI_UNIT_COST[k])) { A.trainT = 0; A.trained++; const u = addU(k, 1, br.x + 1.5, br.y + 3.4), h = aiHome(ak, k); u.guard = 1; u.hx = h.x; u.hy = h.y; const m = 1 + S.t/1800; u.hp = u.mhp = Math.round(u.hp*m); }
  }
  // attack!
  if (S.t >= A.nextAttack) { const g = army.filter(u => u.guard);
    if (g.length >= D.min) { const size = Math.min(Math.ceil(g.length*.7), (S.vs.diff === 'easy' ? 4 : 6) + A.attacks*(S.vs.diff === 'easy' ? 3 : 4)), go = g.sort((a, b) => (a.k === 'earcher') - (b.k === 'earcher')).slice(0, size); for (const u of go) { u.guard = 0; u.nt = -1; u.edge = 9; }
      A.attacks++; A.nextAttack = S.t + D.every; toast('⚔ The enemy lord attacks with ' + go.length + ' troops!', 'bad', 4000); try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {} }
    else A.nextAttack = S.t + 30; }
}
// ---------- save / load ----------
let memSave = null;
function serialize() { return JSON.stringify({...S, b:S.b.map(({id,k,x,y,hp,out,tm}) => ({id,k,x,y,hp,out,tm})), u:S.u.map(({id,k,tm,x,y,hp,mhp,px,py,edge,guard,hx,hy,raid}) => ({id,k,tm,x,y,hp,mhp,px,py,edge,guard,hx,hy,raid}))}); }
function save() { if (!S || S.over) return; const s = serialize(); memSave = s; try { localStorage.setItem(SAVE_KEY, s); } catch (e) {} }
function loadSaved() { let s = memSave; try { s = localStorage.getItem(SAVE_KEY) || s; } catch (e) {} if (!s) return null; try { const o = JSON.parse(s); return o && o.v === 1 ? o : null; } catch (e) { return null; } }
function clearSave() { memSave = null; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function restore(o) {
  S = o; if (S.custom) loadCustomTerrain(S.custom); else if (S.mode === 'vs') genVsTerrain(S.vs.seed); else genTerrain(S.seed); for (const i of S.cleared || []) ter[i] = 0;
  S.res.iron = S.res.iron || 0; for (const r of WEAP) if (S.res[r] == null) S.res[r] = START_WEAP[r]; S.tw = S.tw || {}; S.stumps = S.stumps || {}; for (const k in S.stumps) ter[+k] = 4;
  for (const b of S.b) { const d = B[b.k]; if (!d || d.on) continue; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) { const q = idx(b.x+i, b.y+j); if (ter[q] === 2 || ter[q] === 5) ter[q] = 0; } } for (const b of S.b) b.cd = 0;
  for (const u of S.u) { u.path = []; u.cd = 0; u.an = 0; u.jx = (Math.random()-.5)*.45; u.jy = (Math.random()-.5)*.45; }
  reocc(); workers.clear(); projectiles = []; particles = [];
}
addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

// ---------- screens ----------
let running = false;
const HOW = `<div class="how"><div>🪓 Build a <b>Woodcutter</b> by the forest, a <b>Quarry</b> on gray rocks, an <b>Iron Mine</b> on rusty red rocks, and <b>Farms</b> for food.</div>
<div>🏠 <b>Hovels</b> bring more peasants. Every building needs an idle worker.</div>
<div>🧱 Pick <b>Stone Wall</b> and <b>drag your finger</b>. It snaps to a straight line and shows the stone cost (red = not enough).</div>
<div>⚒ Soldiers need weapons: a <b>Fletcher</b> makes bows, a <b>Poleturner</b> spears, a <b>Blacksmith</b> swords or maces, an <b>Armorer</b> armor. They deliver to the <b>Armory</b>. Or trade at the <b>Market</b>.</div>
<div>🏹 Recruit <b>Archers</b> and <b>Spearmen</b> at the Barracks. Tap <b>⚔ Army</b>, then tap a wall to station them.</div>
<div>⚔ Enemy waves come from the map edges. Walls block them. If the <b>Keep</b> falls, you lose.</div>
<div>✋ One finger pans, two fingers zoom. <b>Press and hold, then drag</b> to box-select soldiers. ✕ Cancel leaves build mode.</div></div>`;
function overlay(html) { $('ov-card').innerHTML = html; $('overlay').classList.remove('hidden'); }
function closeOverlay() { $('overlay').classList.add('hidden'); }
function showTitle() {
  const sv = loadSaved();
  overlay(`<h1>Hold the Keep</h1><p>Build your castle. Draw your walls. Survive the siege.</p>
    ${sv ? `<button class="btn green" data-o="continue">Continue · ${sv.mode === 'vs' ? 'Vs Computer' : 'Wave ' + (sv.wave.n + (sv.wave.active ? 0 : 1))}</button>` : ''}
    <button class="btn ${sv ? '' : 'green'}" data-o="new">New Game <small>random map, survive the waves</small></button>
    <button class="btn" data-o="vsmenu">⚔ Vs Computer <small>build, defend, destroy the enemy keep</small></button>
    <button class="btn" data-o="custom">Play Custom Map</button><button class="btn" data-o="editor">🛠 Map Editor</button>${HOW}<p style="font-size:11px;opacity:.6">v${VERSION}</p>`);
}
function showMenu() {
  const was = paused; paused = true; setSpeedLabel();
  overlay(`<h2>Paused</h2><button class="btn green" data-o="resume">Resume</button><button class="btn" data-o="save">Save game</button>
    <button class="btn" data-o="how">How to play</button><button class="btn red" data-o="newconfirm">New game</button><button class="btn" data-o="mainmenu">Main menu</button><p style="font-size:12px;opacity:.7">Wave ${S.wave.n} · Score ${score()} · auto-saves every 10 s</p>`);
  $('ov-card').dataset.was = was ? '1' : '';
}
const score = () => S.wave.n*100 - (S.wave.active ? 100 : 0) + S.kills*10;
function victory() { paused = true; setSpeedLabel(); overlay(`<h2>🏆 Victory!</h2><p>You survived all <b>${cfg().win}</b> waves${S.custom ? ' on <b>' + S.custom.name + '</b>' : ''}.</p><p style="font-size:20px">Score: <b>${score()}</b></p>
  <button class="btn green" data-o="keepgoing">Keep playing (endless)</button><button class="btn" data-o="mainmenu">Main menu</button>`); }
function gameOver() {
  S.over = true; clearSave(); const survived = Math.max(0, S.wave.n - 1);
  if (S.mode === 'vs') { setTimeout(() => overlay(`<h2>The Keep has fallen</h2><p>The enemy lord took your castle after ${Math.floor(S.t/60)} minutes. You defeated <b>${S.kills}</b> of his soldiers.</p><button class="btn green" data-o="vs:${S.vs.diff}">Rematch</button><button class="btn" data-o="mainmenu2">Main menu</button>`), 900); return; }
  setTimeout(() => overlay(`<h2>The Keep has fallen</h2><p>You held out through <b>${survived}</b> wave${survived === 1 ? '' : 's'} and defeated <b>${S.kills}</b> enemies.</p><p style="font-size:20px">Score: <b>${score()}</b></p>${S.mode === 'vs' ? `<button class="btn green" data-o="vs:${S.vs.diff}">Rematch</button>` : S.custom ? `<button class="btn green" data-o="replay">Play this map again</button>` : `<button class="btn green" data-o="new">Play again</button>`}<button class="btn" data-o="mainmenu2">Main menu</button>`), 900);
}
$('overlay').addEventListener('click', e => {
  const a = e.target.closest('[data-o]')?.dataset.o; if (!a) return;
  if (a === 'continue') { restore(loadSaved()); start(); }
  else if (a === 'vsmenu') overlay(`<h2>⚔ Vs Computer</h2><p>You start on the west, the enemy lord on the east of a large map. He gathers, builds walls and towers, trains an army and attacks. Destroy his keep to win.</p>
    <button class="btn green" data-o="vs:easy">Easy lord</button><button class="btn" data-o="vs:normal">Normal lord</button><button class="btn red" data-o="vs:hard">Hard lord</button><button class="btn" data-o="back">‹ Back</button>`);
  else if (a.startsWith('vs:')) { clearSave(); newVsState((Math.random()*1e9) | 0, a.slice(3)); start(); }
  else if (a === 'back') showTitle();
  else if (a === 'custom') window.HTKED && HTKED.pickToPlay();
  else if (a === 'editor') window.HTKED && HTKED.openList();
  else if (a === 'mainmenu') { save(); running = false; showTitle(); }
  else if (a === 'mainmenu2') { running = false; showTitle(); }
  else if (a === 'replay') { const m = window.HTKED && HTKED.get(S.custom.id); if (m) startCustom(m); else showTitle(); }
  else if (a === 'keepgoing') { paused = false; setSpeedLabel(); closeOverlay(); }
  else if (a === 'new') { clearSave(); newState((Math.random()*1e9) | 0); start(); }
  else if (a === 'resume') { paused = !!$('ov-card').dataset.was; setSpeedLabel(); closeOverlay(); }
  else if (a === 'save') { save(); toast('Game saved'); paused = !!$('ov-card').dataset.was; setSpeedLabel(); closeOverlay(); }
  else if (a === 'how') overlay(`<h2>How to play</h2>${HOW}<button class="btn green" data-o="resume">Back to game</button>`);
  else if (a === 'newconfirm') overlay(`<h2>Start over?</h2><p>Your current castle will be lost.</p><button class="btn red" data-o="new">Yes, new game</button><button class="btn" data-o="resume">Cancel</button>`);
});
function start() {
  closeOverlay(); buildTerrain(); fling.stop(); cam.x = (KX + 1.5)*T; cam.y = (KY + 3)*T; cam.z = Math.min(1.2, Math.max(minZ(), 1.1)); clampCam();
  tool = null; sel = []; selB = null; drag = null; ghost = null; paused = false; speedIdx = 0; setSpeedLabel();
  let tutDone = false; try { tutDone = localStorage.getItem(TUT_KEY) === '1'; } catch (e) {} if ((tutDone || S.mode === 'vs') && S.t < 1) S.tut = TUT.length;
  running = true; renderItems(); updateHint(); renderSheet(); updateHud(); tutCheck(); save();
}

function vsWin() { if (S.won) return; S.won = true; S.over = true; clearSave();
  setTimeout(() => overlay(`<h2>🏆 Victory!</h2><p>The enemy keep has fallen. You defeated <b>${S.kills}</b> enemy soldiers in ${Math.floor(S.t/60)} minutes.</p><button class="btn green" data-o="vs:${S.vs.diff}">Play again</button><button class="btn" data-o="mainmenu2">Main menu</button>`), 900); }
function startCustom(m) { clearSave(); newStateFromMap(m); start(); }
function stopGame() { running = false; }
$('r-arms').addEventListener('click', () => { if (S) toast('Armory: ' + WEAP.map(r => ICON[r] + ' ' + (S.res[r] || 0)).join('  '), '', 3500); });
// ---------- boot ----------
addEventListener('resize', resize); resize();
const fitFabs = () => { const h = innerHeight - $('bottom').getBoundingClientRect().top; const land = matchMedia('(orientation:landscape) and (max-height:520px)').matches;
  for (const id of ['btn-army','btn-undo']) $(id).style.bottom = land ? '' : (h + 10) + 'px'; };
if (window.ResizeObserver) new ResizeObserver(fitFabs).observe($('bottom')); addEventListener('resize', fitFabs);
document.addEventListener('gesturestart', e => e.preventDefault());
loadAssets().then(() => { showTitle(); requestAnimationFrame(frame); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const had = !!navigator.serviceWorker.controller; let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had || reloading) return; reloading = true; save(); location.reload(); });
  navigator.serviceWorker.register('sw.js').then(r => { r.update(); document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update(); }); }).catch(() => {});
}

// test hooks
window.HTK = {get S() { return S; }, makeFling, fling, B, UNIT, step, place, canPlace, commitWall, wallPlan, recruit, orderMove, spawnWave, sendWave, computeFlow, cam, s2w, w2s, newState, start, save, loadSaved, restore,
  get flow() { return flow; }, get ter() { return ter; }, get occ() { return occ; }, idx, get N() { return N; }, T, get KX() { return KX; }, get KY() { return KY; }, setTool, idle, cap, soldiers, demolish, bAt, VERSION, get tool() { return tool; }, get sel() { return sel; }, HOLD_MS, get drag() { return drag; }, workers, treesLeft, get falls() { return falls; }, get stones() { return stones; }, waveComp, waveText, addU, byId, bestStep, astarPeasant: (a, b, c, d) => astar(a, b, c, d, walkPeasant, N*N), get flowDirty() { return flowDirty; }, startCustom, stopGame, newVsState, genVsTerrain, stepAI, aiKeep, orderRaid, get flowP() { return flowP; }, TAX, pitAt, FOFF, get fOff() { return fOff; }, get ghost() { return ghost; }, trade, TRADE, WEAP, renderSheet, get selB() { return selB; }, set selB(v) { selB = v; }, newStateFromMap, rleEncode, rleDecode, genTerrain, showTitle, IMG, get running() { return running; }};
})();
