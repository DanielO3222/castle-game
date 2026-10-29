// Hold the Keep: map editor (phone-friendly subset of the Stronghold map editor)
(() => {
'use strict';
const G = window.HTK, T = 32, MAPS_KEY = 'htk-maps-v1', $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const PASS = new Set([0, 4, 6, 7]), BUILD = new Set([0, 4, 6]);
const MAT = {grass:0, trees:1, stone:2, water:3, iron:5, dirt:6, marsh:7};
const COL = ['#5d8a3a','#2f5a22','#8f8f80','#3a6a94','#5d8a3a','#a5532d','#8a6a44','#4d6e50'];
const TOOLS = [['pan','✋','Pan'],['grass','🌱','Grass'],['trees','🌲','Trees'],['scatter','🌳','Scatter'],['stone','🪨','Stone'],['iron','🔩','Iron'],
  ['water','💧','Water'],['dirt','🟫','Dirt'],['marsh','🌾','Marsh'],['erase','🧽','Eraser'],['fill','🪣','Fill'],['keep','🏰','Keep'],['spawn','🚩','Spawn']];
const SIZES = [48, 64, 96];
const defSettings = () => ({res:{wood:150, stone:80, iron:0, food:80, gold:60, bow:4, spear:4, mace:0, sword:0, armor:0}, pop:6, diff:'normal', first:240, between:90, win:0, siege:true});
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => 'm' + Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36);

// ---------- storage ----------
let mem = null;
function loadMaps() { let s = mem; try { const v = localStorage.getItem(MAPS_KEY); if (v != null) s = v; } catch (e) {} try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function storeMaps(a) { const s = JSON.stringify(a); mem = s; try { localStorage.setItem(MAPS_KEY, s); } catch (e) { toast('Could not save: storage is full', 'bad'); } }
function getMap(id) { return loadMaps().find(m => m.id === id) || null; }
function putMap(m) { const a = loadMaps(), i = a.findIndex(x => x.id === m.id); m.updated = Date.now(); if (i >= 0) a[i] = m; else a.unshift(m); storeMaps(a); return m; }
function delMap(id) { storeMaps(loadMaps().filter(m => m.id !== id)); }
function dupMap(id) { const m = getMap(id); if (!m) return null; const c = JSON.parse(JSON.stringify(m)); c.id = uid(); c.name = m.name + ' (copy)'; return putMap(c); }
function renameMap(id, name) { const m = getMap(id); if (!m) return; m.name = name.trim().slice(0, 40) || m.name; putMap(m); return m; }
function uniqueName(base) { const names = new Set(loadMaps().map(m => m.name)); if (!names.has(base)) return base; for (let i = 2; ; i++) if (!names.has(base + ' ' + i)) return base + ' ' + i; }

// ---------- share code / file ----------
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); };
function exportObj(m) { return {format:'hold-the-keep-map', v:1, name:m.name, size:m.size, ter:m.ter, keep:m.keep, spawns:m.spawns, settings:m.settings}; }
function exportCode(m) { return 'HTK1.' + b64e(JSON.stringify(exportObj(m))); }
function parseImport(text) {
  text = String(text || '').trim(); let o;
  try { o = text.startsWith('HTK1.') ? JSON.parse(b64d(text.slice(5).replace(/\s+/g, ''))) : JSON.parse(text); } catch (e) { throw new Error('That is not a valid map code or file'); }
  const n = o && +o.size;
  if (!n || n < 24 || n > 128 || typeof o.ter !== 'string') throw new Error('The map data is incomplete');
  const ter = G.rleDecode(o.ter, n); let sum = 0; for (const run of o.ter.split(',')) if (run) sum += parseInt(run.slice(1), 36); if (sum !== n*n) throw new Error('The map data is damaged');
  for (let i = 0; i < ter.length; i++) if (ter[i] > 7) ter[i] = 0;
  const inb = p => p && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < n && p.y < n;
  const keep = inb(o.keep) && o.keep.x <= n - 3 && o.keep.y <= n - 3 ? {x:o.keep.x, y:o.keep.y} : null;
  const spawns = (Array.isArray(o.spawns) ? o.spawns : []).filter(inb).slice(0, 8).map(p => ({x:p.x, y:p.y}));
  const st = defSettings(), si = o.settings || {};
  for (const k in st.res) if (Number.isFinite(+si.res?.[k])) st.res[k] = Math.max(0, Math.min(9999, Math.round(+si.res[k])));
  if (Number.isFinite(+si.pop)) st.pop = Math.max(1, Math.min(60, Math.round(+si.pop)));
  if (['easy','normal','hard'].includes(si.diff)) st.diff = si.diff;
  for (const k of ['first','between','win']) if (Number.isFinite(+si[k])) st[k] = Math.max(0, Math.min(3600, Math.round(+si[k])));
  st.first = Math.max(30, st.first); st.between = Math.max(20, st.between); if (si.siege === false) st.siege = false;
  return {id:uid(), name:String(o.name || 'Imported map').slice(0, 40), size:n, ter:G.rleEncode(ter), keep, spawns, settings:st};
}
function importText(text) { const m = parseImport(text); m.name = uniqueName(m.name); return putMap(m); }
function downloadJSON(m) {
  const blob = new Blob([JSON.stringify(exportObj(m), null, 1)], {type:'application/json'}), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = (m.name.replace(/[^\w\- ]+/g, '').trim() || 'map') + '.htkmap.json'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------- validation ----------
function validate(m) {
  const n = m.size, ter = m.ter instanceof Uint8Array ? m.ter : G.rleDecode(m.ter, n), errors = [], warnings = [], bad = [];
  const id = (x, y) => y*n + x, inb = (x, y) => x >= 0 && y >= 0 && x < n && y < n;
  if (!m.keep) errors.push('Place your keep (🏰 Keep tool)');
  if (!m.spawns || !m.spawns.length) errors.push('Add at least one enemy spawn point (🚩 Spawn tool)');
  if (m.keep) {
    const k = m.keep; if (k.x < 1 || k.y < 1 || k.x > n - 4 || k.y > n - 4) errors.push('The keep is too close to the map edge');
    const seen = new Uint8Array(n*n), q = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (inb(k.x+i, k.y+j)) { seen[id(k.x+i, k.y+j)] = 1; q.push(id(k.x+i, k.y+j)); }
    const ok = (x, y) => inb(x, y) && PASS.has(ter[id(x, y)]) || (inb(x, y) && x >= k.x && y >= k.y && x < k.x + 3 && y < k.y + 3);
    for (let h = 0; h < q.length; h++) { const x = q[h] % n, y = (q[h] / n) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
        if (!ok(nx, ny) || seen[id(nx, ny)]) continue; if (dx && dy && !(ok(x + dx, y) && ok(x, y + dy))) continue; seen[id(nx, ny)] = 1; q.push(id(nx, ny)); } }
    (m.spawns || []).forEach((s, i) => { let r = false; for (let y = s.y - 2; y <= s.y + 2 && !r; y++) for (let x = s.x - 2; x <= s.x + 2; x++) if (inb(x, y) && seen[id(x, y)] && PASS.has(ter[id(x, y)])) { r = true; break; } if (!r) bad.push(i); });
    if (m.spawns && m.spawns.length && bad.length === m.spawns.length) errors.push('Enemies cannot reach your keep from any spawn point. Open a path through the trees, rocks or water');
    else if (bad.length) warnings.push(bad.length + ' spawn point' + (bad.length > 1 ? 's are' : ' is') + ' cut off and will not be used');
    let room = 0; for (let y = k.y - 7; y <= k.y + 9; y++) for (let x = k.x - 7; x <= k.x + 9; x++) if (inb(x, y) && BUILD.has(ter[id(x, y)])) room++;
    if (room < 90) warnings.push('Very little open ground near the keep to build on');
    let trees = 0, stone = 0; for (let i = 0; i < n*n; i++) { if (ter[i] === 1) trees++; else if (ter[i] === 2) stone++; }
    if (trees < 12) warnings.push('Few trees: wood will run out fast'); if (stone < 4) warnings.push('No stone deposits for quarries');
  }
  return {ok:!errors.length, errors, warnings, bad};
}

