import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const BLUE = 0x44bbf7;
export const MINT = 0x4ce1b2;
export const GOLD = 0xffb161;
export const v = (x, y, z) => new T.Vector3(x, y, z);
export const material = (color, metalness = .29, roughness = .54) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });

export const steel = material(0xc3c7ca, .87, .39);
export const ice = material(0xd3d9d9, .13, .50);
export const trim = material(0x394653, .18, .52);
export const dark = material(0x26333e, .36, .67);
export const seaWall = material(0x7c7b70, .02, .93);
export const road = material(0x7d8589, 0, .96);
export const slab = material(0xa8a295, 0, .95);
export const white = material(0xe6ddc7, .08, .70);
export const blue = material(0x407b9b, .48, .42);
export const mint = material(0x347e70, .43, .46);
export const gold = material(0xc88d41, .38, .51);
export const pipeBlue = material(0x6b8b9d, .36, .49);
export const pipeMint = material(0x648b80, .36, .51);
export const mutedPipe = material(0x52616c, .49, .56);

const unitBox = new T.BoxGeometry(1, 1, 1);
const ball = new T.SphereGeometry(1, 26, 14);
const cylinder = new T.CylinderGeometry(1, 1, 1, 36, 1);
const tinyCylinder = new T.CylinderGeometry(1, 1, 1, 12, 1);
const hex = new T.CylinderGeometry(1, 1, 1, 6, 1);
const up = v(0, 1, 0);
const axes = { x: v(1, 0, 0), y: up, z: v(0, 0, 1) };
const transform = new T.Object3D();
const rounded = new Map();

