import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { softwareRenderer } from './software.js';

const BLUE=0x44bbf7, MINT=0x4ce1b2, GOLD=0xffb161;
const v=(x,y,z)=>new T.Vector3(x,y,z);
const material=(color,metalness=.29,roughness=.54)=>new T.MeshStandardMaterial({color,metalness,roughness});
const steel=material(0x9aaebf,.77,.30), ice=material(0xe1ebf3,.44,.36);
const trim=material(0x3c536a,.68,.39), dark=material(0x263949,.4,.65);
const seaWall=material(0x5f6c74,.04,.87), road=material(0x2f4150,.05,.9);
const slab=material(0x81909c,.05,.94), white=material(0xf3e7d1,.1,.65);
const blue=material(BLUE,.43,.31), mint=material(MINT,.40,.34), gold=material(GOLD,.55,.36);
const pipeBlue=material(0x236794,.7,.37),pipeMint=material(0x267e70,.65,.39);
const gray=material(0x446173,.42,.55), mutedPipe=material(0x465463,.49,.59);
const pickers=[];
const unitBox=new T.BoxGeometry(1,1,1);
const ball=new T.SphereGeometry(1,26,14);
const cylinder=new T.CylinderGeometry(1,1,1,36,1);
const tinyCylinder=new T.CylinderGeometry(1,1,1,12,1);

