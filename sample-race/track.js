// 賽道：中心線、加速板、跳台、捷徑，以及「地面」像素資料（Mode 7 用的大地圖）
import { bayer } from './pix.js';

export const RW = 96, HALF = RW / 2, STEP = 2;

// [長度, 總轉角]（正 = 右轉）
const SEG = [
  [700, 0], [420, -0.9], [300, 0], [500, 1.4], [350, 0], [380, -1.0], [400, 0],
  [690, Math.PI], // 大髮夾彎（中間有捷徑跳台）
  [360, 0], [320, -0.7], [280, 0.7], [520, 0], [460, -1.6], [380, 0],
  [300, 0.8], [300, -0.8], [600, 0], [440, 1.2], [700, 0],
];

function buildPoints() {
  const xs = [0], ys = [0], hs = [0], segStart = [];
  let x = 0, y = 0, h = 0, s = 0;
  for (const [len, ang] of SEG) {
    segStart.push({ s, len, ang });
    const n = Math.round(len / STEP), dh = ang / n;
    for (let i = 0; i < n; i++) {
      h += dh;
      x += Math.sin(h) * STEP;
      y -= Math.cos(h) * STEP;
      xs.push(x); ys.push(y); hs.push(h);
      s += STEP;
    }
  }
  return { xs: Float64Array.from(xs), ys: Float64Array.from(ys), hs: Float64Array.from(hs), n: xs.length, len: s, segStart };
}
export const T = buildPoints();
export const START_S = 300;
export const FINISH_S = T.len - 300;

export function pointAt(s) {
  const f = Math.max(0, Math.min(T.n - 1.001, s / STEP));
  const i = Math.floor(f), t = f - i;
  return {
    x: T.xs[i] + (T.xs[i + 1] - T.xs[i]) * t,
    y: T.ys[i] + (T.ys[i + 1] - T.ys[i]) * t,
    h: T.hs[i] + (T.hs[i + 1] - T.hs[i]) * t,
  };
}

// 每一段彎道的彎曲程度（給 AI 判斷與擺放箭頭牌）
export function curveAt(s) {
  for (const seg of T.segStart) if (s >= seg.s && s < seg.s + seg.len) return seg.ang / seg.len;
  return 0;
}

const hp = T.segStart[7];
const p0 = pointAt(hp.s), p1 = pointAt(hp.s + hp.len);
const sdx = p1.x - p0.x, sdy = p1.y - p0.y, slen = Math.hypot(sdx, sdy);
export const SHORT = { s0: hp.s, s1: hp.s + hp.len, p0, p1, dx: sdx / slen, dy: sdy / slen, len: slen };

export const PADS = [
  { s: 900, u: 20 }, { s: 1720, u: -22 }, { s: 2700, u: 0 }, { s: 4300, u: 24 },
  { s: 5300, u: -20 }, { s: 6500, u: 0 }, { s: 7400, u: 22 },
];
export const RAMPS = [{ s: 1250 }, { s: 6150 }];
export const ITEM_ROWS = [620, 1500, 2450, 3550, 4650, 5700, 6800, 7600];

// ---------- 地面像素資料 ----------
const CH = 128;
const CG1 = 0x3fa040, CG1d = 0x2f8434, CG2 = 0x4cb24a, CG2d = 0x3a963e;
const abgr = (hex) => (0xff000000 | ((hex & 0xff) << 16) | (hex & 0xff00) | ((hex >> 16) & 0xff)) >>> 0;
const G1 = abgr(CG1), G1d = abgr(CG1d), G2 = abgr(CG2), G2d = abgr(CG2d);
const FLOWERS = [abgr(0xffe060), abgr(0xff8ab0), abgr(0xffffff)];
export const COL = {
  road: [0x4e4c5c, 0x56546a, 0x46445a, 0x5c5a70].map(abgr),
  line: abgr(0xe8e8f0), yellow: abgr(0xffd000), black: abgr(0x1a1028),
  curbR: abgr(0xe02030), curbW: abgr(0xf4f0f8),
  dirt: [0xa8744a, 0x986640, 0xb8845a].map(abgr), gravel: [0x8a7a6a, 0x7a6a5a, 0x9a8a7a].map(abgr),
  boostA: abgr(0xffb000), boostB: abgr(0xff4a00),
  blood: [0x8a0016, 0xa8102a, 0x6e0010, 0xc01838].map(abgr), skid: abgr(0x24222e),
};
// 地面類型：0 草地（變慢）1 路面 2 路肩紅白 3 加速板 4 跳台 5 捷徑泥土 6 碎石（稍慢）
export const SLOW = [0.5, 1, 1, 1, 1, 1, 0.8];

