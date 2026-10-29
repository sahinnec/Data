/* Backup & Restore (v1)  -  Settings > "Backup & Restore"
   Cloud auto backup  = backup file mailed into YOUR Gmail (label "DataShow-Backup", newest 15 kept) via Android.backupMail
   On device          = Downloads folder (Android.save)  /  restore with the file picker (Google Drive shows up there too)
   E-mail             = Android.mailFile (share sheet, pick Gmail)  /  restore from Gmail list or a downloaded attachment
   Saves: all localStorage + all IndexedDB (recent files, original PDF/Excel copies). Gmail password is NOT written into the file.
   Own settings: ds_bk_cfg. Ids/classes start with "bk". */
(function(){try{
const $=id=>document.getElementById(id);
const toast=m=>{try{window.gnToast?gnToast(m):alert(m)}catch(e){}};
const A=()=>window.Android||null;
const hasMail=()=>!!(A()&&A().backupMail);
const LSG=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
let C=Object.assign({user:'',pass:'',auto:'off',wifi:false,files:true,last:0,lastDay:'',err:''},LSG('ds_bk_cfg')||{});
const saveC=()=>{try{localStorage.setItem('ds_bk_cfg',JSON.stringify(C))}catch(e){}};
const gEmail=()=>{try{if(A()&&A().googleAuthStatus){const g=JSON.parse(A().googleAuthStatus()||'{}');return g.ok&&g.email?g.email:''}}catch(e){}return''};
const creds=()=>{const ge=gEmail();if(ge)return{u:ge,p:'',own:0,google:1};if(C.user&&C.pass)return{u:C.user,p:C.pass,own:1};const g=LSG('ds_gm_cfg')||{};return g.user&&g.pass?{u:g.user,p:g.pass,own:0}:null};
const p2=n=>String(n).padStart(2,'0');
const stamp=d=>{d=d||new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+'_'+p2(d.getHours())+p2(d.getMinutes())};
const day=d=>{d=d||new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const nice=t=>{if(!t)return'never';const d=new Date(t);return day(d).split('-').reverse().join('/')+' '+p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds())};
const mb=n=>(n/1048576).toFixed(n<1048576?2:1)+' MB';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- bytes <-> base64 ---------- */
function u8b64(u){let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function b64u8(b){const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
async function pipe(u8,Stream,fmt){const s=new Blob([u8]).stream().pipeThrough(new Stream(fmt));return new Uint8Array(await new Response(s).arrayBuffer())}
const gzip=async u=>window.CompressionStream?pipe(u,CompressionStream,'gzip'):u;
const gunzip=async u=>{if(u.length>2&&u[0]===0x1f&&u[1]===0x8b){if(!window.DecompressionStream)throw new Error('This phone cannot open compressed backups');return pipe(u,DecompressionStream,'gzip')}return u};

/* ---------- encode values (Blob / typed arrays / Date survive JSON) ---------- */
async function enc(v,skip){
 if(v===null||typeof v!=='object')return v;
 if(v instanceof Blob){if(skip)return null;return{__t:'blob',type:v.type,name:v.name||'',lm:v.lastModified||0,d:u8b64(new Uint8Array(await v.arrayBuffer()))}}
 if(v instanceof ArrayBuffer)return{__t:'ab',d:u8b64(new Uint8Array(v))};
 if(ArrayBuffer.isView(v))return{__t:'ta',n:v.constructor.name,d:u8b64(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))};
 if(v instanceof Date)return{__t:'date',d:v.getTime()};
 if(Array.isArray(v)){const o=[];for(const x of v)o.push(await enc(x,skip));return o}
 const o={};for(const k of Object.keys(v))o[k]=await enc(v[k],skip);return o}
function dec(v){
 if(v===null||typeof v!=='object')return v;
 if(Array.isArray(v))return v.map(dec);
 if(v.__t==='blob'){const u=b64u8(v.d);return v.name?new File([u],v.name,{type:v.type,lastModified:v.lm||Date.now()}):new Blob([u],{type:v.type})}
 if(v.__t==='ab')return b64u8(v.d).buffer;
 if(v.__t==='ta'){const u=b64u8(v.d),T=window[v.n]||Uint8Array;return new T(u.buffer,0,u.byteLength/(T.BYTES_PER_ELEMENT||1))}
 if(v.__t==='date')return new Date(v.d);
 const o={};for(const k of Object.keys(v))o[k]=dec(v[k]);return o}

/* ---------- IndexedDB dump / load ---------- */
const reqP=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const openDB=(n,ver,up)=>new Promise((res,rej)=>{const q=ver?indexedDB.open(n,ver):indexedDB.open(n);if(up)q.onupgradeneeded=()=>up(q.result);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);q.onblocked=()=>rej(new Error('Database busy'))});
async function dbNames(){let n=['dsRecent','ShareReader_OriginalFiles_v1'];try{if(indexedDB.databases){(await indexedDB.databases()).forEach(d=>{if(d.name&&!n.includes(d.name))n.push(d.name)})}}catch(e){}return n}
async function dumpDB(name,skipBlobs){
 let db;try{db=await openDB(name)}catch(e){return null}
 try{
  const names=[...db.objectStoreNames];if(!names.length)return null;
  const out={ver:db.version,stores:{}};
  for(const sn of names){
   const tx=db.transaction(sn,'readonly'),st=tx.objectStore(sn),recs=[];
   await new Promise((res,rej)=>{const cur=st.openCursor();cur.onsuccess=async()=>{const c=cur.result;if(!c){res();return}recs.push([c.key,c.value]);c.continue()};cur.onerror=()=>rej(cur.error)});
   const meta={kp:st.keyPath,ai:st.autoIncrement,recs:[]};
   for(const [k,v] of recs)meta.recs.push({k:st.keyPath?null:await enc(k,0),v:await enc(v,skipBlobs)});
   out.stores[sn]=meta}
  return out}finally{db.close()}}
async function loadDB(name,d){
 let db=await openDB(name);
 const need=Object.keys(d.stores).filter(s=>!db.objectStoreNames.contains(s));
 if(need.length){const v=db.version+1;db.close();db=await openDB(name,v,x=>{need.forEach(s=>x.createObjectStore(s,d.stores[s].kp?{keyPath:d.stores[s].kp}:{autoIncrement:!!d.stores[s].ai}))})}
 try{
  for(const sn of Object.keys(d.stores)){
   const m=d.stores[sn],tx=db.transaction(sn,'readwrite'),st=tx.objectStore(sn);
   const done=new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('abort'))});
   st.clear();
   for(const r of m.recs){const v=dec(r.v);if(st.keyPath)st.put(v);else st.put(v,dec(r.k))}
   await done}}finally{db.close()}}

