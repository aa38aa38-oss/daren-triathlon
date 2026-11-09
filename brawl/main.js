// 打人三項：橫向打架版（樣品：第一關 血海沙灘，6 人混戰）
import { OUT, drawText, textW } from '../sample-race/pix.js';
import { sfx, initAudio } from '../src/audio.js';
import * as ART from '../br/art.js';
import { tintLook, drawFighter, drawHead, drawWeapon, dot, seg } from './fighter.js';

// ---------- 畫面 ----------
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const PORTRAIT = innerHeight > innerWidth;
const W = PORTRAIT ? 240 : 400, H = PORTRAIT ? 320 : 225;
const FLOOR_Y = PORTRAIT ? 148 : 104;     // 地板最遠處（z=0）在螢幕上的高度
const ZS = PORTRAIT ? 1.45 : 1.0;         // 地板深度換算成螢幕的比例
const AW = 600, DEPTH = 110;              // 場地寬度、深度
const WATER_Z = 88, WAVE_Z = 46;          // 淺水區、海嘯危險區（越大越靠近螢幕下方＝靠海）
document.body.classList.add(PORTRAIT ? 'portrait' : 'landscape');
if (IS_TOUCH) document.body.classList.add('touch');
const cv = document.getElementById('c');
cv.width = W; cv.height = H;
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;
const PANEL_H = PORTRAIT && IS_TOUCH ? 220 : 0;
function fit() {
  document.documentElement.style.height = document.body.style.height = innerHeight + 'px';
  document.documentElement.style.width = document.body.style.width = innerWidth + 'px';
  let k = Math.min(innerWidth / W, (innerHeight - PANEL_H) / H);
  if (!IS_TOUCH && k >= 2) k = Math.floor(k);
  const box = document.getElementById('game');
  box.style.width = cv.style.width = W * k + 'px';
  box.style.height = cv.style.height = H * k + 'px';
  if (PANEL_H) { const t = document.getElementById('touch'); t.style.width = innerWidth + 'px'; t.style.height = Math.max(PANEL_H, innerHeight - H * k) + 'px'; }
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(() => location.reload(), 300));
fit();

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const sign = (v) => (v < 0 ? -1 : 1);

// ---------- 角色與招式 ----------
const TYPES = ['muscle', 'ninja', 'butcher', 'courier'];
const NAME = { muscle: '肌肉阿伯', ninja: '忍者小翠', butcher: '屠夫老王', courier: '外送阿明' };
const SKILLS = {
  muscle: { near: ['鐵頭槌', 'headbutt'], far: ['丟啞鈴', 'dumbbell'], area: ['地震重踏', 'stomp'] },
  ninja: { near: ['瞬步斬', 'blink'], far: ['追蹤飛鏢', 'shuriken'], area: ['煙霧彈', 'smoke'] },
  butcher: { near: ['剁骨刀', 'cleaver'], far: ['肉鉤', 'hook'], area: ['迴旋大砍', 'spin'] },
  courier: { near: ['外送箱砸頭', 'box'], far: ['熱湯潑灑', 'soup'], area: ['外送炸彈', 'bomb'] },
};
const CD = { near: 4, far: 7, area: 14 };
const STATS = { muscle: { hp: 130, spd: 1.0 }, ninja: { hp: 95, spd: 1.2 }, butcher: { hp: 115, spd: 0.95 }, courier: { hp: 105, spd: 1.12 } };
const AINAMES = ['暴躁阿明', '憂鬱小美', '中二老王', '佛系阿華', '社畜阿強', '禿頭小翠', '鹹魚志明', '熬夜春嬌', '厭世阿伯', '狂暴阿姨', '嘴砲小胖', '邪惡阿傑'];

// 沙灘道具：近戰武器、丟擲物、魔法箱
const ITEMS = {
  harpoon: { name: '魚叉', melee: true, uses: 10, reach: 40, dmg: 16, w: 0.6 },
  surfboard: { name: '衝浪板', melee: true, uses: 5, reach: 34, dmg: 24, knock: true, w: 0.45 },
  coconut: { name: '椰子', throw: true, dmg: 16, stun: 0.6, w: 0.6 },
  bottle: { name: '啤酒瓶', throw: true, dmg: 12, bleed: 4, w: 0.5 },
  magic: { name: '魔法箱', magic: true, w: 0.35 },
};

const TUNE = { aiDmgToPlayer: 0.85, aiAttack: 0.035, aiSkill: 0.007, hpMul: 6, heal: 30, spdX: 72, spdZ: 46, hitstop: 0.05 };

// ---------- 狀態 ----------
let fighters = [], player = null, phase = 'select', phaseT = 0, time = 0, gameT = 0;
let camX = 0, shake = 0, hitstop = 0, flash = 0, flashCol = '255,255,255';
const items = [], shots = [], particles = [], chunks = [], corpses = [], fires = [], clouds = [], bolts = [], nums = [];
let itemT = 3;
const bombs = [], rings = [], skyS = [];
let skyT = 9, hintN = 0, waveFade = 0;
// 自己畫的技能圖示（美術圖沒有的）
const EXTRA_ICON = {};
function extraIcon(id) {
  if (EXTRA_ICON[id]) return EXTRA_ICON[id];
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  if (id === 'stomp') {
    x.fillStyle = '#ffd000'; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; x.fillRect(16 + Math.cos(a) * 12 - 2, 22 + Math.sin(a) * 6 - 1, 4, 2); }
    x.fillStyle = '#1a1028'; x.fillRect(9, 5, 13, 16); x.fillStyle = '#8a5a3a'; x.fillRect(10, 6, 11, 10); x.fillStyle = '#2a2030'; x.fillRect(8, 16, 17, 6);
  } else if (id === 'bomb') {
    x.fillStyle = '#1a1028'; x.fillRect(5, 9, 22, 20); x.fillStyle = '#f08a20'; x.fillRect(6, 10, 20, 18); x.fillStyle = '#b05a10'; x.fillRect(6, 24, 20, 4);
    x.fillStyle = '#ffffff'; x.fillRect(13, 15, 6, 4); x.fillStyle = '#ffd040'; x.fillRect(15, 2, 3, 7); x.fillStyle = '#ff4020'; x.fillRect(14, 0, 5, 3);
  }
  return (EXTRA_ICON[id] = c);
}
const skIcon = (id) => ART.skillIcon(id) || extraIcon(id);
function shockwave(f, r, dmg) {
  rings.push({ x: f.x, z: f.z, r, t: 0 });
  for (let i = 0; i < 30; i++) particles.push({ x: f.x + rnd(-r, r) * 0.6, z: f.z + rnd(-8, 8), y: 1, vx: rnd(-60, 60), vz: rnd(-10, 10), vy: rnd(30, 90), c: i % 2 ? '#e8c890' : '#d0a868', life: 0.6 });
  for (const o of enemiesOf(f)) if (Math.abs(o.x - f.x) < r && Math.abs(o.z - f.z) < r * 0.42 && o.y < 20) hit(f, o, dmg, { knock: true, kb: 170, up: 170, dir: sign(o.x - f.x) || 1, cause: 'boom' });
  shake = Math.max(shake, f.isPlayer ? 5 : 2); sfx.boom(f.isPlayer ? 0.7 : 0.3);
}
const wave = { state: 'wait', t: 16, x: 0, dir: 1 };
const sharks = [{ x: 120, dir: 1, cd: 2, lunge: 0 }, { x: 460, dir: -1, cd: 4, lunge: 0 }];
const stats = { kills: {}, cause: {} };

// 地板（血跡會畫在這張圖上，一直留著）
const FH = Math.ceil(DEPTH * ZS) + 2;
const floor = document.createElement('canvas');
floor.width = AW; floor.height = FH;
const fctx = floor.getContext('2d');
function paintFloor() {
  const hsh = (x, y) => ((Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 24);
  for (let y = 0; y < FH; y++) {
    const z = y / ZS;
    for (let x = 0; x < AW; x += 2) {
      const n = hsh(x >> 1, y);
      let c;
      if (z > WATER_Z) c = n < 40 ? '#3a8ee6' : n > 230 ? '#7ac8ff' : '#2f7fd8';
      else if (z > WATER_Z - 8) c = n < 80 ? '#c89a58' : '#d4a868';
      else c = n < 20 ? '#d8b070' : n > 245 ? '#fff0c0' : n < 70 ? '#ecc888' : '#f2d090';
      fctx.fillStyle = c;
      fctx.fillRect(x, y, 2, 1);
    }
  }
}
paintFloor();
const BLOOD = ['#8a0016', '#a8102a', '#6e0010', '#c01838'];
function splat(x, z, r) {
  const cx = x, cy = z * ZS;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r * 1.5; dx <= r * 1.5; dx++) {
    const d = Math.hypot(dx / 1.5, dy) / r;
    if (d > 1 + Math.sin(dx * 3 + dy) * 0.15 || Math.random() > (d < 0.6 ? 0.95 : 0.5)) continue;
    fctx.fillStyle = BLOOD[(dx * 7 + dy * 3) & 3];
    fctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
  }
}

function makeFighter(i, type, isPlayer) {
  const st = STATS[type];
  return {
    id: i, type, isPlayer, name: isPlayer ? '你' : AINAMES[(i * 5) % AINAMES.length], look: tintLook(type, isPlayer ? 0 : i),
    x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, kx: 0, face: 1, spd: st.spd,
    hp: st.hp * TUNE.hpMul, maxHp: st.hp * TUNE.hpMul, alive: true, state: 'idle', st: 0, walkPh: 0, combo: 0, comboT: 0, queued: false, hitSet: new Set(),
    cd: { near: 1.5, far: 3, area: 6 }, rollCd: 0, invulT: 0, stunT: 0, frozenT: 0, flashT: 0, slowT: 0,
    poisonT: 0, bleedT: 0, burnT: 0, dotT: 0, dotBy: null, weapon: null, kills: 0, place: 0, lastBy: null, lastByT: -9,
    ai: isPlayer ? null : { think: 0, goal: null, target: null, aggr: rnd(0.3, 1), react: rnd(0.15, 0.4) },
  };
}

function startGame(type) {
  fighters = [];
  const others = TYPES.filter((t) => t !== type);
  for (let i = 0; i < 6; i++) {
    const t = i === 0 ? type : i < 4 ? others[i - 1] : TYPES[Math.floor(Math.random() * 4)];
    const f = makeFighter(i, t, i === 0);
    f.x = 60 + (i * (AW - 120)) / 5 + rnd(-10, 10);
    f.z = rnd(15, 70);
    f.face = f.x < AW / 2 ? 1 : -1;
    fighters.push(f);
  }
  player = fighters[0];
  [fighters[0].x, fighters[2].x] = [fighters[2].x, fighters[0].x];
  for (const a of [items, shots, particles, chunks, corpses, fires, clouds, bolts, nums, bombs, rings, skyS, booms]) a.length = 0;
  skyT = 9; waveFade = 0;
  paintFloor();
  Object.assign(wave, { state: 'wait', t: 16, x: 0 });
  itemT = 3; gameT = 0;
  stats.kills = {}; stats.cause = {};
  phase = 'intro'; phaseT = 2.2;
  $('select').classList.add('hidden');
  if (IS_TOUCH) $('touch').classList.remove('hidden');
  setupButtons();
  banner('第一關：血海沙灘', '6 人混戰・小心海嘯和鯊魚');
  initAudio();
}

