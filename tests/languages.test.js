// Tests for other languages and photo text in Text → Sign.
// Run with:  node tests/languages.test.js   (or: npm test)
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const block=n=>{const s=html.split(`/* ===================== ${n}-START`)[1].split(`/* ===================== ${n}-END`)[0];return s.slice(s.indexOf('*/')+2)};
const L=new Function(block('LANGUAGES')+';return{LANGUAGES,langOf,myMemoryURL,readMyMemory,cleanPhotoText};')();
const T=new Function(block('TRANSLATOR')+';return{textToSigns,plainLetters};')();

let fails=0;
function check(name,ok){console.log((ok?'ok  ':'FAIL')+'  '+name);if(!ok)fails++}
const letters=s=>T.textToSigns(s).filter(t=>t.kind==='letter').map(t=>t.ch).join('');

check('English is the first (default) language',L.LANGUAGES[0].code==='en');
check('every language has a translation code and a photo-reader code',L.LANGUAGES.every(l=>/^[a-z]{2}$/.test(l.code)&&/^[a-z_]{3,}$/.test(l.ocr)));
check('language codes are not repeated',new Set(L.LANGUAGES.map(l=>l.code)).size===L.LANGUAGES.length);
check('an unknown language falls back to English',L.langOf('xx').code==='en');

check('accented letters are signed as plain letters',letters('café')==='CAFE'&&letters('Señor')==='SENOR'&&letters('Zoë')==='ZOE');
check('ß, æ and ø become ss, ae and o',T.plainLetters('Straße')==='Strasse'&&T.plainLetters('Æsop')==='AEsop'&&T.plainLetters('Ørsted')==='Orsted');
check('letters from other alphabets are skipped, not signed wrong',letters('你好 hi')==='HI');

const url=L.myMemoryURL('¿Cómo estás?','es');
check('the translator address carries the text safely encoded',url.startsWith('https://api.mymemory.translated.net/get?q=')&&url.includes(encodeURIComponent('¿Cómo estás?'))&&url.endsWith('langpair=es|en'));
check('a good MyMemory answer gives the translation',L.readMyMemory({responseStatus:200,responseData:{translatedText:'How are you?'}})==='How are you?');
let err='';try{L.readMyMemory({responseStatus:429,responseDetails:'Too many requests',responseData:{translatedText:''}})}catch(e){err=e.message}
check('a failed MyMemory answer becomes a readable error',err==='Too many requests');
err='';try{L.readMyMemory({responseStatus:200,responseData:{translatedText:'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY'}})}catch(e){err=e.message}
check('the daily-limit warning is not signed as if it were a translation',/daily limit/.test(err));

check('photo text becomes one clean line',L.cleanPhotoText('  STOP\n\nSIGN | here  ')==='STOP SIGN here');
const long=L.cleanPhotoText('word '.repeat(60));
check('long photo text is cut at a word, within 120 characters',long.length<=120&&!long.endsWith(' ')&&long.split(' ').every(w=>w==='word'));
check('a photo with no text gives an empty result',L.cleanPhotoText('  |  ~ \n')==='');

if(fails){console.error(`FAILED (${fails})`);process.exit(1)}else console.log('ALL LANGUAGE TESTS PASSED');
