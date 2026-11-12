import * as T from 'three';
import {
  box, coldBox, compressor, cyl, exchanger, group, horizontalVessel, material,
  mesh, pad, rail, route, segment, shadow, sphere, v, vaporizer,
} from './plant.js';

const LNG = 0x67f1c7;
const H2 = 0x75ceff;
const GAS = 0xf4bb74;
const mint = material(0x3fa98d, .36, .43);
const blue = material(0x448fbe, .42, .43);
const amber = material(0xb78b50, .43, .47);
const steel = material(0x91a3b1, .30, .43);
const ice = material(0xd3e0e5, .24, .39);
const dark = material(0x344753, .29, .56);
const hullBlue = material(0x1d405b, .27, .45);
const hullRed = material(0x91423f, .24, .55);
const concrete = material(0x929b98, .04, .86);
const asphalt = material(0x3c505b, .03, .88);
const paint = material(0xe5ddc3, .06, .70);
const glass = material(0x173646, .35, .35);
const deckGreen = material(0x4b7b71, .23, .68);

function berth(parent, x, z, width, depth) {
  box(parent, x, -.24, z, width, .48, depth, concrete);
  for (let xx = x - width / 2 + .6; xx < x + width / 2; xx += 2.25) {
    for (const side of [-1, 1]) {
      const zz = z + side * (depth / 2 - .3);
      cyl(parent, xx, -.84, zz, .15, 1.44, steel, 'y', true);
    }
    box(parent, xx, -.17, z + depth / 2, .32, .40, .22, dark);
    cyl(parent, xx, .16, z + depth / 2 - .39, .09, .29, amber, 'y', true);
  }
}

function foundation(scene, egypt) {
  const site = group(scene);
  const sand = material(egypt ? 0xa89578 : 0xb6a788, .04, .93);
  const rock = material(egypt ? 0x8e7a64 : 0x9e907a, .05, .93);
  box(site, 0, -.76, -3.25, 47.8, 1.38, 21.1, rock).renderOrder = 6;
  box(site, 0, -.145, -3.25, 47.9, .29, 21.2, sand).renderOrder = 5;
  box(site, 0, -.10, 7.24, 48, .26, .65, concrete).renderOrder = 4;
  box(site, 0, .018, -9.63, 46.4, .036, 2.46, asphalt).renderOrder = 3;
  for (let x = -21.5; x <= 22; x += 1.45) {
    box(site, x, .045, -9.63, .66, .017, .041, paint);
    box(site, x, -.33, 7.58, .25, .27, .22, dark);
  }
  for (const x of [-22, -1.2, 21.8]) {
    cyl(site, x, 1.28, -8.1, .04, 2.56, dark, 'y', true);
    box(site, x, 2.53, -8.1, .54, .10, .18, paint);
  }
  if (egypt) {
    for (const [x, y, w, d] of [[-19,2.1,10,3.5],[-14,3.5,12,4],[-8,2.55,9,4],[-3.2,1.75,8,3.1]]) {
      const hill = mesh(site, new T.ConeGeometry(1, 1, 5), rock, x, y / 2 - .34, -11.9);
      hill.scale.set(w / 2, y, d / 2);
      hill.rotation.y = x * .41;
    }
    berth(site, -12.4, 8.45, 22.1, 1.95);
  } else {
    berth(site, -16, 9.6, 3.1, 4.9);
    berth(site, -16, 12.25, 10.6, 1.65);
  }
  pad(site, 11.9, -1.65, 22.6, 14.1);
  return site;
}

function loadingArm(parent, x, z, direction, deckY) {
  box(parent, x, .23, z, .57, .46, .57, dark);
  const points = [v(x,.42,z), v(x,2.66,z), v(x,3.12,z+direction*.62),
    v(x,2.54,z+direction*1.55), v(x,deckY,z+direction*2.14)];
  for (let i = 1; i < points.length; i++) segment(parent, points[i - 1], points[i], .075, amber);
  for (const p of points.slice(1, -1)) sphere(parent, p.x,p.y,p.z,.12,.12,.12,steel);
}

