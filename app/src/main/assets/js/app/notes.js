/* ===== Notes ===== */
(function(){
'use strict';
const KEY='ds_notes_v1';
const Q=(s,r)=>Array.from((r||document).querySelectorAll(s));
const g=id=>document.getElementById(id);
const toast=m=>{try{gnToast(m)}catch(e){}};
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let notes=[];try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(a))notes=a.filter(n=>n&&n.id&&Array.isArray(n.pages))}catch(e){}
const store=()=>{try{localStorage.setItem(KEY,JSON.stringify(notes))}catch(e){toast('Note save hocche na (storage full)')}};
const pnid=p=>{if(!p.nid){p.nid='f'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);try{persist()}catch(e){}}return p.nid};
const plain=h=>{const d=document.createElement('div');d.innerHTML=h||'';Q('input.ntcb',d).forEach(i=>i.replaceWith(i.hasAttribute('checked')?'☑ ':'☐ '));Q('div,p,br,li',d).forEach(e=>e.insertAdjacentText('beforebegin','\n'));return d.textContent.replace(/\n{2,}/g,'\n').trim()};
const FONTS=[['Aa',''],['Sans','Arial,Helvetica,sans-serif'],['Serif','Georgia,serif'],['Mono','"Courier New",monospace'],['Hand','"Comic Sans MS","Segoe Print",cursive']];
const COLS=['#111111','#e11d48','#f97316','#eab308','#16a34a','#0ea5e9','#2563eb','#9333ea'];
const BGS=['#ffffff','#fdf6e3','#eaf7ee','#e8f1fb','#1f2430'];
const S=g('ntS');
let N=null,pages=[],curPg=0,pen=false,eraser=false,inkCol='#2563eb',inkW=3,txtCol='#e11d48',sub='',saveT=0,lastRange=null,findR=[],findI=0,delArm=0;

function newNote(fld){return{id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),title:'',fld:fld||'',pages:[{h:'',ink:'',bx:[]}],style:'plain',bg:'#ffffff',land:false,tags:[],star:false,lock:false,ff:'',fs:17,t:Date.now()}}
function isEmpty(n){return!n.title&&n.pages.every(p=>!plain(p.h)&&!p.ink&&!(p.bx&&p.bx.some(b=>plain(b.t))))}
function ser(){if(!N)return;N.title=g('ntTitle').value.trim();N.pages=pages.map(P=>({h:P.nte.innerHTML,ink:P.ink||'',bx:Q('.ntbx',P.el).map(d=>({x:parseFloat(d.style.left)||0,y:parseFloat(d.style.top)||0,t:d.querySelector('.ntbt').innerHTML}))}))}
function commit(){clearTimeout(saveT);if(!N)return;ser();if(!notes.includes(N)){if(isEmpty(N))return;notes.unshift(N)}N.t=Date.now();store()}
function dirty(){clearTimeout(saveT);saveT=setTimeout(commit,500)}

/* ---------- pages ---------- */
function styleEl(P){const el=P.el;el.className='ntp s-'+(N.style||'plain')+(N.land?' land':'')+(N.bg==='#1f2430'?' dark':'');el.style.backgroundColor=N.bg||'#fff';el.style.setProperty('--lh',((N.fs||17)*1.5)+'px');P.nte.style.fontSize=(N.fs||17)+'px';P.nte.style.fontFamily=N.ff||''}
function drawInk(P,url){const c=P.cv.getContext('2d');c.clearRect(0,0,P.cv.width,P.cv.height);if(!url)return;const im=new Image();im.onload=()=>{c.globalCompositeOperation='source-over';c.drawImage(im,0,0,P.cv.width,P.cv.height)};im.src=url}
function fit(P){const w=P.el.clientWidth,h=P.el.clientHeight;if(!w||!h)return;const d=Math.min(2,window.devicePixelRatio||1),W=Math.round(w*d),H=Math.round(h*d);if(P.cv.width===W&&P.cv.height===H)return;P.cv.width=W;P.cv.height=H;drawInk(P,P.ink)}
function stroke(P,x0,y0,x1,y1){const c=P.cv.getContext('2d'),d=P.cv.width/(P.cv.clientWidth||1);c.lineCap='round';c.lineJoin='round';c.lineWidth=(eraser?inkW*5:inkW)*d;c.globalCompositeOperation=eraser?'destination-out':'source-over';c.strokeStyle=inkCol;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke()}
function bindInk(P){const cv=P.cv;let on=false,lx=0,ly=0;
 const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
 cv.addEventListener('pointerdown',e=>{if(!pen||N.lock)return;e.preventDefault();try{cv.setPointerCapture(e.pointerId)}catch(_){}on=true;curPg=pages.indexOf(P);const[x,y]=pos(e);lx=x;ly=y;P.undo.push(P.ink||'');if(P.undo.length>25)P.undo.shift();P.redo=[];stroke(P,x,y,x+.01,y)});
 cv.addEventListener('pointermove',e=>{if(!on)return;e.preventDefault();const[x,y]=pos(e);stroke(P,lx,ly,x,y);lx=x;ly=y});
 const end=()=>{if(!on)return;on=false;P.ink=cv.toDataURL('image/png');dirty()};
 cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end)}
