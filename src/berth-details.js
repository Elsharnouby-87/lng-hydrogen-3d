import {
  bevelBox, box, boxes, cyl, dark, gold, ice, material, rail, segment, steel, trim, v, white,
} from './plant-geometry.js';

const rubber = material(0x293237, 0, .91);
const castIron = material(0x4a5455, .31, .76);
const safetyPaint = material(0xc99547, .03, .80);
const bronze = material(0x886f53, .33, .66);
const deckPlate = material(0x3c5051, .14, .78);

export function detailCarrier(ship) {
  // The aft accommodation block and the forecastle provide scale around the cargo domes.
  box(ship, -7.13, 1.08, 1.29, 1.72, .075, .28, deckPlate);
  for (const x of [-7.96, -6.28]) {
    cyl(ship, x, 1.21, 1.30, .023, .40, ice, 'y', true);
  }
  segment(ship, v(-7.96, 1.40, 1.30), v(-6.28, 1.40, 1.30), .021, ice);
  for (const z of [-1.11, 1.11]) {
    for (const x of [-4.50, -1.20, 2.10, 5.40]) {
      box(ship, x - .65, .868, z, .29, .045, .19, deckPlate);
      cyl(ship, x - .66, .955, z, .064, .14, steel, 'y', true);
      box(ship, x - .66, 1.038, z, .16, .038, .081, safetyPaint);
    }
    box(ship, 7.46, .82, z * .53, .94, .07, .46, deckPlate);
    box(ship, 7.38, .95, z * .53, .59, .24, .32, castIron);
    cyl(ship, 7.59, 1.07, z * .53, .136, .38, bronze, 'z');
    for (const side of [-1, 1]) {
      cyl(ship, 7.59, 1.07, z * .53 + side * .17, .185, .046, castIron, 'z', true);
    }
    segment(ship, v(7.66, 1.03, z * .53), v(8.59, .826, z * .47), .043, castIron);
    for (let i = 0; i < 5; i++) {
      box(ship, 5.75, -.29 + i * .17, Math.sign(z) * 1.376, .17, .029, .020, white);
    }
  }
  const mast = v(8.57, 1.78, 0);
  segment(ship, v(8.46, .79, 0), mast, .035, ice);
  segment(ship, v(8.55, 1.56, -.25), v(8.55, 1.56, .25), .024, steel);
  cyl(ship, mast.x, mast.y, mast.z, .055, .095, ice, 'y', true);
  for (const x of [-8.25, 6.96]) {
    bevelBox(ship, x, .86, -1.27, .40, .11, .16, .045, castIron);
    for (const offset of [-.115, .115]) cyl(ship, x + offset, .99, -1.27, .047, .17, steel, 'y', true);
  }
}

export function detailBerth(apron) {
  // Align details to the existing concrete face and leave the manifold aisle open.
  for (const x of [3.3, 6.8, 11.2, 15.5, 18.1]) {
    bevelBox(apron, x, -.33, 12.96, .50, .58, .25, .047, rubber);
    box(apron, x, -.32, 13.10, .36, .43, .038, castIron);
    for (const offset of [-.16, .16]) {
      for (const y of [-.46, -.19]) cyl(apron, x + offset, y, 13.126, .031, .020, steel, 'z', true);
    }
    box(apron, x, .081, 12.46, .47, .013, .42, safetyPaint);
    box(apron, x, .081, 12.15, .50, .013, .038, white);
  }
  const grates = [4.62, 7.42, 9.02, 12.03, 16.89, 17.72];
  boxes(apron, deckPlate, grates.map(x => [x, .083, 11.25, .47, .016, .24]));
  boxes(apron, steel, grates.flatMap(x => Array.from({ length: 6 }, (_, i) =>
    [x + (i - 2.5) * .067, .093, 11.25, .019, .010, .21])));
  for (const [start, end] of [[2.24, 3.1], [4.25, 6.28], [7.48, 10.2], [11.95, 13.12], [16.18, 17.47], [18.81, 19.14]]) {
    box(apron, (start + end) / 2, .082, 12.26, end - start, .012, .036, safetyPaint);
  }

  for (const x of [3.95, 18.72]) {
    const z = 12.90;
    for (const offset of [-.14, .14]) cyl(apron, x + offset, -.42, z, .031, 1.66, gold, 'y', true);
    for (let i = 0; i < 7; i++) box(apron, x, .24 - i * .20, z, .28, .031, .035, gold);
  }
  for (const x of [5.5, 10.45, 17.25]) {
    box(apron, x, .101, 11.13, .42, .061, .36, castIron);
    bevelBox(apron, x, .33, 11.13, .34, .42, .28, .028, trim);
    box(apron, x, .42, 11.28, .15, .10, .025, ice);
    box(apron, x, .26, 11.289, .09, .049, .025, gold);
  }
  rail(apron, 2.18, 11.02, 4.35, 11.02, .077);
  rail(apron, 18.42, 11.02, 19.01, 11.02, .077);
  for (const x of [7.80, 12.67, 16.65]) {
    box(apron, x, .135, 11.48, .55, .12, .29, castIron);
    box(apron, x, .209, 11.48, .52, .045, .25, trim);
    for (const offset of [-.15, .15]) box(apron, x + offset, .238, 11.48, .052, .021, .24, steel);
  }
}
