import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BLUE, MINT, GOLD, group, mesh, steel } from './plant-geometry.js';

const paths = {
  h2: [[-3.89,1.38,-1.02],[-3.27,1.38,-1.02],[-3.02,2.40,-.86],[-2.42,2.40,-.38],[2.42,2.40,-.38],[3.02,2.40,-.86],[3.27,1.38,-1.02],[3.89,1.38,-1.02]],
  lng: [[3.89,1.38,1.02],[3.27,1.38,1.02],[3.02,2.09,.86],[2.42,2.09,-.38],[-2.42,2.09,-.38],[-3.02,2.09,.86],[-3.27,1.38,1.02],[-3.89,1.38,1.02]],
};

async function readAsset() {
  const bytes = Uint8Array.from(atob(E101_ASSET), letter => letter.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new GLTFLoader().parseAsync(await new Response(stream).arrayBuffer(), '');
}

export function createPrecoolerInspection(parent, route, fallback, invalidate) {
  const assembly = group(parent);
  const plane = new T.Plane(new T.Vector3(1, 0, 0), 3.55);
  function clip(material) {
    material.clippingPlanes = [plane];
    material.side = T.DoubleSide;
    return material;
  }
  const originalMaterials = new Map();
  function clipFallback(enabled) {
    for (const root of [fallback.headers, fallback.core]) {
      root.traverse(node => {
        if (!node.isMesh) return;
        if (enabled && !originalMaterials.has(node)) {
          originalMaterials.set(node, [node.material, clip(node.material.clone())]);
        }
        const materials = originalMaterials.get(node);
        if (materials) node.material = materials[Number(enabled)];
      });
    }
  }

  const streams = Object.entries(paths).map(([fluid, points]) => {
    const color = fluid === 'h2' ? BLUE : MINT;
    const root = group(assembly);
    const circuit = route(root, points, clip(new T.MeshBasicMaterial({ color })), color, 16, .028, .51);
    // Diagram overlays remain readable through the aluminium stack.
    for (const overlay of [...circuit.pipes, circuit.glow, circuit.arrows]) {
      clip(overlay.material);
      overlay.material.depthTest = false;
      overlay.material.depthWrite = false;
      overlay.renderOrder = 5;
    }
    return { fluid, circuit, root };
  });
  const heat = group(assembly);
  const heatMaterial = clip(new T.MeshBasicMaterial({ color: GOLD, depthTest: false, depthWrite: false }));
  for (const x of [-1.70,-.55,.60,1.75]) {
    const arrow = mesh(heat, new T.ConeGeometry(.047, .13, 10), heatMaterial, x, 2.22, -.25);
    arrow.rotation.z = Math.PI;
    arrow.renderOrder = 6;
  }

  let model, requested = false;
  function update({ shot, focus, running, enabled }) {
    assembly.visible = Boolean(shot);
    const section = shot === 'section';
    if (model) {
      for (const node of model.children) {
        const part = node.userData.assembly;
        node.visible = part === 'Shell' ? shot === 'flange' :
          part === 'Hydrogen' ? focus !== 'lng' : part === 'LNG' ? focus !== 'h2' : true;
      }
      model.traverse(node => {
        if (!node.isMesh || Boolean(node.material.clippingPlanes) === section) return;
        node.material.clippingPlanes = section ? [plane] : null;
        node.material.needsUpdate = true;
      });
    }
    clipFallback(section && !model);
    for (const { fluid, root, circuit } of streams) {
      root.visible = section && enabled && (focus === 'both' || focus === fluid);
      circuit.glow.visible = circuit.arrows.visible = running;
    }
    heat.visible = section && running && focus === 'both';
    if (shot && !requested) {
      requested = true;
      readAsset().then(asset => {
        model = asset.scene;
        model.traverse(node => {
          if (!node.isMesh) return;
          node.material = clip(node.material.clone());
          if (/aluminium|stainless/i.test(node.material.name)) node.material.roughnessMap = steel.roughnessMap;
          node.receiveShadow = true;
        });
        assembly.add(model);
        invalidate();
      }).catch(error => console.warn('E-101 detail asset unavailable; using the built-in geometry.', error));
    }
  }
  assembly.visible = false;
  return {
    update,
    get loaded() { return Boolean(model); },
    setDepth(percent) { plane.constant = 3.55 - percent * .0705; },
    animate(drawFlow, phase) {
      if (!assembly.visible) return;
      for (const { root, circuit } of streams) if (root.visible && circuit.glow.visible) drawFlow(circuit, phase);
    },
  };
}
