// 打人三項：2D 像素風畫面樣品（第一關 血海游泳）
// 所有圖都是程式一格一格畫出來的：深色描邊 + 三層明暗 + 高飽和色
const W = 384, H = 216;
const OUT = '#1a1028';
const cv = document.getElementById('c');
cv.width = W; cv.height = H;
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;

function fit() {
  const k = Math.min(innerWidth / W, innerHeight / H);
  const s = k >= 2 ? Math.floor(k) : k;
  cv.style.width = W * s + 'px';
  cv.style.height = H * s + 'px';
}
addEventListener('resize', fit);
fit();

// ---------- 顏色工具 ----------
const hsl = (h, s, l) => `hsl(${(((h % 1) + 1) % 1) * 360},${Math.round(Math.min(1, s) * 100)}%,${Math.round(Math.max(0, Math.min(1, l)) * 100)}%)`;
const toward = (h, t, a) => { let d = t - h; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return h + d * a; };
// 16-bit 風格：暗部偏紫、亮部偏黃
const ramp = (h, s, l) => [
  hsl(toward(h, 0.72, 0.15), s, l - 0.24), hsl(h, s, l),
  hsl(toward(h, 0.14, 0.1), s, l + 0.13), hsl(toward(h, 0.14, 0.2), s * 0.5, l + 0.3),
];
const SKIN = ramp(0.07, 0.65, 0.64);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// ---------- 像素畫布 ----------
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null; }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, c);
    }
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  line(x0, y0, x1, y1, c, t = 1) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      if (t > 1) this.ell(x, y, t / 2, t / 2, c); else this.set(x, y, c);
    }
  }
  ball(cx, cy, rx, ry, r) {
    this.ell(cx, cy, rx, ry, r[0]);
    this.ell(cx - 0.6, cy - 0.6, rx - 0.9, ry - 0.9, r[1]);
    this.ell(cx - rx * 0.32, cy - ry * 0.32, rx * 0.45, ry * 0.45, r[2]);
    this.set(cx - rx * 0.45, cy - ry * 0.5, r[3]);
  }
  outline(c) {
    const o = this.d.slice(), w = this.w;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < w; x++) {
      if (o[y * w + x]) continue;
      if ((x > 0 && o[y * w + x - 1]) || (x < w - 1 && o[y * w + x + 1]) || (y > 0 && o[(y - 1) * w + x]) || (y < this.h - 1 && o[(y + 1) * w + x])) this.d[y * w + x] = c;
    }
  }
  canvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const x = c.getContext('2d');
    for (let i = 0; i < this.d.length; i++) {
      if (!this.d[i]) continue;
      x.fillStyle = this.d[i];
      x.fillRect(i % this.w, (i / this.w) | 0, 1, 1);
    }
    return c;
  }
}

function whiteOf(cnv) {
  const c = document.createElement('canvas');
  c.width = cnv.width; c.height = cnv.height;
  const x = c.getContext('2d');
  x.drawImage(cnv, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------- 角色與物件的像素圖 ----------
function makeSwimmer(cap, suit, f, headless = false) {
  const p = new Pix(20, 26), cx = 10;
  const k = f % 2;
  p.rect(cx - 3, 19, 2, 3 + k, SKIN[0]);
  p.rect(cx + 1, 19, 2, 4 - k, SKIN[0]);
  p.ball(cx, 15, 3.8, 5.4, suit);
  const arm = (x0, y0, x1, y1) => {
    p.line(x0, y0, x1, y1, SKIN[0], 2.4);
    p.line(x0 - 0.3, y0 - 0.3, x1 - 0.3, y1 - 0.3, SKIN[1], 1.3);
    p.ball(x1, y1, 1.5, 1.5, SKIN);
  };
  if (f === 0) { arm(cx - 4, 12, cx - 5, 3); arm(cx + 4, 13, cx + 5, 20); }
  else if (f === 2) { arm(cx + 4, 12, cx + 5, 3); arm(cx - 4, 13, cx - 5, 20); }
  else { arm(cx - 4, 12, cx - 8, f === 1 ? 9 : 11); arm(cx + 4, 12, cx + 8, f === 1 ? 11 : 9); }
  if (!headless) {
    p.ball(cx, 8, 4.2, 4.2, cap);
    for (let x = cx - 5; x <= cx + 5; x++) if (p.get(x, 9)) p.set(x, 9, '#24203a');
    p.set(cx - 4, 9, '#9ff3ff');
    p.set(cx + 3, 9, '#9ff3ff');
  } else {
    p.ell(cx, 10, 2.5, 1.9, '#8a0016');
    p.ell(cx - 0.4, 9.6, 1.5, 1.1, '#e02040');
    p.set(cx - 1, 9, '#ff9aa8');
  }
  p.outline(OUT);
  const foam = ['#ffffff', '#c8f4ff'];
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + f * 0.8;
    const x = cx + Math.cos(a) * 6.5, y = 17 + Math.sin(a) * 7.5;
    if (!p.get(x, y)) p.set(x, y, foam[i % 2]);
  }
  for (let i = 0; i < 4; i++) p.set(cx - 3 + i * 2 + k, 23 + (i % 2), foam[i % 2]);
  return p.canvas();
}

function makeShark(f, bite) {
  const p = new Pix(30, 54), cx = 15;
  const G = ['#22405f', '#4a74a0', '#80a8d2', '#d8eeff'];
  const w = f ? 1.6 : -1.6;
  p.line(cx, 37, cx + w * 2 - 7, 50, G[1], 2.8);
  p.line(cx, 37, cx + w * 2 + 7, 50, G[1], 2.8);
  p.line(cx - 4, 18, cx - 12, 27, G[1], 3);
  p.line(cx + 4, 18, cx + 12, 27, G[1], 3);
  p.ball(cx, 22, 6.6, 17, G);
  p.line(cx + 1, 14, cx + 1 + w * 0.3, 27, G[0], 2);
  p.line(cx - 0.5, 13, cx - 0.5, 26, G[3], 1.6);
  p.set(cx - 4, 9, '#000');
  p.set(cx + 4, 9, '#000');
  if (bite) {
    p.ell(cx, 6, 4.2, 3.2, '#5a000e');
    p.ell(cx, 6.6, 2.8, 2, '#c01030');
    for (const x of [-3, -1, 1, 3]) p.set(cx + x, 4, '#fff');
    for (const x of [-2, 0, 2]) p.set(cx + x, 8, '#fff');
  }
  p.outline(OUT);
  return p.canvas();
}

function makeBoom(k) {
  const S = 64, p = new Pix(S, S), c = S / 2;
  const r = 6 + (k / 9) * 24;
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
}

function makeRing(k) {
  const S = 34, p = new Pix(S, S), r = 3 + k * 2.2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x + 0.5 - S / 2, (y + 0.5 - S / 2) * 1.25);
    if (Math.abs(d - r) < 0.9 && bayer(x, y) < 1 - k / 7) p.set(x, y, k < 3 ? '#ffffff' : '#bfefff');
  }
  return p.canvas();
}

