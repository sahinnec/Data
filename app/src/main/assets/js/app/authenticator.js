/* Authentication (v1)  -  "+" menu > Authentication
   An authenticator like Google Authenticator: scan the QR code a website shows when you turn on
   2-step verification, then read the 6-digit code that changes every 30 seconds.
   Secrets live ONLY in the Android app (AuthStore.java, encrypted with the Android Keystore).
   This file only receives: issuer, account name, current code, seconds left.  Ids/classes start with "au". */
(function(){try{
const $=id=>document.getElementById(id);
const A=()=>window.Android||null;
const has=()=>!!(A()&&A().authList);
const toast=m=>{try{window.gnToast?gnToast(m):alert(m)}catch(e){}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=(fn,...a)=>{try{return JSON.parse(A()[fn](...a)||'{}')}catch(e){return{ok:false,error:String(e&&e.message||e)}}};
const fmt=c=>c.length>=8?c.slice(0,4)+' '+c.slice(4):c.slice(0,3)+' '+c.slice(3);
const CIRC=100.53;

/* ---------- styles + skeleton ---------- */
const st=document.createElement('style');st.textContent=
'#auS{position:fixed;inset:0;z-index:9990;background:var(--bg,#f4f6fb);color:var(--tx,#111);display:none;flex-direction:column;padding-top:env(safe-area-inset-top)}'+
'#auS .tlh button{border:1px solid var(--bd,#ccc);background:var(--card,#fff);color:inherit;border-radius:10px;padding:8px 11px;font-size:.85rem}'+
'#auS .tlh #auPlus{width:40px;height:40px;border-radius:50%;border:0;background:var(--ac,#2563eb);color:#fff;font-size:1.5rem;line-height:1;padding:0}'+
'#auL{flex:1;overflow:auto;padding:10px 12px 30px}'+
'.auc{display:flex;align-items:center;gap:10px;background:var(--card,#fff);border:1px solid var(--bd,#e3e3e3);border-radius:14px;padding:12px 8px 12px 14px;margin-bottom:10px;cursor:pointer;-webkit-tap-highlight-color:transparent}'+
'.auc .aut{flex:1;min-width:0}.auc .aut b{display:block;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.auc .aut small{display:block;color:var(--mut,#778);font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}'+
'.auc .aucode{display:block;font-size:1.9rem;font-weight:600;letter-spacing:.06em;color:var(--ac,#2563eb);font-variant-numeric:tabular-nums;margin-top:4px}'+
'.auc.low .aucode{color:#e0392d}'+
'.auc .aur{width:34px;height:34px;flex:none;transform:rotate(-90deg)}.auc .aur circle{fill:none;stroke-width:3.5}.auc .aur .bg{stroke:var(--bd,#e3e3e3)}.auc .aur .fg{stroke:var(--ac,#2563eb);stroke-linecap:round;stroke-dasharray:'+CIRC+';transition:stroke-dashoffset .9s linear}.auc.low .aur .fg{stroke:#e0392d}'+
'.auc .aum{border:0;background:transparent;color:var(--mut,#778);font-size:1.3rem;padding:6px 10px;border-radius:8px}'+
'.aue{text-align:center;color:var(--mut,#778);padding:40px 22px;line-height:1.5;font-size:.9rem}.aue i{display:block;font-style:normal;font-size:2.6rem;margin-bottom:6px}.aue button{margin-top:14px;padding:12px 20px;border-radius:12px;font-size:.95rem}'+
'.aun{color:var(--mut,#778);font-size:.75rem;line-height:1.45;padding:6px 6px 0}'+
'#auSh{position:fixed;inset:0;z-index:9993;background:rgba(0,0,0,.45);display:none;align-items:flex-end}#auSh>div{background:var(--card,#fff);color:var(--tx,#111);width:100%;border-radius:16px 16px 0 0;padding:6px 0 calc(14px + env(safe-area-inset-bottom))}'+
'#auSh .aus{display:block;width:100%;text-align:left;border:0;background:transparent;color:inherit;border-radius:0;padding:15px 18px;font-size:.95rem;border-bottom:1px solid var(--bd,#e8e8e8)}#auSh .aus:last-child{border-bottom:0}#auSh h5{margin:0;padding:12px 18px 4px;font-size:.8rem;color:var(--mut,#778);font-weight:500}'+
'#auF{position:fixed;inset:0;z-index:9994;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;padding:18px}#auF>div{background:var(--card,#fff);color:var(--tx,#111);border-radius:16px;padding:16px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:10px}#auF h4{margin:0 0 2px;font-size:1rem}'+
'#auF input{border:1px solid var(--bd,#ccc);border-radius:10px;background:var(--bg,#fff);color:var(--tx,#111);padding:11px;font:inherit;font-size:.9rem}#auF .aub{display:flex;gap:10px;justify-content:flex-end;margin-top:4px}#auF .aub button{padding:10px 16px;border-radius:10px}'+
'#auCam{position:fixed;inset:0;z-index:9996;background:#000;display:none;flex-direction:column;color:#fff}#auCam video{flex:1;min-height:0;width:100%;object-fit:cover}'+
'#auCam .auq{position:absolute;left:50%;top:42%;width:62vmin;height:62vmin;transform:translate(-50%,-50%);border:3px solid rgba(255,255,255,.9);border-radius:18px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45);pointer-events:none}'+
'#auCam .aut2{position:absolute;left:0;right:0;top:calc(14px + env(safe-area-inset-top));text-align:center;font-size:.9rem;padding:0 20px;text-shadow:0 1px 3px #000}'+
'#auCam .aub2{display:flex;gap:10px;padding:14px 16px calc(14px + env(safe-area-inset-bottom));background:#000}#auCam .aub2 button{flex:1;padding:13px;border-radius:12px;border:1px solid #666;background:#222;color:#fff;font-size:.95rem}';
document.head.append(st);

const root=document.createElement('div');root.id='auS';
root.innerHTML='<div class="tlh"><button id="auB" type="button">←</button><b>Authentication</b><button id="auLk" type="button" aria-label="Lock">🔓</button><button id="auPlus" type="button" aria-label="Add account">+</button></div><div id="auL"></div>';
const sheet=document.createElement('div');sheet.id='auSh';sheet.innerHTML='<div id="auShi"></div>';
const form=document.createElement('div');form.id='auF';form.innerHTML='<div><h4 id="auFt"></h4><input id="auFi" type="text" placeholder="Service (e.g. Google, Facebook)" maxlength="60" autocomplete="off"><input id="auFn" type="text" placeholder="Account (e.g. name@gmail.com)" maxlength="80" autocomplete="off" autocapitalize="off"><input id="auFk" type="text" placeholder="Setup key (letters and numbers)" autocomplete="off" autocapitalize="characters" spellcheck="false"><div class="aub"><button id="auFx" type="button" class="alt">Cancel</button><button id="auFo" type="button">Save</button></div></div>';
const camEl=document.createElement('div');camEl.id='auCam';
camEl.innerHTML='<video id="auV" playsinline muted></video><div class="auq"></div><div class="aut2">Point the camera at the QR code shown by the website</div><div class="aub2"><button id="auCx" type="button">Cancel</button><button id="auCg" type="button">Choose QR image</button></div>';
const pick=document.createElement('input');pick.type='file';pick.accept='image/*';pick.hidden=true;
document.body.append(root,sheet,form,camEl,pick);
const L=$('auL');
sheet.onclick=e=>{if(e.target===sheet)sheet.style.display='none'};

/* ---------- list ---------- */
let isOpen=false,items=[],last='',timer=0,histPushed=false;
function card(i){
 return '<div class="auc" data-id="'+esc(i.id)+'"><div class="aut"><b>'+esc(i.issuer||i.name)+'</b><small>'+(i.issuer?esc(i.name):'')+'</small><span class="aucode" data-c>'+esc(fmt(i.code))+'</span></div>'+
 '<svg class="aur" viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="16"/><circle class="fg" cx="18" cy="18" r="16"/></svg>'+
 '<button class="aum" type="button" data-m aria-label="More">⋮</button></div>'}
function build(){
 if(!items.length){L.innerHTML='<div class="aue"><i>🔐</i><b>No accounts yet</b><br>Turn on 2-step verification on a website (choose “Authenticator app”), then tap <b>+</b> and scan the QR code it shows.<br><button id="auScan0" type="button">Scan QR code</button></div>';const b=$('auScan0');if(b)b.onclick=startCam;return}
 L.innerHTML=items.map(card).join('')+'<div class="aun">Secret keys are encrypted in the phone’s secure storage. They are never shown, never saved in a backup and never leave this phone. Keep each website’s recovery codes safe: if you lose this phone you need them to sign in.</div>'}
function update(){
 items.forEach(i=>{
  const e=[...L.querySelectorAll('.auc')].find(x=>x.dataset.id===i.id);if(!e)return;
  const c=e.querySelector('[data-c]');if(c&&c.textContent!==fmt(i.code))c.textContent=fmt(i.code);
  const fg=e.querySelector('.fg');if(fg)fg.style.strokeDashoffset=String(CIRC*(1-i.remain/i.period));
  e.classList.toggle('low',i.remain<=5)})}
function tick(){
 if(!isOpen)return;
 const r=J('authList');
 if(r.locked){items=[];if(last!=='LOCKED'){last='LOCKED';L.innerHTML='<div class="aue"><i>🔒</i><b>Locked</b><br>Use your phone PIN, pattern or fingerprint to see the codes.<br><button id="auUn" type="button">Unlock</button></div>';const b=$('auUn');if(b)b.onclick=()=>{try{A().authUnlock()}catch(e){}}}return}
 if(!r.ok){L.innerHTML='<div class="aue"><i>⚠️</i>'+esc(r.error||'Could not read accounts')+'</div>';items=[];last='';return}
 items=r.items||[];
 const sig=items.map(i=>i.id+'|'+i.issuer+'|'+i.name).join('~');
 if(sig!==last){last=sig;build()}
 update()}

L.onclick=e=>{
 const card=e.target.closest('.auc');if(!card)return;
 const id=card.dataset.id,it=items.find(x=>x.id===id);if(!it)return;
 if(e.target.closest('[data-m]')){openMenu(it);return}
 copyText(it.code).then(()=>toast('Code copied'))};
function copyText(t){
 try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t).catch(()=>legacy(t))}catch(e){}
 return legacy(t)}
function legacy(t){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.append(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove();return Promise.resolve()}

/* ---------- menus ---------- */
function openMenu(it){
 const box=$('auShi');
 box.innerHTML='<h5>'+esc(it.issuer||it.name)+'</h5><button class="aus" data-a="ren" type="button">Rename</button><button class="aus" data-a="del" type="button" style="color:#d33">Remove</button><button class="aus" data-a="x" type="button">Cancel</button>';
 box.onclick=e=>{const a=e.target.dataset.a;if(!a)return;sheet.style.display='none';
  if(a==='ren')openForm('ren',it);
  if(a==='del'){if(confirm('Remove “'+(it.issuer||it.name)+'”?\n\nYou may be locked out of that account if you have no other way to sign in (recovery codes, another device).')){const r=J('authDelete',it.id);if(r.ok){toast('Removed');tick()}else toast(r.error||'Could not remove')}}};
 sheet.style.display='flex'}
function openAdd(){
 const box=$('auShi');
 box.innerHTML='<h5>Add account</h5><button class="aus" data-a="scan" type="button">📷  Scan QR code</button><button class="aus" data-a="img" type="button">🖼  Choose QR image from gallery</button><button class="aus" data-a="key" type="button">⌨️  Enter setup key</button><button class="aus" data-a="x" type="button">Cancel</button>';
 box.onclick=e=>{const a=e.target.dataset.a;if(!a)return;sheet.style.display='none';
  if(a==='scan')startCam();if(a==='img')pickImage();if(a==='key')openForm('add')};
 sheet.style.display='flex'}

let formMode='add',formItem=null;
function openForm(mode,it){
 formMode=mode;formItem=it||null;
 $('auFt').textContent=mode==='add'?'Enter setup key':'Rename account';
 $('auFi').value=it?it.issuer:'';$('auFn').value=it?it.name:'';$('auFk').value='';
 $('auFk').style.display=mode==='add'?'':'none';
 form.style.display='flex';setTimeout(()=>$('auFi').focus(),50)}
$('auFx').onclick=()=>{form.style.display='none';$('auFk').value=''};
$('auFo').onclick=()=>{
 const is=$('auFi').value,nm=$('auFn').value;
 const r=formMode==='add'?J('authAddManual',is,nm,$('auFk').value):J('authRename',formItem.id,is,nm);
 if(r.ok){form.style.display='none';$('auFk').value='';toast(formMode==='add'?'Account added':'Renamed');tick()}else toast(r.error||'Could not save')};

/* ---------- QR scanning ---------- */
let cam=null,bd=null,cv=null;
function loadQr(){
 if(window.DSQR)return Promise.resolve(true);
 return new Promise(res=>{const s=document.createElement('script');s.src='libs/qrdec.js';s.onload=()=>res(!!window.DSQR);s.onerror=()=>res(false);document.head.append(s)})}
function initBd(){try{if(!bd&&'BarcodeDetector' in window)bd=new BarcodeDetector({formats:['qr_code']})}catch(e){bd=null}}
async function decodeCanvas(c){
 if(bd){try{const r=await bd.detect(c);if(r&&r.length&&r[0].rawValue)return r[0].rawValue}catch(e){bd=null}}
 if(window.DSQR){
  const w=c.width,h=c.height,d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,g=new Uint8ClampedArray(w*h);
  for(let i=0,j=0;j<g.length;i+=4,j++)g[j]=(d[i]*77+d[i+1]*150+d[i+2]*29)>>8;
  return window.DSQR.decodeGray(g,w,h)}
 return null}
function handleText(t,fromImage){
 t=String(t||'').trim();
 if(cam){if(Date.now()<cam.mute)return false;cam.mute=Date.now()+2500}
 if(/^otpauth:\/\//i.test(t)){
  const r=J('authAdd',t);
  if(r.ok){closeCam();toast('Account added');tick();return true}
  toast(r.error||'Could not add');return false}
 if(/^otpauth-migration:\/\//i.test(t)){toast('Google Authenticator export codes are not supported. Scan the QR code from each website instead.');return false}
 toast('This is not a 2-step verification QR code');return false}
async function startCam(){
 if(!has()){toast('Authentication works in the Android app');return}
 if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){toast('Camera is not available. Use “Choose QR image”.');pickImage();return}
 await loadQr();initBd();
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})}
 catch(e){toast('Camera permission is needed to scan. You can also choose a QR image.');return}
 const v=$('auV');v.srcObject=stream;camEl.style.display='flex';
 try{await v.play()}catch(e){}
 cam={stream,video:v,timer:0,busy:0,mute:0};
 cv=cv||document.createElement('canvas');
 loop()}
