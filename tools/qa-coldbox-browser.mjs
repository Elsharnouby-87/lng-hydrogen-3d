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
],{stdio:'ignore'});
let ws;
try {
  let port=null;
  for(let i=0;i<100;i++) {
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
    if(result.exceptionDetails)throw Error('Browser JS: '+result.exceptionDetails.text);
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
