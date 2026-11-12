import * as T from 'three';

const compactSphere = new T.SphereGeometry(1, 12, 7);
const compactCylinder = new T.CylinderGeometry(1, 1, 1, 14, 1);
const light = new T.Vector3(-0.42, 0.79, 0.44).normalize();
const cool = new T.Vector3(0.47, 0.64, -0.6).normalize();

export function softwareRenderer() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');
  const viewProjection = new T.Matrix4(),
    transform = new T.Matrix4(),
    model = new T.Matrix4(),
    instance = new T.Matrix4();
  const normalMatrix = new T.Matrix3(),
    normal = new T.Vector3(),
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3();
  const cache = new WeakMap();
  const colors = new Map();
  let width = 1,
    height = 1,
    pixelRatio = 1,
    frame = 0,
    prior = -1;
  let frameRequest = null;
  let animation = null;
  function facesFor(geometry) {
    if (cache.has(geometry)) return cache.get(geometry);
    const geo =
      geometry.type === 'SphereGeometry' && geometry.parameters.radius === 1
        ? compactSphere
        : geometry.type === 'CylinderGeometry' && geometry.parameters.radialSegments > 14
          ? compactCylinder
          : geometry;
    const positions = geo.attributes.position;
    const count = geo.index ? geo.index.count : positions.count;
    const points = Float32Array.from(positions.array);
    const faces = [];
    const ix = (i) => (geo.index ? geo.index.getX(i) : i);
    for (let i = 0; i < count; i += 3) {
      const ia = ix(i),
        ib = ix(i + 1),
        ic = ix(i + 2);
      a.fromArray(points, ia * 3);
      b.fromArray(points, ib * 3).sub(a);
      c.fromArray(points, ic * 3).sub(a);
      b.cross(c).normalize();
      faces.push([ia, ib, ic, b.x, b.y, b.z]);
    }
    const data = { points, faces, projectedPoints: new Float32Array(points.length) };
    cache.set(geometry, data);
    return data;
  }
  function fill(base, level) {
    const rgb = base.getHex(T.SRGBColorSpace),
      index = Math.min(24, Math.round(level * 18)),
      key = rgb * 32 + index;
    if (colors.has(key)) return colors.get(key);
    const n = index / 18,
      channel = (shift) => Math.min(255, Math.round(((rgb >> shift) & 255) * n + 8));
    const value = 'rgb(' + channel(16) + ',' + channel(8) + ',' + channel(0) + ')';
    colors.set(key, value);
    return value;
  }
  function render(scene, camera) {
    const now = performance.now();
    if (prior >= 0 && now - prior < 32) return false;
    prior = now;
    const water = ctx.createLinearGradient(0, 0, width * 0.72, height);
    water.addColorStop(0, '#91afba');
    water.addColorStop(0.51, '#7598a7');
    water.addColorStop(1, '#577f92');
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);
    scene.updateMatrixWorld(true);
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const list = [];
    function collect(object, matrix) {
      const mat = object.material;
      const { points, faces, projectedPoints: mapped } = facesFor(object.geometry);
      transform.multiplyMatrices(viewProjection, matrix);
      normalMatrix.getNormalMatrix(matrix);
      for (let i = 0; i < points.length; i += 3) {
        a.fromArray(points, i).applyMatrix4(transform);
        mapped[i] = (1 + a.x) * width * 0.5;
        mapped[i + 1] = (1 - a.y) * height * 0.5;
        mapped[i + 2] = a.z;
      }
      for (const [a0, b0, c0, nx, ny, nz] of faces) {
        const ia = a0 * 3,
          ib = b0 * 3,
          ic = c0 * 3;
        const ax = mapped[ia],
          ay = mapped[ia + 1],
          bx = mapped[ib],
          by = mapped[ib + 1],
          cx = mapped[ic],
          cy = mapped[ic + 1];
        const winding = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if (
          winding >= -0.09 ||
          Math.max(ax, bx, cx) < 0 ||
          Math.min(ax, bx, cx) > width ||
          Math.max(ay, by, cy) < 0 ||
          Math.min(ay, by, cy) > height
        )
          continue;
        normal.set(nx, ny, nz).applyNormalMatrix(normalMatrix);
        const level = mat.isMeshBasicMaterial
          ? 1.12
          : 0.55 + 0.49 * Math.max(0, normal.dot(light)) + 0.22 * Math.max(0, normal.dot(cool));
        list.push([
          object.renderOrder * 10 + mapped[ia + 2] + mapped[ib + 2] + mapped[ic + 2],
          ax,
          ay,
          bx,
          by,
          cx,
          cy,
          fill(mat.color, level),
        ]);
      }
    }
    scene.traverseVisible((o) => {
      if (
        !o.isMesh ||
        Array.isArray(o.material) ||
        !o.material.visible ||
        !o.material.color ||
        o.material.transparent ||
        (o.material.isMeshBasicMaterial && o.material.map)
      )
        return;
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, instance);
          model.multiplyMatrices(o.matrixWorld, instance);
          collect(o, model);
        }
      } else collect(o, o.matrixWorld);
    });
    list.sort((a, b) => b[0] - a[0]);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.56;
    for (const [, ax, ay, bx, by, cx, cy, color] of list) {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    frame++;
    canvas.dataset.frame = String(frame);
    return true;
  }
  function tick(now) {
    frameRequest = requestAnimationFrame(tick);
    animation(now);
  }

  return {
    domElement: canvas,
    kind: 'canvas',
    setPixelRatio(value) {
      pixelRatio = Math.min(value, 1.3);
    },
    setSize(w, h) {
      width = w;
      height = h;
      canvas.width = Math.round(w * pixelRatio);
      canvas.height = Math.round(h * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    },
    render,
    setAnimationLoop(callback) {
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      animation = callback;
      frameRequest = callback ? requestAnimationFrame(tick) : null;
    },
  };
}
