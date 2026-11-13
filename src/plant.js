import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { applySurfaceFinishes, machinedStainless, setDaylightEnvironment } from './plant-finishes.js';
import { softwareRenderer } from './software.js';
import { addHarbor } from './harbor.js';
import { detailBerth, detailCarrier } from './berth-details.js';
import { detailProcessYard } from './yard-details.js';
import { addQuayWeathering } from './quay-weathering.js';
import { addHarborWater, harborSky, reflectionLayer } from './harbor-water.js';
import { createPrecoolerInspection } from './precooler-inspection.js';

import {
  BLUE, MINT, batchStaticMeshes, bevelBox, blue, box, boxes, cyl, dark, flange, gold,
  group, ice, material, mesh, mint, mutedPipe, pad, pipeBlue, pipeMint, pipePath,
  pipeTube, rail, road, seaWall, segment, slab, sphere, steel, trim, v, white,
} from './plant-geometry.js';
import { coldBox, compressor, exchanger, horizontalVessel, lngPump, lh2Tank, loadingArm, tank, vaporizer } from './plant-equipment.js';

function pick(g,id,x,y,z,w,h,d){
  const o=box(g,x,y,z,w,h,d,new T.MeshBasicMaterial({visible:false}));
  o.userData.equipment=id;
  return o;
}
function ship(g){
  const k=group(g,11.3,-.34,14.95);
  const hullPaint = material(0x1c3345, .10, .47);
  const antifouling = material(0x8e3c33, .04, .67);
  const deckPaint = material(0x53635b, .06, .80);
  const bridgeGlass = material(0x284c5b, .26, .25);
  const offWhite = material(0xe0ded0, .05, .52);
  const hull=new T.Shape();
  hull.moveTo(-8.7,-1.37);hull.lineTo(5.9,-1.37);hull.quadraticCurveTo(8.3,-1.17,9.55,0);
  hull.quadraticCurveTo(8.32,1.17,5.9,1.37);hull.lineTo(-8.7,1.37);hull.quadraticCurveTo(-9.3,1.05,-9.32,0);hull.quadraticCurveTo(-9.3,-1.05,-8.7,-1.37);
  const lower=mesh(k,new T.ExtrudeGeometry(hull,{depth:.52,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.065,bevelThickness:.06,curveSegments:18}),antifouling,0,-.81,0);
  lower.rotation.x=-Math.PI/2;
  const h=mesh(k,new T.ExtrudeGeometry(hull,{depth:1.0,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.10,bevelThickness:.11,curveSegments:18}),hullPaint,0,-.34,0);
  h.rotation.x=-Math.PI/2;h.renderOrder=1;h.castShadow=true;
  const deck=mesh(k,new T.ShapeGeometry(hull,18),deckPaint,0,.78,0);deck.rotation.x=-Math.PI/2;deck.renderOrder=1;
  bevelBox(k,-7.12,1.40,0,2.38,1.23,2.36,.07,offWhite);
  bevelBox(k,-7.08,2.15,0,2.48,.28,2.56,.065,offWhite);
  box(k,-5.861,2.12,0,.035,.135,2.14,bridgeGlass);
  for (const z of [-.82,-.55,-.27,0,.27,.55,.82]) box(k,-5.84,2.12,z,.025,.137,.028,offWhite);
  for (const z of [-1.16,1.16]) {
    for (const y of [1.24,1.53]) {
      boxes(k, bridgeGlass, [-7.77,-7.43,-7.09,-6.75,-6.41].map(x => [x,y,z,.17,.115,.034]));
    }
  }
  for(const z of [-1.204,1.204]){
    box(k,-7.16,1.83,z,1.74,.19,.045,trim);
    for(const x of [-7.68,-7.27,-6.86,-6.45])box(k,x,1.83,z,.045,.16,.050,steel);
  }
  bevelBox(k,-8.08,2.49,0,.44,.54,.61,.064,hullPaint);
  box(k,-8.08,2.79,0,.45,.058,.63,trim);
  for (const z of [-.14,.14]) cyl(k,-8.06,2.87,z,.062,.15,dark,'y',true);
  box(k,-7.23,2.34,-.71,.65,.09,.48,deckPaint);
  box(k,-7.92,2.62,0,.40,.065,.49,steel);
  cyl(k,-7.3,2.77,0,.057,1,steel);box(k,-7.28,3.21,0,.74,.06,.09,ice);
  for(const x of [-4.5,-1.2,2.1,5.4]){
    cyl(k,x,.92,0,1.22,.3,trim);sphere(k,x,1.04,0,1.13,1.00,1.13,ice);
    cyl(k,x,1.07,0,1.146,.042,steel);cyl(k,x,2.07,0,.11,.19,trim);
    for(const z of [-.97,.97])box(k,x,.84,z,.53,.068,.29,steel);
    for (const z of [-1.09,1.09]) {
      box(k,x-.12,1.04,z,.50,.068,.20,trim);
      cyl(k,x+.22,1.07,z,.067,.37,machinedStainless,'x',true);
    }
  }
  for(const z of [-1.26,1.26]){
    rail(k,-8,z,6.9,z,.82);
    box(k,-.38,.81,z*.83,14.92,.065,.26,slab).renderOrder=1;
  }
  for(const x of [-8.32,7.13]){
    cyl(k,x,.94,0,.24,.22,steel,'y',true);
    box(k,x,.94,.41,.35,.25,.16,trim);
  }
  box(k,3.09,.99,-1.04,1.18,.31,.31,steel);
  for(const x of [2.75,3.18,3.54])cyl(k,x,1.19,-1.04,.083,.14,mint,'y',true);
  for(const x of [-8.5,7.2])cyl(k,x,.92,0,.13,.3,trim);
  for (const z of [-.67,.67]) {
    cyl(k,7.83,.96,z,.155,.20,machinedStainless,'y',true);
    cyl(k,7.83,1.09,z,.188,.075,trim,'y',true);
    segment(k,v(7.83,.91,z),v(8.84,.72,z*.69),.028,dark);
    cyl(k,-5.40,1.00,z*1.33,.103,.32,offWhite,'x',true);
  }
  for (const z of [-1.10,1.10]) {
    for (const x of [-5.60,-2.42,.86,4.16,6.64]) {
      box(k,x,.845,z,.54,.016,.034,white);
    }
  }
  detailCarrier(k);
  for(const x of [-8.28,7.05]){
    segment(g,v(11.3+x,.62,13.78),v(11.3+x+(x<0?-1.04:1.12),.15,12.37),.023,dark)
      .layers.enable(reflectionLayer);
  }
  return k;
}
function lights(g){
  for(const [x,z] of [[-20,-8],[0,-8],[20,-8],[-20,9],[20,9]]){
    cyl(g,x,1.66,z,.055,3.28,steel,'y',true);
    box(g,x,3.32,z,.58,.10,.19,steel);box(g,x,3.27,z,.39,.045,.12,new T.MeshBasicMaterial({color:0xffe5b1}));
  }
}
function ground(scene, webgl){
  const g=group(scene);
  box(g,0,-.9,0,45,1.34,21.7,seaWall).renderOrder=4;
  box(g,0,-.22,0,45.1,.28,21.76,slab).renderOrder=3;
  box(g,0,-.066,0,43.1,.035,18.7,road).renderOrder=2;
  const joints=[];
  for(let x=-18;x<=18;x+=3.6)joints.push([x,-.046,0,.016,.005,18.43]);
  for(const z of [-6.9,-3.45,0,3.45,6.9])joints.push([0,-.046,z,42.87,.005,.017]);
  boxes(g,seaWall,joints);
  for(const z of [-9.5,9.5]){
    box(g,0,-.028,z,43.5,.018,.048,white);
    for(let i=-20;i<=20;i+=2)box(g,i,-.021,z*.91,.92,.018,.028,slab);
  }
  for(const x of [-21.8,21.8])box(g,x,-.025,0,.047,.026,19,white);
  for(let x=-21.7;x<=21.7;x+=1.4){
    box(g,x,-.17,10.96,.23,.19,.27,steel);
    box(g,x,-.74,10.97,.36,.70,.26,dark);
    box(g,x,-.65,11.13,.42,.45,.095,trim);
  }
  for (let x = -21.6; x <= 21.6; x += 2.4) {
    box(g,x,-.71,10.862,.035,.79,.023,seaWall);
  }
  box(g,0,-.075,10.74,44.7,.18,.27,slab);
  box(g,0,-.97,10.865,44.7,.055,.045,seaWall);
  box(g,10.4,-.13,11.83,16.8,.41,1.88,slab).renderOrder=2;
  for(const x of [3.3,6.8,11.2,15.5,18.1]){
    box(g,x,-.38,12.83,.46,.68,.19,dark);
    cyl(g,x,.14,12.47,.105,.19,trim,'y',true);
    cyl(g,x,.235,12.47,.148,.067,gold,'y',true);
    box(g,x,-.57,12.96,.38,.31,.11,dark);
  }
  for(const x of [5.0,9.4,13.7,17.8]){
    box(g,x,.085,11.87,1.24,.032,.15,white);
    box(g,x,.124,12.22,.26,.13,.23,trim);
  }
  for(const x of [3.2,7,11,15,18]){
    for (const z of [11.28,12.42]) cyl(g,x,-.86,z,.15,1.15,seaWall,'y',true);
    box(g,x,-.395,11.83,.37,.20,1.79,trim);
  }
  detailBerth(g);
  if (webgl) addQuayWeathering(g);
  detailProcessYard(g);
  rail(g,-21.2,-10.1,-7.5,-10.1,-.02);
  rail(g,-2.3,-10.1,21.2,-10.1,-.02);
  rail(g,-21.5,10,-5.8,10,-.02);
  rail(g,19,10,21.5,10,-.02);
  lights(g);
  return g;
}
let contactShade;
function shadow(g,x,z,w,d){
  if(!contactShade){
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    const gradient=ctx.createRadialGradient(32,32,4,32,32,32);
    gradient.addColorStop(0,'rgba(6,12,18,.41)');gradient.addColorStop(1,'rgba(6,12,18,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    contactShade=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false});
  }
  const plane=mesh(g,new T.PlaneGeometry(w,d),contactShade,x,.153,z);
  plane.rotation.x=-Math.PI/2;
  plane.receiveShadow=false;
}
function terminal(scene, webgl){
  const g=ground(scene, webgl);
  g.traverse(node => node.layers.enable(reflectionLayer));
  for(const [x,z,w,d] of [[-12,-4,6,4],[-10,5.8,7,5],[0,0,10,8],[9,-4,9,6],[17,5,9,7],[17,-4,7,5]])shadow(g,x,z,w,d);
  pad(g,16.5,5.86,9,6.3);
  const storage = tank(g,17.35,5.76,2.45,3.28,mint,'TK-201 / LNG STORAGE');
  tank(g,20,2.92,1.18,2.48,mint);
  lngPump(g,10.7,5.78);
  vaporizer(g,-11.55,5.78);
  compressor(g,-11.7,-4.95);
  pad(g,-18.12,-4.95,4,3.16);
  horizontalVessel(g,-18.12,.98,-4.95,.60,2.23,blue,'H₂ FEED VESSEL');
  const refrigeration=coldBox(g,9.25,-4.95,route);
  pad(g,17.6,-4.95,6,4.46);
  const lh2=lh2Tank(g,17.3,1.40,-4.95);
  pad(g,-18.35,5.78,4.6,2.9);
  for(let i=0;i<3;i++){
    const z=5.1+i*.64;
    cyl(g,-18.2,.86,z,.12,1.2,steel);
    cyl(g,-18.2,1.49,z,.23,.11,mint,'y',true);
    cyl(g,-18.15,.49,z,.14,2.4,steel,'x',true);
  }
  for(const [x,z] of [[-4.4,-7.5],[3.9,-7.5],[3.9,7.6],[-5.4,7.6]]){
    box(g,x,.32,z,1.12,.55,1.03,trim);box(g,x,.61,z,1.21,.055,1.13,slab);
    box(g,x,.32,z+.53,.32,.38,.025,steel);
  }
  for(const x of [-6.7,-3.1,.6,4.3,7.3,13.2]){
    for(const z of [-3.45,3.65]){box(g,x,.48,z,.11,.95,.11,steel);box(g,x,.08,z,.34,.17,.38,trim);}
    box(g,x,.93,.10,.12,.12,7.22,trim);
  }
  const carrier = ship(g);
  const arm=group(g,14.4,0,10.82);
  const armPoints=[v(0,.32,0),v(0,3.25,0),v(0,4.23,.84),v(0,3.15,2.26),v(0,1.76,2.78)];
  loadingArm(arm, armPoints);
  const dockPipe=[[14.4,.86,13.6],[14.4,1.76,13.60],[14.4,3.15,13.08],[14.4,4.23,11.66],[14.4,3.25,10.82],[14.4,.68,10.82],[14.4,.68,8.65],[17.64,.68,8.65],[17.64,storage.deckY+.29,8.65],[17.64,storage.deckY+.29,5.62]];
  const dockFlow=route(g,dockPipe,pipeMint,MINT,22,.055,.81);
  for(const x of [8.2,11.7,16.3]){
    const z=11.16;
    box(g,x,.36,z,.55,.67,.45,trim);
    box(g,x,.66,z+.235,.36,.16,.034,gold);
  }
  const utility=group(g,-18,0,-.92);
  pad(utility,0,0,3.8,2.2);
  box(utility,0,.71,0,2.97,1.17,1.65,trim);
  box(utility,0,1.31,0,3.09,.11,1.76,steel);
  for(const x of [-.93,-.39,.21])box(utility,x,1.01,.834,.40,.29,.03,slab);
  box(utility,1.03,.61,.835,.49,.85,.035,steel);
  for(const x of [-1.1,1.02])cyl(utility,x,1.5,-.35,.115,.28,steel,'y',true);
  return {g,refrigeration,dockFlow,storage,lh2,carrier,arm};
}
const markerUp = v(0, 1, 0);
const markerTransform = new T.Object3D();

function route(g, points, mat, color, count = 34, radius = .103, markerScale = 1) {
  const positions = points.map(point => v(...point));
  const curve = pipePath(positions, radius ? radius * 2.8 : 0);
  const pipes = radius ? [pipeTube(g, curve, radius, mat)] : [];
  if (radius >= .10) {
    for (const [end, next] of [[positions[0], positions[1]], [positions.at(-1), positions.at(-2)]]) {
      const direction = next.clone().sub(end);
      if (direction.length() < .60) continue;
      direction.normalize();
      const center = end.clone().addScaledVector(direction, .20);
      const axis = Math.abs(direction.x) > .99 ? 'x' : Math.abs(direction.y) > .99 ? 'y' : 'z';
      flange(g, center.x, center.y, center.z, radius * 1.57, axis, steel, 6);
    }
  }
  const luminous = new T.MeshBasicMaterial({ color });
  const glow = new T.InstancedMesh(new T.SphereGeometry(.087 * markerScale, 8, 5), luminous, count);
  glow.frustumCulled = false;
  g.add(glow);
  const arrows = new T.InstancedMesh(new T.ConeGeometry(.145 * markerScale, .35 * markerScale, 8), luminous, Math.max(1, Math.floor(count / 7)));
  arrows.frustumCulled = false;
  g.add(arrows);
  for (let i = 0; i < arrows.count; i++) {
    const t = (i + .58) / arrows.count;
    curve.getPoint(t, markerTransform.position);
    markerTransform.position.y += radius ? .24 : .059;
    markerTransform.quaternion.setFromUnitVectors(markerUp, curve.getTangent(t));
    markerTransform.updateMatrix();
    arrows.setMatrixAt(i, markerTransform.matrix);
  }
  return { curve, glow, arrows, count, pipes, mat, radius, fluid: color === BLUE ? 'h2' : 'lng' };
}
function stageRoutes(scene, storage){
  const assisted=group(scene), standalone=group(scene), common=group(scene);
  const y=1.38,zH=-4.95,zL=5.78;
  const a=[
    route(assisted,[[-9.75,y,zH],[-4.75,y,zH],[-4.75,y,-1.02],[-3.87,y,-1.02]],pipeBlue,BLUE,16),
    route(assisted,[[3.87,y,-1.02],[4.78,y,-1.02],[4.78,y,zH],[6.25,y,zH]],pipeBlue,BLUE,13),
    route(assisted,[[8.70,y,zL],[4.78,y,zL],[4.78,y,1.02],[3.87,y,1.02]],pipeMint,MINT,17),
    route(assisted,[[-3.87,y,1.02],[-4.74,y,1.02],[-4.74,y,zL],[-8.59,y,zL]],pipeMint,MINT,17),
  ];
  const s=[
    route(standalone,[[-9.75,y,zH],[-7.25,y,zH],[-7.25,y,-7.08],[4.65,y,-7.08],[4.65,y,zH],[6.25,y,zH]],pipeBlue,BLUE,37),
    route(standalone,[[8.70,y,zL],[6.75,y,zL],[6.75,y,8.36],[-7.2,y,8.36],[-7.2,y,zL],[-8.59,y,zL]],pipeMint,MINT,37),
  ];
  const c=[
    route(common,[[-16.75,.98,zH],[-16.45,.98,zH],[-16.45,y,zH],[-13.77,y,zH]],pipeBlue,BLUE,9),
    route(common,[[12.2,y,zH],[12.5,y,zH],[12.5,y,zH+1.45]],pipeBlue,BLUE,6),
    route(common,[[12.5,.73,zH+2.29],[14.33,.73,zH+2.29],[14.33,.73,zH],[14.33,y,zH],[15.28,y,zH]],pipeBlue,BLUE,11),
    route(common,[[16.47,storage.deckY+.27,5.62],[14.67,storage.deckY+.27,5.62],[14.67,.94,5.62],[12.70,.94,5.62],[12.70,.94,4.68],[10.7,.94,4.68],[10.7,.94,5.25]],pipeMint,MINT,24),
    route(common,[[-14.51,y,zL],[-16.54,y,zL]],pipeMint,MINT,9),
  ];
  return {assisted,standalone,a,s,c};
}
// Orthographic magnification comes from zoom. A fixed orbit radius keeps
// the near plane outside the harbor even when inspecting an individual part.
const orbitRadius = 560;
const views={
  overview:{look:[.2,.24,1.7],offset:[22,31,38],scale:1.15},
  dispatch:{look:[0,-3.7,2.2],offset:[20,26,36],scale:.90},
  lng:{look:[12.9,1.77,9.05],offset:[13,17.5,28],scale:2.27},
  dock:{look:[12.55,1.21,12.03],offset:[12.1,13.3,26],scale:2.21},
  openingDock:{look:[10.75,1.17,11.5],offset:[11.6,12.5,26.7],scale:2.12},
  openingExchange:{look:[.15,1.76,.12],offset:[9.2,12,18.8],scale:3.75},
  mechanical:{look:[-.2,.82,-7.08],offset:[9.6,14,25],scale:2.44},
  bypass:{look:[-2.6,.82,6.55],offset:[14,15,25],scale:1.54},
  flange:{look:[-3.72,1.59,.93],offset:[-5.0,1.65,3.3],scale:7.5},
  section:{look:[.15,1.88,.07],offset:[-13.3,10.8,15.8],scale:4.65},
  exchange:{look:[0,1.83,.18],offset:[5.5,10,16],scale:5.0},
  deep:{look:[9.25,1.79,-4.60],offset:[6.9,10.0,18.5],scale:5.45},
  feed:{look:[-17.3,1.19,-4.95],offset:[-8,11,20],scale:3.05},
  compressor:{look:[-11.70,1.40,-4.95],offset:[-7.0,8.3,16.2],scale:4.35},
  trim:{look:[-11.55,1.57,5.78],offset:[-7.7,9.2,17.9],scale:3.72},
  pump:{look:[10.70,1.57,5.78],offset:[8.2,8.4,17.5],scale:4.04},
  liquid:{look:[17.3,1.38,-4.95],offset:[6.7,6.7,17.5],scale:4.25},
};
const anchor={
  feed:v(-17.9,2.24,-4.95),compressor:v(-11.7,2.91,-4.95),lng:v(17.35,5.0,5.76),pump:v(10.7,3.24,5.76),
  exchange:v(0,3.2,0),trim:v(-11.55,3.33,5.78),deep:v(8.8,3.95,-4.95),
  liquid:v(17.3,2.75,-4.95),grid:v(-18.35,2.01,5.78),
  dock:v(14.4,4.45,11.66),cryo:v(7.28,2.62,-4.72),catalyst:v(9.22,1.77,-4.34),separator:v(12.5,1.66,-3.10),
};
const visibleLabels={
  overview:['exchange','lng','deep','liquid'],
  dispatch:['feed','lng','exchange','trim','deep','liquid'],
  lng:['dock','lng','pump','trim','grid'],exchange:['exchange'],deep:['deep','liquid','cryo','catalyst','separator'],
  feed:['feed'],compressor:['compressor'],trim:['trim','grid'],pump:['pump'],liquid:['liquid'],
  flange:[],section:[],dock:['dock','lng'],openingDock:[],openingExchange:[],mechanical:['feed','deep'],bypass:['trim','pump'],
};

function createRenderer(scene) {
  const canvas = document.createElement('canvas');
  let renderer;
  try {
    const context = canvas.getContext('webgl2', {
      antialias: true, powerPreference: 'high-performance', alpha: false,
    });
    if (context) {
      renderer = new T.WebGLRenderer({ canvas, context, antialias: true });
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.045;
      setDaylightEnvironment(scene, renderer);
      return { renderer, kind: 'webgl' };
    }
  } catch (error) {
    renderer?.dispose();
    console.warn('WebGL initialization failed; using Canvas 2D.', error);
  }
  return { renderer: softwareRenderer(), kind: 'canvas' };
}

export function createPlant(target, labelLayer, choose, reduced){
  const scene=new T.Scene();scene.background=new T.Color(harborSky);
  const camera=new T.OrthographicCamera(-30,30,19,-19,.1,2200);
  const { renderer, kind } = createRenderer(scene);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.domElement.setAttribute('aria-label','Interactive 3D plant. Drag to orbit and scroll or pinch to zoom.');
  target.appendChild(renderer.domElement);
  const ambient=new T.HemisphereLight(0xe4f0ff,0x968573,.82);scene.add(ambient);
  const key=new T.DirectionalLight(0xffebd2,2.48);key.position.set(-33,35,20);scene.add(key);
  const fill=new T.DirectionalLight(0xc2d9ed,.53);fill.position.set(12,14,-28);scene.add(fill);
  const shadows = kind === 'webgl' ? renderer.shadowMap : null;
  const water = shadows ? addHarborWater(scene) : null;
  if (shadows) {
    applySurfaceFinishes(renderer, () => { redraw = true; water.invalidate(); });
    renderer.localClippingEnabled = true;
    shadows.enabled = true;
    shadows.autoUpdate = false;
    shadows.type = T.PCFSoftShadowMap;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -29, right: 29, top: 23, bottom: -23, near: 4, far: 85 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.normalBias = .028;
    key.shadow.bias = -.00014;
    key.shadow.radius = 2;
  }
  addHarbor(scene);
  const {g,refrigeration,dockFlow,storage,lh2,carrier,arm}=terminal(scene, kind === 'webgl');
  const precooler=group(scene);
  const equipment=exchanger(precooler);
  const {casing,core,stack,headers,risers}=equipment;
  const inspection=shadows?createPrecoolerInspection(precooler,equipment,updateVisibility):null;
  const routes=stageRoutes(scene,storage);
  const mainRoutes=[...routes.c,...routes.a,...routes.s,dockFlow];
  const mechanical=group(scene);
  horizontalVessel(mechanical,-1.24,1.38,-7.08,.48,3.06,blue);
  mechanical.visible=false;
  routes.standalone.visible=false;
  const pickers = [
    pick(g,'dock',14.4,1.9,12.2,2.2,4.2,3.4),
    pick(g,'feed',-17.92,1.15,-4.95,3.4,2.35,3.5),
    pick(g,'compressor',-11.70,1.48,-4.95,4.8,3.25,3.0),
    pick(g,'lng',17.8,1.98,5.3,7.3,4.75,5.8),
    pick(g,'pump',10.7,1.55,5.78,4.3,3.11,2.5),
    pick(g,'exchange',0,1.55,0,7.5,2.98,3.92),
    pick(g,'trim',-11.55,1.5,5.78,5.8,3.0,4.1),
    pick(g,'deep',9.25,1.52,-4.95,6.5,3.1,3.85),
    pick(g,'liquid',17.4,1.3,-4.95,6.2,2.8,4.25),
    pick(g,'grid',-18.2,.8,5.78,4.1,1.6,2.8),
  ];
  batchStaticMeshes(scene);
  for (const object of [carrier, arm, ambient, key, fill]) {
    object.traverse(node => node.layers.enable(reflectionLayer));
  }
  // Reveal the top hydrogen layer and the LNG layer beneath it in the same view.
  const topLayer = stack.at(-1).layer;
  const cutPlane = new T.Plane(v(0, 0, -1), .02);
  const cutMaterials = new Map();
  if (shadows) topLayer.traverse(node => {
    if (!node.isMesh) return;
    const original = node.material;
    if (!cutMaterials.has(original)) {
      const material = original.clone();
      material.clipShadows = true;
      cutMaterials.set(original, material);
    }
    node.material = cutMaterials.get(original);
  });
  const subdued = new Map();
  const scenery = [];
  const dockParts = new Set([...dockFlow.pipes, dockFlow.glow, dockFlow.arrows]);
  g.traverse(node => {
    const finish = node.material;
    if (!finish?.color || !finish.visible || finish.transparent || dockParts.has(node)) return;
    if (!subdued.has(finish)) {
      const soft = finish.clone();
      soft.color.lerp(new T.Color(0x96a9af), .59);
      if (soft.isMeshStandardMaterial) {
        soft.metalness *= .40;
        soft.roughness = Math.max(soft.roughness, .70);
      }
      subdued.set(finish, soft);
    }
    scenery.push({ node, finish, soft: subdued.get(finish) });
  });
  const activePipe = new Map([
    [pipeBlue, material(0x2184bd, .30, .44)],
    [pipeMint, material(0x147862, .30, .44)],
  ]);
  scene.updateMatrixWorld(true);

  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=!reduced;controls.dampingFactor=.12;
  controls.minPolarAngle=.006;controls.maxPolarAngle=Math.PI*.43;
  controls.minDistance=controls.maxDistance=orbitRadius;
  controls.screenSpacePanning=false;
  controls.maxTargetRadius=48;
  controls.minZoom=.23;controls.maxZoom=8;
  const orbit = new T.Spherical(orbitRadius);
  const orbitOffset = new T.Vector3();
  const orbitAngles = new T.Spherical();
  let active='overview', tween=null, flow=true, labels=true, mode='integrated', available=1;
  let coreView='cutaway', stream='both', trace='both', deepView='cutaway', deepStream='both', lh2View='shell', cameraView='iso', projection=false, spread=0;
  let suspended=false, screeningDuty=null, redraw=true, compareUntil=0;
  let last=performance.now(), travel=0, passageTravel=0, compact=false, dimensions={width:1,height:1};
  const tmp=new T.Object3D(), projected=v(0,0,0);
  const buttons=new Map([...labelLayer.querySelectorAll('button')].map(b=>[b.dataset.equipment,b]));
  const labelWidths = new Map();
  const ray=new T.Raycaster(), mouse=new T.Vector2();let down=null;
  let shadowState, isolated, steppedCut;
  function updateVisibility(){
    redraw = true;
    const isolate = ['exchange', 'section', 'flange'].includes(active);
    if (isolated !== isolate) {
      isolated = isolate;
      water?.invalidate();
      for (const {node, finish, soft} of scenery) node.material = isolate ? soft : finish;
    }
    const comparing = compareUntil > 0;
    const shot=inspection&&(active==='flange'||active==='section')?active:null;
    const opened=active==='exchange'&&coreView!=='shell'&&mode==='integrated';
    const live=mode==='integrated'&&available>0;
    const passageFocus=trace==='both'?stream:trace;
    const cut = opened && coreView === 'cutaway' ? passageFocus : null;
    if (cut !== steppedCut) {
      steppedCut = cut;
      cutPlane.constant = cut === 'lng' ? -2 : .02;
      for (const material of cutMaterials.values()) {
        material.clippingPlanes = cut === 'both' || cut === 'lng' ? [cutPlane] : null;
        material.needsUpdate = true;
      }
    }
    casing.visible=!opened&&shot!=='section'&&!(shot&&inspection.loaded);
    core.visible=opened||(shot==='section'&&!inspection.loaded);
    headers.visible=!(shot&&inspection.loaded);
    inspection?.update({shot,focus:passageFocus,running:flow&&live,enabled:live});
    if(inspection?.loaded)target.dataset.inspectionModel='glb';
    refrigeration.setView(deepView);
    refrigeration.setStream(deepStream);
    lh2.setCutaway(active==='liquid'?lh2View:'shell');
    refrigeration.setFlow(flow && trace !== 'lng');
    refrigeration.inside.visible=active==='deep' && deepView!=='shell';
    refrigeration.shell.visible=!refrigeration.inside.visible;
    const nextShadowState = `${opened}/${deepView}/${deepStream}/${refrigeration.inside.visible}/${mode}/${shot}/${inspection?.loaded}/${steppedCut}`;
    if (shadows && shadowState !== nextShadowState) {
      shadows.needsUpdate = true;
      shadowState = nextShadowState;
    }
    for(const {channel,fluid,flow: indicators} of stack){
      channel.visible=passageFocus==='both'||passageFocus===fluid;
      indicators.visible=!shot&&flow&&live;
    }
    for (const {fluid, root} of risers) {
      root.visible = !shot && opened && coreView !== 'exploded' && live && flow &&
        (passageFocus === 'both' || passageFocus === fluid);
    }
    for(const circuit of mainRoutes){
      const focused=trace==='both'||trace===circuit.fluid;
      const shared=routes.c.includes(circuit)||circuit===dockFlow;
      const highlighted=focused&&(!comparing||!shared);
      const unloading=circuit!==dockFlow||active==='dock'||active==='openingDock';
      const starved=available<=0&&circuit.fluid==='lng'&&routes.a.includes(circuit);
      circuit.glow.visible=flow&&highlighted&&unloading&&!starved;
      circuit.arrows.visible=circuit.glow.visible;
      for(const pipe of circuit.pipes) {
        pipe.material = !highlighted ? mutedPipe : comparing ? activePipe.get(circuit.mat) : circuit.mat;
      }
    }
  }
  function focus(key, immediate=false, duration=900){
    active=views[key]?key:'overview';
    const view=views[active];
    frameViewport();
    const exploded=active==='exchange'&&coreView==='exploded';
    const look=v(...view.look);
    if(exploded&&cameraView!=='plan')look.y=compact?3.29:3.09;
    if(active==='deep'&&deepView==='exploded'&&cameraView!=='plan')look.y=2.05;
    const offset=cameraView==='plan'?v(.02,40,.21):v(...view.offset);
    const angles = new T.Spherical().setFromVector3(offset);
    const fit=dimensions.width/dimensions.height;
    const shotScale=active==='deep'&&deepView==='exploded'?(compact?3.55:4.65):compact&&active==='section'?3.5:exploded?(compact?2.75:3.20):view.scale;
    // Keep the entire terminal in the overview on narrow screens.
    const portrait=compact&&fit<.84&&cameraView!=='plan';
    const fitDivisor=portrait
      ? (active==='overview'?1.66:active==='exchange'?1.18:active==='dispatch'?.70:.80)
      : (active==='overview'?1.62:active==='dispatch'?1.54:1.10);
    const zoom=shotScale*Math.min(1,fit/fitDivisor);
    updateVisibility();
    controls.cursor.copy(look);
    if (immediate || reduced) {
      controls.target.copy(look);
      camera.position.copy(offset.setLength(orbitRadius)).add(look);
      camera.zoom=zoom;
      camera.updateProjectionMatrix();
      controls.update();
      tween=null;
      return;
    }
    orbitAngles.setFromVector3(orbitOffset.copy(camera.position).sub(controls.target));
    const turn = T.MathUtils.euclideanModulo(angles.theta - orbitAngles.theta + Math.PI, Math.PI * 2) - Math.PI;
    tween = {
      look, zoom, duration, start: performance.now(), target: controls.target.clone(), fromZoom: camera.zoom,
      phi: orbitAngles.phi, nextPhi: angles.phi, theta: orbitAngles.theta, turn,
    };
  }
  function frameViewport(){
    redraw = true;
    const aspect=dimensions.width/dimensions.height;
    const shift=dimensions.width>800 ? (projection ? .18 : active.startsWith('opening') ? .12 : 0) : 0;
    camera.left=-19*aspect*(1+shift);camera.right=19*aspect*(1-shift);
    camera.updateProjectionMatrix();
  }
  function resize(){
    const {width,height}=target.getBoundingClientRect();
    if(!width || !height || (width===dimensions.width && height===dimensions.height))return;
    const first=dimensions.width===1;
    dimensions={width,height};compact=width<620;
    labelWidths.clear();
    frameViewport();renderer.setSize(width,height,false);
    water?.resize(width,height);
    if(first||!tween)focus(active,true);
  }
  const surface = renderer.domElement;
  surface.addEventListener('pointerdown', event => {
    down = event.isPrimary && event.button === 0
      ? { id: event.pointerId, x: event.clientX, y: event.clientY }
      : null;
  });
  surface.addEventListener('pointercancel', () => { down = null; });
  surface.addEventListener('pointerup', event => {
    const start = down;
    down = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const bounds = surface.getBoundingClientRect();
    mouse.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (event.clientY - bounds.top) / bounds.height * 2);
    ray.setFromCamera(mouse, camera);
    const [hit] = ray.intersectObjects(pickers, false);
    if (hit) choose(hit.object.userData.equipment);
  });
  controls.addEventListener('start',()=>{tween=null;});
  controls.addEventListener('change',()=>{redraw=true;});
  const ro=new ResizeObserver(resize);ro.observe(target);resize();
  function drawFlow(f,phase){
    for(let i=0;i<f.count;i++){
      const t=(i/f.count+phase)%1;
      f.curve.getPoint(t,tmp.position);
      if(f.radius)tmp.position.y+=f.radius+.028;
      tmp.quaternion.identity();tmp.scale.setScalar((trace===f.fluid?1.27:.80)+.18*Math.sin(i*1.47+phase*16));tmp.updateMatrix();f.glow.setMatrixAt(i,tmp.matrix);
    }
    f.glow.instanceMatrix.needsUpdate=true;
  }
  function placeLabels() {
    const visible = new Set(visibleLabels[active]);
    const bounds = [];
    for (const [id, button] of buttons) {
      if (!visible.has(id) || !labels) button.hidden = true;
    }
    for (const id of visible) {
      const button = buttons.get(id);
      if (!button || !labels ||
        (active === 'deep' && deepView === 'shell' && ['cryo', 'catalyst', 'separator'].includes(id)) ||
        (active === 'exchange' && coreView !== 'shell' && mode === 'integrated') ||
        (compact && active === 'overview' && !['exchange', 'lng', 'liquid'].includes(id))) {
        if (button) button.hidden = true;
        continue;
      }
      projected.copy(anchor[id]).project(camera);
      const x = (projected.x + 1) * .5 * dimensions.width;
      const y = (1 - projected.y) * .5 * dimensions.height;
      if (!labelWidths.has(id)) {
        button.hidden = false;
        labelWidths.set(id, button.offsetWidth / 2 + 5);
      }
      const half = labelWidths.get(id);
      if (x < half || x > dimensions.width - half || y < 70 || y > dimensions.height - 46 ||
        bounds.some(other => Math.abs(other.x - x) < other.half + half && Math.abs(other.y - y) < 25)) {
        button.hidden = true;
        continue;
      }
      bounds.push({ x, y, half });
      button.hidden = false;
      button.style.left = x + 'px';
      button.style.top = y + 'px';
    }
  }
  function animate(now){
    const gap=active==='exchange'&&coreView==='exploded'?1:0;
    if (spread !== gap) {
      redraw = true;
      spread=reduced||Math.abs(gap-spread)<.002?gap:spread+(gap-spread)*.18;
      for(const [index,{layer,base}] of stack.entries()){
        layer.position.y=base+spread*(index*.58);
        layer.position.x=spread*(index-3)*.14;
      }
    }
    const delta=Math.min((now-last)/1000,.05);last=now;
    const pace=screeningDuty===null?1:.4+.6*screeningDuty;
    if(tween){
      redraw = true;
      const t=Math.min(1,(now-tween.start)/tween.duration),f=1-(1-t)**3;
      controls.target.lerpVectors(tween.target,tween.look,f);
      orbit.phi = T.MathUtils.lerp(tween.phi, tween.nextPhi, f);
      orbit.theta = tween.theta + tween.turn * f;
      camera.position.copy(orbitOffset.setFromSpherical(orbit)).add(controls.target);
      camera.zoom=T.MathUtils.lerp(tween.fromZoom,tween.zoom,f);camera.updateProjectionMatrix();
      if(t===1)tween=null;
    }
    controls.update();
    if (compareUntil && now >= compareUntil) {
      compareUntil = 0;
      updateVisibility();
    }
    const animateWater = water && !reduced;
    if (!redraw && (!flow || reduced) && !animateWater) return;
    if (animateWater) water.time.value += delta;
    if(flow&&!reduced){travel=(travel+delta*.143)%1;passageTravel=(passageTravel+delta*.143*pace)%1;}
    if(flow){
      inspection?.animate(passageTravel);
      if(active==='exchange'&&core.visible&&mode==='integrated'&&available>0){
        for(const entry of stack)if(entry.channel.visible)entry.animate(passageTravel);
      }
      if(refrigeration.inside.visible)refrigeration.animate(travel);
      if(dockFlow.glow.visible)drawFlow(dockFlow,travel);
      for(const f of routes.c)if(f.glow.visible)drawFlow(f,travel);
      for(const f of mode==='integrated'?routes.a:routes.s)if(f.glow.visible)drawFlow(f,travel);
    }
    placeLabels();
    water?.updateReflection(renderer,camera,now);
    redraw = renderer.render(scene,camera) === false;
  }
  renderer.setAnimationLoop(animate);
  return {
    focus, kind,
    setSectionDepth(value){inspection?.setDepth(value);redraw=true;},
    setSuspended(value) {
      if (suspended === value) return;
      suspended = value;
      if (value) {
        renderer.setAnimationLoop(null);
      } else {
        last = performance.now();
        redraw = true;
        resize();
        renderer.setAnimationLoop(animate);
      }
    },
    setScreeningDuty(value){screeningDuty=value;},
    setFlow(value){flow=value;updateVisibility();},
    setTrace(value){trace=value;updateVisibility();},
    setProjection(value){if(projection!==value){projection=value;frameViewport();}},
    setLabels(value){labels=value;redraw=true;},
    setMode(value, compare = false) {
      mode = value;
      compareUntil = compare ? performance.now() + 3000 : 0;
      routes.assisted.visible = value === 'integrated';
      routes.standalone.visible = value === 'standalone';
      mechanical.visible = value === 'standalone';
      updateVisibility();
    },
    setAvailable(value){available=value;updateVisibility();},
    setCore(value){coreView=value;focus(value==='section'?'section':active==='section'||active==='flange'?'exchange':active);},
    setStream(value){stream=value;updateVisibility();},
    setDeep(value){deepView=value;focus(active);},
    setDeepStream(value){deepStream=value;updateVisibility();},
    setLH2View(value){lh2View=value;focus('liquid');},
    setCamera(value){cameraView=value;focus(active);},
    zoomBy(multiplier){
      // Mobile zoom controls complement pinch-to-zoom and OrbitControls.
      if(!Number.isFinite(multiplier)||multiplier<=0)return;
      tween=null;
      camera.zoom=T.MathUtils.clamp(camera.zoom*multiplier,controls.minZoom,controls.maxZoom);
      camera.updateProjectionMatrix();
      controls.update();
      redraw=true;
    },
  };
}
