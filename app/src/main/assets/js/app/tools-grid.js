(function(){
const $=id=>document.getElementById(id),tt=m=>window.gnToast&&gnToast(m);
const P='.pdf,application/pdf',I='image/*',PI=P+','+I;
const TL={docs:{t:'Documents',a:PI,cam:1,m:'crop',sc:1},id:{t:'ID card',a:I,cam:1,m:'crop',sc:1,max:2,lay:'id'},passport:{t:'Passport',a:I,cam:1,m:'crop',sc:1,max:1,lay:'pass'},book:{t:'Book',a:PI,cam:1,m:'crop',sc:1},idphoto:{t:'ID Photo',a:I,cam:1,m:'crop',max:1},
text:{t:'Extract text',a:P+',.docx,.txt',txt:1},word:{t:'To Word',a:P,txt:1,ext:'docx'},eword:{t:'Edit Word',a:'.docx',txt:1,ext:'docx'},images:{t:'Import images',a:I,cam:1,m:'crop'},
merge:{t:'Merge PDF',a:P},files:{t:'Merge files',a:PI},split:{t:'Split PDF',a:P},lock:{t:'Lock PDF',a:P},compress:{t:'Compress PDF',a:PI},watermark:{t:'Watermark',a:PI},
edit:{t:'Edit PDF',a:PI,m:'pen'},sign:{t:'Sign',a:PI,m:'sign'},doodle:{t:'Doodle',a:PI,m:'pen'},erase:{t:'Smart erase',a:PI,m:'erase'}};
const CT={watermark:'<input id=tlW value="CONFIDENTIAL"><select id=tlO><option value=".25">Light</option><option value=".45">Medium</option><option value=".7">Dark</option></select><button id=tlA>Apply</button>',
split:'<input id=tlR placeholder="Pages: 1-3,5">',lock:'<input id=tlPw type=password placeholder="Password">',
compress:'<select id=tlQ><option value=".8,.75">Medium</option><option value=".6,.55">Strong</option><option value=".9,1">Light</option></select>',
idphoto:'<select id=tlBg><option value="">Keep background</option><option value="#ffffff">White</option><option value="#3a7bd5">Blue</option><option value="#dd3333">Red</option></select>',
text:'<button id=tlCp>Copy</button><button id=tlSh>Share</button>'};
let cur,pg=[],txt='',orig=0,busy=0,sig=null;
const cv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
const E=s=>String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
const copy=(c,k)=>{const n=cv(c.width*(k||1),c.height*(k||1));n.getContext('2d').drawImage(c,0,0,n.width,n.height);return n};
async function load(f){const n=f.name||'';orig+=f.size||0;
 if(/\.pdf$/i.test(n)||f.type==='application/pdf'){const d=await (await need('pdf'),pdfjsLib).getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
  for(let i=1;i<=d.numPages;i++){const p=await d.getPage(i),v=p.getViewport({scale:1.6}),c=cv(v.width,v.height);await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
   const tc=await p.getTextContent();let s='',y=null;for(const t of tc.items){const yy=t.transform[5];if(y!==null&&Math.abs(yy-y)>3)s+='\n';else if(s&&!/\s$/.test(s))s+=' ';s+=t.str;y=yy}pg.push({c,tx:s})}}
 else if(/\.docx$/i.test(n)){const z=await (await need('zip'),JSZip).loadAsync(await f.arrayBuffer()),x=await z.file('word/document.xml').async('string');
  txt+=x.split('</w:p>').map(p=>(p.match(/<w:t[^>]*>[^<]*<\/w:t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')).join('')).join('\n').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')}
 else if(/\.txt$/i.test(n))txt+=await f.text();
 else{const u=URL.createObjectURL(f),im=new Image();await new Promise((r,j)=>{im.onload=r;im.onerror=j;im.src=u});const k=Math.min(1,2000/Math.max(im.naturalWidth,im.naturalHeight)),c=cv(im.naturalWidth*k,im.naturalHeight*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);pg.push({c})}}
function rot(p){const c=p.c,n=cv(c.height,c.width),x=n.getContext('2d');x.translate(n.width/2,n.height/2);x.rotate(Math.PI/2);x.drawImage(c,-c.width/2,-c.height/2);p.c=n}
function grid(){const g=$('tlG'),T=TL[cur];g.innerHTML='';pg.forEach((p,i)=>{const d=document.createElement('div');d.className='tlp'+(p.off?' off':'');const t=cv(160,160*p.c.height/p.c.width);t.getContext('2d').drawImage(p.c,0,0,t.width,t.height);d.append(t);
 const b=document.createElement('div');b.innerHTML='<button data-a=u>↑</button><button data-a=d>↓</button><button data-a=r>⟳</button><button data-a=x>✕</button>'+(T.m?'<button data-a=e>✎</button>':'');d.append(b);
 t.onclick=()=>{if(T.m)edit(i);else{p.off=!p.off;grid()}};
 b.onclick=e=>{const a=e.target.dataset.a;if(!a)return;if(a==='u'&&i)[pg[i-1],pg[i]]=[pg[i],pg[i-1]];if(a==='d'&&i<pg.length-1)[pg[i+1],pg[i]]=[pg[i],pg[i+1]];if(a==='x')pg.splice(i,1);if(a==='r')rot(p);if(a==='e'){edit(i);return}grid()};g.append(d)})}
function edit(i){const c=pg[i].c,x=c.getContext('2d'),o=$('tlE'),h=$('tlEc');let m=TL[cur].m==='crop'?'crop':TL[cur].m,st=[],dn=0,s0,snap;
 o.style.display='flex';h.innerHTML='';c.style.cssText='max-width:100%;touch-action:none;background:#fff';h.append(c);
 const pt=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]},
 push=()=>{st.push({d:x.getImageData(0,0,c.width,c.height),w:c.width,h:c.height});if(st.length>8)st.shift()};
 $('tlEb').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.m){m=b.dataset.m;if(m==='sign')pad(()=>{})}
  if(b.id==='tlU'&&st.length){const s=st.pop();c.width=s.w;c.height=s.h;x.putImageData(s.d,0,0)}
  if(b.id==='tlD'){o.style.display='none';c.style.cssText='';grid()}};
 c.onpointerdown=e=>{e.preventDefault();c.setPointerCapture(e.pointerId);s0=pt(e);const col=$('tlCo').value,sz=c.width/200;
  if(m==='text'){push();x.fillStyle=col;x.font=Math.round(c.width/32)+'px sans-serif';x.textBaseline='middle';x.fillText($('tlTx').value||'Text',s0[0],s0[1]);return}
  if(m==='sign'){if(!sig)return pad();push();const w=c.width*.28,k=w/sig.width;x.drawImage(sig,s0[0]-w/2,s0[1]-sig.height*k/2,w,sig.height*k);return}
  dn=1;push();snap=x.getImageData(0,0,c.width,c.height);if(m==='pen'){x.strokeStyle=col;x.lineWidth=Math.max(3,sz);x.lineCap=x.lineJoin='round';x.beginPath();x.moveTo(s0[0],s0[1]);x.lineTo(s0[0]+.1,s0[1]);x.stroke()}};
 c.onpointermove=e=>{if(!dn)return;const q=pt(e);if(m==='pen'){x.lineTo(q[0],q[1]);x.stroke()}else{x.putImageData(snap,0,0);x.save();x.setLineDash([12,8]);x.lineWidth=3;x.strokeStyle='#07f';x.strokeRect(s0[0],s0[1],q[0]-s0[0],q[1]-s0[1]);x.restore()}};
 c.onpointerup=e=>{if(!dn)return;dn=0;if(m==='pen')return;x.putImageData(snap,0,0);const q=pt(e),X=Math.min(s0[0],q[0]),Y=Math.min(s0[1],q[1]),W=Math.abs(q[0]-s0[0]),H=Math.abs(q[1]-s0[1]);if(W<6||H<6)return;
  if(m==='erase'){let r=0,g=0,bl=0;const ps=[[X-4,Y-4],[X+W+4,Y-4],[X-4,Y+H+4],[X+W+4,Y+H+4],[X+W/2,Y-4],[X+W/2,Y+H+4],[X-4,Y+H/2],[X+W+4,Y+H/2]];
   ps.forEach(a=>{const d=x.getImageData(Math.max(0,Math.min(c.width-1,a[0]|0)),Math.max(0,Math.min(c.height-1,a[1]|0)),1,1).data;r+=d[0];g+=d[1];bl+=d[2]});x.fillStyle='rgb('+(r/8|0)+','+(g/8|0)+','+(bl/8|0)+')';x.fillRect(X,Y,W,H)}
  if(m==='crop'){const d=x.getImageData(X,Y,W,H);c.width=W|0;c.height=H|0;x.putImageData(d,0,0)}}}
