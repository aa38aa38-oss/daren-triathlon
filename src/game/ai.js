// 電腦選手：沿著賽道前進，看到附近有人就去揍，有道具就找時機用
import { wrap } from './combat.js';

function nearest(sim, r, range) {
  let best = null, bd = range * range;
  for (const o of sim.racers) {
    if (o === r || !o.alive || o.finished || o.falling) continue;
    const dx = o.x - r.x, dz = o.z - r.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bd) { bd = d2; best = o; }
  }
  return best;
}

export function aiControl(r, sim, dt) {
  const ai = r.ai, tr = sim.track;
  const out = { throttle: 1, steer: 0, punch: false, useItem: false };

  ai.think -= dt;
  ai.laneT -= dt;
  if (ai.laneT <= 0) {
    ai.laneT = 2 + Math.random() * 4;
    ai.lane = Math.max(-0.85, Math.min(0.85, ai.lane + (Math.random() - 0.5) * 0.6));
  }
  if (ai.think <= 0) {
    ai.think = 0.2 + Math.random() * 0.25;
    ai.target = nearest(sim, r, tr.isArena ? 60 : 10);
  }
  const t = ai.target && ai.target.alive && !ai.target.finished && !ai.target.falling ? ai.target : null;
  const dT = t ? Math.hypot(t.x - r.x, t.z - r.z) : 1e9;

  let tx, tz;
  if (tr.isArena) {
    const rr = Math.hypot(r.x, r.z);
    const safe = sim.radius - (sim.arenaWarn ? 6.5 : 3.5);
    if (!t || rr > safe) { tx = 0; tz = 0; } else { tx = t.x; tz = t.z; }
  } else {
    tz = r.z - 12;
    tx = tr.centerX(tz) + ai.lane * (tr.width / 2 - 2);
    const hunting = r.melee || ai.aggr > 0.65;
    if (t && hunting && !r.finished && dT < (r.melee ? 9 : 6)) { tx = t.x; tz = t.z; }
    if (r.finished) out.throttle = r.z < -tr.length - 14 ? 0 : 0.5;
  }

  const dh = Math.atan2(tx - r.x, -(tz - r.z));
  let steer = wrap(dh - r.h) * 2.2;
  if (r.blindT > 0) steer += Math.sin(sim.time * 4 + r.id) * 1.2;
  out.steer = Math.max(-1, Math.min(1, steer));

  // 開賽前幾秒大家擠在一起，先不打；之後只有比較兇的電腦會出手
  const calm = !tr.isArena && sim.stageTime < 5;
  if (t && !calm && dT < 2.1 && r.punchCd <= 0 && ai.aggr > 0.35 && Math.random() < ai.aggr * (t.isHuman ? 0.01 : 0.004)) out.punch = true;

  if (r.item) {
    const it = r.item;
    if (it === 'axe' || it === 'chainsaw') out.useItem = dT < 5 || r.itemT > 6;
    else if (it === 'grenade') out.useItem = (t && dT > 3 && dT < 14) || r.itemT > 5;
    else if (it === 'shark') out.useItem = r.itemT > 0.8;
    else if (it === 'ink') out.useItem = r.itemT > 1.5;
    else out.useItem = r.itemT > ai.itemDelay;
  }
  return out;
}