// ---------- editor state ----------
let E = null, open = false, saveTimer = 0;
function blankTer(n) { return new Uint8Array(n*n); }
function randomTer(n) {
  const seed = (Math.random()*1e9) | 0; G.genTerrain(seed, n); const ter = G.ter.slice(), kx = G.KX, ky = G.KY;
  const spawns = [[Math.floor(n/2), 1], [n - 2, Math.floor(n/2)], [Math.floor(n/2), n - 2], [1, Math.floor(n/2)]].map(([x, y]) => ({x, y}));
  return {ter, keep:{x:kx, y:ky}, spawns};
}
function newMap(size = 64, random = false, name) {
  const n = SIZES.includes(+size) ? +size : 64, r = random ? randomTer(n) : {ter:blankTer(n), keep:{x:Math.floor(n/2) - 1, y:Math.floor(n/2) - 1}, spawns:[{x:Math.floor(n/2), y:1}]};
  return putMap({id:uid(), name:uniqueName(name || (random ? 'Wild lands' : 'New map')), size:n, ter:G.rleEncode(r.ter), keep:r.keep, spawns:r.spawns, settings:defSettings()});
}
function edit(id) {
  const m = getMap(id); if (!m) return false;
  E = {m, n:m.size, ter:G.rleDecode(m.ter, m.size), keep:m.keep ? {...m.keep} : null, spawns:(m.spawns || []).map(p => ({...p})), tool:'trees', mat:'trees', bsize:3, mirror:0, grid:true,
       undo:[], redo:[], cam:{x:m.size*T/2, y:m.size*T/2, z:1}, val:null, saved:true, hover:null};
  E.cam.z = fitZ(); buildBase(); revalidate(); showEditorUI(); return true;
}
const snap = () => ({ter:E.ter.slice(), keep:E.keep ? {...E.keep} : null, spawns:E.spawns.map(p => ({...p}))});
function pushUndo() { E.undo.push(snap()); if (E.undo.length > 50) E.undo.shift(); E.redo = []; }
function applySnap(s) { E.ter = s.ter; E.keep = s.keep; E.spawns = s.spawns; changed(); }
function undo() { if (!E || !E.undo.length) return false; E.redo.push(snap()); applySnap(E.undo.pop()); return true; }
function redo() { if (!E || !E.redo.length) return false; E.undo.push(snap()); applySnap(E.redo.pop()); return true; }
function changed() { buildBase(); E.saved = false; clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveNow(); }, 700); revalidate(); updateUI(); }
function saveNow() { if (!E) return; clearTimeout(saveTimer); E.m.ter = G.rleEncode(E.ter); E.m.keep = E.keep; E.m.spawns = E.spawns; putMap(E.m); E.saved = true; updateUI(); return E.m; }
function revalidate() { E.val = validate({size:E.n, ter:E.ter, keep:E.keep, spawns:E.spawns}); }