function pad(){const o=$('tlP'),c=$('tlPc'),x=c.getContext('2d');o.style.display='flex';x.clearRect(0,0,c.width,c.height);let dn=0;
 const pt=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.onpointerdown=e=>{c.setPointerCapture(e.pointerId);dn=1;const p=pt(e);x.strokeStyle='#111';x.lineWidth=5;x.lineCap=x.lineJoin='round';x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(p[0]+.1,p[1]);x.stroke()};
 c.onpointermove=e=>{if(dn){const p=pt(e);x.lineTo(p[0],p[1]);x.stroke()}};c.onpointerup=()=>dn=0;
 $('tlPx').onclick=()=>x.clearRect(0,0,c.width,c.height);$('tlPo').onclick=()=>{sig=copy(c);o.style.display='none'}}
const enh=c=>{const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4){let g=(.3*a[i]+.59*a[i+1]+.11*a[i+2]-128)*1.7+165;g=g<0?0:g>255?255:g;a[i]=a[i+1]=a[i+2]=g}x.putImageData(d,0,0)};
function wm(c,t,op){const n=copy(c),x=n.getContext('2d');x.globalAlpha=op;x.fillStyle='#777';x.font='bold '+Math.round(c.width/(Math.max(6,t.length*.62)))+'px sans-serif';x.textAlign='center';x.textBaseline='middle';x.translate(c.width/2,c.height/2);x.rotate(-Math.PI/5);x.fillText(t,0,0);return n}
function mk(L,q,pw){const{jsPDF}=window.jspdf;let d;L.forEach(c=>{const w=c.width*.75,h=c.height*.75,o=w>h?'l':'p';if(!d)d=new jsPDF({unit:'pt',format:[w,h],orientation:o,compress:true,encryption:pw?{userPassword:pw,ownerPassword:pw,userPermissions:['print']}:undefined});else d.addPage([w,h],o);d.addImage(c.toDataURL('image/jpeg',q||.88),'JPEG',0,0,w,h,undefined,'FAST')});return d.output('arraybuffer')}
function sheet(list,k){const A=cv(1240,1754),x=A.getContext('2d'),w=k==='pass'?740:700;x.fillStyle='#fff';x.fillRect(0,0,1240,1754);let y=100;list.forEach(c=>{const h=w*c.height/c.width;x.drawImage(c,(1240-w)/2,y,w,h);x.strokeStyle='#bbb';x.strokeRect((1240-w)/2,y,w,h);y+=h+80});return A}
function idph(src,bg){const W=413,H=531,r=W/H;let sw=src.width,sh=src.height,sx=0,sy=0;if(sw/sh>r){const nw=sh*r;sx=(sw-nw)/2;sw=nw}else{const nh=sw/r;sy=(sh-nh)/2;sh=nh}
 const p=cv(W,H),x=p.getContext('2d');x.drawImage(src,sx,sy,sw,sh,0,0,W,H);
 if(bg){const d=x.getImageData(0,0,W,H),a=d.data;let R=0,G=0,B=0;[0,(W-1)*4,(H-1)*W*4,((H-1)*W+W-1)*4].forEach(o=>{R+=a[o];G+=a[o+1];B+=a[o+2]});R/=4;G/=4;B/=4;const t=parseInt(bg.slice(1),16);
  for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-R)+Math.abs(a[i+1]-G)+Math.abs(a[i+2]-B)<90){a[i]=t>>16&255;a[i+1]=t>>8&255;a[i+2]=t&255}x.putImageData(d,0,0)}
 const s=cv(1200,1800),y=s.getContext('2d');y.fillStyle='#fff';y.fillRect(0,0,1200,1800);y.strokeStyle='#ccc';for(let k=0;k<6;k++){const px=167+(k%2)*(W+40),py=63+(k/2|0)*(H+40);y.drawImage(p,px,py,W,H);y.strokeRect(px,py,W,H)}return s}
