// kitchen.js — the kitchen itself: background, order board, HUD
// (shift timer, coins, combo), the serving pass, the menu/unlock strip,
// and the chef who walks the collect scene.

import { IMAGES, rr, circle, drawIngredient, drawHand } from './art.js';
import { DISHES, DISH_ORDER, isUnlocked } from './recipes.js';
import { drawTicket } from './orders.js';
import { drawChefBadge } from './customers.js';

export const W = 1280, H = 720;
export const BOARD_Y = 8;
export const BOARD_H = 96;

export function drawKitchenBg(ctx) {
  const img = IMAGES.kitchenBg;
  if (img) ctx.drawImage(img, 0, 0, W, H);
  else { ctx.fillStyle = '#f7e8c8'; ctx.fillRect(0, 0, W, H); }
  // pink checkered cloth strip along the bottom, like the lesson game
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let x = 0; x < W; x += 48) {
    for (let y = H - 56; y < H; y += 28) {
      ctx.fillStyle = ((x / 48 + y / 28) % 2 === 0) ? '#f7a8c4' : '#fff';
      ctx.fillRect(x, y, 48, 28);
    }
  }
  ctx.restore();
}

export function drawOrderBoard(ctx, G, now) {
  ctx.save();
  ctx.fillStyle = 'rgba(58,42,24,0.85)';
  rr(ctx, 8, BOARD_Y, W - 16, BOARD_H, 14);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('PESANAN', 20, BOARD_Y + 10);
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('klik tiket!', 20, BOARD_Y + 32);
  const tw = 200, th = 80, gap = 10;
  let x = 150;
  for (const t of G.tickets) {
    if (t.state === 'done' || t.state === 'failed') continue;
    const selected = G.current && G.current.ticket.id === t.id;
    drawTicket(ctx, t, x, BOARD_Y + 8, tw, th, now, selected);
    t._x = x; t._y = BOARD_Y + 8; t._w = tw; t._h = th;
    x += tw + gap;
  }
  ctx.restore();
}

export function drawHud(ctx, G) {
  ctx.save();
  ctx.textBaseline = 'top';
  // shift timer — big, colour-shifting, you can feel it
  const t = Math.max(0, G.shiftLeft);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(Math.floor(t % 60)).padStart(2, '0');
  const col = t > 60 ? '#2f8f2f' : (t > 30 ? '#e8a13a' : '#d92626');
  ctx.fillStyle = 'rgba(255,253,245,0.95)';
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  rr(ctx, W - 300, BOARD_Y + 8, 130, 52, 12);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = col;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${mm}:${ss}`, W - 235, BOARD_Y + 16);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#7a6a4f';
  ctx.fillText('SHIFT', W - 235, BOARD_Y + 44);
  // coins + combo
  ctx.fillStyle = 'rgba(255,253,245,0.95)';
  ctx.strokeStyle = '#d8c49a';
  ctx.lineWidth = 2;
  rr(ctx, W - 160, BOARD_Y + 8, 148, 52, 12);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b8860b';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${G.coins}`, W - 148, BOARD_Y + 18);
  ctx.fillStyle = G.combo >= 3 ? '#d92626' : '#7a6a4f';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(G.combo > 1 ? `COMBO x${G.combo} 🔥` : 'COMBO x1', W - 148, BOARD_Y + 40);
  ctx.restore();
}

export function drawMenuStrip(ctx, G) {
  ctx.save();
  const y = H - 52;
  ctx.fillStyle = 'rgba(58,42,24,0.8)';
  rr(ctx, 8, y, 640, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MENU PELAJARAN:', 20, y + 22);
  let x = 150;
  for (const id of DISH_ORDER) {
    const d = DISHES[id];
    const open = isUnlocked(id, G.served);
    ctx.fillStyle = open ? d.color : '#8a7a5f';
    circle(ctx, x, y + 22, 15);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.name[0], x, y + 22);
    ctx.fillStyle = open ? '#fff' : '#c9bda2';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(d.name, x + 20, y + 22);
    if (!open && d.unlock) {
      const got = G.served[d.unlock.dish] || 0;
      ctx.fillStyle = '#ffd94d';
      ctx.fillText(`🔒 ${got}/${d.unlock.count}`, x + 20 + ctx.measureText(d.name).width + 6, y + 22);
      x += 20 + ctx.measureText(d.name).width + 90;
    } else {
      x += 20 + ctx.measureText(d.name).width + 26;
    }
  }
  ctx.restore();
}

