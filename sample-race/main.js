// 打人三項：超任式偽 3D 像素賽車（單車關）
// 重點是砍殺：自動前進、轉彎有輔助、撞不出路面，道具很多
import { Pix, OUT, drawText, textW } from './pix.js';
import {
  T, HALF, STEP, START_S, FINISH_S, SHORT, ITEM_ROWS, SLOW, pointAt, curveAt,
  buildGround, buildScenery, chunkCol, ckey, grass, typeAt, paintSplat, paintSkid, PADS,
} from './track.js';
import * as S from './sprites.js';
import * as S2 from './sprites2.js';
import { sfx, initAudio } from '../src/audio.js';

// ---------- 畫面設定（手機直式 / 橫式） ----------
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const PORTRAIT = innerHeight > innerWidth;
const W = PORTRAIT ? 240 : 384, H = PORTRAIT ? 320 : 216, HZ = PORTRAIT ? 108 : 72;
const BASE_F = PORTRAIT ? 150 : 210, CAM_BACK = PORTRAIT ? 40 : 58, CAM_H = PORTRAIT ? 36 : 32;
document.body.classList.add(PORTRAIT ? 'portrait' : 'landscape');
if (IS_TOUCH) document.body.classList.add('touch');

const cv = document.getElementById('c');
cv.width = W; cv.height = H;
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;
const PANEL_H = PORTRAIT && IS_TOUCH ? 210 : 0;
function fit() {
  // 手機瀏覽器網址列會讓 100vh 不準，直接用實際高度
  document.documentElement.style.height = document.body.style.height = innerHeight + 'px';
  const availH = innerHeight - PANEL_H;
  let k = Math.min(innerWidth / W, availH / H);
  if (!IS_TOUCH && k >= 2) k = Math.floor(k);
  const gw = W * k, gh = H * k;
  const box = document.getElementById('game');
  box.style.width = gw + 'px';
  box.style.height = gh + 'px';
  cv.style.width = gw + 'px';
  cv.style.height = gh + 'px';
  if (PANEL_H) document.getElementById('touch').style.height = Math.max(PANEL_H, innerHeight - gh) + 'px';
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(() => location.reload(), 300));
fit();

const $ = (id) => document.getElementById(id);
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

buildGround();
const scenery = buildScenery();
const SCN_IMG = {
  tree: [S.TREE, 26], pine: [S.PINE, 30], rock: [S.ROCK, 9], chevL: [S.CHEV_L, 12], chevR: [S.CHEV_R, 12],
  crowd: [S.CROWD[0], 13], jump: [S.SIGN_JUMP, 11], short: [S.SIGN_SHORT, 11],
  archStart: [S.ARCH_START, 56], archGoal: [S.ARCH_GOAL, 56],
};
const PANO_W = PORTRAIT ? 1200 : 1600;
const PANO = S.makePanorama(PANO_W, HZ + 1);
const SKULL = (() => { const p = new Pix(10, 10); p.ell(5, 4, 4, 3.6, '#ffffff'); p.rect(3, 6, 4, 3, '#ffffff'); p.rect(2, 3, 2, 2, OUT); p.rect(6, 3, 2, 2, OUT); p.set(4, 8, OUT); p.set(5, 6, OUT); p.outline(OUT); return p.canvas(); })();

// ---------- 道具表 ----------
// power：越高越強，名次越後面越容易抽到。ai：電腦也會拿到
const ITEM = {
  axe: { name: '斧頭', icon: S.ICONS.axe, power: 0.6, base: 1.0, ai: true },
  oil: { name: '油漬', icon: S.ICONS.oil, power: 0.1, base: 0.3, ai: true },
  spikes: { name: '釘刺路障', icon: S.ICONS.spikes, power: 0.2, base: 0.35, ai: true },
  adren: { name: '腎上腺素', icon: S.ICONS.adren, power: 0.2, base: 0.45, ai: true },
  fireball: { name: '火球術', icon: S2.ICONS2.fireball, power: 0.6, base: 1.0, ai: true },
  chain: { name: '連鎖閃電', icon: S2.ICONS2.chain, power: 0.9, base: 0.9 },
  freeze: { name: '冰凍術', icon: S2.ICONS2.freeze, power: 0.8, base: 0.8 },
  gas: { name: '毒氣彈', icon: S2.ICONS2.gas, power: 0.5, base: 0.8 },
  darts: { name: '毒鏢', icon: S2.ICONS2.darts, power: 0.5, base: 1.0, ai: true },
  missile: { name: '追蹤飛彈', icon: S2.ICONS2.missile, power: 0.7, base: 0.9, ai: true },
  laser: { name: '雷射砲', icon: S2.ICONS2.laser, power: 0.8, base: 0.8 },
  drone: { name: '戰鬥無人機', icon: S2.ICONS2.drone, power: 0.9, base: 0.7 },
  storm: { name: '召喚雷暴', icon: S2.ICONS2.storm, power: 1.0, base: 0.5 },
  blizzard: { name: '暴風雪', icon: S2.ICONS2.blizzard, power: 0.8, base: 0.45 },
  acid: { name: '酸雨', icon: S2.ICONS2.acid, power: 1.0, base: 0.45 },
};
const ITEM_IDS = Object.keys(ITEM);
const ITEM_URL = {};
for (const id of ITEM_IDS) ITEM_URL[id] = ITEM[id].icon.toDataURL();

// ---------- 遊戲狀態 ----------
const N = 30;
const NAMES = ['暴躁阿明', '憂鬱小美', '中二老王', '佛系阿華', '社畜阿強', '禿頭小翠', '鹹魚志明', '熬夜春嬌', '厭世阿伯',
  '狂暴阿姨', '嘴砲小胖', '邪惡阿傑', '爆肝大頭', '阿宅阿呆', '火爆小強', '冷血阿花', '傻笑老李', '肌肉阿德', '瘦皮小玉',
  '胖胖阿樂', '暴走阿翔', '陰沉阿美', '鐵頭阿財', '跛腳阿福', '血手阿龍', '尖叫小琪', '光頭阿彬', '毒舌阿珠', '神經阿凱'];
let racers = [], player = null;
let phase = 'select', countT = 0, raceT = 0, time = 0;
let camX = 0, camY = 0, camA = 0, camF = BASE_F, camHgt = CAM_H, shake = 0, stopT = 0, flash = 0, flashCol = '255,255,255';
let finishCount = 0, startBoostOk = false;
let weather = null;
const particles = [], chunks = [], corpses = [], hazards = [], shots = [], slashes = [];
const booms = [], bolts = [], tracers = [], clouds = [];
const boxes = [];
for (const s of ITEM_ROWS.concat(ITEM_ROWS.map((x) => x + 520)).filter((s) => s < FINISH_S - 100)) {
  const p = pointAt(s);
  for (let k = 0; k < 6; k++) {
    const u = (k - 2.5) * 15;
    boxes.push({ x: p.x + Math.cos(p.h) * u, y: p.y + Math.sin(p.h) * u, on: true, t: 0 });
  }
}

function makeRacer(i, type, isPlayer) {
  const base = S.CHARS[type];
  const look = S.lookFor(type, isPlayer ? null : Math.random());
  const hp = isPlayer ? base.stats.hp : Math.round(base.stats.hp * TUNE.aiHp);
  return {
    id: i, isPlayer, type, name: isPlayer ? '你' : NAMES[i % NAMES.length], look,
    imgs: S.bikerSet(look), corpse: S.makeCorpse(look), head: S.makeHead(look),
    x: 0, y: 0, a: 0, va: 0, v: 0, za: 0, vza: 0, kx: 0, ky: 0, si: 0, s: 0, u: 0, steerS: 0,
    hp, maxHp: hp, stats: base.stats, alive: true,
    items: [], itemT: 0, roll: 0, skillCd: 3, boostT: 0, boostPow: 1,
    drift: { on: false, dir: 0, charge: 0 }, stunT: 0, slowT: 0, invulnT: 0, hitT: 0,
    frozenT: 0, poisonT: 0, poisonBy: null, poisonTick: 0, droneT: 0, droneTick: 0, laserT: 0,
    melee: 0, meleeTick: 0, punchCd: 0, punchT: 0, chargeT: 0, lastHit: -9,
    finished: false, finishOrder: 0, kills: 0, streak: 0, streakT: 0, lean: 0, pedal: Math.random() * 2,
    respawnT: 0, dripT: 0, rank: i + 1, deaths: 0,
    ai: isPlayer ? null : {
      lane: (Math.random() * 2 - 1) * 0.7, laneT: 2 + Math.random() * 3, skill: 0.9 + Math.random() * 0.1,
      aggr: Math.random(), short: Math.random() < 0.4, shortState: 0, itemDelay: 1 + Math.random() * 3,
    },
  };
}

function startRace(type) {
  racers = [];
  const playerSlot = 21;
  for (let i = 0; i < N; i++) {
    const isP = i === playerSlot;
    const r = makeRacer(i, isP ? type : S.TYPES[Math.floor(Math.random() * 4)], isP);
    const row = Math.floor(i / 5), col = i % 5;
    const s = START_S - 14 - row * 18;
    const p = pointAt(s);
    const u = (col - 2) * 16 + (row % 2) * 4;
    r.x = p.x + Math.cos(p.h) * u;
    r.y = p.y + Math.sin(p.h) * u;
    r.a = r.va = p.h;
    r.si = Math.round(s / STEP);
    r.s = s;
    racers.push(r);
    if (isP) player = r;
  }
  phase = 'count';
  countT = 3.6;
  camA = player.a;
  $('select').classList.add('hidden');
  if (IS_TOUCH) $('touch').classList.remove('hidden');
  initAudio();
}

