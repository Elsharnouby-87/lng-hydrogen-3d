import { createAdvancedColdBox } from './coldbox-assembly.js';
import {
  industrialCompressor, industrialLNGPump, industrialVaporizer,
  industrialLH2Tank,
} from './industrial-equipment.js';
export { industrialLH2Tank as lh2Tank } from './industrial-equipment.js';
import * as T from 'three';
import {
  BLUE, bevelBox, blue, box, boxes, cyl, dark, flange, gold, group,
  ice, material, mesh, mint, nameplate, pad, pipeBlue, pipePath, pipeTube, rail, segment, slab,
  sphere, steel, trim, v,
} from './plant-geometry.js';

import layout from './precooler-layout.json';
import { addPrecoolerPassages, fluidAt, lanePositions, layerY, riserSpan } from './precooler-flow.js';

const paintedSteel = material(0xb9c3c6, .25, .58);
const cladding = material(0x9cacb3, .62, .44);
const fins = material(0x647682, .72, .42);
const motorPaint = material(0x334c65, .34, .48);
const finBlue = material(0x4f829d, .63, .38);
const finMint = material(0x438f78, .56, .41);
const serviceYellow = material(0xd3a249, .21, .56);

function instrument(g, x, y, z, scale = 1) {
  cyl(g, x, y - .17 * scale, z, .032 * scale, .24 * scale, steel, 'y', true);
  cyl(g, x, y, z, .112 * scale, .077 * scale, trim, 'z');
  cyl(g, x, y, z + .046 * scale, .088 * scale, .018 * scale, ice, 'z', true);
  segment(g, v(x, y, z + .057 * scale), v(x + .048 * scale, y + .039 * scale, z + .057 * scale), .009 * scale, dark);
}

function nozzle(g, x, y, z, radius, length, axis, accent = steel) {
  cyl(g, x, y, z, radius * .65, length, accent, axis);
  flange(g, x, y, z, radius, axis, steel, radius < .28 ? 6 : 8);
}

function skid(g, x, z, width, depth) {
  pad(g, x, z, width + .8, depth + .68);
  for (const side of [-1, 1]) {
    box(g, x, .27, z + side * (depth / 2 - .17), width, .25, .24, trim);
    box(g, x, .388, z + side * (depth / 2 - .17), width, .067, .31, steel);
    for (const end of [-1, 1]) {
      box(g, x + end * (width / 2 - .33), .158, z + side * (depth / 2 - .17), .49, .068, .45, cladding);
      for (const dx of [-.14, .14]) cyl(g, x + end * (width / 2 - .33) + dx, .219, z + side * (depth / 2 - .17), .039, .061, dark, 'y', true);
    }
  }
  box(g, x, .437, z, width, .085, depth, trim);
}

export function tank(parent, x, z, radius, height, accent, tag) {
  const g = group(parent, x, 0, z);
  const wallBase = .25;
  const rimY = wallBase + height;
  const roofRise = radius * .23;
  cyl(g, 0, .18, 0, radius + .19, .23, slab);
  cyl(g, 0, wallBase + height / 2, 0, radius, height, paintedSteel);
  sphere(g, 0, rimY - .025, 0, radius, roofRise, radius, cladding);
  cyl(g, 0, rimY, 0, radius + .031, .068, steel);
  cyl(g, 0, .37, 0, radius + .013, .078, trim);
  cyl(g, 0, .67, 0, radius + .019, .12, accent);
  for (const share of [.32, .63, .85]) cyl(g, 0, wallBase + height * share, 0, radius + .009, .023, cladding);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const seam = box(g, Math.cos(a) * (radius + .007), wallBase + height * .53, Math.sin(a) * (radius + .007), .027, height * .71, .013, cladding);
    seam.rotation.y = Math.PI / 2 - a;
    const foot = box(g, Math.cos(a) * radius, .30, Math.sin(a) * radius, .24, .22, .15, trim);
    foot.rotation.y = Math.PI / 2 - a;
  }
  if (tag) nameplate(g, tag, 0, height * .62 + wallBase, radius + .032, radius * .71, .24, '#92ddc8');
  const deckY = rimY + roofRise + .04;
  box(g, -.18, deckY, .07, radius * .97, .08, radius * .75, steel);
  rail(g, -radius * .60, radius * .43, radius * .31, radius * .43, deckY);
  for (const xx of [-radius * .50, radius * .30]) rail(g, xx, -radius * .32, xx, radius * .43, deckY);
  for (const xx of [-radius * .36, radius * .12]) {
    cyl(g, xx, deckY + .16, -.14, .12, .33, steel);
    flange(g, xx, deckY + .31, -.14, .16, 'y', steel, 6);
  }
  const ladderZ = radius + .085;
  const ladderX = -radius * .44;
  for (const side of [-1, 1]) segment(g, v(ladderX + side * .18, .34, ladderZ), v(ladderX + side * .18, deckY + .65, ladderZ), .024, steel);
  const rungs = [];
  for (let y = .48; y < deckY + .09; y += .224) rungs.push([ladderX, y, ladderZ, .36, .036, .044]);
  boxes(g, gold, rungs);
  if (radius > 2) {
    for (let y = 1.19; y < rimY; y += .61) {
      const hoop = mesh(g, new T.TorusGeometry(.34, .019, 5, 12, Math.PI), gold, ladderX, y, ladderZ + .035);
      hoop.rotation.x = Math.PI / 2;
    }
    for (const dx of [-.31, 0, .31]) segment(g, v(ladderX + dx, 1.14, ladderZ + (dx ? .17 : .38)), v(ladderX + dx, rimY, ladderZ + (dx ? .17 : .38)), .016, gold);
    box(g, ladderX, deckY, (ladderZ + radius * .42) / 2, .61, .071, ladderZ - radius * .42, trim);
  }
  return { deckY };
}

