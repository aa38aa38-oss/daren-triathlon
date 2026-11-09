// 大逃殺版的新像素圖：游泳／跑步背影、死亡之牆、電網、新場景、技能圖示
import { Pix, ramp, OUT, hash } from '../sample-race/pix.js';

function simple(w, h, fn, outline = true) { const p = new Pix(w, h); fn(p); if (outline) p.outline(OUT); return p.canvas(); }

// 角色身上的配件（沿用單車版的造型）
function accents(p, L, tx, hx, frame) {
  if (L.type === 'muscle') {
    p.ell(tx - 5.5, 13, 2.6, 2.2, L.skin[1]);
    p.ell(tx + 5.5, 13, 2.6, 2.2, L.skin[0]);
    p.line(tx - 3, 11, tx - 2, 16, L.skin[1], 1.6);
    p.line(tx + 3, 11, tx + 2, 16, L.skin[1], 1.6);
  } else if (L.type === 'ninja') {
    const fl = frame ? 1 : -1;
    p.line(hx + 2, 13, hx + 11, 15 + fl, L.accent[1], 2.2);
    p.line(hx + 9, 15 + fl, hx + 14, 13 - fl, L.accent[0], 1.8);
  } else if (L.type === 'butcher') {
    p.line(tx - 6, 14, tx + 6, 14, '#f4f2fa', 1.4);
    p.ball(tx, 24, 2.4, 1.6, ['#a8a0c0', '#f0eef8', '#ffffff', '#ffffff']);
    p.set(tx - 3, 18, '#a00010'); p.set(tx + 2, 20, '#c01020'); p.set(tx + 3, 16, '#a00010');
  } else {
    p.rect(tx - 6, 9, 12, 13, L.accent[0]);
    p.rect(tx - 5, 10, 10, 11, L.accent[1]);
    p.rect(tx - 5, 10, 10, 2, L.accent[2]);
    p.rect(tx - 2, 14, 4, 4, '#ffffff');
    p.rect(tx - 1, 15, 2, 2, L.accent[0]);
  }
}
function head(p, L, hx, y, frame) {
  p.ball(hx, y, 5.2, 5.2, L.hair);
  if (L.type === 'muscle') p.set(hx - 2, y - 3, '#ffffff');
  if (L.type === 'ninja') { p.line(hx + 3, y - 2, hx + 8, y - 4 + frame * 2, L.accent[1], 1.4); p.rect(hx - 5, y, 10, 1, L.accent[1]); }
  if (L.type === 'courier') p.rect(hx - 1, y - 5, 2, 10, '#ffffff');
  if (L.type !== 'ninja' && L.type !== 'courier') { p.set(hx - 5.6, y + 1, L.skin[1]); p.set(hx + 5.2, y + 1, L.skin[0]); }
}

// 跑步背影：frame 0/1 左右腳交替
export function makeRunner(L, frame, lean) {
  const p = new Pix(34, 46), c = 17;
  const tx = c + lean * 2, hx = c + lean * 3;
  const up = frame ? 1 : -1;
  // 手臂（前後擺）
  const arm = (sx, ex, ey) => {
    const col = L.type === 'muscle' ? L.skin : L.shirt;
    p.line(sx, 15, ex, ey, col[0], 3.2);
    p.line(sx - 0.4, 14.5, ex - 0.4, ey - 0.5, col[1], 1.8);
    p.ball(ex, ey, 1.7, 1.7, L.skin);
  };
  arm(tx - 5, tx - 9, 21 + up * 3);
  arm(tx + 5, tx + 9, 21 - up * 3);
  // 腿：一腳著地、一腳往後抬
  const leg = (hipx, footX, footY, lifted) => {
    p.line(hipx, 25, footX, lifted ? 31 : 33, L.pants[1], 3.6);
    p.line(footX, lifted ? 31 : 33, footX, footY, L.pants[0], 2.8);
    p.rect(footX - 2, footY, 4, lifted ? 2 : 3, lifted ? '#c8c0d8' : '#20202a');
  };
  leg(tx - 3, tx - 4, frame ? 36 : 41, frame === 1);
  leg(tx + 3, tx + 4, frame ? 41 : 36, frame === 0);
  p.ball(tx, 18, 6.8, 7.4, L.shirt);
  accents(p, L, tx, hx, frame);
  head(p, L, hx, 8, frame);
  p.outline(OUT);
  return p.canvas();
}

