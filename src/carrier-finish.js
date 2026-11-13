import * as T from 'three';

function makeMap(paint, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  paint(context, width, height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function hullWeathering(ctx, width, height) {
  ctx.fillStyle = '#eff1ef';
  ctx.fillRect(0, 0, width, height);

  const waterline = ctx.createLinearGradient(0, height * .52, 0, height);
  waterline.addColorStop(0, 'rgba(87,100,96,0)');
  waterline.addColorStop(.78, 'rgba(87,100,96,.18)');
  waterline.addColorStop(1, 'rgba(87,100,96,.38)');
  ctx.fillStyle = waterline;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 145; i++) {
    const x = i * width / 145;
    const length = 18 + Math.sin(i * 6.13) ** 2 * 89;
    const streak = ctx.createLinearGradient(0, 8, 0, length);
    streak.addColorStop(0, 'rgba(124,105,90,.08)');
    streak.addColorStop(.25, 'rgba(124,105,90,.12)');
    streak.addColorStop(1, 'rgba(124,105,90,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, 8, 2 + Math.sin(i * 4.72) ** 2 * 5, length - 8);
  }

  const seams = [0.15, 0.34, 0.52, 0.68, 0.86];
  ctx.fillStyle = 'rgba(68,75,76,.12)';
  for (const seam of seams) ctx.fillRect(width * seam, 6, 1.6, height - 14);
  ctx.fillRect(0, height * .58, width, 1.5);
  ctx.fillStyle = 'rgba(255,255,255,.13)';
  for (const seam of seams) ctx.fillRect(width * seam + 1.6, 6, 1, height - 14);
  ctx.fillRect(0, height * .58 - 1, width, 1);
}

function deckWeathering(ctx, width, height) {
  ctx.fillStyle = '#e8e9e6';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 84; i++) {
    const x = i * width / 84;
    const y = height * (.12 + .76 * Math.sin(i * 4.31) ** 2);
    const spot = ctx.createRadialGradient(x, y, 0, x, y, 13);
    spot.addColorStop(0, 'rgba(55,59,51,.17)');
    spot.addColorStop(1, 'rgba(55,59,51,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(x - 13, y - 13, 26, 26);
  }
  ctx.fillStyle = 'rgba(71,76,68,.19)';
  for (const seam of [0.18, 0.33, 0.50, 0.67, 0.83]) ctx.fillRect(width * seam, 0, 1.4, height);
}

export function finishCarrier(hull, deck) {
  const minX = -9.45;
  const length = 19.2;
  const hullGeometry = hull.geometry;
  const hullUV = hullGeometry.attributes.uv;
  const hullPosition = hullGeometry.attributes.position;
  for (let i = 0; i < hullUV.count; i++) {
    hullUV.setXY(i, (hullPosition.getX(i) - minX) / length, (hullPosition.getZ(i) + .11) / 1.22);
  }
  hull.material.map = makeMap(hullWeathering, 1024, 128);

  const deckGeometry = deck.geometry;
  const deckUV = deckGeometry.attributes.uv;
  const deckPosition = deckGeometry.attributes.position;
  for (let i = 0; i < deckUV.count; i++) {
    deckUV.setXY(i, (deckPosition.getX(i) - minX) / length, (deckPosition.getY(i) + 1.40) / 2.80);
  }
  deck.material.map = makeMap(deckWeathering, 512, 96);
}
