import {chapters,equipment} from './content.js';
import {createPlant} from './plant.js';
import {bypass,coldAtHour,dutyProfiles,opening,traces} from './storyboard.js';

const el=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let chapter=0, mode='integrated', approach=8, available=78;
let flow=true, labels=true, selection=null, tourTimer=null, plant=null, presenting=false;
let coreView='cutaway', deepView='cutaway', plan=false, hud=true;
let trace=null, traceIndex=0, openingFrame=-1, openingTimer=null;
let dutyProfile='variable', hour=10, manualDuty=false;

const chaptersNav=el('chapters');
chaptersNav.innerHTML=chapters.map((c,i)=>`<button type="button" data-chapter="${i}"><b>0${i+1}</b><span>${c.label}</span></button>`).join('');
el('profiles').innerHTML=Object.entries(dutyProfiles).map(([id,{label}])=>
  `<button type="button" data-profile="${id}" aria-pressed="${id===dutyProfile}">${label}</button>`).join('');
const hotspots=el('hotspots');
hotspots.innerHTML=Object.entries(equipment).map(([id,item])=>`<button type="button" class="hotspot ${item.chapter==='lng'?'lng':''}" data-equipment="${id}" aria-label="Inspect ${item.label}" hidden><span><em>${item.code}</em>${item.label}</span></button>`).join('');

