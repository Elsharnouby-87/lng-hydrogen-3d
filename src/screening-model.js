// OAPEC Jan–Sep 2026 imports and the 12 Nov 2026 screening workbook.
export const markets = {
  kuwait: {
    name: 'Kuwait',
    terminal: 'Al-Zour LNG Import Terminal',
    type: 'Onshore terminal',
    prior: 5.74,
    imports: 4.42,
  },
  egypt: {
    name: 'Egypt',
    terminal: 'Ain Sokhna FSRUs',
    type: 'Floating regasification',
    prior: 5.7,
    imports: 10.53,
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
  low: { efficiency: 0.4, auxiliaries: 0.15 },
  central: { efficiency: 0.3, auxiliaries: 0.1 },
  high: { efficiency: 0.25, auxiliaries: 0.05 },
};

// Ideal-gas hydrogen molar enthalpies in kJ/mol, interpolated between 100 and 200 K.
const enthalpyAt100K = -5.468;
const enthalpyAt200K = -2.774;
const enthalpyAt300K = 0.053;
const hydrogenMolarMass = 2.01588; // g/mol
const handoffEnthalpy =
  enthalpyAt100K + ((basis.handoff - 100) / (200 - 100)) * (enthalpyAt200K - enthalpyAt100K);
const precoolHeat = ((enthalpyAt300K - handoffEnthalpy) * 1000) / hydrogenMolarMass; // kJ/kg H₂
const temperatureDrop = basis.inlet - basis.handoff;
const reversibleWork =
  ((precoolHeat / temperatureDrop) *
    (basis.ambient * Math.log(basis.inlet / basis.handoff) - temperatureDrop)) /
  3600; // kWh/kg H₂
const referenceMassFlow = (basis.referenceCapacity * 1000) / 24; // kg/h

export const precoolDuty = (referenceMassFlow * precoolHeat) / 3600000; // MWth
export const totalDuty = (referenceMassFlow * basis.totalHeat) / 3600000; // MWth
export const importRate = (market) => (market.imports * 1000000) / (basis.periodDays * 24);
const coldDuty = (flow, uptake) => (flow * uptake) / 3600; // t/h × kJ/kg to MWth
const capacityAtDuty = (duty) => (duty / precoolDuty) * basis.referenceCapacity;
export const supportedCapacity = (flow, uptake) => capacityAtDuty(coldDuty(flow, uptake));

export function screen(market, share, uptake, power) {
  // Prevent malformed saved/input scenarios from propagating NaN to engineering KPIs.
  if (!market || !Number.isFinite(market.imports) || market.imports <= 0) {
    throw new RangeError('A market with positive LNG imports is required.');
  }
  if (!Number.isFinite(share) || share < 0 || share > 100) {
    throw new RangeError('Allocation must be a percentage between 0 and 100.');
  }
  if (!uptakeCases.includes(uptake)) {
    throw new RangeError('Choose a supported 300/500/700 kJ/kg uptake case.');
  }
  if (!Object.hasOwn(powerCases, power)) {
    throw new RangeError('Unknown electrical scenario.');
  }
  const mean = importRate(market);
  const flow = (mean * share) / 100;
  const requiredFlow = (precoolDuty * 3600) / uptake;
  const available = coldDuty(flow, uptake);
  const recovered = Math.min(available, precoolDuty);
  const coverage = recovered / precoolDuty;
  const equivalent = capacityAtDuty(available);
  const { efficiency, auxiliaries } = powerCases[power];
  const fullDelta = Math.max(0, reversibleWork / efficiency - auxiliaries);
  // Linear duty scaling is a screening approximation for partial coverage.
  const delta = fullDelta * coverage;

  return {
    mean,
    flow,
    requiredFlow,
    available,
    recovered,
    coverage,
    equivalent,
    fullDelta,
    delta,
    makeup: Math.max(0, precoolDuty - recovered),
    spare: Math.max(0, available - recovered),
    thermalShare: (recovered / totalDuty) * 100,
    targetShare: (requiredFlow / mean) * 100,
    electricalShare: (delta / basis.baseline) * 100,
    lowShare: (delta / basis.baselineHigh) * 100,
    highShare: (delta / basis.baselineLow) * 100,
    annual: (delta * basis.referenceCapacity * basis.operatingDays) / 1000,
    integratedSEC: basis.baseline - delta,
  };
}
