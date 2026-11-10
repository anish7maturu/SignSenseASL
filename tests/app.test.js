// Tests for the iPhone app setup: permission messages, Capacitor settings,
// and that the app build bundles every library instead of downloading it.
// Run with:  node tests/app.test.js   (or: npm test)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0;
function check(name, ok) { console.log((ok ? 'ok  ' : 'FAIL') + '  ' + name); if (!ok) fails++ }

const plist = read('ios/App/App/Info.plist');
const usage = k => (plist.match(new RegExp(`<key>${k}</key>\\s*<string>([^<]+)</string>`)) || [])[1] || '';
check('the camera permission message explains the video stays on the phone', /never recorded or uploaded/.test(usage('NSCameraUsageDescription')));
check('the microphone permission message is there', usage('NSMicrophoneUsageDescription').length > 30);
check('the speech recognition permission message is there', usage('NSSpeechRecognitionUsageDescription').length > 30);
check('the app name on the home screen is SignSense', /<key>CFBundleDisplayName<\/key>\s*<string>SignSense<\/string>/.test(plist));

const cap = JSON.parse(read('capacitor.config.json'));
check('Capacitor builds the app from www/', cap.webDir === 'www' && /^[a-z0-9.]+$/.test(cap.appId));

const html = read('index.html');
check('index.html has a delete-profile option', html.includes('id="deleteBtn"') && html.includes('accounts.remove('));
check('the privacy policy page exists and is linked', fs.existsSync(path.join(root, 'privacy.html')) && html.includes('href="privacy.html"'));
check('the privacy policy explains how to delete a profile', /Delete my profile/.test(read('privacy.html')));

// Build www/ when the libraries are installed (npm install), then check it.
if (fs.existsSync(path.join(root, 'node_modules/@mediapipe/hands'))) {
  execFileSync(process.execPath, [path.join(root, 'tools/build-app.js')], { stdio: 'ignore' });
  const app = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
  check('the app loads no scripts, styles or fonts from the internet', !/(src|href)="https?:\/\/(?!github\.com)/.test(app) && !/fonts\.googleapis/.test(app) && !/'https:\/\/cdn\.jsdelivr/.test(app));
  check('the app uses the bundled hand tracker', app.includes('<script src="vendor/mediapipe/hands.js">') && fs.existsSync(path.join(root, 'www/vendor/mediapipe/hand_landmark_full.tflite')));
  const langs = [...html.matchAll(/ocr:'([a-z_]+)'/g)].map(m => m[1]);
  check(`all ${langs.length} photo-reading languages are bundled`, langs.length === 12 && langs.every(l => fs.existsSync(path.join(root, `www/vendor/tessdata/${l}.traineddata.gz`))));
  check('the text reader, its engine and the font are bundled', ['vendor/tesseract/worker.min.js', 'vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js', 'vendor/fonts/fonts.css'].every(f => fs.existsSync(path.join(root, 'www', f))));
  check("Finn's voice recordings are in the app", fs.readdirSync(path.join(root, 'www/voice')).length >= 100);
  check('the app keeps the page clear of the notch', app.includes('viewport-fit=cover') && app.includes('safe-area-inset-top'));
} else console.log('skip  app build checks (run "npm install" first)');

if (fails) { console.error(`FAILED (${fails})`); process.exit(1) } else console.log('ALL IPHONE APP TESTS PASSED');
