// Tests for SignSense's on-device profiles (sign up / log in).
// Run with:  node tests/accounts.test.js   (or: npm test)
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const s=html.split('/* ===================== ACCOUNTS-START')[1].split('/* ===================== ACCOUNTS-END')[0];
const A=new Function(s.slice(s.indexOf('*/')+2)+';return{createAccounts,checkUsername,checkPassword};')();

// A stand-in for localStorage
function memoryStore(){const m={};return{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},raw:m}}

let fails=0;
function check(name,ok){console.log((ok?'ok  ':'FAIL')+'  '+name);if(!ok)fails++}

(async()=>{
  check('short usernames are refused',!!A.checkUsername('ab'));
  check('usernames with spaces or symbols are refused',!!A.checkUsername('my name')&&!!A.checkUsername('a@b.c'));
  check('a normal username is fine',A.checkUsername('Anish_7')==='');
  check('short passwords are refused',!!A.checkPassword('12345'));

  const store=memoryStore(),acc=A.createAccounts(store);
  check('no profiles at first',!acc.any());
  const up=await acc.signUp('Anish','secret123');
  check('sign up works',up.user==='Anish'&&acc.any());
  check('the password itself is never saved',!JSON.stringify(store.raw).includes('secret123'));
  check('the same name cannot sign up twice (any capitals)',!!(await acc.signUp('anish','another1')).error);
  check('log in with the right password',(await acc.logIn('Anish','secret123')).user==='Anish');
  check('log in ignores capitals in the username',(await acc.logIn('ANISH','secret123')).user==='Anish');
  check('log in with the wrong password fails',!!(await acc.logIn('Anish','secret124')).error);
  check('log in with an unknown name fails',!!(await acc.logIn('nobody','secret123')).error);
  check('signing up with a bad password is refused',!!(await acc.signUp('newkid','123')).error);
  await acc.signUp('Maya','password1');
  const u=JSON.parse(store.raw['signsense-users']);
  check('two people with the same-length password get different hashes',u.anish.hash!==u.maya.hash&&u.anish.salt!==u.maya.salt);
  check('a damaged saved list does not crash',!A.createAccounts({getItem:()=>'{not json',setItem(){}}).any());

  if(fails){console.error(`FAILED (${fails})`);process.exit(1)}else console.log('ALL ACCOUNT TESTS PASSED');
})();
