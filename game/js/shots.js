// shots.js — deterministic states for the screenshots (?shot=cover|chopping|serving|rush).
// The game reads these before the first frame so each capture shows the right moment.
(function () {
  function applyShot(game) {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get('shot');
    if (!shot) return null;
    game.state = 'playing';
    game.frozen = true; // the shift timer does not run in a screenshot
    game.elapsed = 42;
    game.shiftLen = 120;
    game.kitchen.coins = 48;
    var K = game.kitchen;
    var B = game.board;
    B.tickets = [];
    function ticket(recipeId, customer, patience, maxP) {
      var r = Recipes.RECIPES.find(function (x) { return x.id === recipeId; });
      return { id: 100 + B.tickets.length, recipe: r, customer: customer, patience: patience, maxPatience: maxP, bornAt: 0, flash: 0, served: false, lost: false };
    }
    if (shot === 'cover') {
      B.tickets.push(ticket('classic', 0, 31, 46));
      B.tickets.push(ticket('cheese', 1, 22, 46));
      B.tickets.push(ticket('deluxe', 2, 38, 46));
      K.plate = ['bun', 'patty', 'lettuce'];
      K.chef.x = 470; K.chef.y = 648; K.chef.dir = 1;
      K.carrying = { kind: 'tomato', state: 'raw' };
      K.combo = 3;
      game.elapsed = 23;
    } else if (shot === 'chopping') {
      B.tickets.push(ticket('garden', 0, 8, 46));
      B.tickets.push(ticket('classic', 1, 25, 46));
      B.tickets[0].flash = 1;
      K.chop = { item: 'tomato', progress: 0.65, active: true };
      K.chef.x = 468; K.chef.y = 648; K.chef.dir = 1;
      K.combo = 1;
      game.elapsed = 51;
    } else if (shot === 'serving') {
      B.tickets.push(ticket('deluxe', 2, 30, 46));
      K.chef.x = 1120; K.chef.y = 648; K.chef.dir = 1;
      K.carrying = { plate: true, stack: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'] };
      K.combo = 4;
      K.coins = 86;
      game.serveFlash = { customer: 2, until: Date.now() + 60000, name: 'Bimo' };
      K.addPopup(1165, 430, '+$18', '#ffd93c');
      K.addPopup(1120, 380, '+$6 bonus', '#7dc242');
      game.elapsed = 74;
    } else if (shot === 'rush') {
      B.tickets.push(ticket('classic', 0, 9, 46));
      B.tickets.push(ticket('garden', 1, 17, 46));
      B.tickets.push(ticket('cheese', 2, 26, 46));
      B.tickets.push(ticket('deluxe', 0, 33, 46));
      B.tickets[0].flash = 1;
      K.chef.x = 980; K.chef.y = 648; K.chef.dir = 1;
      K.carrying = { plate: true, stack: ['bun', 'patty', 'cheese'] };
      K.combo = 5;
      K.coins = 124;
      game.elapsed = 96;
    }
    return shot;
  }
  window.Shots = { applyShot: applyShot };
})();
