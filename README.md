# LNG × Hydrogen · Cryogenic Integration Atlas

An interactive 3D walkthrough for the OAPEC 2026 Gas Experts Meeting in Kuwait. The plant is a conceptual flowsheet rendered in Three.js.

## Present the demo

[Open the live presentation](https://elsharnouby-87.github.io/lng-hydrogen-3d/).

Open `docs/index.html` in a current browser. The same file works locally with no internet connection. Use **Present** or **F** for the stage layout and **← / →** or **1–5** for chapters. **Cinematic intro** opens a three-shot camera sequence and returns to the interactive overview. **H** hides or restores the presentation overlay. **Play guided tour** advances through five views in the regular layout. Drag to orbit, scroll or pinch to zoom, and select a label or equipment to inspect it. **Plan** switches between isometric and overhead views. **Flow**, **Labels**, and **Reset camera** are independent controls.

**Trace H₂** and **Trace LNG** highlight a circuit and open four camera stops. Use **← / →** to move between its stops, or select an individual stop on the rail. The circuit follows the bypass in standalone mode. The exchanger opens in shell, cutaway and exploded views. Highlight either the hydrogen or the LNG passages to demonstrate countercurrent flow. Open the cold box to inspect the cryogenic exchangers, ortho–para conversion and phase separation. The approach-temperature control illustrates a lower bound using 111 K as an assumed LNG inlet. The operating-match control shows a normalized cold-duty balance for an illustrative steady, variable or interrupted operating day. Scrub the hour to compare recovered cold against mechanical makeup. The two modes route fluids through the exchanger or around it, with deep refrigeration retained in both cases.

## Country models

Open [Kuwait](https://elsharnouby-87.github.io/lng-hydrogen-3d/#kuwait) or [Egypt](https://elsharnouby-87.github.io/lng-hydrogen-3d/#egypt). Adjust the allocated share or enter LNG flow in t/h, then select usable heat uptake and an electrical benefit case. The models retain their settings separately in the browser. Each country view has an interactive site concept with an overview, LNG source, cold tie-in and onshore H₂ plant. The dashed LNG tie-in represents proposed integration. The site readout follows the calculator inputs. **Meet 50 t/day** sets the theoretical full-precooling threshold. **View this duty in 3D** opens the precooler cutaway with the selected reference duty overlaid.

The national case uses the same January–September 2026 import period for both countries. The reference plant heat balance caps applied cold at its precooling requirement. The electrical proxy follows the November 2026 study and scales net SEC reduction proportionally to covered precooling duty. The country views link to the published source and identify the terminal data required for a site assessment.

## Build

```sh
npm ci
npm run build
```

The build places a self-contained HTML file in `docs/`. The Three.js MIT license is embedded in the page. The `src/` directory contains the editable scene, text and interface.

## GitHub Pages

Open the repository’s **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/docs**, and save. GitHub Pages will serve the committed build without a custom workflow.

## Technical basis

The conference presentation and its design review provide the process boundary and terminology. The geometry, exchanger temperature bound and normalized duty allocation serve as teaching examples. Site performance requires validated stream conditions, energy balances and operating data.
