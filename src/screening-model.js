// OAPEC Jan–Sep 2026 imports and the 12 Nov 2026 screening workbook.
export const markets = {
  kuwait: {
    name: 'Kuwait',
    terminal: 'Al-Zour LNG Import Terminal',
    type: 'Onshore terminal',
    prior: 5.74,
    imports: 4.42,
    gate: 'Confirm accessible post-pump LNG at Al-Zour and match the hourly send-out to the hydrogen plant schedule.',
  },
  egypt: {
    name: 'Egypt',
    terminal: 'Ain Sokhna FSRUs',
    type: 'Floating regasification',
    prior: 5.70,
    imports: 10.53,
    gate: 'Identify the individual FSRU with accessible pre-vaporizer LNG and verify the ship-to-shore integration interface.',
  },
};

export const basis = {
  periodDays: 273,
  referenceCapacity: 50,
  operatingDays: 330,
  inlet: 300,
  handoff: 120,
  ambient: 300,
  totalHeat: 5100,
  baseline: 11.5,
  baselineLow: 10,
  baselineHigh: 13,
};

export const uptakeCases = [300, 500, 700];
export const powerCases = {
  low: { efficiency: .4, auxiliaries: .15 },
  central: { efficiency: .3, auxiliaries: .10 },
  high: { efficiency: .25, auxiliaries: .05 },
};

const h120 = -5.468 + (basis.handoff - 100) / (200 - 100) * (-2.774 - (-5.468));
const precoolHeat = (0.053 - h120) * 1000 / 2.01588;
const temperatureDrop = basis.inlet - basis.handoff;
const reversibleWork = precoolHeat / temperatureDrop *
  (basis.ambient * Math.log(basis.inlet / basis.handoff) - temperatureDrop) / 3600;
const referenceMass = basis.referenceCapacity * 1000 / 24;

export const precoolDuty = referenceMass * precoolHeat / 3600000;
export const totalDuty = referenceMass * basis.totalHeat / 3600000;
export const importRate = market => market.imports * 1000000 / (basis.periodDays * 24);

export function screen(market, share, uptake, power) {
  const mean = importRate(market);
  const flow = mean * share / 100;
  const requiredFlow = precoolDuty * 3600 / uptake;
  const available = flow * uptake / 3600;
  const recovered = Math.min(available, precoolDuty);
  const coverage = recovered / precoolDuty;
  const equivalent = available / precoolDuty * basis.referenceCapacity;
  const { efficiency, auxiliaries } = powerCases[power];
  const fullDelta = Math.max(0, reversibleWork / efficiency - auxiliaries);
  // Linear duty scaling is a screening approximation for partial coverage.
  const delta = fullDelta * coverage;

  return {
    mean, flow, requiredFlow, available, recovered, coverage, equivalent, fullDelta, delta,
    makeup: Math.max(0, precoolDuty - recovered),
    spare: Math.max(0, available - recovered),
    thermalShare: recovered / totalDuty * 100,
    targetShare: requiredFlow / mean * 100,
    electricalShare: delta / basis.baseline * 100,
    lowShare: delta / basis.baselineHigh * 100,
    highShare: delta / basis.baselineLow * 100,
    annual: delta * basis.referenceCapacity * basis.operatingDays / 1000,
    integratedSEC: basis.baseline - delta,
  };
}