/* ---------- snapshot / restore ---------- */
const KEEP_LOCAL=['ds_bk_cfg'];
function lsDump(){const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(KEEP_LOCAL.includes(k))continue;let v=localStorage.getItem(k);
  if(k==='ds_gm_cfg'){try{const g=JSON.parse(v);g.pass='';g.pdfpw='';v=JSON.stringify(g)}catch(e){}}
  o[k]=v}return o}
async function snapshot(withFiles){
 const idb={};let n=0;
 for(const nm of await dbNames()){
  if(!withFiles&&nm==='ShareReader_OriginalFiles_v1')continue;
  const d=await dumpDB(nm,!withFiles);if(d){idb[nm]=d;Object.values(d.stores).forEach(s=>n+=s.recs.length)}}
 const ls=lsDump();
 const pack={app:'DataShow',v:1,ts:Date.now(),files:!!withFiles,ls,idb};
 const raw=new TextEncoder().encode(JSON.stringify(pack));
 return{bytes:await gzip(raw),empty:Object.keys(ls).length===0&&n===0}}
async function parse(u8){
 const raw=await gunzip(u8);let p;
 try{p=JSON.parse(new TextDecoder('utf-8').decode(raw))}catch(e){throw new Error('This is not a Data Show backup file')}
 if(!p||p.app!=='DataShow'||!p.ls)throw new Error('This is not a Data Show backup file');return p}
