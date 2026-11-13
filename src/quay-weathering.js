import * as T from 'three';
import { mesh } from './plant-geometry.js';

function finishTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paint(ctx, width, height);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
}

function tideFinish(ctx, width, height) {
  const band = ctx.createLinearGradient(0, 0, 0, height);
  band.addColorStop(0, 'rgba(39,48,42,0)');
  band.addColorStop(.28, 'rgba(54,64,45,.02)');
  band.addColorStop(.73, 'rgba(50,61,47,.27)');
  band.addColorStop(1, 'rgba(32,48,45,.46)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 108; i++) {
    const x = i * width / 108;
    const start = height * (.30 + .20 * Math.sin(i * 9.31));
    const end = height * (.75 + .20 * Math.sin(i * 2.52));
    const stain = ctx.createLinearGradient(0, start, 0, end);
    stain.addColorStop(0, 'rgba(68,54,33,0)');
    stain.addColorStop(.46, 'rgba(68,54,33,.12)');
    stain.addColorStop(1, 'rgba(68,54,33,0)');
    ctx.fillStyle = stain;
    ctx.fillRect(x, start, 4 + 4 * Math.sin(i * 1.27) ** 2, end - start);
  }
}

function apronFinish(ctx, width, height) {
  for (let i = 0; i < 24; i++) {
    const x = width * (.17 + .64 * Math.sin(i * 4.73) ** 2);
    const y = height * (.20 + .58 * Math.cos(i * 3.73) ** 2);
    const radius = 10 + 15 * Math.sin(i * 5.16) ** 2;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, 'rgba(59,50,34,.12)');
    stain.addColorStop(.55, 'rgba(72,67,48,.065)');
    stain.addColorStop(1, 'rgba(72,67,48,0)');
    ctx.fillStyle = stain;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

export function addQuayWeathering(apron) {
  const tide = finishTexture(512, 96, tideFinish);
  if (tide) {
    const wall = new T.PlaneGeometry(14.87, .79);
    for (const x of [-14.87, 0, 14.87]) mesh(apron, wall, tide, x, -.625, 10.857);
    mesh(apron, new T.PlaneGeometry(16.77, .40), tide, 10.4, -.131, 12.773);
  }

  const stains = finishTexture(256, 96, apronFinish);
  if (stains) {
    const pavement = new T.PlaneGeometry(4.14, 1.62);
    for (const x of [4.36, 8.38, 12.4, 16.42]) {
      const patch = mesh(apron, pavement, stains, x, .078, 11.83);
      patch.rotation.x = -Math.PI / 2;
    }
  }
}
