// 程式畫的簡易角色（側面）：用「骨架＋姿勢」即時畫出來
// 之後有了美術圖，只要換掉 drawFighter 就好
import { OUT } from '../sample-race/pix.js';

export const LOOK = {
  muscle: { skin: '#f2b88c', skinD: '#c47e5a', top: '#d42638', topD: '#8e1424', pants: '#2c58b0', pantsD: '#1a3474', shoe: '#2a2030', limb: 4.6, body: 10.5, bare: true },
  ninja: { skin: '#f0c8a0', skinD: '#b88a68', top: '#3c2c60', topD: '#22183c', pants: '#2e2448', pantsD: '#1a142c', shoe: '#141020', limb: 3.2, body: 7.5, hood: '#2a2048', scarf: '#e82838' },
  butcher: { skin: '#eab08a', skinD: '#b47a5a', top: '#8cb4dc', topD: '#5a82ac', pants: '#6c4222', pantsD: '#442810', shoe: '#2a1a10', limb: 3.9, body: 10, hair: '#5a3016', apron: '#f4f0f2' },
  courier: { skin: '#f0c098', skinD: '#b88864', top: '#2ea446', topD: '#18702c', pants: '#3a4a70', pantsD: '#24304c', shoe: '#20202a', limb: 3.2, body: 7.5, helmet: '#ffd000', helmetD: '#c09000', box: '#f08a20', boxD: '#b05a10' },
};

// 電腦選手換衣服顏色
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
const hsl = (h, s, l) => `hsl(${(((h % 1) + 1) % 1) * 360},${Math.round(s * 100)}%,${Math.round(l * 100)}%)`;
export function tintLook(type, variant) {
  const L = { ...LOOK[type] };
  if (!variant) return L;
  const shift = [0, 0.17, 0.33, 0.5, 0.62, 0.8][variant % 6];
  for (const k of ['top', 'topD', 'pants', 'pantsD', 'scarf', 'box', 'boxD', 'hood']) {
    if (!L[k]) continue;
    const [h, s, l] = hexToHsl(L[k]);
    L[k] = s < 0.15 ? L[k] : hsl(h + shift, s, l);
  }
  return L;
}

// ---------- 像素小工具（不會模糊的圓點與粗線） ----------
export function dot(g, x, y, r, col) {
  g.fillStyle = col;
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    const w = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (w < 0.4) continue;
    g.fillRect(Math.round(x - w), Math.round(y + dy), Math.max(1, Math.round(w * 2)), 1);
  }
}
export function seg(g, x0, y0, x1, y1, w, col) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.2));
  for (let i = 0; i <= n; i++) dot(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w / 2, col);
}

// ---------- 姿勢 ----------
// 角度：0 = 往下垂，正值 = 往面向的那一邊抬
// fu/ff 前手上臂/前臂、bu/bf 後手、ft/fs 前腿大腿/膝蓋彎曲、bt/bs 後腿
const P = (o) => ({ lean: 0, bob: 0, fu: 0.3, ff: 0.9, bu: 0.1, bf: 0.8, ft: 0.15, fs: 0.1, bt: -0.15, bs: 0.1, head: 0, rot: 0, ...o });
const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : 1 - (1 - t) * (1 - t));
const LIE = (f) => -f.face * Math.PI / 2;

