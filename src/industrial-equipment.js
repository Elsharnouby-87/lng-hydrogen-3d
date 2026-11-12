import * as T from 'three';
import {
  BLUE, MINT, bevelBox, blue, box, boxes, cyl, dark, flange, gold,
  group, ice, material, mesh, mint, nameplate, pad, pipePath,
  pipeTube, segment, sphere, steel, trim, v,
} from './plant-geometry.js';

/**
 * Stage 3. Detailed industrial *representations*, not fabrication models.
 * Equipment sizes are illustrative; connection coordinates deliberately match
 * existing animated plant-route endpoints, in the same local model units.
 *
 * K-101: axial hydrogen suction (-2.07,1.38,0) and discharge (+1.95,1.38,0)
 * P-201: LNG suction (0,.94,-.53) and discharge (-2,1.38,0)
 * E-202: manifold west/east service (-2.96,+2.96,1.38,0)
 * LH2: vacuum-jacketed process port (-2.02,1.38,0) to vessel shell.
 * No safety, relief, electrical or instrumentation design is implied.
 */
export const INDUSTRIAL_REFERENCE = Object.freeze({
  scope: ['K-101', 'P-201', 'E-202', 'TK-301'],
  status: 'CONCEPTUAL / NOT TO SCALE',
  mechanicalBasis: 'Representative centrifugal H2 compressor, vertical cryogenic canned pump, finned-tube ambient-air vaporizer and horizontal vacuum-jacket LH2 vessel.',
  restrictions: [
    'Dimensions, pressure class, piping schedule, valve sizing, support loads, nozzle loads and relief capacity are unverified.',
    'The E-202 trim heating duty / final send-out quality is not simulated.',
    'Storage relief ports show protected interfaces; the engineered vent header is not modelled.',
  ],
});

const compressorSteel=material(0xb9cbd5,.78,.27);
const turbineMetal=material(0x8295a5,.81,.30);
const housing=material(0x6989a0,.68,.38);
const cryoWhite=material(0xe2edf3,.59,.33);
const lightMetal=material(0xc6d2d8,.77,.32);
const bluePipe=material(0x548eaf,.72,.35);
const greenPipe=material(0x4caa94,.66,.41);
const blueAccent=material(0x3e96ce,.42,.40);
const greenAccent=material(0x2da78d,.40,.40);
const guarded=material(0x34495b,.43,.43);
const brass=material(0xbd9864,.65,.39);
const fastener=material(0x273d50,.74,.42);
const whitePaint=material(0xc1d1dc,.29,.49);
const warning=material(0xe2ac52,.22,.48);

const localPorts = {
  'K-101': [{name:'H2 suction',point:[-2.07,1.38,0]},{name:'H2 discharge',point:[1.95,1.38,0]}],
  'P-201': [{name:'LNG suction',point:[0,.94,-.53]},{name:'LNG discharge',point:[-2,1.38,0]}],
  'E-202': [{name:'Terminal LNG inlet',point:[2.96,1.38,0]},{name:'Gas send-out',point:[-2.96,1.38,0]}],
  'TK-301': [{name:'LH2 liquid inlet',point:[-2.02,1.38,0]}],
};
export const STAGE3_PORTS=Object.freeze(localPorts);

function identity(parent,tag,ports) {
  parent.name=tag;
  parent.userData.equipmentTag=tag;
  parent.userData.processPorts=ports.map(p=>({name:p.name,point:[...p.point]}));
  return parent;
}

function processRun(parent, coords, radius, finish) {
  const line=coords.map(p=>v(...p));
  return pipeTube(parent,pipePath(line,Math.min(.22,radius*2.35)),radius,finish);
}

function tubeRings(parent,x,y,z,r,ax,step=.11,count=5) {
  for(let i=0;i<count;i++){
    const t=(i-(count-1)/2)*step;
    const px=x+(ax==='x'?t:0),py=y+(ax==='y'?t:0),pz=z+(ax==='z'?t:0);
    cyl(parent,px,py,pz,r,.026,lightMetal,ax,true);
  }
}