export const chunkCol = new Map(), chunkTyp = new Map();
export const ckey = (cx, cy) => (cx + 2048) * 4096 + (cy + 2048);

export function grass(px, py) {
  const n = (Math.imul(px >> 1, 73856093) ^ Math.imul(py >> 1, 19349663)) >>> 24;
  if (n < 2) return FLOWERS[(px + py) & 1 ? 0 : n];
  const chk = ((px >> 5) + (py >> 5)) & 1;
  return chk ? (n < 70 ? G1d : G1) : (n < 70 ? G2d : G2);
}

let lk = -1, lc = null, lt = null;
function chunkFor(px, py) {
  const cx = px >> 7, cy = py >> 7, k = ckey(cx, cy);
  if (k === lk) return;
  lk = k;
  lc = chunkCol.get(k);
  lt = chunkTyp.get(k);
  if (!lc) {
    lc = new Uint32Array(CH * CH);
    lt = new Uint8Array(CH * CH);
    const bx = cx << 7, by = cy << 7;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) lc[(y << 7) | x] = grass(bx + x, by + y);
    chunkCol.set(k, lc);
    chunkTyp.set(k, lt);
  }
}
export function setPix(px, py, col, typ = -1) {
  chunkFor(px, py);
  const i = ((py & 127) << 7) | (px & 127);
  lc[i] = col;
  if (typ >= 0) lt[i] = typ;
}
export function typeAt(x, y) {
  const px = Math.floor(x), py = Math.floor(y);
  const t = chunkTyp.get(ckey(px >> 7, py >> 7));
  return t ? t[((py & 127) << 7) | (px & 127)] : 0;
}

// 在地上畫一灘血（點陣抖動，越外圈越稀）
export function paintSplat(x, y, r, dens = 1) {
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const px = Math.floor(x) + dx, py = Math.floor(y) + dy;
    const d = Math.hypot(dx, dy) / r;
    const wob = 1 + 0.18 * Math.sin(Math.atan2(dy, dx) * 5 + r * 3);
    if (d > wob) continue;
    if (bayer(px, py) >= (d < 0.6 * wob ? dens : dens * 0.55)) continue;
    setPix(px, py, COL.blood[(px * 7 + py * 3) & 3]);
  }
}
export function paintSkid(x, y) {
  const px = Math.floor(x), py = Math.floor(y);
  const t = typeAt(px, py);
  if (t === 1 || t === 3) { setPix(px, py, COL.skid); setPix(px + 1, py, COL.skid); }
}

const noise = (px, py) => (Math.imul(px, 374761393) ^ Math.imul(py, 668265263)) >>> 28;

