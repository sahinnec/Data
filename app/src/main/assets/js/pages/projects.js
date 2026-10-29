let docFolder='all',docReverse=false,docMenu='',docDeleteConfirm='',docImportReturn=false;
let selMode=false,selSet=new Set(),selGrp=null,selConf='';
let manual=[],editIdx=-1,selRow=null,projects=[{name:'Project 1',store:[],manual:[]}],pi=0,fields=[],fkey=null,fsrc={};
function sync(){projects[pi].store=store;projects[pi].manual=manual;projects[pi].fields=fields;projects[pi].fsrc=fsrc}
function persist(){
  try{sync();localStorage.setItem('ds_projects_v1',JSON.stringify({pi,projects}))}catch(e){}
}
function renderProjects(){
  sync();
  $('pSel').innerHTML=projects.map((p,i)=>{return `<option value="${i}"${i===pi?' selected':''}>${esc(p.name)}</option>`}).join('');
}
function pfile(ext){return ((projects[pi].name||'').replace(/[\\/:*?"<>|]+/g,'').trim()||'Data Show').replace(/\s+/g,'-')+(window.__selTag?'-selected':'')+'.'+ext}
function switchTo(i){
  $('pmenu').style.display='none';
  sync();pi=i;store=projects[i].store;manual=projects[i].manual;fields=projects[i].fields||(projects[i].fields=[]);fsrc=projects[i].fsrc||(projects[i].fsrc={});
  selD.clear();selRow=null;editIdx=-1;hkey='';tf='all';$('mF').value='all';$('msg').textContent='';
  merge();
}

function automapOf(s){const oh=header,or=rows;header=s.header;rows=s.rows;let m;try{m=automap()}finally{header=oh;rows=or}return m}
function merge(){
  renderFiles();renderProjects();persist();renderLibrary();
  const fk=JSON.stringify([fields,fsrc]);if(fk!==fkey){fkey=fk;fieldUI()}
  if(!store.length&&!manual.length){rows=[];baseRows=[];header=[];$('res').style.display='block';$('res').classList.add('empty');$('noData').style.display='none';if(curTab==='table'||curTab==='compare')renderShow();return}
  rows=[];
  if(store.length){
    header=store[0].header;
    const add=(s,ixr)=>s.rows.forEach(r0=>{
      const r=ixr?ixr.map(i=>i>=0?(r0[i]??''):''):r0.slice();
      r.__o=r0;r.__s=s;r.__ix=ixr;rows.push(r)});
    add(store[0],null);
    baseRows=rows.slice();
    const k=header.join('|');
    if(k!==hkey){hkey=k;map=automap();fillSel()}
    store.slice(1).forEach(s=>{
      if(s.header.join('|')===k){add(s,null);return}
      const sm=automapOf(s),ixr=header.map(()=>-1);
      ['d','n','q','p','t'].forEach(f=>{if(map[f]>=0&&sm[f]>=0)ixr[map[f]]=sm[f]});
      const usedSi=new Set(ixr.filter(i=>i>=0));
      fields.forEach(f=>{const ci=fidx(f);if(ci<0||ixr[ci]>=0)return;let si=s.header.indexOf('x:'+f);if(si<0&&fsrc[f])si=s.header.indexOf(fsrc[f]);if(si>=0&&!usedSi.has(si)){ixr[ci]=si;usedSi.add(si)}});
      header.forEach((hn,j)=>{if(ixr[j]<0){const si=s.header.indexOf(hn);if(si>=0&&!usedSi.has(si)){ixr[j]=si;usedSi.add(si)}}});
      const bc=header.map((h,j)=>String(h).startsWith('x:')?-1:j).filter(j=>j>=0),sc=s.header.map((h,j)=>String(h).startsWith('x:')?-1:j).filter(j=>j>=0);
      if(bc.length===sc.length)bc.forEach((bj,k)=>{if(ixr[bj]<0&&!usedSi.has(sc[k])){ixr[bj]=sc[k];usedSi.add(sc[k])}});
      add(s,ixr);
    });
  }else{
    header=['Name','Quantity','Price','Date','Type',...fields.filter(f=>!fsrc[f]).map(f=>'x:'+f)];
    const k=header.join('|');
    if(k!==hkey){hkey=k;map={d:3,n:0,q:1,p:2,t:4};fillSel()}
  }
  manual.forEach(m=>{
    const r=header.map(()=>'');
    if(map.d>=0)r[map.d]=m.d;if(map.n>=0)r[map.n]=m.n;if(map.q>=0)r[map.q]=m.q;if(map.p>=0)r[map.p]=m.p;if(map.t>=0)r[map.t]=m.t;
    fields.forEach(f=>{const ci=fidx(f);if(ci>=0&&m.x&&m.x[f]!==undefined)r[ci]=m.x[f]});
    r.__m=m;rows.push(r)});
  baseRows=rows.slice();
  sortRows();page=0;render();renderCtab();if(curTab==='table'||curTab==='compare')renderShow();
}
function setCell(row,col,val){
  if(col<0)return;
  row[col]=val;
  if(row.__m){const hn=String(header[col]||'');if(hn.startsWith('x:')){row.__m.x=row.__m.x||{};row.__m.x[hn.slice(2)]=val;return}const fld=fields.find(f=>fsrc[f]&&fsrc[f]===hn);if(fld){row.__m.x=row.__m.x||{};row.__m.x[fld]=val;return}const f=col===map.d?'d':col===map.n?'n':col===map.q?'q':col===map.p?'p':col===map.t?'t':null;if(f)row.__m[f]=val;return}
  const s=row.__s,o=row.__o;
  let si=row.__ix?row.__ix[col]:col;
  if(si===undefined||si<0){si=s.header.length;s.header.push(header[col]);s.rows.forEach(x=>x.push(''))}
  o[si]=val;
}
function refresh(){
  const pg=page;
  merge();
  if(rows.length||store.length||manual.length){page=Math.min(pg,Math.max(0,Math.ceil(rows.length/PER)-1));render()}
}
function allOf(k){return baseRows.filter(r=>nameKeyG(r)===k)}
function gTools(k){
  const n=allOf(k).length,cf=selConf==='x:'+k;
  return `<div class="gtools"><input class="gtin" data-k="${escA(k)}" placeholder="New name" value="${escA(k)}"><button type="button" data-a="gr" data-k="${escA(k)}">✎ Rename</button><button type="button" class="dg" data-a="gx" data-k="${escA(k)}">${cf?'Tap again: delete '+n+' cards':'✕ Delete all ('+n+')'}</button><button type="button" data-a="gs" data-k="${escA(k)}">☑ Select</button></div>`;
}
function delRows(list){
  list.forEach(row=>{if(row.__m)manual=manual.filter(x=>x!==row.__m);else if(row.__s){const k=row.__s.rows.indexOf(row.__o);if(k>=0)row.__s.rows.splice(k,1)}});
  store=store.filter(x=>x.rows.length);editIdx=-1;selRow=null;selSet.clear();selGrp=null;selConf='';refresh();selUI();
}
function selUI(){
  let b=document.getElementById('selBar');{const sb=$('selB');if(sb){const o=selMode&&curTab==='show';sb.style.background=o?'var(--ac)':'';sb.style.color=o?'#fff':''}}
  const c=$('clr'),n=selSet.size,on=selMode&&curTab==='show';
  if(!c.dataset.h0)c.dataset.h0=c.innerHTML;
  if(on){c.innerHTML='🗑<span class="bt"> '+(n?(selConf==='del'?'Tap again · '+n:'Delete '+n):'Clear')+'</span>';c.classList.toggle('dg',n>0)}
  else{c.innerHTML=c.dataset.h0;c.classList.remove('dg')}
  if(!on){if(b)b.style.display='none';document.body.classList.remove('selon');return}
  if(!b){b=document.createElement('div');b.id='selBar';document.body.appendChild(b);
    b.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.sa){rows.forEach(r=>{if(!r.__net)selSet.add(r)});selConf='';render();selUI()}else if(t.dataset.sd){$('clr').click()}else selExit()}}
  document.body.classList.add('selon');b.style.display='flex';
  b.innerHTML=`<span class="sn">${n} selected</span><button type="button" data-sa="1">All</button><button type="button" data-sd="1" class="dg">🗑 ${selConf==='del'?'Tap again · ':'Delete '}${n}</button><button type="button">✕</button>`;
}
(function(){const m=$('expMenu');let sv=null;
  m.addEventListener('click',e=>{if(!e.target.closest('button')||sv||!(selMode&&selSet.size))return;
    sv=rows;rows=rows.filter(r=>selSet.has(r));window.__selTag=true;
    setTimeout(()=>{rows=sv;sv=null;window.__selTag=false},0)},true)})();
function delRow(row){
  if(!row)return;
  if(row.__m){manual=manual.filter(x=>x!==row.__m)}
  else if(row.__s){const k=row.__s.rows.indexOf(row.__o);if(k>=0)row.__s.rows.splice(k,1);store=store.filter(x=>x.rows.length)}
  editIdx=-1;refresh();
}
function saveEdit(el){
  const row=rows[editIdx];
  if(!row){editIdx=-1;render();return}
  el.querySelectorAll('[data-f]').forEach(inp=>{
    if(inp.dataset.f==='t'){if(inp.value!==tyVal(typeOf(row)))setType(row,inp.value);return}
    const col={d:map.d,n:map.n,q:map.q,p:map.p}[inp.dataset.f];
    setCell(row,col,inp.value.trim());
  });
  el.querySelectorAll('[data-xf]').forEach(inp=>setFval(row,inp.dataset.xf,inp.value.trim()));
  editIdx=-1;refresh();
}
function dateCol(s){
  const S=s.rows.slice(0,30);let b=-1,c0=0;
  s.header.forEach((h,j)=>{const c=S.filter(r=>pDate(r[j])!==null).length;if(c>c0){c0=c;b=j}});
  return b>=0?b:s.header.findIndex(h=>canon(h)==='date');
}
function renderFiles(){
  const e2=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parts=store.map((s,k)=>{
    const dc=dateCol(s);let inp='';
    const vals=new Set(dc>=0?s.rows.map(r=>String(r[dc]??'').trim()):['']);
    if(vals.size<=1){
      const t=dc>=0&&s.rows[0]?pDate(s.rows[0][dc]):null;
      inp=`<input type="date" data-k="${k}" value="${t!==null?iso(t):''}" title="Date for this file">`;
    }
    return `<div class="fch"><span title="${e2(s.name)}">${e2(s.name)} · ${s.rows.length}</span>${inp}</div>`});
  if(manual.length)parts.push(`<div class="fch"><span>Manual · ${manual.length}</span></div>`);
  $('files').innerHTML=parts.join('');
  const rm=store.map((s,k)=>`<div class="rmr"><span title="${e2(s.name)}">${e2(s.name)} · ${s.rows.length}</span><button class="alt sm" data-k="${k}" data-a="rm" title="Remove file">✕ Remove</button></div>`);
  if(manual.length)rm.push(`<div class="rmr"><span>Manual · ${manual.length}</span><button class="alt sm" data-a="rmm" title="Remove manual cards">✕ Remove</button></div>`);
  $('pfiles').innerHTML=rm.join('');
}
$('ord').onchange=()=>{sortRows();page=0;render()};
$('srch').oninput=()=>{sortRows();page=0;render()};
$('selB').onclick=()=>{if(selMode)selExit();else selEnter([])};
$('clr').onclick=()=>{
  if(selMode){const L=[...selSet];
    if(!L.length){$('msg').textContent='Tap cards to select them (or tap All), then Delete.';return}
    delRows(L);selMode=false;selUI();return}
  if(!store.length&&!manual.length)return;
  store=[];manual=[];editIdx=-1;hkey='';selD.clear();$('msg').textContent='সব data মুছে ফেলা হয়েছে।';merge()};

const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const cell=(r,i)=>i>=0?r[i]:'';

const sepAt=idx=>{const a=rows[idx-1],b=rows[idx];return(ordMode()==='group'&&a&&b&&map.n>=0&&String(a[map.n]).trim().toUpperCase()!==String(b[map.n]).trim().toUpperCase())?'margin-top:12px;':''};
let gstate={};
function render(){
  $('res').style.display='block';$('res').classList.remove('empty');$('noData').style.display='none';renderDates();
  const nameKey=r=>String(r[map.n]).trim().toUpperCase();
  const gkey=nameKey;
  const grp=ordMode()==='group'&&map.n>=0;
  const top=grp&&design.tpos!=='bottom';
  const sOff=design.sOn==='off';
  const isCol=k=>sOff?false:(gstate[k]!==undefined?gstate[k]:!!design.gcol);
  let tp=1,pageGroups=[],part=[];
  if(top){
    const groups=[];
    rows.forEach((r,idx)=>{const k=gkey(r);let g=groups[groups.length-1];if(!g||g.k!==k){g={k,items:[]};groups.push(g)}g.items.push([r,idx])});
    const pages=[];let cur=[],w=0;
    groups.forEach(g=>{const wt=1+g.items.length;if(cur.length&&w+wt>PER){pages.push(cur);cur=[];w=0}cur.push(g);w+=wt});
    if(cur.length)pages.push(cur);
    tp=Math.max(1,pages.length);if(page>tp-1)page=tp-1;
    pageGroups=pages[page]||[];
  }else{
    tp=Math.max(1,Math.ceil(rows.length/PER));if(page>tp-1)page=tp-1;
    part=rows.slice(page*PER,page*PER+PER);
  }
  const gi=new Map();if(map.n>=0)baseRows.forEach(r=>{const k=nameKey(r);if(!gi.has(k))gi.set(k,gi.size)});
  const anyTy=rows.some(r=>!!typeOf(r));
  const col=r=>{
    if(map.n<0)return '';
    const key=nameKey(r),ov=design.names[key];
    const hi=ov!==undefined?ov:(design.all!=null?design.all:null);
    const h=hi!==null?PAL[hi].h:Math.round((gi.get(key)||0)*137.508+150)%360;
    let o=`--h:${h};`;
    if(design.card==='group'){const c=cardBg(h);o+=`--bg:${rgbStr(c)};--bgh:${rgbStr(mixRgb(c,[0,0,0],.05))};--gl:hsla(${h},85%,50%,.5);`}
    if(design.price==='group')o+=`--pr:hsl(${h},75%,86%);`;
    else if(design.price==='blue')o+='--pr:#dbe7ff;--prc:#1d3fd1;';
    else o+='--pr:#d5f7e8;';
    return o;
  };
  const xtra=r=>{const a=fields.map(f=>[f,fval(r,f)]).filter(x=>String(x[1]??'')!=='').map(x=>`<span><b>${esc(x[0])}:</b> ${esc(x[1])}</span>`);return a.length?`<div class="xtra">${a.join('')}</div>`:''};
  const hist=new Map(),run=new Map(),runA=new Map(),runD=new Map(),dLots=new Map(),dSt=new Map(),gev=new Map();
  if(map.n>=0){
    const arr=baseRows.map((r,i)=>({r,i,k:nameKey(r),d:map.d>=0?(pDate(r[map.d])??0):0}));
    arr.sort((x,y)=>(x.d-y.d)||(x.i-y.i));
    arr.forEach(e=>{
      const q=map.q>=0?(num(e.r[map.q])??0):1,p=num(e.r[map.p]),ty=typeOf(e.r);
      let h=hist.get(e.k);if(!h){h={tot:0,lastP:null,prevP:null,amt:0,ps:0,pn:0};hist.set(e.k,h)}
      h.tot+=ty==='s'?(design.tmode==='net'?-q:0):q;run.set(e.r,ty==='s'&&design.tmode!=='net'?q:h.tot);
      if(p!==null){h.amt+=(ty==='s'?-1:1)*q*p;h.ps+=p;h.pn++}
      runA.set(e.r,{amt:h.amt,avg:h.pn?h.ps/h.pn:null});
      {let s=dSt.get(e.k);if(!s){s={q:0,amt:0,mn:Infinity};dSt.set(e.k,s);dLots.set(e.k,[])}
       let gain=null;
       if(p!==null){
         if(ty==='s'){
           const L=dLots.get(e.k),pa=s.q>0?s.amt/s.q:p,rp=(design.sellAt==='avg')?pa:p;
           const gm=design.gainM||'low';
           if(gm==='avg')gain=q*(p-pa);
           else if(gm==='low')gain=s.mn<Infinity?q*(p-s.mn):null;
           else{let need=q;gain=0;for(const x of L.filter(x=>x.q>0).sort((a,b)=>a.p-b.p)){if(need<=0)break;const u=Math.min(need,x.q);gain+=u*(p-x.p);x.q-=u;need-=u}}
           s.amt-=q*rp;s.q-=q;
         }else if(ty!=='n'){s.q+=q;s.amt+=q*p;s.mn=Math.min(s.mn,p);dLots.get(e.k).push({p,q})}
       }
       if(s.q<=0)s.amt=0;
       if(ty==='s'&&gain!==null&&isFinite(gain)){let ga=gev.get(e.k);if(!ga)gev.set(e.k,ga=[]);ga.push({t:e.d,g:gain})}
       runD.set(e.r,{amt:s.amt,avg:s.q>0?s.amt/s.q:null,gain});}
      if(p!==null){h.prevP=h.lastP;h.lastP=p}
    });
  }
  const cpLots=new Map();
  if(map.n>=0){baseRows.map((r,i)=>({r,i,k:nameKey(r),d:map.d>=0?(pDate(r[map.d])??0):0})).sort((x,y)=>(x.d-y.d)||(x.i-y.i)).forEach(e=>{const ty=typeOf(e.r);if(ty==='n')return;const q=map.q>=0?(num(e.r[map.q])??0):1,p=num(e.r[map.p]);if(p===null)return;let L=cpLots.get(e.k);if(!L){L=[];cpLots.set(e.k,L)}if(ty==='s'){let need=q;while(need>1e-12&&L.length){const x=L[0],u=Math.min(need,x.q);x.q-=u;need-=u;if(x.q<=1e-12)L.shift()}}else L.push({q,p,d:e.d})})}
  const cpFH=(r,first)=>{if(!cpFu().on)return '';const k=gkey(r),L=cpLots.get(k)||[];if(!L.length)return '';return cpFutCard(k,cell(r,map.n),first?'':'margin-top:12px;',L)};
  const cpDH=(r,first)=>{if(!cpD().on)return '';const k=gkey(r);return cpDlyCard(k,cell(r,map.n),first?'':'margin-top:12px;',cpLots.get(k)||[])};
  const stats=new Map();
  if(grp)rows.forEach(r=>{
    const k=gkey(r);let t=stats.get(k);
    if(!t){t={q:0,p:0,pn:0,v:0,bq:0,sq:0,bv:0,sv:0,n:0,mn:Infinity,mx:-Infinity,d0:null,d1:null};stats.set(k,t)}
    const q=map.q>=0?num(r[map.q]):null,p=num(r[map.p]);
    if(q!==null)t.q+=q;
    if(p!==null){t.p+=p;t.pn++;t.v+=(map.q>=0?(q===null?0:q):1)*p;t.mn=Math.min(t.mn,p);t.mx=Math.max(t.mx,p)}
    const qv=map.q>=0?(q===null?0:q):1;
    if(typeOf(r)==='s'){t.sq+=qv;if(p!==null)t.sv+=qv*p}else{t.bq+=qv;if(p!==null)t.bv+=qv*p}
    t.n++;
    const dd=map.d>=0?pDate(r[map.d]):null;
    if(dd!==null){if(t.d0===null||dd<t.d0)t.d0=dd;if(t.d1===null||dd>t.d1)t.d1=dd}
  });
  const netRun=new Map();
  if(tf==='net'&&map.n>=0){const acc=new Map();rows.filter(r=>r.__net).map((r,i)=>({r,i,d:map.d>=0?(pDate(r[map.d])??0):0})).sort((x,y)=>(x.d-y.d)||(x.i-y.i)).forEach(e=>{const k=nameKey(e.r);let a=acc.get(k);if(!a){a={q:0,amt:0};acc.set(k,a)}const q=map.q>=0?(num(e.r[map.q])??0):1,p=num(e.r[map.p]);a.q+=q;if(p!==null)a.amt+=q*p;netRun.set(e.r,{tot:a.q,amt:a.amt,avg:a.q>0?a.amt/a.q:null})})}
  const fq=v=>String(Math.round(v*100)/100),fp=v=>v>=1?v.toFixed(2):v.toFixed(4),fT=v=>Math.abs(v)>=1000?Math.round(v).toLocaleString('en-US'):String(Math.round(v*100)/100);
  const fp2=v=>{const a=Math.abs(v);return (v<0?'-':'')+(a>=1?a.toFixed(2):a.toFixed(4))};
  const fpl=v=>(v>0?'+':'')+(Math.round(v*100)/100);
  const fmtD=ms=>{const d=new Date(ms),p=n=>String(n).padStart(2,'0');return p(d.getUTCDate())+'-'+p(d.getUTCMonth()+1)+'-'+String(d.getUTCFullYear()).slice(2)};
  const sg=v=>v===null||v===undefined?'':(v>0?' up':v<0?' dn':'');
  const PF=design.lay==='port'||design.lay==='broker'||design.style===11;
  const sumShowQ=map.q>=0&&sh('s_qty');
  const GMN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const gMk=t=>{if(!t)return '0000-00';const d=new Date(t);return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')};
  const gMl=k=>k==='0000-00'?'No date':GMN[+k.slice(5)-1]+' '+k.slice(0,4);
  const gAll=[...new Set([].concat(...[...gev.values()]).map(x=>gMk(x.t)))].sort().reverse();
  window.__gM=gAll;try{gnPer()}catch(e){}
  const gF=v=>(v>0.004?'+':v<-0.004?'\u2212':'')+Math.abs(v).toFixed(2),gC=v=>v>0.004?' gup':v<-0.004?' gdn':'';
  const gainBlock=(r,pos)=>{
    if(design.gOn==='off')return '';
    const a=gev.get(gkey(r));if(!a||!a.length)return '';
    const mons=[...new Set(a.map(x=>gMk(x.t)))].sort().reverse();
    const per=design.gPer||'latest',pick=per==='all'?null:(per==='latest'||mons.indexOf(per)<0?mons[0]:per);
    let lines=[];
    const addTo=(m,k,g)=>{let o=m.get(k);if(!o){o={g:0,l:0};m.set(k,o)}if(g>=0)o.g+=g;else o.l+=g};
    if(design.gBy==='date'){
      const m=new Map();a.filter(x=>!pick||gMk(x.t)===pick).forEach(x=>addTo(m,x.t||0,x.g));
      lines=[...m.entries()].sort((x,y)=>y[0]-x[0]).map(x=>[x[0]?fmtD(x[0]):'No date',x[1]]);
    }else{
      const m=new Map();a.forEach(x=>addTo(m,gMk(x.t),x.g));
      lines=[...m.entries()].filter(x=>!pick||x[0]===pick).sort((x,y)=>y[0]<x[0]?-1:1).map(x=>[gMl(x[0]),x[1]]);
    }
    const tot=a.reduce((s,x)=>s+x.g,0),tG=a.reduce((s,x)=>s+(x.g>0?x.g:0),0),tL=a.reduce((s,x)=>s+(x.g<0?x.g:0),0);
    const mini=design.gMin!==false;
    const ttl=`Gain \u00b7 ${design.gBy==='date'?'by date':'by month'}${pick?' \u00b7 '+gMl(pick):' \u00b7 all'}`;
    if(mini){
      if(pos==='in')return `<div class="sgn gmini" data-gmin="1" title="Tap to expand"><span>Total gain</span>${design.gTot==='off'?'':`<b class="${gC(tot).trim()}">${gF(tot)}</b>`}</div>`;
      if(!PF)return '';
      return `<div class="sgn"><div class="gh" data-gmin="1"><span>\u25b8 ${ttl}</span>${design.gTot==='off'?'':`<b class="${gC(tot).trim()}">${gF(tot)}</b>`}</div></div>`;
    }
    const hd=`<div class="gh"><span data-gmin="1" style="flex:1">\u25be ${ttl}</span><span data-gtog="1">${per==='all'?'Latest':'All'} \u25b8</span></div>`;
    const vv=o=>(o.l<-0.004?`<span class="gv"><b class="gup">${gF(o.g)}</b> <b class="gdn">${gF(o.l)}</b></span>`:`<b class="${gC(o.g).trim()}">${gF(o.g)}</b>`);
    const ls=lines.map(x=>`<div class="gl"><span>${esc(x[0])}</span>${vv(x[1])}</div>`).join('');
    let tl='';
    if(design.gTot!=='off'){
      tl=`<div class="gt"><span>Total gain</span><span class="gup">${gF(tG)}</span></div>`;
      if(tL<-0.004)tl+=`<div class="gt" style="border-top:0;margin-top:0;padding-top:0"><span>Total loss</span><span class="gdn">${gF(tL)}</span></div><div class="gt" style="border-top:0;margin-top:0;padding-top:0"><span>Net</span><span class="${gC(tot).trim()}">${gF(tot)}</span></div>`;
    }
    return `<div class="sgn">${hd}${ls}${tl}</div>`;
  };
  const sumBody=(r,t,head,chev)=>{
    const h=hist.get(gkey(r))||{},nm=esc(cell(r,map.n)),all=tf==='all',dl=all&&t.sq>0;
    const nq=t.bq-t.sq,cost=t.bv-t.sv;
    if(PF){
      const lp=h.lastP!=null?h.lastP:null;
      const avgp=t.pn?t.p/t.pn:null,mkt=lp!==null?nq*lp:null,pl=mkt!==null?mkt-cost:null,plp=pl!==null&&Math.abs(cost)>1e-12?pl/Math.abs(cost)*100:null;
      const ch=(h.lastP!=null&&h.prevP!=null)?h.lastP-h.prevP:null,chp=ch!==null&&h.prevP?ch/h.prevP*100:null;
      const K=(l,v,b)=>`<div class="pfk">${l}: ${b?`<b>${v}</b>`:v}</div>`;
      const L=[];
      if(sh('s_cost'))L.push(K('Cost',fT(cost)));
      if(sh('s_avg'))L.push(K('Avg',avgp===null?'–':fp2(avgp),1));
      if(sh('s_mkt'))L.push(K('Mkt val',mkt===null?'–':fT(mkt)));
      if(sh('s_qty'))L.push(K('Qty',fq(nq),1));
      if(sh('s_bq'))L.push(K('Buy qty',fq(t.bq)));
      if(sh('s_sq'))L.push(K('Sell qty',fq(t.sq)));
      if(sh('s_bv'))L.push(K('Buy amt',fT(t.bv)));
      if(sh('s_sv'))L.push(K('Sell amt',fT(t.sv)));
      if(sh('s_cnt'))L.push(K('Trades',t.n));
      if(sh('s_first')&&t.d0!==null)L.push(K('First',fmtD(t.d0)));
      if(sh('s_lastd')&&t.d1!==null)L.push(K('Last',fmtD(t.d1)));
      if(sh('s_min')&&isFinite(t.mn))L.push(K('Min',fp2(t.mn)));
      if(sh('s_max')&&isFinite(t.mx))L.push(K('Max',fp2(t.mx)));
      const M=[];
      if(sh('s_pl')&&pl!==null)M.push(`<div class="pfd${sg(pl)}">${fpl(pl)}</div>`);
      if(sh('s_plp')&&plp!==null)M.push(`<div class="pfd${sg(plp)}">${fpl(plp)}%</div>`);
      const R=[];
      if(sh('s_last')&&lp!==null)R.push(`<div class="pfp">${fp2(lp)}</div>`);
      if(sh('s_chg')&&chp!==null)R.push(`<div class="pfb${sg(ch)}">${fpl(chp)}%</div><div class="pfc${sg(ch)}">${fpl(ch)}</div>`);
      return `<div class="pfl"><div class="nm pfn">${chev||''}${nm}</div>${L.join('')}</div><div class="pfm">${M.join('')}</div><div class="pfr">${R.join('')}</div>${gainBlock(r)}`;
    }
    const avg=t.pn?t.p/t.pn:null;
    let o=`<div><div class="dt">${head}</div><div class="nm">${nm}</div>${gainBlock(r,'in')}</div>`;
    if(sumShowQ)o+=`<div class="mid"><div class="lbl">Quantity</div><div class="q">${fq(all?t.bq:t.q)}</div>${dl?`<div class="q sl" title="Total sell quantity">${fq(t.sq)}</div>`:''}</div>`;
    const pr=[];
    if(sh('s_cost')){
      pr.push(`<div class="pr tot" title="${all?'Total buy amount':'Total value'}">${all?fT(t.bv):(t.pn?fT(t.v):'')}</div>`);
      if(dl)pr.push(`<div class="pr tot sl" title="Total sell amount">${fT(t.sv)}</div>`);
    }
    if(sh('s_avg'))pr.push(`<div class="pr" title="Average price">${avg===null?'':fp(Math.abs(avg))}</div>`);
    return o+`<div class="prs">${pr.join('')}</div>${gainBlock(r)}`;
  };
  const sumCls=()=>`item sum${design.sum==='modern'?' mod':''}${PF?' pf':''}${!PF&&!sumShowQ?' noq':''}`;
  const sumAfter=(r,i)=>{
    if(!grp||top||sOff)return '';
    const nx=rows[page*PER+i+1];
    if(nx&&gkey(nx)===gkey(r))return '';
    const t=stats.get(gkey(r));if(!t)return '';
    return cpDH(r,1)+cpFH(r,1)+`<div class="${sumCls()}" style="${design.sum==='modern'?'':col(r)}">${sumBody(r,t,'Total · Avg price','')}</div>`;
  };
  const sumTop=(g,first)=>{
    const r=g.items[0][0],t=stats.get(g.k);if(!t||sOff)return '';
    const cl=isCol(g.k),chev=`<span class="chev">${cl?'▸':'▾'}</span>`;
    const gp=g.items.length&&g.items.every(x=>selSet.has(x[0]));
    const mb=`<button type="button" class="gmore" data-a="gm" data-k="${escA(g.k)}" title="Edit / delete this name">⋮</button>`;
    return `<div class="${sumCls()}${selMode?' selm':''}${gp?' picked':''}" data-g="${escA(g.k)}" style="${first?'':'margin-top:12px;'}${design.sum==='modern'?'':col(r)}">${sumBody(r,t,`${chev} Total · Avg price · ${g.items.length}`+(selMode?'':mb),chev)}${selGrp===g.k&&!selMode?gTools(g.k):''}</div>`;
  };
  const cardHtml=(r,gi2)=>{
    const st=`${top?'':sepAt(gi2)}${col(r)}`;
    if(gi2===editIdx){
      const t=pDate(cell(r,map.d)),cur=tyVal(typeOf(r));
      const inp=(f,c,ph,v,ty)=>c>=0?`<input data-f="${f}" type="${ty||'text'}" placeholder="${ph}" value="${esc(v).replace(/"/g,'&quot;')}">`:'';
      const tsel=`<select data-f="t" title="Type">${[['','All'],['Buy','Buy'],['Sell','Sell'],['Net','Net']].map(([v,l])=>`<option value="${v}"${cur===v?' selected':''}>${l}</option>`).join('')}</select>`;
      return `<div class="item ed" style="${st}"><div class="eform">${inp('d',map.d,'Date',t!==null?iso(t):'','date')}${inp('n',map.n,'Name',cell(r,map.n))}${inp('q',map.q,'Qty',cell(r,map.q))}${inp('p',map.p,'Price',cell(r,map.p))}${tsel}${fields.map(f=>`<input data-xf="${escA(f)}" placeholder="${escA(f)}" value="${escA(fval(r,f))}">`).join('')}<button data-a="s">Save</button><button class="alt" data-a="c">Cancel</button></div></div>`;
    }
    const sel=r===selRow,ty=typeOf(r);
    const cls=`${sel?' sel':''}${ty==='s'&&tf==='all'?' sell':''}${selMode?' selm':''}${selSet.has(r)?' picked':''}`;
    const tools=sel?`<div class="tools"><button data-a="e" data-i="${gi2}">✎ Edit</button><button data-a="x" data-i="${gi2}">✕ Delete</button></div>`:'';
    const tag=sh('t_tag')?tagHtml(ty):'';
    const SR=r.__src||r,NR=netRun.get(r);const totV=NR?fq(NR.tot):(run.has(SR)?fq(run.get(SR)):'');
    if(dxIdx(design.lay)>=0&&design.dx){
      return dxCard({r,ty,d:NR?{amt:NR.amt,avg:NR.avg,gain:null}:(runD.get(SR)||{}),p:num(r[map.p]),q:map.q>=0?num(r[map.q]):1,name:esc(cell(r,map.n)),date:map.d>=0?fmtDate(cell(r,map.d)):null,dt:map.d>=0?pDate(cell(r,map.d)):null,qty:map.q>=0?String(cell(r,map.q)):null,tot:totV!==''?totV:null,price:esc(cell(r,map.p)),cls,gi2,st,tools,xt:sh('t_extra')?xtra(r):''});
    }
    const q=map.q>=0?num(r[map.q]):null,p=num(r[map.p]);
    const qq=map.q>=0?q:1,val=(qq!==null&&p!==null)?qq*p:null;
    const nmH=esc(cell(r,map.n));
    if(PF){
      const h=hist.get(nameKey(r))||{},sgn=ty==='s'?-1:1;
      const K=(l,v,b)=>`<div class="pfk">${l}: ${b?`<b>${v}</b>`:v}</div>`;
      const L=[];
      if(sh('t_date')&&map.d>=0)L.push(K('Date',esc(fmtDate(cell(r,map.d)))));
      if(sh('t_qty')&&map.q>=0)L.push(K('Qty',esc(cell(r,map.q)),1));
      if(design.tot!=='off'&&map.q>=0&&totV!=='')L.push(K('Total',totV,1));
      if(sh('t_val')&&val!==null)L.push(K('Value',fT(val)));
      const M=[];
      if(sh('t_vsl')&&p!==null&&p!==0&&h.lastP!=null&&qq!==null){
        const d=(h.lastP-p)*qq*sgn,dp=(h.lastP-p)/p*100*sgn;
        M.push(`<div class="pfd${sg(d)}">${fpl(d)}</div><div class="pfd${sg(dp)}">${fpl(dp)}%</div>`);
      }
      const R=sh('t_price')?`<div class="pfp">${esc(cell(r,map.p))}</div>`:'';
      return `<div class="item pf${cls}" data-i="${gi2}" style="${st}"><div class="pfl"><div class="nm pfn">${nmH}${tag}</div>${L.join('')}</div><div class="pfm">${M.join('')}</div><div class="pfr">${R}</div>${sh('t_extra')?xtra(r):''}${tools}</div>`;
    }
    const qMid=map.q>=0&&sh('t_qty'),hasTot=design.tot==='col'&&map.q>=0;
    const hasMid=qMid||(design.buy==='qty'&&!!tag),hasPr=sh('t_price');
    const gc=[hasTot?'minmax(215px,1fr)':'minmax(150px,1fr)'],gm=['minmax(0,1fr)'];
    if(hasMid){gc.push('70px');gm.push('56px')}
        if(hasPr){gc.push('minmax(var(--prw,88px),max-content)');gm.push('minmax(var(--prw,76px),max-content)')}
    const asTot=design.tot==='qty';
    const qLbl=asTot?'Total':design.qlbl;
    const qVal=asTot?(totV!==''?totV:esc(cell(r,map.q))):esc(cell(r,map.q));
    const xs=[];
    if(sh('t_val')&&val!==null)xs.push(`<span><b>Value:</b> ${fT(val)}</span>`);
    const xt=sh('t_extra')?xtra(r):'';
    const xv=xs.length?`<div class="xtra">${xs.join('')}</div>`:'';
    return `<div class="item dg${hasMid?'':' noq'}${cls}" data-i="${gi2}" style="${st}--gc:${gc.join(' ')};--gcm:${gm.join(' ')};">
    <div class="nc"><div style="min-width:0">${sh('t_date')?`<div class="dt">Date: ${esc(fmtDate(cell(r,map.d)))}</div>`:''}<div class="nm">${nmH}</div></div>${hasTot?`<div class="mid tcol" style="flex:none">${sh('t_totlbl')?'<div class="lbl">Total</div>':''}<div class="q">${totV}</div></div>`:''}${design.buy==='mid'?tag:''}</div>
    ${hasMid?`<div class="mid">${qMid?`${qLbl?`<div class="lbl">${esc(qLbl)}</div>`:''}<div class="q">${qVal}</div>`:''}${design.buy==='qty'?tag:''}</div>`:''}
    ${hasPr?`<div class="prc"><div class="pr">${esc(cell(r,map.p))}</div>${(()=>{const ra=runD.get(r.__src||r);if(tf!=='all'||!ra)return '';const a=sh('t_ramt'),v=sh('t_ravg')&&ra.avg!==null;if(!a&&!v)return '';const lb=sh('t_rlbl'),one=a!==v;return `<div class="pmr">${a?`<div class="pm ta" title="T.AMT: running total amount after this row (buys add, sells reduce)">${lb?`<small>${one?'Total':'T'}</small> `:''}${fT(ra.amt)}</div>`:''}${v?`<div class="pm av" title="T.AVG: running average = T.AMT ÷ running quantity">${lb?`<small>${one?'Avg':'A'}</small> `:''}${fp2(ra.avg)}</div>`:''}</div>`})()}</div>`:''}${xt}${xv}${tools}</div>`};
  let html='';
  if(top){
    pageGroups.forEach((g,k)=>{{const co=isCol(g.k),r0=g.items[0][0],dh=co?'':cpDH(r0,k===0),fh=co?'':cpFH(r0,k===0||!!dh);html+=dh+fh+sumTop(g,k===0||!!(dh||fh))}if(!isCol(g.k))g.items.forEach(([r,idx])=>{html+=cardHtml(r,idx)})});
  }else{
    html=part.map((r,i)=>cardHtml(r,page*PER+i)+sumAfter(r,i)).join('');
  }
  $('list').innerHTML=html;try{applySkins()}catch(e){console.error(e)}try{cpFit()}catch(e){}
  $('info').textContent=`${store.length} টি PDF · মোট ${rows.length} টি`;
  $('pg').textContent=`Page ${page+1} / ${tp}`;
  {const sq=$('srch').value.trim();$('ctrlS').textContent=rows.length+' cards'+(sq?' · '+sq:'')}
  $('pager').classList.toggle('hidp',design.pager==='hide'||tp<=1);
  $('prev').disabled=page===0;
  $('next').disabled=page>=tp-1;
  $('xl').disabled=$('pd').disabled=$('xcsv').disabled=$('ptab').disabled=$('jpg').disabled=$('png').disabled=$('expB').disabled=$('cptab').disabled=!rows.length;
}
{const t=new Date(),p=n=>String(n).padStart(2,'0');$('dflt').value=t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate())}
$('prev').onclick=()=>{page--;render()};
$('next').onclick=()=>{page++;render()};