// ---------- painting ----------
const inK = (x, y) => E.keep && x >= E.keep.x && y >= E.keep.y && x < E.keep.x + 3 && y < E.keep.y + 3;
function mirrors(x, y) { const n = E.n, p = [[x, y]]; if (E.mirror === 1 || E.mirror === 3) p.push([n-1-x, y]); if (E.mirror === 2 || E.mirror === 3) p.push([x, n-1-y]); if (E.mirror === 3) p.push([n-1-x, n-1-y]); return p; }
function setT(x, y, v) { if (x < 0 || y < 0 || x >= E.n || y >= E.n) return; if (v !== 0 && inK(x, y)) return; E.ter[y*E.n + x] = v; }
function dab(cx, cy, tool) {
  const r = (E.bsize - 1)/2;
  for (const [mx, my] of mirrors(cx, cy)) {
    if (tool === 'scatter') { const R = E.bsize + 1; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx*dx + dy*dy > R*R + .5) continue; const x = mx + dx, y = my + dy;
        if (x < 0 || y < 0 || x >= E.n || y >= E.n) continue; const t = E.ter[y*E.n + x]; if ((t === 0 || t === 6) && Math.random() < .22) setT(x, y, 1); } continue; }
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) { if (dx*dx + dy*dy > r*r + r*.9 + .01) continue;
      const x = mx + dx, y = my + dy;
      if (tool === 'erase') { setT(x, y, 0); E.spawns = E.spawns.filter(s => s.x !== x || s.y !== y); }
      else setT(x, y, MAT[tool]); }
  }
}
function line(x0, y0, x1, y1, f) { const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx - dy;
  for (;;) { f(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2*e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } } }
function fill(x, y) {
  const v = MAT[E.mat] ?? 1;
  for (const [sx, sy] of mirrors(x, y)) { if (sx < 0 || sy < 0 || sx >= E.n || sy >= E.n) continue; const n = E.n, from = E.ter[sy*n + sx]; if (from === v) continue;
    const st = [sy*n + sx]; const seen = new Uint8Array(n*n); seen[st[0]] = 1;
    while (st.length) { const i = st.pop(), px = i % n, py = (i / n) | 0; setT(px, py, v);
      for (const [nx, ny] of [[px+1,py],[px-1,py],[px,py+1],[px,py-1]]) { if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue; const j = ny*n + nx; if (!seen[j] && E.ter[j] === from) { seen[j] = 1; st.push(j); } } } }
}
function placeKeep(x, y) { const kx = Math.max(2, Math.min(E.n - 5, x - 1)), ky = Math.max(2, Math.min(E.n - 5, y - 1));
  E.keep = {x:kx, y:ky}; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) E.ter[(ky+j)*E.n + kx + i] = 0; }
function toggleSpawn(x, y) {
  const near = E.spawns.findIndex(s => Math.hypot(s.x - x, s.y - y) < 2.2);
  if (near >= 0) { const s = E.spawns[near]; const ms = mirrors(s.x, s.y).map(([a, b]) => a + ',' + b); E.spawns = E.spawns.filter(p => !ms.includes(p.x + ',' + p.y)); return 'removed'; }
  for (const [mx, my] of mirrors(x, y)) { if (E.spawns.length >= 8) { toast('Up to 8 spawn points', 'bad'); break; } if (inK(mx, my) || E.spawns.some(s => s.x === mx && s.y === my)) continue;
    if (!PASS.has(E.ter[my*E.n + mx])) E.ter[my*E.n + mx] = 0; E.spawns.push({x:mx, y:my}); }
  return 'added';
}
// tap-style tools
function tapAt(x, y) {
  if (x < 0 || y < 0 || x >= E.n || y >= E.n) return;
  pushUndo();
  if (E.tool === 'fill') fill(x, y); else if (E.tool === 'keep') placeKeep(x, y); else if (E.tool === 'spawn') toggleSpawn(x, y); else dab(x, y, E.tool);
  changed();
}

// ---------- rendering ----------
let base = null, raf = 0;
function buildBase() { const n = E.n; base = base && base.width === n ? base : Object.assign(document.createElement('canvas'), {width:n, height:n}); const g = base.getContext('2d'), im = g.createImageData(n, n);
  for (let i = 0; i < n*n; i++) { const c = COL[E.ter[i]], x = i % n, y = (i / n) | 0, v = ((x*7 + y*13) % 5 - 2)*3; im.data[i*4] = parseInt(c.slice(1, 3), 16) + v; im.data[i*4+1] = parseInt(c.slice(3, 5), 16) + v; im.data[i*4+2] = parseInt(c.slice(5, 7), 16) + v; im.data[i*4+3] = 255; }
  g.putImageData(im, 0, 0); }
function viewBox() { const t = $('ed-top').getBoundingClientRect(), b = $('ed-bottom').getBoundingClientRect(); const land = innerWidth > innerHeight && innerHeight < 520;
  return land ? {l:0, r:b.left, t:t.bottom, b:innerHeight} : {l:0, r:innerWidth, t:t.bottom, b:b.top}; }
