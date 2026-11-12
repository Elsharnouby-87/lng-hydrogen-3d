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
  ws.addEventListener('message',ev=>{
    const m=JSON.parse(ev.data);
    if(m.method==='Runtime.exceptionThrown')runtimeErrors.push(m.params.exceptionDetails?.text);
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
    const mobileLayout = await evalJS("(() => {" +
      "const stage=document.querySelector('#stage').getBoundingClientRect();" +
      "const header=document.querySelector('.masthead').getBoundingClientRect();" +
      "const narrative=document.querySelector('.narrative').getBoundingClientRect();" +
      "return {width:innerWidth,height:innerHeight,stage:stage.height,header:header.height," +
      "stageAboveNarrative:stage.bottom<=narrative.top+2," +
      "horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2," +
      "dockVisible:getComputedStyle(document.querySelector('.mobile-dock')).display!=='none'};" +
    "})()");
    assert.ok(mobileLayout.header<=70,width+'px header is not compact '+JSON.stringify(mobileLayout));
    assert.ok(mobileLayout.stage>=Math.min(500,mobileLayout.height*.75),width+'px 3D is not dominant '+JSON.stringify(mobileLayout));
    assert.ok(mobileLayout.stageAboveNarrative,width+'px 3D must precede narrative');
    assert.ok(mobileLayout.dockVisible,width+'px toolbar missing');
    assert.equal(mobileLayout.horizontalOverflow,false,width+'px page horizontally overflows');
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