function addBox(P,b){const d=document.createElement('div');d.className='ntbx';d.style.left=(b.x||15)+'%';d.style.top=(b.y||15)+'%';
 d.innerHTML='<div class="ntbh">✥</div><div class="ntbt" contenteditable="'+(!N.lock)+'"></div><button class="ntbd" type="button" aria-label="Delete box">×</button>';
 d.querySelector('.ntbt').innerHTML=b.t||'';P.el.appendChild(d);
 const h=d.querySelector('.ntbh');let on=false,sx=0,sy=0,ox=0,oy=0;
 h.addEventListener('pointerdown',e=>{if(N.lock)return;on=true;try{h.setPointerCapture(e.pointerId)}catch(_){}sx=e.clientX;sy=e.clientY;ox=d.offsetLeft;oy=d.offsetTop;e.preventDefault()});
 h.addEventListener('pointermove',e=>{if(!on)return;const W=P.el.clientWidth,H=P.el.clientHeight,x=Math.max(0,Math.min(W-60,ox+e.clientX-sx)),y=Math.max(0,Math.min(H-40,oy+e.clientY-sy));d.style.left=(x/W*100)+'%';d.style.top=(y/H*100)+'%'});
 h.addEventListener('pointerup',()=>{if(on){on=false;dirty()}});
 d.querySelector('.ntbd').onclick=()=>{d.remove();dirty()};
 d.querySelector('.ntbt').addEventListener('input',dirty);return d}
function addPageEl(pg){const el=document.createElement('div');const nte=document.createElement('div');nte.className='nte';nte.contentEditable=String(!N.lock);nte.innerHTML=pg.h||'';
 const cv=document.createElement('canvas');cv.className='nti';const nn=document.createElement('span');nn.className='ntn';
 el.append(nte,cv,nn);const P={el,nte,cv,ink:pg.ink||'',undo:[],redo:[]};
 pages.push(P);g('ntPages').appendChild(el);(pg.bx||[]).forEach(b=>addBox(P,b));styleEl(P);
 nte.addEventListener('input',dirty);nte.addEventListener('focus',()=>{curPg=pages.indexOf(P)});el.addEventListener('pointerdown',()=>{curPg=pages.indexOf(P)});
 bindInk(P);try{new ResizeObserver(()=>fit(P)).observe(el)}catch(e){}fit(P)}
function renumber(){pages.forEach((P,i)=>{P.el.querySelector('.ntn').textContent=(i+1)+'/'+pages.length})}
function buildPages(){pages=[];g('ntPages').innerHTML='';N.pages.forEach(addPageEl);renumber();curPg=Math.max(0,Math.min(curPg,pages.length-1))}
function addPage(){ser();N.pages.push({h:'',ink:'',bx:[]});curPg=N.pages.length-1;buildPages();pages[curPg].el.scrollIntoView({block:'start'});dirty()}
function delPage(){if(N.pages.length<2){toast('Last page delete kora jay na');return}ser();N.pages.splice(curPg,1);buildPages();dirty()}

