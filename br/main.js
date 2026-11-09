// 打人三項：大逃殺版（單機）
// 規則：每關有一個「移動殺戮帶」——後面是會前進的死亡之牆，前面是電網，所有人被關在中間互砍
import { Pix, OUT, drawText, textW } from '../sample-race/pix.js';
import * as G from './stage.js';
import * as S from '../sample-race/sprites.js';
import * as S2 from '../sample-race/sprites2.js';
import * as S3 from './sprites3.js';
import * as ART from './art.js';
import { sfx, initAudio } from '../src/audio.js';

// ---------- 畫面設定 ----------
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const PORTRAIT = innerHeight > innerWidth;
const W = PORTRAIT ? 240 : 384, H = PORTRAIT ? 320 : 216, HZ = PORTRAIT ? 104 : 70;
const BASE_F = PORTRAIT ? 150 : 210, CAM_BACK = PORTRAIT ? 42 : 56, CAM_H = PORTRAIT ? 38 : 34;
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
  if (PANEL_H) document.getElementById('touch').style.width = innerWidth + 'px';
  let k = Math.min(innerWidth / W, (innerHeight - PANEL_H) / H);
  if (!IS_TOUCH && k >= 2) k = Math.floor(k);
  const box = document.getElementById('game');
  box.style.width = cv.style.width = W * k + 'px';
  box.style.height = cv.style.height = H * k + 'px';
  if (PANEL_H) document.getElementById('touch').style.height = Math.max(PANEL_H, innerHeight - H * k) + 'px';
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(() => location.reload(), 300));
fit();

const $ = (id) => document.getElementById(id);
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- 關卡設定 ----------
const STAGES = [
  { id: 'swim', name: '第一關：血海游泳', short: 'SWIM', theme: 'swim', len: 5600, seed: 3, zoneSpeed: 60, len0: 700, len1: 140, dur: 60,
    target: 20, fwd: 70, lat: 62, accel: 4, wall: 'tsunami', wallName: '血紅海嘯', death: '被海嘯捲走了', respawn: true, wh: 9 },
  { id: 'bike', name: '第二關：死亡單車', short: 'BIKE', theme: 'bike', len: 9200, seed: 7, zoneSpeed: 100, len0: 600, len1: 110, dur: 60,
    target: 10, fwd: 115, lat: 85, accel: 3, wall: 'grinder', wallName: '絞肉推土機', death: '被絞肉機絞碎了', respawn: true, wh: 15, bloodZone: [28, 36] },
  { id: 'run', name: '第三關：殭屍城市', short: 'RUN', theme: 'run', len: 6400, seed: 11, zoneSpeed: 80, len0: 480, len1: 90, dur: 55,
    target: 5, fwd: 95, lat: 82, accel: 6, wall: 'zombies', wallName: '殭屍潮', death: '被殭屍分屍了', respawn: false, wh: 15 },
  { id: 'arena', name: '最終決戰：血池競技場', short: 'FINAL', theme: 'arena', R0: 210, R1: 40, dur: 45, target: 1,
    fwd: 105, accel: 6, respawn: false, wh: 15 },
];
const SKY_TINT = { swim: null, bike: null, run: 'rgba(16,0,30,0.5)', arena: 'rgba(110,0,10,0.35)' };
const HAZE = { swim: '255,190,140', bike: '255,170,110', run: '90,40,90', arena: '160,30,30' };

// ---------- 角色三招 ----------
// 冷卻（秒）：近 4、遠 7、範圍 14；電腦的冷卻比較長、威力比較小
const CD = { near: 4, far: 7, area: 14 };
const SKILLS = {
  muscle: { near: ['鐵頭槌', 'headbutt'], far: ['丟啞鈴', 'dumbbell'], area: ['蠻牛衝撞', 'charge'] },
  ninja: { near: ['瞬步斬', 'blink'], far: ['追蹤飛鏢', 'shuriken'], area: ['煙霧彈', 'smoke'] },
  butcher: { near: ['剁骨刀', 'cleaver'], far: ['肉鉤', 'hook'], area: ['迴旋大砍', 'spin'] },
  courier: { near: ['外送箱砸頭', 'box'], far: ['熱湯潑灑', 'soup'], area: ['氮氣火龍', 'nitro'] },
};
const SKILL_DESC = {
  muscle: '撞暈 / 砸啞鈴 / 衝撞一整排', ninja: '瞬移背刺 / 三支追蹤鏢 / 毒煙', butcher: '剁到流血 / 把人勾過來 / 轉圈砍', courier: '砸頭加速 / 燙一片 / 衝刺留火路',
};

// ---------- 道具 ----------
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
const ICON_URL = {};
// 美術圖讀進來之後，道具與技能圖示換成新圖
function setupArtIcons() {
  for (const id of ITEM_IDS) { if (ART.icon(id)) ITEM[id].icon = ART.icon(id); ICON_URL[id] = ITEM[id].icon.toDataURL(); }
  for (const k of Object.keys(S3.SKILL_ICONS)) ICON_URL['sk_' + k] = (ART.skillIcon(k) || S3.SKILL_ICONS[k]).toDataURL();
}
const skillImg = (k) => ART.skillIcon(k) || S3.SKILL_ICONS[k];

// ---------- 可調數值 ----------
const TUNE = {
  slashDmg: 30, slashRange: 22, slashCd: 0.4, killHeal: 20, aiToPlayer: 0.4, aiToAi: 0.2, aiHp: 4.5,
  aiSkillMul: 0.55, aiCdMul: 1.8, lootChance: 0.5, chainTargets: 3, weatherT: 5, boxEvery: 1.6, rollCd: 1.2, minStage: 0, lunge: 60,
};

const SKULL = (() => { const p = new Pix(10, 10); p.ell(5, 4, 4, 3.6, '#ffffff'); p.rect(3, 6, 4, 3, '#ffffff'); p.rect(2, 3, 2, 2, OUT); p.rect(6, 3, 2, 2, OUT); p.set(4, 8, OUT); p.set(5, 6, OUT); p.outline(OUT); return p.canvas(); })();
const BOUNTY = (() => { const p = new Pix(16, 16); p.ell(8, 7, 7, 6, '#ffd000'); p.rect(4, 10, 8, 5, '#ffd000'); p.rect(3, 5, 3, 3, OUT); p.rect(10, 5, 3, 3, OUT); p.set(7, 9, OUT); p.set(8, 9, OUT); p.rect(5, 13, 1, 2, OUT); p.rect(8, 13, 1, 2, OUT); p.rect(11, 13, 1, 2, OUT); p.outline(OUT); return p.canvas(); })();

// ---------- 遊戲狀態 ----------
const N = 30;
const NAMES = ['暴躁阿明', '憂鬱小美', '中二老王', '佛系阿華', '社畜阿強', '禿頭小翠', '鹹魚志明', '熬夜春嬌', '厭世阿伯',
  '狂暴阿姨', '嘴砲小胖', '邪惡阿傑', '爆肝大頭', '阿宅阿呆', '火爆小強', '冷血阿花', '傻笑老李', '肌肉阿德', '瘦皮小玉',
  '胖胖阿樂', '暴走阿翔', '陰沉阿美', '鐵頭阿財', '跛腳阿福', '血手阿龍', '尖叫小琪', '光頭阿彬', '毒舌阿珠', '神經阿凱'];
let racers = [], player = null, chosenType = 'muscle', portraitSmall = null;
let phase = 'select', phaseT = 0, stageIdx = 0, stage = STAGES[0], stageT = 0, gameT = 0, time = 0;
let camX = 0, camY = 0, camA = 0, camF = BASE_F, camHgt = CAM_H, shake = 0, stopT = 0, flash = 0, flashCol = '255,255,255';
let weather = null, bounty = null, spectate = null, ffwd = false, scenery = [];
const zone = { back: 0, len: 400, speed: 0, front: 0, bloodZone: false, overtime: false };
const particles = [], chunks = [], corpses = [], hazards = [], shots = [], slashes = [], booms = [], bolts = [], tracers = [], clouds = [], boxes = [];
let boxT = 0;
const stats = { cause: {}, dmg: {}, byPlayer: 0, byAi: 0, wall: 0, stageAlive: [], playerDeaths: 0 };
let dmgTag = '';

function makeRacer(i, type, isPlayer) {
  const base = S.CHARS[type];
  const look = S.lookFor(type, isPlayer ? null : Math.random());
  const hp = isPlayer ? base.stats.hp : Math.round(base.stats.hp * TUNE.aiHp);
  return {
    id: i, isPlayer, type, name: isPlayer ? '你' : NAMES[i % NAMES.length], look,
    head: type === 'muscle' ? ART.A.muscle_head : S.makeHead(look), imgs: null, corpse: null, tint: isPlayer ? 0 : 1 + (i % 5),
    s: 0, u: 0, vs: 0, vu: 0, ks: 0, ku: 0, x: 0, y: 0, a: 0, v: 0, kx: 0, ky: 0, z: 0, vz: 0,
    hp, maxHp: hp, alive: true, items: [], itemT: 0, roll: 0,
    cd: { near: 1, far: 2, area: 4 }, punchCd: 0, punchT: 0, rollT: 0, rollCd: 0, rdx: 0, rdy: 0,
    boostT: 0, boostPow: 1, stunT: 0, slowT: 0, invulnT: 0, hitT: 0, frozenT: 0,
    poisonT: 0, bleedT: 0, burnT: 0, dotBy: null, dotTick: 0,
    droneT: 0, droneTick: 0, laserT: 0, melee: 0, meleeTick: 0, dashT: 0, dashKind: '', fireT: 0,
    kills: 0, streak: 0, streakT: 0, deaths: 0, place: 0, lean: 0, anim: Math.random() * 2, lastHit: -9, lastAttacker: null,
    respawnT: 0, dripT: 0, zapT: 0,
    ai: isPlayer ? null : { lane: rnd(-0.7, 0.7), laneT: rnd(2, 5), aggr: Math.random(), think: 0, foe: null, itemDelay: rnd(1, 3), sk: rnd(0, 2) },
  };
}

function spriteSet(r) {
  const f = ART.charFrames(r.type, stage.theme), v = r.tint;
  return {
    frames: f.frames.map((im) => ART.tinted(im, v)), flip: !!f.flip, swimArms: !!f.swimArms,
    leanImg: f.leanImg ? ART.tinted(f.leanImg, v) : null, splashImg: f.splashImg ? ART.tinted(f.splashImg, v) : null,
  };
}
function corpseFor(r) {
  const c = ART.corpseOf(r.type, stage.theme);
  if (c) return ART.tinted(c, r.tint);
  return stage.theme === 'bike' ? S.makeCorpse(r.look) : S3.makeCorpseBody(r.look, stage.theme === 'swim');
}

// ---------- 關卡載入 ----------
function loadStage(i) {
  stageIdx = i;
  stage = STAGES[i];
  for (const a of [particles, chunks, corpses, hazards, shots, slashes, booms, bolts, tracers, clouds, boxes]) a.length = 0;
  weather = null;
  stageT = 0;
  zone.bloodZone = false; zone.overtime = false;
  const alive = racers.filter((r) => r.alive);
  if (stage.theme === 'arena') {
    G.loadArena(stage.R0);
    alive.forEach((r, k) => {
      const ang = (k / alive.length) * Math.PI * 2;
      const rad = stage.R0 * 0.55;
      r.x = Math.sin(ang) * rad; r.y = Math.cos(ang) * rad; r.a = Math.atan2(-r.x, r.y);
    });
  } else {
    G.loadTrack(stage.theme, stage.len, stage.seed);
    zone.back = 120; zone.len = stage.len0; zone.speed = 0; zone.front = zone.back + zone.len;
    const others = alive.filter((r) => !r.isPlayer);
    others.sort(() => Math.random() - 0.5);
    others.forEach((r, k) => {
      r.s = zone.back + 50 + ((k + 0.5) / others.length) * (zone.len - 80);
      r.u = rnd(-G.HALF + 10, G.HALF - 10);
    });
    if (player.alive || stage.respawn) { player.s = zone.back + zone.len * 0.45; player.u = 0; }
  }
  for (const r of racers) {
    Object.assign(r, { vs: 0, vu: 0, ks: 0, ku: 0, kx: 0, ky: 0, v: 0, z: 0, vz: 0, stunT: 0, slowT: 0, frozenT: 0, poisonT: 0, bleedT: 0, burnT: 0,
      droneT: 0, laserT: 0, melee: 0, dashT: 0, rollT: 0, boostT: 0, invulnT: 1.5 });
    if (r.alive) { r.hp = r.maxHp; r.imgs = spriteSet(r); r.corpse = corpseFor(r); }
    syncWorld(r);
  }
  if (!player.alive && stage.respawn) { player.alive = true; player.respawnT = 0; }
  scenery = G.buildScenery(stage.theme);
  scenery.sort((a, b) => (a.s || 0) - (b.s || 0));
  phase = 'intro';
  phaseT = 2.6;
  const target = stage.target;
  banner(stage.name, target > 1 ? `殺到剩 ${target} 人過關` : '只能活一個');
  camSnap();
}

