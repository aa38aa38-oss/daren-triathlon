// 所有像素圖：騎士（背面）、角色頭像、場景、道具、特效、遠景
import { Pix, ramp, OUT, bayer, hash } from './pix.js';

const SKINS = [ramp(0.07, 0.65, 0.66), ramp(0.06, 0.55, 0.52), ramp(0.06, 0.5, 0.38)];
const WHITE = ['#a8a0c0', '#f0eef8', '#ffffff', '#ffffff'];
const DARK = ['#0e0a16', '#241c30', '#3a3048', '#6a6080'];

// 四個角色：外型、能力值、特殊技能
export const CHARS = {
  muscle: {
    name: '肌肉阿伯', skill: '蠻牛衝撞', desc: '向前猛衝，撞到的人直接噴飛',
    stats: { speed: 232, accel: 1.7, hp: 150 }, bars: [3, 2, 5],
  },
  ninja: {
    name: '忍者小翠', skill: '追蹤飛鏢', desc: '丟出三支會自己追人的飛鏢',
    stats: { speed: 238, accel: 2.6, hp: 90 }, bars: [4, 5, 2],
  },
  butcher: {
    name: '屠夫老王', skill: '迴旋大砍', desc: '原地轉一圈，砍爆身邊所有人',
    stats: { speed: 234, accel: 2.0, hp: 120 }, bars: [3, 3, 4],
  },
  courier: {
    name: '外送阿明', skill: '超級氮氣', desc: '開渦輪，長時間超高速',
    stats: { speed: 246, accel: 2.1, hp: 100 }, bars: [5, 3, 3],
  },
};
export const TYPES = Object.keys(CHARS);

// 外觀：seed 為 null 時是玩家用的標準配色，否則隨機換色
export function lookFor(type, seed) {
  const r = (k) => (seed == null ? null : hash(Math.floor(seed * 9999), k));
  const pick = (k, def) => (seed == null ? def : r(k));
  const skin = seed == null ? SKINS[0] : SKINS[Math.floor(r(1) * 3)];
  const L = { type, skin };
  if (type === 'muscle') {
    L.shirt = ramp(pick(2, 0.0), 0.8, 0.5);
    L.pants = ramp(pick(3, 0.62), 0.5, 0.32);
    L.hair = skin;
  } else if (type === 'ninja') {
    L.shirt = ramp(pick(2, 0.75), 0.35, 0.26);
    L.pants = ramp(pick(2, 0.75), 0.35, 0.2);
    L.hair = ramp(pick(2, 0.75), 0.3, 0.18);
    L.accent = ramp(pick(4, 0.98), 0.85, 0.5);
  } else if (type === 'butcher') {
    L.shirt = ramp(pick(2, 0.58), 0.3, 0.55);
    L.pants = ramp(pick(3, 0.08), 0.4, 0.3);
    L.hair = ramp(0.08, 0.5, 0.25);
  } else {
    L.shirt = ramp(pick(2, 0.33), 0.7, 0.42);
    L.pants = ramp(pick(3, 0.6), 0.3, 0.3);
    L.hair = ramp(pick(4, 0.14), 0.9, 0.52);
    L.accent = ramp(pick(5, 0.06), 0.85, 0.52);
  }
  L.bike = ramp(pick(6, type === 'muscle' ? 0.0 : type === 'ninja' ? 0.75 : type === 'butcher' ? 0.08 : 0.33), 0.7, 0.45);
  return L;
}

