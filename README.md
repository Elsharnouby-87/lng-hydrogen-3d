# LNG × Hydrogen · Cryogenic Integration Atlas

An interactive 3D walkthrough for the OAPEC 2026 Gas Experts Meeting in Kuwait. The plant is a conceptual flowsheet rendered in Three.js.

## Present the demo

[Open the live presentation](https://elsharnouby-87.github.io/lng-hydrogen-3d/).

Open `docs/index.html` in a current browser. The same file works locally with no internet connection. Use **Present** or **F** for the stage layout and **← / →** or **1–5** for chapters. **Cinematic intro** opens a three-shot camera sequence and returns to the interactive overview. **H** hides or restores the presentation overlay. **Play guided tour** advances through five views in the regular layout. Drag to orbit, scroll or pinch to zoom, and select a label or equipment to inspect it. **Plan** switches between isometric and overhead views. **Flow**, **Labels**, and **Reset camera** are independent controls.

**Trace H₂** and **Trace LNG** highlight a circuit and open four camera stops. Use **← / →** to move between its stops, or select an individual stop on the rail. The circuit follows the bypass in standalone mode. The exchanger opens in shell, cutaway and exploded views. Highlight either the hydrogen or the LNG passages to demonstrate countercurrent flow. Open the cold box to inspect the cryogenic exchangers, ortho–para conversion and phase separation. The approach-temperature control illustrates a lower bound using 111 K as an assumed LNG inlet. The operating-match control shows a normalized cold-duty balance for an illustrative steady, variable or interrupted operating day. Scrub the hour to compare recovered cold against mechanical makeup. The two modes route fluids through the exchanger or around it, with deep refrigeration retained in both cases.

**E-101 tour** adds three manual stops: plant overview, flange close-up and the plate-fin core. Use **← / →** or the tour buttons to advance. In **Section**, drag the section plane and select **H₂**, **LNG** or **Both**. The colored paths represent counterflow through separate passages. The inspection is available with WebGL, including offline.

## Country models

Open [Kuwait](https://elsharnouby-87.github.io/lng-hydrogen-3d/#kuwait) or [Egypt](https://elsharnouby-87.github.io/lng-hydrogen-3d/#egypt). Adjust the allocated share or enter LNG flow in t/h, then select usable heat uptake and an electrical benefit case. The models retain their settings separately in the browser. **Meet 50 t/day** sets the theoretical full-precooling threshold. **View this duty in 3D** opens the precooler cutaway with the selected reference duty overlaid.

The national case uses the same January–September 2026 import period for both countries. The reference plant heat balance caps applied cold at its precooling requirement. The electrical proxy follows the November 2026 study and scales net SEC reduction proportionally to covered precooling duty. The country views link to the published import data and provide the calculation basis and sources.

## Build

```sh
npm ci
npm run build
```

The build places a self-contained HTML file in `docs/`. The Three.js MIT license is embedded in the page. The `src/` directory contains the editable scene, text and interface.

The E-101 model is authored by `tools/build-precooler.py`. Regenerate it with Blender, then embed it in the single-file site build:

```sh
blender -b --python tools/build-precooler.py -- /tmp/e101-inspection.glb
gzip -n -9 -c /tmp/e101-inspection.glb > src/assets/e101-inspection.glb.gz
npm run build
```

## GitHub Pages

Open the repository’s **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/docs**, and save. GitHub Pages will serve the committed build without a custom workflow.

## Technical basis

The conference presentation and its design review provide the process boundary and terminology. The geometry, exchanger temperature bound and normalized duty allocation serve as teaching examples. Site performance requires validated stream conditions, energy balances and operating data.

## Stage 1 — Advanced R-101 Cryogenic Cold Box

Select **Deep refrigeration** in the 3D presentation. R-101 now provides **Shell**, **Cutaway**, and **Exploded** views, plus **Both / H₂ only / Helium only** controls. The cutaway depicts three separately tagged aluminium plate-fin stages (HX-201/202/203), two conceptual parallel helium expander branches (EX-201/202), a staged ortho–para catalyst vessel (OP-201), separated process passages, supply/return headers, a skid and service nozzles. Flow indications follow the individual paths. In the exploded view connected piping is intentionally hidden rather than falsely shown as disconnected.

**Engineering boundary:** This is a conceptual helium reverse-Brayton-type cold-end arrangement and is not a supplier design, a detailed flow simulation, a thermal-duty validation, or a full hydrogen liquefaction process. External helium compression, heat rejection, and downstream LH₂ handling are outside R-101. Performance values in the Egypt/Kuwait calculators are unchanged.

**QA:** `node tools/test-coldbox.mjs` runs equipment, stream, view and flow checks. `npm run build` regenerates the self-contained offline site. E-101's previously approved geometry and the Egypt/Kuwait models are unchanged.

## Stage 3 — Industrial Equipment Detailing (conceptual)

The mechanical equipment is rebuilt as inspectable Three.js assemblies with preserved plant service nozzles:

- **K-101 hydrogen compressor:** split barrel centrifugal-style compressor on anchored skid; axial hydrogen suction and upper discharge spool; bolted casing, coupling guard, finned motor, seal-gas / lubricant panel, local pressure instrumentation, automated block valve and pipe shoes.
- **P-201 LNG pump:** vertical cryogenic-barrel pump with enclosed drive, motor cooling fins, inlet/outlet service flanges, actuated discharge isolation, pressure indications, vibration / service panel and bolted base.
- **E-202 vaporizer:** finned vertical-tube ambient-air-style representative array, connected bottom LNG distribution and upper gas collection manifolds, valves, supports and measurement connections. The external auxiliary/trim heating duty is **not** simulated.
- **TK-301 LH₂ storage:** horizontal vacuum-jacketed vessel with domed ends, saddle anchors, insulated liquid inlet, vacuum-service indication, level/pressure instrumentation and capped relief **interfaces**. No vent header sizing or pressure-relief design is represented.

All four use **representative geometry**, *not mechanical detail engineering or vendor designs*. Ratings, dimensions, support loads, metallurgy, insulation performance, valve type and pressure-class selection need equipment-vendor confirmation. Added K-101 selection and equipment-specific close-up camera presets. The original E-101 pre-cooler, R-101 cooling module and Egypt/Kuwait screening mathematics are intentionally unchanged.

Quality gate: `node tools/test-industrial.mjs` validates key equipment, connection coordinates and instruments; `node tools/qa-coldbox-browser.mjs` captures WebGL close-ups for each equipment and continues the mobile/desktop R-101 regressions. The Stage-3 workflow rebuilds `docs/index.html`, generating four screenshots named `stage3-*-closeup.png`.