async function loop(){
 if(!cam)return;
 const v=cam.video;
 if(v.readyState>=2&&v.videoWidth&&!cam.busy){
  cam.busy=1;
  const k=Math.min(1,720/Math.max(v.videoWidth,v.videoHeight)),w=Math.max(1,Math.round(v.videoWidth*k)),h=Math.max(1,Math.round(v.videoHeight*k));
  cv.width=w;cv.height=h;cv.getContext('2d',{willReadFrequently:true}).drawImage(v,0,0,w,h);
  let t=null;try{t=await decodeCanvas(cv)}catch(e){}
  if(cam){cam.busy=0;if(t)handleText(t)}}
 if(cam)cam.timer=setTimeout(loop,220)}
function closeCam(){
 if(!cam)return;
 clearTimeout(cam.timer);try{cam.stream.getTracks().forEach(t=>t.stop())}catch(e){}
 try{cam.video.srcObject=null}catch(e){}
 cam=null;camEl.style.display='none'}
$('auCx').onclick=closeCam;
$('auCg').onclick=()=>{closeCam();pickImage()};
function pickImage(){pick.value='';pick.click()}
pick.onchange=async()=>{
 const f=pick.files&&pick.files[0];pick.value='';if(!f)return;
 await loadQr();initBd();
 let bm=null;try{bm=await createImageBitmap(f)}catch(e){}
 if(!bm){toast('Could not open that image');return}
 let text=null;
 for(const mx of [1600,1100,700,2400]){
  const k=Math.min(1,mx/Math.max(bm.width,bm.height));if(mx===2400&&Math.max(bm.width,bm.height)<=1600)continue;
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bm.width*k));c.height=Math.max(1,Math.round(bm.height*k));
  const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bm,0,0,c.width,c.height);
  try{text=await decodeCanvas(c)}catch(e){}
  if(text)break;
  await new Promise(r=>setTimeout(r,0))}
 try{bm.close&&bm.close()}catch(e){}
 if(!text){toast('No QR code found in that image');return}
 handleText(text,true)};