// ---------- 輸入 ----------
const keys = {};
const edge = { atk: false, jump: false, dodge: false, near: false, far: false, area: false };
const touch = { mx: 0, my: 0, atk: false };
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  const m = { KeyJ: 'atk', KeyK: 'jump', Space: 'jump', KeyL: 'dodge', ShiftLeft: 'dodge', KeyU: 'near', KeyI: 'far', KeyO: 'area' }[e.code];
  if (m) edge[m] = true;
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function setupTouch() {
  const pad = $('stick'), knob = $('knob');
  let id = null, cx = 0, cy = 0;
  const R = 46;
  const move = (e) => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    touch.mx = Math.abs(dx) < 10 ? 0 : dx / R;
    touch.my = Math.abs(dy) < 10 ? 0 : dy / R;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  pad.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    try { pad.setPointerCapture(id); } catch { /* 部分瀏覽器不支援 */ }
    const b = pad.getBoundingClientRect();
    cx = b.left + b.width / 2; cy = b.top + b.height / 2;
    move(e);
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; touch.mx = touch.my = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  const btn = (el, key) => {
    const b = $(el);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); edge[key] = true; b.classList.add('on'); if (key === 'atk') touch.atk = true; });
    const up = () => { b.classList.remove('on'); if (key === 'atk') touch.atk = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  };
  btn('bNear', 'near'); btn('bFar', 'far'); btn('bArea', 'area'); btn('bJump', 'jump'); btn('bDodge', 'dodge'); btn('bAtk', 'atk');
}
setupTouch();
let atkHoldT = 0;
function playerControl(dt) {
  const k = keys;
  let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  let my = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if (!mx && !my) { mx = touch.mx; my = touch.my; }
  // 按住攻擊鍵會一直連打
  const held = touch.atk || k.KeyJ;
  atkHoldT = held ? atkHoldT + dt : 0;
  const c = { mx, my, atk: edge.atk || (held && atkHoldT > 0.25 && Math.floor(atkHoldT / 0.18) !== Math.floor((atkHoldT - dt) / 0.18)),
    jump: edge.jump, dodge: edge.dodge, near: edge.near, far: edge.far, area: edge.area };
  for (const key in edge) edge[key] = false;
  return c;
}

// ---------- 介面文字 ----------
function popup(text, cls = '') {
  const d = document.createElement('div');
  d.className = 'pop ' + cls;
  d.textContent = text;
  const box = $('pops');
  box.appendChild(d);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => d.remove(), 1100);
}
function showHint(t) { const h = $('hint'); if (h.textContent !== t) h.textContent = t; h.classList.remove('hidden'); }
function hideHint() { $('hint').classList.add('hidden'); }
function banner(title, sub) {
  const b = $('banner');
  b.innerHTML = `<div class="t">${title}</div><div class="s">${sub || ''}</div>`;
  b.classList.remove('hidden');
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(banner.t);
  banner.t = setTimeout(() => b.classList.add('hidden'), 2400);
}
function feed(text, mine) {
  const d = document.createElement('div');
  d.textContent = '💀 ' + text;
  if (mine) d.className = 'mine';
  const f = $('feed');
  f.prepend(d);
  while (f.children.length > 3) f.lastChild.remove();
  setTimeout(() => d.remove(), 4000);
}
let splatA = 0;
function screenSplat(a) {
  splatA = Math.min(0.8, splatA + a);
  const blobs = [];
  for (let i = 0; i < 6; i++) { const x = rnd(0, 100), y = rnd(0, 100), r = rnd(8, 22); blobs.push(`radial-gradient(circle at ${x}% ${y}%, rgba(150,0,0,.95) 0, rgba(120,0,0,.85) ${r}%, transparent ${r + 3}%)`); }
  $('splat').style.background = blobs.join(',');
}

// ---------- 血 ----------
function blood(x, z, y, n, spd, up, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random());
    particles.push({ x, z, y, vx: Math.cos(a) * s, vz: Math.sin(a) * s * 0.4, vy: up * (0.4 + Math.random()), c: col || BLOOD[i & 3], blood: !col, life: 2 });
  }
  if (particles.length > 1800) particles.splice(0, particles.length - 1800);
}
const alive = () => fighters.filter((f) => f.alive);
const enemiesOf = (f) => fighters.filter((o) => o !== f && o.alive);
const onGround = (f) => f.y <= 0.01;

function setState(f, s) { f.state = s; f.st = 0; f.hitSet = new Set(); }
const free = (f) => f.state === 'idle' || f.state === 'walk';

// 打到人
function hit(a, t, dmg, o = {}) {
  if (!t.alive || t.invulT > 0 || t.state === 'roll' || t.state === 'getup') return false;
  if (a && a === t) return false;
  if (a && !a.isPlayer && t.isPlayer) dmg *= TUNE.aiDmgToPlayer;
  if (t.frozenT > 0) { dmg *= 2.5; t.frozenT = 0; o.cause = o.cause || 'ice'; blood(t.x, t.z, 18, 30, 80, 90, '#bfefff'); }
  t.hp -= dmg;
  t.flashT = 0.1;
  if (a) { t.lastBy = a; t.lastByT = time; }
  const dir = o.dir || (a ? sign(t.x - a.x) : 1);
  blood(t.x, t.z, t.y + 18, Math.min(45, 8 + dmg * 1.2), 70, 70);
  if (Math.random() < 0.5) splat(t.x + rnd(-6, 6), t.z + rnd(-3, 3), 2);
  nums.push({ x: t.x, z: t.z, y: t.y + 38, v: Math.round(dmg), t: 0, c: a && a.isPlayer ? '#ffe000' : '#ffffff' });
  if (o.stun) { t.stunT = Math.max(t.stunT, o.stun); }
  for (const k of ['bleed', 'burn', 'poison']) if (o[k]) { t[k + 'T'] = Math.max(t[k + 'T'], o[k]); t.dotBy = a; }
  if (t.weapon && (o.knock || Math.random() < 0.3)) dropWeapon(t);
  if (t.hp <= 0) { killF(t, a || (time - t.lastByT < 4 ? t.lastBy : null), o.cause || 'hit', dir); return true; }
  if (o.knock) {
    setState(t, 'fly');
    t.vy = o.up || 150; t.kx = dir * (o.kb || 140); t.face = -dir;
  } else if (!t.state.startsWith('dash')) {
    if (t.stunT > 0) setState(t, 'stun'); else setState(t, 'hurt');
    t.kx = dir * (o.kb || 55);
  }
  if (a && a.isPlayer) { hitstop = TUNE.hitstop; sfx.punch(1); shake = Math.max(shake, o.knock ? 3 : 1.5); }
  else if (t.isPlayer) { hitstop = TUNE.hitstop; sfx.punch(1); shake = Math.max(shake, 2.5); screenSplat(0.25); }
  else sfx.punch(0.3);
  return true;
}

function killF(t, by, cause, dir = 1) {
  t.alive = false;
  t.hp = 0;
  t.place = alive().length + 1;
  stats.cause[cause] = (stats.cause[cause] || 0) + 1;
  const big = cause === 'wave' || cause === 'boom' || cause === 'shark';
  blood(t.x, t.z, 20, big ? 220 : 150, big ? 140 : 100, big ? 200 : 160);
  for (let i = 0; i < 5; i++) splat(t.x + rnd(-16, 16), t.z + rnd(-6, 6), rnd(2, 5));
  // 頭飛出去，屍體倒在地上（脖子還在噴血）
  chunks.push({ head: true, f: t, x: t.x, z: t.z, y: t.y + 30, vx: dir * rnd(40, 110), vz: rnd(-20, 20), vy: rnd(130, 200), rot: 0, life: 8 });
  corpses.push({ f: { ...t, state: 'corpse', st: 0, flashT: 0, weapon: null, face: -dir }, x: t.x + dir * 10, z: t.z, fount: 2.5 });
  if (t.weapon) dropWeapon(t);
  sfx.splat(1);
  shake = Math.max(shake, 4);
  if (by && by !== t) {
    by.kills++;
    by.hp = Math.min(by.maxHp, by.hp + TUNE.heal);
    feed(`${by.name} 殺了 ${t.name}`, by.isPlayer || t.isPlayer);
    if (by.isPlayer) { popup(['擊殺！', '雙殺！', '三殺！', '四殺！', '全滅！'][Math.min(by.kills, 5) - 1], 'kill'); flash = 0.06; flashCol = '255,255,255'; hitstop = 0.12; }
  } else {
    feed(`${t.name} ${{ wave: '被海嘯捲走了', shark: '被鯊魚吃了', burn: '被燒死了', poison: '中毒死了' }[cause] || '慘死'}`, t.isPlayer);
  }
  if (t.isPlayer) { screenSplat(1); popup('你被殺了！', 'bad'); setTimeout(() => endGame(), 2200); }
}

// ---------- 道具 ----------
function dropWeapon(f) {
  if (!f.weapon) return;
  items.push({ kind: f.weapon.kind, uses: f.weapon.uses, x: f.x, z: f.z, y: 20, vy: 80 });
  f.weapon = null;
}
function spawnItem() {
  const ks = Object.keys(ITEMS);
  let sum = 0; for (const k of ks) sum += ITEMS[k].w;
  let r = Math.random() * sum, kind = ks[0];
  for (const k of ks) { r -= ITEMS[k].w; if (r <= 0) { kind = k; break; } }
  const it = { kind, uses: ITEMS[kind].uses || 1, x: rnd(30, AW - 30), z: rnd(6, WATER_Z - 12), y: 170, vy: 0, beam: 3 };
  items.push(it);
  if (Math.abs(it.x - (player ? player.x : 0)) < W) popup('道具掉下來了！');
}
function pickup(f) {
  if (f.weapon || !onGround(f) || !free(f)) return;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.y > 2 || Math.abs(it.x - f.x) > 18 || Math.abs(it.z - f.z) > 11) continue;
    items.splice(i, 1);
    if (ITEMS[it.kind].magic) { castMagic(f); return; }
    f.weapon = { kind: it.kind, uses: it.uses };
    if (f.isPlayer) {
      hintN++;
      popup(ITEMS[it.kind].throw ? `撿到${ITEMS[it.kind].name}！按攻擊丟出去` : `撿到${ITEMS[it.kind].name}！攻擊鍵改用它打`, 'skill');
      sfx.pickup();
      for (let k = 0; k < 16; k++) particles.push({ x: f.x, z: f.z, y: 20, vx: rnd(-50, 50), vz: rnd(-10, 10), vy: rnd(40, 110), c: k % 2 ? '#ffe000' : '#ffffff', life: 0.5 });
    }
    return;
  }
}
// 魔法箱：撿到立刻發動
function castMagic(f) {
  const r = Math.floor(Math.random() * 3);
  const foes = enemiesOf(f);
  if (r === 0) {
    for (let k = -1; k <= 1; k++) shots.push({ kind: 'fireball', x: f.x + f.face * 10, z: f.z + k * 10, y: 18, vx: f.face * 260, vz: k * 20, vy: 0, owner: f, life: 1.6, dmg: 22 });
    if (f.isPlayer) popup('火球術！', 'skill');
  } else if (r === 1) {
    let src = f;
    const hitS = new Set([f]);
    for (let n = 0; n < 4; n++) {
      let best = null, bd = n ? 110 : 200;
      for (const o of foes) { if (hitS.has(o)) continue; const d = Math.hypot(o.x - src.x, (o.z - src.z) * 2); if (d < bd) { bd = d; best = o; } }
      if (!best) break;
      bolts.push({ x1: src.x, z1: src.z, y1: src.y + 20, x2: best.x, z2: best.z, y2: best.y + 20, t: 0 });
      hit(f, best, 20, { stun: 0.6, cause: 'shock' });
      hitS.add(best); src = best;
    }
    flash = 0.08; flashCol = '180,240,255'; sfx.boom(0.6);
    if (f.isPlayer) popup('連鎖閃電！', 'skill');
  } else {
    for (const o of foes) if (Math.abs(o.x - f.x) < 80 && Math.abs(o.z - f.z) < 30) { o.frozenT = 2.5; setState(o, 'frozen'); }
    flash = 0.08; flashCol = '200,240,255';
    if (f.isPlayer) popup('冰凍術！打碎他們！', 'skill');
  }
}

