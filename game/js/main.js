// main.js — Dapur Kilat: game loop, states, input, and all on-screen drawing.
(function () {
  var W = 1280, H = 720;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var game = {
    state: 'title', // title | playing | paused | over
    elapsed: 0,
    shiftLen: 120,
    frozen: false,
    board: new Orders.OrderBoard(),
    kitchen: new Kitchen.Kitchen(),
    keys: {},
    serveFlash: null,
    last: 0,
    muted: false
  };
  game.kitchen.onServe = function (stack) {
    var res = game.board.serve(stack);
    if (!res.ok) return { ok: false };
    var o = res.order;
    var bonus = Math.round(4 * Math.max(0, o.patience / o.maxPatience));
    game.serveFlash = { customer: o.customer, until: Date.now() + 1800, name: Customers.person(o.customer).name };
    return { ok: true, price: o.recipe.price, bonus: bonus, order: o };
  };

  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    var m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function startGame() {
    game.state = 'playing';
    game.elapsed = 0;
    game.board = new Orders.OrderBoard();
    game.kitchen = new Kitchen.Kitchen();
    game.kitchen.onServe = game.kitchen.onServe || null;
    game.kitchen.onServe = function (stack) {
      var res = game.board.serve(stack);
      if (!res.ok) return { ok: false };
      var o = res.order;
      var bonus = Math.round(4 * Math.max(0, o.patience / o.maxPatience));
      game.serveFlash = { customer: o.customer, until: Date.now() + 1800, name: Customers.person(o.customer).name };
      return { ok: true, price: o.recipe.price, bonus: bonus, order: o };
    };
    game.serveFlash = null;
    if (window.Sfx) Sfx.unlock();
  }

  function update(dt) {
    if (game.state !== 'playing' || game.frozen) return;
    game.elapsed += dt;
    var evt = game.board.update(dt, game.elapsed, game.shiftLen);
    if (evt && evt.type === 'lost') {
      game.kitchen.combo = 0;
      game.kitchen.showToast(Customers.person(evt.order.customer).name + ' pergi! Pesanan hangus.');
    }
    // moving away stops chopping
    if (game.kitchen.chop.active && (game.keys.left || game.keys.right || game.keys.up || game.keys.down)) {
      game.kitchen.stopChop();
    }
    game.kitchen.update(dt, game.keys, Date.now());
    if (game.elapsed >= game.shiftLen) {
      game.state = 'over';
      if (window.Sfx) Sfx.win();
    }
  }

  // ---------- input ----------
  var KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
  window.addEventListener('keydown', function (e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(e.code) !== -1) e.preventDefault();
    if (game.state === 'title' && (e.code === 'Enter' || e.code === 'Space')) { startGame(); return; }
    if (game.state === 'over' && (e.code === 'Enter' || e.code === 'KeyR')) { startGame(); return; }
    if (e.code === 'KeyP' && (game.state === 'playing' || game.state === 'paused')) {
      game.state = game.state === 'playing' ? 'paused' : 'playing';
      return;
    }
    if (e.code === 'KeyM') { game.muted = Sfx.toggleMute(); return; }
    if (KEYMAP[e.code]) game.keys[KEYMAP[e.code]] = true;
    if (game.state === 'playing' && (e.code === 'KeyE' || e.code === 'Space')) {
      var st = game.kitchen.nearestStation();
      if (st) game.kitchen.interact(st, Date.now());
    }
    if (game.state === 'playing' && /^Digit[1-6]$/.test(e.code)) {
      var idx = parseInt(e.code.slice(5), 10) - 1;
      var ing = Recipes.ORDER[idx];
      var near = game.kitchen.nearestStation();
      if (near && near.id === 'crates' && !game.kitchen.carrying) {
        game.kitchen.interact({ id: 'crates', bin: ing }, Date.now());
      }
    }
  });
  window.addEventListener('keyup', function (e) {
    if (KEYMAP[e.code]) game.keys[KEYMAP[e.code]] = false;
  });
  canvas.addEventListener('mousedown', function (e) {
    if (window.Sfx) Sfx.unlock();
    if (game.state === 'title') { startGame(); return; }
    if (game.state === 'over') return;
    if (game.state === 'paused') { game.state = 'playing'; return; }
    var r = canvas.getBoundingClientRect();
    var wx = (e.clientX - r.left) * (W / r.width);
    var wy = (e.clientY - r.top) * (H / r.height);
    game.kitchen.clickAt(wx, wy);
  });

  // ---------- drawing ----------
  function drawBackground() {
    var bg = Art.img('bg');
    if (bg && bg.naturalWidth) ctx.drawImage(bg, 0, 0, W, H);
    else { ctx.fillStyle = '#f7e8c9'; ctx.fillRect(0, 0, W, H); }
    // clean wooden counter over the painted one, so stations read clearly
    ctx.fillStyle = '#a9713f';
    ctx.fillRect(0, 428, W, 172);
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(0, 428, W, 8);
    ctx.fillStyle = '#c08a52';
    ctx.fillRect(0, 596, W, 6);
    // floor
    ctx.fillStyle = '#6e4a2f';
    ctx.fillRect(0, 602, W, H - 602);
    ctx.fillStyle = '#7d5638';
    for (var x = 0; x < W; x += 160) ctx.fillRect(x, 602, 4, H - 602);
  }

  function drawOrderBoard() {
    ctx.fillStyle = 'rgba(255,248,230,0.96)';
    ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(0, 96, W, 4);
    var tickets = game.board.tickets;
    if (tickets.length === 0) {
      ctx.fillStyle = '#8a6d4b';
      ctx.font = 'italic 20px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('Pesanan masuk sebentar lagi…', 24, 48);
    }
    tickets.forEach(function (o, i) {
      var x = 16 + i * 218;
      var y = 8, w = 206, h = 80;
      var frac = Math.max(0, o.patience / o.maxPatience);
      var urgent = o.patience < 10;
      var flashOn = urgent && Math.floor(Date.now() / 300) % 2 === 0;
      ctx.save();
      if (game.kitchen.shakeT > 0 && i === 0) ctx.translate(Math.sin(Date.now() / 30) * 3, 0);
      ctx.fillStyle = flashOn ? '#ffe1de' : '#fffdf6';
      Art.rr(ctx, x, y, w, h, 10); ctx.fill();
      ctx.lineWidth = urgent ? 3.5 : 2;
      ctx.strokeStyle = urgent ? '#e74c3c' : '#d9c9a8';
      Art.rr(ctx, x, y, w, h, 10); ctx.stroke();
      Customers.drawPortrait(ctx, o.customer, x + 30, y + 30, 24, frac, false);
      ctx.fillStyle = '#3a2a1a';
      ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(o.recipe.name + '  ·  $' + o.recipe.price, x + 62, y + 18);
      // recipe icons
      o.recipe.needs.forEach(function (ing, j) {
        Art.drawIngredient(ctx, ing, x + 76 + j * 30, y + 46, 24);
      });
      // patience bar
      ctx.fillStyle = '#e8dcc4';
      Art.rr(ctx, x + 62, y + 66, 132, 8, 4); ctx.fill();
      ctx.fillStyle = frac > 0.5 ? '#2ecc71' : frac > 0.25 ? '#f39c12' : '#e74c3c';
      if (frac > 0) { Art.rr(ctx, x + 62, y + 66, 132 * frac, 8, 4); ctx.fill(); }
      if (urgent) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.ceil(o.patience) + 's!', x + w - 8, y + 16);
      }
      ctx.restore();
    });
  }

  function drawHud() {
    // coins (left, under the board)
    ctx.fillStyle = 'rgba(43,26,18,0.85)';
    Art.rr(ctx, 16, 108, 150, 40, 20); ctx.fill();
    ctx.fillStyle = '#ffd93c';
    ctx.beginPath(); ctx.arc(38, 128, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', 38, 129);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('$' + game.kitchen.coins, 58, 129);
    // shift timer (centre, big, colour-shifting)
    var remain = game.shiftLen - game.elapsed;
    var tcol = remain > 60 ? '#2ecc71' : remain > 30 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = 'rgba(43,26,18,0.85)';
    Art.rr(ctx, W / 2 - 110, 108, 220, 44, 22); ctx.fill();
    ctx.fillStyle = tcol;
    ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WAKTU ' + fmtTime(remain), W / 2, 131);
    // combo (right)
    if (game.kitchen.combo >= 2) {
      ctx.fillStyle = 'rgba(43,26,18,0.85)';
      Art.rr(ctx, W - 176, 108, 160, 40, 20); ctx.fill();
      ctx.fillStyle = '#ff8c1a';
      ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COMBO x' + game.kitchen.combo, W - 96, 129);
    }
    if (game.muted) {
      ctx.fillStyle = 'rgba(43,26,18,0.85)';
      Art.rr(ctx, W - 220, 108, 36, 40, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('MUTE', W - 202, 129);
    }
  }

  function drawStations() {
    var K = game.kitchen;
    var S = Kitchen.STATIONS;
    var near = K.nearestStation();
    function label(s, text) {
      ctx.fillStyle = 'rgba(43,26,18,0.8)';
      Art.rr(ctx, s.x - 52, s.y - 34, 104, 24, 12); ctx.fill();
      ctx.fillStyle = '#ffe9b8';
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, s.x, s.y - 21);
      if (near && near.id === s.id && game.state === 'playing') {
        ctx.strokeStyle = '#ffd93c'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(s.x, s.y + 40, 62, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // crates: six bins
    Kitchen.crateBins().forEach(function (b, i) {
      ctx.fillStyle = '#7a4a22';
      Art.rr(ctx, b.x - 46, b.y - 30, 92, 60, 8); ctx.fill();
      ctx.fillStyle = '#9c6633';
      Art.rr(ctx, b.x - 42, b.y - 26, 84, 52, 6); ctx.fill();
      Art.drawIngredient(ctx, b.id, b.x, b.y - 2, 46);
      ctx.fillStyle = 'rgba(43,26,18,0.75)';
      ctx.beginPath(); ctx.arc(b.x - 36, b.y - 22, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), b.x - 36, b.y - 21);
      ctx.fillStyle = '#ffe9b8'; ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      ctx.fillText(Recipes.ingredientLabel(b.id), b.x, b.y + 40);
    });
    // crates label sits above the bins so it never covers an ingredient
    ctx.fillStyle = 'rgba(43,26,18,0.8)';
    Art.rr(ctx, S.crates.x - 52, 402, 104, 24, 12); ctx.fill();
    ctx.fillStyle = '#ffe9b8';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('BAHAN  (1–6)', S.crates.x, 415);
    // chopping board
    ctx.fillStyle = '#d9a866';
    Art.rr(ctx, S.board.x - 78, 500, 156, 58, 10); ctx.fill();
    ctx.fillStyle = '#b9834a';
    Art.rr(ctx, S.board.x - 78, 548, 156, 10, 5); ctx.fill();
    if (K.chop.item) {
      Art.drawIngredient(ctx, K.chop.item, S.board.x, 526, 52);
      var pr = K.chop.progress;
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(S.board.x, 526, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#2ecc71';
      ctx.beginPath(); ctx.arc(S.board.x, 526, 40, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(44,74,18,0.9)';
      Art.rr(ctx, S.board.x - 42, 470, 84, 22, 11); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('POTONG…', S.board.x, 482);
    }
    label(S.board, 'TALENAN  (tahan E)');
    // grill
    ctx.fillStyle = '#3a3a3a';
    Art.rr(ctx, S.grill.x - 86, 498, 172, 60, 10); ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 3;
    for (var g = 0; g < 6; g++) {
      ctx.beginPath(); ctx.moveTo(S.grill.x - 78, 508 + g * 8); ctx.lineTo(S.grill.x + 78, 508 + g * 8); ctx.stroke();
    }
    if (K.grill.item) {
      var col = K.grill.burnt ? '#222' : K.grill.done ? '#a4714e' : '#8a5a3b';
      ctx.fillStyle = col;
      Art.rr(ctx, S.grill.x - 40, 512, 80, 26, 12); ctx.fill();
      var frac = K.grill.burnt ? 1 : Math.min(1, K.grill.timer / 4);
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(S.grill.x, 525, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = K.grill.burnt ? '#e74c3c' : K.grill.done ? '#2ecc71' : '#f39c12';
      ctx.beginPath(); ctx.arc(S.grill.x, 525, 44, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = K.grill.burnt ? '#e74c3c' : '#fff';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(K.grill.burnt ? 'HANGUS!' : K.grill.done ? 'MATANG!' : 'GRILL…', S.grill.x, 578);
    }
    label(S.grill, 'GRILL');
    // assembly counter: the dish mid-assembly
    ctx.fillStyle = '#e8dcc4';
    Art.rr(ctx, S.assembly.x - 88, 500, 176, 58, 10); ctx.fill();
    if (K.plate.length > 0) {
      Art.drawPlate(ctx, S.assembly.x, 528, K.plate, 1);
      var done = Recipes.findRecipeForPlate(K.plate);
      if (done) {
        ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(S.assembly.x, 528, 56, 0, Math.PI * 2); ctx.stroke();
        var label2 = done.name.toUpperCase() + ' SIAP!';
        ctx.font = 'bold 15px sans-serif';
        var lw = ctx.measureText(label2).width + 20;
        ctx.fillStyle = 'rgba(46,204,113,0.95)';
        Art.rr(ctx, S.assembly.x - lw / 2, 584, lw, 24, 12); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(label2, S.assembly.x, 597);
      }
    } else {
      ctx.fillStyle = '#b9a888'; ctx.font = 'italic 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('piring kosong', S.assembly.x, 532);
    }
    label(S.assembly, 'RAKIT BURGER');
    // serving pass
    ctx.fillStyle = '#fff6e0';
    Art.rr(ctx, S.pass.x - 82, 478, 164, 80, 10); ctx.fill();
    ctx.strokeStyle = '#d9b25a'; ctx.lineWidth = 3;
    Art.rr(ctx, S.pass.x - 82, 478, 164, 80, 10); ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath(); ctx.arc(S.pass.x, 508, 16, Math.PI, 0); ctx.fill();
    ctx.fillRect(S.pass.x - 20, 508, 40, 5);
    ctx.fillStyle = '#8a6d4b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SAJIKAN DI SINI', S.pass.x, 544);
    label(S.pass, 'PASS  (E)');
    // trash
    var T = S.trash;
    ctx.fillStyle = '#5a5a5a';
    Art.rr(ctx, T.x - 22, 596, 44, 52, 6); ctx.fill();
    ctx.fillStyle = '#777';
    Art.rr(ctx, T.x - 26, 590, 52, 10, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SAMPAH', T.x, 660);
  }

  function drawChefAndEffects() {
    var K = game.kitchen;
    var c = K.chef;
    // hint bubble when standing at a station with something to do
    // (hidden while carrying a plate — the pass is the only thing left to do)
    var near = K.nearestStation();
    if (near && game.state === 'playing' && !(K.carrying && K.carrying.plate)) {
      ctx.fillStyle = 'rgba(43,26,18,0.85)';
      var msg = near.id === 'crates' ? 'Pilih bahan (1–6 / klik)' :
        near.id === 'board' ? 'E: potong' :
        near.id === 'grill' ? 'E: grill / ambil' :
        near.id === 'assembly' ? 'E: tambah / ambil piring' :
        near.id === 'pass' ? 'E: sajikan!' : 'E: buang';
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      var w = ctx.measureText(msg).width + 22;
      Art.rr(ctx, c.x - w / 2, c.y - 190, w, 28, 14); ctx.fill();
      ctx.fillStyle = '#ffe9b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(msg, c.x, c.y - 175);
    }
    var carrying = null;
    if (K.carrying) {
      carrying = K.carrying.plate ? 'plate' : K.carrying.kind;
    }
    if (carrying === 'plate') {
      Art.drawChef(ctx, c.x, c.y, c.dir, c.walking, null);
      Art.drawPlate(ctx, c.x + 34 * c.dir, c.y - 108, K.carrying.stack, 0.85);
    } else {
      Art.drawChef(ctx, c.x, c.y, c.dir, c.walking, carrying);
    }
    // particles
    K.particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // popups
    K.popups.forEach(function (pp) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pp.life));
      ctx.fillStyle = pp.color;
      ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4;
      ctx.strokeText(pp.text, pp.x, pp.y);
      ctx.fillText(pp.text, pp.x, pp.y);
    });
    ctx.globalAlpha = 1;
    // toast
    if (K.toast && Date.now() < K.toast.until) {
      ctx.fillStyle = 'rgba(43,26,18,0.9)';
      ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
      var tw = ctx.measureText(K.toast.text).width + 30;
      Art.rr(ctx, W / 2 - tw / 2, 668, tw, 34, 17); ctx.fill();
      ctx.fillStyle = '#ffe9b8'; ctx.textAlign = 'center';
      ctx.fillText(K.toast.text, W / 2, 686);
    }
  }

  function drawServeFlash() {
    if (!game.serveFlash || Date.now() > game.serveFlash.until) { game.serveFlash = null; return; }
    var f = game.serveFlash;
    ctx.save();
    ctx.fillStyle = 'rgba(255,248,230,0.95)';
    Art.rr(ctx, W - 330, 160, 300, 96, 14); ctx.fill();
    ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 3;
    Art.rr(ctx, W - 330, 160, 300, 96, 14); ctx.stroke();
    Customers.drawPortrait(ctx, f.customer, W - 288, 208, 34, 1, true);
    ctx.fillStyle = '#2c7a3d';
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(f.name + ' senang!', W - 240, 196);
    ctx.fillStyle = '#5a4632'; ctx.font = '16px "Trebuchet MS", sans-serif';
    ctx.fillText('“Enak banget, makasih!”', W - 240, 222);
    ctx.restore();
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(43,26,18,0.72)';
    ctx.fillRect(0, 0, W, H);
    var dish = Art.img('dish');
    if (dish && dish.naturalWidth) {
      ctx.save();
      ctx.beginPath(); ctx.arc(960, 300, 190, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(dish, 770, 110, 380, 380);
      ctx.restore();
      ctx.strokeStyle = '#ffd93c'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(960, 300, 190, 0, Math.PI * 2); ctx.stroke();
    }
    Art.drawCircleImage(ctx, 'chef', 120, 140, 60);
    ctx.fillStyle = '#ffd93c';
    ctx.font = 'bold 84px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DAPUR KILAT', 480, 170);
    ctx.fillStyle = '#fff';
    ctx.font = 'italic 26px "Trebuchet MS", sans-serif';
    ctx.fillText('Masak cepat, sajikan tepat waktu!', 480, 225);
    ctx.font = '19px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffe9b8';
    ctx.textAlign = 'left';
    var lines = [
      'Kamu chef-nya. Pelanggan pesan burger — rakit sesuai resep sebelum mereka ngambek.',
      'Ambil bahan (1–6), potong di talenan, grill patty, rakit di meja, sajikan di pass.',
      'Shift 120 detik. Kombo beruntun = koin lebih banyak. Jangan sampai patty hangus!'
    ];
    lines.forEach(function (l, i) { ctx.fillText(l, 120, 440 + i * 30); });
    var pulse = 0.7 + Math.sin(Date.now() / 300) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#2ecc71';
    Art.rr(ctx, 330, 540, 300, 56, 28); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▶  MULAI MASAK', 480, 569);
    ctx.fillStyle = '#d8c9a8'; ctx.font = '15px sans-serif';
    ctx.fillText('WASD / panah bergerak · E interaksi · klik untuk jalan · P jeda · M suara', 480, 630);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(43,26,18,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('JEDA', W / 2, H / 2 - 20);
    ctx.font = '20px "Trebuchet MS", sans-serif';
    ctx.fillText('Tekan P untuk lanjut', W / 2, H / 2 + 30);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(43,26,18,0.78)';
    ctx.fillRect(0, 0, W, H);
    Art.drawCircleImage(ctx, 'chef', W / 2, 150, 70);
    ctx.fillStyle = '#ffd93c';
    ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SHIFT SELESAI!', W / 2, 260);
    var K = game.kitchen, B = game.board;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillText('Koin: $' + K.coins, W / 2, 330);
    ctx.font = '24px "Trebuchet MS", sans-serif';
    ctx.fillText('Pesanan tersaji: ' + B.servedCount + '   ·   Pelanggan kabur: ' + B.lostCount, W / 2, 375);
    ctx.fillText('Kombo terbaik: x' + K.bestCombo, W / 2, 410);
    var verdict = K.coins >= 150 ? 'Koki bintang lima! Dapur ini milikmu.' :
      K.coins >= 80 ? 'Shift yang solid. Besok lebih cepat lagi!' :
      'Dapur masih berantakan — coba lagi, chef!';
    ctx.fillStyle = '#ffe9b8'; ctx.font = 'italic 22px "Trebuchet MS", sans-serif';
    ctx.fillText(verdict, W / 2, 460);
    ctx.fillStyle = '#2ecc71';
    Art.rr(ctx, W / 2 - 150, 510, 300, 56, 28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.fillText('↻  MAIN LAGI  (R)', W / 2, 539);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (game.state === 'title') {
      drawBackground();
      drawStations();
      drawTitle();
      return;
    }
    drawBackground();
    drawStations();
    drawOrderBoard();
    drawHud();
    drawChefAndEffects();
    drawServeFlash();
    if (game.state === 'paused') drawPaused();
    if (game.state === 'over') drawGameOver();
  }

  function loop(t) {
    var dt = Math.min(0.05, (t - game.last) / 1000 || 0.016);
    game.last = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // Headless smoke test (?selftest=1): drives the real grab/chop/grill/
  // assemble/serve path synchronously and writes PASS/FAIL into the DOM.
  function runSelfTest() {
    var R = [];
    function ck(n, c) { R.push((c ? 'PASS ' : 'FAIL ') + n); }
    try {
      startGame();
      var K = game.kitchen, B = game.board;
      B.tickets = [{ id: 1, recipe: Recipes.RECIPES[0], customer: 0, patience: 40, maxPatience: 46, bornAt: 0, flash: 0, served: false, lost: false }];
      B.spawnTimer = 9999;
      K.interact({ id: 'crates', bin: 'bun' }, Date.now());
      ck('grab bun', !!(K.carrying && K.carrying.kind === 'bun'));
      K.interact({ id: 'assembly' }, Date.now());
      ck('plate has bun', K.plate.length === 1 && K.plate[0] === 'bun');
      K.interact({ id: 'crates', bin: 'patty' }, Date.now());
      ck('grab patty raw', !!(K.carrying && K.carrying.state === 'raw'));
      K.interact({ id: 'grill' }, Date.now());
      ck('patty on grill', !!K.grill.item);
      for (var i = 0; i < 50; i++) K.update(0.1, {}, Date.now());
      ck('patty grilled', K.grill.done === true);
      K.interact({ id: 'grill' }, Date.now());
      ck('pick grilled patty', !!(K.carrying && K.carrying.state === 'ready'));
      K.interact({ id: 'assembly' }, Date.now());
      ck('plate has patty', K.plate.indexOf('patty') !== -1);
      K.interact({ id: 'crates', bin: 'lettuce' }, Date.now());
      K.interact({ id: 'board' }, Date.now());
      ck('chopping started', K.chop.item === 'lettuce' && K.chop.active);
      for (var j = 0; j < 15; j++) K.update(0.1, {}, Date.now());
      ck('lettuce chopped+carried', !!(K.carrying && K.carrying.kind === 'lettuce' && K.carrying.state === 'ready'));
      K.interact({ id: 'assembly' }, Date.now());
      ck('plate complete classic', !!Recipes.findRecipeForPlate(K.plate));
      K.interact({ id: 'assembly' }, Date.now());
      ck('carrying plate', !!(K.carrying && K.carrying.plate));
      var coinsBefore = K.coins;
      K.interact({ id: 'pass' }, Date.now());
      ck('served for coins', K.coins > coinsBefore && B.servedCount === 1);
      ck('combo 1', K.combo === 1);
      K.interact({ id: 'crates', bin: 'cheese' }, Date.now());
      K.interact({ id: 'assembly' }, Date.now());
      K.interact({ id: 'assembly' }, Date.now());
      K.interact({ id: 'pass' }, Date.now());
      ck('wrong dish rejected', K.combo === 0 && K.carrying !== null);
    } catch (err) {
      R.push('ERROR ' + err.message);
    }
    var pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = R.join('\n');
    document.body.appendChild(pre);
    document.title = R.join(' | ');
  }

  Art.loadAll(function () {
    Shots.applyShot(game);
    if (new URLSearchParams(window.location.search).get('selftest')) runSelfTest();
    requestAnimationFrame(loop);
  });
  // Fallback if images fail: start anyway after a short wait.
  setTimeout(function () {
    if (!game.last) { Shots.applyShot(game); requestAnimationFrame(loop); }
  }, 2500);
})();