function floatingUnit(site) {
  const ship = group(site, -12.2, -.39, 11.7);
  const hull = new T.Shape();
  hull.moveTo(-9.5, -1.98);
  hull.lineTo(6.6, -1.98);
  hull.quadraticCurveTo(9.1, -1.56, 10.1, 0);
  hull.quadraticCurveTo(9.1, 1.56, 6.6, 1.98);
  hull.lineTo(-9.5, 1.98);
  hull.quadraticCurveTo(-10.5, 1.58, -10.5, 0);
  hull.quadraticCurveTo(-10.5, -1.58, -9.5, -1.98);
  for (const [y, depth, mat] of [[-.54,.42,hullRed],[-.12,.9,hullBlue]]) {
    const side = mesh(ship, new T.ExtrudeGeometry(hull, {
      depth, bevelEnabled: false, curveSegments: 12,
    }), mat, 0, y, 0);
    side.rotation.x = -Math.PI / 2;
  }
  const deck = mesh(ship, new T.ShapeGeometry(hull, 16), deckGreen, 0, .788, 0);
  deck.rotation.x = -Math.PI / 2;
  for (const z of [-1.83, 1.83]) rail(ship, -9.6, z, 7.4, z, .79);
  for (const x of [-5.4, -2.3, .8, 3.9]) {
    box(ship, x, .94, .24, 2.6, .29, 2.68, dark);
    box(ship, x, 1.12, .24, 2.48, .11, 2.57, ice);
    box(ship, x, 1.20, .24, .69, .12, 1.22, steel);
    cyl(ship, x+.49, 1.26, .24, .13, .22, amber, 'y', true);
  }
  for (const [y, w, d] of [[1.24,2.35,3.25],[1.86,2.2,3.10],[2.46,1.96,3.15],[2.90,1.78,3.30]]) {
    box(ship, -8.04, y, 0, w, .54, d, ice);
    box(ship, -8.04+w*.5+.006, y+.06, 0, .04, .15, d*.79, glass);
    box(ship, -8.04, y+.04, d*.5+.008, w*.78, .15, .035, glass);
  }
  box(ship, -8.7, 3.43, -.65, .65, .85, .70, hullBlue);
  cyl(ship, -8.0, 3.68, .26, .045, 1.12, steel, 'y', true);
  box(ship, -8.0, 4.12, .26, .08, .065, .88, ice);
  for (const x of [6.3, 7.75]) {
    box(ship, x, .99, -.21, 1.26, .32, 2.24, dark);
    for (const z of [-.84,-.42,0,.42]) cyl(ship, x, 1.42, z, .13, .82, ice, 'y', true);
    cyl(ship, x, 1.87, -.22, .13, 1.68, amber, 'z', true);
  }
  for (const z of [-1.49, 1.49]) {
    box(ship, -.31, .96, z, 12.5, .085, .08, paint);
    for (const x of [-6.15, .25, 6.3]) cyl(ship, x, 1.14, z, .11, .31, amber, 'y', true);
  }
  for (const x of [-20.6, -5.3]) {
    segment(site, v(x,.51,9.93), v(x-.55,.16,9.05), .023, steel);
  }
  loadingArm(site, -5.05, 8.65, 1, .86);
}

function storageTank(site, x, z, serial) {
  cyl(site, x, .15, z, 2.19, .30, dark);
  cyl(site, x, 1.50, z, 2.04, 2.46, ice);
  sphere(site, x, 2.73, z, 2.04, .46, 2.04, ice);
  for (const y of [.39, 2.40, 2.72]) cyl(site, x, y, z, 2.07, .067, steel);
  cyl(site, x, 2.53, z, 2.075, .14, mint);
  cyl(site, x, 3.19, z, .49, .18, dark);
  cyl(site, x, 3.41, z, .14, .40, steel);
  for (const dx of [-.14,.14]) segment(site, v(x+dx,.29,z+2.10), v(x+dx,2.9,z+2.10), .026, amber);
  for (let y=.49; y<2.8; y+=.29) box(site, x,y,z+2.11,.28,.028,.03,amber);
  const branch = serial < 4 ? -1 : 1;
  cyl(site, x+branch*1.58,.53,z+.87,.16,1.2,mint,'x',true);
}

