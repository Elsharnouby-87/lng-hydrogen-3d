import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { group, steel } from './plant-geometry.js';
import layout from './precooler-layout.json';
import { addPrecoolerPassages, addPrecoolerRisers, fluidAt, layerY } from './precooler-flow.js';

async function readAsset() {
  const bytes = Uint8Array.from(atob(E101_ASSET), letter => letter.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new GLTFLoader().parseAsync(await new Response(stream).arrayBuffer(), '');
}

export function createPrecoolerInspection(parent, fallback, invalidate) {
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

  const streams = ['h2', 'lng'].map(fluid => {
    const root = group(assembly);
    const lanes = [];
    for (let index = 0; index < layout.layers; index++) {
      if (fluidAt(index) === fluid) lanes.push(addPrecoolerPassages(root, fluid, layerY(index), plane));
    }
    addPrecoolerRisers(root, fluid, plane);
    return { fluid, root, lanes };
  });

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
    for (const { fluid, root } of streams) {
      root.visible = section && enabled && running && (focus === 'both' || focus === fluid);
    }
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
    animate(phase) {
      if (!assembly.visible) return;
      for (const { root, lanes } of streams) if (root.visible) for (const animate of lanes) animate(phase);
    },
  };
}
