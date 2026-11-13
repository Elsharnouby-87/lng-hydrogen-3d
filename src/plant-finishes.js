import * as T from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { material, road, seaWall, slab, steel } from './plant-geometry.js';

export const quayConcrete = material(0xb6ac9b, 0, .95);
export const quayCoping = material(0xc9bfad, 0, .93);
export const coastalGround = material(0xaaa18d, 0, .98);
export const yardAsphalt = material(0x858b8b, 0, .96);
export const brushedAluminium = material(0xc4c9ca, .75, .40);
export const machinedStainless = material(0xc8cbcc, .92, .36);
export const insulatedCladding = material(0xc4cacb, .27, .48);
export const paintedEnclosure = material(0xa4b2b7, .12, .50);

export function setDaylightEnvironment(scene, renderer) {
  const bytes = Uint8Array.from(atob(PLANT_FINISHES['harbor-daylight.hdr']), value => value.charCodeAt(0));
  const image = new HDRLoader().parse(bytes.buffer);
  const hdr = new T.DataTexture(image.data, image.width, image.height, T.RGBAFormat, image.type);
  hdr.colorSpace = T.LinearSRGBColorSpace;
  hdr.mapping = T.EquirectangularReflectionMapping;
  hdr.minFilter = hdr.magFilter = T.LinearFilter;
  hdr.flipY = true;
  hdr.needsUpdate = true;
  const generator = new T.PMREMGenerator(renderer);
  try {
    scene.environment = generator.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = .90;
    scene.environmentRotation.y = .7;
  } finally {
    hdr.dispose();
    generator.dispose();
  }
}

export function applySurfaceFinishes(renderer, invalidate) {
  const loader = new T.TextureLoader();
  function texture(name, repeat, color = false) {
    const file = name + '.webp';
    const map = loader.load('data:image/webp;base64,' + PLANT_FINISHES[file], invalidate, undefined, invalidate);
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.repeat.set(...repeat);
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (color) map.colorSpace = T.SRGBColorSpace;
    return map;
  }
  function surface(finish, name, repeat, strength) {
    finish.map = texture(name + '-color', repeat, true);
    finish.normalMap = texture(name + '-normal', repeat);
    finish.normalScale.setScalar(strength);
    finish.roughnessMap = texture(name + '-roughness', repeat);
  }

  surface(quayConcrete, 'concrete', [.36, .36], .38);
  surface(coastalGround, 'concrete', [.19, .19], .16);
  surface(quayCoping, 'concrete', [.42, .42], .27);
  surface(yardAsphalt, 'asphalt', [.48, .48], .27);
  surface(road, 'asphalt', [15, 8], .32);
  surface(slab, 'concrete', [3, 2], .30);
  surface(seaWall, 'concrete', [5, 2], .34);

  const metalNormal = texture('metal-normal', [1, 1]);
  const metalRoughness = texture('metal-roughness', [1, 1]);
  for (const [finish, strength] of [[machinedStainless, .27], [brushedAluminium, .19], [steel, .15], [insulatedCladding, .10]]) {
    finish.normalMap = metalNormal;
    finish.normalScale.setScalar(strength);
    finish.roughnessMap = metalRoughness;
  }
}
