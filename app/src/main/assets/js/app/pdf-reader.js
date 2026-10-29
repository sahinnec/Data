(function(){
const $=id=>document.getElementById(id);
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast=m=>{try{window.gnToast&&gnToast(m)}catch(e){}};
const body=()=>$('pvBody'),pages=()=>[...body().querySelectorAll('.pvpg')];
const SW=['#ffe600','#e53935','#43a047','#1e88e5','#8e24aa','#fb8c00','#111111'];
const TOOLS={pen:{n:'Pen',i:'✏️',w:3,o:1},pencil:{n:'Pencil',i:'✎',w:1.5,o:.8},mk:{n:'Marker',i:'🖍',w:14,o:.4},er:{n:'Eraser',i:'⌫'},rect:{n:'Box',i:'▭',w:3,o:1},oval:{n:'Circle',i:'◯',w:3,o:1},arrow:{n:'Arrow',i:'↗',w:3,o:1},line:{n:'Line',i:'╱',w:3,o:1},text:{n:'Text',i:'T'},note:{n:'Note',i:'🗒'}};
const R={key:'',tool:'hand',A:[],hist:[],redo:[],hide:false,panel:'',hits:[],hi:-1,ocr:{},img:{},stop:false,cmp:false,sel:0,id:1,dr:null,st:{c:'#e53935',w:4,o:1}};
const dim=wr=>[parseFloat(wr.style.width)||wr.offsetWidth,parseFloat(wr.style.height)||wr.offsetHeight];
const fileKey=()=>{const f=window.__pv&&window.__pv.file;return f?(f.name+'|'+f.size+'|'+(f.lastModified||0)):''};
const baseName=()=>{const f=window.__pv&&window.__pv.file;return((f&&f.name)||'document').replace(/\.[^.]+$/,'')};
function scrollToEl(el){const b=body(),br=b.getBoundingClientRect(),r=el.getBoundingClientRect();b.scrollTop+=r.top-br.top-br.height/3;if(r.left<br.left||r.right>br.right)b.scrollLeft+=r.left-br.left-br.width/3}
function curPage(){const b=body(),br=b.getBoundingClientRect();let best=1;pages().forEach((wr,i)=>{if(wr.getBoundingClientRect().top<=br.top+br.height*.35)best=i+1});return best}
function goPage(n){const wr=pages()[n-1];if(!wr)return;const b=body();b.scrollTop+=wr.getBoundingClientRect().top-b.getBoundingClientRect().top-2}
function loadScript(u){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('Could not load the OCR engine. Connect to the internet once.'));document.head.appendChild(s)})}
function saveFile(name,mime,u8){try{let t='';for(let i=0;i<u8.length;i+=0x8000)t+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));const b=btoa(t);
  if(window.Android&&window.Android.save){window.Android.save(name,mime,b);return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u8],{type:mime}));a.download=name;document.body.appendChild(a);a.click();a.remove()}catch(e){toast('Save failed')}}