// ---------- 輸入 ----------
const keys = {};
const edge = { item: false, skill: false, punch: false };
const touch = { steer: 0, back: false, drift: false, slash: false };
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'Space') edge.item = true;
  if (e.code === 'KeyE') edge.skill = true;
  if (e.code === 'KeyF' || e.code === 'KeyJ') edge.punch = true;
  if (phase === 'count' && countT < 1.6 && countT > 0.6) startBoostOk = true;
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

function setupTouch() {
  const pad = $('steerPad'), knob = $('steerKnob');
  let id = null, x0 = 0;
  pad.addEventListener('pointerdown', (e) => { id = e.pointerId; x0 = e.clientX; pad.setPointerCapture(id); });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const d = clamp((e.clientX - x0) / 50, -1, 1);
    touch.steer = Math.abs(d) < 0.12 ? 0 : d;
    knob.style.transform = `translateX(${d * 46}px)`;
  });
  const end = (e) => { if (e.pointerId !== id) return; id = null; touch.steer = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  const hold = (el, key, onDown) => {
    const b = $(el);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); touch[key] = true; b.classList.add('on'); if (onDown) onDown(); if (phase === 'count' && countT < 1.6 && countT > 0.6) startBoostOk = true; });
    const up = () => { touch[key] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  };
  const tap = (el, fn) => $(el).addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  hold('btnBack', 'back');
  hold('btnDrift', 'drift');
  hold('btnSlash', 'slash', () => { edge.punch = true; });
  tap('btnItem', () => { edge.item = true; });
  tap('btnSkill', () => { edge.skill = true; });
}
setupTouch();

function playerControl() {
  const k = keys;
  const kSteer = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  const c = {
    steer: kSteer || touch.steer,
    brake: !!(k.KeyS || k.ArrowDown || touch.back),
    drift: !!(k.ShiftLeft || k.ShiftRight || k.KeyK || touch.drift),
    item: edge.item, skill: edge.skill,
    punch: edge.punch || ((touch.slash || k.KeyF || k.KeyJ) && player.punchCd <= 0),
  };
  edge.item = edge.skill = edge.punch = false;
  return c;
}

// ---------- 畫面上的中文提示 ----------
function popup(text, cls = '') {
  const d = document.createElement('div');
  d.className = 'pop ' + cls;
  d.textContent = text;
  const box = $('pops');
  box.appendChild(d);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => d.remove(), 1100);
}
function feed(text, mine) {
  const d = document.createElement('div');
  d.textContent = '💀 ' + text;
  if (mine) d.className = 'mine';
  const f = $('feed');
  f.prepend(d);
  while (f.children.length > 4) f.lastChild.remove();
  setTimeout(() => d.remove(), 4000);
}
let splatA = 0;
function screenSplat(a) {
  splatA = Math.min(0.85, splatA + a);
  const blobs = [];
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 100, y = Math.random() * 100, r = 8 + Math.random() * 16;
    blobs.push(`radial-gradient(circle at ${x}% ${y}%, rgba(150,0,0,.95) 0, rgba(120,0,0,.85) ${r}%, transparent ${r + 3}%)`);
  }
  $('splat').style.background = blobs.join(',');
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (r, d = 120) => Math.hypot(r.x - player.x, r.y - player.y) < d;
const vol = (x, y) => clamp(1 - Math.hypot(x - player.x, y - player.y) / 260, 0, 1);
const enemies = (r) => racers.filter((o) => o !== r && o.alive && !o.finished);

// ---------- 血與死亡 ----------
function blood(x, y, z, n, spd, up, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random());
    particles.push({
      x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: up * (0.4 + Math.random()),
      c: col || ['#ff2040', '#d0102a', '#8a0016', '#ff6070'][i & 3], blood: !col, life: 3,
    });
  }
  if (particles.length > 2600) particles.splice(0, particles.length - 2600);
}

function hurt(t, amt, by, kx = 0, ky = 0, cause = 'hit', quiet = false) {
  if (!t.alive || t.invulnT > 0 || t.finished) return;
  if (t.frozenT > 0 && cause !== 'poison') { amt *= 3; cause = 'ice'; }
  if (by && !by.isPlayer && t.isPlayer) amt *= TUNE.aiToPlayer;
  if (by && !by.isPlayer && !t.isPlayer) amt *= TUNE.aiToAi;
  t.hp -= amt;
  t.hitT = 0.15;
  t.lastHit = time;
  if (by && by !== t) t.lastAttacker = by;
  t.kx += kx; t.ky += ky;
  if (!quiet) {
    blood(t.x, t.y, 10 + t.za, Math.min(50, 10 + amt * 0.6), 60, 80);
    if (t.isPlayer) { screenSplat(0.3); shake = Math.max(shake, 3); sfx.punch(1); }
    else sfx.punch(by && by.isPlayer ? 1 : vol(t.x, t.y) * 0.6);
  }
  if (t.hp <= 0) killRacer(t, by && by !== t ? by : t.lastAttacker, cause);
}

const stats = { cause: {}, ai: {}, byPlayer: 0, byAi: 0, none: 0 };
function killRacer(t, by, cause) {
  stats.cause[cause] = (stats.cause[cause] || 0) + 1;
  if (by && by.isPlayer) stats.byPlayer++; else if (by) { stats.byAi++; const k = by.type + ':' + cause; stats.ai[k] = (stats.ai[k] || 0) + 1; } else stats.none++;
  t.alive = false;
  t.drift.on = false;
  t.deaths++;
  const fire = cause === 'boom' || cause === 'fire';
  if (cause === 'ice') {
    blood(t.x, t.y, 12, 70, 120, 150, '#bfefff');
    blood(t.x, t.y, 12, 70, 100, 140);
    booms.push({ x: t.x, y: t.y, r: 14, t: 0, kind: 'ice' });
  } else if (cause === 'poison') {
    blood(t.x, t.y, 10, 60, 70, 120, '#5aff3a');
    blood(t.x, t.y, 10, 120, 90, 140);
  } else {
    blood(t.x, t.y, 12 + t.za, fire ? 240 : 170, fire ? 150 : 110, fire ? 220 : 160);
  }
  chunks.push({ img: t.head, x: t.x, y: t.y, z: 16, vx: rnd(-50, 50), vy: rnd(-50, 50), vz: fire ? 230 : 150, life: 8, wh: 4 });
  for (let i = 0; i < (fire ? 4 : 2); i++) chunks.push({ img: S.LIMB, x: t.x, y: t.y, z: 10, vx: rnd(-80, 80), vy: rnd(-80, 80), vz: fire ? 200 : 110, life: 7, wh: 3.5 });
  paintSplat(t.x, t.y, fire ? 14 : 11, 1);
  for (let i = 0; i < 5; i++) paintSplat(t.x + rnd(-14, 14), t.y + rnd(-14, 14), rnd(3, 7), 0.9);
  corpses.push({ img: t.corpse, x: t.x, y: t.y, fount: 2.6 });
  if (corpses.length > 90) corpses.shift();
  if (!t.isPlayer && by && by.isPlayer && Math.random() < TUNE.lootChance) boxes.push({ x: t.x, y: t.y, on: true, t: 0, loot: true }); // 死掉會掉寶
  sfx.splat(t.isPlayer || (by && by.isPlayer) ? 1 : vol(t.x, t.y));
  if (by && by !== t) {
    by.kills++;
    feed(`${by.name} 殺了 ${t.name}`, by.isPlayer || t.isPlayer);
    if (by.isPlayer) {
      by.hp = Math.min(by.maxHp, by.hp + TUNE.killHeal);
      by.streak = by.streakT > 0 ? by.streak + 1 : 1;
      by.streakT = 3;
      const words = ['擊殺！', '雙殺！', '三殺！', '四殺！', '大屠殺！'];
      popup(words[Math.min(by.streak, 5) - 1] + (by.streak >= 5 ? ` x${by.streak}` : ''), 'kill');
      stopT = 0.06; flash = 0.05; flashCol = '255,255,255';
      if (near(t, 60)) screenSplat(0.4);
    }
  } else feed(`${t.name} 慘死`, t.isPlayer);
  if (near(t, 70)) shake = Math.max(shake, 4);
  if (t.isPlayer) {
    t.respawnT = 2.2;
    screenSplat(1);
    popup('你被殺了！', 'bad');
  }
}

function respawn(r) {
  const p = pointAt(Math.max(START_S, r.s - 30));
  Object.assign(r, { alive: true, hp: r.maxHp, x: p.x, y: p.y, a: p.h, va: p.h, v: 0, za: 0, vza: 0, kx: 0, ky: 0, invulnT: 2.5, stunT: 0, melee: 0, frozenT: 0, poisonT: 0 });
  r.si = Math.round(Math.max(START_S, r.s - 30) / STEP);
  popup('復活！');
}

function explode(x, y, rad, dmg, owner, kind = 'boom') {
  booms.push({ x, y, r: rad, t: 0, kind });
  for (const o of racers) {
    if (o === owner || !o.alive || o.finished) continue;
    const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy);
    if (d < rad) hurt(o, dmg * (1 - (0.4 * d) / rad) * (owner && !owner.isPlayer ? 0.6 : 1), owner, (dx / (d || 1)) * 200, (dy / (d || 1)) * 200, 'boom');
  }
  paintSplat(x, y, rad * 0.4, 0.5);
  const v = vol(x, y);
  sfx.boom(v);
  shake = Math.max(shake, 6 * v);
}

