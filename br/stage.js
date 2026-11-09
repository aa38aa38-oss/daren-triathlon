// 關卡地面：三條賽道（血海水道、死亡公路、殭屍城市）和最終的圓形血池競技場
// 地面是一大張像素圖，分成 128x128 的小塊存放，Mode 7 畫面直接從這裡取色
import { bayer } from '../sample-race/pix.js';

export const STEP = 2, RW = 96, HALF = RW / 2;
export const chunkCol = new Map(), chunkTyp = new Map();
export const ckey = (cx, cy) => (cx + 2048) * 4096 + (cy + 2048);
const abgr = (hex) => (0xff000000 | ((hex & 0xff) << 16) | (hex & 0xff00) | ((hex >> 16) & 0xff)) >>> 0;
const A = (list) => list.map(abgr);

// 地面類型：0 場外（競技場是血池）1 可走的地面 2 邊界
const THEMES = {
  swim: {
    road: A([0x2f7fd8, 0x3a8ee6, 0x2368c4, 0x5cb4f2]), line: abgr(0x9ad8ff),
    curbA: abgr(0xe02030), curbB: abgr(0xf4f0f8), shoulder: A([0xe8c890, 0xd8b070, 0xf0d8a0]),
    out: A([0xf2cf86, 0xe5bd72, 0xfbe3a8, 0xd4a65a]),
  },
  bike: {
    road: A([0x4e4c5c, 0x56546a, 0x46445a, 0x5c5a70]), line: abgr(0xe8e8f0),
    curbA: abgr(0xe02030), curbB: abgr(0xf4f0f8), shoulder: A([0x8a7a6a, 0x7a6a5a, 0x9a8a7a]),
    out: A([0x3fa040, 0x2f8434, 0x4cb24a, 0x3a963e]),
  },
  run: {
    road: A([0x34323e, 0x3a3844, 0x2e2c38, 0x403e4a]), line: abgr(0xd8c040),
    curbA: abgr(0x9a9aa6), curbB: abgr(0x7a7a86), shoulder: A([0x8a8a96, 0x7e7e8a, 0x96969f]),
    out: A([0x3a3640, 0x423e48, 0x34303a, 0x2a2630]),
  },
  arena: {
    road: A([0x7a7068, 0x6a6058, 0x8a8078, 0x5a5048]), line: abgr(0x4a3a30),
    curbA: abgr(0xb0a080), curbB: abgr(0x8a7a60), shoulder: A([0x6a5a48]),
    out: A([0x7a0010, 0x6a000c, 0x8a0818, 0x5a0008]),
  },
};
export const BLOOD = A([0x8a0016, 0xa8102a, 0x6e0010, 0xc01838]);
const SKID = abgr(0x24222e);

export let theme = 'bike';
let TH = THEMES.bike;
export let T = null; // 賽道中心線
export let trackLen = 0;

function outside(px, py) {
  const n = (Math.imul(px >> 1, 73856093) ^ Math.imul(py >> 1, 19349663)) >>> 24;
  const o = TH.out;
  if (theme === 'bike') {
    const chk = ((px >> 5) + (py >> 5)) & 1;
    return chk ? (n < 70 ? o[1] : o[0]) : (n < 70 ? o[3] : o[2]);
  }
  if (theme === 'run') {
    if ((px & 31) === 0 || (py & 31) === 0) return o[3];
    return n < 60 ? o[1] : n < 120 ? o[2] : o[0];
  }
  if (theme === 'arena') {
    const w = Math.sin(px * 0.08 + py * 0.05) + Math.sin(py * 0.09 - px * 0.03);
    return w > 1.4 ? o[2] : w < -1.4 ? o[3] : n < 40 ? o[1] : o[0];
  }
  return n < 30 ? o[3] : n < 60 ? o[1] : n > 245 ? o[2] : o[0];
}
export const outsideColor = (px, py) => outside(px, py);