// ---------- toolbar + panel ----------
function mount(){
  if($('pvRd'))return;
  const bar=document.createElement('div');bar.id='pvRd';bar.className='pvrd';bar.style.display='none';
  bar.innerHTML='<button data-r="s">🔍 Search</button><button data-r="t">▦ Pages</button><button data-r="b">🔖 Marks</button><button data-r="m">🖊 Markup</button><button data-r="o">🔤 OCR</button>';
  $('pvBody').insertAdjacentElement('afterend',bar);
  const P=document.createElement('div');P.id='pvRdP';P.className='rdp';P.style.display='none';$('pvBox').appendChild(P);
  P.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault()});
  bar.addEventListener('click',e=>{const b=e.target.closest('button');if(b)openPanel({s:'search',t:'thumbs',b:'marks',m:'markup',o:'ocr'}[b.dataset.r])});
  P.addEventListener('click',onPanelClick);
  P.addEventListener('input',onPanelInput);
  new MutationObserver(sync).observe(body(),{childList:true});
  if(window.ResizeObserver)new ResizeObserver(place).observe($('pvBox'));
}
function sync(){const has=pages().length>0,bar=$('pvRd');if(!bar)return;const was=bar.style.display;bar.style.display=has?'flex':'none';if(!has&&R.panel)closePanel();if(was!==bar.style.display&&window.pvFit)window.pvFit()}
function place(){const P=$('pvRdP');if(!P||P.style.display==='none')return;const bx=$('pvBox').getBoundingClientRect(),tb=$('pvRd').getBoundingClientRect();P.style.bottom=Math.max(0,bx.bottom-tb.top)+'px'}
function closePanel(){R.panel='';const P=$('pvRdP');if(P)P.style.display='none';markBar()}
function markBar(){document.querySelectorAll('#pvRd button').forEach(b=>{const k={s:'search',t:'thumbs',b:'marks',m:'markup',o:'ocr'}[b.dataset.r];b.classList.toggle('on',R.panel===k||(k==='markup'&&R.tool!=='hand'))})}
function openPanel(k){if(R.panel===k){closePanel();return}
  R.panel=k;const P=$('pvRdP');P.style.display='block';P.dataset.k=k;
  P.innerHTML=k==='search'?searchHtml():k==='thumbs'?thumbsHtml():k==='marks'?marksHtml():k==='markup'?markupHtml():ocrHtml();
  place();markBar();
  if(k==='search'){const q=$('rdQ');q.value=R.q||'';setTimeout(()=>q.focus(),50)}
  if(k==='thumbs')buildThumbs();
  if(k==='ocr')ocrInit();
}
const hd=(t,extra)=>`<div class="rdp-hd"><b>${t}</b><span class="fl"></span>${extra||''}<button data-x="close">▾</button></div>`;
function onPanelClick(e){const b=e.target.closest('button');if(!b)return;
  if(b.dataset.x==='close'){closePanel();return}
  if(b.dataset.q)return searchNav(b.dataset.q);
  if(b.dataset.th){goPage(+b.dataset.th);closePanel();return}
  if(b.dataset.bm!=null)return bmAct(b);
  if(b.dataset.t)return setTool(b.dataset.t);
  if(b.dataset.c){R.st.c=b.dataset.c;if(R.tool==='hand')setTool('pen');else refreshMarkup();return}
  if(b.dataset.m)return markAct(b.dataset.m);
  if(b.dataset.o)return ocrAct(b.dataset.o);
}
function onPanelInput(e){const t=e.target;
  if(t.id==='rdQ'){clearTimeout(onPanelInput.t);onPanelInput.t=setTimeout(()=>doSearch(t.value),250)}
  else if(t.id==='mkW')R.st.w=+t.value;else if(t.id==='mkO')R.st.o=+t.value/100;
  else if(t.dataset&&t.dataset.ci!=null){R.st.c=t.value;if(R.tool==='hand')setTool('pen')}
  else if(t.id==='ocTx')ocrEdit();
  else if(t.id==='ocQ')ocFind(0,true);
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='rdQ'){e.preventDefault();searchNav('n')}});

// ---------- search ----------
const searchHtml=()=>hd('Search','')+'<div class="rdrow"><input id="rdQ" type="search" placeholder="Find text in this PDF" autocomplete="off"><button data-q="p">▲</button><button data-q="n">▼</button></div><div class="rdinfo" id="rdQc"></div>';
function clearHits(){body().querySelectorAll('.pvhit').forEach(x=>x.classList.remove('pvhit','on'));R.hits=[];R.hi=-1}
function doSearch(q){clearHits();R.q=q;const c=$('rdQc');if(!c)return;q=(q||'').trim().toLowerCase();if(!q){c.textContent='';return}
  const all=[...body().querySelectorAll('.pvtl span')];
  if(!all.length){c.textContent='No selectable text in this PDF. Use OCR first.';return}
  R.hits=all.filter(s=>s.textContent.toLowerCase().includes(q));R.hits.forEach(s=>s.classList.add('pvhit'));
  c.textContent=R.hits.length?R.hits.length+' found':'Not found';if(R.hits.length)searchNav('n')}
function searchNav(d){if(d==='n'&&!R.hits.length&&R.q){doSearch(R.q);return}
  if(!R.hits.length)return;if(R.hi>=0)R.hits[R.hi].classList.remove('on');
  R.hi=(R.hi+(d==='p'?-1:1)+R.hits.length)%R.hits.length;const s=R.hits[R.hi];s.classList.add('on');scrollToEl(s);
  const c=$('rdQc');if(c){const pg=s.dataset.p;c.textContent=(R.hi+1)+' / '+R.hits.length+(pg?' · page '+pg:'')}}

