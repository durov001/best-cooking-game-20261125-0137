// customers.js — the three regulars of DAPUR KILAT, cropped from one
// AI-art sheet (customers.jpg holds Mira, Pak Dar and Bimo side by side).
// A portrait's mood is drawn on top: happy as drawn, sweat drops when
// impatient, red tint + anger marks when furious.

import { IMAGES, rr, circle } from './art.js';

export const CUSTOMERS = [
  { id: 'mira', name: 'Mira', crop: 0 },
  { id: 'pakdar', name: 'Pak Dar', crop: 1 },
  { id: 'bimo', name: 'Bimo', crop: 2 },
];

const SHEET_W = 768, SHEET_H = 512;

export function drawPortrait(ctx, custIdx, x, y, w, h, mood, t) {
  const img = IMAGES.customers;
  const c = CUSTOMERS[custIdx % CUSTOMERS.length];
  ctx.save();
  rr(ctx, x, y, w, h, 10);
  ctx.clip();
  if (img) {
    const sw = SHEET_W / 3;
    ctx.drawImage(img, c.crop * sw, 0, sw, SHEET_H, x, y, w, h);
  } else {
    ctx.fillStyle = '#f3e2c2';
    ctx.fillRect(x, y, w, h);
  }
  if (mood === 'impatient') {
    // sweat drops
    ctx.fillStyle = '#5db9e8';
    const bob = Math.sin(t / 300) * 2;
    ctx.beginPath(); ctx.ellipse(x + w * 0.82, y + h * 0.22 + bob, 4, 7, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.14, y + h * 0.3 - bob, 3, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'angry') {
    ctx.fillStyle = 'rgba(220,40,40,0.28)';
    ctx.fillRect(x, y, w, h);
    // anger mark
    ctx.strokeStyle = '#d92626';
    ctx.lineWidth = 3;
    const ax = x + w * 0.82, ay = y + h * 0.16;
    ctx.beginPath();
    ctx.moveTo(ax - 7, ay - 7); ctx.lineTo(ax + 7, ay + 7);
    ctx.moveTo(ax + 7, ay - 7); ctx.lineTo(ax - 7, ay + 7);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = mood === 'angry' ? '#d92626' : (mood === 'impatient' ? '#e8a13a' : '#fff');
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
  return c;
}

// mood from remaining patience fraction (1 = fresh, 0 = gone)
export function moodOf(frac) {
  if (frac > 0.5) return 'happy';
  if (frac > 0.22) return 'impatient';
  return 'angry';
}

export function drawChefBadge(ctx, x, y, r) {
  const img = IMAGES.chef;
  ctx.save();
  circle(ctx, x, y, r);
  ctx.clip();
  if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  else { ctx.fillStyle = '#fff'; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  circle(ctx, x, y, r);
  ctx.stroke();
}
