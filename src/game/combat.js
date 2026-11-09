// 戰鬥：揍人、道具、爆炸、陷阱、鯊魚
import { events } from './events.js';

export const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export function groundY(sim, x, z) {
  if (sim.track.isArena) return Math.hypot(x, z) <= sim.radius + 0.3 ? 0 : -3;
  return 0;
}

export function damage(sim, t, amount, attacker, cause, dx = 0, dz = 0, kb = 0) {
  if (!t.alive || t.finished || t.invulnT > 0 || t.falling) return;
  // 電腦打真人的傷害打折，讓玩家比較耐打
  if (attacker && attacker !== t && !attacker.isHuman && t.isHuman) amount *= 0.55;
  t.hp -= amount;
  t.hitT = 0.15;
  t.lastHitTime = sim.time;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len, nz = dz / len;
  if (kb) { t.kx += nx * kb; t.kz += nz * kb; }
  if (attacker && attacker !== t) { t.lastAttacker = attacker; t.lastAttackerT = sim.time; }
  events.emit('hit', { racer: t, amount, cause, attacker, x: t.x, y: t.y + 1.3, z: t.z, dx: nx, dz: nz });
  if (t.hp <= 0) kill(sim, t, attacker, cause);
}

export function kill(sim, t, attacker, cause) {
  if (!t.alive) return;
  t.alive = false;
  t.hp = 0;
  t.melee = null;
  t.item = null;
  const killer = attacker && attacker !== t ? attacker : null;
  if (killer) { killer.kills++; killer.stageKills++; killer.score += 100; }
  events.emit('kill', { victim: t, killer, cause, x: t.x, y: t.y, z: t.z, h: t.h, mode: sim.track.mode });
  sim.onDeath(t);
}

export function punch(sim, r) {
  if (r.punchCd > 0) return;
  r.punchCd = r.isHuman ? 0.45 : 1.1;
  r.punchT = 0.22;
  const fx = Math.sin(r.h), fz = -Math.cos(r.h);
  let best = null, bd = 2.3 * 2.3;
  for (const o of sim.racers) {
    if (o === r || !o.alive || o.finished || o.falling) continue;
    const dx = o.x - r.x, dz = o.z - r.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bd && dx * fx + dz * fz > -0.5) { bd = d2; best = o; }
  }
  events.emit('swing', r);
  if (best) damage(sim, best, r.isHuman ? 25 : 12, r, 'punch', best.x - r.x, best.z - r.z, 7);
}

export function dropHazard(sim, type, x, z, owner) {
  const base = { type, owner, arm: 0.7, life: 35, uses: type === 'oil' ? 4 : 1 };
  if (type === 'spikes') {
    // 釘刺路障一次橫向丟三個，封住路面
    const h = owner.isHuman && owner.ghost ? owner.ghostH : owner.h;
    const px = Math.cos(h), pz = Math.sin(h);
    for (const k of [-1.6, 0, 1.6]) sim.hazards.push({ ...base, x: x + px * k, z: z + pz * k });
  } else {
    sim.hazards.push({ ...base, x, z });
  }
}

export function useItem(sim, r) {
  const id = r.item;
  if (!id) return;
  r.item = null;
  r.itemT = 0;
  const fx = Math.sin(r.h), fz = -Math.cos(r.h);
  switch (id) {
    case 'shark':
      sim.sharks.push({ x: r.x + fx * 2, z: r.z + fz * 2, h: r.h, owner: r, target: null, bites: 0, life: 9, wag: 0 });
      break;
    case 'grenade': {
      const v = Math.max(0, r.speed) + 15;
      sim.grenades.push({ x: r.x + fx, y: 1.6, z: r.z + fz, vx: fx * v, vy: 7, vz: fz * v, fuse: 1.3, owner: r });
      break;
    }
    case 'mine': case 'oil': case 'spikes': case 'banana':
      dropHazard(sim, id, r.x - fx * 2.4, r.z - fz * 2.4, r);
      break;
    case 'axe': case 'chainsaw':
      r.melee = { type: id, t: id === 'axe' ? 6 : 5 };
      r.meleeTick = 0;
      break;
    case 'ink':
      for (const o of sim.racers) {
        if (o === r || !o.alive || o.finished) continue;
        const hit = sim.track.isArena
          ? Math.hypot(o.x - r.x, o.z - r.z) < 22
          : o.z < r.z && r.z - o.z < 50;
        if (hit) {
          o.blindT = 3.5;
          if (o.isHuman) events.emit('inked', o);
        }
      }
      break;
  }
  events.emit('useItem', { racer: r, id });
}

