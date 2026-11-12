import * as T from 'three';
import {
  BLUE, bevelBox, box, boxes, cyl, dark, flange, group, ice, material,
  mesh, nameplate, pad, pipePath, pipeTube, segment, sphere, steel, trim, v,
} from './plant-geometry.js';

/**
 * R-101 Stage 1: inspectable, conceptual closed-helium reverse-Brayton cold end.
 * Geometry is not an equipment sizing, mechanical design or verified cycle model.
 * Compressor/reject heat equipment is outside the cold box and is not depicted.
 * Aluminium plate-fin cores use separate H2 and helium passages.
 */
export const R101_REFERENCE = Object.freeze({
  status: 'CONCEPTUAL / NOT TO SCALE',
  refrigerant: 'Helium (illustrative reverse-Brayton arrangement)',
  hydrogen: 'Preconditioned H2 -> three staged exchangers -> LH2 train',
  equipment: ['HX-201', 'HX-202', 'HX-203', 'EX-201', 'EX-202', 'OP-201'],
  notes: [
    'Expander branches are schematic, not a thermodynamically optimized cycle.',
    'Ortho-para heat release and conversion kinetics are not simulated.',
    'External compression, heat rejection and final phase separation are outside this housing.',
    'Piping is hidden in exploded mode to avoid falsely showing broken connections.',
  ],
});

const h2Metal = material(0x7bacc5, .72, .34);
const heMetal = material(0x7c8fae, .73, .35);
const heAccent = material(0xa990ed, .36, .37);
const h2Accent = material(0x45c5fd, .31, .35);
const shellPaint = material(0x9eafb9, .56, .43);
const coreRib = material(0x758b9d, .78, .35);
const stiffener = material(0xc0cbd0, .78, .30);
const catalyst = material(0xc6a064, .46, .44);
const frameMetal = material(0x4f6576, .61, .41);
const ghost = new T.MeshBasicMaterial({
  color: 0xd4eaf6, transparent: true, opacity: .34, depthWrite: false,
});
const H2_COLOR = BLUE;
const HE_COLOR = 0xc39aff;
const yAxis = v(0, 1, 0);

const toVectors = (points) => points.map((p) => v(...p));
const debugRoutes = [];
const jitter = (i, count) => i / count;

function animatedPipe(parent, name, points, radius, fluid, direction = 1) {
  const holder = group(parent);
  holder.name = name;
  const coords = toVectors(points);
  const curve = pipePath(coords, radius * 2.4);
  pipeTube(holder, curve, radius, fluid === 'h2' ? h2Metal : heMetal);
  const count = Math.max(9, Math.ceil(curve.getLength() * 3.0));
  const glow = new T.MeshBasicMaterial({
    color: fluid === 'h2' ? H2_COLOR : HE_COLOR,
    depthTest: false, depthWrite: false, transparent: true, opacity: .93,
  });
  const dots = new T.InstancedMesh(new T.SphereGeometry(.060, 9, 7), glow, count);
  const arrows = new T.InstancedMesh(new T.ConeGeometry(.085, .20, 9), glow, Math.max(2, Math.floor(count / 6)));
  dots.frustumCulled = arrows.frustumCulled = false;
  dots.renderOrder = arrows.renderOrder = 8;
  holder.add(dots, arrows);
  const pose = new T.Object3D();
  const animate = (phase) => {
    if (!holder.visible) return;
    for (let i = 0; i < dots.count; i++) {
      const t = (direction > 0 ? phase + jitter(i, dots.count) : 1 - phase - jitter(i, dots.count) + 5) % 1;
      curve.getPoint(t, pose.position);
      pose.position.y += radius + .020;
      pose.quaternion.identity();
      pose.scale.setScalar(.83 + .15 * Math.sin(i + phase * 14));
      pose.updateMatrix();
      dots.setMatrixAt(i, pose.matrix);
    }
    dots.instanceMatrix.needsUpdate = true;
    pose.scale.setScalar(1);
    for (let i = 0; i < arrows.count; i++) {
      const t = (direction > 0 ? phase + jitter(i + .5, arrows.count) : 1 - phase - jitter(i + .5, arrows.count) + 5) % 1;
      curve.getPoint(t, pose.position);
      pose.position.y += radius + .025;
      curve.getTangent(t, pose.scale.set(0, 0, 0)); // scratch vector only
      const tangent = curve.getTangent(t).normalize();
      if (direction < 0) tangent.negate();
      pose.quaternion.setFromUnitVectors(yAxis, tangent);
      pose.scale.setScalar(.85);
      pose.updateMatrix();
      arrows.setMatrixAt(i, pose.matrix);
    }
    arrows.instanceMatrix.needsUpdate = true;
  };
  animate(0);
  debugRoutes.push({ name, fluid, points: coords.map(p => p.toArray()) });
  return { holder, dots, arrows, animate, fluid, setRunning(active) {
    dots.visible = arrows.visible = active;
  } };
}