// 騎腳踏車的背影。pedal：踩踏板動畫 0/1，lean：-1 左傾、0、1 右傾
export function makeBiker(L, pedal, lean) {
  const p = new Pix(34, 46), c = 17;
  const tx = c + lean * 2, hx = c + lean * 3, wx = c - lean;
  p.line(5 + lean * 2, 21, 29 + lean * 2, 21, '#7a7a8a', 1.6);
  const arm = (sx, sy, ex, ey) => {
    if (L.type === 'muscle') {
      p.line(sx, sy, ex, ey, L.skin[0], 3.8);
      p.line(sx - 0.4, sy - 0.6, ex - 0.4, ey - 0.6, L.skin[1], 2.4);
    } else {
      p.line(sx, sy, ex, ey, L.shirt[0], 3);
      p.line(sx - 0.4, sy - 0.6, ex, ey, L.shirt[1], 1.8);
    }
    p.ball(ex, ey, 1.7, 1.7, L.skin);
  };
  arm(tx - 5, 15, 7 + lean * 2, 21);
  arm(tx + 5, 15, 27 + lean * 2, 21);
  const up = pedal === 0 ? -1 : 1;
  const leg = (hipx, kneeY, footY, side) => {
    p.line(hipx, 25, hipx + side * 1.5, kneeY, L.pants[1], 3.4);
    p.line(hipx + side * 1.5, kneeY, hipx + side, footY, L.pants[0], 2.6);
    p.rect(hipx + side - 2, footY, 4, 2, '#20202a');
  };
  leg(tx - 3, 30 + up * 2, 35 + up * 2, -1);
  leg(tx + 3, 30 - up * 2, 35 - up * 2, 1);
  p.rect(wx - 2, 27, 4, 7, L.bike[1]);
  p.rect(wx - 1, 27, 1, 7, L.bike[2]);
  p.rect(tx - 3, 24, 6, 2, '#20202a');
  p.ball(tx, 18, 6.8, 7.4, L.shirt);
  if (L.type === 'muscle') {
    p.ell(tx - 5.5, 13, 2.6, 2.2, L.skin[1]);
    p.ell(tx + 5.5, 13, 2.6, 2.2, L.skin[0]);
    p.line(tx - 3, 11, tx - 2, 16, L.skin[1], 1.6);
    p.line(tx + 3, 11, tx + 2, 16, L.skin[1], 1.6);
  } else if (L.type === 'ninja') {
    const fl = pedal ? 1 : -1;
    p.line(hx + 2, 13, hx + 11, 15 + fl, L.accent[1], 2.2);
    p.line(hx + 9, 15 + fl, hx + 14, 13 - fl, L.accent[0], 1.8);
  } else if (L.type === 'butcher') {
    p.line(tx - 6, 14, tx + 6, 14, '#f4f2fa', 1.4);
    p.ball(tx, 24, 2.4, 1.6, WHITE);
    p.set(tx - 3, 18, '#a00010'); p.set(tx + 2, 20, '#c01020'); p.set(tx + 3, 16, '#a00010');
  } else {
    p.rect(tx - 6, 9, 12, 13, L.accent[0]);
    p.rect(tx - 5, 10, 10, 11, L.accent[1]);
    p.rect(tx - 5, 10, 10, 2, L.accent[2]);
    p.rect(tx - 2, 14, 4, 4, '#ffffff');
    p.rect(tx - 1, 15, 2, 2, L.accent[0]);
  }
  p.ball(hx, 8, 5.2, 5.2, L.hair);
  if (L.type === 'muscle') p.set(hx - 2, 5, '#ffffff');
  if (L.type === 'ninja') { p.line(hx + 3, 6, hx + 8, 4 + up, L.accent[1], 1.4); p.rect(hx - 5, 8, 10, 1, L.accent[1]); }
  if (L.type === 'courier') { p.rect(hx - 1, 3, 2, 10, '#ffffff'); }
  if (L.type !== 'ninja' && L.type !== 'courier') {
    p.set(hx - 5.6, 9, L.skin[1]);
    p.set(hx + 5.2, 9, L.skin[0]);
  }
  p.ell(wx, 37, 3, 7.8, '#18161e');
  p.rect(wx - 0.5, 31, 1, 12, '#8a8a9a');
  p.set(wx - 1, 32, '#c8c8d8');
  p.outline(OUT);
  return p.canvas();
}

