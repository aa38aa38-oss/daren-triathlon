// 遊戲主規則：關卡流程、移動、名次、末位淘汰、復活、幽靈、競技場縮圈
import { STAGE_ORDER, KEEP_RATIO, SCORE } from '../config.js';
import { makeTrack } from './track.js';
import { createRacers } from './state.js';
import { events } from './events.js';
import { aiControl } from './ai.js';
import { punch, useItem, meleeUpdate, updateEntities, kill, damage, dropHazard } from './combat.js';
import { rollItem } from './items.js';

const NO_INPUT = { throttle: 0, steer: 0, punch: false, useItem: false };

export class Sim {
  constructor(n) {
    this.n = n;
    this.racers = createRacers(n);
    this.time = 0;
    this.stageIndex = -1;
    this.phase = 'idle'; // countdown | race | culling | result | over
    this.hazards = [];
    this.grenades = [];
    this.sharks = [];
    this.boxes = [];
    this.lastKilled = null;
    this.radius = 0;
    this.arenaWarn = false;
    // 起跑順序：隨機，玩家排在中間
    const others = this.racers.slice(1).sort(() => Math.random() - 0.5);
    const mid = Math.floor(others.length * 0.45);
    this.ranking = [...others.slice(0, mid), this.racers[0], ...others.slice(mid)];
  }

  get human() { return this.racers[0]; }

  aliveCount() {
    let c = 0;
    for (const r of this.racers) if (r.alive) c++;
    return c;
  }

  // 下一關要晉級的人數（還在等復活的玩家也算活著）
  survivorCount() {
    const h = this.human;
    return this.aliveCount() + (!h.alive && !h.ghost ? 1 : 0);
  }

  startStage(index) {
    this.stageIndex = index;
    const id = STAGE_ORDER[index];
    const tr = (this.track = makeTrack(id));
    this.hazards.length = 0;
    this.grenades.length = 0;
    this.sharks.length = 0;
    this.finishCount = 0;
    this.timeLeft = tr.timeLimit;
    this.stageTime = 0;
    this.phase = 'countdown';
    this.countdown = 3.5;
    this.target = KEEP_RATIO[id] ? Math.max(2, Math.round(this.n * KEEP_RATIO[id])) : tr.isArena ? 1 : null;
    this.radius = tr.radius || 0;
    this.dropTimer = tr.firstDrop || 0;
    this.arenaWarn = false;
    this.rankTimer = 0;
    this.rainTimer = 0;

    const h = this.human;
    if (!h.alive && !h.ghost) h.alive = true; // 還在等復活的玩家直接進下一關
    const list = this.ranking.filter((r) => r.alive);
    list.forEach((r, i) => this.placeOnGrid(r, i, list.length));
    if (h.ghost) {
      h.ghostX = 0;
      h.ghostZ = tr.isArena ? 26 : 10;
      h.ghostH = 0;
    }
    this.buildBoxes();
    this.computeRanks();
    events.emit('stageStart', { sim: this, track: tr });
  }

  placeOnGrid(r, i, count) {
    const tr = this.track;
    Object.assign(r, {
      speed: 0, kx: 0, kz: 0, y: 0, vy: 0, hp: r.maxHp, item: null, itemT: 0, melee: null,
      stunT: 0, slowT: 0, blindT: 0, invulnT: 0, hitT: 0, punchCd: 0, punchT: 0,
      finished: false, finishOrder: 0, falling: false, stageKills: 0, respawnT: 0, lastAttacker: null,
    });
    if (tr.isArena) {
      const ang = (i / count) * Math.PI * 2;
      r.x = Math.sin(ang) * 22;
      r.z = Math.cos(ang) * 22;
      r.h = Math.atan2(-r.x, r.z);
    } else {
      const cols = 10;
      const row = Math.floor(i / cols), col = i % cols;
      const sp = (tr.width - 4) / cols;
      r.z = 3 + row * 2.6;
      r.x = tr.centerX(r.z) + (col - (cols - 1) / 2) * sp;
      r.h = 0;
    }
  }

