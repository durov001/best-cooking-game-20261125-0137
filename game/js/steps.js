// steps.js — the lesson chain: one tactile mini-step at a time.
// collect → chop → pour → stir → grate → assemble. Each step is its
// own scene with a cartoon tutorial hand and purely visual cues.
// A wrong tool gives INSTANT feedback (shake + hint) — the reference
// game silently stalled there, which is exactly what we fix.

import { DISHES, GRATERS } from './recipes.js';
import { IMAGES, rr, circle, drawIngredient, drawHand, drawDishPhoto } from './art.js';
import { collectSpots, drawSilhouetteTray, drawTutorialHandAt, drawChef, updateChef, W, H } from './kitchen.js';
import { sfx } from './audio.js';

export function startCooking(G, ticket) {
  const dish = DISHES[ticket.dishId];
  ticket.state = 'cooking';
  G.current = { ticket, dish, stepIdx: 0, mistakes: 0, step: null, flash: 0, flashText: '' };
  G.mode = 'step';
  G.chef.x = 640; G.chef.y = 560; G.chef.tx = null; G.chef.ty = null;
  enterStep(G);
  sfx.ding();
}

export function abortCooking(G, reason) {
  if (G.current) {
    G.banner = { text: reason, until: G.now + 2500, color: '#d92626' };
    G.current = null;
  }
  G.mode = 'kitchen';
}

function stepLabel(G) {
  const s = G.current.step;
  const d = G.current.dish;
  if (s.kind === 'collect') return 'KUMPUL — klik bahan yang cocok!';
  if (s.kind === 'chop') return 'POTONG — ' + d.chopLabel;
  if (s.kind === 'pour') return 'TUANG — ' + d.pourLabel;
  if (s.kind === 'stir') return 'ADUK — aduk melingkar sampai rata!';
  if (s.kind === 'grate') return 'PARUT — ' + d.grateLabel;
  if (s.kind === 'assemble') return 'RAKIT — susun hidangannya!';
  return '';
}

export function enterStep(G) {
  const cur = G.current;
  const kind = cur.dish.steps[cur.stepIdx];
  cur.stepLabel = stepLabel({ current: { ...cur, step: { kind } }, now: G.now });
  cur.labelUntil = G.now + 1800;
  if (kind === 'collect') {
    cur.step = { kind, spots: collectSpots(cur.dish), collected: new Set() };
  } else if (kind === 'chop') {
    cur.step = { kind, chops: 0, needed: 3, pieces: 0, downY: null, downX: null };
  } else if (kind === 'pour') {
    cur.step = { kind, fill: 0, dragging: false, px: 950, py: 330, auto: false, stream: [] };
  } else if (kind === 'stir') {
    cur.step = { kind, angle: 0, last: null, dragging: false, mix: 0 };
  } else if (kind === 'grate') {
    cur.step = { kind, tool: null, progress: 0, shake: 0, hint: '', hintUntil: 0, warned: new Set(), shreds: 0, lastX: null, dragging: false };
  } else if (kind === 'assemble') {
    cur.step = { kind, t: 0, ready: false };
  }
}

function completeStep(G) {
  const cur = G.current;
  cur.flash = 0.7;
  cur.flashText = 'Bagus! ✓';
  sfx.ding();
  cur.stepIdx++;
  if (cur.stepIdx >= cur.dish.steps.length) {
    // chain finished: the plate waits on the pass
    G.lastMistakes = cur.mistakes;
    G.readyPlate = { dishId: cur.dish.id, ticket: cur.ticket, _x: 0, _y: 0, _w: 0, _h: 0 };
    G.current = null;
    G.mode = 'kitchen';
    G.banner = { text: `${cur.dish.name} siap disajikan!`, until: G.now + 2500, color: '#2f8f2f' };
  } else {
    enterStep(G);
  }
}

export function updateStep(G, dt) {
  const cur = G.current;
  if (!cur) return;
  if (cur.flash > 0) cur.flash -= dt;
  const s = cur.step;
  if (s.kind === 'collect') {
    updateChef(G, dt, G.keys);
    // arrive at a spot → collect it
    for (const sp of s.spots) {
      if (s.collected.has(sp.id)) continue;
      if (Math.hypot(G.chef.x - sp.x, G.chef.y - sp.y) < 46) {
        s.collected.add(sp.id);
        sfx.collect();
        G.popups.push({ x: sp.x, y: sp.y - 30, text: sp.name + ' ✓', color: '#2f8f2f', until: G.now + 900 });
        if (s.collected.size === s.spots.length) completeStep(G);
        break;
      }
    }
  } else if (s.kind === 'pour') {
    if (s.auto) {
      s.fill += dt / 1.0;
      if (Math.random() < 0.5) s.stream.push({ x: 520 + (Math.random() - 0.5) * 30, y: 380, vy: 260 });
      if (s.fill >= 1) { s.fill = 1; completeStep(G); }
    }
    s.stream = s.stream.filter((p) => { p.y += p.vy * dt; return p.y < 470; });
  } else if (s.kind === 'grate') {
    if (s.shake > 0) s.shake -= dt;
  } else if (s.kind === 'assemble') {
    if (!s.ready) {
      s.t += dt;
      if (s.t >= 1.2) { s.ready = true; sfx.ding(); }
    }
  }
}

