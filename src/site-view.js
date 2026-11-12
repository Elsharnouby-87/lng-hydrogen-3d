import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeWater, v } from './plant.js';
import { softwareRenderer } from './software.js';
import { createSiteLayout } from './site-layout.js';

const sites = {
  egypt: {
    title: 'Ain Sokhna · Floating LNG terminal',
    source: 'FSRU at berth',
    gas: 'Gas to grid',
    reference: 'Egyptian Ministry of Petroleum',
    url: 'https://www.petroleum.gov.eg/en/media-center/news/news-pages/Pages/mop_12062026_02.aspx',
    descriptions: {
      overview: ['Ship-to-shore integration', 'The FSRU stores and regasifies LNG onboard. A proposed cryogenic link takes LNG cold to a hydrogen liquefaction plant onshore.'],
      source: ['Floating storage and regasification', 'LNG storage sits below the ship’s deck. The regasification equipment onboard warms LNG for natural gas send-out to the grid.'],
      precool: ['Proposed cryogenic berth crossing', 'The dashed route branches from the LNG side upstream of the ship’s vaporizers. The illustration returns the warmed LNG stream to onboard regasification.'],
      hydrogen: ['Onshore hydrogen liquefaction', 'Hydrogen is precooled at the shared exchanger, then cooled to about 20 K in the liquefaction train and sent to liquid hydrogen storage.'],
    },
  },
  kuwait: {
    title: 'Al-Zour · Onshore LNG terminal',
    source: 'Onshore LNG tanks',
    gas: 'Gas to grid',
    reference: 'Kuwait National Petroleum Company',
    url: 'https://www.knpc.com/en/our-business/liquefied-natural-gas-import-facility',
    descriptions: {
      overview: ['Onshore integration', 'The import jetty feeds eight onshore LNG tanks. A proposed branch uses cold from the terminal’s LNG header in an adjacent hydrogen liquefaction plant.'],
      source: ['Permanent LNG storage', 'LNG is unloaded at the marine berth and stored in eight fixed tanks. The terminal pumps LNG to onshore vaporizers for gas send-out.'],
      precool: ['Proposed LNG header tie-in', 'The dashed route takes LNG from the onshore cold header through the precooler. The warmed stream continues toward the terminal’s vaporizers.'],
      hydrogen: ['Onshore hydrogen liquefaction', 'Hydrogen is precooled at the shared exchanger, then cooled to about 20 K in the liquefaction train and sent to liquid hydrogen storage.'],
    },
  },
};
const labels = { precool: 'Precooler', hydrogen: 'Liquefaction & LH₂' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const unitY = v(0, 1, 0);

export function initSiteView() {
  const section = document.getElementById('country-site');
  const viewport = document.getElementById('country-viewport');
  const caption = document.getElementById('country-caption');
  const title = document.getElementById('country-site-title');
  const detail = document.getElementById('country-detail');
  const source = document.getElementById('country-source');
  const modelFlow = document.getElementById('country-site-flow');
  const modelCoverage = document.getElementById('country-site-coverage');
  const flowControl = document.getElementById('country-flow-toggle');
  const zoomControls = [...section.querySelectorAll('[data-site-zoom]')];
  const viewButtons = [...section.querySelectorAll('[data-site-view]')];
  const labelLayer = document.getElementById('country-labels');
  const labelNodes = Object.fromEntries(['source','precool','hydrogen','gas'].map(key => {
    const node = document.createElement('span');
    node.className = 'site-marker';
    node.dataset.mark = key;
    labelLayer.append(node);
    return [key, node];
  }));
  let id, viewer, unavailable = false, motion = !reduced, inView = false, active = 'overview';
  let resetView = false;
  let appliedCoverage = 0;

  function chooseView(key, immediate = false) {
    active = key;
    const [head, body] = sites[id].descriptions[key];
    caption.textContent = head;
    detail.textContent = body;
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.siteView === key));
    viewer?.focus(key, immediate);
  }

  function setFlowControl() {
    flowControl.setAttribute('aria-pressed', String(motion));
    flowControl.textContent = motion ? 'Pause flow' : 'Animate flow';
  }

  for (const button of viewButtons) button.addEventListener('click', () => chooseView(button.dataset.siteView));
  for (const button of zoomControls) button.addEventListener('click', () => viewer?.zoom(Number(button.dataset.siteZoom)));
  flowControl.addEventListener('click', () => {
    motion = !motion;
    setFlowControl();
    viewer?.setMotion(motion);
  });
  document.getElementById('country-calc-jump').addEventListener('click', () => {
    const slider = document.getElementById('screen-share');
    slider.focus({ preventScroll: true });
    slider.closest('.screen-controls').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  });
  setFlowControl();

  function syncViewport() {
    if (!id || !inView) {
      viewer?.setVisible(false);
      return;
    }
    if (!viewer && !unavailable) {
      try {
        viewer = makeViewer(viewport, labelNodes);
      } catch (error) {
        console.warn('Country layout renderer unavailable.', error);
        unavailable = true;
        viewport.classList.add('site-no-renderer');
        for (const button of [flowControl,...zoomControls]) button.disabled = true;
      }
    }
    if (!viewer) return;
    viewer.setVisible(true);
    if (viewer.setSite(id) || resetView) {
      viewer.setMotion(motion);
      viewer.focus(active, true);
      resetView = false;
    }
    viewer.setCoverage(appliedCoverage);
  }

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncViewport();
  }).observe(viewport);

  return {
    select(country) {
      if (country === id) return;
      id = country;
      if (id) {
        resetView = true;
        const info = sites[id];
        title.textContent = info.title;
        source.textContent = info.reference;
        source.href = info.url;
        for (const [key,node] of Object.entries(labelNodes)) node.textContent = labels[key] ?? info[key];
        viewButtons.find(button => button.dataset.siteView === 'source').textContent = id === 'egypt' ? 'FSRU' : 'Tank farm';
        // Defer camera setup until the matching site is selected by the renderer.
        active = 'overview';
        const [head, body] = info.descriptions.overview;
        caption.textContent = head;
        detail.textContent = body;
        for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.siteView === active));
      }
      syncViewport();
    },
    update(coverage, flowText, coverageText) {
      appliedCoverage = coverage;
      modelFlow.textContent = flowText;
      modelCoverage.textContent = coverageText;
      viewer?.setCoverage(coverage);
    },
  };
}

