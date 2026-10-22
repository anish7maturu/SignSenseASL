// Tests for the six SignSense test levels: picking questions, checking
// answers, passing and unlocking, and the conversation script.
// Run with:  node tests/levels.test.js   (or: npm test)
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const block=n=>{const s=html.split(`/* ===================== ${n}-START`)[1].split(`/* ===================== ${n}-END`)[0];return s.slice(s.indexOf('*/')+2)};
const T=new Function(block('TESTS')+';return{TEST_LEVELS,pickItems,signProgress,readCorrect,levelPassed,levelOpen,convoNext,onlyLetters};')();
const Tr=new Function(block('TRANSLATOR')+';return{createTyper,textToSigns};')();
const C=new Function(block('CLASSIFIER')+';return{CHECKS};')();

let fails=0;
function check(name,ok){console.log((ok?'ok  ':'FAIL')+'  '+name);if(!ok)fails++}

/* ---------- the levels ---------- */
check('there are six levels, numbered 1 to 6',T.TEST_LEVELS.map(l=>l.id).join('')==='123456');
check('every level can be passed (pass mark is not above the number of questions)',T.TEST_LEVELS.every(l=>l.kind==='chat'||l.pass<=l.count&&l.pool.length>=l.count));
const allLetters=T.TEST_LEVELS.filter(l=>l.pool).flatMap(l=>l.pool).every(w=>/^[A-Z ]+$/.test(w));
check('every word, phrase and sentence uses only A–Z and spaces',allLetters);
check('every letter in the tests has a camera check',T.TEST_LEVELS.filter(l=>l.pool).flatMap(l=>l.pool).join('').replace(/ /g,'').split('').every(c=>C.CHECKS[c]));
check('the alphabet test leaves out T, N and M (hard for webcams)',!['T','N','M'].some(c=>T.TEST_LEVELS[0].pool.includes(c)));
let seed=7;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const picked=T.pickItems(T.TEST_LEVELS[0],rand);
check('pickItems picks the right number of different items',picked.length===8&&new Set(picked).size===8);

/* ---------- checking answers ---------- */
check('signProgress: a correct start is ok and says the next letter',JSON.stringify(T.signProgress('CAT','CA'))===JSON.stringify({status:'ok',expected:'T'}));
check('signProgress: the whole word is done',T.signProgress('CAT','CAT').status==='done');
check('signProgress: a wrong letter is wrong and says what was expected',JSON.stringify(T.signProgress('CAT','CO'))===JSON.stringify({status:'wrong',expected:'A'}));
check('signProgress: spaces between words do not matter',T.signProgress('I AM HAPPY','IAM HAP').status==='ok'&&T.signProgress('I AM HAPPY','I AM HAPPY ').status==='done');
check('readCorrect ignores capitals, spaces and punctuation',T.readCorrect("thank-you!",'THANK YOU')&&T.readCorrect('lets go','LETS GO'));
check('readCorrect rejects a wrong or empty answer',!T.readCorrect('thanks','THANK YOU')&&!T.readCorrect('','THANK YOU'));

/* ---------- passing and unlocking ---------- */
const L1=T.TEST_LEVELS[0];
check('6 of 8 passes level 1, 5 does not',T.levelPassed(L1,6)&&!T.levelPassed(L1,5));
check('level 1 is always open',T.levelOpen(1,{},false));
check('level 2 is locked until level 1 is passed',!T.levelOpen(2,{},false)&&!T.levelOpen(2,{1:{passed:false,best:5}},false)&&T.levelOpen(2,{1:{passed:true}},false));
check('"unlock all" opens every level',T.levelOpen(6,{},true));

/* ---------- a word with a repeated letter can be signed ---------- */
{
  const ty=Tr.createTyper();let t=0;
  const hold=(letter,ms)=>{for(const end=t+ms;t<end;t+=50)ty.step({t,hand:true,letter,still:true})};
  hold('M',1000);hold('O',1000);hold('M',1000);
  check('MOM can be fingerspelled (M, O, M)',T.signProgress('MOM',ty.text).status==='done');
  const ty2=Tr.createTyper();t=0;
  const h2=(letter,ms)=>{for(const end=t+ms;t<end;t+=50)ty2.step({t,hand:true,letter,still:true})};
  h2('L',1000);h2(null,400);h2('L',1000);
  check('a double letter (LL) types twice after relaxing the hand',ty2.text==='LL');
  ty2.add('X');check('typer.add adds a letter (the "camera can\'t see this letter" button)',ty2.text==='LLX');
}

/* ---------- the conversation ---------- */
{
  let r=T.convoNext(0,'');check('the conversation starts by asking your name',r.say.includes('NAME')&&r.step===1);
  r=T.convoNext(1,'anish');check('it uses your name',r.say.includes('ANISH')&&r.step===2);
  check('a yes gets a happy reply',T.convoNext(2,'yes').say.startsWith('ME TOO'));
  check('a no gets an encouraging reply',T.convoNext(2,'no').say.startsWith('IT GETS EASIER'));
  check('it repeats your favorite color',T.convoNext(3,'blue').say.startsWith('BLUE IS COOL'));
  const pet=T.convoNext(4,'yes'),noPet=T.convoNext(4,'nope');
  check('yes to a pet asks what kind; no ends the chat',pet.say==='WHAT KIND'&&!pet.done&&noPet.done);
  check('naming your pet ends the chat',T.convoNext(5,'dog').say.includes('DOG')&&T.convoNext(5,'dog').done);
  // walk a full chat: the pass mark (4 answers) is reachable both ways
  for(const answers of [['MAYA','YES','RED','NO'],['MAYA','YES','RED','YES','CAT']]){
    let step=0,n=0,done=false;r=T.convoNext(0,'');step=r.step;
    for(const a of answers){r=T.convoNext(step,a);step=r.step;n++;if(r.done){done=true;break}}
    check(`a ${answers.length}-answer chat finishes and passes`,done&&n===answers.length&&T.levelPassed(T.TEST_LEVELS[5],n));
  }
  check('everything the hand says can be fingerspelled',['','ANISH','yes','blue','dog'].every((a,i)=>Tr.textToSigns(T.convoNext(i,a).say).every(t=>t.kind!=='skip')));
}

if(fails){console.error(`FAILED (${fails})`);process.exit(1)}else console.log('ALL LEVEL TESTS PASSED');