// -- pointer input ---------------------------------------------------------

export function stepPointerDown(G, x, y) {
  const cur = G.current;
  if (!cur) return;
  const s = cur.step;
  if (s.kind === 'collect') {
    // click a spot → walk there; click empty floor → walk there
    let best = null, bestD = 1e9;
    for (const sp of s.spots) {
      if (s.collected.has(sp.id)) continue;
      const d = Math.hypot(x - sp.x, y - sp.y);
      if (d < bestD) { bestD = d; best = sp; }
    }
    if (best && bestD < 70) { G.chef.tx = best.x; G.chef.ty = best.y; }
    else { G.chef.tx = x; G.chef.ty = y; }
  } else if (s.kind === 'chop') {
    s.downY = y; s.downX = x;
  } else if (s.kind === 'pour') {
    if (Math.hypot(x - s.px, y - s.py) < 70) { s.dragging = true; }
    else if (Math.hypot(x - 520, y - 400) < 90) { s.auto = true; sfx.pour(); }
  } else if (s.kind === 'stir') {
    if (Math.hypot(x - 640, y - 400) < 130) {
      s.dragging = true;
      s.last = Math.atan2(y - 400, x - 640);
    }
  } else if (s.kind === 'grate') {
    // tool buttons on the left panel
    for (let i = 0; i < GRATERS.length; i++) {
      const by = 240 + i * 90;
      if (x > 70 && x < 250 && y > by - 32 && y < by + 32) {
        s.tool = GRATERS[i].id;
        sfx.click();
        return;
      }
    }
    // grab the mounted tool
    if (s.tool && Math.hypot(x - 640, y - 300) < 70) { s.dragging = true; s.lastX = x; }
  } else if (s.kind === 'assemble') {
    if (s.ready && x > 540 && x < 740 && y > 600 && y < 660) completeStep(G);
  }
}

export function stepPointerMove(G, x, y) {
  const cur = G.current;
  if (!cur) return;
  const s = cur.step;
  if (s.kind === 'chop' && s.downY !== null) {
    const dy = y - s.downY;
    if (dy > 70 && Math.abs(x - s.downX) < 120) {
      s.chops++;
      s.pieces++;
      sfx.chop();
      s.downY = null;
      if (s.chops >= s.needed) completeStep(G);
    }
  } else if (s.kind === 'pour' && s.dragging) {
    s.px = x; s.py = y;
    if (Math.hypot(x - 520, y - 400) < 100) {
      s.fill += 0.012;
      if (Math.random() < 0.6) s.stream.push({ x: s.px, y: s.py + 30, vy: 300 });
      if (s.fill >= 1) { s.fill = 1; s.dragging = false; completeStep(G); }
    }
  } else if (s.kind === 'stir' && s.dragging) {
    const a = Math.atan2(y - 400, x - 640);
    if (s.last !== null) {
      let d = a - s.last;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (d > 0) { s.angle += d; s.mix = Math.min(1, s.angle / (Math.PI * 4)); sfx.stir(); }
    }
    s.last = a;
    if (s.angle >= Math.PI * 4) completeStep(G);
  } else if (s.kind === 'grate' && s.dragging) {
    const dx = x - (s.lastX ?? x);
    s.lastX = x;
    const correct = s.tool === cur.dish.grateTool;
    if (!correct) {
      if (!s.warned.has(s.tool)) {
        s.warned.add(s.tool);
        s.shake = 0.5;
        s.hint = 'Bukan alat ini, coba yang lain!';
        s.hintUntil = G.now + 2000;
        cur.mistakes++;
        sfx.wrong();
      }
      return;
    }
    const gain = Math.abs(dx) / 100 * 8;
    if (gain > 0) {
      s.progress = Math.min(100, s.progress + gain);
      s.shreds = Math.floor(s.progress / 8);
      if (Math.random() < 0.4) sfx.grate();
      if (s.progress >= 100) completeStep(G);
    }
  }
}

