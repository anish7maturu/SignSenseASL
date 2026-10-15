// Synthetic-hand tests for the SignSense handshape classifier.
// Builds 21-point hands (same layout as MediaPipe Hands) for each letter,
// in both hands, tilted different ways, with small random jitter, and checks
// that each letter is recognised and not mistaken for another.
// Run with:  node tests/classifier.test.js   (or: npm test)
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const src=html.split('/* ===================== CLASSIFIER-START')[1].split('/* ===================== CLASSIFIER-END')[0];
const C=new Function(src.slice(src.indexOf('*/')+2)+';return{analyze,CHECKS,detect,evalMotion,setAspect,DETECT_ORDER};')();
C.setAspect(1);

const D=Math.PI/180;
const MCP={i:[-.28,.95,0],m:[0,1,0],r:[.24,.93,0],p:[.44,.82,0]};
const LEN={i:[.45,.27,.22],m:[.5,.3,.23],r:[.46,.28,.22],p:[.36,.22,.2]};
const CURL=[85,100,60],UP=[0,0,0];
function finger(k,[f1,f2,f3],ab=0){
  const out=[];let pt=[...MCP[k]];out.push([...pt]);
  const d0=[Math.sin(ab*D),Math.cos(ab*D),0];let phi=0;
  [f1,f2,f3].forEach((f,j)=>{phi+=f*D;const d=[Math.cos(phi)*d0[0],Math.cos(phi)*d0[1],Math.sin(phi)];pt=pt.map((v,n)=>v+d[n]*LEN[k][j]);out.push([...pt])});
  return out;
}
// pose: {i:[angles,ab], ..., thumb:{tip|tipFn, bulge}, roll, pitch}
function hand(pose,{left=false,roll=0,pitch=0,noise=0}={}){
  const P=[];P[0]=[0,0,0];const T1=[-.25,.2,.08];
  const fk={};for(const k of ['i','m','r','p']){const [ang,ab]=pose[k];fk[k]=finger(k,ang,ab||0)}
  const idx={i:5,m:9,r:13,p:17};for(const k in idx)fk[k].forEach((q,j)=>P[idx[k]+j]=q);
  const tip=pose.thumb.tipFn?pose.thumb.tipFn(P):pose.thumb.tip,b=pose.thumb.bulge||[0,0,0];
  P[1]=T1;P[2]=T1.map((v,n)=>v+.35*(tip[n]-v)+b[n]);P[3]=T1.map((v,n)=>v+.7*(tip[n]-v)+.6*b[n]);P[4]=tip;
  const r=(roll+(pose.roll||0))*D,pt=(pitch+(pose.pitch||0))*D;
  return P.map(([X,Y,Z])=>{
    let x=left?X:-X,y=-Y,z=-Z;                       // palm toward camera
    let y2=y*Math.cos(pt)-z*Math.sin(pt),z2=y*Math.sin(pt)+z*Math.cos(pt);y=y2;z=z2; // pitch about x
    let x2=x*Math.cos(r)-y*Math.sin(r);y2=x*Math.sin(r)+y*Math.cos(r);x=x2;y=y2;      // roll about z
    const j=()=>(Math.random()*2-1)*noise;
    return{x:.5+.2*x+j(),y:.55+.2*y+j(),z:.2*z+j()};
  });
}
const th=(tip,bulge)=>({tip,bulge});
const FIST={i:[CURL],m:[CURL],r:[CURL],p:[CURL]};
const ACROSS=th([.08,.78,.55],[-.2,.15,.05]);
const HOLD_RP=th([.2,.85,.5],[0,0,.1]);
const POSES={
  A:{...FIST,thumb:th([-.42,.85,.1],[-.05,0,0])},
  B:{i:[UP],m:[UP,1],r:[UP,2],p:[UP,4],thumb:th([.05,.55,.15],[-.05,.1,.1])},
  L:{i:[UP],m:[CURL],r:[CURL],p:[CURL],thumb:th([-.75,.45,.05])},
  I:{...FIST,p:[UP],thumb:ACROSS},
  Y:{...FIST,p:[UP,8],thumb:th([-.75,.5,.05])},
  D:{...FIST,i:[UP],thumb:th([.02,.7,.38],[0,0,.1])},
  U:{...FIST,i:[UP],m:[UP,-3],thumb:HOLD_RP},
  V:{...FIST,i:[UP,-10],m:[UP,10],thumb:HOLD_RP},
  W:{...FIST,i:[UP,-8],m:[UP],r:[UP,8],thumb:th([.38,.75,.42],[0,0,.1])},
  F:{i:[[55,70,30]],m:[UP],r:[UP,5],p:[UP,12],thumb:th([-.3,.86,.66],[-.1,0,.1])},
  C:{i:[[30,40,20]],m:[[30,40,20]],r:[[30,40,20]],p:[[30,40,20]],thumb:th([-.3,.75,.6],[-.1,0,.1]),roll:-20},
  O:{i:[[50,60,30]],m:[[50,60,30]],r:[[50,60,30]],p:[[50,60,30]],thumb:th([-.22,.97,.72],[-.1,0,.1])},
  E:{i:[[30,100,70]],m:[[30,100,70]],r:[[30,100,70]],p:[[30,100,70]],thumb:th([.15,.7,.3],[-.15,.1,0])},
  S:{...FIST,thumb:ACROSS},
  X:{...FIST,i:[[10,95,65]],thumb:th([-.05,.75,.5],[0,0,.1])},
  G:{...FIST,i:[UP],thumb:th([-.5,.95,.1]),roll:90},
  H:{...FIST,i:[UP],m:[UP,-3],thumb:th([.2,.7,.4],[0,0,.1]),roll:90},
  K:{...FIST,i:[UP,-6],m:[[35,0,0],8],thumb:th([-.1,1.3,.3],[0,0,.1])},
  R:{...FIST,i:[UP,8],m:[UP,-12],thumb:HOLD_RP},
  P:{...FIST,i:[UP,-6],m:[[35,0,0],8],thumb:th([-.1,1.3,.3],[0,0,.1]),roll:180,pitch:-25},
  Q:{...FIST,i:[UP],thumb:th([-.5,.95,.1]),roll:180,pitch:-25},
  T:{...FIST,thumb:th([-.16,.95,.3],[0,0,.1])},
  N:{...FIST,thumb:th([.1,.95,.3],[0,0,.1])},
  M:{...FIST,thumb:th([.32,.9,.3],[0,0,.1])},
};
let fails=0,total=0;const conf={};
for(const [L,pose] of Object.entries(POSES)){
  let ok=0,n=0;
  for(const left of [false,true])for(const roll of [-15,0,15])for(const pitch of [-15,0,15])for(let rep=0;rep<4;rep++){
    const f=C.analyze(hand(pose,{left,roll,pitch,noise:rep?0.004:0}));
    const hit=C.CHECKS[L](f),det=C.detect(f);n++;total++;
    if(hit&&det===L)ok++;else{fails++;const k=`${L}->${hit?'(hit,det '+det+')':det}`;conf[k]=(conf[k]||0)+1}
  }
  console.log(L.padEnd(2),`${ok}/${n}`);
}
console.log('confusions',conf);
console.log(`TOTAL ${total-fails}/${total}`);

