import {
  bevelBox, box, boxes, cyl, dark, group, material, rail, segment, steel, trim, v,
} from './plant-geometry.js';

const yellow = material(0xd6a653, .05, .81);
const mutedYellow = material(0xa28249, 0, .96);
const offWhite = material(0xb7b7a8, 0, .92);
const channel = material(0x515653, .04, .96);
const concrete = material(0xa9a294, 0, .91);
const serviceMetal = material(0x778786, .24, .71);
const windowGlass = material(0x3e565d, .21, .39);
const ventDark = material(0x596367, .14, .77);
const roofSeam = material(0x728185, .24, .68);
const vehiclePaint = material(0x9aaba5, .12, .58);
const vehicleRubber = material(0x2e3539, 0, .91);
const galvanised = material(0x919e9e, .39, .66);
const paintedStructural = material(0x495d65, .21, .68);

function serviceBuilding(parent, x, z, width, depth) {
  const building = group(parent, x, 0, z);
  const front = depth / 2;
  box(building, 0, .032, 0, width + .34, .11, depth + .44, concrete);
  box(building, 0, .21, front + .011, width - .10, .24, .031, serviceMetal);
  box(building, 0, .88, front + .014, width - .19, .033, .034, trim);
  box(building, 0, .92, -front - .026, width + .12, .085, .09, serviceMetal);
  const bays = Math.ceil(width / .58);
  boxes(building, serviceMetal, Array.from({ length: bays - 1 }, (_, i) =>
    [-width / 2 + (i + 1) * width / bays, .61, front + .017, .024, .49, .033]));
  for (const offset of [-.33, -.12, .09]) {
    const windowX = width * offset;
    box(building, windowX, .63, front + .035, .73, .34, .075, trim);
    box(building, windowX, .64, front + .08, .66, .26, .024, windowGlass);
    box(building, windowX, .64, front + .10, .034, .26, .021, steel);
  }
  const doorX = width * .27;
  const roof = 1.15;
  box(building, doorX, .77, front + .075, .97, .093, .18, serviceMetal);
  bevelBox(building, doorX, .87, front + .27, 1.15, .083, .59, .024, concrete);
  for (const offset of [-.43, .43]) {
    segment(building, v(doorX + offset, .67, front + .03), v(doorX + offset, .84, front + .43), .028, trim);
  }
  box(building, doorX, .039, front + .21, .94, .12, .36, concrete);
  boxes(building, roofSeam, Array.from({ length: bays }, (_, i) =>
    [-width / 2 + (i + .5) * width / bays, roof, -.02, .028, .031, depth + .14]));
  bevelBox(building, -width * .21, roof + .16, -.18, .85, .32, .64, .045, serviceMetal);
  for (let i = 0; i < 5; i++) {
    box(building, -width * .21, roof + .09 + i * .041, .148, .70, .013, .034, ventDark);
  }
  for (const corner of [-1, 1]) {
    const drainX = corner * (width / 2 - .10);
    cyl(building, drainX, .49, front + .066, .035, .95, serviceMetal, 'y', true);
    segment(building, v(drainX, .08, front + .06), v(drainX, .055, front + .22), .031, serviceMetal);
  }
  for (const offset of [-.51, .51]) {
    cyl(building, doorX + offset, .26, front + .43, .039, .52, yellow, 'y', true);
  }
}

function serviceVehicle(parent, x, z) {
  const vehicle = group(parent, x, 0, z);
  bevelBox(vehicle, 0, .26, 0, .70, .29, 1.47, .08, vehiclePaint);
  bevelBox(vehicle, 0, .53, -.24, .64, .34, .70, .06, vehiclePaint);
  const windscreen = box(vehicle, 0, .546, -.602, .50, .18, .028, windowGlass);
  windscreen.rotation.x = -.16;
  box(vehicle, 0, .416, .35, .54, .036, .59, channel);
  for (const side of [-1, 1]) {
    box(vehicle, side * .321, .55, -.30, .021, .15, .43, windowGlass);
    box(vehicle, side * .326, .54, -.27, .023, .18, .025, trim);
    for (const axle of [-.42, .43]) {
      cyl(vehicle, side * .34, .12, axle, .153, .115, vehicleRubber, 'x', true);
      cyl(vehicle, side * .407, .12, axle, .083, .027, serviceMetal, 'x', true);
    }
    box(vehicle, side * .21, .264, -.735, .112, .055, .026, offWhite);
  }
  box(vehicle, 0, .168, -.748, .63, .076, .063, trim);
  box(vehicle, 0, .163, .75, .65, .067, .055, trim);
}