let lk = -1, lc = null, lt = null;
function chunkFor(px, py) {
  const cx = px >> 7, cy = py >> 7, k = ckey(cx, cy);
  if (k === lk) return;
  lk = k;
  lc = chunkCol.get(k);
  lt = chunkTyp.get(k);
  if (!lc) {
    lc = new Uint32Array(16384);
    lt = new Uint8Array(16384);
    const bx = cx << 7, by = cy << 7;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) lc[(y << 7) | x] = outside(bx + x, by + y);
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
export function paintSplat(x, y, r, dens = 1) {
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const px = Math.floor(x) + dx, py = Math.floor(y) + dy;
    const d = Math.hypot(dx, dy) / r;
    const wob = 1 + 0.18 * Math.sin(Math.atan2(dy, dx) * 5 + r * 3);
    if (d > wob) continue;
    if (bayer(px, py) >= (d < 0.6 * wob ? dens : dens * 0.55)) continue;
    setPix(px, py, BLOOD[(px * 7 + py * 3) & 3]);
  }
}
export function paintSkid(x, y) { setPix(Math.floor(x), Math.floor(y), SKID); }

const noise = (px, py) => (Math.imul(px, 374761393) ^ Math.imul(py, 668265263)) >>> 28;

// 產生一條左右擺動、不會自己交叉的賽道
function buildPoints(len, seed) {
  const segs = [];
  let total = 0, sign = 1, k = 0;
  segs.push([400, 0]);
  total += 400;
  while (total < len) {
    const r = ((Math.imul(k + seed, 2654435761) >>> 0) % 1000) / 1000;
    const L = 260 + r * 260, ang = (0.5 + r * 0.7) * sign;
    segs.push([L, ang], [220 + r * 200, 0], [L, -ang]);
    total += L * 2 + 220 + r * 200;
    sign = -sign;
    k++;
  }
  segs.push([600, 0]);
  const xs = [0], ys = [0], hs = [0];
  let x = 0, y = 0, h = 0;
  for (const [L, ang] of segs) {
    const n = Math.round(L / STEP), dh = ang / n;
    for (let i = 0; i < n; i++) {
      h += dh; x += Math.sin(h) * STEP; y -= Math.cos(h) * STEP;
      xs.push(x); ys.push(y); hs.push(h);
    }
  }
  return { xs: Float64Array.from(xs), ys: Float64Array.from(ys), hs: Float64Array.from(hs), n: xs.length, len: (xs.length - 1) * STEP };
}

export function pointAt(s) {
  const f = Math.max(0, Math.min(T.n - 1.001, s / STEP));
  const i = Math.floor(f), t = f - i;
  return {
    x: T.xs[i] + (T.xs[i + 1] - T.xs[i]) * t,
    y: T.ys[i] + (T.ys[i + 1] - T.ys[i]) * t,
    h: T.hs[i] + (T.hs[i + 1] - T.hs[i]) * t,
  };
}
// 賽道座標 (s 前後, u 左右) 轉成世界座標
export function toWorld(s, u) {
  const p = pointAt(s);
  return { x: p.x + Math.cos(p.h) * u, y: p.y + Math.sin(p.h) * u, h: p.h };
}

function clearGround() {
  chunkCol.clear();
  chunkTyp.clear();
  lk = -1;
}

export function loadTrack(th, len, seed) {
  theme = th;
  TH = THEMES[th];
  clearGround();
  T = buildPoints(len, seed);
  trackLen = T.len;
  for (let i = 0; i < T.n - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const f = k / 4;
      const x = T.xs[i] + (T.xs[i + 1] - T.xs[i]) * f;
      const y = T.ys[i] + (T.ys[i + 1] - T.ys[i]) * f;
      const h = T.hs[i] + (T.hs[i + 1] - T.hs[i]) * f;
      const s = (i + f) * STEP;
      const rx = Math.cos(h), ry = Math.sin(h);
      for (let u = -HALF - 16; u <= HALF + 16; u += 0.5) {
        const px = Math.floor(x + rx * u), py = Math.floor(y + ry * u);
        const au = Math.abs(u);
        let col, typ;
        if (au < HALF) {
          typ = 1;
          col = TH.road[noise(px, py) & 3];
          if (th === 'swim') {
            const w = Math.sin(s * 0.09 + u * 0.15) + Math.sin(s * 0.05 - u * 0.21);
            col = w > 1.3 ? TH.road[3] : w < -1.2 ? TH.road[2] : (noise(px, py) & 1 ? TH.road[0] : TH.road[1]);
            if (au > HALF / 2 - 0.6 && au < HALF / 2 + 0.6 && s % 16 < 8) col = TH.line;
          } else {
            if (au > HALF - 3.5 && au < HALF - 2) col = TH.line;
            if (au < 1.2 && s % 48 < 24) col = TH.line;
          }
        } else if (au < HALF + 6) {
          typ = 2;
          col = th === 'swim' ? ((Math.floor(s / 6) & 1) ? TH.curbA : TH.curbB) : (Math.floor(s / 10) & 1 ? TH.curbA : TH.curbB);
        } else {
          typ = 2;
          col = TH.shoulder[noise(px, py) % TH.shoulder.length];
        }
        setPix(px, py, col, typ);
      }
    }
  }
}

