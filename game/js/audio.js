// audio.js — all sounds are synthesized with WebAudio in code.
// No audio files, no network. Each effect is a short oscillator
// blip or a filtered noise burst.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol || 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  src.start(t);
}

export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.10); },
  collect() { tone(520, 0.08, 'sine', 0.12, 880); },
  chop() { noise(0.09, 0.20, 900); tone(180, 0.08, 'square', 0.06); },
  pour() { noise(0.35, 0.10, 500); },
  stir() { noise(0.15, 0.08, 700); },
  grate() { noise(0.12, 0.16, 1600); },
  wrong() { tone(220, 0.18, 'sawtooth', 0.10, 140); },
  ding() { tone(880, 0.25, 'sine', 0.14); tone(1320, 0.3, 'sine', 0.08); },
  coin() { tone(990, 0.09, 'sine', 0.12); setTimeout(() => tone(1320, 0.16, 'sine', 0.12), 90); },
  alarm() { tone(740, 0.15, 'square', 0.07, 740); setTimeout(() => tone(740, 0.15, 'square', 0.07), 200); },
  unlock() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), i * 110)); },
};