function startGame(type) {
  chosenType = type;
  racers = [];
  for (let i = 0; i < N; i++) {
    const isP = i === 0;
    racers.push(makeRacer(i, isP ? type : S.TYPES[Math.floor(Math.random() * 4)], isP));
  }
  player = racers[0];
  stats.cause = {}; stats.dmg = {}; stats.byPlayer = stats.byAi = stats.wall = stats.playerDeaths = 0; stats.stageAlive = [];
  gameT = 0; bounty = null; spectate = null; ffwd = false;
  $('select').classList.add('hidden');
  if (IS_TOUCH) $('touch').classList.remove('hidden');
  updateSkillButtons(true);
  initAudio();
  loadStage(0);
}

function syncWorld(r) {
  if (stage.theme === 'arena') return;
  const p = G.toWorld(r.s, r.u);
  r.x = p.x; r.y = p.y; r.a = p.h;
}

// ---------- 輸入 ----------
const keys = {};
const edge = { slash: false, near: false, far: false, area: false, item: false, roll: false };
const touch = { mx: 0, my: 0, slash: false };
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  const m = { KeyJ: 'slash', KeyF: 'slash', KeyK: 'near', KeyL: 'far', KeyI: 'area', Space: 'item', ShiftLeft: 'roll', ShiftRight: 'roll' }[e.code];
  if (m) edge[m] = true;
  if (e.code === 'Enter' && spectate) ffwd = !ffwd;
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
    let mx = Math.abs(dx) < 12 ? 0 : dx / R, my = Math.abs(dy) < 12 ? 0 : -dy / R;
    // 手指主要往左右推時，不要不小心一直往前衝
    if (Math.abs(mx) > Math.abs(my) * 1.6) my = 0;
    if (Math.abs(my) > Math.abs(mx) * 2.5) mx = 0;
    touch.mx = mx; touch.my = my;
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
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); edge[key] = true; b.classList.add('on'); if (key === 'slash') touch.slash = true; });
    const up = () => { b.classList.remove('on'); if (key === 'slash') touch.slash = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  };
  btn('bNear', 'near'); btn('bFar', 'far'); btn('bArea', 'area'); btn('bItem', 'item'); btn('bRoll', 'roll'); btn('bSlash', 'slash');
  $('bFfwd').addEventListener('pointerdown', (e) => { e.preventDefault(); ffwd = !ffwd; });
}
setupTouch();

function playerControl() {
  const k = keys;
  let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  let my = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
  if (!mx && !my) { mx = touch.mx; my = touch.my; }
  const c = {
    mx, my, slash: edge.slash || ((touch.slash || k.KeyJ || k.KeyF) && player.punchCd <= 0),
    near: edge.near, far: edge.far, area: edge.area, item: edge.item, roll: edge.roll,
  };
  for (const key in edge) edge[key] = false;
  return c;
}

// ---------- 中文提示 ----------
function popup(text, cls = '') {
  const d = document.createElement('div');
  d.className = 'pop ' + cls;
  d.textContent = text;
  const box = $('pops');
  box.appendChild(d);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => d.remove(), 1100);
}
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
  while (f.children.length > 4) f.lastChild.remove();
  setTimeout(() => d.remove(), 4000);
}
let splatA = 0, warnA = 0;
function screenSplat(a) {
  splatA = Math.min(0.85, splatA + a);
  const blobs = [];
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 100, y = Math.random() * 100, r = 8 + Math.random() * 16;
    blobs.push(`radial-gradient(circle at ${x}% ${y}%, rgba(150,0,0,.95) 0, rgba(120,0,0,.85) ${r}%, transparent ${r + 3}%)`);
  }
  $('splat').style.background = blobs.join(',');
}
const view = () => (spectate && !player.alive ? spectate : player);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (r, d = 120) => Math.hypot(r.x - view().x, r.y - view().y) < d;
const vol = (x, y) => clamp(1 - Math.hypot(x - view().x, y - view().y) / 260, 0, 1);
const enemies = (r) => racers.filter((o) => o !== r && o.alive);

// ---------- 血與死亡 ----------
function blood(x, y, z, n, spd, up, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random());
    particles.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: up * (0.4 + Math.random()), c: col || ['#ff2040', '#d0102a', '#8a0016', '#ff6070'][i & 3], blood: !col, life: 3 });
  }
  if (particles.length > 2600) particles.splice(0, particles.length - 2600);
}

function push(t, kx, ky) {
  if (stage.theme === 'arena') { t.kx += kx; t.ky += ky; return; }
  const fx = Math.sin(t.a), fy = -Math.cos(t.a), rx = Math.cos(t.a), ry = Math.sin(t.a);
  t.ks += kx * fx + ky * fy;
  t.ku += kx * rx + ky * ry;
}

function hurt(t, amt, by, kx = 0, ky = 0, cause = 'hit', quiet = false) {
  if (!t.alive || t.invulnT > 0 || phase !== 'fight') return;
  if (t.rollT > 0 && cause !== 'wall') return; // 翻滾中無敵
  if (t.frozenT > 0 && cause !== 'poison') { amt *= 3; cause = 'ice'; }
  if (t.dashT > 0 && t.dashKind === 'charge') amt *= 0.5;
  if (by && !by.isPlayer && t.isPlayer) amt *= TUNE.aiToPlayer;
  if (by && !by.isPlayer && !t.isPlayer) amt *= TUNE.aiToAi * (1 + stageIdx * 0.6);
  t.hp -= amt;
  if (by && by.isPlayer) { const k = dmgTag || cause; stats.dmg[k] = (stats.dmg[k] || 0) + amt; }
  t.hitT = 0.15;
  t.lastHit = time;
  if (by && by !== t) t.lastAttacker = by;
  if (kx || ky) push(t, kx, ky);
  if (!quiet) {
    blood(t.x, t.y, 10 + t.z, Math.min(50, 10 + amt * 0.6), 60, 80);
    if (t.isPlayer) { screenSplat(0.3); shake = Math.max(shake, 3); sfx.punch(1); }
    else sfx.punch(by && by.isPlayer ? 1 : vol(t.x, t.y) * 0.6);
  }
  if (t.hp <= 0) killRacer(t, by && by !== t ? by : t.lastAttacker, cause);
}

function killRacer(t, by, cause) {
  if (!t.alive) return;
  stats.cause[cause] = (stats.cause[cause] || 0) + 1;
  if (cause === 'wall') stats.wall++;
  if (by && by.isPlayer) stats.byPlayer++; else if (by) stats.byAi++;
  t.alive = false;
  t.deaths++;
  t.place = racers.filter((r) => r.alive).length + 1;
  const big = cause === 'boom' || cause === 'fire' || cause === 'wall';
  if (cause === 'ice') { blood(t.x, t.y, 12, 70, 120, 150, '#bfefff'); booms.push({ x: t.x, y: t.y, r: 14, t: 0, kind: 'ice' }); }
  if (cause === 'poison') blood(t.x, t.y, 10, 60, 70, 120, '#5aff3a');
  if (cause === 'wall' && stage.theme === 'swim') blood(t.x, t.y, 6, 120, 90, 160, '#c8f4ff');
  if (cause === 'wall' && stage.theme === 'run') blood(t.x, t.y, 6, 60, 80, 120, '#6aaa40');
  blood(t.x, t.y, 12 + t.z, big ? 260 : 170, big ? 150 : 110, big ? 220 : 160);
  chunks.push({ img: t.head, x: t.x, y: t.y, z: 16, vx: rnd(-50, 50), vy: rnd(-50, 50), vz: big ? 230 : 150, life: 8, wh: 4 });
  for (let i = 0; i < (big ? 4 : 2); i++) chunks.push({ img: S.LIMB, x: t.x, y: t.y, z: 10, vx: rnd(-80, 80), vy: rnd(-80, 80), vz: big ? 200 : 110, life: 7, wh: 3.5 });
  if (cause !== 'fall') {
    G.paintSplat(t.x, t.y, big ? 14 : 11, 1);
    for (let i = 0; i < 5; i++) G.paintSplat(t.x + rnd(-14, 14), t.y + rnd(-14, 14), rnd(3, 7), 0.9);
    corpses.push({ img: t.corpse, x: t.x, y: t.y, fount: 2.6 });
    if (corpses.length > 90) corpses.shift();
  }
  if (!t.isPlayer && by && by.isPlayer && (Math.random() < TUNE.lootChance || t === bounty)) {
    boxes.push({ x: t.x, y: t.y, s: t.s, loot: true });
    if (t === bounty) boxes.push({ x: t.x + 8, y: t.y, s: t.s, loot: true });
  }
  sfx.splat(t.isPlayer || (by && by.isPlayer) ? 1 : vol(t.x, t.y));
  if (by && by !== t) {
    by.kills++;
    feed(`${by.name} 殺了 ${t.name}`, by.isPlayer || t.isPlayer);
    if (by.isPlayer) {
      by.hp = Math.min(by.maxHp, by.hp + TUNE.killHeal + (t === bounty ? 40 : 0));
      by.streak = by.streakT > 0 ? by.streak + 1 : 1;
      by.streakT = 3;
      const words = ['擊殺！', '雙殺！', '三殺！', '四殺！', '大屠殺！'];
      if (t === bounty) popup('賞金獵殺！', 'kill');
      else popup(words[Math.min(by.streak, 5) - 1] + (by.streak >= 5 ? ` x${by.streak}` : ''), 'kill');
      stopT = 0.06; flash = 0.05; flashCol = '255,255,255';
      if (near(t, 60)) screenSplat(0.4);
    }
  } else {
    feed(`${t.name} ${cause === 'wall' ? stage.death : cause === 'fall' ? '掉進血池' : cause === 'zap' ? '被電網電死' : '慘死'}`, t.isPlayer);
  }
  if (near(t, 70)) shake = Math.max(shake, 4);
  if (t.isPlayer) {
    stats.playerDeaths++;
    screenSplat(1);
    if (stage.respawn) {
      t.respawnT = 2.2;
      popup('你被殺了！2 秒後復活', 'bad');
    } else {
      popup('你死了！', 'bad');
      setTimeout(() => { if (!player.alive && phase !== 'over') { spectate = pickSpectate(); $('ghost').classList.remove('hidden'); } }, 1200);
    }
  }
  if (t === spectate) spectate = pickSpectate();
}
function pickSpectate() {
  const a = racers.filter((r) => r.alive).sort((x, y) => y.kills - x.kills);
  return a[0] || null;
}

function respawnPlayer() {
  const r = player;
  r.alive = true;
  r.hp = r.maxHp;
  r.s = zone.back + zone.len * 0.5; r.u = 0; r.vs = zone.speed; r.vu = 0; r.ks = r.ku = 0;
  r.invulnT = 2.5; r.stunT = 0; r.frozenT = 0; r.poisonT = r.bleedT = r.burnT = 0;
  syncWorld(r);
  popup('復活！');
}