// 游泳背影：只露出頭、肩膀和划水的手，四周有水花
export function makeSwimmer(L, frame, lean) {
  const p = new Pix(38, 30), c = 19;
  const hx = c + lean * 2;
  const up = frame ? 1 : -1;
  // 划水的手：一隻舉高往前、一隻在水裡
  const armUp = (sx, ex) => {
    const col = L.type === 'muscle' ? L.skin : L.shirt;
    p.line(sx, 18, ex, 4, col[0], 3.2);
    p.line(sx - 0.4, 17.5, ex - 0.4, 4.5, col[1], 1.8);
    p.ball(ex, 3.6, 1.8, 1.8, L.skin);
  };
  if (up > 0) armUp(hx + 7, hx + 9); else armUp(hx - 7, hx - 9);
  p.ell(hx, 20, 10, 4.5, L.type === 'muscle' ? L.skin[1] : L.shirt[1]);
  p.ell(hx - 2, 19, 6, 2, L.type === 'muscle' ? L.skin[2] : L.shirt[2]);
  if (L.type === 'courier') { p.rect(hx - 5, 13, 10, 7, L.accent[1]); p.rect(hx - 5, 13, 10, 2, L.accent[2]); }
  if (L.type === 'ninja') p.line(hx + 2, 17, hx + 12, 19 + up, L.accent[1], 2);
  head(p, L, hx, 14, frame);
  // 泳鏡帶
  if (L.type !== 'ninja') p.rect(hx - 5, 14, 10, 1, '#24203a');
  p.outline(OUT);
  // 水花（不描邊）
  const foam = ['#ffffff', '#c8f4ff', '#9ad8ff'];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + frame * 0.4;
    const x = hx + Math.cos(a) * (12 + (i % 3)), y = 22 + Math.sin(a) * 4.5;
    if (!p.get(x, y)) p.set(x, y, foam[i % 3]);
  }
  for (let i = 0; i < 6; i++) p.set(hx - 6 + i * 2 + frame, 27 + (i % 2), foam[i % 3]);
  return p.canvas();
}

export function makeCorpseBody(L, water) {
  return simple(36, 16, (p) => {
    p.ball(18, 8, 10, 5, L.shirt);
    p.line(9, 9, 2, 5, L.pants[1], 3);
    p.line(9, 10, 3, 13, L.pants[0], 3);
    p.line(22, 6, 26, 2, L.skin[1], 2.4);
    p.ell(28, 8, 2.4, 3, '#8a0016');
    p.ell(28, 8, 1.4, 1.8, '#e02040');
    if (water) for (let i = 0; i < 10; i++) p.set(4 + i * 3, 13 + (i % 2), '#c8f4ff');
  });
}

// ---------- 死亡之牆（寬圖，2 幀） ----------
export const TSUNAMI = [0, 1].map((f) => simple(200, 90, (p) => {
  for (let x = 0; x < 200; x++) {
    const top = 18 + Math.sin(x * 0.07 + f * 1.2) * 8 + Math.sin(x * 0.19) * 4;
    for (let y = Math.floor(top); y < 90; y++) {
      const d = y - top;
      p.set(x, y, d < 3 ? '#ffffff' : d < 7 ? '#bfefff' : d < 20 ? '#3a8ee6' : y > 70 ? '#123a7a' : '#1d57aa');
    }
    if ((x + f * 7) % 23 < 3) for (let y = Math.floor(top) + 8; y < 70; y++) if ((y + x) % 3) p.set(x, y, '#a8102a');
  }
  for (let k = 0; k < 7; k++) {
    const x = 15 + k * 28 + f * 4, y = 34 + (k % 3) * 9;
    p.line(x, y, x + 4, y - 9, '#f0c8a0', 2);
    p.ell(x + 4, y - 10, 1.6, 1.6, '#f0c8a0');
  }
}));
export const GRINDER = [0, 1].map((f) => simple(200, 80, (p) => {
  p.rect(10, 6, 180, 14, '#e0a800'); p.rect(10, 6, 180, 3, '#ffe060'); p.rect(10, 17, 180, 3, '#a87000');
  for (let x = 14; x < 190; x += 24) { p.rect(x, 8, 12, 2, '#1a1028'); }
  p.rect(6, 22, 188, 40, '#5a5a6a');
  for (let k = 0; k < 9; k++) {
    const cx = 18 + k * 21;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + f * 0.5 + k;
      p.line(cx, 42, cx + Math.cos(a) * 11, 42 + Math.sin(a) * 11, '#c8c8d8', 2.2);
    }
    p.ell(cx, 42, 4, 4, '#3a3a4a');
  }
  for (let i = 0; i < 40; i++) p.set(8 + ((i * 47) % 184), 24 + ((i * 13 + f * 5) % 36), i % 2 ? '#c01020' : '#7a0010');
  p.rect(4, 62, 192, 10, '#2a2a34');
  for (let x = 6; x < 194; x += 8) p.rect(x, 64, 5, 6, '#4a4a58');
  for (let i = 0; i < 18; i++) p.set(10 + i * 10, 74 + (i % 3), '#a00010');
}));
export const ZOMBIES = [0, 1].map((f) => simple(200, 70, (p) => {
  for (let k = 0; k < 13; k++) {
    const x = 8 + k * 15 + ((k * 7) % 5), row = k % 2, y = 20 + row * 8, bob = (k + f) % 2;
    const skin = ['#5a9a4a', '#4a8a5a', '#6aaa40'][k % 3];
    p.line(x - 3, y + 8 + bob, x - 5, y - 6, skin, 2.4);
    p.line(x + 3, y + 8 - bob, x + 5, y - 6, skin, 2.4);
    p.rect(x - 4, y + 6, 8, 14, ['#5a4a3a', '#3a3a5a', '#6a3030'][k % 3]);
    p.line(x - 2, y + 20, x - 3 + bob, y + 34, '#3a3048', 2.8);
    p.line(x + 2, y + 20, x + 3 - bob, y + 34, '#3a3048', 2.8);
    p.ball(x, y + 2, 4, 4.4, ['#2a5a2a', skin, '#9ad070', '#d0ffb0']);
    p.set(x - 2, y + 2, '#ff2020'); p.set(x + 1, y + 2, '#ff2020');
    p.rect(x - 1, y + 5, 3, 1, '#7a0010');
    p.set(x + 2, y + 10, '#a00010'); p.set(x - 2, y + 14, '#a00010');
  }
}));
export const FENCE = [0, 1].map((f) => simple(200, 60, (p) => {
  for (let k = 0; k < 6; k++) { const x = 6 + k * 37; p.rect(x, 4, 5, 56, '#4a4a5a'); p.rect(x, 4, 2, 56, '#7a7a8a'); p.rect(x - 2, 2, 9, 4, '#ffd000'); }
  for (let row = 0; row < 4; row++) {
    const y0 = 12 + row * 12;
    let y = y0;
    for (let x = 6; x < 194; x += 3) {
      y = y0 + Math.round(Math.sin(x * 0.4 + f * 3 + row) * 3);
      p.set(x, y, row % 2 ? '#9ff3ff' : '#ffffff');
      p.set(x + 1, y, '#5ad0ff');
    }
  }
}, false));