/* ---------- open / close ---------- */
function applyLock(){S.classList.toggle('locked',!!N.lock);pages.forEach(P=>{P.nte.contentEditable=String(!N.lock);Q('.ntbt',P.el).forEach(t=>t.contentEditable=String(!N.lock))});g('ntTitle').readOnly=!!N.lock}
function renderTags(){const t=g('ntTags');t.innerHTML=(N.tags||[]).map((x,i)=>'<span>#'+E(x)+'<b data-tx="'+i+'">×</b></span>').join('')}
function openNote(id,fld){if(id){N=notes.find(n=>n.id===id);if(!N)return}else N=newNote(fld);
 if(!N.fs)N.fs=17;g('ntTitle').value=N.title||'';pen=false;eraser=false;sub='';curPg=0;lastRange=null;S.classList.remove('pen','ntfs');
 buildPages();renderTags();applyLock();fillSelects();setSub('');menuHide();g('ntFindBar').style.display='none';g('ntTagBar').style.display='none';g('ntPen').classList.remove('on');
 S.style.display='flex';document.body.classList.add('nt-open');
 if(!id)setTimeout(()=>{try{g('ntTitle').focus()}catch(e){}},80)}
function closeNote(){commit();S.style.display='none';document.body.classList.remove('nt-open');S.classList.remove('ntfs');g('ntSort').style.display='none';N=null;pages=[];g('ntPages').innerHTML='';menuHide();try{renderLibrary()}catch(e){}}
g('ntBack').onclick=closeNote;
g('ntTitle').addEventListener('input',dirty);
g('ntTitle').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(pages[0])pages[0].nte.focus()}});

/* ---------- toolbar ---------- */
document.addEventListener('selectionchange',()=>{if(S.style.display==='none')return;const s=getSelection();if(!s.rangeCount)return;const r=s.getRangeAt(0),n=r.commonAncestorContainer,el=n.nodeType===1?n:n.parentElement;if(el&&el.closest&&(el.closest('.nte')||el.closest('.ntbt')))lastRange=r.cloneRange()});
function restoreSel(){if(lastRange){const s=getSelection();s.removeAllRanges();s.addRange(lastRange)}else if(pages[curPg])pages[curPg].nte.focus()}
function exec(c,v){if(N.lock){toast('Note locked ache');return}restoreSel();document.execCommand(c,false,v);dirty()}
Q('#ntBar button').forEach(b=>b.addEventListener('pointerdown',e=>e.preventDefault()));
function fillSelects(){const f=g('ntFf');f.innerHTML=FONTS.map((x,i)=>'<option value="'+i+'">'+x[0]+'</option>').join('');f.value='0';const s=g('ntFs');let o='';for(let i=10;i<=48;i+=(i<24?1:2))o+='<option value="'+i+'">'+i+'</option>';s.innerHTML=o;s.value=String(N.fs||17);if(s.value!==String(N.fs||17)){s.insertAdjacentHTML('afterbegin','<option value="'+N.fs+'">'+N.fs+'</option>');s.value=String(N.fs)}}
function setSub(m){sub=m;const b=g('ntSub');if(!m){b.style.display='none';b.innerHTML='';return}b.style.display='flex';
 const sw=(cur)=>COLS.map(c=>'<i data-c="'+c+'" class="'+(c===cur?'on':'')+'" style="background:'+c+'"></i>').join('');
 if(m==='pen')b.innerHTML=sw(eraser?'':inkCol)+'<button data-w="2" class="'+(inkW===2?'on':'')+'">S</button><button data-w="4" class="'+(inkW===4?'on':'')+'">M</button><button data-w="8" class="'+(inkW===8?'on':'')+'">L</button><button data-er="1" class="'+(eraser?'on':'')+'">Eraser</button>';
 else b.innerHTML=sw(txtCol)}
g('ntSub').addEventListener('pointerdown',e=>e.preventDefault());
g('ntSub').addEventListener('click',e=>{const c=e.target.closest('[data-c]'),w=e.target.closest('[data-w]'),er=e.target.closest('[data-er]');
 if(c){const col=c.dataset.c;if(sub==='pen'){inkCol=col;eraser=false}else{txtCol=col;g('ntTcl').style.borderBottomColor=col;exec('foreColor',col)}setSub(sub)}
 else if(w){inkW=+w.dataset.w;setSub('pen')}else if(er){eraser=!eraser;setSub('pen')}});
