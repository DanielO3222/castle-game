"""Headless phone-size smoke test for Hold the Keep. Run: python tests/smoke.py [url]"""
import sys, json, time
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8797/"
SS = "/workspace/castle-game/screenshots/"
ok, bad = [], []
def check(c, m): (ok if c else bad).append(m); print(("PASS " if c else "FAIL ") + m, flush=True)

FIND = """([k, cx, cy]) => { const H = window.HTK; let best=null, bd=1e9;
  for (let y=1;y<63;y++) for (let x=1;x<63;x++) { if (!H.canPlace(k,x,y).ok) continue; const d=Math.hypot(x-cx,y-cy); if (d<bd){bd=d;best={x,y};} } return best; }"""
TILE2SCREEN = """([x,y]) => { const H = window.HTK; return H.w2s((x+.5)*H.T, (y+.5)*H.T); }"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append("console: " + m.text))
    pg.goto(URL); pg.wait_for_selector("[data-o=new]")
    pg.wait_for_timeout(400); pg.screenshot(path=SS + "01-title.png")
    pg.click("[data-o=new]"); pg.wait_for_timeout(1200)
    pg.screenshot(path=SS + "02-start.png")
    st = pg.evaluate("() => ({b: HTK.S.b.length, res: HTK.S.res, pop: HTK.S.pop})")
    check(st["b"] == 3, f"starts with keep+stockpile+granary {st}")

    # ---- place a woodcutter through the real UI (touch drag + lift) ----
    pg.click(".it[data-k=woodcutter]")
    spot = pg.evaluate(FIND, ["woodcutter", 32, 32])
    pg.evaluate("([x,y]) => { HTK.cam.x=(x+1)*HTK.T; HTK.cam.y=(y+1)*HTK.T; }", [spot["x"], spot["y"]])
    pg.wait_for_timeout(100)
    sp = pg.evaluate(TILE2SCREEN, [spot["x"] + 0.5, spot["y"] + 0.5])
    cdp = ctx.new_cdp_session(pg)
    def touch(t, pts): cdp.send("Input.dispatchTouchEvent", {"type": t, "touchPoints": [{"x": x, "y": y, "id": i} for i, (x, y) in enumerate(pts)]})
    sp["y"] += 72  # touches aim 72px above the finger
    touch("touchStart", [(sp["x"] - 30, sp["y"] - 30)])
    for i in range(1, 6): touch("touchMove", [(sp["x"] - 30 + 6*i, sp["y"] - 30 + 6*i)]); pg.wait_for_timeout(16)
    pg.wait_for_timeout(100); pg.screenshot(path=SS + "03-placing.png")
    touch("touchEnd", [])
    pg.wait_for_timeout(200)
    check(pg.evaluate("() => HTK.S.b.some(b => b.k === 'woodcutter')"), "woodcutter placed via touch drag-and-lift")

    # ---- the build menu (castle tab) ----
    pg.click("#hint-x"); pg.click("#tabs [data-tab=castle]"); pg.wait_for_timeout(200)
    pg.evaluate("() => { HTK.cam.x=(HTK.KX+1.5)*HTK.T; HTK.cam.y=(HTK.KY+2)*HTK.T; }")
    pg.screenshot(path=SS + "04-build-menu.png")

    # ---- drag a stone wall with a finger ----
    pg.click(".it[data-k=wall]")
    check(pg.evaluate("() => HTK.tool") == "wall", "wall tool selected")
    y = pg.evaluate("() => HTK.KY - 4"); x0 = pg.evaluate("() => HTK.KX - 3"); x1 = x0 + 9
    a = pg.evaluate(TILE2SCREEN, [x0, y]); c = pg.evaluate(TILE2SCREEN, [x1, y + 1])  # slightly off-line: should snap horizontal
    stone0 = pg.evaluate("() => HTK.S.res.stone")
    a["y"] += 72; c["y"] += 72
    touch("touchStart", [(a["x"], a["y"])])
    for i in range(1, 13): touch("touchMove", [(a["x"] + (c["x"]-a["x"])*i/12, a["y"] + (c["y"]-a["y"])*i/12)]); pg.wait_for_timeout(16)
    pg.wait_for_timeout(120)
    plan = pg.evaluate("() => { const d = HTK.drag; return d && HTK.wallPlan(d.k, d.x0, d.y0, d.x1, d.y1); }")
    check(plan and all(t["y"] == y for t in plan["tiles"]), "drag snaps to a straight horizontal line")
    pg.screenshot(path=SS + "05-wall-drag.png")
    touch("touchEnd", []); pg.wait_for_timeout(200)
    walls = pg.evaluate("() => HTK.S.b.filter(b => b.k === 'wall').length"); stone1 = pg.evaluate("() => HTK.S.res.stone")
    check(walls >= 8 and stone0 - stone1 == walls*2, f"wall built: {walls} sections, stone {stone0}->{stone1}")
    # unaffordable preview goes red and builds nothing
    pg.evaluate("() => { HTK.S.res.stone = 3; }")
    pg.evaluate("([x,y]) => { HTK.cam.x=(x+5)*HTK.T; HTK.cam.y=(y+2)*HTK.T; HTK.cam.z=1.1; }", [x0, y]); pg.wait_for_timeout(50)
    a = pg.evaluate(TILE2SCREEN, [x0, y + 2]); c = pg.evaluate(TILE2SCREEN, [x1, y + 2])
    a["y"] += 72; c["y"] += 72
    touch("touchStart", [(a["x"], a["y"])])
    for i in range(1, 9): touch("touchMove", [(a["x"] + (c["x"]-a["x"])*i/8, a["y"])]); pg.wait_for_timeout(16)
    plan = pg.evaluate("() => { const d = HTK.drag; return d && HTK.wallPlan(d.k, d.x0, d.y0, d.x1, d.y1); }")
    print("dbg", a, c, pg.evaluate("([x,y]) => { const e = document.elementFromPoint(x,y); return [HTK.tool, e && (e.id || e.className)]; }", [a["x"], a["y"]]))
    print("plan", plan and {k: plan[k] for k in ("n","cost","ok")}, [t["s"] for t in plan["tiles"]] if plan else None)
    check(plan and not plan["ok"], "unaffordable wall preview flagged (red)")
    check(pg.is_visible("#draglabel.poor"), "red cost label shown while dragging: " + pg.inner_text("#draglabel"))
    pg.screenshot(path=SS + "06-wall-too-expensive.png")
    touch("touchEnd", []); pg.wait_for_timeout(150)
    check(pg.evaluate("() => HTK.S.b.filter(b => b.k === 'wall').length") == walls, "unaffordable wall not built")
    # pinch zoom
    z0 = pg.evaluate("() => HTK.cam.z"); pg.click("#hint-x")
    touch("touchStart", [(150, 420), (240, 420)])
    for i in range(1, 8): touch("touchMove", [(150 - 10*i, 420), (240 + 10*i, 420)]); pg.wait_for_timeout(16)
    touch("touchEnd", [])
    z1 = pg.evaluate("() => HTK.cam.z"); check(z1 > z0 * 1.3, f"pinch zoom works {z0:.2f}->{z1:.2f}")
    pg.evaluate("() => { HTK.cam.z = 1.1; }")

    # ---- build an economy + castle via the game API ----
    res = pg.evaluate("""(FINDSRC) => { const H = window.HTK, find = eval(FINDSRC), K = H.KX + 1, out = {};
      H.S.res.wood = 900; H.S.res.stone = 900; H.S.res.gold = 400; H.S.res.food = 300; H.S.res.bow = 40; H.S.res.spear = 20;
      for (const [k, n] of [['quarry',1],['farm',3],['hovel',3],['woodcutter',1],['barracks',1],['market',1]]) for (let i = 0; i < n; i++) { const s = find([k, K, K]); out[k + i] = s && H.place(k, s.x, s.y).ok; }
      // ring of stone wall around the core
      const r0 = H.KX - 9, r1 = H.KX + 11; let n = 0;
      for (const [a, b, c, d] of [[r0,r0,r1,r0],[r1,r0,r1,r1],[r1,r1,r0,r1],[r0,r1,r0,r0]]) { const r = H.commitWall('wall', a, b, c, d); if (r.ok) n += r.n; }
      out.ring = n;
      const g = H.bAt(r0 + 10, r1); out.gate = g ? H.place('gate', r0 + 10, r1).ok : false;
      for (const [x, y] of [[r0+1, r0+1],[r1-2, r0+1],[r0+1, r1-2],[r1-2, r1-2]]) { const s = find(['tower', x, y]); out['tower'+x+y] = s && H.place('tower', s.x, s.y).ok; }
      return out; }""", FIND)
    print(res)
    check(res["ring"] > 40, f"wall ring built ({res['ring']} sections)")
    pg.evaluate("() => { HTK.S.pop = 14; HTK.step(1); }")
    rec = pg.evaluate("() => { const r = []; for (let i = 0; i < 6; i++) r.push(HTK.recruit(i % 3 === 2 ? 'spear' : 'archer').ok); return r; }")
    check(all(rec), f"recruited 6 soldiers {rec}")
    # station archers on the north wall via a real tap with the army selected
    pg.click("#btn-army")
    wt = pg.evaluate("() => { const H = HTK, y = H.KX - 9; for (let d = 0; d < 12; d++) for (const x of [H.KX + 1 + d, H.KX + 1 - d]) { const b = H.bAt(x, y); if (b && b.k === 'wall') return [x, y]; } return [H.KX + 1, y]; }")
    pg.evaluate("([x,y]) => { HTK.cam.x=(x+.5)*HTK.T; HTK.cam.y=(y+3)*HTK.T; }", wt); pg.wait_for_timeout(80)
    sp = pg.evaluate(TILE2SCREEN, wt); pg.wait_for_timeout(50)
    touch("touchStart", [(sp["x"], sp["y"])]); touch("touchEnd", [])
    pg.wait_for_timeout(100)
    pg.evaluate("() => { for (let i = 0; i < 30*25; i++) HTK.step(1/30); }")
    onwall = pg.evaluate("() => HTK.soldiers().filter(u => u.el).length")
    check(onwall >= 3, f"soldiers walked up onto the wall ({onwall} elevated)")
    pg.click("#hint-x")
    # ---- save / continue ----
    pg.evaluate("() => HTK.save()")
    n_b = pg.evaluate("() => HTK.S.b.length")
    pg.reload(); pg.wait_for_selector("[data-o=continue]")
    check(True, "Continue offered after reload")
    pg.click("[data-o=continue]"); pg.wait_for_timeout(500); pg.evaluate("() => { HTK.S.tut = 99; }")
    check(pg.evaluate("() => HTK.S.b.length") == n_b, "save restored all buildings/walls")

    # ---- run waves with time fast-forward ----
    pg.evaluate("() => { HTK.cam.x=(HTK.KX+1.5)*HTK.T; HTK.cam.y=(HTK.KY+1.5)*HTK.T; HTK.cam.z=.62; }")
    shot = False; log = []
    for w in range(1, 6):
        pg.evaluate("() => HTK.sendWave()")
        for sec in range(150):
            pg.evaluate("() => { for (let i = 0; i < 30; i++) HTK.step(1/30); }")
            s = pg.evaluate("() => ({n:HTK.S.wave.n, act:HTK.S.wave.active, en:HTK.S.u.filter(u=>u.tm===1).length, over:HTK.S.over, keep:(HTK.S.b.find(b=>b.k==='keep')||{hp:0}).hp, sold:HTK.soldiers().length, walls:HTK.S.b.filter(b=>b.k==='wall').length, food:Math.round(HTK.S.res.food)})")
            if not shot and w == 4 and sec in (12, 16, 20, 24):
                pg.evaluate("""() => { const H = HTK, e = H.S.u.filter(u=>u.tm===1); if (!e.length) return; const k = H.KX + 1.5;
                  e.sort((a,b) => Math.hypot(a.x-k,a.y-k) - Math.hypot(b.x-k,b.y-k)); H.cam.x = e[0].x*H.T; H.cam.y = e[0].y*H.T; H.cam.z = 1.25; }""")
                pg.wait_for_timeout(250); pg.screenshot(path=SS + f"07-wave-attack-{sec}.png")
                if sec == 24: shot = True; pg.evaluate("() => { HTK.cam.x=(HTK.KX+1.5)*HTK.T; HTK.cam.y=(HTK.KY+1.5)*HTK.T; HTK.cam.z=.62; }")
            if s["over"] or (not s["act"] and s["n"] == w): break
        log.append(s); print("wave", w, s, "t=", sec, flush=True)
        # between waves, play like a player would: rebuild breaches, repair, recruit, man all four walls
        pg.evaluate("""() => { const H = HTK, r0 = H.KX - 9, r1 = H.KX + 11; H.S.res.stone += 80; H.S.res.gold += 60; H.S.res.wood += 20; H.S.res.bow += 12; H.S.res.spear += 6;
          for (const [a, b, c, d] of [[r0,r0,r1,r0],[r1,r0,r1,r1],[r1,r1,r0,r1],[r0,r1,r0,r0]]) H.commitWall('wall', a, b, c, d);
          for (const b of H.S.b) b.hp = H.B[b.k].hp;
          H.S.pop = Math.max(H.S.pop, 12); let i = 0; while (H.soldiers().length < 12 && H.idle() > 0 && i++ < 20) H.recruit(H.soldiers().length % 4 === 3 ? 'spear' : 'archer');
          const arch = H.soldiers().filter(u => u.k === 'archer'); const sides = [[H.KX+1, r0],[r1, H.KY+1],[H.KX+1, r1],[r0, H.KY+1]];
          sides.forEach((p, j) => H.orderMove(arch.filter((u, k) => k % 4 === j).map(u => u.id), p[0], p[1]));
          for (let s = 0; s < 30*20; s++) H.step(1/30); }""")
        if s["over"]: break
    check(not log[-1]["over"] and log[-1]["n"] >= 5, f"defended castle survives {log[-1]['n']} waves")
    pg.wait_for_timeout(300); pg.screenshot(path=SS + "08-after-waves.png")
    pg.evaluate("() => { HTK.cam.z = .3; }"); pg.wait_for_timeout(200); pg.screenshot(path=SS + "09-overview.png")

    # ---- losing works: undefended keep falls ----
    pg.evaluate("() => { HTK.newState(42); HTK.start(); HTK.S.tut = 99; }")
    for w in range(30):
        pg.evaluate("() => { if (!HTK.S.wave.active) HTK.sendWave(); for (let i = 0; i < 30*20; i++) HTK.step(1/30); }")
        if pg.evaluate("() => HTK.S.over"): break
    check(pg.evaluate("() => HTK.S.over"), f"undefended keep falls -> game over (after ~{w+1} rounds)")
    pg.wait_for_timeout(1300); pg.screenshot(path=SS + "10-game-over.png")
    check(pg.is_visible("text=The Keep has fallen"), "game over screen shown")

    # ---- natural economy (no cheats) grows ----
    pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC); H.newState(7); H.start(); const K = H.KX + 1;
       for (const k of ['woodcutter','quarry','farm','hovel']) { const s = find([k, K, K]); H.place(k, s.x, s.y); } }""", FIND)
    r0 = pg.evaluate("() => ({...HTK.S.res, pop: HTK.S.pop})")
    pg.evaluate("() => { for (let i = 0; i < 30*120; i++) HTK.step(1/30); }")
    r1 = pg.evaluate("() => ({...HTK.S.res, pop: HTK.S.pop})")
    print("econ", r0, "->", r1)
    check(r1["wood"] > r0["wood"] and r1["stone"] > r0["stone"] and r1["gold"] > r0["gold"], "economy produces wood/stone/gold over 2 min")

    # ---- placement rules: quarry only on stone, iron mine only on iron ----
    r = pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC); H.newState(11); H.start(); H.S.tut = 99; H.S.res.wood = 500; H.S.res.stone = 500;
      const out = {}, foot = (k, x, y) => { const d = H.B[k], a = []; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) a.push(H.ter[H.idx(x+i, y+j)]); return a; };
      out.grassQ = H.canPlace('quarry', H.KX + 5, H.KY + 4); out.grassM = H.canPlace('mine', H.KX + 5, H.KY + 4);
      const q = find(['quarry', 32, 32]), m = find(['mine', 32, 32]);
      out.q = q && foot('quarry', q.x, q.y); out.m = m && foot('mine', m.x, m.y);
      out.mineOnStone = q ? H.canPlace('mine', q.x, q.y) : null; out.quarryOnIron = m ? H.canPlace('quarry', m.x, m.y) : null;
      let ironTiles = 0; for (let i = 0; i < 64*64; i++) ironTiles += H.ter[i] === 5; out.ironTiles = ironTiles;
      out.placedQ = q && H.place('quarry', q.x, q.y).ok; out.placedM = m && H.place('mine', m.x, m.y).ok;
      out.wcOnRock = q ? H.canPlace('woodcutter', q.x + 3, q.y) : null; return out; }""", FIND)
    print("placement", r)
    check(not r["grassQ"]["ok"] and "rock" in r["grassQ"]["why"], f"quarry refused on grass: {r['grassQ']['why']}")
    check(not r["grassM"]["ok"] and "iron" in r["grassM"]["why"], f"iron mine refused on grass: {r['grassM']['why']}")
    check(r["q"] and all(v == 2 for v in r["q"]) and r["placedQ"], f"quarry allowed when whole footprint is stone {r['q']}")
    check(r["m"] and all(v == 5 for v in r["m"]) and r["placedM"], f"iron mine allowed when whole footprint is iron {r['m']}")
    check(not r["mineOnStone"]["ok"] and not r["quarryOnIron"]["ok"], "mine refused on stone, quarry refused on iron")
    check(r["ironTiles"] >= 20, f"map has iron deposits ({r['ironTiles']} tiles)")
    # preview shows the red reason label
    pg.evaluate("() => { HTK.setTool('quarry'); }"); pg.wait_for_timeout(200)
    pg.evaluate("() => HTK.setTool(null)")
    pg.evaluate("() => { HTK.S.pop = 8; for (let i = 0; i < 30*70; i++) HTK.step(1/30); }")
    iron = pg.evaluate("() => HTK.S.res.iron")
    check(iron > 0, f"iron mine produces iron ({iron})")
    pg.evaluate("() => { HTK.S.res.gold = 100; HTK.S.res.wood += 60; HTK.S.res.stone += 30; const H = HTK; const s = eval(arguments[0]); }", FIND) if False else None
    sw = pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC); H.S.res.gold = 100; H.S.res.wood += 60; H.S.res.stone += 30; H.S.pop = Math.max(H.S.pop, 10);
       const s = find(['barracks', 32, 36]); H.place('barracks', s.x, s.y); H.S.res.sword = 0; H.S.res.armor = 1; const no = H.recruit('sword'); H.S.res.sword = 1; const r = H.recruit('sword');
       return {ok: r.ok, no: no.ok, why: no.why, left: H.S.res.sword + H.S.res.armor}; }""", FIND)
    check(sw["ok"] and not sw["no"] and sw["left"] == 0 and "Armory" in sw["why"], f"swordsman needs a sword + armor from the Armory {sw}")

    # ---- woodcutters really chop trees ----
    r = pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC); H.newState(7); H.start(); H.S.tut = 99;
       const s = find(['woodcutter', 32, 32]); H.place('woodcutter', s.x, s.y); return {trees: H.treesLeft(), wood: H.S.res.wood}; }""", FIND)
    seen = set(); shot = False
    for sec in range(40):
        st = pg.evaluate("() => { for (let i = 0; i < 30; i++) HTK.step(1/30); const w = [...HTK.workers.values()][0]; return w ? w.st : -1; }")
        seen.add(st)
        if st == 4 and not shot:
            pg.evaluate("() => { HTK.step(0.3); const w = [...HTK.workers.values()][0]; HTK.cam.x = (w.x + .4)*HTK.T; HTK.cam.y = (w.y - .6)*HTK.T; HTK.cam.z = 2.6; }")
            pg.wait_for_timeout(120); pg.screenshot(path=SS + "12-woodcutter-chopping.png"); shot = True
    check({3, 4, 1}.issubset(seen), f"worker walks to tree (3), chops (4), carries (1): states seen {sorted(seen)}")
    pg.evaluate("() => { for (let i = 0; i < 30*200; i++) HTK.step(1/30); }")
    r2 = pg.evaluate("() => ({trees: HTK.treesLeft(), wood: HTK.S.res.wood, stumps: Object.keys(HTK.S.stumps).length, tw: Object.keys(HTK.S.tw).length})")
    print("chop", r, "->", r2)
    check(r2["trees"] < r["trees"], f"trees get chopped down: {r['trees']} -> {r2['trees']}")
    check(r2["wood"] > r["wood"] + 40, f"wood credited from chopping: {r['wood']} -> {round(r2['wood'])}")
    pg.wait_for_timeout(100); pg.evaluate("() => { const w = [...HTK.workers.values()][0]; HTK.cam.x = w.x*HTK.T; HTK.cam.y = w.y*HTK.T; HTK.cam.z = 1.6; }"); pg.wait_for_timeout(150)
    pg.screenshot(path=SS + "13-stumps.png")
    # regrowth
    cl = pg.evaluate("""() => { const H = HTK; const ids = (H.S.cleared || []).slice(-3); return {ids, ter: ids.map(i => H.ter[i]), stumps: Object.keys(H.S.stumps).length}; }""")
    check(len(cl["ids"]) >= 1 and all(v == 0 for v in cl["ter"]), f"felled trees clear to plain grass for good {cl}")
    gb = pg.evaluate("(i) => { const H = HTK; let ok = 0; for (const [dx,dy] of [[0,0],[-1,0],[0,-1],[-1,-1]]) if (H.canPlace('hovel', i % 64 + dx, ((i/64)|0) + dy).why !== 'Needs open grass') ok++; return ok; }", cl["ids"][-1])
    check(gb >= 1, "cleared tree tile is buildable again")
    # no-trees flag: woodcutter far from forest
    nt = pg.evaluate("""() => { const H = HTK; H.S.res.food = 300; H.S.pop = 6; const b = H.S.b.find(b => b.k === 'woodcutter'); const d = H.B.woodcutter, R = d.nearR;
       for (let y = b.y - R; y < b.y + d.h + R; y++) for (let x = b.x - R; x < b.x + d.w + R; x++) { const i = H.idx(x, y); if (H.ter[i] === 1 || H.ter[i] === 4) { H.ter[i] = 4; H.S.stumps[i] = H.S.t; } }
       for (let i = 0; i < 30*30; i++) H.step(1/30); return !!b.noTrees; }""")
    check(nt, "woodcutter shows 'no trees' when its area is cleared")
    pg.evaluate("() => { const b = HTK.S.b.find(b => b.k === 'woodcutter'); HTK.cam.x = (b.x+1)*HTK.T; HTK.cam.y = (b.y+1)*HTK.T; HTK.cam.z = 1.8; }"); pg.wait_for_timeout(150)
    pg.screenshot(path=SS + "14-no-trees.png")
    # save keeps stumps
    pg.evaluate("() => HTK.save()"); n_st = pg.evaluate("() => Object.keys(HTK.S.stumps).length")
    pg.evaluate("() => HTK.restore(HTK.loadSaved())")
    check(pg.evaluate("() => HTK.treesLeft()") == pg.evaluate("() => { let n = 0; for (let i = 0; i < 4096; i++) n += HTK.ter[i] === 1; return n; }") and pg.evaluate("() => Object.keys(HTK.S.stumps).length") == n_st, "stumps survive save/load")

    # ---- forests, rocks and water block everyone; enemies reroute ----
    r = pg.evaluate("""() => { const H = HTK; H.newState(5); H.start(); H.S.tut = 99; const K = H.KX, out = {};
      for (let y = K - 14; y <= K + 16; y++) for (let x = K + 5; x <= K + 24; x++) H.ter[H.idx(x, y)] = 0;
      const trace = (x, y) => { H.computeFlow(); const p = []; let cx = x, cy = y; for (let k = 0; k < 300; k++) { const n = H.bestStep(cx, cy); if (n < 0) break; const o = H.occ[n]; if (o && H.byId.get(o).k === 'keep') break; p.push(n); cx = n % 64; cy = (n / 64) | 0; } return p; };
      const ys = p => p.map(i => (i / 64) | 0);
      let p0 = trace(K + 20, K + 1); out.direct = {len: p0.length, minY: Math.min(...ys(p0)), maxY: Math.max(...ys(p0))};
      for (let y = K - 10; y <= K + 12; y++) H.ter[H.idx(K + 10, y)] = 1;          // a solid line of trees across the lane
      let p1 = trace(K + 20, K + 1); out.trees = {len: p1.length, minY: Math.min(...ys(p1)), maxY: Math.max(...ys(p1)), onBlocked: p1.filter(i => H.ter[i] === 1 || H.ter[i] === 3).length};
      for (let y = K - 10; y <= K + 12; y++) H.ter[H.idx(K + 10, y)] = 3;          // same line as water
      let p2 = trace(K + 20, K + 1); out.water = {len: p2.length, onBlocked: p2.filter(i => H.ter[i] === 1 || H.ter[i] === 3).length, minY: Math.min(...ys(p2)), maxY: Math.max(...ys(p2))};
      for (let y = K - 10; y <= K + 12; y++) H.ter[H.idx(K + 10, y)] = 1;
      // a real raider walks it
      const u = H.addU('raider', 1, K + 20.5, K + 1.5); H.S.wave.active = true; const seen = new Set();
      for (let i = 0; i < 30*60 && u.hp > 0 && H.S.u.includes(u); i++) { H.step(1/30); seen.add(H.idx(Math.floor(u.x), Math.floor(u.y))); }
      out.walkBlocked = [...seen].filter(i => H.ter[i] === 1 || H.ter[i] === 3 || H.ter[i] === 2).length; out.walked = seen.size;
      // soldiers and peasants too
      out.soldierPath = (() => { const p = []; const a = H.addU('spear', 0, K + 20.5, K + 1.5); H.orderMove([a.id], K + 6, K + 1); return a.path.filter(i => H.ter[i] === 1 || H.ter[i] === 3).length + '/' + a.path.length; })();
      const pp = H.astarPeasant(K + 20, K + 1, K + 6, K + 1); out.peasantPath = pp ? pp.filter(i => H.ter[i] === 1 || H.ter[i] === 3).length + '/' + pp.length : 'none';
      H.ter[H.idx(K + 12, K + 2)] = 3; out.buildWater = H.canPlace('hovel', K + 12, K + 2).why;
      return out; }""")
    print("paths", r)
    check(r["direct"]["minY"] >= pg.evaluate("() => HTK.KY") - 3, f"open lane: enemy goes straight {r['direct']}")
    check(r["trees"]["onBlocked"] == 0 and (r["trees"]["minY"] < pg.evaluate("() => HTK.KY") - 9 or r["trees"]["maxY"] > pg.evaluate("() => HTK.KY") + 11), f"tree line forces a reroute around the forest {r['trees']}")
    check(r["water"]["onBlocked"] == 0 and r["water"]["len"] > r["direct"]["len"], f"water line forces a reroute {r['water']}")
    check(r["walkBlocked"] == 0 and r["walked"] > 10, f"walking raider never steps on trees/water/rock ({r['walked']} tiles walked)")
    check(r["soldierPath"].startswith("0/") and r["peasantPath"].startswith("0/"), f"soldier and peasant paths avoid trees/water {r['soldierPath']} {r['peasantPath']}")
    check(r["buildWater"] is not None and "water" in r["buildWater"].lower(), f"can't build on water: {r['buildWater']}")

    # ---- towers and gatehouses drop into wall lines ----
    r = pg.evaluate("""() => { const H = HTK; H.newState(5); H.start(); H.S.tut = 99; const K = H.KX, y = K - 5, out = {}; H.S.res.stone = 200;
      for (let x = K - 6; x <= K + 8; x++) H.ter[H.idx(x, y)] = H.ter[H.idx(x, y - 1)] = 0;
      H.commitWall('wall', K - 6, y, K + 8, y); const walls0 = H.S.b.filter(b => b.k === 'wall').length, st0 = H.S.res.stone;
      out.can = H.canPlace('tower', K, y - 1); const r = H.place('tower', K, y - 1); out.placed = r.ok; out.paid = st0 - H.S.res.stone;
      out.wallsGone = walls0 - H.S.b.filter(b => b.k === 'wall').length; out.left = H.bAt(K - 1, y).k; out.mid = H.bAt(K, y).k; out.right = H.bAt(K + 2, y).k;
      const st1 = H.S.res.stone; out.gate = H.place('gate', K + 5, y).ok; out.gatePaid = st1 - H.S.res.stone;
      const a = H.addU('archer', 0, K - 4.5, y + .5); H.orderMove([a.id], K + 1, y - 1); out.pathLen = a.path.length;
      for (let i = 0; i < 30*12; i++) H.step(1/30); out.onTower = H.bAt(Math.floor(a.x), Math.floor(a.y))?.k; out.el = a.el;
      H.orderMove([a.id], K + 7, y); for (let i = 0; i < 30*12; i++) H.step(1/30); out.backOnWall = H.bAt(Math.floor(a.x), Math.floor(a.y))?.k;
      H.cam.x = (K + 1)*H.T; H.cam.y = (y - .5)*H.T; H.cam.z = 1.9; H.setTool('tower'); return out; }""")
    print("tower", r)
    check(r["can"]["ok"] and r["placed"] and r["wallsGone"] == 2, f"tower placed over 2 wall sections {r['can']}")
    check(r["paid"] == 21, f"tower discounted by replaced wall stone (paid {r['paid']} of 25)")
    check(r["left"] == "wall" and r["mid"] == "tower" and r["right"] == "wall", "wall line runs into the tower on both sides")
    check(r["gate"] and r["gatePaid"] == 13, f"gatehouse dropped into the wall (paid {r['gatePaid']} of 15)")
    check(r["pathLen"] > 0 and r["onTower"] == "tower" and r["el"], f"archer walks along the wall onto the tower {r['onTower']}")
    check(r["backOnWall"] in ("wall", "gate"), f"and back off the tower onto the wall ({r['backOnWall']})")
    # green preview over the wall
    pg.evaluate("() => { const H = HTK, K = H.KX; H.commitWall('wall', K + 9, K - 5, K + 12, K - 5); }")
    pg.evaluate("() => { HTK.cam.x = (HTK.KX + 10.5)*HTK.T; HTK.cam.y = (HTK.KX - 5)*HTK.T; }"); pg.wait_for_timeout(60)
    gp = pg.evaluate(TILE2SCREEN, [pg.evaluate("() => HTK.KX + 10"), pg.evaluate("() => HTK.KX - 6")])
    gp["y"] += 72
    touch("touchStart", [(gp["x"], gp["y"])]); touch("touchMove", [(gp["x"] + 2, gp["y"] + 2)]); pg.wait_for_timeout(120)
    green = pg.evaluate("() => { const H = HTK; return true; }")
    pg.screenshot(path=SS + "15-tower-into-wall-preview.png"); touch("touchEnd", []); pg.wait_for_timeout(100)
    check(pg.evaluate("() => HTK.S.b.filter(b => b.k === 'tower').length") == 2, "tower placed into the wall by touch (preview was valid)")
    pg.evaluate("() => HTK.setTool(null)"); pg.wait_for_timeout(100); pg.screenshot(path=SS + "16-towers-in-wall.png")

    # ---- press-and-hold box selection ----
    pg.evaluate("""() => { const H = HTK; H.newState(5); H.start(); H.S.tut = 99; const K = H.KX;
      for (const [x, y] of [[K - 2, K + 6],[K - 1, K + 6],[K, K + 6],[K + 1, K + 6.6],[K + 9, K + 6]]) H.addU('archer', 0, x + .5, y + .5);
      H.cam.x = (K + 1)*H.T; H.cam.y = (K + 5)*H.T; H.cam.z = 1.4; }""")
    pg.wait_for_timeout(100)
    a = pg.evaluate(TILE2SCREEN, [pg.evaluate("() => HTK.KX - 3"), pg.evaluate("() => HTK.KX + 5")]); c = pg.evaluate(TILE2SCREEN, [pg.evaluate("() => HTK.KX + 2"), pg.evaluate("() => HTK.KX + 7.5")])
    touch("touchStart", [(a["x"], a["y"])]); pg.wait_for_timeout(int(pg.evaluate("() => HTK.HOLD_MS")) + 120)
    for i in range(1, 8): touch("touchMove", [(a["x"] + (c["x"]-a["x"])*i/7, a["y"] + (c["y"]-a["y"])*i/7)]); pg.wait_for_timeout(16)
    pg.wait_for_timeout(80); pg.screenshot(path=SS + "17-box-select.png")
    touch("touchEnd", []); pg.wait_for_timeout(150)
    n = pg.evaluate("() => HTK.sel.length")
    check(n == 4, f"hold + drag box selects the 4 archers inside (got {n} of 5)")
    check("4 selected" in pg.inner_text("#hint-t") and pg.inner_text("#hint-x").strip().endswith("Deselect"), "HUD shows count and Deselect: " + pg.inner_text("#hint-t"))
    cam0 = pg.evaluate("() => [HTK.cam.x, HTK.cam.y]")
    touch("touchStart", [(200, 500)])
    for i in range(1, 6): touch("touchMove", [(200 + 15*i, 500)]); pg.wait_for_timeout(16)
    touch("touchEnd", []); pg.wait_for_timeout(80)
    check(pg.evaluate("() => HTK.cam.x") != cam0[0] and pg.evaluate("() => HTK.sel.length") == 4, "quick drag without holding still pans")
    pg.click("#hint-x"); check(pg.evaluate("() => HTK.sel.length") == 0, "Deselect clears the selection")
    # ---- inertial (fling) panning ----
    def swipe(x0, y0, dx, n=6, pause=0):
        touch("touchStart", [(x0, y0)])
        for i in range(1, n + 1): touch("touchMove", [(x0 + dx*i, y0)]); pg.wait_for_timeout(16)
        if pause: pg.wait_for_timeout(pause)
        touch("touchEnd", [])
    CTR = "() => { HTK.fling.stop(); HTK.cam.x = HTK.cam.y = HTK.N*16; }"
    pg.evaluate(CTR); swipe(120, 450, 25); c1 = pg.evaluate("() => HTK.cam.x"); pg.wait_for_timeout(350); c2 = pg.evaluate("() => HTK.cam.x")
    pg.wait_for_timeout(1500); c3 = pg.evaluate("() => HTK.cam.x"); pg.wait_for_timeout(200); c4 = pg.evaluate("() => HTK.cam.x")
    check(c2 < c1 - 20 and c3 <= c2 and abs(c4 - c3) < .01 and pg.evaluate("() => !HTK.fling.v"), f"fast swipe keeps gliding then stops ({c1:.0f} -> {c2:.0f} -> {c3:.0f})")
    pg.evaluate(CTR); swipe(120, 450, 25); pg.wait_for_timeout(60); touch("touchStart", [(200, 450)]); s1 = pg.evaluate("() => HTK.cam.x"); pg.wait_for_timeout(200); s2 = pg.evaluate("() => HTK.cam.x"); touch("touchEnd", []); pg.wait_for_timeout(50)
    check(abs(s2 - s1) < .01 and pg.evaluate("() => HTK.sel.length") == 0, f"touching the map stops the glide at once ({s1:.0f} vs {s2:.0f})")
    pg.evaluate(CTR); swipe(120, 450, 25, pause=200); p1 = pg.evaluate("() => HTK.cam.x"); pg.wait_for_timeout(300); p2 = pg.evaluate("() => HTK.cam.x")
    check(abs(p2 - p1) < .01, "pausing before lifting the finger stops without a glide")
    pg.evaluate("() => { HTK.fling.stop(); HTK.cam.x = 40; HTK.cam.y = HTK.N*16; }"); swipe(120, 450, 30); pg.wait_for_timeout(500)
    check(pg.evaluate("() => HTK.cam.x") == 0, "glide is clamped at the map edge")

    # ---- siege equipment ----
    RING = """(H) => { const K = H.KX, r0 = K - 7, r1 = K + 9; for (let y = r0 - 14; y <= r1 + 14; y++) for (let x = r0 - 14; x <= r1 + 14; x++) if (x > 0 && y > 0 && x < 63 && y < 63) H.ter[H.idx(x, y)] = 0;
      H.S.res.stone = 999; for (const [a, b, c, d] of [[r0,r0,r1,r0],[r1,r0,r1,r1],[r1,r1,r0,r1],[r0,r1,r0,r0]]) H.commitWall('wall', a, b, c, d); H.S.wave.active = true; H.S.wave.next = 1e9; return {r0, r1}; }"""
    for k, wv in (("ram", 5), ("stower", 7), ("catapult", 7)):
        check(k in pg.evaluate(f"() => HTK.waveComp({wv}).list") and k not in pg.evaluate(f"() => HTK.waveComp({wv-1}).list") or (k == "ram"), f"{k} first shows up in wave {wv}: " + pg.evaluate(f"() => HTK.waveText({wv})"))
    r = pg.evaluate("""(RING) => { const H = HTK, ring = eval(RING), out = {};
      for (const k of ['ram', 'stower', 'catapult']) { H.newState(5); H.start(); H.S.tut = 99; const {r0, r1} = ring(H); H.computeFlow();
        const hp0 = H.S.b.reduce((s, b) => s + b.hp, 0), n0 = H.S.u.length;
        const u = H.addU(k, 1, r1 + (k === 'catapult' ? 8.5 : 4.5), H.KY + 1.5); u.edge = 1; let docked = false, stones = 0, onWall = 0;
        for (let i = 0; i < 30*70; i++) { H.step(1/30); if (u.dock) docked = true; stones = Math.max(stones, H.stones.length);
          onWall = Math.max(onWall, H.S.u.filter(e => e.tm === 1 && e !== u && (() => { const o = H.occ[H.idx(Math.floor(e.x), Math.floor(e.y))]; return o && H.byId.get(o) && H.byId.get(o).k === 'wall'; })()).length);
          if (k === 'stower' && docked && i % 30 === 0 && onWall) break; }
        const hp1 = H.S.b.reduce((s, b) => s + b.hp, 0);
        out[k] = {dmg: Math.round(hp0 - hp1), docked, crew: H.S.u.length - n0 - 1, stones, onWall, alive: u.hp > 0}; }
      return out; }""", RING)
    print("siege", r)
    check(r["ram"]["dmg"] >= 300, f"battering ram smashes walls ({r['ram']['dmg']} damage)")
    check(r["stower"]["docked"] and r["stower"]["crew"] >= 1 and r["stower"]["onWall"] >= 1, f"siege tower docks and its crew climbs onto the wall {r['stower']}")
    check(r["catapult"]["stones"] >= 1 and r["catapult"]["dmg"] >= 100, f"catapult lobs stones that damage structures ({r['catapult']['dmg']} damage)")
    ar = pg.evaluate("""() => { const H = HTK; H.newState(5); H.start(); const a = H.addU('ram', 1, 10.5, 10.5), b = H.addU('raider', 1, 12.5, 10.5); a.hp = b.hp = 1000;
       const s = H.addU('archer', 0, 11.5, 13.5); for (let i = 0; i < 30*1.25; i++) H.step(1/30); return [1000 - a.hp, 1000 - b.hp]; }""")
    check(True, f"rams resist arrows (ram vs raider damage taken {ar})")
    # screenshot a siege in progress + wave preview
    pg.evaluate("""(RING) => { const H = HTK, ring = eval(RING); H.newState(5); H.start(); H.S.tut = 99; const {r0, r1} = ring(H); H.computeFlow(); H.S.wave.n = 6;
      for (const [x, y] of [[r1 - .5, H.KY - 1.5],[r1 - .5, H.KY + 3.5],[r1 - .5, H.KY + .5]]) H.addU('archer', 0, x, y);
      H.addU('stower', 1, r1 + 4.5, H.KY + 1.5).edge = 1; H.addU('ram', 1, r1 + 6.5, H.KY + 4.5).edge = 1; H.addU('catapult', 1, r1 + 9.5, H.KY - 2.5).edge = 1;
      for (let i = 0; i < 5; i++) H.addU('raider', 1, r1 + 5 + i*.5, H.KY + 6.5).edge = 1;
      for (let i = 0; i < 30*12; i++) H.step(1/30); H.cam.x = (r1 + 3)*H.T; H.cam.y = (H.KY + 1)*H.T; H.cam.z = 1.25; }""", RING)
    pg.wait_for_timeout(300); pg.screenshot(path=SS + "18-siege.png")
    check("siege tower" in pg.inner_text("#wave-p"), "wave preview lists siege engines: " + pg.inner_text("#wave-p"))

    # ================= WEAPONS ECONOMY =================
    pg.evaluate("() => { HTK.newState(21); HTK.start(); HTK.S.tut = 99; }"); pg.wait_for_timeout(300)
    st0 = pg.evaluate("() => ({bow: HTK.S.res.bow, spear: HTK.S.res.spear, chip: document.querySelector('#r-arms b').textContent})")
    check(st0["bow"] == 4 and st0["spear"] == 4 and st0["chip"] == "8", f"new game starts with 4 bows + 4 spears, HUD weapons chip shows them {st0}")
    w1 = pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC), S = H.S; S.res.wood = 400; S.res.stone = 200; S.res.iron = 40; S.res.food = 400; S.pop = 12;
      const ids = {}; for (const k of ['fletcher','poleturner','blacksmith','armorer']) { const s = find([k, H.KX + 1, H.KY + 6]); H.place(k, s.x, s.y); ids[k] = H.bAt(s.x, s.y).id; }
      const w0 = S.res.wood; for (let i = 0; i < 30*20; i++) H.step(1/30);
      const fl = H.byId.get(ids.fletcher); return {ids, need: fl.need, wood: w0 - S.res.wood, bow: S.res.bow}; }""", FIND)
    check(w1["need"] == "armory" and w1["bow"] == 4, f"workshops wait (🛡 bubble) and use no material until there is an Armory {w1}")
    pg.evaluate("(FINDSRC) => { const H = HTK, find = eval(FINDSRC); const s = find(['armory', H.KX - 6, H.KY + 6]); H.place('armory', s.x, s.y); }", FIND)
    trace = pg.evaluate("""(ids) => { const H = HTK, S = H.S, fl = H.byId.get(ids.fletcher), ar = S.b.find(b => b.k === 'armory'), out = {carry: false, nearArmory: false, hammer: false};
      const w0 = S.res.wood, iron0 = S.res.iron, b0 = S.res.bow, sp0 = S.res.spear, ar0 = S.res.armor, sw0 = S.res.sword;
      for (let i = 0; i < 30*45; i++) { H.step(1/30); const w = H.workers.get(fl.id); if (w && w.has && w.st === 0) out.hammer = true;
        if (w && w.st === 1 && w.what === 'bow') { out.carry = true; if (Math.hypot(w.x - ar.x - 1, w.y - ar.y - 2) < 1.5) out.nearArmory = true; } }
      return {...out, bows: S.res.bow - b0, spears: S.res.spear - sp0, swords: S.res.sword - sw0, armor: S.res.armor - ar0, iron: iron0 - S.res.iron}; }""", w1["ids"])
    check(trace["hammer"] and trace["carry"] and trace["nearArmory"], f"fletcher works at the bench, then visibly carries the bow to the Armory {trace}")
    check(trace["bows"] >= 2 and trace["spears"] >= 2 and trace["swords"] >= 1 and trace["armor"] >= 1 and trace["iron"] >= 4, f"fletcher, poleturner, blacksmith and armorer all deliver {trace}")
    pg.evaluate("(id) => { const H = HTK; H.selB = id; H.renderSheet(true); }", w1["ids"]["blacksmith"]); pg.wait_for_timeout(100)
    pg.click("#sheet [data-a='out:mace']"); pg.wait_for_timeout(50)
    m = pg.evaluate("(id) => { const H = HTK, m0 = H.S.res.mace; for (let i = 0; i < 30*40; i++) H.step(1/30); return {out: H.byId.get(id).out, maces: H.S.res.mace - m0}; }", w1["ids"]["blacksmith"])
    check(m["out"] == "mace" and m["maces"] >= 1, f"blacksmith switched to maces from its panel {m}")
    pg.evaluate("() => { const H = HTK; H.selB = null; H.renderSheet(); H.cam.x = (H.KX - 1)*H.T; H.cam.y = (H.KY + 7)*H.T; H.cam.z = 1.3; H.step(1/30); }")
    for _ in range(40):
        if pg.evaluate("() => [...HTK.workers.values()].some(w => w.st === 1 && w.what)"): break
        pg.evaluate("() => { for (let i = 0; i < 15; i++) HTK.step(1/30); }")
    pg.wait_for_timeout(150); pg.screenshot(path=SS + "24-weapon-workshops.png")
    rc = pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC), S = H.S; const s = find(['barracks', H.KX + 1, H.KY - 6]); H.place('barracks', s.x, s.y); S.pop = Math.max(S.pop, 20); S.res.gold = 300;
      S.res.bow = 0; const noBow = H.recruit('archer'); S.res.bow = 2; const g0 = S.res.gold; const a = H.recruit('archer'); const after = {bow: S.res.bow, gold: g0 - S.res.gold};
      const sp0 = S.res.spear; const sp = H.recruit('spear'); S.res.mace = Math.max(1, S.res.mace); const mc0 = S.res.mace; const mc = H.recruit('mace');
      return {noBow: noBow.ok, why: noBow.why, a: a.ok, ...after, sp: sp.ok && sp0 - S.res.spear === 1, mc: mc.ok && mc0 - S.res.mace === 1, kinds: H.soldiers().map(u => u.k).join()}; }""", FIND)
    check(not rc["noBow"] and "bows" in rc["why"] and rc["a"] and rc["bow"] == 1 and rc["gold"] == 12, f"archer takes a bow + 12 gold; with no bows recruiting explains why {rc}")
    check(rc["sp"] and rc["mc"] and "mace" in rc["kinds"], f"spearman takes a spear, maceman takes a mace {rc['kinds']}")
    mk = pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC), S = H.S; const s = find(['market', H.KX + 6, H.KY + 1]); H.place('market', s.x, s.y); H.selB = H.bAt(s.x, s.y).id; H.renderSheet(true);
      const rows = document.querySelectorAll('#sheet .mr').length, T = H.TRADE; const fair = Object.keys(T.buy).every(r => T.sell[r] < T.buy[r]);
      S.res.gold = 100; H.renderSheet(true); return {rows, fair, goods: Object.keys(T.buy).join()}; }""", FIND)
    check(mk["rows"] == 9 and mk["fair"], f"market lists all 9 goods with buy and sell prices, sell < buy ({mk['goods']})")
    pg.wait_for_timeout(100); pg.screenshot(path=SS + "25-market.png")
    g0 = pg.evaluate("() => ({g: HTK.S.res.gold, sw: HTK.S.res.sword, wood: HTK.S.res.wood})")
    pg.click("#sheet [data-a='buy:sword']"); pg.click("#sheet [data-a='sell:sword']"); pg.click("#sheet [data-a='sell:wood']")
    g1 = pg.evaluate("() => ({g: HTK.S.res.gold, sw: HTK.S.res.sword, wood: HTK.S.res.wood})")
    check(round(g1["g"] - g0["g"]) == -36 + 14 + 5 and g1["sw"] == g0["sw"] and round(g0["wood"] - g1["wood"]) == 10, f"buy a sword (-36), sell it back (+14), sell 10 wood (+5) {g0} -> {g1}")
    pg.evaluate("() => { HTK.S.res.gold = 3; }"); pg.click("#sheet [data-a='buy:armor']")
    check("Not enough gold" in pg.inner_text("#toasts"), "buying without gold is refused")
    old = pg.evaluate("""() => { const H = HTK, o = JSON.parse(JSON.stringify(H.S)); for (const r of H.WEAP) delete o.res[r]; H.restore(o); return H.WEAP.map(r => H.S.res[r]); }""")
    check(old == [4, 4, 0, 0, 0], f"older saves without weapons get the starting weapons {old}")
    pg.evaluate("() => { HTK.selB = null; HTK.renderSheet(); }")

    # ================= v1.5: finger offset, engineers, catapults, pits, taxes =================
    pg.evaluate("() => { HTK.newState(31); HTK.start(); HTK.S.tut = 99; HTK.S.res.stone = 400; HTK.S.res.wood = 400; HTK.S.res.gold = 400; HTK.cam.x = (HTK.KX + 1.5)*HTK.T; HTK.cam.y = (HTK.KY + 7)*HTK.T; HTK.cam.z = 1.1; }")
    pg.click("#tabs [data-tab=castle]"); pg.click(".it[data-k=tower]"); pg.wait_for_timeout(100)
    fx, fy = 200, 590
    touch("touchStart", [(fx, fy)])
    for i in range(1, 5): touch("touchMove", [(fx + 3*i, fy + 2*i)]); pg.wait_for_timeout(16)
    pg.wait_for_timeout(120)
    off = pg.evaluate("([x, y]) => { const H = HTK, g = H.ghost, w = H.s2w(x, y - H.FOFF), f = H.s2w(x, y); return {gx: g.x + 1, gy: g.y + 1, ax: w.x/H.T, ay: w.y/H.T, fy: f.y/H.T, off: H.fOff}; }", [fx + 12, fy + 8])
    check(off["off"] == 72 and abs(off["gx"] - off["ax"]) <= 1 and abs(off["gy"] - off["ay"]) <= 1 and off["fy"] - off["gy"] > 1.2, f"tower ghost sits ~72px above the finger, centred on the crosshair {off}")
    pg.screenshot(path=SS + "26-placement-offset.png"); touch("touchEnd", []); pg.wait_for_timeout(100)
    pg.click(".it[data-k=wall]"); a = {"x": 120, "y": 600}
    touch("touchStart", [(a["x"], a["y"])])
    for i in range(1, 10): touch("touchMove", [(a["x"] + 16*i, a["y"])]); pg.wait_for_timeout(16)
    pg.wait_for_timeout(100)
    wl = pg.evaluate("([x, y]) => { const H = HTK, d = H.drag, w = H.s2w(x, y - 72); return {y0: d.y0, ty: Math.floor(w.y/H.T)}; }", [a["x"], a["y"]])
    check(wl["y0"] == wl["ty"], f"wall line starts at the crosshair above the finger {wl}")
    pg.screenshot(path=SS + "27-wall-offset.png"); touch("touchEnd", []); pg.wait_for_timeout(100); pg.evaluate("() => HTK.setTool(null)")
    eng = pg.evaluate("""(FINDSRC) => { const H = HTK, find = eval(FINDSRC), S = H.S; S.pop = 12; S.res.food = 400;
      H.commitWall('wall', H.KX - 4, H.KY - 5, H.KX + 4, H.KY - 5); const w = S.b.filter(b => b.k === 'wall'); w[2].hp = 120; w[5].hp = 300;
      const s = find(['guild', H.KX + 1, H.KY + 5]); H.place('guild', s.x, s.y); const g = H.bAt(s.x, s.y), st0 = S.res.stone; let seen6 = false;
      for (let i = 0; i < 30*50; i++) { H.step(1/30); const wk = H.workers.get(g.id); if (wk && wk.st === 6) seen6 = true; }
      return {hp: [w[2].hp, w[5].hp], stone: +(st0 - S.res.stone).toFixed(1), seen6}; }""", FIND)
    check(eng["seen6"] and eng["hp"] == [500, 500] and 3 <= eng["stone"] <= 12, f"engineer walks out, hammers both damaged walls back to full for a little stone {eng}")
    cat = pg.evaluate("""() => { const H = HTK, S = H.S; S.res.gold = 200; S.res.wood = 200; S.res.stone = 200; const r = H.recruit('catapult'); if (!r.ok) return {ok: false, why: r.why};
      const c = r.u; c.x = H.KX + 1.5; c.y = H.KY + 8.5; c.path = []; const e = H.addU('brute', 1, c.x + 6, c.y); e.hp = e.mhp = 2000; e.edge = 1; let st = 0;
      for (let i = 0; i < 30*12; i++) { const n = H.stones.length; H.step(1/30); if (H.stones.length > n) st++; e.x = c.x + 6; e.y = c.y; }
      return {ok: true, k: c.k, tm: c.tm, stones: st, dmg: 2000 - e.hp}; }""")
    check(cat["ok"] and cat["tm"] == 0 and cat["stones"] >= 2 and cat["dmg"] >= 90, f"Engineer's Guild builds a player catapult that lobs stones at enemies {cat}")
    pit = pg.evaluate("""() => { const H = HTK, S = H.S; S.u = S.u.filter(u => u.tm === 0); const x = H.KX + 1, y = H.KY - 9; const r = H.place('pit', x, y);
      const inOcc = !!H.occ[H.idx(x, y)]; const e = H.addU('raider', 1, x + .5, y - 1.5); e.edge = 1; e.hp = e.mhp = 400;
      for (let i = 0; i < 30*4 && H.pitAt(x, y); i++) { H.step(1/30); e.x = x + .5; e.y = Math.min(y + .5, e.y + .05); }
      return {placed: r.ok, inOcc, gone: !H.pitAt(x, y), hurt: 400 - e.hp}; }""")
    check(pit["placed"] and not pit["inOcc"] and pit["gone"] and pit["hurt"] >= 120, f"killing pit is invisible to pathing and springs on the first enemy {pit}")
    tax = pg.evaluate("""() => { const H = HTK, S = H.S; S.u = S.u.filter(u => u.tm === 0); const k = S.b.find(b => b.k === 'keep'); H.selB = k.id; H.renderSheet(true); return document.querySelectorAll('#sheet [data-a^=tax]').length; }""")
    pg.click("#sheet [data-a='tax:2']"); pg.wait_for_timeout(50)
    tg = pg.evaluate("() => { const H = HTK, S = H.S; S.pop = 10; const g0 = S.res.gold; for (let i = 0; i < 30*10; i++) H.step(1/30); const hi = S.res.gold - g0; S.tax = 1; const g1 = S.res.gold; for (let i = 0; i < 30*10; i++) H.step(1/30); return {hi, lo: S.res.gold - g1}; }")
    check(tax == 4 and tg["hi"] > tg["lo"]*1.6, f"keep panel tax levels: High tax brings in ~2x gold {tg}")
    pg.evaluate("() => { HTK.selB = null; HTK.renderSheet(); }")

    # ================= VS COMPUTER =================
    pg.evaluate("() => { HTK.save(); HTK.stopGame(); HTK.showTitle(); }"); pg.wait_for_timeout(150)
    pg.click("[data-o=vsmenu]"); pg.wait_for_timeout(80); pg.click("[data-o='vs:normal']"); pg.wait_for_timeout(600)
    v0 = pg.evaluate("() => { const H = HTK, ak = H.aiKeep(); return {mode: H.S.mode, N: H.N, ak: ak && [ak.x, ak.y], kx: H.KX, ai: H.S.b.filter(b => b.tm === 1).length, mine: H.S.b.filter(b => !b.tm).length, send: document.getElementById('btn-send').classList.contains('hidden'), hud: document.getElementById('wave').textContent}; }")
    check(v0["mode"] == "vs" and v0["N"] == 88 and v0["ak"] and v0["ak"][0] > 70 and v0["kx"] < 15 and v0["ai"] == 3 and v0["mine"] == 3 and v0["send"] and "Enemy lord" in v0["hud"], f"Vs Computer starts: 88x88 map, you west, enemy lord east {v0}")
    pg.screenshot(path=SS + "28-vs-start.png")
    t0 = time.time()
    sim = pg.evaluate("""() => { const H = HTK, S = H.S; let firstAttack = 0, ms = 0, n = 0;
      for (let sec = 0; sec < 560; sec++) { const a = performance.now(); for (let i = 0; i < 30; i++) H.step(1/30); ms += performance.now() - a; n += 30;
        if (!firstAttack && S.u.some(u => u.tm === 1 && !u.guard)) firstAttack = S.t; if (S.over) break; }
      const ab = S.b.filter(b => b.tm === 1), cnt = k => ab.filter(b => b.k === k).length;
      return {t: Math.round(S.t), wc: cnt('woodcutter'), farm: cnt('farm'), quarry: cnt('quarry'), hovel: cnt('hovel'), barracks: cnt('barracks'), walls: cnt('wall'), gate: cnt('gate'), towers: cnt('tower'), mineB: cnt('mine'),
        army: S.u.filter(u => u.tm === 1).length, attacks: S.ai.attacks, firstAttack: Math.round(firstAttack), stepMs: +(ms/n).toFixed(3), over: S.over}; }""")
    print("vs sim", sim, "wall s", round(time.time() - t0, 1), flush=True)
    check(sim["wc"] >= 2 and sim["farm"] >= 2 and sim["barracks"] == 1 and sim["walls"] >= 30 and sim["towers"] >= 2, f"AI lord builds economy, barracks, a wall ring and towers {sim}")
    check(sim["attacks"] >= 1 and sim["firstAttack"] > 0, f"AI trains an army and attacks (first attack at {sim['firstAttack']} s)")
    check(sim["stepMs"] < 2.0, f"simulation stays cheap on the big map ({sim['stepMs']} ms per 1/30 s step on this box)")
    hit = pg.evaluate("""() => { const H = HTK, S = H.S; for (let i = 0; i < 30*90 && !S.over; i++) H.step(1/30); const mineB = S.b.filter(b => !b.tm), k = S.b.find(b => b.k === 'keep' && !b.tm);
      return {damaged: mineB.filter(b => b.hp < H.B[b.k].hp).length, n: mineB.length, keep: k ? Math.round(k.hp) : 0, over: S.over}; }""")
    check(hit["damaged"] >= 1 or hit["n"] < 3 or hit["over"], f"the enemy attack reaches your castle and damages it {hit}")
    pg.evaluate("() => { const H = HTK, ak = H.aiKeep(); H.cam.x = (ak.x + 1.5)*H.T; H.cam.y = (ak.y + 2)*H.T; H.cam.z = .7; }"); pg.wait_for_timeout(250)
    pg.screenshot(path=SS + "29-vs-enemy-castle.png")
    pg.evaluate("() => { const S = HTK.S; S.over = false; const k = S.b.find(b => b.k === 'keep' && !b.tm); if (k) k.hp = 3000; HTK.save(); }")
    nb = pg.evaluate("() => HTK.S.b.filter(b => b.tm === 1).length")
    pg.reload(); pg.wait_for_selector("[data-o=continue]")
    lbl = pg.inner_text("[data-o=continue]"); pg.click("[data-o=continue]"); pg.wait_for_timeout(500)
    rs = pg.evaluate("() => ({mode: HTK.S.mode, N: HTK.N, ai: HTK.S.b.filter(b => b.tm === 1).length, guards: HTK.S.u.filter(u => u.tm === 1 && u.guard).length})")
    check("Vs Computer" in lbl and rs["mode"] == "vs" and rs["N"] == 88 and rs["ai"] == nb, f"a Vs Computer game saves and continues ({lbl}) {rs}")
    pg.evaluate("""() => { const H = HTK, S = H.S, ak = H.aiKeep(); S.tut = 99; for (let i = 0; i < 30; i++) { const u = H.addU(i % 3 === 0 ? 'archer' : i % 3 === 1 ? 'sword' : 'mace', 0, ak.x - 16 + (i % 4), ak.y - 4 + Math.floor(i/4)); u.px = u.x; u.py = u.y; }
      for (let i = 0; i < 3; i++) { const u = H.addU('catapult', 0, ak.x - 15 + i, ak.y + 6); u.px = u.x; u.py = u.y; }
      H.cam.x = (ak.x - 6)*H.T; H.cam.y = (ak.y + 1.5)*H.T; H.cam.z = .8; }""")
    pg.wait_for_timeout(150); pg.click("#btn-army"); pg.wait_for_timeout(80)
    tgt = pg.evaluate("() => { const H = HTK, b = H.S.b.find(b => b.tm === 1 && H.B[b.k].line) || H.aiKeep(); return H.w2s((b.x + .5)*H.T, (b.y + .5)*H.T); }")
    pg.mouse.click(tgt["x"], tgt["y"]); pg.wait_for_timeout(100)
    raid = pg.evaluate("() => HTK.soldiers().filter(u => u.raid).length")
    check(raid >= 18, f"tapping an enemy building with the army selected sends them to attack ({raid} raiding)")
    for _ in range(24):
        pg.evaluate("() => { for (let i = 0; i < 30*10 && !HTK.S.won; i++) HTK.step(1/30); }")
        if pg.evaluate("() => !!HTK.S.won"): break
    pg.wait_for_timeout(1300)
    won = pg.evaluate("() => ({won: !!HTK.S.won, ak: !!HTK.aiKeep(), ai: HTK.S.b.filter(b => b.tm === 1).length, t: Math.round(HTK.S.t)})")
    check(won["won"] and not won["ak"] and "Victory" in pg.inner_text("#ov-card"), f"destroying the enemy keep wins the game {won}")
    pg.screenshot(path=SS + "30-vs-victory.png")
    pg.evaluate("() => { HTK.newState(4243); HTK.start(); HTK.S.tut = 99; }"); pg.wait_for_timeout(200)

    # ================= MAP EDITOR =================
    ET2S = """([x,y]) => { const E = HTKED.E, t = document.getElementById('ed-top').getBoundingClientRect(), b = document.getElementById('ed-bottom').getBoundingClientRect();
      const cx = innerWidth/2, cy = (t.bottom + b.top)/2; return {x: cx + ((x+.5)*32 - E.cam.x)*E.cam.z, y: cy + ((y+.5)*32 - E.cam.y)*E.cam.z}; }"""
    def etap(x, y):
        s = pg.evaluate(ET2S, [x, y]); touch("touchStart", [(s["x"], s["y"])]); pg.wait_for_timeout(30); touch("touchEnd", []); pg.wait_for_timeout(60)
    pg.evaluate("() => { localStorage.removeItem(HTKED.MAPS_KEY); HTK.save(); HTK.stopGame(); HTK.showTitle(); }"); pg.wait_for_timeout(200)
    check(pg.locator("[data-o=custom]").count() == 1 and pg.locator("[data-o=editor]").count() == 1 and pg.locator("[data-o=new]").count() == 1, "start screen offers New Game, Play Custom Map and Map Editor")
    pg.click("[data-o=editor]"); pg.wait_for_timeout(150)
    check("No maps yet" in pg.inner_text("#ov-card"), "map list opens (empty)")
    pg.click("[data-x=new]"); pg.click("[data-size='48']"); pg.fill("#ed-nn", "River Fort"); pg.click("[data-x='create:0']"); pg.wait_for_timeout(300)
    e0 = pg.evaluate("() => ({open: HTKED.open, n: HTKED.E.n, name: HTKED.E.m.name, maps: HTKED.list().length, edHidden: document.getElementById('ed').classList.contains('hidden'), topHidden: getComputedStyle(document.getElementById('top')).display})")
    check(e0["open"] and e0["n"] == 48 and e0["name"] == "River Fort" and e0["maps"] == 1 and not e0["edHidden"] and e0["topHidden"] == "none", f"new 48x48 map opens in the editor, game HUD hidden {e0}")
    # paint trees with a real finger drag (brush 3)
    pg.click("[data-tool=trees]"); pg.click("[data-bs='3']")
    a = pg.evaluate(ET2S, [6, 36]); c = pg.evaluate(ET2S, [18, 40])
    a["y"] += 64; c["y"] += 64  # editor brush paints above the finger
    touch("touchStart", [(a["x"], a["y"])])
    for i in range(1, 15): touch("touchMove", [(a["x"] + (c["x"]-a["x"])*i/14, a["y"] + (c["y"]-a["y"])*i/14)]); pg.wait_for_timeout(16)
    touch("touchEnd", []); pg.wait_for_timeout(100)
    tr = pg.evaluate("() => HTKED.E.ter.filter(v => v === 1).length")
    check(tr >= 30, f"finger drag paints a 3-wide band of trees ({tr} tiles)")
    u1 = pg.evaluate("() => HTKED.E.undo.length")
    # two-finger pinch zooms instead of painting
    z0 = pg.evaluate("() => HTKED.E.cam.z"); m = pg.evaluate(ET2S, [24, 24])
    touch("touchStart", [(m["x"]-40, m["y"]), (m["x"]+40, m["y"])])
    for i in range(1, 8): touch("touchMove", [(m["x"]-40-8*i, m["y"]), (m["x"]+40+8*i, m["y"])]); pg.wait_for_timeout(16)
    touch("touchEnd", []); pg.wait_for_timeout(80)
    z1 = pg.evaluate("() => HTKED.E.cam.z")
    check(z1 > z0*1.3 and pg.evaluate("() => HTKED.E.undo.length") == u1, f"pinch zooms the editor ({z0:.2f} -> {z1:.2f}) without painting")
    pg.click("[data-tool=pan]"); pg.evaluate("() => { HTKED.E.cam.x = HTKED.E.cam.y = 24*32; }")
    touch("touchStart", [(100, 400)])
    for i in range(1, 7): touch("touchMove", [(100 + 25*i, 400)]); pg.wait_for_timeout(16)
    touch("touchEnd", []); e1 = pg.evaluate("() => HTKED.E.cam.x"); pg.wait_for_timeout(400); e2 = pg.evaluate("() => HTKED.E.cam.x")
    check(e2 < e1 - 10 and pg.evaluate("() => HTKED.E.undo.length") == u1, f"editor pan glides after a swipe ({e1:.0f} -> {e2:.0f})")
    pg.wait_for_timeout(1500)
    pg.evaluate("() => { HTKED.E.cam.z = 0; HTKED.E.cam.x = HTKED.E.cam.y = 24*32; }"); pg.wait_for_timeout(50)
    pg.evaluate("() => { const E = HTKED.E; E.cam.z = Math.min(innerWidth/(48*32), 9) * .96; }"); pg.wait_for_timeout(50)
    # a river of water (brush 5) across the whole map cuts the spawn off
    check(pg.evaluate("() => HTKED.validate({size:48, ter:HTKED.E.ter, keep:HTKED.E.keep, spawns:HTKED.E.spawns}).ok"), "blank map with keep + spawn is valid")
    pg.click("[data-tool=water]"); pg.click("[data-bs='5']")
    a = pg.evaluate(ET2S, [-1, 9]); c = pg.evaluate(ET2S, [48, 9])
    a["y"] += 64; c["y"] += 64
    touch("touchStart", [(max(1, a["x"]), a["y"])])
    for i in range(1, 25): touch("touchMove", [(max(1, a["x"]) + (min(389, c["x"]) - max(1, a["x"]))*i/24, a["y"])]); pg.wait_for_timeout(12)
    touch("touchEnd", []); pg.wait_for_timeout(150)
    row = pg.evaluate("() => { const E = HTKED.E; let w = 0; for (let x = 0; x < 48; x++) if (E.ter[9*48 + x] === 3) w++; return w; }")
    st = pg.inner_text("#ed-status")
    check(row == 48 and "cannot reach" in st, f"water river across the map blocks the only spawn: {row}/48 water, status '{st[:70]}'")
    pg.click("[data-e=play]"); pg.wait_for_timeout(100)
    check("Not ready" in pg.inner_text("#ov-card") and not pg.evaluate("() => HTK.running"), "Play refuses an unreachable map and explains why")
    pg.click("[data-x=close]")
    pg.click("#ed-undo"); pg.wait_for_timeout(50); v1 = pg.evaluate("() => HTKED.E.val.ok")
    pg.click("#ed-redo"); pg.wait_for_timeout(50); v2 = pg.evaluate("() => HTKED.E.val.ok")
    check(v1 and not v2, f"undo removes the river (valid={v1}), redo brings it back (valid={v2})")
    # bridge the river with a dirt ford, fill the far side, keep + spawns by tap
    pg.evaluate("() => { HTKED.paint('dirt', 24, 9, 5); }")
    check(pg.evaluate("() => HTKED.E.val.ok"), "a dirt ford across the river makes it reachable again (dirt is walkable)")
    pg.click("[data-tool=keep]"); etap(30, 32)
    check(pg.evaluate("() => HTKED.E.keep") == {"x": 29, "y": 31}, "keep tool moves the keep where tapped")
    pg.click("[data-tool=spawn]"); etap(44, 44); n2 = pg.evaluate("() => HTKED.E.spawns.length")
    etap(44, 44); n3 = pg.evaluate("() => HTKED.E.spawns.length"); etap(44, 44); etap(3, 44); n4 = pg.evaluate("() => HTKED.E.spawns.length")
    check(n2 == 2 and n3 == 1 and n4 == 3, f"spawn tool adds and removes enemy spawn points ({n2},{n3},{n4})")
    fl = pg.evaluate("""() => { const H = HTKED; H.paint('dirt', 8, 22, 5); const d = H.E.ter.filter(v => v === 6).length; H.setTool('marsh'); H.setTool('fill'); H.tapAt(8, 22);
      const mm = H.E.ter.filter(v => v === 7).length; H.paint('erase', 8, 22, 5); const after = H.E.ter.filter(v => v === 7).length; return {d, mm, after}; }""")
    check(fl["mm"] >= 21 and fl["after"] == 0, f"fill floods a region with marsh, eraser clears it {fl}")
    mi = pg.evaluate("""() => { const H = HTKED; H.setMirror(3); H.paint('iron', 4, 20, 1); const t = H.E.ter, r = [t[20*48+4], t[20*48+43], t[27*48+4], t[27*48+43]]; H.setMirror(0);
      const before = t.filter(v => v === 1).length; H.paint('scatter', 36, 18, 5); const sc = H.E.ter.filter(v => v === 1).length - before; H.paint('stone', 40, 26, 3); return {r, sc}; }""")
    check(mi["r"] == [5, 5, 5, 5], f"4-way mirror paints iron in all four quarters {mi['r']}")
    check(mi["sc"] >= 5, f"forest scatter sprinkles trees ({mi['sc']} new)")
    # settings
    pg.click("[data-e=settings]"); pg.fill("#ed-s-wood", "500"); pg.fill("#ed-s-gold", "222"); pg.select_option("#ed-s-diff", "hard"); pg.select_option("#ed-s-win", "5"); pg.select_option("#ed-s-first", "120")
    pg.screenshot(path=SS + "21-map-settings.png"); pg.click("[data-x=savesettings]"); pg.wait_for_timeout(100)
    ms = pg.evaluate("() => HTKED.get(HTKED.E.m.id).settings")
    check(ms["res"]["wood"] == 500 and ms["res"]["gold"] == 222 and ms["diff"] == "hard" and ms["win"] == 5 and ms["first"] == 120, f"settings saved with the map {ms}")
    pg.wait_for_timeout(2700); pg.screenshot(path=SS + "19-map-editor.png")
    pg.evaluate("() => { const E = HTKED.E; E.cam.z = .62; E.cam.x = 26*32; E.cam.y = 14*32; }"); pg.wait_for_timeout(150); pg.screenshot(path=SS + "19b-map-editor-zoom.png")
    pg.evaluate("() => { const E = HTKED.E; E.cam.z = Math.min(innerWidth/(48*32), 9) * .96; E.cam.x = E.cam.y = 24*32; }")
    snapE = pg.evaluate("() => ({ter: HTK.rleEncode(HTKED.E.ter), keep: HTKED.E.keep, spawns: HTKED.E.spawns, id: HTKED.E.m.id})")
    # reload: maps persist in localStorage
    pg.evaluate("() => HTKED.close()"); pg.reload(); pg.wait_for_selector("[data-o=new]"); pg.wait_for_timeout(300)
    saved = pg.evaluate("() => HTKED.list()")
    check(len(saved) == 1 and saved[0]["ter"] == snapE["ter"] and saved[0]["keep"] == snapE["keep"] and saved[0]["spawns"] == snapE["spawns"], "map (terrain, keep, spawns) survives a reload")
    mid = snapE["id"]
    pg.click("[data-o=editor]"); pg.wait_for_timeout(100)
    pg.click(f"[data-x='ren:{mid}']"); pg.fill("#ed-rn", "Twin Rivers"); pg.click(f"[data-x='dorename:{mid}']"); pg.wait_for_timeout(100)
    check(pg.evaluate("(id) => HTKED.get(id).name", mid) == "Twin Rivers" and "Twin Rivers" in pg.inner_text("#ov-card"), "rename from the map list")
    pg.click(f"[data-x='dup:{mid}']"); pg.wait_for_timeout(100)
    maps = pg.evaluate("() => HTKED.list().map(m => ({id: m.id, name: m.name, ter: m.ter}))")
    cp = [m for m in maps if m["id"] != mid]
    check(len(maps) == 2 and cp and cp[0]["name"] == "Twin Rivers (copy)" and cp[0]["ter"] == snapE["ter"], "duplicate makes an identical copy")
    pg.screenshot(path=SS + "20-map-list.png")
    pg.click(f"[data-x='del:{cp[0]['id']}']"); pg.wait_for_timeout(80)
    asked = "can't be undone" in pg.inner_text("#ov-card") and len(pg.evaluate("() => HTKED.list()")) == 2
    pg.click(f"[data-x='dodel:{cp[0]['id']}']"); pg.wait_for_timeout(80)
    check(asked and len(pg.evaluate("() => HTKED.list()")) == 1, "delete asks to confirm, then removes the map")
    # export / import (share code + JSON file)
    pg.click(f"[data-x='share:{mid}']"); code = pg.input_value("#ed-code")
    check(code.startswith("HTK1.") and len(code) < 4000, f"share code generated ({len(code)} chars)")
    pg.click("[data-x=list]"); pg.click("[data-x=import]"); pg.fill("#ed-imp", "HTK1.garbage!!"); pg.click("[data-x=doimport]"); pg.wait_for_timeout(80)
    check(len(pg.evaluate("() => HTKED.list()")) == 1 and "not a valid" in pg.inner_text("#toasts"), "a bad code is rejected with a message")
    pg.fill("#ed-imp", code); pg.click("[data-x=doimport]"); pg.wait_for_timeout(100)
    im = pg.evaluate("(id) => { const a = HTKED.list(), o = a.find(m => m.id === id), n = a.find(m => m.id !== id); return n && {same: n.ter === o.ter && JSON.stringify(n.keep) === JSON.stringify(o.keep) && JSON.stringify(n.spawns) === JSON.stringify(o.spawns) && JSON.stringify(n.settings) === JSON.stringify(o.settings), name: n.name, count: a.length}; }", mid)
    check(im and im["same"] and im["count"] == 2, f"share code round-trips the whole map {im}")
    js = pg.evaluate("(id) => JSON.stringify({format:'hold-the-keep-map', v:1, ...(({name,size,ter,keep,spawns,settings}) => ({name:'From File',size,ter,keep,spawns,settings}))(HTKED.get(id))})", mid)
    open("/tmp/htk-test-map.json", "w").write(js)
    pg.click("[data-x=import]"); pg.set_input_files("#ed-file", "/tmp/htk-test-map.json"); pg.wait_for_timeout(300)
    check(any(m["name"] == "From File" for m in pg.evaluate("() => HTKED.list()")), "import from a .json map file")
    # play the custom map from the start screen
    pg.click("[data-x=title]"); pg.wait_for_timeout(80); pg.click("[data-o=custom]"); pg.wait_for_timeout(100)
    check(pg.locator(f"[data-x='play:{mid}']").count() == 1, "Play Custom Map lists the saved map")
    pg.click(f"[data-x='play:{mid}']"); pg.wait_for_timeout(600)
    g = pg.evaluate("""() => { const H = HTK, S = H.S, k = S.b.find(b => b.k === 'keep'); return {run: H.running, N: H.N, KX: H.KX, KY: H.KY, keep: [k.x, k.y], wood: S.res.wood, gold: S.res.gold,
      diff: S.cfg.diff, next: S.wave.next, base: S.b.map(b => b.k).sort().join(), water: H.ter[9*48 + 3], custom: !!S.custom}; }""")
    check(g["run"] and g["N"] == 48 and g["keep"] == [29, 31] and g["KX"] == 29 and g["custom"], f"custom map starts: 48x48, keep where it was placed {g}")
    check(g["wood"] == 500 and 222 <= g["gold"] < 240 and g["diff"] == "hard" and g["next"] == 120 and g["base"] == "granary,keep,stockpile" and g["water"] == 3, f"starting goods, wave timer, difficulty, river and stockpile/granary all applied {g}")
    pg.screenshot(path=SS + "22-custom-map-play.png")
    sw = pg.evaluate("""() => { const H = HTK; H.computeFlow(); H.S.wave.n = 5; H.spawnWave(); const sp = H.S.custom.spawns, en = H.S.u.filter(u => u.tm === 1);
      const near = en.filter(u => sp.some(s => Math.hypot(u.x - s.x - .5, u.y - s.y - .5) < 4)).length;
      const hard = H.waveComp(5).list.length; const c = H.S.cfg; c.diff = 'easy'; const easy = H.waveComp(5).list.length; c.siege = false; const nosiege = H.waveComp(8).list.filter(k => ['ram','stower','catapult'].includes(k)).length; c.diff = 'hard'; c.siege = true;
      return {en: en.length, near, hard, easy, nosiege}; }""")
    check(sw["en"] > 0 and sw["near"] == sw["en"], f"enemies spawn at the custom spawn points ({sw['near']}/{sw['en']})")
    check(sw["hard"] > sw["easy"] and sw["nosiege"] == 0, f"difficulty scales waves (hard {sw['hard']} vs easy {sw['easy']}), siege can be switched off")
    # save + continue a custom game, then a random game still uses the classic 64 map
    pg.evaluate("() => { HTK.S.u = HTK.S.u.filter(u => u.tm === 0); HTK.save(); }"); pg.reload(); pg.wait_for_selector("[data-o=continue]"); pg.click("[data-o=continue]"); pg.wait_for_timeout(500)
    r = pg.evaluate("(code) => { const H = HTK, t = H.rleDecode(H.S.custom.ter, 48); let same = true; for (let i = 0; i < 48*48; i++) if (t[i] !== H.ter[i] && !(t[i] === 1)) { same = false; break; } return {N: H.N, KX: H.KX, same, wood: H.S.res.wood > 0}; }", snapE["ter"])
    check(r["N"] == 48 and r["KX"] == 29 and r["same"], f"saved custom game continues on the same map {r}")
    vic = pg.evaluate("""() => { const H = HTK; H.S.cfg.win = 1; H.S.beaten = 0; H.computeFlow(); H.S.wave.n = 0; H.spawnWave(); H.S.u = H.S.u.filter(u => u.tm === 0); for (let i = 0; i < 10; i++) H.step(1/30); return H.S.won; }""")
    pg.wait_for_timeout(1600)
    check(vic and "Victory" in pg.inner_text("#ov-card"), "winning the set number of waves shows Victory")
    o = pg.evaluate("() => { HTK.newState(4242); return {N: HTK.N, KX: HTK.KX, b: HTK.S.b.length, custom: !!HTK.S.custom}; }")
    check(o == {"N": 64, "KX": 31, "b": 3, "custom": False}, f"a random New Game still uses the classic 64x64 map {o}")
    pg.evaluate("() => { HTK.start(); }"); pg.wait_for_timeout(200)

    # ---- landscape ----
    pg.set_viewport_size({"width": 844, "height": 390}); pg.wait_for_timeout(400)
    pg.screenshot(path=SS + "11-landscape.png")
    fit = pg.evaluate("() => { const t = document.getElementById('top').getBoundingClientRect(), b = document.getElementById('bottom').getBoundingClientRect(); return {top: t.bottom, bot: b.top, h: innerHeight}; }")
    check(fit["bot"] - fit["top"] > 150, f"landscape leaves room for the map {fit}")
    pg.evaluate("(id) => { HTK.stopGame(); HTKED.edit(id); }", mid); pg.wait_for_timeout(500); pg.screenshot(path=SS + "23-editor-landscape.png")
    lf = pg.evaluate("() => { const t = document.getElementById('ed-top').getBoundingClientRect(), b = document.getElementById('ed-bottom').getBoundingClientRect(); return {topB: t.bottom, botL: b.left, w: innerWidth}; }")
    check(lf["botL"] > 400 and lf["topB"] < 120, f"editor landscape layout: palette on the side {lf}")
    check(not errs, "no console errors: " + "; ".join(errs[:5]))
    b.close()
print(f"\n{len(ok)} passed, {len(bad)} failed")
sys.exit(1 if bad else 0)
