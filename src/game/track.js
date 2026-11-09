import { STAGES } from '../config.js';

// 賽道是一條往 -Z 方向延伸、左右彎曲的路。centerX(z) 告訴你在某個 z 位置時賽道中心的 x 座標
export function makeTrack(id) {
  const s = STAGES[id];
  if (s.isArena) return { ...s, centerX: () => 0 };
  const [a1, f1, a2, f2] = s.curve;
  const raw = (z) => a1 * Math.sin(z * f1) + a2 * Math.sin(z * f2 + 1.3);
  const base = raw(0);
  return { ...s, centerX: (z) => raw(z) - base };
}
