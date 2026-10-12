// In-memory stand-in for the Firebase compat SDK, used ONLY by tests/ui.test.js to drive the real index.html in a browser.
// It does NOT evaluate security rules (those need the Firebase Emulator, see tests/rules.test.js).
(()=>{
 const F=window.__FAKE={docs:{},ver:{},listeners:[],user:null,authCbs:[],calls:[],beforeCommit:null,uid:0};
 class Ts{constructor(ms){this.ms=ms}toMillis(){return this.ms}get seconds(){return Math.floor(this.ms/1000)}}
 const SV={sv:1},DELV={del:1};
 const clone=o=>JSON.parse(JSON.stringify(o,(k,v)=>v instanceof Ts?{__ts:v.ms}:v),(k,v)=>v&&v.__ts!==undefined?new Ts(v.__ts):v);
 const resolve=(base,patch)=>{const o=Object.assign({},base);for(const k in patch){const v=patch[k];if(v===SV)o[k]=new Ts(Date.now());else if(v===DELV)delete o[k];else o[k]=v}return o};
 const bump=p=>{F.ver[p]=(F.ver[p]||0)+1};
 const notify=()=>setTimeout(()=>F.listeners.slice().forEach(l=>l()),0);
 const seg=p=>p.split('/');
 class Snap{constructor(p,d){this.id=seg(p).pop();this.exists=d!==undefined;this._d=d;this.ref=new DocRef(p)}data(){return this._d===undefined?undefined:clone(this._d)}}
 class DocRef{constructor(p){this.path=p;this.id=seg(p).pop()}
  collection(n){return new Query(this.path+'/'+n)}
  async get(){return new Snap(this.path,F.docs[this.path])}
  async set(d){F.calls.push(['set',this.path]);F.docs[this.path]=resolve({},d);bump(this.path);notify()}
  async update(d){F.calls.push(['update',this.path]);if(!F.docs[this.path])throw Object.assign(new Error('not-found'),{code:'not-found'});F.docs[this.path]=resolve(F.docs[this.path],d);bump(this.path);notify()}
  async delete(){delete F.docs[this.path];bump(this.path);notify()}}
 class Query{constructor(p,w=[],o=null,l=0){this.path=p;this.w=w;this.o=o;this.l=l}
  doc(id){return new DocRef(this.path+'/'+(id||('id'+(++F.uid)+Math.random().toString(36).slice(2,6))))}
  where(f,op,v){return new Query(this.path,[...this.w,[f,v]],this.o,this.l)}
  orderBy(f,d='asc'){return new Query(this.path,this.w,[f,d],this.l)}
  limit(n){return new Query(this.path,this.w,this.o,n)}
  async add(d){const r=this.doc();await r.set(d);return r}
  _run(){const pre=this.path+'/',n=seg(this.path).length+1;let rs=Object.keys(F.docs).filter(p=>p.startsWith(pre)&&seg(p).length===n).map(p=>new Snap(p,F.docs[p]));
   rs=rs.filter(s=>this.w.every(([f,v])=>s._d[f]===v));
   if(this.o){const [f,d]=this.o,k=s=>{const x=s._d[f];return x instanceof Ts?x.ms:x};rs.sort((a,b)=>(k(a)>k(b)?1:k(a)<k(b)?-1:0)*(d==='desc'?-1:1))}
   if(this.l)rs=rs.slice(0,this.l);return {docs:rs,size:rs.length,empty:!rs.length,forEach:fn=>rs.forEach(fn)}}
  async get(){return this._run()}
  onSnapshot(ok,err){const run=()=>ok(this._run());const l=run;F.listeners.push(l);setTimeout(run,0);return ()=>{F.listeners=F.listeners.filter(x=>x!==l)}}}
 const wr=(ops)=>{ops.forEach(([t,r,d])=>{F.calls.push([t,r.path]);if(t==='set')F.docs[r.path]=resolve({},d);else if(t==='update'){if(!F.docs[r.path])throw Object.assign(new Error('not-found'),{code:'not-found'});F.docs[r.path]=resolve(F.docs[r.path],d)}else delete F.docs[r.path];bump(r.path)});notify()};
 const fsInst={collection:p=>new Query(p),doc:p=>new DocRef(p),
  batch(){const ops=[];return {set:(r,d)=>ops.push(['set',r,d]),update:(r,d)=>ops.push(['update',r,d]),delete:r=>ops.push(['delete',r]),commit:async()=>wr(ops)}},
  async runTransaction(fn){for(let i=0;i<5;i++){const seen={},ops=[];const tx={async get(r){seen[r.path]=F.ver[r.path]||0;return new Snap(r.path,F.docs[r.path])},set:(r,d)=>ops.push(['set',r,d]),update:(r,d)=>ops.push(['update',r,d]),delete:r=>ops.push(['delete',r])};
    const out=await fn(tx);if(F.beforeCommit){const h=F.beforeCommit;F.beforeCommit=null;h()}
    if(Object.keys(seen).every(p=>(F.ver[p]||0)===seen[p])){wr(ops);return out}}throw new Error('aborted')}};
 const fsf=()=>fsInst;fsf.FieldValue={serverTimestamp:()=>SV,delete:()=>DELV};
 const mkUser=u=>u&&Object.assign({reload:async()=>{},getIdToken:async()=>'tok',sendEmailVerification:async()=>{},updatePassword:async()=>{}},u);
 const authInst={get currentUser(){return mkUser(F.user)},onAuthStateChanged(cb){F.authCbs.push(cb);setTimeout(()=>cb(mkUser(F.user)),0)},async signOut(){F.user=null;F.authCbs.forEach(c=>c(null))},
  async signInWithEmailAndPassword(e){const u=F.accounts&&F.accounts[e];if(!u)throw Object.assign(new Error('x'),{code:'auth/invalid-credential'});F.user=u;F.authCbs.forEach(c=>c(mkUser(u)));return {user:u}},
  async sendPasswordResetEmail(){F.calls.push(['reset'])}};
 // No storage() and no functions(): the app must not need them (Spark plan). Calling them would throw and fail the tests.
 window.firebase={initializeApp(){},auth:Object.assign(()=>authInst,{EmailAuthProvider:{credential:()=>({})}}),firestore:fsf};
 F.Ts=Ts;
})();