function boltRing(parent,x,y,z,r,axis) {
  flange(parent,x,y,z,r,axis,compressorSteel,10);
  // The flange/gasket joint remains separate from the process bore.
  cyl(parent,x+(axis==='x'?.059:0),y+(axis==='y'?.059:0),
    z+(axis==='z'?.059:0),r*.73,.026,fastener,axis,true);
}

function gauge(parent,x,y,z,scale=1) {
  const g=group(parent,x,y,z);
  g.userData.instrument='PI / local indicator';
  cyl(g,0,-.14*scale,0,.029*scale,.23*scale,lightMetal,'y',true);
  cyl(g,0,0,0,.155*scale,.078*scale,guarded,'z',true);
  cyl(g,0,0,.049*scale,.129*scale,.025*scale,cryoWhite,'z',true);
  cyl(g,0,0,.065*scale,.015*scale,.014*scale,fastener,'z',true);
  segment(g,v(0,0,.077*scale),v(.065*scale,.052*scale,.077*scale),.010*scale,fastener);
  return g;
}

function transmitter(parent,x,y,z) {
  const g=group(parent,x,y,z);
  g.userData.instrument='PT / pressure transmitter';
  cyl(g,0,-.115,0,.038,.22,lightMetal,'y',true);
  cyl(g,0,.044,0,.085,.175,compressorSteel,'y',true);
  bevelBox(g,0,.19,0,.25,.19,.20,.025,blueAccent);
  box(g,0,.19,.109,.21,.11,.012,cryoWhite);
  return g;
}

function pipeShoe(parent,x,y,z,w=.29) {
  // y is the pipe centre. Clamp and stanchion finish at the process pipe.
  box(parent,x,(y+.35)/2,z,w,y-.35,.20,guarded);
  box(parent,x,.34,z,w+.14,.10,.34,lightMetal);
  for(const dz of [-.10,.10])
    cyl(parent,x,.403,z+dz,.034,.055,fastener,'y',true);
  cyl(parent,x,y-.09,z,.17,.11,lightMetal,'x',true);
}

function actuatedValve(parent,x,y,z,r=.15) {
  const g=group(parent,x,y,z);
  g.userData.component='Actuated process isolation valve (schematic)';
  sphere(g,0,0,0,r*1.20,r*.98,r*.98,compressorSteel);
  for(const dx of [-r*1.65,r*1.65])boltRing(g,dx,0,0,r*1.25,'x');
  cyl(g,0,r*1.05,0,r*.40,r*.7,steel,'y',true);
  bevelBox(g,0,r*2.15,0,r*2.15,r*1.15,r*1.7,.027,guarded);
  for(const zz of [-r*.5,r*.5])box(g,0,r*2.15,zz,r*1.45,r*.13,r*.08,lightMetal);
  box(g,.04,r*2.68,.02,r*1.38,.045,r*.9,warning);
  return g;
}

function handValve(parent,x,y,z,r=.115) {
  const g=group(parent,x,y,z);
  g.userData.component='Manual block valve';
  sphere(g,0,0,0,r*1.1,r*.92,r*.9,compressorSteel);
  for(const dx of [-r*1.5,r*1.5])flange(g,dx,0,0,r*1.2,'x',steel,6);
  cyl(g,0,r*1.2,0,.042,r*.85,steel,'y',true);
  const wheel=mesh(g,new T.TorusGeometry(r*.70,.021,7,18),fastener,0,r*2.25,0);
  wheel.rotation.x=Math.PI/2;
  for(const a of [0,Math.PI/2]) {
    const bar=box(g,0,r*2.25,0,r*1.33,.022,.025,lightMetal);
    bar.rotation.y=a;
  }
  return g;
}

function frame(parent,w,d) {
  pad(parent,0,0,w+.68,d+.62);
  for(const side of [-1,1]){
    box(parent,0,.24,side*(d/2-.17),w,.22,.25,guarded);
    box(parent,0,.385,side*(d/2-.17),w,.073,.30,lightMetal);
    for(const end of [-1,1]){
      const x=end*(w/2-.27),z=side*(d/2-.17);
      box(parent,x,.12,z,.50,.15,.42,compressorSteel);
      for(const delta of [-.16,.16])cyl(parent,x+delta,.228,z,.039,.045,fastener,'y',true);
    }
  }
  box(parent,0,.425,0,w,.065,d,guarded);
}

