// orders.js — the order board: tickets arrive, wait with a draining
// patience bar, and leave happy or angry. One ticket per customer,
// at most four on the board at once.

import { DISHES, unlockedDishes } from './recipes.js';
import { CUSTOMERS, drawPortrait, moodOf } from './customers.js';
import { rr } from './art.js';

let nextId = 1;

export function makeTicket(dishId, customerIdx, patienceSec, now) {
  return {
    id: nextId++,
    dishId,
    customerIdx,
    patience: patienceSec,
    patienceMax: patienceSec,
    born: now,
    state: 'waiting', // waiting | cooking | done | failed
  };
}

export function spawnTicket(state, now) {
  const open = unlockedDishes(state.served);
  const dishId = open[Math.floor(Math.random() * open.length)];
  const patience = Math.max(28, 46 - state.servedTotal * 1.2);
  const cust = Math.floor(Math.random() * CUSTOMERS.length);
  const t = makeTicket(dishId, cust, patience, now);
  state.tickets.push(t);
  return t;
}

export function updateTickets(state, dt, now) {
  // spawn a new ticket when the board has room
  const waiting = state.tickets.filter((t) => t.state === 'waiting' || t.state === 'cooking').length;
  if (waiting < Math.min(4, 2 + Math.floor(state.servedTotal / 3))) {
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawnTicket(state, now);
      state.spawnIn = 9 + Math.random() * 4;
    }
  }
  for (const t of state.tickets) {
    if (t.state === 'waiting' || t.state === 'cooking') {
      t.patience -= dt;
      if (t.patience <= 0) {
        t.patience = 0;
        t.state = 'failed';
        state.combo = 0;
        state.failed++;
      }
    }
  }
  // drop finished tickets after a short while
  state.tickets = state.tickets.filter((t) => {
    if ((t.state === 'done' || t.state === 'failed') && now - t.born > 90000) return false;
    if (t.state === 'done' && now - (t.doneAt || 0) > 4000) return false;
    if (t.state === 'failed' && now - (t.doneAt || 0) > 4000) return false;
    return true;
  });
}

export function drawTicket(ctx, t, x, y, w, h, now, selected) {
  const dish = DISHES[t.dishId];
  const frac = t.patience / t.patienceMax;
  const mood = t.state === 'failed' ? 'angry' : (t.state === 'done' ? 'happy' : moodOf(frac));
  ctx.save();
  if (selected) {
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = t.state === 'failed' ? '#e8c9c9' : (t.state === 'done' ? '#d8f0c8' : '#fffdf5');
  ctx.strokeStyle = selected ? '#ff9f1c' : '#d8c49a';
  ctx.lineWidth = selected ? 4 : 2;
  rr(ctx, x, y, w, h, 12);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  const cust = drawPortrait(ctx, t.customerIdx, x + 8, y + 8, 46, 52, mood, now);
  ctx.fillStyle = '#3a2a18';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(dish.name, x + 62, y + 8);
  ctx.fillStyle = '#7a6a4f';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(cust.name, x + 62, y + 28);
  // patience bar
  const bx = x + 62, by = y + 46, bw = w - 72, bh = 8;
  ctx.fillStyle = '#eadfc8';
  rr(ctx, bx, by, bw, bh, 4); ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#58b368' : (frac > 0.22 ? '#f0a13a' : '#d92626');
  if (frac > 0) { rr(ctx, bx, by, Math.max(8, bw * frac), bh, 4); ctx.fill(); }
  if (frac <= 0.22 && t.state !== 'done' && t.state !== 'failed') {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 120);
    ctx.fillStyle = '#d92626';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('CEPAT!', x + w - 52, y + 8);
    ctx.globalAlpha = 1;
  }
  if (t.state === 'done') {
    ctx.fillStyle = '#2f8f2f';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('✓ TERLAYANI', x + 62, y + 60);
  } else if (t.state === 'failed') {
    ctx.fillStyle = '#b32626';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('✗ PERGI', x + 62, y + 60);
  }
  ctx.restore();
}