// ---------- 攻擊 ----------
// 判定：攻擊者面前 reach 的距離內、前後深度差不多、高度差不多
function inFront(a, o, reach, depth = 9, back = 4) {
  const dx = (o.x - a.x) * a.face;
  return dx > -back && dx < reach && Math.abs(o.z - a.z) < depth && Math.abs(o.y - a.y) < 26;
}
function meleeCheck(a, reach, dmg, o, depth) {
  let any = false;
  for (const t of enemiesOf(a)) {
    if (a.hitSet.has(t) || !inFront(a, t, reach, depth)) continue;
    a.hitSet.add(t);
    if (hit(a, t, dmg, o)) any = true;
  }
  return any;
}
function doAttack(f) {
  if (f.weapon) {
    const W2 = ITEMS[f.weapon.kind];
    if (W2.throw) { setState(f, 'throw'); return; }
    setState(f, f.weapon.kind === 'harpoon' ? 'thrust' : 'wswing');
    return;
  }
  if (!onGround(f)) { if (!f.jatk) { f.jatk = true; setState(f, 'jatk'); } return; }
  f.combo = f.comboT > 0 ? (f.combo % 3) + 1 : 1;
  setState(f, 'atk' + f.combo);
  f.kx = f.face * 25;
}
function nearest(f, range = 1e9, ignoreZ = false) {
  let best = null, bd = range;
  for (const o of enemiesOf(f)) { const d = Math.hypot(o.x - f.x, ignoreZ ? 0 : (o.z - f.z) * 2); if (d < bd) { bd = d; best = o; } }
  return best;
}
function faceTo(f, o) { if (o) f.face = sign(o.x - f.x); }

function castSkill(f, slot) {
  if (f.cd[slot] > 0 || !free(f)) return;
  f.cd[slot] = CD[slot] * (f.isPlayer ? 1 : 1.6);
  const P = f.isPlayer, m = P ? 1 : 0.8;
  const tgt = nearest(f, 400);
  if (P) popup(SKILLS[f.type][slot][0] + '！', 'skill');
  const key = f.type + '.' + slot;
  switch (key) {
    case 'muscle.near': faceTo(f, nearest(f, 60)); setState(f, 'dash'); f.dash = { t: 0.22, spd: 200, dmg: 26 * m, opt: { stun: 1.2, kb: 90, cause: 'hit' } }; f.dashLean = 0.9; break;
    case 'muscle.far': {
      faceTo(f, tgt); setState(f, 'throw');
      const tx = tgt ? tgt.x : f.x + f.face * 120, tz = tgt ? tgt.z : f.z;
      shots.push({ kind: 'dumbbell', x: f.x, z: f.z, y: 24, sx: f.x, sz: f.z, tx, tz, p: 0, dur: 0.6, owner: f, life: 1, dmg: 22 * m });
      break;
    }
    case 'muscle.area': setState(f, 'stomp'); f.vy = 130; f.stompDone = false; f.stompDmg = 28 * m; break; // 跳起來往地上一踩，震飛身邊的人
    case 'ninja.near': {
      const o = nearest(f, 170);
      if (o) {
        for (let i = 0; i < 16; i++) particles.push({ x: f.x, z: f.z, y: rnd(4, 30), vx: rnd(-40, 40), vz: rnd(-10, 10), vy: rnd(0, 30), c: '#6a6a7a', life: 0.5 });
        f.x = clamp(o.x - o.face * 16, 10, AW - 10); f.z = o.z; f.face = sign(o.x - f.x);
        setState(f, 'atk2'); f.combo = 2; f.hitSet.add(o);
        hit(f, o, 26 * m, { kb: 70, cause: 'hit' });
      }
      break;
    }
    case 'ninja.far': {
      faceTo(f, tgt); setState(f, 'throw');
      const list = enemiesOf(f).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x));
      for (let k = 0; k < 3; k++) shots.push({ kind: 'shuriken', x: f.x + f.face * 8, z: f.z + (k - 1) * 6, y: 20, vx: f.face * 240, vz: (k - 1) * 30, vy: 0, owner: f, life: 2, dmg: 11 * m, target: list[k % Math.max(1, list.length)] || null });
      break;
    }
    case 'ninja.area':
      setState(f, 'cast');
      clouds.push({ x: f.x, z: f.z, r: 46, t: 4.5, owner: f });
      break;
    case 'butcher.near': faceTo(f, nearest(f, 60)); setState(f, 'chop'); f.chop = { reach: 30, dmg: 28 * m, opt: { bleed: 4, kb: 80, cause: 'hit' } }; break;
    case 'butcher.far': faceTo(f, tgt); setState(f, 'throw'); shots.push({ kind: 'hook', x: f.x + f.face * 8, z: f.z, y: 20, vx: f.face * 380, vz: tgt ? clamp((tgt.z - f.z) * 4, -80, 80) : 0, vy: 0, owner: f, life: 0.55, dmg: 10 * m }); break;
    case 'butcher.area': setState(f, 'spin'); f.spinDmg = 30 * m; shake = P ? 3 : shake; break;
    case 'courier.near': faceTo(f, nearest(f, 60)); setState(f, 'chop'); f.chop = { reach: 28, dmg: 24 * m, opt: { stun: 1.0, kb: 70, cause: 'hit' }, speedUp: true }; break;
    case 'courier.far': {
      faceTo(f, tgt); setState(f, 'cast');
      for (const o of enemiesOf(f)) {
        const dx = (o.x - f.x) * f.face;
        if (dx > 0 && dx < 75 && Math.abs(o.z - f.z) < 10 + dx * 0.25) hit(f, o, 16 * m, { burn: 3, kb: 60, cause: 'burn' });
      }
      for (let i = 0; i < 45; i++) particles.push({ x: f.x + f.face * 8, z: f.z, y: 20, vx: f.face * rnd(80, 220), vz: rnd(-30, 30), vy: rnd(10, 70), c: i % 2 ? '#ff8a20' : '#ffd040', life: 0.5 });
      break;
    }
    case 'courier.area': setState(f, 'cast'); bombs.push({ x: f.x, z: f.z, t: 0.45, owner: f, dmg: 26 * m }); break; // 外送箱在腳邊爆炸
  }
}

function startRoll(f, mx, my) {
  if (f.rollCd > 0 || !(free(f) || f.state.startsWith('atk')) || !onGround(f)) return;
  f.rollCd = 0.8;
  setState(f, 'roll');
  const d = Math.hypot(mx, my);
  f.rdx = d ? mx / d : f.face; f.rdz = d ? my / d : 0;
  if (f.rdx) f.face = sign(f.rdx);
  if (f.isPlayer) sfx.slip();
}

// ---------- 電腦 ----------
function aiControl(f, dt) {
  const ai = f.ai;
  const c = { mx: 0, my: 0, atk: false, jump: false, dodge: false, near: false, far: false, area: false };
  ai.think -= dt;
  const danger = wave.state === 'warn' || (wave.state === 'go' && Math.abs(wave.x - f.x) < 200);
  if (ai.think <= 0) {
    ai.think = rnd(0.25, 0.45);
    // 選目標：最近的人，玩家稍微優先；同時最多兩個電腦盯玩家
    const onPlayer = fighters.filter((o) => o.ai && o.alive && o.ai.target === player).length;
    let best = null, bd = 1e9;
    for (const o of enemiesOf(f)) {
      let d = Math.hypot(o.x - f.x, (o.z - f.z) * 2) - (o.isPlayer ? 40 * ai.aggr : 0) + o.hp * 0.3;
      if (o.isPlayer && onPlayer >= 2 && ai.target !== player) d += 200;
      if (d < bd) { bd = d; best = o; }
    }
    ai.target = best;
    ai.goal = null;
    if (!f.weapon) {
      const it = items.find((i) => i.y < 2 && Math.abs(i.x - f.x) < 140 && !ITEMS[i.kind].magic) || items.find((i) => i.y < 2 && Math.abs(i.x - f.x) < 90);
      if (it && Math.random() < 0.6) ai.goal = { x: it.x, z: it.z };
    }
  }
  const t = ai.target && ai.target.alive ? ai.target : null;
  let gx = f.x, gz = f.z;
  if (ai.goal) { gx = ai.goal.x; gz = ai.goal.z; }
  else if (t) { const side = sign(f.x - t.x); gx = t.x + side * (f.weapon && ITEMS[f.weapon.kind].melee ? 26 : 17); gz = t.z; }
  if (danger && f.z > WAVE_Z - 12) { gz = WAVE_Z * 0.35; gx = f.x; }
  for (const sk of skyS) if (sk.state !== 'flop' && Math.abs(sk.x - f.x) < 34 && Math.abs(sk.z - f.z) < 16 && Math.random() < 0.9) { gx = f.x + sign(f.x - sk.x) * 50; }
  if (gz > WATER_Z - 4 && !danger) gz = WATER_Z - 6;
  const dx = gx - f.x, dz = gz - f.z;
  c.mx = Math.abs(dx) > 4 ? clamp(dx / 20, -1, 1) : 0;
  c.my = Math.abs(dz) > 2 ? clamp(dz / 10, -1, 1) : 0;
  if (phase !== 'fight') return c;
  if (t) {
    const ddx = Math.abs(t.x - f.x), ddz = Math.abs(t.z - f.z);
    const reach = f.weapon ? (ITEMS[f.weapon.kind].reach || 120) : 24;
    if (ddx < reach && ddz < 8 && Math.random() < TUNE.aiAttack * (0.6 + ai.aggr)) { f.face = sign(t.x - f.x); c.atk = true; c.mx = 0; }
    if (Math.random() < TUNE.aiSkill) {
      const near2 = enemiesOf(f).filter((o) => Math.abs(o.x - f.x) < 42 && Math.abs(o.z - f.z) < 16).length;
      if (ddx < 34 && ddz < 10) c.near = true;
      else if (ddx > 40 && ddx < 170 && ddz < 18) { f.face = sign(t.x - f.x); c.far = true; }
      if (near2 >= 2) c.area = true;
    }
    // 看到有人要打自己，偶爾閃開
    if (t.state.startsWith('atk') && ddx < 30 && ddz < 10 && t.face === sign(f.x - t.x) && Math.random() < 0.035) { c.dodge = true; c.mx = -sign(t.x - f.x); }
    if (ddx < 60 && ddx > 30 && Math.random() < 0.004) c.jump = true;
  }
  return c;
}