g('ntPen').onclick=()=>{if(N.lock){toast('Note locked ache');return}pen=!pen;S.classList.toggle('pen',pen);g('ntPen').classList.toggle('on',pen);setSub(pen?'pen':'');if(pen){try{document.activeElement.blur()}catch(e){}toast('Pen on: scroll korte pen off korun')}};
g('ntCk').onclick=()=>{if(pen)g('ntPen').click();exec('insertHTML','<div><input type="checkbox" class="ntcb">&nbsp;</div>')};
g('ntTc').onclick=()=>{if(pen)g('ntPen').click();setSub(sub==='txt'?'':'txt');g('ntTcl').style.borderBottomColor=txtCol};
g('ntTbx').onclick=()=>{if(N.lock){toast('Note locked ache');return}if(pen)g('ntPen').click();const P=pages[curPg]||pages[0],d=addBox(P,{x:14,y:18,t:''});dirty();setTimeout(()=>d.querySelector('.ntbt').focus(),30)};
g('ntFf').onchange=()=>{const f=FONTS[+g('ntFf').value];g('ntFf').value='0';if(N.lock)return;if(lastRange&&!lastRange.collapsed){exec('fontName',f[1]||'inherit')}else{N.ff=f[1];pages.forEach(P=>P.nte.style.fontFamily=N.ff);dirty()}};
g('ntFs').onchange=()=>{const px=+g('ntFs').value;if(N.lock)return;if(lastRange&&!lastRange.collapsed){restoreSel();document.execCommand('fontSize',false,'7');Q('font[size="7"]',S).forEach(f=>{const sp=document.createElement('span');sp.style.fontSize=px+'px';sp.innerHTML=f.innerHTML;f.replaceWith(sp)})}else{N.fs=px;pages.forEach(styleEl2)}dirty()};
function styleEl2(P){styleEl(P)}
g('ntUn').onclick=()=>{if(pen){const P=pages[curPg];if(!P||!P.undo.length)return;P.redo.push(P.ink||'');P.ink=P.undo.pop();drawInk(P,P.ink);dirty()}else exec('undo')};
g('ntRe').onclick=()=>{if(pen){const P=pages[curPg];if(!P||!P.redo.length)return;P.undo.push(P.ink||'');P.ink=P.redo.pop();drawInk(P,P.ink);dirty()}else exec('redo')};
g('ntPages').addEventListener('change',e=>{const c=e.target;if(c.classList&&c.classList.contains('ntcb')){if(c.checked)c.setAttribute('checked','');else c.removeAttribute('checked');dirty()}});

/* ---------- menu ---------- */
function menuHide(){g('ntMenu').style.display='none'}
function menu(view){const m=g('ntMenu');m.style.display='block';let h='';
 const mi=(k,t,a)=>'<button class="mi" data-k="'+k+'">'+t+(a?'<small>›</small>':'')+'</button>';
 if(view==='main'){h=mi('find','Search')+mi('sort','Page sorter')+mi('style','Note style')+mi('page','Page settings')+'<hr>'+mi('full','Full screen')+mi('addto','Add note to',1)+mi('collab','Collaborate',1)+mi('tags','Add tags')+'<hr><div class="mrow"><button data-k="star" aria-label="Favorite">'+(N.star?'★':'☆')+'</button><button data-k="lock" aria-label="Lock">'+(N.lock?'🔒':'🔓')+'</button><button data-k="print" aria-label="Print">🖨</button></div>'}
 else if(view==='style'){h=['plain','lines','grid','dots'].map(s=>mi('st:'+s,(N.style===s?'✓ ':'')+s[0].toUpperCase()+s.slice(1))).join('')+'<hr>'+mi('back','‹ Back')}
 else if(view==='page'){h='<div class="msw">'+BGS.map(c=>'<i data-k="bg:'+c+'" class="'+(N.bg===c?'on':'')+'" style="background:'+c+'"></i>').join('')+'</div>'+mi('orient',N.land?'Orientation: Landscape':'Orientation: Portrait')+mi('addpage','Add page')+mi('delpage',delArm&&Date.now()-delArm<4000?'Tap again to delete page '+(curPg+1):'Delete this page')+'<hr>'+mi('back','‹ Back')}
 else if(view==='addto'){h=mi('fl:','No folder'+(!N.fld?'  ✓':''))+projects.map((p,i)=>mi('fl:'+i,E(p.name)+(N.fld&&N.fld===p.nid?'  ✓':''))).join('')+'<hr>'+mi('back','‹ Back')}
 else if(view==='collab'){h=mi('share','Share as text')+mi('copy','Copy text')+mi('txt','Save as .txt file')+'<hr>'+mi('back','‹ Back')}
 m.innerHTML=h}