const cloudCache = new Map();
function cloudSprite(r, lv) {
  const key = r * 4 + lv;
  let c = cloudCache.get(key);
  if (c) return c;
  const S = r * 2 + 2, p = new Pix(S, S), dens = [1, 0.72, 0.45, 0.2][lv];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2;
    const d = Math.hypot(dx, dy) / r, wob = 1 + 0.13 * Math.sin(Math.atan2(dy, dx) * 5 + r);
    if (d > wob) continue;
    const inner = d < 0.62 * wob;
    if (bayer(x, y) >= (inner ? dens : dens * 0.6)) continue;
    p.set(x, y, inner ? '#7a0016' : '#b3122c');
  }
  c = p.canvas();
  cloudCache.set(key, c);
  return c;
}

function makeWater(f) {
  const S = 64, p = new Pix(S, S), ph = (f * Math.PI) / 2, T = Math.PI * 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = Math.sin((T * (2 * x + y)) / S + ph) + Math.sin((T * (3 * y - x)) / S - ph) + 0.5 * Math.sin((T * (x + 4 * y)) / S + 2 * ph);
    p.set(x, y, v > 1.75 ? '#c4ecff' : v > 1.2 ? '#5cb4f2' : v > 0.3 ? '#2f7fd8' : v > -1.2 ? '#2368c4' : '#1d57aa');
  }
  return p.canvas();
}

function makeSand() {
  const S = 64, p = new Pix(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const h = hash(x, y);
    p.set(x, y, h > 0.93 ? '#fff0c0' : h < 0.06 ? '#d4a65a' : h < 0.12 ? '#e5bd72' : '#f2cf86');
  }
  return p.canvas();
}

function makePalm(seed) {
  const p = new Pix(46, 46), c = 23;
  const L = ['#145a2e', '#22914a', '#5fd36a', '#c8ff9a'];
  for (let i = 0; i < 7; i++) {
    const a = seed + (i * Math.PI * 2) / 7;
    const ex = c + Math.cos(a) * 20, ey = c + Math.sin(a) * 20;
    const mx = c + Math.cos(a + 0.28) * 11, my = c + Math.sin(a + 0.28) * 11;
    p.line(c, c, mx, my, L[0], 5.5); p.line(mx, my, ex, ey, L[0], 3.6);
    p.line(c, c, mx, my, L[1], 3.6); p.line(mx, my, ex, ey, L[1], 2.2);
    p.line(c - 0.5, c - 0.5, mx - 0.5, my - 0.5, L[2], 1); p.line(mx - 0.5, my - 0.5, ex, ey, L[2], 1);
  }
  const CO = ['#3a200c', '#6a3a14', '#9a6430', '#e0b070'];
  p.ball(c + 2, c + 1, 2.4, 2.4, CO);
  p.ball(c - 2, c + 2, 2.4, 2.4, CO);
  p.ball(c, c - 2, 2.4, 2.4, CO);
  p.outline(OUT);
  return p.canvas();
}

function makeUmbrella(h) {
  const p = new Pix(30, 30), c = 15, r = 12;
  const A = ramp(h, 0.85, 0.55), B = ['#c8c0d8', '#ffffff', '#ffffff', '#ffffff'];
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d > r) continue;
    const sec = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 8) % 2;
    const R = sec ? A : B;
    const shade = dx + dy > r * 0.55 ? 0 : dx + dy < -r * 0.6 ? 2 : 1;
    p.set(x, y, R[shade]);
  }
  p.ball(c, c, 1.6, 1.6, ['#5a4a3a', '#8a7a6a', '#c0b0a0', '#fff']);
  p.outline(OUT);
  return p.canvas();
}