// 自動試玩（測試用）
let autoPilot = false;
function autoControl() {
  const f = player, c = { mx: 0, my: 0, atk: false, jump: false, dodge: false, near: false, far: false, area: false };
  const t = nearest(f, 1e9);
  const danger = wave.state === 'warn' || (wave.state === 'go' && Math.abs(wave.x - f.x) < 220);
  let gx = f.x, gz = f.z;
  if (t) { gx = t.x + sign(f.x - t.x) * 16; gz = t.z; }
  if (!f.weapon) { const it = items.find((i) => i.y < 2 && Math.abs(i.x - f.x) < 90); if (it) { gx = it.x; gz = it.z; } }
  if (danger && f.z > WAVE_Z - 12) { gz = 10; gx = f.x; }
  for (const sk of skyS) if (sk.state !== 'flop' && Math.abs(sk.x - f.x) < 34 && Math.abs(sk.z - f.z) < 16) gx = f.x + sign(f.x - sk.x) * 50;
  c.mx = Math.abs(gx - f.x) > 4 ? clamp((gx - f.x) / 20, -1, 1) : 0;
  c.my = Math.abs(gz - f.z) > 2 ? clamp((gz - f.z) / 10, -1, 1) : 0;
  const casual = autoPilot === 'casual';
  const press = (p) => !casual || Math.random() < p;
  if (t && phaseT <= 0) {
    const ddx = Math.abs(t.x - f.x), ddz = Math.abs(t.z - f.z);
    if (ddx < (f.weapon ? 36 : 24) && ddz < 8 && press(0.05)) { f.face = sign(t.x - f.x); c.atk = true; c.mx = 0; }
    if (ddx < 34 && ddz < 10 && press(0.05)) c.near = true;
    if (ddx > 40 && ddx < 170 && ddz < 18 && press(0.04)) { f.face = sign(t.x - f.x); c.far = true; }
    if (enemiesOf(f).filter((o) => Math.abs(o.x - f.x) < 42 && Math.abs(o.z - f.z) < 16).length >= 2 && press(0.05)) c.area = true;
    if (t.state.startsWith('atk') && ddx < 30 && press(0.03)) c.dodge = true;
  }
  return c;
}

// ---------- 每個角色的動作 ----------
function stepFighter(f, c, dt) {
  f.st += dt;
  for (const k of ['near', 'far', 'area']) f.cd[k] -= dt;
  f.rollCd -= dt; f.invulT -= dt; f.flashT -= dt; f.comboT -= dt; f.slowT -= dt;
  // 持續傷害
  if (f.poisonT > 0 || f.bleedT > 0 || f.burnT > 0) {
    f.poisonT -= dt; f.bleedT -= dt; f.burnT -= dt; f.dotT -= dt;
    const col = f.burnT > 0 ? '#ff8a20' : f.poisonT > 0 ? '#7aff5a' : BLOOD[1];
    if (Math.random() < 0.3) particles.push({ x: f.x + rnd(-4, 4), z: f.z, y: f.y + rnd(8, 26), vx: 0, vz: 0, vy: 20, c: col, life: 0.5 });
    if (f.dotT <= 0) {
      f.dotT = 0.5;
      f.hp -= 4; f.flashT = 0.05;
      nums.push({ x: f.x, z: f.z, y: f.y + 36, v: 4, t: 0, c: col });
      if (f.hp <= 0) { killF(f, f.dotBy, f.burnT > 0 ? 'burn' : 'poison', 1); return; }
    }
  }
  if (f.frozenT > 0) { f.frozenT -= dt; if (f.frozenT <= 0) setState(f, 'idle'); physics(f, dt); return; }
  if (f.stunT > 0) { f.stunT -= dt; if (f.state === 'stun' && f.stunT <= 0) setState(f, 'idle'); }
  const s = f.state, t = f.st;
  const slow = (f.z > WATER_Z ? 0.6 : 1) * (f.slowT > 0 ? 0.5 : 1) * f.spd;
  if (s === 'idle' || s === 'walk') {
    f.vx = c.mx * TUNE.spdX * slow;
    f.vz = c.my * TUNE.spdZ * slow;
    if (c.mx) f.face = sign(c.mx);
    const moving = c.mx || c.my;
    if (moving) { f.walkPh += dt * 11 * slow; if (s !== 'walk') f.state = 'walk'; } else if (s !== 'idle') f.state = 'idle';
    pickup(f);
    if (c.jump && onGround(f)) { f.vy = 165; f.jatk = false; setState(f, 'jump'); }
    else if (c.dodge) startRoll(f, c.mx, c.my);
    else if (c.atk) doAttack(f);
    else if (c.near) castSkill(f, 'near');
    else if (c.far) castSkill(f, 'far');
    else if (c.area) castSkill(f, 'area');
  } else if (s === 'jump') {
    f.vx = c.mx * TUNE.spdX * 0.85 * slow; f.vz = c.my * TUNE.spdZ * 0.6;
    if (c.mx) f.face = sign(c.mx);
    if (c.atk) doAttack(f);
    if (onGround(f) && t > 0.1) setState(f, 'idle');
  } else if (s === 'jatk') {
    if (t > 0.04 && t < 0.4) meleeCheck(f, 26, 14, { knock: true, kb: 130, up: 120 });
    if (onGround(f) && t > 0.05) setState(f, 'idle');
  } else if (s.startsWith('atk')) {
    const n = f.combo, dur = [0, 0.24, 0.26, 0.4][n], a0 = [0, 0.05, 0.06, 0.13][n], a1 = [0, 0.12, 0.13, 0.24][n];
    f.vx = 0; f.vz = 0;
    if (t > a0 && t < a1) meleeCheck(f, n === 3 ? 27 : 22, [0, 8, 9, 14][n], n === 3 ? { knock: true, kb: 150 } : { kb: 45 });
    if (t > a1 && c.atk) f.queued = true;
    if (t >= dur) {
      f.comboT = 0.35;
      setState(f, 'idle');
      if (f.queued) { f.queued = false; doAttack(f); }
    }
  } else if (s === 'thrust' || s === 'wswing') {
    f.vx = 0; f.vz = 0;
    const it = ITEMS[f.weapon ? f.weapon.kind : 'harpoon'];
    if (t > 0.1 && t < 0.2 && f.weapon) {
      if (meleeCheck(f, it.reach, it.dmg, it.knock ? { knock: true, kb: 170 } : { kb: 70 }, 11) && !f.usedSwing) { f.usedSwing = true; }
    }
    if (t >= 0.32) {
      if (f.weapon && f.usedSwing) { f.weapon.uses--; if (f.weapon.uses <= 0) { if (f.isPlayer) popup(it.name + '壞了'); f.weapon = null; } }
      f.usedSwing = false;
      setState(f, 'idle');
    }
  } else if (s === 'throw') {
    f.vx = 0; f.vz = 0;
    if (t > 0.12 && f.weapon && ITEMS[f.weapon.kind].throw) {
      const k = f.weapon.kind;
      const tg = nearest(f, 260);
      shots.push({ kind: k, x: f.x + f.face * 8, z: f.z, y: 24, vx: f.face * 230, vz: tg ? clamp((tg.z - f.z) * 2.2, -60, 60) : 0, vy: 60, grav: true, owner: f, life: 2, dmg: ITEMS[k].dmg });
      f.weapon = null;
    }
    if (t >= 0.3) setState(f, 'idle');
  } else if (s === 'chop') {
    f.vx = 0; f.vz = 0;
    if (t > 0.1 && t < 0.2) meleeCheck(f, f.chop.reach, f.chop.dmg, f.chop.opt, 12);
    if (t >= 0.35) { setState(f, 'idle'); if (f.chop.speedUp) f.slowT = -1; }
  } else if (s === 'dash') {
    const d = f.dash;
    f.vx = f.face * d.spd; f.vz = c.my * TUNE.spdZ * 0.5;
    meleeCheck(f, 18, d.dmg, d.opt, 12);
    if (d.fire && Math.random() < 0.7) fires.push({ x: f.x - f.face * 6, z: f.z, t: 3, owner: f });
    if (t >= d.t) { setState(f, 'idle'); f.vx = 0; }
  } else if (s === 'spin') {
    f.vx = 0; f.vz = 0;
    f.spinFace = Math.floor(t * 20) % 2 ? 1 : -1;
    if (t > 0.08) {
      for (const o of enemiesOf(f)) {
        if (f.hitSet.has(o) || Math.abs(o.x - f.x) > 36 || Math.abs(o.z - f.z) > 16) continue;
        f.hitSet.add(o);
        hit(f, o, f.spinDmg, { knock: true, kb: 170, dir: sign(o.x - f.x), cause: 'hit' });
      }
    }
    if (t >= 0.5) { f.spinFace = 0; setState(f, 'idle'); }
  } else if (s === 'stomp') {
    f.vx = 0; f.vz = 0;
    if (!f.stompDone && t > 0.12 && onGround(f)) { f.stompDone = true; shockwave(f, 44, f.stompDmg); }
    if (t >= 0.6) setState(f, 'idle');
  } else if (s === 'cast') {
    f.vx = 0; f.vz = 0;
    if (t >= 0.3) setState(f, 'idle');
  } else if (s === 'roll') {
    f.vx = f.rdx * 190; f.vz = f.rdz * 110;
    if (t >= 0.35) { setState(f, 'idle'); f.vx = 0; f.vz = 0; }
  } else if (s === 'hurt') {
    f.vx = 0; f.vz = 0;
    if (t >= 0.28) setState(f, 'idle');
  } else if (s === 'stun') {
    f.vx = 0; f.vz = 0;
    if (f.stunT <= 0) setState(f, 'idle');
  } else if (s === 'fly') {
    f.vx = 0; f.vz = 0;
    if (onGround(f) && t > 0.1) { setState(f, 'down'); shake = Math.max(shake, f.isPlayer ? 2 : 0.5); blood(f.x, f.z, 2, 8, 40, 40, '#e8c890'); }
  } else if (s === 'down') {
    f.vx = 0; f.vz = 0;
    if (t >= 0.7) setState(f, 'getup');
  } else if (s === 'getup') {
    if (t >= 0.4) { setState(f, 'idle'); f.invulT = 0.5; }
  }
  physics(f, dt);
}

