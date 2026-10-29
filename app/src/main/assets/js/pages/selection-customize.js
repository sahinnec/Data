function selEnter(rs){selMode=true;selSet.clear();rs.forEach(r=>selSet.add(r));selRow=null;selGrp=null;selConf='';editIdx=-1;render();selUI()}
function selExit(){selMode=false;selSet.clear();selConf='';render();selUI()}
$('list').onclick=e=>{
  const b=e.target.closest('button[data-a]');
  if(e.target.closest('.gtools')&&!b)return;
  if(!b&&selMode){
    const sm=e.target.closest('.item.sum[data-g]');
    if(sm){const k=sm.dataset.g,L=rows.filter(r=>!r.__net&&nameKeyG(r)===k);if(L.every(r=>selSet.has(r)))L.forEach(r=>selSet.delete(r));else L.forEach(r=>selSet.add(r));selConf='';render();selUI();return}
    const it=e.target.closest('.item');if(!it||it.dataset.i===undefined)return;
    const r=rows[+it.dataset.i];if(!r||r.__net)return;if(selSet.has(r))selSet.delete(r);else selSet.add(r);selConf='';render();selUI();return;
  }
  if(!b){
    if(e.target.closest('.eform'))return;
    const itd=e.target.closest('.item');
    if(itd&&!itd.classList.contains('ed')&&(itd.dataset.i!==undefined||itd.dataset.g!==undefined)){
      const isG=itd.classList.contains('sum')&&itd.dataset.g!==undefined,key=isG?'g:'+itd.dataset.g:'i:'+itd.dataset.i,now=Date.now();
      if(window.__lt&&window.__lt.k===key&&now-window.__lt.t<420){window.__lt=null;
        const rs=isG?rows.filter(r=>!r.__net&&nameKeyG(r)===itd.dataset.g):(()=>{const r=rows[+itd.dataset.i];return r&&!r.__net?[r]:[]})();
        if(rs.length){selEnter(rs);return}}
      else window.__lt={k:key,t:now}}
    const sm=e.target.closest('.item.sum[data-g]');
    if(sm){const k=sm.dataset.g;gstate[k]=!(gstate[k]!==undefined?gstate[k]:!!design.gcol);render();return}
    const it=e.target.closest('.item');if(!it||it.dataset.i===undefined)return;
    const r=rows[+it.dataset.i];if(!r||r.__net)return;selRow=selRow===r?null:r;render();return;
  }
  const a=b.dataset.a;
  if(a==='gm'){const k=b.dataset.k;selGrp=selGrp===k?null:k;selConf='';render();return}
  if(a==='gr'){const k=b.dataset.k,inp=b.parentNode.querySelector('.gtin'),nn=(inp.value||'').trim();if(!nn||nn.toUpperCase()===k)return;allOf(k).forEach(r=>setCell(r,map.n,nn));selGrp=null;selConf='';refresh();return}
  if(a==='gx'){const k=b.dataset.k;if(selConf!=='x:'+k){selConf='x:'+k;render();return}delRows(allOf(k));return}
  if(a==='gs'){const k=b.dataset.k;selMode=true;selSet.clear();rows.filter(r=>!r.__net&&nameKeyG(r)===k).forEach(r=>selSet.add(r));selGrp=null;selConf='';render();selUI();return}
  if(a==='x')delRow(rows[+b.dataset.i]);
  else if(a==='e'){editIdx=+b.dataset.i;render()}
  else if(a==='c'){editIdx=-1;render()}
  else if(a==='s')saveEdit(b.closest('.item'));
};
(function(){const Lc=$('list');let tm=null,sx=0,sy=0,sup=0;const cl=()=>{clearTimeout(tm);tm=null};
  Lc.addEventListener('pointerdown',e=>{if(selMode||e.button>0)return;const it=e.target.closest('.item');if(!it||it.classList.contains('ed')||e.target.closest('button,input,select,textarea,.eform,.gtools'))return;
    sx=e.clientX;sy=e.clientY;cl();
    tm=setTimeout(()=>{tm=null;const isG=it.classList.contains('sum')&&it.dataset.g!==undefined;
      const rs=isG?rows.filter(r=>!r.__net&&nameKeyG(r)===it.dataset.g):(it.dataset.i!==undefined&&rows[+it.dataset.i]&&!rows[+it.dataset.i].__net?[rows[+it.dataset.i]]:[]);
      if(rs.length){sup=Date.now();try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}selEnter(rs)}},480)});
  ['pointerup','pointercancel','pointerleave'].forEach(t=>Lc.addEventListener(t,cl));
  Lc.addEventListener('pointermove',e=>{if(tm&&(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10))cl()});
  Lc.addEventListener('click',e=>{if(Date.now()-sup<700){e.stopImmediatePropagation();e.preventDefault()}},true);
  Lc.addEventListener('contextmenu',e=>{if(e.target.closest('.item'))e.preventDefault()});
})();
$('addB').onclick=()=>{
  const b=$('addbox');const open=b.style.display==='none';
  b.style.display=open?'flex':'none';
  if(open&&!$('aD').value)$('aD').value=$('dflt').value;
};
$('aNo').onclick=()=>{$('addbox').style.display='none'};
$('aOK').onclick=()=>{
  const n=$('aN').value.trim(),p=$('aP').value.trim();
  if(!n||!p){$('msg').textContent='Name and price are required.';return}
  manual.push({d:$('aD').value,n,q:$('aQ').value.trim(),p,t:$('aT').value,x:collectX($('axf'))});clearX($('axf'));
  $('aN').value='';$('aQ').value='';$('aP').value='';
  $('msg').textContent='';
  refresh();
};
$('pSel').onchange=()=>switchTo(+$('pSel').value);
$('pNew').onclick=()=>{const b=$('pbox');const open=b.style.display==='none';b.style.display=open?'flex':'none';if(open)$('pn').focus()};
$('pNo').onclick=()=>{$('pbox').style.display='none'};
$('pMenu').onclick=()=>{const m=$('pmenu');m.style.display=m.style.display==='none'?'flex':'none'};
$('pOK').onclick=()=>{
  const n=$('pn').value.trim()||('Project '+(projects.length+1));
  sync();projects.push({name:n,store:[],manual:[]});
  $('pn').value='';$('pbox').style.display='none';
  switchTo(projects.length-1);
};
$('pn').onkeydown=e=>{if(e.key==='Enter')$('pOK').click()};
let delArm=false,delTimer=null;
$('pDel').onclick=()=>{
  if(!delArm){delArm=true;$('pDel').textContent='Sure?';delTimer=setTimeout(()=>{delArm=false;$('pDel').textContent='Delete project'},3000);return}
  clearTimeout(delTimer);delArm=false;$('pDel').textContent='Delete project';$('pmenu').style.display='none';
  projects.splice(pi,1);
  if(!projects.length)projects.push({name:'Project 1',store:[],manual:[]});
  pi=Math.min(pi,projects.length-1);
  store=projects[pi].store;manual=projects[pi].manual;fields=projects[pi].fields=Array.isArray(projects[pi].fields)?projects[pi].fields.map(String):[];fsrc=projects[pi].fsrc=(projects[pi].fsrc&&typeof projects[pi].fsrc==='object')?projects[pi].fsrc:{};
  selD.clear();selRow=null;editIdx=-1;hkey='';tf='all';$('mF').value='all';$('msg').textContent='';
  merge();
};
try{
  const j=JSON.parse(localStorage.getItem('ds_projects_v1')||'null');
  if(j&&Array.isArray(j.projects)&&j.projects.length){
    projects=j.projects;
    projects.forEach(p=>{p.name=String(p.name||'Project');p.store=(Array.isArray(p.store)?p.store:[]).filter(s=>s&&Array.isArray(s.header)&&Array.isArray(s.rows));p.manual=Array.isArray(p.manual)?p.manual:[]});
    pi=Math.min(Math.max(0,j.pi|0),projects.length-1);
    store=projects[pi].store;manual=projects[pi].manual;fields=projects[pi].fields=Array.isArray(projects[pi].fields)?projects[pi].fields.map(String):[];fsrc=projects[pi].fsrc=(projects[pi].fsrc&&typeof projects[pi].fsrc==='object')?projects[pi].fsrc:{};
  }
}catch(e){}
renderProjects();
if(store.length||manual.length)merge();
(function(){try{const j=JSON.parse(localStorage.getItem(DKEY)||'null');if(j&&typeof j==='object')Object.assign(design,j)}catch(e){}})();
applyDesign();if(rows.length)render();
const cfSync=()=>{const c=$('cust'),o=c.style.display!=='none';document.body.classList.toggle('cfl',o);if(o)document.documentElement.style.setProperty('--cfh',c.offsetHeight+'px')};
const cfSet=open=>{
  const c=$('cust');
  c.style.display=open?'block':'none';
  
  if(open){c.classList.remove('min');$('cMin').textContent='▾';if(!$('ceD').value)$('ceD').value=$('dflt').value;let t='data';try{t=localStorage.getItem('ds_ctab')||'data'}catch(e){}if(!PANELS[t])t='data';cTab(t)}
  cfSync();
};
$('custB').onclick=()=>cfSet($('cust').style.display==='none');
$('cX').onclick=()=>cfSet(false);
$('cMin').onclick=()=>{const c=$('cust');c.classList.toggle('min');$('cMin').textContent=c.classList.contains('min')?'▴':'▾';cfSync()};
try{new ResizeObserver(cfSync).observe($('cust'))}catch(e){}
window.addEventListener('resize',cfSync);
(function(){
  const h=$('chd'),c=$('cust');let drag=false;
  h.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag=true;try{h.setPointerCapture(e.pointerId)}catch(_){}});
  h.addEventListener('pointermove',e=>{if(!drag)return;c.classList.remove('min');$('cMin').textContent='▾';const px=Math.max(110,Math.min(window.innerHeight*.86,window.innerHeight-e.clientY-6));c.style.setProperty('--cfh0',px+'px');cfSync()});
  const end=()=>{drag=false};h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
})();
const PANELS={look:'cp_look',theme:'cp_theme',data:'cdata',design:'cp_design',colors:'cp_colors',card:'cp_card',list:'cp_list',adv:'cp_adv'};
function cTab(t){
  document.querySelectorAll('#cust .tabs button').forEach(x=>x.classList.toggle('on',x.dataset.t===t));
  Object.keys(PANELS).forEach(k=>{$(PANELS[k]).style.display=k===t?'block':'none'});
  try{localStorage.setItem('ds_ctab',t)}catch(e){}
  cfSync();
  if(t==='data'){renderCtab();try{renderShowUI();renderDsOpts()}catch(e){}}
  else{renderDesignUI();if(t==='adv')renderAdv();if(t==='look')renderPresets()}
}
document.querySelectorAll('#cust .tabs button').forEach(b=>b.onclick=()=>{cTab(b.dataset.t);b.scrollIntoView({block:'nearest',inline:'nearest'})});
(function(){const sc=()=>{let v='auto';try{v=localStorage.getItem('ds_scheme_v1')||'auto'}catch(e){}return v};
  const ap=v=>{const r=document.documentElement;if(v==='light'||v==='dark')r.setAttribute('data-theme',v);else r.removeAttribute('data-theme')};
  ap(sc());const el=$('dTheme');if(el){el.value=sc();el.onchange=()=>{try{localStorage.setItem('ds_scheme_v1',el.value)}catch(e){}ap(el.value)}}})();