function makeTowel(h) {
  const p = new Pix(14, 22);
  const A = ramp(h, 0.8, 0.5);
  for (let y = 0; y < 22; y++) p.rect(0, y, 14, 1, Math.floor(y / 3) % 2 ? A[1] : '#fff8e8');
  p.rect(0, 0, 14, 1, A[0]);
  p.outline(OUT);
  return p.canvas();
}

function makeBox(k) {
  const p = new Pix(16, 16);
  p.rect(1, 1, 14, 14, '#b85a0c');
  p.rect(2, 2, 12, 12, '#ffaa1a');
  p.rect(2, 2, 12, 2, '#ffe07a');
  p.rect(2, 12, 12, 2, '#d47810');
  const Q = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'];
  Q.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '#') { p.set(6 + x, 5 + y, '#5a2400'); p.set(5 + x, 4 + y, '#ffffff'); }
  }));
  for (let i = 0; i < 12; i++) {
    const x = k - 6 + i, y = 2 + i;
    if (x >= 2 && x < 14 && y < 14 && p.get(x, y) !== '#ffffff') p.set(x, y, '#fff4c0');
  }
  p.outline(OUT);
  return p.canvas();
}

function makeMine(on) {
  const p = new Pix(18, 18), c = 9;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    p.line(c, c, c + Math.cos(a) * 7.5, c + Math.sin(a) * 7.5, '#8a1a1a', 1.8);
  }
  p.ball(c, c, 5, 5, ['#14101c', '#2e2838', '#55506a', '#a8a0c0']);
  p.ball(c, c, 1.6, 1.6, on ? ['#a00000', '#ff2020', '#ff9090', '#fff'] : ['#300', '#600', '#800', '#a00']);
  p.outline(OUT);
  return p.canvas();
}

function makeHead(cap) {
  const p = new Pix(10, 10);
  p.ball(5, 5, 3.6, 3.6, cap);
  for (let x = 0; x < 10; x++) if (p.get(x, 6)) p.set(x, 6, '#24203a');
  p.set(4, 8, '#c01030');
  p.set(5, 8, '#e02040');
  p.outline(OUT);
  return p.canvas();
}

function makeLimb() {
  const p = new Pix(6, 9);
  p.rect(2, 1, 2, 6, SKIN[1]);
  p.set(2, 1, SKIN[2]);
  p.rect(2, 6, 2, 1, '#c01030');
  p.outline(OUT);
  return p.canvas();
}

function makeArrow() {
  const p = new Pix(11, 9);
  const Y = ['#b07000', '#ffd000', '#fff070', '#fff'];
  p.rect(1, 0, 9, 3, Y[1]);
  for (let i = 0; i < 5; i++) p.rect(1 + i, 3 + i, 9 - i * 2, 1, Y[1]);
  p.rect(1, 0, 9, 1, Y[2]);
  p.outline(OUT);
  return p.canvas();
}

function makeIcon(kind) {
  if (kind === 'person') {
    const p = new Pix(9, 10);
    p.ball(4.5, 2.5, 2.2, 2.2, ['#a090c0', '#ffffff', '#ffffff', '#fff']);
    p.ell(4.5, 8, 3.6, 2.6, '#ffffff');
    p.outline(OUT);
    return p.canvas();
  }
  if (kind === 'skull') {
    const p = new Pix(10, 10);
    p.ell(5, 4, 4, 3.6, '#ffffff');
    p.rect(3, 6, 4, 3, '#ffffff');
    p.rect(2, 3, 2, 2, OUT); p.rect(6, 3, 2, 2, OUT);
    p.set(4, 8, OUT); p.set(5, 6, OUT);
    p.outline(OUT);
    return p.canvas();
  }
  // 鯊魚圖示（側面）
  const p = new Pix(24, 14);
  const G = ['#22405f', '#4a74a0', '#80a8d2', '#d8eeff'];
  p.line(4, 8, 0, 3, G[1], 2.4); p.line(4, 8, 0, 12, G[1], 2.4);
  p.ball(12, 8, 9, 3.6, G);
  p.line(11, 5, 14, 0.5, G[1], 2.4);
  p.rect(16, 9, 5, 1, '#c01030');
  p.set(17, 9, '#fff'); p.set(19, 9, '#fff');
  p.set(18, 6, '#000');
  p.outline(OUT);
  return p.canvas();
}