export function meleeUpdate(sim, r, dt) {
  if (!r.melee) return;
  r.melee.t -= dt;
  if (r.melee.t <= 0) { r.melee = null; return; }
  r.meleeTick -= dt;
  if (r.meleeTick > 0) return;
  const axe = r.melee.type === 'axe';
  r.meleeTick = axe ? 0.38 : 0.12;
  const rad = axe ? 2.8 : 2.4;
  const dmg = r.isHuman ? (axe ? 50 : 14) : (axe ? 28 : 9);
  for (const o of sim.racers) {
    if (o === r || !o.alive || o.finished || o.falling) continue;
    const dx = o.x - r.x, dz = o.z - r.z;
    if (dx * dx + dz * dz < rad * rad) damage(sim, o, dmg, r, r.melee.type, dx, dz, axe ? 9 : 3);
    if (!r.melee) return;
  }
}

export function explode(sim, x, y, z, radius, dmg, owner, cause) {
  events.emit('explosion', { x, y, z, radius });
  for (const r of sim.racers) {
    if (!r.alive || r.falling) continue;
    const dx = r.x - x, dz = r.z - z;
    const d = Math.hypot(dx, dz);
    if (d < radius) damage(sim, r, dmg * (1 - 0.6 * d / radius), owner, cause, dx, dz, 18);
  }
}

function findPrey(sim, k) {
  const fx = Math.sin(k.h), fz = -Math.cos(k.h);
  let best = null, bs = 80;
  for (const r of sim.racers) {
    if (r === k.owner || !r.alive || r.finished || r.falling) continue;
    const dx = r.x - k.x, dz = r.z - k.z;
    const d = Math.hypot(dx, dz);
    const s = d + (dx * fx + dz * fz < 0 ? 25 : 0);
    if (s < bs) { bs = s; best = r; }
  }
  return best;
}

function triggerHazard(sim, h, r) {
  switch (h.type) {
    case 'mine':
      explode(sim, h.x, 0.5, h.z, 2.8, 55, h.owner, 'mine');
      break;
    case 'oil':
      r.stunT = 1.3;
      events.emit('slip', r);
      break;
    case 'banana':
      r.stunT = 1.1;
      events.emit('slip', r);
      break;
    case 'spikes':
      r.slowT = 2.5;
      damage(sim, r, 28, h.owner, 'spikes', r.x - h.x, r.z - h.z, 4);
      break;
  }
}

export function updateEntities(sim, dt) {
  // 手榴彈
  const g = sim.grenades;
  for (let i = g.length - 1; i >= 0; i--) {
    const n = g[i];
    n.fuse -= dt;
    n.vy -= 22 * dt;
    n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;
    const gy = groundY(sim, n.x, n.z);
    if (n.y < gy + 0.22) {
      n.y = gy + 0.22;
      n.vy = -n.vy * 0.35;
      n.vx *= 0.6; n.vz *= 0.6;
    }
    if (n.fuse <= 0) {
      g.splice(i, 1);
      explode(sim, n.x, n.y, n.z, 7, 140, n.owner, 'grenade');
    }
  }

  // 鯊魚
  const s = sim.sharks;
  for (let i = s.length - 1; i >= 0; i--) {
    const k = s[i];
    k.life -= dt;
    k.wag += dt * 12;
    const t = k.target;
    if (!t || !t.alive || t.finished || t.falling) k.target = findPrey(sim, k);
    if (k.target) {
      const dh = Math.atan2(k.target.x - k.x, -(k.target.z - k.z));
      const diff = wrap(dh - k.h);
      k.h += Math.max(-5 * dt, Math.min(5 * dt, diff));
    }
    k.x += Math.sin(k.h) * 26 * dt;
    k.z -= Math.cos(k.h) * 26 * dt;
    if (k.target && Math.hypot(k.target.x - k.x, k.target.z - k.z) < 1.8) {
      events.emit('bite', { x: k.x, z: k.z });
      kill(sim, k.target, k.owner, 'shark');
      k.target = null;
      k.bites++;
      if (k.bites >= (k.owner.isHuman ? 3 : 1)) k.life = 0;
    }
    if (k.life <= 0) s.splice(i, 1);
  }

  // 地上的陷阱
  const hz = sim.hazards;
  for (let i = hz.length - 1; i >= 0; i--) {
    const h = hz[i];
    h.arm -= dt;
    h.life -= dt;
    if (h.life <= 0) { hz.splice(i, 1); continue; }
    const rad = h.type === 'oil' ? 1.5 : 1.1;
    for (const r of sim.racers) {
      if (!r.alive || r.finished || r.falling) continue;
      if (r === h.owner && h.arm > 0) continue;
      const dx = r.x - h.x, dz = r.z - h.z;
      if (dx * dx + dz * dz > rad * rad) continue;
      if ((h.type === 'oil' || h.type === 'banana') && r.stunT > 0) continue;
      triggerHazard(sim, h, r);
      h.uses--;
      if (h.uses <= 0) { hz.splice(i, 1); break; }
    }
  }
}