function exchanger(parent, x, code, serial) {
  const root = group(parent);
  root.name = code;
  root.userData.assembly = code;
  const z = -.32;
  const w = 1.18, d = 1.20, base = .90, top = 2.70;
  // Aluminium brazed-plate core; horizontal H2 and helium passages lie on
  // different depth planes and do not interconnect.
  bevelBox(root, x, (base + top) * .5, z, w, top - base, d, .035, coreRib);
  for (const level of [base + .09, top - .09]) {
    box(root, x, level, z, w + .11, .11, d + .13, stiffener);
  }
  for (const side of [-1, 1]) {
    box(root, x + side * .55, 1.79, z, .062, 1.61, d + .11, shellPaint);
    for (const face of [-1, 1]) {
      box(root, x + side * .58, 1.75, z + face * .57, .095, 1.68, .075, steel);
    }
  }
  const fins = [];
  for (let i = 0; i < 24; i++) {
    const yy = 1.03 + i * .068;
    fins.push([x, yy, z + .625, 1.08, .024, .032]);
    fins.push([x, yy, z - .625, 1.08, .024, .032]);
  }
  boxes(root, stiffener, fins);
  // Dedicated colored passage witness strips on the inspectable front plane.
  for (const [zz,mat,yy] of [[-.60,h2Accent,1.93],[.19,heAccent,1.64]]) {
    box(root, x, yy, zz, 1.08, .055, .056, mat);
  }
  for (const side of [-1,1]) {
    for (const zz of [-.60,.19]) {
      cyl(root, x + side * .626, 1.80, zz, .089, .18, steel, 'x');
      cyl(root, x + side * .674, 1.80, zz, .055, .082,
        zz < 0 ? h2Accent : heAccent, 'x', true);
    }
  }
  for (const xx of [-.45,.45]) {
    box(root, x + xx, .70, z, .15, .42, 1.06, frameMetal);
    box(root, x + xx, .51, z, .30, .10, 1.12, stiffener);
  }
  nameplate(root, code + ' / STAGE ' + serial, x, 2.51, z + .68, 1.05, .19, '#b9e9fc');
  return root;
}

function expander(parent, x, name) {
  const root = group(parent);
  root.name = name;
  root.userData.assembly = name;
  const cy = 1.10, z = 1.02;
  // Bolted compact turbine casing, split volute and accessible rotor.
  box(root, x, .57, z, .88, .18, .78, frameMetal);
  for (const s of [-1, 1]) box(root, x + s * .35, .76, z, .10, .28, .69, stiffener);
  cyl(root, x, cy, z, .355, .83, shellPaint, 'x');
  cyl(root, x + .435, cy, z, .315, .12, heMetal, 'x');
  cyl(root, x - .435, cy, z, .30, .12, heMetal, 'x');
  flange(root, x - .48, cy, z, .30, 'x', steel, 8);
  flange(root, x + .48, cy, z, .30, 'x', steel, 8);
  sphere(root, x, cy + .01, z, .27, .28, .31, coreRib);
  const rotor = group(root, x + .52, cy, z);
  cyl(rotor, 0, 0, 0, .095, .10, stiffener, 'x');
  for (let i=0;i<10;i++) {
    const a = i * Math.PI * 2 / 10;
    const blade = box(rotor, .057, Math.cos(a) * .20, Math.sin(a) * .20,
      .045, .18, .065, heAccent);
    blade.rotation.x = -a;
  }
  nameplate(root, name, x, .69, z + .48, .73, .18, '#d6c7ff');
  return { root, rotor };
}

function catalystBed(parent) {
  const root = group(parent);
  root.name = 'OP-201';
  root.userData.assembly = 'OP-201';
  const x = .98, y = .94, z = 1.02;
  for(const xx of [x-.37,x+.37]) {
    box(root, xx, .61, z, .095, .27, .46, frameMetal);
    box(root, xx, .47, z, .24, .07, .58, stiffener);
  }
  cyl(root, x, y, z, .23, .89, catalyst, 'x');
  for(const side of [-1,1]) {
    cyl(root, x + side * .42, y, z, .27, .09, steel, 'x');
    flange(root, x + side * .47, y, z, .29, 'x', steel, 8);
  }
  const ring = new T.TorusGeometry(.237, .017, 8, 32);
  for(const xx of [x-.22,x,x+.22]) {
    const part=mesh(root,ring,stiffener,xx,y,z);
    part.rotation.y=Math.PI/2;
  }
  nameplate(root,'OP-201 / CATALYST', x, .72, z + .31, 1.11, .20, '#f8d6a0');
  return root;
}

