import assert from 'node:assert/strict';
import * as T from 'three';
import { industrialCompressor, industrialLNGPump, industrialVaporizer, industrialLH2Tank, STAGE3_PORTS, INDUSTRIAL_REFERENCE } from '../src/industrial-equipment.js';
// Use exported industrial implementations directly; the browser build checks
// that the existing plant-equipment wrappers correctly import this module.
const compressor=industrialCompressor, lngPump=industrialLNGPump,
  vaporizer=industrialVaporizer, lh2Tank=industrialLH2Tank;

// No live canvas needed to build the Node-side geometry.
globalThis.document={createElement(){return {getContext(){return null;}};}};
const positions = [
  ['K-101',compressor,-11.7,-4.95,2],
  ['P-201',lngPump,10.7,5.78,2],
  ['E-202',vaporizer,-11.55,5.78,2],
  ['TK-301',lh2Tank,17.3,-4.95,1],
];
const root=new T.Group();
function snapshot(g){
  let meshes=0,instruments=0,actuators=0,geometryFinite=true,shadow=0;
  g.traverse(obj=>{
    if(obj.isMesh||obj.isInstancedMesh){
      meshes++;shadow+=obj.castShadow?1:0;
      if(![...obj.position.toArray(),...obj.scale.toArray()].every(Number.isFinite))geometryFinite=false;
      if(obj.geometry?.boundingSphere===null)obj.geometry?.computeBoundingSphere?.();
    }
    if(obj.userData?.instrument)instruments++;
    if(obj.userData?.component?.includes('Actuated'))actuators++;
  });
  return {meshes,instruments,actuators,geometryFinite,shadow};
}
const spec={
  'K-101': {minMeshes:190,minInstruments:2,minActuators:1},
  'P-201': {minMeshes:50,minInstruments:2,minActuators:1},
  'E-202': {minMeshes:50,minInstruments:2,minActuators:1},
  'TK-301': {minMeshes:50,minInstruments:2,minActuators:0},
};
for(const [tag,create,x,z,portCount] of positions){
  const g=create(root,x,z);
  assert.equal(g.userData.equipmentTag,tag);
  assert.deepEqual(g.position.toArray(),[x,0,z]);
  const ports=g.userData.processPorts;
  assert.equal(ports.length,portCount,tag);
  assert.deepEqual(ports,STAGE3_PORTS[tag]);
  const n=snapshot(g);
  assert.ok(n.meshes>=spec[tag].minMeshes,tag+' not enough mechanical detail '+JSON.stringify(n));
  assert.ok(n.instruments>=spec[tag].minInstruments,tag+' instruments '+JSON.stringify(n));
  assert.ok(n.actuators>=spec[tag].minActuators,tag+' actuators '+JSON.stringify(n));
  assert.ok(n.geometryFinite,tag+' has nonfinite transforms');
  console.log('PASS',tag,n.meshes,'meshes',n.instruments,'instruments',n.actuators,'actuators');
}
const endpoints=[
  ['K-101',[[-13.77,1.38,-4.95],[-9.75,1.38,-4.95]]],
  ['P-201',[[10.70,.94,5.25],[8.70,1.38,5.78]]],
  ['E-202',[[-8.59,1.38,5.78],[-14.51,1.38,5.78]]],
  ['TK-301',[[15.28,1.38,-4.95]]],
];
for(const [tag,worlds] of endpoints){
  const item=root.children.find(x=>x.userData.equipmentTag===tag);
  assert.ok(item,'Missing '+tag);
  for(const [i,p] of item.userData.processPorts.entries()){
    const actual=v3add(item.position.toArray(),p.point);
    assert.ok(actual.every((v,j)=>Math.abs(v-worlds[i][j])<1e-8),
      tag+' '+p.name+': '+actual+' != '+worlds[i]);
  }
}
function v3add(a,b){return a.map((x,i)=>x+b[i]);}
assert.ok(INDUSTRIAL_REFERENCE.restrictions.length>=3,'Document mechanical boundary');
console.log('PASS industrial detailing and preserved existing plant nozzle interface points');
