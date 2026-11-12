import { initScreening } from './screening.js';
import { chapters, equipment } from './content.js';
import { initOperatingMatch } from './operating-match.js';
import { createPlant } from './plant.js';
import { bypass, opening, traces } from './storyboard.js';

const el = (id) => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let chapter = 0,
  mode = 'integrated',
  approach = 8;
let flow = true,
  labels = true,
  selection = null,
  tourTimer = null,
  plant,
  presenting = false;
let coreView = 'cutaway',
  deepView = 'cutaway',
  deepStream = 'both',
  lh2View = 'shell',
  plan = false,
  hud = true;
let trace = null,
  traceIndex = 0,
  openingFrame = -1,
  openingTimer = null;
let screeningOpen = false;
let inspectionShot = null;
const inspectionShots = [
  { chapter: 0, camera: 'overview', title: 'Plant overview', note: 'Find E-101 between the LNG and hydrogen systems.' },
  { chapter: 2, camera: 'flange', title: 'E-101 flange close-up', note: 'Inspect the machined flange, gasket joint and insulated casing.' },
  { chapter: 2, camera: 'section', title: 'Inside the plate-fin core', note: 'Move the section plane. Trace each stream from its header through parallel passages.' },
];

const chaptersNav = el('chapters');
chaptersNav.innerHTML = chapters
  .map((c, i) => `<button type="button" data-chapter="${i}"><b>0${i + 1}</b><span>${c.label}</span></button>`)
  .join('');
const hotspots = el('hotspots');
hotspots.innerHTML = Object.entries(equipment)
  .map(
    ([id, item]) =>
      `<button type="button" class="hotspot ${item.chapter === 'lng' ? 'lng' : ''}" data-equipment="${id}" aria-label="Inspect ${item.label}" hidden><span><em>${item.code}</em>${item.label}</span></button>`,
  )
  .join('');
const operatingMatch = initOperatingMatch((fraction) => plant?.setAvailable(fraction));
const dutyOverlay = el('screen-duty-overlay');
const modes = document.querySelectorAll('[data-mode]');
const coreModes = document.querySelectorAll('[data-core]');
const streamModes = document.querySelectorAll('[data-stream]');
const deepModes = document.querySelectorAll('[data-deep]');
const deepStreamModes = document.querySelectorAll('[data-deep-stream]');
const lh2Modes = document.querySelectorAll('[data-lh2]');
const traceModes = document.querySelectorAll('[data-trace]');
const equipmentInfoMedia = matchMedia('(max-width:800px)');
function setEquipmentInfoExpanded(expanded) {
  const card = el('equipment-card');
  card.classList.toggle('is-collapsed',!expanded);
  el('equipment-body').hidden=!expanded;
  const toggle=el('equipment-info-toggle');
  toggle.setAttribute('aria-expanded',String(expanded));
  toggle.textContent=expanded?'− Hide equipment info':'i · Equipment info';
}
el('equipment-info-toggle').addEventListener('click',()=>{
  setEquipmentInfoExpanded(el('equipment-body').hidden);
});
equipmentInfoMedia.addEventListener('change',event=>{
  if(!el('equipment-card').hidden)setEquipmentInfoExpanded(!event.matches);
});

// The R-101 explanation is useful on desktop, but hides the model on phones.
// Start with a small, reversible info chip below the inspection controls.
const coldboxInfoMedia = window.matchMedia('(max-width: 800px)');
function setColdboxInfoExpanded(expanded) {
  el('coldbox-info-details').hidden = !expanded;
  el('coldbox-note').classList.toggle('is-collapsed', !expanded);
  const button = el('coldbox-info-toggle');
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('aria-label', expanded ? 'Hide R-101 information' : 'Show R-101 information');
  el('coldbox-info-icon').textContent = expanded ? '×' : 'i';
  el('coldbox-info-toggle-label').textContent = expanded ? 'Hide info' : 'R-101 info';
}
setColdboxInfoExpanded(!coldboxInfoMedia.matches);
el('coldbox-info-toggle').addEventListener('click', () =>
  setColdboxInfoExpanded(el('coldbox-info-details').hidden)
);
coldboxInfoMedia.addEventListener('change', event => setColdboxInfoExpanded(!event.matches));


