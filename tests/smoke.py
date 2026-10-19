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
      H.S.res.wood = 900; H.S.res.stone = 900; H.S.res.gold = 400; H.S.res.food = 300;
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
        pg.evaluate("""() => { const H = HTK, r0 = H.KX - 9, r1 = H.KX + 11; H.S.res.stone += 80; H.S.res.gold += 60; H.S.res.wood += 20;
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

    # ---- landscape ----
    pg.set_viewport_size({"width": 844, "height": 390}); pg.wait_for_timeout(400)
    pg.screenshot(path=SS + "11-landscape.png")
    fit = pg.evaluate("() => { const t = document.getElementById('top').getBoundingClientRect(), b = document.getElementById('bottom').getBoundingClientRect(); return {top: t.bottom, bot: b.top, h: innerHeight}; }")
    check(fit["bot"] - fit["top"] > 150, f"landscape leaves room for the map {fit}")
    check(not errs, "no console errors: " + "; ".join(errs[:5]))
    b.close()
print(f"\n{len(ok)} passed, {len(bad)} failed")
sys.exit(1 if bad else 0)