function fitZ() { const v = viewBox(); return Math.max(.12, Math.min((v.r - v.l)/(E.n*T), (v.b - v.t)/(E.n*T)) * .96); }
function clampZ() { E.cam.z = Math.max(fitZ()*.8, Math.min(3, E.cam.z)); const m = E.n*T; E.cam.x = Math.max(0, Math.min(m, E.cam.x)); E.cam.y = Math.max(0, Math.min(m, E.cam.y)); }
function center() { const v = viewBox(); return {x:(v.l + v.r)/2, y:(v.t + v.b)/2}; }
function s2t(sx, sy) { const c = center(); return {x:Math.floor(((sx - c.x)/E.cam.z + E.cam.x)/T), y:Math.floor(((sy - c.y)/E.cam.z + E.cam.y)/T)}; }
const hash = (x, y) => { let h = x*374761393 + y*668265263; h = (h ^ (h >>> 13))*1274126177; return ((h ^ (h >>> 16)) >>> 0)/4294967296; };
function draw() {
  if (!open || !E) return; raf = requestAnimationFrame(draw);
  { const now = performance.now(), dt = Math.min(.1, flingT ? (now - flingT)/1000 : 0); flingT = now; if (ptrs.size === 0) fling.step(dt, E.cam, E.cam.z, clampZ); else fling.stop(); }
  const DPR = cv.width / innerWidth, z = E.cam.z, c = center(), n = E.n, IMG = G.IMG;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1d150e'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR*z, 0, 0, DPR*z, DPR*(c.x - E.cam.x*z), DPR*(c.y - E.cam.y*z));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(base, 0, 0, n*T, n*T); ctx.imageSmoothingEnabled = true;
  const x0 = Math.max(0, Math.floor(E.cam.x/T - c.x/z/T) - 1), x1 = Math.min(n - 1, Math.ceil(E.cam.x/T + (innerWidth - c.x)/z/T) + 1);
  const y0 = Math.max(0, Math.floor(E.cam.y/T - c.y/z/T) - 1), y1 = Math.min(n - 1, Math.ceil(E.cam.y/T + (innerHeight - c.y)/z/T) + 2);
  if (z*T >= 11) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const t = E.ter[y*n + x], h = hash(x, y);
    if (t === 1 && IMG.trees) { const w = T*(1.15 + h*.3), hh = w*IMG.trees.height/IMG.trees.width; ctx.drawImage(IMG.trees, x*T + T/2 - w/2 + (h - .5)*6, (y + 1)*T - hh + 3, w, hh); }
    else if ((t === 2 || t === 5) && IMG.rock) { const im = t === 5 ? IMG.iron : IMG.rock, w = T*1.3, hh = w*IMG.rock.height/IMG.rock.width; ctx.drawImage(im, x*T + T/2 - w/2, (y + 1)*T - hh + 3, w, hh); }
    else if (t === 7) { ctx.strokeStyle = '#2f5530'; ctx.lineWidth = 1.4; for (let k = 0; k < 3; k++) { const px = x*T + 6 + hash(x + k, y)*20, py = y*T + 12 + hash(x, y + k)*16; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 1, py - 8); ctx.stroke(); } }
    else if (t === 3) { ctx.strokeStyle = '#8fb8d855'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x*T + 6 + h*10, y*T + 12 + h*8); ctx.lineTo(x*T + 16 + h*10, y*T + 12 + h*8); ctx.stroke(); } }
  if (E.grid && z*T >= 7) { ctx.lineWidth = 1/z; for (let i = 0; i <= n; i++) { ctx.strokeStyle = i % 8 ? '#00000022' : '#00000055'; ctx.beginPath(); ctx.moveTo(i*T, 0); ctx.lineTo(i*T, n*T); ctx.moveTo(0, i*T); ctx.lineTo(n*T, i*T); ctx.stroke(); } }
  ctx.strokeStyle = '#e7b84a'; ctx.lineWidth = 2/z; ctx.strokeRect(0, 0, n*T, n*T);
  if (E.mirror) { ctx.setLineDash([8/z, 6/z]); ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2/z; ctx.beginPath(); if (E.mirror & 1) { ctx.moveTo(n*T/2, 0); ctx.lineTo(n*T/2, n*T); } if (E.mirror & 2) { ctx.moveTo(0, n*T/2); ctx.lineTo(n*T, n*T/2); } ctx.stroke(); ctx.setLineDash([]); }
  if (E.keep) { const k = E.keep, im = IMG.keep; ctx.fillStyle = '#e7b84a33'; ctx.fillRect(k.x*T, k.y*T, 3*T, 3*T); ctx.strokeStyle = '#e7b84a'; ctx.lineWidth = 2/z; ctx.strokeRect(k.x*T, k.y*T, 3*T, 3*T);
    if (im) { const w = (G.B.keep.sw || 3.4)*T, h = w*im.height/im.width; ctx.drawImage(im, (k.x + 1.5)*T - w/2, (k.y + 3)*T - h, w, h); } else { ctx.font = `${T*2}px serif`; ctx.textAlign = 'center'; ctx.fillText('🏰', (k.x + 1.5)*T, (k.y + 2.6)*T); } }
  const bad = new Set(E.val ? E.val.bad : []);
  E.spawns.forEach((s, i) => { const cx = (s.x + .5)*T, cy = (s.y + .5)*T, b = bad.has(i);
    ctx.fillStyle = b ? '#ff9a3a33' : '#d0302833'; ctx.beginPath(); ctx.arc(cx, cy, 2.5*T, 0, 7); ctx.fill(); ctx.strokeStyle = b ? '#ffae4a' : '#ff5a4a'; ctx.lineWidth = 2/z; if (b) ctx.setLineDash([6/z, 4/z]); ctx.stroke(); ctx.setLineDash([]);
    const sc = Math.max(1, .8/z); ctx.fillStyle = '#3a2a18'; ctx.fillRect(cx - 1*sc, cy - 22*sc, 2.5*sc, 24*sc); ctx.fillStyle = b ? '#ffae4a' : '#d03028'; ctx.beginPath(); ctx.moveTo(cx + 1.5*sc, cy - 22*sc); ctx.lineTo(cx + 16*sc, cy - 17*sc); ctx.lineTo(cx + 1.5*sc, cy - 12*sc); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${11*sc}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(b ? '!' : String(i + 1), cx + 7*sc, cy - 14*sc); });
  if (E.hover && !['pan','keep','spawn','fill'].includes(E.tool)) { const R = E.tool === 'scatter' ? E.bsize + 1 : (E.bsize - 1)/2 + .5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2/z;
    for (const [mx, my] of mirrors(E.hover.x, E.hover.y)) { ctx.beginPath(); ctx.arc((mx + .5)*T, (my + .5)*T, R*T, 0, 7); ctx.stroke(); } }
}

