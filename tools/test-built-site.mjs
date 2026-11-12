import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');
for (const part of [
  'id="model"', 'id="screening"', 'id="mobile-bottom-sheet"',
  'class="mobile-dock"', 'id="core-modes"', 'id="deep-modes"',
  'id="lh2-modes"', 'OAPEC', 'Kuwait', 'Egypt', 'R-101',
]) assert.ok(html.includes(part), `Missing bundle entry point: ${part}`);
assert.ok(html.length > 400_000, '3D runtime, GLB and fonts must remain embedded');
assert.ok(!html.includes('/* SITE_CSS */') &&
  !html.includes('/* SITE_JS */') &&
  !html.includes('<!-- SCREENING_VIEW -->'), 'Unresolved build marker');
assert.doesNotMatch(html, /<script\s+[^>]*src=/i, 'Standalone HTML must not load external JavaScript');
console.log('PASS: deployable offline page contains all 3D and screening entry points');