export function bikerSet(L) {
  return [-1, 0, 1].map((lean) => [0, 1].map((ped) => makeBiker(L, ped, lean)));
}

// 角色選擇畫面的正面頭像
export function makePortrait(L) {
  const p = new Pix(40, 40), c = 20;
  p.ball(c, 39, 17, 10, L.shirt);
  if (L.type === 'muscle') { p.ell(c - 12, 34, 5, 4, L.skin[1]); p.ell(c + 12, 34, 5, 4, L.skin[0]); }
  if (L.type === 'butcher') { p.rect(c - 7, 31, 14, 9, '#f0eef8'); p.set(c - 3, 34, '#b00010'); p.set(c + 2, 36, '#b00010'); p.set(c + 4, 33, '#900010'); }
  if (L.type === 'courier') p.rect(c - 17, 30, 4, 10, L.accent[1]);
  if (L.type === 'ninja') p.ball(c, 19, 12.6, 13.4, L.hair);
  p.ball(c, 20, 11, 12, L.skin);
  if (L.type === 'ninja') {
    p.ell(c, 24, 11, 6, L.hair[1]);
    p.rect(c - 11, 12, 22, 3, L.accent[1]);
    p.rect(c + 9, 13, 5, 2, L.accent[0]);
  } else if (L.type === 'courier') {
    p.ell(c, 13, 12.5, 8, L.hair[1]);
    p.ell(c - 3, 10, 5, 3, L.hair[2]);
    p.rect(c - 12, 15, 24, 2, L.hair[0]);
    p.rect(c - 1, 5, 2, 10, '#ffffff');
  } else if (L.type === 'butcher') {
    p.ell(c, 10, 11, 5, L.hair[1]);
    for (let i = 0; i < 9; i++) p.set(c - 6 + i * 1.5, 29 + (i % 2), L.hair[0]);
  } else {
    p.set(c - 4, 10, '#ffffff'); p.set(c - 3, 10, '#ffffff');
  }
  // 眼睛
  const brow = L.type === 'muscle' ? 2 : 1;
  p.rect(c - 7, 16, 5, brow, '#1a1028');
  p.rect(c + 2, 16, 5, brow, '#1a1028');
  p.rect(c - 6, 19, 3, 3, '#ffffff'); p.rect(c - 5, 20, 2, 2, '#1a1028');
  p.rect(c + 3, 19, 3, 3, '#ffffff'); p.rect(c + 3, 20, 2, 2, '#1a1028');
  if (L.type === 'muscle') p.rect(c - 6, 26, 12, 2, '#3a2010');
  if (L.type !== 'ninja') {
    p.rect(c - 4, 29, 8, 2, '#5a0010');
    p.rect(c - 3, 29, 2, 1, '#ffffff'); p.rect(c + 1, 29, 2, 1, '#ffffff');
  }
  if (L.type === 'butcher') { p.set(c + 7, 24, '#c01020'); p.set(c + 8, 25, '#c01020'); p.set(c + 6, 26, '#900010'); }
  p.outline(OUT);
  return p.canvas();
}

export function makeCorpse(L) {
  const p = new Pix(44, 20);
  p.ell(10, 13, 5, 5, '#18161e'); p.ell(10, 13, 3, 3, '#8a8a9a'); p.ell(10, 13, 2, 2, '#18161e');
  p.ell(34, 14, 5, 5, '#18161e'); p.ell(34, 14, 3, 3, '#8a8a9a'); p.ell(34, 14, 2, 2, '#18161e');
  p.line(10, 13, 34, 14, L.bike[1], 2);
  p.ball(22, 10, 9, 5, L.shirt);
  p.line(13, 12, 6, 6, L.pants[1], 3);
  p.ell(31, 9, 2.4, 3, '#8a0016');
  p.ell(31, 9, 1.4, 1.8, '#e02040');
  p.outline(OUT);
  return p.canvas();
}

