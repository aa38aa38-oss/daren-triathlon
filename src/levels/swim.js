// 第一關：海邊游泳。血紅夕陽、海浪、浮球分道線、沙灘椰子樹、遠處繞圈的鯊魚鰭
import * as THREE from 'three';
import { ribbon, arch, instanced, mtx, sidePositions } from './common.js';

export function buildSwim(tr) {
  const g = new THREE.Group();
  const L = tr.length, W = tr.width;
  const z0 = 90, z1 = -(L + 170), len = z0 - z1;

  // 海面（會動的低多邊形波浪）
  const wg = new THREE.PlaneGeometry(320, len, 48, 120);
  wg.rotateX(-Math.PI / 2);
  wg.translate(0, 0, (z0 + z1) / 2);
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({
    color: 0x1e8bc9, roughness: 0.25, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.92,
  }));
  water.receiveShadow = true;
  g.add(water);
  const base = wg.attributes.position.array.slice();

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(320, len).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0b3a5a }));
  floor.position.set(0, -4, (z0 + z1) / 2);
  g.add(floor);

  // 沙灘
  for (const s of [-1, 1]) g.add(ribbon(tr, { offset: s * (W / 2 + 42), width: 44, y: 0.5, color: 0xf2d59b, step: 6 }));

  // 浮球分道線（紅白相間）
  const buoyM = [], buoyC = [];
  let k = 0;
  for (let z = 40; z > -(L + 30); z -= 4) {
    for (const s of [-1, 1]) {
      buoyM.push(mtx(tr.centerX(z) + s * (W / 2 + 0.3), 0.1, z));
      buoyC.push(k++ % 2 ? 0xffffff : 0xe01010);
    }
  }
  g.add(instanced(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), buoyM, buoyC, { shadow: false }));

  // 椰子樹
  const palms = sidePositions(tr, { step: 16, minOff: 26, spread: 30 });
  const trunkM = [], leafM = [];
  for (const p of palms) {
    const lean = (Math.random() - 0.5) * 0.4;
    const h = 5 + Math.random() * 3;
    trunkM.push(mtx(p.x, 0.5 + h / 2, p.z, { rz: lean, sy: h / 6 }));
    leafM.push(mtx(p.x - Math.sin(lean) * h, 0.5 + h, p.z, { ry: Math.random() * 6 }));
  }
  g.add(instanced(new THREE.CylinderGeometry(0.22, 0.35, 6, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, flatShading: true }), trunkM));
  g.add(instanced(new THREE.ConeGeometry(2.6, 1.3, 7), new THREE.MeshStandardMaterial({ color: 0x2e8b3a, flatShading: true }), leafM));

  // 起點碼頭、拱門
  const pier = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 0.6, 30), new THREE.MeshStandardMaterial({ color: 0x7a5230, flatShading: true }));
  pier.position.set(0, -0.15, 47);
  pier.receiveShadow = true;
  g.add(pier);
  g.add(arch(tr, 0, '起點 START'));
  g.add(arch(tr, -L, '上岸 FINISH'));
  const raft = new THREE.Mesh(new THREE.BoxGeometry(W + 8, 0.5, 34), new THREE.MeshStandardMaterial({ color: 0xd2b48c, flatShading: true }));
  raft.position.set(tr.centerX(-L - 18), 0.05, -L - 18);
  g.add(raft);

  // 背景鯊魚鰭
  const finGeo = new THREE.ConeGeometry(0.5, 1.4, 4);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x4d5d6e, flatShading: true });
  const fins = [];
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(finGeo, finMat);
    f.userData = { z: -Math.random() * L, side: i % 2 ? 1 : -1, off: 6 + Math.random() * 10, sp: 0.4 + Math.random() * 0.5, ph: Math.random() * 6 };
    g.add(f);
    fins.push(f);
  }

  let frame = 0;
  function update(t) {
    if (frame++ % 2 === 0) {
      const a = wg.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i], z = base[i + 2];
        a[i + 1] = Math.sin(x * 0.18 + t * 1.6) * 0.12 + Math.cos(z * 0.15 + t * 1.2) * 0.12;
      }
      wg.attributes.position.needsUpdate = true;
      wg.computeVertexNormals();
    }
    for (const f of fins) {
      const u = f.userData;
      const zz = u.z + Math.sin(t * u.sp + u.ph) * 20;
      f.position.set(tr.centerX(zz) + u.side * (W / 2 + u.off + Math.cos(t * u.sp + u.ph) * 3), 0.4, zz);
      f.rotation.y = t * u.sp;
    }
  }

  return {
    group: g, update,
    look: {
      top: '#7a0a1a', bottom: '#ff9a5a', fog: 0xf08060, fogNear: 70, fogFar: 280,
      hemiSky: 0xffd0b0, hemiGround: 0x2a6090, hemiI: 1.5, sun: 0xffd8b0, sunI: 2.4,
    },
  };
}