g('ntMore').onclick=e=>{e.stopPropagation();g('ntMenu').style.display==='block'?menuHide():menu('main')};
document.addEventListener('click',e=>{if(S.style.display!=='none'&&!e.target.closest('#ntMenu,#ntMore'))menuHide()});
const noteText=()=>{ser();return(N.title?N.title+'\n\n':'')+N.pages.map(p=>plain(p.h)).join('\n\n')};
function copyT(t){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(()=>toast('Copied'),()=>toast('Copy hoy ni'));return}}catch(e){}const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Copied')}catch(e){toast('Copy hoy ni')}a.remove()}
g('ntMenu').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;e.stopPropagation();const k=b.dataset.k;
 if(k==='back')return menu('main');
 if(k==='style'||k==='page'||k==='addto'||k==='collab')return menu(k);
 if(k.startsWith('st:')){N.style=k.slice(3);pages.forEach(styleEl);dirty();return menu('style')}
 if(k.startsWith('bg:')){N.bg=k.slice(3);pages.forEach(styleEl);dirty();return menu('page')}
 if(k==='orient'){N.land=!N.land;pages.forEach(styleEl);dirty();return menu('page')}
 if(k==='addpage'){menuHide();return addPage()}
 if(k==='delpage'){if(delArm&&Date.now()-delArm<4000){delArm=0;menuHide();return delPage()}delArm=Date.now();return menu('page')}
 if(k.startsWith('fl:')){const v=k.slice(3);N.fld=v===''?'':pnid(projects[+v]);dirty();commit();toast(v===''?'Folder theke soriye newa holo':'Note "'+projects[+v].name+'" folder e gelo');return menu('addto')}
 if(k==='share'){menuHide();const t=noteText();if(window.Android&&Android.shareText)Android.shareText(t);else if(navigator.share)navigator.share({title:N.title||'Note',text:t}).catch(()=>{});else copyT(t);return}
 if(k==='copy'){menuHide();return copyT(noteText())}
 if(k==='txt'){menuHide();const t=noteText(),nm=((N.title||'Note').replace(/[\\/:*?"<>|]+/g,'').trim()||'Note')+'.txt',b64=btoa(unescape(encodeURIComponent(t)));
  if(window.Android&&Android.save)Android.save(nm,'text/plain',b64);else{const a=document.createElement('a');a.href='data:text/plain;base64,'+b64;a.download=nm;document.body.appendChild(a);a.click();a.remove()}toast('Saved '+nm);return}
 menuHide();
 if(k==='find'){g('ntFindBar').style.display='flex';g('ntFind').focus()}
 else if(k==='sort')openSorter();
 else if(k==='full'){S.classList.add('ntfs')}
 else if(k==='tags'){g('ntTagBar').style.display='flex';g('ntTagIn').focus()}
 else if(k==='star'){N.star=!N.star;dirty();toast(N.star?'Favorite':'Favorite soriye newa holo')}
 else if(k==='lock'){N.lock=!N.lock;if(N.lock&&pen)g('ntPen').click();applyLock();dirty();toast(N.lock?'Note locked (read only)':'Note unlocked')}
 else if(k==='print'){try{window.print()}catch(err){toast('Print kaj korche na')}}
});
g('ntFsX').onclick=()=>S.classList.remove('ntfs');
/* find */
function doFind(){const q=g('ntFind').value.toLowerCase();findR=[];if(q)pages.forEach(P=>{const w=document.createTreeWalker(P.nte,NodeFilter.SHOW_TEXT);let t;while((t=w.nextNode())){const s=t.nodeValue.toLowerCase();let i=0;while((i=s.indexOf(q,i))>-1){const r=document.createRange();r.setStart(t,i);r.setEnd(t,i+q.length);findR.push(r);i+=q.length}}});findI=0;showFind()}
function showFind(){g('ntFc').textContent=findR.length?(findI+1)+'/'+findR.length:(g('ntFind').value?'0':'');if(!findR.length)return;const r=findR[findI],s=getSelection();s.removeAllRanges();s.addRange(r);const el=r.startContainer.parentElement;if(el)el.scrollIntoView({block:'center'})}
g('ntFind').addEventListener('input',doFind);
g('ntFind').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();g('ntFn').click()}});
g('ntFn').onclick=()=>{if(findR.length){findI=(findI+1)%findR.length;showFind()}};
g('ntFp').onclick=()=>{if(findR.length){findI=(findI-1+findR.length)%findR.length;showFind()}};
g('ntFx').onclick=()=>{g('ntFindBar').style.display='none';g('ntFind').value='';findR=[]};
/* tags */
function addTag(){const v=g('ntTagIn').value.trim().replace(/^#/,'');if(!v)return;N.tags=N.tags||[];if(!N.tags.includes(v))N.tags.push(v);g('ntTagIn').value='';renderTags();dirty()}
g('ntTagOk').onclick=addTag;g('ntTagIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addTag()}});
g('ntTagX').onclick=()=>{g('ntTagBar').style.display='none'};
g('ntTags').addEventListener('click',e=>{const b=e.target.closest('[data-tx]');if(b){N.tags.splice(+b.dataset.tx,1);renderTags();dirty()}});
/* page sorter */
function openSorter(){ser();const m=g('ntSort');m.style.display='flex';sortRender()}
function sortRender(){const m=g('ntSort'),L=N.pages;m.innerHTML='<div class="sh"><span>Page sorter</span><span><button data-s="add">+ Page</button> <button data-s="done">Done</button></span></div><div class="sl">'+L.map((p,i)=>{const t=plain(p.h);return'<div class="sr"><b>'+(i+1)+'</b><span>'+E(t?t.slice(0,60):(p.ink?'Drawing':'Blank page'))+'</span><button data-s="up" data-i="'+i+'"'+(i?'':' disabled')+'>▲</button><button data-s="dn" data-i="'+i+'"'+(i<L.length-1?'':' disabled')+'>▼</button><button data-s="del" data-i="'+i+'"'+(L.length>1?'':' disabled')+'>🗑</button></div>'}).join('')+'</div>'}
g('ntSort').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;const k=b.dataset.s,i=+b.dataset.i,L=N.pages;
 if(k==='done'){g('ntSort').style.display='none';buildPages();dirty();return}
 if(k==='add')L.push({h:'',ink:'',bx:[]});
 else if(k==='up'&&i>0)L.splice(i-1,0,L.splice(i,1)[0]);
 else if(k==='dn'&&i<L.length-1)L.splice(i+1,0,L.splice(i,1)[0]);
 else if(k==='del'&&L.length>1)L.splice(i,1);
 sortRender()});

/* ---------- library integration ---------- */
const _rl=window.renderLibrary;
function injectNotes(){const box=g('docFiles');if(!box)return;
 try{Q('#docFolders button[data-folder]').forEach(b=>{const p=projects[+b.dataset.folder];if(!p||!p.nid)return;const c=notes.filter(n=>n.fld===p.nid).length;if(!c)return;const s=b.querySelector('small');if(!s)return;const m=/^(\d+)/.exec(s.textContent);const t=(m?+m[1]:0)+c;s.textContent=t+(t===1?' file':' files')})}catch(e){}
Q('.nt-row',box).forEach(x=>x.remove());
 const term=((g('docSearch')||{}).value||'').trim().toLowerCase();let fid='all';
 try{fid=docFolder==='all'?'all':(projects[+docFolder]?pnid(projects[+docFolder]):'all')}catch(e){}
 const list=notes.filter(n=>(fid==='all'||n.fld===fid)&&(!term||(n.title||'').toLowerCase().includes(term)||n.pages.some(p=>plain(p.h).toLowerCase().includes(term))||(n.tags||[]).some(t=>t.toLowerCase().includes(term)))).sort((a,b)=>(b.t||0)-(a.t||0));
 if(!list.length)return;const emp=box.querySelector('.doc-empty');if(emp)emp.remove();
 const fname=n=>{const p=projects.find(p=>p.nid&&p.nid===n.fld);return p?p.name:''};
 const html=list.map(n=>{const t=plain((n.pages[0]||{}).h).replace(/\s+/g,' ').slice(0,60),d=new Date(n.t||Date.now()).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}),f=fname(n);
  return'<div class="doc-file nt-row"><button class="doc-file-main" data-note-open="'+n.id+'" title="Open note"><span class="doc-file-icon text ntic" aria-hidden="true"><b>NOTE</b></span><span class="doc-file-text"><span class="doc-file-name">'+(n.star?'★ ':'')+(n.lock?'🔒 ':'')+E(n.title||'Untitled note')+'</span><span class="doc-file-meta">'+E([d,n.pages.length+(n.pages.length===1?' page':' pages'),t].filter(Boolean).join(' · '))+'</span><span class="doc-tags">'+(f?'<span class="doc-tag">'+E(f)+'</span>':'')+'<span class="doc-tag">Note</span>'+(n.tags||[]).map(x=>'<span class="doc-tag">#'+E(x)+'</span>').join('')+'</span></span></button><div class="doc-file-tools"><button class="doc-file-more" data-note-del="'+n.id+'" aria-label="Delete note">🗑</button></div></div>'}).join('');
 box.insertAdjacentHTML('afterbegin',html)}
