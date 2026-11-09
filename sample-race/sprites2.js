// 新攻擊的像素圖：魔法、毒物、科技、天氣
import { Pix, ramp, OUT, bayer } from './pix.js';

function simple(w, h, fn, outline = true) { const p = new Pix(w, h); fn(p); if (outline) p.outline(OUT); return p.canvas(); }

export const FIREBALL = [0, 1].map((f) => simple(18, 18, (p) => {
  for (let i = 0; i < 6; i++) p.ell(9 + Math.sin(i * 2 + f) * 3, 9 + Math.cos(i * 2 + f) * 3, 4, 4, i % 2 ? '#ff4a10' : '#ff8a20');
  p.ell(9, 9, 4.5, 4.5, '#ffc030');
  p.ell(8, 8, 2.4, 2.4, '#fff6c0');
}));
export const DART = simple(6, 12, (p) => { p.rect(2, 0, 2, 8, '#c8c8d8'); p.rect(1, 8, 4, 3, '#40e060'); p.set(2, 0, '#80ff90'); });
export const MISSILE = [0, 1].map((f) => simple(16, 16, (p) => {
  p.line(8, 8, 1, 1, '#6a6a7a', 2); p.line(8, 8, 15, 1, '#6a6a7a', 2); p.line(8, 8, 1, 15, '#6a6a7a', 2); p.line(8, 8, 15, 15, '#6a6a7a', 2);
  p.ell(8, 8, 4.5, 4.5, '#b8b8c8'); p.ell(7, 7, 2, 2, '#e8e8f0');
  p.ell(8, 8, 2.2, 2.2, f ? '#ffd040' : '#ff6020'); p.set(8, 8, '#ffffff');
}));
export const DRONE = [0, 1].map((f) => simple(26, 14, (p) => {
  for (const x of [3, 23]) { p.rect(x - 3, 2, 6, 1, f ? '#c8c8d8' : '#6a6a7a'); p.rect(x, 3, 1, 3, '#3a3a4a'); }
  p.rect(3, 5, 21, 2, '#3a3a4a');
  p.ball(13, 8, 5, 4, ['#1a1a2a', '#3a3a5a', '#6a6a9a', '#c0c0ff']);
  p.ell(13, 9, 1.6, 1.6, f ? '#ff2030' : '#ff8090');
}));
export const ICE = simple(30, 40, (p) => {
  p.rect(1, 1, 28, 38, 'rgba(150,220,255,0.55)');
  p.rect(1, 1, 28, 3, 'rgba(230,250,255,0.8)');
  p.line(5, 6, 10, 30, 'rgba(255,255,255,0.7)', 1);
  p.line(20, 8, 24, 20, 'rgba(255,255,255,0.6)', 1);
});
export const GAS = [0, 1].map((f) => simple(40, 26, (p) => {
  const G = ['#1a6a1a', '#3ab83a', '#7aff5a', '#d8ffb0'];
  p.ball(12 + f, 15, 10, 9, G); p.ball(27 - f, 14, 11, 10, G); p.ball(20, 9, 9, 7, G);
  p.rect(17, 12, 2, 2, '#0a2a0a'); p.rect(22, 12, 2, 2, '#0a2a0a'); p.rect(18, 16, 5, 1, '#0a2a0a');
}, true));

export const BOOM = Array.from({ length: 10 }, (_, k) => {
  const S = 64, p = new Pix(S, S), c = S / 2, r = 6 + (k / 9) * 24;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const rr = r * (0.85 + 0.15 * Math.sin(a * 7 + k * 1.3) + 0.08 * Math.sin(a * 13 - k));
    if (d > rr) continue;
    const q = d / rr;
    if (k > 7 && bayer(x, y) < 0.5) continue;
    if (k > 4 && q > 0.3 && bayer(x, y) < (k - 4) / 6) { p.set(x, y, q > 0.7 ? '#2a1e2e' : '#4a3a48'); continue; }
    p.set(x, y, q < 0.3 ? (k < 3 ? '#ffffff' : '#fff27a') : q < 0.55 ? '#ffc21a' : q < 0.8 ? '#ff6a14' : '#c0182a');
  }
  if (k < 7) p.outline(OUT);
  return p.canvas();
});
export const ICE_BOOM = Array.from({ length: 6 }, (_, k) => simple(48, 48, (p) => {
  for (let i = 0; i < 10; i++) {
    const a = i * 0.63 + k * 0.2, d = 4 + k * 3.5;
    p.ell(24 + Math.cos(a) * d, 24 + Math.sin(a) * d, 3 - k * 0.3, 3 - k * 0.3, i % 2 ? '#bfefff' : '#ffffff');
  }
}));