function explode(x, y, rad, dmg, owner, kind = 'boom') {
  booms.push({ x, y, r: rad, t: 0, kind });
  const m = owner && !owner.isPlayer ? 0.6 : 1;
  for (const o of racers) {
    if (o === owner || !o.alive) continue;
    const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy);
    if (d < rad) hurt(o, dmg * (1 - (0.4 * d) / rad) * m, owner, (dx / (d || 1)) * 200, (dy / (d || 1)) * 200, kind === 'fire' ? 'fire' : 'boom');
  }
  G.paintSplat(x, y, rad * 0.4, 0.5);
  const v = vol(x, y);
  sfx.boom(v);
  shake = Math.max(shake, 6 * v);
}
function bolt(x1, y1, z1, x2, y2, z2) {
  const pts = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7, j = i === 0 || i === 7 ? 0 : 1;
    pts.push([x1 + (x2 - x1) * t + rnd(-6, 6) * j, y1 + (y2 - y1) * t + rnd(-6, 6) * j, z1 + (z2 - z1) * t + rnd(-4, 4) * j]);
  }
  bolts.push({ pts, t: 0 });
}
function dot(t, kind, sec, by) {
  t[kind] = Math.max(t[kind], sec);
  t.dotBy = by;
}

// ---------- 方向小工具 ----------
// 「前方」：賽道關卡是 s 比較大的方向，競技場是面向的方向
function fwd(r) { return { x: Math.sin(r.a), y: -Math.cos(r.a) }; }
function nearestEnemy(r, range, frontOnly = false) {
  let best = null, bd = range;
  const f = fwd(r);
  for (const o of racers) {
    if (o === r || !o.alive) continue;
    const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
    if (d >= bd) continue;
    if (frontOnly && dx * f.x + dy * f.y < -10) continue;
    bd = d; best = o;
  }
  return best;
}

// ---------- 道具 ----------
function rollItem(r) {
  const alive = racers.filter((o) => o.alive);
  const rank = alive.filter((o) => o.kills > r.kills).length;
  const frac = rank / Math.max(1, alive.length - 1);
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
function useItem(r) {
  dmgTag = 'item.' + (r.items[0] || '');
  try { useItemInner(r); } finally { dmgTag = ''; }
}
function useItemInner(r) {
  const it = r.items.shift();
  r.itemT = 0;
  if (!it) return;
  const f = fwd(r), bx = -f.x, by = -f.y, rx = Math.cos(r.a), ry = Math.sin(r.a);
  const msg = (t) => { if (r.isPlayer) popup(t, 'skill'); };
  switch (it) {
    case 'axe': r.melee = r.isPlayer ? 6 : 3; r.meleeTick = 0; msg('斧頭狂砍！'); break;
    case 'adren': boost(r, 2.5, 1.5); r.hp = Math.min(r.maxHp, r.hp + 30); msg('腎上腺素！'); break;
    case 'oil': hazards.push({ type: 'oil', x: r.x + bx * 16, y: r.y + by * 16, owner: r, arm: 0.6, life: 20 }); break;
    case 'spikes': for (const u of [-14, -5, 5, 14]) hazards.push({ type: 'spikes', x: r.x + bx * 14 + rx * u, y: r.y + by * 14 + ry * u, owner: r, arm: 0.6, life: 20 }); break;
    case 'fireball': for (const da of [-0.15, 0, 0.15]) shots.push({ kind: 'fireball', x: r.x + f.x * 8, y: r.y + f.y * 8, z: 8, a: r.a + da, spd: 300, life: 1.6, owner: r }); msg('火球術！'); break;
    case 'darts': for (let k = -3; k <= 3; k++) shots.push({ kind: 'dart', x: r.x, y: r.y, z: 9, a: r.a + k * 0.16, spd: 380, life: 1.1, owner: r }); msg('毒鏢！'); break;
    case 'missile': for (let k = 0; k < 2; k++) shots.push({ kind: 'missile', x: r.x, y: r.y, z: 12, a: r.a + (k ? 0.5 : -0.5), spd: 260, life: 3, owner: r, target: nearestEnemy(r, 400) }); msg('追蹤飛彈！'); break;
    case 'chain': {
      let src = r, first = true;
      const hit = new Set([r]);
      for (let n = 0; n < TUNE.chainTargets; n++) {
        let best = null, bd = first ? 200 : 90;
        for (const o of racers) { if (hit.has(o) || !o.alive) continue; const d = dist(o, src); if (d < bd) { bd = d; best = o; } }
        if (!best) break;
        bolt(src.x, src.y, 12, best.x, best.y, 12);
        hurt(best, 70, r, 0, 0, 'shock');
        hit.add(best); src = best; first = false;
      }
      flash = 0.08; flashCol = '180,240,255'; sfx.boom(0.5); msg('連鎖閃電！'); break;
    }
    case 'freeze':
      for (const o of enemies(r)) if (dist(o, r) < 80) { o.frozenT = 3; }
      booms.push({ x: r.x, y: r.y, r: 40, t: 0, kind: 'ice' });
      flash = 0.08; flashCol = '200,240,255'; msg('冰凍術！打碎他們！'); break;
    case 'gas':
      clouds.push({ x: r.x + bx * 10, y: r.y + by * 10, r: 30, t: 6, owner: r, kind: 'gas' });
      clouds.push({ x: r.x + f.x * 30, y: r.y + f.y * 30, r: 30, t: 6, owner: r, kind: 'gas' });
      msg('毒氣彈！'); break;
    case 'laser': r.laserT = 1.6; msg('雷射砲！'); break;
    case 'drone': r.droneT = 10; r.droneTick = 0; msg('戰鬥無人機出動！'); break;
    case 'storm': case 'blizzard': case 'acid':
      weather = { type: it, t: TUNE.weatherT, owner: r, tick: 0 };
      if (r.isPlayer) popup({ storm: '召喚雷暴！', blizzard: '暴風雪！', acid: '酸雨來了！' }[it], 'skill');
      else if (near(r, 400)) popup(`${r.name} 改變了天氣！`, 'bad');
      break;
  }
}

// ---------- 三招技能 ----------
function castSkill(r, slot) {
  dmgTag = 'skill.' + slot;
  try { return castSkillInner(r, slot); } finally { dmgTag = ''; }
}
function castSkillInner(r, slot) {
  if (r.cd[slot] > 0 || r.stunT > 0 || r.frozenT > 0) return false;
  const P = r.isPlayer;
  const m = P ? 1 : TUNE.aiSkillMul;
  r.cd[slot] = CD[slot] * (P ? 1 : TUNE.aiCdMul);
  const name = SKILLS[r.type][slot][0];
  if (P) popup(name + '！', 'skill');
  const f = { ...fwd(r) };
  const hitNearest = (range, dmg, stun, kb, cause = 'slash') => {
    if (P) { const t = nearestEnemy(r, TUNE.lunge); if (t && dist(t, r) > range * 0.7) lungeTo(r, t, 10); }
    const o = nearestEnemy(r, range);
    if (!o) return null;
    const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy) || 1;
    hurt(o, dmg * m, r, (dx / d) * kb, (dy / d) * kb, cause);
    if (stun) o.stunT = Math.max(o.stunT, stun);
    slashes.push({ x: o.x, y: o.y, t: 0, owner: r, size: 12 });
    return o;
  };
  const key = r.type + '.' + slot;
  switch (key) {
    // 肌肉阿伯
    case 'muscle.near': hitNearest(24, 50, 1.0, 260); shake = P ? Math.max(shake, 3) : shake; break;
    case 'muscle.far': {
      const o = nearestEnemy(r, 230, true) || nearestEnemy(r, 230);
      const tx = o ? o.x : r.x + f.x * 120, ty = o ? o.y : r.y + f.y * 120;
      shots.push({ kind: 'dumbbell', x: r.x, y: r.y, z: 10, sx: r.x, sy: r.y, tx, ty, p: 0, dur: 0.55, owner: r, life: 1 });
      break;
    }
    case 'muscle.area': r.dashT = 0.9; r.dashKind = 'charge'; r.hitSet = new Set(); break;
    // 忍者小翠
    case 'ninja.near': {
      const o = nearestEnemy(r, 130);
      if (o) {
        for (let i = 0; i < 20; i++) particles.push({ x: r.x, y: r.y, z: rnd(2, 16), vx: rnd(-40, 40), vy: rnd(-40, 40), vz: rnd(0, 30), c: '#6a6a7a', life: 0.5 });
        if (stage.theme === 'arena') { const of = fwd(o); r.x = o.x - of.x * 10; r.y = o.y - of.y * 10; r.a = o.a; }
        else { r.s = Math.max(zone.back + 8, o.s - 10); r.u = o.u; syncWorld(r); }
        hurt(o, 55 * m, r, 0, 0, 'slash');
        slashes.push({ x: o.x, y: o.y, t: 0, owner: r, size: 14 });
      }
      break;
    }
    case 'ninja.far': {
      const ahead = enemies(r).sort((a, b) => dist(a, r) - dist(b, r));
      for (let k = 0; k < 3; k++) shots.push({ kind: 'shuriken', x: r.x, y: r.y, z: 10, a: r.a + (k - 1) * 0.3, spd: 340, life: 2.5, owner: r, target: ahead[k] || ahead[0] || null, dmg: 35 * m });
      break;
    }
    case 'ninja.area':
      clouds.push({ x: r.x, y: r.y, r: 34, t: 4, owner: r, kind: 'smoke' });
      for (const o of enemies(r)) if (dist(o, r) < 34) hurt(o, 20 * m, r, 0, 0, 'poison');
      break;
    // 屠夫老王
    case 'butcher.near': { const o = hitNearest(22, 60, 0, 120); if (o) dot(o, 'bleedT', 4, r); break; }
    case 'butcher.far': { const o = nearestEnemy(r, 260); shots.push({ kind: 'hook', x: r.x, y: r.y, z: 10, a: o ? Math.atan2(o.x - r.x, -(o.y - r.y)) : r.a, spd: 520, life: 0.5, owner: r }); break; }
    case 'butcher.area':
      slashes.push({ x: r.x, y: r.y, t: 0, owner: r, size: 34, big: true });
      for (const o of enemies(r)) {
        const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
        if (d < (P ? 34 : 24)) hurt(o, 75 * m, r, (dx / (d || 1)) * 200, (dy / (d || 1)) * 200, 'slash');
      }
      if (P) shake = Math.max(shake, 4);
      break;
    // 外送阿明
    case 'courier.near': if (hitNearest(24, 50, 0.4, 180)) boost(r, 1.2, 1.4); break;
    case 'courier.far': {
      const tg = nearestEnemy(r, 90);
      if (tg) { const d = dist(tg, r) || 1; f.x = (tg.x - r.x) / d; f.y = (tg.y - r.y) / d; }
      const sa = Math.atan2(f.x, -f.y);
      for (const o of enemies(r)) {
        const dx = o.x - r.x, dy = o.y - r.y;
        const along = dx * f.x + dy * f.y, lat = Math.abs(dx * f.y - dy * f.x);
        if (along > 0 && along < 85 && lat < along * 0.6 + 8) { hurt(o, 40 * m, r, f.x * 60, f.y * 60, 'fire'); dot(o, 'burnT', 3, r); }
      }
      for (let i = 0; i < 50; i++) {
        const a = sa + rnd(-0.5, 0.5), s = rnd(80, 220);
        particles.push({ x: r.x, y: r.y, z: 10, vx: Math.sin(a) * s, vy: -Math.cos(a) * s, vz: rnd(20, 70), c: i % 2 ? '#ff8a20' : '#ffd040', life: 0.5 });
      }
      break;
    }
    case 'courier.area': r.dashT = 1.2; r.dashKind = 'nitro'; r.hitSet = new Set(); r.fireT = 0; break;
  }
  return true;
}