async function applyBackup(p){
 const mine={};KEEP_LOCAL.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)mine[k]=v});
 const oldGm=LSG('ds_gm_cfg')||{};
 localStorage.clear();
 for(const k of Object.keys(p.ls)){try{localStorage.setItem(k,p.ls[k])}catch(e){}}
 for(const k of Object.keys(mine))localStorage.setItem(k,mine[k]);
 try{const g=JSON.parse(localStorage.getItem('ds_gm_cfg')||'null');if(g){if(!g.pass)g.pass=oldGm.pass||'';if(!g.pdfpw)g.pdfpw=oldGm.pdfpw||'';if(!g.user)g.user=oldGm.user||'';localStorage.setItem('ds_gm_cfg',JSON.stringify(g))}}catch(e){}
 for(const nm of Object.keys(p.idb||{}))await loadDB(nm,p.idb[nm]);
 // a backup without original files must not wipe the files already on this phone: they were kept (DB skipped)
}
function reload(){try{if(A()&&A().reload){A().reload();return}}catch(e){}location.reload()}
function confirmRestore(info,run){
 if(!confirm('Restore '+info+'?\n\nAll data in this app will be REPLACED by the backup. This cannot be undone.\n\nOnly restore backups you made yourself.'))return;
 busyOn('Restoring…');
 run().then(()=>{toast('Restored. Reloading…');setTimeout(reload,700)}).catch(e=>{busyOff();toast('Restore failed: '+(e&&e.message||e))})}

/* ---------- native bridge (Gmail) ---------- */
const cbs={};let seq=0;
window.__bkRes=(id,ok,p)=>{const c=cbs[id];delete cbs[id];if(c)c(ok,p)};
function mail(op,arg,b64){return new Promise((res,rej)=>{
 const cr=creds();if(!cr)return rej(new Error('Set the Gmail address and App password first'));
 if(!hasMail())return rej(new Error('Cloud backup needs the new APK (this one has no backup support)'));
 const id='bk'+(++seq),tm=setTimeout(()=>{delete cbs[id];rej(new Error('Gmail did not answer (time out)'))},180000);
 cbs[id]=(ok,p)=>{clearTimeout(tm);if(!ok)return rej(new Error(new TextDecoder('utf-8').decode(b64u8(p))));res(p)};
 try{A().backupMail(op,cr.u,cr.p,arg||'',b64||'',id)}catch(e){clearTimeout(tm);delete cbs[id];rej(e)}})}
const mailJson=async(op,arg,b)=>JSON.parse(new TextDecoder('utf-8').decode(b64u8(await mail(op,arg,b))));

/* ---------- actions ---------- */
const fname=()=>'DataShow-backup-'+stamp()+'.dsbackup';
const MAXMAIL=18*1024*1024;
async function cloudBackup(silent){
 let s=await snapshot(C.files);
 if(s.empty&&silent)return'skip';
 if(s.bytes.length>MAXMAIL&&C.files){s=await snapshot(false);if(!silent)toast('Too big for Gmail: original PDF/Excel copies were left out')}
 if(s.bytes.length>MAXMAIL)throw new Error('Backup is too big for Gmail ('+mb(s.bytes.length)+')');
 await mail('put',fname(),u8b64(s.bytes));
 C.last=Date.now();C.lastDay=day();C.err='';saveC();return'ok'}
async function deviceBackup(){
 const s=await snapshot(true),n=fname();
 if(A()&&A().save){A().save(n,'application/octet-stream',u8b64(s.bytes));return}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s.bytes]));a.download=n;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
async function emailBackup(){
 const s=await snapshot(true);
 if(s.bytes.length>MAXMAIL){if(!confirm('With original files the backup is '+mb(s.bytes.length)+' (too big for most mail). Send it WITHOUT the original PDF/Excel copies?'))return;const t=await snapshot(false);s.bytes=t.bytes}
 const cr=creds(),n=fname();
 if(A()&&A().mailFile)A().mailFile(n,'application/octet-stream',u8b64(s.bytes),cr?cr.u:'','Data Show backup '+stamp());
 else if(A()&&A().shareFile)A().shareFile(n,'application/octet-stream',u8b64(s.bytes));
 else deviceBackup()}
async function driveShare(){
 const s=await snapshot(true),n=fname();
 if(A()&&A().shareFile){A().shareFile(n,'application/octet-stream',u8b64(s.bytes));toast('Choose Google Drive in the list')}else deviceBackup()}
async function resetAll(){
 if(!confirm('Delete ALL data in this app (files, cards, tables, notes)?\n\nMake a backup first if you may need it.'))return;
 if(!confirm('Really delete everything? This cannot be undone.'))return;
 busyOn('Resetting…');
 try{const keep={};KEEP_LOCAL.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)keep[k]=v});const g=LSG('ds_gm_cfg');
  localStorage.clear();Object.keys(keep).forEach(k=>localStorage.setItem(k,keep[k]));if(g)localStorage.setItem('ds_gm_cfg',JSON.stringify({user:g.user||'',pass:g.pass||''}));
  for(const nm of await dbNames()){await new Promise(r=>{const q=indexedDB.deleteDatabase(nm);q.onsuccess=q.onerror=q.onblocked=()=>r()})}
  toast('All data deleted');setTimeout(reload,600)}catch(e){busyOff();toast('Reset failed: '+e.message)}}