export function poseFor(f, time) {
  const t = f.st;
  switch (f.state) {
    case 'idle':
      return P({ bob: Math.sin(time * 4 + f.id) * 0.6, fu: 0.75, ff: 1.5, bu: 0.45, bf: 1.35, ft: 0.25, bt: -0.25 });
    case 'walk': {
      const p = f.walkPh, s = Math.sin(p);
      return P({ ft: s * 0.75, fs: Math.max(0, -Math.cos(p)) * 1.0, bt: -s * 0.75, bs: Math.max(0, Math.cos(p)) * 1.0,
        fu: -s * 0.7 + 0.25, ff: 1.1, bu: s * 0.7 + 0.25, bf: 1.1, bob: -Math.abs(Math.cos(p)) * 1.3, lean: 0.12 });
    }
    case 'atk1': { const k = ease(t / 0.07); return P({ fu: 0.8 + k * 0.85, ff: 1.5 - k * 1.5, bu: 0.45, bf: 1.4, lean: 0.12 + k * 0.1, ft: 0.35, bt: -0.35 }); }
    case 'atk2': { const k = ease(t / 0.08); return P({ bu: 0.45 + k * 1.2, bf: 1.4 - k * 1.4, fu: 0.3, ff: 1.3, lean: 0.25 * k + 0.1, ft: 0.4, bt: -0.4 }); }
    case 'atk3': { const k = ease((t - 0.04) / 0.1); return P({ ft: 0.3 + k * 1.35, fs: 0.7 * (1 - k), bt: -0.15, lean: -0.3 * k, fu: -0.5, ff: 1.0, bu: 0.9, bf: 1.0 }); }
    case 'jump': return P({ ft: 0.9, fs: 1.7, bt: 0.4, bs: 1.5, fu: -2.3, ff: 0.3, bu: -1.9, bf: 0.3 });
    case 'jatk': return P({ ft: 1.25, fs: 0.05, bt: -0.3, bs: 1.7, fu: -0.9, ff: 0.5, bu: 1.2, bf: 0.6, lean: -0.25 });
    case 'hurt': return P({ lean: -0.45, fu: -0.9, ff: 0.6, bu: -1.3, bf: 0.4, ft: -0.25, bt: 0.25, head: -0.35 });
    case 'stun': return P({ lean: Math.sin(time * 6) * 0.15, fu: 0.2, ff: 0.3, bu: 0.1, bf: 0.3, head: Math.sin(time * 8) * 0.3 });
    case 'fly': return P({ rot: LIE(f) * ease(t / 0.35), fu: -2.4, ff: 0.2, bu: -2.0, bf: 0.2, ft: 0.6, fs: 0.6, bt: -0.2, bs: 0.6, head: -0.4 });
    case 'down': return P({ rot: LIE(f), fu: -2.6, ff: 0.1, bu: -2.2, bf: 0.3, ft: 0.2, fs: 0.3, bt: -0.1, bs: 0.2 });
    case 'getup': return P({ rot: LIE(f) * (1 - ease(t / 0.4)), fu: 0.6, ff: 0.8, bu: 0.5, bf: 0.8, ft: 0.8, fs: 1.2 * (1 - t / 0.4) });
    case 'roll': return P({ rot: (t / 0.35) * Math.PI * 2 * f.face, ft: 0.9, fs: 1.7, bt: 0.5, bs: 1.6, fu: 1.4, ff: 1.2, bu: 1.2, bf: 1.2, bob: 5 });
    case 'dash': {
      const s = Math.sin(t * 28);
      return P({ lean: f.dashLean || 0.6, fu: -1.1, ff: 0.5, bu: -1.4, bf: 0.4, ft: s * 0.9, bt: -s * 0.9, fs: 0.7, bs: 0.7, head: 0.2 });
    }
    case 'spin': return P({ fu: 1.6, ff: 0.1, bu: 1.6, bf: 0.1, ft: 0.3, bt: -0.3, lean: 0.1 });
    case 'throw': { const k = ease(t / 0.14); return P({ fu: -2.6 + k * 3.8, ff: 0.2, bu: 0.6, bf: 1.0, lean: -0.2 + k * 0.35, ft: 0.4, bt: -0.4 }); }
    case 'chop': case 'wswing': { const k = ease((t - 0.05) / 0.1); return P({ fu: -2.7 + k * 3.9, ff: 0.15, bu: 0.5, bf: 1.0, lean: -0.15 + k * 0.4, ft: 0.45, bt: -0.45 }); }
    case 'thrust': { const k = ease(t / 0.08); return P({ fu: 0.6 + k * 1.0, ff: 0.9 - k * 0.9, bu: 0.8 + k * 0.6, bf: 0.8 - k * 0.6, lean: 0.25 * k, ft: 0.4, bt: -0.4 }); }
    case 'stomp': return f.y > 1
      ? P({ ft: 1.0, fs: 1.6, bt: 0.5, bs: 1.4, fu: -2.4, ff: 0.2, bu: -2.2, bf: 0.2 })
      : P({ ft: 0.7, fs: 1.3, bt: -0.6, bs: 1.1, fu: 0.4, ff: 0.2, bu: 0.3, bf: 0.2, bob: 3, lean: 0.3 });
    case 'cast': return P({ fu: 1.5, ff: 0.2, bu: 1.2, bf: 0.4, lean: 0.15, ft: 0.4, bt: -0.4 });
    case 'frozen': return P({ fu: 0.75, ff: 1.5, bu: 0.45, bf: 1.35, ft: 0.25, bt: -0.25 });
    case 'corpse': return P({ rot: LIE(f), fu: -2.8, ff: 0.6, bu: -2.0, bf: 0.9, ft: 0.4, fs: 0.8, bt: -0.3, bs: 0.3 });
    default: return P({});
  }
}