function saddle(parent,x,y,z,r) {
  // Independent vessel-support outline with clearance for the curved jacket.
  box(parent,x,.43,z,.50,.17,1.54*r,guarded);
  box(parent,x,(y-r+.40)/2,z,.36,Math.max(.17,y-r-.4),1.26*r,compressorSteel);
  cyl(parent,x,y,z,r+.026,.095,lightMetal,'x');
  for(const dz of [-.54*r,.54*r]){
    box(parent,x,.29,z+dz,.36,.13,.27,guarded);
  }
}

export function industrialCompressor(parent,x,z) {
  const root=identity(group(parent,x,0,z),'K-101',localPorts['K-101']);
  frame(root,4.36,2.34);
  // Split barrel centrifugal compressor, rotor casing supported separately
  // from the induction motor and enclosed flexible coupling.
  const CY=1.41;
  for(const xx of [-1.45,-.16]){
    box(root,xx,.75,0,.25,.54,.99,guarded);
    box(root,xx,.52,0,.46,.15,1.18,compressorSteel);
  }
  cyl(root,-.83,CY,0,.62,1.56,compressorSteel,'x');
  for(const dx of [-1.53,-1.24,-.80,-.33,-.14]){
    cyl(root,dx,CY,0,.639,.075,lightMetal,'x',true);
  }
  for(const dx of [-1.56,-.11]) {
    cyl(root,dx,CY,0,.65,.093,turbineMetal,'x');
    boltRing(root,dx,CY,0,.65,'x');
  }
  // Suction annulus / axial inlet with exactly aligned route connection.
  processRun(root,[[-2.07,1.38,0],[-1.62,1.38,0]],.151,bluePipe);
  boltRing(root,-2.07,1.38,0,.27,'x');
  // Motor and fan end with mechanically continuous guarded coupling.
  cyl(root,.10,CY,0,.22,.47,steel,'x');
  cyl(root,.28,CY,0,.38,.41,warning,'x');
  const guard=bevelBox(root,.25,CY,.015,.49,.77,.80,.08,guarded);
  guard.userData.component='Non-openable coupling guard';
  for(const angle of [-.2,.2])box(root,.25,CY+angle,.425,.38,.041,.042,lightMetal);
  const MX=1.07,MY=1.38;
  box(root,MX,.78,0,.89,.49,1.10,guarded);
  cyl(root,MX,MY,0,.52,1.45,housing,'x');
  cyl(root,MX-.74,MY,0,.555,.13,lightMetal,'x');
  cyl(root,MX+.77,MY,0,.545,.14,lightMetal,'x');
  // Instanced radial cooling fins in longitudinal motor axis.
  const strips=[];
  for(let i=0;i<22;i++){
    const a=i*2*Math.PI/22;
    for(let j=0;j<8;j++){
      const xx=MX-.52+j*.15;
      const part=box(root,xx,MY+Math.cos(a)*.535,Math.sin(a)*.535,
        .115,.12,.027,lightMetal);
      part.rotation.x=a;
      strips.push(part);
    }
  }
  cyl(root,MX+.84,MY,0,.43,.08,guarded,'x');
  const fan=mesh(root,new T.TorusGeometry(.39,.026,6,30),lightMetal,MX+.90,MY,0);
  fan.rotation.y=Math.PI/2;
  for(let i=0;i<7;i++){
    const a=i*2*Math.PI/7;
    const blade=box(root,MX+.915,MY+Math.sin(a)*.18,Math.cos(a)*.18,
      .022,.09,.22,turbineMetal);
    blade.rotation.x=a;
  }
  // Discharge exits the barrel top, bends around motor on its rear side,
  // then reconnects at the established E-101 animated pipe interface.
  cyl(root,-.47,2.11,-.16,.175,.27,bluePipe,'y');
  flange(root,-.47,2.24,-.16,.265,'y',steel,8);
  processRun(root,[
    [-.47,2.14,-.16],[-.47,2.48,-.16],[-.47,2.48,-.88],
    [1.90,2.48,-.88],[1.90,1.38,-.88],[1.95,1.38,-.88],
    [1.95,1.38,0],
  ],.118,bluePipe);
  boltRing(root,1.95,1.38,0,.21,'x');
  actuatedValve(root,1.30,2.48,-.88,.105);
  pipeShoe(root,1.93,1.38,-.87,.24);
  // Seal-gas / lube-oil instrumentation on an accessible service panel.
  box(root,-.60,.78,1.01,1.36,.83,.18,guarded);
  for(const dx of [-1.04,-.64,-.24]){
    cyl(root,dx,.78,1.11,.055,.35,compressorSteel,'y',true);
    cyl(root,dx,1.00,1.11,.076,.060,blueAccent,'y',true);
  }
  processRun(root,[[-.96,1.14,.98],[-.96,1.34,.98],[-1.29,1.34,.98]],.032,lightMetal);
  transmitter(root,-1.29,1.40,.99);
  gauge(root,-.62,2.42,.42,.89);
  processRun(root,[[-.62,2.00,.40],[-.62,2.23,.40]],.027,lightMetal);
  for(const dx of [-1.46,-.12]) {
    box(root,dx,.41,.85,.34,.12,.25,lightMetal);
    cyl(root,dx,.48,.85,.040,.052,fastener,'y',true);
  }
  nameplate(root,'K-101 / H₂ COMPRESSOR',-.95,1.31,.662,1.32,.21,'#aae0ff');
  return root;
}