// 道具圖示
const icon = (fn) => simple(20, 20, fn);
export const ICONS2 = {
  fireball: icon((p) => { p.ell(12, 8, 5, 5, '#ff6a14'); p.ell(12, 8, 3, 3, '#fff27a'); p.line(8, 11, 2, 18, '#ff4a10', 3); p.line(10, 13, 6, 18, '#ffb020', 2); }),
  chain: icon((p) => { const pts = [[11, 1], [6, 8], [11, 9], [5, 18]]; for (let i = 0; i < 3; i++) p.line(...pts[i], ...pts[i + 1], '#9ff3ff', 2.6); for (let i = 0; i < 3; i++) p.line(...pts[i], ...pts[i + 1], '#ffffff', 1); }),
  freeze: icon((p) => { for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; p.line(10 - Math.cos(a) * 8, 10 - Math.sin(a) * 8, 10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8, '#bfefff', 2); } p.ell(10, 10, 2, 2, '#ffffff'); }),
  gas: icon((p) => { p.ball(7, 12, 5, 5, ['#1a6a1a', '#3ab83a', '#7aff5a', '#d8ffb0']); p.ball(13, 10, 6, 6, ['#1a6a1a', '#3ab83a', '#7aff5a', '#d8ffb0']); p.rect(10, 9, 2, 2, '#0a2a0a'); p.rect(14, 9, 2, 2, '#0a2a0a'); }),
  darts: icon((p) => { for (const [x, y] of [[4, 4], [10, 2], [16, 4]]) { p.line(x, y, x - 1, y + 13, '#c8c8d8', 1.4); p.rect(x - 2, y + 12, 3, 3, '#40e060'); } }),
  missile: icon((p) => { p.line(4, 16, 15, 5, '#b8b8c8', 4); p.line(4, 16, 15, 5, '#e8e8f0', 1.4); p.ell(16, 4, 2.4, 2.4, '#ff3040'); p.ell(3, 17, 2.4, 2.4, '#ffb020'); }),
  laser: icon((p) => { p.rect(2, 8, 10, 5, '#5a5a7a'); p.rect(3, 9, 8, 2, '#9a9ac0'); p.rect(4, 13, 3, 4, '#3a3a4a'); p.rect(12, 9, 8, 3, '#ff3040'); p.rect(12, 10, 8, 1, '#ffffff'); }),
  drone: icon((p) => { p.rect(2, 5, 6, 1, '#c8c8d8'); p.rect(12, 5, 6, 1, '#c8c8d8'); p.rect(4, 6, 12, 2, '#3a3a4a'); p.ball(10, 11, 5, 4, ['#1a1a2a', '#3a3a5a', '#6a6a9a', '#c0c0ff']); p.set(10, 12, '#ff2030'); }),
  storm: icon((p) => { p.ball(10, 6, 8, 5, ['#2a2a3a', '#4a4a5a', '#7a7a8a', '#b0b0c0']); p.line(11, 10, 7, 15, '#ffe040', 2); p.line(7, 15, 12, 14, '#ffe040', 2); p.line(12, 14, 9, 19, '#ffe040', 2); }),
  blizzard: icon((p) => { p.ball(10, 6, 8, 5, ['#6a7a9a', '#a8b8d8', '#d8e8ff', '#ffffff']); for (const [x, y] of [[5, 14], [10, 17], [15, 13], [8, 11]]) p.rect(x, y, 2, 2, '#ffffff'); }),
  acid: icon((p) => { p.ball(10, 6, 8, 5, ['#1a4a1a', '#2a7a2a', '#4ab04a', '#a0ffa0']); for (const x of [5, 9, 13, 16]) p.line(x, 12, x - 1, 17, '#7aff5a', 1.4); }),
};
export const ITEM_NAMES2 = {
  fireball: '火球術', chain: '連鎖閃電', freeze: '冰凍術', gas: '毒氣彈', darts: '毒鏢',
  missile: '追蹤飛彈', laser: '雷射砲', drone: '戰鬥無人機', storm: '召喚雷暴', blizzard: '暴風雪', acid: '酸雨',
};
