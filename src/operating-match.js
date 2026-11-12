import { coldAtHour, dutyProfiles } from './storyboard.js';

const get = (id) => document.getElementById(id);
const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;
const demand = 100;
const chartX = (hour) => 28 + hour * 17.25;
const chartY = (percent) => 101 - percent * 0.59;
const hourTicks = [0, 6, 12, 18, 24]
  .map((hour) => `<text x="${chartX(hour)}" y="120">${formatHour(hour)}</text>`)
  .join('');

function drawChart(chart, series, hour, available) {
  const demandY = chartY(demand);
  const supply = series
    .map((percent, index) => `${index ? 'L' : 'M'}${chartX(index * 2)},${chartY(percent)}`)
    .join(' ');
  // Split each segment at the demand line before shading the shortfall.
  const points = series.flatMap((percent, index) => {
    const point = [index * 2, percent];
    const previous = series[index - 1];
    if (!index || (percent - demand) * (previous - demand) >= 0) return [point];
    const crossing = (index - 1) * 2 + ((demand - previous) * 2) / (percent - previous);
    return [[crossing, demand], point];
  });
  const deficit = points
    .map(([right, percent], index) => {
      if (!index || percent > demand || points[index - 1][1] > demand) return '';
      const [left, previous] = points[index - 1];
      return `M${chartX(left)},${demandY}L${chartX(left)},${chartY(previous)}L${chartX(right)},${chartY(percent)}L${chartX(right)},${demandY}Z`;
    })
    .join(' ');
  const marker =
    hour === null
      ? ''
      : `<path class="chart-cursor" d="M${chartX(hour)},14V101"/><circle cx="${chartX(hour)}" cy="${chartY(available)}" r="4" fill="#6eefd0"/>`;
  chart.innerHTML = `<path class="chart-axis" d="M28,16V101H442"/>
    <path class="chart-deficit" d="${deficit}"/><path class="chart-demand" d="M28,${demandY}H442"/>
    <path class="chart-supply" d="${supply}"/>${marker}<g class="chart-ticks">${hourTicks}</g>
    <text class="chart-demand-label" x="437" y="${demandY - 6}">100% H₂ demand</text>`;
}

export function initOperatingMatch(onAvailability) {
  const profiles = get('profiles');
  const hourInput = get('hour');
  const hourValue = get('hour-value');
  const chart = get('duty-chart');
  let profile = 'variable';
  let hour = hourInput.valueAsNumber;
  let available = coldAtHour(dutyProfiles[profile].values, hour);
  let manual = false;
  let integrated = true;

  profiles.innerHTML = Object.entries(dutyProfiles)
    .map(
      ([id, { label }]) =>
        `<button type="button" data-profile="${id}" aria-pressed="${id === profile}">${label}</button>`,
    )
    .join('');

  function updateReadouts() {
    const recovered = integrated ? Math.min(demand, available) : 0;
    const makeup = demand - recovered;
    get('availability-value').textContent = `${available}%`;
    get('cold-bar').style.width = `${recovered}%`;
    get('backup-bar').style.width = `${makeup}%`;
    get('recovered').textContent = `${recovered}%`;
    get('backup').textContent = `${makeup}%`;
    get('dispatch-note').textContent = integrated
      ? 'Illustrative duty balance. Deep refrigeration remains in service.'
      : 'Mechanical precooling covers the full normalized duty.';
  }

  function update() {
    get('availability').value = available;
    updateReadouts();
    drawChart(chart, dutyProfiles[profile].values, manual ? null : hour, available);
    hourValue.textContent = manual ? 'Manual' : formatHour(hour);
    for (const button of profiles.children) {
      button.setAttribute('aria-pressed', String(button.dataset.profile === profile));
    }
    onAvailability(available / demand);
  }

  function useProfile() {
    manual = false;
    available = coldAtHour(dutyProfiles[profile].values, hour);
    update();
  }

  profiles.addEventListener('click', (event) => {
    const button = event.target.closest('[data-profile]');
    if (!button || !get('availability')) return;
    profile = button.dataset.profile;
    useProfile();
  });
  hourInput.addEventListener('input', () => {
    if (!get('availability')) return;
    hour = hourInput.valueAsNumber;
    useProfile();
  });

  return {
    get fraction() {
      return available / demand;
    },
    setMode(mode) {
      integrated = mode === 'integrated';
      if (get('availability')) updateReadouts();
    },
    render(detail) {
      detail.innerHTML = `<div class="control"><label for="availability">Usable LNG cold vs. H₂ duty <output id="availability-value"></output></label>
        <input id="availability" type="range" min="0" max="140" step="1" value="${available}">
        <div class="stack" aria-hidden="true"><span id="cold-bar"></span><span id="backup-bar"></span></div>
        <div class="dispatch-labels"><span><strong id="recovered"></strong> recovered</span><span><strong id="backup"></strong> mechanical</span></div>
        <p id="dispatch-note" class="control-note"></p></div>`;
      const input = get('availability');
      input.addEventListener('input', () => {
        available = input.valueAsNumber;
        manual = true;
        update();
      });
      update();
    },
  };
}