// ---------- thumbnails ----------
const thumbsHtml=()=>hd('Pages · '+pages().length,'')+'<div class="rdth" id="rdTh"></div>';
function buildThumbs(){const g=$('rdTh'),cur=curPage();let chain=Promise.resolve();
  const io=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;const cv=en.target;io.unobserve(cv);
    chain=chain.then(async()=>{const pg=cv._pg;if(!pg)return;const v0=pg.getViewport({scale:1}),sc=cv.width/v0.width;await pg.render({canvasContext:cv.getContext('2d'),viewport:pg.getViewport({scale:sc})}).promise}).catch(()=>{})}),{root:g,rootMargin:'300px'});
  pages().forEach((wr,i)=>{const [W,H]=dim(wr),cell=document.createElement('button');cell.dataset.th=i+1;cell.className='rdtc'+(i+1===cur?' on':'');
    const cv=document.createElement('canvas');cv.width=120;cv.height=Math.round(120*H/W);cv._pg=wr._r&&wr._r.pg;cell.appendChild(cv);const l=document.createElement('span');l.textContent=i+1;cell.appendChild(l);g.appendChild(cell);io.observe(cv)});
  const on=g.querySelector('.on');if(on)setTimeout(()=>{g.scrollTop=on.offsetTop-g.clientHeight/3},30)}

// ---------- bookmarks ----------
const bmKey=()=>'dsPdfBm_'+R.key;
function marksHtml(){const L=LS.get(bmKey(),[]).sort((a,b)=>a.p-b.p),cur=curPage();
  return hd('Bookmarks','<button data-bm="add">＋ Page '+cur+'</button>')+'<div class="rdlist">'+(L.length?L.map((x,i)=>`<div class="rdit"><button data-bm="go" data-i="${i}" class="gt">🔖 Page ${x.p}${x.l?' · '+esc(x.l):''}</button><button data-bm="del" data-i="${i}">✕</button></div>`).join(''):'<div class="rdinfo">No bookmarks yet. Scroll to a page and tap ＋ Page.</div>')+'</div>'}
function bmAct(b){const L=LS.get(bmKey(),[]).sort((a,c)=>a.p-c.p),a=b.dataset.bm;
  if(a==='add'){const p=curPage();if(!L.some(x=>x.p===p))L.push({p,l:'',t:Date.now()});LS.set(bmKey(),L);refreshPanel()}
  else if(a==='go'){goPage(L[+b.dataset.i].p);closePanel()}
  else if(a==='del'){L.splice(+b.dataset.i,1);LS.set(bmKey(),L);refreshPanel()}}
function refreshPanel(){const P=$('pvRdP');if(R.panel==='marks'){P.innerHTML=marksHtml()}}