// 畫一個角色。sx/sy 是腳底在螢幕上的位置
export function drawFighter(g, f, sx, sy, time, opts = {}) {
  const L = f.look, face = f.spinFace || f.face, pose = poseFor(f, time);
  const flash = f.flashT > 0;
  const C = (c) => (flash ? '#ffffff' : c);
  g.save();
  g.translate(Math.round(sx), Math.round(sy - (pose.rot ? 3 : 0)));
  if (pose.rot) g.rotate(pose.rot);
  const hipY = -13 + pose.bob;
  const hip = [0, hipY];
  const neck = [Math.sin(pose.lean) * 11 * face, hipY - Math.cos(pose.lean) * 11];
  const ha = pose.lean + pose.head;
  const head = [neck[0] + Math.sin(ha) * 5 * face, neck[1] - Math.cos(ha) * 5];
  const sh = [neck[0] * 0.9, neck[1] + 1.6];
  const limb = (j, a1, a2, l1, l2) => {
    const e = [j[0] + Math.sin(a1) * l1 * face, j[1] + Math.cos(a1) * l1];
    const h = [e[0] + Math.sin(a1 + a2) * l2 * face, e[1] + Math.cos(a1 + a2) * l2];
    return [e, h];
  };
  const [bk, bfoot] = limb(hip, pose.bt, -pose.bs, 7, 7);
  const [fk, ffoot] = limb(hip, pose.ft, -pose.fs, 7, 7);
  const [be, bh] = limb(sh, pose.bu, pose.bf, 6, 6);
  const [fe, fh] = limb(sh, pose.fu, pose.ff, 6, 6);
  const w = L.limb;
  const two = (a, b, ww, col) => { seg(g, a[0], a[1], b[0], b[1], ww + 2, OUT); seg(g, a[0], a[1], b[0], b[1], ww, C(col)); };

  // 背後的配件
  if (L.box) { // 外送箱
    const bx = neck[0] - face * 5.5, by = neck[1] + 2;
    g.fillStyle = OUT; g.fillRect(Math.round(bx - 5), Math.round(by - 2), 11, 11);
    g.fillStyle = C(L.box); g.fillRect(Math.round(bx - 4), Math.round(by - 1), 9, 9);
    g.fillStyle = C(L.boxD); g.fillRect(Math.round(bx - 4), Math.round(by + 6), 9, 2);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(bx - 1), Math.round(by + 2), 3, 2);
  }
  if (L.scarf && !opts.headless) { // 忍者圍巾在風中飄
    const wv = Math.sin(time * 10 + f.id) * 2;
    seg(g, neck[0], neck[1], neck[0] - face * 9, neck[1] + 1 + wv, 3, OUT);
    seg(g, neck[0], neck[1], neck[0] - face * 9, neck[1] + 1 + wv, 2, C(L.scarf));
    seg(g, neck[0] - face * 9, neck[1] + 1 + wv, neck[0] - face * 14, neck[1] - 1 - wv, 2, C(L.scarf));
  }
  // 後手、後腿（顏色深一點）
  two(sh, be, w, L.bare ? L.skinD : L.topD);
  two(be, bh, w * 0.9, L.skinD);
  two(hip, bk, w + 0.6, L.pantsD);
  two(bk, bfoot, w + 0.2, L.pantsD);
  dot(g, bfoot[0] + face, bfoot[1], 2, C(L.shoe));
  // 身體
  seg(g, hip[0], hip[1], neck[0], neck[1], L.body + 2, OUT);
  seg(g, hip[0], hip[1], neck[0], neck[1], L.body, C(L.top));
  seg(g, hip[0], hip[1] + 0.5, hip[0] + Math.sin(pose.lean) * 2 * face, hip[1] - Math.cos(pose.lean) * 2, L.body, C(L.pants));
  if (L.apron) {
    seg(g, hip[0] + face * 2, hip[1] + 1, neck[0] + face * 2, neck[1] + 3, L.body * 0.55, C(L.apron));
    g.fillStyle = '#b0001a';
    g.fillRect(Math.round(hip[0] + face * 3), Math.round(hip[1] - 4), 1, 1);
    g.fillRect(Math.round(hip[0] + face * 1), Math.round(hip[1] - 7), 2, 1);
  }
  if (L.bare) seg(g, neck[0] - face * 2, neck[1] + 2, neck[0] + face * 2.5, neck[1] + 2, 3, C(L.skin));
  // 前腿
  two(hip, fk, w + 0.6, L.pants);
  two(fk, ffoot, w + 0.2, L.pants);
  dot(g, ffoot[0] + face, ffoot[1], 2.2, C(L.shoe));
  // 頭
  if (!opts.headless) drawHead(g, f, head, face, C);
  else { dot(g, neck[0], neck[1], 3, OUT); dot(g, neck[0], neck[1], 2.2, '#c01028'); }
  // 前手
  two(sh, fe, w, L.bare ? L.skin : L.top);
  two(fe, fh, w * 0.9, L.skin);
  if (f.weapon && !opts.noWeapon) drawWeapon(g, f.weapon.kind, fh, pose.fu + pose.ff, face);
  g.restore();
}

