// 畫出所有選手。同一種零件（身體、頭、手、腳）用 InstancedMesh 一次畫完，100 人也很順
import * as THREE from 'three';
import { tf, makeEyesGeo, makeBikeGeo, makeAxeGeo, makeSawGeo } from './geo.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _root = new THREE.Matrix4(), _loc = new THREE.Matrix4(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color(), _white = new THREE.Color(0xffffff);

function setRoot(x, y, z, pitch, yaw, roll) {
  _e.set(pitch, yaw, roll, 'YXZ');
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _root.compose(_p, _q, _s);
}
function local(x, y, z, rx) {
  _loc.makeRotationX(rx);
  _loc.setPosition(x, y, z);
  return _loc;
}

export class RacerRenderer {
  constructor(scene, racers) {
    this.racers = racers;
    const n = racers.length;
    const std = (o = {}) => new THREE.MeshStandardMaterial({ roughness: 0.65, ...o });
    const mk = (geo, mat, count, shadow = true) => {
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.frustumCulled = false;
      m.castShadow = shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(m);
      return m;
    };
    this.body = mk(new THREE.CapsuleGeometry(0.36, 0.35, 4, 10), std(), n);
    this.head = mk(new THREE.SphereGeometry(0.38, 14, 10), std(), n);
    this.eyes = mk(makeEyesGeo(), std({ vertexColors: true }), n, false);
    this.arms = mk(tf(new THREE.BoxGeometry(0.17, 0.55, 0.17), { y: -0.26 }), std(), n * 2);
    this.legs = mk(tf(new THREE.BoxGeometry(0.21, 0.6, 0.21), { y: -0.3 }), std(), n * 2);
    this.bikes = mk(makeBikeGeo(), std({ vertexColors: true, roughness: 0.4 }), n);
    this.axes = mk(makeAxeGeo(), std({ vertexColors: true, metalness: 0.3 }), n);
    this.saws = mk(makeSawGeo(), std({ vertexColors: true, metalness: 0.3 }), n);

    this.baseColors = racers.map((r) => new THREE.Color(r.color));
    racers.forEach((r, i) => {
      this.body.setColorAt(i, this.baseColors[i]);
      this.head.setColorAt(i, _c.set(r.skin));
      this.arms.setColorAt(i * 2, this.baseColors[i]);
      this.arms.setColorAt(i * 2 + 1, this.baseColors[i]);
      this.legs.setColorAt(i * 2, _c.set(r.pants));
      this.legs.setColorAt(i * 2 + 1, _c.set(r.pants));
    });

    // 玩家頭上的箭頭
    this.marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.7, 4),
      new THREE.MeshBasicMaterial({ color: 0xffe000 }),
    );
    this.marker.rotation.x = Math.PI;
    scene.add(this.marker);

    // 幽靈
    const ghostGeo = new THREE.SphereGeometry(0.8, 14, 10);
    this.ghost = new THREE.Mesh(ghostGeo, new THREE.MeshStandardMaterial({
      color: 0xe0f0ff, transparent: true, opacity: 0.55, emissive: 0x335577,
    }));
    const eyes = new THREE.Mesh(makeEyesGeo(), new THREE.MeshBasicMaterial({ vertexColors: true }));
    eyes.scale.setScalar(1.6);
    eyes.position.z = -0.28;
    this.ghost.add(eyes);
    this.ghost.visible = false;
    scene.add(this.ghost);
  }

  update(sim, time) {
    const mode = sim.track.mode;
    const rs = this.racers;
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i];
      if (!r.alive) {
        this.body.setMatrixAt(i, ZERO); this.head.setMatrixAt(i, ZERO); this.eyes.setMatrixAt(i, ZERO);
        this.arms.setMatrixAt(i * 2, ZERO); this.arms.setMatrixAt(i * 2 + 1, ZERO);
        this.legs.setMatrixAt(i * 2, ZERO); this.legs.setMatrixAt(i * 2 + 1, ZERO);
        this.bikes.setMatrixAt(i, ZERO); this.axes.setMatrixAt(i, ZERO); this.saws.setMatrixAt(i, ZERO);
        continue;
      }
      const moving = Math.min(1, Math.abs(r.speed) / 3);
      let pitch = 0, y = r.y, roll = r.falling ? -r.y * 0.6 : 0;
      if (mode === 'swim') { pitch = -1.45; y = r.y - 0.3 + Math.sin(time * 3 + i) * 0.06; }
      else if (mode === 'bike') { pitch = -0.3; y = r.y + 0.33; }
      else y = r.y + Math.abs(Math.sin(r.anim * 1.1)) * 0.12 * moving;

      setRoot(r.x, y, r.z, pitch, -r.h, roll);
      if (mode === 'swim') _root.multiply(_loc.makeTranslation(0, -1.0, 0));

      _m.multiplyMatrices(_root, local(0, 1.12, 0, 0));
      this.body.setMatrixAt(i, _m);
      _m.multiplyMatrices(_root, local(0, 1.95, 0, 0));
      this.head.setMatrixAt(i, _m);
      this.eyes.setMatrixAt(i, _m);

      // 手腳的動作
      let aL, aR, lL, lR;
      if (mode === 'swim') {
        aL = r.anim * 0.9; aR = aL + Math.PI;
        lL = Math.sin(r.anim * 2.4) * 0.35; lR = -lL;
      } else if (mode === 'bike') {
        const p = Math.sin(r.anim * 1.4) * 0.45;
        lL = 1.1 + p; lR = 1.1 - p;
        aL = aR = 0.9;
      } else {
        const s = Math.sin(r.anim * 1.1) * 0.9 * moving;
        lL = s; lR = -s; aL = -s; aR = s;
      }
      if (r.punchT > 0) aR = 1.7;
      if (r.melee) {
        aR = r.melee.type === 'axe' ? 1.4 + Math.sin(time * 16) * 0.9 : 1.5 + Math.sin(time * 60) * 0.05;
        if (mode !== 'swim') aL = 1.3;
      }
      _m.multiplyMatrices(_root, local(-0.5, 1.5, 0, aL));
      this.arms.setMatrixAt(i * 2, _m);
      _m2.multiplyMatrices(_root, local(0.5, 1.5, 0, aR));
      this.arms.setMatrixAt(i * 2 + 1, _m2);

      if (r.melee) {
        _m.multiplyMatrices(_m2, local(0, -0.55, 0, 0));
        const isAxe = r.melee.type === 'axe';
        (isAxe ? this.axes : this.saws).setMatrixAt(i, _m);
        (isAxe ? this.saws : this.axes).setMatrixAt(i, ZERO);
      } else {
        this.axes.setMatrixAt(i, ZERO);
        this.saws.setMatrixAt(i, ZERO);
      }

      _m.multiplyMatrices(_root, local(-0.16, 0.62, 0, lL));
      this.legs.setMatrixAt(i * 2, _m);
      _m.multiplyMatrices(_root, local(0.16, 0.62, 0, lR));
      this.legs.setMatrixAt(i * 2 + 1, _m);

      if (mode === 'bike') {
        setRoot(r.x, r.y, r.z, 0, -r.h, roll);
        this.bikes.setMatrixAt(i, _root);
      } else this.bikes.setMatrixAt(i, ZERO);

      // 被打到時閃白光
      if (r.hitT > 0) this.body.setColorAt(i, _white);
      else if (r.invulnT > 0 && Math.sin(time * 30) > 0) this.body.setColorAt(i, _white);
      else this.body.setColorAt(i, this.baseColors[i]);
    }
    for (const m of [this.body, this.head, this.eyes, this.arms, this.legs, this.bikes, this.axes, this.saws]) {
      m.instanceMatrix.needsUpdate = true;
    }
    this.body.instanceColor.needsUpdate = true;

    const h = sim.human;
    this.marker.visible = h.alive;
    if (h.alive) {
      const baseY = mode === 'swim' ? 1.6 : mode === 'bike' ? 3.4 : 3.1;
      this.marker.position.set(h.x, h.y + baseY + Math.sin(time * 5) * 0.15, h.z);
      this.marker.rotation.y = time * 3;
    }
    this.ghost.visible = h.ghost;
    if (h.ghost) {
      this.ghost.position.set(h.ghostX, 3 + Math.sin(time * 2.5) * 0.3, h.ghostZ);
      this.ghost.rotation.y = -h.ghostH;
    }
  }
}
