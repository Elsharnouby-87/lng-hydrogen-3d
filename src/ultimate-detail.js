import * as T from 'three';
import {
  box, boxes, cyl, flange, group, material, mesh, nameplate, pipePath,
  pipeTube, segment, sphere, steel, trim, v,
} from './plant-geometry.js';

/**
 * Equipment detailing pass: measured in *illustrative model units only*.
 * All established process interface endpoints are preserved by the parents.
 * Do not construe this as vendor data, cryogenic piping isometrics, P&ID,
 * shaft-train design, heat balance, tank containment or safety certification.
 */
export const DETAILING_REFERENCE = Object.freeze({
  K101: 'Three visible process-compression stage zones; two conceptual interstage coolers, interconnecting bypass-free H2 spools.',
  P201: 'Vertical LNG cryopump motor, service-tapping assembly, cable gland, discharge head, top lift eyes and anchorage.',
  E202: 'Ambient-air vertical finned tube vaporizer; independent lower LNG feed and upper gas return manifolds.',
  R101: 'Separate H2/helium passages; finned staged cores; expander bearing housings and supported cold-gas headers.',
  LH2: 'Vacuum-jacket external shell or inspectable open-sector cutaway showing inner vessel and annulus.',
  LNG: 'Rooftop penetrations, capped boil-off service, vessel access, insulated nozzle, external gauges.',
  basis: 'Conceptual education model; no thermal, structural, pressure or safety-system sizing.',
});

const white=material(0xd8e5ec,.67,.35);
const dark=material(0x536576,.65,.38);
const metal=material(0x93aabb,.76,.33);
const blue=material(0x489cc5,.59,.40);
const teal=material(0x3ba88d,.59,.40);
const copper=material(0xa58d70,.56,.45);
const yellow=material(0xe4b354,.40,.45);
const insul=material(0xbed0db,.49,.43);
const foil=new T.MeshStandardMaterial({color:0xd5e5ef,metalness:.65,roughness:.34,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});
const innerShell=material(0x7da9c4,.65,.43);
const cryoLiquid=new T.MeshStandardMaterial({color:0x47bcf7,transparent:true,opacity:.55,roughness:.22,depthWrite:false,side:T.DoubleSide});
const cutWall=material(0xa3bac8,.69,.39);
cutWall.side=T.DoubleSide;
const tube=(g,points,r,mat)=>pipeTube(g,pipePath(points.map(p=>v(...p)),Math.max(r*2,.070)),r,mat);

function collar(g,x,y,z,r,axis='x',mat=metal) {
  flange(g,x,y,z,r,axis,mat,8);
  cyl(g,x,y,z,r*.67,.061,dark,axis,true);
}
function upright(g,x,z,top,bottom=.42){
  box(g,x,(top+bottom)*.5,z,.095,Math.max(.05,top-bottom),.095,dark);
  box(g,x,top,z,.23,.08,.23,metal);
}
function coupling(g,x,y,z,r) {
  cyl(g,x,y,z,r,.10,metal,'x');
  cyl(g,x-.042,y,z,r*.87,.16,blue,'x',true);
  collar(g,x+.066,y,z,r*.97);
}
function finnedBarrel(g,code,x,y,z,length=.78,r=.25) {
  const holder=group(g);
  holder.name=code;
  holder.userData.subassembly=code;
  cyl(holder,x,y,z,r,length,metal,'x');
  for(const sign of [-1,1]){
    cyl(holder,x+sign*(length*.45),y,z,r+.025,.075,white,'x');
    collar(holder,x+sign*(length*.50),y,z,r*.86);
    upright(holder,x+sign*length*.30,z,y-r-.05);
  }
  const fins=[];
  for(let i=0;i<12;i++){
    const px=x+(i-5.5)*(length-.15)/12;
    fins.push([px,y,z,.028,2*r+.12,.028]);
    fins.push([px,y,z,.028,.028,2*r+.12]);
  }
  boxes(holder,white,fins);
  nameplate(holder,code,x,y,z+r+.075,Math.min(.68,length*.84),.14,'#a5e8ff');
  return holder;
}

