const DRE=/^(\d{1,2}[-\/. ][A-Za-z]{3}[-\/. ]\d{2,4}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\s+(\S.*)$/;
function fixRows(rs){
  const out=[];
  rs.forEach(r=>{
    r=r.flatMap(c=>{const m=c.match(DRE);return m?[m[1],m[2]]:[c]});
    if(r.length>=2&&pDate(r[0])!==null){const m2=String(r[1]).match(/^(Buy|Bought|Sale|Sell|Sold)\s+(\S.*)$/i);if(m2)r=[r[0],m2[1],m2[2],...r.slice(2)]}
    if(r.length===1&&/^[A-Z]{1,4}$/.test(r[0])&&out.length){
      const p=out[out.length-1],i=p.findIndex(c=>/^[A-Z][A-Z0-9]{4,}$/.test(c));
      if(i>=0){p[i]+=r[0];return}
    }
    out.push(r);
  });
  return out;
}
function toRows(items){
  items=items.filter(i=>i.str.trim()!=='').map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],w:i.width}));
  items.sort((a,b)=>b.y-a.y||a.x-b.x);
  const lines=[];
  for(const it of items){
    const l=lines[lines.length-1];
    if(l&&Math.abs(l.y-it.y)<3)l.items.push(it);else lines.push({y:it.y,items:[it]});
  }
  return lines.map(l=>{
    l.items.sort((a,b)=>a.x-b.x);
    const cells=[];let end=null;
    for(const it of l.items){
      if(end!==null&&it.x-end<=5)cells[cells.length-1]+=(it.x-end>1?' ':'')+it.s.trim();
      else cells.push(it.s.trim());
      end=it.x+it.w;
    }
    if(cells.length===1){const m=cells[0].match(/^(.*\S)\s+(-?[\d,]*\.?\d+)$/);if(m)return [m[1],m[2]]}
    return cells;
  });
}

const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
const fy=y=>y<100?2000+y:y;
function pDate(s){s=String(s).trim().replace(/^date:?\s*/i,'');let m;
  if(m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))return Date.UTC(+m[1],m[2]-1,+m[3]);
  if(m=s.match(/^(\d{1,2})\s*[-\/.]\s*(\d{1,2})\s*[-\/.]\s*(\d{2,4})$/))return Date.UTC(fy(+m[3]),m[2]-1,+m[1]);
  if(m=s.match(/^(\d{1,2})[-\/. ]([A-Za-z]{3})[a-z]*[-\/., ]+(\d{2,4})$/)){const mo=MON[m[2].toLowerCase()];if(mo!==undefined)return Date.UTC(fy(+m[3]),mo,+m[1])}
  if(m=s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})$/)){const mo=MON[m[1].toLowerCase()];if(mo!==undefined)return Date.UTC(fy(+m[3]),mo,+m[2])}
  return null}
function fmtDate(s){const t=pDate(s);if(t===null)return s;const d=new Date(t),p=n=>String(n).padStart(2,'0');return p(d.getUTCDate())+'-'+p(d.getUTCMonth()+1)+'-'+String(d.getUTCFullYear()).slice(2)}
function canon(h){h=String(h).toLowerCase();if(h.startsWith('x:'))return h;if(/date|time/.test(h))return 'date';if(/name|company|scrip|symbol|code|instrument|security|trading|country|particular|description/.test(h))return 'name';if(/qty|quant|volume|share|vol/.test(h))return 'quantity';if(/price|ltp|close|rate|value|last/.test(h))return 'price';return h}
const num=s=>{const v=parseFloat(String(s).replace(/,/g,''));return isNaN(v)?null:v};

/* Header detection for PDF/text tables (statements whose header row wraps or has a different cell count than the data rows) */
const HKW=/date|transaction|particular|qty|quant|rate|price|amount|comm|debit|credit|balance|name|scrip|symbol|code|instrument|type|value|ltp|volume|close|company|descri|narration|ledger/i;
function findHeader(all){
  let best=null;
  for(let i=0;i<Math.min(all.length,80);i++){const r=all[i];if(r.length<3)continue;
    const hits=r.filter(c=>HKW.test(c)&&num(c)===null&&pDate(c)===null).length;
    if(hits>=3&&hits>=r.length*0.5&&(!best||hits>best.hits))best={i,hits,r}}
  return best}