// ---------- input ----------
const ptrs = new Map(); let gest = null; const fling = G.makeFling(); let flingT = 0;
function onDown(e) { if (!open) return; e.preventDefault(); fling.stop(); cv.setPointerCapture?.(e.pointerId); ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (ptrs.size === 2) { if (gest && gest.kind === 'paint' && performance.now() - gest.t0 < 300 && gest.undoAt === E.undo.length) { applySnap(E.undo.pop()); }
    const [a, b] = [...ptrs.values()]; gest = {kind:'pinch', d:Math.hypot(a.x - b.x, a.y - b.y), mx:(a.x + b.x)/2, my:(a.y + b.y)/2, z:E.cam.z}; E.hover = null; return; }
  if (ptrs.size > 2) return;
  const t = s2t(e.clientX, e.clientY);
  if (E.tool === 'pan' || ['keep','spawn','fill'].includes(E.tool)) { gest = {kind:'tap', sx:e.clientX, sy:e.clientY, lx:e.clientX, ly:e.clientY, moved:false}; fling.start(); fling.track(e.clientX, e.clientY); return; }
  const off = e.pointerType === 'mouse' ? 0 : 64, tp = s2t(e.clientX, e.clientY - off);   // paint above the finger so the brush stays visible
  pushUndo(); gest = {kind:'paint', t0:performance.now(), lt:tp, undoAt:E.undo.length, last:tp, off}; E.hover = tp; dab(tp.x, tp.y, E.tool); buildBase(); }
function onMove(e) { if (!open || !ptrs.has(e.pointerId)) return; e.preventDefault(); ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); if (!gest) return;
  if (gest.kind === 'pinch' && ptrs.size >= 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
    E.cam.x -= (mx - gest.mx)/E.cam.z; E.cam.y -= (my - gest.my)/E.cam.z; gest.mx = mx; gest.my = my; E.cam.z = gest.z*d/Math.max(10, gest.d); clampZ(); return; }
  if (gest.kind === 'tap') { if (Math.hypot(e.clientX - gest.sx, e.clientY - gest.sy) > 9) gest.moved = true; if (gest.moved) { E.cam.x -= (e.clientX - gest.lx)/E.cam.z; E.cam.y -= (e.clientY - gest.ly)/E.cam.z; clampZ(); } fling.track(e.clientX, e.clientY); gest.lx = e.clientX; gest.ly = e.clientY; return; }
  if (gest.kind === 'paint') { const t = s2t(e.clientX, e.clientY - gest.off); if (t.x === gest.lt.x && t.y === gest.lt.y) return;
    if (E.tool === 'scatter') { if (Math.hypot(t.x - gest.last.x, t.y - gest.last.y) >= Math.max(2, E.bsize)) { dab(t.x, t.y, 'scatter'); gest.last = t; } }
    else line(gest.lt.x, gest.lt.y, t.x, t.y, (x, y) => dab(x, y, E.tool));
    gest.lt = t; E.hover = t; buildBase(); } }
