// 低多邊形模型的小工具：把很多簡單形狀合併成一個模型，並上顏色
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function colored(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

export function tf(geo, o = {}) {
  const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = o;
  if (sx !== 1 || sy !== 1 || sz !== 1) geo.scale(sx, sy, sz);
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  return geo;
}

export const part = (geo, hex, o) => colored(tf(geo, o), hex);
export const merge = (list) => mergeGeometries(list, false);

export function textTexture(text, { bg = '#b00000', fg = '#ffffff', w = 512, h = 128, font = 'bold 72px sans-serif' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 角色、武器、單車、鯊魚的模型（全部面向 -Z）
export function makeEyesGeo() {
  return merge([
    part(new THREE.SphereGeometry(0.11, 8, 6), 0xffffff, { x: -0.14, y: 0.06, z: -0.3 }),
    part(new THREE.SphereGeometry(0.11, 8, 6), 0xffffff, { x: 0.14, y: 0.06, z: -0.3 }),
    part(new THREE.SphereGeometry(0.055, 6, 5), 0x000000, { x: -0.14, y: 0.05, z: -0.4 }),
    part(new THREE.SphereGeometry(0.055, 6, 5), 0x000000, { x: 0.14, y: 0.05, z: -0.4 }),
    part(new THREE.BoxGeometry(0.2, 0.05, 0.05), 0x111111, { x: -0.14, y: 0.2, z: -0.34, rz: -0.35 }),
    part(new THREE.BoxGeometry(0.2, 0.05, 0.05), 0x111111, { x: 0.14, y: 0.2, z: -0.34, rz: 0.35 }),
    part(new THREE.BoxGeometry(0.2, 0.05, 0.05), 0x5a0000, { y: -0.16, z: -0.35 }),
  ]);
}

export function makeBikeGeo() {
  const frame = 0xc0101a, black = 0x1a1a1a, metal = 0x9a9a9a;
  return merge([
    part(new THREE.TorusGeometry(0.42, 0.07, 6, 16), black, { y: 0.45, z: -0.78, ry: Math.PI / 2 }),
    part(new THREE.TorusGeometry(0.42, 0.07, 6, 16), black, { y: 0.45, z: 0.78, ry: Math.PI / 2 }),
    part(new THREE.BoxGeometry(0.08, 0.08, 1.4), frame, { y: 0.85 }),
    part(new THREE.BoxGeometry(0.08, 0.08, 1.1), frame, { y: 0.62, z: -0.1, rx: 0.5 }),
    part(new THREE.BoxGeometry(0.06, 0.5, 0.06), metal, { y: 0.7, z: -0.72, rx: -0.2 }),
    part(new THREE.BoxGeometry(0.06, 0.55, 0.06), frame, { y: 0.68, z: 0.3, rx: 0.25 }),
    part(new THREE.BoxGeometry(0.28, 0.07, 0.4), black, { y: 0.96, z: 0.25 }),
    part(new THREE.BoxGeometry(0.7, 0.06, 0.06), metal, { y: 1.08, z: -0.62 }),
    part(new THREE.BoxGeometry(0.06, 0.3, 0.06), metal, { y: 0.95, z: -0.65 }),
  ]);
}

export function makeAxeGeo() {
  return merge([
    part(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), 0x6b3e1e, { z: -0.35, rx: Math.PI / 2 }),
    part(new THREE.BoxGeometry(0.06, 0.45, 0.35), 0xc8d0d8, { z: -0.8, y: -0.18 }),
    part(new THREE.BoxGeometry(0.08, 0.2, 0.22), 0x9a0000, { z: -0.82, y: -0.34 }),
  ]);
}

export function makeSawGeo() {
  return merge([
    part(new THREE.BoxGeometry(0.3, 0.35, 0.5), 0xff7a00, { y: -0.1 }),
    part(new THREE.BoxGeometry(0.08, 1.1, 0.22), 0x9aa0a6, { y: -0.8 }),
    part(new THREE.BoxGeometry(0.1, 1.0, 0.06), 0x8a0000, { y: -0.8, z: -0.13 }),
  ]);
}

export function makeSharkGeo() {
  const grey = 0x5d6d7e;
  return merge([
    part(new THREE.SphereGeometry(0.6, 10, 8), grey, { sx: 0.85, sy: 0.7, sz: 2.3, y: -0.2 }),
    part(new THREE.SphereGeometry(0.55, 10, 8), 0xe8e8e8, { sx: 0.75, sy: 0.5, sz: 2.0, y: -0.38 }),
    part(new THREE.ConeGeometry(0.4, 1.2, 4), grey, { y: 0.55, z: 0.2, rx: 0.35 }),
    part(new THREE.ConeGeometry(0.35, 1.0, 4), grey, { y: -0.2, z: 1.7, rx: Math.PI / 2 }),
    part(new THREE.BoxGeometry(0.7, 0.18, 0.3), 0x9a0000, { y: -0.32, z: -1.2 }),
    part(new THREE.SphereGeometry(0.08, 6, 6), 0x000000, { x: 0.35, y: -0.05, z: -0.95 }),
    part(new THREE.SphereGeometry(0.08, 6, 6), 0x000000, { x: -0.35, y: -0.05, z: -0.95 }),
  ]);
}