function liquefier(site) {
  const hx = group(site, 6.35, 0, 1.95);
  const exchange = exchanger(hx);
  exchange.core.visible = false;
  hx.scale.setScalar(.72);
  coldBox(site, 13.5, -1.7);
  const compression = group(site, 3.63, 0, -5.85);
  compressor(compression, 0, 0, .63, blue);
  compression.scale.setScalar(.79);
  pad(site, 19.65, -1.7, 4.55, 3.55);
  horizontalVessel(site, 19.6, 1.11, -1.7, .87, 2.56, blue);
  cyl(site, 20.15, 2.03, -1.7, .14, .45, steel, 'y', true);
  box(site, 17.9, .40, 2.8, 5.15, .73, 2.11, dark);
  box(site, 17.9, .80, 2.8, 5.34, .09, 2.26, steel);
  for (const x of [16.1,17.4,18.7,19.8]) {
    box(site, x,.46,3.87,.69,.42,.046,ice);
    box(site, x,.87,2.95,.61,.055,.57,blue);
  }
}

export function createSiteLayout(scene, country, useShadows) {
  const egypt = country === 'egypt';
  const site = foundation(scene, egypt);
  liquefier(site);
  if (!useShadows) {
    const ripple = material(0x2e5770, .03, .9);
    for (let i=0; i<34; i++) {
      const x = ((i * 29) % 61) - 29;
      const z = 8.2 + ((i * 31) % 67) * .37;
      box(site, x, -1.025, z, .3 + (i % 7) * .31, .008, .036, ripple).renderOrder = 20;
    }
  }
  if (egypt) {
    floatingUnit(site);
    pad(site, -17.5, 4.21, 5.2, 2.0);
    for (const x of [-19,-16.8]) {
      cyl(site,x,.55,4.24,.19,.67,steel,'x',true);
      cyl(site,x,.55,4.24,.24,.10,amber,'x',true);
      box(site,x,.27,4.24,.14,.29,.44,dark);
    }
    box(site,-17.88,.75,3.46,1.51,1.18,.44,dark);
    box(site,-17.88,.94,3.69,.75,.33,.04,steel);
  } else {
    pad(site, -11.35, -3.32, 21.1, 11.95);
    let serial = 0;
    for (const z of [-6.3, -.73]) for (const x of [-19.05, -13.94, -8.83, -3.72]) {
      storageTank(site, x, z, serial++);
    }
    const regas = group(site,-8.3,0,4.55);
    vaporizer(regas,0,0);
    regas.scale.setScalar(.78);
    loadingArm(site,-18.05,12.22,1,.82);
    loadingArm(site,-14.9,12.22,1,.82);
  }
  if (useShadows) {
    for (const [x,z,w,d] of [[6,2,6,4],[13.7,-1.6,8,5],[19.5,-1.7,5,4]]) shadow(site,x,z,w,d);
  }

  const links = [];
  const pipe = (points, color, kind, count, radius = .10) => {
    const mat = kind === 'h2' ? blue : kind === 'gas' ? amber : mint;
    const link = route(site, points, mat, color, count, radius, .91);
    links.push({ ...link, kind });
  };
  if (egypt) {
    pipe([[-15.28,.89,12.9],[-8.60,.89,12.9],[-8.60,.89,11.9],[-7.46,.76,11.9],[-6.92,.76,11.2]], LNG, 'lng', 9, .075);
    pipe([[-7.4,.79,11.7],[-5.05,.86,10.79],[-5.05,2.54,10.20],[-5.05,3.12,9.27],[-5.05,2.66,8.65],[-5.05,.55,8.65],[-5.05,.55,6.35],[-12.5,.55,6.35],[-12.5,.55,4.24],[-23.15,.55,4.24]], GAS, 'gas', 21);
    pipe([[-7.46,.76,11.9],[-4.3,.84,10.67],[-3.25,1.36,8.9],[-3.25,1.36,6.08],[10.24,1.36,6.08],[10.24,1.00,2.69],[9.14,1.00,2.69]], LNG, 'cold', 16, 0);
    pipe([[3.57,1.00,2.69],[2.52,.84,2.69],[2.52,.84,4.76],[-2.37,.84,4.76],[-2.37,.84,9.01],[-4.50,.84,10.92],[-6.18,.79,11.52]], LNG, 'return', 15, 0);
  } else {
    pipe([[-16,.61,12.21],[-16,.61,4.9],[-17.84,.61,4.9],[-17.84,.61,1.15],[-16.7,.61,1.15],[-3.72,.61,1.15],[-3.72,.61,3.57],[-5.77,.61,3.57]], LNG, 'lng', 23);
    pipe([[-9.99,.65,4.55],[-12.35,.65,4.55],[-12.35,.65,5.55],[-22.95,.65,5.55]], GAS, 'gas', 12);
    pipe([[-3.72,.66,1.15],[-1.23,.66,1.15],[-1.23,1.30,6.10],[10.24,1.30,6.10],[10.24,1.0,2.69],[9.14,1.0,2.69]], LNG, 'cold', 11, 0);
    pipe([[3.57,1.0,2.69],[2.33,1.0,2.69],[2.33,1.0,4.92],[-5.76,1.0,4.92]], LNG, 'return', 11, 0);
  }
  // Dashed proposed transfer/return routes remain legible when motion is paused.
  const proposed = material(0x58bca3, .16, .52);
  for (const link of links.filter(link => ['cold', 'return'].includes(link.kind))) {
    const length = link.curve.getLength();
    for (let offset = 0; offset < length - .06; offset += .47) {
      segment(site, link.curve.getPoint(offset / length),
        link.curve.getPoint(Math.min(offset + .27,length) / length), .066, proposed);
    }
  }
  pipe([[5.08,1.06,-5.85],[5.72,1.06,-5.85],[5.72,1.06,-3.73],[2.44,1.06,-3.73],[2.44,1.0,1.22],[3.57,1.0,1.22]], H2, 'h2', 12);
  pipe([[9.14,1.0,1.22],[9.91,1.0,1.22],[9.91,1.22,-1.7],[10.57,1.22,-1.7]], H2, 'h2', 13);
  pipe([[16.48,1.25,-1.7],[18.24,1.15,-1.7]], H2, 'h2', 5);
  for (const [x,z] of [[-.4,1.15],[1.8,2.69],[4.4,-.4],[8.9,-.4],[-2.6,4.92]]) {
    cyl(site,x,.34,z,.055,.68,steel,'y',true);
    box(site,x,.70,z,.35,.08,.13,steel);
  }

  return {
    site, links,
    anchors: {
      source: egypt ? [-13.55,3.05,11.7] : [-11.4,4.1,-3.45],
      precool: [6.35,2.8,1.95],
      hydrogen: [16.2,3.90,-1.7],
      gas: egypt ? [-16.3,1.35,4.24] : [-11.3,2.5,5.55],
    },
    views: {
      overview: { look: [0,.15,1.4], size: 52, offset: [23,29,51] },
      source: egypt ? { look: [-11.5,1,9.9], size: 25, offset: [9,15,35] } :
        { look: [-11.4,1,-2.55], size: 26, offset: [12,17,31] },
      precool: { look: egypt ? [1.5,.4,6.15] : [1.4,.65,2.85], size: 22, offset: [14,16,27] },
      hydrogen: { look: [12.9,.8,-1.25], size: 23, offset: [13,17,27] },
    },
  };
}