export function makeHead(L) {
  const p = new Pix(12, 12);
  p.ball(6, 6, 4.4, 4.4, L.hair);
  p.ell(6, 10, 2, 1.2, '#c01020');
  p.outline(OUT);
  return p.canvas();
}

function simple(w, h, fn) { const p = new Pix(w, h); fn(p); p.outline(OUT); return p.canvas(); }

export const LIMB = simple(6, 10, (p) => { p.rect(2, 1, 2, 7, SKINS[0][1]); p.set(2, 1, SKINS[0][2]); p.rect(2, 7, 2, 2, '#c01030'); });

export const TREE = simple(40, 52, (p) => {
  p.rect(17, 32, 6, 19, '#6a3a18'); p.rect(17, 32, 2, 19, '#8a5428');
  const G = ramp(0.3, 0.6, 0.38);
  p.ball(20, 22, 16, 15, G); p.ball(12, 27, 9, 8, G); p.ball(28, 27, 9, 8, G); p.ball(20, 13, 11, 10, G);
  p.set(14, 12, '#d0ff9a'); p.set(15, 11, '#d0ff9a');
});
export const PINE = simple(32, 56, (p) => {
  p.rect(14, 44, 4, 11, '#5a3014');
  const G = ramp(0.38, 0.5, 0.3);
  for (let k = 0; k < 4; k++) {
    const top = 2 + k * 10, hgt = 16, base = 8 + k * 2;
    for (let y = 0; y < hgt; y++) {
      const hw = (y / hgt) * base;
      for (let x = -hw; x <= hw; x++) p.set(16 + x, top + y, x < -hw * 0.3 ? G[2] : x > hw * 0.5 ? G[0] : G[1]);
    }
  }
});
export const ROCK = simple(28, 20, (p) => { p.ball(14, 11, 12, 8, ['#4a4458', '#7a7488', '#a8a2b8', '#e0dcf0']); p.ball(7, 14, 5, 4, ['#4a4458', '#6a6478', '#8a8498', '#c0bcd0']); });

export function makeChevron(dir) {
  return simple(30, 26, (p) => {
    p.rect(6, 17, 2, 8, '#5a5a6a'); p.rect(22, 17, 2, 8, '#5a5a6a');
    p.rect(2, 2, 26, 15, '#ffd000'); p.rect(2, 2, 26, 1, '#fff07a');
    for (let k = 0; k < 2; k++) {
      const ox = 7 + k * 9;
      for (let i = 0; i < 5; i++) {
        const x = dir > 0 ? ox + i : ox + 4 - i;
        p.rect(x, 4 + i, 3, 1, '#1a1028'); p.rect(x, 14 - i, 3, 1, '#1a1028');
      }
    }
  });
}
export const CHEV_L = makeChevron(-1), CHEV_R = makeChevron(1);

export const CROWD = [0, 1].map((f) => simple(64, 30, (p) => {
  for (let i = 0; i < 11; i++) {
    const x = 4 + i * 5.6, row = i % 2, y = 12 + row * 6;
    const sh = ramp(hash(i, 3), 0.8, 0.5), sk = SKINS[Math.floor(hash(i, 4) * 3)];
    const armUp = (i + f) % 2 === 0;
    p.line(x - 3, y + 4, x - 4, armUp ? y - 6 : y + 1, sk[1], 1.6);
    p.line(x + 3, y + 4, x + 4, armUp ? y - 6 : y + 1, sk[1], 1.6);
    p.ball(x, y + 8, 3.4, 4, sh);
    p.ball(x, y + 1, 2.6, 2.6, sk);
    p.rect(x - 2, y - 1, 4, 1, ramp(hash(i, 5), 0.6, 0.3)[1]);
  }
}));