// ---------- 新場景 ----------
export const PALM = simple(44, 60, (p) => {
  p.line(24, 58, 20, 20, '#8a5a2b', 4); p.line(23, 58, 19, 20, '#b07a40', 1.5);
  const G = ramp(0.33, 0.6, 0.4);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    const ex = 20 + Math.cos(a) * 19, ey = 18 + Math.sin(a) * 10 + 8;
    p.line(20, 18, ex, ey, G[0], 4.4); p.line(20, 18, ex, ey, G[1], 2.6); p.line(20, 17.5, ex, ey - 0.5, G[2], 1);
  }
  p.ball(20, 20, 2.4, 2.4, ['#3a200c', '#6a3a14', '#9a6430', '#e0b070']);
});
export const UMBRELLA = simple(36, 34, (p) => {
  p.rect(17, 14, 2, 20, '#e8e0f0');
  for (let y = 0; y < 14; y++) {
    const hw = 3 + y * 1.1;
    for (let x = -hw; x <= hw; x++) p.set(18 + x, 2 + y, (Math.floor((x + 20) / 4) % 2) ? '#ff3040' : '#ffffff');
  }
  p.ell(10, 32, 6, 1.6, '#e8c890');
});
export const TOWER = simple(30, 56, (p) => {
  for (const x of [5, 23]) p.rect(x, 22, 2, 34, '#c8a070');
  p.line(6, 30, 24, 46, '#a88050', 1.2); p.line(24, 30, 6, 46, '#a88050', 1.2);
  p.rect(2, 14, 26, 10, '#ff3040'); p.rect(2, 14, 26, 2, '#ff8a90'); p.rect(10, 17, 10, 4, '#ffffff'); p.rect(14, 16, 2, 6, '#ff3040');
  p.rect(0, 6, 30, 8, '#ffd000'); p.rect(0, 6, 30, 2, '#fff07a');
});
export const BUILDINGS = [0, 1, 2].map((k) => simple(60, 110 - k * 20, (p) => {
  const h = 110 - k * 20;
  const base = ramp([0.7, 0.02, 0.58][k], 0.25, 0.3);
  p.rect(2, 4, 56, h - 4, base[1]); p.rect(2, 4, 4, h - 4, base[2]); p.rect(52, 4, 6, h - 4, base[0]);
  p.rect(0, 2, 60, 4, base[0]);
  for (let y = 10; y < h - 12; y += 9) for (let x = 9; x < 50; x += 9) {
    const r = hash(x * 3 + k, y);
    p.rect(x, y, 5, 6, r < 0.45 ? '#ffd27a' : r < 0.55 ? '#ff3030' : '#1a1622');
  }
  p.rect(22, h - 14, 14, 14, '#1a1622');
  if (k === 1) { p.rect(10, 20, 40, 10, '#a00010'); p.text('BAR', 20, 23, '#ffe0a0'); }
}));
export const LAMP = simple(16, 50, (p) => {
  p.rect(7, 8, 2, 42, '#3a3a48'); p.rect(3, 4, 10, 4, '#4a4a5a'); p.rect(4, 8, 8, 2, '#ffd27a');
});
export const TORCH = [0, 1].map((f) => simple(14, 40, (p) => {
  p.rect(6, 14, 3, 26, '#6a3a18'); p.rect(3, 12, 9, 3, '#8a8a9a');
  p.ell(7, 8 - f, 4, 6, '#ff6a14'); p.ell(7, 9, 2.4, 4, '#ffd040'); p.set(7, 10, '#ffffff');
}));

