import * as T from 'three';
import { mesh } from './plant-geometry.js';

export const harborSky = 0x8eafbe;
const seaLevel = -1.03;
export const reflectionLayer = 1;

const vertexShader = `
  varying vec3 worldPoint;
  varying vec4 reflectedPoint;
  uniform mat4 reflectionProjection;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    worldPoint = world.xyz;
    reflectedPoint = reflectionProjection * world;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform float time;
  uniform sampler2D reflection;
  uniform vec2 reflectionPixel;
  uniform vec3 reflectionSky;
  varying vec3 worldPoint;
  varying vec4 reflectedPoint;

  vec3 wave(vec2 p, vec2 k, float speed, float amplitude) {
    float phase = dot(p, k) - time * speed;
    float strength = amplitude * (1.0 - smoothstep(.9, 2.5, fwidth(phase)));
    return strength * vec3(sin(phase), k * cos(phase));
  }

  float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 line = b - a;
    return length(p - a - line * clamp(dot(p - a, line) / dot(line, line), 0.0, 1.0));
  }

  void main() {
    vec2 p = worldPoint.xz;
    vec3 swell = wave(p, vec2(.71, .36), 1.04, .026)
      + wave(p + 6.3, vec2(-.46, .88), .89, .017)
      + wave(p - 2.1, vec2(.52, -1.35), 1.31, .009);
    vec3 ripples = wave(p + swell.yz * 6.0, vec2(2.9, 4.7), 2.14, .0033)
      + wave(p - swell.yz * 7.0, vec2(-5.6, 2.4), 2.52, .0024)
      + wave(p, vec2(5.1, -.83), 2.31, .0018);

    float quay = min(segmentDistance(p, vec2(-22.55, 10.86), vec2(22.55, 10.86)),
      segmentDistance(p, vec2(2.0, 12.78), vec2(18.8, 12.78)));
    quay = min(quay, min(segmentDistance(p, vec2(-22.55, -10.6), vec2(-22.55, 10.86)),
      segmentDistance(p, vec2(22.55, -10.6), vec2(22.55, 10.86))));
    float shore = min(segmentDistance(p, vec2(-86.0, -47.0), vec2(-22.55, -10.6)),
      segmentDistance(p, vec2(22.55, -10.6), vec2(92.0, -35.0)));
    float sheltered = 1.0 - exp(-min(quay, shore) * .16);
    vec3 normal = normalize(vec3(-(swell.y + ripples.y) * (.55 + sheltered * .45), 1.0,
      -(swell.z + ripples.z) * (.55 + sheltered * .45)));
    vec3 eye = normalize(vec3(viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z));
    float grazing = pow(1.0 - clamp(dot(normal, eye), 0.0, 1.0), 3.0);
    float skyGlint = pow(max(dot(normal, normalize(eye + vec3(-.38, .80, -.30))), 13.0);

    float depth = smoothstep(.0, 6.0, min(quay, shore));
    vec3 color = mix(vec3(.108, .207, .218), vec3(.064, .146, .185), depth);
    color = mix(color, vec3(.248, .389, .432), .15 + grazing * .54);
    color += vec3(.26, .37, .39) * (swell.x * 1.05 + ripples.x * 1.7 + skyGlint * .050);

    vec2 uv = reflectedPoint.xy / reflectedPoint.w * .5 + .5;
    uv += (swell.yz + ripples.yz) * vec2(.18, .09);
    vec2 blur = reflectionPixel * vec2(1.1, 1.6);
    vec3 reflected = texture2D(reflection, uv).rgb * .44;
    reflected += (texture2D(reflection, uv + blur).rgb
      + texture2D(reflection, uv - blur).rgb) * .18;
    reflected += (texture2D(reflection, uv + vec2(-blur.x, blur.y)).rgb
      + texture2D(reflection, uv + vec2(blur.x, -blur.y)).rgb) * .10;
    vec2 edge = min(uv, 1.0 - uv);
    float border = smoothstep(.001, .025, min(edge.x, edge.y));
    color += (reflected - reflectionSky) * border * (.23 + grazing * .26);

    float hull = max(0.0, segmentDistance(p, vec2(2.8, 14.95), vec2(19.3, 14.95)) - 1.28);
    float contact = max(exp(-hull * 3.7) * .18, exp(-quay * 2.2) * .15);
    color *= 1.0 - contact;
    gl_FragColor = vec4(max(color, vec3(.008)), 1.0);
    #include <colorspace_fragment>
  }
`;

export function addHarborWater(scene) {
  const target = new T.WebGLRenderTarget(1, 1, { minFilter: T.LinearFilter });
  const time = { value: 0 };
  const projection = new T.Matrix4();
  const pixel = new T.Vector2(1, 1);
  const material = new T.ShaderMaterial({
    uniforms: {
      time,
      reflection: { value: target.texture },
      reflectionProjection: { value: projection },
      reflectionPixel: { value: pixel },
      reflectionSky: { value: scene.background.clone() },
    },
    vertexShader,
    fragmentShader,
  });
  const sea = mesh(scene, new T.PlaneGeometry(4400, 4400), material, 0, seaLevel, 0);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = false;

  const camera = new T.OrthographicCamera();
  camera.layers.set(reflectionLayer);
  const upward = new T.Vector3(0, 1, 0);
  const direction = new T.Vector3();
  const look = new T.Vector3();
  const lastCamera = new T.Matrix4();
  const lastProjection = new T.Matrix4();
  const clip = [new T.Plane(upward, -seaLevel)];
  let lastUpdate = -Infinity;

  return {
    time,
    invalidate() { lastUpdate = -Infinity; },
    resize(width, height) {
      const scale = Math.min(.5, 620 / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      target.setSize(w, h);
      pixel.set(1 / w, 1 / h);
      lastUpdate = -Infinity;
    },
    updateReflection(renderer, source, now) {
      source.updateMatrixWorld();
      if (now - lastUpdate < 80 || (lastCamera.equals(source.matrixWorld) &&
        lastProjection.equals(source.projectionMatrix) && Number.isFinite(lastUpdate))) return;
      camera.position.copy(source.position);
      camera.position.y = 2 * seaLevel - camera.position.y;
      source.getWorldDirection(direction).reflect(upward);
      camera.up.setFromMatrixColumn(source.matrixWorld, 1).reflect(upward);
      camera.lookAt(look.copy(camera.position).add(direction));
      camera.updateMatrixWorld();
      camera.projectionMatrix.copy(source.projectionMatrix);
      camera.projectionMatrixInverse.copy(source.projectionMatrixInverse);
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      const previousTarget = renderer.getRenderTarget();
      const clipping = renderer.clippingPlanes;
      const shadowUpdate = renderer.shadowMap.needsUpdate;
      try {
        renderer.clippingPlanes = clip;
        renderer.shadowMap.needsUpdate = false;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
      } finally {
        renderer.setRenderTarget(previousTarget);
        renderer.clippingPlanes = clipping;
        renderer.shadowMap.needsUpdate = shadowUpdate;
      }
      lastCamera.copy(source.matrixWorld);
      lastProjection.copy(source.projectionMatrix);
      lastUpdate = now;
    },
  };
}
