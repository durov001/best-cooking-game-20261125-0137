// shots.js — deterministic states for the 4 screenshots, plus a
// headless smoke test that drives the real code paths.

import { DISHES, isUnlocked } from './recipes.js';
import { makeTicket, spawnTicket } from './orders.js';
import { startCooking, updateStep, stepPointerDown, stepPointerMove, stepPointerUp, servePlate, enterStep } from './steps.js';

function baseSetup(G, resetGame) {
  resetGame();
  G.frozen = true; // freeze timer + patience for a stable picture
  G.shiftLeft = 97; // 01:37 on the clock
  G.served = { kimchi: 3, bibimbap: 0, tteokbokki: 0 };
  G.tickets = [
    makeTicket('kimchi', 0, 40, 0),
    makeTicket('bibimbap', 1, 36, 0),
    makeTicket('kimchi', 2, 30, 0),
  ];
  for (const t of G.tickets) { t.patience = t.patienceMax * 0.8; }
}

function jumpToStep(G, kind) {
  const cur = G.current;
  const idx = cur.dish.steps.indexOf(kind);
  cur.stepIdx = idx;
  enterStep(G);
}

export function applyShot(G, shot, resetGame, startCookingFn) {
  if (shot === 'cover') {
    baseSetup(G, resetGame);
    const t = G.tickets[0];
    startCookingFn(G, t);
    jumpToStep(G, 'grate');
    const s = G.current.step;
    s.tool = 'lebar';
    s.progress = 55;
    s.shreds = 6;
    // a finished plate already waits on the pass
    G.readyPlate = { dishId: 'kimchi', ticket: G.tickets[2], _x: 0, _y: 0, _w: 0, _h: 0 };
    G.coins = 36;
    G.combo = 2;
  } else if (shot === 'collect') {
    baseSetup(G, resetGame);
    startCookingFn(G, G.tickets[0]);
    const s = G.current.step;
    const ids = [...s.spots].slice(0, 2).map((sp) => sp.id);
    for (const id of ids) s.collected.add(id);
    G.chef.x = 420; G.chef.y = 480;
  } else if (shot === 'chop') {
    baseSetup(G, resetGame);
    startCookingFn(G, G.tickets[0]);
    jumpToStep(G, 'chop');
    G.current.step.chops = 1;
    G.current.step.pieces = 2;
  } else if (shot === 'serve') {
    baseSetup(G, resetGame);
    const t = G.tickets[2];
    startCookingFn(G, t);
    jumpToStep(G, 'assemble');
    G.current.step.t = 1.2;
    G.current.step.ready = true;
    G.popups.push({ x: 640, y: 180, text: '+$18  ★★★', color: '#b8860b', until: 1e12, big: true });
    G.popups.push({ x: 640, y: 560, text: 'Bimo senang! 😊', color: '#2f8f2f', until: 1e12 });
    G.coins = 54;
    G.combo = 4;
  }
}

// -- headless smoke test ----------------------------------------------------

