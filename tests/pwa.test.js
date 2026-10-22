// Tests for the installable-app files: the manifest, the icons and the
// service worker. Run with:  node tests/pwa.test.js   (or: npm test)
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let fails=0;
function check(name,ok){console.log((ok?'ok  ':'FAIL')+'  '+name);if(!ok)fails++}

// A PNG's width and height are stored at bytes 16–23.
function pngSize(f){const b=fs.readFileSync(path.join(root,f));return b.toString('ascii',1,4)==='PNG'?[b.readUInt32BE(16),b.readUInt32BE(20)]:null}

let m=null;try{m=JSON.parse(read('manifest.webmanifest'))}catch(e){}
check('the manifest is valid JSON',!!m);
if(m){
  check('it has a name, a short name and a start page',!!m.name&&!!m.short_name&&!!m.start_url);
  check('it opens in its own window (standalone)',m.display==='standalone');
  check('start page and scope are relative, so it works under any folder (like GitHub Pages)',m.start_url.startsWith('.')&&m.scope.startsWith('.'));
  const icons=m.icons||[];
  check('it has 192 and 512 pixel icons and a maskable one',['192x192','512x512'].every(s=>icons.some(i=>i.sizes===s))&&icons.some(i=>i.purpose==='maskable'));
  for(const i of icons){const sz=pngSize(i.src);check(`${i.src} exists and is ${i.sizes}`,!!sz&&`${sz[0]}x${sz[1]}`===i.sizes)}
}
check('the iPhone icon is 180 by 180',String(pngSize('icons/apple-touch-icon.png'))==='180,180');

const sw=read('sw.js');
let parses=true;try{new Function(sw)}catch(e){parses=false}
check('sw.js parses',parses);
const list=(sw.match(/APP_FILES\s*=\s*\[([\s\S]*?)\]/)||[])[1]||'';
const files=[...list.matchAll(/'([^']+)'/g)].map(x=>x[1]).filter(f=>f!=='./');
check('every file the service worker saves for offline use exists',files.length>0&&files.every(f=>fs.existsSync(path.join(root,f))));

const html=read('index.html');
check('index.html links the manifest',html.includes('<link rel="manifest" href="manifest.webmanifest">'));
check('index.html registers the service worker',html.includes("navigator.serviceWorker.register('sw.js')"));
check('index.html has the iPhone icon and a theme colour',html.includes('rel="apple-touch-icon"')&&html.includes('name="theme-color"'));

if(fails){console.error(`FAILED (${fails})`);process.exit(1)}else console.log('ALL APP-INSTALL TESTS PASSED');