export function horizontalVessel(g, x, y, z, radius, length, accent, tag) {
  cyl(g, x, y, z, radius, length, ice, 'x');
  for (const side of [-1, 1]) {
    sphere(g, x + side * length / 2, y, z, radius * .49, radius, radius, ice);
    cyl(g, x + side * (length / 2 - .038), y, z, radius + .013, .055, steel, 'x');
    const saddleX = x + side * length * .31;
    cyl(g, saddleX, y, z, radius + .029, .13, cladding, 'x');
    const clearance = Math.max(.18, y - radius - .12);
    box(g, saddleX, .16 + clearance / 2, z, .33, clearance, radius * 1.63, trim);
    box(g, saddleX, .17, z, .57, .079, radius * 1.81, steel);
    for (const dz of [-.63, .63]) cyl(g, saddleX, .237, z + dz * radius, .038, .064, trim, 'y', true);
  }
  cyl(g, x - length * .18, y, z, radius + .02, .11, accent, 'x');
  const neck = x + length / 2 + radius * .43;
  nozzle(g, neck, y, z, radius * .28, radius * .25, 'x');
  if (tag) {
    nameplate(g, tag, x + length * .09, y + radius * .18, z + radius + .008, Math.min(1.39, length * .62), .205, '#a5d9f6');
    nozzle(g, x + length * .21, y + radius + .12, z, radius * .16, .25, 'y');
    instrument(g, x + length * .21, y + radius + .40, z, 1.03);
  }
}

export function compressor(g, x, z) {
  return industrialCompressor(g, x, z);
}

export function lngPump(g, x, z) {
  return industrialLNGPump(g, x, z);
}

export function vaporizer(g, x, z) {
  return industrialVaporizer(g, x, z);
}

function brazedCore(g, x, y, z, width, height, depth) {
  bevelBox(g, x, y, z, width, height, depth, .045, fins);
  const partingSheets = [];
  for (let h = -height / 2 + .085; h < height / 2; h += .112) {
    partingSheets.push([x, y + h, z + depth / 2 + .014, width + .022, .034, .032]);
  }
  boxes(g, steel, partingSheets);
  for (const sign of [-1, 1]) {
    box(g, x, y + sign * height / 2, z, width + .09, .075, depth + .086, cladding);
    box(g, x + sign * width / 2, y, z + depth / 2 + .015, .064, height, .064, cladding);
  }
  cyl(g, x, y + height / 2 + .10, z, .14, depth * .81, steel, 'z');
}

export function coldBox(g, x, z) {
  return createAdvancedColdBox(g, x, z);
}