// ---------- markup ----------
const annKey=()=>'dsPdfAn_'+R.key;let saveT=0;
function saveAn(){clearTimeout(saveT);saveT=setTimeout(()=>LS.set(annKey(),R.A),200)}
function snap(){R.hist.push(JSON.stringify(R.A));if(R.hist.length>60)R.hist.shift();R.redo=[]}
function undo(){if(!R.hist.length)return;R.redo.push(JSON.stringify(R.A));R.A=JSON.parse(R.hist.pop());paintAll();saveAn()}
function redo(){if(!R.redo.length)return;R.hist.push(JSON.stringify(R.A));R.A=JSON.parse(R.redo.pop());paintAll();saveAn()}
function pt(wr,e){const r=wr.getBoundingClientRect(),[W,H]=dim(wr);return[+((e.clientX-r.left)/(r.width||1)*W).toFixed(1),+((e.clientY-r.top)/(r.height||1)*H).toFixed(1)]}
const lines=a=>String(a.text||'').split('\n');
const tbox=a=>{const L=lines(a),fs=a.fs||14,w=Math.max(...L.map(l=>[...l].length),1)*fs*.58+(a.t==='note'?12:4);return[a.x,a.y,w,L.length*fs*1.25+(a.t==='note'?10:2)]};
function shp(a){const c=a.c,o=a.o==null?1:a.o,w=a.w||2,P=a.pts||[];
  const sk=`stroke="${c}" stroke-width="${w}" stroke-opacity="${o}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if(a.t==='pen'||a.t==='pencil'||a.t==='mk'){if(!P.length)return'';const d=P.length<2?`M${P[0][0]} ${P[0][1]}l.1 .1`:P.map((q,i)=>(i?'L':'M')+q[0]+' '+q[1]).join('');return`<path d="${d}" ${sk}${a.t==='mk'?' style="mix-blend-mode:multiply"':''}/>`}
  if(a.t==='line'&&P[1])return`<line x1="${P[0][0]}" y1="${P[0][1]}" x2="${P[1][0]}" y2="${P[1][1]}" ${sk}/>`;
  if(a.t==='arrow'&&P[1]){const [x1,y1]=P[0],[x2,y2]=P[1],an=Math.atan2(y2-y1,x2-x1),L=8+w*2,p=k=>`${(x2-L*Math.cos(an+k)).toFixed(1)},${(y2-L*Math.sin(an+k)).toFixed(1)}`;return`<g ${sk}><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polyline points="${p(.45)} ${x2},${y2} ${p(-.45)}"/></g>`}
  if(a.t==='rect'&&P[1])return`<rect x="${Math.min(P[0][0],P[1][0])}" y="${Math.min(P[0][1],P[1][1])}" width="${Math.abs(P[0][0]-P[1][0])}" height="${Math.abs(P[0][1]-P[1][1])}" ${sk}/>`;
  if(a.t==='oval'&&P[1])return`<ellipse cx="${(P[0][0]+P[1][0])/2}" cy="${(P[0][1]+P[1][1])/2}" rx="${Math.abs(P[0][0]-P[1][0])/2}" ry="${Math.abs(P[0][1]-P[1][1])/2}" ${sk}/>`;
  if(a.t==='hl')return(a.rects||[]).map(r=>`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${c}" fill-opacity="${o}" style="mix-blend-mode:multiply"/>`).join('');
  if(a.t==='ul'||a.t==='st')return(a.rects||[]).map(r=>{const y=a.t==='ul'?r[1]+r[3]-1:r[1]+r[3]/2;return`<line x1="${r[0]}" y1="${y}" x2="${r[0]+r[2]}" y2="${y}" stroke="${c}" stroke-width="${w}"/>`}).join('');
  if(a.t==='text'||a.t==='note'){const fs=a.fs||14,L=lines(a),b=tbox(a),tx=(a.t==='note'?6:2),ty=(a.t==='note'?5:0);
    return(a.t==='note'?`<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="3" fill="${c}" stroke="rgba(0,0,0,.25)"/>`:'')+L.map((l,i)=>`<text x="${a.x+tx}" y="${a.y+ty+fs*(1.05+i*1.25)}" font-size="${fs}" font-family="Arial,sans-serif" fill="${a.t==='note'?'#222':c}">${esc(l)}</text>`).join('')}
  return''}