function makeViewer(viewport, labelNodes) {
  const scene = new T.Scene();
  scene.background = new T.Color(0x143045);
  const camera = new T.OrthographicCamera(-26, 26, 16, -16, .1, 350);
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  const renderer = gl ? new T.WebGLRenderer({ canvas, context: gl, antialias: true }) : softwareRenderer();
  if (gl) {
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  viewport.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Interactive three-dimensional LNG terminal and hydrogen liquefaction site');
  renderer.domElement.addEventListener('wheel', event => {
    if (!event.ctrlKey) event.stopImmediatePropagation();
  }, { capture: true, passive: true });
  viewport.dataset.renderer = gl ? 'webgl' : 'canvas';

  const water = gl ? makeWater(scene) : null;
  if (!gl) {
    const sea = new T.Mesh(new T.BoxGeometry(115, .11, 105),
      new T.MeshBasicMaterial({ color: 0x1c455e }));
    sea.position.y = -1.09;
    sea.renderOrder = 30;
    scene.add(sea);
  }
  const hemi = new T.HemisphereLight(0xeaf7ff, 0x64778e, 2.18);
  const sun = new T.DirectionalLight(0xffe5c3, 2.85);
  const rim = new T.DirectionalLight(0x9ed9f8, 1.40);
  sun.position.set(-24, 36, 17);
  rim.position.set(17, 13, -28);
  scene.add(hemi, sun, rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minZoom = .63;
  controls.maxZoom = 3.5;
  controls.minPolarAngle = .18;
  controls.maxPolarAngle = Math.PI * .45;
  controls.enablePan = false;
  const layouts = new Map();
  const part = new T.Object3D();
  const projected = new T.Vector3();
  let layout, country, visible = false, motion = false, coverage = 0;
  let width = 1, height = 1, size = 52, active = 'overview';
  let dirty = true, tween, frame, previous = 0, phase = 0, coldPhase = 0;

  function requestDraw() {
    if (visible && frame === undefined) frame = requestAnimationFrame(draw);
  }

  function projection() {
    const horizontal = size * Math.max(1, width / height / 2.05);
    camera.left = -horizontal / 2;
    camera.right = horizontal / 2;
    camera.top = horizontal * height / width / 2;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
  }

  function resize() {
    const bounds = viewport.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    width = bounds.width;
    height = bounds.height;
    renderer.setSize(width, height, false);
    projection();
    dirty = true;
    requestDraw();
  }

  function placeLabels() {
    const used = [];
    for (const [key, node] of Object.entries(labelNodes)) {
      const narrow = width < 540;
      if ((narrow && active === 'overview' && ['gas','precool'].includes(key)) ||
          (active !== 'overview' && active !== key)) {
        node.hidden = true;
        continue;
      }
      projected.fromArray(layout.anchors[key]).project(camera);
      const x = (projected.x + 1) * width / 2;
      const y = (1 - projected.y) * height / 2;
      node.hidden = x < 55 || x > width - 55 || y < 43 || y > height - 35 ||
        used.some(([px,py]) => Math.abs(px-x) < 119 && Math.abs(py-y) < 28);
      if (!node.hidden) {
        used.push([x,y]);
        node.style.left = x + 'px';
        node.style.top = y + 'px';
      }
    }
  }

  function drawFlow() {
    for (const link of layout.links) {
      const proposed = link.kind === 'cold' || link.kind === 'return';
      const live = !proposed || coverage > 0;
      link.glow.visible = motion && live;
      link.arrows.visible = live;
      if (link.glow.visible) {
        for (let i = 0; i < link.count; i++) {
          const t = (i / link.count + (proposed ? coldPhase : phase)) % 1;
          link.curve.getPoint(t, part.position);
          part.position.y += .08;
          part.quaternion.identity();
          part.updateMatrix();
          link.glow.setMatrixAt(i, part.matrix);
        }
        link.glow.instanceMatrix.needsUpdate = true;
      }
      if (link.arrows.visible) {
        for (let i = 0; i < link.arrows.count; i++) {
          const t = (i + .6) / link.arrows.count;
          link.curve.getPoint(t, part.position);
          part.position.y += .26;
          part.quaternion.setFromUnitVectors(unitY, link.curve.getTangent(t));
          part.updateMatrix();
          link.arrows.setMatrixAt(i, part.matrix);
        }
        link.arrows.instanceMatrix.needsUpdate = true;
      }
    }
  }

  function draw(now) {
    frame = undefined;
    if (!layout || !visible) return;
    const dt = Math.min((now - previous) / 1000, .075);
    const needsFrame = dirty || tween || motion;
    if (needsFrame && (gl || !previous || now - previous > 50)) {
      previous = now;
      if (tween) {
        const p = Math.min((now - tween.start) / 680, 1);
        const mix = 1 - (1-p)**3;
        camera.position.lerpVectors(tween.from, tween.position, mix);
        controls.target.lerpVectors(tween.lookFrom, tween.look, mix);
        size = T.MathUtils.lerp(tween.sizeFrom, tween.size, mix);
        camera.zoom = T.MathUtils.lerp(tween.zoomFrom, 1, mix);
        projection();
        controls.update();
        if (p === 1) tween = undefined;
      }
      if (motion) {
        phase = (phase + .115 * dt) % 1;
        coldPhase = (coldPhase + .115 * (.72 + .28 * coverage) * dt) % 1;
        if (water) water.uniforms.uTime.value += dt;
      }
      drawFlow();
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      placeLabels();
      dirty = false;
    }
    if (motion || tween || dirty) requestDraw();
  }

  controls.addEventListener('change', () => {
    dirty = true;
    requestDraw();
  });
  controls.addEventListener('start', () => { tween = undefined; });
  new ResizeObserver(resize).observe(viewport);
  resize();

  return {
    setSite(id) {
      if (country === id) return false;
      if (layout) layout.site.visible = false;
      country = id;
      if (!layouts.has(id)) layouts.set(id, createSiteLayout(scene, id, Boolean(gl)));
      layout = layouts.get(id);
      layout.site.visible = true;
      dirty = true;
      requestDraw();
      return true;
    },
    setCoverage(value) {
      if (coverage === value) return;
      coverage = value;
      dirty = true;
      requestDraw();
    },
    setVisible(value) {
      visible = value;
      if (value) requestDraw();
    },
    setMotion(value) {
      motion = value;
      dirty = true;
      requestDraw();
    },
    focus(key, immediate) {
      if (!layout) return;
      active = key;
      const view = layout.views[key];
      const look = new T.Vector3(...view.look);
      const position = look.clone().add(new T.Vector3(...view.offset));
      const fittedSize = view.size * (key === 'overview' ? Math.max(1, 1.18 / (width / height)) : 1);
      if (immediate || reduced) {
        tween = undefined;
        size = fittedSize;
        camera.zoom = 1;
        camera.position.copy(position);
        controls.target.copy(look);
        projection();
        controls.update();
      } else {
        tween = {
          start: performance.now(), from: camera.position.clone(), lookFrom: controls.target.clone(),
          position, look, size: fittedSize, sizeFrom: size, zoomFrom: camera.zoom,
        };
      }
      dirty = true;
      requestDraw();
    },
    zoom(direction) {
      tween = undefined;
      camera.zoom = T.MathUtils.clamp(camera.zoom * (direction > 0 ? 1.21 : 1 / 1.21), controls.minZoom, controls.maxZoom);
      camera.updateProjectionMatrix();
      dirty = true;
      requestDraw();
    },
  };
}