/* ---------- UI ---------- */
const st=document.createElement('style');st.textContent=
'#bkS{position:fixed;inset:0;z-index:9992;background:var(--bg,#f4f6fb);color:var(--tx,#111);display:none;flex-direction:column;padding-top:env(safe-area-inset-top)}'+
'#bkS .tlh button{border:1px solid var(--bd,#ccc);background:var(--card,#fff);color:inherit;border-radius:10px;padding:8px 11px;font-size:.85rem}'+
'#bkB2{flex:1;overflow:auto;padding:0 0 30px}#bkB2 h4{margin:0;padding:14px 16px 6px;font-size:.78rem;color:var(--mut,#778);font-weight:600;text-transform:uppercase;letter-spacing:.03em}'+
'.bkc{background:var(--card,#fff);border-top:1px solid var(--bd,#e3e3e3);border-bottom:1px solid var(--bd,#e3e3e3)}'+
'.bkr{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;text-align:left;border:0;border-bottom:1px solid var(--bd,#e8e8e8);background:transparent;color:inherit;border-radius:0;padding:14px 16px;font-size:.92rem}.bkr:last-child{border-bottom:0}.bkr b{flex:1;font-weight:500}.bkr small{color:var(--mut,#778)}'+
'.bkn{padding:10px 16px;font-size:.78rem;color:var(--mut,#778);line-height:1.45}.bkn b{color:var(--tx,#111)}'+
'.bkf{padding:8px 16px;display:flex;flex-direction:column;gap:8px}.bkf input[type=text],.bkf input[type=email],.bkf input[type=password]{border:1px solid var(--bd,#ccc);border-radius:9px;background:var(--bg,#fff);color:var(--tx,#111);padding:10px;font:inherit;font-size:.88rem}'+
'.bkb{display:flex;gap:10px;padding:12px 16px}.bkb button{flex:1;padding:12px;border-radius:10px;font-size:.95rem;border:1px solid #e8504a;background:#e8504a;color:#fff}.bkb button.alt{background:transparent;color:#e8504a}'+
'.bksw{position:relative;width:46px;height:26px;flex:none}.bksw input{opacity:0;position:absolute;inset:0;margin:0}.bksw i{position:absolute;inset:0;border-radius:13px;background:#bbb;transition:.2s}.bksw i:after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}.bksw input:checked+i{background:#e8504a}.bksw input:checked+i:after{left:23px}'+
'#bkL{position:fixed;inset:0;z-index:9994;background:rgba(0,0,0,.45);display:none;align-items:flex-end}#bkL>div{background:var(--card,#fff);color:var(--tx,#111);width:100%;max-height:75%;overflow:auto;border-radius:16px 16px 0 0;padding:6px 0 18px}'+
'#bkW{position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;color:#fff;font-size:.95rem}#bkW div{background:#222;border-radius:12px;padding:16px 22px}'+
'#bkOpen{margin:0 0 6px}';
document.head.append(st);

const root=document.createElement('div');root.id='bkS';
root.innerHTML='<div class="tlh"><button id="bkB">←</button><b>Backup &amp; Restore</b></div><div id="bkB2"></div>';
const sheet=document.createElement('div');sheet.id='bkL';sheet.innerHTML='<div id="bkLi"></div>';
const wait=document.createElement('div');wait.id='bkW';wait.innerHTML='<div id="bkWt">Please wait…</div>';
const pickF=document.createElement('input');pickF.type='file';pickF.hidden=true;pickF.accept='*/*';
document.body.append(root,sheet,wait,pickF);
const busyOn=t=>{$('bkWt').textContent=t||'Please wait…';wait.style.display='flex'},busyOff=()=>{wait.style.display='none'};
sheet.onclick=e=>{if(e.target===sheet)sheet.style.display='none'};

