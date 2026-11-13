# OAPEC LNG × H₂ — 3D visual review

Work window: 13 November 2026, 08:28–12:00 Africa/Cairo.

Use Commandos 2 and Commandos: Origins as visual references for oblique framing, readable silhouettes and industrial details that stay readable at several scales. Keep the terminal in daylight, with calm water, the existing process colors, conceptual equipment and the engineering interactions.

| Stage | Visual target | Checkpoint / verification |
| --- | --- | --- |
| Baseline | Live calm-water scene and original flow paths | checkpoint/commandos-00-calm-water |
| Berth | Carrier deck fittings, fenders, ladders, drains and mooring gear | checkpoint/commandos-01-berth |
| Yards | Separate walkways, pavement details, service buildings and cabinets | checkpoint/commandos-02-yard |
| Daylight | Oblique plant and berth views, clearer opening composition | checkpoint/commandos-03-daylight |
| Transfer & finishes | Loading arm actuators, quay weathering, steel hull and shoreline | checkpoint/commandos-05-quay-finishes and checkpoint/commandos-10-carrier-materials |
| Equipment | E-101 and R-101 casing details, keep all section modes and flow routes | checkpoint/commandos-15-equipment |
| Mobile berth | Keep the carrier inside 320/390 px frames and make the jetty accessible from Equipment | maintenance/commandos-18-mobile-jetty, pending browser results |
| Next visual pass | Review the large uniform background and strengthen the distinction between paved yard, coastal apron and shore in overview and plan views. Use local details near paths and buildings, keeping the equipment visible. | Isolate, compare captures and checkpoint only after verification |
| Final review | Exercise the live site, Present, Cinematic Intro, both process traces, mobile berth, E-101 and R-101 cutaways and screening navigation | Keep the last passing build live and record its commit and checked URL |

Hourly checks at 09:00, 10:00, 11:00 and 12:00 Cairo time. The 09:00 scheduled run failed and was replaced with a manual verification. In the remaining work window, check the latest active test before creating overlapping work. At noon stop starting new changes and report the verified published version, checkpoints and open items.

For each visual change, run `npm test`, `npm run build`, `node tools/test-built-site.mjs` and the Chrome WebGL workflow. Inspect the updated overview and detail at desktop size and the narrow mobile view. Check the public GitHub Pages HTML against the released build after a fast-forward update of main.