function physics(f, dt) {
  f.x += (f.vx + f.kx) * dt;
  f.z += f.vz * dt;
  f.kx *= Math.pow(0.01, dt);
  if (f.y > 0 || f.vy > 0) {
    f.vy -= 430 * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) { f.y = 0; f.vy = 0; }
  }
  if (f.x < 8) { f.x = 8; f.kx = Math.abs(f.kx) * 0.3; }
  if (f.x > AW - 8) { f.x = AW - 8; f.kx = -Math.abs(f.kx) * 0.3; }
  f.z = clamp(f.z, 0, DEPTH);
}

// ---------- 場地陷阱：海嘯、鯊魚、火、毒煙 ----------
function updateHazards(dt) {
  // 海嘯：先警告，然後從一邊捲到另一邊，靠海那一半的人全部遭殃
  wave.t -= dt;
  if (wave.state === 'wait' && wave.t <= 0) {
    wave.state = 'warn'; wave.t = 3; wave.dir = Math.random() < 0.5 ? 1 : -1;
    popup('海嘯要來了！快離開紅色區域！', 'bad'); sfx.rumble();
  } else if (wave.state === 'warn' && wave.t <= 0) {
    wave.state = 'go'; wave.x = wave.dir > 0 ? -140 : AW + 140;
    for (const f of fighters) f.waveHit = false;
    shake = Math.max(shake, 4); sfx.boom(0.8);
  } else if (wave.state === 'go') {
    wave.x += wave.dir * 360 * dt;
    for (let k = 0; k < 6; k++) particles.push({ x: wave.x + rnd(-10, 10), z: rnd(WAVE_Z, DEPTH), y: rnd(10, 60), vx: wave.dir * rnd(60, 200), vz: 0, vy: rnd(40, 120), c: k % 2 ? '#ffffff' : '#ff4060', life: 0.5 });
    for (const f of fighters) {
      if (!f.alive || f.waveHit || f.z < WAVE_Z || Math.abs(wave.x - f.x) > 30) continue;
      f.waveHit = true;
      f.invulT = 0;
      blood(f.x, f.z, 10, 40, 90, 120, '#c8f4ff');
      hit(null, f, f.maxHp * 0.4, { knock: true, kb: 280, up: 200, dir: wave.dir, cause: 'wave' }); // 被海嘯打到扣 4 成血
    }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].z > WAVE_Z && Math.abs(items[i].x - wave.x) < 30) items.splice(i, 1);
    if ((wave.dir > 0 && wave.x > AW + 160) || (wave.dir < 0 && wave.x < -160)) { wave.state = 'wait'; wave.t = rnd(20, 26); waveFade = 1; }
  }
  // 鯊魚：在淺水區巡邏，看到有人在水裡就衝過去咬
  for (const sk of sharks) {
    sk.cd -= dt;
    if (sk.lunge > 0) {
      sk.lunge -= dt;
      const t = sk.target;
      if (t && t.alive) {
        sk.x += sign(t.x - sk.x) * 240 * dt;
        if (Math.abs(t.x - sk.x) < 14 && t.z > WATER_Z - 6) {
          sk.lunge = 0; sk.cd = 2.5; sk.bite = 0.4;
          blood(t.x, t.z, 6, 80, 90, 120);
          splat(t.x, t.z, 5);
          hit(null, t, t.maxHp * 0.15, { bleed: 4, kb: 40, dir: sign(t.x - sk.x), cause: 'shark' });
          sfx.bite(1);
        }
      }
    } else {
      sk.x += sk.dir * 45 * dt;
      if (sk.x < 20 || sk.x > AW - 20) sk.dir = -sk.dir;
      if (sk.cd <= 0) {
        const t = fighters.find((f) => f.alive && f.z > WATER_Z - 4 && Math.abs(f.x - sk.x) < 130);
        if (t) { sk.target = t; sk.lunge = 0.7; sk.dir = sign(t.x - sk.x); }
      }
    }
    sk.bite = (sk.bite || 0) - dt;
  }
  // 天上掉鯊魚：先在目標腳下出現紅圈，然後砸下來，落地後在沙灘上亂咬一陣子
  skyT -= dt;
  if (skyT <= 0) {
    skyT = rnd(10, 14);
    const al2 = alive();
    const tg = player && player.alive && Math.random() < 0.25 ? player : al2[Math.floor(Math.random() * al2.length)];
    if (tg) {
      skyS.push({ x: clamp(tg.x + tg.vx * 0.5, 15, AW - 15), z: clamp(tg.z, 4, DEPTH - 4), y: 260, state: 'mark', t: 1.5, vy: 0, bite: 0, dir: Math.random() < 0.5 ? 1 : -1 });
      if (tg.isPlayer) popup('鯊魚瞄準你了！快閃開！', 'bad');
    }
  }
  for (let i = skyS.length - 1; i >= 0; i--) {
    const sk = skyS[i];
    sk.t -= dt;
    if (sk.state === 'mark' && sk.t <= 0) { sk.state = 'fall'; sk.vy = -300; }
    else if (sk.state === 'fall') {
      sk.vy -= 600 * dt; sk.y += sk.vy * dt;
      if (sk.y <= 0) {
        sk.y = 0; sk.state = 'flop'; sk.t = 3;
        shake = Math.max(shake, 4); sfx.bite(1); sfx.boom(0.4);
        blood(sk.x, sk.z, 4, 30, 80, 90, '#e8c890');
        for (const f of fighters) if (f.alive && Math.abs(f.x - sk.x) < 24 && Math.abs(f.z - sk.z) < 13) {
          blood(f.x, f.z, 16, 80, 100, 130); splat(f.x, f.z, 6);
          hit(null, f, f.maxHp * 0.18, { knock: true, kb: 150, up: 160, bleed: 4, dir: sign(f.x - sk.x), cause: 'shark' });
        }
      }
    } else if (sk.state === 'flop') {
      sk.bite -= dt;
      if (sk.bite <= 0) {
        sk.bite = 1.2;
        const f = fighters.find((o) => o.alive && Math.abs(o.x - sk.x) < 20 && Math.abs(o.z - sk.z) < 10);
        if (f) { sk.dir = sign(f.x - sk.x); sk.chomp = 0.25; blood(f.x, f.z, 14, 40, 70, 90); hit(null, f, f.maxHp * 0.05, { bleed: 2, kb: 60, dir: sk.dir, cause: 'shark' }); sfx.bite(0.6); }
      }
      sk.chomp = (sk.chomp || 0) - dt;
      if (sk.t <= 0) { blood(sk.x, sk.z, 6, 60, 70, 90); splat(sk.x, sk.z, 5); skyS.splice(i, 1); }
    }
  }
  // 地上的火（外送阿明的氮氣火龍）
  for (let i = fires.length - 1; i >= 0; i--) {
    const fr = fires[i];
    fr.t -= dt;
    if (fr.t <= 0) { fires.splice(i, 1); continue; }
    for (const f of fighters) if (f !== fr.owner && f.alive && Math.abs(f.x - fr.x) < 7 && Math.abs(f.z - fr.z) < 6 && f.y < 4) { f.burnT = Math.max(f.burnT, 2); f.dotBy = fr.owner; }
  }
  // 毒煙（忍者小翠）
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cl = clouds[i];
    cl.t -= dt;
    if (cl.t <= 0) { clouds.splice(i, 1); continue; }
    for (const f of fighters) if (f !== cl.owner && f.alive && Math.hypot(f.x - cl.x, (f.z - cl.z) * 2) < cl.r) { f.poisonT = Math.max(f.poisonT, 2); f.dotBy = cl.owner; f.slowT = 0.3; }
  }
}

function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.t -= dt;
    if (b.t > 0) continue;
    bombs.splice(i, 1);
    booms.push({ x: b.x, z: b.z, t: 0 });
    for (let k = 0; k < 40; k++) particles.push({ x: b.x, z: b.z, y: 6, vx: rnd(-120, 120), vz: rnd(-25, 25), vy: rnd(40, 160), c: k % 3 ? '#ff8a20' : '#ffd040', life: 0.6 });
    for (const o of enemiesOf(b.owner)) if (Math.abs(o.x - b.x) < 42 && Math.abs(o.z - b.z) < 18) hit(b.owner, o, b.dmg, { knock: true, kb: 180, up: 170, burn: 3, dir: sign(o.x - b.x) || 1, cause: 'boom' });
    shake = Math.max(shake, b.owner.isPlayer ? 5 : 2); sfx.boom(b.owner.isPlayer ? 0.8 : 0.4);
    splat(b.x, b.z, 7);
  }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.4) rings.splice(i, 1); }
  for (let i = booms.length - 1; i >= 0; i--) { booms[i].t += dt; if (booms[i].t > 0.5) booms.splice(i, 1); }
}
const booms = [];
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    let done = s.life <= 0;
    if (s.kind === 'dumbbell') {
      s.p += dt / s.dur;
      const p = Math.min(1, s.p);
      s.x = s.sx + (s.tx - s.sx) * p; s.z = s.sz + (s.tz - s.sz) * p; s.y = 24 + Math.sin(p * Math.PI) * 60 - p * 24;
      if (p >= 1) {
        done = true;
        shake = Math.max(shake, 3); sfx.boom(0.5);
        blood(s.x, s.z, 4, 20, 60, 60, '#e8c890');
        for (const f of enemiesOf(s.owner)) if (Math.hypot(f.x - s.x, (f.z - s.z) * 2) < 28) hit(s.owner, f, s.dmg, { knock: true, kb: 130, dir: sign(f.x - s.x) });
      }
    } else {
      if (s.target && s.target.alive) {
        s.vx += sign(s.target.x - s.x) * 900 * dt; s.vx = clamp(s.vx, -260, 260);
        s.vz += clamp((s.target.z - s.z) * 8, -200, 200) * dt;
      }
      if (s.grav) { s.vy -= 300 * dt; }
      s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt;
      if (s.grav && s.y <= 2) done = true;
      for (const f of enemiesOf(s.owner)) {
        if (Math.abs(f.x - s.x) > 10 || Math.abs(f.z - s.z) > 9 || Math.abs(f.y + 16 - s.y) > 22) continue;
        const dir = sign(s.vx);
        if (s.kind === 'hook') {
          // 肉鉤：把人勾到面前
          hit(s.owner, f, s.dmg, { stun: 0.8, kb: 0, dir });
          f.x = clamp(s.owner.x + s.owner.face * 16, 8, AW - 8); f.z = s.owner.z;
        } else if (s.kind === 'fireball') hit(s.owner, f, s.dmg, { knock: true, kb: 140, dir, burn: 2, cause: 'burn' });
        else if (s.kind === 'coconut') hit(s.owner, f, s.dmg, { stun: ITEMS.coconut.stun, kb: 80, dir });
        else if (s.kind === 'bottle') { hit(s.owner, f, s.dmg, { bleed: ITEMS.bottle.bleed, kb: 60, dir }); for (let k = 0; k < 10; k++) particles.push({ x: s.x, z: s.z, y: s.y, vx: rnd(-60, 60), vz: rnd(-20, 20), vy: rnd(20, 80), c: '#7ad890', life: 0.6 }); }
        else hit(s.owner, f, s.dmg, { kb: 50, dir });
        done = true;
        break;
      }
    }
    if (s.kind === 'fireball' && Math.random() < 0.8) particles.push({ x: s.x, z: s.z, y: s.y, vx: rnd(-20, 20), vz: 0, vy: rnd(0, 30), c: Math.random() < 0.5 ? '#ffb020' : '#ff4a10', life: 0.3 });
    if (done) shots.splice(i, 1);
  }
}