export function mesh(parent, geometry, mat, x, y, z) {
  const item = new T.Mesh(geometry, mat);
  item.position.set(x, y, z);
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

export function box(g, x, y, z, w, h, d, mat) {
  const item = mesh(g, unitBox, mat, x, y, z);
  item.scale.set(w, h, d);
  item.castShadow = w > .33 && h > .22 && d > .30;
  return item;
}

export function bevelBox(g, x, y, z, w, h, d, radius, mat) {
  const key = `${w}/${h}/${d}/${radius}`;
  if (!rounded.has(key)) rounded.set(key, new RoundedBoxGeometry(w, h, d, 2, radius));
  const item = mesh(g, rounded.get(key), mat, x, y, z);
  item.castShadow = w > .33 && h > .22 && d > .30;
  return item;
}

export function boxes(g, mat, dimensions) {
  const group = new T.InstancedMesh(unitBox, mat, dimensions.length);
  group.receiveShadow = true;
  transform.rotation.set(0, 0, 0);
  for (const [i, [x, y, z, w, h, d]] of dimensions.entries()) {
    transform.position.set(x, y, z);
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    group.setMatrixAt(i, transform.matrix);
  }
  g.add(group);
  return group;
}

export function batchStaticMeshes(root) {
  for (const child of root.children) {
    if (child.isGroup) batchStaticMeshes(child);
  }
  const batches = new Map();
  for (const child of root.children) {
    if (!child.isMesh || child.isInstancedMesh || child.children.length || child.userData.equipment) continue;
    if (![unitBox, cylinder, tinyCylinder, ball].includes(child.geometry)) continue;
    const key = `${child.geometry.id}/${child.material.id}/${child.renderOrder}/${child.castShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(child);
  }
  for (const parts of batches.values()) {
    if (parts.length < 3) continue;
    const first = parts[0];
    const instances = new T.InstancedMesh(first.geometry, first.material, parts.length);
    instances.castShadow = first.castShadow;
    instances.receiveShadow = first.receiveShadow;
    instances.renderOrder = first.renderOrder;
    for (const [index, part] of parts.entries()) {
      part.updateMatrix();
      instances.setMatrixAt(index, part.matrix);
    }
    root.remove(...parts);
    root.add(instances);
  }
}

export function sphere(g, x, y, z, sx, sy, sz, mat) {
  const item = mesh(g, ball, mat, x, y, z);
  item.scale.set(sx, sy, sz);
  item.castShadow = Math.min(sx, sy, sz) > .15;
  return item;
}

export function cyl(g, x, y, z, r, h, mat, axis = 'y', small = false) {
  const item = mesh(g, small ? tinyCylinder : cylinder, mat, x, y, z);
  item.scale.set(r, h, r);
  item.quaternion.setFromUnitVectors(up, axes[axis]);
  item.castShadow = r > .17 && h > .20;
  return item;
}

export function segment(g, a, b, r, mat) {
  const item = mesh(g, tinyCylinder, mat, 0, 0, 0);
  item.position.copy(a).lerp(b, .5);
  item.scale.set(r, a.distanceTo(b), r);
  item.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
  return item;
}

export function pipePath(points, bendRadius) {
  const curve = new T.CurvePath();
  let start = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i], next = points[i + 1];
    const incoming = corner.clone().sub(start), outgoing = next.clone().sub(corner);
    const trim = Math.min(bendRadius, incoming.length() * .42, outgoing.length() * .42);
    incoming.normalize();
    outgoing.normalize();
    if (trim < .001 || Math.abs(incoming.dot(outgoing)) > .995) {
      curve.add(new T.LineCurve3(start, corner));
      start = corner;
      continue;
    }
    const before = corner.clone().addScaledVector(incoming, -trim);
    const after = corner.clone().addScaledVector(outgoing, trim);
    curve.add(new T.LineCurve3(start, before));
    curve.add(new T.QuadraticBezierCurve3(before, corner, after));
    start = after;
  }
  curve.add(new T.LineCurve3(start, points.at(-1)));
  return curve;
}

export function pipeTube(g, curve, radius, mat) {
  const spans = Math.max(2, curve.curves.length * 8);
  return mesh(g, new T.TubeGeometry(curve, spans, radius, radius > .08 ? 12 : 8, false), mat, 0, 0, 0);
}

export function group(g, x = 0, y = 0, z = 0) {
  const item = new T.Group();
  item.position.set(x, y, z);
  g.add(item);
  return item;
}

export function flange(g, x, y, z, radius, axis, mat = steel, boltCount = 8) {
  const thickness = Math.max(.055, radius * .26);
  cyl(g, x, y, z, radius, thickness, mat, axis, boltCount <= 6);
  const direction = axes[axis];
  const rotation = new T.Quaternion().setFromUnitVectors(up, direction);
  const bolts = new T.InstancedMesh(hex, trim, boltCount * 2);
  bolts.receiveShadow = true;
  transform.quaternion.copy(rotation);
  transform.scale.set(radius * .09, thickness * .35, radius * .09);
  const position = v(0, 0, 0);
  for (let i = 0; i < boltCount; i++) {
    const angle = i * Math.PI * 2 / boltCount;
    for (const [index, face] of [-1, 1].entries()) {
      position.set(Math.cos(angle) * radius * .76, face * thickness * .58, Math.sin(angle) * radius * .76);
      transform.position.copy(position.applyQuaternion(rotation)).add(v(x, y, z));
      transform.updateMatrix();
      bolts.setMatrixAt(i * 2 + index, transform.matrix);
    }
  }
  g.add(bolts);
}

export function rail(g, x1, z1, x2, z2, y = .12) {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 1.25));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    cyl(g, x1 + (x2 - x1) * f, y + .45, z1 + (z2 - z1) * f, .029, .90, gold, 'y', true);
  }
  for (const h of [.43, .87]) segment(g, v(x1, y + h, z1), v(x2, y + h, z2), .023, gold);
}

export function pad(g, x, z, w, d) {
  box(g, x, .025, z, w, .15, d, seaWall).renderOrder = 1;
  box(g, x, .112, z, w - .1, .031, d - .1, slab).renderOrder = 1;
  for (const side of [-1, 1]) box(g, x + side * (w / 2 - .09), .134, z, .035, .012, d - .25, white);
}

const plates = new Map();
export function nameplate(g, text, x, y, z, width, height, accent = '#adcbd8') {
  const frame = box(g, x, y, z, width, height, .026, dark);
  const cacheKey = `${text}/${accent}`;
  if (!plates.has(cacheKey)) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return frame;
    ctx.fillStyle = '#17242d';
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = accent;
    ctx.fillRect(15, 15, 5, 66);
    ctx.fillStyle = '#ebf2f4';
    ctx.font = 'bold 36px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 35, 49, 450);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 4;
    plates.set(cacheKey, new T.MeshBasicMaterial({ map: texture, color: 0xffffff, toneMapped: false }));
  }
  const face = mesh(g, new T.PlaneGeometry(width - .015, height - .012), plates.get(cacheKey), x, y, z + .014);
  face.receiveShadow = false;
  return frame;
}
