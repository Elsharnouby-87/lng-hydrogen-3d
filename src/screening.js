import {
  basis,
  importRate,
  markets,
  powerCases,
  screen,
  supportedCapacity,
  uptakeCases,
} from './screening-model.js';

const storageKey = 'lng-hydrogen-screening-v1';
const initial = { share: 1, uptake: 500, power: 'central', wide: false };
const focusedMaxShare = 5;
const maxShare = 100;
const maxUptake = Math.max(...uptakeCases);
const get = (name) => document.getElementById('screen-' + name);
const say = (name, value) => {
  get(name).textContent = value;
};
const numberFormats = [0, 1, 2, 3].map(
  (digits) =>
    new Intl.NumberFormat('en', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }),
);
const n = (value, digits = 1) => numberFormats[digits].format(value);
const clampShare = (value) => Math.max(0, Math.min(maxShare, value));
const officialReport =
  'https://oapecorg.org/media/7df6bb51-393e-4b2e-9e54-e7b3b3998079/1715697290/' +
  [
    'التقارير',
    '2026',
    'الهيدروجين 2026',
    'الربع الثاني والثالث',
    'تطورات الغاز الطبيعي المسال والهيدروجين - الربع الثاني والثالث 2026.pdf',
  ]
    .map(encodeURIComponent)
    .join('/') +
  '#page=26';

function loadScenarios() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    /* Storage can be unavailable. */
  }
  return Object.fromEntries(
    Object.keys(markets).map((id) => {
      const old = saved?.[id] ?? {};
      return [
        id,
        {
          share: Number.isFinite(old.share) ? clampShare(old.share) : initial.share,
          uptake: uptakeCases.includes(old.uptake) ? old.uptake : initial.uptake,
          power:
            typeof old.power === 'string' && Object.hasOwn(powerCases, old.power) ? old.power : initial.power,
          wide: old.wide === true,
        },
      ];
    }),
  );
}