function fitLabels(hd,all,mode){
  let lab=hd.r.map(c=>String(c).trim());
  const nx=all[hd.i+1];
  if(nx&&nx.length>0&&nx.length<lab.length&&nx.every(c=>/^[A-Za-z.]{1,5}$/.test(String(c).trim())))nx.forEach((c,k)=>{lab[k]+=String(c).trim()});
  const PRE=/^(ledger|net|trade|trading|total|market|closing|opening)$/i;
  while(lab.length>mode){
    let j=lab.findIndex((c,i)=>i<lab.length-1&&PRE.test(c));
    if(j<0)j=lab.length-2;
    lab.splice(j,2,lab[j]+' '+lab[j+1]);
  }
  if(lab.length!==mode)return null;
  return lab.map((c,i)=>c||('Col '+(i+1)));
}
function nameCols(h,body){
  h=h.slice();
  let m;try{m=automapOf({header:h,rows:body})}catch(e){return h}
  const gen=(i)=>/^Col \d+$/i.test(h[i]);
  const dup=i=>h.filter(x=>String(x).toLowerCase()===String(h[i]).toLowerCase()).length>1;
  const set=(i,nm,re)=>{if(i<0||h.includes(nm))return;if(gen(i)||dup(i)||(re&&!re.test(h[i])))h[i]=nm};
  set(m.d,'Date',/date|time/i);set(m.t,'Type',/type|buy|sale|sell/i);set(m.n,'Name');set(m.q,'Quantity');set(m.p,'Price');
  return h;
}
/* PDF upload: keep ONLY real share names (no TT, TT_amount, T.Amt, Total, page text ...) */
const NAMEBAD=/^(TT|TOTAL|GRAND|SUB|PAGE|DATE|NAME|QTY|QUANTITY|AMT|AMOUNT|AVG|AVERAGE|PRICE|VALUE|GAIN|LOSS|NET|BUY|SELL|SALE|SOLD|BOUGHT|TYPE|RATE|CODE|CLIENT|BO|ID|NO|SL|FROM|TO|PRINTED|ON|AS|BALANCE|CASH|LEDGER|MARKET|PORTFOLIO|SECTOR|INSTRUMENT|SCRIP|PHONE|ADDRESS|T\.?AMT|T\.?AVG|TT[_.].*)$/i;
function knownCodes(){try{const a=JSON.parse(localStorage.getItem('ds_lt_cache')||'[]'),k=new Set();a.forEach(x=>{if(x&&x.code)k.add(String(x.code).toUpperCase())});return k.size>=150?k:null}catch(e){return null}}
function isShareName(v,K){v=String(v==null?'':v).trim().replace(/\s*\([ABNZ]\)$/,'');
  if(!/^[A-Z0-9][A-Z0-9&._()-]{1,24}$/.test(v)||/^[\d.,-]+$/.test(v)||NAMEBAD.test(v))return false;
  return K?K.has(v):true}
function pdfShareOnly(h,body){
  const K=knownCodes();let best=-1,bc=0;
  h.forEach((_,i)=>{const c=body.filter(r=>isShareName(r[i],null)).length;if(c>bc){bc=c;best=i}});
  if(best<0||bc<Math.max(1,body.length*0.2))return{h,body};
  let keep=body.filter(r=>isShareName(r[best],K));
  if(!keep.length)keep=body.filter(r=>isShareName(r[best],null));
  if(canon(h[best])!=='name'){h=h.slice();const o=h.findIndex(x=>canon(x)==='name');if(o>=0)h[o]='Info';h[best]='Name'}
  keep.forEach(r=>{r[best]=String(r[best]).trim().replace(/\s*\([ABNZ]\)$/,'')});
  return{h,body:keep}}
/* Broker ledger column words (Transaction / Particulars / Qty. / Rate (TK.) / Amount (TK.) / Comm. (TK.) / Debit (TK.) / Credit (TK.) / Ledger Balance):
   (TK.) is dropped and the words get ONE fixed spelling, so every file (PDF, Excel, screenshot PDF) gives the same column names.
   To teach the app another column word, add a line to XCOLS. */
