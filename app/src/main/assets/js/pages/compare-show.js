let shTS='grid';try{const z=localStorage.getItem('ds_shts');if(z==='bars'||z==='heat')shTS=z}catch(e){}
let curTab='scrap',shSort={n:'',d:1},shView='table',shNet=false,shFilt=false,shHide={table:new Set(),summary:new Set()};
function setTab(t){
  curTab=t;try{if(selMode&&t!=='show'){selMode=false;selSet.clear();selConf='';render()}selUI()}catch(e){}
  const tc=t==='table'||t==='compare';
  $('tabScrap').style.display=t==='scrap'?'block':'none';
  $('tabCards').style.display=t==='show'?'block':'none';
  $('tabShow').style.display=tc?'block':'none';$('filesWrap').style.display=t==='files'?'block':'none';document.body.classList.toggle('files-page',t==='files');if(t!=='files'){try{viewerClose();$('docViewer').style.display='none'}catch(e){}}
  document.querySelectorAll('#tabs2 button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  document.querySelectorAll('#docBottom button[data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===t));
  document.body.classList.toggle('home-screen',t==='scrap');
  closeAddMenu();
  $('shTSW').style.display=t==='table'?'flex':'none';
  {const pr=$('prRow');if(pr)pr.style.display=t==='compare'?'flex':'none'}
  if(tc){const v=t==='compare'?'summary':'table';if(shView!==v){shView=v;shSort={n:'',d:1}}renderShow()}
  if(t==='files'){try{renderLibrary()}catch(e){}}
  try{window.scrollTo(0,0)}catch(e){}
}
function cmpVals(a,b){
  const na=num(a),nb=num(b);
  if(na!==null&&nb!==null&&pDate(a)===null&&pDate(b)===null)return na-nb;
  const da=pDate(a),db=pDate(b);
  if(da!==null&&db!==null)return da-db;
  return String(a).localeCompare(String(b));
}
const MONN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CMP_KEY='ds_cmp_v1';
const cmp={g:'n',s:'',m:'val',m2:'avg',gal:false,mode:'table',mets:['cnt','qty','avg','mn','mx','val','last'],hl:true,items:null,itOpen:false};
try{const j=JSON.parse(localStorage.getItem(CMP_KEY)||'null');if(j&&typeof j==='object'){['g','s','m','m2','mode'].forEach(k=>{if(typeof j[k]==='string')cmp[k]=j[k]});if(Array.isArray(j.mets)&&j.mets.length)cmp.mets=j.mets.map(String);if(typeof j.hl==='boolean')cmp.hl=j.hl}}catch(e){}
const saveCmp=()=>{try{localStorage.setItem(CMP_KEY,JSON.stringify({g:cmp.g,s:cmp.s,m:cmp.m,m2:cmp.m2,mode:cmp.mode,mets:cmp.mets,hl:cmp.hl}))}catch(e){}};
let cmpKeys=[];
const fPr=v=>v>=1?v.toFixed(2):v.toFixed(4);
const fNum=v=>(Math.round(v*100)/100).toLocaleString('en-US',{maximumFractionDigits:2});
const A0=()=>({c:0,q:0,bq:0,sq:0,pS:0,pN:0,bS:0,bN:0,sS:0,sN:0,mn:null,mx:null,v:0,bv:0,sv:0,wq:0,wv:0,d0:null,d1:null});
function accAdd(a,r){
  const ty=rowType(r)==='s'?'s':'b';
  const q=map.q>=0?num(r[map.q]):null,p=map.p>=0?num(r[map.p]):null,qq=q===null?0:q;
  a.c++;a.q+=qq;
  if(ty==='s')a.sq+=qq;else a.bq+=qq;
  if(p!==null){
    a.pS+=p;a.pN++;a.mn=a.mn===null?p:Math.min(a.mn,p);a.mx=a.mx===null?p:Math.max(a.mx,p);
    const val=p*(map.q>=0?qq:1);a.v+=val;
    if(ty==='s'){a.sS+=p;a.sN++;a.sv+=val}else{a.bS+=p;a.bN++;a.bv+=val}
    if(q!==null){a.wq+=q;a.wv+=p*q}
  }
  if(map.d>=0){const t=pDate(r[map.d]);if(t!==null){if(a.d0===null||t<a.d0)a.d0=t;if(a.d1===null||t>a.d1)a.d1=t}}
}
const MT=[
{id:'cnt',l:'Cards',add:1,f:a=>a.c},
{id:'qty',l:'Total qty',add:1,f:a=>map.q>=0?a.q:null},
{id:'bq',l:'Buy qty',add:1,f:a=>map.q>=0?a.bq:null},
{id:'sq',l:'Sell qty',add:1,f:a=>map.q>=0?a.sq:null},
{id:'nq',l:'Net qty',add:1,f:a=>map.q>=0?a.bq-a.sq:null},
{id:'avg',l:'Avg price',p:1,f:a=>a.pN?a.pS/a.pN:null},
{id:'wavg',l:'Weighted avg',p:1,f:a=>a.wq?a.wv/a.wq:null},
{id:'ab',l:'Avg buy',p:1,f:a=>a.bN?a.bS/a.bN:null},
{id:'as',l:'Avg sell',p:1,f:a=>a.sN?a.sS/a.sN:null},
{id:'mn',l:'Min price',p:1,f:a=>a.mn},
{id:'mx',l:'Max price',p:1,f:a=>a.mx},
{id:'val',l:'Total value',add:1,f:a=>a.pN?a.v:null},
{id:'bv',l:'Buy value',add:1,f:a=>a.bN?a.bv:null},
{id:'sv',l:'Sell value',add:1,f:a=>a.sN?a.sv:null},
{id:'pv',l:'Value share %',pc:1,f:(a,x)=>a.pN&&x&&x.tv?a.v/x.tv*100:null},
{id:'first',l:'First date',t:1,f:a=>a.d0},
{id:'last',l:'Latest date',t:1,f:a=>a.d1}
];
const metOf=id=>MT.find(x=>x.id===id)||MT[0];
const mv=(M,a,x)=>{const v=M.f(a,x);return v===undefined?null:v};
function mfmt(M,v){
  if(v===null||v===undefined||(typeof v==='number'&&!isFinite(v)))return '';
  if(M.t)return fmtDate(iso(v));
  if(M.p)return fPr(v);
  if(M.pc)return v.toFixed(1)+'%';
  return fNum(v);
}
const mraw=(M,v)=>(M.t||typeof v!=='number'||!isFinite(v))?null:v;
function cmDims(){
  const D=[];
  if(map.n>=0)D.push({id:'n',l:'Name',get:r=>[String(r[map.n]??'').trim()||'(blank)']});
  if(map.d>=0){
    D.push({id:'d',l:'Date',get:r=>{const t=pDate(r[map.d]);return t===null?['(no date)']:[fmtDate(iso(t)),t]}});
    D.push({id:'mo',l:'Month',get:r=>{const t=pDate(r[map.d]);if(t===null)return ['(no date)'];const k=iso(t),mo=+k.slice(5,7);return [MONN[mo-1]+' '+k.slice(0,4),+k.slice(0,4)*12+mo]}});
  }
  D.push({id:'ty',l:'Buy / Sell',get:r=>[r.__net?'Net':rowType(r)==='s'?'Sell':'Buy']});
  header.forEach((h,i)=>{
    if(i===map.n||i===map.d||i===map.t)return;
    D.push({id:'c'+i,l:String(h).replace(/^x:/,'')||('Col '+(i+1)),get:r=>[String(r[i]??'').trim()||'(blank)']});
  });
  return D;
}

const CM=[
{id:'table',l:'Table'},{id:'tbars',l:'Table + bars'},{id:'heat',l:'Heatmap'},{id:'score',l:'Scorecard'},
{id:'col',l:'Column'},{id:'scol',l:'Stacked column'},{id:'bars',l:'Bar'},{id:'sbars',l:'Stacked bar'},
{id:'line',l:'Line'},{id:'area',l:'Area'},{id:'pie',l:'Pie'},{id:'donut',l:'Donut'},{id:'scatter',l:'Scatter'},{id:'side',l:'Side by side'}
];
const CHART=['bars','sbars','col','scol','line','area','pie','donut','scatter'];
const CL=['#2563eb','#d97706','#059669','#db2777','#7c3aed','#0891b2','#ea580c','#65a30d','#9333ea','#0d9488'];
function mergeA(list){
  const t=A0();
  list.forEach(a=>{
    ['c','q','bq','sq','pS','pN','bS','bN','sS','sN','v','bv','sv','wq','wv'].forEach(k=>{t[k]+=a[k]});
    if(a.mn!==null)t.mn=t.mn===null?a.mn:Math.min(t.mn,a.mn);
    if(a.mx!==null)t.mx=t.mx===null?a.mx:Math.max(t.mx,a.mx);
    if(a.d0!==null)t.d0=t.d0===null?a.d0:Math.min(t.d0,a.d0);
    if(a.d1!==null)t.d1=t.d1===null?a.d1:Math.max(t.d1,a.d1);
  });
  return t;
}
function thumb(id){
  const B='#5b8def',O='#f59e0b',V='#8b5cf6',G='#cbd5e1',L='#e2e8f0';
  let x='';
  switch(id){
    case 'table':x=`<rect x="5" y="5" width="50" height="5" fill="${G}"/>`+[14,21,28].map(y=>`<rect x="5" y="${y}" width="14" height="3" fill="${B}"/><rect x="23" y="${y}" width="32" height="3" fill="${L}"/>`).join('');break;
    case 'tbars':x=[6,13,20,27].map((y,i)=>`<rect x="5" y="${y}" width="12" height="3" fill="${G}"/><rect x="21" y="${y}" width="${[30,22,34,14][i]}" height="4" fill="${B}"/>`).join('');break;
    case 'heat':x=[0,1,2].map(r=>[0,1,2,3].map(c=>`<rect x="${6+c*12}" y="${6+r*10}" width="11" height="9" fill="${B}" opacity="${[.15,.4,.8,.3,.6,.2,.9,.5,.35,.7,.25,.55][r*4+c]}"/>`).join('')).join('');break;
    case 'score':x=`<text x="30" y="16" font-size="6" text-anchor="middle" fill="#64748b">Total</text><text x="30" y="31" font-size="13" text-anchor="middle" font-family="Georgia,serif" fill="#111">1,168</text>`;break;
    case 'col':x=[[7,18],[15,10],[23,24],[31,14],[39,20],[47,9]].map(([a,h])=>`<rect x="${a}" y="${36-h}" width="6" height="${h}" fill="${B}"/>`).join('');break;
    case 'scol':x=[[7,18,8],[17,10,12],[27,22,8],[37,12,10],[47,16,7]].map(([a,h,k])=>`<rect x="${a}" y="${36-h}" width="8" height="${h}" fill="${B}"/><rect x="${a}" y="${36-h-k}" width="8" height="${k}" fill="${O}"/>`).join('');break;
    case 'bars':x=[[5,30],[13,24],[21,18],[29,10]].map(([y,w])=>`<rect x="6" y="${y}" width="${w+16}" height="5" fill="${B}"/>`).join('');break;
    case 'sbars':x=[[5,30,10],[13,24,14],[21,18,12],[29,10,16]].map(([y,w,k])=>`<rect x="6" y="${y}" width="${w}" height="5" fill="${B}"/><rect x="${6+w}" y="${y}" width="${k}" height="5" fill="${O}"/>`).join('');break;
    case 'line':x=`<polyline points="5,30 15,22 25,26 35,12 45,16 55,7" fill="none" stroke="${B}" stroke-width="2"/><polyline points="5,34 15,30 25,28 35,24 45,26 55,18" fill="none" stroke="${O}" stroke-width="2"/>`;break;
    case 'area':x=`<polygon points="5,36 5,26 18,18 30,22 42,10 55,14 55,36" fill="${V}" opacity=".35"/><polyline points="5,26 18,18 30,22 42,10 55,14" fill="none" stroke="${V}" stroke-width="2"/>`;break;
    case 'pie':x=`<circle cx="30" cy="20" r="15" fill="${B}"/><path d="M30 20 L30 5 A15 15 0 0 1 44.2 25 Z" fill="${O}"/><path d="M30 20 L44.2 25 A15 15 0 0 1 22 33 Z" fill="${V}"/>`;break;
    case 'donut':x=`<circle cx="30" cy="20" r="11" fill="none" stroke="${B}" stroke-width="8"/><circle cx="30" cy="20" r="11" fill="none" stroke="${O}" stroke-width="8" stroke-dasharray="22 70" transform="rotate(-90 30 20)"/><circle cx="30" cy="20" r="11" fill="none" stroke="${V}" stroke-width="8" stroke-dasharray="14 70" stroke-dashoffset="-22" transform="rotate(-90 30 20)"/>`;break;
    case 'scatter':x=[[10,28],[16,22],[22,26],[28,14],[34,18],[42,9],[48,13],[20,32]].map(([a,b])=>`<circle cx="${a+3}" cy="${b}" r="2.4" fill="${B}"/>`).join('');break;
    case 'side':x=`<rect x="5" y="5" width="12" height="30" fill="${G}"/>`+[0,1,2].map(i=>`<rect x="${21+i*13}" y="5" width="11" height="5" fill="${[B,O,V][i]}"/>`+[14,21,28].map(y=>`<rect x="${21+i*13}" y="${y}" width="11" height="3" fill="${L}"/>`).join('')).join('');break;
  }
  return `<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">${x}</svg>`;
}
function cmpBuild(src,q){
  const E={cols:[],data:[],foot:null,raw:[],hl:null,nosort:false,note:'',bars:null};
  const D=cmDims();
  if(!D.find(d=>d.id===cmp.g))cmp.g=D[0]?D[0].id:'';
  if(cmp.s&&(cmp.s===cmp.g||!D.find(d=>d.id===cmp.s)))cmp.s='';
  cmp.mets=MT.filter(x=>cmp.mets.includes(x.id)).map(x=>x.id);
  if(!cmp.mets.length)cmp.mets=['cnt','qty','avg','val'];
  if(!MT.find(x=>x.id===cmp.m))cmp.m='val';
  const g=D.find(d=>d.id===cmp.g);
  if(!g){cmpKeys=[];return E}
  if(!CM.find(x=>x.id===cmp.mode))cmp.mode='table';
  const side=cmp.mode==='side',bm=CHART.includes(cmp.mode),isScore=cmp.mode==='score';
  if(bm&&metOf(cmp.m).t)cmp.m='val';
  if(!MT.find(x=>x.id===cmp.m2)||metOf(cmp.m2).t)cmp.m2='avg';
  const sp=(!side&&!isScore&&cmp.s)?D.find(d=>d.id===cmp.s):null;
  const GM=new Map(),SM=new Map();
  src.forEach(r=>{
    const x=g.get(r),k=x[0].toUpperCase();
    let o=GM.get(k);if(!o){o={k,l:x[0],s:x[1],a:A0(),m:new Map()};GM.set(k,o)}
    accAdd(o.a,r);
    if(sp){
      const y=sp.get(r),sk=y[0].toUpperCase();
      if(!SM.has(sk))SM.set(sk,{k:sk,l:y[0],s:y[1]});
      let a=o.m.get(sk);if(!a){a=A0();o.m.set(sk,a)}
      accAdd(a,r);
    }
  });
  const dsort=(a,b)=>(a.s===undefined?1e18:a.s)-(b.s===undefined?1e18:b.s);
  let gs=[...GM.values()];
  if(g.id==='d'||g.id==='mo')gs.sort(dsort);
  cmpKeys=gs.map(o=>({k:o.k,l:o.l,v:o.a.pN?o.a.v:0,c:o.a.c}));
  if(cmp.items)gs=gs.filter(o=>cmp.items.has(o.k));
  if(q)gs=gs.filter(o=>o.l.toLowerCase().includes(q));
  const X={tv:gs.reduce((t,o)=>t+(o.a.pN?o.a.v:0),0)};

  if(isScore){
    const T=mergeA(gs.map(o=>o.a));
    const ms=MT.filter(m=>cmp.mets.includes(m.id));
    E.score={n:gs.length,g:g.l,tiles:ms.map(m=>({l:m.l,v:mfmt(m,mv(m,T,{tv:T.pN?T.v:0}))}))};
    E.cols=[{n:'Metric',nc:1},{n:'Value',num:1}];
    E.data=E.score.tiles.map(t=>[t.l,t.v]);E.raw=E.data.map(()=>[null,null]);E.nosort=true;
    return E;
  }
  if(side){
    let sel=gs;
    if(!cmp.items){
      sel=gs.slice().sort((a,b)=>(b.a.v-a.a.v)||(b.a.c-a.a.c)).slice(0,6);
      if(gs.length>6)E.note='Showing the top 6 by total value. Use Items to choose exactly what to compare.';
    }else if(sel.length>12){sel=sel.slice(0,12);E.note='Showing the first 12 selected items.'}
    const two=sel.length===2;
    E.cols=[{n:'Metric',nc:1},...sel.map(o=>({n:o.l,num:1}))];
    if(two)E.cols.push({n:'Diff (B − A)',num:1,nc:1},{n:'Diff %',num:1,nc:1});
    MT.filter(m=>cmp.mets.includes(m.id)).forEach(M=>{
      const vals=sel.map(o=>mv(M,o.a,X));
      const row=[M.l,...vals.map(v=>mfmt(M,v))],rw=[null,...vals.map(v=>mraw(M,v))];
      if(two){
        const a=vals[0],b=vals[1];
        if(typeof a==='number'&&typeof b==='number'){
          const d=b-a,sg=d>0?'+':'';
          if(M.t){row.push(sg+Math.round(d/864e5)+' d','')}
          else row.push(sg+(M.p?(Math.abs(d)>=0.01?d.toFixed(2):d.toFixed(4)):M.pc?d.toFixed(1)+'%':fNum(d)),a!==0?sg+(d/Math.abs(a)*100).toFixed(1)+'%':'');
        }else row.push('','');
        rw.push(null,null);
      }
      E.data.push(row);E.raw.push(rw);
    });
    E.hl='row';E.nosort=true;
    return E;
  }

  const M=metOf(cmp.m);
  let sv=[];
  if(sp){
    sv=[...SM.values()];if(sp.id==='d'||sp.id==='mo')sv.sort(dsort);
    const svs=sv.slice(0,40);
    if(sv.length>40)E.note='Showing the first 40 of '+sv.length+' "'+sp.l+'" values.';
    E.cols=[{n:g.l,nc:1},...svs.map(s=>({n:s.l,num:1})),{n:'Total',num:1,nc:1}];
    gs.forEach(o=>{
      const vals=svs.map(s=>{const a=o.m.get(s.k);return a?mv(M,a,X):null}),tv=mv(M,o.a,X);
      E.data.push([o.l,...vals.map(v=>mfmt(M,v)),mfmt(M,tv)]);
      E.raw.push([null,...vals.map(v=>mraw(M,v)),mraw(M,tv)]);
    });
    if(M.add)E.foot=['Total',...E.cols.slice(1).map((c,i)=>{let t=0,n=0;E.raw.forEach(r=>{const v=r[i+1];if(typeof v==='number'){t+=v;n++}});return n?mfmt(M,t):''})];
    E.hl='row';
  }else{
    const ms=bm?[M]:MT.filter(m=>cmp.mets.includes(m.id));
    E.cols=[{n:g.l,nc:1},...ms.map(m=>({n:m.l,num:1}))];
    gs.forEach(o=>{
      const vals=ms.map(m=>mv(m,o.a,X));
      E.data.push([o.l,...vals.map((v,i)=>mfmt(ms[i],v))]);
      E.raw.push([null,...vals.map((v,i)=>mraw(ms[i],v))]);
    });
    E.foot=['Total',...ms.map((m,i)=>{if(!m.add)return '';let t=0,n=0;E.raw.forEach(r=>{const v=r[i+1];if(typeof v==='number'){t+=v;n++}});return n?mfmt(m,t):''})];
    E.hl='col';
  }
  if(bm){
    const ser=sp?sv.slice(0,6):[{l:M.l}];
    let gg=gs.map(o=>({l:o.l,t:mraw(M,mv(M,o.a,X)),vals:sp?ser.map(s=>{const a=o.m.get(s.k);return a?mraw(M,mv(M,a,X)):null}):[mraw(M,mv(M,o.a,X))]}));
    const chrono=g.id==='d'||g.id==='mo';
    if(!chrono)gg.sort((a,b)=>(b.t===null?-1e18:b.t)-(a.t===null?-1e18:a.t));
    const tot=gg.length;gg=gg.slice(0,40);
    const M2=metOf(cmp.m2);
    E.bars={mode:cmp.mode,met:M.l+(sp?'  ·  '+g.l+' × '+sp.l:'  ·  by '+g.l),series:ser.map(s=>s.l),groups:gg,more:tot>40?tot-40:0,fmt:v=>mfmt(M,v),
      m1:M.l,m2:M2.l,fmt2:v=>mfmt(M2,v),
      pts:cmp.mode==='scatter'?gs.map(o=>({l:o.l,x:mraw(M,mv(M,o.a,X)),y:mraw(M2,mv(M2,o.a,X))})).filter(p=>typeof p.x==='number'&&typeof p.y==='number').slice(0,60):null};
  }
  return E;
}
function showModel(){
  let src=shFilt?rows:baseRows;
  if(shNet)src=netRows(src);
  const q=($('shQ').value||'').trim().toLowerCase();
  let cols=[],data=[],foot=null,raw=null,hl=null,bars=null,score=null,nosort=false,note='';
  if(shView==='summary'){
    const c=cmpBuild(src,q);
    cols=c.cols;data=c.data;foot=c.foot;raw=c.raw;hl=c.hl;bars=c.bars;score=c.score||null;nosort=c.nosort;note=c.note;
  }else{
    const order=[];[map.d,map.n,map.q,map.p].forEach(i=>{if(i>=0&&!order.includes(i))order.push(i)});
    header.forEach((h,i)=>{if(!order.includes(i))order.push(i)});
    cols=order.map(i=>({n:String(header[i]).replace(/^x:/,'')||('Col '+(i+1)),num:i===map.q||i===map.p?1:0}));
    data=src.map(r=>order.map(i=>i===map.d?fmtDate(r[i]):String(r[i]??'')));
    if(q)data=data.filter(r=>r.some(v=>String(v).toLowerCase().includes(q)));
  }
  const hide=shHide[shView];
  const keep=cols.map((c,i)=>hide.has(c.n)?-1:i).filter(i=>i>=0);
  const vcols=keep.map(i=>cols[i]);
  const idx=data.map((_,i)=>i);
  const sk=nosort?-1:vcols.findIndex(c=>c.n===shSort.n);
  if(sk>=0)idx.sort((a,b)=>shSort.d*cmpVals(data[a][keep[sk]],data[b][keep[sk]]));
  const vdata=idx.map(i=>keep.map(k=>data[i][k]));
  const vraw=raw?idx.map(i=>keep.map(k=>raw[i][k])):null;
  const vfoot=foot?keep.map(i=>foot[i]):null;
  return {allCols:cols,cols:vcols,data:vdata,raw:vraw,foot:vfoot,hl,bars,score,nosort,note};
}
function barsHtml(m){
  const b=m.bars;
  if(!b.groups.length)return '<div class="mut" style="padding:14px">No items match.</div>';
  const cl=['#2563eb','#d97706','#059669','#db2777','#7c3aed','#0891b2'];
  let mx=0;b.groups.forEach(g=>g.vals.forEach(v=>{if(typeof v==='number')mx=Math.max(mx,Math.abs(v))}));
  const leg=b.series.length>1?`<div class="leg">${b.series.map((s,i)=>`<span><i style="background:${cl[i%6]}"></i>${esc(s)}</span>`).join('')}</div>`:'';
  const rh=b.groups.map(g=>`<div class="bgp"><div class="bl" title="${escA(g.l)}">${esc(g.l)}</div><div class="bw">${g.vals.map((v,i)=>{const ok=typeof v==='number',w=ok&&mx?Math.max(1,Math.abs(v)/mx*100):0;return `<div class="br"><div class="btr"><div class="bb" style="width:${w}%;background:${ok&&v<0?'#dc2626':cl[i%6]}"></div></div><span class="bv">${ok?esc(b.fmt(v)):'–'}</span></div>`}).join('')}</div></div>`).join('');
  return `<div class="bars"><div class="mut" style="margin:0 0 6px;font-weight:600">${esc(b.met)}</div>${leg}${rh}${b.more?`<div class="mut">+${b.more} more not shown. Use Items to pick.</div>`:''}</div>`;
}

const shortT=(t,n)=>{t=String(t);return t.length>n?t.slice(0,n-1)+'…':t};
const kfmt=v=>{const a=Math.abs(v);return a>=1e9?+(v/1e9).toFixed(1)+'B':a>=1e6?+(v/1e6).toFixed(1)+'M':a>=1e4?+(v/1e3).toFixed(1)+'K':a>=1?String(+v.toFixed(2)):String(+v.toFixed(3))};
function niceScale(lo,hi){
  if(hi<=lo){hi=lo+1}
  const raw=(hi-lo)/4,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p;
  const st=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;
  const a=Math.floor(lo/st+1e-9)*st,b=Math.ceil(hi/st-1e-9)*st,t=[];
  for(let v=a;v<=b+st/2;v+=st)t.push(+v.toFixed(10));
  return {lo:a,hi:b,t};
}
function legHtml(ser){return ser.length>1?`<div class="leg">${ser.map((x,i)=>`<span><i style="background:${CL[i%CL.length]}"></i>${esc(x)}</span>`).join('')}</div>`:''}
function cartesian(b){
  const G=b.groups,n=G.length,ns=b.series.length,mode=b.mode;
  const stacked=mode==='scol';
  let lo=0,hi=0;
  G.forEach(g=>{
    if(stacked){let t=0;g.vals.forEach(v=>{if(typeof v==='number'&&v>0)t+=v});hi=Math.max(hi,t)}
    else g.vals.forEach(v=>{if(typeof v==='number'){hi=Math.max(hi,v);lo=Math.min(lo,v)}});
  });
  if(mode==='line'||mode==='area'){
    let mn=Infinity,mx=-Infinity;G.forEach(g=>g.vals.forEach(v=>{if(typeof v==='number'){mn=Math.min(mn,v);mx=Math.max(mx,v)}}));
    if(mode==='line'&&isFinite(mn)&&mn>0&&mn>mx*0.5){lo=mn-(mx-mn)*.1;if(lo<0)lo=0}
  }
  const sc=niceScale(lo,hi);
  const rot=n>4,padL=56,padR=10,padT=14,padB=rot?84:38;
  const slotMin=stacked||ns<2?(mode==='line'||mode==='area'?34:30):ns*13+14;
  const W=Math.max(600,padL+padR+n*slotMin),H=360;
  const iw=W-padL-padR,ih=H-padT-padB,slot=iw/Math.max(n,1);
  const Y=v=>padT+ih-(v-sc.lo)/(sc.hi-sc.lo)*ih;
  let o=`<svg class="cch" viewBox="0 0 ${W} ${H}" style="${W>600?`min-width:${Math.round(W*.6)}px`:''}" xmlns="http://www.w3.org/2000/svg">`;
  sc.t.forEach(t=>{o+=`<line class="gl" x1="${padL}" x2="${W-padR}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${padL-6}" y="${Y(t)+5}" text-anchor="end">${kfmt(t)}</text>`});
  G.forEach((g,i)=>{
    const cx=padL+slot*(i+.5),lb=shortT(g.l,rot?14:10);
    o+=rot?`<text x="${cx}" y="${padT+ih+14}" text-anchor="end" transform="rotate(-45 ${cx} ${padT+ih+14})">${esc(lb)}</text>`:`<text x="${cx}" y="${padT+ih+22}" text-anchor="middle">${esc(lb)}</text>`;
  });
  if(mode==='col'||mode==='scol'){
    const showV=n*ns<=8;
    G.forEach((g,i)=>{
      const x0=padL+slot*i,bw=stacked||ns===1?Math.min(slot*.62,60):Math.min(slot*.8/ns,36);
      let acc=0;
      g.vals.forEach((v,j)=>{
        if(typeof v!=='number')return;
        const col=v<0&&ns===1?'#dc2626':CL[j%CL.length];
        let x,y,h;
        if(stacked){const k=Math.max(v,0);x=x0+(slot-bw)/2;y=Y(acc+k);h=Y(acc)-y;acc+=k}
        else{x=x0+(slot-bw*ns)/2+j*bw;const y0=Y(0),y1=Y(v);y=Math.min(y0,y1);h=Math.abs(y0-y1)}
        o+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*.9).toFixed(1)}" height="${Math.max(h,1).toFixed(1)}" rx="3" fill="${col}"><title>${esc(g.l+(ns>1?' · '+b.series[j]:'')+': '+b.fmt(v))}</title></rect>`;
        if(showV&&!stacked)o+=`<text class="vl" x="${(x+bw*.45).toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle">${esc(kfmt(v))}</text>`;
      });
    });
  }else{
    for(let j=0;j<ns;j++){
      const pts=[];G.forEach((g,i)=>{const v=g.vals[j];if(typeof v==='number')pts.push([padL+slot*(i+.5),Y(v),v,g.l])});
      if(!pts.length)continue;
      const col=CL[j%CL.length],ps=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
      if(mode==='area')o+=`<polygon points="${pts[0][0].toFixed(1)},${Y(Math.max(sc.lo,0)).toFixed(1)} ${ps} ${pts[pts.length-1][0].toFixed(1)},${Y(Math.max(sc.lo,0)).toFixed(1)}" fill="${col}" opacity=".22"/>`;
      o+=`<polyline points="${ps}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach(p=>{o+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="${col}"><title>${esc(p[3]+(ns>1?' · '+b.series[j]:'')+': '+b.fmt(p[2]))}</title></circle>`});
    }
  }
  o+='</svg>';
  return `<div class="cscr">${o}</div>`;
}
function pieSvg(b,donut){
  let items=b.groups.map(g=>({l:g.l,v:typeof g.t==='number'&&g.t>0?g.t:0})).filter(x=>x.v>0);
  items.sort((a,c)=>c.v-a.v);
  if(items.length>8){const rest=items.slice(7).reduce((t,x)=>t+x.v,0);items=items.slice(0,7);items.push({l:'Other',v:rest})}
  const tot=items.reduce((t,x)=>t+x.v,0);
  if(!tot)return '<div class="mut" style="padding:14px">Pie needs positive values. Pick another measure.</div>';
  const R=130,r=donut?72:0,cx=150,cy=150;
  let a0=-Math.PI/2,o=`<svg class="cch" viewBox="0 0 300 300" style="max-width:300px;margin:0 auto" xmlns="http://www.w3.org/2000/svg">`;
  items.forEach((it,i)=>{
    const fr=it.v/tot,a1=a0+fr*Math.PI*2,col=CL[i%CL.length];
    if(fr>=.9999){o+=donut?`<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none" stroke="${col}" stroke-width="${R-r}"/>`:`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col}"/>`}
    else{
      const p=(a,rr)=>[(cx+Math.cos(a)*rr).toFixed(2),(cy+Math.sin(a)*rr).toFixed(2)],lg=fr>.5?1:0;
      const A=p(a0,R),B=p(a1,R),C=p(a1,r),D=p(a0,r);
      const d=donut?`M${A} A${R} ${R} 0 ${lg} 1 ${B} L${C} A${r} ${r} 0 ${lg} 0 ${D} Z`:`M${cx} ${cy} L${A} A${R} ${R} 0 ${lg} 1 ${B} Z`;
      o+=`<path d="${d}" fill="${col}" stroke="var(--card)" stroke-width="2"><title>${esc(it.l+': '+b.fmt(it.v)+' ('+(fr*100).toFixed(1)+'%)')}</title></path>`;
    }
    it.c=col;it.p=fr*100;a0=a1;
  });
  if(donut)o+=`<text x="${cx}" y="${cy-2}" text-anchor="middle" style="font-size:15px">Total</text><text x="${cx}" y="${cy+22}" text-anchor="middle" style="font-size:24px;fill:var(--tx);font-weight:700">${esc(kfmt(tot))}</text>`;
  o+='</svg>';
  const lg=`<div class="pleg">${items.map(it=>`<div><i style="background:${it.c}"></i><span title="${escA(it.l)}">${esc(it.l)}</span><b>${esc(b.fmt(it.v))}</b><em class="mut" style="font-style:normal;min-width:44px;text-align:right">${it.p.toFixed(1)}%</em></div>`).join('')}</div>`;
  return o+lg;
}
function scatterSvg(b){
  const P=b.pts||[];
  if(P.length<1)return '<div class="mut" style="padding:14px">No numeric values for these two measures.</div>';
  const xs=P.map(p=>p.x),ys=P.map(p=>p.y);
  const sx=niceScale(Math.min(0,...xs),Math.max(...xs)),sy=niceScale(Math.min(0,...ys),Math.max(...ys));
  const W=600,H=360,pl=56,pr=14,pt=14,pb=44,iw=W-pl-pr,ih=H-pt-pb;
  const X=v=>pl+(v-sx.lo)/(sx.hi-sx.lo)*iw,Y=v=>pt+ih-(v-sy.lo)/(sy.hi-sy.lo)*ih;
  let o=`<svg class="cch" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  sy.t.forEach(t=>{o+=`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${pl-6}" y="${Y(t)+5}" text-anchor="end">${kfmt(t)}</text>`});
  sx.t.forEach(t=>{o+=`<line class="gl" y1="${pt}" y2="${pt+ih}" x1="${X(t)}" x2="${X(t)}"/><text x="${X(t)}" y="${pt+ih+20}" text-anchor="middle">${kfmt(t)}</text>`});
  o+=`<text x="${pl+iw/2}" y="${H-6}" text-anchor="middle" style="font-weight:600">${esc(b.m1)}</text>`;
  const lab=P.length<=18;
  P.forEach((p,i)=>{
    const c=CL[i%CL.length];
    o+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="8" fill="${c}" opacity=".8"><title>${esc(p.l+' — '+b.m1+': '+b.fmt(p.x)+', '+b.m2+': '+b.fmt2(p.y))}</title></circle>`;
    if(lab)o+=`<text class="vl" x="${(X(p.x)+11).toFixed(1)}" y="${(Y(p.y)+5).toFixed(1)}">${esc(shortT(p.l,10))}</text>`;
  });
  o+='</svg>';
  return `<div class="mut" style="margin:0 0 4px">Y: ${esc(b.m2)}</div>${o}`;
}
function sbarsHtml(b){
  const G=b.groups;
  if(!G.length)return '<div class="mut" style="padding:14px">No items match.</div>';
  const tot=g=>g.vals.reduce((t,v)=>t+(typeof v==='number'&&v>0?v:0),0);
  const mx=Math.max(...G.map(tot),0);
  return legHtml(b.series)+G.map(g=>{
    const t=tot(g);
    return `<div class="bgp"><div class="bl" title="${escA(g.l)}">${esc(g.l)}</div><div class="sbt"><div class="btr" style="width:${mx?Math.max(t/mx*100,1):0}%;flex:none;max-width:calc(100% - 64px)">${g.vals.map((v,j)=>typeof v==='number'&&v>0&&t?`<div style="width:${v/t*100}%;background:${CL[j%CL.length]}" title="${escA((b.series.length>1?b.series[j]+': ':'')+b.fmt(v))}"></div>`:'').join('')}</div><span class="bv">${esc(b.fmt(t))}</span></div></div>`;
  }).join('');
}
function chartHtml(m){
  const b=m.bars,md=b.mode;
  if(md==='bars')return barsHtml(m);
  let inner='';
  if(!b.groups.length&&md!=='scatter')inner='<div class="mut" style="padding:14px">No items match.</div>';
  else if(md==='sbars')inner=sbarsHtml(b);
  else if(md==='pie'||md==='donut')inner=pieSvg(b,md==='donut');
  else if(md==='scatter')inner=scatterSvg(b);
  else inner=legHtml(b.series)+cartesian(b);
  return `<div class="bars"><div class="mut" style="margin:0 0 6px;font-weight:600">${esc(md==='scatter'?b.m1+' vs '+b.m2:b.met)}</div>${inner}${b.more?`<div class="mut">+${b.more} more not shown. Use Items to pick.</div>`:''}</div>`;
}
function scoreHtml(sc){
  return `<div class="score">${sc.tiles.map(t=>`<div class="sc"><small>${esc(t.l)}</small><b>${esc(t.v||'–')}</b></div>`).join('')}</div><div class="note" style="padding:0 10px 8px">${sc.n} ${esc(sc.g)} items included. Use Items to choose which ones.</div>`;
}
function renderCmpBar(){
  const bar=$('cmpBar');
  const D=cmDims();
  const o=(v,l,cur)=>`<option value="${escA(v)}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`;
  const multi=(['table','tbars','heat'].includes(cmp.mode)&&!cmp.s)||cmp.mode==='side'||cmp.mode==='score';
  const cur=CM.find(x=>x.id===cmp.mode)||CM[0];
  const gal=`<div class="cgal" style="display:${cmp.gal?'grid':'none'}">${CM.map(x=>`<button class="ct${x.id===cmp.mode?' on':''}" data-ct="${x.id}" title="${escA(x.l)}">${thumb(x.id)}${esc(x.l)}</button>`).join('')}</div>`;
  const sel=cmp.items,n=cmpKeys.length;
  const items=`<div style="position:relative"><button class="alt sm" id="cmItB">Items: ${sel?sel.size+' of '+n:'All ('+n+')'} ▾</button><div id="cmItM" class="menu cmim" style="display:${cmp.itOpen?'flex':'none'}"><div class="cmq"><button class="alt sm" data-ia="all">All</button><button class="alt sm" data-ia="none">None</button><button class="alt sm" data-ia="top5">Top 5</button></div>${cmpKeys.slice(0,300).map(x=>`<label class="ci"><input type="checkbox" data-it="${escA(x.k)}"${!sel||sel.has(x.k)?' checked':''}> ${esc(x.l)}</label>`).join('')}${n>300?`<div class="mut" style="padding:4px 8px">+${n-300} more not listed</div>`:''}</div></div>`;
  const metUI=multi
    ?`<div class="chips">${MT.map(x=>`<label class="chip${cmp.mets.includes(x.id)?' on':''}"><input type="checkbox" data-met="${x.id}"${cmp.mets.includes(x.id)?' checked':''}>${esc(x.l)}</label>`).join('')}</div>`
    :`<label>Measure<select id="cmM">${MT.filter(x=>!(CHART.includes(cmp.mode)&&x.t)).map(x=>o(x.id,x.l,cmp.m)).join('')}</select></label>${cmp.mode==='scatter'?`<label>Y axis<select id="cmM2">${MT.filter(x=>!x.t).map(x=>o(x.id,x.l,cmp.m2)).join('')}</select></label>`:''}`;
  bar.innerHTML=`<div class="cmrow"><label>Compare by<select id="cmG">${D.map(d=>o(d.id,d.l,cmp.g)).join('')}</select></label><label>Split by<select id="cmS"${cmp.mode==='side'||cmp.mode==='score'?' disabled':''}><option value="">None</option>${D.filter(d=>d.id!==cmp.g).map(d=>o(d.id,d.l,cmp.s)).join('')}</select></label><label>Chart type<button class="cgbd" id="cmGalB">${thumb(cur.id)}<span>${esc(cur.l)} ▾</span></button></label>${items}</div>${gal}<div class="cmrow">${metUI}${['table','side'].includes(cmp.mode)?`<label class="rgl"><input type="checkbox" id="cmHl"${cmp.hl?' checked':''}> Highlight high / low</label>`:''}</div>`;
}
function renderShow(full){
  full=full!==false;
  const body=$('shBody'),isC=shView==='summary';
  $('cmpBar').style.display=isC?'block':'none';
  if(!baseRows.length){body.innerHTML='<div class="mut" style="padding:14px">No data yet. Add files in the Scrap tab.</div>';$('shN').textContent='';$('shColMenu').innerHTML='';$('cmpBar').innerHTML='';return}
  const m=showModel();
  if(isC&&full)renderCmpBar();
  const hide=shHide[shView];
  $('shColMenu').innerHTML=m.allCols.map(c=>`<label class="ci"><input type="checkbox" data-col="${escA(c.n)}"${hide.has(c.n)?'':' checked'}> ${esc(c.n)}</label>`).join('');
  const total=m.data.length;
  $('shN').textContent=total+(isC?(cmp.mode==='side'?' metrics':' groups'):' rows');
  const note=m.note?`<div class="note" style="padding:6px 8px 0">${esc(m.note)}</div>`:'';
  if(m.score){body.innerHTML=scoreHtml(m.score);return}
  if(m.bars){body.innerHTML=note+chartHtml(m);return}
  if(!m.cols.length){body.innerHTML='<div class="mut" style="padding:14px">All columns are hidden. Use Columns to show some.</div>';return}
  const rn=false;
  const shown=m.data.slice(0,500);
  let hlm=null;
  const sty=isC?(cmp.mode==='tbars'?'bars':cmp.mode==='heat'?'heat':'grid'):shTS;
  if(sty==='grid'&&m.hl&&cmp.hl&&m.raw&&(!isC||['table','side'].includes(cmp.mode))){
    hlm=m.data.map(()=>m.cols.map(()=>''));
    const mark=cells=>{
      const vs=cells.filter(c=>typeof c[2]==='number'&&isFinite(c[2]));
      if(vs.length<2)return;
      const mx=Math.max(...vs.map(c=>c[2])),mn=Math.min(...vs.map(c=>c[2]));
      if(mx===mn)return;
      vs.forEach(c=>{if(c[2]===mx)hlm[c[0]][c[1]]=' hi';else if(c[2]===mn)hlm[c[0]][c[1]]=' lo'});
    };
    if(m.hl==='col')m.cols.forEach((c,ci)=>{if(!c.nc)mark(m.raw.map((r,ri)=>[ri,ci,r[ci]]))});
    else m.raw.forEach((r,ri)=>mark(m.cols.map((c,ci)=>[ri,ci,c.nc?null:r[ci]])));
  }
  const cv=v=>{const t=String(v??'').trim();return BUYRE.test(t)?'<span class="tg b">Buy</span>':SELLRE.test(t)?'<span class="tg s">Sell</span>':esc(t)};
  const th=(rn?'<th class="rn">#</th>':'')+m.cols.map((c,k)=>`<th${m.nosort?'':` data-n="${escA(c.n)}"`} class="${(c.num?'n':'')+(k===0?' fc':'')}">${esc(c.n)}${shSort.n===c.n&&!m.nosort?(shSort.d>0?' ▲':' ▼'):''}</th>`).join('');
  let cst=null;
  if(sty!=='grid'){
    const gv=(ri,k)=>{const x=m.raw&&m.raw[ri]?m.raw[ri][k]:(m.cols[k].num?num(m.data[ri][k]):null);return typeof x==='number'&&isFinite(x)?x:null};
    const st=m.cols.map((c,k)=>{if(!c.num||c.nc)return null;let mn=Infinity,mx=-Infinity;m.data.forEach((_,ri)=>{const v=gv(ri,k);if(v!==null){mn=Math.min(mn,v);mx=Math.max(mx,v)}});return isFinite(mn)?{mn,mx}:null});
    if(isC&&m.hl==='row'){let mn=Infinity,mx=-Infinity;st.forEach(x=>{if(x){mn=Math.min(mn,x.mn);mx=Math.max(mx,x.mx)}});st.forEach(x=>{if(x){x.mn=mn;x.mx=mx}})}
    cst=(ri,k)=>{
      const x=st[k],v=x?gv(ri,k):null;if(v===null)return '';
      if(sty==='bars'){const top=Math.max(x.mx,0),p=top>0?Math.max(2,Math.min(100,Math.max(v,0)/top*100)):0;return ` style="background:linear-gradient(90deg,rgba(37,99,235,.30) ${p}%,transparent ${p}%)"`}
      const t=x.mx>x.mn?(v-x.mn)/(x.mx-x.mn):.5;return ` style="background:rgba(37,99,235,${(.07+.55*t).toFixed(2)})"`;
    };
  }
  const tr=shown.map((r,ri)=>'<tr>'+(rn?`<td class="rn">${ri+1}</td>`:'')+r.map((v,k)=>`<td class="${(m.cols[k].num?'n':'')+(k===0?' fc':'')+(hlm?hlm[ri][k]:'')}"${cst?cst(ri,k):''}>${cv(v)}</td>`).join('')+'</tr>').join('');
  const ft=m.foot?'<tr class="ft">'+(rn?'<td class="rn"></td>':'')+m.foot.map((v,k)=>`<td class="${(m.cols[k].num?'n':'')+(k===0?' fc':'')}"><b>${esc(v)}</b></td>`).join('')+'</tr>':'';
  body.innerHTML=note+`<table class="gt${rn?' rn':''}${m.nosort?' ns':''}"><thead><tr>${th}</tr></thead><tbody>${tr}${ft}</tbody></table>`+(total>500?`<div class="mut" style="padding:6px 8px">Showing first 500 of ${total} (exports include all)</div>`:'');
}
function showFile(ext){return pfile(ext).replace(/(\.\w+)$/,'-'+(shView==='summary'?'summary':'data')+(shNet?'-net':'')+'$1')}
function showAll(){const m=showModel();return {head:m.cols.map(c=>c.n),data:m.foot?[...m.data,m.foot]:m.data}}
const BUYRE=/^(buy|bought)$/i,SELLRE=/^(sell|sale|sold)$/i;
function typeOf(r){
  if(r.__net)return 'n';
  const cells=Array.from(r);
  if(r.__o)cells.push(...r.__o);
  if(r.__m&&r.__m.t)cells.push(r.__m.t);
  if(cells.some(c=>BUYRE.test(String(c??'').trim())))return 'b';
  if(cells.some(c=>SELLRE.test(String(c??'').trim())))return 's';
  {const ti=map.t>=0?map.t:header.indexOf('x:Type');if((r.__m&&/^net$/i.test(String(r.__m.t||'').trim()))||(ti>=0&&/^net$/i.test(String(r[ti]??'').trim())))return 'n'}
  return '';
}
const tyVal=t=>t==='b'?'Buy':t==='s'?'Sell':t==='n'?'Net':'';
function setType(row,val){
  if(row.__m){row.__m.t=val;return}
  let ci=map.t;
  if(ci>=0){setCell(row,ci,val);return}
  ci=header.indexOf('x:Type');
  if(ci<0){store.forEach(s=>{if(s.header.indexOf('x:Type')<0){s.header.push('x:Type');s.rows.forEach(r=>r.push(''))}})}
  const s=row.__s,si=s?s.header.indexOf('x:Type'):-1;
  if(si>=0&&row.__o)row.__o[si]=val;
}
const tagHtml=t=>t?`<span class="tg ${t}">${t==='b'?'Buy':t==='s'?'Sell':'Net'}</span>`:'';
function rowType(r){
  const cells=Array.from(r);
  if(r.__o)cells.push(...r.__o);
  if(r.__m&&r.__m.t)cells.push(r.__m.t);
  if(cells.some(c=>BUYRE.test(String(c??'').trim())))return 'b';
  if(cells.some(c=>SELLRE.test(String(c??'').trim())))return 's';
  return 'b';
}
const fmtN=v=>String(Math.round(v*1e6)/1e6);
function netRows(list){
  if(map.q<0||map.n<0)return list;
  const groups=new Map();
  list.forEach((r,i)=>{
    const k=String(r[map.n]).trim().toUpperCase();
    let g=groups.get(k);if(!g){g=[];groups.set(k,g)}
    g.push({r,i,t:rowType(r),d:map.d>=0?(pDate(r[map.d])??0):0,q:num(r[map.q])});
  });
  const out=[];
  groups.forEach(g=>{
    g.sort((a,b)=>(a.d-b.d)||((a.t==='b'?0:1)-(b.t==='b'?0:1))||(a.i-b.i));
    const lots=[];
    g.forEach(e=>{
      const q=e.q===null?0:e.q;
      if(e.t==='b'){lots.push({r:e.r,q})}
      else{let left=q;while(left>1e-12&&lots.length){const l=lots[0];if(l.q<=left+1e-12){left-=l.q;lots.shift()}else{l.q-=left;left=0}}}
    });
    lots.forEach(l=>{if(l.q<=1e-12)return;const nr=l.r.slice();nr[map.q]=fmtN(l.q);nr.__net=true;nr.__src=l.r;if(l.r.__o)nr.__o=l.r.__o;if(l.r.__m)nr.__m=l.r.__m;out.push(nr)});
  });
  return out;
}
function renderCtab(){
  const box=$('ctab');
  if(!box||$('cust').style.display==='none'||$('cdata').style.display==='none')return;
  const list=baseRows,n=Math.min(list.length,300);
  const xc=fields.slice();
  let h='<table><thead><tr><th>Date</th><th>Name</th><th>Qty</th><th>Price</th><th>Type</th>'+xc.map(f=>'<th>'+esc(f)+'</th>').join('')+'<th></th></tr></thead><tbody>';
  for(let i=0;i<n;i++){
    const r=list[i],t=pDate(cell(r,map.d));
    h+=`<tr data-i="${i}"><td>${map.d>=0?`<input type="date" data-c="d" value="${t!==null?iso(t):''}">`:''}</td><td>${map.n>=0?`<input data-c="n" value="${escA(cell(r,map.n))}">`:''}</td><td>${map.q>=0?`<input data-c="q" value="${escA(cell(r,map.q))}">`:''}</td><td>${map.p>=0?`<input data-c="p" value="${escA(cell(r,map.p))}">`:''}</td><td><select data-c="t" title="Type">${[['','All'],['Buy','Buy'],['Sell','Sell'],['Net','Net']].map(([v,l])=>`<option value="${v}"${tyVal(typeOf(r))===v?' selected':''}>${l}</option>`).join('')}</select></td>${xc.map(f=>`<td><input data-cx="${escA(f)}" value="${escA(fval(r,f))}"></td>`).join('')}<td><button class="alt sm" data-x="${i}" title="Delete">✕</button></td></tr>`;
  }
  h+='</tbody></table>'+(list.length>n?`<div class="mut" style="padding:4px 6px">Showing first ${n} of ${list.length}</div>`:'');
  box.innerHTML=h;
}
