import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build,transform} from 'esbuild';

const [template,style,license]=await Promise.all([
  readFile('src/template.html','utf8'),readFile('src/style.css','utf8'),
  readFile('node_modules/three/LICENSE','utf8'),
]);
const script=await build({
  entryPoints:['src/main.js'],bundle:true,format:'iife',target:'es2022',minify:true,write:false,legalComments:'none',
});
const css=await transform(style,{loader:'css',minify:true});
const site=template
  .replace('/* SITE_CSS */',()=>css.code)
  .replace('/* SITE_JS */',()=>`/* Three.js\n${license}\n*/\n`+script.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
await mkdir('docs',{recursive:true});
await Promise.all([writeFile('docs/index.html',site),writeFile('docs/.nojekyll','')]);