export function industrialLNGPump(parent,x,z) {
  const root=identity(group(parent,x,0,z),'P-201',localPorts['P-201']);
  frame(root,4.35,2.54);
  // Vertical cryogenic pump cold barrel with insulated enclosure, upper
  // motor, bolted access cover and vacuum-jacket instrumentation.
  cyl(root,0,.69,0,.62,.36,guarded,'y');
  cyl(root,0,1.50,0,.48,1.79,cryoWhite,'y');
  for(const y of [.78,1.33,1.90,2.28])
    cyl(root,0,y,0,.50,.074,lightMetal,'y');
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10;
    box(root,Math.cos(a)*.445,1.51,Math.sin(a)*.445,.033,1.34,.037,compressorSteel).rotation.y=-a;
  }
  cyl(root,0,2.43,0,.59,.15,lightMetal,'y');
  boltRing(root,0,2.52,0,.62,'y');
  // Upper cryogenic motor housing and electrical junction box.
  cyl(root,0,2.87,0,.35,.63,housing,'y');
  cyl(root,0,3.21,0,.39,.10,lightMetal,'y');
  const fins=[];
  for(let i=0;i<20;i++){
    const a=2*Math.PI*i/20;
    const part=box(root,Math.cos(a)*.359,2.91,Math.sin(a)*.359,.030,.38,.12,lightMetal);
    part.rotation.y=-a;
    fins.push(part);
  }
  bevelBox(root,.55,2.92,.03,.36,.29,.32,.03,guarded);
  box(root,.74,2.92,.03,.015,.20,.23,blueAccent);
  // Cryogenic suction points toward the storage vessel. Keep the endpoint.
  processRun(root,[[0,.94,-.53],[0,.94,-.43],[0,.94,-.26]],.12,greenPipe);
  boltRing(root,0,.94,-.53,.24,'z');
  // Top discharge spool turns down to the preserved x=-2 service point.
  processRun(root,[
    [-.48,2.14,0],[-1.20,2.14,0],[-1.20,1.38,0],[-2.00,1.38,0],
  ],.116,greenPipe);
  flange(root,-.54,2.14,0,.22,'x',steel,8);
  actuatedValve(root,-1.64,1.38,0,.11);
  boltRing(root,-1.98,1.38,0,.19,'x');
  pipeShoe(root,-1.28,1.38,0,.23);
  // Jacket pressure and vibration observation are schematic only.
  processRun(root,[[.43,1.76,.13],[.72,1.76,.13],[.72,2.22,.13]],.032,lightMetal);
  gauge(root,.72,2.39,.13,.87);
  transmitter(root,-.59,2.57,.38);
  box(root,.95,1.01,.67,.55,.68,.38,guarded);
  box(root,.95,1.38,.67,.56,.085,.40,lightMetal);
  for(const xx of [.82,1.08])cyl(root,xx,.80,.89,.055,.28,lightMetal,'y',true);
  nameplate(root,'P-201 / LNG PUMP',0,1.77,.496,.96,.195,'#b5f1de');
  return root;
}

