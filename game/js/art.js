// art.js — loads the game's images and draws the food, tools and
// decorations on the canvas. All food icons are drawn in code so the
// game never needs a network request; photos are local files.

export const IMAGES = {};

const FILES = {
  kitchenBg: 'assets/kitchen-bg.jpg',
  chef: 'assets/chef.jpg',
  customers: 'assets/customers.jpg',
  dishHero: 'assets/dish-hero.jpg',
  kimchi: 'assets/kimchi-bowl.jpg',
  bibimbap: 'assets/bibimbap-bowl.jpg',
  tteokbokki: 'assets/tteokbokki-plate.jpg',
};

export function loadImages() {
  const jobs = Object.entries(FILES).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { IMAGES[key] = img; resolve(true); };
    img.onerror = () => { IMAGES[key] = null; resolve(false); };
    img.src = src;
  }));
  return Promise.all(jobs);
}

// -- tiny canvas helpers -------------------------------------------------

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// -- food icons (drawn, one shape per ingredient kind) -------------------

export function drawIngredient(ctx, kind, color, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.strokeStyle = 'rgba(60,30,10,0.55)';
  ctx.fillStyle = color;
  if (kind === 'leaf') {
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.85, 0.3, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(0, -s * 0.6); ctx.lineTo(0, s * 0.6); ctx.stroke();
  } else if (kind === 'onion') {
    ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.quadraticCurveTo(s * 0.15, -s * 0.95, 0, -s * 0.9);
    ctx.quadraticCurveTo(-s * 0.15, -s * 0.95, 0, -s * 0.5); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,40,0.5)';
    ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.35, 0.3, Math.PI - 0.3); ctx.stroke();
  } else if (kind === 'root') {
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, s * 0.1, s * 0.3, s * 0.5, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(s * 0.3, -s * 0.15, s * 0.3, s * 0.5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (kind === 'carrot') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.45, -s * 0.55, s * 0.3, s * 0.1);
    ctx.quadraticCurveTo(s * 0.15, s * 0.7, 0, s * 0.85);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.7, -s * 0.3, s * 0.1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2f8f2f';
    ctx.lineWidth = Math.max(2, s * 0.1);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(-s * 0.3, -s * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, -s * 1.0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.3, -s * 0.95); ctx.stroke();
  } else if (kind === 'chili') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.4);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.6, s * 0.35, s * 0.3);
    ctx.quadraticCurveTo(s * 0.2, s * 0.85, -s * 0.15, s * 0.75);
    ctx.quadraticCurveTo(-s * 0.45, s * 0.5, -s * 0.5, -s * 0.4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2f8f2f';
    ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 0.45); ctx.quadraticCurveTo(-s * 0.2, -s * 0.9, s * 0.1, -s * 0.85); ctx.stroke();
  } else if (kind === 'egg') {
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath(); ctx.arc(s * 0.1, 0, s * 0.32, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'bowl') {
    ctx.fillStyle = '#e8e2d4';
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.65, s * 0.4, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 0.55, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'sauce') {
    ctx.fillStyle = '#f7f2e8';
    ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.45, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.25, s * 0.3, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'cake') {
    ctx.fillStyle = color;
    rr(ctx, -s * 0.55, -s * 0.35, s * 1.1, s * 0.7, s * 0.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    rr(ctx, -s * 0.35, -s * 0.18, s * 0.7, s * 0.18, s * 0.09); ctx.fill();
  } else if (kind === 'cheese') {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.3); ctx.lineTo(s * 0.6, s * 0.3); ctx.lineTo(s * 0.6, -s * 0.1);
    ctx.lineTo(0, -s * 0.55); ctx.lineTo(-s * 0.6, -s * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(180,120,0,0.6)';
    circle(ctx, -s * 0.2, s * 0.05, s * 0.09); ctx.fill();
    circle(ctx, s * 0.25, -s * 0.1, s * 0.07); ctx.fill();
  } else {
    circle(ctx, 0, 0, s * 0.55); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// -- the tutorial hand: a friendly cartoon pointer ----------------------

export function drawHand(ctx, x, y, angle, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffd9b3';
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 3;
  // pointing finger up
  rr(ctx, -9, -46, 18, 40, 8); ctx.fill(); ctx.stroke();
  circle(ctx, 0, -48, 9); ctx.fill(); ctx.stroke();
  // palm
  rr(ctx, -22, -12, 44, 34, 12); ctx.fill(); ctx.stroke();
  // thumb
  ctx.beginPath(); ctx.ellipse(-24, 4, 10, 14, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// -- a plate with the finished dish photo --------------------------------

export function drawDishPhoto(ctx, imgKey, x, y, w, h) {
  const img = IMAGES[imgKey];
  ctx.save();
  rr(ctx, x, y, w, h, 14);
  ctx.clip();
  if (img) {
    const iw = img.width, ih = img.height;
    const s = Math.max(w / iw, h / ih);
    ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
  } else {
    ctx.fillStyle = '#f3e2c2';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
}