function paint(pi){const wr=pages()[pi-1];if(!wr)return;const s=wr.querySelector('svg.pva');if(!s)return;s.innerHTML=R.A.filter(a=>a.p===pi).map(shp).join('')+(R.dr&&R.dr.p===pi?shp(R.dr.a):'')}
function paintAll(){pages().forEach((_,i)=>paint(i+1))}
function segD(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;let t=l?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function hit(a,x,y,pd){const q=[x,y],P=a.pts||[],inb=(r,p)=>x>=r[0]-p&&x<=r[0]+r[2]+p&&y>=r[1]-p&&y<=r[1]+r[3]+p;
  if(a.t==='pen'||a.t==='pencil'||a.t==='mk'){const t=Math.max((a.w||2)/2+pd,8);if(P.length<2)return Math.hypot(x-P[0][0],y-P[0][1])<t;for(let i=1;i<P.length;i++)if(segD(q,P[i-1],P[i])<t)return true;return false}
  if(a.t==='line'||a.t==='arrow')return P[1]&&segD(q,P[0],P[1])<Math.max((a.w||2)/2+pd,8);
  if(a.t==='rect'||a.t==='oval'){if(!P[1])return false;return inb([Math.min(P[0][0],P[1][0]),Math.min(P[0][1],P[1][1]),Math.abs(P[0][0]-P[1][0]),Math.abs(P[0][1]-P[1][1])],pd)}
  if(a.t==='text'||a.t==='note')return inb(tbox(a),pd);
  return(a.rects||[]).some(r=>inb(r,pd))}
function askText(init,ok,del){let d=$('pvTxD');if(!d){d=document.createElement('div');d.id='pvTxD';d.innerHTML='<div class="bx"><textarea rows="4" placeholder="Type text…"></textarea><div class="rw"><button class="alt" data-k="d" style="display:none">Delete</button><span class="fl"></span><button class="alt" data-k="c">Cancel</button><button data-k="o">OK</button></div></div>';document.body.appendChild(d)}
  const ta=d.querySelector('textarea'),dl=d.querySelector('[data-k=d]');ta.value=init||'';dl.style.display=del?'':'none';d.style.display='flex';setTimeout(()=>ta.focus(),50);
  d.onclick=e=>{const k=e.target.closest('button');if(!k&&e.target!==d)return;const a=k&&k.dataset.k;if(a==='o'){const v=ta.value.trim();d.style.display='none';ok(v)}else if(a==='d'){d.style.display='none';del()}else if(a==='c'||e.target===d)d.style.display='none'}}
function bindLayer(svg,wr,pi){
  svg.addEventListener('pointerdown',e=>{if(R.tool==='hand')return;e.preventDefault();e.stopPropagation();const q=pt(wr,e),t=R.tool;
    if(t==='er'){snap();R.erasing=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}eraseAt(pi,q);return}
    if(t==='text'||t==='note'){const h=R.A.slice().reverse().find(a=>a.p===pi&&(a.t==='text'||a.t==='note')&&hit(a,q[0],q[1],6));
      if(h)askText(h.text,v=>{snap();if(v)h.text=v;else R.A=R.A.filter(x=>x!==h);paint(pi);saveAn()},()=>{snap();R.A=R.A.filter(x=>x!==h);paint(pi);saveAn()});
      else askText('',v=>{if(!v)return;snap();R.A.push({id:R.id++,p:pi,t,x:q[0],y:q[1],c:t==='note'?'#ffd54f':R.st.c,fs:Math.round(10+R.st.w),text:v});paint(pi);saveAn()});return}
    try{svg.setPointerCapture(e.pointerId)}catch(_){}
    R.dr={p:pi,a:{p:pi,t,c:R.st.c,o:R.st.o,w:t==='mk'?R.st.w:R.st.w,pts:[q]}};paint(pi)});
  svg.addEventListener('pointermove',e=>{if(R.tool==='hand')return;
    if(R.erasing){eraseAt(pi,pt(wr,e));return}
    if(!R.dr||R.dr.p!==pi)return;e.preventDefault();const q=pt(wr,e),a=R.dr.a;
    if(a.t==='pen'||a.t==='pencil'||a.t==='mk')a.pts.push(q);else a.pts[1]=q;
    if(!R.raf)R.raf=requestAnimationFrame(()=>{R.raf=0;if(R.dr)paint(R.dr.p)})});
  const end=()=>{if(R.erasing){R.erasing=false;saveAn();return}
    if(!R.dr||R.dr.p!==pi)return;const a=R.dr.a;R.dr=null;const P=a.pts;
    const shape=!(a.t==='pen'||a.t==='pencil'||a.t==='mk');
    if(shape&&(!P[1]||Math.hypot(P[1][0]-P[0][0],P[1][1]-P[0][1])<4)){paint(pi);return}
    snap();a.id=R.id++;R.A.push(a);paint(pi);saveAn()};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end)}
