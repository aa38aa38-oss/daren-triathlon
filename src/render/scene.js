// Three.js 場景、燈光、攝影機
import * as THREE from 'three';
import { gradientTexture } from './geo.js';

export const isMobile = matchMedia('(pointer: coarse)').matches;

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.25 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x200006);
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 700);
  camera.position.set(0, 6, 12);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = !isMobile;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 160;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  return {
    renderer, scene, camera, hemi, sun,
    camH: 0, shake: 0, snap: true,
    desired: new THREE.Vector3(), look: new THREE.Vector3(),
  };
}

export function applyLook(ctx, look) {
  const { scene, hemi, sun } = ctx;
  if (scene.background && scene.background.isTexture) scene.background.dispose();
  scene.background = gradientTexture(look.top, look.bottom);
  scene.fog = new THREE.Fog(look.fog, look.fogNear, look.fogFar);
  hemi.color.set(look.hemiSky);
  hemi.groundColor.set(look.hemiGround);
  hemi.intensity = look.hemiI ?? 1.4;
  sun.color.set(look.sun);
  sun.intensity = look.sunI ?? 2.2;
}

const lerpAngle = (a, b, t) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

// 攝影機跟在玩家（或幽靈）後面
export function updateCamera(ctx, sim, dt) {
  const h = sim.human;
  const ghost = h.ghost;
  const x = ghost ? h.ghostX : h.x;
  const y = ghost ? 3 : h.y;
  const z = ghost ? h.ghostZ : h.z;
  const hd = ghost ? h.ghostH : h.h;
  if (ctx.snap) ctx.camH = hd;
  else if (!(h.stunT > 0) || ghost) ctx.camH = lerpAngle(ctx.camH, hd, 1 - Math.exp(-5 * dt));

  const mode = sim.track.mode;
  const back = ghost ? 11 : mode === 'bike' ? 10 : 8.5;
  const up = ghost ? 6 : 4.3;
  ctx.desired.set(x - Math.sin(ctx.camH) * back, y + up, z + Math.cos(ctx.camH) * back);
  if (ctx.snap) { ctx.camera.position.copy(ctx.desired); ctx.snap = false; }
  else ctx.camera.position.lerp(ctx.desired, 1 - Math.exp(-8 * dt));

  if (ctx.shake > 0) {
    const s = ctx.shake;
    ctx.camera.position.x += (Math.random() - 0.5) * s;
    ctx.camera.position.y += (Math.random() - 0.5) * s;
    ctx.shake = Math.max(0, ctx.shake - dt * 3);
  }
  ctx.look.set(x + Math.sin(ctx.camH) * 6, y + 1.2, z - Math.cos(ctx.camH) * 6);
  ctx.camera.lookAt(ctx.look);

  ctx.sun.position.set(x + 25, 45, z + 15);
  ctx.sun.target.position.set(x, 0, z - 10);
}
