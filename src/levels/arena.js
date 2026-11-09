// 最終決戰：圓形競技場。地板一圈一圈崩塌，掉下去就是血池
import * as THREE from 'three';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _red = new THREE.Color(0xff2020);

export function buildArena(tr) {
  const g = new THREE.Group();
  const R = tr.radius, rw = tr.ringWidth;

  // 地磚
  const tiles = [];
  for (let rIn = 3; rIn < R - 0.01; rIn += rw) {
    const rMid = rIn + rw / 2;
    const m = Math.max(8, Math.round((2 * Math.PI * rMid) / 2.6));
    for (let k = 0; k < m; k++) {
      tiles.push({
        rIn, rMid, ang: ((k + 0.5) / m) * Math.PI * 2,
        w: 2 * rMid * Math.sin(Math.PI / m) * 1.03,
        y: -0.5, vy: 0, falling: false, gone: false, spin: (Math.random() - 0.5) * 2, rot: 0,
      });
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), tiles.length);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  const baseCol = tiles.map(() => {
    const r = Math.random();
    if (r < 0.15) return new THREE.Color(0x7a1010);
    const v = 0.35 + Math.random() * 0.15;
    return new THREE.Color(v, v * 0.95, v * 0.9);
  });
  const place = (t, i) => {
    _e.set(t.rot, t.ang, t.rot * 0.5);
    _q.setFromEuler(_e);
    _p.set(Math.sin(t.ang) * t.rMid, t.y, Math.cos(t.ang) * t.rMid);
    _s.set(t.w, 1, rw * 0.97);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  };
  tiles.forEach((t, i) => { place(t, i); mesh.setColorAt(i, baseCol[i]); });
  g.add(mesh);

  const center = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 1, 20),
    new THREE.MeshStandardMaterial({ color: 0x5a1010, roughness: 0.8, flatShading: true }));
  center.position.y = -0.5;
  center.receiveShadow = true;
  g.add(center);

  // 血池
  const pg = new THREE.PlaneGeometry(300, 300, 40, 40).rotateX(-Math.PI / 2);
  const pool = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: 0x8a0008, roughness: 0.15, metalness: 0.2, flatShading: true }));
  pool.position.y = -3;
  g.add(pool);
  const base = pg.attributes.position.array.slice();

  // 外牆
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, 18, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xb08a60, side: THREE.BackSide, roughness: 1, flatShading: true }));
  wall.position.y = 4;
  g.add(wall);
  // 觀眾席的階梯
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(55 - i * 0.01, 55, 1, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x6a1a1a : 0x8a6a4a, side: THREE.BackSide }));
    step.position.y = 13 + i * 1.2;
    step.scale.setScalar(1 + i * 0.04);
    g.add(step);
  }

  let frame = 0;
  function update(t, sim) {
    let changed = false, colors = false;
    for (let i = 0; i < tiles.length; i++) {
      const tl = tiles[i];
      if (tl.gone) continue;
      if (!tl.falling && tl.rIn >= sim.radius - 0.01) { tl.falling = true; tl.vy = 0; }
      if (tl.falling) {
        tl.vy -= 20 * (1 / 60);
        tl.y += tl.vy * (1 / 60);
        tl.rot += tl.spin * (1 / 60);
        if (tl.y < -30) { tl.gone = true; mesh.setMatrixAt(i, ZERO); }
        else place(tl, i);
        changed = true;
      } else if (sim.arenaWarn && tl.rIn >= sim.radius - rw - 0.01) {
        // 快要塌的那一圈：抖動、變紅
        tl.y = -0.5 + Math.sin(t * 40 + tl.ang * 10) * 0.07;
        place(tl, i);
        mesh.setColorAt(i, _c.copy(baseCol[i]).lerp(_red, 0.5 + Math.sin(t * 12) * 0.5));
        changed = colors = true;
      }
    }
    if (changed) mesh.instanceMatrix.needsUpdate = true;
    if (colors) mesh.instanceColor.needsUpdate = true;

    if (frame++ % 2 === 0) {
      const a = pg.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        a[i + 1] = Math.sin(base[i] * 0.2 + t * 1.3) * 0.15 + Math.cos(base[i + 2] * 0.17 + t) * 0.15;
      }
      pg.attributes.position.needsUpdate = true;
      pg.computeVertexNormals();
    }
  }

  return {
    group: g, update,
    look: {
      top: '#1a0004', bottom: '#6a0a14', fog: 0x3a0610, fogNear: 60, fogFar: 200,
      hemiSky: 0xffb0a0, hemiGround: 0x400008, hemiI: 1.4, sun: 0xffc0a0, sunI: 2.2,
    },
  };
}
