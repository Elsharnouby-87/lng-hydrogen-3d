import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';

const path = (relative) => new URL(relative, import.meta.url);
const read = (relative) => readFile(path(relative), 'utf8');

const [template, style, screeningStyle, screeningView, license, signatureFont, signatureLicense, bundle] = await Promise.all([
  read('src/template.html'),
  read('src/style.css'),
  read('src/screening.css'),
  read('src/screening.html'),
  read('node_modules/three/LICENSE'),
  readFile(path('src/assets/explora-signature.woff2')),
  read('src/assets/explora-ofl.txt'),
  build({
    absWorkingDir: fileURLToPath(path('./')),
    entryPoints: ['src/main.js'],
    bundle: true,
    format: 'iife',
    target: 'es2022',
    minify: true,
    write: false,
    legalComments: 'none',
  }),
]);
const { code: css } = await transform(`${style}\n${screeningStyle}`, { loader: 'css', minify: true });
const signatureCss = `/* Explora\n${signatureLicense}\n*/\n` +
  `@font-face{font-family:Explora;src:url(data:font/woff2;base64,${signatureFont.toString('base64')}) format('woff2');font-weight:400;font-display:swap}`;
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const site = template
  .replace('<!-- SCREENING_VIEW -->', () => screeningView)
  .replace('/* SITE_CSS */', () => signatureCss + '\n' + css)
  .replace('/* SITE_JS */', () => `/* Three.js\n${license}\n*/\n${script}`);

await mkdir(path('docs/'), { recursive: true });
await Promise.all([writeFile(path('docs/index.html'), site), writeFile(path('docs/.nojekyll'), '')]);
