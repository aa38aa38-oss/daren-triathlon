import { buildSwim } from './swim.js';
import { buildBike } from './bike.js';
import { buildRun } from './run.js';
import { buildArena } from './arena.js';
import { disposeGroup } from './common.js';

export function buildLevel(track) {
  switch (track.id) {
    case 'swim': return buildSwim(track);
    case 'bike': return buildBike(track);
    case 'run': return buildRun(track);
    default: return buildArena(track);
  }
}

export function disposeLevel(scene, level) {
  scene.remove(level.group);
  disposeGroup(level.group);
}
