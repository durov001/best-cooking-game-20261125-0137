// recipes.js — the three Korean dishes of DAPUR KILAT v2.
// Each dish is a lesson chain: a fixed sequence of tactile steps.
// Dishes unlock one by one, like a lesson book: serve Kimchi 3 times
// to unlock Bibimbap, serve Bibimbap 3 times to unlock Tteokbokki.

export const DISHES = {
  kimchi: {
    id: 'kimchi',
    name: 'Kimchi',
    img: 'assets/kimchi-bowl.jpg',
    color: '#e8501e',
    price: 18,
    unlock: null, // open from the start
    unlockText: '',
    ingredients: [
      { id: 'sawi', name: 'Sawi', color: '#7ec850', kind: 'leaf' },
      { id: 'bawang', name: 'Bawang', color: '#f2e6c9', kind: 'onion' },
      { id: 'jahe', name: 'Jahe', color: '#e8b96a', kind: 'root' },
      { id: 'wortel', name: 'Wortel', color: '#ff7f2a', kind: 'carrot' },
      { id: 'cabai', name: 'Cabai', color: '#d92626', kind: 'chili' },
    ],
    steps: ['collect', 'chop', 'pour', 'stir', 'grate', 'assemble'],
    chopTarget: 'sawi',
    chopLabel: 'Potong sawinya!',
    pourLabel: 'Tuang airnya!',
    grateTarget: 'wortel',
    grateTool: 'lebar',
    grateLabel: 'Parut wortelnya!',
  },
  bibimbap: {
    id: 'bibimbap',
    name: 'Bibimbap',
    img: 'assets/bibimbap-bowl.jpg',
    color: '#c94f6d',
    price: 24,
    unlock: { dish: 'kimchi', count: 3 },
    unlockText: 'Sajikan Kimchi 3x untuk buka',
    ingredients: [
      { id: 'nasi', name: 'Nasi', color: '#fff6e0', kind: 'bowl' },
      { id: 'telur', name: 'Telur', color: '#ffd94d', kind: 'egg' },
      { id: 'wortel', name: 'Wortel', color: '#ff7f2a', kind: 'carrot' },
      { id: 'bayam', name: 'Bayam', color: '#3da53d', kind: 'leaf' },
      { id: 'saus', name: 'Saus', color: '#c0392b', kind: 'sauce' },
    ],
    steps: ['collect', 'chop', 'pour', 'stir', 'assemble'],
    chopTarget: 'wortel',
    chopLabel: 'Potong wortelnya!',
    pourLabel: 'Tuang sausnya!',
    grateTarget: null,
    grateTool: null,
    grateLabel: '',
  },
  tteokbokki: {
    id: 'tteokbokki',
    name: 'Tteokbokki',
    img: 'assets/tteokbokki-plate.jpg',
    color: '#d92626',
    price: 30,
    unlock: { dish: 'bibimbap', count: 3 },
    unlockText: 'Sajikan Bibimbap 3x untuk buka',
    ingredients: [
      { id: 'tteok', name: 'Tteok', color: '#fff1d6', kind: 'cake' },
      { id: 'saus', name: 'Saus Pedas', color: '#c0392b', kind: 'sauce' },
      { id: 'daunbawang', name: 'Daun Bawang', color: '#4caf50', kind: 'leaf' },
      { id: 'keju', name: 'Keju', color: '#ffcf3f', kind: 'cheese' },
    ],
    steps: ['collect', 'pour', 'stir', 'grate', 'assemble'],
    chopTarget: null,
    chopLabel: '',
    pourLabel: 'Tuang saus pedasnya!',
    grateTarget: 'keju',
    grateTool: 'halus',
    grateLabel: 'Parut kejunya!',
  },
};

export const DISH_ORDER = ['kimchi', 'bibimbap', 'tteokbokki'];

// The three graters on the grate panel. Only one is right per ingredient.
export const GRATERS = [
  { id: 'halus', name: 'Halus', desc: 'lubang kecil' },
  { id: 'lebar', name: 'Lebar', desc: 'slot lebar' },
  { id: 'sedang', name: 'Sedang', desc: 'gigi sedang' },
];

export function isUnlocked(dishId, served) {
  const d = DISHES[dishId];
  if (!d.unlock) return true;
  return (served[d.unlock.dish] || 0) >= d.unlock.count;
}

export function unlockedDishes(served) {
  return DISH_ORDER.filter((id) => isUnlocked(id, served));
}
