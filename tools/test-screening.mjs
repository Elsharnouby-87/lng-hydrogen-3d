import test from 'node:test';
import assert from 'node:assert/strict';
import {
  basis, importRate, markets, powerCases, precoolDuty, screen,
  supportedCapacity, uptakeCases,
} from '../src/screening-model.js';

// Screening references: EPROM 12 Nov 2026 study and OAPEC Jan-Sep 2026
// import figures. These are NOT site-validated terminal or electrical data.
const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, got ${actual}`);

test('50 t/day hydrogen precooling reference case', () => {
  assert.equal(basis.referenceCapacity, 50);
  assert.equal(basis.periodDays, 273);
  assert.equal(basis.handoff, 120);
  near(precoolDuty, 1.430, .001, 'thermal precooling MW');
  near(screen(markets.kuwait, 1, 500, 'central').requiredFlow, 10.30, .01, 'LNG t/h for full precooling');
});

test('reported LNG imports and central notional 1% country cases', () => {
  assert.equal(markets.kuwait.imports, 4.42);
  assert.equal(markets.egypt.imports, 10.53);
  near(importRate(markets.kuwait), 674.6, .1, 'Kuwait national t/h');
  near(importRate(markets.egypt), 1607.1, .1, 'Egypt national t/h');
  const k = screen(markets.kuwait, 1, 500, 'central');
  const e = screen(markets.egypt, 1, 500, 'central');
  near(k.coverage * 100, 65.5, .1, 'Kuwait coverage %');
  near(e.coverage * 100, 100, .01, 'Egypt coverage %');
  near(k.electricalShare, 6.30, .02, 'Kuwait proxy electrical %');
  near(e.electricalShare, 9.62, .02, 'Egypt proxy electrical %');
  near(e.fullDelta, 1.106, .002, 'full precooling proxy kWh/kg');
  near(e.annual, 18.25, .03, 'annual proxy GWh');
  near(supportedCapacity(importRate(markets.kuwait), 500), 3275, 2, 'Kuwait max algebraic equivalent');
  near(supportedCapacity(importRate(markets.egypt), 500), 7803, 2, 'Egypt max algebraic equivalent');
});

test('18 country × heat uptake × power cases conserve duties and SEC', () => {
  let cases = 0;
  for (const market of Object.values(markets)) {
    for (const uptake of uptakeCases) {
      for (const power of Object.keys(powerCases)) {
        const r = screen(market, 1, uptake, power);
        near(r.recovered + r.makeup, precoolDuty, 1e-10, 'duty balance');
        near(r.recovered + r.spare, r.available, 1e-10, 'usable available duty');
        near(r.delta, r.fullDelta * r.coverage, 1e-10, 'scaled power assumption');
        near(r.integratedSEC + r.delta, basis.baseline, 1e-10, 'SEC balance');
        assert.ok(r.coverage >= 0 && r.coverage <= 1);
        assert.ok(r.equivalent >= 0 && Number.isFinite(r.annual));
        cases++;
      }
    }
  }
  assert.equal(cases, 18);
});

test('zero duty and invalid input handling', () => {
  const zero = screen(markets.kuwait, 0, 500, 'central');
  assert.equal(zero.coverage, 0);
  assert.equal(zero.delta, 0);
  for (const args of [
    [markets.kuwait, NaN, 500, 'central'],
    [markets.kuwait, -1, 500, 'central'],
    [markets.kuwait, 101, 500, 'central'],
    [markets.kuwait, 1, 0, 'central'],
    [markets.kuwait, 1, 500, 'invalid'],
    [null, 1, 500, 'central'],
  ]) assert.throws(() => screen(...args), RangeError);
});