export function addCompressorStageDetail(root) {
  const g=group(root);
  g.name='K-101 / multistage barrel and two interstage coolers';
  g.userData.detailLevel='close-up';
  // The three-stage interpretation is an educational overlay on the
  // original compressor casing, not a verified compressor stage design.
  for(const [x,code] of [[-1.28,'STG-1'],[-.85,'STG-2'],[-.42,'STG-3']]){
    collar(g,x,1.41,0,.63,'x',metal);
    nameplate(g,code,x,1.72,.634,.42,.145,'#d9f0ff');
  }
  // Cooler barrels forward of the original compressor, where they remain
  // visible to the close-up camera without crossing the motor or gas line.
  finnedBarrel(g,'IC-101A',-1.27,1.10,1.65,.91,.205);
  finnedBarrel(g,'IC-101B',-.18,1.10,1.65,.86,.205);
  for(const x of [-1.62,-.93,-.50,.15]){
    box(g,x,.48,1.65,.18,.18,.30,dark);
    box(g,x,.58,1.65,.26,.07,.34,metal);
  }
  // Discrete representative stage tappings (kept independent of the
  // preserved external process suction and final discharge endpoints).
  const first=[
    [-1.34,1.97,.25],[-1.34,2.07,.55],[-1.72,2.07,1.12],
    [-1.72,1.10,1.12],[-1.72,1.10,1.65],
  ];
  const firstReturn=[
    [-.82,1.10,1.65],[-.82,1.67,1.65],[-.82,1.96,.45],
  ];
  const second=[
    [-.72,1.96,.35],[-.72,2.18,.87],[-.61,2.18,1.69],
    [-.61,1.10,1.69],[-.61,1.10,1.65],
  ];
  const secondReturn=[
    [.25,1.10,1.65],[.25,2.05,1.65],
    [-.35,2.05,.47],[-.35,1.94,.25],
  ];
  for(const [name,pts] of [['Stage 1 to intercooler',first],['IC-101A return to stage 2',firstReturn],['Stage 2 to intercooler',second],['IC-101B return to stage 3',secondReturn]]){
    const run=group(g);run.name=name;
    tube(run,pts,.047,blue);
    for(const p of [pts[0],pts.at(-1)])sphere(run,...p,.067,.067,.067,metal);
  }
  // Cooling utility connector pairs are capped service indications,
  // deliberately not a fictitious circulating cooling-water system.
  for(const xx of [-1.27,-.18]){
    for(const dz of [-.24,.24]){
      cyl(g,xx,1.10,1.65+dz,.074,.10,teal,'z',true);
      collar(g,xx,1.10,1.65+dz*1.36,.11,'z',metal);
    }
  }
  for(const xx of [-1.55,-.20]){
    box(g,xx,.62,2.16,.43,.69,.18,dark);
    box(g,xx,.99,2.16,.45,.08,.20,metal);
  }
  nameplate(g,'INTERSTAGE COOLERS',-.72,.64,2.25,1.53,.19,'#d2e9f5');
  return g;
}

export function addPumpDriveDetail(root) {
  const g=group(root);
  g.name='P-201 / drive, electrical and cryogenic-service detailing';
  for(const a of [-1,1]){
    const xx=a*.25;
    const eye=mesh(g,new T.TorusGeometry(.095,.025,8,22),metal,xx,3.36,0);
    eye.rotation.x=Math.PI/2;
    upright(g,xx,0,3.28,3.18);
  }
  // Close-up readable motor fan shroud grille and vertical motor bolts.
  for(let i=0;i<12;i++){
    const a=i*2*Math.PI/12;
    const x=Math.cos(a)*.37,z=Math.sin(a)*.37;
    box(g,x,3.22,z,.055,.07,.055,dark);
    cylinderBolt(g,x,3.24,z);
  }
  // Protected electrical gland: conduit terminates at a secured external
  // junction tray rather than implying a live open cable end.
  tube(g,[[.68,2.94,.05],[.97,2.94,.05],[1.02,2.65,.05],[1.02,2.49,.30]],.037,metal);
  box(g,1.02,2.44,.30,.35,.25,.29,dark);
  box(g,1.02,2.44,.456,.28,.17,.015,blue);
  for(const yy of [1.00,1.38,1.81,2.24]){
    for(const a of [-1,1]){
      cylinderBolt(g,a*.43,yy,0);
    }
  }
  // Body thermal-break gauge block, external tap and dry service seal.
  box(g,-.49,1.61,.35,.17,.19,.20,insul);
  tube(g,[[-.48,1.61,.35],[-.82,1.61,.35],[-.82,1.92,.35]],.028,metal);
  cyl(g,-.82,2.00,.35,.115,.09,white,'z',true);
  box(g,-.82,2.00,.405,.17,.036,.017,blue);
  // Diagonal structural stiffeners at the skid (not exposed rotating parts).
  for(const zz of [-.97,.97]) {
    segment(g,v(1.32,.41,zz),v(.92,1.27,zz),.043,dark);
  }
  nameplate(g,'VACUUM-JACKET SERVICE',.07,.96,.57,1.02,.145,'#bceee2');
  return g;
}

