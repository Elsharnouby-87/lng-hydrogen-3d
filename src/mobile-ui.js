/**
 * Mobile 3D navigation and controls; uses callbacks to the main scene rather
 * than duplicating plant state or engineering logic.
 */
export function initMobileUI({ chapters, equipment, getState, onStep, onInspect, onTrace, onPlan, onZoom }) {
  const el = (id) => document.getElementById(id);
// Mobile-first 3D Explorer. All desktop tour controls and screen-model logic
// are retained. The mobile widgets call the existing commands, not duplicates.
const mobileView = matchMedia('(max-width: 800px)');
let mobilePanel = null;
let mobileMenuOpen = false;
let mobileSheetExpanded = false;
const mobileSheet = el('mobile-bottom-sheet');
const mobileChapter = el('mobile-chapter');
mobileChapter.innerHTML = chapters.map((c,i) =>
  '<option value="' + i + '">' + String(i+1).padStart(2,'0') + ' · ' +
  ['Plant','LNG terminal','Precooling','Cold box','Operating match'][i] + '</option>'
).join('');
mobileChapter.addEventListener('change', () => onStep(Number(mobileChapter.value)));

function setMobileMenu(open) {
  mobileMenuOpen = Boolean(open) && mobileView.matches;
  el('mobile-menu-toggle').setAttribute('aria-expanded',String(mobileMenuOpen));
  el('mobile-menu-toggle').setAttribute('aria-label',mobileMenuOpen ? 'Close navigation' : 'Open navigation');
  el('mobile-menu-toggle').textContent = mobileMenuOpen ? '×' : '☰';
  document.querySelector('.masthead').classList.toggle('mobile-menu-open',mobileMenuOpen);
}
el('mobile-menu-toggle').addEventListener('click', () => setMobileMenu(!mobileMenuOpen));
el('mobile-site-nav').addEventListener('click',event => {
  if(event.target.closest('button,a')) setMobileMenu(false);
});
document.addEventListener('pointerdown',event => {
  if(mobileMenuOpen && !event.target.closest('.masthead')) setMobileMenu(false);
},true);

const mobileEscape = text => String(text).replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const mobileEquipment = [
  ['compressor','K-101','H₂ Compressor'],['exchange','E-101','Precooler'],
  ['cryo','R-101','Cold Box'],['pump','P-201','LNG Pump'],
  ['trim','E-202','Vaporizer'],['liquid','TK-301','LH₂ Storage'],
  ['lng','TK-201','LNG Storage'],['feed','H₂','Hydrogen Feed'],
  ['grid','NG','Gas Send-out'],
].filter(([id])=>Boolean(equipment[id]));

function setMobileSheetExpanded(value) {
  mobileSheetExpanded = Boolean(value);
  mobileSheet.classList.toggle('is-expanded',mobileSheetExpanded);
  el('mobile-sheet-handle').setAttribute('aria-expanded',String(mobileSheetExpanded));
}
function renderMobileSheet() {
  if (!mobilePanel) return;
  const { chapter, selection, flow, labels, plan } = getState();
  const panel = el('mobile-sheet-content');
  const titles={equipment:'Explore equipment',flow:'Flow & circuit tracing',
    camera:'Camera & display',info:'Engineering context'};
  el('mobile-sheet-title').textContent=titles[mobilePanel];
  if(mobilePanel==='equipment') {
    panel.innerHTML='<p class="mobile-sheet-note">Tap a unit to inspect it in 3D. Swipe the sheet upward for the full list.</p>'+
      '<div class="mobile-equipment-grid">'+mobileEquipment.map(([id,tag,label])=>
        '<button type="button" data-mobile-equip="'+mobileEscape(id)+'"><b>'+
        mobileEscape(tag)+'</b><span>'+mobileEscape(label)+'</span></button>').join('')+'</div>';
  } else if(mobilePanel==='flow'){
    panel.innerHTML='<p class="mobile-sheet-note">Show both flow circuits or follow hydrogen / LNG through each operating stage.</p>'+
      '<div class="mobile-sheet-grid">'+
      '<button type="button" data-mobile-command="trace-h2">Trace hydrogen →</button>'+
      '<button type="button" data-mobile-command="trace-lng">Trace LNG →</button>'+
      '<button type="button" data-mobile-command="flow">'+(flow?'Pause animated flow':'Resume animated flow')+'</button>'+
      '<button type="button" data-mobile-command="labels">'+(labels?'Hide equipment labels':'Show equipment labels')+'</button>'+
      '</div>';
  } else if(mobilePanel==='camera'){
    panel.innerHTML='<p class="mobile-sheet-note">Drag to orbit • pinch to zoom • tap a tagged unit to inspect.</p>'+
      '<div class="mobile-sheet-grid">'+
      '<button type="button" data-mobile-command="reset">⌖ Recenter plant</button>'+
      '<button type="button" data-mobile-command="plan">'+(plan?'◇ Isometric camera':'▱ Plan / top view')+'</button>'+
      '<button type="button" data-mobile-command="zoom-in">+ Zoom in</button>'+
      '<button type="button" data-mobile-command="zoom-out">− Zoom out</button>'+
      '<button type="button" data-mobile-command="inspect">▣ Equipment sections</button>'+
      (chapter===2 ? '<button type="button" data-mobile-command="e101-tour">E-101 inspection tour</button>' : '')+
      '<button type="button" data-mobile-command="clean">⛶ Clean 3D view</button></div>';
  } else {
    const e=selection?equipment[selection]:null;
    const title=e?e.label:el('chapter-title').textContent;
    const body=e?e.detail:el('chapter-body').textContent;
    const metrics=!e ? [...document.querySelectorAll('#detail .metrics > div')].map(div=>
      '<div><b>'+mobileEscape(div.querySelector('strong')?.textContent||'')+'</b><span>'+
      mobileEscape(div.querySelector('small')?.textContent||'')+'</span></div>').join('') : '';
    panel.innerHTML='<h3>'+mobileEscape(title)+'</h3><p>'+mobileEscape(body)+'</p>'+
      (metrics?'<div class="mobile-sheet-metrics">'+metrics+'</div>':'')+
      '<button class="mobile-sheet-read" type="button" data-mobile-command="read">Read full chapter ↓</button>';
  }
}
function setMobilePanel(which) {
  mobilePanel=mobileView.matches && which ? which : null;
  mobileSheet.hidden=!mobilePanel;
  document.body.classList.toggle('mobile-sheet-open',Boolean(mobilePanel));
  for(const b of document.querySelectorAll('[data-mobile-panel]'))
    b.setAttribute('aria-pressed',String(b.dataset.mobilePanel===mobilePanel));
  setMobileSheetExpanded(false);
  if(mobilePanel) {
    setMobileMenu(false);
    renderMobileSheet();
  }
}
document.querySelectorAll('[data-mobile-panel]').forEach(button=>{
  button.addEventListener('click',()=>setMobilePanel(mobilePanel===button.dataset.mobilePanel?null:button.dataset.mobilePanel));
});
el('mobile-sheet-close').addEventListener('click',()=>setMobilePanel(null));
let mobileSheetDrag=null,mobileSheetDragged=false;
el('mobile-sheet-handle').addEventListener('click',()=>{
  if(mobileSheetDragged){mobileSheetDragged=false;return;}
  setMobileSheetExpanded(!mobileSheetExpanded);
});
el('mobile-sheet-handle').addEventListener('pointerdown',event=>{
  if(!event.isPrimary)return;
  mobileSheetDragged=false;mobileSheetDrag={y:event.clientY};
  event.currentTarget.setPointerCapture?.(event.pointerId);
});
el('mobile-sheet-handle').addEventListener('pointerup',event=>{
  if(!mobileSheetDrag)return;
  const delta=event.clientY-mobileSheetDrag.y;mobileSheetDrag=null;
  if(Math.abs(delta)>42){
    mobileSheetDragged=true;
    if(delta<0)setMobileSheetExpanded(true);
    else if(mobileSheetExpanded)setMobileSheetExpanded(false);
    else setMobilePanel(null);
  }
});
el('mobile-sheet-handle').addEventListener('pointercancel',()=>mobileSheetDrag=null);

function setMobileClean(value) {
  const on=Boolean(value)&&mobileView.matches;
  document.body.classList.toggle('mobile-clean',on);
  el('mobile-clean').setAttribute('aria-pressed',String(on));
  el('mobile-restore').hidden=!on;
  if(on) {setMobilePanel(null);setMobileMenu(false);}
}
el('mobile-clean').addEventListener('click',()=>setMobileClean(true));
el('mobile-restore').addEventListener('click',()=>setMobileClean(false));

function mobileInspection() {
  const hasInspection=!el('inspection').hidden && (
    !el('core-modes').hidden || !el('deep-modes').hidden || !el('lh2-modes').hidden
  );
  if(!hasInspection) {setMobilePanel('equipment');return;}
  const open=!document.body.classList.contains('mobile-inspection-open');
  document.body.classList.toggle('mobile-inspection-open',open);
  el('mobile-inspect').setAttribute('aria-expanded',String(open));
}
el('mobile-inspect').addEventListener('click',mobileInspection);

const mobileCommands={
  'reset':()=>el('reset').click(),
  'zoom-in':()=>onZoom(1.28),
  'zoom-out':()=>onZoom(.78),
  'plan':()=>onPlan(!getState().plan),
  'flow':()=>el('flow').click(),
  'labels':()=>el('labels').click(),
  'inspect':mobileInspection,
  'e101-tour':()=>{setMobilePanel(null);el('e101-tour').click();},
  'clean':()=>setMobileClean(true),
  'trace-h2':()=>{setMobilePanel(null);onTrace('h2');},
  'trace-lng':()=>{setMobilePanel(null);onTrace('lng');},
  'read':()=>{setMobilePanel(null);document.querySelector('.narrative').scrollIntoView({behavior:'smooth',block:'start'});},
};
for(const [button,command] of [
  ['mobile-reset','reset'],['mobile-zoom-in','zoom-in'],['mobile-zoom-out','zoom-out']
]) el(button).addEventListener('click',mobileCommands[command]);
el('mobile-bottom-sheet').addEventListener('click',event=>{
  const equipmentButton=event.target.closest('[data-mobile-equip]');
  if(equipmentButton){setMobilePanel(null);onInspect(equipmentButton.dataset.mobileEquip);return;}
  const command=event.target.closest('[data-mobile-command]')?.dataset.mobileCommand;
  if(command&&mobileCommands[command]){
    mobileCommands[command]();
    if(mobilePanel)renderMobileSheet();
  }
});
mobileView.addEventListener('change',event=>{
  if(!event.matches) {
    setMobilePanel(null);setMobileClean(false);setMobileMenu(false);
    document.body.classList.remove('mobile-inspection-open');
    el('mobile-inspect').setAttribute('aria-expanded','false');
  }
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && mobileView.matches){
    if(mobileMenuOpen){setMobileMenu(false);event.stopImmediatePropagation();}
    else if(mobilePanel){setMobilePanel(null);event.stopImmediatePropagation();}
    else if(document.body.classList.contains('mobile-clean')){
      setMobileClean(false);event.stopImmediatePropagation();
    }
  }
},true);

  return {
    get panel() { return mobilePanel; },
    renderSheet: renderMobileSheet,
    closePanels() { setMobilePanel(null); setMobileMenu(false); setMobileClean(false); },
  };
}