function build(){
 const cr=creds(),B=$('bkB2');
 const days=C.auto==='weekly'?'weekly':'daily';
 B.innerHTML=
 '<h4>Cloud backup (your Gmail)</h4><div class="bkc">'+
 '<div class="bkn">Backup file is saved in <b>your own Gmail</b> under the label <b>DataShow-Backup</b>. Up to <b>15</b> files are kept; the oldest is deleted as new ones come.<br>Last backup: <b>'+nice(C.last)+'</b>'+(C.err?'<br><span style="color:#d33">Last error: '+esc(C.err)+'</span>':'')+'</div>'+
 (cr&&cr.google?'<div class="bkn">Gmail: <b>'+esc(cr.u)+'</b> (Google sign-in, no password saved)</div>':
  cr&&!C.showAcc?'<div class="bkn">Gmail: <b>'+esc(cr.u)+'</b>'+(cr.own?'':' (same as Table page)')+' · <a href="#" id="bkAcc" style="color:var(--ac,#2563eb)">change</a></div>'
  :'<div class="bkf">'+(A()&&A().googleSignIn?'<button id="bkGo">Sign in with Google (recommended)</button><div class="bkn" style="padding:0">or use an App password:</div>':'')+'<input type="email" id="bkU" placeholder="Gmail address" value="'+esc(C.user||(creds()||{}).u||'')+'" autocomplete="off"><input type="password" id="bkP" placeholder="Gmail App password (16 letters)" autocomplete="off"><button id="bkSv">Save &amp; test</button><div class="bkn" style="padding:0">Use a Google <b>App password</b> (Google Account &gt; Security &gt; 2-Step Verification &gt; App passwords), not your normal password. Same login as Table &gt; Import from Gmail.</div></div>')+
 '<label class="bkr"><b>Automatic backup</b><span class="bksw"><input type="checkbox" id="bkAuto"'+(C.auto!=='off'?' checked':'')+'><i></i></span></label>'+
 (C.auto!=='off'?'<label class="bkr"><input type="radio" name="bkF" value="daily"'+(days==='daily'?' checked':'')+'> <b>Daily</b></label><label class="bkr"><input type="radio" name="bkF" value="weekly"'+(days==='weekly'?' checked':'')+'> <b>Weekly</b></label>'+
  '<label class="bkr"><input type="checkbox" id="bkWifi"'+(C.wifi?' checked':'')+'> <b>Automatic backup only works on Wi-Fi</b></label>':'')+
 '<label class="bkr"><input type="checkbox" id="bkFiles"'+(C.files?' checked':'')+'> <b>Include original PDF / Excel copies</b></label>'+
 '<div class="bkn">Auto backup runs when you open the app for the first time that day (week). Image files from the phone gallery are not included.</div>'+
 '<div class="bkb"><button class="alt" id="bkRs">Restore</button><button id="bkBk">Backup</button></div></div>'+
 '<h4>This phone</h4><div class="bkc">'+
 '<button class="bkr" id="bkDev"><b>Backup to device</b><small>Downloads</small></button>'+
 '<button class="bkr" id="bkDevR"><b>Restore from device</b><small>pick file</small></button></div>'+
 '<h4>Google Drive (manual)</h4><div class="bkc">'+
 '<button class="bkr" id="bkDr"><b>Save backup to Google Drive</b></button>'+
 '<button class="bkr" id="bkDrR"><b>Restore from Google Drive</b><small>pick file</small></button>'+
 '<div class="bkn">Drive appears in the share list and in the file picker. The automatic cloud copy uses Gmail so no Google Cloud setup is needed.</div></div>'+
 '<h4>E-mail</h4><div class="bkc">'+
 '<button class="bkr" id="bkMl"><b>Export backup file to e-mail</b></button>'+
 '<button class="bkr" id="bkMlR"><b>Import backup from e-mail</b><small>Gmail list</small></button>'+
 '<button class="bkr" id="bkMlF"><b>Import downloaded attachment</b><small>pick file</small></button></div>'+
 '<h4>Reset</h4><div class="bkc"><button class="bkr" id="bkRst"><b style="color:#d33">Reset all app data</b></button></div>'+
 '<div class="bkn">The Gmail password is never written into a backup file. After restoring on a new phone, enter the App password once.</div>';
 const on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
 on('bkAcc',e=>{e.preventDefault();C.showAcc=1;build()});
 on('bkGo',()=>{try{A().googleSignIn('bk'+Date.now());toast('Opening Google…')}catch(e){toast('Google sign-in error: '+e.message)}});
 on('bkSv',async()=>{const u=$('bkU').value.trim(),p=$('bkP').value.replace(/\s+/g,'');if(!u||!p)return toast('Enter address and App password');
  C.user=u;C.pass=p;C.showAcc=0;saveC();busyOn('Testing Gmail…');try{await mailJson('list');toast('Gmail connected')}catch(e){C.pass='';saveC();C.showAcc=1;toast(e.message)}busyOff();build()});
 const a=$('bkAuto');if(a)a.onchange=()=>{C.auto=a.checked?'daily':'off';saveC();build()};
 document.querySelectorAll('input[name=bkF]').forEach(r=>r.onchange=()=>{C.auto=r.value;saveC()});
 const w=$('bkWifi');if(w)w.onchange=()=>{C.wifi=w.checked;saveC()};
 const f=$('bkFiles');if(f)f.onchange=()=>{C.files=f.checked;saveC()};
 on('bkBk',async()=>{if(!creds())return toast('Set the Gmail address and App password first');busyOn('Uploading backup to Gmail…');
  try{await cloudBackup(false);toast('Backup saved to Gmail')}catch(e){C.err=e.message;saveC();toast('Backup failed: '+e.message)}busyOff();build()});
 on('bkRs',showList);on('bkMlR',showList);
 on('bkDev',async()=>{busyOn('Making backup…');try{await deviceBackup()}catch(e){toast('Failed: '+e.message)}busyOff()});
 on('bkDevR',()=>openPick());on('bkDrR',()=>openPick());on('bkMlF',()=>openPick());
 on('bkDr',async()=>{busyOn('Making backup…');try{await driveShare()}catch(e){toast('Failed: '+e.message)}busyOff()});
 on('bkMl',async()=>{busyOn('Making backup…');try{await emailBackup()}catch(e){toast('Failed: '+e.message)}busyOff()});
 on('bkRst',resetAll)}