function cylinderBolt(g,x,y,z){cyl(g,x,y,z,.027,.053,metal,'y',true);}

export function addVaporizerDetail(root) {
  const g=group(root);
  g.name='E-202 / high-density ambient-air fins and manifold restraints';
  const fins=[];
  for(const zz of [-1.05,-.35,.35,1.05]){
    for(const xx of [-2.25,-1.62,-.99,-.36,.27,.90,1.53,2.16]){
      // Shared instanced fins, perpendicular to the vertical finned tube.
      for(let j=0;j<7;j++){
        const yy=1.04+j*.25;
        fins.push([xx,yy,zz,.285,.016,.285]);
      }
      // Expanded collars where each vaporizer tube joins its gas headers.
      cyl(g,xx,.82,zz,.104,.09,metal,'y',true);
      cyl(g,xx,2.82,zz,.104,.09,metal,'y',true);
    }
  }
  boxes(g,insul,fins);
  // Fin-bank service platform along the accessible near side.
  box(g,0,.67,1.54,4.84,.07,.41,dark);
  for(const xx of [-2.24,-1.12,0,1.12,2.24]){
    upright(g,xx,1.76,2.02,.70);
    segment(g,v(xx,.88,1.54),v(xx,1.94,1.76),.024,metal);
  }
  box(g,0,2.02,1.76,4.74,.046,.060,metal);
  box(g,0,1.49,1.76,4.74,.032,.043,metal);
  // Headers are not perfectly rigid: visible small expansion/bellows zones
  // on the external service legs, outside the exchanger tube bank.
  for(const [xx,yy] of [[2.77,.83],[-2.77,2.82]]){
    for(let i=0;i<5;i++)
      cyl(g,xx,yy+i*.065,0,.146,.025,metal,'y',true);
  }
  // Instrument isolation block and fixed heat-resistant brackets.
  box(g,2.65,1.07,1.31,.32,.18,.27,dark);
  collar(g,2.65,1.19,1.31,.119,'y',metal);
  for(const xx of [-2.60,2.60]){
    for(const zz of [-1.42,1.42]){
      segment(g,v(xx,.58,zz),v(xx*.90,1.34,zz),.043,metal);
    }
  }
  return g;
}