function signBoard(label, bg, fg) {
  const w = label.length * 4 + 6;
  return simple(w, 18, (p) => {
    p.rect(Math.floor(w / 2) - 1, 10, 2, 8, '#5a5a6a');
    p.rect(1, 1, w - 2, 10, bg);
    p.rect(1, 1, w - 2, 1, '#ffffff');
    p.text(label, 3, 4, fg);
  });
}
export const SIGN_JUMP = signBoard('JUMP!', '#ff3040', '#ffffff');
export const SIGN_SHORT = signBoard('SHORT CUT', '#2a8a3a', '#ffffff');

function makeArch(label, checker) {
  return simple(160, 72, (p) => {
    for (const x of [6, 146]) {
      p.rect(x, 18, 8, 54, '#3a3a4a'); p.rect(x, 18, 3, 54, '#5a5a6a');
    }
    p.rect(2, 4, 156, 18, checker ? '#ffffff' : '#e02030');
    if (checker) for (let y = 0; y < 18; y += 3) for (let x = 0; x < 156; x += 3) if (((x + y) / 3) % 2 === 0) p.rect(2 + x, 4 + y, 3, 3, '#1a1028');
    const tw = label.length * 4 * 2;
    p.rect(80 - tw / 2 - 4, 6, tw + 6, 14, checker ? '#e02030' : '#ffd000');
    p.text(label, 80 - tw / 2, 8, checker ? '#ffffff' : '#1a1028', 2);
  });
}
export const ARCH_START = makeArch('START', false);
export const ARCH_GOAL = makeArch('GOAL', true);

export const BOX = [0, 1, 2, 3].map((k) => simple(18, 18, (p) => {
  const hue = ramp(0.1 + k * 0.05, 1, 0.55);
  p.rect(1, 1, 16, 16, hue[0]); p.rect(2, 2, 14, 14, hue[1]); p.rect(2, 2, 14, 2, hue[3]); p.rect(2, 14, 14, 2, hue[0]);
  const Q = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'];
  Q.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') { p.set(7 + x, 6 + y, '#5a2400'); p.set(6 + x, 5 + y, '#ffffff'); } }));
  for (let i = 0; i < 14; i++) { const x = k * 4 - 4 + i, y = 2 + i; if (x >= 2 && x < 16 && y < 16 && p.get(x, y) !== '#ffffff') p.set(x, y, '#fff8d0'); }
}));

export const OIL = simple(40, 10, (p) => { p.ell(20, 5, 18, 4, '#0a0812'); p.ell(14, 4, 5, 1.2, '#4a4060'); p.set(26, 5, '#6a6090'); });
export const SPIKES = simple(26, 12, (p) => {
  p.rect(1, 9, 24, 3, '#5a3a1a');
  for (let i = 0; i < 6; i++) { const x = 3 + i * 4; p.line(x, 9, x + 1, 1, '#b0b0c0', 1.6); p.set(x, 3, '#ffffff'); }
});
export const SHURIKEN = [0, 1].map((f) => simple(12, 12, (p) => {
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + f * 0.78;
    p.line(6, 6, 6 + Math.cos(a) * 5.5, 6 + Math.sin(a) * 5.5, '#c8c8d8', 2);
  }
  p.ell(6, 6, 1.4, 1.4, '#1a1028');
}));
export const AXE = [0, 1].map((f) => simple(20, 20, (p) => {
  const a = f ? -0.4 : -1.4;
  const hx = 4 + Math.cos(a) * 14, hy = 16 + Math.sin(a) * 14;
  p.line(4, 16, hx, hy, '#7a4a1e', 2);
  p.ell(hx, hy, 4, 3.4, '#c8d0dc');
  p.ell(hx + 1, hy + 1, 2, 1.6, '#a00010');
}));
export const FLAME = [0, 1].map((f) => simple(14, 14, (p) => {
  const h = f ? 12 : 9;
  for (let y = 0; y < h; y++) {
    const w = (1 - y / h) * 5;
    for (let x = -w; x <= w; x++) p.set(7 + x, 1 + y, y < h * 0.35 ? '#ffffff' : y < h * 0.6 ? '#7ad8ff' : '#2a6aff');
  }
}));

