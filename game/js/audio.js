// audio.js — tiny WebAudio bleeps synthesized in code, no audio files.
(function () {
  var ctx = null;
  var muted = false;
  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var t = c.currentTime + (when || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var t = c.currentTime;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource();
    src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 1800;
    var g = c.createGain();
    g.gain.value = vol || 0.12;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }
  window.Sfx = {
    unlock: function () { ac(); },
    toggleMute: function () { muted = !muted; return muted; },
    isMuted: function () { return muted; },
    click: function () { tone(660, 0.07, 'triangle', 0.12); },
    pickup: function () { tone(520, 0.08, 'triangle', 0.14, 0, 780); },
    chop: function () { noise(0.06, 0.22, 2400); tone(180, 0.05, 'square', 0.06); },
    chopDone: function () { tone(880, 0.09, 'triangle', 0.16); tone(1320, 0.12, 'triangle', 0.12, 0.07); },
    sizzle: function () { noise(0.35, 0.07, 4200); },
    grillDone: function () { tone(740, 0.1, 'sine', 0.16); tone(988, 0.14, 'sine', 0.14, 0.09); },
    burn: function () { tone(220, 0.25, 'sawtooth', 0.12, 0, 110); },
    serve: function () { tone(523, 0.1, 'triangle', 0.16); tone(659, 0.1, 'triangle', 0.16, 0.09); tone(784, 0.18, 'triangle', 0.18, 0.18); },
    coin: function () { tone(988, 0.07, 'square', 0.08); tone(1319, 0.16, 'square', 0.08, 0.06); },
    wrong: function () { tone(200, 0.16, 'sawtooth', 0.12, 0, 140); },
    lost: function () { tone(392, 0.2, 'triangle', 0.14, 0, 262); tone(262, 0.3, 'triangle', 0.12, 0.18); },
    alarm: function () { tone(880, 0.09, 'square', 0.07); tone(880, 0.09, 'square', 0.07, 0.14); },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.16, i * 0.12); });
    }
  };
})();