// ---------- 主迴圈 ----------
function update(dt) {
  time += dt;
  if (hitstop > 0) { hitstop -= dt; return; }
  if (phase === 'intro') { phaseT -= dt; if (phaseT <= 0) { phase = 'fight'; popup('開打！', 'kill'); sfx.beep(true); } }
  if (phase === 'fight' || phase === 'over') gameT += dt;
  if (phase === 'fight') {
    itemT -= dt;
    if (itemT <= 0) { itemT = rnd(4, 6.5); if (items.length < 4) spawnItem(); }
    updateHazards(dt);
  }
  for (const f of fighters) {
    if (!f.alive) continue;
    const c = phase === 'intro' ? { mx: 0, my: 0 } : f.isPlayer ? (autoPilot ? autoControl() : playerControl(dt)) : aiControl(f, dt);
    stepFighter(f, c, dt);
  }
  // 互相推開
  const al = alive();
  for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
    const a = al[i], b = al[j];
    const dx = b.x - a.x, dz = (b.z - a.z) * 2, d = Math.hypot(dx, dz);
    if (d < 10 && d > 0.01) { const p = (10 - d) / 2; a.x -= (dx / d) * p; b.x += (dx / d) * p; a.z -= (dz / d) * p * 0.25; b.z += (dz / d) * p * 0.25; }
  }
  updateShots(dt);
  updateBombs(dt);
  for (const it of items) {
    if (it.beam > 0) it.beam -= dt;
    if (it.y > 0 || it.vy > 0) {
      it.vy -= 400 * dt; it.y += it.vy * dt;
      if (it.y <= 0) { it.y = 0; it.vy = 0; for (let k = 0; k < 12; k++) particles.push({ x: it.x, z: it.z, y: 1, vx: rnd(-50, 50), vz: rnd(-8, 8), vy: rnd(20, 60), c: '#e8c890', life: 0.5 }); }
    }
  }
  // 提示：附近有道具、手上空空時告訴玩家怎麼撿
  if (player && player.alive && !player.weapon && hintN < 2 && items.some((i) => i.y < 2 && Math.abs(i.x - player.x) < 70 && Math.abs(i.z - player.z) < 40)) showHint('走到發光的道具上就會自動撿起來');
  else hideHint();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy -= (p.blood ? 320 : 60) * dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.y <= 0) { if (p.blood && Math.random() < 0.3) splat(p.x, clamp(p.z, 0, DEPTH), 1); particles.splice(i, 1); }
    else if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i];
    c.life -= dt;
    if (c.y > 0 || c.vy > 0) {
      c.vy -= 380 * dt; c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt; c.rot += dt * 12 * sign(c.vx);
      if (c.y <= 0) { c.y = 0; c.vy = c.vy < -80 ? -c.vy * 0.3 : 0; c.vx *= 0.4; splat(c.x, clamp(c.z, 0, DEPTH), 3); }
    }
    if (c.life <= 0) chunks.splice(i, 1);
  }
  for (const c of corpses) if (c.fount > 0) { c.fount -= dt; blood(c.x - c.f.face * 10, c.z, 4, 3, 30, 110 * Math.min(1, c.fount)); }
  for (const b of bolts) b.t += dt;
  for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].t > 0.3) bolts.splice(i, 1);
  for (let i = nums.length - 1; i >= 0; i--) { nums[i].t += dt; if (nums[i].t > 0.8) nums.splice(i, 1); }
  // 勝負
  if (phase === 'fight' && al.length <= 1) { phase = 'over'; if (al[0]) al[0].place = 1; setTimeout(endGame, 1800); if (al[0] && al[0].isPlayer) popup('你是最後的倖存者！', 'kill'); }
  // 攝影機
  const v = player.alive ? player : (al[0] || player);
  const want = clamp(v.x - W / 2 + v.face * 18, 0, AW - W);
  camX += (want - camX) * Math.min(1, 6 * dt);
  shake = Math.max(0, shake - dt * 14);
  waveFade = Math.max(0, waveFade - dt);
  flash -= dt;
  splatA = Math.max(0, splatA - dt * 0.6);
  $('splat').style.opacity = splatA;
  updateButtons();
}

let ended = false;
function endGame() {
  if (ended) return;
  ended = true;
  phase = 'over';
  const won = player.alive && alive().length <= 1;
  $('resRank').textContent = won ? '🏆 你是唯一的倖存者！' : `💀 第 ${player.place || alive().length + 1} 名`;
  $('resRank').className = won ? 'win' : 'lose';
  const winner = alive()[0];
  $('resBody').innerHTML = `
    <div class="row"><span>冠軍</span><b>${won ? '你' : winner ? winner.name : '無人生還'}</b></div>
    <div class="row"><span>你的擊殺</span><b>${player.kills}</b></div>
    <div class="row"><span>時間</span><b>${Math.floor(gameT / 60)}:${String(Math.floor(gameT % 60)).padStart(2, '0')}</b></div>`;
  $('result').classList.remove('hidden');
  $('touch').classList.add('hidden');
}

