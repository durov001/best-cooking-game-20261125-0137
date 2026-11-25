// customers.js — the people at the pass: who they are and how their mood shows.
(function () {
  // The three portraits live in one AI image, three equal columns.
  // Crops: [x, y, w, h] inside the 768x512 customers.jpg.
  var PEOPLE = [
    { name: 'Mira',  crop: [0, 0, 256, 512], color: '#e74c3c', greeting: 'Lapar banget!' },
    { name: 'Pak Dar', crop: [256, 0, 256, 512], color: '#8e6b3d', greeting: 'Burgernya, nak.' },
    { name: 'Bimo',  crop: [512, 0, 256, 512], color: '#f39c12', greeting: 'Aku mau yang besar!' }
  ];

  function person(i) { return PEOPLE[i % PEOPLE.length]; }
  function count() { return PEOPLE.length; }

  // Mood from patience fraction: 1 = happy, 0 = furious.
  function moodFor(frac) {
    if (frac > 0.5) return 'happy';
    if (frac > 0.25) return 'impatient';
    return 'angry';
  }

  // Draw the portrait (cropped column) with a mood overlay: sweat drops when
  // impatient, a red tint and steam when angry, sparkles when delighted.
  function drawPortrait(ctx, idx, x, y, r, frac, delighted) {
    var p = person(idx);
    var ok = Art.drawCircleImage(ctx, 'customers', x, y, r, p.crop[0], p.crop[1], p.crop[2], p.crop[3]);
    if (!ok) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(r) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.name[0], x, y + 1);
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    var mood = delighted ? 'happy' : moodFor(frac);
    if (mood === 'impatient') {
      ctx.fillStyle = 'rgba(120,180,255,0.9)';
      ctx.beginPath(); ctx.arc(x + r * 0.55, y - r * 0.55, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.72, y - r * 0.2, r * 0.11, 0, Math.PI * 2); ctx.fill();
    } else if (mood === 'angry') {
      ctx.fillStyle = 'rgba(231,76,60,0.28)';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y - r * 0.75); ctx.lineTo(x - r * 0.25, y - r * 0.5);
      ctx.moveTo(x + r * 0.5, y - r * 0.75); ctx.lineTo(x + r * 0.25, y - r * 0.5);
      ctx.stroke();
    } else if (delighted) {
      ctx.fillStyle = 'rgba(255,215,0,0.9)';
      [[-0.6, -0.6], [0.65, -0.5], [0.55, 0.55]].forEach(function (o) {
        var px = x + o[0] * r, py = y + o[1] * r, s = r * 0.16;
        ctx.beginPath();
        ctx.moveTo(px, py - s); ctx.lineTo(px + s * 0.35, py - s * 0.35);
        ctx.lineTo(px + s, py); ctx.lineTo(px + s * 0.35, py + s * 0.35);
        ctx.lineTo(px, py + s); ctx.lineTo(px - s * 0.35, py + s * 0.35);
        ctx.lineTo(px - s, py); ctx.lineTo(px - s * 0.35, py - s * 0.35);
        ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
    // ring: green while calm, amber while waiting, red while angry
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = mood === 'happy' ? '#2ecc71' : mood === 'impatient' ? '#f39c12' : '#e74c3c';
    ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  window.Customers = {
    PEOPLE: PEOPLE, person: person, count: count,
    moodFor: moodFor, drawPortrait: drawPortrait
  };
})();