function onUp(e) { if (!open || !ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (gest && gest.kind === 'tap' && !gest.moved && E.tool !== 'pan' && ptrs.size === 0) { const t = s2t(e.clientX, e.clientY); tapAt(t.x, t.y); }
  if (gest && gest.kind === 'tap' && gest.moved && ptrs.size === 0) fling.release();
  if (gest && gest.kind === 'paint') changed();
  if (ptrs.size === 0) { gest = null; E.hover = null; } else if (gest && gest.kind === 'pinch' && ptrs.size === 1) gest = null; }
cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
cv.addEventListener('wheel', e => { if (!open) return; e.preventDefault(); fling.stop(); E.cam.z *= e.deltaY < 0 ? 1.12 : 1/1.12; clampZ(); }, {passive:false});

// ---------- UI ----------
function toast(msg, cls = '') { const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = msg; $('toasts').appendChild(d); setTimeout(() => d.remove(), 2600); }
const ui = document.createElement('div'); ui.id = 'ed'; ui.className = 'hidden';
ui.innerHTML = `<div id="ed-top"><div class="ed-row"><button class="sm" data-e="maps">‹ Maps</button><button id="ed-name" data-e="rename"></button>
  <button class="sm" data-e="undo" id="ed-undo">↶</button><button class="sm" data-e="redo" id="ed-redo">↷</button><button class="sm" data-e="settings">⚙</button><button class="sm green" data-e="play">▶ Play</button></div>
  <div id="ed-status"></div></div>
  <div id="ed-bottom"><div id="ed-tools">${TOOLS.map(([k, i, l]) => `<button data-tool="${k}"><i>${i}</i><span>${l}</span></button>`).join('')}</div>
  <div class="ed-row" id="ed-opts"><span class="ed-lbl">Brush</span>${[1,3,5].map(s => `<button class="sm" data-bs="${s}">${s}</button>`).join('')}
  <button class="sm" data-e="mirror" id="ed-mirror">Mirror: off</button><button class="sm" data-e="grid" id="ed-grid">#</button><button class="sm" data-e="random">🎲</button></div></div>`;
document.body.appendChild(ui);
const MIRRORS = ['off', '↔', '↕', '✚'];
function updateUI() {
  if (!E) return; $('ed-name').textContent = '✎ ' + E.m.name; $('ed-undo').disabled = !E.undo.length; $('ed-redo').disabled = !E.redo.length;
  ui.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === E.tool));
  ui.querySelectorAll('[data-bs]').forEach(b => b.classList.toggle('on', +b.dataset.bs === E.bsize));
  $('ed-mirror').textContent = 'Mirror ' + MIRRORS[E.mirror]; $('ed-mirror').classList.toggle('on', !!E.mirror); $('ed-grid').classList.toggle('on', E.grid);
  const v = E.val, tip = {pan:'Drag to look around', fill:`Tap to fill an area with ${E.mat}`, keep:'Tap to place your keep', spawn:'Tap to add or remove an enemy spawn', scatter:'Drag to sprinkle trees', erase:'Drag to erase to grass'}[E.tool] || `Drag to paint ${E.tool}`;
  $('ed-status').innerHTML = `<span class="${v.ok ? 'ok' : 'bad'}">${v.ok ? '✓ Ready to play' : '⚠ ' + esc(v.errors[0])}</span>${v.ok && v.warnings.length ? ` <span class="warn">· ${esc(v.warnings[0])}</span>` : ''}<span class="ed-meta">${E.n}×${E.n} · ${E.spawns.length} spawn${E.spawns.length === 1 ? '' : 's'} · ${E.saved ? 'saved' : 'saving…'} · ${tip}</span>`;
}
ui.addEventListener('click', e => {
  const tb = e.target.closest('[data-tool]'); if (tb) { E.tool = tb.dataset.tool; if (MAT[E.tool] !== undefined) E.mat = E.tool; updateUI(); return; }
  const bs = e.target.closest('[data-bs]'); if (bs) { E.bsize = +bs.dataset.bs; updateUI(); return; }
  const a = e.target.closest('[data-e]')?.dataset.e; if (!a) return;
  if (a === 'undo') undo(); else if (a === 'redo') redo();
  else if (a === 'mirror') { E.mirror = (E.mirror + 1) % 4; updateUI(); }
  else if (a === 'grid') { E.grid = !E.grid; updateUI(); }
  else if (a === 'random') card(`<h2>Generate random land?</h2><p>This replaces the whole map. You can undo it.</p><button class="btn green" data-x="dorandom">Generate</button><button class="btn" data-x="close">Cancel</button>`);
  else if (a === 'maps') { saveNow(); closeEditor(); openList(); }
  else if (a === 'rename') renameCard(E.m.id, true);
  else if (a === 'settings') settingsCard();
  else if (a === 'play') playCurrent();
});
function showEditorUI() { open = true; G.stopGame(); document.body.classList.add('editing'); ui.classList.remove('hidden'); $('overlay').classList.add('hidden'); updateUI(); requestAnimationFrame(() => { E.cam.z = fitZ(); clampZ(); });
  cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
function closeEditor() { if (E) saveNow(); open = false; cancelAnimationFrame(raf); document.body.classList.remove('editing'); ui.classList.add('hidden'); ptrs.clear(); gest = null; }
function playCurrent() { const m = saveNow(); const v = validate(m);
  if (!v.ok) { card(`<h2>Not ready yet</h2><ul class="ed-list">${v.errors.map(x => `<li>⚠ ${esc(x)}</li>`).join('')}</ul><button class="btn green" data-x="close">Back to editing</button>`); return false; }
  closeEditor(); closeCard(); G.startCustom(m); return true; }
function play(id) { const m = getMap(id); if (!m) return false; const v = validate(m);
  if (!v.ok) { card(`<h2>${esc(m.name)} can't be played yet</h2><ul class="ed-list">${v.errors.map(x => `<li>⚠ ${esc(x)}</li>`).join('')}</ul><button class="btn green" data-x="edit:${m.id}">Fix it in the editor</button><button class="btn" data-x="list">Back</button>`); return false; }
  closeEditor(); closeCard(); G.startCustom(m); return true; }

// overlay cards (share the game's #overlay)
let cardBack = null;
function card(html, back) { cardBack = back || null; $('ov-card').innerHTML = html; $('ov-card').classList.add('ed-card'); $('overlay').classList.remove('hidden'); }
function closeCard() { $('overlay').classList.add('hidden'); $('ov-card').classList.remove('ed-card'); }
const when = t => { const d = new Date(t || 0); return d.toLocaleDateString(undefined, {month:'short', day:'numeric'}) + ' ' + d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); };
function openList() {
  const maps = loadMaps();
  card(`<h2>🛠 Map Editor</h2><div class="ed-btns"><button class="btn green" data-x="new">+ New map</button><button class="btn" data-x="import">⇩ Import</button></div>
  ${maps.length ? `<div class="ed-maps">${maps.map(m => { const v = validate(m); return `<div class="ed-map" data-id="${m.id}"><div class="ed-mh"><b>${esc(m.name)}</b><span>${m.size}×${m.size} · ${when(m.updated)} · ${v.ok ? '<i class="ok">✓ playable</i>' : '<i class="bad">⚠ unfinished</i>'}</span></div>
    <div class="ed-ma"><button class="sm green" data-x="edit:${m.id}">Edit</button><button class="sm" data-x="play:${m.id}">▶ Play</button><button class="sm" data-x="ren:${m.id}">✎ Rename</button><button class="sm" data-x="dup:${m.id}">⧉ Copy</button><button class="sm" data-x="share:${m.id}">⇪ Share</button><button class="sm red" data-x="del:${m.id}">🗑 Delete</button></div></div>`; }).join('')}</div>`
  : '<p>No maps yet. Make one, or import a map code a friend shared.</p>'}<button class="btn" data-x="title">‹ Back</button>`);
}
function pickToPlay() {
  const maps = loadMaps().filter(m => validate(m).ok);
  card(`<h2>Play Custom Map</h2>${maps.length ? `<div class="ed-maps">${maps.map(m => `<div class="ed-map"><div class="ed-mh"><b>${esc(m.name)}</b><span>${m.size}×${m.size} · ${m.settings?.diff || 'normal'}${m.settings?.win ? ' · win at wave ' + m.settings.win : ' · endless'}</span></div><div class="ed-ma"><button class="sm green" data-x="play:${m.id}">▶ Play</button></div></div>`).join('')}</div>`
    : '<p>You have no playable custom maps yet.</p>'}<button class="btn" data-x="list">🛠 Map Editor</button><button class="btn" data-x="import">⇩ Import a map</button><button class="btn" data-x="title">‹ Back</button>`);
}
function newCard() { card(`<h2>New map</h2><label class="ed-f">Name<input id="ed-nn" maxlength="40" value="${esc(uniqueName('New map'))}"></label>
  <div class="ed-f">Size<div class="ed-seg">${SIZES.map(s => `<button class="sm${s === 64 ? ' on' : ''}" data-size="${s}">${s}×${s}${s === 48 ? ' small' : s === 64 ? ' normal' : ' large'}</button>`).join('')}</div></div>
  <button class="btn green" data-x="create:0">Blank grassland</button><button class="btn" data-x="create:1">🎲 Random land</button><button class="btn" data-x="list">Cancel</button>`); }