function mesh(parent,geometry,mat,x,y,z){
  const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;
}
function box(g,x,y,z,w,h,d,mat){
  const m=mesh(g,unitBox,mat,x,y,z);m.scale.set(w,h,d);return m;
}
function sphere(g,x,y,z,sx,sy,sz,mat){
  const m=mesh(g,ball,mat,x,y,z);m.scale.set(sx,sy,sz);return m;
}
function cyl(g,x,y,z,r,h,mat,axis='y',small=false){
  const m=mesh(g,small?tinyCylinder:cylinder,mat,x,y,z);m.scale.set(r,h,r);
  if(axis==='x')m.rotation.z=Math.PI/2;
  if(axis==='z')m.rotation.x=Math.PI/2;
  return m;
}
function segment(g,a,b,r,mat){
  const m=mesh(g,tinyCylinder,mat,0,0,0);
  m.position.copy(a).lerp(b,.5);m.scale.set(r,a.distanceTo(b),r);
  m.quaternion.setFromUnitVectors(v(0,1,0),b.clone().sub(a).normalize());return m;
}
function group(g,x=0,y=0,z=0){const k=new T.Group();k.position.set(x,y,z);g.add(k);return k;}
function edgeBox(g,x,y,z,w,h,d,fill,outline=0xabbcca){
  const m=box(g,x,y,z,w,h,d,fill);
  const edge=new T.LineSegments(new T.EdgesGeometry(unitBox),new T.LineBasicMaterial({color:outline,transparent:true,opacity:.32}));
  m.add(edge);return m;
}
function flange(g,x,y,z,r,axis,mat=steel){
  cyl(g,x,y,z,r,.13,mat,axis,true);
  if(axis==='x')for(let i=0;i<8;i++){let a=i*Math.PI/4;cyl(g,x,y+Math.sin(a)*r*.77,z+Math.cos(a)*r*.77,.046,.17,trim,'x',true);}
}
function rail(g,x1,z1,x2,z2,y=.12){
  const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/1.2);
  for(let i=0;i<=n;i++){const f=i/n;cyl(g,x1+(x2-x1)*f,y+.48,z1+(z2-z1)*f,.035,.95,gold,'y',true);}
  for(const h of [.45,.91])segment(g,v(x1,y+h,z1),v(x2,y+h,z2),.026,gold);
}
function pad(g,x,z,w,d){
  box(g,x,.035,z,w,.15,d,seaWall).renderOrder=1;box(g,x,.12,z,w-.12,.035,d-.12,slab).renderOrder=1;
  for(const k of [-1,1])box(g,x+k*(w/2-.085),.147,z,.037,.018,d-.24,white);
}
function pick(g,id,x,y,z,w,h,d){
  const o=box(g,x,y,z,w,h,d,new T.MeshBasicMaterial({visible:false}));
  o.userData.equipment=id;pickers.push(o);
}
function tank(g,x,z,r,h,accent){
  const k=group(g,x,0,z);
  cyl(k,0,.14,0,r+.24,.28,trim);
  cyl(k,0,.3+h/2,0,r,h,ice);
  sphere(k,0,h+.28,0,r,.54,r,ice);
  for(const y of [.43,h*.51+.25,h+.28])cyl(k,0,y,0,r+.035,.075,steel);
  cyl(k,0,.91,0,r+.024,.18,accent);
  cyl(k,0,h+.8,0,.38,.14,steel);
  cyl(k,0,h+1.07,0,.108,.48,steel);
  for(const x0 of [-.17,.17])segment(k,v(x0,.29,r+.07),v(x0,h+.54,r+.07),.028,gold);
  for(let j=.38;j<h+.52;j+=.23)segment(k,v(-.17,j,r+.07),v(.17,j,r+.07),.021,gold);
  for(let j=0;j<12;j++){
    const a=j*Math.PI/6;cyl(k,r*.72*Math.cos(a),h+.75,r*.72*Math.sin(a),.021,.34,gold,'y',true);
    const b=a+Math.PI/6;segment(k,v(r*.72*Math.cos(a),h+.91,r*.72*Math.sin(a)),v(r*.72*Math.cos(b),h+.91,r*.72*Math.sin(b)),.018,gold);
  }
  return k;
}
function horizontalVessel(g,x,y,z,r,len,accent,axis='x'){
  cyl(g,x,y,z,r,len,ice,axis);
  if(axis==='x'){
    for(const end of [-1,1]){
      sphere(g,x+len/2*end,y,z,r*.52,r,r,ice);
      cyl(g,x+len*.35*end,y,z,r+.037,.16,trim,'x');
      box(g,x+len*.35*end,.34,z,.32,.59,r*1.48,trim);
    }
    cyl(g,x,y,z,r+.03,.24,accent,'x');
  }else{
    for(const end of [-1,1]){
      sphere(g,x,y,z+len/2*end,r,r,r*.52,ice);
      cyl(g,x,y,z+len*.35*end,r+.037,.15,trim,'z');
      box(g,x,.34,z+len*.35*end,r*1.48,.59,.32,trim);
    }
    cyl(g,x,y,z,r+.03,.24,accent,'z');
  }
}
function compressor(g,x,z,r,accent){
  pad(g,x,z,4.8,3.05);
  box(g,x,.37,z,4.05,.43,2.14,trim);
  cyl(g,x-.67,1.31,z,r,1.5,steel,'x');
  cyl(g,x+.73,1.31,z,r*.72,1.23,accent,'x');
  for(let i=0;i<8;i++)cyl(g,x+.18+i*.14,1.31,z,r*.75,.037,steel,'x',true);
  flange(g,x-1.49,1.31,z,r*.94,'x');flange(g,x+1.39,1.31,z,r*.64,'x');
  cyl(g,x-1.74,1.31,z,.25,.6,steel,'x');
  cyl(g,x+1.65,1.31,z,.24,.6,steel,'x');
  box(g,x+.21,1.03,z+.8,.52,.73,.55,trim);
  for(const u of [-1,1])box(g,x+u*1.02,.72,z,.42,.55,.83,steel);
}
function vaporizer(g,x,z){
  pad(g,x,z,6.0,4.35);
  for(const col of [-1,1]){
    const k=x+col*1.34;
    box(g,k,.45,z,2.4,.31,3.58,trim);
    for(let i=0;i<8;i++)for(const n of [-1,1]){
      const xx=k+(i-3.5)*.266, zz=z+n*.57;
      cyl(g,xx,1.63,zz,.09,2.48,steel,'y',true);
      for(const d of [-1,1]){box(g,xx,1.63,zz+d*.069,.23,2.37,.031,ice);box(g,xx+d*.063,1.63,zz,.024,2.37,.21,ice);}
    }
    box(g,k,2.91,z,2.39,.18,2.05,trim);
    box(g,k,2.95,z+1.09,2.28,.14,.14,mint);
  }
}
function coldBox(g,x,z){
  pad(g,x,z,7.5,5.4);
  const shell=group(g), inside=group(g);
  edgeBox(shell,x,1.46,z,5.9,2.64,3.44,ice,0xf2f8ff);
  box(shell,x,2.85,z,6.02,.16,3.53,trim);
  box(g,x,.61,z,6,.19,3.53,blue);
  for(let i=0;i<13;i++)box(shell,x+(i-6)*.438,1.82,z+1.741,.045,1.85,.08,steel);
  for(const i of [-1,1]){
    cyl(shell,x+i*1.68,3.14,z,.45,.5,steel);
    cyl(shell,x+i*1.68,3.47,z,.27,.27,trim);
    box(g,x+i*2.2,.34,z+.99,.5,.39,.46,trim);
  }
  box(inside,x,.39,z,5.95,.34,3.4,trim);
  box(inside,x,1.5,z-1.63,5.95,2.38,.16,trim);
  for(const i of [-1,1])box(inside,x+i*2.92,1.5,z,.12,2.38,3.38,trim);
  for(const [cx,accent] of [[x-1.85,blue],[x+1.83,steel]]){
    for(let j=0;j<8;j++)box(inside,cx,1.39,z+(j-3.5)*.24,1.12,1.53,.09,accent);
    for(const zz of [-.99,.99])box(inside,cx,1.39,z+zz,1.24,1.62,.12,steel);
    for(const yy of [.68,2.13])box(inside,cx,yy,z,1.30,.13,2.12,trim);
  }
  horizontalVessel(inside,x,1.31,z+.61,.41,1.42,gold);
  for(const xx of [x-.56,x+.56])flange(inside,xx,1.31,z+.61,.47,'x');
  inside.visible=false;
  for(let i=0;i<3;i++){const zz=z+1.94+i*.17;box(g,x-1.48,.45,zz,2.33,.1,.14,steel);}
  const sepX=x+3.25, sepZ=z+1.85;
  cyl(g,sepX,.86,sepZ,.42,1.12,ice);sphere(g,sepX,1.43,sepZ,.42,.23,.42,ice);
  cyl(g,sepX,.74,sepZ,.45,.14,blue);
  for(const dx of [-.25,.25])box(g,sepX+dx,.20,sepZ,.12,.41,.13,steel);
  return {shell,inside,flow:route(inside,[[x-2.88,1.38,z],[x-1.85,1.38,z],[x-1.85,1.38,z+.61],[x+1.83,1.38,z+.61],[x+1.83,1.38,z],[x+2.94,1.38,z]],pipeBlue,BLUE,11,.07,.63)};
}
function ship(g){
  const k=group(g,11.3,-.34,14.95);
  const hull=new T.Shape();
  hull.moveTo(-8.7,-1.37);hull.lineTo(5.9,-1.37);hull.quadraticCurveTo(8.3,-1.17,9.55,0);
  hull.quadraticCurveTo(8.32,1.17,5.9,1.37);hull.lineTo(-8.7,1.37);hull.quadraticCurveTo(-9.3,1.05,-9.32,0);hull.quadraticCurveTo(-9.3,-1.05,-8.7,-1.37);
  const h=mesh(k,new T.ExtrudeGeometry(hull,{depth:1.0,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.11,bevelThickness:.13,curveSegments:14}),material(0x283b52,.33,.41),0,-.34,0);
  h.rotation.x=-Math.PI/2;h.renderOrder=1;
  const deck=mesh(k,new T.ShapeGeometry(hull),material(0x3e706b,.18,.66),0,.78,0);deck.rotation.x=-Math.PI/2;deck.renderOrder=1;
  box(k,-7.12,1.42,0,2.35,1.24,2.38,ice);box(k,-7.15,2.17,0,2.45,.30,2.52,ice);box(k,-6.03,2.16,0,.055,.16,2.23,trim);
  for(const z of [-1.204,1.204]){
    box(k,-7.16,1.83,z,1.74,.19,.045,trim);
    for(const x of [-7.68,-7.27,-6.86,-6.45])box(k,x,1.83,z,.045,.16,.050,steel);
  }
  box(k,-7.93,2.43,0,.36,.36,.44,trim);
  box(k,-7.92,2.62,0,.40,.065,.49,steel);
  cyl(k,-7.3,2.77,0,.057,1,steel);box(k,-7.28,3.21,0,.74,.06,.09,ice);
  for(const x of [-4.5,-1.2,2.1,5.4]){
    cyl(k,x,.92,0,1.22,.3,trim);sphere(k,x,1.04,0,1.13,1.00,1.13,ice);
    cyl(k,x,1.11,0,1.146,.06,mint);cyl(k,x,2.07,0,.1,.19,trim);
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
}
function lights(g){
  for(const [x,z] of [[-20,-8],[0,-8],[20,-8],[-20,9],[20,9]]){
    cyl(g,x,1.66,z,.055,3.28,steel,'y',true);
    box(g,x,3.32,z,.58,.10,.19,steel);box(g,x,3.27,z,.39,.045,.12,new T.MeshBasicMaterial({color:0xffe5b1}));
  }
}
function ground(scene){
  const g=group(scene);
  box(g,0,-.9,0,45,1.34,21.7,seaWall).renderOrder=4;
  box(g,0,-.22,0,45.1,.28,21.76,slab).renderOrder=3;
  box(g,0,-.066,0,43.1,.035,18.7,road).renderOrder=2;
  for(const z of [-9.5,9.5]){
    box(g,0,-.028,z,43.5,.018,.048,white);
    for(let i=-20;i<=20;i+=2)box(g,i,-.021,z*.91,.92,.018,.028,slab);
  }
  for(const x of [-21.8,21.8])box(g,x,-.025,0,.047,.026,19,white);
  for(let x=-21.7;x<=21.7;x+=1.4){
    box(g,x,-.14,10.96,.28,.25,.30,trim);
    box(g,x,-.92,10.94,.38,.80,.31,trim);
  }
  box(g,10.4,-.13,11.83,16.8,.41,1.88,slab).renderOrder=2;
  for(const x of [3.3,6.8,11.2,15.5,18.1]){
    box(g,x,-.38,12.83,.46,.68,.19,dark);
    cyl(g,x,.14,12.47,.10,.19,gold,'y',true);
  }
  for(const x of [5.0,9.4,13.7,17.8]){
    box(g,x,.085,11.87,1.24,.032,.15,white);
    box(g,x,.124,12.22,.26,.13,.23,trim);
  }
  for(const x of [3.2,7,11,15,18])cyl(g,x,-.89,12.35,.14,1.1,trim,'y',true);
  rail(g,-21.2,-10.1,21.2,-10.1,-.02);
  rail(g,-21.5,10,-5.8,10,-.02);
  rail(g,19,10,21.5,10,-.02);
  lights(g);
  return g;
}
function makeWater(scene){
  const wave=new T.ShaderMaterial({
    uniforms:{uTime:{value:0}},
    vertexShader:`varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform float uTime; varying vec2 p;
      void main(){
        float a=sin(p.x*2.85+p.y*2.15+uTime*.70);
        float b=sin(p.x*.82-p.y*3.21-uTime*.45);
        float c=sin(p.x*.68+p.y*1.16+sin(p.y*.68)*.7-uTime*.65);
        float rip=pow(max(0.,a*.40+b*.32+c*.28),7.);
        float sw=sin(p.x*.24+p.y*.1)*.5+.5;
        vec3 color=mix(vec3(.037,.085,.145),vec3(.102,.224,.322),sw*.68);
        float harbor=exp(-length((p-vec2(10.,-12.))*vec2(.054,.12)));
        gl_FragColor=vec4(color+vec3(.10,.19,.23)*rip*.68+vec3(.05,.08,.085)*harbor,1.0);
      }`,
  });
  const m=mesh(scene,new T.PlaneGeometry(390,390),wave,0,-1.03,0);m.rotation.x=-Math.PI/2;
  return wave;
}
function shadow(g,x,z,w,d){
  const c=document.createElement('canvas');c.width=64;c.height=64;
  const ctx=c.getContext('2d');const gradient=ctx.createRadialGradient(32,32,5,32,32,32);
  gradient.addColorStop(0,'rgba(6,12,18,.48)');gradient.addColorStop(1,'rgba(6,12,18,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const tex=new T.CanvasTexture(c);
  const m=mesh(g,new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),x,.153,z);
  m.rotation.x=-Math.PI/2;
}
function terminal(scene){
  const g=ground(scene);
  for(const [x,z,w,d] of [[-12,-4,6,4],[-10,5.8,7,5],[0,0,10,8],[9,-4,9,6],[17,5,9,7],[17,-4,7,5]])shadow(g,x,z,w,d);
  pad(g,16.5,5.86,9,6.3);
  tank(g,17.35,5.76,2.45,3.28,mint);
  tank(g,20,2.92,1.18,2.48,mint);
  compressor(g,10.7,5.78,.57,mint);
  vaporizer(g,-11.55,5.78);
  compressor(g,-11.7,-4.95,.79,blue);
  pad(g,-18.12,-4.95,4,3.16);
  horizontalVessel(g,-18.12,.98,-4.95,.60,2.23,blue);
  const refrigeration=coldBox(g,9.25,-4.95);
  pad(g,17.6,-4.95,6,4.46);
  horizontalVessel(g,17.3,1.13,-4.95,1.02,3.45,blue);
  tank(g,20,-5.16,.72,1.96,blue);
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
  ship(g);
  const arm=group(g,14.4,0,10.82);
  box(arm,0,.17,0,1.1,.34,1.08,trim);
  const armPoints=[v(0,.32,0),v(0,3.25,0),v(0,4.23,.84),v(0,3.15,2.26),v(0,1.76,2.78)];
  for(let j=1;j<armPoints.length;j++)segment(arm,armPoints[j-1],armPoints[j],.115,gold);
  for(const p of armPoints.slice(1,-1))sphere(arm,p.x,p.y,p.z,.155,.155,.155,steel);
  const dockPipe=[[14.4,.86,13.6],[14.4,1.76,13.60],[14.4,3.15,13.08],[14.4,4.23,11.66],[14.4,3.25,10.82],[14.4,.68,10.82],[14.4,.68,8.65],[17.35,.68,8.65],[17.35,.68,7.92]];
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
  return {g,refrigeration,dockFlow};
}
function exchanger(g){
  const k=group(g);
  pad(k,0,0,8.6,6.55);
  for(const x of [-2.8,2.8])for(const z of [-1.37,1.37])box(k,x,.34,z,.6,.64,.59,trim);
  box(k,0,.72,0,7.05,.31,3.95,trim);
  const casing=group(k);
  edgeBox(casing,0,1.84,0,6.92,1.95,3.52,ice,0xe6f1f7);
  box(casing,0,2.865,0,7.06,.13,3.64,steel);
  for(let i=0;i<10;i++)box(casing,(i-4.5)*.67,2.96,0,.10,.10,3.54,steel);
  for(const z of [-1.778,1.778])box(casing,0,1.22,z,6.78,.17,.12,z<0?blue:mint);
  const core=group(k);
  const stack=[];
  const cutSteel=material(0x91a9bf,.61,.37), fins=material(0x485f76,.56,.48);
  for(let i=0;i<7;i++){
    const base=1.03+i*.31;
    const layer=group(core,0,base,0), channel=group(layer);
    const fluid=i%2===0?'h2':'lng', forward=fluid==='h2';
    const col=forward?blue:mint;
    box(layer,0,0,0,6.45,.063,2.97,cutSteel);
    for(const z of [-1.42,1.42])box(layer,0,.092,z,6.38,.16,.115,steel);
    for(let j=0;j<7;j++){
      const zz=(j-3)*.39;
      box(layer,0,.05,zz,6.15,.045,.24,fins);
      box(channel,0,.079,zz,6.13,.065,.16,col);
    }
    for(const x of [-3.05,3.05])box(channel,x,.09,0,.22,.13,2.69,col);
    const passage=route(channel,forward?[[-2.8,.22,.06],[2.8,.22,.06]]:[[2.8,.22,.06],[-2.8,.22,.06]],col,forward?BLUE:MINT,7,0,.61);
    stack.push({layer,channel,base,fluid,passage});
  }
  for(const x of [-3.38,3.38]){
    box(k,x,1.84,0,.20,2.0,3.63,steel);
    for(const z of [-1.02,1.02]){
      cyl(k,x+(x>0?.22:-.22),1.38,z,.34,.42,steel,'x');
      flange(k,x+(x>0?.38:-.38),1.38,z,.41,'x');
    }
  }
  return {casing,core,stack};
}
function route(g,pts,mat,color,count=34,radius=.103,markerScale=1){
  const p=pts.map(x=>v(...x));const curve=new T.CurvePath(), pipes=[];
  for(let i=1;i<p.length;i++){
    curve.add(new T.LineCurve3(p[i-1],p[i]));
    if(radius){
      pipes.push(segment(g,p[i-1],p[i],radius,mat));
      if(i<p.length-1)pipes.push(sphere(g,p[i].x,p[i].y,p[i].z,radius,radius,radius,mat));
    }
  }
  const glow=new T.InstancedMesh(new T.SphereGeometry(.134*markerScale,9,6),new T.MeshBasicMaterial({color}),count);
  glow.frustumCulled=false;g.add(glow);
  const arrows=new T.InstancedMesh(new T.ConeGeometry(.18*markerScale,.38*markerScale,8),new T.MeshBasicMaterial({color}),Math.max(1,Math.floor(count/7)));
  arrows.frustumCulled=false;g.add(arrows);
  return {curve,glow,arrows,count,pipes,mat,fluid:color===BLUE?'h2':'lng'};
}
function stageRoutes(scene){
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
    route(common,[[-16.62,y,zH],[-13.77,y,zH]],pipeBlue,BLUE,9),
    route(common,[[12.2,y,zH],[12.5,y,zH],[12.5,y,zH+1.45]],pipeBlue,BLUE,6),
    route(common,[[12.5,.73,zH+2.29],[14.33,.73,zH+2.29],[14.33,.73,zH],[14.33,y,zH],[15.28,y,zH]],pipeBlue,BLUE,11),
    route(common,[[15.20,y,zL],[12.68,y,zL]],pipeMint,MINT,9),
    route(common,[[-14.51,y,zL],[-16.54,y,zL]],pipeMint,MINT,9),
  ];
  return {assisted,standalone,a,s,c};
}
const views={
  overview:{look:[0,0,1.9],offset:[21,25,36],scale:1},
  dispatch:{look:[0,-3.7,2.2],offset:[20,26,36],scale:.90},
  lng:{look:[10.8,1.0,8.25],offset:[15,15,25],scale:1.88},
  dock:{look:[12.2,1.22,12.55],offset:[17.8,9.8,24.2],scale:2.28},
  mechanical:{look:[-.2,.82,-7.08],offset:[9.6,14,25],scale:2.44},
  bypass:{look:[-2.6,.82,6.55],offset:[14,15,25],scale:1.54},
  exchange:{look:[0,1.24,0],offset:[10.2,9.7,17.3],scale:3.35},
  deep:{look:[12.25,1.12,-4.55],offset:[8,12,24],scale:3.12},
  feed:{look:[-14.7,1,-4.95],offset:[-8,11,20],scale:2.8},
  trim:{look:[-13.25,1,5.75],offset:[-10,11,19],scale:2.7},
  pump:{look:[11.5,1.0,5.78],offset:[10,9,19],scale:2.85},
  liquid:{look:[17,1,-4.8],offset:[10,9,20],scale:3.05},
};
const anchor={
  feed:v(-15.1,2.24,-4.95),lng:v(17.35,5.0,5.76),pump:v(10.5,2.23,5.76),
  exchange:v(0,3.2,0),trim:v(-11.55,3.33,5.78),deep:v(8.8,3.95,-4.95),
  liquid:v(17.3,2.75,-4.95),grid:v(-18.35,2.01,5.78),
  dock:v(14.4,4.45,11.66),cryo:v(7.28,2.62,-4.72),catalyst:v(9.22,1.77,-4.34),separator:v(12.5,1.66,-3.10),
};
const visibleLabels={
  overview:['feed','lng','exchange','trim','deep','liquid'],
  dispatch:['feed','lng','exchange','trim','deep','liquid'],
  lng:['lng','pump','trim','grid'],exchange:['exchange'],deep:['deep','liquid','cryo','catalyst','separator'],
  feed:['feed'],trim:['trim','grid'],pump:['pump','lng'],liquid:['liquid'],
  dock:['dock','lng'],mechanical:['feed','deep'],bypass:['trim','pump'],
};