async function docx(lines){await need('zip');const z=new JSZip(),H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',R='http://schemas.openxmlformats.org/';
 z.file('[Content_Types].xml',H+'<Types xmlns="'+R+'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 z.file('_rels/.rels',H+'<Relationships xmlns="'+R+'package/2006/relationships"><Relationship Id="r1" Type="'+R+'officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 z.file('word/document.xml',H+'<w:document xmlns:w="'+R+'wordprocessingml/2006/main"><w:body>'+lines.map(l=>'<w:p><w:r><w:t xml:space="preserve">'+E(l)+'</w:t></w:r></w:p>').join('')+'</w:body></w:document>');return z.generateAsync({type:'uint8array'})}
const kb=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';
async function go(){if(busy)return;const T=TL[cur],X=$('tlX'),nm=T.t.replace(/ /g,'_')+'_'+new Date().toISOString().slice(0,16).replace(/\D/g,'');busy=1;
 try{if(T.txt){if(!X.value.trim()){tt('Kono text nei');return}
   if(T.ext)await save(nm+'.docx',await docx(X.value.split('\n')));else await save(nm+'.txt',new TextEncoder().encode(X.value));return}
  let L=pg.filter(p=>!p.off).map(p=>p.c);
  if(cur==='split'){const r=($('tlR').value||'').trim();if(r){const s=new Set();r.split(',').forEach(a=>{const z=a.split('-').map(Number);for(let k=z[0];k<=(z[1]||z[0]);k++)s.add(k)});L=pg.filter((_,i)=>s.has(i+1)).map(p=>p.c)}}
  if(!L.length){tt('Age file/photo add korun');return}
  if(cur==='idphoto'){const s=idph(L[0],$('tlBg').value),b=await new Promise(r=>s.toBlob(r,'image/jpeg',.95));await save(nm+'.jpg',await b.arrayBuffer());return}
  if(T.sc&&$('tlEn')&&$('tlEn').checked)L=L.map(c=>{const n=copy(c);enh(n);return n});
  if(T.lay)L=[sheet(L,T.lay)];
  let q=.88;if(cur==='compress'){const v=$('tlQ').value.split(',').map(Number);q=v[0];L=L.map(c=>copy(c,v[1]))}
  let pw='';if(cur==='lock'){pw=$('tlPw').value;if(!pw){tt('Password din');return}}
  await need('jspdf');const buf=mk(L,q,pw);await save(nm+'.pdf',buf);if(cur==='compress')tt('Size: '+kb(orig)+' → '+kb(buf.byteLength))}
 catch(e){console.error(e);tt('Error: '+(e&&e.message||e))}finally{busy=0}}
function open(k){cur=k;const T=TL[k];pg=[];txt='';orig=0;$('tlT').textContent=T.t;
 $('tlC').innerHTML='<button id=tlAdd>＋ File</button>'+(T.cam?'<button id=tlCam>📷 Camera</button>':'')+(T.sc?'<label><input type=checkbox id=tlEn checked> Clean scan</label>':'')+(k==='idphoto'?'':'')+(CT[k]||'');
 const X=$('tlX');X.style.display=T.txt?'block':'none';X.value='';$('tlG').style.display=T.txt&&!T.a.includes('pdf')?'none':'grid';$('tlS').style.display='flex';grid();
 const F=$('tlF'),K=$('tlK');F.accept=T.a;$('tlAdd').onclick=()=>F.click();if(T.cam)$('tlCam').onclick=()=>K.click();
 if(k==='watermark')$('tlA').onclick=()=>{const t=$('tlW').value||'CONFIDENTIAL',o=+$('tlO').value;pg.forEach(p=>{if(!p.off)p.c=wm(p.c,t,o)});grid();tt('Watermark added')};
 if(k==='text'){$('tlCp').onclick=()=>{X.select();try{navigator.clipboard?navigator.clipboard.writeText(X.value):document.execCommand('copy');tt('Copied')}catch(e){}};$('tlSh').onclick=()=>window.Android&&Android.shareText?Android.shareText(X.value):tt('Share app-e kaj kore')}
 F.click()}
async function pick(e){const T=TL[cur],fs=[...e.target.files];e.target.value='';if(!fs.length)return;tt('Loading...');
 try{for(const f of fs)await load(f)}catch(er){console.error(er);tt('File khola jayni: '+(er&&er.message||er))}
 if(T.max&&pg.length>T.max)pg=pg.slice(-T.max);
 if(T.txt){const s=[txt,...pg.map(p=>p.tx||'')].filter(Boolean).join('\n\n');$('tlX').value=s;if(!s)tt('Text pailam na (scan/photo). OCR ei app-e nei.')}
 grid()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-tl]');if(b&&TL[b.dataset.tl])open(b.dataset.tl)});
$('tlF').onchange=pick;$('tlK').onchange=pick;$('tlGo').onclick=go;$('tlB').onclick=()=>{$('tlS').style.display='none';pg=[]};
})();
