# LNG × Hydrogen — Cryogenic Integration Atlas

[Live site](https://elsharnouby-87.github.io/lng-hydrogen-3d/) · [Kuwait](https://elsharnouby-87.github.io/lng-hydrogen-3d/#kuwait) · [Egypt](https://elsharnouby-87.github.io/lng-hydrogen-3d/#egypt)

Interactive OAPEC 2026 Three.js engineering demonstrator: LNG regasification cold energy supports hydrogen **precooling** without replacing dedicated deep refrigeration to approximately 20 K. This is a **conceptual process and screening model**, not an as-built design or Aspen/HYSYS-validated plant.

## Build, test and preview

```sh
npm ci
npm test
npm run build
node tools/test-built-site.mjs
npm run preview
```

`docs/index.html` is the single-file, offline-capable GitHub Pages output. It embeds Three.js and its MIT notice, the E-101 inspection asset, Explora font plus its OFL, CSS, and bundled JavaScript. GitHub Pages uses `main/docs`.

## Code organization

| Area | Files |
| --- | --- |
| Desktop plant navigation, tours and application state | `src/main.js` |
| Mobile navigation, menus, sheets and clean view | `src/mobile-ui.js` (callbacks to main; no duplicate plant state) |
| Process scene, equipment and main routes | `src/plant.js`, `src/plant-geometry.js`, `src/plant-equipment.js` |
| Cold-box and equipment detail | `src/coldbox-assembly.js`, `src/industrial-equipment.js`, `src/ultimate-detail.js` |
| E-101 GLB / flow inspection | `src/precooler-inspection.js`, `src/precooler-flow.js`, `src/assets/e101-inspection.glb.gz` |
| Country engineering calculations | `src/screening-model.js` (pure mathematical model), `src/screening.js` (UI/local state) |
| Operating-profile schematic | `src/operating-match.js`, `src/storyboard.js` |
| Ordered CSS cascade | `src/styles/scene.css` → `mobile.css` → `credits.css` → `src/screening.css` |
| Build and HTML template | `build.mjs`, `src/template.html` |

The CSS is split **without changing selector order**, preserving the approved desktop header and mobile 320/390px design. Keep scripts self-contained for offline operation.

## Functional scope

- Hydrogen: conditioned supply → K-101 → E-101 → R-101 (dedicated deep refrigeration with separate helium/H₂ paths) → LH₂ storage.
- LNG: TK-201 → P-201 → E-101 → E-202 → gas send-out; independent bypass provides standalone send-out.
- Exchanger E-101: separate LNG and H₂ passages, shell/cutaway/exploded/section views, and stream tracing through available pipes.
- R-101: representative three exchanger stages, conceptual ortho–para conversion and helium expander branches; shell/cutaway/exploded views.
- Mobile: dominant 3D viewport, reversible equipment/flow/camera/info sheets, and a clean immersive view. Desktop: guided tour, presentation mode, intro, trace stops, labels and camera controls.

## Source-supported numerical basis

The 12 November 2026 EPROM preliminary screening study uses **50 t LH₂/day**, **300 → 120 K** conceptual precooling and approximately **1.430 MWth** full precooling load. Usable LNG heat-uptake assumptions are **300/500/700 kJ/kg**. OAPEC January–September 2026 national LNG import data are **4.42 Mt Kuwait** and **10.53 Mt Egypt**, not site gas send-out measurements.

At a **hypothetical 1% national allocation** with 500 kJ/kg matched duty, the screening model estimates **65.5%** precooling coverage in Kuwait and **100% (capped)** in Egypt. The **6.30% / 9.62%** electrical reduction figures are *unvalidated scenario proxies*, not observed savings. The **48.5%** thermal-load offset is a different denominator and cannot be used to infer electricity savings. The hydrogen handoff temperature, minimum approach/pinch, thermal coverage, availability, true SEC, CAPEX/OPEX and safety isolation require actual LNG and hydrogen stream data plus a matched whole-cycle model.

## Testing, assets and deployment

`npm test` runs 18 country × uptake × electricity-scenario balance checks, numerical reference regressions, input validation and equipment/stream geometry tests. `node tools/qa-coldbox-browser.mjs` tests real Chrome WebGL and 320/390px mobile interactions, plus desktop visual QA. The unified `.github/workflows/ci.yml` workflow runs on maintenance branches and main; on passing main builds it updates deployable `docs/index.html`.

Only `docs/linkedin-preview-*.jpg` are deliberately published preview images. Historical stage/mobile screenshots remain recoverable from Git history; new QA screenshot sets are stored as short-lived GitHub Actions artifacts instead of bloating the public site.

**Engineering caution:** Cryogenic pressure classes, relief and vent routing, metallurgy, bypass isolation, HAZID/HAZOP, hourly duty matching and economic investment gates are outside the current conceptual geometry. Refer to the EPROM OAPEC presentation, November 2026 screening report and U.S. DOE Hydrogen Program Record 9013 for the stated basis.