// 閃電：從 a 打到 b（z 是高度）
function bolt(x1, y1, z1, x2, y2, z2) {
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n, j = i === 0 || i === n ? 0 : 1;
    pts.push([x1 + (x2 - x1) * t + rnd(-6, 6) * j, y1 + (y2 - y1) * t + rnd(-6, 6) * j, z1 + (z2 - z1) * t + rnd(-4, 4) * j]);
  }
  bolts.push({ pts, t: 0 });
}

// ---------- 道具與技能 ----------
function rollItem(r) {
  const alive = racers.filter((o) => o.alive).length;
  const frac = (r.rank - 1) / Math.max(1, alive - 1);
  const ids = r.isPlayer ? ITEM_IDS : ITEM_IDS.filter((id) => ITEM[id].ai);
  let sum = 0;
  const w = ids.map((id) => { const v = ITEM[id].base * (0.6 + frac * ITEM[id].power * 1.2); sum += v; return v; });
  let x = Math.random() * sum;
  for (let i = 0; i < ids.length; i++) { x -= w[i]; if (x <= 0) return ids[i]; }
  return ids[0];
}
function boost(r, t, pow) {
  if (r.boostT <= 0) r.boostPow = 1;
  r.boostT = Math.max(r.boostT, t);
  r.boostPow = Math.max(r.boostPow, pow);
}
function nearestAhead(r, range = 320) {
  let best = null, bd = 1e9;
  for (const o of racers) {
    if (o === r || !o.alive || o.finished) continue;
    const ds = o.s - r.s;
    if (ds < -10 || ds > range) continue;
    const d = dist(o, r);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function useItem(r) {
  const it = r.items.shift();
  r.itemT = 0;
  if (!it) return;
  const fx = Math.sin(r.a), fy = -Math.cos(r.a), bx = -fx, by = -fy;
  const rx = Math.cos(r.a), ry = Math.sin(r.a);
  const msg = (t) => { if (r.isPlayer) popup(t, 'skill'); };
  switch (it) {
    case 'axe': r.melee = r.isPlayer ? 6 : 3; r.meleeTick = 0; msg('斧頭狂砍！'); break;
    case 'adren': boost(r, 1.8, 1.55); msg('腎上腺素！'); break;
    case 'oil': hazards.push({ type: 'oil', x: r.x + bx * 16, y: r.y + by * 16, owner: r, arm: 0.6, life: 30 }); break;
    case 'spikes':
      for (const u of [-14, -5, 5, 14]) hazards.push({ type: 'spikes', x: r.x + bx * 14 + rx * u, y: r.y + by * 14 + ry * u, owner: r, arm: 0.6, life: 30 });
      break;
    case 'fireball':
      for (const da of [-0.12, 0, 0.12]) shots.push({ kind: 'fireball', x: r.x + fx * 8, y: r.y + fy * 8, z: 8, a: r.a + da, spd: 380, life: 2, owner: r, target: null });
      msg('火球術！'); break;
    case 'darts':
      for (let k = -3; k <= 3; k++) shots.push({ kind: 'dart', x: r.x, y: r.y, z: 9, a: r.a + k * 0.14, spd: 460, life: 1.3, owner: r, target: null });
      msg('毒鏢！'); break;
    case 'missile': {
      const tg = nearestAhead(r, 700);
      for (let k = 0; k < 2; k++) shots.push({ kind: 'missile', x: r.x, y: r.y, z: 12, a: r.a + (k ? 0.4 : -0.4), spd: 340, life: 4, owner: r, target: tg });
      msg('追蹤飛彈！'); break;
    }
    case 'chain': {
      let src = r, hit = new Set([r]), first = true;
      for (let n = 0; n < TUNE.chainTargets; n++) {
        let best = null, bd = first ? 220 : 90;
        for (const o of racers) {
          if (hit.has(o) || !o.alive || o.finished) continue;
          const d = dist(o, src);
          if (d < bd) { bd = d; best = o; }
        }
        if (!best) break;
        bolt(src.x, src.y, 12, best.x, best.y, 12);
        hurt(best, 70, r, 0, 0, 'shock');
        hit.add(best); src = best; first = false;
      }
      flash = 0.08; flashCol = '180,240,255';
      sfx.boom(0.5);
      msg('連鎖閃電！'); break;
    }
    case 'freeze':
      for (const o of enemies(r)) if (dist(o, r) < 80) { o.frozenT = 3; o.v = 0; }
      booms.push({ x: r.x, y: r.y, r: 40, t: 0, kind: 'ice' });
      flash = 0.08; flashCol = '200,240,255';
      msg('冰凍術！打碎他們！'); break;
    case 'gas':
      clouds.push({ x: r.x + bx * 10, y: r.y + by * 10, r: 30, t: 7, owner: r });
      clouds.push({ x: r.x + fx * 30, y: r.y + fy * 30, r: 30, t: 7, owner: r });
      msg('毒氣彈！'); break;
    case 'laser': r.laserT = 1.6; msg('雷射砲！'); break;
    case 'drone': r.droneT = 10; r.droneTick = 0; msg('戰鬥無人機出動！'); break;
    case 'storm': case 'blizzard': case 'acid':
      weather = { type: it, t: TUNE.weatherT, owner: r, tick: 0 };
      if (r.isPlayer) popup({ storm: '召喚雷暴！', blizzard: '暴風雪！', acid: '酸雨來了！' }[it], 'skill');
      else if (r.isPlayer === false && near(r, 2000)) popup(`${r.name} 改變了天氣！`, 'bad');
      break;
  }
}
function useSkill(r) {
  r.skillCd = r.isPlayer ? TUNE.skillCd : 22;
  const m = r.isPlayer ? 1 : 0.5; // 電腦的技能比較弱
  if (r.type === 'muscle') { boost(r, 1.2, 1.75); r.chargeT = 1.2; if (r.isPlayer) popup('蠻牛衝撞！', 'skill'); }
  else if (r.type === 'courier') { boost(r, 2.6, 1.6); r.chargeT = 2.6; if (r.isPlayer) popup('超級氮氣！撞飛他們！', 'skill'); }
  else if (r.type === 'butcher') {
    slashes.push({ x: r.x, y: r.y, t: 0, owner: r, big: true });
    for (const o of enemies(r)) {
      const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
      if (d < (r.isPlayer ? 34 : 22)) hurt(o, 90 * m, r, (dx / (d || 1)) * 180, (dy / (d || 1)) * 180, 'slash');
    }
    if (r.isPlayer) { popup('迴旋大砍！', 'skill'); shake = Math.max(shake, 4); }
  } else if (r.type === 'ninja') {
    const ahead = enemies(r).filter((o) => o.s > r.s - 20 && o.s < r.s + 500).sort((a, b) => dist(a, r) - dist(b, r));
    const nShots = r.isPlayer ? 6 : 2;
    for (let k = 0; k < nShots; k++) shots.push({ kind: 'shuriken', x: r.x, y: r.y, z: 10, a: r.a + (k - (nShots - 1) / 2) * 0.25, spd: 420, life: 3, owner: r, target: ahead[k % Math.max(1, ahead.length)] || null });
    if (r.isPlayer) popup('追蹤飛鏢！', 'skill');
  }
}
// 基本攻擊：揮砍，打到身邊所有人
function slash(r) {
  if (r.punchCd > 0) return;
  r.punchCd = r.isPlayer ? TUNE.slashCd : 1.1;
  r.punchT = 0.2;
  const rad = r.isPlayer ? TUNE.slashRange : 15;
  slashes.push({ x: r.x, y: r.y, t: 0, owner: r, big: false });
  let hits = 0;
  for (const o of enemies(r)) {
    const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
    if (d < rad) { hurt(o, r.isPlayer ? TUNE.slashDmg : 14, r, (dx / (d || 1)) * 130, (dy / (d || 1)) * 130, 'slash'); hits++; }
  }
  return hits;
}

// ---------- AI ----------
function wantItem(r, it, foe, fd) {
  const ahead = nearestAhead(r, 260);
  switch (it) {
    case 'axe': return fd < 26 || r.itemT > 5;
    case 'fireball': case 'darts': case 'missile': case 'laser': case 'chain': return !!ahead || r.itemT > 3;
    case 'freeze': case 'gas': return fd < 45 || r.itemT > 5;
    case 'oil': case 'spikes': return r.itemT > (r.ai ? r.ai.itemDelay : 1);
    default: return r.itemT > 0.4;
  }
}
function aiControl(r, dt) {
  const ai = r.ai;
  const c = { steer: 0, brake: false, drift: false, item: false, skill: false, punch: false };
  ai.laneT -= dt;
  if (ai.laneT <= 0) { ai.laneT = 2 + Math.random() * 3; ai.lane = clamp(ai.lane + (Math.random() - 0.5) * 0.6, -0.75, 0.75); }
  const look = r.s + 55 + Math.max(0, r.v) * 0.22;
  const p = pointAt(look);
  let tx = p.x + Math.cos(p.h) * ai.lane * (HALF - 12), ty = p.y + Math.sin(p.h) * ai.lane * (HALF - 12);
  const pad = PADS.find((q) => q.s > r.s + 30 && q.s < r.s + 160);
  if (pad && ai.skill > 0.95) { const q = pointAt(pad.s); tx = q.x + Math.cos(q.h) * pad.u; ty = q.y + Math.sin(q.h) * pad.u; }
  if (ai.short && r.s > SHORT.s0 - 140 && r.s < SHORT.s1 - 40) {
    if (ai.shortState === 0 && Math.hypot(r.x - SHORT.p0.x, r.y - SHORT.p0.y) < 30) ai.shortState = 1;
    if (r.s > SHORT.s0 - 40 || ai.shortState === 1) {
      const eh = T.hs[Math.round(SHORT.s1 / STEP)];
      tx = ai.shortState === 1 ? SHORT.p1.x + Math.sin(eh) * 40 : SHORT.p0.x;
      ty = ai.shortState === 1 ? SHORT.p1.y - Math.cos(eh) * 40 : SHORT.p0.y;
    }
  } else ai.shortState = 0;

  let foe = null, fd = 1e9;
  for (const o of racers) {
    if (o === r || !o.alive || o.finished) continue;
    const d = dist(o, r);
    if (d < fd) { fd = d; foe = o; }
  }
  if (foe && (r.melee > 0 || r.chargeT > 0 || (r.isPlayer && fd < 60)) && fd < 60 && foe.s > r.s - 30) { tx = foe.x; ty = foe.y; }
  const diff = wrap(Math.atan2(tx - r.x, -(ty - r.y)) - r.a);
  c.steer = clamp(diff * 2.6, -1, 1);
  if (Math.abs(diff) > 1.1 && r.v > 150) c.hold = true;
  if (r.finished && r.s > FINISH_S + 60) c.hold = true;

  const calm = raceT < 5;
  if (!calm && foe && fd < (r.isPlayer ? TUNE.slashRange : 15)) {
    if (r.isPlayer ? r.punchCd <= 0 : Math.random() < 0.012 * ai.aggr) c.punch = true;
  }
  if (r.items.length && !r.roll && !calm) c.item = wantItem(r, r.items[0], foe, fd);
  if (r.skillCd <= 0 && (r.isPlayer ? !calm : raceT > 12)) {
    if (r.type === 'butcher') c.skill = fd < 30 && (r.isPlayer || Math.random() < 0.03);
    else if (r.type === 'ninja') c.skill = !!nearestAhead(r, 300);
    else c.skill = r.isPlayer ? fd < 80 : Math.abs(curveAt(r.s + 80)) < 0.001 && Math.random() < 0.01;
  }
  return c;
}

// ---------- 每個選手的移動 ----------
function stepRacer(r, c, dt) {
  r.punchCd -= dt; r.punchT -= dt; r.invulnT -= dt; r.hitT -= dt; r.slowT -= dt; r.skillCd -= dt; r.chargeT -= dt;
  r.streakT -= dt;
  if (r.items.length) r.itemT += dt;
  if (r.roll > 0) {
    r.roll -= dt;
    if (r.roll <= 0) { r.roll = 0; if (r.isPlayer) { sfx.pickup(); popup(ITEM[r.items[r.items.length - 1]].name + '！'); } }
  }
  // 中毒
  if (r.poisonT > 0) {
    r.poisonT -= dt;
    r.poisonTick -= dt;
    if (Math.random() < 0.4) particles.push({ x: r.x + rnd(-3, 3), y: r.y + rnd(-3, 3), z: rnd(6, 14), vx: 0, vy: 0, vz: 25, c: '#7aff5a', life: 0.5 });
    if (r.poisonTick <= 0) { r.poisonTick = 0.25; hurt(r, 3, r.poisonBy, 0, 0, 'poison', true); if (!r.alive) return; }
  }
  // 冰凍
  if (r.frozenT > 0) {
    r.frozenT -= dt;
    r.v = 0;
    r.drift.on = false;
    return;
  }
  const terr = r.za > 0 ? 1 : typeAt(r.x, r.y);
  const rubber = r.ai && !r.isPlayer ? clamp(1 - (r.s - player.s) / 2600, 0.88, 1.1) : 1;
  let vmax = r.stats.speed * (r.ai && !r.isPlayer ? r.ai.skill * rubber : 1) * SLOW[terr];
  if (r.slowT > 0) vmax *= 0.5;
  if (r.boostT > 0) { r.boostT -= dt; vmax = Math.max(vmax, r.stats.speed * r.boostPow); }
  if (phase !== 'race') c = { steer: 0, brake: false, drift: false, hold: true };

  r.steerS += ((c.steer || 0) - r.steerS) * Math.min(1, TUNE.steerSmooth * dt);
  if (r.stunT > 0) {
    r.stunT -= dt;
    r.a += 9 * dt;
    r.v *= Math.pow(0.3, dt);
    r.drift.on = false;
  } else {
    // 自動前進；按後退會快速倒車
    if (c.hold) r.v *= Math.pow(0.2, dt);
    else if (c.brake) r.v += (-r.stats.speed * TUNE.reverse - r.v) * Math.min(1, 3.2 * dt);
    else r.v += (vmax - r.v) * Math.min(1, r.stats.accel * dt * (r.boostT > 0 ? 3 : 1));
    if (r.v > vmax) r.v += (vmax - r.v) * Math.min(1, 1.6 * dt);
    const turn = TUNE.turn * clamp(Math.abs(r.v) / 70, 0.5, 1);
    if (r.drift.on) {
      r.a += (r.drift.dir * 1.0 + r.steerS * 0.7) * dt * Math.min(1, r.v / 120);
      r.drift.charge += dt;
      if (r.isPlayer) {
        paintSkid(r.x - Math.sin(r.va) * 6, r.y + Math.cos(r.va) * 6);
        const lvl = r.drift.charge > 1.4 ? 2 : r.drift.charge > 0.7 ? 1 : 0;
        if (Math.random() < 0.8) {
          const col = ['#ffe8a0', '#60c8ff', '#ff8a20'][lvl];
          for (const side of [-1, 1]) particles.push({
            x: r.x - Math.sin(r.va) * 7 + Math.cos(r.va) * side * 3, y: r.y + Math.cos(r.va) * 7 + Math.sin(r.va) * side * 3, z: 1,
            vx: rnd(-30, 30), vy: rnd(-30, 30), vz: rnd(40, 80), c: col, life: 0.35,
          });
        }
      }
      if (!c.drift || r.v < 80) {
        const ch = r.drift.charge;
        r.drift.on = false;
        if (ch > 1.4) { boost(r, 1.2, 1.5); if (r.isPlayer) { popup('超級甩尾加速！', 'skill'); sfx.pickup(); } }
        else if (ch > 0.7) { boost(r, 0.6, 1.38); if (r.isPlayer) popup('甩尾加速！'); }
      }
    } else {
      r.a += r.steerS * turn * dt * (r.v < 0 ? -1 : 1);
      // 轉彎輔助：沒在轉的時候，車頭慢慢對齊賽道
      if (Math.abs(c.steer || 0) < 0.1 && r.v > 40 && !r.onShortcut) {
        r.a += wrap(T.hs[r.si] - r.a) * Math.min(1, TUNE.assist * dt);
      }
      if (c.drift && Math.abs(c.steer || 0) > 0.2 && r.v > 110 && r.za <= 0) {
        r.drift = { on: true, dir: Math.sign(c.steer), charge: 0 };
        r.vza = 40; r.za = 0.1;
        if (r.isPlayer) sfx.slip();
      }
    }
  }
  const grip = r.drift.on ? 2.4 : 10;
  r.va += wrap(r.a - r.va) * Math.min(1, grip * dt);
  r.x += Math.sin(r.va) * r.v * dt + r.kx * dt;
  r.y += -Math.cos(r.va) * r.v * dt + r.ky * dt;
  const kd = Math.pow(0.02, dt);
  r.kx *= kd; r.ky *= kd;
  if (r.za > 0 || r.vza > 0) {
    r.vza -= 300 * dt;
    r.za += r.vza * dt;
    if (r.za <= 0) {
      if (r.vza < -120 && near(r, 80)) shake = Math.max(shake, 2);
      r.za = 0; r.vza = 0;
    }
  }
  if (r.za <= 0 && phase === 'race') {
    if (terr === 3 && r.boostT < 0.7) { boost(r, 0.9, 1.45); if (r.isPlayer) sfx.pickup(); }
    if (terr === 4 && r.v > 90) { r.vza = 60 + r.v * 0.3; r.za = 0.1; if (r.isPlayer) popup('跳！'); }
  }
  r.pedal += Math.abs(r.v) * dt * 0.05;
  const leanT = r.drift.on ? r.drift.dir : r.steerS * 0.8;
  r.lean += (leanT - r.lean) * Math.min(1, 8 * dt);

  if (r.hp < r.maxHp && time - r.lastHit > 3) r.hp = Math.min(r.maxHp, r.hp + (r.isPlayer ? 5 : 6) * dt);
  if (r.hp < r.maxHp * 0.5) {
    r.dripT -= dt;
    if (r.dripT <= 0) { r.dripT = 0.05; paintSplat(r.x + rnd(-2, 2), r.y + rnd(-2, 2), 1.3, 0.9); }
  }
  // 斧頭：一直轉圈砍
  if (r.melee > 0) {
    r.melee -= dt;
    r.meleeTick -= dt;
    if (r.meleeTick <= 0) {
      r.meleeTick = r.isPlayer ? 0.3 : 0.6;
      for (const o of enemies(r)) {
        const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
        if (d < 24) hurt(o, 45, r, (dx / (d || 1)) * 150, (dy / (d || 1)) * 150, 'slash');
      }
    }
  }
  // 衝撞技能：撞到就噴飛
  if (r.chargeT > 0) {
    for (const o of enemies(r)) {
      if (o.chargedBy === r && time - o.chargedT < 1.5) continue;
      const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
      if (d < 16) { o.chargedBy = r; o.chargedT = time; hurt(o, r.isPlayer ? 60 : 30, r, (dx / (d || 1)) * 280, (dy / (d || 1)) * 280, 'boom'); }
    }
  }
  // 雷射砲
  if (r.laserT > 0) {
    r.laserT -= dt;
    const fx = Math.sin(r.a), fy = -Math.cos(r.a);
    for (const o of enemies(r)) {
      const dx = o.x - r.x, dy = o.y - r.y;
      const along = dx * fx + dy * fy, lat = Math.abs(dx * fy * -1 + dy * fx);
      if (along > 0 && along < 260 && lat < 10 && (o.laserCd || 0) < time) { o.laserCd = time + 0.2; hurt(o, 45, r, fx * 60, fy * 60, 'fire'); }
    }
  }
  // 無人機
  if (r.droneT > 0) {
    r.droneT -= dt;
    r.droneTick -= dt;
    if (r.droneTick <= 0) {
      r.droneTick = 0.3;
      const dpos = dronePos(r);
      let best = null, bd = 110;
      for (const o of enemies(r)) { const d = dist(o, dpos); if (d < bd) { bd = d; best = o; } }
      if (best) { tracers.push({ x1: dpos.x, y1: dpos.y, z1: dpos.z, x2: best.x, y2: best.y, z2: 10, t: 0 }); hurt(best, 24, r, 0, 0, 'hit'); }
    }
  }
  if (c.item && r.items.length && !r.roll) useItem(r);
  if (c.skill && r.skillCd <= 0) useSkill(r);
  if (c.punch) slash(r);
}
const dronePos = (r) => ({ x: r.x + Math.cos(time * 3) * 10, y: r.y + Math.sin(time * 3) * 10, z: 26 });

const sceneryByS = scenery;
for (const o of scenery) {
  let best = 0, bd = 1e18;
  for (let i = 0; i < T.n; i += 4) { const d = (T.xs[i] - o.x) ** 2 + (T.ys[i] - o.y) ** 2; if (d < bd) { bd = d; best = i; } }
  o.s = best * STEP;
}
sceneryByS.sort((a, b) => a.s - b.s);
function nearbyScenery(s) {
  let lo = 0, hi = scenery.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (scenery[m].s < s - 60) lo = m + 1; else hi = m; }
  const out = [];
  for (let i = lo; i < scenery.length && scenery[i].s < s + 60; i++) out.push(scenery[i]);
  return out;
}

function inShortcut(x, y, margin = 20) {
  const px = x - SHORT.p0.x, py = y - SHORT.p0.y;
  const t = px * SHORT.dx + py * SHORT.dy, lat = -px * SHORT.dy + py * SHORT.dx;
  return t > -12 && t < SHORT.len + 12 && Math.abs(lat) < margin;
}

let wallHits = 0;
function updateProgress(r) {
  let best = r.si, bd = 1e18;
  const search = (lo, hi) => {
    for (let i = Math.max(0, lo); i <= Math.min(T.n - 1, hi); i++) {
      const dx = T.xs[i] - r.x, dy = T.ys[i] - r.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
  };
  search(r.si - 15, r.si + 60);
  if (bd > (HALF + 30) ** 2) search(r.si + 61, r.si + 450);
  r.si = best;
  r.s = best * STEP;
  const ch = Math.cos(T.hs[best]), sh = Math.sin(T.hs[best]);
  r.u = (r.x - T.xs[best]) * ch + (r.y - T.ys[best]) * sh;
  r.onShortcut = false;
  if (r.atWall) r.atWall--;
  if (r.s > SHORT.s0 - 60 && r.s < SHORT.s1 + 60 && inShortcut(r.x, r.y, 26)) {
    const px = r.x - SHORT.p0.x, py = r.y - SHORT.p0.y;
    const t = px * SHORT.dx + py * SHORT.dy;
    if (Math.sqrt(bd) > HALF + 10 && t > 0 && t < SHORT.len) {
      r.s = SHORT.s0 + (t / SHORT.len) * (SHORT.s1 - SHORT.s0);
      r.si = Math.round(r.s / STEP);
    }
    r.onShortcut = true;
    // 捷徑兩側也有牆
    const lat = -px * SHORT.dy + py * SHORT.dx;
    if (Math.abs(lat) > 18 && Math.sqrt(bd) > HALF + 10) {
      const over = lat - Math.sign(lat) * 18;
      r.x -= -SHORT.dy * over; r.y -= SHORT.dx * over;
    }
  } else {
    // 路邊的軟牆：碰到就被彈回路面，不會卡住
    const lim = HALF + 4;
    if (Math.abs(r.u) > lim) {
      const over = r.u - Math.sign(r.u) * lim;
      r.x -= ch * over; r.y -= sh * over;
      r.a += wrap(T.hs[best] - r.a) * 0.12;
      r.v *= 0.985;
      r.u = Math.sign(r.u) * lim;
      if (r.isPlayer) {
        if (!r.atWall) wallHits++;
        r.atWall = 2;
        if (Math.random() < 0.5) particles.push({ x: r.x, y: r.y, z: 4, vx: rnd(-40, 40), vy: rnd(-40, 40), vz: rnd(40, 90), c: '#ffe060', life: 0.3 });
      }
    }
  }
  if (!r.finished && r.s >= FINISH_S && phase === 'race') {
    r.finished = true;
    r.finishOrder = ++finishCount;
    if (r.isPlayer) finishRace();
  }
}

// ---------- 主更新 ----------
let lastRank = 0, rankFlashT = 0, rankDir = 0, rankCheckT = 0, lastPassPop = -9;
function update(dt) {
  time += dt;
  if (stopT > 0) { stopT -= dt; return; }
  if (phase === 'count') {
    const before = Math.ceil(countT - 0.6);
    countT -= dt;
    const after = Math.ceil(countT - 0.6);
    if (after !== before && after > 0) sfx.beep(false);
    if (countT <= 0.6 && before > 0) {
      phase = 'race';
      sfx.beep(true);
      if (startBoostOk) { boost(player, 1.0, 1.5); popup('起跑衝刺！', 'skill'); }
      for (const r of racers) if (r.ai && !r.isPlayer && Math.random() < 0.3) boost(r, 0.8, 1.4);
    }
  }
  if (phase === 'race') raceT += dt;

  for (const r of racers) {
    if (!r.alive) {
      if (r.isPlayer && r.respawnT > 0) { r.respawnT -= dt; if (r.respawnT <= 0) respawn(r); }
      continue;
    }
    let c = r.isPlayer && !autoPilot ? (phase === 'done' ? { steer: 0, brake: false, hold: true } : playerControl()) : aiControl(r, dt);
    if (r.isPlayer && autoPilot === 'casual') {
      // 一般玩家：只有一部分時間有按到攻擊，道具晚一點才用
      if (Math.random() > 0.15) c.punch = false;
      if (r.itemT < 2.5) c.item = false;
      if (Math.random() > 0.05) c.skill = false;
      c.steer = clamp(c.steer + Math.sin(time * 1.3) * 0.3, -1, 1);
    }
    stepRacer(r, c, dt);
    if (r.alive) updateProgress(r);
  }
  for (let i = 0; i < racers.length; i++) {
    const a = racers[i];
    if (!a.alive || a.za > 4) continue;
    for (let j = i + 1; j < racers.length; j++) {
      const b = racers[j];
      if (!b.alive || b.za > 4) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx > 9 || dx < -9 || dy > 9 || dy < -9) continue;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 9) {
        const p = (9 - d) / 2, nx = dx / d, ny = dy / d;
        a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p;
      }
    }
  }
  const alive = racers.filter((r) => r.alive).sort((a, b) => (b.finished - a.finished) || (a.finished ? a.finishOrder - b.finishOrder : b.s - a.s));
  alive.forEach((r, i) => { r.rank = i + 1; });
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (!b.on) { b.t -= dt; if (b.t <= 0) b.on = true; continue; }
    for (const r of alive) {
      if (r.items.length >= 2 || r.za > 8 || Math.abs(r.x - b.x) > 11 || Math.abs(r.y - b.y) > 11) continue;
      if (!r.isPlayer && (r.items.length || Math.random() > 0.05)) continue; // 電腦比較少撿道具
      r.items.push(rollItem(r));
      r.itemT = 0;
      r.roll = r.isPlayer ? 0.7 : 0;
      if (b.loot) boxes.splice(i, 1); else { b.on = false; b.t = TUNE.boxRespawn; }
      break;
    }
  }
  // 陷阱
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.arm -= dt; h.life -= dt;
    if (h.life <= 0) { hazards.splice(i, 1); continue; }
    for (const r of racers) {
      if (!r.alive || r.za > 3 || (r === h.owner && h.arm > 0)) continue;
      const d = dist(r, h);
      if (h.type === 'oil' && d < 11 && r.stunT <= 0) {
        r.stunT = 1.0;
        if (r.isPlayer) { popup('滑倒！', 'bad'); sfx.slip(); }
      } else if (h.type === 'spikes' && d < 8) {
        r.slowT = 1.5;
        hurt(r, 40, h.owner, 0, 0, 'hit');
        hazards.splice(i, 1);
        break;
      }
    }
  }
  // 毒氣雲
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cl = clouds[i];
    cl.t -= dt;
    if (cl.t <= 0) { clouds.splice(i, 1); continue; }
    if (Math.random() < 0.6) particles.push({ x: cl.x + rnd(-cl.r, cl.r) * 0.7, y: cl.y + rnd(-cl.r, cl.r) * 0.7, z: rnd(0, 6), vx: 0, vy: 0, vz: 20, c: '#5aff3a', life: 0.7 });
    for (const o of racers) {
      if (o === cl.owner || !o.alive) continue;
      if (dist(o, cl) < cl.r) { o.poisonT = Math.max(o.poisonT, 3); o.poisonBy = cl.owner; o.slowT = 0.2; }
    }
  }
  // 飛行道具
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    if (s.target && s.target.alive) {
      const want = Math.atan2(s.target.x - s.x, -(s.target.y - s.y));
      s.a += clamp(wrap(want - s.a), -6 * dt, 6 * dt);
    } else if (s.kind === 'missile' || s.kind === 'shuriken') s.target = nearestAhead(s.owner, 400);
    s.x += Math.sin(s.a) * s.spd * dt;
    s.y -= Math.cos(s.a) * s.spd * dt;
    if (s.kind === 'missile' && Math.random() < 0.7) particles.push({ x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 10, c: '#c0c0c8', life: 0.4 });
    if (s.kind === 'fireball' && Math.random() < 0.8) particles.push({ x: s.x, y: s.y, z: s.z, vx: rnd(-10, 10), vy: rnd(-10, 10), vz: 20, c: Math.random() < 0.5 ? '#ffb020' : '#ff4a10', life: 0.3 });
    let hit = null;
    for (const r of racers) {
      if (r === s.owner || !r.alive || r.finished) continue;
      if (Math.hypot(r.x - s.x, r.y - s.y) < 9) { hit = r; break; }
    }
    if (hit || s.life <= 0) {
      if (s.kind === 'fireball') explode(s.x, s.y, 20, 60, s.owner, 'fire');
      else if (s.kind === 'missile') explode(s.x, s.y, 18, 90, s.owner, 'boom');
      else if (hit && s.kind === 'dart') { hurt(hit, 15, s.owner, 0, 0, 'hit'); hit.poisonT = 4; hit.poisonBy = s.owner; }
      else if (hit) hurt(hit, 45, s.owner, Math.sin(s.a) * 120, -Math.cos(s.a) * 120, 'slash');
      shots.splice(i, 1);
    }
  }
  // 天氣
  if (weather) {
    weather.t -= dt;
    weather.tick -= dt;
    const w = weather;
    if (w.type === 'storm' && w.tick <= 0) {
      w.tick = 0.45;
      const cand = enemies(w.owner).filter((o) => dist(o, w.owner) < 380);
      if (cand.length) {
        const o = cand[Math.floor(Math.random() * cand.length)];
        bolt(o.x + rnd(-20, 20), o.y + rnd(-20, 20), 220, o.x, o.y, 6);
        hurt(o, 70, w.owner, 0, 0, 'shock');
        flash = 0.06; flashCol = '220,230,255';
        if (near(o, 300)) sfx.boom(0.4);
      }
    } else if (w.type === 'blizzard') {
      for (const o of enemies(w.owner)) { if (dist(o, w.owner) > 450) continue; o.slowT = Math.max(o.slowT, 0.2); if (w.tick <= 0) hurt(o, 3, w.owner, 0, 0, 'ice', true); }
      if (w.tick <= 0) w.tick = 0.5;
    } else if (w.type === 'acid' && w.tick <= 0) {
      w.tick = 0.5;
      for (const o of enemies(w.owner)) if (dist(o, w.owner) < 400) hurt(o, 6, w.owner, 0, 0, 'poison', true);
    }
    if (w.t <= 0) weather = null;
  }
  for (const arr of [slashes, booms, bolts, tracers]) {
    for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > 0.6) arr.splice(i, 1); }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vz -= (p.blood ? 300 : 60) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z <= 0) {
      if (p.blood && Math.random() < 0.35) paintSplat(p.x, p.y, 1 + Math.random() * 1.5, 0.9);
      particles.splice(i, 1);
    } else if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i];
    c.life -= dt;
    if (c.z > 0 || c.vz > 0) {
      c.vz -= 300 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.z <= 0) {
        c.z = 0;
        if (c.vz < -100) { c.vz = -c.vz * 0.3; paintSplat(c.x, c.y, 2.5, 1); } else c.vz = 0;
        c.vx *= 0.4; c.vy *= 0.4;
      }
    }
    if (c.life <= 0) chunks.splice(i, 1);
  }
  for (const c of corpses) if (c.fount > 0) { c.fount -= dt; blood(c.x, c.y, 4, 3, 26, 130 * Math.min(1, c.fount)); }

  rankCheckT -= dt;
  if (phase === 'race' && player.alive && rankCheckT <= 0) {
    rankCheckT = 0.4;
    if (lastRank && player.rank < lastRank) {
      rankDir = 1; rankFlashT = 0.8;
      if (time - lastPassPop > 1.5) { popup(lastRank - player.rank > 1 ? `連超 ${lastRank - player.rank} 台！` : '超車！', 'pass'); lastPassPop = time; }
    } else if (lastRank && player.rank > lastRank) { rankDir = -1; rankFlashT = 0.6; }
    lastRank = player.rank;
  }
  rankFlashT -= dt;

  if (player.alive || player.respawnT > 0) {
    const target = player.drift.on ? player.va * 0.65 + player.a * 0.35 : player.va;
    camA += wrap(target - camA) * Math.min(1, 6 * dt);
    const b = player.boostT > 0 ? 1 : 0;
    const spd = clamp((player.v - 150) / 120, 0, 1);
    camF += (BASE_F * (1 - spd * 0.09 - b * 0.12) - camF) * Math.min(1, 4 * dt);
    const back = CAM_BACK + b * 8;
    camX = player.x - Math.sin(camA) * back;
    camY = player.y + Math.cos(camA) * back;
    camHgt = CAM_H + player.za * 0.4;
  }
  shake = Math.max(0, shake - dt * 14);
  flash -= dt;
  splatA = Math.max(0, splatA - dt * 0.6);
  $('splat').style.opacity = splatA;
  updateTouchUI();
}