export function drawPass(ctx, G, now) {
  ctx.save();
  const x = W - 250, y = H - 190, w = 234, h = 118;
  ctx.fillStyle = '#8a6b3f';
  rr(ctx, x - 6, y - 6, w + 12, h + 12, 12);
  ctx.fill();
  ctx.fillStyle = '#e8d9b0';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = '#5a4630';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍽️ TEMPAT SAJI', x + w / 2, y + 12);
  if (G.readyPlate) {
    const bob = Math.sin(now / 300) * 3;
    const dish = DISHES[G.readyPlate.dishId];
    ctx.save();
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fff';
    circle(ctx, x + w / 2, y + 62 + bob, 42);
    ctx.fill();
    ctx.restore();
    const img = IMAGES[dish.id];
    if (img) {
      ctx.save();
      circle(ctx, x + w / 2, y + 62 + bob, 38);
      ctx.clip();
      ctx.drawImage(img, x + w / 2 - 38, y + 62 + bob - 38, 76, 76);
      ctx.restore();
    }
    ctx.fillStyle = '#2f8f2f';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('SIAP! Klik untuk saji', x + w / 2, y + 96);
    G.readyPlate._x = x; G.readyPlate._y = y; G.readyPlate._w = w; G.readyPlate._h = h;
  } else {
    ctx.fillStyle = '#8a7a5f';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('belum ada hidangan', x + w / 2, y + 62);
  }
  ctx.restore();
}

// -- the chef -------------------------------------------------------------

export function drawChef(ctx, G, now) {
  const c = G.chef;
  const bob = c.moving ? Math.sin(now / 90) * 3 : 0;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  drawChefBadge(ctx, 0, -14, 26);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // body
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 2;
  rr(ctx, -20, 8, 40, 30, 10);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d92626';
  ctx.fillRect(-4, 8, 8, 30);
  ctx.restore();
}

export function updateChef(G, dt, keys) {
  const c = G.chef;
  const speed = 280;
  let vx = 0, vy = 0;
  if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
  if (keys.has('arrowright') || keys.has('d')) vx += 1;
  if (keys.has('arrowup') || keys.has('w')) vy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) vy += 1;
  if (vx || vy) {
    c.tx = null; c.ty = null;
    const len = Math.hypot(vx, vy);
    c.x += (vx / len) * speed * dt;
    c.y += (vy / len) * speed * dt;
    c.moving = true;
  } else if (c.tx !== null && c.tx !== undefined) {
    const dx = c.tx - c.x, dy = c.ty - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) { c.tx = null; c.ty = null; c.moving = false; }
    else {
      c.x += (dx / d) * speed * dt;
      c.y += (dy / d) * speed * dt;
      c.moving = true;
    }
  } else {
    c.moving = false;
  }
  c.x = Math.max(40, Math.min(W - 40, c.x));
  c.y = Math.max(150, Math.min(H - 90, c.y));
}

// -- collect-scene layout -------------------------------------------------

export function collectSpots(dish) {
  // fixed spots around the kitchen, one per ingredient
  const spots = [
    { x: 170, y: 300 }, { x: 420, y: 250 }, { x: 660, y: 300 },
    { x: 900, y: 250 }, { x: 1080, y: 330 }, { x: 300, y: 480 },
  ];
  return dish.ingredients.map((ing, i) => ({ ...ing, x: spots[i % spots.length].x, y: spots[i % spots.length].y }));
}

export function drawSilhouetteTray(ctx, dish, collected) {
  const trayH = 64;
  const y = H - trayH - 4;
  const w = Math.min(760, 120 + dish.ingredients.length * 110);
  const x = (W - w) / 2;
  ctx.save();
  ctx.fillStyle = '#f7a8c4';
  ctx.strokeStyle = '#d92626';
  ctx.lineWidth = 3;
  rr(ctx, x, y, w, trayH, 14);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a2b4a';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('KUMPULKAN:', x + 14, y + trayH / 2);
  let ix = x + 120;
  for (const ing of dish.ingredients) {
    const got = collected.has(ing.id);
    if (got) {
      drawIngredient(ctx, ing.kind, ing.color, ix, y + trayH / 2, 20);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#3a2a18';
      drawIngredient(ctx, ing.kind, '#3a2a18', ix, y + trayH / 2, 20);
      ctx.restore();
    }
    ctx.fillStyle = got ? '#2f8f2f' : '#5a4630';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ing.name, ix, y + trayH - 10);
    ix += 110;
  }
  ctx.restore();
}

export function drawTutorialHandAt(ctx, x, y, now) {
  const bob = Math.sin(now / 250) * 6;
  drawHand(ctx, x, y + bob, -0.5, 1.0);
}
