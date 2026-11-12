import assert from 'node:assert/strict';
import * as T from 'three';
import {
  industrialCompressor, industrialLNGPump, industrialVaporizer,
  industrialLH2Tank, STAGE3_PORTS,
} from '../src/industrial-equipment.js';
import { createAdvancedColdBox } from '../src/coldbox-assembly.js';
import { addLNGTankDetail, DETAILING_REFERENCE } from '../src/ultimate-detail.js';

// Three.js mesh assembly runs headlessly without relying on a real canvas.
globalThis.document = {
  createElement(){return {getContext(){return null;}};},
};
const root=new T.Group();
const tags=[
  ['K-101',()=>industrialCompressor(root,-11.7,-4.95),
    ['K-101 / multistage barrel and two interstage coolers','IC-101A','IC-101B']],
  ['P-201',()=>industrialLNGPump(root,10.7,5.78),
    ['P-201 / drive, electrical and cryogenic-service detailing']],
  ['E-202',()=>industrialVaporizer(root,-11.55,5.78),
    ['E-202 / high-density ambient-air fins and manifold restraints']],
  ['TK-301',()=>industrialLH2Tank(root,17.3,1.40,-4.95),
    ['TK-301 / removable outer insulation shell','TK-301 / open vacuum annulus and inner liquid vessel']],
];
const models={};
for(const [tag,create,names] of tags){
  const model=create();models[tag]=model;
  assert.equal(model.userData.equipmentTag,tag);
  assert.deepEqual(model.userData.processPorts,STAGE3_PORTS[tag]);
  for(const name of names)assert.ok(model.getObjectByName(name),tag+' missing '+name);
  const list=[];model.traverse(o=>{
    if(o.isMesh||o.isInstancedMesh){
      list.push(o);
      assert.ok(o.position.toArray().every(Number.isFinite),tag+' mesh pos');
      assert.ok(o.scale.toArray().every(Number.isFinite),tag+' mesh scale');
    }
  });
  assert.ok(list.length>75,tag+' model low detail count '+list.length);
  console.log('PASS '+tag+': '+list.length+' renderable objects, verified interface nozzles, named assemblies');
}
const K=models['K-101'];
assert.ok(K.getObjectByName('IC-101A')&&K.getObjectByName('IC-101B'),
  'Both visually separated intercooler barrels must exist');
const LH=models['TK-301'];
assert.equal(LH.userData.sectionView,'shell');
assert.ok(LH.getObjectByName('TK-301 / removable outer insulation shell').visible);
assert.ok(!LH.getObjectByName('TK-301 / open vacuum annulus and inner liquid vessel').visible);
LH.setCutaway('cutaway');
assert.equal(LH.userData.sectionView,'cutaway');
assert.ok(!LH.getObjectByName('TK-301 / removable outer insulation shell').visible);
assert.ok(LH.getObjectByName('TK-301 / open vacuum annulus and inner liquid vessel').visible);
LH.setCutaway('shell');
assert.equal(LH.userData.sectionView,'shell');
const r=createAdvancedColdBox(root,9.25,-4.95);
assert.ok(r.inside.getObjectByName('R-101 / integrated cold-side support and service instrumentation'));
for(const name of ['HX-201 / endplate, fins and cold rails',
                   'HX-202 / endplate, fins and cold rails',
                   'HX-203 / endplate, fins and cold rails']){
  assert.ok(r.inside.getObjectByName(name),'Missing R-101 detailed exchanger '+name);
}
r.setView('cutaway');r.setStream('he');assert.ok(!r.paths.h2.visible&&r.paths.he.visible);
r.setView('exploded');assert.ok(!r.plumbing.visible,'Process piping must hide when internally disconnected');
r.setView('shell');assert.ok(r.shell.visible&&!r.inside.visible,'R101 display modes regressed');
const lngRoot=new T.Group();
const tank=addLNGTankDetail(lngRoot,{radius:2.45,height:3.28,deckY:4.13});
assert.equal(tank.name,'TK-201 / penetrations, roof access, level and boil-off services');
let meshes=0;lngRoot.traverse(o=>{if(o.isMesh||o.isInstancedMesh)meshes++;});
assert.ok(meshes>40,'LNG storage package missing access/penetrations '+meshes);
assert.ok(Object.values(DETAILING_REFERENCE).every(v=>typeof v==='string'));
console.log('PASS: LH2 cutaway, cryogenic internals, LNG roof and port preservation; all conceptual basis labels');