export async function runSelfTest(G, resetGame, startCookingFn) {
  const results = [];
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
  const check = (name, ok) => { results.push({ name, pass: !!ok }); console.log(`SELFTEST ${ok ? 'PASS' : 'FAIL'}: ${name}`); };
  // NOTE: setTimeout, not requestAnimationFrame — rAF does not advance
  // under headless virtual-time fast-forward, setTimeout does.
  const frame = () => new Promise((r) => setTimeout(r, 0));
  let now = 1000;
  const tick = (dt) => { now += dt * 1000; G.now = now; updateStep(G, dt); };

  try {
    resetGame();
    check('game starts in kitchen with 2 tickets', G.mode === 'kitchen' && G.tickets.length === 2);

    // cook kimchi three times (unlocks bibimbap on the third)
    for (let round = 1; round <= 3; round++) {
      // the live game spawns tickets over time via updateTickets; the
      // test drives the spawner directly when the board runs dry
      if (!G.tickets.some((t) => t.state === 'waiting' && t.dishId === 'kimchi')) spawnTicket(G, now);
      const ticket = G.tickets.find((t) => t.state === 'waiting' && t.dishId === 'kimchi');
      if (!ticket) { check(`round ${round}: kimchi ticket exists`, false); break; }
      startCookingFn(G, ticket);
      check(`round ${round}: cooking starts at collect`, G.mode === 'step' && G.current.step.kind === 'collect');

      // collect: click each spot, walk there until taken
      for (const sp of [...G.current.step.spots]) {
        stepPointerDown(G, sp.x, sp.y);
        let guard = 0;
        while (G.current && G.current.step.kind === 'collect' && !G.current.step.collected.has(sp.id) && guard++ < 400) {
          tick(0.05);
          await frame();
        }
      }
      check(`round ${round}: all ingredients collected`, G.current && G.current.step.kind === 'chop');

      // chop: three swipes down
      for (let i = 0; i < 3; i++) {
        stepPointerDown(G, 640, 300);
        stepPointerMove(G, 640, 400);
        stepPointerUp(G);
      }
      check(`round ${round}: chopping done`, G.current && G.current.step.kind === 'pour');

      // pour: drag the pitcher onto the bowl and hold
      stepPointerDown(G, 950, 330);
      for (let i = 0; i < 90 && G.current && G.current.step.kind === 'pour'; i++) {
        stepPointerMove(G, 520, 400);
        await frame();
      }
      stepPointerUp(G);
      check(`round ${round}: pouring done`, G.current && G.current.step.kind === 'stir');

      // stir: two full circles
      stepPointerDown(G, 740, 400);
      for (let a = 0.2; a <= Math.PI * 4 + 0.2 && G.current && G.current.step.kind === 'stir'; a += 0.2) {
        stepPointerMove(G, 640 + Math.cos(a) * 100, 400 + Math.sin(a) * 100);
      }
      stepPointerUp(G);
      check(`round ${round}: stirring done`, G.current && G.current.step.kind === 'grate');

      // grate: wrong tool first → instant feedback
      stepPointerDown(G, 160, 270); // halus (wrong for wortel)
      stepPointerDown(G, 640, 300);
      stepPointerMove(G, 700, 300);
      stepPointerMove(G, 660, 300);
      stepPointerUp(G);
      check(`round ${round}: wrong tool warns at once`, G.current.step.hint !== '' && G.current.mistakes === 1);
      // right tool: lebar
      stepPointerDown(G, 160, 360);
      stepPointerDown(G, 640, 300);
      let x = 640, guard = 0;
      while (G.current && G.current.step.kind === 'grate' && guard++ < 60) {
        x = x === 700 ? 580 : 700;
        stepPointerMove(G, x, 300);
      }
      stepPointerUp(G);
      check(`round ${round}: grating done`, G.current && G.current.step.kind === 'assemble');

      // assemble: wait for the plate, then serve button
      for (let i = 0; i < 20 && G.current && !G.current.step.ready; i++) tick(0.1);
      check(`round ${round}: plate ready (SIAP!)`, G.current && G.current.step.ready);
      stepPointerDown(G, 640, 630);
      check(`round ${round}: chain finished, plate on pass`, G.mode === 'kitchen' && !!G.readyPlate);

      // serve at the pass
      const coinsBefore = G.coins;
      const ok = servePlate(G, now);
      check(`round ${round}: serve pays coins + combo`, ok && G.coins > coinsBefore && G.combo === round);
    }
    check('bibimbap unlocked after 3 kimchi', isUnlocked('bibimbap', G.served));
    check('served 3 kimchi, 3 stars or more', G.servedTotal === 3 && G.stars >= 3);
    check('no console errors during the whole run', errors.length === 0);
  } catch (e) {
    errors.push(String(e && e.message ? e.message : e));
    check('selftest ran without exception', false);
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const summary = `SELFTEST ${passed}/${total} PASS`;
  console.log(summary);
  document.title = summary;
  let div = document.getElementById('selftest');
  if (!div) { div = document.createElement('div'); div.id = 'selftest'; document.body.appendChild(div); }
  div.textContent = [summary, ...results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`), ...errors.map((e) => 'ERROR ' + e)].join('\n');
  return { passed, total };
}