$('updB').onclick=()=>{try{window.Android.openUpdater()}catch(e){}};
(function(){const ok=!!(window.Android&&window.Android.openUpdater);$('updB').style.display=ok?'':'none';$('updNA').style.display=ok?'none':'block'})();
(function(){
  let h=false;try{h=localStorage.getItem('ds_ctrlhid')==='1'}catch(e){}
  const ap=()=>{$('ctrlBox').classList.toggle('hid',h);$('ctrlT').textContent=h?'▸':'▾';};
  ap();
  const tg=()=>{h=!h;try{localStorage.setItem('ds_ctrlhid',h?'1':'0')}catch(e){}ap()};
  $('ctrlT').onclick=tg;
})();
$('ctab').onchange=e=>{
  const inp=e.target;if(!inp.dataset||(!inp.dataset.c&&!inp.dataset.cx))return;
  const row=baseRows[+inp.closest('tr').dataset.i];if(!row)return;
  const y=$('ctab').scrollTop;
  if(inp.dataset.cx)setFval(row,inp.dataset.cx,inp.value.trim());else if(inp.dataset.c==='t'){if(inp.value!==tyVal(typeOf(row)))setType(row,inp.value)}else setCell(row,{d:map.d,n:map.n,q:map.q,p:map.p}[inp.dataset.c],inp.value.trim());
  refresh();renderCtab();$('ctab').scrollTop=y;
};
$('ctab').onclick=e=>{
  const b=e.target.closest('button[data-x]');if(!b)return;
  const row=baseRows[+b.dataset.x];if(!row)return;
  const y=$('ctab').scrollTop;
  delRow(row);renderCtab();$('ctab').scrollTop=y;
};
$('ceAdd').onclick=()=>{
  const n=$('ceN').value.trim(),p=$('ceP').value.trim();
  if(!n||!p){$('msg').textContent='Name and price are required.';return}
  manual.push({d:$('ceD').value,n,q:$('ceQ').value.trim(),p,t:$('ceT').value,x:collectX($('cxf'))});clearX($('cxf'));
  ['ceN','ceQ','ceP'].forEach(id=>{$(id).value=''});
  $('msg').textContent='';refresh();
};
[['dCard','card'],['dPrice','price'],['dSum','sum'],['dSize','size'],['dCorner','corner'],['dShadow','shadow'],['dTpos','tpos'],['sOn','sOn'],['dBuy','buy'],['dGcol','gcol'],['dFc','fcols'],['dFst','fst'],['dPgs','pgs'],['dLay','lay'],['dFont','font'],['dTot','tot'],['dTotm','tmode'],['dQlbl','qlbl'],['dPer','per'],['dPager','pager']].forEach(([id,k])=>{
  $(id).onchange=()=>{design[k]=k==='gcol'?$(id).value==='true':(k==='fcols'?+$(id).value:$(id).value);if(k==='gcol'||k==='tpos')gstate={};if(k==='per')page=0;saveDesign();applyDesign();if(rows.length)render()};
});
$('dReset').onclick=()=>{design={card:'group',price:'group',sum:'modern',size:'m',corner:'round',shadow:'on',all:null,names:{},style:1,tpos:'top',buy:'mid',gcol:false,fcols:5,fcV:3,lay:'ds',font:'auto',tot:'col',tmode:'net',qlbl:'Quantity',per:'20',pager:'show',show:{}};saveDesign();applyDesign();renderShowUI();if(rows.length)render();if(rows.length)refresh()};
$('cshow').addEventListener('change',e=>{const k=e.target&&e.target.dataset&&e.target.dataset.sk;if(!k)return;design.show=design.show||{};design.show[k]=e.target.checked;saveDesign();if(rows.length)render()});
try{cpWire()}catch(er){console.error(er)}
$('cpal').onclick=e=>{const b=e.target.closest('button[data-i]');if(!b)return;design.all=+b.dataset.i;designChanged()};
$('cAuto').onclick=()=>{design.all=null;designChanged()};
$('cnames').onchange=e=>{const s=e.target;if(!s.dataset||s.dataset.k===undefined)return;if(s.value==='')delete design.names[s.dataset.k];else design.names[s.dataset.k]=+s.value;designChanged()};
(function(){try{const j=JSON.parse(localStorage.getItem(TKEY)||'null');if(j&&typeof j==='object')TH=Object.assign({},THD,j)}catch(e){}})();
applyTheme();
function advEvt(e){
  const t=e.target,k=t&&t.dataset&&t.dataset.k;if(!k||!(k in THD))return;
  if(t.type==='radio'){if(!t.checked)return;TH[k]=t.value}
  else if(t.type==='checkbox')TH[k]=t.checked;
  else if(t.type==='range'){TH[k]=+t.value;const sp=t.parentElement.querySelector('.val');if(sp)sp.textContent=t.value+(t.dataset.u||'')}
  else TH[k]=t.value;
  thChanged();
}
$('cadv').addEventListener('input',advEvt);
$('cadv').addEventListener('change',advEvt);
$('cquick').addEventListener('input',advEvt);
$('cquick2').addEventListener('input',advEvt);
$('cquick2').addEventListener('change',advEvt);
$('cadv').addEventListener('click',e=>{if(e.target&&e.target.id==='thReset'){TH=Object.assign({},THD);saveTheme();applyTheme();renderAdv();if(rows.length)render()}});
$('addbox').addEventListener('click',fieldEvt);
$('cdata').addEventListener('click',fieldEvt);
fieldUI();
$('fbox').onchange=e=>{
  const s=e.target;if(!s.dataset||s.dataset.fs===undefined)return;
  const f=s.dataset.fs;
  if(s.value)fsrc[f]=s.value;else{delete fsrc[f];ensureX(f)}
  afterFieldChange();
};
try{const j=JSON.parse(localStorage.getItem(PRKEY)||'null');if(j&&typeof j==='object')presets=j}catch(e){}
$('cpre').addEventListener('click',e=>{
  if(e.target.id==='pSave'){
    const n=($('pName').value||'').trim().slice(0,30);
    if(!n){$('msg').textContent='Type a preset name first.';return}
    $('msg').textContent='';
    presets[n]={design:JSON.parse(JSON.stringify(design)),TH:Object.assign({},TH)};
    savePresets();renderPresets();return;
  }
  const a=e.target.closest('button[data-pa]'),d=e.target.closest('button[data-pd]');
  if(a)applyPreset(a.dataset.pa);
  else if(d){delete presets[d.dataset.pd];savePresets();renderPresets()}
});
renderPresets();
$('expB').onclick=e=>{e.stopPropagation();const m=$('expMenu');m.style.display=m.style.display==='none'?'flex':'none'};
document.addEventListener('click',()=>{$('expMenu').style.display='none'});
$('xcsv').onclick=()=>{
  const lines=[header.map(h=>csvEsc(String(h).replace(/^x:/,''))).join(','),...rows.map(r=>header.map((_,i)=>csvEsc(r[i])).join(','))];
  save(pfile('csv'),new TextEncoder().encode('\ufeff'+lines.join('\r\n')).buffer);
};
$('ptab').onclick=async()=>{await need('jspdf');save(pfile('pdf').replace(/\.pdf$/,'-table.pdf'),buildTablePdf().output('arraybuffer'))};
$('jpg').onclick=()=>exportImage('jpg');
$('png').onclick=()=>exportImage('png');
$('cDrop').onclick=()=>$('file').click();
$('pasteB').addEventListener('click',()=>{if($('pastebox').parentNode!==$('files').parentNode)$('files').before($('pastebox'))},true);
$('cPaste').onclick=()=>{const pb=$('pastebox');if(pb.parentNode===$('res')){pb.style.display=pb.style.display==='none'?'flex':'none'}else{$('res').querySelector('.tbar').after(pb);pb.style.display='flex'}if(pb.style.display==='flex')$('pasteT').focus()};
$('pasteB').onclick=()=>{const b=$('pastebox');b.style.display=b.style.display==='none'?'flex':'none';if(b.style.display==='flex')$('pasteT').focus()};
$('pasteNo').onclick=()=>{$('pastebox').style.display='none'};
$('pasteOK').onclick=()=>{const t=$('pasteT').value;if(!t.trim()){$('msg').textContent='Paste some data first.';return}$('msg').textContent='';pasteData(t);$('pasteT').value='';$('pastebox').style.display='none'};
document.addEventListener('paste',e=>{
  const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))return;
  const cd=e.clipboardData;if(!cd)return;
  if([...(cd.files||[])].some(f=>(f.type||'').startsWith('image/')))return;
  const txt=cd.getData('text/plain');
  if(txt&&txt.trim()){e.preventDefault();pasteData(txt)}
});
$('tabs2').onclick=e=>{const b=e.target.closest('button[data-tab]');if(b)setTab(b.dataset.tab)};
$('shQ').oninput=()=>renderShow(false);
$('cptab').onclick=async()=>{
  const tsv=tableTsv();let ok=false;
  try{await navigator.clipboard.writeText(tsv);ok=true}catch(e){}
  if(!ok){try{const ta=document.createElement('textarea');ta.value=tsv;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(e){}}
  if(ok)$('msg').textContent='Table copied. Paste it into Excel, Google Sheets or Notes.';
  else{$('msg').textContent='';showText(tsv)}
};
document.querySelectorAll('input[name="shv"]').forEach(r=>r.onchange=()=>{if(r.checked){shView=r.value;shSort={n:'',d:1};renderShow()}});
$('shBody').onclick=e=>{const th=e.target.closest('th[data-n]');if(!th)return;const c=th.dataset.n;shSort=shSort.n===c?{n:c,d:-shSort.d}:{n:c,d:1};renderShow()};
$('shTS').value=shTS;
$('shTS').onchange=()=>{shTS=$('shTS').value;try{localStorage.setItem('ds_shts',shTS)}catch(e){}renderShow()};
$('shNet').onchange=()=>{shNet=$('shNet').checked;renderShow()};
$('shFilt').onchange=()=>{shFilt=$('shFilt').checked;renderShow()};
const cmChanged=()=>{saveCmp();shSort={n:'',d:1};renderShow()};
$('cmpBar').addEventListener('change',e=>{
  const t=e.target,d=t.dataset||{};
  if(t.id==='cmG'){cmp.g=t.value;if(cmp.s===cmp.g)cmp.s='';cmp.items=null;cmChanged()}
  else if(t.id==='cmS'){cmp.s=t.value;cmChanged()}
  else if(t.id==='cmM2'){cmp.m2=t.value;cmChanged()}
  else if(t.id==='cmM'){cmp.m=t.value;cmChanged()}
  else if(t.id==='cmHl'){cmp.hl=t.checked;saveCmp();renderShow(false)}
  else if(d.met){
    const on=t.checked;
    if(on){if(!cmp.mets.includes(d.met))cmp.mets.push(d.met)}
    else if(cmp.mets.length>1)cmp.mets=cmp.mets.filter(x=>x!==d.met);
    cmChanged();
  }
  else if(d.it!==undefined){
    if(!cmp.items)cmp.items=new Set(cmpKeys.map(x=>x.k));
    if(t.checked)cmp.items.add(d.it);else cmp.items.delete(d.it);
    if(cmp.items.size===cmpKeys.length)cmp.items=null;
    const bt=$('cmItB');if(bt)bt.textContent='Items: '+(cmp.items?cmp.items.size+' of '+cmpKeys.length:'All ('+cmpKeys.length+')')+' ▾';
    shSort={n:'',d:1};renderShow(false);
  }
});
$('cmpBar').addEventListener('click',e=>{
  const ct=e.target.closest('button[data-ct]');
  if(ct){cmp.mode=ct.dataset.ct;cmp.gal=false;cmChanged();return}
  if(e.target.closest('#cmGalB')){cmp.gal=!cmp.gal;const gg=document.querySelector('#cmpBar .cgal');if(gg)gg.style.display=cmp.gal?'grid':'none';return}
  const ia=e.target.closest('button[data-ia]');
  if(ia){
    const a=ia.dataset.ia;
    if(a==='all')cmp.items=null;
    else if(a==='none')cmp.items=new Set();
    else cmp.items=new Set(cmpKeys.slice().sort((x,y)=>(y.v-x.v)||(y.c-x.c)).slice(0,5).map(x=>x.k));
    shSort={n:'',d:1};renderShow();return;
  }
  if(e.target.closest('#cmItB')){cmp.itOpen=!cmp.itOpen;const mm=$('cmItM');if(mm)mm.style.display=cmp.itOpen?'flex':'none'}
});
document.addEventListener('click',e=>{if(cmp.itOpen&&!e.target.closest('#cmItM,#cmItB')){cmp.itOpen=false;const mm=$('cmItM');if(mm)mm.style.display='none'}});
$('shColB').onclick=e=>{e.stopPropagation();const m=$('shColMenu');m.style.display=m.style.display==='none'?'block':'none'};
$('shColMenu').addEventListener('change',e=>{const c=e.target;if(!c.dataset||c.dataset.col===undefined)return;const h=shHide[shView];if(c.checked)h.delete(c.dataset.col);else h.add(c.dataset.col);renderShow()});
$('shExpB').onclick=e=>{e.stopPropagation();const m=$('shExpMenu');m.style.display=m.style.display==='none'?'flex':'none'};
document.addEventListener('click',e=>{if(!e.target.closest('#shColMenu,#shColB'))$('shColMenu').style.display='none';$('shExpMenu').style.display='none'});
$('shxl').onclick=async()=>{await need('xlsx');const a=showAll();const ws=XLSX.utils.aoa_to_sheet([a.head,...a.data]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,shView==='summary'?'Summary':'Data');save(showFile('xlsx'),XLSX.write(wb,{bookType:'xlsx',type:'array'}))};
$('shcsv').onclick=()=>{const a=showAll();save(showFile('csv'),new TextEncoder().encode('\ufeff'+[a.head,...a.data].map(r=>r.map(csvEsc).join(',')).join('\r\n')).buffer)};
$('shpdf').onclick=async()=>{await need('jspdf');const a=showAll();save(showFile('pdf'),tablePdf(a.head,a.data).output('arraybuffer'))};
$('shcp').onclick=async()=>{
  const a=showAll();const tsv=[a.head,...a.data].map(r=>r.map(v=>String(v??'').replace(/[\t\r\n]+/g,' ')).join('\t')).join('\n');
  let ok=false;try{await navigator.clipboard.writeText(tsv);ok=true}catch(e){}
  if(!ok){try{const ta=document.createElement('textarea');ta.value=tsv;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(e){}}
  if(ok)$('shN').textContent='Copied';else showText(tsv);
};