function finishRace() {
  phase = 'done';
  const t = raceT;
  setTimeout(() => {
    $('resRank').textContent = `第 ${player.finishOrder} 名`;
    $('resBody').innerHTML = `
      <div class="row"><span>完賽時間</span><b>${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}</b></div>
      <div class="row"><span>擊殺</span><b>${player.kills}</b></div>
      <div class="row"><span>死亡次數</span><b>${player.deaths}</b></div>
      <div class="row"><span>存活選手</span><b>${racers.filter((r) => r.alive).length} / ${N}</b></div>`;
    $('result').classList.remove('hidden');
    $('touch').classList.add('hidden');
  }, 1500);
}

// ---------- 畫面 ----------
const img = g.createImageData(W, H);
const buf = new Uint32Array(img.data.buffer);
function renderGround() {
  const sa = Math.sin(camA), ca = Math.cos(camA);
  let lastKey = -1, lastCol = null;
  for (let sy = HZ + 1; sy < H; sy++) {
    const d = (camHgt * camF) / (sy - HZ);
    const k = d / camF;
    let wx = camX + sa * d - ca * (W / 2) * k;
    let wy = camY - ca * d - sa * (W / 2) * k;
    const dx = ca * k, dy = sa * k;
    let idx = sy * W;
    for (let sx = 0; sx < W; sx++) {
      const px = Math.floor(wx), py = Math.floor(wy);
      const key = ckey(px >> 7, py >> 7);
      if (key !== lastKey) { lastKey = key; lastCol = chunkCol.get(key) || null; }
      buf[idx++] = lastCol ? lastCol[((py & 127) << 7) | (px & 127)] : grass(px, py);
      wx += dx; wy += dy;
    }
  }
  g.putImageData(img, 0, 0, 0, HZ + 1, W, H - HZ - 1);
}