/* ---------- open / close ---------- */
function lockBtn(){
 const b=$('auLk'),s=J('authLockState');
 b.textContent=s.enabled?'🔒':'🔓';b.title=s.enabled?'Lock is ON (tap to turn off)':'Lock is OFF (tap to turn on)';return s}
window.__authLockRes=ok=>{if(!isOpen)return;if(!ok)toast('Not confirmed');last='';lockBtn();tick()};
$('auLk').onclick=()=>{
 const s=lockBtn();
 if(s.enabled){if(confirm('Turn OFF the phone-lock for this page?'))try{A().authSetLock(false)}catch(e){}}
 else if(!s.secure)toast('Set a phone screen lock (PIN, pattern or fingerprint) first');
 else if(confirm('Ask for your phone PIN / pattern / fingerprint every time this page opens?'))try{A().authSetLock(true)}catch(e){}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&isOpen&&lockBtn().enabled)close(false)});
function open(){
 if(!has()){toast('Authentication works in the Android app');return}
 isOpen=true;last='';root.style.display='flex';
 try{A().secureScreen&&A().secureScreen(true)}catch(e){}
 try{history.pushState({au:1},'');histPushed=true}catch(e){histPushed=false}
 const ls=lockBtn();tick();if(ls.locked){try{A().authUnlock()}catch(e){}}
 clearInterval(timer);timer=setInterval(tick,1000)}
function close(fromPop){
 closeCam();sheet.style.display='none';form.style.display='none';
 isOpen=false;clearInterval(timer);root.style.display='none';
 items=[];L.innerHTML='';last='';$('auFk').value='';
 try{A()&&A().authRelock&&A().authRelock()}catch(e){}
 try{A()&&A().secureScreen&&A().secureScreen(false)}catch(e){}
 if(histPushed&&!fromPop){histPushed=false;try{history.back()}catch(e){}}else histPushed=false}
window.addEventListener('popstate',()=>{if(isOpen){histPushed=false;close(true)}});
$('auB').onclick=()=>close(false);
$('auPlus').onclick=openAdd;
window.__authOpen=open;
}catch(e){try{console.error('authenticator.js',e)}catch(_){}}})();
