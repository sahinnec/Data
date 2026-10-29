/* Daily data = live DSE price table on the Table page (v15). All ids/classes start with "lt". */
(function(){try{
const g=id=>document.getElementById(id),card=document.querySelector('#tabShow>.card');if(!card)return;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COLS=[{id:'code',l:'Code',s:1},{id:'sec',l:'Sector',s:1},{id:'cat',l:'Cat',s:1},{id:'ltp',l:'LTP'},{id:'high',l:'High'},{id:'low',l:'Low'},{id:'ycp',l:'YCP'},{id:'chg',l:'Change',sg:1},{id:'pct',l:'Change %',sg:1,pc:1},{id:'trade',l:'Trade',d:0},{id:'val',l:'Value (mn)'},{id:'vol',l:'Volume',d:0},{id:'eps',l:'EPS'},{id:'pe',l:'P/E'},{id:'yr',l:'EPS year',s:1},{id:'nav',l:'NAV'},{id:'pb',l:'P/B'},{id:'roe',l:'ROE %'},{id:'div',l:'Div %',d:1},{id:'dy',l:'Div yield %'},{id:'risk',l:'Risk score',d:0}];
const DEF=['code','ltp','chg','ycp','high','low','trade','val','vol'];
const PRE={basic:['code','ltp','chg','pct'],trade:['code','ltp','high','low','trade','val','vol'],full:COLS.map(c=>c.id)};
const URL_='https://www.dsebd.org/latest_share_price_scroll_l.php';
const API_='https://www.dse.com.bd/api/live/snapshot';
const URLS=[API_,'https://old.dsebd.org/latest_share_price_scroll_l.php','https://old.dsebd.org/latest_share_price_all.php','https://www.dsebd.org/latest_share_price_scroll_l.php'];
const LS=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};
let S=Object.assign({vis:DEF.slice(),ord:COLS.map(c=>c.id),sort:{k:'code',d:1},q:'',sec:'',cat:'',iv:10,hide:0,dn:0},LS('ds_lt_prefs')||{});
COLS.forEach(c=>{if(!S.ord.includes(c.id))S.ord.push(c.id)});
if(!S.ycpV){S.ycpV=1;const i=S.vis.indexOf('pct');if(!S.vis.includes('ycp')){if(i>=0)S.vis[i]='ycp';else S.vis.push('ycp')}}
let mode=LS('ds_lt_mode')||'my',rows=LS('ds_lt_cache')||[],det=LS('ds_lt_det')||{},stamp=LS('ds_lt_time')||'',timer=null,busy=0,err='';
const save=()=>LS('ds_lt_prefs',{vis:S.vis,ord:S.ord,iv:S.iv,hide:S.hide,dn:S.dn,ycpV:1});
const derive=r=>{if(!(r.ltp>0))r.ltp=r.ycp;r.chg=r.ltp-r.ycp;r.pct=r.ycp?r.chg/r.ycp*100:0;const d=det[r.code]||{};r.sec=d.sec||r.sec||'–';r.cat=d.cat||r.cat||'–';r.eps=d.eps!==undefined?d.eps:(r.eps!==undefined?r.eps:null);['yr','nav','roe','div','dy','risk'].forEach(k=>{r[k]=d[k]!==undefined?d[k]:null});r.pb=r.nav>0?r.ltp/r.nav:null;r.pe=r.eps>0?r.ltp/r.eps:null};
const reDet=()=>rows.forEach(r=>{['sec','cat','eps','yr','nav','roe','div','dy','risk'].forEach(k=>r[k]=undefined);derive(r)});
rows.forEach(derive);

/* fetch: Android bridge first (ids start with "lt" so they never clash with the Website box), browser proxies otherwise */
let seq=0;const cbs={};let appFn=window.__urlRes;
const disp=(id,ok,p)=>{if(String(id).slice(0,2)==='lt'){const c=cbs[id];delete cbs[id];if(c){const b=atob(p),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);c(ok,new TextDecoder('utf-8').decode(u))}}else if(appFn)appFn(id,ok,p)};
Object.defineProperty(window,'__urlRes',{configurable:true,get(){return disp},set(f){appFn=f}});
const getPage=u=>new Promise((res,rej)=>{
 if(window.Android&&window.Android.fetchUrl){const id='lt'+(++seq);cbs[id]=(ok,t)=>ok?res(t):rej(new Error(t));window.Android.fetchUrl(u,id);return}
 (async()=>{let er;for(const x of [u,'https://corsproxy.io/?'+encodeURIComponent(u),'https://api.allorigins.win/raw?url='+encodeURIComponent(u)]){try{const r=await fetch(x);if(!r.ok)throw new Error('HTTP '+r.status);const t=await r.text();if(t.trim())return res(t)}catch(e){er=e}}rej(er||new Error('blocked'))})()});
function parsePasted(t){
 if(/<table/i.test(t))return parse(t);
 const n=v=>{const x=parseFloat(String(v).replace(/,/g,''));return isNaN(x)?0:x},NUM=/^-?[\d,]*\.?\d+$|^--$/,out=[];
 String(t).split(/\r?\n/).forEach(l=>{let k=l.trim().split(/\t+|\s+/).filter(Boolean).filter(x=>!/%$/.test(x)).map(x=>/^\+\d|^\+\./.test(x)?x.slice(1):x);if(k.length<10)return;
  if(/^\d+$/.test(k[0])&&!NUM.test(k[1]))k=k.slice(1);
  const code=k[0];if(NUM.test(code)||!/^[A-Za-z0-9&().\-_]+$/.test(code))return;
  const v=k.slice(1);if(v.length<9||!v.slice(0,9).every(x=>NUM.test(x)))return;
  const x={code,ltp:n(v[0]),high:n(v[1]),low:n(v[2]),ycp:n(v[4]),trade:n(v[6]),val:n(v[7]),vol:n(v[8]),fl:0};derive(x);out.push(x)});
 if(!out.length)throw new Error('no price rows found in the pasted text');return out}
function parse(html){
 const d=new DOMParser().parseFromString(html,'text/html');
 const t=[...d.querySelectorAll('table')].find(x=>/TRADING\s*CODE/i.test(x.textContent)&&/LTP/i.test(x.textContent));if(!t)throw new Error('price table not found');
 const tr=[...t.rows],hi=tr.findIndex(r=>/TRADING\s*CODE/i.test(r.textContent));
 const h=[...tr[hi].cells].map(c=>c.textContent.toUpperCase().replace(/[\s*]+/g,''));const ix=n=>h.findIndex(x=>x.startsWith(n));
 const I={code:ix('TRADINGCODE'),ltp:ix('LTP'),high:ix('HIGH'),low:ix('LOW'),ycp:ix('YCP'),trade:ix('TRADE'),val:ix('VALUE'),vol:ix('VOLUME')};
 if(I.code<0||I.ltp<0)throw new Error('columns not found');
 const n=v=>{const x=parseFloat(String(v).replace(/,/g,''));return isNaN(x)?0:x},old=Object.fromEntries(rows.map(r=>[r.code,r]));
 const out=tr.slice(hi+1).map(r=>{const c=[...r.cells].map(x=>x.textContent.trim()),code=c[I.code];if(!code||/\s/.test(code))return null;const o=old[code];
  const x={code,ltp:n(c[I.ltp]),high:n(c[I.high]),low:n(c[I.low]),ycp:n(c[I.ycp]),trade:n(c[I.trade]),val:n(c[I.val]),vol:n(c[I.vol]),fl:0};
  derive(x);if(o&&o.ltp!==x.ltp)x.fl=x.ltp>o.ltp?1:-1;return x}).filter(Boolean);
 if(!out.length)throw new Error('no rows');return out}

function parseSnap(txt){
 let j;try{j=JSON.parse(txt)}catch(e){throw new Error('snapshot is not JSON')}
 const P=j&&j.prices;if(!P||!Array.isArray(P.cols)||!Array.isArray(P.rows))throw new Error('snapshot: prices list not found (keys: '+Object.keys(j||{}).slice(0,8).join(',')+')');
 const I={};P.cols.forEach((c,i)=>{I[c]=i});
 if(I.code===undefined||I.ltp===undefined)throw new Error('snapshot fields not recognised: '+P.cols.join(','));
 const n=v=>{const x=parseFloat(String(v).replace(/,/g,''));return isNaN(x)?0:x},old=Object.fromEntries(rows.map(r=>[r.code,r])),g=(r,k)=>I[k]===undefined?undefined:r[I[k]];
 const out=P.rows.filter(r=>g(r,'assetType')!=='GOVDBT').map(r=>{const code=g(r,'code');if(!code||/\s/.test(String(code)))return null;
  const x={code:String(code),ltp:n(g(r,'ltp')),high:n(g(r,'high')),low:n(g(r,'low')),ycp:n(g(r,'ycp')),trade:n(g(r,'trades')),val:n(g(r,'value')),vol:n(g(r,'volume')),fl:0};
  const sc=g(r,'sector'),ct=g(r,'category');if(sc)x.sec=String(sc);if(ct)x.cat=String(ct);
  derive(x);const q=old[x.code];if(q&&q.ltp!==x.ltp)x.fl=x.ltp>q.ltp?1:-1;return x}).filter(Boolean);
 if(!out.length)throw new Error('snapshot: no rows');return out}
async function refresh(){
 if(busy)return;busy=1;err='';setSt();
 try{let html,le;for(const u of URLS){try{html=await getPage(u);rows=u===API_?parseSnap(html):parse(html);le=null;break}catch(e){le=e}}if(le)throw le;stamp=new Date().toLocaleTimeString('en-GB');LS('ds_lt_cache',rows.map(r=>({...r,fl:0})));LS('ds_lt_time',stamp);try{window.dispatchEvent(new Event('ltdata'))}catch(e){}}
 catch(e){err=e.message||'failed'}
 busy=0;draw();secOpts()}
function setSt(){const d=g('ltDot'),s=g('ltSt');if(!s)return;d.classList.toggle('on',!err&&!!stamp);g('ltBar').classList.toggle('err',!!err);g('ltBar').classList.toggle('busy',!!busy);
 if(err||!stamp||busy&&!stamp){s.textContent=err?('Refresh failed ('+err+'). Showing '+(stamp?'data from '+stamp:'no data yet')+'.'):busy?'Loading live data…':'Not loaded yet'}else{s.innerHTML='Live · DSE · <span class="ltx">updated </span>'+esc(stamp)+'<span class="ltx">'+(S.iv?' · every '+S.iv+' s':' · auto off')+'</span>'}}

const IC={};(()=>{const m=(d,x)=>'<svg class="lti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(x||2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
IC.user=m('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>');
IC.case=m('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>');
IC.bars=m('<path d="M6 20V11M12 20V4M18 20v-6"/>',3);
IC.search=m('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>');
IC.chev=m('<path d="M6 9l6 6 6-6"/>');
IC.refresh=m('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>');
IC.clock=m('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
IC.signal=m('<path d="M6 20v-5M12 20V10M18 20V4"/>',3);
IC.cols=m('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/>');
IC.lines=m('<path d="M4 7h16M4 12h16M4 17h16"/>');
IC.eyeoff=m('<path d="M3 3l18 18"/><path d="M6.1 6.9C4 8.4 2.6 10.4 2 12c1 2 5 6 10 6 1.5 0 2.9-.4 4.1-1M10.6 6.1A10 10 0 0 1 12 6c5 0 9 4 10 6a13 13 0 0 1-2.2 3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>');
IC.eye=m('<path d="M2 12c1-2 5-6 10-6s9 4 10 6c-1 2-5 6-10 6S3 14 2 12z"/><circle cx="12" cy="12" r="3"/>');
IC.plus=m('<path d="M12 5v14M5 12h14"/>');
IC.send=m('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>');
IC.down=m('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>');
IC.gear=m('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>');
IC.clip=m('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/>');
window.__ltIC=IC})();
/* UI */
card.insertAdjacentHTML('afterbegin','<div id="ltSw"><button type="button" data-lt="my">'+IC.user+'My data</button><button type="button" data-lt="daily">'+IC.bars+'Daily data</button></div>');
const box=document.createElement('div');box.id='ltBox';box.className='ltbx';box.style.display='none';
box.innerHTML='<div class="ltrow ltfind"><label class="ltsq">'+IC.search+'<input type="search" id="ltQ" placeholder="'+(window.innerWidth<=430?'Search…':'Search code…')+'" aria-label="Search code"></label><select id="ltS" aria-label="Sector"></select><select id="ltK" aria-label="Category"><option value="">All categories</option><option>A</option><option>B</option><option>N</option><option>Z</option></select></div>'+
'<div class="ltbar" id="ltBar"><span class="ltsub"><span class="ltdot" id="ltDot"></span><span id="ltSt"></span></span><span class="ltact"><button type="button" id="ltR" class="ltlk">'+IC.refresh+'Refresh</button><label class="ltauto">'+IC.clock+'<select id="ltI" aria-label="Auto refresh"><option value="0">Auto: Off</option><option value="5">Auto: 5 s</option><option value="10">Auto: 10 s</option><option value="30">Auto: 30 s</option><option value="60">Auto: 60 s</option></select></label><span class="ltsig">'+IC.signal+'</span></span></div>'+
'<div class="ltrow lttool"><button id="ltC">'+IC.cols+'Columns'+IC.chev+'</button><button id="ltD">'+IC.lines+'Compact</button><button id="ltH">'+IC.eyeoff+'Hide table</button><button id="ltM">'+IC.plus+'Details</button><button id="ltSd">'+IC.send+'Send</button><button id="ltEx">'+IC.down+'Export</button><button id="ltPp">'+IC.clip+'Paste</button><button id="ltGs">'+IC.gear+'Settings</button></div><div class="ltpanel" id="ltXp" hidden><button class="alt" data-x="xlsx">Excel (.xlsx)</button> <button class="alt" data-x="csv">CSV (.csv)</button> <button class="alt" data-x="copy">Copy table</button></div><div class="ltpanel" id="ltPn" hidden><b>Paste prices</b><p class="ltnote">If Refresh cannot reach dsebd.org (web preview, no internet), open dsebd.org › Latest Share Price in any browser, select the whole table, copy it and paste it here. Works with the table text (# / code / LTP / high / low / close / YCP / change / trade / value / volume) or the page HTML.</p><textarea id="ltPt" placeholder="Paste the DSE price table here…"></textarea><div class="ltrow"><button class="alt" id="ltPg">Load prices</button><button class="alt" id="ltPc">Close</button></div></div><div class="ltpanel" id="ltSp" hidden><div style="font-size:.78rem;margin-bottom:6px">Send these shares to:</div><button class="alt" data-s="show">▤ Cards</button> <button class="alt" data-s="compare">⚖ Compare</button> <button class="alt" data-s="table">▦ My data</button> <button class="alt" data-s="xlsx">➤ Share Excel file</button></div>'+
'<div class="ltpanel" id="ltCp" hidden><b>Columns</b> <span class="ltrow" style="display:inline-flex;margin:0 0 0 6px"><button class="alt" data-pr="basic">Basic</button><button class="alt" data-pr="trade">Trade</button><button class="alt" data-pr="full">All</button><button class="alt" id="ltX">Reset</button></span><div class="ltcl" id="ltCl"></div></div>'+
'<div class="ltpanel" id="ltMp" hidden><b>Add details</b><p class="ltnote">DSE’s live page has no Sector or EPS. “Auto fill” loads Sector, Category, EPS, NAV, ROE, Dividend and Risk score from the source you pick below (StockChartBD’s free data, or your own link; the chosen source also runs once a day on its own). It matches columns by header name (Symbol/Code, Sector, Category, EPS, NAV…), so any CSV, JSON or table page with a code column works. Or paste a table that has a Code column plus Sector, Category or EPS (for example from StockNow); they join by Code. Saved on this phone.</p><textarea id="ltT" placeholder="Code[Tab]Sector[Tab]Category[Tab]EPS …"></textarea><div class="ltrow" style="margin:6px 0 0"><select id="ltSr" aria-label="Auto fill source"></select></div><div class="ltrow" id="ltUw" style="margin:6px 0 0" hidden><input type="search" id="ltUr" placeholder="https://… link of a CSV / JSON / table page" aria-label="Own link"></div><div class="ltrow" style="margin:6px 0 0"><button id="ltMs">Save details</button><button class="alt" id="ltAu">⬇ Auto fill</button><button class="alt" id="ltMc">Clear details</button><span class="ltnote" id="ltMr"></span></div></div>'+
'<div class="ltchips" id="ltSum"></div><div id="ltHid">Table is hidden. Tap “Show table”.</div><div id="ltWrap"><table id="ltTbl"></table></div><p class="ltnote" id="ltNt"></p>';
card.appendChild(box);

const cell=(r,c)=>{const v=r[c.id];let t,k=c.s?'s':'';
 if(v===null||v===undefined||v==='')t='–';else if(typeof v==='string')t=esc(v);
 else{const dd=c.d!==undefined?c.d:2;t=v.toLocaleString('en-US',{minimumFractionDigits:dd,maximumFractionDigits:dd});if(c.sg&&v>0)t='+'+t;if(c.pc)t+='%'}
 if(c.sg&&typeof v==='number')k+=v>0?' ltup':v<0?' ltdn':'';if(c.id==='ltp')k+=r.chg>0?' ltup':r.chg<0?' ltdn':'';
 return '<td class="'+k+'">'+t+'</td>'};
function view(){const q=S.q.trim().toUpperCase(),c=COLS.find(x=>x.id===S.sort.k)||COLS[0];
 const a=rows.filter(r=>(!q||r.code.toUpperCase().includes(q))&&(!S.sec||r.sec===S.sec)&&(!S.cat||r.cat===S.cat));
 a.sort((x,y)=>{const p=x[c.id],o=y[c.id];if(p===o)return 0;if(p===null||p===undefined)return 1;if(o===null||o===undefined)return -1;return(typeof p==='string'?p.localeCompare(o):p-o)*S.sort.d});return a}
function draw(){setSt();
 const cols=S.ord.map(id=>COLS.find(c=>c.id===id)).filter(c=>c&&S.vis.includes(c.id)),a=view();
 const up=rows.filter(r=>r.chg>0).length,dn=rows.filter(r=>r.chg<0).length,tv=rows.reduce((s,r)=>s+(r.val||0),0);
 g('ltSum').innerHTML='<span class="ltchip ltup">▲ '+up+' up</span><span class="ltchip ltdn">▼ '+dn+' down</span><span class="ltchip">= '+(rows.length-up-dn)+' same</span><span class="ltchip">Value '+Math.round(tv).toLocaleString('en-US')+' mn</span><span class="ltchip">'+a.length+' of '+rows.length+'</span>';
 g('ltTbl').innerHTML='<thead><tr>'+cols.map(c=>'<th data-k="'+c.id+'" class="'+(c.s?'s ':'')+(S.sort.k===c.id?'so':'')+'">'+c.l+(S.sort.k===c.id?(S.sort.d>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>'+
  (a.map(r=>'<tr class="'+(r.fl>0?'fu':r.fl<0?'fd':'')+'">'+cols.map(c=>cell(r,c)).join('')+'</tr>').join('')||'<tr><td colspan="'+(cols.length||1)+'" class="s">'+(rows.length?'No rows match.':'No data yet. Tap Refresh.')+'</td></tr>')+'</tbody>';
 rows.forEach(r=>r.fl=0);
 g('ltWrap').style.display=S.hide?'none':'';g('ltHid').style.display=S.hide?'block':'none';
 g('ltH').innerHTML=(S.hide?IC.eye+'Show table':IC.eyeoff+'Hide table');g('ltH').classList.toggle('on',!!S.hide);
 g('ltWrap').classList.toggle('dense',!!S.dn);g('ltD').innerHTML=IC.lines+(S.dn?'Comfortable':'Compact');
 g('ltNt').textContent='Prices: DSE live data (dse.com.bd).'+(LS('ds_lt_detT')?' Sector, Category, EPS: StockChartBD (DSE Intelligence, dsebd.org).':Object.keys(det).length?'':' Tap “＋ Details” to add Sector and EPS.')}
function secOpts(){const s=g('ltS'),cur=S.sec;s.innerHTML='<option value="">All sectors</option>'+[...new Set(rows.map(r=>r.sec).filter(x=>x&&x!=='–'))].sort().map(x=>'<option'+(x===cur?' selected':'')+'>'+esc(x)+'</option>').join('')}
function drawCols(){g('ltCl').innerHTML=S.ord.map((id,i)=>{const c=COLS.find(x=>x.id===id);return '<div class="ltci"><label><input type="checkbox" data-v="'+id+'"'+(S.vis.includes(id)?' checked':'')+(id==='code'?' disabled':'')+'>'+c.l+'</label><button class="alt" data-m="'+id+'" data-d="-1"'+(i?'':' disabled')+' aria-label="Move up">↑</button><button class="alt" data-m="'+id+'" data-d="1"'+(i<S.ord.length-1?'':' disabled')+' aria-label="Move down">↓</button></div>'}).join('')}
function importDet(txt){const L=txt.split(/\r?\n/).filter(x=>x.trim()),sp=x=>x.indexOf('\t')>=0?x.split('\t'):x.split(','),hi=L.findIndex(l=>/code|symbol/i.test(l));if(hi<0)throw new Error('need a header row with Code or Symbol');
 const h=sp(L[hi]).map(x=>x.trim().toLowerCase()),ix=n=>h.findIndex(x=>x.startsWith(n)),I={c:Math.max(ix('code'),ix('symbol')),s:ix('sector'),k:ix('categ'),e:ix('eps')};let n=0;
 L.slice(hi+1).forEach(l=>{const c=sp(l).map(x=>x.trim()),code=(c[I.c]||'').toUpperCase();if(!code)return;const d=det[code]||{};
  if(I.s>=0&&c[I.s])d.sec=c[I.s];if(I.k>=0&&c[I.k])d.cat=c[I.k];if(I.e>=0){const e=parseFloat(c[I.e].replace(/,/g,''));if(!isNaN(e))d.eps=e}det[code]=d;n++});
 LS('ds_lt_det',det);reDet();return n}

/* Auto details v2: several free sources, one generic importer. Columns are matched by header NAME (aliases), so any CSV / TSV / JSON / HTML table with a code column works. */
function csvRows(t,dl){const o=[];let r=[],f='',q=0;t=t.replace(/^\uFEFF/,'');for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=0}else f+=c}else if(c==='"')q=1;else if(c===dl){r.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';if(r.length>1||r[0])o.push(r);r=[]}else f+=c}if(f||r.length){r.push(f);o.push(r)}return o}
const SRC=[
 {id:'fund',n:'StockChartBD · Fundamentals (CSV)',u:'https://stockchartbd.com/api/export.php?type=fundamentals'},
 {id:'comp',n:'StockChartBD · Companies (JSON)',u:'https://stockchartbd.com/api/v1.php?endpoint=companies'},
 {id:'all',n:'Both StockChartBD sources'},
 {id:'url',n:'My own link (CSV / JSON / table page)'}];
const AL={c:['symbol','code','tradingcode','trading_code','trading code','ticker','scrip','symbol_code'],s:['sector','sector_en','sector_name'],k:['category','cat','market_category'],e:['eps','eps_latest','earnings_per_share'],yr:['reported_year','eps_year','year'],nav:['nav_per_share','nav','navps'],roe:['roe_pct','roe'],div:['dividend_pct','dividend','cash_dividend','div_pct'],dy:['dividend_yield_pct','dividend_yield','dy'],risk:['health_score','risk','risk_score']};
const norm=x=>String(x===undefined||x===null?'':x).trim().toLowerCase().replace(/^\uFEFF/,'');
const nz=v=>{const x=parseFloat(String(v===undefined||v===null?'':v).replace(/,/g,''));return isNaN(x)?undefined:x};
function toTable(t){
 const s=t.replace(/^\uFEFF/,'').trim();
 if(s[0]==='{'||s[0]==='['){let j;try{j=JSON.parse(s)}catch(e){throw new Error('JSON not readable')}
  const find=(o,d)=>{if(Array.isArray(o)&&o.length&&o[0]&&typeof o[0]==='object'&&!Array.isArray(o[0]))return o;if(o&&typeof o==='object'&&d<4)for(const k in o){const r=find(o[k],d+1);if(r)return r}return null};
  const a=find(j,0);if(!a)throw new Error('no list found in JSON');const h=[...new Set(a.flatMap(x=>Object.keys(x)))];
  return{h:h.map(norm),R:a.map(x=>h.map(k=>x[k]))}}
 if(/<table[\s>]/i.test(s)){const d=new DOMParser().parseFromString(s,'text/html');let best=null;
  [...d.querySelectorAll('table')].forEach(tb=>{const tr=[...tb.rows];const hi=tr.findIndex(r=>[...r.cells].some(c=>{const x=norm(c.textContent).replace(/\s+/g,' ');return AL.c.includes(x)}));
   if(hi>=0&&(!best||tr.length>best.n))best={n:tr.length,h:[...tr[hi].cells].map(c=>norm(c.textContent).replace(/\s+/g,' ')),R:tr.slice(hi+1).map(r=>[...r.cells].map(c=>c.textContent.trim()))}});
  if(!best)throw new Error('no table with a Code/Symbol column');return best}
 const dl=(s.split(/\r?\n/,1)[0]||'').indexOf('\t')>=0?'\t':',',R=csvRows(s,dl);if(R.length<2)throw new Error('empty file');
 return{h:R[0].map(norm),R:R.slice(1)}}
function applyTable(T){
 const ix=l=>{for(const a of l){const i=T.h.indexOf(a);if(i>=0)return i}return -1},I={};for(const k in AL)I[k]=ix(AL[k]);
 const CI=AL.c.map(a=>T.h.indexOf(a)).filter(i=>i>=0);
 if(I.c<0)throw new Error('no Code/Symbol column. Header: '+T.h.slice(0,8).join(', '));
 const got=['s','k','e','yr','nav','roe','div','dy','risk'].filter(k=>I[k]>=0);if(!got.length)throw new Error('only a code column found. Header: '+T.h.slice(0,8).join(', '));
 let n=0;T.R.forEach(c=>{let k='';for(const i of CI){const v=String(c[i]===undefined||c[i]===null?'':c[i]).trim();if(v){k=v.toUpperCase();break}}if(!k||/\s/.test(k))return;const d=det[k]||{};
  if(I.s>=0&&c[I.s])d.sec=String(c[I.s]).trim();if(I.k>=0&&c[I.k])d.cat=String(c[I.k]).trim();if(I.yr>=0&&c[I.yr])d.yr=String(c[I.yr]).trim();
  [['e','eps'],['nav','nav'],['roe','roe'],['div','div'],['dy','dy'],['risk','risk']].forEach(p=>{if(I[p[0]]>=0){const v=nz(c[I[p[0]]]);if(v!==undefined)d[p[1]]=v}});det[k]=d;n++});
 return{n,got}}
const srcUrl=id=>{if(id==='url')return(g('ltUr').value||'').trim();const x=SRC.find(y=>y.id===id);return x&&x.u};
async function autoDet(){const m=g('ltMr'),say=x=>{if(m)m.textContent=x};const id=(g('ltSr')&&g('ltSr').value)||LS('ds_lt_src')||'fund';
 const ids=id==='all'?['fund','comp']:[id],msg=[],LB={s:'Sector',k:'Cat',e:'EPS',yr:'Year',nav:'NAV',roe:'ROE',div:'Div',dy:'Yield',risk:'Risk'};say('Loading…');let ok=0;
 for(const i of ids){const u=srcUrl(i),nm=(SRC.find(y=>y.id===i)||{}).n;
  if(!u){msg.push('Paste a link first.');continue}
  if(!/^https?:\/\//i.test(u)){msg.push('Link must start with http:// or https://');continue}
  try{const r=applyTable(toTable(await getPage(u)));ok++;msg.push(nm+': '+r.n+' companies ('+r.got.map(k=>LB[k]).join(', ')+')')}
  catch(x){msg.push((nm||'Source')+' failed: '+x.message)}}
 if(ok){LS('ds_lt_det',det);LS('ds_lt_detT',Date.now());reDet();secOpts();draw()}
 say(msg.join(' | '))}

/* events */
g('ltTbl').addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const k=th.dataset.k;S.sort=S.sort.k===k?{k,d:-S.sort.d}:{k,d:1};draw()});
g('ltCl').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;const i=S.ord.indexOf(b.dataset.m),j=i+ +b.dataset.d;if(j<0||j>=S.ord.length)return;[S.ord[i],S.ord[j]]=[S.ord[j],S.ord[i]];save();drawCols();draw()});
g('ltCl').addEventListener('change',e=>{const id=e.target.dataset.v;if(!id)return;S.vis=e.target.checked?[...S.vis,id]:S.vis.filter(x=>x!==id);save();draw()});
box.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{S.vis=PRE[b.dataset.pr].slice();save();drawCols();draw()});
g('ltX').onclick=()=>{S.vis=DEF.slice();S.ord=COLS.map(c=>c.id);save();drawCols();draw()};
g('ltC').onclick=()=>{const p=g('ltCp');p.hidden=!p.hidden;g('ltC').classList.toggle('on',!p.hidden)};
g('ltM').onclick=()=>{const p=g('ltMp');p.hidden=!p.hidden;g('ltM').classList.toggle('on',!p.hidden)};
g('ltMs').onclick=()=>{try{const n=importDet(g('ltT').value);g('ltMr').textContent=n+' rows saved.';g('ltT').value='';secOpts();draw()}catch(e){g('ltMr').textContent='Error: '+e.message}};
g('ltMc').onclick=()=>{det={};LS('ds_lt_det',det);reDet();g('ltMr').textContent='Cleared.';secOpts();draw()};
g('ltAu').onclick=autoDet;
(function(){const sr=g('ltSr');sr.innerHTML=SRC.map(x=>'<option value="'+x.id+'">'+esc(x.n)+'</option>').join('');sr.value=LS('ds_lt_src')||'fund';if(!sr.value)sr.value='fund';
 g('ltUr').value=LS('ds_lt_url')||'';const sh=()=>{g('ltUw').hidden=sr.value!=='url'};sh();
 sr.onchange=()=>{LS('ds_lt_src',sr.value);sh()};g('ltUr').oninput=()=>LS('ds_lt_url',g('ltUr').value)})();
g('ltH').onclick=()=>{S.hide=S.hide?0:1;save();draw()};
g('ltD').onclick=()=>{S.dn=S.dn?0:1;save();draw()};
g('ltR').onclick=refresh;
const ltTbl=()=>{const cols=S.ord.map(id=>COLS.find(c=>c.id===id)).filter(c=>c&&S.vis.includes(c.id)),a=view();return{head:cols.map(c=>c.l),data:a.map(r=>cols.map(c=>{const v=r[c.id];return v===null||v===undefined?'':v}))}};
const ltName=x=>'DSE-prices-'+new Date().toISOString().slice(0,10)+'.'+x;
const ltMsg=m=>{try{gnToast(m)}catch(e){const n=g('ltNt');if(n)n.textContent=m}};
async function ltOut(kind,share){const t=ltTbl();if(!t.data.length){ltMsg('No rows to send. Tap Refresh first.');return}
 try{if(kind==='xlsx'){await need('xlsx');const ws=XLSX.utils.aoa_to_sheet([t.head,...t.data]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'DSE prices');window.__shareNext=!!share;await window.save(ltName('xlsx'),XLSX.write(wb,{bookType:'xlsx',type:'array'}))}
 else if(kind==='csv'){const q=v=>{v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},csv=[t.head,...t.data].map(r=>r.map(q).join(',')).join('\r\n');window.__shareNext=!!share;await window.save(ltName('csv'),new TextEncoder().encode('\ufeff'+csv))}
 else{const tx=[t.head,...t.data].map(r=>r.join('\t')).join('\n');try{await navigator.clipboard.writeText(tx)}catch(e){const ta=document.createElement('textarea');ta.value=tx;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}ltMsg('Copied '+t.data.length+' rows')}}
 catch(e){window.__shareNext=false;ltMsg('Failed: '+((e&&e.message)||e))}}
const ltDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function ltToApp(dest){const a=view().filter(r=>r.code);if(!a.length){ltMsg('No rows to send. Tap Refresh first.');return}
 const d=ltDate(),all=[['Date','Name','Price'],...a.map(r=>[d,String(r.code),String(r.ltp>0?r.ltp:(r.ycp||0))])];
 try{addFile('DSE-prices-'+d,all,{size:0});setTab(dest);
  if(dest==='table'){const b=document.querySelector('#ltSw button[data-lt="my"]');if(b)b.click()}
  ltMsg('Sent '+a.length+' shares to '+({show:'Cards',compare:'Compare',table:'My data'})[dest])}catch(e){ltMsg('Failed: '+((e&&e.message)||e))}}
g('ltSd').onclick=()=>{const p=g('ltSp');p.hidden=!p.hidden;g('ltXp').hidden=true;g('ltPn').hidden=true};
g('ltSp').addEventListener('click',e=>{const b=e.target.closest('button[data-s]');if(!b)return;g('ltSp').hidden=true;if(b.dataset.s==='xlsx')ltOut('xlsx',true);else ltToApp(b.dataset.s)});
g('ltEx').onclick=()=>{const p=g('ltXp');p.hidden=!p.hidden;g('ltSp').hidden=true;g('ltPn').hidden=true};
g('ltGs').onclick=()=>{const b=document.getElementById('navSet');if(b)b.click()};
g('ltPp').onclick=()=>{const p=g('ltPn');p.hidden=!p.hidden;g('ltXp').hidden=true;g('ltSp').hidden=true;if(!p.hidden)g('ltPt').focus()};
g('ltPc').onclick=()=>{g('ltPn').hidden=true};
g('ltPg').onclick=()=>{try{const out=parsePasted(g('ltPt').value);rows=out;stamp='pasted '+new Date().toLocaleTimeString();err='';LS('ds_lt_cache',rows.map(r=>({...r,fl:0})));LS('ds_lt_time',stamp);try{window.dispatchEvent(new Event('ltdata'))}catch(e){}g('ltPn').hidden=true;g('ltPt').value='';draw();secOpts();setSt();ltMsg('Loaded '+out.length+' shares')}catch(e){ltMsg('Could not read: '+((e&&e.message)||e))}};
g('ltXp').addEventListener('click',e=>{const b=e.target.closest('button[data-x]');if(!b)return;g('ltXp').hidden=true;ltOut(b.dataset.x,false)});
g('ltI').onchange=e=>{S.iv=+e.target.value;save();auto();setSt()};
g('ltQ').oninput=e=>{S.q=e.target.value;draw()};
g('ltS').onchange=e=>{S.sec=e.target.value;draw()};
g('ltK').onchange=e=>{S.cat=e.target.value;draw()};
g('ltSw').addEventListener('click',e=>{const b=e.target.closest('button[data-lt]');if(!b)return;mode=b.dataset.lt;LS('ds_lt_mode',mode);apply()});

function auto(){clearInterval(timer);timer=null;if(shown()&&S.iv>0&&!document.hidden)timer=setInterval(refresh,S.iv*1000)}
const shown=()=>{try{return curTab==='table'&&mode==='daily'}catch(e){return false}};
let first=1;
function apply(){let on=false;try{on=curTab==='table'}catch(e){}
 const d=on&&mode==='daily';g('ltSw').style.display=on?'flex':'none';
 g('ltSw').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.lt===mode));
 g('tabShow').classList.toggle('ltdaily',d);box.style.display=d?'block':'none';
 if(d){if(first){first=0;g('ltI').value=String(S.iv);drawCols();secOpts();const t=LS('ds_lt_detT');if(!t||Date.now()-t>864e5)autoDet()}draw();refresh()}auto()}
document.addEventListener('visibilitychange',()=>{auto();if(!document.hidden&&shown())refresh()});
if(typeof setTab==='function'){const o=setTab;window.setTab=function(){const r=o.apply(this,arguments);try{apply()}catch(e){}return r}}
window.__ltRefresh=refresh;apply();
}catch(e){console.error('Live table init failed',e)}})();
