/* Data Show - Smart Selection engine (offline, no AI/server).
   window.DSSel.init(opts)  opts: {root?, doc?, send(text,html), share(text), save(text), hist(), addHist(text), openUrl(u)}
   Select mode ON: tap = smart pick (table/paragraph/heading/list), tap again = bigger, swipe up/down = bigger/smaller,
   double-tap = whole article, long-press = custom range, toolbar = Copy/Translate/Share/Search/Save/Send/Speak/Dictionary/Highlight/History. */
(function(w){
'use strict';
if(w.DSSel&&w.DSSel.ready)return;
var D=w.document,S=null,CFG={hl:'#ffe066',tools:{copy:1,tr:1,share:1,search:1,save:1,speak:1,dict:1,hl:1,hist:1,read:1},rows:1,cols:1,sticky:1};
try{var c0=JSON.parse(localStorage.getItem('dssel_cfg')||'null');if(c0)for(var k in c0)CFG[k]=c0[k]}catch(e){}
function saveCfg(){try{localStorage.setItem('dssel_cfg',JSON.stringify(CFG))}catch(e){}}
var O={},on=false,sel=null,chain=[],ci=0,tb=null,fab=null,pop=null,hlList=[],lastTap=0,tx=0,ty=0,lp=null,reader=false,rdOld=null;
var BLK='p,h1,h2,h3,h4,h5,h6,li,ul,ol,table,tr,td,th,pre,blockquote,dl,dt,dd,figcaption,article,section';
var ROOT=function(){return O.root||D.body};
function el(t,css,txt){var e=D.createElement(t);if(css)e.style.cssText=css;if(txt!=null)e.textContent=txt;e.setAttribute('data-dssel','1');return e}
function mine(n){return n&&n.closest&&n.closest('[data-dssel]')}
function txt(n){return (n.innerText||n.textContent||'').replace(/\u00a0/g,' ').trim()}
function tableText(t,mode,idx){
  var rows=[].slice.call(t.rows),out=[];
  if(mode==='col'){rows.forEach(function(r){var c=r.cells[idx];if(c)out.push(txt(c).replace(/\s+/g,' '))});return out.join('\n')}
  if(mode==='row'){var r=rows[idx];return r?[].map.call(r.cells,function(c){return txt(c).replace(/\s+/g,' ')}).join('\t'):''}
  return rows.map(function(r){return [].map.call(r.cells,function(c){return txt(c).replace(/\s+/g,' ')}).join('\t')}).join('\n')}
function nodeText(n){return n.tagName==='TABLE'?tableText(n):(n.tagName==='TR'?tableText(n.closest('table'),'row',n.rowIndex):txt(n))}

/* ===== div-based data grids (ag-Grid, role=grid, generic repeated-row lists): not <table>, often virtualized ===== */
var NUMRE=/^[-+]?[\d,]*\.?\d+%?$/;
function cleanT(n){return txt(n).replace(/\s+/g,' ')}
function agRoot(t){return t.closest&&t.closest('.ag-root-wrapper,.ag-root')}
function agRowOf(t){return t.closest&&t.closest('.ag-row')}
function findRows(t){ /* generic: lowest ancestor that is one of >=4 same-tag siblings with >=3 children */
  for(var n=t;n&&n!==D.body&&n!==D.documentElement;n=n.parentNode){
    var p=n.parentNode;if(!p||n.nodeType!==1||mine(n))continue;
    if(n.childElementCount<3||n.childElementCount>40)continue;
    var sib=[].filter.call(p.children,function(c){return c.tagName===n.tagName&&c.childElementCount>=3});
    if(sib.length>=4&&n.tagName!=='LI'&&n.tagName!=='TR')return{row:n,box:p}}
  return null}
function gridDetect(t){
  var R=agRoot(t);
  if(R){var row=agRowOf(t);if(!row)return null;return{ag:1,root:R,row:row,cell:t.closest('.ag-cell')}}
  var g=findRows(t);if(!g)return null;
  var cell=null;for(var c=t;c&&c!==g.row;c=c.parentNode)if(c.parentNode===g.row)cell=c;
  return{ag:0,row:g.row,box:g.box,cell:cell}}
function sortedCells(row){return [].slice.call(row.children).filter(function(c){return !mine(c)}).sort(function(a,b){return a.getBoundingClientRect().left-b.getBoundingClientRect().left})}
function agRowCells(R,idx){ /* every rendered cell of grid row idx (pinned + centre + right containers) */
  var out=[];[].forEach.call(R.querySelectorAll('.ag-row'),function(r){var i=r.getAttribute('row-index');if(i==null)i=r.getAttribute('aria-rowindex');
    if(String(i)===String(idx))[].forEach.call(r.querySelectorAll('.ag-cell'),function(c){out.push(c)})});return out}
function agColOrder(cells){return cells.sort(function(a,b){var x=+a.getAttribute('aria-colindex'),y=+b.getAttribute('aria-colindex');if(x&&y&&x!==y)return x-y;return 0})}
function rowTextOf(g){
  if(g.ag){var i=g.row.getAttribute('row-index');if(i==null)i=g.row.getAttribute('aria-rowindex');
    var cs=agColOrder(agRowCells(g.root,i));return cs.map(cleanT).join('\t')}
  return sortedCells(g.row).map(cleanT).join('\t')}
function guessName(){
  try{var seg=location.pathname.split('/').filter(Boolean).reverse();
    for(var i=0;i<seg.length;i++){var v=decodeURIComponent(seg[i]);if(/^[A-Za-z][A-Za-z0-9_.&-]{1,24}$/.test(v)&&!/\.(html?|php|aspx?)$/i.test(v)&&!/^(detail|stock|stocks|quote|company|share|shares|price|chart|charts|en|bn)$/i.test(v))return v.toUpperCase()}}catch(e){}
  return ''}
function fixHead(h){var u=h.map(function(x){return x.toUpperCase()});
  if(u.indexOf('CP')>=0)h=h.map(function(x){return /^cp$/i.test(x)?'Price':/^value$/i.test(x)?'Turnover':x});
  return h.map(function(x){return /^vol$/i.test(x)?'Volume':/^trade$/i.test(x)?'Trades':x})}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function frame(){return new Promise(function(r){(w.requestAnimationFrame||setTimeout)(function(){setTimeout(r,70)})})}
function isScrollable(e){if(!e||e===D.body||e===D.documentElement)return false;var cs=w.getComputedStyle(e);return /(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+4}
function scrollerOf(e){for(var n=e;n&&n!==D.body;n=n.parentNode)if(isScrollable(n))return n;return null}
/* read the WHOLE grid by scrolling through it (virtual rows/columns are only in the DOM while visible) */
async function collectGrid(g,what,colId,colIdx){
  var head=[],rowsOut=[];
  if(g.ag){
    var R=g.root,vp=R.querySelector('.ag-body-viewport')||R.querySelector('.ag-center-cols-viewport'),hp=R.querySelector('.ag-body-horizontal-scroll-viewport')||R.querySelector('.ag-center-cols-viewport');
    var oy=vp?vp.scrollTop:0,ox=hp?hp.scrollLeft:0,cols={},rows={};
    function harvest(){
      [].forEach.call(R.querySelectorAll('.ag-header-cell[col-id]'),function(h){var id=h.getAttribute('col-id');if(cols[id])return;var tn=h.querySelector('.ag-header-cell-text'),nm=(tn?cleanT(tn):cleanT(h)).replace(/[↑↓≡]/g,'').trim();
        cols[id]={nm:nm,ix:+h.getAttribute('aria-colindex')||0,x:h.getBoundingClientRect().left+(hp?hp.scrollLeft:0)}});
      [].forEach.call(R.querySelectorAll('.ag-row'),function(r){if(r.classList.contains('ag-header-row'))return;var i=r.getAttribute('row-index');if(i==null)i=r.getAttribute('aria-rowindex');if(i==null)return;
        var o=rows[i]||(rows[i]={});[].forEach.call(r.querySelectorAll('.ag-cell[col-id]'),function(c){var id=c.getAttribute('col-id');if(o[id]==null)o[id]=cleanT(c);if(!cols[id])cols[id]={nm:id,ix:+c.getAttribute('aria-colindex')||0,x:1e9}})})}
    var hs=[0];if(hp&&hp.scrollWidth>hp.clientWidth+4){hs=[];for(var x=0;x<hp.scrollWidth;x+=Math.max(80,hp.clientWidth*.7))hs.push(x);hs.push(hp.scrollWidth)}
    var vs=[0];if(vp&&vp.scrollHeight>vp.clientHeight+4){vs=[];for(var y=0;y<vp.scrollHeight;y+=Math.max(60,vp.clientHeight*.7))vs.push(y);vs.push(vp.scrollHeight)}
    for(var a=0;a<vs.length;a++){
      if(vp)vp.scrollTop=vs[a];
      for(var b=0;b<hs.length;b++){if(hp)hp.scrollLeft=hs[b];await frame();harvest()}
      if(a%4===0)toast('Reading table '+Math.round(100*a/vs.length)+'%')}
    if(vp)vp.scrollTop=oy;if(hp)hp.scrollLeft=ox;
    var ids=Object.keys(cols).sort(function(p,q){var A=cols[p],B=cols[q];if(A.ix&&B.ix)return A.ix-B.ix;return A.x-B.x});
    head=ids.map(function(i){return cols[i].nm});
    var ri=Object.keys(rows).map(Number).sort(function(p,q){return p-q});
    rowsOut=ri.map(function(i){return ids.map(function(id){return rows[i][id]==null?'':rows[i][id]})});
    if(what==='col'){var k=ids.indexOf(colId);head=[head[k]];rowsOut=rowsOut.map(function(r){return [r[k]]})}
  }else{
    var sc=scrollerOf(g.box)||D.scrollingElement||D.documentElement,isDoc=(sc===D.scrollingElement||sc===D.documentElement),oy2=sc.scrollTop,H=isDoc?w.innerHeight:sc.clientHeight,seen={},list=[];
    function harvest2(){var base=isDoc?-w.pageYOffset*0:0,sr=isDoc?{top:0}:sc.getBoundingClientRect();
      [].forEach.call(g.box.children,function(r){if(r.tagName!==g.row.tagName||r.childElementCount<3||mine(r))return;
        var cells=sortedCells(r).map(cleanT),k=cells.join('\t');if(seen[k])return;seen[k]=1;list.push({y:r.getBoundingClientRect().top-sr.top+sc.scrollTop,c:cells})})}
    var tot=isDoc?D.documentElement.scrollHeight:sc.scrollHeight,vs2=[];for(var y2=0;y2<tot;y2+=Math.max(60,H*.7))vs2.push(y2);
    for(var q=0;q<vs2.length;q++){sc.scrollTop=vs2[q];await frame();harvest2();if(q%4===0)toast('Reading table '+Math.round(100*q/vs2.length)+'%')}
    sc.scrollTop=oy2;
    list.sort(function(a,b){return a.y-b.y});rowsOut=list.map(function(r){return r.c});
    var n=g.row.childElementCount,hd=null;
    for(var a2=g.box,d=0;a2&&d<5&&!hd;a2=a2.parentNode,d++){
      for(var s2=a2.previousElementSibling,c2=0;s2&&c2<3&&!hd;s2=s2.previousElementSibling,c2++){
        var cand=[s2].concat([].slice.call(s2.querySelectorAll('*')));
        for(var u=0;u<cand.length&&!hd;u++){var e=cand[u];if(mine(e)||e.childElementCount!==n)continue;var cs=sortedCells(e).map(cleanT);
          if(cs.every(function(c){return c&&!NUMRE.test(c)}))hd=cs}}}
    if(hd)head=hd;
    if(what==='col'){rowsOut=rowsOut.map(function(r){return [r[colIdx]]});head=head.length?[head[colIdx]]:[]}
  }
  var nm=guessName(),hasNm=nm&&what!=='col';
  var hh=head.length?fixHead(head):null,out=[];
  if(hh)out.push((hasNm?['Name']:[]).concat(hh).join('\t'));
  rowsOut.forEach(function(r){out.push((hasNm?[nm]:[]).concat(r).join('\t'))});
  return out.join('\n')}
/* detect what was tapped -> chain of candidates small -> big */
function detect(t){
  var ch=[],n=t,cell=null;
  while(n&&n!==ROOT().parentNode&&n!==D.documentElement){
    if(n.nodeType===1&&!mine(n)){
      if(/^(TD|TH)$/.test(n.tagName)&&!cell){cell=n;ch.push({n:n,l:'Cell'});
        if(CFG.cols)ch.push({n:n,l:'Column',m:'col',i:n.cellIndex,t:n.closest('table')});
        if(CFG.rows&&n.parentNode)ch.push({n:n.parentNode,l:'Row',m:'row',i:n.parentNode.rowIndex,t:n.closest('table')})}
      else if(n.tagName==='TABLE')ch.push({n:n,l:'Table'});
      else if(/^(LI)$/.test(n.tagName))ch.push({n:n,l:'List item'});
      else if(/^(UL|OL|DL)$/.test(n.tagName))ch.push({n:n,l:'List'});
      else if(/^H[1-6]$/.test(n.tagName))ch.push({n:n,l:'Heading'});
      else if(/^(P|PRE|BLOCKQUOTE|FIGCAPTION|DD|DT)$/.test(n.tagName))ch.push({n:n,l:'Paragraph'});
      else if(/^(ARTICLE|MAIN|SECTION)$/.test(n.tagName)&&txt(n).length>200)ch.push({n:n,l:'Section'});
    }
    n=n.parentNode}
  if(!cell){var g=null;try{g=gridDetect(t)}catch(e){}
    if(g&&g.row){var cid=g.cell&&g.ag?g.cell.getAttribute('col-id'):null,cix=g.cell&&!g.ag?[].indexOf.call(g.row.children,g.cell):-1;
      if(g.cell)ch.push({n:g.cell,l:'Cell',g:g,cell:1});
      if(CFG.cols&&g.cell)ch.push({n:g.cell,l:'Column',g:g,async:1,m:'gcol',cid:cid,cix:cix});
      if(CFG.rows)ch.push({n:g.row,l:'Row',g:g,grow:1});
      ch.push({n:g.ag?g.root:g.box,l:'Table',g:g,async:1,m:'gtable'})}}
  if(!ch.length&&t&&t.nodeType===1&&txt(t))ch.push({n:t,l:'Block'});
  ch.push({n:articleRoot(),l:'Full article'});
  /* drop duplicates of the same text size */
  var o=[],seen=[];ch.forEach(function(c){var k=c.l+(c.i!=null?c.i:'');if(seen.indexOf(k)<0){seen.push(k);o.push(c)}});
  return o}
function articleRoot(){
  var r=ROOT(),best=r.querySelector('article,main,[role=main]');
  if(best&&txt(best).length>200)return best;
  var ps=[].slice.call(r.querySelectorAll('p')),sc=new Map(),b=null,bs=0;
  ps.forEach(function(p){if(txt(p).length<60)return;var a=p.parentNode,v=(sc.get(a)||0)+txt(p).length;sc.set(a,v);if(v>bs){bs=v;b=a}});
  return b||r}
function candText(c){if(c.cell)return cleanT(c.n);if(c.grow)return rowTextOf(c.g);if(c.async)return cleanT(c.n).slice(0,2000);if(c.m)return tableText(c.t,c.m,c.i);return nodeText(c.n)}
function getText(cb){ /* grid Table/Column read the whole (virtual) grid first */
  if(sel&&sel.async){toast('Reading table...');collectGrid(sel.g,sel.m==='gcol'?'col':'table',sel.cid,sel.cix).then(function(t){if(!t){toast('Nothing found');return}cb(t)}).catch(function(e){toast('Could not read the table')});return}
  var t=curText();if(!t){toast('Select something first');return}cb(t)}
/* highlight box (overlay, does not touch page DOM structure) */
var box=null;
function drawBox(){
  if(!sel){if(box)box.style.display='none';return}
  if(!box){box=el('div','position:absolute;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,.14);border-radius:4px;z-index:2147483000;display:none');D.body.appendChild(box)}
  var r,c=sel;
  if(c.m==='col'&&c.t){var cells=[].map.call(c.t.rows,function(r){return r.cells[c.i]}).filter(Boolean);
    var a=cells[0].getBoundingClientRect(),z=cells[cells.length-1].getBoundingClientRect();r={left:a.left,top:a.top,width:a.width,height:z.bottom-a.top}}
  else{var b=c.n.getBoundingClientRect();r={left:b.left,top:b.top,width:b.width,height:b.height}}
  box.style.display='block';box.style.left=(r.left+w.pageXOffset)+'px';box.style.top=(r.top+w.pageYOffset)+'px';box.style.width=r.width+'px';box.style.height=r.height+'px'}
function pick(c){sel=c;drawBox();toolbar();if(c&&c.n&&c.n.scrollIntoView&&!inView(c.n)){}}
function inView(n){var r=n.getBoundingClientRect();return r.bottom>0&&r.top<w.innerHeight}
function clear(){sel=null;chain=[];ci=0;w.getSelection&&w.getSelection().removeAllRanges();drawBox();toolbar()}
function grow(d){if(!chain.length)return;ci=Math.max(0,Math.min(chain.length-1,ci+d));pick(chain[ci])}
/* custom selection: native handles, then we read the range */
function custom(t){
  var s=w.getSelection();if(!s||!t)return;
  try{var r=D.caretRangeFromPoint?D.caretRangeFromPoint(tx,ty):null;if(r){var n=r.startContainer,tt=n.textContent||'',o=r.startOffset,a=o,b=o;
    while(a>0&&!/\s/.test(tt[a-1]))a--;while(b<tt.length&&!/\s/.test(tt[b]))b++;r.setStart(n,a);r.setEnd(n,b);s.removeAllRanges();s.addRange(r)}}catch(e){}
  sel={n:t,l:'Custom',custom:1};toolbar()}
function curText(){
  var s=w.getSelection&&w.getSelection().toString();
  if(sel&&sel.custom&&s&&s.trim())return s.trim();
  return sel?candText(sel).trim():''}
/* gestures */
function onClick(e){
  if(!on)return;var t=e.target;if(mine(t))return;if(O.root&&!O.root.contains(t))return;
  e.preventDefault();e.stopPropagation();
  var now=Date.now(),dbl=now-lastTap<320;lastTap=now;
  if(dbl){chain=[{n:articleRoot(),l:'Full article'}];ci=0;pick(chain[0]);return}
  if(sel&&chain.length&&!sel.custom&&chain[ci]&&chain[ci].n.contains(t)){grow(1);return}
  chain=detect(t);ci=0;if(chain.length)pick(chain[0])}
function onStart(e){if(!on||(O.root&&!O.root.contains(e.target)))return;var p=e.touches?e.touches[0]:e;tx=p.clientX;ty=p.clientY;
  clearTimeout(lp);var t=e.target;lp=setTimeout(function(){if(mine(t))return;lp=0;custom(t)},550)}
function onMove(e){if(lp){var p=e.touches?e.touches[0]:e;if(Math.abs(p.clientX-tx)>10||Math.abs(p.clientY-ty)>10){clearTimeout(lp);lp=0}}}
function onEnd(e){clearTimeout(lp);if(!on||!sel||sel.custom)return;var p=e.changedTouches?e.changedTouches[0]:e;
  var dx=p.clientX-tx,dy=p.clientY-ty;
  if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*2){grow(dx<0?1:-1)}} /* swipe left = bigger, right = smaller */
/* toolbar */
var ICON={copy:'Copy',tr:'Translate',share:'Share',search:'Search',save:'Save',speak:'Speak',dict:'Dictionary',hl:'Highlight',hist:'History',read:'Reader'};
function btn(k,label,fn){var b=el('button','border:0;background:#1f2937;color:#fff;border-radius:8px;padding:8px 10px;font:600 13px system-ui;white-space:nowrap;margin:0 3px 0 0',label);b.onclick=function(e){e.stopPropagation();fn()};return b}
function toolbar(){
  if(tb){tb.remove();tb=null}
  if(!on)return;
  tb=el('div','position:fixed;left:0;right:0;bottom:0;z-index:2147483600;background:#111827;padding:8px;font:13px system-ui;color:#fff;box-shadow:0 -2px 10px rgba(0,0,0,.4)');
  var info=el('div','margin-bottom:6px;display:flex;gap:8px;align-items:center');
  var lbl=el('b','',sel?(sel.l+(sel.async?' - all rows on Send/Copy':' - '+curText().length+' chars')):'Tap content to select');
  info.appendChild(lbl);
  if(sel&&!sel.custom){info.appendChild(btn('up','+',function(){grow(1)}));info.appendChild(btn('dn','-',function(){grow(-1)}))}
  var cl=btn('x','Clear',clear);cl.style.marginLeft='auto';info.appendChild(cl);
  var off=btn('off','Exit',function(){mode(false)});info.appendChild(off);
  tb.appendChild(info);
  var row=el('div','display:flex;overflow-x:auto;padding-bottom:2px');
  var T=CFG.tools;
  function need(f){return function(){getText(f)}}
  if(T.copy)row.appendChild(btn('copy','Copy',need(function(t){copy(t);addH(t)})));
  row.appendChild(btn('send','Send to Data Show',need(function(t){addH(t);O.send&&O.send(t,sel&&sel.n&&sel.n.outerHTML||'')})));
  if(T.tr)row.appendChild(btn('tr','Translate',need(function(t){open('https://translate.google.com/?sl=auto&tl=bn&op=translate&text='+encodeURIComponent(t.slice(0,4000)))})));
  if(T.share)row.appendChild(btn('share','Share',need(function(t){if(O.share)O.share(t);else if(navigator.share)navigator.share({text:t}).catch(function(){});else copy(t)})));
  if(T.search)row.appendChild(btn('search','Search',need(function(t){open('https://www.google.com/search?q='+encodeURIComponent(t.slice(0,300)))})));
  if(T.save)row.appendChild(btn('save','Save',need(function(t){addH(t);if(O.save)O.save(t);toast('Saved')})));
  if(T.speak)row.appendChild(btn('speak','Speak',need(function(t){speak(t)})));
  if(T.dict)row.appendChild(btn('dict','Dictionary',need(function(t){var wd=t.split(/\s+/)[0].replace(/[^\p{L}\p{N}'-]/gu,'');if(!wd)return;open('https://www.google.com/search?q='+encodeURIComponent('define '+wd))})));
  if(T.hl)row.appendChild(btn('hl','Highlight',need(function(){highlight()})));
  if(T.hist)row.appendChild(btn('hist','History',history));
  if(T.read)row.appendChild(btn('read',reader?'Normal view':'Reader',readerMode));
  row.appendChild(btn('set','Settings',settings));
  tb.appendChild(row);D.body.appendChild(tb)}
function open(u){if(O.openUrl)O.openUrl(u);else w.open(u,'_blank')}
function copy(t){var ok=false;try{var a=D.createElement('textarea');a.value=t;a.style.cssText='position:fixed;left:-9999px';D.body.appendChild(a);a.select();ok=D.execCommand('copy');a.remove()}catch(e){}
  if(!ok&&navigator.clipboard)navigator.clipboard.writeText(t);toast('Copied')}
function speak(t){try{var s=w.speechSynthesis;if(!s){toast('Speech not supported');return}if(s.speaking){s.cancel();return}var u=new SpeechSynthesisUtterance(t.slice(0,3000));s.speak(u)}catch(e){toast('Speech not supported')}}
function toast(m){var t=el('div','position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:#000c;color:#fff;padding:8px 14px;border-radius:18px;font:13px system-ui;z-index:2147483647',m);D.body.appendChild(t);setTimeout(function(){t.remove()},1400)}
/* highlight: wrap text nodes of the selected block */
function highlight(){
  var n=sel&&sel.n;if(!n)return;
  if(sel.custom){var s=w.getSelection();if(s&&s.rangeCount&&!s.isCollapsed){var r=s.getRangeAt(0),m=D.createElement('mark');m.setAttribute('data-dssel-hl','1');m.style.background=CFG.hl;try{r.surroundContents(m)}catch(e){n.style.background=CFG.hl}hlList.push(m);s.removeAllRanges()}return}
  var prev=n.style.background;n.setAttribute('data-dssel-hl','1');n.style.background=CFG.hl;hlList.push({n:n,p:prev});toast('Highlighted')}
/* history (native side if present, else localStorage) */
function addH(t){if(O.addHist){O.addHist(t);return}try{var a=JSON.parse(localStorage.getItem('dssel_hist')||'[]');a.unshift({t:t.slice(0,6000),d:Date.now()});localStorage.setItem('dssel_hist',JSON.stringify(a.slice(0,50)))}catch(e){}}
function getH(){var r;try{r=O.hist?JSON.parse(O.hist()||'[]'):JSON.parse(localStorage.getItem('dssel_hist')||'[]')}catch(e){r=[]}return r}
function panel(title){if(pop)pop.remove();pop=el('div','position:fixed;left:8px;right:8px;top:8%;bottom:130px;background:#fff;color:#111;border-radius:12px;z-index:2147483640;box-shadow:0 8px 30px #0008;display:flex;flex-direction:column;font:14px system-ui');
  var h=el('div','display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid #ddd');h.appendChild(el('b','flex:1',title));
  var x=el('button','border:0;background:none;font-size:20px','x');x.onclick=function(){pop.remove();pop=null};h.appendChild(x);pop.appendChild(h);
  var b=el('div','overflow:auto;padding:8px 12px;flex:1');pop.appendChild(b);D.body.appendChild(pop);return b}
function history(){var b=panel('Selection history'),a=getH();
  if(!a.length){b.appendChild(el('div','color:#666','Nothing yet. Copied or saved selections appear here.'));return}
  a.forEach(function(it){var r=el('div','border-bottom:1px solid #eee;padding:8px 0');r.appendChild(el('div','white-space:pre-wrap;max-height:90px;overflow:hidden',it.t.slice(0,300)));
    var bs=el('div','margin-top:6px');var c=btn('c','Copy',function(){copy(it.t)});var s=btn('s','Send',function(){O.send&&O.send(it.t,'')});c.style.background=s.style.background='#2563eb';bs.appendChild(c);bs.appendChild(s);r.appendChild(bs);b.appendChild(r)})}
function settings(){var b=panel('Selection settings');
  function row(l,f){var r=el('label','display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee');var c=D.createElement('input');c.type='checkbox';c.setAttribute('data-dssel','1');f(c);r.appendChild(c);r.appendChild(el('span','',l));b.appendChild(r)}
  Object.keys(ICON).forEach(function(k){row('Toolbar: '+ICON[k],function(c){c.checked=!!CFG.tools[k];c.onchange=function(){CFG.tools[k]=c.checked?1:0;saveCfg();toolbar()}})});
  row('Table: allow Row select',function(c){c.checked=!!CFG.rows;c.onchange=function(){CFG.rows=c.checked?1:0;saveCfg()}});
  row('Table: allow Column select',function(c){c.checked=!!CFG.cols;c.onchange=function(){CFG.cols=c.checked?1:0;saveCfg()}});
  var cr=el('div','padding:10px 0');cr.appendChild(el('span','','Highlight color: '));
  ['#ffe066','#a7f3d0','#bfdbfe','#fbcfe8','#fed7aa'].forEach(function(col){var s=el('button','width:30px;height:30px;border-radius:50%;border:2px solid '+(CFG.hl===col?'#000':'#ccc')+';margin-right:6px;background:'+col);s.onclick=function(){CFG.hl=col;saveCfg();settings()};cr.appendChild(s)});b.appendChild(cr)}
/* reader mode: show only the main article */
function readerMode(){
  if(!reader){var a=articleRoot();rdOld=[];[].slice.call(D.body.children).forEach(function(c){if(mine(c)||c.contains(a)||a.contains(c))return;rdOld.push([c,c.style.display]);c.style.display='none'});
    var chainUp=a;while(chainUp&&chainUp!==D.body){[].slice.call(chainUp.parentNode.children).forEach(function(c){if(c!==chainUp&&!mine(c)&&!/^(SCRIPT|STYLE|LINK)$/.test(c.tagName)){rdOld.push([c,c.style.display]);c.style.display='none'}});chainUp=chainUp.parentNode}
    reader=true}
  else{(rdOld||[]).forEach(function(p){p[0].style.display=p[1]});rdOld=null;reader=false}
  clear()}
/* mode switch + floating button */
function mode(v){on=v;if(!v){clear();speakStop()}
  if(fab)fab.textContent=on?'Select: ON':'Select';
  if(fab)fab.style.background=on?'#2563eb':'#111827';toolbar();try{O.onMode&&O.onMode(on)}catch(e){}}
function speakStop(){try{w.speechSynthesis&&w.speechSynthesis.cancel()}catch(e){}}
function mkFab(){if(fab)return;fab=el('button','position:fixed;right:10px;bottom:70px;z-index:2147483500;border:0;border-radius:22px;padding:10px 14px;background:#111827;color:#fff;font:600 13px system-ui;box-shadow:0 2px 8px #0006','Select');
  fab.onclick=function(e){e.stopPropagation();mode(!on)};D.body.appendChild(fab)}
function init(o){O=o||{};
  D=O.doc||w.document;if(!D.body)return;
  mkFab();if(O.hideFab&&fab)fab.style.display='none';
  D.addEventListener('click',onClick,true);
  D.addEventListener('touchstart',onStart,{passive:true,capture:true});D.addEventListener('touchmove',onMove,{passive:true,capture:true});D.addEventListener('touchend',onEnd,{passive:true,capture:true});
  D.addEventListener('mousedown',onStart,true);D.addEventListener('mouseup',onEnd,true);
  D.addEventListener('keydown',function(e){if(!on)return;
    if(e.key==='Escape')clear();else if((e.ctrlKey||e.metaKey)&&e.key==='c'&&sel&&!sel.custom){e.preventDefault();copy(curText())}
    else if(e.key==='ArrowUp'||e.key==='ArrowRight'){e.preventDefault();grow(1)}else if(e.key==='ArrowDown'||e.key==='ArrowLeft'){e.preventDefault();grow(-1)}},true);
  w.addEventListener('resize',drawBox);w.addEventListener('scroll',drawBox,true);
  /* accessibility */
  fab.setAttribute('aria-label','Toggle smart selection');fab.setAttribute('role','button')}
w.DSSel={ready:true,init:init,mode:mode,select:function(n){chain=detect(n);ci=0;if(chain.length)pick(chain[0])},text:curText,clear:clear,isOn:function(){return on},_cfg:CFG};
})(window);