// 3x5 像素字型（數字與少數英文字）
const FONT = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
  ':': '000010000010000', '/': '001001010100100', x: '000101010101000', ' ': '000000000000000', '!': '010010010000010',
  S: '111100111001111', T: '111010010010010', A: '010101111101101', G: '111100101101111', E: '111100110100111',
  F: '111100110100100', I: '111010010010111', N: '101111111101101', H: '101101111101101', P: '110101110100100',
  M: '101111111101101', R: '110101110101101', O: '111101101101111', K: '101101110101101', L: '100100100100111',
};
function text(str, x, y, s = 1, col = '#fff', shadow = OUT) {
  str = String(str).toUpperCase();
  const draw = (ox, oy, c) => {
    g.fillStyle = c;
    for (let i = 0; i < str.length; i++) {
      const gl = FONT[str[i]] || FONT[' '];
      for (let j = 0; j < 15; j++) if (gl[j] === '1') g.fillRect(x + ox + (i * 4 + (j % 3)) * s, y + oy + Math.floor(j / 3) * s, s, s);
    }
  };
  if (shadow) { draw(s, s, shadow); draw(-1, 0, shadow); draw(1, 0, shadow); draw(0, -1, shadow); draw(0, 1, shadow); }
  draw(0, 0, col);
}
const textW = (str, s) => String(str).length * 4 * s - s;

// ---------- 素材準備 ----------
const WATER = [0, 1, 2, 3].map(makeWater);
const SAND = makeSand();
const BOOM = Array.from({ length: 10 }, (_, k) => makeBoom(k));
const RING = Array.from({ length: 7 }, (_, k) => makeRing(k));
const SHARK = [makeShark(0, false), makeShark(1, false), makeShark(0, true), makeShark(1, true)];
const BOX = Array.from({ length: 20 }, (_, k) => makeBox(k));
const MINE = [makeMine(false), makeMine(true)];
const LIMB = makeLimb();
const ARROW = makeArrow();
const ICON = { person: makeIcon('person'), skull: makeIcon('skull'), shark: makeIcon('shark') };
const PALMS = [0, 1, 2, 3].map((i) => makePalm(i * 0.7));
const UMBR = [0.0, 0.58, 0.83, 0.12].map(makeUmbrella);
const TOWEL = [0.95, 0.5, 0.3].map(makeTowel);

const LOOKS = [];
for (let i = 0; i < 16; i++) {
  const cap = ramp(i / 16, 0.85, 0.55);
  const suit = ramp((i * 7) / 16 + 0.3, 0.55, 0.32);
  LOOKS.push({ cap, suit });
}
LOOKS.push({ cap: ramp(0.14, 1, 0.55), suit: ramp(0.98, 0.8, 0.42) }); // 玩家：黃帽紅泳衣
const SPR = LOOKS.map((l) => {
  const frames = [0, 1, 2, 3].map((f) => makeSwimmer(l.cap, l.suit, f));
  return { frames, white: frames.map(whiteOf), dead: makeSwimmer(l.cap, l.suit, 1, true), head: makeHead(l.cap) };
});
const PLAYER_LOOK = 16;

// ---------- 世界 ----------
const LANE = 120, TRACK = 6000;
const racers = [];
for (let i = 0; i < 100; i++) {
  const row = Math.floor(i / 10), col = i % 10;
  racers.push({
    id: i, x: -108 + col * 24 + (row % 2) * 6, y: 14 + row * 20,
    look: i % 16, spd: 46 + Math.random() * 12, wob: Math.random() * 6,
    alive: true, hp: 2, anim: Math.random() * 4, hitT: 0, kx: 0,
  });
}
const player = racers[44];
player.look = PLAYER_LOOK;
player.hp = 99;

const deco = [];
for (let y = 120; y > -TRACK - 200; y -= 34 + hash(y, 1) * 40) {
  for (const side of [-1, 1]) {
    const r = hash(y, side + 5);
    const x = side * (150 + hash(y, side + 9) * 34);
    if (r < 0.4) deco.push({ spr: PALMS[Math.floor(hash(y, side) * 4)], x, y, shadow: 16 });
    else if (r < 0.62) deco.push({ spr: UMBR[Math.floor(hash(y, side + 2) * 4)], x, y, shadow: 12 });
    else if (r < 0.78) deco.push({ spr: TOWEL[Math.floor(hash(y, side + 3) * 3)], x, y, shadow: 0 });
  }
}

const boxes = [];
for (let y = -220; y > -TRACK + 200; y -= 320) for (let k = 0; k < 5; k++) boxes.push({ x: -88 + k * 44, y, on: true, t: 0 });

let t = 0, camY = player.y - H * 0.65, shake = 0, stopT = 0, flash = 0;
let started = false, item = null, kills = 0, evT = 3.5;
const particles = [], clouds = [], chunks = [], corpses = [], sharks = [], mines = [], fx = [];