function renderSky() {
  let ox = -(((camA / (Math.PI * 2)) * PANO_W) % PANO_W);
  if (ox > 0) ox -= PANO_W;
  ox = Math.round(ox);
  g.drawImage(PANO, ox, 0);
  g.drawImage(PANO, ox + PANO_W, 0);
  for (let i = 0; i < 22; i++) {
    g.fillStyle = `rgba(255,170,110,${(1 - i / 22) * 0.75})`;
    g.fillRect(0, HZ + 1 + i, W, 1);
  }
}

let sprites = [];
function project(x, y, z) {
  const sa = Math.sin(camA), ca = Math.cos(camA);
  const dx = x - camX, dy = y - camY;
  const depth = dx * sa - dy * ca;
  if (depth < 4) return null;
  const lat = dx * ca + dy * sa;
  const sc = camF / depth;
  return { sx: W / 2 + lat * sc, sy: HZ + (camHgt - z) * sc, gy: HZ + camHgt * sc, sc, depth };
}
function addSprite(im, x, y, z, wh, extra) {
  const p = project(x, y, z);
  if (!p || p.depth > 1500) return;
  const h = wh * p.sc;
  if (h < 1.5) return;
  const w = (im.width * h) / im.height;
  if (p.sx + w / 2 < 0 || p.sx - w / 2 > W) return;
  sprites.push({ im, x: p.sx - w / 2, y: p.sy - h, w, h, depth: p.depth, gy: p.gy, sx: p.sx, sc: p.sc, ...extra });
}
function pixLine(x0, y0, x1, y1, w, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (n > 2000) return;
  g.fillStyle = col;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n || 1), y = y0 + ((y1 - y0) * i) / (n || 1);
    g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
  }
}
function line3d(x1, y1, z1, x2, y2, z2, w, col) {
  const a = project(x1, y1, z1), b = project(x2, y2, z2);
  if (!a || !b) return;
  pixLine(a.sx, a.sy, b.sx, b.sy, w, col);
}