function eraseAt(pi,q){const n=R.A.length;R.A=R.A.filter(a=>!(a.p===pi&&hit(a,q[0],q[1],6)));if(R.A.length!==n)paint(pi)}
function buildLayers(){pages().forEach((wr,i)=>{if(wr.querySelector('svg.pva'))return;const [W,H]=dim(wr),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','pva');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('preserveAspectRatio','none');wr.appendChild(svg);bindLayer(svg,wr,i+1)});paintAll();layerMode()}
function layerMode(){const on=R.tool!=='hand';body().querySelectorAll('svg.pva').forEach(s=>{s.style.pointerEvents=on?'auto':'none';s.style.touchAction=on?'none':'auto'});body().classList.toggle('pvanhide',R.hide);body().classList.toggle('pvdraw',on)}
function setTool(t){R.tool=t;const T=TOOLS[t]||{};if(T.w!=null)R.st.w=T.w;if(T.o!=null)R.st.o=T.o;if(t==='text'||t==='note')R.st.w=Math.max(R.st.w,4);layerMode();refreshMarkup();markBar()}
function markupHtml(){const t=R.tool,tb=Object.entries(TOOLS).map(([k,v])=>`<button data-t="${k}" class="${t===k?'on':''}" title="${v.n}">${v.i} ${v.n}</button>`).join('');
  return hd('Markup','')+`<div class="rdrow rds"><button data-t="hand" class="${t==='hand'?'on':''}">✋ Read</button>${tb}</div>
  <div class="rdrow">${SW.map(c=>`<button data-c="${c}" class="sw${R.st.c===c?' on':''}" style="background:${c}"></button>`).join('')}<input type="color" data-ci value="${R.st.c}"></div>
  <div class="rdrow"><label>Size <input type="range" id="mkW" min="1" max="30" step=".5" value="${R.st.w}"></label><label>Opacity <input type="range" id="mkO" min="10" max="100" value="${Math.round(R.st.o*100)}"></label></div>
  <div class="rdrow rds"><button data-m="hl">Highlight text</button><button data-m="ul">Underline</button><button data-m="st">Strike</button><button data-m="un">↶ Undo</button><button data-m="re">↷ Redo</button><button data-m="hd">${R.hide?'Show':'Hide'} all</button></div>
  <div class="rdinfo">${t==='hand'?'Select text on the page, then tap Highlight / Underline / Strike. Or pick a tool to draw.':'Drawing is on. Tap ✋ Read to scroll again. Tap a text or note with the Text/Note tool to edit it.'}</div>`}
function refreshMarkup(){if(R.panel==='markup'){const P=$('pvRdP');P.innerHTML=markupHtml();place()}}
function markAct(m){if(m==='un')return undo();if(m==='re')return redo();
  if(m==='hd'){R.hide=!R.hide;layerMode();refreshMarkup();return}
  const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount){toast('Select some text on the page first');return}
  const rects=[...s.getRangeAt(0).getClientRects()],per={};
  pages().forEach((wr,i)=>{const pr=wr.getBoundingClientRect(),[W]=dim(wr),k=W/(pr.width||1);
    rects.forEach(r=>{if(r.width<1||r.height<1)return;const cx=r.left+r.width/2,cy=r.top+r.height/2;if(cx<pr.left||cx>pr.right||cy<pr.top||cy>pr.bottom)return;
      (per[i+1]=per[i+1]||[]).push([(r.left-pr.left)*k,(r.top-pr.top)*k,r.width*k,r.height*k].map(v=>+v.toFixed(1)))})});
  const ks=Object.keys(per);if(!ks.length){toast('Select text on the page');return}
  snap();const col=(m==='hl'&&R.st.c==='#e53935')?'#ffe600':R.st.c;
  ks.forEach(p=>R.A.push({id:R.id++,p:+p,t:m,c:col,o:m==='hl'?Math.min(R.st.o,.45):1,w:1.6,rects:per[p]}));
  s.removeAllRanges();paintAll();saveAn()}

// ---------- OCR ----------
const ocKey=()=>'dsPdfOcr_'+R.key;
function ocrHtml(){const n=pages().length;
  return hd('OCR · read text','')+`<div class="rdrow"><select id="ocLg"><option value="eng">English</option><option value="ben+eng">বাংলা + English</option><option value="ben">বাংলা</option></select><input id="ocPr" placeholder="Pages: 1-3,5" value="${curPage()}" style="max-width:110px"><button data-o="cur">This</button><button data-o="all">All ${n}</button></div>
  <div class="rdrow"><button data-o="go" id="ocGo">Read text</button><button data-o="stop" id="ocStop" class="alt" style="display:none">Stop</button><span class="rdinfo" id="ocSt" style="flex:1">Choose pages and language, then tap Read text. Needs internet the first time.</span></div>
  <div class="ocwrap" id="ocWrap"><div class="ocim" id="ocImW" style="display:none"><img id="ocIm" alt=""></div><textarea id="ocTx" rows="7" placeholder="Recognized text appears here. You can edit it."></textarea></div>
  <div class="rdrow"><label class="rdck"><input type="checkbox" id="ocCm"> Compare with scan</label><select id="ocSel" style="display:none"></select></div>
  <div class="rdrow"><input id="ocQ" type="search" placeholder="Find in recognized text"><button data-o="fp">▲</button><button data-o="fn">▼</button><span id="ocQc" class="rdinfo"></span></div>
  <div class="rdrow rds"><button data-o="cp">Copy</button><button data-o="txt">TXT</button><button data-o="docx">DOCX</button></div>`}
function ocrInit(){const t=$('ocTx');R.cmp=false;fillOcr()}
function ocText(){const ks=Object.keys(R.ocr).map(Number).sort((a,b)=>a-b);return ks.map(k=>'=== Page '+k+' ===\n'+R.ocr[k]).join('\n\n')}
function fillOcr(){const tx=$('ocTx');if(!tx)return;const ks=Object.keys(R.ocr).map(Number).sort((a,b)=>a-b),sel=$('ocSel'),cm=$('ocCm');
  if(R.cmp&&!ks.length)R.cmp=false;if(cm)cm.checked=R.cmp;
  if(R.cmp){if(!ks.includes(R.sel))R.sel=ks[0];sel.innerHTML=ks.map(k=>`<option value="${k}"${k===R.sel?' selected':''}>Page ${k}</option>`).join('');sel.style.display='';
    tx.value=R.ocr[R.sel]||'';showScan(R.sel)}
  else{sel.style.display='none';tx.value=ocText();$('ocImW').style.display='none';$('ocWrap').classList.remove('cmp')}}
async function showScan(p){const w=$('ocImW');w.style.display='';$('ocWrap').classList.add('cmp');
  if(!R.img[p]){try{R.img[p]=thumb(await pageCanvas(p))}catch(e){}}$('ocIm').src=R.img[p]||''}
function ocrEdit(){const tx=$('ocTx');if(R.cmp){R.ocr[R.sel]=tx.value}else{const parts=tx.value.split(/^=== Page (\d+) ===[ \t]*\r?\n?/m);for(let i=1;i<parts.length;i+=2)R.ocr[parts[i]]=(parts[i+1]||'').replace(/\n+$/,'')}saveOcr()}
function saveOcr(){LS.set(ocKey(),R.ocr)}
function parseRange(t,n,cur){t=(t||'').trim().toLowerCase();if(!t||t==='current'||t==='this')return[cur];if(t==='all')return[...Array(n)].map((_,i)=>i+1);
  const out=new Set();t.split(/[,\s]+/).forEach(x=>{const m=x.match(/^(\d+)(?:-(\d+))?$/);if(!m)return;let a=+m[1],b=+(m[2]||m[1]);if(a>b)[a,b]=[b,a];for(let i=Math.max(1,a);i<=Math.min(n,b);i++)out.add(i)});return[...out].sort((a,b)=>a-b)}
async function pageCanvas(p){const wr=pages()[p-1],pg=wr._r.pg,v0=pg.getViewport({scale:1}),sc=Math.min(3,Math.max(1.5,1700/v0.width)),v=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:v}).promise;return c}
function thumb(c){const k=Math.min(1,800/c.width),t=document.createElement('canvas');t.width=Math.round(c.width*k);t.height=Math.round(c.height*k);t.getContext('2d').drawImage(c,0,0,t.width,t.height);return t.toDataURL('image/jpeg',.7)}
async function ocrRun(){const st=$('ocSt'),list=parseRange($('ocPr').value,pages().length,curPage());if(!list.length){st.textContent='Page number not valid.';return}
  R.stop=false;$('ocGo').disabled=true;$('ocStop').style.display='';let wk=null,cur=0;
  try{st.textContent='Starting OCR…';if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    wk=await Tesseract.createWorker($('ocLg').value,1,{logger:m=>{const s=$('ocSt');if(s&&m&&m.status&&cur)s.textContent='Page '+cur+': '+m.status.replace(/_/g,' ')+(m.progress?' '+Math.round(m.progress*100)+'%':'')}});
    for(let k=0;k<list.length;k++){if(R.stop)break;cur=list[k];if($('ocSt'))$('ocSt').textContent='Page '+cur+' ('+(k+1)+'/'+list.length+')…';
      const c=await pageCanvas(cur);R.img[cur]=thumb(c);const r=await wk.recognize(c);R.ocr[cur]=(r.data.text||'').trim()||'(no text found)';saveOcr();if(R.panel==='ocr')fillOcr()}
    if($('ocSt'))$('ocSt').textContent=R.stop?'Stopped.':'Done. Edit the text if needed, then Copy, TXT or DOCX.'}
  catch(e){if($('ocSt'))$('ocSt').textContent='OCR failed: '+(e&&e.message||e)}
  finally{try{wk&&await wk.terminate()}catch(_){}const g=$('ocGo');if(g)g.disabled=false;const s=$('ocStop');if(s)s.style.display='none'}}