function slash(r) {
  dmgTag = 'slash';
  try { slashInner(r); } finally { dmgTag = ''; }
}
// 撲過去：把選手往目標移動一大段，並留下殘影
function lungeTo(r, o, keep = 10) {
  const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
  if (d <= keep) return;
  for (let i = 0; i < 10; i++) particles.push({ x: r.x + dx * i / 10, y: r.y + dy * i / 10, z: rnd(6, 14), vx: 0, vy: 0, vz: 10, c: i % 2 ? '#ffffff' : '#ffd000', life: 0.25 });
  if (stage.theme === 'arena') {
    const k = (d - keep) / d;
    r.x += dx * k; r.y += dy * k; r.a = Math.atan2(dx, -dy);
  } else {
    const k = (Math.hypot(o.s - r.s, o.u - r.u) - keep) / (Math.hypot(o.s - r.s, o.u - r.u) || 1);
    r.s = clamp(r.s + (o.s - r.s) * k, zone.back + 8, zone.front - 4);
    r.u = clamp(r.u + (o.u - r.u) * k, -G.HALF + 3, G.HALF - 3);
    syncWorld(r);
  }
}
function slashInner(r) {
  if (r.punchCd > 0 || r.stunT > 0 || r.frozenT > 0) return;
  if (r.isPlayer) { const o = nearestEnemy(r, TUNE.lunge); if (o && dist(o, r) > TUNE.slashRange * 0.7) lungeTo(r, o, 10); }
  r.punchCd = r.isPlayer ? TUNE.slashCd : 1.1;
  r.punchT = 0.2;
  const rad = r.isPlayer ? TUNE.slashRange : 15;
  slashes.push({ x: r.x, y: r.y, t: 0, owner: r, size: rad });
  for (const o of enemies(r)) {
    const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
    if (d < rad) hurt(o, r.isPlayer ? TUNE.slashDmg : 14, r, (dx / (d || 1)) * 130, (dy / (d || 1)) * 130, 'slash');
  }
}

function startRoll(r, mx, my) {
  if (r.rollCd > 0 || r.stunT > 0 || r.frozenT > 0) return;
  r.rollCd = TUNE.rollCd;
  r.rollT = 0.35;
  const d = Math.hypot(mx, my);
  r.rdx = d ? mx / d : 0; r.rdy = d ? my / d : 1;
  if (r.isPlayer) sfx.slip();
}

// ---------- 電腦 ----------
function aiControl(r, dt) {
  const ai = r.ai;
  const c = { mx: 0, my: 0, slash: false, near: false, far: false, area: false, item: false, roll: false };
  ai.think -= dt;
  if (ai.think <= 0) {
    ai.think = rnd(0.25, 0.5);
    // 越後面越兇，也比較常找玩家麻煩
    const aggr = ai.aggr * 0.4 + stageIdx * 0.1 + Math.min(0.5, stageT / 90);
    let best = null, bd = 140 + aggr * 120;
    for (const o of racers) {
      if (o === r || !o.alive) continue;
      let d = dist(o, r);
      if (o.isPlayer) d *= 0.95;
      if (o === bounty) d *= 0.8;
      if (d < bd) { bd = d; best = o; }
    }
    ai.foe = Math.random() < 0.15 + aggr * 0.6 ? best : null;
  }
  ai.laneT -= dt;
  if (ai.laneT <= 0) { ai.laneT = rnd(2, 5); ai.lane = rnd(-0.75, 0.75); }
  const foe = ai.foe && ai.foe.alive ? ai.foe : null;
  const fd = foe ? dist(foe, r) : 1e9;
  if (stage.theme === 'arena') {
    let tx = 0, ty = 0;
    const rr = Math.hypot(r.x, r.y);
    if (foe && rr < G.arenaR - 20) { tx = foe.x; ty = foe.y; }
    const want = Math.atan2(tx - r.x, -(ty - r.y));
    const diff = wrap(want - r.a);
    c.mx = clamp(diff * 2.5, -1, 1);
    c.my = Math.abs(diff) < 1.2 && (fd > 10 || !foe) ? 1 : 0.2;
    if (rr > G.arenaR - 25) c.my = 1;
  } else {
    let ts, tu;
    const flee = foe && r.hp < r.maxHp * 0.4 && ai.aggr < 0.8;
    if (flee) { ts = r.s + (foe.s < r.s ? 60 : -60); tu = -foe.u; }
    else if (foe) { ts = foe.s - 6; tu = foe.u; }
    else { ts = zone.back + zone.len * (0.45 + ai.lane * 0.2); tu = ai.lane * (G.HALF - 10); }
    ts = clamp(ts, zone.back + 40, zone.front - 10);
    c.my = clamp((ts - r.s) / 30, -1, 1);
    c.mx = clamp((tu - r.u) / 16, -1, 1);
    if (r.s < zone.back + 35) c.my = 1;
  }
  const calm = stageT < 4;
  if (calm) return c;
  if (foe && fd < 15 && Math.random() < 0.015 * (0.5 + ai.aggr)) c.slash = true;
  const busy = Math.random() < 0.03;
  if (busy && foe && fd < 24) c.near = true;
  if (busy && foe && fd < 200 && fd > 30) c.far = true;
  if (busy && racers.filter((o) => o !== r && o.alive && dist(o, r) < 30).length >= 2) c.area = true;
  if (r.items.length && r.itemT > ai.itemDelay) {
    const it = r.items[0];
    c.item = it === 'axe' || it === 'freeze' || it === 'gas' ? fd < 30 : (it === 'oil' || it === 'spikes' || it === 'adren') ? true : fd < 220;
    if (r.itemT > 6) c.item = true;
  }
  if (r.hp < r.maxHp * 0.3 && Math.random() < 0.01) c.roll = true;
  return c;
}

// 自動駕駛（測試用）
let autoPilot = false;
function autoControl(dt) {
  const r = player;
  const c = { mx: 0, my: 0, slash: false, near: false, far: false, area: false, item: false, roll: false };
  const foe = nearestEnemy(r, 400);
  const fd = foe ? dist(foe, r) : 1e9;
  if (stage.theme === 'arena') {
    const rr = Math.hypot(r.x, r.y);
    const tx = foe && rr < G.arenaR - 15 ? foe.x : 0, ty = foe && rr < G.arenaR - 15 ? foe.y : 0;
    const diff = wrap(Math.atan2(tx - r.x, -(ty - r.y)) - r.a);
    c.mx = clamp(diff * 2.5, -1, 1);
    c.my = fd > 12 || rr > G.arenaR - 20 ? 1 : 0;
  } else {
    const ts = foe ? clamp(foe.s - 8, zone.back + 50, zone.front - 10) : zone.back + zone.len * 0.5;
    c.my = clamp((ts - r.s) / 30, -1, 1);
    c.mx = clamp(((foe ? foe.u : 0) - r.u) / 14, -1, 1);
    if (r.s < zone.back + 45) c.my = 1;
  }
  const casual = autoPilot === 'casual';
  const press = (p) => !casual || Math.random() < p;
  if (stageT > 3) {
    if (fd < TUNE.slashRange && r.punchCd <= 0 && press(0.15)) c.slash = true;
    if (fd < 24 && press(0.05)) c.near = true;
    if (fd < 200 && fd > 25 && press(0.04)) c.far = true;
    if (racers.filter((o) => o !== r && o.alive && dist(o, r) < 34).length >= (casual ? 1 : 2) && press(0.04)) c.area = true;
    if (r.items.length && r.itemT > (casual ? 2.5 : 0.5) && (fd < 120 || r.itemT > 5)) c.item = true;
  }
  if (casual) { c.mx = clamp(c.mx + Math.sin(time * 1.3) * 0.3, -1, 1); }
  return c;
}

// ---------- 移動 ----------
function stepRacer(r, c, dt) {
  for (const k of ['near', 'far', 'area']) r.cd[k] -= dt;
  r.punchCd -= dt; r.punchT -= dt; r.invulnT -= dt; r.hitT -= dt; r.slowT -= dt; r.streakT -= dt; r.rollCd -= dt;
  if (r.items.length) r.itemT += dt;
  if (r.roll > 0) {
    r.roll -= dt;
    if (r.roll <= 0) { r.roll = 0; if (r.isPlayer) { sfx.pickup(); popup(ITEM[r.items[r.items.length - 1]].name + '！'); } }
  }
  // 持續傷害：中毒（綠）、流血（紅）、燙傷（橘）
  if (r.poisonT > 0 || r.bleedT > 0 || r.burnT > 0) {
    r.poisonT -= dt; r.bleedT -= dt; r.burnT -= dt;
    r.dotTick -= dt;
    const col = r.burnT > 0 ? '#ff8a20' : r.poisonT > 0 ? '#7aff5a' : '#ff2040';
    if (Math.random() < 0.4) particles.push({ x: r.x + rnd(-3, 3), y: r.y + rnd(-3, 3), z: rnd(6, 14), vx: 0, vy: 0, vz: 25, c: col, life: 0.5 });
    if (r.dotTick <= 0) {
      r.dotTick = 0.25;
      const n = (r.poisonT > 0) + (r.bleedT > 0) + (r.burnT > 0);
      hurt(r, 3.5 * n, r.dotBy, 0, 0, r.burnT > 0 ? 'fire' : 'poison', true);
      if (!r.alive) return;
    }
  }
  if (r.frozenT > 0) { r.frozenT -= dt; c = { mx: 0, my: 0 }; }
  if (r.stunT > 0) { r.stunT -= dt; c = { mx: 0, my: 0 }; }
  if (phase !== 'fight') c = { mx: 0, my: 0 };
  if (r.boostT > 0) r.boostT -= dt;
  if (c.roll) startRoll(r, c.mx, c.my);
  const spdMul = (r.slowT > 0 ? 0.55 : 1) * (r.boostT > 0 ? r.boostPow : 1);
  if (r.rollT > 0) r.rollT -= dt;

  if (stage.theme === 'arena') {
    let turn = c.mx * 2.6, v = c.my * stage.fwd * spdMul;
    if (r.rollT > 0) { v = 260; turn = 0; }
    if (r.dashT > 0) { r.dashT -= dt; v = r.dashKind === 'nitro' ? 330 : 300; }
    r.a += turn * dt;
    r.v += (v - r.v) * Math.min(1, stage.accel * dt);
    r.x += Math.sin(r.a) * r.v * dt + r.kx * dt;
    r.y += -Math.cos(r.a) * r.v * dt + r.ky * dt;
    const kd = Math.pow(0.02, dt); r.kx *= kd; r.ky *= kd;
    r.lean += (clamp(c.mx, -1, 1) - r.lean) * Math.min(1, 8 * dt);
    if (Math.hypot(r.x, r.y) > G.arenaR + 2 && r.z <= 0 && !r.falling) { r.falling = true; r.vz = 40; }
    if (r.falling) {
      r.vz -= 300 * dt; r.z += r.vz * dt;
      if (r.z < -30) { blood(r.x, r.y, 0, 120, 70, 160); killRacer(r, r.lastAttacker && time - r.lastHit < 4 ? r.lastAttacker : null, 'fall'); return; }
    }
  } else {
    let ts = zone.speed + (c.my > 0 ? c.my * stage.fwd * 0.6 : c.my * stage.fwd * 1.35) * spdMul;
    let tu = c.mx * stage.lat * spdMul;
    // 越靠近前方電網，往前的速度越被壓住，不會一直撞上去
    const room = zone.front - r.s;
    if (ts > zone.speed && room < 60) ts = zone.speed + (ts - zone.speed) * clamp((room - 12) / 48, 0, 1);
    if (r.rollT > 0) { ts = zone.speed + r.rdy * 230; tu = r.rdx * 200; }
    if (r.dashT > 0) { r.dashT -= dt; ts = zone.speed + (r.dashKind === 'nitro' ? 280 : 250); tu = c.mx * stage.lat; }
    const acc = r.rollT > 0 || r.dashT > 0 ? 12 : stage.accel;
    r.vs += (ts - r.vs) * Math.min(1, acc * dt);
    r.vu += (tu - r.vu) * Math.min(1, acc * dt);
    r.s += (r.vs + r.ks) * dt;
    r.u += (r.vu + r.ku) * dt;
    const kd = Math.pow(0.02, dt); r.ks *= kd; r.ku *= kd;
    if (Math.abs(r.u) > G.HALF - 3) { r.u = Math.sign(r.u) * (G.HALF - 3); r.vu *= -0.3; r.ku *= -0.3; }
    // 前方電網
    if (r.s > zone.front) {
      r.s = zone.front - 1; r.vs = zone.speed - 60; r.ks = Math.min(r.ks, -80);
      if (time - r.zapT > 0.5) {
        r.zapT = time;
        for (let i = 0; i < 8; i++) particles.push({ x: r.x, y: r.y, z: rnd(4, 16), vx: rnd(-60, 60), vy: rnd(-60, 60), vz: rnd(20, 60), c: '#9ff3ff', life: 0.3 });
        hurt(r, 6, null, 0, 0, 'zap', true);
        if (!r.alive) return;
      }
    }
    syncWorld(r);
    r.lean += (clamp(r.vu / 60, -1, 1) - r.lean) * Math.min(1, 8 * dt);
    // 後面的死亡之牆
    if (r.s < zone.back) { killRacer(r, r.lastAttacker && time - r.lastHit < 3 ? r.lastAttacker : null, 'wall'); return; }
  }
  const prevStroke = Math.floor(r.anim);
  r.anim += dt * (stage.theme === 'swim' ? 2.6 : 6) * (0.5 + Math.min(1, Math.abs(r.vs - zone.speed) / 60 + 0.5));
  // 游泳：每划一下噴出水花，身後拖一條白色浪
  if (stage.theme === 'swim' && near(r, 160)) {
    if (Math.floor(r.anim) !== prevStroke) {
      const side = Math.floor(r.anim) % 2 ? 1 : -1, rx = Math.cos(r.a), ry = Math.sin(r.a);
      for (let i = 0; i < 10; i++) particles.push({ x: r.x + rx * side * 4, y: r.y + ry * side * 4, z: rnd(2, 6), vx: rnd(-30, 30), vy: rnd(-30, 30), vz: rnd(50, 110), c: i % 3 ? '#ffffff' : '#9ad8ff', life: 0.6 });
    }
    if (Math.random() < 0.5) particles.push({ x: r.x + rnd(-3, 3), y: r.y + rnd(-3, 3), z: 0.5, vx: 0, vy: 0, vz: 4, c: '#e8fbff', life: 0.8 });
  }

  if (r.hp < r.maxHp && time - r.lastHit > (r.isPlayer ? 2.5 : 3)) r.hp = Math.min(r.maxHp, r.hp + (r.isPlayer ? 9 : 6) * dt);
  if (r.hp < r.maxHp * 0.5) { r.dripT -= dt; if (r.dripT <= 0) { r.dripT = 0.05; G.paintSplat(r.x + rnd(-2, 2), r.y + rnd(-2, 2), 1.3, 0.9); } }

  // 衝撞類技能：撞到的人噴飛
  if (r.dashT > 0) {
    if (r.dashKind === 'nitro') {
      r.fireT -= dt;
      if (r.fireT <= 0) { r.fireT = 0.06; hazards.push({ type: 'fire', x: r.x, y: r.y, owner: r, arm: 0, life: 3.5 }); }
    }
    for (const o of enemies(r)) {
      if (r.hitSet.has(o) || dist(o, r) > 16) continue;
      r.hitSet.add(o);
      const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy) || 1;
      hurt(o, (r.dashKind === 'nitro' ? 40 : 70) * (r.isPlayer ? 1 : TUNE.aiSkillMul), r, (dx / d) * 280, (dy / d) * 280, 'boom');
    }
  }
  if (r.melee > 0) {
    r.melee -= dt; r.meleeTick -= dt;
    if (r.meleeTick <= 0) {
      r.meleeTick = r.isPlayer ? 0.4 : 0.6;
      for (const o of enemies(r)) { const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy); if (d < 24) hurt(o, 32, r, (dx / (d || 1)) * 150, (dy / (d || 1)) * 150, 'slash'); }
    }
  }
  if (r.laserT > 0) {
    r.laserT -= dt;
    const f = fwd(r);
    for (const o of enemies(r)) {
      const dx = o.x - r.x, dy = o.y - r.y, along = dx * f.x + dy * f.y, lat = Math.abs(dx * f.y - dy * f.x);
      if (along > 0 && along < 240 && lat < 10 && (o.laserCd || 0) < time) { o.laserCd = time + 0.2; hurt(o, 45, r, f.x * 60, f.y * 60, 'fire'); }
    }
  }
  if (r.droneT > 0) {
    r.droneT -= dt; r.droneTick -= dt;
    if (r.droneTick <= 0) {
      r.droneTick = 0.3;
      const dp = dronePos(r);
      let best = null, bd = 110;
      for (const o of enemies(r)) { const d = dist(o, dp); if (d < bd) { bd = d; best = o; } }
      if (best) { tracers.push({ x1: dp.x, y1: dp.y, z1: dp.z, x2: best.x, y2: best.y, z2: 10, t: 0 }); hurt(best, 22, r, 0, 0, 'hit'); }
    }
  }
  if (c.item && r.items.length && !r.roll) useItem(r);
  if (c.near) castSkill(r, 'near');
  if (c.far) castSkill(r, 'far');
  if (c.area) castSkill(r, 'area');
  if (c.slash) slash(r);
}
const dronePos = (r) => ({ x: r.x + Math.cos(time * 3) * 10, y: r.y + Math.sin(time * 3) * 10, z: 26 });