export function industrialVaporizer(parent,x,z) {
  const root=identity(group(parent,x,0,z),'E-202',localPorts['E-202']);
  pad(root,0,0,6.40,4.35);
  // Ambient-air style finned-tube array with bottom inlet distribution,
  // top collection, and transparent service routing. Actual auxiliary trim
  // heating remains outside the illustrated finned block.
  for(const xx of [-2.56,2.56]){
    for(const zz of [-1.38,1.38]){
      box(root,xx,.30,zz,.35,.49,.38,guarded);
      box(root,xx,.51,zz,.50,.082,.45,lightMetal);
      for(const dx of [-.12,.12])cyl(root,xx+dx,.58,zz,.036,.06,fastener,'y',true);
    }
  }
  for(const zz of [-1.38,1.38]){
    for(const xx of [-2.58,2.58]){
      box(root,xx,1.78,zz,.091,2.60,.12,guarded);
    }
    for(const yy of [.53,3.08])box(root,0,yy,zz,5.40,.085,.10,lightMetal);
  }
  const rows=[-1.05,-.35,.35,1.05];
  const columns=[-2.25,-1.62,-.99,-.36,.27,.90,1.53,2.16];
  const finDims=[];
  for(const zz of rows){
    // Each bank is manifolded through rigid horizontal headers.
    cyl(root,0,.80,zz,.10,5.13,steel,'x');
    cyl(root,0,2.84,zz,.10,5.13,steel,'x');
    for(const xx of columns){
      cyl(root,xx,1.82,zz,.054,2.03,steel,'y',true);
      finDims.push([xx,1.82,zz,.26,1.78,.025]);
      finDims.push([xx,1.82,zz,.025,1.78,.26]);
      // Repeated longitudinal extrusions increase the finned-tube depth
      // without separate geometry for every feather on every channel.
      for(const dz of [-.11,.11])finDims.push([xx,1.82,zz+dz,.077,1.70,.018]);
    }
    boltRing(root,-2.55,.80,zz,.16,'x');
    boltRing(root,2.55,2.84,zz,.16,'x');
  }
  boxes(root,cryoWhite,finDims);
  // Connected distribution manifold: externally established west gas-sendout
  // and east regasification service ports are intentionally unchanged.
  // Incoming LNG is distributed to the BOTTOM; warmed gas is collected
  // at the TOP, preserving the two established E-202 boundary positions.
  cyl(root,2.64,.80,0,.137,2.38,steel,'z');
  cyl(root,-2.64,2.84,0,.137,2.38,steel,'z');
  processRun(root,[[2.96,1.38,0],[2.76,1.38,0],[2.76,.80,0],[2.64,.80,0]],.112,greenPipe);
  processRun(root,[[-2.64,2.84,0],[-2.76,2.84,0],[-2.76,1.38,0],[-2.96,1.38,0]],.112,greenPipe);
  boltRing(root,-2.96,1.38,0,.20,'x');
  boltRing(root,2.96,1.38,0,.20,'x');
  handValve(root,-2.78,1.38,0,.092);
  actuatedValve(root,2.76,1.38,0,.095);
  // Header temperature/pressure tapping; indicator faces the front aisle.
  processRun(root,[[-2.60,2.84,1.05],[-2.60,3.07,1.05]],.029,lightMetal);
  gauge(root,-2.60,3.22,1.05,.82);
  transmitter(root,2.60,1.10,1.10);
  // Pipe shoes under actual centerline on the left/right service runs.
  box(root,-2.73,.56,.10,.24,.23,.25,guarded);
  box(root,2.76,.56,.10,.24,.23,.25,guarded);
  nameplate(root,'E-202 / FINNED VAPORIZER',.0,.64,1.63,2.10,.21,'#b7f5e1');
  return root;
}

