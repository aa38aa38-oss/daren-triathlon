// 遊戲進入點：把遊戲邏輯、3D 畫面、介面、音效接在一起，然後每一格畫面跑一次
import { createScene, applyLook, updateCamera } from './render/scene.js';
import { Sim } from './game/sim.js';
import { events } from './game/events.js';
import { RacerRenderer } from './render/racers.js';
import { Gore } from './render/gore.js';
import { EntityRenderer } from './render/entities.js';
import { buildLevel, disposeLevel } from './levels/index.js';
import { Input } from './input/input.js';
import { Hud } from './ui/hud.js';
import { sfx, initAudio } from './audio.js';

const ctx = createScene(document.getElementById('app'));
const input = new Input();
const hud = new Hud();
let sim = null, level = null, racersR = null, gore = null, ents = null, ffwd = false;

hud.onStart((n) => {
  initAudio();
  sim = new Sim(n);
  window.sim = sim; // 方便除錯
  racersR = new RacerRenderer(ctx.scene, sim.racers);
  gore = new Gore(ctx.scene);
  ents = new EntityRenderer(ctx.scene);
  input.showTouch();
  sim.startStage(0);
});

// 跟玩家（或幽靈）的距離，用來決定音量與畫面震動
function nearness(x, z, range = 45) {
  const h = sim.human;
  const hx = h.ghost ? h.ghostX : h.x, hz = h.ghost ? h.ghostZ : h.z;
  return Math.max(0, 1 - Math.hypot(x - hx, z - hz) / range);
}

events.on('stageStart', ({ sim: s, track }) => {
  if (level) disposeLevel(ctx.scene, level);
  level = buildLevel(track);
  ctx.scene.add(level.group);
  applyLook(ctx, level.look);
  gore.clear();
  gore.mode = track.mode;
  gore.decalLift = track.mode === 'swim' ? 0.16 : 0.03;
  gore.ground = track.isArena ? (x, z) => (Math.hypot(x, z) <= s.radius + 0.3 ? 0 : -3) : () => 0;
  ctx.snap = true;
  ffwd = false;
  hud.stageStart(s);
  hud.message(track.name, 2.5, 'big');
});

events.on('countdown', (n) => { hud.message(String(n), 0.9, 'huge'); sfx.beep(false); });
events.on('go', () => {
  const tr = sim.track;
  hud.message(tr.isArena ? '殺到只剩一個！' : '開打！', 1.2, 'huge red');
  sfx.beep(true);
});

events.on('kill', (e) => {
  gore.kill(e);
  hud.killfeed(e);
  const near = nearness(e.x, e.z);
  sfx.splat(Math.max(near, e.killer && e.killer.isHuman ? 1 : 0));
  if (e.victim.isHuman) {
    hud.splat(1);
    ctx.shake = Math.max(ctx.shake, 0.8);
  } else if (near > 0.88) {
    hud.splat(0.45);
  }
  if (e.killer && e.killer.isHuman) {
    hud.popup(`💀 擊殺 +100`);
    ctx.shake = Math.max(ctx.shake, 0.3);
  }
});

events.on('hit', (e) => {
  gore.hit(e);
  if (e.racer.isHuman) {
    hud.damage();
    sfx.punch(1);
    ctx.shake = Math.max(ctx.shake, 0.25);
  } else if (e.attacker && e.attacker.isHuman) {
    sfx.punch(1);
  } else sfx.punch(nearness(e.x, e.z, 25) * 0.5);
});

events.on('explosion', (e) => {
  gore.explosion(e);
  const near = nearness(e.x, e.z, 60);
  sfx.boom(near);
  ctx.shake = Math.max(ctx.shake, near * 1.2);
});

events.on('bite', (e) => sfx.bite(nearness(e.x, e.z, 50)));
events.on('pickup', () => sfx.pickup());
events.on('inked', () => { hud.ink(); hud.message('🐙 被墨汁噴到了！', 1.2); });
events.on('slip', (r) => { if (r.isHuman) { sfx.slip(); hud.message('滑倒了！', 0.8); } });
events.on('respawn', () => hud.message('復活！（扣 150 分）', 1.2));
events.on('finish', (r) => { if (r.isHuman) hud.message(`抵達終點！第 ${r.finishOrder} 名，安全了！`, 2.5, 'big'); });
events.on('humanDied', ({ respawn }) => {
  if (respawn) hud.message('你被殺了！2.5 秒後復活', 2.3, 'big red');
  else {
    hud.message('你死了！變成幽靈', 2.5, 'big red');
    hud.ghostMode();
  }
});
events.on('ghostTrap', () => sfx.slip());
events.on('ringDrop', () => { sfx.rumble(); ctx.shake = Math.max(ctx.shake, 0.6); });
events.on('stageCulling', ({ count }) => {
  hud.message(count ? `🔫 末位爆頭淘汰 ${count} 人！` : '全員晉級！', 3, 'big red');
});
events.on('stageEnd', ({ sim: s }) => hud.showResult(s, () => s.nextStage()));
events.on('gameOver', ({ sim: s, winner }) => setTimeout(() => hud.showOver(s, winner), 2500));

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (sim) {
    const ctl = input.read(!sim.human.ghost);
    if (ctl.ffwd && sim.human.ghost) ffwd = !ffwd;
    const steps = sim.human.ghost && ffwd ? 3 : 1;
    for (let i = 0; i < steps; i++) sim.step(dt, i === 0 ? ctl : { ...ctl, punch: false, useItem: false });
    racersR.update(sim, sim.time);
    ents.update(sim, sim.time);
    gore.update(dt * steps);
    level?.update?.(sim.time, sim);
    updateCamera(ctx, sim, dt);
    hud.update(dt, sim);
  }
  ctx.renderer.render(ctx.scene, ctx.camera);
}
requestAnimationFrame(frame);