// ---------- 技能圖示 ----------
const ic = (fn) => simple(20, 20, fn);
export const SKILL_ICONS = {
  headbutt: ic((p) => { p.ball(10, 10, 6, 6, ['#a86040', '#e0a070', '#ffd0a0', '#fff']); p.line(2, 4, 6, 7, '#ffe000', 1.6); p.line(18, 4, 14, 7, '#ffe000', 1.6); p.line(10, 1, 10, 4, '#ffe000', 1.6); }),
  dumbbell: ic((p) => { p.rect(4, 9, 12, 2, '#9a9aa8'); p.rect(1, 5, 4, 10, '#3a3a4a'); p.rect(15, 5, 4, 10, '#3a3a4a'); p.rect(2, 6, 1, 8, '#7a7a8a'); }),
  charge: ic((p) => { p.ball(12, 10, 6, 5, ['#8a0010', '#d02030', '#ff6070', '#fff']); for (let i = 0; i < 3; i++) p.line(1, 6 + i * 4, 6, 6 + i * 4, '#ffffff', 1.2); }),
  blink: ic((p) => { p.line(3, 17, 17, 3, '#e8e8f0', 2); p.line(3, 17, 17, 3, '#9ff3ff', 1); for (const [x, y] of [[5, 5], [14, 15], [8, 12]]) p.set(x, y, '#ffffff'); }),
  shuriken: ic((p) => { for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.4; p.line(10, 10, 10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8, '#c8c8d8', 2.4); } p.ell(10, 10, 1.6, 1.6, '#1a1028'); }),
  smoke: ic((p) => { const G = ['#3a3a4a', '#6a6a7a', '#9a9aaa', '#d0d0e0']; p.ball(7, 12, 5, 5, G); p.ball(13, 10, 6, 6, G); p.set(9, 13, '#5aff3a'); p.set(14, 9, '#5aff3a'); }),
  cleaver: ic((p) => { p.rect(4, 4, 11, 8, '#c8d0dc'); p.rect(4, 4, 11, 2, '#ffffff'); p.rect(14, 10, 4, 7, '#6a3a18'); p.rect(4, 10, 6, 2, '#a00010'); }),
  hook: ic((p) => { p.line(4, 2, 12, 10, '#8a8a9a', 1.4); p.line(12, 10, 12, 15, '#c8c8d8', 2); p.line(12, 15, 8, 17, '#c8c8d8', 2); p.line(8, 17, 6, 14, '#c8c8d8', 2); p.set(6, 14, '#a00010'); }),
  spin: ic((p) => { for (let a = 0; a < 5.2; a += 0.1) p.set(10 + Math.cos(a) * 7, 10 + Math.sin(a) * 7, a < 2 ? '#ffffff' : '#ff3050'); p.rect(9, 9, 3, 3, '#c8d0dc'); }),
  box: ic((p) => { p.rect(3, 5, 14, 12, '#ff7a20'); p.rect(3, 5, 14, 3, '#ffb060'); p.rect(8, 9, 4, 4, '#ffffff'); p.line(2, 2, 6, 4, '#ffe000', 1); }),
  soup: ic((p) => { p.ell(10, 14, 7, 4, '#c8c8d8'); p.ell(10, 13, 5, 2, '#ff6a14'); for (const x of [6, 10, 14]) p.line(x, 9, x + 1, 3, '#ffffff', 1); }),
  nitro: ic((p) => { p.rect(4, 4, 6, 12, '#3a6aff'); p.rect(4, 4, 6, 2, '#9ab8ff'); p.line(11, 10, 18, 10, '#ff8a20', 3); p.line(11, 10, 18, 10, '#ffe060', 1); }),
};