export function industrialLH2Tank(parent,x,y,z) {
  const root=identity(group(parent,x,0,z),'TK-301',localPorts['TK-301']);
  pad(root,0,0,6.12,3.66);
  const r=1.02, mid=y;
  // Horizontal inner vessel within the visibly thicker outer vacuum
  // jacket; endcaps are ellipsoidal and partially overlap the cylinder.
  cyl(root,0,mid,0,r,3.42,cryoWhite,'x');
  for(const end of [-1,1]){
    sphere(root,end*1.69,mid,0,.31,r,r,cryoWhite);
    cyl(root,end*1.60,mid,0,r+.017,.074,lightMetal,'x');
    cyl(root,end*1.72,mid,0,r+.026,.040,compressorSteel,'x');
    for(const a of [0,Math.PI/2,Math.PI,1.5*Math.PI]){
      const p=box(root,end*1.68,mid+Math.cos(a)*r*.93,Math.sin(a)*r*.93,
        .068,.14,.13,lightMetal);
      p.rotation.x=a;
    }
  }
  for(const xx of [-1.34,-.69,0,.69,1.34])
    cyl(root,xx,mid,0,r+.010,.036,lightMetal,'x',true);
  for(const xx of [-1.15,1.15])saddle(root,xx,mid,0,r);
  // Vacuum annulus service and insulated connections. The animated LH2
  // delivery line terminates at the fixed -2.02 x flange.
  processRun(root,[[-2.02,1.38,0],[-1.69,1.38,0]],.133,bluePipe);
  boltRing(root,-2.02,1.38,0,.266,'x');
  cyl(root,-1.96,1.38,0,.168,.16,blueAccent,'x');
  // A distinct (capped) jacket evacuation nozzle; not an open relief vent.
  cyl(root,.90,mid+.83,.64,.072,.24,compressorSteel,'z');
  flange(root,.90,mid+.83,.82,.145,'z',steel,6);
  gauge(root,.94,mid+.87,1.07,.78);
  processRun(root,[[.94,mid+.55,.92],[.94,mid+.73,.92]],.025,lightMetal);
  // Two top-mounted safety interface branches with bolted hand-valve
  // envelopes. Their relief/header system is outside model boundary.
  for(const xx of [-.45,.63]){
    cyl(root,xx,mid+r+.14,0,.107,.26,steel,'y');
    flange(root,xx,mid+r+.23,0,.205,'y',lightMetal,8);
    cyl(root,xx,mid+r+.42,0,.085,.27,guarded,'y',true);
    box(root,xx,mid+r+.59,0,.32,.17,.24,blueAccent);
    cyl(root,xx,mid+r+.69,0,.08,.10,steel,'y',true);
    // Closed nozzle termination, not a simulated atmospheric discharge.
    cyl(root,xx,mid+r+.77,0,.139,.040,compressorSteel,'y',true);
  }
  // Liquid level transmitter and connection are shown as instrumentation.
  box(root,.04,mid+.17,r+.095,.43,.52,.14,guarded);
  box(root,.04,mid+.17,r+.181,.36,.39,.018,blueAccent);
  processRun(root,[[.04,mid+.05,r],[.04,mid+.05,r+.12]],.029,lightMetal);
  transmitter(root,-.38,mid+.79,.88);
  nameplate(root,'TK-301 / LIQUID HYDROGEN',.05,mid+.04,r+.028,1.69,.23,'#b7e8ff');
  for(const xx of [-1.34,1.34]){
    box(root,xx,.26,.71,.47,.10,.24,guarded);
    cyl(root,xx,.31,.71,.035,.068,fastener,'y',true);
  }
  root.userData.outerJacket='Vacuum insulated shell (schematic)';
  return root;
}
