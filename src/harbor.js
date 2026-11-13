import * as T from 'three';
import { bevelBox, box, boxes, cyl, group, material, mesh, rail } from './plant-geometry.js';

import { coastalGround, quayConcrete, quayCoping, yardAsphalt } from './plant-finishes.js';
import { detailServiceYard } from './yard-details.js';

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

export function addHarbor(scene) {
  const shore = group(scene);
  const embankment = material(0x9fa5a0, 0, 1);

  const markings = material(0xd6d7cc, 0, .94);
  const paving = material(0x9aa6a7, 0, .93);
  const fenders = material(0x52666f, 0, .88);
  const gravel = material(0x93897a, 0, .99);
  const compactedSand = material(0x9d957e, 0, .99);

  surface(shore, bank, -.73, embankment);
  surface(shore, bank.map(([x, z]) => [x, z - .8]), -.41, quayConcrete);
  surface(shore, bank.map(([x, z]) => [x, z - 1.7]), -.24, coastalGround);
  box(shore, 0, -.30, -12.9, 45.12, .45, 4.50, quayCoping).castShadow = false;
  surface(shore, [[-7.45,-10.68],[-2.35,-10.68],[-2.35,-41.2],[-7.45,-41.2]], -.02, yardAsphalt);
  surface(shore, [[-30.5,-19.1],[24.5,-19.1],[24.5,-23.7],[-30.5,-23.7]], -.033, yardAsphalt);
  surface(shore, [[-31.2, -23.7], [25.4, -23.7], [25.9, -24.42], [-31.75, -24.39]], -.16, gravel);
  surface(shore, [[-31.7, -18.34], [25.6, -18.41], [25, -19.10], [-31.2, -19.10]], -.16, gravel);
  surface(shore, [[-32.4, -25.2], [-25.3, -24.38], [-22.6, -33.8], [-26.2, -35.1], [-33.1, -30.2]], -.22, compactedSand);
  surface(shore, [[20.8, -31.6], [25.1, -31.5], [30.6, -25.1], [33.9, -27.0], [30.1, -36.8], [22.1, -36.2]], -.22, compactedSand);
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
          -.85 + row * .29 + Math.cos(seed * 5.16) * .10,
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
      transform.scale.set(.43 + .15 * Math.sin(seed * 2.1), .27 + .085 * Math.cos(seed * 2.9), .39 + .12 * Math.cos(seed));
      transform.updateMatrix();
      stones.setMatrixAt(i, transform.matrix);
    }
    shore.add(stones);
  }
  const verge = [
    [-30.7, -24.9], [-29.1, -25.4], [-26.9, -29.2], [-25.7, -32.9],
    [24.6, -33.2], [26.1, -33.5], [28.9, -31.7], [28.4, -27.0],
  ];
  const scrub = new T.InstancedMesh(rock, material(0x73775b, 0, 1), verge.length * 3);
  for (const [index, [x, z]] of verge.entries()) {
    for (let clump = 0; clump < 3; clump++) {
      const seed = index * 3 + clump;
      transform.position.set(x + (clump - 1) * .19, -.14, z + Math.sin(seed * 3.71) * .19);
      transform.rotation.set(.17, seed * 1.82, -.15);
      transform.scale.set(.21 + .07 * Math.cos(seed), .16 + .07 * Math.sin(seed), .20);
      transform.updateMatrix();
      scrub.setMatrixAt(seed, transform.matrix);
    }
  }
  scrub.receiveShadow = true;
  shore.add(scrub);

  const gate = group(shore, -8.4, 0, -13.9);
  bevelBox(gate, 0, .51, 0, 1.25, 1.12, 1.42, .035, walls);
  box(gate, 0, 1.11, 0, 1.50, .11, 1.63, roofs);
  box(gate, .635, .75, 0, .045, .40, .94, fenders);
  box(gate, 0, .72, .721, .89, .37, .03, fenders);
  for (const x of [1.2, 5.82]) cyl(gate, x, .28, .95, .061, .56, fenders, 'y', true);
  rail(shore, -20, -14.45, -11.5, -14.45, -.05);
  rail(shore, 1.2, -14.60, 19.0, -14.60, -.05);
  detailServiceYard(shore);

}