// 最終競技場：圓形石地板，外面是血池
export let arenaR = 0;
export function loadArena(R) {
  theme = 'arena';
  TH = THEMES.arena;
  clearGround();
  T = null;
  arenaR = R;
  const M = R + 40;
  for (let py = -M; py <= M; py++) for (let px = -M; px <= M; px++) {
    const d = Math.hypot(px, py);
    if (d > R) { setPix(px, py, outside(px, py), 0); continue; }
    const ring = Math.floor(d / 24), ang = Math.floor(((Math.atan2(py, px) + Math.PI) / (Math.PI * 2)) * (8 + ring * 6));
    const edge = d % 24 < 1.2;
    let col = TH.road[((ring + ang) & 1) * 2 + (noise(px, py) & 1)];
    if (edge) col = TH.line;
    if (d > R - 5) col = (Math.floor(Math.atan2(py, px) * 20) & 1) ? TH.curbA : TH.curbB;
    setPix(px, py, col, 1);
  }
}
// 競技場縮小：把外圈改成血池
export function shrinkArena(rNew) {
  const rOld = arenaR;
  if (rNew >= rOld) return;
  const M = Math.ceil(rOld) + 1;
  for (let py = -M; py <= M; py++) for (let px = -M; px <= M; px++) {
    const d = Math.hypot(px, py);
    if (d > rOld + 1 || d <= rNew) continue;
    setPix(px, py, outside(px, py), 0);
  }
  for (let a = 0; a < Math.PI * 2; a += 0.6 / Math.max(10, rNew)) {
    for (let k = 0; k < 4; k++) {
      const d = rNew - k;
      setPix(Math.floor(Math.cos(a) * d), Math.floor(Math.sin(a) * d), (Math.floor(a * 20) & 1) ? TH.curbA : 0xff2a10e0 >>> 0, 1);
    }
  }
  arenaR = rNew;
}

// 路邊擺設
export function buildScenery(th) {
  const list = [];
  const rand = (a, b) => ((Math.imul(a, 2654435761) ^ Math.imul(b, 40503)) >>> 0) / 4294967296;
  if (th === 'arena') {
    for (let a = 0; a < Math.PI * 2; a += 0.09) {
      const r = arenaR + 46 + rand(Math.floor(a * 100), 1) * 20;
      list.push({ kind: rand(Math.floor(a * 100), 2) < 0.75 ? 'crowd' : 'torch', x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    return list;
  }
  const kinds = {
    swim: [['palm', 0.45], ['umbrella', 0.25], ['crowd', 0.2], ['tower', 0.1]],
    bike: [['tree', 0.5], ['pine', 0.3], ['rock', 0.1], ['crowd', 0.1]],
    run: [['building', 0.7], ['lamp', 0.15], ['crowd', 0.15]],
  }[th];
  for (let s = 0; s < trackLen; s += th === 'run' ? 34 : 24) {
    const p = pointAt(s), rx = Math.cos(p.h), ry = Math.sin(p.h);
    for (const side of [-1, 1]) {
      const r = rand(s, side + 3);
      if (r > (th === 'run' ? 0.85 : 0.6)) continue;
      let k = rand(s, side + 11), kind = kinds[0][0];
      for (const [name, w] of kinds) { if (k < w) { kind = name; break; } k -= w; }
      const near = kind === 'crowd' || kind === 'lamp';
      const off = near ? HALF + 22 + rand(s, 9) * 8 : HALF + 34 + rand(s, side + 7) * (th === 'run' ? 30 : 110);
      list.push({ kind, x: p.x + rx * off * side, y: p.y + ry * off * side, s, side });
    }
  }
  return list;
}