function renderSprites() {
  sprites = [];
  const fr = Math.floor(time * 4) % 2;
  for (let c = player.s - 100; c <= player.s + 1000; c += 120) {
    for (const o of nearbyScenery(c)) {
      const [im, wh] = SCN_IMG[o.kind];
      addSprite(o.kind === 'crowd' ? S.CROWD[fr] : im, o.x, o.y, 0, wh);
    }
  }
  for (const b of boxes) if (b.on) addSprite(S.BOX[Math.floor(time * 6) % 4], b.x, b.y, 3 + Math.sin(time * 3 + b.x) * 1, b.loot ? 6 : 7);
  for (const h of hazards) addSprite(h.type === 'oil' ? S.OIL : S.SPIKES, h.x, h.y, 0, h.type === 'oil' ? 3 : 3.5);
  for (const c of corpses) addSprite(c.img, c.x, c.y, 0, 5);
  for (const cl of clouds) {
    for (let k = 0; k < 3; k++) {
      const x = cl.x + Math.cos(k * 2.1) * cl.r * 0.45, y = cl.y + Math.sin(k * 2.1) * cl.r * 0.45;
      const q = project(x, y, 0);
      if (q && q.depth > 35) addSprite(S2.GAS[(fr + k) % 2], x, y, 0, cl.r * 0.5, { alpha: 0.55 });
    }
  }
  for (const s of shots) {
    const im = s.kind === 'fireball' ? S2.FIREBALL[fr] : s.kind === 'dart' ? S2.DART : s.kind === 'missile' ? S2.MISSILE[fr] : S.SHURIKEN[Math.floor(time * 20) % 2];
    addSprite(im, s.x, s.y, s.z, s.kind === 'fireball' ? 7 : s.kind === 'missile' ? 4 : 3);
  }
  for (const b of booms) {
    if (b.kind === 'ice') addSprite(S2.ICE_BOOM[Math.min(5, Math.floor(b.t / 0.07))], b.x, b.y, 0, b.r * 1.4);
    else addSprite(S2.BOOM[Math.min(9, Math.floor(b.t / 0.05))], b.x, b.y, -b.r * 0.3, b.r * 1.8);
  }
  for (const r of racers) {
    if (!r.alive) continue;
    const lean = r.lean < -0.35 ? 0 : r.lean > 0.35 ? 2 : 1;
    addSprite(r.imgs[lean][Math.floor(r.pedal) % 2], r.x, r.y, r.za, 15, { racer: r });
    if (r.droneT > 0) { const d = dronePos(r); addSprite(S2.DRONE[Math.floor(time * 20) % 2], d.x, d.y, d.z, 4); }
  }
  for (const c of chunks) addSprite(c.img, c.x, c.y, c.z, c.wh);
  sprites.sort((a, b) => b.depth - a.depth);
  for (const s of sprites) {
    if (s.alpha) g.globalAlpha = s.alpha;
    if (s.racer) {
      const r = s.racer;
      const sw = s.w * 0.7;
      g.fillStyle = 'rgba(10,6,20,0.4)';
      g.fillRect(Math.round(s.sx - sw / 2), Math.round(s.gy - Math.max(1, s.sc * 1.2)), Math.round(sw), Math.max(1, Math.round(s.sc * 2)));
      if (r.invulnT > 0 && Math.floor(time * 20) % 2) continue;
      if (r.boostT > 0) {
        const f = S.FLAME[Math.floor(time * 20) % 2];
        const fh = s.h * 0.35;
        g.drawImage(f, Math.round(s.sx - fh / 2), Math.round(s.y + s.h - fh * 0.2), Math.round(fh), Math.round(fh));
      }
      g.drawImage(s.im, Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h));
      if (r.frozenT > 0) g.drawImage(S2.ICE, Math.round(s.x - s.w * 0.05), Math.round(s.y - s.h * 0.05), Math.round(s.w * 1.1), Math.round(s.h * 1.1));
      if (r.melee > 0) {
        const a = S.AXE[Math.floor(time * 10) % 2];
        const ah = s.h * 0.6;
        g.drawImage(a, Math.round(s.x + (Math.floor(time * 10) % 2 ? s.w * 0.75 : -ah * 0.6)), Math.round(s.y + s.h * 0.05), Math.round(ah), Math.round(ah));
      }
      if (r.hp < r.maxHp && !r.isPlayer && s.depth < 260) {
        const bw = Math.round(s.w * 0.8);
        g.fillStyle = OUT; g.fillRect(Math.round(s.sx - bw / 2) - 1, Math.round(s.y) - 4, bw + 2, 3);
        g.fillStyle = r.poisonT > 0 ? '#5aff3a' : '#ff3040';
        g.fillRect(Math.round(s.sx - bw / 2), Math.round(s.y) - 3, Math.max(0, Math.round((bw * r.hp) / r.maxHp)), 1);
      }
    } else {
      g.drawImage(s.im, Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h));
    }
    g.globalAlpha = 1;
  }
  for (const p of particles) {
    const q = project(p.x, p.y, p.z);
    if (!q || q.depth > 900) continue;
    const sz = Math.max(1, Math.round(q.sc * 0.8));
    g.fillStyle = p.c;
    g.fillRect(Math.round(q.sx), Math.round(q.sy), sz, sz);
  }
  // 揮砍刀光
  for (const sl of slashes) {
    if (sl.t > 0.25) continue;
    const q = project(sl.x, sl.y, 8);
    if (!q) continue;
    const rad = (sl.big ? 34 : TUNE.slashRange) * q.sc * (0.5 + sl.t * 2.5);
    g.strokeStyle = sl.t < 0.08 ? '#ffffff' : '#ff3050';
    g.lineWidth = Math.max(2, q.sc * (sl.big ? 2.5 : 1.5));
    g.beginPath();
    g.ellipse(q.sx, q.sy, rad, rad * 0.3, 0, sl.t * 24, sl.t * 24 + 4.2);
    g.stroke();
  }
  // 雷射
  for (const r of racers) {
    if (!r.alive || r.laserT <= 0) continue;
    const fx = Math.sin(r.a), fy = -Math.cos(r.a);
    const w = Math.floor(time * 30) % 2 ? 3 : 2;
    line3d(r.x + fx * 6, r.y + fy * 6, 9, r.x + fx * 260, r.y + fy * 260, 9, w + 2, '#ff2040');
    line3d(r.x + fx * 6, r.y + fy * 6, 9, r.x + fx * 260, r.y + fy * 260, 9, 1, '#ffffff');
  }
  for (const tr of tracers) if (tr.t < 0.1) line3d(tr.x1, tr.y1, tr.z1, tr.x2, tr.y2, tr.z2, 1, '#fff27a');
  for (const b of bolts) {
    if (b.t > 0.3) continue;
    for (let i = 0; i < b.pts.length - 1; i++) {
      const [x1, y1, z1] = b.pts[i], [x2, y2, z2] = b.pts[i + 1];
      line3d(x1, y1, z1, x2, y2, z2, 3, '#7ad8ff');
      line3d(x1, y1, z1, x2, y2, z2, 1, '#ffffff');
    }
  }
}