export function createPlant(target, labelLayer, choose, reduced){
  const scene=new T.Scene();scene.background=new T.Color(0x1a2d3d);
  const camera=new T.OrthographicCamera(-30,30,19,-19,.05,350);
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance',alpha:false});
  const renderer=context?new T.WebGLRenderer({canvas,context,antialias:true}):softwareRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  if(context){
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;
    const pmrem=new T.PMREMGenerator(renderer), environment=new RoomEnvironment();
    scene.environment=pmrem.fromScene(environment,.06).texture;scene.environmentIntensity=.55;
    environment.dispose();pmrem.dispose();
  }
  renderer.domElement.setAttribute('aria-label','Interactive 3D plant. Drag to orbit and scroll or pinch to zoom.');
  target.appendChild(renderer.domElement);
  const ambient=new T.HemisphereLight(0xf4fbff,0x5c6880,2.4);scene.add(ambient);
  const key=new T.DirectionalLight(0xffe2bd,2.55);key.position.set(-16,31,9);scene.add(key);
  const fill=new T.DirectionalLight(0x8bd7ff,1.55);fill.position.set(10,13,-26);scene.add(fill);
  const water=context?makeWater(scene):null;
  const {g,refrigeration,dockFlow}=terminal(scene);
  const {casing,core,stack}=exchanger(g);
  const routes=stageRoutes(scene);
  const mainRoutes=[...routes.c,...routes.a,...routes.s,dockFlow];
  const mechanical=group(g);
  horizontalVessel(mechanical,-1.24,1.38,-7.08,.48,3.06,blue);
  mechanical.visible=false;
  routes.standalone.visible=false;
  const thermal=group(scene), heatAcross=group(thermal), heatBetween=group(thermal);
  const amberArrow=new T.MeshBasicMaterial({color:GOLD});
  for(let i=0;i<5;i++){
    const x=-2.4+1.2*i;
    segment(heatAcross,v(x,0,-.81),v(x,0,.82),.046,gold);
    const m=mesh(heatAcross,new T.ConeGeometry(.12,.28,10),amberArrow,x,0,.87);
    m.rotation.x=Math.PI/2;
  }
  for(const x of [-1.7,.2,2.1]){
    segment(heatBetween,v(x,0,1.57),v(x,-.53,1.57),.043,gold);
    const arrow=mesh(heatBetween,new T.ConeGeometry(.105,.23,10),amberArrow,x,-.59,1.57);
    arrow.rotation.z=Math.PI;
  }
  thermal.visible=false;
  pick(g,'dock',14.4,1.9,12.2,2.2,4.2,3.4);
  pick(g,'feed',-13.55,1.15,-4.95,10,2.35,3.5);
  pick(g,'lng',17.8,1.98,5.3,7.3,4.75,5.8);
  pick(g,'pump',10.7,.9,5.78,4.3,1.9,2.5);
  pick(g,'exchange',0,1.55,0,7.5,2.98,3.92);
  pick(g,'trim',-11.55,1.5,5.78,5.8,3.0,4.1);
  pick(g,'deep',9.25,1.52,-4.95,6.5,3.1,3.85);
  pick(g,'liquid',17.4,1.3,-4.95,6.2,2.8,4.25);
  pick(g,'grid',-18.2,.8,5.78,4.1,1.6,2.8);
  scene.updateMatrixWorld(true);

  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=!reduced;controls.dampingFactor=.12;controls.minPolarAngle=.006;controls.maxPolarAngle=Math.PI*.47;
  controls.minZoom=.49;controls.maxZoom=6.5;
  let active='overview', tween=null, flow=true, labels=true, mode='integrated', available=.78;
  let coreView='cutaway', stream='both', trace='both', deepView='cutaway', cameraView='iso', projection=false, spread=0;
  let last=performance.now(), travel=0, compact=false, dimensions={width:1,height:1};
  const tmp=new T.Object3D(), up=v(0,1,0), point=v(0,0,0), projected=v(0,0,0);
  const buttons=new Map([...labelLayer.querySelectorAll('button')].map(b=>[b.dataset.equipment,b]));
  const ray=new T.Raycaster(), mouse=new T.Vector2();let down=null;
  function updateVisibility(){
    const opened=active==='exchange'&&coreView!=='shell';
    const live=mode==='integrated'&&available>0;
    const passageFocus=trace==='both'?stream:trace;
    casing.visible=!opened;core.visible=opened;
    thermal.visible=opened&&live&&passageFocus==='both';
    refrigeration.inside.visible=active==='deep'&&deepView==='cutaway';
    refrigeration.shell.visible=!refrigeration.inside.visible;
    for(const {channel,fluid,passage} of stack){
      channel.visible=passageFocus==='both'||passageFocus===fluid;
      passage.glow.visible=flow&&live;passage.arrows.visible=flow&&live;
    }
    const coldFlow=flow&&trace!=='lng';
    refrigeration.flow.glow.visible=coldFlow;refrigeration.flow.arrows.visible=coldFlow;
    for(const circuit of mainRoutes){
      const highlighted=trace==='both'||trace===circuit.fluid;
      const unloading=circuit!==dockFlow||active==='dock';
      const starved=available<=0&&circuit.fluid==='lng'&&routes.a.includes(circuit);
      circuit.glow.visible=flow&&highlighted&&unloading&&!starved;
      circuit.arrows.visible=circuit.glow.visible;
      for(const pipe of circuit.pipes)pipe.material=highlighted?circuit.mat:mutedPipe;
    }
  }
  function focus(key, immediate=false, duration=900){
    active=views[key]?key:'overview';
    const view=views[active];
    const exploded=active==='exchange'&&coreView==='exploded';
    const look=v(...view.look);
    if(exploded&&cameraView!=='plan')look.y=2.76;
    const offset=cameraView==='plan'?v(.02,40,.21):v(...view.offset);
    const position=look.clone().add(offset);
    const fit=dimensions.width/dimensions.height;
    const zoom=(exploded?2.86:view.scale)*Math.min(1,fit/(['overview','dispatch'].includes(active)?1.54:1.10));
    updateVisibility();
    if(immediate || reduced){camera.position.copy(position);controls.target.copy(look);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update();tween=null;}
    else{tween={position,look,zoom,duration,start:performance.now(),from:camera.position.clone(),target:controls.target.clone(),fromZoom:camera.zoom};}
  }
  function frameViewport(){
    const aspect=dimensions.width/dimensions.height;
    const shift=projection&&dimensions.width>800?.18:0;
    camera.left=-19*aspect*(1+shift);camera.right=19*aspect*(1-shift);
    camera.updateProjectionMatrix();
  }
  function resize(){
    const {width,height}=target.getBoundingClientRect();
    if(!width || !height)return;
    const first=dimensions.width===1;
    dimensions={width,height};compact=width<620;
    frameViewport();renderer.setSize(width,height,false);
    if(first||!tween)focus(active,true);
  }
  function pointer(e){const r=renderer.domElement.getBoundingClientRect();mouse.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);}
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6){down=null;return;}
    down=null;pointer(e);ray.setFromCamera(mouse,camera);
    const hit=ray.intersectObjects(pickers,false)[0];if(hit)choose(hit.object.userData.equipment);
  });
  controls.addEventListener('start',()=>{tween=null;});
  const ro=new ResizeObserver(resize);ro.observe(target);resize();
  function drawFlow(f,phase){
    for(let i=0;i<f.count;i++){
      const t=(i/f.count+phase)%1;f.curve.getPoint(t,point);tmp.position.copy(point);
      tmp.quaternion.identity();tmp.scale.setScalar((trace===f.fluid?1.27:.80)+.18*Math.sin(i*1.47+phase*16));tmp.updateMatrix();f.glow.setMatrixAt(i,tmp.matrix);
    }
    f.glow.instanceMatrix.needsUpdate=true;
    for(let i=0;i<f.arrows.count;i++){
      const t=(i/f.arrows.count+.085)%1;
      f.curve.getPoint(t,tmp.position);tmp.position.y+=.26;
      tmp.quaternion.setFromUnitVectors(up,f.curve.getTangent(t));tmp.scale.setScalar(1);tmp.updateMatrix();
      f.arrows.setMatrixAt(i,tmp.matrix);
    }
    f.arrows.instanceMatrix.needsUpdate=true;
  }
  function placeLabels(){
    const set=visibleLabels[active];const bounds=[];
    const order=active==='overview'?['exchange','lng','deep','liquid','feed','trim','pump','grid']:[...set,...Object.keys(anchor).filter(k=>!set.includes(k))];
    for(const id of order){
      const b=buttons.get(id), p=anchor[id];if(!b)continue;
      const covered=active==='deep'&&deepView==='shell'&&['cryo','catalyst','separator'].includes(id);
      const exploded=active==='exchange'&&coreView==='exploded'&&id==='exchange';
      if(!labels||!set.includes(id)||covered||exploded||(compact&&active==='overview'&&!['exchange','lng','liquid'].includes(id))){b.hidden=true;continue;}
      projected.copy(p).project(camera);
      const x=(projected.x+1)*.5*dimensions.width, y=(1-projected.y)*.5*dimensions.height;
      const width=compact?92:135;
      if(x<width*.44||x>dimensions.width-width*.44||y<70||y>dimensions.height-46||bounds.some(q=>Math.abs(q.x-x)<width&&Math.abs(q.y-y)<24)){b.hidden=true;continue;}
      bounds.push({x,y});b.hidden=false;b.style.left=x+'px';b.style.top=y+'px';
    }
  }
  function animate(now){
    const gap=active==='exchange'&&coreView==='exploded'?1:0;
    spread=reduced?gap:spread+(gap-spread)*.18;
    for(const [index,{layer,base}] of stack.entries()){
      layer.position.y=base+spread*(index*.58);
      layer.position.x=spread*(index-3)*.14;
    }
    heatAcross.visible=spread<.54;heatBetween.visible=spread>=.54;
    heatAcross.position.y=3.37;
    heatBetween.position.y=stack.at(-1).layer.position.y-.09;
    const delta=Math.min((now-last)/1000,.05);last=now;
    if(tween){
      const t=Math.min(1,(now-tween.start)/tween.duration),f=1-(1-t)**3;
      camera.position.lerpVectors(tween.from,tween.position,f);controls.target.lerpVectors(tween.target,tween.look,f);
      camera.zoom=T.MathUtils.lerp(tween.fromZoom,tween.zoom,f);camera.updateProjectionMatrix();
      if(t===1)tween=null;
    }
    controls.update();
    if(flow&&!reduced){travel=(travel+delta*.143)%1;if(water)water.uniforms.uTime.value+=delta;}
    if(flow){
      if(core.visible&&mode==='integrated'&&available>0){
        for(const {channel,passage} of stack)if(channel.visible)drawFlow(passage,travel);
      }
      if(refrigeration.inside.visible&&refrigeration.flow.glow.visible)drawFlow(refrigeration.flow,travel);
      if(dockFlow.glow.visible)drawFlow(dockFlow,travel);
      for(const f of routes.c)if(f.glow.visible)drawFlow(f,travel);
      for(const f of mode==='integrated'?routes.a:routes.s)if(f.glow.visible)drawFlow(f,travel);
    }
    placeLabels();renderer.render(scene,camera);
  }
  renderer.setAnimationLoop(animate);
  return {
    focus,kind:context?'webgl':'canvas',
    setFlow(value){flow=value;updateVisibility();},
    setTrace(value){trace=value;updateVisibility();},
    setProjection(value){if(projection!==value){projection=value;frameViewport();}},
    setLabels(value){labels=value;},
    setMode(value){mode=value;routes.assisted.visible=value==='integrated';routes.standalone.visible=value==='standalone';mechanical.visible=value==='standalone';updateVisibility();},
    setAvailable(value){available=value;updateVisibility();},
    setCore(value){coreView=value;focus(active);},
    setStream(value){stream=value;updateVisibility();},
    setDeep(value){deepView=value;updateVisibility();},
    setCamera(value){cameraView=value;focus(active);},
  };
}