  buildBoxes() {
    const tr = this.track;
    this.boxes = [];
    if (tr.isArena) {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const rad = k % 2 ? 9 : 17;
        this.boxes.push({ x: Math.sin(a) * rad, z: Math.cos(a) * rad, active: true, t: 0 });
      }
      return;
    }
    for (let z = -35; z > -(tr.length - 25); z -= 60) {
      const cx = tr.centerX(z);
      for (let k = 0; k < 7; k++) {
        this.boxes.push({ x: cx + (k - 3) * (tr.width - 6) / 6, z, active: true, t: 0 });
      }
    }
  }

  computeRanks() {
    const alive = this.racers.filter((r) => r.alive);
    alive.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishOrder - b.finishOrder;
      return a.z - b.z;
    });
    alive.forEach((r, i) => { r.rank = i + 1; });
    this.aliveSorted = alive;
    return alive;
  }

  step(dt, input) {
    this.time += dt;
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const after = Math.ceil(this.countdown);
      if (after !== before && after > 0) events.emit('countdown', after);
      if (this.countdown <= 0) {
        this.phase = 'race';
        events.emit('go');
      }
      return;
    }
    if (this.phase === 'race') this.stepRace(dt, input || NO_INPUT);
    else if (this.phase === 'culling') this.stepCulling(dt);
  }

  stepRace(dt, input) {
    const tr = this.track;
    this.timeLeft -= dt;
    this.stageTime += dt;
    if (tr.isArena) this.stepArena(dt);
    this.rankTimer -= dt;
    if (this.rankTimer <= 0) { this.rankTimer = 0.2; this.computeRanks(); }

    for (const r of this.racers) {
      r.punchCd -= dt; r.punchT -= dt; r.invulnT -= dt; r.hitT -= dt;
      r.slowT -= dt; r.blindT -= dt; r.ghostCd -= dt;

      if (!r.alive) {
        if (r.isHuman) {
          if (r.ghost) this.stepGhost(r, input, dt);
          else if (r.respawnT > 0) {
            r.respawnT -= dt;
            if (r.respawnT <= 0) this.respawn(r);
          }
        }
        continue;
      }
      if (r.falling) {
        r.vy -= 25 * dt;
        r.y += r.vy * dt;
        r.x += r.kx * dt;
        r.z += r.kz * dt;
        if (r.y < -3.2) {
          const atk = r.lastAttacker && this.time - r.lastAttackerT < 4 ? r.lastAttacker : null;
          kill(this, r, atk, 'fall');
        }
        continue;
      }
      // 2 秒沒被打就慢慢回血
      if (r.hp < r.maxHp && this.time - (r.lastHitTime || -99) > 2) {
        r.hp = Math.min(r.maxHp, r.hp + (r.isHuman ? 3 : 5) * dt);
      }
      const ctl = r.isHuman ? input : aiControl(r, this, dt);
      if (r.item) r.itemT += dt;
      if (ctl.punch && !r.finished && r.stunT <= 0) punch(this, r);
      if (ctl.useItem && r.item && !r.finished) useItem(this, r);
      meleeUpdate(this, r, dt);
      if (r.alive) this.move(r, ctl, dt);
    }
    this.separate();
    updateEntities(this, dt);
    this.pickups(dt);
    this.checkEnd();
  }

  stepArena(dt) {
    const tr = this.track;
    this.dropTimer -= dt;
    this.arenaWarn = this.radius > tr.minRadius && this.dropTimer < 2.2;
    if (this.dropTimer <= 0 && this.radius > tr.minRadius) {
      this.radius -= tr.ringWidth;
      this.dropTimer = tr.dropInterval;
      events.emit('ringDrop', this);
    }
    // 時間到了開始下血雨，所有人持續扣血
    if (this.timeLeft < 0) {
      this.rainTimer -= dt;
      if (this.rainTimer <= 0) {
        this.rainTimer = 0.5;
        for (const r of this.racers) if (r.alive) damage(this, r, 6, null, 'rain');
      }
    }
  }

  move(r, ctl, dt) {
    const tr = this.track;
    let maxSp = tr.speed * (r.isHuman ? 1 : r.ai.skill);
    if (r.slowT > 0) maxSp *= 0.5;
    if (r.blindT > 0 && !r.isHuman) maxSp *= 0.75;
    if (r.melee && tr.mode === 'bike') maxSp *= 1.08;

    if (r.stunT > 0) {
      r.stunT -= dt;
      r.h += 10 * dt;
      r.speed *= Math.pow(0.25, dt);
    } else {
      const thr = Math.max(-1, Math.min(1, ctl.throttle || 0));
      const tgt = thr >= 0 ? thr * maxSp : thr * maxSp * 0.4;
      r.speed += (tgt - r.speed) * Math.min(1, 2.4 * dt);
      r.h += Math.max(-1, Math.min(1, ctl.steer || 0)) * (tr.mode === 'bike' ? 1.9 : 2.5) * dt;
    }
    r.x += Math.sin(r.h) * r.speed * dt + r.kx * dt;
    r.z += -Math.cos(r.h) * r.speed * dt + r.kz * dt;
    const damp = Math.pow(0.03, dt);
    r.kx *= damp;
    r.kz *= damp;
    r.anim += Math.abs(r.speed) * dt * (tr.mode === 'bike' ? 0.7 : 1.0);

    if (tr.isArena) {
      if (Math.hypot(r.x, r.z) > this.radius + 0.3) {
        r.falling = true;
        r.vy = 1.5;
        events.emit('fallStart', r);
      }
      return;
    }
    const cx = tr.centerX(r.z), half = tr.width / 2 - 0.7, off = r.x - cx;
    if (off > half) { r.x = cx + half; r.speed *= 0.98; }
    else if (off < -half) { r.x = cx - half; r.speed *= 0.98; }
    if (r.z > 40) r.z = 40;
    if (!r.finished && r.z <= -tr.length) {
      r.finished = true;
      r.finishOrder = ++this.finishCount;
      r.score += Math.max(0, 60 - r.finishOrder) * 5;
      events.emit('finish', r);
    }
    if (r.finished && r.z < -tr.length - 26) r.z = -tr.length - 26;
  }

  separate() {
    const rs = this.racers, n = rs.length;
    for (let i = 0; i < n; i++) {
      const a = rs[i];
      if (!a.alive || a.falling) continue;
      for (let j = i + 1; j < n; j++) {
        const b = rs[j];
        if (!b.alive || b.falling) continue;
        const dx = b.x - a.x;
        if (dx > 1.1 || dx < -1.1) continue;
        const dz = b.z - a.z;
        if (dz > 1.1 || dz < -1.1) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 < 1.21 && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (1.1 - d) / 2;
          const nx = dx / d, nz = dz / d;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
        }
      }
    }
  }

  pickups(dt) {
    const tr = this.track;
    const len = this.aliveSorted ? this.aliveSorted.length : 1;
    for (const b of this.boxes) {
      if (!b.active) {
        b.t -= dt;
        if (b.t <= 0) b.active = true;
        continue;
      }
      for (const r of this.racers) {
        if (!r.alive || r.item || r.finished || r.falling) continue;
        const dx = r.x - b.x, dz = r.z - b.z;
        if (dx * dx + dz * dz > 2.4) continue;
        // 電腦不一定會撿箱子，撿到的道具也比較弱
        if (!r.isHuman && Math.random() > 0.03) continue;
        let f = tr.isArena ? Math.random() : (r.rank - 1) / Math.max(1, len - 1);
        if (!r.isHuman) f *= 0.3;
        r.item = rollItem(tr.items, f);
        r.itemT = 0;
        b.active = false;
        b.t = 3;
        if (r.isHuman) events.emit('pickup', r);
        break;
      }
    }
  }

  checkEnd() {
    if (this.phase !== 'race') return;
    const alive = this.aliveCount();
    if (this.stageIndex >= 2 && alive <= 1) { this.gameOver(); return; }
    if (this.track.isArena) return;
    let unfinished = 0;
    for (const r of this.racers) if (r.alive && !r.finished) unfinished++;
    if (this.timeLeft <= 0 || unfinished === 0 || (this.target && this.finishCount >= this.target)) this.endStage();
  }

  endStage() {
    const ranked = this.computeRanks().slice();
    const h = this.human;
    const humanPending = !h.alive && !h.ghost;
    let cull = [];
    if (this.target) {
      // 人數超過晉級名額：從最後一名開始爆頭，真人玩家不會被淘汰
      let excess = ranked.length + (humanPending ? 1 : 0) - this.target;
      for (let i = ranked.length - 1; i >= 0 && excess > 0; i--) {
        if (ranked[i].isHuman) continue;
        cull.push(ranked[i]);
        excess--;
      }
    } else if (this.track.id === 'run') {
      // 跑步關：時間到還沒跑到終點的全部淘汰（至少留 2 人進決戰）
      cull = ranked.filter((r) => !r.finished && !r.isHuman);
      const maxCull = Math.max(0, ranked.length - 2);
      if (cull.length > maxCull) cull = cull.slice(cull.length - maxCull);
      cull.reverse();
    }
    this.ranking = [...ranked];
    if (humanPending) this.ranking.push(h);
    const spread = 1.8 / Math.max(1, cull.length);
    this.cullQueue = cull.map((r, i) => ({ r, t: 0.6 + i * spread }));
    this.cullTime = 0;
    this.culledCount = cull.length;
    this.phase = 'culling';
    events.emit('stageCulling', { count: cull.length, sim: this });
  }

  stepCulling(dt) {
    this.cullTime += dt;
    while (this.cullQueue.length && this.cullQueue[0].t <= this.cullTime) {
      const { r } = this.cullQueue.shift();
      kill(this, r, null, 'cull');
    }
    if (!this.cullQueue.length && this.cullTime > (this.culledCount ? 3.2 : 1.2)) {
      this.phase = 'result';
      events.emit('stageEnd', { sim: this });
    }
  }

  nextStage() {
    if (this.phase === 'result') this.startStage(this.stageIndex + 1);
  }

  onDeath(r) {
    this.lastKilled = r;
    if (!r.isHuman) return;
    r.deaths++;
    if (this.stageIndex < 2) {
      // 前兩關：扣分後復活
      r.respawnT = 2.5;
      r.score += SCORE.death;
      events.emit('humanDied', { racer: r, respawn: true });
    } else {
      // 第三關之後：一條命，死了變幽靈
      r.ghost = true;
      r.ghostX = r.x;
      r.ghostZ = r.z;
      r.ghostH = r.h;
      r.place = this.aliveCount() + 1;
      events.emit('humanDied', { racer: r, respawn: false });
    }
  }

  respawn(r) {
    const tr = this.track;
    r.alive = true;
    r.hp = r.maxHp;
    r.z = Math.min(r.z + 6, 40);
    r.x = tr.centerX(r.z);
    r.y = 0; r.vy = 0;
    r.speed = 0; r.kx = 0; r.kz = 0;
    r.stunT = 0; r.slowT = 0; r.falling = false;
    r.invulnT = 2.5;
    events.emit('respawn', r);
  }

  stepGhost(r, input, dt) {
    r.ghostH += (input.steer || 0) * 2.6 * dt;
    const sp = 20 * (input.throttle || 0);
    r.ghostX += Math.sin(r.ghostH) * sp * dt;
    r.ghostZ -= Math.cos(r.ghostH) * sp * dt;
    if (input.useItem && r.ghostCd <= 0) {
      r.ghostCd = 2.5;
      dropHazard(this, 'banana', r.ghostX, r.ghostZ, r);
      events.emit('ghostTrap', r);
    }
  }

  gameOver() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const winner = this.racers.find((r) => r.alive) || this.lastKilled;
    if (winner) winner.place = 1;
    if (winner === this.human) this.human.score += SCORE.win;
    events.emit('gameOver', { sim: this, winner });
  }
}