// ---------- 主更新 ----------
function updateZone(dt) {
  if (stage.theme === 'arena') {
    const k = clamp(stageT / stage.dur, 0, 1);
    let R = stage.R0 + (stage.R1 - stage.R0) * k;
    if (stageT > stage.dur) R = Math.max(14, stage.R1 - (stageT - stage.dur) * 3);
    if (R < G.arenaR - 2) G.shrinkArena(Math.floor(R));
    return;
  }
  const st = stage;
  const bz = st.bloodZone && stageT > st.bloodZone[0] && stageT < st.bloodZone[1];
  if (bz && !zone.bloodZone) { banner('血鬥區！', '殺戮帶停住了，快速縮小中'); sfx.boom(0.6); }
  zone.bloodZone = bz;
  zone.overtime = stageT > st.dur;
  if (zone.overtime && !zone.otShown) { zone.otShown = true; banner('收網！', '死亡之牆加速'); }
  if (!zone.overtime) zone.otShown = false;
  let rate = (st.len0 - st.len1) / st.dur;
  zone.speed = bz ? 0 : st.zoneSpeed;
  if (bz) rate += 22;
  if (zone.overtime) { rate = 30; zone.speed = st.zoneSpeed * 1.3; }
  zone.len = Math.max(zone.overtime ? 24 : st.len1 * 0.7, zone.len - rate * dt);
  // 血鬥區時牆往前推（前方不動）
  zone.back += zone.speed * dt + (bz ? rate * dt : 0);
  zone.front = zone.back + zone.len;
  if (zone.front > G.trackLen - 40) { zone.front = G.trackLen - 40; zone.back = zone.front - zone.len; }
}

let warned = 0;
function update(dt) {
  time += dt;
  if (stopT > 0) { stopT -= dt; return; }
  if (phase === 'select' || phase === 'over') return;
  if (phase === 'intro') {
    phaseT -= dt;
    if (phaseT <= 0) { phase = 'fight'; popup('開殺！', 'kill'); sfx.beep(true); }
  } else if (phase === 'clear') {
    phaseT -= dt;
    if (phaseT <= 0) { if (stageIdx + 1 < STAGES.length) loadStage(stageIdx + 1); else endGame(); }
  }
  if (phase === 'fight') { stageT += dt; gameT += dt; updateZone(dt); }

  for (const r of racers) {
    if (!r.alive) {
      if (r.isPlayer && r.respawnT > 0 && phase === 'fight') { r.respawnT -= dt; if (r.respawnT <= 0) respawnPlayer(); }
      continue;
    }
    const c = r.isPlayer ? (autoPilot ? autoControl(dt) : playerControl()) : aiControl(r, dt);
    stepRacer(r, c, dt);
  }
  // 互相推擠
  for (let i = 0; i < racers.length; i++) {
    const a = racers[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < racers.length; j++) {
      const b = racers[j];
      if (!b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx > 9 || dx < -9 || dy > 9 || dy < -9) continue;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 9) { const p = (9 - d) / 2; push(a, (-dx / d) * p * 20, (-dy / d) * p * 20); push(b, (dx / d) * p * 20, (dy / d) * p * 20); }
    }
  }
  // 賞金骷髏
  const top = racers.filter((r) => r.alive && r.kills >= 3).sort((a, b) => b.kills - a.kills);
  const nb = top.length && (top.length === 1 || top[0].kills > top[1].kills) ? top[0] : bounty && bounty.alive ? bounty : null;
  if (nb !== bounty && nb) { if (nb.isPlayer) popup('你被懸賞了！大家都會來殺你', 'bad'); else if (phase === 'fight') feed(`${nb.name} 被懸賞了！`, true); }
  bounty = nb;

  // 道具箱：在殺戮帶裡面一直冒出來
  if (phase === 'fight') {
    boxT -= dt;
    if (boxT <= 0 && boxes.filter((b) => !b.loot).length < 14) {
      boxT = TUNE.boxEvery;
      if (stage.theme === 'arena') {
        const a = rnd(0, Math.PI * 2), d = rnd(0, G.arenaR - 15);
        boxes.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
      } else {
        const s = rnd(zone.back + zone.len * 0.3, zone.front - 10), p = G.toWorld(s, rnd(-G.HALF + 8, G.HALF - 8));
        boxes.push({ x: p.x, y: p.y, s });
      }
    }
  }
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (b.s !== undefined && stage.theme !== 'arena' && b.s < zone.back) { boxes.splice(i, 1); continue; }
    for (const r of racers) {
      if (!r.alive || r.items.length >= 2 || Math.abs(r.x - b.x) > 11 || Math.abs(r.y - b.y) > 11) continue;
      if (!r.isPlayer && (r.items.length || Math.random() > 0.05)) continue;
      r.items.push(rollItem(r));
      r.itemT = 0;
      r.roll = r.isPlayer ? 0.7 : 0;
      boxes.splice(i, 1);
      break;
    }
  }
  // 陷阱、火路
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.arm -= dt; h.life -= dt;
    if (h.life <= 0) { hazards.splice(i, 1); continue; }
    if (h.type === 'fire' && Math.random() < 0.3) particles.push({ x: h.x + rnd(-3, 3), y: h.y + rnd(-3, 3), z: 1, vx: 0, vy: 0, vz: 40, c: Math.random() < 0.5 ? '#ff8a20' : '#ffd040', life: 0.35 });
    for (const r of racers) {
      if (!r.alive || r === h.owner || r.z > 3) continue;
      const d = dist(r, h);
      if (h.type === 'oil' && d < 11 && r.stunT <= 0) { r.stunT = 0.8; if (r.isPlayer) { popup('滑倒！', 'bad'); sfx.slip(); } }
      else if (h.type === 'spikes' && d < 8) { r.slowT = 1.5; hurt(r, 40, h.owner, 0, 0, 'hit'); hazards.splice(i, 1); break; }
      else if (h.type === 'fire' && d < 9) dot(r, 'burnT', 1.5, h.owner);
    }
  }
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cl = clouds[i];
    cl.t -= dt;
    if (cl.t <= 0) { clouds.splice(i, 1); continue; }
    if (Math.random() < 0.6) particles.push({ x: cl.x + rnd(-cl.r, cl.r) * 0.7, y: cl.y + rnd(-cl.r, cl.r) * 0.7, z: rnd(0, 6), vx: 0, vy: 0, vz: 20, c: cl.kind === 'smoke' ? '#9a9aaa' : '#5aff3a', life: 0.7 });
    for (const o of racers) {
      if (o === cl.owner || !o.alive) continue;
      if (dist(o, cl) < cl.r) { dot(o, 'poisonT', 2.5, cl.owner); o.slowT = 0.2; }
    }
  }
  // 飛行物
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    if (s.kind === 'dumbbell') {
      s.p += dt / s.dur;
      s.x = s.sx + (s.tx - s.sx) * s.p; s.y = s.sy + (s.ty - s.sy) * s.p; s.z = 10 + Math.sin(Math.PI * Math.min(1, s.p)) * 40;
      if (s.p >= 1) {
        booms.push({ x: s.x, y: s.y, r: 14, t: 0, kind: 'boom' });
        for (const o of enemies(s.owner)) if (dist(o, s) < 16) { hurt(o, 55 * (s.owner.isPlayer ? 1 : TUNE.aiSkillMul), s.owner, 0, 0, 'boom'); o.stunT = Math.max(o.stunT, 0.6); }
        if (near(s, 150)) { shake = Math.max(shake, 3); sfx.boom(0.4); }
        shots.splice(i, 1);
      }
      continue;
    }
    if (s.target && s.target.alive) {
      const want = Math.atan2(s.target.x - s.x, -(s.target.y - s.y));
      s.a += clamp(wrap(want - s.a), -6 * dt, 6 * dt);
    }
    s.x += Math.sin(s.a) * s.spd * dt;
    s.y -= Math.cos(s.a) * s.spd * dt;
    if (s.kind === 'missile' && Math.random() < 0.7) particles.push({ x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 10, c: '#c0c0c8', life: 0.4 });
    if (s.kind === 'fireball' && Math.random() < 0.8) particles.push({ x: s.x, y: s.y, z: s.z, vx: rnd(-10, 10), vy: rnd(-10, 10), vz: 20, c: Math.random() < 0.5 ? '#ffb020' : '#ff4a10', life: 0.3 });
    let hit = null;
    for (const r of racers) { if (r === s.owner || !r.alive) continue; if (Math.hypot(r.x - s.x, r.y - s.y) < 9) { hit = r; break; } }
    if (hit || s.life <= 0) {
      const own = s.owner;
      if (s.kind === 'fireball') explode(s.x, s.y, 20, 60, own, 'fire');
      else if (s.kind === 'missile') explode(s.x, s.y, 18, 90, own, 'boom');
      else if (hit && s.kind === 'dart') { hurt(hit, 15, own, 0, 0, 'hit'); dot(hit, 'poisonT', 4, own); }
      else if (hit && s.kind === 'hook') {
        // 肉鉤：把人拉到面前
        const m = own.isPlayer ? 1 : TUNE.aiSkillMul;
        if (stage.theme === 'arena') { const f = fwd(own); hit.x = own.x + f.x * 12; hit.y = own.y + f.y * 12; }
        else { hit.s = own.s + 12; hit.u = own.u; syncWorld(hit); }
        hurt(hit, 25 * m, own, 0, 0, 'slash'); hit.stunT = Math.max(hit.stunT, 0.7);
        if (own.isPlayer) popup('勾到了！', 'skill');
      } else if (hit) hurt(hit, s.dmg || 40, own, Math.sin(s.a) * 120, -Math.cos(s.a) * 120, 'slash');
      shots.splice(i, 1);
    }
  }
  // 天氣
  if (weather) {
    weather.t -= dt; weather.tick -= dt;
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
  for (const arr of [slashes, booms, bolts, tracers]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > 0.6) arr.splice(i, 1); }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vz -= (p.blood ? 300 : 60) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z <= 0) { if (p.blood && Math.random() < 0.35) G.paintSplat(p.x, p.y, 1 + Math.random() * 1.5, 0.9); particles.splice(i, 1); }
    else if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i];
    c.life -= dt;
    if (c.z > 0 || c.vz > 0) {
      c.vz -= 300 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.z <= 0) { c.z = 0; if (c.vz < -100) { c.vz = -c.vz * 0.3; G.paintSplat(c.x, c.y, 2.5, 1); } else c.vz = 0; c.vx *= 0.4; c.vy *= 0.4; }
    }
    if (c.life <= 0) chunks.splice(i, 1);
  }
  for (const c of corpses) if (c.fount > 0) { c.fount -= dt; blood(c.x, c.y, 4, 3, 26, 130 * Math.min(1, c.fount)); }

  // 過關判定
  const alive = racers.filter((r) => r.alive).length + (player.respawnT > 0 && !player.alive ? 1 : 0);
  if (phase === 'fight') {
    if (alive <= 1 || (stageIdx === STAGES.length - 1 && alive <= stage.target)) endGame();
    else if (alive <= stage.target && stageT >= stage.dur * TUNE.minStage) {
      phase = 'clear';
      phaseT = 2.2;
      stats.stageAlive.push(alive);
      if (player.respawnT > 0 && !player.alive) { player.respawnT = 0; player.alive = true; }
      banner(`${stage.name.split('：')[1]} 結束`, `存活 ${alive} 人${player.alive ? '・你晉級了！' : ''}`);
    }
  }
  // 靠近後牆的警告
  if (player.alive && stage.theme !== 'arena' && phase === 'fight') {
    const gap = player.s - zone.back;
    warnA = gap < 60 ? 1 - gap / 60 : 0;
    if (gap < 45 && time - warned > 4) { warned = time; popup(`${stage.wallName}逼近！往前跑！`, 'bad'); }
  } else if (player.alive && stage.theme === 'arena' && phase === 'fight') {
    const gap = G.arenaR - Math.hypot(player.x, player.y);
    warnA = gap < 30 ? 1 - gap / 30 : 0;
  } else warnA = 0;

  updateCamera(dt);
  shake = Math.max(0, shake - dt * 14);
  flash -= dt;
  splatA = Math.max(0, splatA - dt * 0.6);
  $('splat').style.opacity = splatA;
  $('warn').style.opacity = warnA * (0.6 + 0.4 * Math.sin(time * 10));
  updateSkillButtons();
}

