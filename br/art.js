// 讀取美術圖集（tools/build_art.py 產生的 art/atlas.png + atlas.json），切成一張張圖給遊戲用
import atlasUrl from '../art/atlas.png';
import atlasMap from '../art/atlas.json';
import panoSwim from '../art/pano_swim.png';
import panoBike from '../art/pano_bike.png';
import panoRun from '../art/pano_run.png';
import panoArena from '../art/pano_arena.png';
import logoUrl from '../art/logo.png';

const loadImg = (url) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export const A = {};       // 名稱 → canvas
export const PANO = {};    // 關卡 → 遠景
export let LOGO = null;

export const ready = (async () => {
  const [atlas, ps, pb, pr, pa, logo] = await Promise.all([atlasUrl, panoSwim, panoBike, panoRun, panoArena, logoUrl].map(loadImg));
  for (const [name, [x, y, w, h]] of Object.entries(atlasMap)) {
    const c = canvasOf(w, h);
    c.getContext('2d').drawImage(atlas, x, y, w, h, 0, 0, w, h);
    A[name] = c;
  }
  Object.assign(PANO, { swim: ps, bike: pb, run: pr, arena: pa });
  LOGO = logo;
  for (const t of ['ninja', 'butcher', 'courier', 'muscle']) A[`${t}_swimCrop`] = makeSwimCrop(A[`${t}_run0`]);
})();

// 其他三個角色還沒有「背影游泳」的圖：先用跑步背影的上半身，下面加水花
function makeSwimCrop(run) {
  const h = Math.round(run.height * 0.5);
  const c = canvasOf(run.width, h + 8);
  const x = c.getContext('2d');
  x.drawImage(run, 0, 0, run.width, h, 0, 0, run.width, h);
  // 水面：一條白藍色浪花
  const cy = h + 1;
  for (let i = 0; i < run.width; i++) {
    const y = cy + Math.round(Math.sin(i * 0.5) * 1.5);
    x.fillStyle = i % 3 ? '#e8fbff' : '#9ad8ff';
    x.fillRect(i, y - 2, 1, 3);
    x.fillStyle = 'rgba(40,120,210,0.85)';
    x.fillRect(i, y + 1, 1, 6);
  }
  return c;
}

// 電腦選手換衣服顏色：把彩度高、不是膚色的像素轉色相
const tintCache = new Map();
export function tinted(img, variant) {
  if (!variant || !img) return img;
  const key = img;
  let m = tintCache.get(key);
  if (!m) { m = []; tintCache.set(key, m); }
  if (m[variant]) return m[variant];
  const c = canvasOf(img.width, img.height);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  const shift = [0, 0.17, 0.33, 0.5, 0.62, 0.78][variant % 6];
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, dd = mx - mn;
    if (dd < 0.18) continue;
    const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    let h = mx === r ? (gg - b) / dd + (gg < b ? 6 : 0) : mx === gg ? (b - r) / dd + 2 : (r - gg) / dd + 4;
    h /= 6;
    if (s < 0.3) continue;
    if (h > 0.03 && h < 0.13 && l > 0.45) continue; // 膚色不動
    h = (h + shift) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    p[i] = f(h + 1 / 3) * 255; p[i + 1] = f(h) * 255; p[i + 2] = f(h - 1 / 3) * 255;
  }
  x.putImageData(d, 0, 0);
  m[variant] = c;
  return c;
}

// 角色在某一關的動作圖
// 回傳 { frames: [...], flip: 是否用左右翻轉來做第二格動作, leanImg, swimArms: 是否要另外畫划水的手臂 }
export function charFrames(type, theme) {
  const M = type === 'muscle';
  if (theme === 'bike') {
    return M ? { frames: [A.muscle_bike0_hd, A.muscle_bike1], leanImg: A.muscle_bikeL }
      : { frames: [A[`${type}_bike0`]], flip: true };
  }
  if (theme === 'swim') {
    return M ? { frames: [A.muscle_swim0, A.muscle_swim1], splashImg: A.muscle_swim2 }
      : { frames: [A[`${type}_swimCrop`]], swimArms: true };
  }
  return M ? { frames: [A.muscle_run0, A.muscle_run1], leanImg: A.muscle_runL }
    : { frames: [A[`${type}_run0`]], flip: true };
}

export function corpseOf(type, theme) {
  if (theme === 'bike') return A[`${type}_corpse`];
  if (type === 'muscle') return A.muscle_corpse2;
  return null; // 交給程式產生的屍體
}

export const SKILL_ART = {
  headbutt: 'sk_headbutt', dumbbell: 'sk_dumbbell', charge: 'sk_bull', blink: 'sk_dashslash', shuriken: 'sk_shuriken', smoke: 'sk_smoke',
  cleaver: 'sk_cleaver', hook: 'sk_hook', spin: 'sk_spin', box: 'sk_box', soup: 'sk_soup', nitro: 'sk_nitro',
};
export const icon = (id) => A['icon_' + id];
export const skillIcon = (id) => A['icon_' + SKILL_ART[id]];
