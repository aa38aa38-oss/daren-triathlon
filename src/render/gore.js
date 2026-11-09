// 噴血特效：血滴粒子、飛散的肉塊與斷肢、地上的血跡、無頭屍體噴泉、爆炸火球
import * as THREE from 'three';

const MAXP = 7000, MAXC = 500, MAXD = 900, MAXK = 160, MAXF = 24;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _v = new THREE.Vector3();
const MEAT = [0x8a0010, 0xa8141e, 0x6e0008, 0xc2303a];

export class Gore {
  constructor(scene) {
    this.scene = scene;
    this.ground = () => 0;
    this.decalLift = 0.03;
    this.mode = 'run';

    // 血滴粒子
    this.pPos = new Float32Array(MAXP * 3);
    this.pVel = new Float32Array(MAXP * 3);
    this.pCol = new Float32Array(MAXP * 3);
    this.pLife = new Float32Array(MAXP);
    this.pNext = 0;
    for (let i = 0; i < MAXP; i++) this.pPos[i * 3 + 1] = -9999;
    const pg = new THREE.BufferGeometry();
    this.pPosAttr = new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage);
    this.pColAttr = new THREE.BufferAttribute(this.pCol, 3).setUsage(THREE.DynamicDrawUsage);
    pg.setAttribute('position', this.pPosAttr);
    pg.setAttribute('color', this.pColAttr);
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.3, vertexColors: true }));
    this.points.frustumCulled = false;
    scene.add(this.points);

    // 肉塊與斷肢
    this.cMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.5 }), MAXC);
    this.cMesh.frustumCulled = false;
    this.cMesh.castShadow = true;
    this.chunks = [];
    for (let i = 0; i < MAXC; i++) {
      this.chunks.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, sx: 1, sy: 1, sz: 1 });
      this.cMesh.setMatrixAt(i, ZERO);
      this.cMesh.setColorAt(i, _c.set(MEAT[0]));
    }
    this.cNext = 0;
    scene.add(this.cMesh);

    // 地上的血跡
    this.dMesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x8a0000, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      MAXD,
    );
    this.dMesh.frustumCulled = false;
    this.dMesh.renderOrder = 1;
    for (let i = 0; i < MAXD; i++) this.dMesh.setMatrixAt(i, ZERO);
    this.dNext = 0;
    scene.add(this.dMesh);

    // 無頭屍體
    this.kBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.36, 0.35, 4, 10), new THREE.MeshStandardMaterial({ roughness: 0.7 }), MAXK);
    this.kStump = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0xb00010, roughness: 0.3 }), MAXK);
    for (const m of [this.kBody, this.kStump]) {
      m.frustumCulled = false;
      m.castShadow = true;
      for (let i = 0; i < MAXK; i++) m.setMatrixAt(i, ZERO);
      scene.add(m);
    }
    for (let i = 0; i < MAXK; i++) this.kBody.setColorAt(i, _c.set(0xffffff));
    this.kNext = 0;
    this.fountains = [];

    // 爆炸火球
    this.fireballs = [];
    for (let i = 0; i < MAXF; i++) {
      const fb = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff8a00, transparent: true }));
      fb.visible = false;
      fb.userData.t = 0;
      scene.add(fb);
      this.fireballs.push(fb);
    }
    this.fNext = 0;
  }

  clear() {
    this.pLife.fill(0);
    for (let i = 0; i < MAXP; i++) this.pPos[i * 3 + 1] = -9999;
    this.pPosAttr.needsUpdate = true;
    for (let i = 0; i < MAXC; i++) { this.chunks[i].life = 0; this.cMesh.setMatrixAt(i, ZERO); }
    for (let i = 0; i < MAXD; i++) this.dMesh.setMatrixAt(i, ZERO);
    for (let i = 0; i < MAXK; i++) { this.kBody.setMatrixAt(i, ZERO); this.kStump.setMatrixAt(i, ZERO); }
    for (const m of [this.cMesh, this.dMesh, this.kBody, this.kStump]) m.instanceMatrix.needsUpdate = true;
    this.fountains.length = 0;
    for (const fb of this.fireballs) fb.visible = false;
  }

  emitBlood(x, y, z, count, { dx = 0, dy = 1, dz = 0, spread = 1, speed = 8 } = {}) {
    const P = this.pPos, V = this.pVel, C = this.pCol;
    for (let k = 0; k < count; k++) {
      const i = this.pNext;
      this.pNext = (this.pNext + 1) % MAXP;
      const i3 = i * 3;
      const s = speed * (0.35 + Math.random() * 0.9);
      P[i3] = x + (Math.random() - 0.5) * 0.3;
      P[i3 + 1] = y + (Math.random() - 0.5) * 0.3;
      P[i3 + 2] = z + (Math.random() - 0.5) * 0.3;
      V[i3] = dx * s + (Math.random() - 0.5) * spread * speed;
      V[i3 + 1] = dy * s + (Math.random() - 0.3) * spread * speed;
      V[i3 + 2] = dz * s + (Math.random() - 0.5) * spread * speed;
      this.pLife[i] = 1.2 + Math.random() * 1.2;
      const b = 0.45 + Math.random() * 0.55;
      C[i3] = b; C[i3 + 1] = b * 0.02; C[i3 + 2] = b * 0.04;
    }
    this.pColAttr.needsUpdate = true;
  }

  addDecal(x, z, size, gy = this.ground(x, z)) {
    const i = this.dNext;
    this.dNext = (this.dNext + 1) % MAXD;
    _e.set(0, Math.random() * Math.PI * 2, 0);
    _q.setFromEuler(_e);
    _p.set(x, gy + this.decalLift + (i % 64) * 0.0008, z);
    _s.set(size * (0.7 + Math.random() * 0.6), 1, size * (0.7 + Math.random() * 0.6));
    _m.compose(_p, _q, _s);
    this.dMesh.setMatrixAt(i, _m);
    this.dMesh.instanceMatrix.needsUpdate = true;
  }

  spawnChunk(x, y, z, vx, vy, vz, sx, sy, sz, color) {
    const i = this.cNext;
    this.cNext = (this.cNext + 1) % MAXC;
    const c = this.chunks[i];
    Object.assign(c, {
      life: 9, x, y, z, vx, vy, vz, sx, sy, sz,
      rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
      wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 14, wz: (Math.random() - 0.5) * 14,
    });
    this.cMesh.setColorAt(i, _c.set(color));
    this.cMesh.instanceColor.needsUpdate = true;
  }

  addCorpse(v, x, z) {
    const gy = this.ground(x, z);
    const i = this.kNext;
    this.kNext = (this.kNext + 1) % MAXK;
    const yaw = Math.random() * Math.PI * 2;
    _e.set(Math.PI / 2, yaw, 0, 'YXZ');
    _q.setFromEuler(_e);
    _p.set(x, gy + (this.mode === 'swim' ? 0.05 : 0.36), z);
    _s.set(1, 1, 1);
    _m.compose(_p, _q, _s);
    this.kBody.setMatrixAt(i, _m);
    this.kBody.setColorAt(i, _c.set(v.color));
    _m2.makeTranslation(0, 0.6, 0);
    _m2.premultiply(_m);
    this.kStump.setMatrixAt(i, _m2);
    this.kBody.instanceMatrix.needsUpdate = true;
    this.kStump.instanceMatrix.needsUpdate = true;
    this.kBody.instanceColor.needsUpdate = true;
    // 脖子噴血
    _v.set(0, 0.62, 0).applyMatrix4(_m);
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(_q);
    if (this.fountains.length < 40) this.fountains.push({ x: _v.x, y: _v.y, z: _v.z, dx: dir.x, dy: dir.y, dz: dir.z, t: 2.8 });
  }

  kill(e) {
    const v = e.victim, c = e.cause;
    const x = e.x, z = e.z;
    if (c === 'fall') {
      this.emitBlood(x, -3, z, 160, { dy: 1, spread: 0.6, speed: 12 });
      for (let k = 0; k < 4; k++) this.addDecal(x + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 3, 1.2, -3);
      return;
    }
    const swim = this.mode === 'swim';
    const y = swim ? 0.4 : 1.4;
    const huge = c === 'shark' || c === 'grenade' || c === 'mine' || c === 'chainsaw';
    const cull = c === 'cull';
    if (cull) {
      // 爆頭：血從脖子往上噴
      this.emitBlood(x, y + 0.6, z, 170, { dy: 1.4, spread: 0.7, speed: 10 });
    } else {
      this.emitBlood(x, y, z, huge ? 320 : 180, { dy: 1, spread: 1.1, speed: huge ? 13 : 9 });
    }
    // 頭
    const r = () => Math.random() - 0.5;
    this.spawnChunk(x, y + 0.6, z, r() * 6, 8 + Math.random() * 5, r() * 6, 0.5, 0.5, 0.5, v.skin);
    // 手腳
    const limbs = huge ? 4 : 2;
    for (let k = 0; k < limbs; k++) {
      this.spawnChunk(x, y, z, r() * 10, 6 + Math.random() * 6, r() * 10, 0.2, 0.55, 0.2, k % 2 ? v.color : v.pants);
    }
    // 碎肉
    const meat = huge ? 12 : 5;
    for (let k = 0; k < meat; k++) {
      const s = 0.12 + Math.random() * 0.2;
      this.spawnChunk(x, y, z, r() * 12, 4 + Math.random() * 8, r() * 12, s, s, s, MEAT[k % MEAT.length]);
    }
    const nd = huge ? 7 : 4;
    for (let k = 0; k < nd; k++) {
      this.addDecal(x + r() * 3.5, z + r() * 3.5, (huge ? 1.4 : 0.9) + Math.random() * 1.2);
    }
    if (!(c === 'shark' || c === 'grenade' || c === 'mine')) this.addCorpse(v, x, z);
  }

  hit(e) {
    this.emitBlood(e.x, this.mode === 'swim' ? 0.5 : e.y, e.z, Math.min(60, 10 + e.amount), {
      dx: e.dx, dy: 0.6, dz: e.dz, spread: 0.7, speed: 7,
    });
    if (Math.random() < 0.5) this.addDecal(e.x + e.dx, e.z + e.dz, 0.5 + Math.random() * 0.5);
  }

  explosion(e) {
    const fb = this.fireballs[this.fNext];
    this.fNext = (this.fNext + 1) % MAXF;
    fb.position.set(e.x, Math.max(e.y, 0.5), e.z);
    fb.userData.t = 0;
    fb.userData.r = e.radius * 0.7;
    fb.visible = true;
    this.emitBlood(e.x, 0.6, e.z, 60, { dy: 1.2, spread: 1.5, speed: 9 });
  }

  update(dt) {
    const P = this.pPos, V = this.pVel, L = this.pLife;
    for (let i = 0; i < MAXP; i++) {
      if (L[i] <= 0) continue;
      const i3 = i * 3;
      L[i] -= dt;
      V[i3 + 1] -= 24 * dt;
      P[i3] += V[i3] * dt;
      P[i3 + 1] += V[i3 + 1] * dt;
      P[i3 + 2] += V[i3 + 2] * dt;
      const gy = this.ground(P[i3], P[i3 + 2]);
      if (P[i3 + 1] <= gy) {
        if (Math.random() < 0.06) this.addDecal(P[i3], P[i3 + 2], 0.2 + Math.random() * 0.45, gy);
        L[i] = 0;
      }
      if (L[i] <= 0) P[i3 + 1] = -9999;
    }
    this.pPosAttr.needsUpdate = true;

    let any = false;
    for (let i = 0; i < MAXC; i++) {
      const c = this.chunks[i];
      if (c.life <= 0) continue;
      any = true;
      c.life -= dt;
      c.vy -= 24 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      c.rx += c.wx * dt; c.ry += c.wy * dt; c.rz += c.wz * dt;
      const gy = this.ground(c.x, c.z) + c.sy * 0.5;
      if (c.y < gy) {
        if (c.vy < -3) {
          this.addDecal(c.x, c.z, 0.3 + c.sx, gy - c.sy * 0.5);
          this.emitBlood(c.x, gy, c.z, 6, { dy: 1, spread: 0.6, speed: 3 });
        }
        c.y = gy;
        c.vy = -c.vy * 0.3;
        c.vx *= 0.55; c.vz *= 0.55;
        c.wx *= 0.5; c.wy *= 0.5; c.wz *= 0.5;
      }
      const k = c.life < 1 ? Math.max(0, c.life) : 1;
      if (c.life <= 0) { this.cMesh.setMatrixAt(i, ZERO); continue; }
      _e.set(c.rx, c.ry, c.rz);
      _q.setFromEuler(_e);
      _p.set(c.x, c.y, c.z);
      _s.set(c.sx * k, c.sy * k, c.sz * k);
      _m.compose(_p, _q, _s);
      this.cMesh.setMatrixAt(i, _m);
    }
    if (any) this.cMesh.instanceMatrix.needsUpdate = true;

    for (let i = this.fountains.length - 1; i >= 0; i--) {
      const f = this.fountains[i];
      f.t -= dt;
      const power = Math.min(1, f.t);
      this.emitBlood(f.x, f.y, f.z, 3, { dx: f.dx, dy: f.dy + 0.9, dz: f.dz, spread: 0.25, speed: 6 * power + 1 });
      if (f.t <= 0) this.fountains.splice(i, 1);
    }

    for (const fb of this.fireballs) {
      if (!fb.visible) continue;
      fb.userData.t += dt;
      const t = fb.userData.t / 0.5;
      if (t >= 1) { fb.visible = false; continue; }
      fb.scale.setScalar(fb.userData.r * (0.3 + t * 0.9));
      fb.material.opacity = 1 - t;
      fb.material.color.setHSL(0.08 - t * 0.08, 1, 0.55 - t * 0.2);
    }
  }
}