const keys = {};
addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyF' || e.code === 'KeyJ') punch();
  if (e.code === 'Space' && item) { item = null; spawnShark(player.x, player.y + 30, null, 3, true); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------- 噴血 ----------
function blood(x, y, z, n, spd, up, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random());
    particles.push({
      x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, vz: up * (0.4 + Math.random()),
      c: col || ['#ff2040', '#d0102a', '#8a0016', '#ff6070'][i % 4], s: Math.random() < 0.5 ? 2 : 1, blood: !col,
    });
  }
}
function addCloud(x, y, r0, rMax, life = 14) {
  clouds.push({ x, y, r: r0, rMax, life, max: life });
  if (clouds.length > 320) clouds.shift();
}
function gore(r, big) {
  const x = r.x, y = r.y;
  blood(x, y, 6, big ? 220 : 130, big ? 120 : 80, big ? 190 : 140);
  chunks.push({ spr: SPR[r.look].head, x, y, z: 8, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 60, vz: 130 + Math.random() * 60, life: 7 });
  for (let i = 0; i < (big ? 3 : 2); i++) {
    chunks.push({ spr: LIMB, x, y, z: 5, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 90, vz: 90 + Math.random() * 80, life: 6 });
  }
  addCloud(x, y, 10, big ? 40 : 28, 22);
  addCloud(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 16, 6, big ? 24 : 16, 18);
  fx.push({ type: 'ring', x, y, t: 0 });
  if (!big) {
    corpses.push({ spr: SPR[r.look].dead, x, y, t: 0, fountain: 3 });
    if (corpses.length > 120) corpses.shift();
  }
  shake = Math.max(shake, big ? 4 : 2.5);
}
function kill(r, big, byPlayer) {
  if (!r.alive) return;
  r.alive = false;
  gore(r, big);
  if (byPlayer) { kills++; stopT = 0.06; flash = 0.08; }
}

// ---------- 戰鬥 ----------
function punch() {
  player.punchT = 0.18;
  let best = null, bd = 20;
  for (const r of racers) {
    if (!r.alive || r === player) continue;
    const d = Math.hypot(r.x - player.x, r.y - player.y);
    if (d < bd) { bd = d; best = r; }
  }
  if (!best) return;
  best.hp--;
  best.hitT = 0.12;
  best.kx += Math.sign(best.x - player.x || 1) * 90;
  blood(best.x, best.y, 8, 18, 50, 70);
  shake = Math.max(shake, 1.5);
  if (best.hp <= 0) kill(best, false, true);
}
function spawnShark(x, y, target, bites, mine) {
  sharks.push({ x, y, a: 0, target, bites, mine, biteT: 0, life: 9 });
}
function onScreen(r) { const sy = r.y - camY; return sy > 24 && sy < H - 24; }

// ---------- 更新 ----------
function update(dt) {
  t += dt;
  if (stopT > 0) { stopT -= dt; return; }
  if (!started && t > 2.4) { started = true; document.getElementById('title').style.opacity = 0; }

  if (started) {
    let sp = 56;
    if (keys.KeyW || keys.ArrowUp) sp = 76;
    if (keys.KeyS || keys.ArrowDown) sp = 28;
    player.y -= sp * dt;
    player.x += ((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0)) * 72 * dt;
    player.anim += (dt * sp) / 9;
  }
  for (const r of racers) {
    if (!r.alive) continue;
    r.hitT -= dt;
    r.punchT = (r.punchT || 0) - dt;
    if (r !== player && started) {
      r.y -= r.spd * dt;
      r.x += Math.sin(t * 0.7 + r.wob) * 8 * dt;
      r.anim += (dt * r.spd) / 9;
    }
    r.x += r.kx * dt;
    r.kx *= Math.pow(0.02, dt);
    r.x = Math.max(-LANE + 8, Math.min(LANE - 8, r.x));
  }
  for (let i = 0; i < racers.length; i++) {
    const a = racers[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < racers.length; j++) {
      const b = racers[j];
      if (!b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx > 14 || dx < -14 || dy > 14 || dy < -14) continue;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 14) {
        const p = (14 - d) / 2;
        a.x -= (dx / d) * p; a.y -= (dy / d) * p * 0.5;
        b.x += (dx / d) * p; b.y += (dy / d) * p * 0.5;
      }
    }
  }
  camY += (player.y - H * 0.65 - camY) * Math.min(1, dt * 6);

  // 道具箱
  for (const b of boxes) {
    if (!b.on) { b.t -= dt; if (b.t <= 0) b.on = true; continue; }
    if (!item && Math.hypot(b.x - player.x, b.y - player.y) < 14) { b.on = false; b.t = 4; item = 'shark'; fx.push({ type: 'ring', x: b.x, y: b.y, t: 0 }); }
  }

  // 示範用的隨機事件：鯊魚或水雷
  evT -= dt;
  if (started && evT <= 0) {
    evT = 2.2 + Math.random() * 2;
    const cand = racers.filter((r) => r.alive && r !== player && onScreen(r) && Math.abs(r.y - player.y) > 18);
    if (cand.length) {
      const v = cand[Math.floor(Math.random() * cand.length)];
      if (Math.random() < 0.5) spawnShark(v.x < 0 ? -LANE - 30 : LANE + 30, v.y - 30, v, 1, false);
      else mines.push({ x: v.x, y: v.y - 46, t: 1.3 });
    }
  }

  for (let i = sharks.length - 1; i >= 0; i--) {
    const s = sharks[i];
    s.life -= dt;
    s.biteT -= dt;
    if (!s.target || !s.target.alive) {
      s.target = null;
      if (s.bites > 0) {
        let bd = 1e9;
        for (const r of racers) {
          if (!r.alive || r === player) continue;
          const d = Math.hypot(r.x - s.x, r.y - s.y) + (r.y > s.y ? 80 : 0);
          if (d < bd && d < 220) { bd = d; s.target = r; }
        }
      }
    }
    let ta;
    if (s.target) ta = Math.atan2(s.target.x - s.x, -(s.target.y - s.y));
    else ta = s.x < 0 ? -1.2 : 1.2;
    let d = ta - s.a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    s.a += Math.max(-5 * dt, Math.min(5 * dt, d));
    const sp = s.target ? 170 : 120;
    s.x += Math.sin(s.a) * sp * dt;
    s.y -= Math.cos(s.a) * sp * dt;
    if (s.target && Math.hypot(s.target.x - s.x, s.target.y - s.y) < 12) {
      kill(s.target, true, s.mine);
      s.biteT = 0.35;
      s.bites--;
      s.target = null;
    }
    if (s.life <= 0 || Math.abs(s.x) > 260) sharks.splice(i, 1);
  }

  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    m.t -= dt;
    if (m.t > 0) continue;
    mines.splice(i, 1);
    fx.push({ type: 'boom', x: m.x, y: m.y, t: 0 });
    blood(m.x, m.y, 2, 40, 70, 200, '#ffffff');
    blood(m.x, m.y, 2, 30, 50, 160, '#bfefff');
    shake = Math.max(shake, 6);
    flash = 0.06;
    for (const r of racers) {
      if (!r.alive || r === player) continue;
      const d = Math.hypot(r.x - m.x, r.y - m.y);
      if (d < 24) kill(r, true, false);
      else if (d < 50) r.kx += Math.sign(r.x - m.x || 1) * 120;
    }
  }

  // 粒子與碎塊
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vz -= 320 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z <= 0) {
      if (p.blood && Math.random() < 0.3) addCloud(p.x, p.y, 2, 3 + Math.random() * 5, 12);
      particles.splice(i, 1);
    }
  }
  if (particles.length > 1500) particles.splice(0, particles.length - 1500);
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i];
    c.life -= dt;
    if (c.z > 0 || c.vz > 0) {
      c.vz -= 320 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.z <= 0) {
        c.z = 0;
        if (c.vz < -90) { c.vz = -c.vz * 0.25; fx.push({ type: 'ring', x: c.x, y: c.y, t: 0 }); addCloud(c.x, c.y, 2, 7, 10); }
        else c.vz = 0;
        c.vx *= 0.3; c.vy *= 0.3;
      }
    }
    if (c.life <= 0) chunks.splice(i, 1);
  }
  for (const c of corpses) {
    c.t += dt;
    if (c.fountain > 0) {
      c.fountain -= dt;
      blood(c.x, c.y - 2, 3, 4, 22, 120 * Math.min(1, c.fountain));
    }
  }
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.life -= dt;
    c.r = Math.min(c.rMax, c.r + dt * 14);
    if (c.life <= 0) clouds.splice(i, 1);
  }
  for (let i = fx.length - 1; i >= 0; i--) {
    fx[i].t += dt;
    if (fx[i].t > (fx[i].type === 'boom' ? 0.6 : 0.4)) fx.splice(i, 1);
  }
  shake = Math.max(0, shake - dt * 18);
  flash -= dt;
}

