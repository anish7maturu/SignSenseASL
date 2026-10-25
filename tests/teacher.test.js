// Tests for "Teach me a word": understanding what was said, and Finn's
// lesson steps. Run with:  node tests/teacher.test.js   (or: npm test)
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const block=n=>{const s=html.split(`/* ===================== ${n}-START`)[1].split(`/* ===================== ${n}-END`)[0];return s.slice(s.indexOf('*/')+2)};
const K=new Function(block('TEACHER')+';return{parseTeachRequest,teachScript};')();
let fails=0;
function check(name,ok){console.log((ok?'ok  ':'FAIL')+'  '+name);if(!ok)fails++}
const P=K.parseTeachRequest;

check('"Teach me hello" gives HELLO',P('Teach me hello')==='HELLO');
check('a word on its own is taught as is',P('hello')==='HELLO');
check('"teach me the word friend please" gives FRIEND',P('teach me the word friend please')==='FRIEND');
check('"How do you sign thank you?" gives THANK YOU',P('How do you sign thank you?')==='THANK YOU');
check('"can you teach me how to sign pizza" gives PIZZA',P('Can you teach me how to sign pizza')==='PIZZA');
check('"teach me how to say goodbye in ASL" gives GOODBYE',P('teach me how to say goodbye in ASL')==='GOODBYE');
check('"Hey Finn, teach me mom" gives MOM',P('Hey Finn, teach me mom')==='MOM');
check('"spell my name Kiran" gives KIRAN',P('spell my name Kiran')==='KIRAN');
check('a word that starts like "sign" is not cut short',P('signal')==='SIGNAL'&&P('teach me spelling')==='SPELLING');
check('"teach me" with no word gives nothing',P('Teach me')===''&&P('')===''&&P('   ')==='');
check('apostrophes and numbers are dropped',P("teach me don't")==='DONT'&&P('teach me 42 cats')==='CATS');
check('at most 3 words and 20 letters',P('teach me one two three four')==='ONE TWO THREE'&&P('teach me supercalifragilisticexpialidocious')==='');

const desc=L=>'How to make '+L+'.';
const s=K.teachScript('hello',desc);
check('a lesson is intro, one step per letter, all together, then your turn',s.map(x=>x.kind).join()==='intro,letter,letter,letter,letter,letter,together,turn');
check('the intro spells the word out',s[0].say.includes('H, E, L, L, O'));
check('each letter step explains that letter',s[1].ch==='H'&&s[1].say.includes('How to make H.')&&s[1].say.startsWith('Letter 1 of 5'));
check('a double letter is explained as a bounce, not repeated',s[4].again&&!s[3].again&&/bounce/.test(s[4].say));
check('the voice says the word, not its letters in capitals',s[0].voice.includes('"hello"')&&!s[0].voice.includes('HELLO'));
const t=K.teachScript('Thank you',desc);
check('two words: spaces are skipped, letters counted across both',t.filter(x=>x.kind==='letter').map(x=>x.ch).join('')==='THANKYOU'&&t[1].say.includes('of 8'));
check('two words: the intro says where the second word starts',t[0].say.includes('T, H, A, N, K — then Y, O, U'));
check('nothing to teach gives no steps',K.teachScript('123',desc).length===0&&K.teachScript('',desc).length===0);

if(fails){console.error(`FAILED (${fails})`);process.exit(1)}else console.log('ALL TEACHER TESTS PASSED');