function exterior(parent) {
  const shell = group(parent);
  shell.name='R-101 insulated casing';
  bevelBox(shell, 0, 1.85, 0, 5.92, 2.70, 3.46, .064, shellPaint);
  box(shell,0,3.25,0,6.06,.13,3.60,trim);
  const ribs=[];
  for(let i=0;i<15;i++) ribs.push([-2.74+i*.39,1.83,1.762,.049,2.33,.075]);
  boxes(shell,stiffener,ribs);
  for(const s of [-1,1]) {
    box(shell,s*2.93,1.85,1.74,.13,2.72,.13,steel);
    box(shell,s*2.93,1.85,-1.74,.13,2.72,.13,steel);
    box(shell,s*2.97,.75,0,.11,.38,3.49,trim);
    flange(shell,s*3.11,1.38,0,.285,'x',steel,10);
    cyl(shell,s*3.18,1.38,0,.145,.26,h2Metal,'x');
  }
  // Two dedicated helium ports (supply and return), separate from H2.
  for(const yy of [2.79,2.32]) {
    cyl(shell,-3.09,yy,1.13,.115,.39,heMetal,'x');
    flange(shell,-3.15,yy,1.13,.235,'x',steel,8);
  }
  for(const xx of [-2.1,2.1]){
    box(shell,xx,.58,1.746,.36,.12,.12,trim);
    box(shell,xx,3.26,1.746,.28,.08,.12,stiffener);
  }
  bevelBox(shell,-1.86,1.60,1.79,.94,1.30,.06,.02,coreRib);
  nameplate(shell,'R-101 / CRYOGENIC COLD BOX', .67,2.43,1.785,2.76,.27,'#bbdfff');
  return shell;
}

