// recipes.js — the menu: ingredients, their prep states, and the dishes.
(function () {
  // Every ingredient: id, label, base colour, prep the chef must do.
  // prep: 'none' (ready), 'chop' (needs the board), 'grill' (needs the grill).
  var INGREDIENTS = {
    bun:     { id: 'bun',     label: 'Roti',   color: '#e8a94e', prep: 'none' },
    patty:   { id: 'patty',   label: 'Patty',  color: '#8a5a3b', prep: 'grill' },
    lettuce: { id: 'lettuce', label: 'Selada', color: '#7dc242', prep: 'chop' },
    tomato:  { id: 'tomato',  label: 'Tomat',  color: '#e84c3d', prep: 'chop' },
    cheese:  { id: 'cheese',  label: 'Keju',   color: '#ffc93c', prep: 'none' },
    onion:   { id: 'onion',   label: 'Bawang', color: '#c9a0dc', prep: 'chop' }
  };
  var ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'onion'];

  // A dish is a set of ready ingredients. The stack order on the plate is
  // bun first, then the rest in the order the chef adds them.
  var RECIPES = [
    { id: 'classic', name: 'Klasik',   price: 10, needs: ['bun', 'patty', 'lettuce'] },
    { id: 'cheese',  name: 'Keju Leleh', price: 12, needs: ['bun', 'patty', 'cheese'] },
    { id: 'garden',  name: 'Kebun',    price: 14, needs: ['bun', 'lettuce', 'tomato', 'onion'] },
    { id: 'deluxe',  name: 'Deluxe',   price: 18, needs: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'] }
  ];

  function ingredientNeeds(ingId) { return INGREDIENTS[ingId].prep; }
  function ingredientLabel(ingId) { return INGREDIENTS[ingId].label; }
  function ingredientColor(ingId) { return INGREDIENTS[ingId].color; }

  // Does the plate's ready-ingredient set equal this recipe exactly?
  function plateMatchesRecipe(plate, recipe) {
    if (plate.length !== recipe.needs.length) return false;
    var have = plate.slice().sort().join(',');
    return have === recipe.needs.slice().sort().join(',');
  }
  function findRecipeForPlate(plate) {
    for (var i = 0; i < RECIPES.length; i++) {
      if (plateMatchesRecipe(plate, RECIPES[i])) return RECIPES[i];
    }
    return null;
  }
  // Could this plate still become some recipe (used for the "wrong mix" hint)?
  function plateCouldBecome(plate) {
    for (var i = 0; i < RECIPES.length; i++) {
      var r = RECIPES[i];
      if (plate.length > r.needs.length) continue;
      var ok = plate.every(function (p) { return r.needs.indexOf(p) !== -1; });
      if (ok) return true;
    }
    return false;
  }
  function randomRecipe() { return RECIPES[Math.floor(Math.random() * RECIPES.length)]; }

  window.Recipes = {
    INGREDIENTS: INGREDIENTS, ORDER: ORDER, RECIPES: RECIPES,
    ingredientNeeds: ingredientNeeds, ingredientLabel: ingredientLabel,
    ingredientColor: ingredientColor, plateMatchesRecipe: plateMatchesRecipe,
    findRecipeForPlate: findRecipeForPlate, plateCouldBecome: plateCouldBecome,
    randomRecipe: randomRecipe
  };
})();