// ---------- 畫面 ----------
const SX = (x) => Math.round(x - camX + (shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0));
const SY = (z, y = 0) => Math.round(FLOOR_Y + z * ZS - y);
let panoC = null;
function drawBackground() {
  if (!panoC && ART.PANO.swim) {
    const src = ART.PANO.swim, h = FLOOR_Y + 6, w = Math.round((src.width * h) / src.height);
    panoC = document.createElement('canvas'); panoC.width = w * 2; panoC.height = h;
    const x = panoC.getContext('2d'); x.imageSmoothingEnabled = true;
    x.drawImage(src, 0, 0, w, h); x.save(); x.translate(w * 2, 0); x.scale(-1, 1); x.drawImage(src, 0, 0, w, h); x.restore();
  }
  if (panoC) {
    const off = -((camX * 0.3) % panoC.width);
    g.drawImage(panoC, Math.round(off), 0); g.drawImage(panoC, Math.round(off + panoC.width), 0);
  } else { g.fillStyle = '#ff8a50'; g.fillRect(0, 0, W, FLOOR_Y); }
  // 後排的椰子樹、遮陽傘
  const prop = ART.A.prop_beach;
  if (prop) {
    g.imageSmoothingEnabled = true;
    const ph = 46, pw = (prop.width * ph) / prop.height;
    for (let x = -60; x < AW + 120; x += 150) {
      const sx = Math.round(x - camX * 0.85);
      if (sx > -pw && sx < W) g.drawImage(prop, sx, FLOOR_Y - ph + 6, pw, ph);
    }
    g.imageSmoothingEnabled = false;
  }
}
function drawFloor() {
  g.drawImage(floor, Math.round(camX), 0, W, FH, 0, FLOOR_Y, W, FH);
  // 海浪拍打的白線
  const wy = SY(WATER_Z);
  for (let x = 0; x < W; x += 2) {
    const o = Math.round(Math.sin((x + camX) * 0.06 + time * 2.5) * 2 + Math.sin((x + camX) * 0.021 - time) * 1.5);
    g.fillStyle = '#ffffff'; g.fillRect(x, wy + o, 2, 1);
    g.fillStyle = '#bfeaff'; g.fillRect(x, wy + o + 1, 2, 1);
  }
  if (wave.state === 'warn') drawWaveWarning();
  if (wave.state === 'go' || waveFade > 0) {
    // 海嘯經過的地方被海水淹過
    const a = wave.state === 'go' ? 0.4 : waveFade * 0.4;
    g.fillStyle = `rgba(40,110,220,${a})`;
    const y0 = SY(WAVE_Z), x0 = wave.state === 'go' ? (wave.dir > 0 ? 0 : SX(wave.x)) : 0, x1 = wave.state === 'go' ? (wave.dir > 0 ? SX(wave.x) : W) : W;
    g.fillRect(Math.max(0, x0), y0, Math.max(0, Math.min(W, x1) - Math.max(0, x0)), SY(DEPTH) - y0 + 4);
  }
}
// 海嘯警告：危險區畫紅色斜紋、邊界線，海水慢慢漲到會淹到的位置，來的方向閃大箭頭
function drawWaveWarning() {
  const k = 1 - wave.t / 3, y0 = SY(WAVE_Z), y1 = SY(DEPTH) + 4;
  g.fillStyle = 'rgba(255,0,30,0.22)'; g.fillRect(0, y0, W, y1 - y0);
  g.fillStyle = 'rgba(255,40,60,0.35)';
  const off = Math.floor(time * 30) % 12;
  for (let y = y0; y < y1; y++) for (let x = -12 + ((y - y0 + off) % 12); x < W; x += 12) g.fillRect(x, y, 5, 1);
  const wy = SY(WATER_Z), ry = Math.round(wy + (y0 - wy) * k);
  g.fillStyle = 'rgba(60,140,240,0.55)'; g.fillRect(0, ry, W, wy - ry);
  for (let x = 0; x < W; x += 2) { g.fillStyle = '#ffffff'; g.fillRect(x, ry + Math.round(Math.sin(x * 0.2 + time * 8)), 2, 1); }
  for (let x = 0; x < W; x += 8) { g.fillStyle = Math.floor(time * 8 + x / 8) % 2 ? '#ff2040' : '#ffffff'; g.fillRect(x, y0 - 1, 5, 2); }
  if (Math.floor(time * 5) % 2) {
    const left = wave.dir > 0, ay = Math.round((y0 + y1) / 2);
    g.fillStyle = '#ff2040';
    for (let i = 0; i < 12; i++) g.fillRect(left ? 2 + i : W - 3 - i, ay - 12 + i, 1, 24 - i * 2);
  }
  const n = String(Math.ceil(wave.t));
  drawText(g, 'TSUNAMI', W / 2 - textW('TSUNAMI', 2) / 2, y0 + 6, 2, '#ffffff');
  drawText(g, n, W / 2 - textW(n, 4) / 2, y0 + 20, 4, '#ff2040');
}
function drawShadow(x, z, w) {
  g.fillStyle = 'rgba(40,20,10,0.35)';
  const sx = SX(x), sy = SY(z);
  g.fillRect(sx - w, sy - 1, w * 2, 2);
  g.fillRect(sx - w + 2, sy - 2, w * 2 - 4, 1);
}
function render() {
  drawBackground();
  drawFloor();
  // 依前後順序畫
  const list = [];
  for (const it of items) list.push({ z: it.z, d: () => drawItem(it) });
  for (const c of corpses) list.push({ z: c.z - 0.5, d: () => drawFighter(g, c.f, SX(c.x), SY(c.z), time, { headless: true }) });
  for (const f of fighters) if (f.alive) list.push({ z: f.z, d: () => drawOne(f) });
  for (const s of shots) list.push({ z: s.z, d: () => drawShot(s) });
  for (const c of chunks) list.push({ z: c.z, d: () => { drawShadow(c.x, c.z, 3); g.save(); g.translate(SX(c.x), SY(c.z, c.y + 5)); g.rotate(c.rot); drawHead(g, c.f, [0, 0], c.f.face); dot(g, 0, 5, 2.4, '#c01028'); g.restore(); } });
  for (const sk of sharks) list.push({ z: DEPTH - 6, d: () => drawShark(sk) });
  for (const sk of skyS) list.push({ z: sk.z, d: () => drawSkyShark(sk) });
  for (const b of bombs) list.push({ z: b.z, d: () => { const sx = SX(b.x), sy = SY(b.z); g.fillStyle = OUT; g.fillRect(sx - 6, sy - 11, 12, 11); g.fillStyle = '#f08a20'; g.fillRect(sx - 5, sy - 10, 10, 9); g.fillStyle = Math.floor(time * 16) % 2 ? '#ff2020' : '#ffffff'; g.fillRect(sx - 1, sy - 15, 2, 4); } });
  list.sort((a, b) => a.z - b.z);
  for (const e of list) e.d();
  for (const fr of fires) { g.fillStyle = Math.floor(time * 12 + fr.x) % 2 ? '#ff6a14' : '#ffd040'; g.fillRect(SX(fr.x) - 2, SY(fr.z) - 4, 4, 4); }
  for (const cl of clouds) {
    g.globalAlpha = 0.45;
    for (let k = 0; k < 6; k++) dot(g, SX(cl.x + Math.cos(k + time) * cl.r * 0.6), SY(cl.z + Math.sin(k * 2) * 10, 10 + Math.sin(time * 2 + k) * 4), 12, k % 2 ? '#4ab04a' : '#6a6a7a');
    g.globalAlpha = 1;
  }
  for (const p of particles) { g.fillStyle = p.c; g.fillRect(SX(p.x), SY(p.z, p.y), 2, 2); }
  for (const b of bolts) {
    let x = SX(b.x1), y = SY(b.z1, b.y1);
    const ex = SX(b.x2), ey = SY(b.z2, b.y2);
    for (let i = 1; i <= 6; i++) {
      const nx = x + (ex - x) / (7 - i) + rnd(-5, 5), ny = y + (ey - y) / (7 - i) + rnd(-5, 5);
      seg(g, x, y, i === 6 ? ex : nx, i === 6 ? ey : ny, 3, '#7ad8ff'); seg(g, x, y, i === 6 ? ex : nx, i === 6 ? ey : ny, 1, '#ffffff');
      x = nx; y = ny;
    }
  }
  if (wave.state === 'go') drawWave();
  for (const rg of rings) {
    const k = rg.t / 0.4, rr = rg.r * (0.3 + k);
    g.globalAlpha = 1 - k; g.fillStyle = '#ffffff';
    for (let a = 0; a < Math.PI * 2; a += 0.12) g.fillRect(SX(rg.x + Math.cos(a) * rr), SY(rg.z + Math.sin(a) * rr * 0.42), 2, 2);
    g.globalAlpha = 1;
  }
  for (const b of booms) {
    const im = ART.A.fx_boom, k = b.t / 0.5;
    if (im) { const h = 60 * (0.5 + k); const w = (im.width * h) / im.height; g.globalAlpha = 1 - k * k; g.imageSmoothingEnabled = true; g.drawImage(im, SX(b.x) - w / 2, SY(b.z) - h * 0.75, w, h); g.imageSmoothingEnabled = false; g.globalAlpha = 1; }
  }
  for (const n of nums) drawText(g, String(n.v), SX(n.x) - textW(String(n.v), 1) / 2, SY(n.z, n.y + n.t * 20), 1, n.c);
  drawHud();
  if (flash > 0) { g.fillStyle = `rgba(${flashCol},0.5)`; g.fillRect(0, 0, W, H); }
}
function drawOne(f) {
  drawShadow(f.x, f.z, 7);
  const sx = SX(f.x), sy = SY(f.z, f.y);
  if (f.invulT > 0 && f.state === 'idle' && Math.floor(time * 20) % 2) return;
  if (f.z > WATER_Z && f.y < 2) {
    // 在水裡：下半身泡在水中
    g.save(); g.beginPath(); g.rect(sx - 30, sy - 60, 60, 52); g.clip();
    drawFighter(g, f, sx, sy, time);
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(sx - 8, sy - 8, 16, 1);
  } else drawFighter(g, f, sx, sy, time);
  if (f.frozenT > 0) { g.fillStyle = 'rgba(150,220,255,0.5)'; g.fillRect(sx - 9, sy - 40, 18, 40); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(sx - 9, sy - 40, 18, 2); }
  if (f.stunT > 0) for (let k = 0; k < 3; k++) { g.fillStyle = '#ffe000'; g.fillRect(Math.round(sx + Math.cos(time * 8 + k * 2) * 7), Math.round(sy - 40 + Math.sin(time * 8 + k * 2) * 2), 2, 2); }
  // 頭上的血條與標記
  const bw = 16, hp = clamp(f.hp / f.maxHp, 0, 1);
  g.fillStyle = OUT; g.fillRect(sx - bw / 2 - 1, sy - 46, bw + 2, 3);
  g.fillStyle = f.isPlayer ? '#40e070' : '#ff3040'; g.fillRect(sx - bw / 2, sy - 45, Math.round(bw * hp), 1);
  if (f.isPlayer) { g.fillStyle = '#ffe000'; const yy = sy - 53 + Math.round(Math.sin(time * 6)); g.fillRect(sx - 2, yy, 5, 2); g.fillRect(sx - 1, yy + 2, 3, 1); g.fillRect(sx, yy + 3, 1, 1); }
}
function drawItem(it) {
  const gx = SX(it.x), gy = SY(it.z);
  // 從天上掉下來時有一道光柱
  if (it.beam > 0) {
    g.globalAlpha = Math.min(1, it.beam) * 0.35;
    g.fillStyle = '#fff6a0'; g.fillRect(gx - 5, 0, 10, gy);
    g.fillStyle = '#ffffff'; g.fillRect(gx - 2, 0, 4, gy);
    g.globalAlpha = 1;
  }
  // 地上一圈會閃的光
  const pulse = 0.5 + Math.sin(time * 6 + it.x) * 0.5;
  g.globalAlpha = 0.45 + pulse * 0.4;
  g.fillStyle = it.kind === 'magic' ? '#c080ff' : '#ffe000';
  for (let a = 0; a < Math.PI * 2; a += 0.35) g.fillRect(Math.round(gx + Math.cos(a + time * 2) * (11 + pulse * 2)), Math.round(gy + Math.sin(a + time * 2) * (4 + pulse)), 2, 1);
  g.globalAlpha = 1;
  drawShadow(it.x, it.z, 5);
  const sx = gx, sy = SY(it.z, it.y + 6 + Math.sin(time * 4 + it.x) * 2);
  g.save(); g.translate(sx, sy); g.scale(1.6, 1.6);
  if (it.kind === 'magic') { const im = ART.A.icon_qbox; if (im) { g.imageSmoothingEnabled = true; g.drawImage(im, -7, -10, 14, 14); g.imageSmoothingEnabled = false; } }
  else drawWeapon(g, it.kind, [-6, 0], 1.3, 1);
  g.restore();
  // 上面一個跳動的箭頭
  if (it.y < 2) { g.fillStyle = '#ffe000'; const ay = sy - 26 + Math.round(Math.sin(time * 6) * 2); for (let i = 0; i < 4; i++) g.fillRect(sx - 3 + i, ay + i, 7 - i * 2, 1); }
}
function drawShot(s) {
  const sx = SX(s.x), sy = SY(s.z, s.y);
  drawShadow(s.x, s.z, 3);
  if (s.kind === 'shuriken') {
    const a = time * 25;
    for (let k = 0; k < 4; k++) seg(g, sx, sy, sx + Math.cos(a + k * 1.57) * 4, sy + Math.sin(a + k * 1.57) * 4, 1.6, '#c8c8d8');
  } else if (s.kind === 'dumbbell') {
    seg(g, sx - 5, sy, sx + 5, sy, 2, '#5a5a6a'); dot(g, sx - 5, sy, 3, '#2a2a3a'); dot(g, sx + 5, sy, 3, '#2a2a3a');
  } else if (s.kind === 'hook') {
    seg(g, SX(s.owner.x + s.owner.face * 8), SY(s.owner.z, s.owner.y + 20), sx, sy, 1, '#b0b0c0');
    seg(g, sx, sy, sx + sign(s.vx) * 3, sy + 3, 1.6, '#e0e0f0');
  } else if (s.kind === 'fireball') {
    const im = ART.A.fx_fireball;
    if (im) { g.imageSmoothingEnabled = true; g.save(); g.translate(sx, sy); if (s.vx < 0) g.scale(-1, 1); g.drawImage(im, -9, -8, 18, 16); g.restore(); g.imageSmoothingEnabled = false; }
  } else drawWeapon(g, s.kind, [sx, sy], time * 15, 1);
}
function drawShark(sk) {
  const sx = SX(sk.x), sy = SY(DEPTH - 6);
  if (sx < -20 || sx > W + 20) return;
  const d = sk.lunge > 0 ? 1 : 0;
  g.fillStyle = OUT;
  for (let i = 0; i < 9; i++) g.fillRect(sx - (sk.dir > 0 ? 6 : -6) + (sk.dir > 0 ? i * 0.6 : -i * 0.6) - 1, sy - 9 + i, Math.max(2, 9 - i) + 2, 1);
  g.fillStyle = '#5a6a7e';
  for (let i = 0; i < 8; i++) g.fillRect(sx - (sk.dir > 0 ? 5 : -5) + (sk.dir > 0 ? i * 0.6 : -i * 0.6), sy - 8 + i, Math.max(1, 8 - i), 1);
  g.fillStyle = '#ffffff';
  g.fillRect(sx - 8, sy, 16, 1);
  if (d || sk.bite > 0) { g.fillStyle = '#ffffff'; g.fillRect(sx - 10 + Math.random() * 4, sy - 2, 3, 1); }
  if (sk.bite > 0) { dot(g, sx, sy - 4, 5, '#8a0016'); g.fillStyle = '#ffffff'; g.fillRect(sx - 4, sy - 6, 2, 2); g.fillRect(sx + 2, sy - 6, 2, 2); }
}
// 鯊魚（側面）：rot 旋轉角度、open 嘴巴張開
function sharkBody(x, y, dir, rot, open) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(dir, 1);
  seg(g, -12, 0, 10, 0, 10, OUT); seg(g, -12, 0, 10, 0, 8, '#6a7a8e');
  seg(g, -10, 2, 8, 2, 4, '#e8eef4');
  for (let i = 0; i < 6; i++) g.fillRect(-2 + i * 0.5, -9 + i, 6 - i, 1);
  g.fillStyle = '#6a7a8e'; for (let i = 0; i < 5; i++) g.fillRect(-1 + i * 0.5, -8 + i, 4 - i, 1);
  seg(g, -12, 0, -18, -6, 3, '#6a7a8e'); seg(g, -12, 0, -18, 5, 3, '#6a7a8e');
  g.fillStyle = '#000'; g.fillRect(6, -2, 1, 1);
  if (open) { g.fillStyle = '#8a0016'; g.fillRect(8, 0, 6, 4); g.fillStyle = '#fff'; g.fillRect(8, 0, 1, 1); g.fillRect(10, 0, 1, 1); g.fillRect(12, 0, 1, 1); g.fillRect(9, 3, 1, 1); g.fillRect(11, 3, 1, 1); }
  g.restore();
}
function drawSkyShark(sk) {
  const gx = SX(sk.x), gy = SY(sk.z);
  if (sk.state === 'mark' || sk.state === 'fall') {
    // 地上的紅色瞄準圈越縮越小
    const k = sk.state === 'mark' ? 1 - sk.t / 1.5 : 1;
    g.fillStyle = Math.floor(time * 10) % 2 ? '#ff2040' : '#ffffff';
    const rr = 26 - k * 8;
    for (let a = 0; a < Math.PI * 2; a += 0.2) g.fillRect(Math.round(gx + Math.cos(a) * rr), Math.round(gy + Math.sin(a) * rr * 0.45), 2, 1);
    g.fillStyle = 'rgba(255,0,40,0.25)'; g.fillRect(gx - rr, gy - 4, rr * 2, 8);
    drawText(g, '!', gx - 1, gy - 18 - Math.round(Math.sin(time * 10) * 2), 2, '#ff2040');
  }
  if (sk.state === 'fall') { drawShadow(sk.x, sk.z, 10); sharkBody(gx, SY(sk.z, sk.y + 10), sk.dir, Math.PI / 2 * sk.dir, true); }
  if (sk.state === 'flop') {
    drawShadow(sk.x, sk.z, 12);
    const wob = Math.sin(time * 14 + sk.x) * 0.25;
    sharkBody(gx, gy - 6 - Math.abs(Math.sin(time * 7)) * 3, sk.dir, wob, sk.chomp > 0 || Math.floor(time * 4) % 2 === 0);
  }
}
function drawWave() {
  const im = ART.A[`wall_tsunami${Math.floor(time * 6) % 2}`];
  const top = SY(WAVE_Z) - 75, bot = SY(DEPTH) + 8;
  const h = bot - top;
  const sx = SX(wave.x);
  if (im) {
    const w = (im.width * h) / im.height;
    g.imageSmoothingEnabled = true;
    g.save(); g.translate(sx, top); if (wave.dir < 0) g.scale(-1, 1); g.drawImage(im, -w * 0.85, 0, w, h); g.restore();
    g.imageSmoothingEnabled = false;
  } else { g.fillStyle = '#b00020'; g.fillRect(sx - 60, top, 60, h); }
}
const PORT = {};
function drawHud() {
  // 六個人的頭像與血條
  const cols = 3, cw = Math.floor((W - 8) / cols);
  fighters.forEach((f, i) => {
    const x = 4 + (i % cols) * cw, y = 4 + Math.floor(i / cols) * 17;
    g.fillStyle = f.isPlayer ? '#ffd000' : OUT; g.fillRect(x, y, cw - 3, 15);
    g.fillStyle = '#2a1840'; g.fillRect(x + 1, y + 1, cw - 5, 13);
    const pi = ART.A[`${f.type}_portrait`];
    if (pi) { g.imageSmoothingEnabled = true; g.globalAlpha = f.alive ? 1 : 0.3; g.drawImage(pi, x + 1, y + 1, 13, 13); g.globalAlpha = 1; g.imageSmoothingEnabled = false; }
    g.fillStyle = f.look.top; g.fillRect(x + 1, y + 12, 13, 2);
    const bw = cw - 22, hp = clamp(f.hp / f.maxHp, 0, 1);
    g.fillStyle = '#3a2a50'; g.fillRect(x + 16, y + 4, bw, 4);
    g.fillStyle = !f.alive ? '#3a2a50' : hp > 0.5 ? '#40e070' : hp > 0.25 ? '#ffd000' : '#ff3040';
    g.fillRect(x + 16, y + 4, Math.round(bw * hp), 4);
    if (!f.alive) drawText(g, 'KO', x + 16 + bw / 2 - 3, y + 3, 1, '#ff4050', null);
    else if (f.kills) drawText(g, 'x' + f.kills, x + 16, y + 9, 1, '#ffb0c0', null);
  });
  // 畫面外的人：在左右邊緣標箭頭
  for (const f of fighters) {
    if (!f.alive || f.isPlayer) continue;
    const sx = f.x - camX;
    if (sx >= 0 && sx <= W) continue;
    const y = SY(f.z, 20), left = sx < 0;
    g.fillStyle = '#ff3040';
    for (let i = 0; i < 4; i++) g.fillRect(left ? 2 + i : W - 3 - i, y - 3 + i, 1, 7 - i * 2);
  }
  // 電腦版：技能冷卻
  if (!IS_TOUCH && player) {
    ['near', 'far', 'area'].forEach((slot, k) => {
      const x = W - 84 + k * 27, y = H - 28;
      g.fillStyle = OUT; g.fillRect(x - 1, y - 1, 26, 26); g.fillStyle = '#2a1840'; g.fillRect(x, y, 24, 24);
      const ic = skIcon(SKILLS[player.type][slot][1]);
      const cd = Math.max(0, player.cd[slot]);
      if (ic) { g.imageSmoothingEnabled = true; g.globalAlpha = cd > 0 ? 0.35 : 1; g.drawImage(ic, x + 2, y + 2, 20, 20); g.globalAlpha = 1; g.imageSmoothingEnabled = false; }
      if (cd > 0) drawText(g, String(Math.ceil(cd)), x + 12 - textW(String(Math.ceil(cd)), 2) / 2, y + 7, 2, '#ffffff');
      drawText(g, 'UIO'[k], x + 1, y + 1, 1, '#ffd000', null);
    });
  }
  if (phase === 'intro') { const n = Math.ceil(phaseT); if (n > 0 && n <= 2) drawText(g, String(n), W / 2 - 15, H * 0.4, 10, '#ffffff'); }
}

