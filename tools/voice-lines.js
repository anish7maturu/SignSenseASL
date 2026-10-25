// Dumps every recording name and its text as JSON, straight from index.html.
const fs=require('fs');const html=fs.readFileSync(process.argv[2],'utf8');
const block=n=>{const s=html.split(`/* ===================== ${n}-START`)[1].split(`/* ===================== ${n}-END`)[0];return s.slice(s.indexOf('*/')+2)};
const letters=html.match(/const LETTERS=\{[\s\S]*?\n\};/)[0];
const T=new Function(letters+block('TEACHER')+';return{voiceLines,LETTERS};')();
console.log(JSON.stringify(T.voiceLines(L=>T.LETTERS[L].desc),null,1));
