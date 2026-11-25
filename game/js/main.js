// main.js — game loop, state machine and input routing for
// DAPUR KILAT v2. Modes: title → kitchen → step (lesson chain)
// → kitchen (plate on the pass) → gameover at the end of the shift.

import { loadImages, IMAGES, rr, circle } from './art.js';
import { DISHES, DISH_ORDER } from './recipes.js';
import { drawKitchenBg, drawOrderBoard, drawHud, drawMenuStrip, drawPass, drawChef, updateChef, W, H } from './kitchen.js';
import { updateTickets, spawnTicket } from './orders.js';
import { startCooking, abortCooking, updateStep, drawStepScene, stepPointerDown, stepPointerMove, stepPointerUp, stepKeyDown, servePlate } from './steps.js';
import { sfx, ensureAudio } from './audio.js';
import { applyShot, runSelfTest } from './shots.js';

export const G = {
  mode: 'title',
  now: 0,
  shiftLeft: 120,
  coins: 0,
  combo: 0,
  bestCombo: 0,
  served: { kimchi: 0, bibimbap: 0, tteokbokki: 0 },
  servedTotal: 0,
  stars: 0,
  failed: 0,
  tickets: [],
  spawnIn: 8,
  current: null,
  readyPlate: null,
  chef: { x: 640, y: 560, tx: null, ty: null, moving: false },
  keys: new Set(),
  popups: [],
  banner: null,
  unlockedShown: {},
  lastMistakes: 0,
  frozen: false,
  muted: false,
};

let canvas, ctx;

function resetGame() {
  G.mode = 'kitchen';
  G.shiftLeft = 120;
  G.coins = 0;
  G.combo = 0;
  G.bestCombo = 0;
  G.served = { kimchi: 0, bibimbap: 0, tteokbokki: 0 };
  G.servedTotal = 0;
  G.stars = 0;
  G.failed = 0;
  G.tickets = [];
  G.spawnIn = 8;
  G.current = null;
  G.readyPlate = null;
  G.chef = { x: 640, y: 560, tx: null, ty: null, moving: false };
  G.popups = [];
  G.banner = null;
  G.unlockedShown = {};
  spawnTicket(G, 0);
  spawnTicket(G, 0);
}