function renameCard(id, inEditor) { const m = getMap(id); card(`<h2>Rename map</h2><input id="ed-rn" class="ed-in" maxlength="40" value="${esc(m.name)}"><button class="btn green" data-x="dorename:${id}">Save name</button><button class="btn" data-x="${inEditor ? 'close' : 'list'}">Cancel</button>`); setTimeout(() => $('ed-rn')?.select(), 50); }
function shareCard(id) { const m = getMap(id), code = exportCode(m);
  card(`<h2>Share “${esc(m.name)}”</h2><p>Send this code to a friend. They tap Import and paste it.</p><textarea id="ed-code" class="ed-in" readonly rows="5">${code}</textarea>
  <button class="btn green" data-x="copy">Copy code</button><button class="btn" data-x="dl:${id}">Download .json file</button><button class="btn" data-x="list">Back</button>`); }
function importCard() { card(`<h2>Import a map</h2><p>Paste a map code (starts with HTK1.) or open a .json map file.</p><textarea id="ed-imp" class="ed-in" rows="5" placeholder="HTK1.…"></textarea>
  <button class="btn green" data-x="doimport">Import code</button><label class="btn ed-file">Open .json file<input type="file" id="ed-file" accept=".json,application/json,text/plain"></label><button class="btn" data-x="list">Cancel</button>`);
  $('ed-file').addEventListener('change', async ev => { const f = ev.target.files[0]; if (!f) return; try { const m = importText(await f.text()); toast('Imported “' + m.name + '”'); openList(); } catch (err) { toast(err.message, 'bad'); } }); }