export function createAdvancedColdBox(parent,x,z) {
  // Everything is placed relative to the R-101 origin. External inlet/outlet
  // nozzle centres remain at plant coordinates +/-3.12, y=1.38, z=0.
  debugRoutes.length = 0;
  const root=group(parent,x,0,z);
  root.name='R-101 / Stage 1 Advanced';
  pad(root,0,0,7.64,5.37);
  box(root,0,.30,0,6.65,.25,4.08,trim);
  for(const s of [-1,1]) {
    box(root,0,.50,s*1.82,6.35,.13,.25,steel);
    for(const xx of [-2.53,0,2.53]){
      box(root,xx,.49,s*1.61,.28,.19,.30,frameMetal);
    }
  }
  const shell=exterior(root);
  const inside=group(root);
  inside.name='Cutaway / inspectable assembly';
  const base=group(inside);
  // Open rear baffle and service frame; front surface is deliberately removed.
  box(base,0,.57,-1.63,5.82,.16,.13,frameMetal);
  box(base,0,3.04,-1.63,5.78,.11,.16,stiffener);
  for(const xx of [-2.73,-1.31,0,1.31,2.73]) {
    box(base,xx,1.80,-1.67,.09,2.43,.12,steel);
  }
  for(const zz of [-1.40,1.47]) {
    box(base,0,.55,zz,5.78,.12,.15,trim);
  }
  for(const xx of [-2.48,-.85,.85,2.48]){
    box(base,xx,.58,1.45,.16,.26,.20,stiffener);
  }
  const modules=[
    {obj:exchanger(inside,-1.80,'HX-201',1),move:[-.24,.66,-.16]},
    {obj:exchanger(inside,0,'HX-202',2),move:[0,.95,-.22]},
    {obj:exchanger(inside,1.80,'HX-203',3),move:[.24,1.19,-.25]},
  ];
  const turbines=[
    { ...expander(inside,-1.82,'EX-201'), move:[-.36,.26,.50] },
    { ...expander(inside,-.60,'EX-202'), move:[-.10,.39,.57] },
  ];
  const bed=catalystBed(inside);
  modules.push({obj:bed,move:[.45,.36,.57]});
  // Only service nozzles are flanged: inboard brazed aluminium connections
  // are shown as continuous welded/connected segments, not random flanges.
  const plumbing=group(inside);plumbing.name='Connected service tubing';
  const H2=group(plumbing);H2.name='Hydrogen circuit';
  const He=group(plumbing);He.name='Helium refrigeration circuit';
  const routes=[];
  routes.push(animatedPipe(H2,'H2 / three HX stages and OP bed',[
    [-3.12,1.38,0],[-2.86,1.38,0],[-2.86,1.38,-.60],
    [-2.50,1.38,-.60],[-2.50,1.80,-.60],[-1.20,1.80,-.60],
    [-1.06,1.80,-.60],[-1.06,2.42,-.60],[-.58,2.42,-.60],
    [-.58,1.80,-.60],[.55,1.80,-.60],
    [.62,1.80,-.60],[.62,1.43,-.60],[.62,1.43,1.02],
    [.62,.94,1.02],[1.38,.94,1.02],[1.42,1.43,1.02],
    [1.42,1.80,1.02],[1.42,1.80,-.60],[2.44,1.80,-.60],
    [2.55,1.80,-.60],[2.55,1.38,-.60],
    [2.86,1.38,-.60],[2.86,1.38,0],[3.12,1.38,0],
  ],.078,'h2'));
  // Closed He refrigeration is a process illustration, not complete cycle
  // closure. Compressor / aftercooler are beyond the cold-box boundary.
  routes.push(animatedPipe(He,'He / high pressure supply header',[
    [-3.12,2.79,1.13],[-2.72,2.79,1.13],[2.60,2.79,1.13],
  ],.068,'he'));
  routes.push(animatedPipe(He,'He / expander branch A',[
    [-1.82,2.79,1.13],[-1.82,1.24,1.13],
  ],.052,'he'));
  routes.push(animatedPipe(He,'He / expander branch B',[
    [-.60,2.79,1.13],[-.60,1.24,1.13],
  ],.052,'he'));
  routes.push(animatedPipe(He,'He / first discharge to cold manifold',[
    [-1.34,1.10,1.13],[-1.34,1.10,1.44],[2.58,1.10,1.44],
  ],.052,'he'));
  routes.push(animatedPipe(He,'He / second discharge to cold manifold',[
    [-.12,1.10,1.13],[-.12,1.10,1.44],[2.58,1.10,1.44],
  ],.052,'he'));
  routes.push(animatedPipe(He,'He / return through HX-203 to HX-201',[
    [2.58,1.10,1.44],[2.58,1.78,1.44],[2.58,1.78,.19],
    [2.44,1.78,.19],[1.16,1.78,.19],
    [.59,1.78,.19],[-.59,1.78,.19],
    [-1.18,1.78,.19],[-2.46,1.78,.19],
    [-2.74,1.78,.19],[-2.74,2.32,.19],
    [-2.74,2.32,1.13],[-3.12,2.32,1.13],
  ],.065,'he'));
  for(const [xx,yy,zz,code,mat] of [
    [-2.66,1.38,0,'H2-IN',h2Accent],
    [2.66,1.38,0,'H2-OUT',h2Accent],
    [-2.90,2.79,1.13,'HE-HIGH',heAccent],
    [-2.90,2.32,1.13,'HE-RETURN',heAccent],
  ]){
    sphere(plumbing,xx,yy,zz,.11,.11,.11,mat);
  }
  const guides=group(inside);guides.visible=false;guides.name='Exploded assembly location witnesses';
  for(const item of [...modules,...turbines.map(t=>({obj:t.root,move:t.move}))]){
    // No physically broken pipes are shown while equipment is displaced.
    const spot=item.obj.getWorldPosition(new T.Vector3());
    const from=v(item.obj.position.x,1.00,item.obj.position.z);
    const to=from.clone().add(v(...item.move));
    segment(guides,from,to,.017,ghost);
    const marker=mesh(guides,new T.SphereGeometry(.038,8,6),ghost,from.x,from.y,from.z);
    marker.renderOrder=3;
  }
  let view='shell',stream='both',running=true;
  function setStream(which) {
    stream=['both','h2','he'].includes(which)?which:'both';
    H2.visible=stream!=='he';
    He.visible=stream!=='h2';
  }
  function setView(which) {
    view=['shell','cutaway','exploded'].includes(which)?which:'shell';
    shell.visible=view==='shell';
    inside.visible=view!=='shell';
    const exploded=view==='exploded';
    plumbing.visible=!exploded;
    guides.visible=exploded;
    for(const {obj,move} of modules) obj.position.set(...(exploded?move:[0,0,0]));
    for(const {root:obj,move} of turbines) obj.position.set(...(exploded?move:[0,0,0]));
    // Individual module groups are recentered in their geometry; only
    // the assembly display offsets change, not the physical design basis.
    setStream(stream);
  }
  function setFlow(active) {
    running=Boolean(active);
    for(const route of routes)route.setRunning(running);
  }
  function animate(phase) {
    if(!inside.visible || view==='exploded' || !running)return;
    for(const route of routes)route.animate(phase);
    for(const {rotor} of turbines)rotor.rotation.x=phase*Math.PI*2*3;
  }
  setView('shell');
  return {
    root,shell,inside,plumbing,paths:{h2:H2,he:He},guides,
    routes, turbines, modules, setView,setStream,setFlow,animate,
    get state(){return {view,stream,running};},
    get routeSummary(){return debugRoutes.map(r=>({name:r.name,fluid:r.fluid,count:r.points.length}));},
  };
}
