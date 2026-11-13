import * as T from 'three';
import { bevelBox, box, boxes, cyl, group, material, mesh, rail } from './plant-geometry.js';

import { quayConcrete, quayCoping, yardAsphalt } from './plant-finishes.js';

export const harborSky = 0x8eafbe;

const bank = [
  [-1800, -590], [-124, -77], [-83, -45], [-52, -25], [-31, -16], [-22.5, -10.65],
  [22.5, -10.65], [32, -14], [53, -22], [89, -36], [125, -50], [1800, -525],
  [1800, -1800], [-1800, -1800],
];

function surface(parent, outline, height, finish) {
  const shape = new T.Shape(outline.map(([x, z]) => new T.Vector2(x, -z)));
  const geometry = new T.ShapeGeometry(shape);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i), position.getY(i));
  const surface = mesh(parent, geometry, finish, 0, height, 0);
  surface.rotation.x = -Math.PI / 2;
  return surface;
}

export function addHarbor(scene, webgl) {
  const shore = group(scene);
  const embankment = material(0x9fa5a0, 0, 1);

  const markings = material(0xd6d7cc, 0, .94);
  const paving = material(0x9aa6a7, 0, .93);
  const fenders = material(0x52666f, 0, .88);

  surface(shore, bank, -.73, embankment);
  surface(shore, bank.map(([x, z]) => [x, z - .8]), -.41, quayConcrete);
  surface(shore, bank.map(([x, z]) => [x, z - 1.7]), -.24, quayConcrete);
  box(shore, 0, -.30, -12.9, 45.12, .45, 4.50, quayCoping).castShadow = false;
  surface(shore, [[-7.45,-10.68],[-2.35,-10.68],[-2.35,-41.2],[-7.45,-41.2]], -.02, yardAsphalt);
  surface(shore, [[-30.5,-19.1],[24.5,-19.1],[24.5,-23.7],[-30.5,-23.7]], -.033, yardAsphalt);
  boxes(shore, markings, Array.from({ length: 20 }, (_, i) =>
    [i * 2.66 - 28, -.019, -21.4, 1.19, .012, .064]));
  boxes(shore, markings, [-12.9, -15, -17.1, -25, -27.1, -29.2, -31.3, -33.4].map(z =>
    [-4.9, -.014, z, .065, .012, 1.02]));
  boxes(shore, paving, [
    [-15.3, -.20, -16.1, 11.1, .32, 5.5],
    [10.2, -.20, -16.3, 17.8, .32, 5.1],
    [13.9, -.20, -29, 19.4, .32, 7.8],
    [-17, -.20, -29, 13.2, .32, 7.6],
  ]);
  boxes(shore, fenders, [-8.0, -1.8].map(x => [x, .17, -10.6, .18, .42, .18]));
  boxes(shore, markings, [
    [-4.9, -.012, -10.53, 4.5, .012, .11],
    [-7.39, -.012, -14.3, .073, .012, 7.0],
    [-2.40, -.012, -14.3, .073, .012, 7.0],
  ]);
  const roofs = material(0x9daeb3, .15, .75);
  const walls = material(0xb9bfba, 0, .94);
  for (const [x, z, width, depth] of [[-14.7, -28.5, 5.7, 3.1], [15.6, -27.5, 8.6, 4.1]]) {
    box(shore, x, .50, z, width, 1.05, depth, walls);
    box(shore, x, 1.06, z, width + .26, .16, depth + .24, roofs);
    box(shore, x + width * .27, .35, z + depth / 2, .83, .75, .052, fenders);
  }

  const stoneFinishes = [0x9c9787, 0xaaa394, 0x888979, 0xb1a896].map(color => material(color, 0, .98));
  const rock = new T.DodecahedronGeometry(1, 0);
  const transform = new T.Object3D();
  const pieces = stoneFinishes.map(() => []);
  const rockEdges = [
    [[-52, -25], [-31, -16]], [[-31, -16], [-22.5, -10.65]],
    [[22.5, -10.65], [32, -14]], [[32, -14], [53, -22]],
  ];
  for (const [a, b] of rockEdges) {
    const edge = new T.Vector2(b[0] - a[0], b[1] - a[1]);
    const count = Math.round(edge.length() * 2.4);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      for (let row = 0; row < 2; row++) {
        const seed = i * 2 + row;
        pieces[seed % pieces.length].push([
          a[0] + t * edge.x + Math.sin(seed * 4.31) * .22,
          -.82 + row * .24 + Math.cos(seed * 5.16) * .10,
          a[1] + t * edge.y - row * .34 + Math.sin(seed * 6.12) * .28,
          seed,
        ]);
      }
    }
  }
  for (const [index, positions] of pieces.entries()) {
    const stones = new T.InstancedMesh(rock, stoneFinishes[index], positions.length);
    stones.receiveShadow = true;
    for (const [i, [x, y, z, seed]] of positions.entries()) {
      transform.position.set(x, y, z);
      transform.rotation.set(.4 + Math.sin(seed), seed * 2.4, Math.cos(seed));
      transform.scale.set(.45 + .10 * Math.sin(seed), .31, .38 + .07 * Math.cos(seed));
      transform.updateMatrix();
      stones.setMatrixAt(i, transform.matrix);
    }
    shore.add(stones);
  }
  const gate = group(shore, -8.4, 0, -13.9);
  bevelBox(gate, 0, .51, 0, 1.25, 1.12, 1.42, .035, walls);
  box(gate, 0, 1.11, 0, 1.50, .11, 1.63, roofs);
  box(gate, .635, .75, 0, .045, .40, .94, fenders);
  box(gate, 0, .72, .721, .89, .37, .03, fenders);
  for (const x of [1.2, 5.82]) cyl(gate, x, .28, .95, .061, .56, fenders, 'y', true);
  rail(shore, -20, -14.45, -11.5, -14.45, -.05);
  rail(shore, 1.2, -14.60, 19.0, -14.60, -.05);

  if (!webgl) return null;
  const water = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 point;
      void main() {
        point = position.xy * vec2(1., -1.);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec2 point;
      void main() {
        vec2 p = point;
        float phase = p.y * .13 + sin(p.x * .16) * 1.12;
        float swell = sin(phase + p.x * .23 + uTime * .39);
        float crosswave = sin(p.x * .50 - p.y * .74 + sin(p.y * .26) - uTime * .47);
        float capillary = sin(p.y * 2.35 + p.x * 1.47 + swell * 1.4 - uTime * .59);
        vec3 normal = normalize(vec3(.025 * swell + .019 * crosswave, 1., .03 * crosswave + .012 * capillary));
        vec3 eye = normalize(vec3(viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z));
        float sky = pow(1. - clamp(dot(normal, eye), 0., 1.), 2.);
        float sheen = pow(max(0., dot(normal, normalize(eye + vec3(-.35, .86, -.16)))), 26.);
        vec2 edge = max(abs(p - vec2(0., .1)) - vec2(22.55, 10.8), 0.);
        float quay = exp(-length(edge) * .85);
        vec2 berth = max(abs(p - vec2(11.35, 14.95)) - vec2(8.9, 1.1), 0.);
        float hull = exp(-length(berth) * 1.5);
        float variation = .5 + .5 * sin(p.x * .069 + p.y * .105 + .64 * swell);
        vec3 color = mix(vec3(.233, .405, .469), vec3(.565, .701, .737), .16 + sky * .58 + variation * .14);
        color += (swell * .016 + crosswave * .009 + capillary * .004 + sheen * .14) * vec3(.70, .90, 1.);
        color = mix(color, vec3(.234, .343, .368), quay * .34 + hull * .45);
        float shoreline = exp(-abs(p.y - 10.88 + swell * .07) * 8.) * (1. - smoothstep(22., 22.6, abs(p.x)));
        color += shoreline * (.023 + .013 * crosswave);
        gl_FragColor = vec4(color, 1.);
      }`,
  });
  const sea = mesh(scene, new T.PlaneGeometry(4400, 4400), water, 0, -1.03, 0);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = false;
  return water.uniforms.uTime;
}
