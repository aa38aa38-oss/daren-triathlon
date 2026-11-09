// 第三關：夜晚城市路跑。血紅夜空、亮窗的大樓、路燈、滿地血跡
import * as THREE from 'three';
import { ribbon, arch, instanced, mtx, sidePositions, bloodStains } from './common.js';

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 12) {
    for (let x = 4; x < 64; x += 12) {
      const r = Math.random();
      g.fillStyle = r < 0.45 ? '#ffd27a' : r < 0.55 ? '#ff3030' : '#111';
      g.fillRect(x, y, 7, 8);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildRun(tr) {
  const g = new THREE.Group();
  const L = tr.length, W = tr.width;
  const z0 = 90, z1 = -(L + 170), len = z0 - z1;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, len).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 1 }));
  ground.position.set(0, -0.05, (z0 + z1) / 2);
  ground.receiveShadow = true;
  g.add(ground);

  g.add(ribbon(tr, { width: W + 1, y: 0.01, color: 0x1e1e22 }));
  for (const s of [-1, 1]) g.add(ribbon(tr, { offset: s * (W / 2 + 3.5), width: 6, y: 0.15, color: 0x6f6f78 }));
  g.add(bloodStains(tr, 180));

  // 大樓
  const tex = windowTexture();
  const spots = sidePositions(tr, { step: 11, minOff: 9, spread: 25 });
  const bM = [], bC = [];
  const pal = [0x3a3a4a, 0x4a2a2a, 0x2a3a4a, 0x50505a, 0x3a2a3a, 0x2e2e2e];
  for (const p of spots) {
    const h = 10 + Math.random() * 38;
    const w = 7 + Math.random() * 7;
    bM.push(mtx(p.x + p.side * w / 2, h / 2, p.z, { sx: w, sy: h, sz: 7 + Math.random() * 4 }));
    bC.push(pal[Math.floor(Math.random() * pal.length)]);
  }
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.8,
  }), bM, bC));

  // 路燈
  const lampM = [], headM = [];
  for (let z = 30; z > -(L + 40); z -= 18) {
    for (const s of [-1, 1]) {
      const x = tr.centerX(z) + s * (W / 2 + 1.2);
      lampM.push(mtx(x, 3, z));
      headM.push(mtx(x - s * 0.8, 6, z));
    }
  }
  g.add(instanced(new THREE.CylinderGeometry(0.1, 0.14, 6, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }), lampM));
  g.add(instanced(new THREE.BoxGeometry(1.6, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xffb060 }), headM, null, { shadow: false }));

  g.add(arch(tr, 0, '起點 START'));
  g.add(arch(tr, -L, '決戰入口 ARENA'));

  return {
    group: g, update() {},
    look: {
      top: '#0c0006', bottom: '#8c1028', fog: 0x4a0a16, fogNear: 50, fogFar: 230,
      hemiSky: 0xff9090, hemiGround: 0x201018, hemiI: 1.2, sun: 0xff9a8a, sunI: 1.6,
    },
  };
}