function fallback(){
  el('fallback').hidden=false;
  el('fallback').innerHTML=`<svg viewBox="0 0 760 350" role="img" aria-label="2D backup showing separate hydrogen and LNG paths and a shared heat exchanger">
  <defs><marker id="aB" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path fill="#67cfff" d="M0 0 8 4 0 8Z"/></marker><marker id="aG" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path fill="#6eefd0" d="M0 0 8 4 0 8Z"/></marker></defs>
  <rect x="274" y="55" width="206" height="232" rx="8" fill="#203c53" stroke="#69859b"/><text x="377" y="85" fill="#fff" font-size="21" text-anchor="middle">E-101 · Precooler</text>
  <g fill="#67cfff" font-size="18" font-family="Arial"><text x="36" y="121">Conditioned H₂</text><text x="513" y="121">Deep cooling · LH₂</text></g>
  <g fill="#6eefd0" font-size="18" font-family="Arial"><text x="37" y="255">Trim · Gas grid</text><text x="514" y="255">LNG tank · Pump</text></g>
  <path id="schematic-h2" d="M35 151H720" fill="none" stroke="#67cfff" stroke-width="4" marker-end="url(#aB)"/>
  <path id="schematic-lng" d="M720 216H35" fill="none" stroke="#6eefd0" stroke-width="4" marker-end="url(#aG)"/>
  <text id="schematic-heat" x="377" y="190" fill="#f7bb78" font-size="17" text-anchor="middle">↓ Heat from H₂ to LNG</text>
  <text x="377" y="327" fill="#bdcfdf" font-size="15" text-anchor="middle">2D backup · WebGL unavailable</text>
  </svg>`;
}
try{
  plant=createPlant(el('model'),hotspots,inspect,reduce);
  el('model').dataset.renderer=plant.kind;
}catch(error){
  console.warn('WebGL initialization failed; using the process schematic.',error);
  fallback();
}
function stopTour(){
  if(tourTimer!==null)clearTimeout(tourTimer);
  tourTimer=null;
  el('tour').classList.remove('is-playing');
  el('tour').children[1].textContent='Play guided tour';
}
function schedule(){
  tourTimer=setTimeout(()=>{
    if(chapter===chapters.length-1){stopTour();return;}
    setChapter(chapter+1);
    schedule();
  },14000);
}
function toggleTour(){
  if(tourTimer!==null){stopTour();return;}
  stopOpening(false);clearTrace(false);
  if(chapter===chapters.length-1)setChapter(0);
  el('tour').classList.add('is-playing');
  el('tour').children[1].textContent='Pause guided tour';
  schedule();
}
function step(n){
  stopTour();stopOpening(false);clearTrace(false);
  setChapter(Math.max(0,Math.min(chapters.length-1,n)));
}
function closeCard(){
  if(selection)hotspots.querySelector(`[data-equipment="${selection}"]`)?.classList.remove('selected');
  selection=null;el('equipment-card').hidden=true;
}
function inspect(id){
  const item=equipment[id];if(!item)return;
  stopTour();stopOpening(false);clearTrace(false);closeCard();
  const nextChapter=chapters.findIndex(c=>c.id===item.chapter);
  setChapter(nextChapter,false);
  const focus=id==='grid'?'trim':['cryo','catalyst','separator'].includes(id)?'deep':id;
  plant?.focus(focus);
  selection=id;
  hotspots.querySelector(`[data-equipment="${id}"]`)?.classList.add('selected');
  el('equipment-code').textContent=item.code;
  el('equipment-name').textContent=item.label;
  el('equipment-detail').textContent=item.detail;
  el('equipment-card').hidden=false;
  if(focus==='exchange'||focus==='deep')renderStageControls();
  else el('view-name').textContent='EQUIPMENT FOCUS';
}
function renderDutyChart(){
  const series=dutyProfiles[dutyProfile].values;
  const x=h=>28+h*17.25,y=p=>101-p*.59;
  const demand=y(100);
  const path=series.map((p,i)=>`${i?'L':'M'}${x(i*2)},${y(p)}`).join(' ');
  const points=series.flatMap((p,i)=>{
    if(!i||(p-100)*(series[i-1]-100)>=0)return [[i*2,p]];
    const prior=series[i-1],cross=(i-1)*2+(100-prior)*2/(p-prior);
    return [[cross,100],[i*2,p]];
  });
  const deficit=points.map(([h,p],i)=>{
    if(!i||p>100||points[i-1][1]>100)return '';
    const [left,previous]=points[i-1];
    return `M${x(left)},${demand}L${x(left)},${y(previous)}L${x(h)},${y(p)}L${x(h)},${demand}Z`;
  }).join(' ');
  const scale=[0,6,12,18,24].map(h=>`<text x="${x(h)}" y="120">${h.toString().padStart(2,'0')}:00</text>`).join('');
  const marker=manualDuty?'':`<path class="chart-cursor" d="M${x(hour)},14V101"/><circle cx="${x(hour)}" cy="${y(available)}" r="4" fill="#6eefd0"/>`;
  el('duty-chart').innerHTML=`<path class="chart-axis" d="M28,16V101H442"/><path class="chart-deficit" d="${deficit}"/><path class="chart-demand" d="M28,${demand}H442"/><path class="chart-supply" d="${path}"/>${marker}<g class="chart-ticks">${scale}</g><text class="chart-demand-label" x="437" y="${demand-6}">100% H₂ demand</text>`;
  el('hour-value').textContent=manualDuty?'Manual':hour.toString().padStart(2,'0')+':00';
  el('hour').value=hour;
  for(const button of el('profiles').children)button.setAttribute('aria-pressed',String(button.dataset.profile===dutyProfile));
}
function useDutyProfile(){
  manualDuty=false;
  available=coldAtHour(dutyProfiles[dutyProfile].values,hour);
  el('availability').value=available;
  updateDispatch();
}
function updateDispatch(){
  const recovered=mode==='integrated'?Math.min(100,available):0;
  const backup=100-recovered;
  el('availability-value').textContent=available+'%';
  el('cold-bar').style.width=recovered+'%';el('backup-bar').style.width=backup+'%';
  el('recovered').textContent=recovered+'%';el('backup').textContent=backup+'%';
  el('dispatch-note').textContent=mode==='standalone'?'Mechanical precooling covers the full normalized duty.':'Illustrative duty balance. Deep refrigeration remains in service.';
  plant?.setAvailable(available/100);
  renderDutyChart();
}
function updateApproach(){
  el('approach-value').textContent=approach+' K';
  el('bound').textContent='≥ '+(111+approach)+' K';
  el('approach-note').textContent=mode==='integrated'?'111 K illustrative LNG inlet. The actual minimum approach can occur inside the exchanger.':'LNG exchanger bypassed in standalone mode. The inequality applies when the exchanger is in service.';
}
function renderDetail(c){
  const detail=el('detail');
  if(c.id==='exchange'){
    detail.innerHTML=`<div class="control"><label for="approach">Cold-end approach <output id="approach-value"></output></label>
    <input id="approach" type="range" min="3" max="25" step="1" value="${approach}">
    <div class="control-reading">H₂ outlet lower bound <strong id="bound"></strong></div><p id="approach-note" class="control-note"></p></div>`;
    el('approach').addEventListener('input',e=>{approach=Number(e.target.value);updateApproach();});
    updateApproach();
  }else if(c.id==='match'){
    detail.innerHTML=`<div class="control"><label for="availability">Usable LNG cold vs. H₂ duty <output id="availability-value"></output></label>
    <input id="availability" type="range" min="0" max="140" step="1" value="${available}">
    <div class="stack" aria-hidden="true"><span id="cold-bar"></span><span id="backup-bar"></span></div>
    <div class="dispatch-labels"><span><strong id="recovered"></strong> recovered</span><span><strong id="backup"></strong> mechanical</span></div>
    <p id="dispatch-note" class="control-note"></p></div>`;
    el('availability').addEventListener('input',e=>{available=Number(e.target.value);manualDuty=true;updateDispatch();});
    updateDispatch();
  }else{
    detail.innerHTML=`<div class="metrics">${c.metrics.map(([value,label])=>`<div><strong>${value}</strong><small>${label}</small></div>`).join('')}</div>`;
  }
}
const names=['ISOMETRIC PLANT VIEW','LNG RECEIVING & PUMPING','E-101 CUTAWAY','R-101 COLD BOX','OPERATING MATCH'];
function renderStageControls(){
  const exchange=chapter===2, deep=chapter===3;
  el('inspection').hidden=!plant||(!exchange&&!deep);
  el('core-modes').hidden=!exchange;
  el('stream-modes').hidden=!exchange||coreView==='shell'||Boolean(trace);
  el('deep-modes').hidden=!deep;
  el('profile-panel').hidden=chapter!==4||Boolean(trace);
  const title=exchange?'E-101 '+coreView.toUpperCase():deep?'R-101 '+deepView.toUpperCase():names[chapter];
  el('view-name').textContent=plan?'PLAN · '+title:title;
}
function setChapter(i,moveCamera=true){
  chapter=i;
  const c=chapters[i];
  closeCard();
  el('chapter-index').textContent='0'+(i+1);
  el('kicker').textContent=c.kicker;
  el('chapter-title').textContent=c.title;
  el('chapter-body').textContent=c.body;
  el('presenter-cue').textContent=c.cue;
  el('presenter-cue').hidden=!presenting;
  renderStageControls();
  el('next').disabled=i===chapters.length-1;
  for(const [j,b] of [...chaptersNav.children].entries()){
    if(i===j)b.setAttribute('aria-current','step');
    else b.removeAttribute('aria-current');
  }
  renderDetail(c);
  if(moveCamera)plant?.focus(c.focus);
}
function setMode(value){
  mode=value;
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(value===b.dataset.mode));
  el('stage').classList.toggle('thermal-off',value==='standalone');
  el('thermal-legend').textContent=value==='standalone'?'Precooler bypassed':'Heat transfer';
  plant?.setMode(value);
  plant?.setAvailable(available/100);
  if(el('availability'))updateDispatch();
  if(el('approach'))updateApproach();
  if(trace){renderTraceRail();showTraceStop(traceIndex);}
  const h=el('schematic-h2'),l=el('schematic-lng'),heat=el('schematic-heat');
  if(h&&l&&heat){
    h.setAttribute('d',value==='integrated'?'M35 151H720':'M35 151H220V30H540V151H720');
    l.setAttribute('d',value==='integrated'?'M720 216H35':'M720 216H540V305H220V216H35');
    heat.style.display=value==='integrated'?'':'none';
  }
}
function traceSteps(){
  const steps=traces[trace].steps;
  return mode==='integrated'?steps:steps.map(item=>item.view==='exchange'?bypass[trace]:item);
}
function renderTraceRail(){
  el('trace-title').textContent=traces[trace].title;
  el('trace-stops').innerHTML=traceSteps().map((item,i)=>
    `<button type="button" data-stop="${i}"><b>0${i+1}</b><span>${item.name}</span></button>`).join('');
}
function showTraceStop(i){
  if(!trace)return;
  const steps=traceSteps();
  traceIndex=Math.max(0,Math.min(i,steps.length-1));
  const stop=steps[traceIndex];
  setChapter(stop.chapter,false);
  el('chapter-index').textContent='0'+(traceIndex+1);
  el('kicker').textContent=traces[trace].title.toUpperCase();
  el('chapter-title').textContent=stop.name;
  el('chapter-body').textContent=stop.text;
  el('presenter-cue').textContent='Use ← and → to move between stops in this circuit.';
  el('next').disabled=traceIndex===steps.length-1;
  for(const [index,button] of [...el('trace-stops').children].entries()){
    if(index===traceIndex)button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  }
  el('view-name').textContent=(plan?'PLAN · ':'')+stop.tag;
  plant?.focus(stop.view);
}
function clearTrace(restore=true){
  if(!trace)return;
  trace=null;
  el('trace-panel').hidden=true;
  for(const button of document.querySelectorAll('[data-trace]'))button.setAttribute('aria-pressed','false');
  plant?.setTrace('both');
  if(restore)setChapter(chapter);
}
function startTrace(fluid){
  if(trace===fluid){clearTrace();return;}
  stopTour();stopOpening(false);clearTrace(false);
  trace=fluid;
  el('trace-panel').hidden=false;
  for(const button of document.querySelectorAll('[data-trace]'))button.setAttribute('aria-pressed',String(button.dataset.trace===fluid));
  plant?.setTrace(fluid);
  renderTraceRail();showTraceStop(0);
}
function applyHud(value){
  hud=value;
  document.body.classList.toggle('hud-hidden',!hud);
  el('hud').setAttribute('aria-pressed',String(hud));
  el('hud').textContent=hud?'Hide HUD':'Show HUD';
  plant?.setProjection(presenting&&hud&&openingFrame<0);
}
function applyPresent(value){
  presenting=value;document.body.classList.toggle('is-presenting',value);
  el('present').setAttribute('aria-pressed',String(value));
  el('present').lastElementChild.textContent=value?'Exit present':'Present';
  el('presenter-cue').hidden=!value;
  el('hud').hidden=!value;
  if(!value){stopOpening();applyHud(true);}
  else plant?.setProjection(hud&&openingFrame<0);
}
async function enterPresent(){
  if(presenting)return;
  applyPresent(true);
  if(document.documentElement.requestFullscreen){
    try{await document.documentElement.requestFullscreen();}catch{/* The in-page presentation layout remains available. */}
  }
}
async function togglePresent(){
  if(!presenting){await enterPresent();return;}
  if(document.fullscreenElement)await document.exitFullscreen();
  else applyPresent(false);
}
function stopOpening(restore=true){
  if(openingFrame<0)return;
  clearTimeout(openingTimer);openingTimer=null;openingFrame=-1;
  el('opener').hidden=true;document.body.classList.remove('is-opening');
  plant?.setProjection(presenting&&hud);
  if(restore)setChapter(0);
}
function showOpeningFrame(i){
  if(i===opening.length){stopOpening();return;}
  openingFrame=i;
  const shot=opening[i];
  el('opener-tag').textContent=shot.tag;
  el('opener-title').textContent=shot.title;
  el('opener-text').textContent=shot.text;
  for(const [index,mark] of [...el('opener-progress').children].entries())mark.classList.toggle('current',i>=index);
  plant?.focus(shot.view,false,i===0?1800:2100);
  openingTimer=setTimeout(()=>showOpeningFrame(i+1),shot.time);
}
async function startOpening(){
  if(openingFrame>=0)return;
  stopTour();clearTrace(false);setMode('integrated');setChapter(0);
  openingFrame=0;
  document.body.classList.add('is-opening');
  el('opener').hidden=false;
  applyHud(true);
  if(plan){plan=false;el('plan').setAttribute('aria-pressed','false');plant?.setCamera('iso');}
  showOpeningFrame(0);
  await enterPresent();
  if(openingFrame>=0)el('skip-opening').focus({preventScroll:true});
}
document.addEventListener('fullscreenchange',()=>applyPresent(Boolean(document.fullscreenElement)));
el('open-show').addEventListener('click',startOpening);
el('skip-opening').addEventListener('click',()=>{stopOpening();el('open-show').focus({preventScroll:true});});
el('hud').addEventListener('click',()=>applyHud(!hud));
el('close-trace').addEventListener('click',()=>clearTrace());
el('profiles').addEventListener('click',e=>{
  const b=e.target.closest('[data-profile]');
  if(b&&el('availability')){dutyProfile=b.dataset.profile;useDutyProfile();}
});
el('hour').addEventListener('input',e=>{if(el('availability')){hour=Number(e.target.value);useDutyProfile();}});
el('trace-stops').addEventListener('click',e=>{
  const button=e.target.closest('[data-stop]');if(button)showTraceStop(Number(button.dataset.stop));
});
document.querySelectorAll('[data-trace]').forEach(button=>button.addEventListener('click',()=>startTrace(button.dataset.trace)));
chaptersNav.addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b)step(Number(b.dataset.chapter));});
hotspots.addEventListener('click',e=>{const b=e.target.closest('[data-equipment]');if(b)inspect(b.dataset.equipment);});
el('close-card').addEventListener('click',closeCard);
el('next').addEventListener('click',()=>trace?showTraceStop(traceIndex+1):step(chapter+1));
el('tour').addEventListener('click',toggleTour);
el('present').addEventListener('click',togglePresent);
el('sources').addEventListener('click',()=>el('basis').showModal());
el('flow').addEventListener('click',e=>{
  flow=!flow;e.currentTarget.setAttribute('aria-pressed',String(flow));plant?.setFlow(flow);
});
el('labels').addEventListener('click',e=>{
  labels=!labels;e.currentTarget.setAttribute('aria-pressed',String(labels));plant?.setLabels(labels);
});
el('reset').addEventListener('click',()=>{closeCard();if(trace)showTraceStop(traceIndex);else{renderStageControls();plant?.focus(chapters[chapter].focus);}});
el('plan').addEventListener('click',e=>{
  plan=!plan;e.currentTarget.setAttribute('aria-pressed',String(plan));
  plant?.setCamera(plan?'plan':'iso');
  if(trace)showTraceStop(traceIndex);else renderStageControls();
});
for(const [key,apply] of [
  ['core',value=>{coreView=value;plant?.setCore(value);renderStageControls();}],
  ['stream',value=>plant?.setStream(value)],
  ['deep',value=>{deepView=value;plant?.focus('deep');plant?.setDeep(value);renderStageControls();}],
]){
  const buttons=[...document.querySelectorAll('[data-'+key+']')];
  for(const button of buttons)button.addEventListener('click',()=>{
    stopTour();
    for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));
    apply(button.dataset[key]);
  });
}
el('plan').disabled=!plant;
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||el('basis').open||e.target.closest('input:not([type=range]),textarea,select,[contenteditable]'))return;
  if(!e.target.closest('input[type=range]')){
    if(e.key==='ArrowRight'){e.preventDefault();trace?showTraceStop(traceIndex+1):step(chapter+1);}
    if(e.key==='ArrowLeft'){e.preventDefault();trace?showTraceStop(traceIndex-1):step(chapter-1);}
    if(/^[1-5]$/.test(e.key))step(Number(e.key)-1);
  }
  if(e.key.toLowerCase()==='f'&&!e.repeat)togglePresent();
  if(e.key.toLowerCase()==='h'&&presenting&&!e.repeat)applyHud(!hud);
  if(e.key==='Escape'){if(openingFrame>=0)stopOpening();else if(trace)clearTrace();else{closeCard();if(presenting&&!document.fullscreenElement)applyPresent(false);}}
});
setChapter(0);
setMode('integrated');