function markPressed(buttons, key, value) {
  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button.dataset[key] === value));
  }
}

function markCurrent(buttons, selected) {
  for (const [index, button] of Array.from(buttons).entries()) {
    if (index === selected) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
}

function fallback() {
  el('fallback').hidden = false;
  el('fallback').innerHTML =
    `<svg viewBox="0 0 760 350" role="img" aria-label="2D backup showing separate hydrogen and LNG paths and a shared heat exchanger">
  <defs><marker id="aB" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path fill="#67cfff" d="M0 0 8 4 0 8Z"/></marker><marker id="aG" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path fill="#6eefd0" d="M0 0 8 4 0 8Z"/></marker></defs>
  <rect x="274" y="55" width="206" height="232" rx="8" fill="#203c53" stroke="#69859b"/><text x="377" y="85" fill="#fff" font-size="21" text-anchor="middle">E-101 · Precooler</text>
  <g fill="#67cfff" font-size="18" font-family="Arial"><text x="36" y="121">Conditioned H₂</text><text x="513" y="121">Deep cooling · LH₂</text></g>
  <g fill="#6eefd0" font-size="18" font-family="Arial"><text x="37" y="255">Trim · Gas grid</text><text x="514" y="255">LNG tank · Pump</text></g>
  <path id="schematic-h2" d="M35 151H720" fill="none" stroke="#67cfff" stroke-width="4" marker-end="url(#aB)"/>
  <path id="schematic-lng" d="M720 216H35" fill="none" stroke="#6eefd0" stroke-width="4" marker-end="url(#aG)"/>
  <text x="377" y="327" fill="#bdcfdf" font-size="15" text-anchor="middle">2D backup · WebGL unavailable</text>
  </svg>`;
}
function initializePlant() {
  const model = el('model');
  try {
    plant = createPlant(model, hotspots, inspect, reduce);
    model.dataset.renderer = plant.kind;
    plant.setAvailable(operatingMatch.fraction);
    plant.setProjection(presenting && hud && openingFrame < 0);
  } catch (error) {
    plant = null;
    model.replaceChildren();
    console.warn('3D initialization failed; using the process schematic.', error);
    fallback();
  }
  el('plan').disabled = !plant;
  renderStageControls();
}
function stopTour() {
  if (tourTimer !== null) clearTimeout(tourTimer);
  tourTimer = null;
  el('tour').classList.remove('is-playing');
  el('tour').children[1].textContent = 'Play guided tour';
}
function schedule() {
  tourTimer = setTimeout(() => {
    if (chapter === chapters.length - 1) {
      stopTour();
      return;
    }
    setChapter(chapter + 1);
    schedule();
  }, 14000);
}
function toggleTour() {
  closeInspectionTour(true);
  if (tourTimer !== null) {
    stopTour();
    return;
  }
  stopOpening(false);
  clearTrace(false);
  if (chapter === chapters.length - 1) setChapter(0);
  el('tour').classList.add('is-playing');
  el('tour').children[1].textContent = 'Pause guided tour';
  schedule();
}
function step(n) {
  closeInspectionTour();
  stopTour();
  stopOpening(false);
  clearTrace(false);
  setChapter(Math.max(0, Math.min(chapters.length - 1, n)));
}
function closeCard() {
  if (selection) hotspots.querySelector(`[data-equipment="${selection}"]`)?.classList.remove('selected');
  selection = null;
  el('equipment-card').hidden = true;
}
function inspect(id) {
  closeInspectionTour();
  const item = equipment[id];
  if (!item) return;
  stopTour();
  stopOpening(false);
  clearTrace(false);
  closeCard();
  const nextChapter = chapters.findIndex((c) => c.id === item.chapter);
  setChapter(nextChapter, false);
  const focus = id === 'grid' ? 'trim' : ['cryo', 'catalyst', 'separator'].includes(id) ? 'deep' : id;
  plant?.focus(exchangeFocus(focus));
  selection = id;
  hotspots.querySelector(`[data-equipment="${id}"]`)?.classList.add('selected');
  el('equipment-code').textContent = item.code;
  el('equipment-name').textContent = item.label;
  el('equipment-detail').textContent = item.detail;
  el('equipment-card').hidden = false;
  setEquipmentInfoExpanded(!equipmentInfoMedia.matches);
  if (mobilePanel) setMobilePanel(null);
  if (focus === 'exchange' || focus === 'deep' || id === 'liquid') renderStageControls();
  else el('view-name').textContent = 'EQUIPMENT FOCUS';
}
function updateApproach() {
  el('approach-value').textContent = approach + ' K';
  el('bound').textContent = '≥ ' + (111 + approach) + ' K';
  el('approach-note').textContent =
    mode === 'integrated'
      ? '111 K illustrative LNG inlet. The actual minimum approach can occur inside the exchanger.'
      : 'LNG exchanger bypassed in standalone mode. The inequality applies when the exchanger is in service.';
}
function renderDetail(c) {
  const detail = el('detail');
  if (c.id === 'exchange') {
    detail.innerHTML = `<div class="control"><label for="approach">Cold-end approach <output id="approach-value"></output></label>
    <input id="approach" type="range" min="3" max="25" step="1" value="${approach}">
    <div class="control-reading">H₂ outlet lower bound <strong id="bound"></strong></div><p id="approach-note" class="control-note"></p></div>`;
    el('approach').addEventListener('input', (e) => {
      approach = Number(e.target.value);
      updateApproach();
    });
    updateApproach();
  } else if (c.id === 'match') {
    operatingMatch.render(detail);
  } else {
    detail.innerHTML = `<div class="metrics">${c.metrics.map(([value, label]) => `<div><strong>${value}</strong><small>${label}</small></div>`).join('')}</div>`;
  }
}
const names = [
  'ISOMETRIC PLANT VIEW',
  'LNG RECEIVING & PUMPING',
  'E-101 CUTAWAY',
  'R-101 COLD BOX',
  'OPERATING MATCH',
];
function renderStageControls() {
  const { id } = chapters[chapter];
  const exchange = id === 'exchange';
  const deep = id === 'deep';
  const storageFocus = selection === 'liquid';
  el('inspection').hidden = !plant || (!exchange && !deep);
  el('core-modes').hidden = !exchange;
  el('e101-tour').hidden = plant?.kind !== 'webgl';
  el('section-controls').hidden = !exchange || coreView !== 'section' || plant?.kind !== 'webgl';
  document.querySelector('[data-core=section]').hidden = plant?.kind !== 'webgl';
  el('stream-modes').hidden = !exchange || coreView === 'shell' || Boolean(trace);
  el('deep-modes').hidden = !deep || storageFocus;
  el('deep-stream-modes').hidden = !deep || storageFocus || deepView === 'shell' || Boolean(trace);
  el('lh2-modes').hidden = !storageFocus || Boolean(trace);
  el('coldbox-note').hidden = !deep || storageFocus;
  el('coldbox-caption').textContent = deepView === 'shell'
    ? 'Insulated housing with distinct hydrogen and helium connection ports.'
    : deepView === 'exploded'
      ? 'Modules lifted for inspection; piping hidden to avoid disconnected joints.'
      : 'Three plate-fin heat exchanger stages, two helium expander branches and an ortho–para bed.';
  el('profile-panel').hidden = id !== 'match' || Boolean(trace);
  const title = exchange
    ? 'E-101 ' + coreView.toUpperCase()
    : deep
      ? (storageFocus ? 'TK-301 · LH₂ ' + lh2View.toUpperCase() : 'R-101 ' + deepView.toUpperCase())
      : names[chapter];
  el('view-name').textContent = plan ? 'PLAN · ' + title : title;
}
function setChapter(i, moveCamera = true) {
  clearScreeningDuty();
  chapter = i;
  const c = chapters[i];
  closeCard();
  el('chapter-index').textContent = '0' + (i + 1);
  el('kicker').textContent = c.kicker;
  el('chapter-title').textContent = c.title;
  el('chapter-body').textContent = c.body;
  el('presenter-cue').textContent = c.cue;
  el('presenter-cue').hidden = !presenting;
  renderStageControls();
  el('next').disabled = i === chapters.length - 1;
  markCurrent(chaptersNav.children, i);
  renderDetail(c);
  if (el('mobile-chapter')) el('mobile-chapter').value = String(i);
  if (mobilePanel === 'info') renderMobileSheet();
  if (moveCamera) plant?.focus(exchangeFocus(c.focus));
}
function setMode(value) {
  clearScreeningDuty();
  mode = value;
  markPressed(modes, 'mode', value);
  el('bypass-legend').hidden = value !== 'standalone';
  plant?.setMode(value);
  operatingMatch.setMode(value);
  if (el('approach')) updateApproach();
  if (trace) {
    renderTraceRail();
    showTraceStop(traceIndex);
  }
  const h = el('schematic-h2'),
    l = el('schematic-lng');
  if (h && l) {
    h.setAttribute('d', value === 'integrated' ? 'M35 151H720' : 'M35 151H220V30H540V151H720');
    l.setAttribute('d', value === 'integrated' ? 'M720 216H35' : 'M720 216H540V305H220V216H35');
  }
}

function setPlan(value) {
  plan = value;
  el('plan').setAttribute('aria-pressed', String(value));
  plant?.setCamera(value ? 'plan' : 'iso');
  if (trace) showTraceStop(traceIndex);
  else renderStageControls();
}

function exchangeFocus(view) {
  return view === 'exchange' && coreView === 'section' ? 'section' : view;
}

function updateSectionDepth(value) {
  const feature = value < 6 ? 'Inlet header' : value < 17 ? 'Flow distributor' :
    value < 84 ? 'Corrugated fin passages' : value < 96 ? 'Outlet distributor' : 'Outlet header';
  el('section-depth').value = value;
  el('section-depth').setAttribute('aria-valuetext', feature);
  el('section-feature').textContent = feature;
  plant?.setSectionDepth(value);
}

function showInspectionShot(index) {
  const shot = inspectionShots[index];
  if (!shot || plant?.kind !== 'webgl') return;
  inspectionShot = index;
  setChapter(shot.chapter, false);
  if (plan) setPlan(false);
  setCoreView(shot.camera === 'section' ? 'section' : shot.camera === 'flange' ? 'shell' : 'cutaway');
  if (shot.camera === 'section') {
    setStream('both');
    updateSectionDepth(14);
  }
  plant.focus(shot.camera);
  if (shot.camera === 'flange') el('view-name').textContent = 'E-101 FLANGE CLOSE-UP';
  el('walk-title').textContent = shot.title;
  el('walk-note').textContent = shot.note;
  el('walk-count').textContent = `${index + 1} / ${inspectionShots.length}`;
  el('walk-prev').disabled = index === 0;
  el('walk-next').disabled = index === inspectionShots.length - 1;
  el('inspection-walk').hidden = false;
  el('e101-tour').setAttribute('aria-pressed', 'true');
}

function closeInspectionTour(restore = false) {
  if (inspectionShot === null) return;
  inspectionShot = null;
  el('inspection-walk').hidden = true;
  el('e101-tour').setAttribute('aria-pressed', 'false');
  if (restore) {
    if (chapter === 2) setCoreView('cutaway');
    plant?.focus(chapters[chapter].focus);
    el('e101-tour').focus({ preventScroll: true });
  }
}

function setCoreView(value) {
  coreView = value;
  markPressed(coreModes, 'core', value);
  if (value === 'section') updateSectionDepth(Number(el('section-depth').value));
  plant?.setCore(value);
  renderStageControls();
}

function setStream(value) {
  markPressed(streamModes, 'stream', value);
  plant?.setStream(value);
}

function setDeepView(value) {
  deepView = value;
  markPressed(deepModes, 'deep', value);
  plant?.setDeep(value);
  renderStageControls();
}

function setDeepStream(value) {
  deepStream = value;
  markPressed(deepStreamModes, 'deepStream', value);
  plant?.setDeepStream(value);
  renderStageControls();
}
function setLH2View(value) {
  lh2View = value === 'cutaway' ? 'cutaway' : 'shell';
  markPressed(lh2Modes, 'lh2', lh2View);
  plant?.setLH2View(lh2View);
  renderStageControls();
}

function advance(offset) {
  if (inspectionShot !== null) showInspectionShot(inspectionShot + offset);
  else if (trace) showTraceStop(traceIndex + offset);
  else step(chapter + offset);
}

function traceSteps() {
  const steps = traces[trace].steps;
  return mode === 'integrated'
    ? steps
    : steps.map((item) => (item.view === 'exchange' ? bypass[trace] : item));
}
function renderTraceRail() {
  el('trace-title').textContent = traces[trace].title;
  el('trace-stops').innerHTML = traceSteps()
    .map(
      (item, i) =>
        `<button type="button" data-stop="${i}"><b>0${i + 1}</b><span>${item.name}</span></button>`,
    )
    .join('');
}
function showTraceStop(i) {
  if (!trace) return;
  const steps = traceSteps();
  traceIndex = Math.max(0, Math.min(i, steps.length - 1));
  const stop = steps[traceIndex];
  setChapter(stop.chapter, false);
  el('chapter-index').textContent = '0' + (traceIndex + 1);
  el('kicker').textContent = traces[trace].title.toUpperCase();
  el('chapter-title').textContent = stop.name;
  el('chapter-body').textContent = stop.text;
  el('presenter-cue').textContent = 'Use ← and → to move between stops in this circuit.';
  el('next').disabled = traceIndex === steps.length - 1;
  markCurrent(el('trace-stops').children, traceIndex);
  el('view-name').textContent = (plan ? 'PLAN · ' : '') + stop.tag;
  plant?.focus(stop.view);
}
function clearTrace(restore = true) {
  if (!trace) return;
  trace = null;
  el('trace-panel').hidden = true;
  markPressed(traceModes, 'trace', null);
  plant?.setTrace('both');
  if (restore) setChapter(chapter);
}
function startTrace(fluid) {
  closeInspectionTour();
  if (coreView === 'section') setCoreView('cutaway');
  if (trace === fluid) {
    clearTrace();
    return;
  }
  stopTour();
  stopOpening(false);
  clearTrace(false);
  trace = fluid;
  el('trace-panel').hidden = false;
  markPressed(traceModes, 'trace', fluid);
  plant?.setTrace(fluid);
  renderTraceRail();
  showTraceStop(0);
}
function applyHud(value) {
  hud = value;
  document.body.classList.toggle('hud-hidden', !hud);
  el('hud').setAttribute('aria-pressed', String(hud));
  el('hud').textContent = hud ? 'Hide HUD' : 'Show HUD';
  plant?.setProjection(presenting && hud && openingFrame < 0);
}
function applyPresent(value) {
  presenting = value;
  document.body.classList.toggle('is-presenting', value);
  el('present').setAttribute('aria-pressed', String(value));
  el('present').lastElementChild.textContent = value ? 'Exit present' : 'Present';
  el('presenter-cue').hidden = !value;
  el('hud').hidden = !value;
  if (!value) {
    stopOpening();
    applyHud(true);
  } else plant?.setProjection(hud && openingFrame < 0);
}
async function enterPresent() {
  if (presenting) return;
  applyPresent(true);
  if (document.documentElement.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* The in-page presentation layout remains available. */
    }
  }
}
async function togglePresent() {
  if (!presenting) {
    await enterPresent();
    return;
  }
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (error) {
      if (!document.fullscreenElement) applyPresent(false);
      else console.warn('Unable to exit fullscreen.', error);
    }
    return;
  }
  applyPresent(false);
}
function stopOpening(restore = true) {
  if (openingFrame < 0) return;
  clearTimeout(openingTimer);
  openingTimer = null;
  openingFrame = -1;
  el('opener').hidden = true;
  document.body.classList.remove('is-opening');
  plant?.setProjection(presenting && hud);
  if (restore) setChapter(0);
}
function showOpeningFrame(i) {
  if (i === opening.length) {
    stopOpening();
    return;
  }
  openingFrame = i;
  const shot = opening[i];
  el('opener-tag').textContent = shot.tag;
  el('opener-title').textContent = shot.title;
  el('opener-text').textContent = shot.text;
  for (const [index, mark] of [...el('opener-progress').children].entries())
    mark.classList.toggle('current', i >= index);
  plant?.focus(shot.view, false, i === 0 ? 1800 : 2100);
  openingTimer = setTimeout(() => showOpeningFrame(i + 1), shot.time);
}
async function startOpening() {
  closeInspectionTour();
  if (openingFrame >= 0) return;
  stopTour();
  clearTrace(false);
  setMode('integrated');
  setChapter(0);
  openingFrame = 0;
  document.body.classList.add('is-opening');
  el('opener').hidden = false;
  applyHud(true);
  if (plan) setPlan(false);
  showOpeningFrame(0);
  await enterPresent();
  if (openingFrame >= 0) el('skip-opening').focus({ preventScroll: true });
}
document.addEventListener('fullscreenchange', () => applyPresent(Boolean(document.fullscreenElement)));
el('open-show').addEventListener('click', startOpening);
el('skip-opening').addEventListener('click', () => {
  stopOpening();
  el('open-show').focus({ preventScroll: true });
});
el('hud').addEventListener('click', () => applyHud(!hud));
el('close-trace').addEventListener('click', () => clearTrace());
el('trace-stops').addEventListener('click', (e) => {
  const button = e.target.closest('[data-stop]');
  if (button) showTraceStop(Number(button.dataset.stop));
});
traceModes.forEach((button) => button.addEventListener('click', () => startTrace(button.dataset.trace)));
chaptersNav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-chapter]');
  if (b) step(Number(b.dataset.chapter));
});
hotspots.addEventListener('click', (e) => {
  const b = e.target.closest('[data-equipment]');
  if (b) inspect(b.dataset.equipment);
});
el('close-card').addEventListener('click', closeCard);
el('next').addEventListener('click', () => advance(1));
el('tour').addEventListener('click', toggleTour);
el('present').addEventListener('click', togglePresent);
el('sources').addEventListener('click', () => el('basis').showModal());
el('flow').addEventListener('click', (e) => {
  flow = !flow;
  e.currentTarget.setAttribute('aria-pressed', String(flow));
  plant?.setFlow(flow);
});
el('labels').addEventListener('click', (e) => {
  labels = !labels;
  e.currentTarget.setAttribute('aria-pressed', String(labels));
  plant?.setLabels(labels);
});
el('reset').addEventListener('click', () => {
  closeCard();
  if (trace) showTraceStop(traceIndex);
  else {
    renderStageControls();
    plant?.focus(inspectionShot === null ? exchangeFocus(chapters[chapter].focus) : inspectionShots[inspectionShot].camera);
  }
});
el('section-depth').addEventListener('input', event => updateSectionDepth(Number(event.target.value)));
el('e101-tour').addEventListener('click', () => {
  if (inspectionShot !== null) return closeInspectionTour(true);
  stopTour();
  stopOpening(false);
  clearTrace(false);
  showInspectionShot(0);
  el('walk-next').focus({ preventScroll: true });
});
el('walk-prev').addEventListener('click', () => showInspectionShot(inspectionShot - 1));
el('walk-next').addEventListener('click', () => showInspectionShot(inspectionShot + 1));
el('walk-close').addEventListener('click', () => closeInspectionTour(true));
el('plan').addEventListener('click', () => setPlan(!plan));
for (const [buttons, key, apply] of [
  [coreModes, 'core', setCoreView],
  [streamModes, 'stream', setStream],
  [deepModes, 'deep', setDeepView],
  [deepStreamModes, 'deepStream', setDeepStream],
  [lh2Modes, 'lh2', setLH2View],
]) {
  for (const button of buttons) {
    button.addEventListener('click', () => {
      stopTour();
      if (key === 'core') closeInspectionTour();
      apply(button.dataset[key]);
    });
  }
}
modes.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
document.addEventListener('keydown', (e) => {
  if (
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    el('basis').open ||
    e.target.closest('input:not([type=range]),textarea,select,[contenteditable]')
  )
    return;
  if (screeningOpen) {
    if (e.key.toLowerCase() === 'f' && !e.repeat) togglePresent();
    return;
  }
  if (!e.target.closest('input[type=range]')) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      advance(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      advance(-1);
    }
    if (/^[1-5]$/.test(e.key)) step(Number(e.key) - 1);
  }
  if (e.key.toLowerCase() === 'f' && !e.repeat) togglePresent();
  if (e.key.toLowerCase() === 'h' && presenting && !e.repeat) applyHud(!hud);
  if (e.key === 'Escape') {
    if (openingFrame >= 0) stopOpening();
    else if (inspectionShot !== null) closeInspectionTour(true);
    else if (trace) clearTrace();
    else {
      closeCard();
      if (presenting && !document.fullscreenElement) applyPresent(false);
    }
  }
});
function clearScreeningDuty() {
  if (dutyOverlay.hidden) return;
  dutyOverlay.hidden = true;
  plant?.setScreeningDuty(null);
  plant?.setAvailable(operatingMatch.fraction);
}

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
mobileChapter.addEventListener('change', () => step(Number(mobileChapter.value)));

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
  'zoom-in':()=>plant?.zoomBy(1.28),
  'zoom-out':()=>plant?.zoomBy(.78),
  'plan':()=>setPlan(!plan),
  'flow':()=>el('flow').click(),
  'labels':()=>el('labels').click(),
  'inspect':mobileInspection,
  'e101-tour':()=>{setMobilePanel(null);el('e101-tour').click();},
  'clean':()=>setMobileClean(true),
  'trace-h2':()=>{setMobilePanel(null);startTrace('h2');},
  'trace-lng':()=>{setMobilePanel(null);startTrace('lng');},
  'read':()=>{setMobilePanel(null);document.querySelector('.narrative').scrollIntoView({behavior:'smooth',block:'start'});},
};
for(const [button,command] of [
  ['mobile-reset','reset'],['mobile-zoom-in','zoom-in'],['mobile-zoom-out','zoom-out']
]) el(button).addEventListener('click',mobileCommands[command]);
el('mobile-bottom-sheet').addEventListener('click',event=>{
  const equipmentButton=event.target.closest('[data-mobile-equip]');
  if(equipmentButton){setMobilePanel(null);inspect(equipmentButton.dataset.mobileEquip);return;}
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

setChapter(0);
setMode('integrated');
initScreening({
  onRoute(value) {
    screeningOpen = value;
    if (value) {
      stopTour();
      stopOpening(false);
      closeInspectionTour(true);
      clearScreeningDuty();
    }
    document.body.classList.toggle('is-screening', value);
    el('plant-view').hidden = value;
    if (!value && plant === undefined) initializePlant();
    plant?.setSuspended(value);
  },
  onDuty({ id, label, coverage }) {
    step(2);
    setMode('integrated');
    if (plan) setPlan(false);
    setCoreView('cutaway');
    setStream('both');
    plant?.setAvailable(coverage);
    plant?.setScreeningDuty(coverage);
    dutyOverlay.firstElementChild.textContent = label;
    dutyOverlay.lastElementChild.href = '#' + id;
    dutyOverlay.hidden = false;
  },
});