export function initScreening({ onRoute, onDuty }) {
  const scenarios = loadScenarios();
  const page = document.getElementById('screening');
  const nav = get('nav');
  const slider = get('share');
  const flow = get('flow');
  const presets = [...page.querySelectorAll('[data-share]')];
  const countryLinks = [...page.querySelectorAll('[data-market]')];
  const radios = [...page.querySelectorAll('input[type=radio]')];
  let lastCountry = 'kuwait';
  let selected;

  get('oapec').href = officialReport;

  function calculate() {
    const { share, uptake, power } = scenarios[selected];
    return screen(markets[selected], share, uptake, power);
  }

  function renderMarket() {
    const market = markets[selected];
    const yearChange = (market.imports / market.prior - 1) * 100;
    page.dataset.country = selected;
    say('title', `${market.name} LNG cold recovery`);
    say('terminal', market.terminal);
    say('facility-type', market.type);
    for (const link of countryLinks) {
      if (link.dataset.market === selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    say('yoy', (yearChange >= 0 ? '+' : '−') + n(Math.abs(yearChange)) + '%');
    say('prior', n(market.prior, 2));
    say('imports', n(market.imports, 2));
    get('prior-bar').style.width = (market.prior / 12) * 100 + '%';
    get('import-bar').style.width = (market.imports / 12) * 100 + '%';
    say('mean', n(importRate(market)));
  }

  function renderControls(state, result, keepFlow) {
    const expanded = state.wide || state.share > focusedMaxShare;
    const range = expanded ? maxShare : focusedMaxShare;
    for (const radio of radios) radio.checked = String(state[radio.name]) === radio.value;
    for (const button of presets)
      button.setAttribute('aria-pressed', String(state.share === Number(button.dataset.share)));

    slider.max = range;
    slider.value = state.share;
    slider.setAttribute('aria-valuetext', n(state.share, 2) + '% of national average');
    page.style.setProperty('--slider-fill', (state.share / range) * 100 + '%');
    page.style.setProperty('--target', (result.targetShare / range) * 100 + '%');
    flow.max = result.mean;
    if (!keepFlow) flow.value = result.flow.toFixed(2);
    say('share-value', n(state.share, 2) + '%');
    say('axis-end', range + '%');
    say(
      'target',
      'Full precooling at ' + n(result.requiredFlow, 2) + ' t/h · ' + n(result.targetShare, 2) + '%',
    );
    say('range', expanded ? `Focus on 0–${focusedMaxShare}%` : `Expand to ${maxShare}%`);
    get('range').setAttribute('aria-pressed', String(expanded));
    get('range').disabled = state.share > focusedMaxShare;
  }

  function renderResults(r) {
    say('equivalent', n(r.equivalent));
    say('electric', n(r.electricalShare));
    say(
      'electric-range',
      `vs ${basis.baseline} kWh/kg · ${n(r.lowShare)}–${n(r.highShare)}% vs ${basis.baselineLow}–${basis.baselineHigh} kWh/kg`,
    );
    say('coverage', n(r.coverage * 100) + '%');
    get('duty-fill').style.width = r.coverage * 100 + '%';
    say('recovered', n(r.recovered, 3) + ' MWth');
    say('makeup', n(r.makeup, 3) + ' MWth');
    say(
      'duty-note',
      r.spare > 0.0005
        ? n(r.spare, 3) +
            ' MWth beyond the reference precooling demand. Deep refrigeration still completes liquefaction.'
        : `Deep refrigeration completes liquefaction from the ${basis.handoff} K handoff to about 20 K.`,
    );
    say('available', n(r.available, 3));
    say('thermal', n(r.thermalShare));
    say('delta', n(r.delta, 3));
    say('annual', n(r.annual, 2));
    say(
      'footnote',
      `Electricity scenarios scale with covered duty at ${basis.operatingDays} full-load days/year. ` +
        `Estimated integrated SEC: ${n(r.integratedSEC, 2)} kWh/kg LH₂. Site data and paired cycle simulation are required.`,
    );
  }

  function renderSensitivity(state, result) {
    say('sensitivity-caption', n(state.share, 2) + '% allocation · equivalent LH₂ t/day');
    get('sensitivity-rows').innerHTML = uptakeCases
      .map((uptake) => {
        const equivalent = supportedCapacity(result.flow, uptake);
        const width = state.share === 0 ? 0 : (uptake / maxUptake) * 100;
        return `<div class="sensitivity-row${uptake === state.uptake ? ' current' : ''}"><span title="kJ/kg LNG">${uptake}</span><div aria-hidden="true"><i style="width:${width}%"></i></div><strong>${n(equivalent)}</strong></div>`;
      })
      .join('');
    say('ceiling', n(supportedCapacity(result.mean, state.uptake), 0));
    const { efficiency, auxiliaries } = powerCases[state.power];
    say(
      'power-basis',
      'Selected case assumes ' +
        n(efficiency * 100, 0) +
        '% second-law efficiency and ' +
        n(auxiliaries, 2) +
        ' kWh/kg incremental auxiliaries at full duty. Net reduction at full coverage is ' +
        n(result.fullDelta, 3) +
        ' kWh/kg LH₂.',
    );
  }

  function render(keepFlow = false) {
    const state = scenarios[selected];
    const result = calculate();
    renderControls(state, result, keepFlow);
    renderResults(result);
    renderSensitivity(state, result);
  }

  function update(change, keepFlow = false) {
    Object.assign(scenarios[selected], change);
    render(keepFlow);
    try {
      localStorage.setItem(storageKey, JSON.stringify(scenarios));
    } catch {
      /* The in-page state remains available. */
    }
  }

  function route(focus = true) {
    const id = location.hash.slice(1);
    const previous = selected;
    selected = Object.hasOwn(markets, id) ? id : null;
    if (selected) lastCountry = selected;
    nav.href = selected ? '#plant' : '#' + lastCountry;
    nav.lastElementChild.textContent = selected ? '3D plant' : 'Country models';
    nav.firstElementChild.textContent = selected ? '◇' : '▥';
    page.hidden = !selected;
    onRoute(Boolean(selected));
    if (selected) {
      if (previous !== selected) renderMarket();
      render();
    }
    if (focus && previous !== selected) {
      window.scrollTo(0, 0);
      if (!previous || !selected) (selected ? get('title') : nav).focus({ preventScroll: true });
    }
  }

  slider.addEventListener('input', () => update({ share: slider.valueAsNumber }));
  flow.addEventListener('input', () => {
    if (Number.isFinite(flow.valueAsNumber)) {
      update({ share: clampShare((flow.valueAsNumber / importRate(markets[selected])) * 100) }, true);
    }
  });
  flow.addEventListener('change', () => {
    if (selected) render();
  });
  flow.addEventListener('blur', () => {
    if (selected) render();
  });
  flow.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') flow.blur();
  });
  for (const button of presets)
    button.addEventListener('click', () => update({ share: Number(button.dataset.share) }));
  for (const radio of radios)
    radio.addEventListener('change', () => {
      update({ [radio.name]: radio.name === 'uptake' ? Number(radio.value) : radio.value });
    });
  get('fit').addEventListener('click', () => update({ share: calculate().targetShare }));
  get('range').addEventListener('click', () => {
    update({ wide: !scenarios[selected].wide });
  });
  get('show-plant').addEventListener('click', () => {
    const r = calculate();
    const id = selected;
    const label =
      markets[id].name +
      ' screening · ' +
      n(r.flow, 2) +
      ' t/h LNG · ' +
      n(r.coverage * 100) +
      '% precooling · ' +
      n(r.recovered, 3) +
      ' MWth applied';
    history.pushState(null, '', '#plant');
    route();
    onDuty({ id, label, coverage: r.coverage });
  });
  window.addEventListener('hashchange', () => route());
  route(false);
}