const XCOLS=[[/^amount$/i,'Amount'],[/^(comm|commission|brokerage)\.?$/i,'Comm.'],[/^debit$/i,'Debit'],[/^credit$/i,'Credit'],[/^(ledger\s*)?balance$/i,'Ledger Balance']];
function normHead(c){c=String(c);if(c.startsWith('x:'))return c;c=c.replace(/\s*\((?:tk|bdt|taka|\u09f3)[^)]*\)?\s*$/i,'').replace(/\s+/g,' ').trim();for(const [re,n] of XCOLS)if(re.test(c))return n;return c}
function addFile(name,all,meta={}){
  all=all.filter(r=>r.length>=2);
  if(!all.length){$('msg').textContent=name+': কোনো data পাওয়া যায়নি।';return}
  const cnt={};all.forEach(r=>cnt[r.length]=(cnt[r.length]||0)+1);
  const mode=+Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const good=all.filter(r=>r.length===mode);
  let h=good[0],body=good.slice(1);
  if(h.some(c=>num(c)!==null)){
    body=good;
    const hd=findHeader(all),lab=hd?fitLabels(hd,all,mode):null;
    h=lab||(mode===2?['Name','Price']:h.map((_,i)=>'Col '+(i+1)));
    if(mode>2)h=nameCols(h,body);
    if(hd)body=body.filter(r=>r.join('|')!==hd.r.join('|'));
  }else{
    const hd=findHeader(all);
    if(hd&&hd.r.join('|')===h.join('|')){const lb=fitLabels(hd,all,mode);if(lb&&lb.join('|')!==h.join('|')){body=body.filter(r=>r.join('|')!==hd.r.join('|'));h=nameCols(lb,body)}}
  }
  body=body.filter(r=>r.join('|')!==h.join('|'));
  h=h.map(normHead);
  if(meta.pdf){const sr=pdfShareOnly(h,body);h=sr.h;body=sr.body;if(!body.length){$('msg').textContent=name+': share name পাওয়া যায়নি।';return}}
  const hasDate=h.some(c=>/date/i.test(c))||h.some((_,i)=>body.slice(0,30).some(r=>pDate(r[i])!==null));
  if(!hasDate){const dv=$('dflt').value;h=[...h,'Date'];body=body.map(r=>[...r,dv])}
  const dq=$('dq').value.trim();
  if(dq&&!h.some(c=>canon(c)==='quantity')){h=[...h,'Quantity'];body=body.map(r=>[...r,dq])}
  const mf=fields.filter(f=>!fsrc[f]&&!h.includes('x:'+f));
  if(mf.length){h=[...h,...mf.map(f=>'x:'+f)];body=body.map(r=>[...r,...mf.map(()=>'')])}
  store=store.filter(s=>s.name!==name);
  store.push({name,header:h,rows:body,addedAt:new Date().toISOString(),size:Number(meta.size)||0});
  $('msg').textContent='';
  merge();
  try{if(typeof autoFields==='function')autoFields()}catch(e){console.error(e)}
}