// Motion
function trace(pts){return pts.map((q,i)=>({t:i*30,x:q[0],y:q[1]}))}
const z=[];for(let i=0;i<=10;i++)z.push([i*.08,0]);for(let i=1;i<=10;i++)z.push([.8-i*.08,i*.06]);for(let i=1;i<=10;i++)z.push([i*.08,.6]);
const j=[];for(let i=0;i<=12;i++)j.push([0,i*.06]);for(let i=1;i<=10;i++){const a=i/10*Math.PI;j.push([-.25+.25*Math.cos(a),.72+.25*Math.sin(a)])}
const still=Array.from({length:30},()=>[Math.random()*.02,Math.random()*.02]);
const horiz=[];for(let i=0;i<=20;i++)horiz.push([i*.05,0]);
console.log('Z zigzag',C.evalMotion('Z',trace(z)).done,'| Z still',C.evalMotion('Z',trace(still)).done,'| Z one swipe',C.evalMotion('Z',trace(horiz)).done);
console.log('J hook',C.evalMotion('J',trace(j)).done,'| J still',C.evalMotion('J',trace(still)).done,'| J swipe',C.evalMotion('J',trace(horiz)).done);

const motionOk=C.evalMotion('Z',trace(z)).done&&!C.evalMotion('Z',trace(still)).done&&!C.evalMotion('Z',trace(horiz)).done&&C.evalMotion('J',trace(j)).done&&!C.evalMotion('J',trace(still)).done&&!C.evalMotion('J',trace(horiz)).done;
if(fails||!motionOk){console.error('FAILED');process.exit(1)}else console.log('ALL TESTS PASSED');