function endGame() {
  if (phase === 'over') return;
  phase = 'over';
  const winner = racers.find((r) => r.alive && (r.isPlayer || !player.alive)) || racers.filter((r) => r.alive).sort((a, b) => b.kills - a.kills)[0];
  const won = player.alive;
  if (won) player.place = 1;
  stats.won = won;
  stats.place = player.alive ? 1 : player.place;
  setTimeout(() => {
    $('ghost').classList.add('hidden');
    $('touch').classList.add('hidden');
    $('resRank').textContent = won ? '🏆 你是唯一的倖存者！' : `💀 第 ${player.place} 名陣亡`;
    $('resRank').className = 'shadow ' + (won ? 'win' : 'lose');
    $('resBody').innerHTML = `
      <div class="row"><span>冠軍</span><b>${won ? '你' : winner ? winner.name : '無人生還'}</b></div>
      <div class="row"><span>你的擊殺</span><b>${player.kills}</b></div>
      <div class="row"><span>死亡次數</span><b>${player.deaths}</b></div>
      <div class="row"><span>遊戲時間</span><b>${Math.floor(gameT / 60)}:${String(Math.floor(gameT % 60)).padStart(2, '0')}</b></div>`;
    $('result').classList.remove('hidden');
  }, 1800);
}

// ---------- 攝影機 ----------
function camTarget() {
  const r = view();
  if (!r) return null;
  if (stage.theme === 'arena') return { a: r.a, x: r.x, y: r.y, z: r.z };
  const p = G.toWorld(Math.max(0, r.s - CAM_BACK), r.u * 0.7);
  return { a: G.pointAt(r.s).h, x: p.x, y: p.y, z: r.z, track: true };
}
function camSnap() { const t = camTarget(); if (!t) return; camA = t.a; updateCamera(1, true); }
function updateCamera(dt, snap = false) {
  const t = camTarget();
  if (!t) return;
  camA += wrap(t.a - camA) * (snap ? 1 : Math.min(1, 6 * dt));
  if (t.track) { camX = t.x; camY = t.y; }
  else { const r = view(); camX = r.x - Math.sin(camA) * CAM_BACK; camY = r.y + Math.cos(camA) * CAM_BACK; }
  const r = view();
  camF += (BASE_F * (r.boostT > 0 || r.dashT > 0 ? 0.88 : 1) - camF) * Math.min(1, 4 * dt);
  camHgt = CAM_H + Math.max(0, t.z) * 0.4;
}