// ---------- 畫面 ----------
let sx0 = 0, sy0 = 0;
const SX = (x) => Math.round(x + W / 2 + sx0);
const SY = (y) => Math.round(y - camY + sy0);
const vis = (y, m = 40) => y - camY > -m && y - camY < H + m;
function blit(img, x, y, ax = 0.5, ay = 0.5) {
  g.drawImage(img, SX(x) - Math.round(img.width * ax), SY(y) - Math.round(img.height * ay));
}

function drawWorld() {
  // 海
  const wf = WATER[Math.floor(t * 4) % 4];
  const oy = (((-(camY + sy0)) % 64) + 64) % 64;
  for (let y = oy - 64; y < H; y += 64) for (let x = -64 + (sx0 % 64); x < W; x += 64) g.drawImage(wf, Math.round(x), Math.round(y));
  // 閃光
  for (let i = 0; i < 26; i++) {
    const wy = Math.floor((camY + i * 9.3) / 9) * 9 + ((i * 37) % 9);
    const wx = ((hash(i, Math.floor(wy)) * 300) | 0) - 150;
    if (Math.sin(t * 6 + i * 2.3) > 0.7) { g.fillStyle = '#ffffff'; g.fillRect(SX(wx), SY(wy), 2, 1); }
  }
  // 血水
  for (const c of clouds) {
    if (!vis(c.y)) continue;
    const k = c.life / c.max;
    const lv = k > 0.55 ? 0 : k > 0.35 ? 1 : k > 0.15 ? 2 : 3;
    blit(cloudSprite(Math.max(1, Math.round(c.r)), lv), c.x, c.y);
  }
  // 起跑線與終點
  for (const [y, label] of [[0, 'START'], [-TRACK, 'FINISH']]) {
    if (!vis(y)) continue;
    for (let x = -LANE; x < LANE; x += 6) {
      g.fillStyle = (x / 6) % 2 ? '#ffffff' : OUT;
      g.fillRect(SX(x), SY(y) - 3, 6, 3);
      g.fillStyle = (x / 6) % 2 ? OUT : '#ffffff';
      g.fillRect(SX(x), SY(y), 6, 3);
    }
    text(label, SX(0) - textW(label, 2) / 2, SY(y) - 18, 2, '#ffe000');
  }
  // 碼頭
  if (vis(260, 120)) {
    for (let y = 214; y < 420; y += 8) {
      if (!vis(y)) continue;
      g.fillStyle = OUT; g.fillRect(SX(-LANE - 10), SY(y), (LANE + 10) * 2, 8);
      g.fillStyle = y % 16 ? '#a8692e' : '#b97a3a'; g.fillRect(SX(-LANE - 10), SY(y) + 1, (LANE + 10) * 2, 6);
      g.fillStyle = '#d89a54'; g.fillRect(SX(-LANE - 10), SY(y) + 1, (LANE + 10) * 2, 1);
    }
  }
  // 浮球線
  const start = Math.floor((camY - 10) / 8) * 8;
  for (let y = start; y < camY + H + 10; y += 8) {
    if (y > 205) continue;
    for (const side of [-1, 1]) {
      const x = side * (LANE + 2), red = Math.floor(y / 8) % 3 !== 0;
      g.fillStyle = OUT; g.fillRect(SX(x) - 3, SY(y) - 3, 6, 6);
      g.fillStyle = red ? '#e8202a' : '#ffffff'; g.fillRect(SX(x) - 2, SY(y) - 2, 4, 4);
      g.fillStyle = red ? '#ff8a80' : '#ffffff'; g.fillRect(SX(x) - 2, SY(y) - 2, 2, 1);
      g.fillStyle = red ? '#9a1020' : '#b8c8e0'; g.fillRect(SX(x) - 1, SY(y) + 1, 3, 1);
    }
  }
  // 沙灘（兩側）
  for (const side of [-1, 1]) {
    const edge = side * 134;
    g.save();
    g.beginPath();
    if (side < 0) g.rect(0, 0, SX(edge), H); else g.rect(SX(edge), 0, W - SX(edge), H);
    g.clip();
    const oy2 = (((-(camY + sy0)) % 64) + 64) % 64;
    for (let y = oy2 - 64; y < H; y += 64) {
      if (side < 0) for (let x = SX(edge) - 64; x > -64; x -= 64) g.drawImage(SAND, x, y);
      else for (let x = SX(edge); x < W; x += 64) g.drawImage(SAND, x, y);
    }
    g.restore();
    // 海浪拍岸
    for (let y = 0; y < H; y++) {
      const wy = y + camY;
      const off = Math.round(Math.sin(wy * 0.07 + t * 2.2) * 3 + Math.sin(wy * 0.023 - t) * 2);
      const x0 = SX(edge) + side * off;
      g.fillStyle = '#c99e58'; g.fillRect(side < 0 ? x0 - 4 : x0, y, 4, 1);
      g.fillStyle = '#ffffff'; g.fillRect(side < 0 ? x0 : x0 - 2, y, 2, 1);
      g.fillStyle = '#9ee4ff'; g.fillRect(side < 0 ? x0 + 2 : x0 - 4, y, 2, 1);
    }
  }
  // 距離牌
  for (let m = 100; m * 10 < TRACK; m += 100) {
    const y = -m * 10;
    if (!vis(y)) continue;
    for (const side of [-1, 1]) {
      const label = m + 'M';
      const x = SX(side * 166) - textW(label, 1) / 2;
      g.fillStyle = OUT; g.fillRect(x - 3, SY(y) - 4, textW(label, 1) + 6, 11);
      g.fillStyle = '#e83040'; g.fillRect(x - 2, SY(y) - 3, textW(label, 1) + 4, 9);
      text(label, x, SY(y) - 1, 1, '#fff', null);
    }
  }
  // 沙灘裝飾
  for (const d of deco) {
    if (!vis(d.y, 50)) continue;
    if (d.shadow) {
      g.fillStyle = 'rgba(150,100,40,0.35)';
      g.beginPath(); g.ellipse(SX(d.x) + 6, SY(d.y) + 6, d.shadow, d.shadow * 0.6, 0, 0, 7); g.fill();
    }
    blit(d.spr, d.x, d.y);
  }
}