export function exchanger(g) {
  const k = group(g);
  skid(k, 0, 0, 7.80, 4.56);
  for (const x of [-2.80, 2.80]) for (const z of [-1.36, 1.36]) {
    box(k, x, .62, z, .62, .32, .61, trim);
    box(k, x, .77, z, .76, .075, .72, steel);
  }
  box(k, 0, .86, 0, 7.04, .20, 3.92, trim);
  const casing = group(k), core = group(k), stack = [];
  bevelBox(casing, 0, 1.96, 0, 6.85, 2.04, 3.51, .077, paintedSteel);
  box(casing, 0, 3.014, 0, 6.99, .123, 3.63, cladding);
  const roofRibs = [];
  for (let i = 0; i < 12; i++) roofRibs.push([(i - 5.5) * .56, 3.104, 0, .067, .091, 3.49]);
  boxes(casing, steel, roofRibs);
  for (const z of [-1.767, 1.767]) {
    for (let i = 0; i < 6; i++) box(casing, (i - 2.5) * 1.115, 1.95, z, 1.052, 1.82, .046, cladding);
    for (const y of [1.03, 2.87]) box(casing, 0, y, z + .03 * Math.sign(z), 6.81, .105, .077, steel);
  }
  bevelBox(casing, -.86, 1.63, 1.808, 1.06, 1.30, .065, .025, paintedSteel);
  for (const y of [1.30, 1.92]) box(casing, -.47, y, 1.851, .087, .133, .057, trim);
  nameplate(casing, 'E-101 / CRYOGENIC PRECOOLER', .94, 2.37, 1.804, 2.26, .27, '#a1e4db');

  for (let index = 0; index < layout.layers; index++) {
    const base = layerY(index);
    const layer = group(core, 0, base, 0), channel = group(layer), flow = group(channel);
    const fluid = fluidAt(index);
    const passageFinish = fluid === 'h2' ? finBlue : finMint;
    const { portZ } = riserSpan(fluid);
    bevelBox(layer, 0, .014, 0, 6.47, .087, 3.03, .021, steel);
    for (const edge of [-1, 1]) box(layer, 0, .14, edge * 1.46, 6.41, .193, .106, cladding);
    boxes(layer, fins, lanePositions.map(z => [0,.131,z+.049,4.93,.135,.027]));
    boxes(channel, passageFinish, lanePositions.map(z => [0,.075,z,4.93,.027,.064]));
    for (const side of [-1, 1]) {
      const x = side * layout.headerX;
      box(layer, x, .079, 0, .44, .056, 2.79, cladding);
      box(layer, x + side * .22, .144, 0, .046, .16, 2.79, steel);
      box(channel, x, .112, 0, .36, .023, 2.70, passageFinish);
      box(layer, side * (layout.headerX + layout.riserX) / 2, layout.flowY, portZ,
        layout.riserX - layout.headerX, .098, .19, steel);
    }
    stack.push({ layer, channel, base, fluid, flow, animate: addPrecoolerPassages(flow, fluid) });
  }
  const headers = group(k);
  for (const side of [-1, 1]) {
    const x = side * 3.44;
    for (const fluid of ['h2', 'lng']) {
      const { portZ, top, bottom } = riserSpan(fluid);
      bevelBox(headers, side * layout.riserX, (top + bottom) / 2, portZ,
        .20, top - bottom + .14, .27, .018, steel);
    }
    bevelBox(headers, x, 1.93, 0, .25, 2.00, 3.58, .035, cladding);
    for (const z of [-1.02, 1.02]) {
      sphere(headers, x + side * .025, 1.58, z, .36, .52, .51, steel);
      cyl(headers, x + side * .255, 1.38, z, .28, .36, steel, 'x');
      flange(headers, side * 3.86, 1.38, z, .41, 'x', steel, 10);
    }
  }
  return { casing, core, stack, headers };
}

export function loadingArm(g, points) {
  box(g, 0, .15, 0, 1.10, .29, 1.08, trim);
  cyl(g, 0, .34, 0, .31, .37, steel);
  flange(g, 0, .45, 0, .35, 'y', steel, 10);
  for (let index = 1; index < points.length; index++) {
    segment(g, points[index - 1], points[index], .091, steel);
  }
  for (const p of points.slice(1, -1)) {
    cyl(g, p.x, p.y, p.z, .193, .26, gold, 'x');
    flange(g, p.x + .132, p.y, p.z, .144, 'x', steel, 6);
  }
  const p = points[1], crown = points[2];
  segment(g, v(.27, 1.67, 0), v(.27, crown.y - .36, crown.z - .12), .055, steel);
  segment(g, v(.27, p.y, p.z), v(.27, crown.y, -.64), .071, trim);
  bevelBox(g, .27, crown.y - .03, -.62, .32, .34, .45, .042, trim);
  nozzle(g, 0, points.at(-1).y, points.at(-1).z, .158, .21, 'z', mint);
}
