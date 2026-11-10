import {chapters,equipment} from './content.js';
import {createPlant} from './plant.js';

const el=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let chapter=0, mode='integrated', approach=8, available=78;
let flow=true, labels=true, selection=null, tourTimer=null, plant=null, presenting=false;
let coreView='cutaway', deepView='cutaway', plan=false;

const chaptersNav=el('chapters');
chaptersNav.innerHTML=chapters.map((c,i)=>`<button type="button" data-chapter="${i}"><b>0${i+1}</b><span>${c.label}</span></button>`).join('');
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
  if(chapter===chapters.length-1)setChapter(0);
  el('tour').classList.add('is-playing');
  el('tour').children[1].textContent='Pause guided tour';
  schedule();
}
function step(n){
  stopTour();
  setChapter(Math.max(0,Math.min(chapters.length-1,n)));
}
function closeCard(){
  if(selection)hotspots.querySelector(`[data-equipment="${selection}"]`)?.classList.remove('selected');
  selection=null;el('equipment-card').hidden=true;
}
function inspect(id){
  const item=equipment[id];if(!item)return;
  stopTour();closeCard();
  const nextChapter=chapters.findIndex(c=>c.id===item.chapter);
  if(nextChapter!==chapter)setChapter(nextChapter);
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
function updateDispatch(){
  const recovered=mode==='integrated'?Math.min(100,available):0;
  const backup=100-recovered;
  el('availability-value').textContent=available+'%';
  el('cold-bar').style.width=recovered+'%';el('backup-bar').style.width=backup+'%';
  el('recovered').textContent=recovered+'%';el('backup').textContent=backup+'%';
  el('dispatch-note').textContent=mode==='standalone'?'Mechanical precooling covers the full normalized duty.':'Illustrative duty balance. Deep refrigeration remains in service.';
  plant?.setAvailable(available/100);
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
    el('availability').addEventListener('input',e=>{available=Number(e.target.value);updateDispatch();});
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
  el('stream-modes').hidden=!exchange||coreView==='shell';
  el('deep-modes').hidden=!deep;
  const title=exchange?'E-101 '+coreView.toUpperCase():deep?'R-101 '+deepView.toUpperCase():names[chapter];
  el('view-name').textContent=plan?'PLAN · '+title:title;
}
function setChapter(i){
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
  plant?.focus(c.focus);
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
  const h=el('schematic-h2'),l=el('schematic-lng'),heat=el('schematic-heat');
  if(h&&l&&heat){
    h.setAttribute('d',value==='integrated'?'M35 151H720':'M35 151H220V30H540V151H720');
    l.setAttribute('d',value==='integrated'?'M720 216H35':'M720 216H540V305H220V216H35');
    heat.style.display=value==='integrated'?'':'none';
  }
}
function applyPresent(value){
  presenting=value;document.body.classList.toggle('is-presenting',value);
  el('present').setAttribute('aria-pressed',String(value));
  el('present').lastElementChild.textContent=value?'Exit present':'Present';
  el('presenter-cue').hidden=!value;
}
async function togglePresent(){
  if(presenting){
    if(document.fullscreenElement)await document.exitFullscreen();
    applyPresent(false);return;
  }
  applyPresent(true);
  if(document.documentElement.requestFullscreen){
    try{await document.documentElement.requestFullscreen();}catch{/* The in-page presenter layout is still available. */}
  }
}
document.addEventListener('fullscreenchange',()=>applyPresent(Boolean(document.fullscreenElement)));
chaptersNav.addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b)step(Number(b.dataset.chapter));});
hotspots.addEventListener('click',e=>{const b=e.target.closest('[data-equipment]');if(b)inspect(b.dataset.equipment);});
el('close-card').addEventListener('click',closeCard);
el('next').addEventListener('click',()=>step(chapter+1));
el('tour').addEventListener('click',toggleTour);
el('present').addEventListener('click',togglePresent);
el('sources').addEventListener('click',()=>el('basis').showModal());
el('flow').addEventListener('click',e=>{
  flow=!flow;e.currentTarget.setAttribute('aria-pressed',String(flow));plant?.setFlow(flow);plant?.setAvailable(available/100);
});
el('labels').addEventListener('click',e=>{
  labels=!labels;e.currentTarget.setAttribute('aria-pressed',String(labels));plant?.setLabels(labels);
});
el('reset').addEventListener('click',()=>{closeCard();renderStageControls();plant?.focus(chapters[chapter].focus);});
el('plan').addEventListener('click',e=>{
  plan=!plan;e.currentTarget.setAttribute('aria-pressed',String(plan));
  plant?.setCamera(plan?'plan':'iso');
  renderStageControls();
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
  if(e.altKey||e.ctrlKey||e.metaKey||el('basis').open||e.target.closest('input,textarea,select'))return;
  if(e.key==='ArrowRight'){e.preventDefault();step(chapter+1);}
  if(e.key==='ArrowLeft'){e.preventDefault();step(chapter-1);}
  if(/^[1-5]$/.test(e.key))step(Number(e.key)-1);
  if(e.key.toLowerCase()==='f'&&!e.repeat)togglePresent();
  if(e.key==='Escape'){closeCard();if(presenting&&!document.fullscreenElement)applyPresent(false);}
});
setChapter(0);
setMode('integrated');
