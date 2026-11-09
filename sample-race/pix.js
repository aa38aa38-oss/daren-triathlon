// 像素畫工具：顏色、描邊、像素字型
export const OUT = '#1a1028';

export const hsl = (h, s, l) =>
  `hsl(${(((h % 1) + 1) % 1) * 360},${Math.round(Math.min(1, s) * 100)}%,${Math.round(Math.max(0, Math.min(1, l)) * 100)}%)`;
const toward = (h, t, a) => { let d = t - h; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return h + d * a; };
// 16-bit 風格的四階色：暗部偏紫、亮部偏黃
export const ramp = (h, s, l) => [
  hsl(toward(h, 0.72, 0.15), s, l - 0.24), hsl(h, s, l),
  hsl(toward(h, 0.14, 0.1), s, l + 0.13), hsl(toward(h, 0.14, 0.2), s * 0.5, l + 0.3),
];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
export const hash = (x, y) => ((Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0) / 4294967296;

export class Pix {
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
  text(str, x, y, c, s = 1) {
    str = String(str).toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const gl = FONT[str[i]] || FONT[' '];
      for (let j = 0; j < 15; j++) if (gl[j] === '1') this.rect(x + (i * 4 + (j % 3)) * s, y + Math.floor(j / 3) * s, s, s, c);
    }
  }
  outline(c = OUT) {
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

// 3x5 像素字型
export const FONT = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
  ':': '000010000010000', '/': '001001010100100', x: '000101010101000', ' ': '000000000000000', '!': '010010010000010',
  '.': '000000000000010', '-': '000000111000000', '+': '000010111010000',
  A: '010101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '111100101101111', H: '101101111101101', I: '111010010010111', J: '001001001101111',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '101111111111101', O: '111101101101111',
  P: '110101110100100', R: '110101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111',
  W: '101101111111101', Y: '101101010010010',
};

export function drawText(g, str, x, y, s = 1, col = '#fff', shadow = OUT) {
  str = String(str).toUpperCase();
  x = Math.round(x); y = Math.round(y);
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
export const textW = (str, s = 1) => String(str).length * 4 * s - s;