// ---------- 畫面 ----------
const img = g.createImageData(W, H);
const buf = new Uint32Array(img.data.buffer);
function renderGround() {
  const sa = Math.sin(camA), ca = Math.cos(camA);
  let lastKey = -1, lastCol = null;
  for (let sy = HZ + 1; sy < H; sy++) {
    const d = (camHgt * camF) / (sy - HZ), k = d / camF;
    let wx = camX + sa * d - ca * (W / 2) * k, wy = camY - ca * d - sa * (W / 2) * k;
    const dx = ca * k, dy = sa * k;
    let idx = sy * W;
    for (let sx = 0; sx < W; sx++) {
      const px = Math.floor(wx), py = Math.floor(wy);
      const key = G.ckey(px >> 7, py >> 7);
      if (key !== lastKey) { lastKey = key; lastCol = G.chunkCol.get(key) || null; }
      buf[idx++] = lastCol ? lastCol[((py & 127) << 7) | (px & 127)] : G.outsideColor(px, py);
      wx += dx; wy += dy;
    }
  }
  g.putImageData(img, 0, 0, 0, HZ + 1, W, H - HZ - 1);
}
const panoCache = {};
function panoFor(theme) {
  if (panoCache[theme]) return panoCache[theme];
  const src = ART.PANO[theme];
  const h = HZ + 1, w = Math.round((src.width * h) / src.height);
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.drawImage(src, 0, 0, w, h);
  x.save(); x.translate(w * 2, 0); x.scale(-1, 1); x.drawImage(src, 0, 0, w, h); x.restore();
  return (panoCache[theme] = c);
}
function renderSky() {
  const pano = panoFor(stage.theme), PW = pano.width;
  let ox = -(((camA / (Math.PI * 2)) * PW * 1.5) % PW);
  if (ox > 0) ox -= PW;
  ox = Math.round(ox);
  g.drawImage(pano, ox, 0);
  g.drawImage(pano, ox + PW, 0);
  const tint = SKY_TINT[stage.theme];
  if (tint) { g.fillStyle = tint; g.fillRect(0, 0, W, HZ + 1); }
  const hz = HAZE[stage.theme];
  for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(${hz},${(1 - i / 22) * 0.75})`; g.fillRect(0, HZ + 1 + i, W, 1); }
}

let sprites = [];
function project(x, y, z) {
  const sa = Math.sin(camA), ca = Math.cos(camA);
  const dx = x - camX, dy = y - camY;
  const depth = dx * sa - dy * ca;
  if (depth < 4) return null;
  const lat = dx * ca + dy * sa, sc = camF / depth;
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
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / (n || 1), y = y0 + ((y1 - y0) * i) / (n || 1); g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w); }
}
function line3d(x1, y1, z1, x2, y2, z2, w, col) { const a = project(x1, y1, z1), b = project(x2, y2, z2); if (a && b) pixLine(a.sx, a.sy, b.sx, b.sy, w, col); }

let SCN = null;
function scn() {
  return SCN || (SCN = {
    tree: [S.TREE, 26], pine: [ART.A.prop_pine, 32], rock: [ART.A.prop_farm, 16], crowd: [S.CROWD[0], 13], palm: [ART.A.prop_beach, 30],
    umbrella: [ART.A.prop_beach, 26], tower: [S3.TOWER, 26], lamp: [ART.A.prop_lamp, 30], torch: [S3.TORCH[0], 14],
  });
}
function nearbyScenery(lo, hi) {
  let a = 0, b = scenery.length;
  while (a < b) { const m = (a + b) >> 1; if ((scenery[m].s || 0) < lo) a = m + 1; else b = m; }
  const out = [];
  for (let i = a; i < scenery.length && (scenery[i].s || 0) < hi; i++) out.push(scenery[i]);
  return out;
}
function renderSprites() {
  sprites = [];
  const fr = Math.floor(time * 4) % 2;
  const v = view();
  const list = stage.theme === 'arena' ? scenery : nearbyScenery((v ? v.s : 0) - 100, (v ? v.s : 0) + 1000);
  for (const o of list) {
    if (o.kind === 'building') { const k = Math.floor(((o.s || 0) * 7 + o.side * 3) % 3 + 3) % 3; addSprite(S3.BUILDINGS[k], o.x, o.y, 0, 70 - k * 12); continue; }
    const [im, wh] = scn()[o.kind];
    addSprite(o.kind === 'crowd' ? S.CROWD[fr] : o.kind === 'torch' ? S3.TORCH[fr] : im, o.x, o.y, 0, wh);
  }
  // 死亡之牆與電網
  if (stage.theme !== 'arena') {
    const wallImg = ART.A[`wall_${stage.wall}${fr}`];
    const wb = G.toWorld(zone.back, 0);
    addSprite(wallImg, wb.x, wb.y, 0, ((G.RW + 30) * wallImg.height) / wallImg.width);
    const fence = ART.A[`wall_fence${Math.floor(time * 12) % 2}`];
    const fb = G.toWorld(zone.front, 0);
    addSprite(fence, fb.x, fb.y, 0, ((G.RW + 16) * fence.height) / fence.width, { alpha: 0.9 });
  }
  for (const b of boxes) addSprite(ART.A.icon_qbox, b.x, b.y, 3 + Math.sin(time * 3 + b.x), b.loot ? 6 : 7);
  for (const h of hazards) {
    if (h.type === 'fire') continue;
    addSprite(h.type === 'oil' ? S.OIL : S.SPIKES, h.x, h.y, 0, h.type === 'oil' ? 3 : 3.5);
  }
  for (const c of corpses) addSprite(c.img, c.x, c.y, 0, 5);
  for (const cl of clouds) {
    for (let k = 0; k < 3; k++) {
      const x = cl.x + Math.cos(k * 2.1) * cl.r * 0.45, y = cl.y + Math.sin(k * 2.1) * cl.r * 0.45;
      const q = project(x, y, 0);
      if (q && q.depth > 70) addSprite(cl.kind === 'smoke' ? S2.GAS[(fr + k) % 2] : ART.A.fx_gas, x, y, 0, cl.r * 0.5, { alpha: cl.kind === 'smoke' ? 0.45 : 0.7 });
    }
  }
  for (const s of shots) {
    const im = s.kind === 'fireball' ? ART.A.fx_fireball : s.kind === 'dart' ? S2.DART : s.kind === 'missile' ? S2.MISSILE[fr]
      : s.kind === 'dumbbell' ? skillImg('dumbbell') : s.kind === 'hook' ? skillImg('hook') : S.SHURIKEN[Math.floor(time * 20) % 2];
    addSprite(im, s.x, s.y, s.z, s.kind === 'fireball' ? 7 : s.kind === 'dumbbell' ? 6 : s.kind === 'missile' ? 4 : 3);
  }
  for (const b of booms) {
    // 爆炸：美術圖從小放大再淡出
    const k = clamp(b.t / 0.5, 0, 1);
    if (b.kind === 'ice') addSprite(ART.A.fx_ice, b.x, b.y, 0, b.r * (0.6 + k * 0.9), { alpha: 1 - k * k });
    else addSprite(ART.A.fx_boom, b.x, b.y, -b.r * 0.2, b.r * (0.5 + k * 1.4), { alpha: 1 - k * k });
  }
  for (const r of racers) {
    if (!r.alive || !r.imgs) continue;
    addSprite(r.imgs.frames[0], r.x, r.y, r.z, stage.wh, { racer: r });
    if (r.droneT > 0) { const d = dronePos(r); addSprite(S2.DRONE[Math.floor(time * 20) % 2], d.x, d.y, d.z, 4); }
  }
  for (const c of chunks) addSprite(c.img, c.x, c.y, c.z, c.wh);
  sprites.sort((a, b) => b.depth - a.depth);
  for (const s of sprites) {
    if (s.alpha) g.globalAlpha = s.alpha;
    if (s.racer) drawRacer(s);
    else g.drawImage(s.im, Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h));
    g.globalAlpha = 1;
  }
  for (const h of hazards) {
    if (h.type !== 'fire') continue;
    const q = project(h.x, h.y, 0);
    if (!q || q.depth > 600) continue;
    const sz = Math.max(1, Math.round(q.sc * 4));
    g.fillStyle = Math.floor(time * 12 + h.x) % 2 ? '#ff6a14' : '#ffd040';
    g.fillRect(Math.round(q.sx - sz / 2), Math.round(q.sy - sz), sz, sz);
  }
  for (const p of particles) {
    const q = project(p.x, p.y, p.z);
    if (!q || q.depth > 900) continue;
    const sz = clamp(Math.round(q.sc * 0.8), 1, 3);
    g.fillStyle = p.c;
    g.fillRect(Math.round(q.sx), Math.round(q.sy), sz, sz);
  }
  for (const sl of slashes) {
    if (sl.t > 0.25) continue;
    const q = project(sl.x, sl.y, 8);
    if (!q) continue;
    const rad = (sl.size || 20) * q.sc * (0.5 + sl.t * 2.5);
    g.strokeStyle = sl.t < 0.08 ? '#ffffff' : '#ff3050';
    g.lineWidth = Math.max(2, q.sc * (sl.big ? 2.5 : 1.5));
    g.beginPath();
    g.ellipse(q.sx, q.sy, rad, rad * 0.3, 0, sl.t * 24, sl.t * 24 + 4.2);
    g.stroke();
  }
  for (const r of racers) {
    if (!r.alive || r.laserT <= 0) continue;
    const f = fwd(r);
    line3d(r.x + f.x * 6, r.y + f.y * 6, 9, r.x + f.x * 240, r.y + f.y * 240, 9, 4, '#ff2040');
    line3d(r.x + f.x * 6, r.y + f.y * 6, 9, r.x + f.x * 240, r.y + f.y * 240, 9, 1, '#ffffff');
  }
  for (const s of shots) if (s.kind === 'hook') line3d(s.owner.x, s.owner.y, 10, s.x, s.y, s.z, 1, '#c8c8d8');
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
function drawRacer(s) {
  const r = s.racer;
  const sw = s.w * 0.7;
  if (stage.theme !== 'swim') {
    g.fillStyle = 'rgba(10,6,20,0.4)';
    g.fillRect(Math.round(s.sx - sw / 2), Math.round(s.gy - Math.max(1, s.sc * 1.2)), Math.round(sw), Math.max(1, Math.round(s.sc * 2)));
  }
  if (r.invulnT > 0 && Math.floor(time * 20) % 2) return;
  if (r.rollT > 0) g.globalAlpha = 0.5;
  if (r.boostT > 0 || r.dashT > 0) {
    const f = S.FLAME[Math.floor(time * 20) % 2], fh = s.h * 0.35;
    g.drawImage(f, Math.round(s.sx - fh / 2), Math.round(s.y + s.h - fh * 0.2), Math.round(fh), Math.round(fh));
  }
  drawBody(r, s);
  g.globalAlpha = 1;
  if (r.frozenT > 0) g.drawImage(S2.ICE, Math.round(s.x - s.w * 0.05), Math.round(s.y - s.h * 0.05), Math.round(s.w * 1.1), Math.round(s.h * 1.1));
  if (r.melee > 0) {
    const a = S.AXE[Math.floor(time * 10) % 2], ah = s.h * 0.6;
    g.drawImage(a, Math.round(s.x + (Math.floor(time * 10) % 2 ? s.w * 0.75 : -ah * 0.6)), Math.round(s.y + s.h * 0.05), Math.round(ah), Math.round(ah));
  }
  if (r.stunT > 0) for (let k = 0; k < 3; k++) { g.fillStyle = '#ffe000'; g.fillRect(Math.round(s.sx + Math.cos(time * 8 + k * 2) * s.w * 0.4), Math.round(s.y - 2 + Math.sin(time * 8 + k * 2) * 2), 2, 2); }
  if (r === bounty) { const bh = Math.max(6, s.h * 0.4); g.drawImage(ART.A.icon_bounty || BOUNTY, Math.round(s.sx - bh / 2), Math.round(s.y - bh - 4 + Math.sin(time * 5) * 2), Math.round(bh), Math.round(bh)); }
  if (r.hp < r.maxHp && !r.isPlayer && s.depth < 260) {
    const bw = Math.round(s.w * 0.8);
    g.fillStyle = OUT; g.fillRect(Math.round(s.sx - bw / 2) - 1, Math.round(s.y) - 4, bw + 2, 3);
    g.fillStyle = r.poisonT > 0 ? '#5aff3a' : r.burnT > 0 ? '#ff8a20' : '#ff3040';
    g.fillRect(Math.round(s.sx - bw / 2), Math.round(s.y) - 3, Math.max(0, Math.round((bw * r.hp) / r.maxHp)), 1);
  }
  if (r.isPlayer && player.alive) { g.fillStyle = '#ffe000'; const yy = Math.round(s.y - 6 + Math.sin(time * 6) * 1.5); g.fillRect(Math.round(s.sx) - 2, yy, 5, 2); g.fillRect(Math.round(s.sx) - 1, yy + 2, 3, 1); g.fillRect(Math.round(s.sx), yy + 3, 1, 1); }
}

// 畫角色本體：動作格、左右傾斜、游泳時的起伏與划水
function drawBody(r, s) {
  const A = r.imgs;
  const ph = r.anim;
  const step = Math.floor(ph) % 2;
  let im = A.frames[step % A.frames.length];
  let flip = A.flip && step === 1;
  if (A.leanImg && Math.abs(r.lean) > 0.55) { im = A.leanImg; flip = r.lean < 0; }
  const swim = stage.theme === 'swim';
  if (swim && A.splashImg && (r.rollT > 0 || r.dashT > 0 || r.vs - zone.speed > 30)) im = A.splashImg;
  // 依圖片比例重算寬度（不同動作的圖比例不一樣）
  let h = s.h * (im === A.splashImg ? 0.95 : 1);
  if (swim && A.swimArms) h *= 0.62;
  const w = (im.width * h) / im.height;
  let bob = 0, rot = r.lean * 0.12;
  if (swim) {
    bob = Math.sin(ph * Math.PI) * s.sc * 1.2;
    rot += Math.sin(ph * Math.PI) * 0.12; // 划水時身體左右翻滾
  } else if (stage.theme !== 'bike') bob = -Math.abs(Math.sin(ph * Math.PI)) * s.sc * 1.2;
  g.save();
  g.translate(Math.round(s.sx), Math.round(s.gy - (r.z || 0) * s.sc + bob));
  g.rotate(rot);
  if (flip) g.scale(-1, 1);
  g.imageSmoothingEnabled = w < im.width;
  if (swim && A.swimArms) drawSwimArms(w, h, ph, true);
  g.drawImage(im, -w / 2, -h, w, h);
  if (swim && A.swimArms) drawSwimArms(w, h, ph, false);
  g.restore();
  g.imageSmoothingEnabled = false;
  if (swim) {
    // 身邊的白色浪花圈
    g.fillStyle = 'rgba(255,255,255,0.8)';
    const rw = w * 0.55, cy = s.gy + bob - h * 0.05;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + time * 3;
      g.fillRect(Math.round(s.sx + Math.cos(a) * rw), Math.round(cy + Math.sin(a) * rw * 0.25), Math.max(1, Math.round(s.sc * 0.7)), 1);
    }
  }
}
// 自由式划水：手臂從後面甩過頭頂再插進水裡（back=true 畫在身體後面那一段）
function drawSwimArms(w, h, ph, back) {
  const skin = '#e8b080', dark = '#1a1028';
  for (const side of [-1, 1]) {
    const t = (ph * 0.5 + (side > 0 ? 0.5 : 0)) % 1;
    const up = t < 0.5;
    if (up !== !back) continue;
    const sx = side * w * 0.3, sy = -h * 0.55;
    const ang = up ? -Math.PI * (0.15 + t * 1.6) : Math.PI * 0.6;
    const len = h * (up ? 0.7 : 0.35);
    const ex = sx + side * Math.cos(ang) * len * 0.5, ey = sy + Math.sin(ang) * len;
    const lw = Math.max(2, Math.round(w * 0.12));
    g.lineCap = 'round';
    g.strokeStyle = dark; g.lineWidth = lw + 2;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = skin; g.lineWidth = lw;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
  }
}

function renderWeather() {
  if (!weather) return;
  const w = weather.type;
  if (w === 'storm') { g.fillStyle = 'rgba(10,10,40,0.35)'; g.fillRect(0, 0, W, H); g.fillStyle = '#a8c0ff'; for (let i = 0; i < 70; i++) g.fillRect(Math.random() * W, Math.random() * H, 1, 5); }
  else if (w === 'blizzard') { g.fillStyle = 'rgba(210,230,255,0.22)'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) g.fillRect((Math.random() * W + time * 60) % W, Math.random() * H, 2, 2); }
  else { g.fillStyle = 'rgba(40,120,20,0.2)'; g.fillRect(0, 0, W, H); g.fillStyle = '#7aff5a'; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * W, Math.random() * H, 1, 4); }
}

function panel(x, y, w, h) {
  g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#f0e0ff'; g.fillRect(x, y, w, h);
  g.fillStyle = '#2a1840'; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = '#4a3070'; g.fillRect(x + 1, y + 1, w - 2, 1);
}

function renderHud() {
  // 關卡與時間
  panel(6, 6, 54, 16);
  const left = stage.theme === 'arena' ? Math.max(0, stage.dur - stageT) : Math.max(0, stage.dur - stageT);
  const label = (stage.theme !== 'arena' && zone.overtime) || (stage.theme === 'arena' && stageT > stage.dur) ? 'OVER' : `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  drawText(g, stage.short, 9, 9, 1, '#ffb0c0', null);
  drawText(g, label, 30, 9, 2, left < 10 ? '#ff4050' : '#ffffff');
  // 兩格道具
  for (let k = 0; k < 2; k++) {
    const x = 6 + k * 28;
    panel(x, 28, 24, 24);
    const it = player.items[k];
    if (!it) continue;
    const show = player.roll > 0 && k === player.items.length - 1 ? ITEM_IDS[Math.floor(time * 18) % ITEM_IDS.length] : it;
    g.imageSmoothingEnabled = true;
    g.drawImage(ITEM[show].icon, x + 2, 30, 20, 20);
    g.imageSmoothingEnabled = false;
  }
  // 存活與目標
  const alive = racers.filter((r) => r.alive).length;
  const aS = String(alive);
  drawText(g, aS, W - 10 - textW(aS, 5), 6, 5, alive <= stage.target ? '#7dff7a' : '#ffe000');
  drawText(g, `ALIVE`, W - 10 - textW('ALIVE', 1), 33, 1, '#ffffff');
  if (stage.target > 1) drawText(g, `GOAL ${stage.target}`, W - 10 - textW(`GOAL ${stage.target}`, 1), 40, 1, '#ffb0c0');
  g.drawImage(SKULL, W - 44, 49);
  drawText(g, 'x' + player.kills, W - 32, 50, 2, '#ff4050');
  // 殺戮帶示意條
  const bx = 66, bw = W - 66 - 60, by = 8;
  g.fillStyle = OUT; g.fillRect(bx - 1, by - 1, bw + 2, 9);
  g.fillStyle = '#3a2a50'; g.fillRect(bx, by, bw, 7);
  if (stage.theme !== 'arena') {
    g.fillStyle = '#ff2030'; g.fillRect(bx, by, 3, 7);
    g.fillStyle = '#9ff3ff'; g.fillRect(bx + bw - 2, by, 2, 7);
    for (const r of racers) {
      if (!r.alive) continue;
      const p = clamp((r.s - zone.back) / zone.len, 0, 1), x = Math.round(bx + p * bw);
      if (r.isPlayer) continue;
      g.fillStyle = r === bounty ? '#ffd000' : '#ff6080';
      g.fillRect(x, by + 2 + (r.id % 3), 1, 2);
    }
    if (player.alive) { const p = clamp((player.s - zone.back) / zone.len, 0, 1); g.fillStyle = '#ffe000'; g.fillRect(Math.round(bx + p * bw) - 1, by - 2, 3, 11); }
    if (zone.bloodZone) drawText(g, 'BLOOD ZONE', bx + bw / 2 - textW('BLOOD ZONE', 1) / 2, by + 10, 1, '#ff4050');
  } else {
    const p = clamp(G.arenaR / stage.R0, 0, 1);
    g.fillStyle = '#7a3040'; g.fillRect(bx, by, Math.round(bw * p), 7);
    drawText(g, 'ARENA', bx + 2, by + 1, 1, '#ffffff', null);
  }
  // 背後有人：畫面下緣出現紅色箭頭（越近越亮）
  if (player.alive) {
    let close = false;
    for (const o of racers) {
      if (!o.alive || o === player) continue;
      let behind, lat;
      if (stage.theme === 'arena') {
        const f = fwd(player), dx = o.x - player.x, dy = o.y - player.y;
        behind = -(dx * f.x + dy * f.y); lat = dx * -f.y + dy * f.x;
        if (behind < 4 || Math.hypot(dx, dy) > 90) continue;
      } else {
        behind = player.s - o.s; lat = o.u - player.u;
        if (behind < 4 || behind > 90) continue;
      }
      const a = clamp(1 - behind / 90, 0.25, 1), x = Math.round(W / 2 + clamp(lat * 2.2, -W / 2 + 10, W / 2 - 10));
      g.globalAlpha = a;
      g.fillStyle = o === bounty ? '#ffd000' : '#ff3040';
      for (let i = 0; i < 4; i++) g.fillRect(x - 3 + i, H - 26 + i, 7 - i * 2, 1);
      g.globalAlpha = 1;
      if (behind < 30) close = true;
    }
    if (close && Math.floor(time * 4) % 2) drawText(g, 'BEHIND!', W / 2 - textW('BEHIND!', 1) / 2, H - 34, 1, '#ff4050');
  }
  // 血量
  panel(6, H - 14, 70, 8);
  const hp = clamp(player.hp / player.maxHp, 0, 1) * (player.alive ? 1 : 0);
  for (let i = 0; i < 16; i++) { g.fillStyle = i / 16 < hp ? (hp > 0.5 ? '#40e070' : hp > 0.25 ? '#ffd000' : '#ff3040') : '#3a2a50'; g.fillRect(8 + i * 4, H - 12, 3, 4); }
  // 電腦版顯示三招冷卻
  if (!IS_TOUCH) {
    const keysL = { near: 'K', far: 'L', area: 'I' };
    ['near', 'far', 'area'].forEach((slot, k) => {
      const x = W - 92 + k * 29, y = H - 30;
      panel(x, y, 26, 26);
      const ic = skillImg(SKILLS[player.type][slot][1]);
      const cd = Math.max(0, player.cd[slot]);
      g.globalAlpha = cd > 0 ? 0.35 : 1;
      g.imageSmoothingEnabled = true;
      g.drawImage(ic, x + 3, y + 3, 20, 20);
      g.imageSmoothingEnabled = false;
      g.globalAlpha = 1;
      if (cd > 0) drawText(g, String(Math.ceil(cd)), x + 13 - textW(String(Math.ceil(cd)), 2) / 2, y + 8, 2, '#ffffff');
      drawText(g, keysL[slot], x + 1, y + 1, 1, '#ffd000', null);
    });
  }
  if (phase === 'intro') { const n = Math.ceil(phaseT); if (n <= 3 && n > 0) drawText(g, String(n), W / 2 - textW('1', 10) / 2, HZ, 10, '#ffffff'); }
  if (!player.alive && player.respawnT > 0) drawText(g, 'RESPAWN', W / 2 - textW('RESPAWN', 3) / 2, HZ + 20, 3, '#ff4050');
}

