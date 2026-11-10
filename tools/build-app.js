// Builds the iPhone app's files into www/ (Capacitor copies www/ into the app).
//   npm install          (once, to get the libraries below)
//   npm run build:app    (then: npx cap sync ios, and open ios/App in Xcode)
//
// The website loads MediaPipe, Tesseract and the font from the internet. The
// app can't do that: Apple doesn't allow apps to download code after they're
// installed, and the app should work offline. So this copies every library,
// all 12 text-reading languages and the font into www/vendor/, and points
// index.html at those copies. Nothing in www/ loads code from the internet.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), www = path.join(root, 'www');
const nm = p => path.join(root, 'node_modules', p);

const OCR_LANGS = ['eng', 'spa', 'fra', 'deu', 'por', 'ita', 'vie', 'tgl', 'hin', 'chi_sim', 'kor', 'ara'];
const MEDIAPIPE_FILES = ['hands.js', 'hands.binarypb', 'hands_solution_packed_assets.data', 'hands_solution_packed_assets_loader.js',
  'hands_solution_simd_wasm_bin.js', 'hands_solution_simd_wasm_bin.wasm', 'hands_solution_simd_wasm_bin.data',
  'hands_solution_wasm_bin.js', 'hands_solution_wasm_bin.wasm', 'hand_landmark_full.tflite'];

function copy(from, to) {
  if (!fs.existsSync(from)) throw Error(`Missing ${path.relative(root, from)}. Run "npm install" first.`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}
const out = p => path.join(www, p);

// 1. A clean www/ with the app's own files.
fs.rmSync(www, { recursive: true, force: true });
for (const f of ['manifest.webmanifest', 'privacy.html', 'icons', 'voice']) copy(path.join(root, f), out(f));

// 2. The libraries, bundled.
for (const f of MEDIAPIPE_FILES) copy(nm('@mediapipe/hands/' + f), out('vendor/mediapipe/' + f));
for (const f of ['tesseract.min.js', 'worker.min.js']) copy(nm('tesseract.js/dist/' + f), out('vendor/tesseract/' + f));
for (const f of ['tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js']) copy(nm('tesseract.js-core/' + f), out('vendor/tesseract-core/' + f));
// The smaller "best_int" data where there is one (Tagalog only has the standard data).
for (const l of OCR_LANGS) {
  const best = nm(`@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`);
  copy(fs.existsSync(best) ? best : nm(`@tesseract.js-data/${l}/4.0.0/${l}.traineddata.gz`), out(`vendor/tessdata/${l}.traineddata.gz`));
}
for (const w of [400, 700]) copy(nm(`@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-${w}-normal.woff2`), out(`vendor/fonts/atkinson-${w}.woff2`));
fs.writeFileSync(out('vendor/fonts/fonts.css'), [400, 700].map(w =>
  `@font-face{font-family:'Atkinson Hyperlegible';font-style:normal;font-weight:${w};font-display:swap;src:url(atkinson-${w}.woff2) format('woff2')}`).join('\n') + '\n');

// 3. index.html, pointed at the bundled copies.
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function swap(find, replace) {
  if (!html.includes(find)) throw Error('index.html changed: could not find ' + find.slice(0, 70));
  html = html.split(find).join(replace);
}
swap(html.match(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/)[0], '');
swap(html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0], '<link rel="stylesheet" href="vendor/fonts/fonts.css">');
swap(html.match(/<script>const LIBS=\{.*\};<\/script>/)[0],
  // Tesseract's worker runs from its own folder, so its paths must be full URLs.
  "<script>const APP_BASE=new URL('.',location.href).href;const LIBS={mediapipe:'vendor/mediapipe/',tesseract:'vendor/tesseract/tesseract.min.js'," +
  "tesseractOptions:{workerPath:APP_BASE+'vendor/tesseract/worker.min.js',corePath:APP_BASE+'vendor/tesseract-core/',langPath:APP_BASE+'vendor/tessdata',workerBlobURL:false}};</script>");
// The app fills the whole screen, so keep the page clear of the notch and status bar.
swap('<meta name="viewport" content="width=device-width,initial-scale=1">', '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
swap('</style>\n</head>', 'body{padding-top:env(safe-area-inset-top)}\n</style>\n</head>');
swap(html.match(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/hands@[^"]+\/hands\.js"><\/script>/)[0], '<script src="vendor/mediapipe/hands.js"></script>');
const left = html.match(/(src|href)="https?:\/\/[^"]*"|'https?:\/\/cdn\.jsdelivr[^']*'/g) || [];
const allowed = left.filter(u => !/(github\.com|mymemory\.translated\.net)/.test(u));
if (allowed.length) throw Error('index.html still loads from the internet: ' + allowed.join(', '));
fs.writeFileSync(out('index.html'), html);

const size = d => fs.readdirSync(d, { withFileTypes: true }).reduce((t, e) => t + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`Built www/ (${(size(www) / 1e6).toFixed(1)} MB). Next: npx cap sync ios`);