function renderWeather() {
  if (!weather) return;
  const w = weather.type;
  if (w === 'storm') {
    g.fillStyle = 'rgba(10,10,40,0.35)'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#a8c0ff';
    for (let i = 0; i < 70; i++) { const x = Math.random() * W, y = Math.random() * H; g.fillRect(x, y, 1, 5); }
  } else if (w === 'blizzard') {
    g.fillStyle = 'rgba(210,230,255,0.22)'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 90; i++) { const x = (Math.random() * W + time * 60) % W, y = Math.random() * H; g.fillRect(x, y, 2, 2); }
  } else {
    g.fillStyle = 'rgba(40,120,20,0.2)'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7aff5a';
    for (let i = 0; i < 60; i++) { const x = Math.random() * W, y = Math.random() * H; g.fillRect(x, y, 1, 4); }
  }
}

function renderSpeedLines() {
  const k = clamp((player.v - 200) / 90, 0, 1) + (player.boostT > 0 ? 0.6 : 0);
  if (k <= 0.05 || !player.alive) return;
  const n = Math.round(14 * k);
  g.fillStyle = player.boostT > 0 ? '#bfe8ff' : '#ffffff';
  const cx = W / 2, cy = HZ + (H - HZ) * 0.35;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r0 = W * 0.3 + Math.random() * W * 0.15, len = 20 + Math.random() * 40;
    for (let d = 0; d < len; d += 2) {
      const x = cx + Math.cos(a) * (r0 + d) * 1.4, y = cy + Math.sin(a) * (r0 + d) * 0.8;
      if (y < HZ) continue;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}

function panel(x, y, w, h) {
  g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#f0e0ff'; g.fillRect(x, y, w, h);
  g.fillStyle = '#2a1840'; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = '#4a3070'; g.fillRect(x + 1, y + 1, w - 2, 1);
}

const SUFFIX = (n) => (n % 10 === 1 && n !== 11 ? 'ST' : n % 10 === 2 && n !== 12 ? 'ND' : n % 10 === 3 && n !== 13 ? 'RD' : 'TH');
let portraitSmall = null;
function renderHud() {
  panel(6, 6, 54, 16);
  const t = raceT;
  drawText(g, `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`, 10, 9, 2, '#ffffff');

  // 兩格道具（轉盤）
  for (let k = 0; k < 2; k++) {
    const x = 6 + k * 28;
    panel(x, 28, 24, 24);
    const it = player.items[k];
    if (!it) continue;
    const show = player.roll > 0 && k === player.items.length - 1 ? ITEM_IDS[Math.floor(time * 18) % ITEM_IDS.length] : it;
    g.drawImage(ITEM[show].icon, x + 2, 30);
  }
  if (player.items.length && !player.roll && !IS_TOUCH && Math.floor(time * 3) % 2) drawText(g, 'SPACE', 6, 55, 1, '#ffe000');
  // 技能
  const sx0 = 62;
  panel(sx0, 28, 24, 24);
  if (portraitSmall) {
    g.globalAlpha = player.skillCd > 0 ? 0.45 : 1;
    g.drawImage(portraitSmall, sx0 + 1, 29, 22, 22);
    g.globalAlpha = 1;
  }
  const charge = clamp(1 - player.skillCd / TUNE.skillCd, 0, 1);
  g.fillStyle = OUT; g.fillRect(sx0, 53, 24, 4);
  g.fillStyle = charge >= 1 ? (Math.floor(time * 6) % 2 ? '#ffe000' : '#ff8000') : '#60a8ff';
  g.fillRect(sx0 + 1, 54, Math.round(22 * charge), 2);

  // 名次與擊殺
  const rk = player.rank, s = String(rk);
  const big = PORTRAIT ? 5 : 6;
  const col = rankFlashT > 0 ? (rankDir > 0 ? '#7dff7a' : '#ff4050') : '#ffe000';
  drawText(g, s, W - 10 - textW(s, big) - textW(SUFFIX(rk), 2) - 4, 6, big, col);
  drawText(g, SUFFIX(rk), W - 10 - textW(SUFFIX(rk), 2), 6, 2, col);
  drawText(g, '/' + racers.filter((r) => r.alive || r.isPlayer).length, W - 10 - textW('/30', 1), 6 + big * 5 - 5, 1, '#ffffff');
  g.drawImage(SKULL, W - 46, 44);
  drawText(g, 'x' + player.kills, W - 34, 45, 2, '#ff4050');

  // 進度條
  const bx = 92, bw = W - 92 - (PORTRAIT ? 70 : 92), by = 8;
  g.fillStyle = OUT; g.fillRect(bx - 1, by - 1, bw + 2, 5);
  g.fillStyle = '#5a4a70'; g.fillRect(bx, by, bw, 3);
  for (const r of racers) {
    if (!r.alive || r.isPlayer) continue;
    const p = clamp((r.s - START_S) / (FINISH_S - START_S), 0, 1);
    g.fillStyle = '#ff4060';
    g.fillRect(Math.round(bx + p * bw), by, 1, 3);
  }
  const pp = clamp((player.s - START_S) / (FINISH_S - START_S), 0, 1);
  g.fillStyle = '#ffe000'; g.fillRect(Math.round(bx + pp * bw) - 1, by - 2, 3, 7);

  // 血量與速度
  panel(6, H - 14, 70, 8);
  const hp = clamp(player.hp / player.maxHp, 0, 1);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i / 16 < hp ? (hp > 0.5 ? '#40e070' : hp > 0.25 ? '#ffd000' : '#ff3040') : '#3a2a50';
    g.fillRect(8 + i * 4, H - 12, 3, 4);
  }
  const kmh = Math.round(Math.abs(player.v) * 0.25);
  panel(W - 52, H - 18, 46, 12);
  drawText(g, String(kmh), W - 49, H - 16, 1, player.v < 0 ? '#ff9a40' : player.boostT > 0 ? '#7ad8ff' : '#ffffff');
  drawText(g, player.v < -5 ? 'BACK' : 'KM/H', W - 30, H - 16, 1, '#ffb0c0', null);

  if (weather) {
    const label = { storm: 'STORM', blizzard: 'BLIZZARD', acid: 'ACID RAIN' }[weather.type];
    drawText(g, label, W / 2 - textW(label, 1) / 2, 16, 1, '#ffffff');
  }
  if (phase === 'count') {
    const n = Math.ceil(countT - 0.6);
    if (n > 0 && n <= 3) drawText(g, String(n), W / 2 - textW('1', 10) / 2, HZ, 10, '#ffffff');
  } else if (phase === 'race' && raceT < 0.9) {
    drawText(g, 'GO!', W / 2 - textW('GO!', 8) / 2, HZ, 8, '#ff3040');
  }
  if (!player.alive) drawText(g, 'RESPAWN', W / 2 - textW('RESPAWN', 3) / 2, HZ + 20, 3, '#ff4050');
  if (player.drift.on) {
    const lvl = player.drift.charge > 1.4 ? 2 : player.drift.charge > 0.7 ? 1 : 0;
    const label = ['DRIFT', 'DRIFT+', 'DRIFT++'][lvl];
    drawText(g, label, W / 2 - textW(label, 2) / 2, H - 30, 2, ['#ffffff', '#60c8ff', '#ff8a20'][lvl]);
  }
}

