// Simulate a Vs Computer game; check nobody walks over walls; report the enemy lord's building counts over time.
(args) => { const H = HTK; const secs = args.secs || 1200, every = args.every || 120;
  if (args.fresh) { H.newVsState(args.seed || 777, args.diff || 'normal'); H.start(); H.S.tut = 99; }
  const S = H.S, N = H.N, B = H.B; let viol = [], gateUse = new Set(), prev = new Map(), report = [], ms = 0, n = 0, firstAttack = 0;
  const blocks = (team, i, who) => { const o = H.occ[i]; if (!o) return false; const b = H.byId.get(o); if (!b) return false; if (b.bridge) return false;
    if (b.k === 'gate') return (b.tm | 0) !== team; if (who && who.post && b.k === 'tower') return false; if (team === 0 && who && who.isSoldier && B[b.k].walk && !b.tm) return false; return true; };
  const check = (key0, team, x, y, who) => { const key = key0.split('[')[0], t = Math.floor(x) + N*Math.floor(y), p = prev.get(key); prev.set(key, t);
    const o = H.occ[t], b = o && H.byId.get(o); if (b && b.k === 'gate' && (b.tm | 0) === team) gateUse.add(key);
    if (p == null || p === t) return; const px = p % N, py = (p / N) | 0, tx = t % N, ty = (t / N) | 0;
    if (Math.abs(px - tx) > 1 || Math.abs(py - ty) > 1) return;   // teleports (tower climb/drop) are checked by the tile rule
    if (blocks(team, t, who) && !blocks(team, p, who)) viol.push(key0 + ' stepped onto ' + (b && b.k) + ' at ' + tx + ',' + ty + ' from ' + px + ',' + py);
    if (!(who && who.post) && px !== tx && py !== ty && blocks(team, px + N*ty, who) && blocks(team, tx + N*py, who)) viol.push(key + ' squeezed diagonally at ' + tx + ',' + ty); };
  const counts = () => { const ab = S.b.filter(b => b.tm === 1), c = {}; for (const b of ab) c[b.k] = (c[b.k] || 0) + 1; return c; };
  for (let sec = 1; sec <= secs && !S.over; sec++) {
    for (let i = 0; i < 30; i++) { const a = performance.now(); H.step(1/30); ms += performance.now() - a; n++;
      for (const u of S.u) check('u' + u.id + (args.dbg ? '[' + [u.k, u.guard, u.role, u.post, u.nt, u.gp && u.gp.length, S.t.toFixed(1)].join('/') + ']' : ''), u.tm, u.x, u.y, {post: u.post, isSoldier: u.tm === 0});
      for (const [id, w] of H.workers) { const b = H.byId.get(id); if (b) check('w' + id, b.tm | 0, w.x, w.y, null); } }
    if (args.immortal) for (const b of S.b) if (!b.tm) b.hp = B[b.k].hp;
    if (!firstAttack && S.u.some(u => u.tm === 1 && !u.guard)) firstAttack = sec;
    if (sec % every === 0) { const c = counts(); report.push({t: sec, ...c, army: S.u.filter(u => u.tm === 1).length, posted: S.u.filter(u => u.post).length, patrol: S.u.filter(u => u.role === 'patrol').length, workers: S.ai.workers, attacks: S.ai.attacks, res: Object.fromEntries(Object.entries(S.ai.res).map(([k, v]) => [k, Math.round(v)]))}); } }
  return {viol: viol.slice(0, 12), nviol: viol.length, gateUsers: gateUse.size, report, firstAttack, stepMs: +(ms/n).toFixed(3), over: S.over, won: S.won, lvl: S.ai.lvl | 0}; }