function settingsCard() { const s = E.m.settings = {...defSettings(), ...E.m.settings}; s.res = {...defSettings().res, ...s.res};
  const num = (id, v, lbl) => `<label class="ed-n">${lbl}<input type="number" inputmode="numeric" id="ed-s-${id}" value="${v}" min="0" max="9999"></label>`;
  const sel = (id, v, opts) => `<select id="ed-s-${id}">${opts.map(([val, l]) => `<option value="${val}"${String(val) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  card(`<h2>Map settings</h2><div class="ed-sec">Starting goods</div><div class="ed-grid">${num('wood', s.res.wood, '🪵 Wood')}${num('stone', s.res.stone, '🪨 Stone')}${num('iron', s.res.iron, '🔩 Iron')}${num('food', s.res.food, '🍎 Food')}${num('gold', s.res.gold, '🪙 Gold')}${num('pop', s.pop, '👥 Peasants')}${num('bow', s.res.bow, '🏹 Bows')}${num('spear', s.res.spear, '🔱 Spears')}${num('mace', s.res.mace, '🔨 Maces')}${num('sword', s.res.sword, '🗡 Swords')}${num('armor', s.res.armor, '🛡 Armor')}</div>
  <div class="ed-sec">Invasions</div><div class="ed-grid2"><label>Difficulty${sel('diff', s.diff, [['easy','Easy'],['normal','Normal'],['hard','Hard']])}</label>
  <label>First wave${sel('first', s.first, [[120,'2:00'],[180,'3:00'],[240,'4:00'],[300,'5:00'],[420,'7:00'],[600,'10:00']])}</label>
  <label>Between waves${sel('between', s.between, [[45,'0:45'],[60,'1:00'],[90,'1:30'],[120,'2:00'],[180,'3:00']])}</label>
  <label>Win after${sel('win', s.win, [[0,'Endless'],[5,'5 waves'],[8,'8 waves'],[10,'10 waves'],[15,'15 waves'],[20,'20 waves']])}</label></div>
  <label class="ed-chk"><input type="checkbox" id="ed-s-siege"${s.siege ? ' checked' : ''}> Siege engines (rams, siege towers, catapults)</label>
  <button class="btn green" data-x="savesettings">Save settings</button><button class="btn" data-x="close">Cancel</button>`); }
function readSettings() { const g = id => $('ed-s-' + id), n = (id, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+g(id).value || 0)));
  E.m.settings = {res:{wood:n('wood', 0, 9999), stone:n('stone', 0, 9999), iron:n('iron', 0, 9999), food:n('food', 0, 9999), gold:n('gold', 0, 9999), bow:n('bow', 0, 999), spear:n('spear', 0, 999), mace:n('mace', 0, 999), sword:n('sword', 0, 999), armor:n('armor', 0, 999)}, pop:n('pop', 1, 60), diff:g('diff').value,
    first:+g('first').value, between:+g('between').value, win:+g('win').value, siege:g('siege').checked}; saveNow(); }

$('overlay').addEventListener('click', e => {
  const sz = e.target.closest('[data-size]'); if (sz) { sz.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === sz)); return; }
  const x = e.target.closest('[data-x]')?.dataset.x; if (!x) return; const [a, id] = x.split(':');
  if (a === 'close') { closeCard(); if (E && open) updateUI(); }
  else if (a === 'title') { closeCard(); G.showTitle(); }
  else if (a === 'list') openList();
  else if (a === 'new') newCard();
  else if (a === 'create') { const size = +(document.querySelector('#ov-card [data-size].on')?.dataset.size || 64), name = $('ed-nn').value.trim(); const m = newMap(size, id === '1', name || undefined); closeCard(); edit(m.id); }
  else if (a === 'edit') { closeCard(); edit(id); }
  else if (a === 'play') play(id);
  else if (a === 'ren') renameCard(id, false);
  else if (a === 'dorename') { const m = renameMap(id, $('ed-rn').value); if (E && open && E.m.id === id) { E.m.name = m.name; closeCard(); updateUI(); } else openList(); }
  else if (a === 'dup') { const m = dupMap(id); toast('Copied as “' + m.name + '”'); openList(); }
  else if (a === 'share') shareCard(id);
  else if (a === 'copy') { const t = $('ed-code'); t.select(); (navigator.clipboard?.writeText(t.value) || Promise.reject()).then(() => toast('Map code copied'), () => { try { document.execCommand('copy'); toast('Map code copied'); } catch (err) { toast('Select the code and copy it', 'bad'); } }); }
  else if (a === 'dl') downloadJSON(getMap(id));
  else if (a === 'del') { const m = getMap(id); card(`<h2>Delete “${esc(m.name)}”?</h2><p>This can't be undone.</p><button class="btn red" data-x="dodel:${id}">Delete map</button><button class="btn" data-x="list">Cancel</button>`); }
  else if (a === 'dodel') { delMap(id); toast('Map deleted'); openList(); }
  else if (a === 'import') importCard();
  else if (a === 'doimport') { try { const m = importText($('ed-imp').value); toast('Imported “' + m.name + '”'); openList(); } catch (err) { toast(err.message, 'bad'); } }
  else if (a === 'savesettings') { readSettings(); closeCard(); toast('Settings saved'); updateUI(); }
  else if (a === 'dorandom') { pushUndo(); const r = randomTer(E.n); E.ter = r.ter; E.keep = r.keep; E.spawns = r.spawns; closeCard(); changed(); }
});
addEventListener('resize', () => { if (open && E) clampZ(); });

window.HTKED = {openList, pickToPlay, get: getMap, list: loadMaps, newMap, edit, close: closeEditor, save: saveNow, undo, redo, validate, exportCode, parseImport, importText, play, playCurrent, delMap, dupMap, renameMap, tapAt,
  get E() { return E; }, get open() { return open; }, setTool: t => { E.tool = t; if (MAT[t] !== undefined) E.mat = t; updateUI(); }, setBrush: s => { E.bsize = s; updateUI(); }, setMirror: m => { E.mirror = m; updateUI(); },
  paint: (tool, x, y, size) => { const ot = E.tool, os = E.bsize; E.tool = tool; if (size) E.bsize = size; if (MAT[tool] !== undefined) E.mat = tool; tapAt(x, y); E.tool = ot; E.bsize = os; updateUI(); },
  s2t, MAPS_KEY};
})();