function openPick(){pickF.value='';pickF.click()}
pickF.onchange=async()=>{const f=pickF.files&&pickF.files[0];if(!f)return;busyOn('Reading backup…');
 try{const p=await parse(new Uint8Array(await f.arrayBuffer()));busyOff();
  confirmRestore('the backup from '+nice(p.ts)+' ('+f.name+')',()=>applyBackup(p))}catch(e){busyOff();toast(e.message)}};

async function showList(){
 if(!creds())return toast('Set the Gmail address and App password first');
 busyOn('Looking in Gmail…');let L;
 try{L=await mailJson('list')}catch(e){busyOff();return toast(e.message)}busyOff();
 const box=$('bkLi');
 box.innerHTML='<h4 style="margin:0;padding:12px 16px 4px;font-size:.9rem">Choose a backup to restore</h4>'+
  (L.length?L.map((x,i)=>'<button class="bkr" data-i="'+i+'"><b>'+nice(x.date)+'</b><small>'+mb(x.size||0)+'</small></button>').join(''):'<div class="bkn">No backup found in Gmail yet. Tap Backup first.</div>');
 box.querySelectorAll('[data-i]').forEach(b=>b.onclick=async()=>{const x=L[+b.dataset.i];sheet.style.display='none';busyOn('Downloading backup…');
  let p;try{p=await parse(b64u8(await mail('get',String(x.uid))))}catch(e){busyOff();return toast(e.message)}busyOff();
  confirmRestore('the Gmail backup from '+nice(x.date),()=>applyBackup(p))});
 sheet.style.display='flex'}

/* open from Settings */
const stU=$('stU');
if(stU){const b=document.createElement('button');b.type='button';b.id='bkOpen';b.textContent='Backup & Restore';
 b.style.cssText='display:block;margin:10px 0 4px;border:0;background:#e8504a;color:#fff;border-radius:10px;padding:10px 16px;font-size:.9rem';
 stU.append(b);b.onclick=()=>{C.showAcc=0;build();root.style.display='flex'}}
$('bkB').onclick=()=>{root.style.display='none'};
window.addEventListener('focus',()=>{if(root.style.display==='flex')setTimeout(build,400)});

/* ---------- automatic backup: first open of the day / week ---------- */
async function autoRun(){
 try{
  if(C.auto==='off'||!creds()||!hasMail())return;
  const due=C.auto==='weekly'?(Date.now()-(C.last||0)>=7*864e5):(C.lastDay!==day());
  if(!due)return;
  if(C.wifi&&A().isWifi&&!A().isWifi())return;
  const r=await cloudBackup(true);
  if(r==='ok')toast('Auto backup saved to Gmail')}
 catch(e){C.err=e&&e.message||String(e);saveC();toast('Auto backup failed: '+C.err)}}
setTimeout(autoRun,6000);
}catch(e){try{console.error('backup.js',e)}catch(_){}}})();