function drawTitle(now) {
  ctx.save();
  drawKitchenBg(ctx);
  ctx.fillStyle = 'rgba(58,42,24,0.55)';
  ctx.fillRect(0, 0, W, H);
  // hero dish photo
  if (IMAGES.dishHero) {
    ctx.save();
    rr(ctx, 440, 90, 400, 240, 18);
    ctx.clip();
    ctx.drawImage(IMAGES.dishHero, 440, 90, 400, 240);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fff';
    rr(ctx, 440, 90, 400, 240, 18);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('DAPUR KILAT', 640, 400);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('— Pelajaran Korea —', 640, 446);
  ctx.fillStyle = '#fff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Masak 3 resep Korea langkah demi langkah: kumpul, potong, tuang, aduk, parut, sajikan!', 640, 486);
  ctx.fillText('Layani pelanggan sebelum patience mereka habis. Shift 120 detik!', 640, 512);
  // start button
  ctx.fillStyle = '#e8501e';
  rr(ctx, 490, 540, 300, 70, 16);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  rr(ctx, 490, 540, 300, 70, 16);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('MULAI MEMASAK ▶', 640, 575);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9c9';
  ctx.fillText('WASD / klik untuk jalan  •  E / klik untuk berinteraksi  •  P jeda', 640, 650);
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(58,42,24,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fffdf5';
  rr(ctx, 340, 130, 600, 440, 20);
  ctx.fill();
  ctx.strokeStyle = '#ff9f1c';
  ctx.lineWidth = 4;
  rr(ctx, 340, 130, 600, 440, 20);
  ctx.stroke();
  ctx.fillStyle = '#3a2a18';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('SHIFT SELESAI!', 640, 190);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#b8860b';
  ctx.fillText(`💰 $${G.coins}   •   🍽️ ${G.servedTotal} hidangan`, 640, 250);
  ctx.fillStyle = '#3a2a18';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(`Bintang: ${'★'.repeat(Math.min(9, G.stars))} (${G.stars})`, 640, 300);
  ctx.fillText(`Combo terbaik: x${G.bestCombo}   •   Pelanggan pergi: ${G.failed}`, 640, 340);
  const unlocked = DISH_ORDER.filter((id) => (G.served[id] || 0) > 0).map((id) => DISHES[id].name).join(', ');
  ctx.fillText(`Resep dimasak: ${unlocked || '—'}`, 640, 380);
  ctx.fillStyle = '#2f8f2f';
  rr(ctx, 490, 430, 300, 64, 14);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('MAIN LAGI ↻', 640, 462);
  ctx.restore();
}

function drawPopups() {
  ctx.save();
  ctx.textAlign = 'center';
  for (const p of G.popups) {
    // remaining seconds, clamped: a popup pinned for a screenshot
    // (until far in the future) stays put instead of flying off-screen
    const age = Math.max(0, Math.min(1.8, (p.until - G.now) / 1000));
    const y = p.y - (1.8 - age) * 40;
    ctx.globalAlpha = Math.min(1, age / 0.5);
    ctx.fillStyle = p.color || '#b8860b';
    ctx.font = p.big ? 'bold 34px system-ui, sans-serif' : 'bold 20px system-ui, sans-serif';
    ctx.fillText(p.text, p.x, y);
  }
  ctx.restore();
}

function drawBanner() {
  if (!G.banner || G.banner.until < G.now) return;
  ctx.save();
  ctx.fillStyle = G.banner.color || '#2f8f2f';
  ctx.globalAlpha = 0.95;
  rr(ctx, 340, 160, 600, 46, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(G.banner.text, 640, 183);
  ctx.restore();
}

function draw(now) {
  ctx.clearRect(0, 0, W, H);
  if (G.mode === 'title') { drawTitle(now); return; }
  if (G.mode === 'gameover') { drawKitchenBg(ctx); drawGameOver(); return; }
  drawKitchenBg(ctx);
  drawOrderBoard(ctx, G, now);
  drawHud(ctx, G);
  if (G.mode === 'kitchen') {
    drawChef(ctx, G, now);
    drawMenuStrip(ctx, G);
  }
  if (G.mode === 'kitchen' || G.readyPlate) drawPass(ctx, G, now);
  if (G.mode === 'step') drawStepScene(ctx, G, now);
  drawPopups();
  drawBanner();
}

let last = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  G.now = now;
  if (!G.frozen) {
    if (G.mode === 'kitchen' || G.mode === 'step') {
      G.shiftLeft -= dt;
      updateTickets(G, dt, now);
      if (G.mode === 'kitchen') updateChef(G, dt, G.keys);
      if (G.mode === 'step') {
        updateStep(G, dt);
        // the ticket being cooked walked out → stop cooking
        if (G.current && G.current.ticket.state === 'failed') {
          abortCooking(G, 'Pelanggan pergi... 😢');
        }
      }
      if (G.shiftLeft <= 0) {
        G.shiftLeft = 0;
        G.mode = 'gameover';
        sfx.alarm();
      }
    }
  }
  G.popups = G.popups.filter((p) => p.until > now);
  draw(now);
}

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}

function onPointerDown(e) {
  ensureAudio();
  const { x, y } = canvasPos(e);
  if (G.mode === 'title') {
    if (x > 490 && x < 790 && y > 540 && y < 610) { sfx.click(); resetGame(); }
    return;
  }
  if (G.mode === 'gameover') {
    if (x > 490 && x < 790 && y > 430 && y < 494) { sfx.click(); resetGame(); }
    return;
  }
  if (G.mode === 'kitchen') {
    // serve at the pass
    if (G.readyPlate && x > G.readyPlate._x && x < G.readyPlate._x + G.readyPlate._w &&
        y > G.readyPlate._y && y < G.readyPlate._y + G.readyPlate._h) {
      servePlate(G, G.now);
      return;
    }
    // click a ticket → cook it
    for (const t of G.tickets) {
      if ((t.state === 'waiting') && t._x !== undefined && x > t._x && x < t._x + t._w && y > t._y && y < t._y + t._h) {
        startCooking(G, t);
        return;
      }
    }
    // walk the chef
    G.chef.tx = x; G.chef.ty = y;
    return;
  }
  if (G.mode === 'step') stepPointerDown(G, x, y);
}

function onPointerMove(e) {
  if (G.mode !== 'step') return;
  const { x, y } = canvasPos(e);
  stepPointerMove(G, x, y);
}

function onPointerUp() {
  if (G.mode === 'step') stepPointerUp(G);
}

function onKeyDown(e) {
  const k = e.key.toLowerCase();
  if (k === 'm') { G.muted = !G.muted; return; }
  G.keys.add(k);
  if (G.mode === 'step') stepKeyDown(G, k);
  if (k === 'p' && (G.mode === 'kitchen' || G.mode === 'step')) {
    G.frozen = !G.frozen;
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
}

function onKeyUp(e) {
  G.keys.delete(e.key.toLowerCase());
}

async function init() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  await loadImages();
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const selftest = params.get('selftest');
  if (shot) applyShot(G, shot, resetGame, startCooking);
  if (selftest) {
    document.title = 'SELFTEST RUNNING';
    await runSelfTest(G, resetGame, startCooking);
  }
  requestAnimationFrame(loop);
}

init();