let fi=[],fp=-1;
function ocFind(d,fresh){const tx=$('ocTx'),q=($('ocQ').value||'').toLowerCase(),c=$('ocQc');if(!q){c.textContent='';fi=[];return}
  if(fresh||!fi.length||fi.q!==q){fi=[];const v=tx.value.toLowerCase();let i=-1;while((i=v.indexOf(q,i+1))>=0)fi.push(i);fi.q=q;fp=-1}
  if(!fi.length){c.textContent='Not found';return}
  if(fresh){c.textContent=fi.length+' found';return}
  fp=(fp+d+fi.length)%fi.length;c.textContent=(fp+1)+' / '+fi.length;tx.readOnly=true;tx.focus();tx.setSelectionRange(fi[fp],fi[fp]+q.length);setTimeout(()=>{tx.readOnly=false},1500)}
const xe=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function mkDocx(text){await need('zip');const Z=new JSZip();
  const ps=text.split(/\r?\n/).map(l=>l===''?'<w:p/>':'<w:p><w:r><w:t xml:space="preserve">'+xe(l)+'</w:t></w:r></w:p>').join('');
  Z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  Z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  Z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+ps+'<w:sectPr/></w:body></w:document>');
  return await Z.generateAsync({type:'uint8array'})}
window.__pvMkDocx=mkDocx;
async function ocrAct(a){
  if(a==='cur'){$('ocPr').value=curPage();return}
  if(a==='all'){$('ocPr').value='all';return}
  if(a==='go')return ocrRun();
  if(a==='stop'){R.stop=true;return}
  if(a==='fp')return ocFind(-1);if(a==='fn')return ocFind(1);
  const t=$('ocTx').value;
  if(a==='cp'){if(!t.trim()){toast('Nothing to copy');return}try{await navigator.clipboard.writeText(t)}catch(e){const x=document.createElement('textarea');x.value=t;x.style.cssText='position:fixed;left:-9999px';document.body.appendChild(x);x.select();try{document.execCommand('copy')}catch(_){}x.remove()}toast('Copied');return}
  if(!t.trim()){toast('No text yet');return}
  if(a==='txt'){saveFile(baseName()+'-ocr.txt','text/plain',new TextEncoder().encode(t));return}
  if(a==='docx'){try{saveFile(baseName()+'-ocr.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',await mkDocx(t))}catch(e){toast(e.message||'DOCX failed')}}}
document.addEventListener('change',e=>{const t=e.target;if(t.id==='ocCm'){R.cmp=t.checked;fillOcr()}else if(t.id==='ocSel'){R.sel=+t.value;fillOcr()}});

// ---------- hook into PDF load ----------
document.addEventListener('pvpdf',()=>{mount();
  R.key=fileKey();R.A=LS.get(annKey(),[]);R.id=R.A.reduce((m,a)=>Math.max(m,a.id||0),0)+1;R.hist=[];R.redo=[];R.tool='hand';R.dr=null;R.erasing=false;
  R.ocr=LS.get(ocKey(),{});R.img={};R.q='';R.hits=[];R.hi=-1;R.cmp=false;
  closePanel();buildLayers();sync();if(window.pvFit)window.pvFit()});
mount();
})();