export function stepPointerUp(G) {
  const cur = G.current;
  if (!cur) return;
  const s = cur.step;
  if (s.kind === 'chop') { s.downY = null; s.downX = null; }
  if (s.kind === 'pour') s.dragging = false;
  if (s.kind === 'stir') { s.dragging = false; s.last = null; }
  if (s.kind === 'grate') { s.dragging = false; s.lastX = null; }
}

export function stepKeyDown(G, key) {
  const cur = G.current;
  if (!cur) return;
  const s = cur.step;
  if (s.kind === 'collect' && key === 'e') {
    for (const sp of s.spots) {
      if (!s.collected.has(sp.id) && Math.hypot(G.chef.x - sp.x, G.chef.y - sp.y) < 60) {
        s.collected.add(sp.id);
        sfx.collect();
        if (s.collected.size === s.spots.length) completeStep(G);
        break;
      }
    }
  } else if (s.kind === 'chop' && key === ' ') {
    s.chops++;
    s.pieces++;
    sfx.chop();
    if (s.chops >= s.needed) completeStep(G);
  } else if (s.kind === 'pour' && key === 'p') {
    s.auto = true; sfx.pour();
  }
}

// -- drawing ----------------------------------------------------------------

function stepChrome(ctx, G) {
  const cur = G.current;
  ctx.save();
  ctx.fillStyle = 'rgba(58,42,24,0.85)';
  rr(ctx, 340, 112, 600, 40, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${cur.dish.name} — ${cur.stepIdx + 1}/${cur.dish.steps.length}`, 640, 132);
  if (cur.labelUntil > G.now) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(cur.stepLabel, 640, 172);
  }
  if (cur.flash > 0) {
    ctx.globalAlpha = Math.min(1, cur.flash / 0.4);
    ctx.fillStyle = '#2f8f2f';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(cur.flashText, 640, 300);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawStepScene(ctx, G, now) {
  const cur = G.current;
  if (!cur) return;
  const s = cur.step;
  const dish = cur.dish;
  ctx.save();
  if (s.kind === 'collect') {
    // kitchen counters with ingredient spots
    ctx.fillStyle = '#c98f4e';
    rr(ctx, 90, 210, 1100, 220, 18); ctx.fill();
    ctx.fillStyle = '#a86f35';
    rr(ctx, 90, 210, 1100, 26, 12); ctx.fill();
    for (const sp of s.spots) {
      const got = s.collected.has(sp.id);
      ctx.save();
      if (!got) {
        ctx.fillStyle = '#fffdf5';
        circle(ctx, sp.x, sp.y, 44); ctx.fill();
        ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = 3; circle(ctx, sp.x, sp.y, 44); ctx.stroke();
        drawIngredient(ctx, sp.kind, sp.color, sp.x, sp.y, 26);
      } else {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fffdf5';
        circle(ctx, sp.x, sp.y, 44); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2f8f2f';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', sp.x, sp.y - 8);
      }
      ctx.restore();
    }
    drawChef(ctx, G, now);
    // tutorial hand over the nearest uncollected spot
    const next = s.spots.find((sp) => !s.collected.has(sp.id));
    if (next) drawTutorialHandAt(ctx, next.x + 40, next.y - 60, now);
    drawSilhouetteTray(ctx, dish, s.collected);
  } else if (s.kind === 'chop') {
    ctx.fillStyle = '#a86f35';
    rr(ctx, 340, 240, 600, 260, 18); ctx.fill();
    ctx.fillStyle = '#ffe9c9';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TALENAN', 640, 262);
    // dashed swipe line
    ctx.save();
    ctx.strokeStyle = '#ff5fa2';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(640, 300); ctx.lineTo(640, 470); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8a2bb5';
    ctx.beginPath(); ctx.moveTo(640, 490); ctx.lineTo(626, 462); ctx.lineTo(654, 462); ctx.closePath(); ctx.fill();
    circle(ctx, 640, 292, 8); ctx.fill();
    ctx.restore();
    const ing = dish.ingredients.find((i) => i.id === dish.chopTarget);
    if (ing && s.chops < s.needed) {
      const sc = 1 - s.chops * 0.18;
      drawIngredient(ctx, ing.kind, ing.color, 640, 380, 70 * sc);
    }
    // chopped pieces in the bowl, below the board
    ctx.fillStyle = '#3da53d';
    ctx.beginPath(); ctx.ellipse(640, 545, 130, 34, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#2f7f2f'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < s.pieces * 2; i++) {
      ctx.fillStyle = ing ? ing.color : '#7ec850';
      const px = 560 + (i * 37) % 150, py = 533 + (i % 2) * 10;
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(58,42,24,0.85)';
    rr(ctx, 540, 584, 200, 30, 10); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`Potongan: ${s.chops}/${s.needed}`, 640, 600);
    if (s.chops === 0) drawTutorialHandAt(ctx, 700, 330, now);
  } else if (s.kind === 'pour') {
    // bowl
    ctx.fillStyle = '#3da53d';
    ctx.beginPath(); ctx.ellipse(520, 430, 130, 40, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#2f7f2f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#5db9e8';
    ctx.beginPath(); ctx.ellipse(520, 424, 120 * s.fill, 26 * s.fill, 0, 0, Math.PI * 2); ctx.fill();
    // pitcher
    ctx.save();
    ctx.translate(s.px, s.py);
    const tilt = s.dragging && Math.hypot(s.px - 520, s.py - 400) < 120 ? -0.7 : 0;
    ctx.rotate(tilt);
    ctx.fillStyle = '#5db9e8';
    rr(ctx, -30, -40, 60, 80, 10); ctx.fill();
    ctx.strokeStyle = '#2f7fa8'; ctx.lineWidth = 3; rr(ctx, -30, -40, 60, 80, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, -20); ctx.quadraticCurveTo(52, -10, 46, 14); ctx.lineTo(30, 14); ctx.closePath(); ctx.fill();
    ctx.restore();
    for (const p of s.stream) {
      ctx.fillStyle = '#5db9e8';
      circle(ctx, p.x, p.y, 5); ctx.fill();
    }
    ctx.fillStyle = '#3a2a18';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Seret teko ke mangkuk, tahan di sana!', 640, 600);
    // fill bar
    ctx.fillStyle = '#eadfc8';
    rr(ctx, 460, 500, 240, 16, 8); ctx.fill();
    ctx.fillStyle = '#5db9e8';
    if (s.fill > 0) { rr(ctx, 460, 500, 240 * s.fill, 16, 8); ctx.fill(); }
    if (!s.dragging && s.fill === 0) drawTutorialHandAt(ctx, s.px + 50, s.py - 50, now);
  } else if (s.kind === 'stir') {
    ctx.fillStyle = '#f7f2e8';
    circle(ctx, 640, 400, 130); ctx.fill();
    ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = 4; circle(ctx, 640, 400, 130); ctx.stroke();
    // mixture
    const mixCol = s.mix;
    ctx.fillStyle = `rgb(${Math.round(247 - 90 * mixCol)},${Math.round(242 - 120 * mixCol)},${Math.round(232 - 120 * mixCol)})`;
    circle(ctx, 640, 400, 108); ctx.fill();
    // circular arrow
    ctx.save();
    ctx.strokeStyle = '#8a2bb5';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(640, 400, 150, -0.5, Math.PI * 1.2); ctx.stroke();
    const ax = 640 + Math.cos(Math.PI * 1.2) * 150, ay = 400 + Math.sin(Math.PI * 1.2) * 150;
    ctx.fillStyle = '#8a2bb5';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 18, ay - 4); ctx.lineTo(ax - 2, ay + 16); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3a2a18';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Aduk melingkar! ${Math.floor(s.mix * 100)}%`, 640, 600);
    if (s.mix === 0) drawHand(ctx, 640, 250, 0.4, 1.0);
  } else if (s.kind === 'grate') {
    // tool panel, left
    ctx.fillStyle = '#f7a8c4';
    rr(ctx, 60, 200, 200, 320, 14); ctx.fill();
    ctx.strokeStyle = '#d92626'; ctx.lineWidth = 3; rr(ctx, 60, 200, 200, 320, 14); ctx.stroke();
    ctx.fillStyle = '#8a2b4a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PILIH PARUTAN', 160, 228);
    for (let i = 0; i < GRATERS.length; i++) {
      const g = GRATERS[i];
      const by = 270 + i * 90;
      const sel = s.tool === g.id;
      ctx.save();
      if (sel && s.shake > 0) ctx.translate((Math.random() - 0.5) * 10, 0);
      ctx.fillStyle = sel ? '#ffd94d' : '#fffdf5';
      ctx.strokeStyle = sel ? '#ff9f1c' : '#d8c49a';
      ctx.lineWidth = sel ? 4 : 2;
      rr(ctx, 78, by - 32, 164, 64, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a2a18';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(g.name, 160, by - 6);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#7a6a4f';
      ctx.fillText(g.desc, 160, by + 14);
      ctx.restore();
    }
    // container + ingredient, center
    ctx.fillStyle = '#cfe8f7';
    rr(ctx, 540, 420, 200, 90, 12); ctx.fill();
    ctx.strokeStyle = '#2f7fa8'; ctx.lineWidth = 3; rr(ctx, 540, 420, 200, 90, 12); ctx.stroke();
    for (let i = 0; i < s.shreds; i++) {
      ctx.fillStyle = dish.grateTarget === 'keju' ? '#ffcf3f' : '#ff7f2a';
      ctx.beginPath(); ctx.arc(560 + (i * 23) % 160, 480 - (i % 3) * 8, 6, 0, Math.PI * 2); ctx.fill();
    }
    const ing = dish.ingredients.find((i) => i.id === dish.grateTarget);
    if (ing) {
      const sc = 1 - (s.progress / 100) * 0.6;
      drawIngredient(ctx, ing.kind, ing.color, 640, 360, 60 * sc);
    }
    // mounted tool
    if (s.tool) {
      const g = GRATERS.find((t) => t.id === s.tool);
      ctx.save();
      ctx.fillStyle = '#9aa5b1';
      ctx.strokeStyle = '#5a6a7a';
      ctx.lineWidth = 3;
      rr(ctx, 600, 268, 80, 56, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a2a18';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(g.name, 640, 302);
      ctx.restore();
      if (!s.dragging) drawTutorialHandAt(ctx, 700, 260, now);
    }
    // progress bar, right
    ctx.fillStyle = '#eadfc8';
    rr(ctx, 1120, 220, 34, 280, 10); ctx.fill();
    ctx.fillStyle = '#58b368';
    const ph = 280 * (s.progress / 100);
    if (ph > 0) { rr(ctx, 1120, 220 + 280 - ph, 34, ph, 10); ctx.fill(); }
    ctx.fillStyle = '#3a2a18';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`${Math.floor(s.progress)}%`, 1137, 512);
    if (s.hint && s.hintUntil > now) {
      ctx.fillStyle = '#d92626';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(s.hint, 640, 600);
    }
  } else if (s.kind === 'assemble') {
    // plate with the dish photo flying in
    const imgKey = dish.id;
    const sc = 0.6 + 0.4 * Math.min(1, s.t / 1.2);
    ctx.save();
    ctx.translate(640, 400);
    ctx.scale(sc, sc);
    ctx.fillStyle = '#fff';
    circle(ctx, 0, 0, 120); ctx.fill();
    ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = 4; circle(ctx, 0, 0, 120); ctx.stroke();
    const img = IMAGES[imgKey];
    if (img) {
      ctx.save();
      circle(ctx, 0, 0, 104); ctx.clip();
      ctx.drawImage(img, -104, -104, 208, 208);
      ctx.restore();
    }
    ctx.restore();
    if (s.ready) {
      ctx.save();
      ctx.shadowColor = '#7ee787';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#2f8f2f';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SIAP! ✨', 640, 250);
      ctx.restore();
      ctx.fillStyle = '#2f8f2f';
      rr(ctx, 540, 600, 200, 60, 14); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('SAJIKAN ✓', 640, 630);
    } else {
      ctx.fillStyle = '#3a2a18';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Susun hidangannya...', 640, 600);
    }
  }
  stepChrome(ctx, G);
  ctx.restore();
}