// 手機按鈕：顯示冷卻秒數、道具圖示
let lastBtn = {};
function updateSkillButtons(force) {
  if (!IS_TOUCH || !player) return;
  for (const [slot, id] of [['near', 'bNear'], ['far', 'bFar'], ['area', 'bArea']]) {
    const cd = Math.max(0, Math.ceil(player.cd[slot]));
    const key = slot + cd;
    if (!force && lastBtn[slot] === key) continue;
    lastBtn[slot] = key;
    const b = $(id);
    b.querySelector('i').textContent = cd > 0 ? cd : '';
    b.classList.toggle('cool', cd > 0);
  }
  if (force) {
    for (const [slot, id] of [['near', 'bNear'], ['far', 'bFar'], ['area', 'bArea']]) {
      const [nm, ic] = SKILLS[player.type][slot];
      const b = $(id);
      b.style.backgroundImage = `url(${ICON_URL['sk_' + ic]})`;
      b.querySelector('span').textContent = nm;
    }
  }
  const it = player.items[0] && !(player.roll && player.items.length === 1) ? player.items[0] : '';
  if (force || lastBtn.item !== it) {
    lastBtn.item = it;
    const b = $('bItem');
    b.style.backgroundImage = it ? `url(${ICON_URL[it]})` : '';
    b.querySelector('span').textContent = it ? ITEM[it].name : '道具';
    b.classList.toggle('ready', !!it);
  }
  const rc = player.rollCd > 0;
  if (force || lastBtn.roll !== rc) { lastBtn.roll = rc; $('bRoll').classList.toggle('cool', rc); }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (phase !== 'select' && !window.__pause) {
    const steps = spectate && !player.alive && ffwd ? 4 : 1;
    for (let i = 0; i < steps; i++) update(dt);
  }
  renderAll();
}
function renderAll() {
  if (phase === 'select') { drawSelectBg(); return; }
  const sx = shake > 0 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  const ox = camX, oy = camY;
  camX += sx * 0.5; camY += sx * 0.3;
  renderGround(); renderSky(); renderSprites(); renderWeather();
  camX = ox; camY = oy;
  renderHud();
  if (flash > 0) { g.fillStyle = `rgba(${flashCol},0.5)`; g.fillRect(0, 0, W, H); }
}
function drawSelectBg() {
  camA += 0.002;
  if (!G.T) G.loadTrack('bike', 1200, 5);
  const p = G.pointAt(400);
  camX = p.x; camY = p.y + 80; camHgt = 40; camF = BASE_F;
  renderGround(); renderSky();
}

// ---------- 角色選擇 ----------
function buildSelect() {
  const box = $('cards');
  S.TYPES.forEach((type, i) => {
    const ch = S.CHARS[type];
    const L = S.lookFor(type, null);
    const card = document.createElement('button');
    card.className = 'card';
    const pc = document.createElement('img');
    pc.src = ART.A[`${type}_portrait`].toDataURL();
    pc.className = 'portrait';
    const sk = SKILLS[type];
    card.innerHTML = `<div class="num">${i + 1}</div><div class="nm">${ch.name}</div>
      <div class="sk"><b>近</b>${sk.near[0]}　<b>遠</b>${sk.far[0]}　<b>範圍</b>${sk.area[0]}</div><div class="ds">${SKILL_DESC[type]}</div>`;
    card.insertBefore(pc, card.children[1]);
    card.onclick = () => { portraitSmall = ART.A[`${type}_portrait`]; startGame(type); };
    box.appendChild(card);
  });
  addEventListener('keydown', (e) => { if (phase !== 'select') return; const n = parseInt(e.key, 10); if (n >= 1 && n <= 4) box.children[n - 1].click(); });
}
// 美術圖讀好才開始
ART.ready.then(() => {
  setupArtIcons();
  if (ART.LOGO) { const l = $('logo'); l.src = ART.LOGO.src; l.classList.remove('hidden'); $('title').classList.add('hidden'); }
  buildSelect();
  requestAnimationFrame(frame);
}).catch((e) => { console.error('美術圖讀取失敗', e); buildSelect(); requestAnimationFrame(frame); });

// 手機：擋掉捲動、雙指縮放、雙擊縮放、長按選單，避免畫面被拖走或放大卡住
(() => {
  const inScreen = (e) => e.target.closest && e.target.closest('.screen');
  document.addEventListener('touchmove', (e) => { if (!inScreen(e) || e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastEnd < 350 && !inScreen(e)) e.preventDefault(); lastEnd = n; }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
})();

// ---------- 除錯與自動試玩 ----------
window.dbg = {
  TUNE, stats, keys, touch,
  get player() { return player; }, get racers() { return racers; }, get phase() { return phase; }, get stageIdx() { return stageIdx; }, get zone() { return zone; },
  autopilot(casual = false) { autoPilot = casual ? 'casual' : 'pro'; },
  manual() { autoPilot = false; },
  stage(i) { loadStage(i); },
  newGame(typeIdx, casual) { $('result').classList.add('hidden'); $('ghost').classList.add('hidden'); startGame(S.TYPES[typeIdx]); this.autopilot(casual); },
  runGame(maxSec = 400) {
    stats.dmg = {};
    for (let i = 0; i < maxSec * 60 && phase !== 'over'; i++) update(1 / 60);
    return { won: stats.won, place: stats.place, kills: player.kills, deaths: stats.playerDeaths, time: +gameT.toFixed(1),
      stageAlive: stats.stageAlive.slice(), byPlayer: stats.byPlayer, byAi: stats.byAi, wall: stats.wall, cause: { ...stats.cause }, dmg: Object.fromEntries(Object.entries(stats.dmg).map(([k, v]) => [k, Math.round(v)])) };
  },
  advance(sec) { for (let i = 0; i < sec * 60; i++) update(1 / 60); renderAll(); },
  render: renderAll,
};
