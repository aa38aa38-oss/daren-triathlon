// 音效全部用程式即時合成（不需要下載任何音效檔，完全免費）
let ac = null, master = null, noise = null;
const last = {};

export function initAudio() {
  if (ac) return;
  // 網址加上 ?mute 就完全不發出聲音（測試用）
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute')) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.45;
    master.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ac = null;
  }
}

function ok(name, ms) {
  if (!ac) return false;
  const now = performance.now();
  if (last[name] && now - last[name] < ms) return false;
  last[name] = now;
  return true;
}

function playNoise({ dur = 0.3, freq = 1000, to, type = 'lowpass', q = 1, gain = 0.5 }) {
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur);
}

function tone({ freq = 440, to, dur = 0.2, type = 'square', gain = 0.2 }) {
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  splat(v = 1) {
    if (v < 0.05 || !ok('splat', 60)) return;
    playNoise({ dur: 0.4, freq: 900, to: 150, gain: 0.8 * v });
    tone({ freq: 140, to: 40, dur: 0.18, type: 'sine', gain: 0.5 * v });
  },
  punch(v = 1) {
    if (v < 0.05 || !ok('punch', 40)) return;
    playNoise({ dur: 0.09, freq: 2200, type: 'bandpass', q: 0.8, gain: 0.6 * v });
    tone({ freq: 160, to: 60, dur: 0.1, type: 'sine', gain: 0.4 * v });
  },
  boom(v = 1) {
    if (v < 0.05 || !ok('boom', 80)) return;
    playNoise({ dur: 1.2, freq: 1200, to: 60, gain: 1.0 * v });
    tone({ freq: 90, to: 25, dur: 0.9, type: 'sine', gain: 0.8 * v });
  },
  bite(v = 1) {
    if (v < 0.05 || !ok('bite', 80)) return;
    tone({ freq: 70, to: 40, dur: 0.3, type: 'sawtooth', gain: 0.4 * v });
    playNoise({ dur: 0.3, freq: 600, to: 100, gain: 0.8 * v });
  },
  slip() { if (ok('slip', 100)) tone({ freq: 900, to: 150, dur: 0.35, type: 'sine', gain: 0.3 }); },
  pickup() { if (ok('pickup', 50)) tone({ freq: 500, to: 1400, dur: 0.18, type: 'triangle', gain: 0.3 }); },
  beep(hi) { if (ok('beep' + hi, 50)) tone({ freq: hi ? 880 : 440, dur: hi ? 0.4 : 0.18, type: 'square', gain: 0.15 }); },
  rumble() { if (ok('rumble', 200)) playNoise({ dur: 1.5, freq: 300, to: 40, gain: 0.7 }); },
};