export function detailServiceYard(shore) {
  for (const [x, z, width, depth] of [[-14.7, -28.5, 5.7, 3.1], [15.6, -27.5, 8.6, 4.1]]) {
    serviceBuilding(shore, x, z, width, depth);
  }
  const parking = [];
  for (let i = 0; i <= 5; i++) parking.push([4.45 + i * 1.53, -.028, -16.50, .045, .012, 2.41]);
  parking.push([8.28, -.028, -17.68, 7.68, .012, .044]);
  boxes(shore, offWhite, parking);
  for (const x of [5.20, 6.73, 8.26, 9.79, 11.32]) {
    box(shore, x, .012, -17.45, .75, .07, .11, concrete);
  }
  serviceVehicle(shore, 5.20, -16.53);
  serviceVehicle(shore, 9.79, -16.53);
  boxes(shore, offWhite, Array.from({ length: 7 }, (_, i) =>
    [-4.91, -.007, -11.67 - i * .30, 2.38, .014, .124]));
  for (const z of [-12.38, -15.92, -20.28, -24.40, -29.61, -33.76]) {
    box(shore, -7.48, -.021, z, .17, .019, .66, channel);
    for (let i = 0; i < 5; i++) box(shore, -7.48, -.009, z + (i - 2) * .105, .14, .013, .022, serviceMetal);
  }
  rail(shore, -19.0, -25.55, -10.1, -25.55, -.038);
  rail(shore, 11.10, -24.84, 19.83, -24.84, -.038);
  for (const [x, z] of [[-18.3, -16.5], [-15.8, -16.6], [15.2, -16.6], [17.16, -16.48]]) {
    box(shore, x, .078, z, 1.46, .21, 1.1, concrete);
    bevelBox(shore, x, .54, z, 1.25, .75, .90, .036, serviceMetal);
    box(shore, x, .86, z, 1.30, .075, .94, trim);
    box(shore, x, .60, z + .46, .42, .35, .035, trim);
    box(shore, x - .11, .65, z + .484, .115, .053, .022, yellow);
  }
}

export function detailProcessYard(plant) {
  // Use broad, quiet pavement lines so the flow overlays retain their visual priority.
  const footway = [-17.32, -14.12, -9.56, -6.55, -3.33, .20, 3.67, 6.75];
  for (const z of [7.68, 8.46]) box(plant, -5.285, -.033, z, 24.07, .012, .042, mutedYellow);
  boxes(plant, offWhite, footway.map(x => [x, -.034, 8.07, .29, .011, .09]));
  for (const [x, z] of [[-19.3, 8.88], [-12.8, 8.88], [-6.6, 8.88], [1.9, 8.88], [8.6, 8.88]]) {
    box(plant, x, -.035, z, .56, .013, .25, channel);
    for (let i = 0; i < 6; i++) box(plant, x + (i - 2.5) * .079, -.025, z, .024, .010, .217, serviceMetal);
  }
  const supports = [-6.7, -3.1, .6, 4.3, 7.3, 13.2];
  for (const x of supports) {
    for (const z of [-3.45, 3.65]) {
      box(plant, x, .175, z, .25, .052, .29, galvanised);
      for (const bolt of [-.094, .094]) {
        cyl(plant, x + bolt, .215, z + .089, .026, .045, trim, 'y', true);
      }
      box(plant, x, .755, z, .17, .070, .19, paintedStructural);
      box(plant, x, .898, z, .23, .078, .24, galvanised);
    }
    for (const side of [-1, 1]) {
      const z = side < 0 ? -3.45 : 3.65;
      segment(plant, v(x, .56, z), v(x, .885, z - side * .49), .036, paintedStructural);
      box(plant, x, .975, z - side * .34, .23, .064, .14, galvanised);
    }
  }
  const cabinets = [[-18.8, -7.87], [-6.6, -7.74], [2.4, -7.53], [6.16, 7.45], [18.58, -8.14]];
  for (const [x, z] of cabinets) {
    box(plant, x, .012, z, .83, .112, .68, concrete);
    bevelBox(plant, x, .39, z, .64, .68, .44, .025, serviceMetal);
    box(plant, x, .49, z + .225, .23, .112, .026, trim);
    box(plant, x + .087, .37, z + .229, .026, .12, .022, dark);
    box(plant, x, .72, z, .67, .06, .48, trim);
  }
}
