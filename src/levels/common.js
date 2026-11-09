// 各關卡共用的場景工具：沿著賽道鋪路面、起終點拱門、大量擺放物件
import * as THREE from 'three';
import { textTexture } from '../render/geo.js';

// 沿著賽道中心線鋪一條帶子（路面、沙灘、白線都用這個）
export function ribbon(track, { offset = 0, width, y = 0, color, z0 = 80, z1, step = 3, material } = {}) {
  z1 ??= -(track.length + 160);
  const pos = [];
  const idx = [];
  let i = 0;
  for (let z = z0; z >= z1; z -= step) {
    const cx = track.centerX(z) + offset;
    const cx2 = track.centerX(z - 1) + offset;
    let tx = cx2 - cx, tz = -1;
    const l = Math.hypot(tx, tz);
    tx /= l; tz /= l;
    const nx = -tz, nz = tx;
    pos.push(cx - nx * width / 2, y, z - nz * width / 2, cx + nx * width / 2, y, z + nz * width / 2);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    i++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material || new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  return mesh;
}

export function arch(track, z, text, color = '#b00000') {
  const g = new THREE.Group();
  const cx = track.centerX(z);
  const half = track.width / 2 + 1.2;
  const pm = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 13, 1.2), pm);
    p.position.set(cx + s * half, 6.5, z);
    p.castShadow = true;
    g.add(p);
  }
  const tex = textTexture(text, { bg: color, w: 1024, h: 128, font: 'bold 84px sans-serif' });
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(half * 2 + 1.2, 2.2, 0.5),
    [pm, pm, pm, pm, new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: tex })],
  );
  banner.position.set(cx, 13, z);
  g.add(banner);
  // 地上的線
  const line = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.06, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  line.position.set(cx, 0.05, z);
  g.add(line);
  return g;
}

export function mtx(x, y, z, { ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
}

export function instanced(geo, mat, matrices, colors, { shadow = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, matrices.length));
  matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
  if (colors) colors.forEach((c, i) => m.setColorAt(i, new THREE.Color(c)));
  m.count = matrices.length;
  m.frustumCulled = false;
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// 在賽道兩側擺東西：回傳一串位置
export function sidePositions(track, { step, minOff, spread, z0 = 60, z1 }) {
  z1 ??= -(track.length + 120);
  const out = [];
  for (let z = z0; z >= z1; z -= step) {
    for (const side of [-1, 1]) {
      const zz = z + (Math.random() - 0.5) * step * 0.8;
      const x = track.centerX(zz) + side * (track.width / 2 + minOff + Math.random() * spread);
      out.push({ x, z: zz, side });
    }
  }
  return out;
}

// 地上預先灑一些血跡，營造恐怖氣氛
export function bloodStains(track, count, y = 0.03) {
  const mats = [];
  for (let i = 0; i < count; i++) {
    const z = -Math.random() * track.length;
    const x = track.centerX(z) + (Math.random() - 0.5) * track.width * 0.9;
    const s = 0.6 + Math.random() * 2.2;
    mats.push(mtx(x, y, z, { ry: Math.random() * 6, sx: s, sz: s * (0.5 + Math.random()) }));
  }
  return instanced(
    new THREE.CircleGeometry(1, 9).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5a0000, transparent: true, opacity: 0.75, depthWrite: false }),
    mats, null, { shadow: false },
  );
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}
