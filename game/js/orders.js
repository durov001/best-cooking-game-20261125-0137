// orders.js — the order board: tickets spawn, patience drains, serving pays.
(function () {
  var nextId = 1;

  function makeOrder(elapsed, shiftLen) {
    // Pressure grows with the shift: shorter patience, faster spawns, more tickets.
    var t = elapsed / shiftLen;
    var patience = 46 - 18 * t; // 46s -> 28s
    return {
      id: nextId++,
      recipe: Recipes.randomRecipe(),
      customer: Math.floor(Math.random() * Customers.count()),
      patience: patience,
      maxPatience: patience,
      bornAt: elapsed,
      flash: 0,
      served: false,
      lost: false
    };
  }

  function OrderBoard() {
    this.tickets = [];
    this.spawnTimer = 6; // first ticket comes fast so the board is never empty
    this.servedCount = 0;
    this.lostCount = 0;
  }
  OrderBoard.prototype.maxTickets = function (elapsed, shiftLen) {
    var t = elapsed / shiftLen;
    return t < 0.3 ? 2 : t < 0.65 ? 3 : 4;
  };
  OrderBoard.prototype.spawnInterval = function (elapsed, shiftLen) {
    var t = elapsed / shiftLen;
    return 15 - 7 * t; // 15s -> 8s
  };
  OrderBoard.prototype.update = function (dt, elapsed, shiftLen) {
    var i, o;
    for (i = this.tickets.length - 1; i >= 0; i--) {
      o = this.tickets[i];
      o.patience -= dt;
      o.flash = Math.max(0, o.flash - dt);
      if (o.patience <= 0 && !o.lost) {
        o.lost = true;
        this.lostCount++;
        this.tickets.splice(i, 1);
        if (window.Sfx) Sfx.lost();
        return { type: 'lost', order: o };
      }
      if (o.patience < 10 && Math.floor(o.patience) !== Math.floor(o.patience + dt)) {
        if (window.Sfx) Sfx.alarm();
      }
    }
    this.spawnTimer -= dt;
    var max = this.maxTickets(elapsed, shiftLen);
    if (this.spawnTimer <= 0 && this.tickets.length < max) {
      this.tickets.push(makeOrder(elapsed, shiftLen));
      this.spawnTimer = this.spawnInterval(elapsed, shiftLen);
    }
    return null;
  };
  OrderBoard.prototype.serve = function (plate) {
    // Find a ticket whose recipe matches the plate exactly.
    for (var i = 0; i < this.tickets.length; i++) {
      var o = this.tickets[i];
      if (Recipes.plateMatchesRecipe(plate, o.recipe)) {
        this.tickets.splice(i, 1);
        this.servedCount++;
        o.served = true;
        return { ok: true, order: o };
      }
    }
    return { ok: false };
  };
  OrderBoard.prototype.hasTicketFor = function (recipeId) {
    return this.tickets.some(function (o) { return o.recipe.id === recipeId; });
  };

  window.Orders = { OrderBoard: OrderBoard, makeOrder: makeOrder };
})();
