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

const hm=html.split('/* ===================== HAND-MODEL-START')[1].split('/* ===================== HAND-MODEL-END')[0];
const H=new Function(hm.slice(hm.indexOf('*/')+2)+';return{HAND_POSES,handPoints};')();
const D=Math.PI/180;
// Place a hand pose in front of a virtual camera: palm toward the camera,
// optionally a left hand (mirrored), tilted (roll/pitch) and with jitter.
function hand(pose,{left=false,roll=0,pitch=0,noise=0}={}){
  const P=H.handPoints(pose);
  const r=(roll+(pose.roll||0))*D,pt=(pitch+(pose.pitch||0))*D;
  return P.map(([X,Y,Z])=>{
    let x=left?X:-X,y=-Y,z=-Z;
    let y2=y*Math.cos(pt)-z*Math.sin(pt),z2=y*Math.sin(pt)+z*Math.cos(pt);y=y2;z=z2;
    let x2=x*Math.cos(r)-y*Math.sin(r);y2=x*Math.sin(r)+y*Math.cos(r);x=x2;y=y2;
    const j=()=>(Math.random()*2-1)*noise;
    return{x:.5+.2*x+j(),y:.55+.2*y+j(),z:.2*z+j()};
  });
}
// The same poses that draw each letter's picture in the app.
// J and Z are movement letters, checked separately below.
const POSES=Object.fromEntries(Object.entries(H.HAND_POSES).filter(([l])=>!'JZ'.includes(l)));
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
const startOk=['J','Z'].every(l=>C.CHECKS[l](C.analyze(hand(H.HAND_POSES[l]))));
console.log('J/Z starting handshapes',startOk);
if(fails||!motionOk||!startOk){console.error('FAILED');process.exit(1)}else console.log('ALL TESTS PASSED');