// 手機按鈕：技能圖示與冷卻秒數
const lastBtn = {};
const WICON = {};
function weaponIcon(kind) {
  if (WICON[kind]) return WICON[kind];
  const c = document.createElement('canvas'); c.width = c.height = 40;
  const x = c.getContext('2d'); x.translate(20, 22); x.scale(2, 2);
  drawWeapon(x, kind, [-6, 0], 1.3, 1);
  return (WICON[kind] = c.toDataURL());
}
function setupButtons() {
  for (const [slot, id] of [['near', 'bNear'], ['far', 'bFar'], ['area', 'bArea']]) {
    const [nm, ic] = SKILLS[player.type][slot];
    const b = $(id);
    const im = skIcon(ic);
    if (im) b.style.backgroundImage = `url(${im.toDataURL()})`;
    b.querySelector('span').textContent = nm;
  }
}
function updateButtons() {
  if (!IS_TOUCH || !player) return;
  for (const [slot, id] of [['near', 'bNear'], ['far', 'bFar'], ['area', 'bArea']]) {
    const cd = Math.max(0, Math.ceil(player.cd[slot]));
    if (lastBtn[slot] === cd) continue;
    lastBtn[slot] = cd;
    const b = $(id);
    b.querySelector('i').textContent = cd > 0 ? cd : '';
    b.classList.toggle('cool', cd > 0);
  }
  const rc = player.rollCd > 0;
  if (lastBtn.roll !== rc) { lastBtn.roll = rc; $('bDodge').classList.toggle('cool', rc); }
  const wk = player.weapon ? player.weapon.kind + player.weapon.uses : '';
  if (lastBtn.wk !== wk) {
    lastBtn.wk = wk;
    const b = $('bAtk');
    if (player.weapon) {
      const it = ITEMS[player.weapon.kind];
      b.innerHTML = `<span style="font-size:13px">${it.throw ? '丟' + it.name : it.name + '×' + player.weapon.uses}</span>`;
      b.style.backgroundImage = `url(${weaponIcon(player.weapon.kind)})`;
      b.classList.add('armed');
    } else { b.textContent = '攻擊！'; b.style.backgroundImage = ''; b.classList.remove('armed'); }
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (phase !== 'select' && !window.__pause) update(dt);
  if (phase === 'select') { drawBackground(); drawFloor(); } else render();
}

// ---------- 選角 ----------
function buildSelect() {
  const box = $('cards');
  TYPES.forEach((type, i) => {
    const card = document.createElement('button');
    card.className = 'card';
    const sk = SKILLS[type];
    card.innerHTML = `<div class="num">${i + 1}</div><img class="portrait" src="${ART.A[`${type}_portrait`] ? ART.A[`${type}_portrait`].toDataURL() : ''}"><div class="nm">${NAME[type]}</div>
      <div class="sk"><b>近</b>${sk.near[0]}　<b>遠</b>${sk.far[0]}　<b>範圍</b>${sk.area[0]}</div>`;
    card.onclick = () => startGame(type);
    box.appendChild(card);
  });
  addEventListener('keydown', (e) => { if (phase !== 'select') return; const n = parseInt(e.key, 10); if (n >= 1 && n <= 4) box.children[n - 1].click(); });
}
ART.ready.then(() => {
  if (ART.LOGO) { const l = $('logo'); l.src = ART.LOGO.src; l.classList.remove('hidden'); $('title').classList.add('hidden'); }
  buildSelect();
  requestAnimationFrame(frame);
}).catch((e) => { console.error(e); buildSelect(); requestAnimationFrame(frame); });

// 手機：擋掉捲動、雙指縮放、雙擊縮放、長按選單
(() => {
  const inScreen = (e) => e.target.closest && e.target.closest('.screen');
  document.addEventListener('touchmove', (e) => { if (!inScreen(e) || e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastEnd < 350 && !inScreen(e)) e.preventDefault(); lastEnd = n; }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
})();

// ---------- 除錯與自動試玩 ----------
window.dbg = {
  TUNE, stats, keys, touch,
  get player() { return player; }, get fighters() { return fighters; }, get skyS() { return skyS; }, setSkyT(v) { skyT = v; }, get phase() { return phase; }, get wave() { return wave; }, get items() { return items; },
  autopilot(casual = false) { autoPilot = casual ? 'casual' : 'pro'; }, manual() { autoPilot = false; },
  start(i) { ended = false; $('result').classList.add('hidden'); startGame(TYPES[i]); },
  advance(sec) { for (let i = 0; i < sec * 60; i++) update(1 / 60); render(); },
  run(maxSec = 300) {
    for (let i = 0; i < maxSec * 60 && !(phase === 'over'); i++) update(1 / 60);
    return { won: player.alive && alive().length <= 1, place: player.alive ? 1 : player.place, kills: player.kills, time: +gameT.toFixed(1), cause: { ...stats.cause }, hp: Math.round(player.hp) };
  },
  render,
};