export function addR101InteriorDetail({inside,modules,turbines,H2,He}) {
  const detail=group(inside);
  detail.name='R-101 / integrated cold-side support and service instrumentation';
  // A cold service bulkhead surrounds the process & helium piping but never
  // creates a false H2/helium mixing link.
  box(detail,-2.80,1.99,-1.27,.10,2.02,.095,dark);
  box(detail,2.80,1.99,-1.27,.10,2.02,.095,dark);
  for(const z of [-1.37,1.36]){
    box(detail,0,.83,z,5.45,.06,.095,metal);
    for(const x of [-2.33,0,2.33])
      box(detail,x,1.04,z,.095,.42,.095,insul);
  }
  for(const [i,item] of modules.slice(0,3).entries()){
    const center=[-1.80,0,1.80][i];
    const own=group(item.obj);
    own.name='HX-'+(201+i)+' / endplate, fins and cold rails';
    const plates=[];
    for(let n=0;n<17;n++){
      const yy=1.075+n*.083;
      plates.push([center,yy,-.979,1.08,.014,.024]);
    }
    boxes(own,insul,plates);
    for(const y of [.95,2.68]){
      box(own,center,y,-.935,1.25,.056,.075,metal);
      for(const xx of [-.48,.48])
        cylinderBolt(own,center+xx,y+.03,-.94);
    }
    box(own,center,.68,-.30,1.05,.075,1.14,dark);
    for(const dx of [-.46,.46]){
      box(own,center+dx,.56,-.32,.14,.28,.20,insul);
    }
    nameplate(own,['HX-201 / WARM','HX-202 / MID','HX-203 / COLD'][i],
      center,2.34,-1.013,1.02,.13,'#c5e5fa');
  }
  for(const t of turbines){
    const x=t.center[0];
    const own=group(t.root);
    own.name='He expander bearing housing and split casing bolts';
    for(const side of [-.34,.34]){
      cyl(own,x+side,1.10,1.02,.30,.075,metal,'x');
      for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
        const y=1.10+Math.cos(angle)*.257,z=1.02+Math.sin(angle)*.257;
        cyl(own,x+side,y,z,.037,.067,dark,'x',true);
      }
    }
    box(own,x,.68,1.43,.75,.115,.17,insul);
    nameplate(own,'He EXPANDER',x,.91,1.41,.69,.13,'#ddc6ff');
  }
  // Supported H2 and helium headers follow the *actual* existing tube
  // coordinates; structural supports must remain with the active circuit
  // so they are hidden in the exploded view alongside the piping.
  for(const [xx,yy,zz] of [[-2.42,1.80,-.60],[-.11,1.80,-.60],[2.30,1.80,-.60]]){
    cyl(H2,xx,yy,zz,.103,.065,blue,'x',true);
    box(H2,xx,1.17,zz,.08,1.21,.10,insul);
  }
  for(const [xx,yy,zz] of [[-2.40,2.79,1.13],[1.25,2.79,1.13],[-1.20,1.78,.19],[1.76,1.78,.19]]){
    cyl(He,xx,yy,zz,.096,.065,metal,'x',true);
    box(He,xx,(yy+.78)/2,zz,.075,yy-.78,.10,dark);
  }
  return detail;
}

export function createLH2AnnulusCutaway(root,mid,r=1.02) {
  const layer=group(root);
  layer.name='TK-301 / open vacuum annulus and inner liquid vessel';
  layer.visible=false;
  const L=3.42, theta=1.16, openArc=2*Math.PI-2*theta;
  // Open-sector outer shell: removes the visitor-facing jacket sector.
  const jacket=mesh(layer,new T.CylinderGeometry(r,r,L,44,1,true,theta,openArc),cutWall,0,mid,0);
  jacket.rotation.z=Math.PI/2;
  const foilJacket=mesh(layer,new T.CylinderGeometry(.91,.91,L-.19,42,1,true,theta+.10,openArc-.20),foil,0,mid,0);
  foilJacket.rotation.z=Math.PI/2;
  for(const sign of [-1,1]){
    const hoop=mesh(layer,new T.RingGeometry(.77,r+.03,48,1,theta,openArc),metal,sign*1.70,mid,0);
    hoop.rotation.y=Math.PI/2;
  }
  // Inner vessel is visibly smaller; transparent illustrative liquid
  // does not claim a calibrated stored liquid quantity.
  cyl(layer,0,mid,0,.745,3.18,innerShell,'x');
  for(const side of [-1,1])sphere(layer,side*1.58,mid,0,.22,.745,.745,innerShell);
  for(const xx of [-1.27,1.27]){
    for(const angle of [Math.PI/3,Math.PI,5*Math.PI/3]){
      const yy=mid+Math.cos(angle)*.83,zz=Math.sin(angle)*.83;
      segment(layer,v(xx,yy,zz),v(xx,mid+Math.cos(angle)*.99,Math.sin(angle)*.99),.036,insul);
    }
    cyl(layer,xx,mid,0,.75,.028,metal,'x');
  }
  const liquid=mesh(layer,new T.CylinderGeometry(.63,.63,2.55,28,1,true),cryoLiquid,0,mid-.15,0);
  liquid.rotation.z=Math.PI/2;
  for(const xx of [-1.02,1.02]){
    tube(layer,[[xx,mid-.73,.17],[xx,mid-.39,.17]],.028,metal);
  }
  // Service inlet physically carries into the inner tank: jacket crossing
  // and thermal-break tube remain visible, no uncapped 'floating' service.
  tube(layer,[[-2.02,1.38,0],[-1.55,1.38,0],[-1.34,mid-.08,0]],.082,blue);
  collar(layer,-1.55,1.38,0,.19,'x');
  nameplate(layer,'INNER VESSEL',0,mid+.20,.755,1.12,.17,'#cef4ff');
  nameplate(layer,'VACUUM ANNULUS',0,mid-.48,.94,1.32,.15,'#f0e6cd');
  return layer;
}

