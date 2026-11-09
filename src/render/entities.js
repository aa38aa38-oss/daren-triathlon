// 畫出道具箱、地上的陷阱、手榴彈、鯊魚
import * as THREE from 'three';
import { part, merge, makeSharkGeo } from './geo.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();

function compose(x, y, z, rx, ry, rz, s = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(s, s, s);
  return _m.compose(_p, _q, _s);
}

function questionTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#300';
  g.font = 'bold 52px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', 32, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class EntityRenderer {
  constructor(scene) {
    const mk = (geo, mat, cap) => {
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.frustumCulled = false;
      m.count = 0;
      m.castShadow = true;
      scene.add(m);
      return m;
    };
    this.boxes = mk(new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ map: questionTexture(), roughness: 0.3, emissive: 0x220000 }), 300);
    for (let i = 0; i < 300; i++) this.boxes.setColorAt(i, _c.set(0xffffff));

    const vc = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, ...o });
    this.haz = {
      mine: mk(merge([
        part(new THREE.SphereGeometry(0.45, 10, 8), 0x222222, {}),
        ...[0, 1, 2, 3, 4, 5].map((k) => part(new THREE.ConeGeometry(0.1, 0.3, 5), 0xd01010, {
          x: Math.sin(k) * 0.45, y: Math.cos(k * 1.3) * 0.3, z: Math.cos(k) * 0.45,
        })),
      ]), vc(), 150),
      oil: mk(part(new THREE.CylinderGeometry(1.4, 1.4, 0.04, 16), 0x0a0a0a, {}), vc({ roughness: 0.05, metalness: 0.4 }), 150),
      spikes: mk(merge([
        part(new THREE.BoxGeometry(1.2, 0.08, 0.5), 0x4a2a10, {}),
        ...[-0.4, 0, 0.4].map((x) => part(new THREE.ConeGeometry(0.12, 0.6, 5), 0xc0c0c0, { x, y: 0.3 })),
        ...[-0.2, 0.2].map((x) => part(new THREE.ConeGeometry(0.12, 0.6, 5), 0xc0c0c0, { x, y: 0.3, z: 0.15 })),
      ]), vc({ metalness: 0.5 }), 200),
      banana: mk(part(new THREE.TorusGeometry(0.35, 0.12, 6, 12, Math.PI), 0xffe135, { rx: -Math.PI / 2 }), vc(), 150),
    };
    this.grenades = mk(merge([
      part(new THREE.SphereGeometry(0.25, 8, 6), 0x2f5a1a, {}),
      part(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 6), 0x888888, { y: 0.27 }),
    ]), vc(), 80);
    this.sharks = mk(makeSharkGeo(), vc(), 40);
  }

  update(sim, t) {
    let n = 0;
    for (const b of sim.boxes) {
      if (!b.active) continue;
      this.boxes.setMatrixAt(n, compose(b.x, 1.3 + Math.sin(t * 3 + b.x) * 0.2, b.z, 0.4, t * 2 + b.z, 0.2));
      this.boxes.setColorAt(n, _c.setHSL((t * 0.4 + n * 0.13) % 1, 0.9, 0.6));
      n++;
    }
    this.boxes.count = n;
    this.boxes.instanceMatrix.needsUpdate = true;
    if (this.boxes.instanceColor) this.boxes.instanceColor.needsUpdate = true;

    const counts = { mine: 0, oil: 0, spikes: 0, banana: 0 };
    const swim = sim.track.mode === 'swim';
    for (const h of sim.hazards) {
      const m = this.haz[h.type];
      const i = counts[h.type]++;
      if (i >= m.instanceMatrix.count) continue;
      let y = 0.03;
      if (h.type === 'mine') y = swim ? 0.2 + Math.sin(t * 2 + h.x) * 0.1 : 0.45;
      else if (h.type === 'banana') y = 0.12;
      else if (h.type === 'oil') y = swim ? 0.15 : 0.03;
      m.setMatrixAt(i, compose(h.x, y, h.z, 0, h.x * 7, 0));
    }
    for (const k in this.haz) {
      this.haz[k].count = Math.min(counts[k], this.haz[k].instanceMatrix.count);
      this.haz[k].instanceMatrix.needsUpdate = true;
    }

    n = 0;
    for (const g of sim.grenades) this.grenades.setMatrixAt(n++, compose(g.x, g.y, g.z, t * 8, t * 5, 0));
    this.grenades.count = n;
    this.grenades.instanceMatrix.needsUpdate = true;

    n = 0;
    for (const s of sim.sharks) {
      this.sharks.setMatrixAt(n++, compose(s.x, 0, s.z, 0, -s.h + Math.sin(s.wag) * 0.15, 0, 1.3));
    }
    this.sharks.count = n;
    this.sharks.instanceMatrix.needsUpdate = true;
  }
}