function automap(){
  const H=header.map(h=>String(h).startsWith('x:')?'':String(h).toLowerCase()),S=rows.slice(0,60),idx=header.map((_,i)=>i).filter(i=>!String(header[i]).startsWith('x:'));
  const find=re=>H.findIndex(h=>re.test(h));
  let d=find(/date|time/),n=find(/name|company|scrip|symbol|code|instrument|security|trading|particular|description/),q=find(/qty|quant|volume|share|vol/),p=find(/price|ltp|close|rate|value|last/);
  const used=()=>[d,n,q,p];
  if(d<0){let b=0;idx.forEach(i=>{const c=S.filter(r=>pDate(r[i])!==null).length;if(c>b){b=c;d=i}})}
  const numeric=i=>S.length>0&&S.filter(r=>num(r[i])!==null&&pDate(r[i])===null).length>S.length*0.7;
  if(p<0){let b=-1;idx.forEach(i=>{if(used().includes(i)||!numeric(i))return;const c=S.filter(r=>/\./.test(r[i])).length;if(c>b){b=c;p=i}})}
  if(q<0)idx.forEach(i=>{if(q<0&&!used().includes(i)&&numeric(i))q=i});
  if(n<0)idx.forEach(i=>{if(n<0&&!used().includes(i)&&!numeric(i)&&pDate(S[0]&&S[0][i])===null)n=i});
  const dist=i=>new Set(S.map(r=>String(r[i]??'').trim().toUpperCase())).size;
  if(n>=0&&S.length>4&&dist(n)<=3){let b=-1,bi=-1;idx.forEach(i=>{if([d,q,p,n].includes(i)||numeric(i)||S.some(r=>pDate(r[i])!==null))return;const c=dist(i);if(c>b){b=c;bi=i}});if(bi>=0&&b>dist(n))n=bi}
  const tcol=idx.find(i=>{if([d,n,q,p].includes(i))return false;const v=S.map(r=>String(r[i]??'').trim()).filter(Boolean);return v.length>0&&v.filter(x=>/^(buy|bought|sale|sell|sold)$/i.test(x)).length>=v.length*0.6});
  return{d,n,q,p,t:tcol===undefined?-1:tcol};
}
function fillSel(){
  fillFieldBoxes();
  [['mD','d'],['mN','n'],['mQ','q'],['mP','p']].forEach(([id,k])=>{
    const s=$(id);
    s.innerHTML='<option value="-1">—</option>'+header.map((h,i)=>`<option value="${i}">${String(h).replace(/^x:/,'').replace(/[<&]/g,'')||('Col '+(i+1))}</option>`).join('');
    s.value=map[k];
    s.onchange=()=>{map[k]=+s.value;if(k==='d'||k==='t')sortRows();page=0;render()};
  });
}
let selD=new Set(),dShift=0;
const iso=t=>new Date(t).toISOString().slice(0,10);
const dfmt=k=>k.slice(8,10)+'-'+k.slice(5,7)+'-'+k.slice(2,4);
function renderDates(){
  const box=$('dbox');if(!box)return;
  const cnt={};
  if(map.d>=0)baseRows.forEach(r=>{const t=pDate(r[map.d]);if(t!==null){const k=iso(t);cnt[k]=(cnt[k]||0)+1}});
  const n=new Date();
  const end=Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())-dShift*30*864e5;
  const days=[];for(let i=0;i<30;i++)days.push(iso(end-i*864e5));
  box.innerHTML='<div class="dgrid">'+
    days.map(k=>`<button class="dchip${cnt[k]?' has':' none'}${selD.has(k)?' on':''}" data-k="${k}" title="${dfmt(k)}${cnt[k]?' ('+cnt[k]+')':''}">${k.slice(8,10)}</button>`).join('')+
    '</div><div class="dctl"><button class="alt sm" id="dP" title="Previous 30 days">‹</button><button class="alt sm" id="dN" title="Next 30 days">›</button><button class="alt sm" id="dA" title="All dates">All</button></div>';
  box.querySelectorAll('.dchip').forEach(b=>b.onclick=()=>{const k=b.dataset.k;selD.has(k)?selD.delete(k):selD.add(k);sortRows();page=0;render()});
  $('dP').onclick=()=>{dShift++;renderDates()};
  $('dN').onclick=()=>{dShift=Math.max(0,dShift-1);renderDates()};
  $('dA').onclick=()=>{selD.clear();sortRows();page=0;render()};
}
const ordMode=()=>{const v=$('ord').value;return(v==='search'||v==='nasc'||v==='ndesc')?'group':v};
const rowText=r=>{const a=[];header.forEach((h,i)=>{if(i===map.d)a.push(fmtDate(r[i]));a.push(String(r[i]??''))});return a.join(' ').toLowerCase()};
function sortRows(){
  sortRows0();
  if(selD.size&&map.d>=0)rows=rows.filter(r=>{const t=pDate(r[map.d]);return t!==null&&selD.has(iso(t))});
  {const sq=($('srch').value||'').trim().toLowerCase();if(sq)rows=rows.filter(r=>rowText(r).includes(sq))}
  if(tf==='net'){rows=netRows(rows)}else if(tf!=='all'){const re=tf==='buy'?/^(buy|bought)$/i:/^(sell|sale|sold)$/i;const hit=c=>re.test(String(c??'').trim());rows=rows.filter(r=>r.some(hit)||(r.__o&&r.__o.some(hit))||(r.__m&&hit(r.__m.t)))}
}
function sortRows0(){
  rows=baseRows.slice();
  const mode=ordMode();
  const dv=r=>map.d>=0?(pDate(r[map.d])??0):0;
  if(mode==='group'&&map.n>=0){
    const key=r=>String(r[map.n]).trim().toUpperCase();
    const order=new Map();rows.forEach(r=>{const k=key(r);if(!order.has(k))order.set(k,order.size)});
    {const ov=$('ord').value;if(ov==='nasc'||ov==='ndesc'){const ks=[...order.keys()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})*(ov==='ndesc'?-1:1));order.clear();ks.forEach((k,i)=>order.set(k,i))}}
    const dir=(dxIdx(design.lay)>=0&&design.cOrd!=='new')?1:-1,ix=new Map();baseRows.forEach((r,i)=>ix.set(r,i));const xi=r=>ix.has(r)?ix.get(r):0;
    rows.sort((a,b)=>(order.get(key(a))-order.get(key(b)))||(dir*(dv(a)-dv(b)))||(dir*(xi(a)-xi(b))));
    return}
  if(map.d<0)return;
  const d=mode==='asc'?1:-1;
  {const ix=new Map();baseRows.forEach((r,i)=>ix.set(r,i));const xi=r=>ix.has(r)?ix.get(r):0;rows.sort((a,b)=>d*(dv(a)-dv(b))||d*(xi(a)-xi(b)))}
}