export const ICONS = {
  axe: simple(20, 20, (p) => { p.line(5, 17, 13, 6, '#7a4a1e', 2.4); p.ell(14, 6, 5, 4, '#c8d0dc'); p.ell(15, 7, 2.2, 1.6, '#a00010'); }),
  oil: simple(20, 20, (p) => { p.ell(10, 13, 6, 5.5, '#14101c'); for (let y = 2; y < 10; y++) p.rect(10 - (y - 2) * 0.6, y, (y - 2) * 1.2 + 1, 1, '#14101c'); p.set(8, 11, '#6a6090'); p.set(7, 12, '#6a6090'); }),
  spikes: simple(20, 20, (p) => { p.rect(2, 14, 16, 3, '#5a3a1a'); for (let i = 0; i < 4; i++) p.line(4 + i * 4, 14, 4 + i * 4, 4, '#c0c0d0', 1.8); }),
  adren: simple(20, 20, (p) => { p.line(4, 16, 14, 6, '#e8f6ff', 4); p.line(4, 16, 14, 6, '#40e070', 2); p.line(14, 6, 18, 2, '#c0c0d0', 1); p.rect(2, 15, 4, 3, '#ff4060'); }),
};
export const ITEM_NAMES = { axe: '斧頭', oil: '油漬', spikes: '釘刺路障', adren: '腎上腺素' };

// 遠景：天空、夕陽、遠山、近山（左右可無縫捲動）
export function makePanorama(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const bands = ['#24164a', '#3a1c66', '#5e2378', '#8a2c7e', '#b83c78', '#e0566a', '#ff7a58', '#ffa860'];
  const bh = h / bands.length;
  for (let y = 0; y < h; y++) {
    const f = y / bh, i = Math.floor(f), t = f - i;
    for (let x = 0; x < w; x += 1) {
      const use = t > 0.7 && i + 1 < bands.length && bayer(x, y) < (t - 0.7) / 0.3 ? i + 1 : i;
      if (x === 0 || use !== c._last) { c._last = use; }
      g.fillStyle = bands[Math.min(use, bands.length - 1)];
      g.fillRect(x, y, 1, 1);
    }
  }
  // 太陽
  const sx = w * 0.3, sy = h - 22;
  for (let y = -16; y <= 16; y++) for (let x = -16; x <= 16; x++) {
    if (x * x + y * y > 256) continue;
    if (y > 2 && Math.floor((y - 2) / 3) % 2 === 1) continue;
    g.fillStyle = y < -6 ? '#fff6c0' : y < 2 ? '#ffd860' : '#ff9a40';
    g.fillRect(sx + x, sy + y, 1, 1);
  }
  const T = Math.PI * 2;
  const layer = (base, amp, k, col, hi) => {
    for (let x = 0; x < w; x++) {
      const v = Math.sin((T * x * k[0]) / w) * 0.5 + Math.sin((T * x * k[1]) / w + 1.3) * 0.3 + Math.sin((T * x * k[2]) / w + 2.1) * 0.2;
      const top = Math.round(base - amp * (v * 0.5 + 0.5));
      g.fillStyle = hi; g.fillRect(x, top, 1, 1);
      g.fillStyle = col; g.fillRect(x, top + 1, 1, h - top);
    }
  };
  layer(h - 10, 30, [3, 7, 13], '#4a2468', '#7a3a8a');
  layer(h - 4, 14, [9, 17, 31], '#1e3a3a', '#2e5a4a');
  for (let x = 0; x < w; x += 7) {
    const top = h - 6 - Math.round(hash(x, 7) * 5);
    g.fillStyle = '#14281e';
    g.fillRect(x, top, 5, h - top);
    g.fillRect(x + 1, top - 2, 3, 2);
  }
  return c;
}