function drawActors() {
  for (const b of boxes) {
    if (!b.on || !vis(b.y)) continue;
    const bob = Math.round(Math.sin(t * 3 + b.x) * 1.5);
    g.fillStyle = 'rgba(10,30,80,0.35)'; g.fillRect(SX(b.x) - 7, SY(b.y) + 6, 14, 3);
    blit(BOX[Math.floor(t * 14) % 20], b.x, b.y + bob - 2);
  }
  for (const m of mines) blit(MINE[Math.floor(t * 10) % 2], m.x, m.y + Math.sin(t * 4) * 1);
  for (const c of corpses) {
    if (!vis(c.y)) continue;
    blit(c.spr, c.x, c.y + Math.round(Math.sin(c.t * 2) * 1));
  }
  // 鯊魚在水面下：先畫影子，再畫半透明本體
  for (const s of sharks) {
    const img = SHARK[(s.biteT > 0 ? 2 : 0) + (Math.floor(t * 8) % 2)];
    g.save();
    g.translate(SX(s.x), SY(s.y));
    g.rotate(Math.round(s.a / (Math.PI / 8)) * (Math.PI / 8));
    g.globalAlpha = 0.3;
    g.fillStyle = '#0a2050';
    g.fillRect(-5, -14, 12, 34);
    g.globalAlpha = 0.92;
    g.drawImage(img, -15, -27);
    g.restore();
    if (Math.random() < 0.5) particles.push({ x: s.x + (Math.random() - 0.5) * 8, y: s.y + 20, z: 1, vx: 0, vy: 10, vz: 30, c: '#ffffff', s: 1 });
  }
  // 選手（依 y 排序）
  const list = racers.filter((r) => r.alive && vis(r.y)).sort((a, b) => a.y - b.y);
  for (const r of list) {
    const set = SPR[r.look];
    const f = Math.floor(r.anim) % 4;
    blit(r.hitT > 0 ? set.white[f] : set.frames[f], r.x, r.y);
    if (r.punchT > 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(SX(r.x) - 6, SY(r.y) - 18, 12, 2);
    }
  }
  if (player.alive) {
    blit(ARROW, player.x, player.y - 22 + Math.round(Math.sin(t * 6) * 2));
    text('1P', SX(player.x) - 3, SY(player.y) - 34 + Math.round(Math.sin(t * 6) * 2), 1, '#ffe000');
  }
  // 飛在空中的東西（有高度 z）
  for (const c of chunks) {
    if (!vis(c.y)) continue;
    if (c.z > 0) { g.fillStyle = 'rgba(10,20,60,0.35)'; g.fillRect(SX(c.x) - 3, SY(c.y) - 1, 6, 2); }
    blit(c.spr, c.x, c.y - c.z);
  }
  for (const p of particles) {
    g.fillStyle = p.c;
    g.fillRect(SX(p.x), SY(p.y - p.z), p.s, p.s);
  }
  for (const e of fx) {
    if (e.type === 'boom') blit(BOOM[Math.min(9, Math.floor(e.t / 0.06))], e.x, e.y);
    else blit(RING[Math.min(6, Math.floor(e.t / 0.06))], e.x, e.y);
  }
}

