// 第二關：鄉間公路單車。紫色黃昏、枯草、樹林、木頭圍欄、路面血跡
import * as THREE from 'three';
import { ribbon, arch, instanced, mtx, sidePositions, bloodStains } from './common.js';

export function buildBike(tr) {
  const g = new THREE.Group();
  const L = tr.length, W = tr.width;
  const z0 = 90, z1 = -(L + 170), len = z0 - z1;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, len).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x5a6b30, roughness: 1 }));
  ground.position.set(0, -0.05, (z0 + z1) / 2);
  ground.receiveShadow = true;
  g.add(ground);

  g.add(ribbon(tr, { width: W + 1, y: 0.01, color: 0x3a3a40 }));
  for (const s of [-1, 1]) g.add(ribbon(tr, { offset: s * (W / 2 - 0.5), width: 0.35, y: 0.03, color: 0xf0f0f0 }));

  // 中線虛線
  const dashM = [];
  for (let z = 30; z > -(L + 60); z -= 7) dashM.push(mtx(tr.centerX(z), 0.03, z, { ry: Math.atan(tr.centerX(z - 1) - tr.centerX(z)) }));
  g.add(instanced(new THREE.BoxGeometry(0.25, 0.02, 3), new THREE.MeshBasicMaterial({ color: 0xf2c400 }), dashM, null, { shadow: false }));

  g.add(bloodStains(tr, 120));

  // 樹
  const trees = sidePositions(tr, { step: 9, minOff: 6, spread: 45 });
  const trunkM = [], leafM = [], leafC = [];
  for (const p of trees) {
    const s = 0.8 + Math.random() * 0.9;
    trunkM.push(mtx(p.x, 1.5 * s, p.z, { sy: s, sx: s, sz: s }));
    leafM.push(mtx(p.x, 3 * s + 2.2 * s, p.z, { sx: s, sy: s, sz: s, ry: Math.random() * 6 }));
    leafC.push([0x2f4f2a, 0x3d5c2a, 0x6b4f1d, 0x4a3a20][Math.floor(Math.random() * 4)]);
  }
  g.add(instanced(new THREE.CylinderGeometry(0.3, 0.45, 3, 6), new THREE.MeshStandardMaterial({ color: 0x4a3220, flatShading: true }), trunkM));
  g.add(instanced(new THREE.ConeGeometry(2, 4.5, 7), new THREE.MeshStandardMaterial({ flatShading: true }), leafM, leafC));

  // 圍欄
  const postM = [];
  for (let z = 40; z > -(L + 40); z -= 3) {
    for (const s of [-1, 1]) postM.push(mtx(tr.centerX(z) + s * (W / 2 + 1.5), 0.6, z));
  }
  g.add(instanced(new THREE.BoxGeometry(0.2, 1.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x7a5a3a }), postM));
  for (const s of [-1, 1]) {
    const rail = ribbon(tr, { offset: s * (W / 2 + 1.5), width: 0.12, y: 1.0, color: 0x7a5a3a, z0: 40, z1: -(L + 40) });
    g.add(rail);
  }

  g.add(arch(tr, 0, '起點 START'));
  g.add(arch(tr, -L, '下車 FINISH'));

  return {
    group: g, update() {},
    look: {
      top: '#24103e', bottom: '#d8607a', fog: 0x8a4a6a, fogNear: 60, fogFar: 260,
      hemiSky: 0xd0b0ff, hemiGround: 0x3a3020, hemiI: 1.3, sun: 0xffc0a0, sunI: 2.0,
    },
  };
}