let lastBtnItem = '', lastSkillReady = null;
function updateTouchUI() {
  if (!IS_TOUCH || !player) return;
  const it = player.items[0] && !(player.roll && player.items.length === 1) ? player.items[0] : '';
  if (it !== lastBtnItem) {
    lastBtnItem = it;
    const b = $('btnItem');
    b.style.backgroundImage = it ? `url(${ITEM_URL[it]})` : '';
    b.querySelector('span').textContent = it ? ITEM[it].name : '道具';
    b.classList.toggle('ready', !!it);
  }
  const ready = player.skillCd <= 0;
  if (ready !== lastSkillReady) { lastSkillReady = ready; $('btnSkill').classList.toggle('ready', ready); }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (phase !== 'select') update(dt);
  renderAll();
}
function renderAll() {
  if (phase === 'select') { drawSelectBg(); return; }
  const sx = shake > 0 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  const sy = shake > 0 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  const ox = camX, oy = camY;
  camX += sx * 0.5; camY += sy * 0.5;
  renderGround();
  renderSky();
  renderSprites();
  renderWeather();
  renderSpeedLines();
  camX = ox; camY = oy;
  renderHud();
  if (flash > 0) { g.fillStyle = `rgba(${flashCol},0.5)`; g.fillRect(0, 0, W, H); }
}
function drawSelectBg() {
  camA += 0.002;
  const p = pointAt(START_S + 200);
  camX = p.x; camY = p.y + 80; camHgt = 40; camF = BASE_F;
  renderGround();
  renderSky();
}

// ---------- 角色選擇 ----------
function buildSelect() {
  const box = $('cards');
  S.TYPES.forEach((type, i) => {
    const ch = S.CHARS[type];
    const L = S.lookFor(type, null);
    const card = document.createElement('button');
    card.className = 'card';
    const pc = S.makePortrait(L);
    pc.className = 'portrait';
    const bars = ['速度', '加速', '血量'].map((n, k) => `<div class="bar"><span>${n}</span><i style="width:${ch.bars[k] * 20}%"></i></div>`).join('');
    card.innerHTML = `<div class="num">${i + 1}</div><div class="nm">${ch.name}</div><div class="sk">技能：${ch.skill}</div><div class="ds">${ch.desc}</div>${bars}`;
    card.insertBefore(pc, card.children[1]);
    card.onclick = () => {
      portraitSmall = S.makePortrait(L);
      $('btnSkill').style.backgroundImage = `url(${portraitSmall.toDataURL()})`;
      startRace(type);
    };
    box.appendChild(card);
  });
  addEventListener('keydown', (e) => {
    if (phase !== 'select') return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) box.children[n - 1].click();
  });
}

// ---------- 可調數值（試玩後調整） ----------
const TUNE = {
  turn: 1.35, steerSmooth: 7, assist: 1.8, reverse: 0.75,
  slashDmg: 40, slashRange: 22, slashCd: 0.32, killHeal: 15, skillCd: 12, boxRespawn: 1.5,
  aiToPlayer: 0.7, aiToAi: 0.18, aiHp: 1.0, chainTargets: 3, lootChance: 0.5, weatherT: 5,
};

buildSelect();
requestAnimationFrame(frame);

// 除錯與自動試玩用
let autoPilot = false;
window.dbg = {
  TUNE, stats,
  // casual = 模擬一般玩家：反應慢、常常沒按到
  autopilot(casual = false) {
    autoPilot = casual ? 'casual' : 'pro';
    player.ai = { lane: 0, laneT: 99, skill: 1, aggr: 1, short: !casual, shortState: 0, itemDelay: 1 };
  },
  newRace(typeIdx, casual) {
    for (const a of [particles, chunks, corpses, hazards, shots, slashes, booms, bolts, tracers, clouds]) a.length = 0;
    for (let i = boxes.length - 1; i >= 0; i--) { if (boxes[i].loot) boxes.splice(i, 1); else { boxes[i].on = true; boxes[i].t = 0; } }
    for (const k of Object.keys(stats.cause)) delete stats.cause[k];
    for (const k of Object.keys(stats.ai)) delete stats.ai[k];
    stats.byPlayer = stats.byAi = stats.none = 0;
    finishCount = 0; raceT = 0; weather = null; wallHits = 0; lastRank = 0; startBoostOk = false;
    startRace(S.TYPES[typeIdx]);
    this.autopilot(casual);
    for (let i = 0; i < 3.2 * 60; i++) update(1 / 60);
  },
  run(sec) {
    const log = [];
    for (let i = 0; i < sec; i++) {
      update(1 / 60);
      for (let k = 0; k < 59; k++) update(1 / 60);
      if (player.finished) break;
    }
    return { t: +raceT.toFixed(1), kills: player.kills, deaths: player.deaths, rank: player.finishOrder || player.rank,
      alive: racers.filter((r) => r.alive).length, aiKills: stats.byAi, wall: wallHits, causes: stats.cause, ai: { ...stats.ai } };
  },
  manual() { autoPilot = false; },
  get player() { return player; }, get racers() { return racers; }, keys, touch,
  get wallHits() { return wallHits; }, get raceT() { return raceT; }, get phase() { return phase; },
  advance(sec, draw = true) { for (let i = 0; i < sec * 60; i++) update(1 / 60); if (draw) renderAll(); },
  render: renderAll,
};
