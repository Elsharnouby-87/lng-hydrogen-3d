import * as T from 'three';
import layout from './precooler-layout.json';
import { BLUE, MINT, segment, v } from './plant-geometry.js';

const { lanes, lanePitch, flowY, headerX, riserX, nozzleX, nozzleY, nozzleZ } = layout;
export const lanePositions = Array.from({ length: lanes }, (_, i) => (i - (lanes - 1) / 2) * lanePitch);
export const layerY = index => layout.firstLayerY + index * layout.layerPitch;
export const fluidAt = index => index % 2 === 0 ? 'h2' : 'lng';
const pulses = 4;
const pulseGeometry = new T.BoxGeometry(.094, .019, .019);
const arrowGeometry = new T.ConeGeometry(.026, .106, 5);
const transform = new T.Object3D();

function flowMaterial(fluid, plane) {
  return new T.MeshBasicMaterial({
    color: fluid === 'h2' ? BLUE : MINT,
    clippingPlanes: plane ? [plane] : null,
    // The inspection layer shows both circuits even when the metal obscures one.
    depthTest: !plane,
    depthWrite: !plane,
  });
}

function manifold(parent, material, height, fluid, fullConnection) {
  const portZ = fluid === 'h2' ? -nozzleZ : nozzleZ;
  for (const side of [-1, 1]) {
    const end = lanePositions.at(-1) + (fullConnection ? .024 : 0);
    segment(parent, v(side * headerX, height, -end), v(side * headerX, height, end), .022, material).renderOrder = 4;
    if (!fullConnection) continue;
    segment(parent, v(side * headerX, height, portZ), v(side * riserX, height, portZ), .018, material).renderOrder = 4;
  }
}

export function riserSpan(fluid) {
  const levels = Array.from({ length: layout.layers }, (_, i) => i)
    .filter(i => fluidAt(i) === fluid).map(i => layerY(i) + flowY);
  return { portZ: fluid === 'h2' ? -nozzleZ : nozzleZ,
    top: Math.max(nozzleY, levels.at(-1)), bottom: Math.min(nozzleY, levels[0]) };
}

export function addPrecoolerRisers(parent, fluid, plane) {
  const material = flowMaterial(fluid, plane);
  const { portZ, top, bottom } = riserSpan(fluid);
  for (const side of [-1, 1]) {
    const x = side * riserX;
    segment(parent, v(side * nozzleX, nozzleY, portZ), v(x, nozzleY, portZ), .031, material).renderOrder = 4;
    segment(parent, v(x, bottom, portZ), v(x, top, portZ), .025, material).renderOrder = 4;
  }
}

export function addPrecoolerPassages(parent, fluid, offset = 0, plane = null) {
  const material = flowMaterial(fluid, plane);
  const direction = fluid === 'h2' ? 1 : -1;
  const height = offset + flowY + (plane ? 0 : .086);
  const markers = new T.InstancedMesh(pulseGeometry, material, lanes * pulses);
  const arrows = new T.InstancedMesh(arrowGeometry, material, lanes);
  markers.frustumCulled = arrows.frustumCulled = false;
  markers.renderOrder = arrows.renderOrder = 5;
  parent.add(markers, arrows);
  const lanesZ = lanePositions.map(z => z + (plane ? direction * .023 : 0));
  transform.rotation.set(0, 0, -direction * Math.PI / 2);
  for (const [i, z] of lanesZ.entries()) {
    transform.position.set(direction * (.35 + (i % 4) * .67), height, z);
    transform.updateMatrix();
    arrows.setMatrixAt(i, transform.matrix);
  }
  manifold(parent, material, height, fluid, Boolean(plane));
  return function animate(phase) {
    transform.rotation.set(0, 0, 0);
    for (const [i, z] of lanesZ.entries()) {
      for (let j = 0; j < pulses; j++) {
        const t = (phase + j / pulses + i * .029) % 1;
        transform.position.set(direction * (t * 2 - 1) * headerX, height, z);
        transform.updateMatrix();
        markers.setMatrixAt(i * pulses + j, transform.matrix);
      }
    }
    markers.instanceMatrix.needsUpdate = true;
  };
}
