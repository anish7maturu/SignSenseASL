// Tests for the SignSense translator logic (Sign → Text typing and Text → Sign).
// Run with:  node tests/translator.test.js   (or: npm test)
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const block=(name)=>{const s=html.split(`/* ===================== ${name}-START`)[1].split(`/* ===================== ${name}-END`)[0];return s.slice(s.indexOf('*/')+2)};
const T=new Function(block('TRANSLATOR')+';return{createTyper,textToSigns,lerpPose,isStill,pathLen,motionOffset};')();
const H=new Function(block('HAND-MODEL')+';return{HAND_POSES,handPoints};')();

let fails=0;
function check(name,ok){console.log((ok?'ok  ':'FAIL')+'  '+name);if(!ok)fails++}

// Feed the typer the same guess every 50 ms for `ms` milliseconds.
function feed(ty,t0,ms,input){let r;for(let t=t0;t<t0+ms;t+=50)r=ty.step({t,...input});return{r,t:t0+ms}}

/* ---------- Sign → Text ---------- */
{
  const ty=T.createTyper();
  let {t}=feed(ty,0,600,{hand:true,letter:'H',still:true});
  check('a letter is not typed before it is held long enough',ty.text==='');
  ({t}=feed(ty,t,400,{hand:true,letter:'H',still:true}));
  check('a letter held still is typed',ty.text==='H');
  ({t}=feed(ty,t,3000,{hand:true,letter:'H',still:true}));
  check('holding the same letter types it only once',ty.text==='H');
  ({t}=feed(ty,t,1000,{hand:true,letter:'I',still:true}));
  check('a new letter is typed after the first',ty.text==='HI');
  ({t}=feed(ty,t,1700,{hand:false}));
  check('lowering the hand adds one space',ty.text==='HI ');
  ({t}=feed(ty,t,3000,{hand:false}));
  check('a long pause still adds only one space',ty.text==='HI ');
}
{
  const ty=T.createTyper();
  let {t}=feed(ty,0,1000,{hand:true,letter:'L',still:true});
  ({t}=feed(ty,t,400,{hand:true,letter:null,still:true}));     // relax the hand
  ({t}=feed(ty,t,1000,{hand:true,letter:'L',still:true}));
  check('a repeated letter is typed again after relaxing the hand',ty.text==='LL');
}
{
  const ty=T.createTyper();
  let {t}=feed(ty,0,450,{hand:true,letter:'B',still:true});
  ty.step({t,hand:true,letter:'E',still:true});                // one misread frame
  ({t}=feed(ty,t+50,500,{hand:true,letter:'B',still:true}));
  check('a single misread frame does not restart the hold',ty.text==='B');
}
{
  const ty=T.createTyper();
  feed(ty,0,3000,{hand:true,letter:'A',still:false});
  check('a moving hand does not type',ty.text==='');
}
{
  const ty=T.createTyper();
  let {t}=feed(ty,0,300,{hand:true,letter:'I',still:true});
  const r=ty.step({t,hand:true,letter:'I',still:true,motion:'J'});
  ({t}=feed(ty,t+50,2000,{hand:true,letter:'I',still:true}));
  check('a finished J movement types J, and the I shape after it is not typed',r.committed==='J'&&ty.text==='J');
}
{
  const ty=T.createTyper();
  feed(ty,0,3000,{hand:false});
  check('no space is added before any letters',ty.text==='');
  feed(ty,3000,1000,{hand:true,letter:'O',still:true});
  feed(ty,4000,3000,{hand:false,autoSpace:false});
  check('auto space can be turned off',ty.text==='O');
  ty.space();ty.space();check('the space button adds one space',ty.text==='O ');
  ty.backspace();ty.backspace();check('delete removes characters',ty.text==='');
}
check('isStill: a steady wrist is still',T.isStill([{x:0,y:0},{x:.05,y:.02},{x:.03,y:.04}]));
check('isStill: a moving wrist is not still',!T.isStill([{x:0,y:0},{x:.2,y:.1},{x:.5,y:.1}]));

/* ---------- Text → Sign ---------- */
const sig=s=>T.textToSigns(s).map(t=>t.kind==='letter'?t.ch+(t.double?'²':''):t.kind==='space'?'_':'·').join('');
check('textToSigns splits words and marks spaces',sig('hi mom')==='HI_MOM');
check('textToSigns marks repeated letters',sig('hello')==='HEL'+'L²O');
check('textToSigns skips numbers and punctuation',sig('hi, 2u!')==='HI·_·U·');
check('textToSigns collapses extra spaces and trims',sig('  a   b  ')==='A_B');
check('textToSigns: a letter after punctuation is not a repeat',sig('a.a')==='A·A');

const close=(P,Q)=>P.every((p,i)=>p.every((v,j)=>Math.abs(v-Q[i][j])<1e-9));
const A=H.HAND_POSES.A,B=H.HAND_POSES.B;
check('lerpPose at 0 is the first pose',close(H.handPoints(T.lerpPose(A,B,0)),H.handPoints(A)));
check('lerpPose at 1 is the second pose',close(H.handPoints(T.lerpPose(A,B,1)),H.handPoints(B)));
const mid=H.handPoints(T.lerpPose(A,B,.5)),tipA=H.handPoints(A)[8][1],tipB=H.handPoints(B)[8][1];
check('lerpPose halfway puts the index fingertip between the two poses',mid[8][1]>Math.min(tipA,tipB)&&mid[8][1]<Math.max(tipA,tipB));
let allOk=true;for(const L of Object.keys(H.HAND_POSES))for(const M of Object.keys(H.HAND_POSES)){const p=H.handPoints(T.lerpPose(H.HAND_POSES[L],H.HAND_POSES[M],.5));if(p.length!==21||p.some(q=>q.some(v=>!Number.isFinite(v))))allOk=false}
check('every pair of letters blends into a valid 21-point hand',allOk);

const j0=T.motionOffset('J',0),j1=T.motionOffset('J',1),z1=T.motionOffset('Z',1);
check('J moves down and hooks to the side',j0[0]===0&&j0[1]===0&&j1[1]>.6&&j1[0]>.3);
check('Z ends below and across from where it started',Math.abs(z1[0]+.7)<1e-9&&Math.abs(z1[1]-.65)<1e-9);

if(fails){console.error(`FAILED (${fails})`);process.exit(1)}else console.log('ALL TRANSLATOR TESTS PASSED');
