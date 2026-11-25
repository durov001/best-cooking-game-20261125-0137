// kitchen.js — the kitchen floor: stations, the chef, and every interaction.
(function () {
  var FLOOR_Y = 648;
  var FLOOR_MIN = 612;
  var FLOOR_MAX = 686;

  // Stations across the counter. x is the centre, w the reach width.
  var STATIONS = {
    crates:   { id: 'crates',   label: 'Bahan',   x: 185, y: 470, w: 300, h: 120 },
    board:    { id: 'board',    label: 'Talenan', x: 468, y: 470, w: 170, h: 120 },
    grill:    { id: 'grill',    label: 'Grill',   x: 700, y: 470, w: 180, h: 120 },
    assembly: { id: 'assembly', label: 'Rakit',   x: 933, y: 470, w: 180, h: 120 },
    pass:     { id: 'pass',     label: 'Saji',    x: 1165, y: 470, w: 170, h: 120 },
    trash:    { id: 'trash',    label: 'Sampah',  x: 830, y: 585, w: 90, h: 60 }
  };

  function Kitchen() {
    this.chef = { x: 640, y: FLOOR_Y, dir: 1, walking: false, targetX: null, targetY: null, pendingInteract: null };
    this.carrying = null; // { kind, state: 'raw' | 'ready' } or { plate: true, stack: [] }
    this.plate = []; // the dish mid-assembly on the counter
    this.chop = { item: null, progress: 0, active: false }; // board
    this.grill = { item: null, timer: 0, done: false, burnt: false }; // grill
    this.particles = [];
    this.popups = []; // floating "+$12" texts
    this.toast = null; // { text, until }
    this.combo = 0;
    this.bestCombo = 0;
    this.coins = 0;
    this.shakeT = 0;
  }

  Kitchen.prototype.nearestStation = function () {
    var best = null, bestD = 1e9;
    var c = this.chef;
    for (var k in STATIONS) {
      var s = STATIONS[k];
      var d = Math.abs(c.x - s.x) + Math.abs(c.y - (s.y + 130)) * 0.6;
      if (d < bestD) { bestD = d; best = s; }
    }
    return bestD < 190 ? best : null;
  };

  Kitchen.prototype.showToast = function (text) {
    this.toast = { text: text, until: Date.now() + 1800 };
  };
  Kitchen.prototype.addPopup = function (x, y, text, color) {
    this.popups.push({ x: x, y: y, text: text, color: color || '#ffd93c', life: 1.4 });
  };
  Kitchen.prototype.burst = function (x, y, color, n, speed) {
    for (var i = 0; i < (n || 10); i++) {
      var a = Math.random() * Math.PI * 2;
      var v = (speed || 90) * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
        life: 0.5 + Math.random() * 0.5, max: 1, color: color, size: 3 + Math.random() * 4
      });
    }
  };
  Kitchen.prototype.steam = function (x, y) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 30, y: y, vx: (Math.random() - 0.5) * 12,
      vy: -34 - Math.random() * 20, life: 0.9, max: 0.9, color: 'rgba(255,255,255,0.75)', size: 7
    });
  };

  Kitchen.prototype.update = function (dt, keys, now) {
    var c = this.chef;
    var speed = 330;
    var mx = 0, my = 0;
    if (keys.left) mx -= 1;
    if (keys.right) mx += 1;
    if (keys.up) my -= 1;
    if (keys.down) my += 1;
    if (mx || my) {
      c.targetX = null; c.targetY = null;
      var len = Math.hypot(mx, my) || 1;
      c.x += mx / len * speed * dt;
      c.y += my / len * speed * dt * 0.7;
      if (mx) c.dir = mx > 0 ? 1 : -1;
      c.walking = true;
    } else if (c.targetX !== null) {
      var dx = c.targetX - c.x;
      var dy = (c.targetY !== null ? c.targetY : FLOOR_Y) - c.y;
      var dist = Math.hypot(dx, dy);
      if (dist < 6) {
        c.targetX = null; c.targetY = null; c.walking = false;
        if (c.pendingInteract) {
          var st = c.pendingInteract; c.pendingInteract = null;
          this.interact(st, now);
        }
      } else {
        c.x += dx / dist * speed * dt;
        c.y += dy / dist * speed * dt;
        if (dx) c.dir = dx > 0 ? 1 : -1;
        c.walking = true;
      }
    } else {
      c.walking = false;
    }
    c.x = Math.max(50, Math.min(1230, c.x));
    c.y = Math.max(FLOOR_MIN, Math.min(FLOOR_MAX, c.y));

    // chopping: hold-to-chop while the chef stands at the board
    if (this.chop.active && this.chop.item) {
      this.chop.progress += dt / 1.2;
      if (Math.random() < dt * 14) {
        this.burst(STATIONS.board.x, 520, Recipes.ingredientColor(this.chop.item), 2, 60);
        if (window.Sfx) Sfx.chop();
      }
      if (this.chop.progress >= 1) {
        var done = this.chop.item;
        this.chop = { item: null, progress: 0, active: false };
        this.carrying = { kind: done, state: 'ready' };
        if (window.Sfx) Sfx.chopDone();
        this.burst(STATIONS.board.x, 520, '#7dc242', 14, 110);
      }
    }
    // grilling: patty cooks on its own, then burns if forgotten
    if (this.grill.item) {
      this.grill.timer += dt;
      if (Math.random() < dt * 6) this.steam(STATIONS.grill.x, 500);
      if (!this.grill.done && this.grill.timer >= 4) {
        this.grill.done = true;
        if (window.Sfx) Sfx.grillDone();
        this.addPopup(STATIONS.grill.x, 470, 'Matang!', '#7dc242');
      }
      if (!this.grill.burnt && this.grill.timer >= 9) {
        this.grill.burnt = true;
        if (window.Sfx) Sfx.burn();
        this.showToast('Patty hangus! Buang ke tempat sampah.');
      }
    }
    // particles + popups
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (var j = this.popups.length - 1; j >= 0; j--) {
      var pp = this.popups[j];
      pp.life -= dt; pp.y -= 42 * dt;
      if (pp.life <= 0) this.popups.splice(j, 1);
    }
    if (this.shakeT > 0) this.shakeT -= dt;
  };

  Kitchen.prototype.clickAt = function (wx, wy) {
    var c = this.chef;
    // A crate bin was clicked: walk there and grab that ingredient.
    var bin = this.crateBinAt(wx, wy);
    if (bin) {
      c.targetX = STATIONS.crates.x; c.targetY = FLOOR_Y;
      c.pendingInteract = { id: 'crates', bin: bin };
      return;
    }
    for (var k in STATIONS) {
      var s = STATIONS[k];
      if (Math.abs(wx - s.x) < s.w / 2 + 20 && wy > s.y - 20 && wy < s.y + s.h + 30) {
        c.targetX = s.x; c.targetY = FLOOR_Y;
        c.pendingInteract = s;
        return;
      }
    }
    c.targetX = Math.max(50, Math.min(1230, wx));
    c.targetY = Math.max(FLOOR_MIN, Math.min(FLOOR_MAX, wy));
    c.pendingInteract = null;
  };

  Kitchen.prototype.crateBinAt = function (wx, wy) {
    var bins = crateBins();
    for (var i = 0; i < bins.length; i++) {
      var b = bins[i];
      if (wx >= b.x - 44 && wx <= b.x + 44 && wy >= b.y - 30 && wy <= b.y + 30) return b.id;
    }
    return null;
  };

  // Six bins in two rows of three, inside the crates station.
  function crateBins() {
    var xs = [95, 185, 275];
    var out = [];
    var ids = Recipes.ORDER;
    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < 3; c++) {
        out.push({ id: ids[r * 3 + c], x: xs[c], y: 448 + r * 62 });
      }
    }
    return out;
  }

  Kitchen.prototype.interact = function (station, now) {
    var st = station.id;
    var c = this.chef;
    if (st === 'crates') {
      var want = station.bin || 'bun';
      if (this.carrying) { this.showToast('Tangan penuh! Letakkan dulu.'); return; }
      if (this.chop.item || this.grill.item) { /* fine, hands are free */ }
      var prep = Recipes.ingredientNeeds(want);
      this.carrying = { kind: want, state: prep === 'none' ? 'ready' : 'raw' };
      if (window.Sfx) Sfx.pickup();
      return;
    }
    if (st === 'board') {
      if (this.chop.item && !this.chop.active) {
        this.chop.active = true; // resume chopping where it stopped
        return;
      }
      if (this.chop.item) { this.showToast('Talenan sedang dipakai.'); return; }
      if (this.carrying && !this.carrying.plate && Recipes.ingredientNeeds(this.carrying.kind) === 'chop' && this.carrying.state === 'raw') {
        this.chop = { item: this.carrying.kind, progress: 0, active: true };
        this.carrying = null;
        if (window.Sfx) Sfx.chop();
        return;
      }
      if (this.carrying && !this.carrying.plate) {
        this.showToast('Bahan ini tidak perlu dipotong.');
        return;
      }
      this.showToast('Bawa selada, tomat, atau bawang ke talenan.');
      return;
    }
    if (st === 'grill') {
      if (this.grill.item) {
        if (this.carrying) { this.showToast('Tangan penuh!'); return; }
        var g = this.grill;
        this.grill = { item: null, timer: 0, done: false, burnt: false };
        if (g.burnt) {
          this.carrying = { kind: 'patty', state: 'burnt' };
          this.showToast('Hangus! Buang ke tempat sampah.');
        } else if (g.done) {
          this.carrying = { kind: 'patty', state: 'ready' };
          if (window.Sfx) Sfx.pickup();
        } else {
          this.showToast('Belum matang, sabar!');
          this.grill = g; // put it back
        }
        return;
      }
      if (this.carrying && !this.carrying.plate && this.carrying.kind === 'patty' && this.carrying.state === 'raw') {
        this.grill = { item: 'patty', timer: 0, done: false, burnt: false };
        this.carrying = null;
        if (window.Sfx) Sfx.sizzle();
        return;
      }
      if (this.carrying && !this.carrying.plate) {
        this.showToast('Grill hanya untuk patty mentah.');
        return;
      }
      this.showToast('Bawa patty mentah ke grill.');
      return;
    }
    if (st === 'assembly') {
      if (this.carrying && this.carrying.plate) {
        // put the carried plate back down
        this.plate = this.carrying.stack;
        this.carrying = null;
        if (window.Sfx) Sfx.pickup();
        return;
      }
      if (this.carrying && !this.carrying.plate) {
        var it = this.carrying;
        if (it.state === 'raw') {
          this.showToast(Recipes.ingredientLabel(it.kind) + ' masih mentah — olah dulu!');
          if (window.Sfx) Sfx.wrong();
          return;
        }
        if (it.state === 'burnt') {
          this.showToast('Hangus! Buang dulu.');
          return;
        }
        if (this.plate.indexOf(it.kind) !== -1) {
          this.showToast('Sudah ada ' + Recipes.ingredientLabel(it.kind) + ' di piring.');
          return;
        }
        this.plate.push(it.kind);
        this.carrying = null;
        if (window.Sfx) Sfx.pickup();
        this.burst(STATIONS.assembly.x, 520, Recipes.ingredientColor(it.kind), 8, 80);
        if (!Recipes.plateCouldBecome(this.plate)) {
          this.showToast('Campuran ini tidak ada di menu!');
        }
        return;
      }
      // empty hands: pick the plate up
      if (this.plate.length > 0) {
        this.carrying = { plate: true, stack: this.plate.slice() };
        this.plate = [];
        if (window.Sfx) Sfx.pickup();
      } else {
        this.showToast('Rakit burger di sini: roti dulu, lalu isi.');
      }
      return;
    }
    if (st === 'pass') {
      if (this.carrying && this.carrying.plate) {
        var res = this.onServe ? this.onServe(this.carrying.stack) : { ok: false };
        if (res.ok) {
          var bonus = res.bonus || 0;
          var total = res.price + bonus;
          this.coins += total;
          this.combo++;
          if (this.combo > this.bestCombo) this.bestCombo = this.combo;
          this.carrying = null;
          this.addPopup(STATIONS.pass.x, 430, '+$' + total, '#ffd93c');
          this.burst(STATIONS.pass.x, 500, '#ffd93c', 18, 130);
          if (window.Sfx) { Sfx.serve(); Sfx.coin(); }
        } else {
          this.combo = 0;
          this.shakeT = 0.4;
          this.showToast('Tidak ada pesanan yang cocok!');
          if (window.Sfx) Sfx.wrong();
        }
        return;
      }
      this.showToast('Bawa piring jadi ke sini untuk disajikan.');
      return;
    }
    if (st === 'trash') {
      if (this.carrying) {
        this.carrying = null;
        this.burst(STATIONS.trash.x, 600, '#888888', 8, 70);
        if (window.Sfx) Sfx.click();
      }
      return;
    }
  };

  // Stop chopping when the player walks away.
  Kitchen.prototype.stopChop = function () {
    if (this.chop.active && this.chop.item) {
      this.chop.active = false;
    }
  };

  window.Kitchen = { Kitchen: Kitchen, STATIONS: STATIONS, crateBins: crateBins, FLOOR_Y: FLOOR_Y };
})();