export function drawHead(g, f, head, face, C = (c) => c) {
  const L = f.look;
  const [hx, hy] = head;
  dot(g, hx, hy, 5.8, OUT);
  dot(g, hx, hy, 4.9, C(L.skin));
  if (L.hood) {
    dot(g, hx, hy, 4.9, C(L.hood));
    g.fillStyle = C(L.skin);
    g.fillRect(Math.round(hx + face * 0.5 - (face < 0 ? 4 : 0)), Math.round(hy - 1.5), 4, 2);
    g.fillStyle = '#e82838';
    g.fillRect(Math.round(hx - 4), Math.round(hy - 3.5), 8, 1);
  } else if (L.helmet) {
    dot(g, hx - face * 0.4, hy - 1.4, 4.8, C(L.helmet));
    dot(g, hx + face * 1.6, hy + 1.4, 3.1, C(L.skin));
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(hx - face * 0.5), Math.round(hy - 6), 1, 5);
    g.fillStyle = C(L.helmetD);
    g.fillRect(Math.round(hx - 4), Math.round(hy - 1), 8, 1);
  } else if (L.hair) {
    dot(g, hx - face * 0.8, hy - 1.6, 4.4, C(L.hair));
    dot(g, hx + face * 1.4, hy + 1.0, 3.4, C(L.skin));
    g.fillStyle = C(L.hair);
    g.fillRect(Math.round(hx + face * 1 - (face < 0 ? 3 : 0)), Math.round(hy + 3), 3, 1);
  } else {
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(hx - face * 1.5), Math.round(hy - 3.5), 1, 1); // 光頭反光
    g.fillStyle = C('#3a2010');
    g.fillRect(Math.round(hx + face * 1.5 - (face < 0 ? 3 : 0)), Math.round(hy + 1.5), 4, 1); // 八字鬍
  }
  // 眼睛與眉毛（兇）
  g.fillStyle = OUT;
  g.fillRect(Math.round(hx + face * 2.6), Math.round(hy - 1), 1, 2);
  g.fillRect(Math.round(hx + face * 1.6 - (face < 0 ? 1 : 0)), Math.round(hy - 2.5), 2, 1);
}

export function drawWeapon(g, kind, hand, ang, face) {
  const dx = Math.sin(ang) * face, dy = Math.cos(ang);
  const [hx, hy] = hand;
  if (kind === 'harpoon') {
    seg(g, hx - dx * 8, hy - dy * 8, hx + dx * 20, hy + dy * 20, 2.5, OUT);
    seg(g, hx - dx * 8, hy - dy * 8, hx + dx * 20, hy + dy * 20, 1.4, '#8a6a4a');
    seg(g, hx + dx * 18, hy + dy * 18, hx + dx * 24, hy + dy * 24, 2.4, '#d8e0e8');
  } else if (kind === 'surfboard') {
    seg(g, hx - dx * 4, hy - dy * 4, hx + dx * 18, hy + dy * 18, 7, OUT);
    seg(g, hx - dx * 4, hy - dy * 4, hx + dx * 18, hy + dy * 18, 5, '#ff7ab0');
    seg(g, hx - dx * 2, hy - dy * 2, hx + dx * 16, hy + dy * 16, 1.4, '#ffffff');
  } else if (kind === 'coconut') {
    dot(g, hx, hy, 3.6, OUT); dot(g, hx, hy, 2.8, '#7a4a20'); g.fillStyle = '#c89060'; g.fillRect(Math.round(hx - 1), Math.round(hy - 2), 1, 1);
  } else if (kind === 'bottle') {
    seg(g, hx, hy, hx + dx * 7, hy + dy * 7, 4, OUT); seg(g, hx, hy, hx + dx * 7, hy + dy * 7, 2.6, '#3aa050');
  }
}