export function addLNGTankDetail(tankGroup,{radius:r,height:h,deckY}) {
  const g=group(tankGroup);
  g.name='TK-201 / penetrations, roof access, level and boil-off services';
  g.userData.detailLevel='close-up';
  const rim=.25+h;
  // Pipe connection matches the original animated quay/pump LNG tie-in at
  // world x=16.47 and world z=5.62 for this tank's fixed coordinate basis.
  const connectX=-.88,connectZ=-.14;
  tube(g,[[connectX,deckY-.14,connectZ],[connectX,deckY+.27,connectZ]],.102,teal);
  collar(g,connectX,deckY+.27,connectZ,.19,'y');
  for(const [x,z] of [[.72,.40],[1.15,-.85]]){
    cyl(g,x,deckY-.085,z,.235,.14,white,'y');
    collar(g,x,deckY+.005,z,.255,'y');
    cyl(g,x,deckY+.15,z,.14,.18,metal,'y',true);
    collar(g,x,deckY+.26,z,.16,'y');
  }
  // Dedicated capped BOG takeoff. Do not imply that this unconnected stub
  // is a rated or complete relief/BOG recovery system.
  tube(g,[[.15,deckY-.18,-.92],[.15,deckY+.36,-.92],[.70,deckY+.36,-.92]],.078,metal);
  collar(g,.70,deckY+.36,-.92,.16,'x');
  nameplate(g,'BOG / CAPPED INTERFACE',.24,deckY+.53,-1.18,1.58,.16,'#cde6f3');
  // Roof service skid and louvered access hatch.
  box(g,.66,deckY+.06,1.01,1.07,.10,.66,dark);
  box(g,.66,deckY+.24,1.01,.81,.27,.54,white);
  for(const zz of [.84,1.01,1.18])
    box(g,.66,deckY+.39,zz,.76,.025,.038,metal);
  for(const xx of [.20,1.10]) {
    box(g,xx,deckY+.06,1.40,.075,.17,.06,metal);
    cylinderBolt(g,xx,deckY+.15,1.40);
  }
  // Readable level instrumentation and local root valve.
  const indicator=group(g,0,.0,0);
  indicator.name='LNG level gauge / schematic';
  const gx=r+.27, gz=.30;
  box(indicator,gx,.25+h*.50,gz,.18,h*.75,.15,dark);
  box(indicator,gx+.098,.25+h*.50,gz,.024,h*.67,.075,teal);
  for(const yy of [.46,.77,1.11,1.43,1.76,2.10,2.45,2.82,3.12]){
    if(yy>.25+h-.15)break;
    box(indicator,gx+.13,yy,gz,.026,.015,.15,white);
  }
  for(const yy of [.73,2.69]){
    const pipeY=Math.min(yy,.25+h-.12);
    tube(g,[[r,pipeY,gz],[gx-.12,pipeY,gz]],.042,metal);
    collar(g,gx-.15,pipeY,gz,.09,'x');
  }
  // Ring of shell cladding restraints, and improved main access landings.
  for(const a of Array.from({length:16},(_,i)=>i*2*Math.PI/16)){
    const xx=Math.sin(a)*(r+.034),zz=Math.cos(a)*(r+.034);
    for(const yy of [.45,.25+h*.48,.25+h*.86]){
      box(g,xx,yy,zz,.053,.11,.08,metal).rotation.y=a;
    }
  }
  const az=r+.30;
  box(g,-r*.44,deckY*.72,az,.85,.075,.52,dark);
  for(const side of [-1,1]){
    const x=-r*.44+side*.36;
    segment(g,v(x,deckY*.72,az+.20),v(x,deckY*.72+.56,az+.20),.026,metal);
  }
  segment(g,v(-r*.80,deckY*.72+.56,az+.20),
    v(-r*.08,deckY*.72+.56,az+.20),.027,metal);
  return g;
}
