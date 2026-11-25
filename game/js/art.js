// art.js — loads the AI art and draws every food / chef / plate shape on canvas.
(function () {
  var images = {};
  var loaded = 0;
  var total = 4;
  var ready = false;
  var onReady = null;

  function load(name, src) {
    var img = new Image();
    img.onload = function () {
      loaded++;
      if (loaded >= total) { ready = true; if (onReady) onReady(); }
    };
    img.onerror = function () { loaded++; if (loaded >= total) { ready = true; if (onReady) onReady(); } };
    img.src = src;
    images[name] = img;
  }
  function loadAll(cb) {
    onReady = cb;
    load('bg', 'assets/kitchen-bg.jpg');
    load('chef', 'assets/chef.jpg');
    load('customers', 'assets/customers.jpg');
    load('dish', 'assets/dish-hero.jpg');
  }
  function img(name) { return images[name]; }
  function isReady() { return ready; }

  // Draw an image clipped into a circle.
  function drawCircleImage(ctx, name, x, y, r, sx, sy, sw, sh) {
    var im = images[name];
    if (!im || !im.naturalWidth) return false;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (sx !== undefined) ctx.drawImage(im, sx, sy, sw, sh, x - r, y - r, r * 2, r * 2);
    else ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
    ctx.restore();
    return true;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // One ingredient drawn big and readable, as a top-down food icon.
  function drawIngredient(ctx, id, cx, cy, s) {
    var u = s / 100;
    ctx.save();
    ctx.translate(cx, cy);
    if (id === 'bun') {
      ctx.fillStyle = '#e8a94e';
      ctx.beginPath(); ctx.ellipse(0, -6 * u, 42 * u, 26 * u, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f2c078';
      ctx.beginPath(); ctx.ellipse(0, -10 * u, 30 * u, 16 * u, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff3d6';
      [[-18, -22], [0, -28], [18, -22], [-8, -14], [10, -14]].forEach(function (p) {
        ctx.beginPath(); ctx.ellipse(p[0] * u, p[1] * u, 3.5 * u, 2.2 * u, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#d18a2e';
      rr(ctx, -42 * u, -6 * u, 84 * u, 12 * u, 6 * u); ctx.fill();
    } else if (id === 'patty') {
      ctx.fillStyle = '#6e4526';
      rr(ctx, -44 * u, -14 * u, 88 * u, 28 * u, 12 * u); ctx.fill();
      ctx.fillStyle = '#8a5a3b';
      rr(ctx, -40 * u, -18 * u, 80 * u, 24 * u, 10 * u); ctx.fill();
      ctx.fillStyle = '#a4714e';
      [[-24, -8], [-4, -10], [18, -7], [30, -9], [6, -4]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0] * u, p[1] * u, 4 * u, 0, Math.PI * 2); ctx.fill();
      });
    } else if (id === 'lettuce') {
      ctx.fillStyle = '#5da32e';
      ctx.beginPath(); ctx.arc(0, 0, 40 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7dc242';
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 20 * u, Math.sin(a) * 20 * u, 20 * u, 12 * u, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#a8e063'; ctx.lineWidth = 3 * u;
      ctx.beginPath(); ctx.arc(0, 0, 22 * u, 0, Math.PI * 2); ctx.stroke();
    } else if (id === 'tomato') {
      ctx.fillStyle = '#d63a2c';
      ctx.beginPath(); ctx.arc(0, 0, 38 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e84c3d';
      ctx.beginPath(); ctx.arc(-6 * u, -6 * u, 30 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f28b80';
      ctx.beginPath(); ctx.arc(-12 * u, -12 * u, 9 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4d8b3a';
      ctx.beginPath(); ctx.ellipse(0, -34 * u, 12 * u, 5 * u, 0, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'cheese') {
      ctx.fillStyle = '#f5b81e';
      ctx.beginPath();
      ctx.moveTo(-42 * u, -26 * u); ctx.lineTo(42 * u, -26 * u);
      ctx.lineTo(26 * u, 26 * u); ctx.lineTo(-26 * u, 26 * u);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath();
      ctx.moveTo(-42 * u, -26 * u); ctx.lineTo(42 * u, -26 * u);
      ctx.lineTo(30 * u, 8 * u); ctx.lineTo(-30 * u, 8 * u);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e09c00';
      [[-20, 12], [8, 16], [22, -8], [-6, -12]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0] * u, p[1] * u, 4.5 * u, 0, Math.PI * 2); ctx.fill();
      });
    } else if (id === 'onion') {
      ctx.fillStyle = '#b57edc';
      ctx.beginPath(); ctx.arc(0, 2 * u, 36 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9a0dc';
      ctx.beginPath(); ctx.arc(-4 * u, -2 * u, 28 * u, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#efe0f7'; ctx.lineWidth = 3 * u;
      [-16, -4, 8, 18].forEach(function (r) {
        ctx.beginPath(); ctx.arc(0, 2 * u, Math.abs(r) * u, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      });
      ctx.strokeStyle = '#7dc242'; ctx.lineWidth = 4 * u;
      ctx.beginPath(); ctx.moveTo(0, -32 * u); ctx.quadraticCurveTo(6 * u, -44 * u, 14 * u, -46 * u); ctx.stroke();
    }
    ctx.restore();
  }

  // The chef, drawn as a friendly cartoon cook standing on the floor.
  function drawChef(ctx, x, y, dir, walking, carrying) {
    var bob = walking ? Math.sin(Date.now() / 90) * 3 : 0;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(dir >= 0 ? 1 : -1, 1);
    // legs
    ctx.fillStyle = '#3a3a4a';
    rr(ctx, -16, -26, 13, 26, 5); ctx.fill();
    rr(ctx, 3, -26, 13, 26, 5); ctx.fill();
    // body: white coat
    ctx.fillStyle = '#ffffff';
    rr(ctx, -26, -78, 52, 56, 14); ctx.fill();
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -76); ctx.lineTo(0, -24); ctx.stroke();
    // buttons
    ctx.fillStyle = '#c0392b';
    [[-8, -62], [8, -62], [-8, -44], [8, -44]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
    });
    // neckerchief
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(-10, -76); ctx.lineTo(10, -76); ctx.lineTo(0, -62); ctx.closePath(); ctx.fill();
    // arms
    ctx.fillStyle = '#ffffff';
    var swing = walking ? Math.sin(Date.now() / 90) * 6 : 0;
    ctx.save(); ctx.translate(-26, -66); ctx.rotate(0.5 + swing * 0.02); rr(ctx, -8, -4, 16, 34, 8); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(26, -66); ctx.rotate(-0.5 - swing * 0.02); rr(ctx, -8, -4, 16, 34, 8); ctx.fill(); ctx.restore();
    // head
    ctx.fillStyle = '#ffcf9e';
    ctx.beginPath(); ctx.arc(0, -96, 20, 0, Math.PI * 2); ctx.fill();
    // eyes + smile
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-7, -98, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -98, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -90, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // moustache
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath(); ctx.ellipse(-6, -88, 7, 3, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -88, 7, 3, 0.2, 0, Math.PI * 2); ctx.fill();
    // toque
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-12, -114, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -120, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -114, 11, 0, Math.PI * 2); ctx.fill();
    rr(ctx, -20, -118, 40, 10, 4); ctx.fill();
    ctx.restore();
    // carried item floats above the hands
    if (carrying) {
      ctx.save();
      ctx.translate(x, y - 128 + Math.sin(Date.now() / 300) * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d8b25a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
      drawIngredient(ctx, carrying, 0, 0, 34);
      ctx.restore();
    }
  }

  // A plate with a stack of ready ingredients (bun at the bottom).
  function drawPlate(ctx, x, y, stack, scale) {
    var s = scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0, 0, 52, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 52, 14, 0, 0, Math.PI * 2); ctx.stroke();
    var dy = -8;
    stack.forEach(function (ing) {
      drawIngredient(ctx, ing, 0, dy, 62);
      dy -= 12;
    });
    ctx.restore();
  }

  window.Art = {
    loadAll: loadAll, img: img, isReady: isReady,
    drawCircleImage: drawCircleImage, rr: rr,
    drawIngredient: drawIngredient, drawChef: drawChef, drawPlate: drawPlate
  };
})();