export function buildGround() {
  // 捷徑（先畫，主路面會蓋過接口）
  const S = SHORT;
  for (let t = 0; t <= S.len; t += 0.5) {
    const cx = S.p0.x + S.dx * t, cy = S.p0.y + S.dy * t;
    const ramp = Math.abs(t - S.len / 2) < 9;
    for (let u = -17; u <= 17; u += 0.5) {
      const px = Math.floor(cx - S.dy * u), py = Math.floor(cy + S.dx * u);
      const au = Math.abs(u);
      if (ramp && au < 14) setPix(px, py, Math.floor((t + u) / 4) & 1 ? COL.yellow : COL.black, 4);
      else setPix(px, py, au < 14 ? COL.dirt[noise(px, py) % 3] : COL.gravel[noise(px, py) % 3], 5);
    }
  }
  for (let i = 0; i < T.n - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const f = k / 4;
      const x = T.xs[i] + (T.xs[i + 1] - T.xs[i]) * f;
      const y = T.ys[i] + (T.ys[i + 1] - T.ys[i]) * f;
      const h = T.hs[i] + (T.hs[i + 1] - T.hs[i]) * f;
      const s = (i + f) * STEP;
      const rx = Math.cos(h), ry = Math.sin(h);
      const pad = PADS.find((p) => s >= p.s && s < p.s + 40);
      const ramp = RAMPS.find((r) => s >= r.s && s < r.s + 18);
      const line = (s >= START_S && s < START_S + 6) || (s >= FINISH_S && s < FINISH_S + 8);
      for (let u = -HALF - 18; u <= HALF + 18; u += 0.5) {
        const px = Math.floor(x + rx * u), py = Math.floor(y + ry * u);
        const au = Math.abs(u);
        let col, typ;
        if (au < HALF) {
          typ = 1;
          col = COL.road[noise(px, py) & 3];
          if (au > HALF - 3.5 && au < HALF - 2) col = COL.line;
          if (au < 1.2 && s % 48 < 24) col = COL.line;
          if (line) col = (Math.floor(s / 3) + Math.floor((u + 100) / 3)) & 1 ? COL.line : COL.black;
          if (pad && Math.abs(u - pad.u) < 11) {
            typ = 3;
            col = ((s - pad.s) + Math.abs(u - pad.u) * 1.3) % 12 < 6 ? COL.boostA : COL.boostB;
          }
          if (ramp) { typ = 4; col = Math.floor((s + u) / 4) & 1 ? COL.yellow : COL.black; }
        } else if (au < HALF + 6) {
          typ = 2;
          col = Math.floor(s / 10) & 1 ? COL.curbR : COL.curbW;
        } else {
          typ = 6;
          col = COL.gravel[noise(px, py) % 3];
        }
        setPix(px, py, col, typ);
      }
    }
  }
}

// 路邊擺設：樹、岩石、箭頭牌、觀眾、看板、拱門
export function buildScenery() {
  const list = [];
  const rand = (a, b) => ((Math.imul(a, 2654435761) ^ Math.imul(b, 40503)) >>> 0) / 4294967296;
  const nearShort = (x, y) => {
    const px = x - SHORT.p0.x, py = y - SHORT.p0.y;
    const t = px * SHORT.dx + py * SHORT.dy, lat = -px * SHORT.dy + py * SHORT.dx;
    return t > -30 && t < SHORT.len + 30 && Math.abs(lat) < 34;
  };
  for (let s = 0; s < T.len; s += 22) {
    const p = pointAt(s), rx = Math.cos(p.h), ry = Math.sin(p.h);
    const curve = curveAt(s);
    for (const side of [-1, 1]) {
      const r = rand(s, side + 3);
      if (Math.abs(curve) > 0.0015 && Math.sign(curve) === -side && s % 44 === 0) {
        const u = side * (HALF + 14);
        list.push({ kind: curve > 0 ? 'chevR' : 'chevL', x: p.x + rx * u, y: p.y + ry * u, solid: false });
        continue;
      }
      const near = (s > START_S - 200 && s < START_S + 260) || (s > FINISH_S - 200 && s < FINISH_S + 200);
      if (near && r < 0.7) {
        const u = side * (HALF + 26 + rand(s, 9) * 10);
        list.push({ kind: 'crowd', x: p.x + rx * u, y: p.y + ry * u, solid: false });
        continue;
      }
      if (r < 0.55) {
        const u = side * (HALF + 30 + rand(s, side + 7) * 120);
        const x = p.x + rx * u, y = p.y + ry * u;
        if (nearShort(x, y)) continue;
        const k = rand(s, side + 11);
        list.push({ kind: k < 0.55 ? 'tree' : k < 0.85 ? 'pine' : 'rock', x, y, solid: true });
      }
    }
  }
  for (const r of RAMPS) {
    const p = pointAt(r.s - 60);
    list.push({ kind: 'jump', x: p.x + Math.cos(p.h) * (HALF + 12), y: p.y + Math.sin(p.h) * (HALF + 12), solid: false });
  }
  {
    const p = pointAt(SHORT.s0 - 80);
    list.push({ kind: 'short', x: p.x + Math.cos(p.h) * (HALF + 14), y: p.y + Math.sin(p.h) * (HALF + 14), solid: false });
  }
  const a = pointAt(START_S + 3), b = pointAt(FINISH_S + 4);
  list.push({ kind: 'archStart', x: a.x, y: a.y, solid: false });
  list.push({ kind: 'archGoal', x: b.x, y: b.y, solid: false });
  return list;
}