window.renderLibrary=function(){_rl.apply(this,arguments);try{injectNotes()}catch(e){console.error(e)}};
let nd='',ndT=0;
g('docFiles').addEventListener('click',e=>{const o=e.target.closest('[data-note-open]');if(o){openNote(o.dataset.noteOpen);return}
 const d=e.target.closest('[data-note-del]');if(d){const id=d.dataset.noteDel;if(nd===id&&Date.now()-ndT<4000){notes=notes.filter(n=>n.id!==id);store();nd='';toast('Note deleted');try{renderLibrary()}catch(x){}}else{nd=id;ndT=Date.now();d.textContent='Sure?';toast('Delete korte abar tap korun')}}});
function newInFolder(){let f='';try{if(docFolder!=='all'&&projects[+docFolder])f=pnid(projects[+docFolder])}catch(e){}openNote(null,f)}
(function(){const imp=g('docPanelImport');if(imp&&!g('docPanelNoteL')){const b=document.createElement('button');b.id='docPanelNoteL';b.type='button';b.className='doc-link';b.textContent='+ Note';b.onclick=newInFolder;imp.parentNode.insertBefore(b,imp.nextSibling)}
 const fb=g('docPanelFolder');if(fb&&!g('docPanelNote')){const b=document.createElement('button');b.id='docPanelNote';b.type='button';b.className='alt nt-btn';b.textContent='+ New note';b.onclick=newInFolder;fb.parentNode.appendChild(b)}})();
/* home Note tool */
const hb=g('homeBox');if(hb)hb.addEventListener('click',e=>{if(e.target.closest('[data-note="new"]'))openNote(null,'')});
/* Add card -> Cards page */
window.__openAddCard=function(){setTab('show');const b=g('addbox'),c=g('tabCards');if(b.parentNode!==c)c.insertBefore(b,c.firstChild);b.style.display='flex';try{if(!g('aD').value)g('aD').value=g('dflt').value}catch(e){}try{window.scrollTo(0,0);g('aN').focus()}catch(e){}};
g('addB').onclick=window.__openAddCard;
window.addEventListener('pagehide',()=>{try{commit()}catch(e){}});
window.__ntOpen=openNote;
window.__ntNew=function(){let f='';try{if(curTab==='files'&&docFolder!=='all'&&projects[+docFolder])f=pnid(projects[+docFolder])}catch(e){}openNote(null,f)};
})();
