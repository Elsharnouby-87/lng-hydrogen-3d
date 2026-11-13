/**
 * Smoke-test the built standalone HTML in real headless Chrome.
 * No testing dependency: Node 22's WebSocket and the Chrome DevTools Protocol.
 * Generates inspectable R-101 screenshots and checks the three view controls.
 */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

function chromeBinary() {
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [name], {encoding:'utf8'}).trim(); } catch {}
  }
  throw Error('Chrome/Chromium is missing from the runner');
}
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const server=createServer(async (req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!/^(index\.html|linkedin-preview-[\w-]+\.jpg)$/.test(name)){
    res.writeHead(404);res.end();return;
  }
  try{
    const bytes=await readFile(new URL('../docs/'+name,import.meta.url));
    res.writeHead(200,{'content-type':extname(name)==='.jpg'?'image/jpeg':'text/html; charset=utf-8'});
    res.end(bytes);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
const userDir=await mkdtemp(join(tmpdir(),'oapec-chrome-'));
const child=spawn(chromeBinary(),[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
  '--disable-background-networking','--no-first-run',
  '--remote-debugging-port=0','--user-data-dir='+userDir,
  '--window-size=1600,950','about:blank',
],{stdio:['ignore','ignore','inherit']});
let ws;
try {
  let port=null;
  for(let i=0;i<320;i++) {
    if(child.exitCode!==null)throw Error('Chrome exited prematurely '+child.exitCode);
    try{
      const p=(await readFile(join(userDir,'DevToolsActivePort'),'utf8')).split('\n');
      port=Number(p[0]);if(port)break;
    }catch{}
    await sleep(100);
  }
  if(!port)throw Error('Chrome CDP debugging port unavailable');
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();
  const target=tabs.find(t=>t.type==='page');
  if(!target)throw Error('No Chrome target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  let id=0;
  const pending=new Map();
  const runtimeErrors=[];
  const shaderErrors=[];
  ws.addEventListener('message',ev=>{
    const m=JSON.parse(ev.data);
    if(m.method==='Runtime.exceptionThrown')runtimeErrors.push(m.params.exceptionDetails?.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      const message = m.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ');
      if (/WebGLProgram|Shader Error/i.test(message)) shaderErrors.push(message);
    }
    if(!m.id)return;
    const work=pending.get(m.id);pending.delete(m.id);
    if(!work)return;
    if(m.error)work.reject(Error(m.error.message));else work.resolve(m.result);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const key=++id;pending.set(key,{resolve,reject});
    ws.send(JSON.stringify({id:key,method,params}));
  });
  const evalJS=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error('Browser JS: '+(result.exceptionDetails.exception?.description || result.exceptionDetails.text));
    return result.result?.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:950,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:4173/#plant'});
  for(let i=0;i<80;i++){
    const status=await evalJS("document.readyState+'|'+(document.querySelector('#chapters')?.childElementCount||0)+'|'+(document.querySelector('#model')?.dataset.renderer||'')");
    if(status.includes('|5|'))break;
    await sleep(120);
  }
  const desktopCredit=await evalJS("(() => {"+
    "const brand=document.querySelector('.brand').getBoundingClientRect();"+
    "const event=document.querySelector('#mobile-site-nav > .event').getBoundingClientRect();"+
    "const actions=document.querySelector('#mobile-site-nav .head-actions').getBoundingClientRect();"+
    "return {viewport:innerWidth,brandRight:brand.right,eventLeft:event.left,eventRight:event.right,"+
    "eventMiddle:(event.left+event.right)/2,actionsLeft:actions.left};"+
  "})()");
  assert.ok(desktopCredit.eventLeft>=desktopCredit.brandRight+16,
    'Desktop event too close to LNG title: '+JSON.stringify(desktopCredit));
  assert.ok(desktopCredit.eventRight<=desktopCredit.actionsLeft-30,
    'Desktop event collides with action buttons: '+JSON.stringify(desktopCredit));
  assert.ok(desktopCredit.eventMiddle<desktopCredit.viewport/2-40,
    'Desktop event did not shift toward free left-hand space: '+JSON.stringify(desktopCredit));
  const desktopHeader=await send('Page.captureScreenshot',{format:'jpeg',quality:78,captureBeyondViewport:false});
  await writeFile(new URL('../docs/desktop-header-aligned.jpg',import.meta.url),Buffer.from(desktopHeader.data,'base64'));
  async function captureHarbor(name) {
    const image = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
    await writeFile(new URL('../docs/stage5-harbor-' + name + '.png', import.meta.url), Buffer.from(image.data,'base64'));
  }
  assert.equal(await evalJS("document.querySelector('#model').dataset.renderer"),'webgl',
    'Daylight and physical materials need to pass the WebGL renderer');
  await captureHarbor('overview');
  await evalJS("document.querySelector('[data-chapter=\"1\"]').click()");
  let berthVisible = false;
  for (let i = 0; i < 30; i++) {
    berthVisible = await evalJS("!document.querySelector('[data-equipment=dock]').hidden");
    if (berthVisible) break;
    await sleep(250);
  }
  const berthState = await evalJS(`(() => {
    const button = document.querySelector('[data-equipment=dock]');
    return { chapter: document.querySelector('#chapters [aria-current]')?.dataset.chapter,
      renderer: document.querySelector('#model').dataset.renderer, left: button.style.left, top: button.style.top,
      visibleLabels: [...document.querySelectorAll('.hotspot:not([hidden])')].map(label => label.dataset.equipment) };
  })()`);
  assert.ok(berthVisible, 'The LNG chapter needs a visible berth hotspot: ' + JSON.stringify(berthState));
  await captureHarbor('receiving');
  await evalJS("document.querySelector('[data-equipment=dock]').click()");
  await sleep(1150);
  assert.equal(shaderErrors.length, 0, shaderErrors.join('\n'));
  await captureHarbor('calm-berth');
  await evalJS("document.querySelector('#chapters button').click()");
  await sleep(1100);
  const location = "JSON.stringify(['lng','exchange'].map(id=>{const {left,top}=document.querySelector('[data-equipment='+id+']').style;return [left,top]}))";
  const initialLocation = await evalJS(location);
  await evalJS("document.querySelector('[data-mode=standalone]').click()");
  assert.match(await evalJS("document.querySelector('#mode-status').textContent"),/LNG bypasses E/);
  assert.equal(await evalJS(location), initialLocation, 'Configuration switch moved the plant camera');
  await captureHarbor('standalone');
  await evalJS("document.querySelector('[data-mode=integrated]').click()");
  await evalJS("document.querySelector('[data-equipment=exchange]').click()");
  await sleep(1150);
  assert.equal(await evalJS("document.querySelector('#view-name').textContent"),'E-101 CUTAWAY');
  assert.equal(await evalJS("document.querySelector('[data-stream=both]').getAttribute('aria-pressed')"),'true');
  await captureHarbor('precooler');
  await evalJS("document.querySelector('[data-core=exploded]').click(); document.querySelector('#present').click()");
  await sleep(1250);
  const bounds = await evalJS("document.querySelector('#model canvas').getBoundingClientRect().toJSON()");
  const x = Math.round(bounds.left + bounds.width * .65);
  const y = Math.round(bounds.top + bounds.height * .55);
  const mouse = (type, props) => send('Input.dispatchMouseEvent', {type,x,y,...props});
  await mouse('mouseMoved', {});
  await mouse('mousePressed', {button:'left',buttons:1,clickCount:1});
  await mouse('mouseMoved', {x:x-145,y:y-210,buttons:1});
  await mouse('mouseReleased', {x:x-145,y:y-210,button:'left',clickCount:1});
  await mouse('mouseWheel', {deltaY:430,deltaX:0});
  await sleep(1000);
  const lowOrbit = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
  await writeFile(new URL('../docs/stage5-harbor-orbit.png', import.meta.url), Buffer.from(lowOrbit.data,'base64'));
  const exposedBackdrop = await evalJS(`(async () => {
    const image = new Image();
    image.src = 'data:image/png;base64,${lowOrbit.data}';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image,0,0);
    const area = ${JSON.stringify(bounds)};
    const left = Math.floor(area.left + area.width * .28);
    const top = Math.floor(area.top + area.height * .33);
    const width = Math.floor(area.width * .69);
    const height = Math.floor(area.height * .56);
    const pixels = context.getImageData(left,top,width,height).data;
    let longest = 0;
    for (let row = 0; row < height; row += 4) {
      let run = 0;
      for (let column = 0; column < width; column += 2) {
        const i = (row * width + column) * 4;
        const background = pixels[i] === 142 && pixels[i+1] === 175 && pixels[i+2] === 190;
        run = background ? run + 2 : 0;
        longest = Math.max(longest,run);
      }
    }
    return longest;
  })()`);
  assert.ok(exposedBackdrop < 90, 'Camera exposed a flat background band of ' + exposedBackdrop + ' pixels while orbiting');
  await evalJS("document.querySelector('#present').click(); document.querySelector('[data-core=cutaway]').click()");
  await sleep(350);
  await evalJS("document.querySelector('#e101-tour').click(); document.querySelector('#walk-next').click()");
  for (let i = 0; i < 30; i++) {
    if (await evalJS("document.querySelector('#model').dataset.inspectionModel === 'glb'")) break;
    await sleep(200);
  }
  assert.equal(await evalJS("document.querySelector('#model').dataset.inspectionModel"),'glb');
  await sleep(1000);
  await captureHarbor('flange');
  await evalJS("document.querySelector('#walk-next').click()");
  await sleep(1000);
  await captureHarbor('section');
  await evalJS("document.querySelector('#walk-close').click()");
  await evalJS(`(() => {
    const heading = document.querySelector('#opener-tag');
    window.testOpeningStops = [];
    const record = () => window.testOpeningStops.push(heading.textContent);
    new MutationObserver(record).observe(heading, { childList: true });
    document.querySelector('#open-show').click();
  })()`);
  assert.equal(await evalJS("document.querySelector('#opener').hidden"),false);
  await captureHarbor('intro-berth');
  let stops = [];
  for (let i = 0; i < 45; i++) {
    stops = await evalJS('window.testOpeningStops.slice()');
    if (stops.includes('02 / THE THERMAL LINK')) break;
    await sleep(250);
  }
  assert.deepEqual(stops.slice(0, 2), ['01 / THE COLD SOURCE', '02 / THE THERMAL LINK']);
  if (await evalJS("!document.querySelector('#opener').hidden")) await captureHarbor('intro');
  await evalJS("document.querySelector('#skip-opening').click()");
  await evalJS("if(document.fullscreenElement) document.exitFullscreen()");
  console.log('PASS: daylight plant, fixed-camera mode comparison, E-101 cutaway, and cinematic intro');
  await evalJS("document.querySelector('[data-chapter=\"3\"]').click()");
  await sleep(1700);
  const renderer=await evalJS("document.querySelector('#model').dataset.renderer");
  assert.ok(renderer==='webgl'||renderer==='canvas', 'Renderer not started');
  const fileNames=[];
  for(const view of ['cutaway','exploded','shell']){
    await evalJS("document.querySelector('[data-deep=\""+view+"\"]').click()");
    await sleep(1250);
    const status=await evalJS("({note:!document.querySelector('#coldbox-note').hidden, pressed:document.querySelector('[data-deep=\""+view+"\"]').getAttribute('aria-pressed'), renderer:document.querySelector('#model').dataset.renderer})");
    assert.equal(status.note,true,'Cold-box info hidden '+view);
    assert.equal(status.pressed,'true','Wrong active view '+view);
    if(view==='cutaway') {
      await evalJS("document.querySelector('[data-deep-stream=\"he\"]').click()");
      const he=await evalJS("document.querySelector('[data-deep-stream=\"he\"]').getAttribute('aria-pressed')");
      assert.equal(he,'true');
      await evalJS("document.querySelector('[data-deep-stream=\"both\"]').click()");
    }
    const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const name='r101-stage1-'+view+'.png';
    await writeFile(new URL('../docs/'+name,import.meta.url),Buffer.from(image.data,'base64'));
    fileNames.push(name);
    if(view==='cutaway'){
      await writeFile(new URL('../docs/stage5-r101-detail.png',import.meta.url),
        Buffer.from(image.data,'base64'));
    }
  }
  // Stage 3 + Stage 5 engineering equipment close-up visual smoke tests.
  // These clicks exercise the actual navigation + original plant camera.
  for(const [id,tag,file] of [
    ['compressor','K-101','k101'],
    ['pump','P-201','p201'],
    ['trim','E-202','e202'],
    ['lng','TK-201','lng-storage'],
    ['liquid','TK-301','tk301'],
  ]){
    const clicked=await evalJS("(() => { const b=document.querySelector('[data-equipment="+id+"]'); if(!b)return false; b.click(); return true; })()");
    assert.equal(clicked,true,'Missing Stage 3 equipment hotspot '+id);
    await sleep(1600);
    const displayed=await evalJS("({code:document.querySelector('#equipment-code').textContent, visible:!document.querySelector('#equipment-card').hidden, renderer:document.querySelector('#model').dataset.renderer})");
    assert.equal(displayed.code,tag,'Incorrect equipment nameplate selection '+id);
    assert.equal(displayed.visible,true,'Equipment inspection card hidden '+id);
    assert.ok(displayed.renderer==='webgl'||displayed.renderer==='canvas','Failed render '+id);
    if(id==='liquid'){
      const tankUI=await evalJS("({noteHidden:document.querySelector('#coldbox-note').hidden, modesHidden:document.querySelector('#deep-modes').hidden, title:document.querySelector('#view-name').textContent})");
      assert.equal(tankUI.noteHidden,true,'R-101 info obscures the LH2 vessel');
      assert.equal(tankUI.modesHidden,true,'R-101 controls shown during LH2 vessel inspection');
      assert.ok(tankUI.title.includes('TK-301'),'Wrong tank camera view label');
    }
    const snap=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(new URL('../docs/stage3-'+file+'-closeup.png',import.meta.url),Buffer.from(snap.data,'base64'));
    await writeFile(new URL('../docs/stage5-'+file+'-detail.png',import.meta.url),Buffer.from(snap.data,'base64'));
    if(id==='liquid'){
      assert.equal(await evalJS("document.querySelector('#lh2-modes').hidden"),false,
        'LH2 shell/cutaway control missing in storage close-up');
      await evalJS("document.querySelector('[data-lh2=cutaway]').click()");
      await sleep(1000);
      const cut=await evalJS("({pressed:document.querySelector('[data-lh2=cutaway]').getAttribute('aria-pressed'),title:document.querySelector('#view-name').textContent})");
      assert.equal(cut.pressed,'true','Tank cutaway toggle ineffective');
      assert.ok(cut.title.includes('CUTAWAY'),'Cutaway title absent');
      const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/stage5-lh2-cutaway.png',import.meta.url),Buffer.from(image.data,'base64'));
      await evalJS("document.querySelector('[data-lh2=shell]').click()");
      assert.equal(await evalJS("document.querySelector('[data-lh2=shell]').getAttribute('aria-pressed')"),'true');
    }
  }
  console.log('PASS: Stage 5 K-101, P-201, E-202, LNG tank and LH2 shell/cutaway real WebGL screenshots');
    // Mobile regression: by default the information panel must not cover the
  // cryogenic equipment. It can still be opened and closed with a 40px target.
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride',{
      width,height:844,deviceScaleFactor:3,mobile:true,screenWidth:width,screenHeight:844
    });
    await send('Page.reload',{ignoreCache:true});
    let ready=false;
    for(let attempt=0;attempt<100;attempt++){
      if(await evalJS("!!document.querySelector('[data-chapter=\"3\"]')")){
        ready=true;break;
      }
      await sleep(200);
    }
    assert.ok(ready,'Mobile DOM did not initialize at '+width+'px');
    await sleep(500);
    const mobileLabels = await evalJS(`(() => {
      const stage = document.querySelector('#stage').getBoundingClientRect();
      return Array.from(document.querySelectorAll('.hotspot:not([hidden])'), button => {
        const label = button.getBoundingClientRect();
        return { id: button.dataset.equipment, inside: label.left >= stage.left && label.right <= stage.right };
      });
    })()`);
    assert.ok(mobileLabels.length > 0, 'No equipment labels on the mobile overview at ' + width + 'px');
    assert.ok(mobileLabels.every(label => label.inside), 'Mobile label clipped: ' + JSON.stringify(mobileLabels));
    if (width === 390) {
      await captureHarbor('mobile');
      await evalJS("document.querySelector('[data-equipment=exchange]').click()");
      await sleep(1050);
      const location = await evalJS("(() => { const info=document.querySelector('#equipment-card').getBoundingClientRect(); const stage=document.querySelector('#stage').getBoundingClientRect(); return (info.bottom-stage.top)/stage.height; })()");
      assert.ok(location > .75 && location < .98, 'Mobile equipment details must sit near the bottom');
      await evalJS("document.querySelector('#equipment-info-toggle').click()");
      assert.equal(await evalJS("document.querySelector('#equipment-info-toggle').getAttribute('aria-expanded')"),'true');
      await captureHarbor('mobile-precooler');
      await evalJS("document.querySelector('#chapters button').click()");
    }
    const mobileLayout = await evalJS("(() => {" +
      "const stage=document.querySelector('#stage').getBoundingClientRect();" +
      "const header=document.querySelector('.masthead').getBoundingClientRect();" +
      "const narrative=document.querySelector('.narrative').getBoundingClientRect();" +
      "return {width:innerWidth,height:innerHeight,stage:stage.height,header:header.height," +
      "stageAboveNarrative:stage.bottom<=narrative.top+2," +
      "horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2," +
      "dockVisible:getComputedStyle(document.querySelector('.mobile-dock')).display!=='none'};" +
    "})()");
    assert.ok(mobileLayout.header<=(width<=375?85:70),width+'px header is not compact '+JSON.stringify(mobileLayout));
    const creditFit=await evalJS("(() => {"+
      "const brand=document.querySelector('.brand').getBoundingClientRect();"+
      "const signature=document.querySelector('.mobile-header-signature').getBoundingClientRect();"+
      "const header=document.querySelector('.masthead').getBoundingClientRect();"+
      "return {left:signature.left,right:signature.right,top:signature.top,bottom:signature.bottom,"+
      "brandRight:brand.right,brandBottom:brand.bottom,headerRight:header.right,headerBottom:header.bottom,"+
      "visible:getComputedStyle(document.querySelector('.mobile-header-credit')).display!=='none'};"+
    "})()");
    assert.ok(creditFit.visible,width+'px creator signature hidden');
    assert.ok(creditFit.right<=creditFit.headerRight-5,width+'px creator name clipped on right '+JSON.stringify(creditFit));
    assert.ok(creditFit.bottom<=creditFit.headerBottom+1,width+'px creator name clipped vertically');
    assert.ok((width>375 ? creditFit.left>=creditFit.brandRight-2 : creditFit.top>=creditFit.brandBottom-2),
      width+'px creator name overlaps the brand '+JSON.stringify(creditFit));
    const creditIndent=await evalJS("(() => {"+
      "const a=document.querySelector('.mobile-header-credit').getBoundingClientRect();"+
      "const h=document.querySelector('.masthead').getBoundingClientRect();"+
      "return {rightGap:h.right-a.right,left:a.left,headerLeft:h.left};})()");
    assert.ok(creditIndent.rightGap>=29,
      width+'px signature still hugs the right edge: '+JSON.stringify(creditIndent));
    const creditLine=await evalJS("(() => {"+
      "const a=document.querySelector('.mobile-header-by').getBoundingClientRect();"+
      "const b=document.querySelector('.mobile-header-signature').getBoundingClientRect();"+
      "const c=document.querySelector('.mobile-header-credit').getBoundingClientRect();"+
      "return {byRight:a.right,nameLeft:b.left,nameRight:b.right,"+
      "byMid:(a.top+a.bottom)/2,nameMid:(b.top+b.bottom)/2,"+
      "groupHeight:c.height,groupWidth:c.width}})()");
    assert.ok(creditLine.nameLeft>=creditLine.byRight,
      width+'px byline and signature collide');
    assert.ok(Math.abs(creditLine.byMid-creditLine.nameMid)<9,
      width+'px byline and signature not aligned on one line '+JSON.stringify(creditLine));
    assert.ok(creditLine.groupHeight<30,width+'px credit wraps into multiple rows');
    assert.equal(await evalJS("document.body.textContent.includes('Preliminary engineering screening · 12 Nov 2026')"),false);
    assert.equal(await evalJS("document.body.textContent.includes('Import-derived scenarios · Site recoverability pending validation')"),false);
    assert.ok(mobileLayout.stage>=Math.min(500,mobileLayout.height*.75),width+'px 3D is not dominant '+JSON.stringify(mobileLayout));
    assert.ok(mobileLayout.stageAboveNarrative,width+'px 3D must precede narrative');
    assert.ok(mobileLayout.dockVisible,width+'px toolbar missing');
    assert.equal(mobileLayout.horizontalOverflow,false,width+'px page horizontally overflows');
    if(width===320){
      const narrowShot=await send('Page.captureScreenshot',{format:'jpeg',quality:78,captureBeyondViewport:false});
      await writeFile(new URL('../docs/mobile-credit-320.jpg',import.meta.url),Buffer.from(narrowShot.data,'base64'));
    }
    if(width===390){
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/mobile3d-main.png',import.meta.url),Buffer.from(shot.data,'base64'));
      const preview=await send('Page.captureScreenshot',{format:'jpeg',quality:70,captureBeyondViewport:false});
      await writeFile(new URL('../docs/mobile3d-main-preview.jpg',import.meta.url),Buffer.from(preview.data,'base64'));
    }
    await evalJS("document.querySelector('#mobile-menu-toggle').click()");
    assert.equal(await evalJS("document.querySelector('#mobile-menu-toggle').getAttribute('aria-expanded')"),'true');
    assert.equal(await evalJS("getComputedStyle(document.querySelector('#mobile-site-nav')).display"),'flex');
    await evalJS("document.querySelector('#mobile-menu-toggle').click()");
    assert.equal(await evalJS("document.querySelector('#mobile-menu-toggle').getAttribute('aria-expanded')"),'false');
    await evalJS("document.querySelector('[data-mobile-panel=equipment]').click()");
    assert.equal(await evalJS("document.querySelector('#mobile-bottom-sheet').hidden"),false);
    const listSize=await evalJS("document.querySelectorAll('[data-mobile-equip]').length");
    assert.ok(listSize>=6,width+'px equipment list missing');
    if(width===390) {
      const snap=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/mobile3d-equipment-sheet.png',import.meta.url),Buffer.from(snap.data,'base64'));
    }
    await evalJS("document.querySelector('#mobile-sheet-close').click()");
    assert.equal(await evalJS("document.querySelector('#mobile-bottom-sheet').hidden"),true);
    await evalJS("document.querySelector('[data-mobile-panel=camera]').click()");
    await evalJS("document.querySelector('[data-mobile-command=zoom-in]').click()");
    await evalJS("document.querySelector('[data-mobile-command=plan]').click()");
    assert.equal(await evalJS("document.querySelector('#plan').getAttribute('aria-pressed')"),'true');
    await evalJS("document.querySelector('[data-mobile-command=plan]').click()");
    assert.equal(await evalJS("document.querySelector('#plan').getAttribute('aria-pressed')"),'false');
    await evalJS("document.querySelector('#mobile-sheet-close').click()");
    await evalJS("document.querySelector('[data-mobile-panel=info]').click()");
    assert.equal(await evalJS("document.querySelector('#mobile-bottom-sheet').hidden"),false);
    if(width===390) {
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/mobile3d-info-sheet.png',import.meta.url),Buffer.from(shot.data,'base64'));
    }
    await evalJS("document.querySelector('#mobile-sheet-close').click()");
    await evalJS("document.querySelector('#mobile-clean').click()");
    assert.equal(await evalJS("document.body.classList.contains('mobile-clean')"),true);
    assert.equal(await evalJS("document.querySelector('#mobile-restore').hidden"),false);
    if(width===390){
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/mobile3d-clean.png',import.meta.url),Buffer.from(shot.data,'base64'));
      const preview=await send('Page.captureScreenshot',{format:'jpeg',quality:70,captureBeyondViewport:false});
      await writeFile(new URL('../docs/mobile3d-clean-preview.jpg',import.meta.url),Buffer.from(preview.data,'base64'));
    }
    await evalJS("document.querySelector('#mobile-restore').click()");
    assert.equal(await evalJS("document.body.classList.contains('mobile-clean')"),false);
    await evalJS("document.querySelector('[data-chapter=\"3\"]').click()");
    await sleep(950);
    const collapsed=await evalJS(`(() => {
      const note=document.querySelector('#coldbox-note');
      const chip=document.querySelector('#coldbox-info-toggle');
      const controls=document.querySelector('#inspection');
      const b=chip.getBoundingClientRect(), stage=document.querySelector('#stage').getBoundingClientRect();
      return {mobile:matchMedia('(max-width:800px)').matches,
        noteVisible:!note.hidden,
        detailsHidden:document.querySelector('#coldbox-info-details').hidden,
        expanded:chip.getAttribute('aria-expanded'),
        chipWidth:b.width,chipHeight:b.height,
        withinStage:b.left>=stage.left&&b.right<=stage.right,
        belowControls:b.top>=controls.getBoundingClientRect().bottom-1,
        pageOverflow:document.documentElement.scrollWidth>innerWidth+2};
    })()`);
    assert.equal(collapsed.mobile,true,width+'px did not use mobile styles');
    assert.equal(collapsed.noteVisible,true);
    assert.equal(collapsed.detailsHidden,true,width+'px information blocks the model');
    assert.equal(collapsed.expanded,'false');
    assert.ok(collapsed.chipHeight>=38,width+'px chip too small');
    assert.ok(collapsed.withinStage,width+'px chip clipped');
    assert.ok(collapsed.chipWidth>=38,width+'px chip target too small');
    assert.equal(collapsed.pageOverflow,false,width+'px layout overflows page');
    if(width===390){
      const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/r101-mobile-collapsed.png',import.meta.url),
        Buffer.from(image.data,'base64'));
    }
    await evalJS("document.querySelector('#coldbox-info-toggle').click()");
    assert.deepEqual(await evalJS(`({
      detailsHidden:document.querySelector('#coldbox-info-details').hidden,
      expanded:document.querySelector('#coldbox-info-toggle').getAttribute('aria-expanded')
    })`),{detailsHidden:false,expanded:'true'});
    if(width===390){
      const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/r101-mobile-expanded.png',import.meta.url),
        Buffer.from(image.data,'base64'));
    }
    await evalJS("document.querySelector('#coldbox-info-toggle').click()");
    assert.equal(await evalJS("document.querySelector('#coldbox-info-details').hidden"),true);
    // The 320/390 px mobile viewport must keep the LH2 cutaway usable and
    // hide the unrelated R-101 information overlay, as on desktop.
    await evalJS("document.querySelector('[data-equipment=liquid]').click()");
    await sleep(900);
    assert.equal(await evalJS("document.querySelector('#lh2-modes').hidden"),false);
    const infoInitially=await evalJS("({collapsed:document.querySelector('#equipment-card').classList.contains('is-collapsed'),bodyHidden:document.querySelector('#equipment-body').hidden,pressed:document.querySelector('#equipment-info-toggle').getAttribute('aria-expanded')})");
    assert.deepEqual(infoInitially,{collapsed:true,bodyHidden:true,pressed:'false'},
      'Mobile equipment card must be collapsed without losing LH2 controls');
    await evalJS("document.querySelector('#equipment-info-toggle').click()");
    assert.equal(await evalJS("document.querySelector('#equipment-body').hidden"),false,
      'Equipment notes do not open on mobile');
    await evalJS("document.querySelector('#equipment-info-toggle').click()");
    assert.equal(await evalJS("document.querySelector('#equipment-body').hidden"),true,
      'Equipment notes do not close on mobile');
    assert.equal(await evalJS("document.querySelector('#coldbox-note').hidden"),true);
    await evalJS("document.querySelector('[data-lh2=cutaway]').click()");
    assert.equal(await evalJS("document.querySelector('[data-lh2=cutaway]').getAttribute('aria-pressed')"),'true');
    if(width===390){
      const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL('../docs/stage5-lh2-mobile.png',import.meta.url),Buffer.from(image.data,'base64'));
    }
    await evalJS("document.querySelector('[data-lh2=shell]').click()");
    console.log('PASS: R-101 legend and LH2 vacuum cutaway on '+width+'px mobile');

  }
  assert.deepEqual(shaderErrors, [], 'WebGL shader errors during camera or mobile tests');
  if(runtimeErrors.length)console.warn('Runtime warnings:',runtimeErrors.slice(0,5));
  console.log('PASS: headless Chrome / '+renderer+'; screenshots '+fileNames.join(', '));
}finally {
  if(ws?.readyState===WebSocket.OPEN)ws.close();
  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    sleep(1800),
  ]);
  server.close();
  // Chrome may still be finalizing its cache. This temporary directory is
  // disposed with the ephemeral CI runner even if filesystem cleanup races.
  await rm(userDir,{recursive:true,force:true,maxRetries:8,retryDelay:250}).catch(
    error => console.warn('Temporary browser cache cleanup:',error.code)
  );
}