// -- serving ---------------------------------------------------------------

export function servePlate(G, now) {
  const rp = G.readyPlate;
  if (!rp) return false;
  const ticket = rp.ticket;
  const dish = DISHES[rp.dishId];
  const frac = ticket.patience / ticket.patienceMax;
  const mistakes = G.lastMistakes || 0;
  const stars = (mistakes === 0 && frac > 0.5) ? 3 : (mistakes <= 1 ? 2 : 1);
  const bonus = G.combo * 2;
  const earned = dish.price + bonus;
  G.coins += earned;
  G.combo++;
  G.bestCombo = Math.max(G.bestCombo, G.combo);
  G.served[dish.id] = (G.served[dish.id] || 0) + 1;
  G.servedTotal++;
  G.stars += stars;
  ticket.state = 'done';
  ticket.doneAt = now;
  G.readyPlate = null;
  G.popups.push({ x: 640, y: 300, text: `+$${earned}  ${'★'.repeat(stars)}`, color: '#b8860b', until: now + 1800, big: true });
  sfx.coin();
  // unlock check
  for (const id of ['bibimbap', 'tteokbokki']) {
    const d = DISHES[id];
    if (d.unlock && d.unlock.dish === dish.id && G.served[dish.id] === d.unlock.count && !G.unlockedShown[id]) {
      G.unlockedShown[id] = true;
      G.banner = { text: `🎉 RESPE BARU TERBUKA: ${d.name}!`, until: now + 3500, color: '#8a2bb5' };
      sfx.unlock();
    }
  }
  return true;
}
