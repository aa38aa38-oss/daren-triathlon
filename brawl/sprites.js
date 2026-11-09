// 打架版的美術圖：讀取 art/brawl_atlas.png，依角色的動作挑選對應的圖
import atlasUrl from '../art/brawl_atlas.png';
import meta from '../art/brawl_atlas.json';
import { tinted } from '../br/art.js';

export const S = {}; // 名稱 → { c: canvas, ax, ay }（ax, ay 是腳底中央的錨點）
export const ready = new Promise((ok) => {
  const img = new Image();
  img.onload = () => {
    for (const [name, [x, y, w, h, ax, ay]] of Object.entries(meta)) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      S[name] = { c, ax, ay };
    }
    ok(true);
  };
  img.onerror = () => ok(false);
  img.src = atlasUrl;
});

export const CHAR_SCALE = 46 / 72; // 站姿在遊戲裡畫成 46 像素高
const WALK_N = { muscle: 3, ninja: 3, butcher: 3, courier: 5 };

const whiteCache = new Map();
function white(c) {
  let w = whiteCache.get(c);
  if (w) return w;
  w = document.createElement('canvas');
  w.width = c.width; w.height = c.height;
  const x = w.getContext('2d');
  x.drawImage(c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, w.width, w.height);
  whiteCache.set(c, w);
  return w;
}

// 依照狀態挑動作圖
export function frameName(f, time) {
  const t = f.st;
  if (f.skAnim && time - f.skAnim.t0 < f.skAnim.dur) {
    const e = time - f.skAnim.t0;
    return f.skAnim.seq[e < f.skAnim.split ? 0 : 1];
  }
  switch (f.state) {
    case 'idle': return f.weapon ? 'ready' : (Math.floor(time * 2.5 + f.id) % 2 ? 'idle1' : 'idle0');
    case 'walk': return 'walk' + (Math.floor(f.walkPh / 1.6) % WALK_N[f.type]);
    case 'jump': return f.vy > 0 ? 'jump' : 'fall';
    case 'jatk': return 'jkick';
    case 'atk1': return 'jab';
    case 'atk2': return 'cross';
    case 'atk3': return 'kick';
    case 'hurt': return 'hurt';
    case 'stun': return 'dizzy';
    case 'fly': return 'flyback';
    case 'down': return 'lie';
    case 'getup': return 'getup';
    case 'roll': return 'roll';
    case 'thrust': return t < 0.08 ? 'ready' : 'jab';
    case 'wswing': return t < 0.1 ? 'swing' : 'cross';
    case 'throw': return 'throw';
    case 'corpse': return 'corpse';
    default: return 'idle0';
  }
}

// 武器拿在手上的角度（0 = 朝前水平）
function weaponAngle(f) {
  const t = f.st;
  if (f.state === 'wswing') return -1.6 + Math.min(1, t / 0.18) * 2.6;
  if (f.state === 'thrust') return 0;
  if (f.state === 'throw') return -1.8 + Math.min(1, t / 0.14) * 2.4;
  return -0.5;
}

export function drawSprite(g, name, x, y, k = 1, flip = false, alpha = 1, rot = 0) {
  const fr = S[name];
  if (!fr) return false;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (rot) g.rotate(rot);
  if (flip) g.scale(-1, 1);
  g.globalAlpha = alpha;
  g.imageSmoothingEnabled = true;
  g.drawImage(fr.c, -fr.ax * k, -fr.ay * k, fr.c.width * k, fr.c.height * k);
  g.restore();
  g.imageSmoothingEnabled = false;
  return true;
}

// 畫角色（有美術圖就用美術圖，沒有就回傳 false 讓程式畫的版本頂上）
export function drawFighterArt(g, f, sx, sy, time, opts = {}) {
  const nm = frameName(f, time);
  const fr = S[`${f.type}_${nm}`] || S[`${f.type}_idle0`];
  if (!fr) return false;
  let c = fr.c;
  if (f.tint) c = tinted(c, f.tint);
  if (f.flashT > 0) c = white(c);
  const k = CHAR_SCALE, face = f.spinFace || f.face;
  const w = c.width * k, h = c.height * k;
  g.save();
  g.translate(Math.round(sx), Math.round(sy));
  if (f.state === 'roll') g.rotate((f.st / 0.35) * Math.PI * 2 * face);
  if (face < 0) g.scale(-1, 1);
  g.imageSmoothingEnabled = true;
  g.drawImage(c, -fr.ax * k, -fr.ay * k, w, h);
  if (f.weapon && !opts.noWeapon && f.state !== 'roll' && !['fly', 'down', 'getup', 'corpse'].includes(f.state)) {
    const it = S['it_' + f.weapon.kind];
    if (it) {
      g.save();
      g.translate(w * 0.22, -h * 0.5);
      g.rotate(weaponAngle(f));
      const wk = f.weapon.kind === 'coconut' || f.weapon.kind === 'bottle' ? 0.6 : 0.55;
      g.drawImage(it.c, -it.c.width * 0.25 * wk, -it.c.height * 0.5 * wk, it.c.width * wk, it.c.height * wk);
      g.restore();
    }
  }
  g.restore();
  g.imageSmoothingEnabled = false;
  return true;
}