function panel(x, y, w, h) {
  g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#f0e0ff'; g.fillRect(x, y, w, h);
  g.fillStyle = '#2a1840'; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = '#4a3070'; g.fillRect(x + 1, y + 1, w - 2, 1);
}

function drawHud() {
  const alive = racers.filter((r) => r.alive).length;
  const left = Math.max(0, 75 - Math.max(0, t - 2.4));
  const tm = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  panel(6, 6, 46, 18);
  text(tm, 10, 9, 2, left < 10 ? '#ff4050' : '#ffffff');

  panel(W / 2 - 34, 5, 68, 20);
  g.drawImage(ICON.person, W / 2 - 29, 10);
  text(alive, W / 2 - 16, 8, 3, alive <= 67 ? '#7dff7a' : '#ffffff');
  text("/67", W / 2 + 22, 15, 1, "#ffb0c0", null);

  panel(W - 56, 6, 50, 18);
  g.drawImage(ICON.skull, W - 51, 10);
  text('x' + kills, W - 38, 9, 2, '#ffe000');

  // 直條分段血量
  panel(8, 34, 10, 66);
  for (let i = 0; i < 14; i++) {
    const yy = 96 - i * 4.4;
    g.fillStyle = '#ffe080'; g.fillRect(10, Math.round(yy) - 2, 6, 3);
    g.fillStyle = '#ffffff'; g.fillRect(10, Math.round(yy) - 2, 6, 1);
  }
  text('HP', 7, 104, 1, '#ffe000');

  // 道具欄
  const bx = W / 2 - 16, by = H - 38;
  panel(bx, by, 32, 32);
  if (item) {
    g.drawImage(ICON.shark, bx + 4, by + 9 + Math.round(Math.sin(t * 8)));
    if (Math.floor(t * 4) % 2) text('SPACE', bx - 3, by - 9, 1, '#ffe000');
  }

  // 進度條
  panel(W - 14, 34, 6, 120);
  const top = 36, bot = 152;
  for (const r of racers) {
    if (!r.alive) continue;
    const p = Math.max(0, Math.min(1, -r.y / TRACK));
    g.fillStyle = r === player ? '#ffe000' : '#ff4060';
    const yy = Math.round(bot - p * (bot - top));
    g.fillRect(r === player ? W - 15 : W - 12, r === player ? yy - 1 : yy, r === player ? 4 : 2, r === player ? 3 : 1);
  }

  if (t < 2.4) {
    const k = Math.min(1, t / 0.4);
    const label = 'STAGE 1';
    text(label, Math.round(W / 2 - textW(label, 4) / 2 + (1 - k) * -200), 54, 4, '#ffe000');
  } else if (t < 3.4) {
    const label = 'GO!';
    text(label, Math.round(W / 2 - textW(label, 6) / 2), 80, 6, '#ff3040');
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  sx0 = shake > 0 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  sy0 = shake > 0 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  drawWorld();
  drawActors();
  drawHud();
  if (flash > 0) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, W, H); }
}
requestAnimationFrame(frame);
// 除錯用：快轉幾秒
window.advance = (s) => { for (let i = 0; i < s * 60; i++) update(1 / 60); };
window.dbg = { keys, racers, player, mines };
window.renderNow = () => { sx0 = sy0 = 0; drawWorld(); drawActors(); drawHud(); };
