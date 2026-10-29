let design={card:'group',price:'group',sum:'modern',size:'m',corner:'round',shadow:'on',all:null,names:{},style:1,tpos:'top',buy:'mid',gcol:false,fcols:5,fcV:3,lay:'ds',font:'auto',tot:'col',tmode:'net',qlbl:'Quantity',per:'20',pager:'show',show:{}};
const SHD={t_date:1,t_qty:1,t_price:1,t_tag:1,t_extra:1,t_ramt:1,t_ravg:1,t_rlbl:1,t_totlbl:1,t_val:0,t_vsl:0,s_cost:1,s_avg:1,s_mkt:1,s_qty:1,s_pl:1,s_plp:1,s_last:1,s_chg:1,s_bq:0,s_sq:0,s_bv:0,s_sv:0,s_cnt:0,s_first:0,s_lastd:0,s_min:0,s_max:0};
const SHL={t_date:'Date',t_qty:'Quantity',t_price:'Price',t_tag:'Buy / Sell tag',t_extra:'Extra fields',t_ramt:'Total amount under price (All filter)',t_ravg:'Average under price (All filter)',t_rlbl:'Show T / A text in those boxes',t_totlbl:'Show "Total" text above Total quantity',t_val:'Value (qty × price)',t_vsl:'Profit vs last price (Portfolio)',s_cost:'Cost / Total amount',s_avg:'Average price',s_mkt:'Market value (Portfolio)',s_qty:'Quantity',s_pl:'Profit / Loss (Portfolio)',s_plp:'Profit / Loss % (Portfolio)',s_last:'Last price (Portfolio)',s_chg:'Last change (Portfolio)',s_bq:'Buy quantity (Portfolio)',s_sq:'Sell quantity (Portfolio)',s_bv:'Buy amount (Portfolio)',s_sv:'Sell amount (Portfolio)',s_cnt:'Trades count (Portfolio)',s_first:'First date (Portfolio)',s_lastd:'Last date (Portfolio)',s_min:'Min price (Portfolio)',s_max:'Max price (Portfolio)'};
const sh=k=>design.show&&design.show[k]!==undefined?!!design.show[k]:!!SHD[k];
const DKEY='ds_design_v1';
const escA=v=>esc(v).replace(/"/g,'&quot;');
function saveDesign(){try{localStorage.setItem(DKEY,JSON.stringify(design))}catch(e){}}
/* ===== Data Show card engine (6 templates from the preview) ===== */
const DXL=['ds','pp','cp','br','cr','ti','dl','ph'];
const DXFK=['name','tag','date','qty','rowAmt','rowAvg','total','tAmt','tAvg','cAmt','cAvg','gain','gainPct','price','fAvg','fAmt'];
const DXLB={name:'Name',tag:'Tag',date:'DATE',qty:'QTY',rowAmt:'AMT',rowAvg:'T.AVG',cAmt:'T.AMT',cAvg:'T.AVG',total:'TOTAL',tAmt:'T.AMT',tAvg:'T.AVG',gain:'GAIN',gainPct:'GAIN %',price:'Price',fAvg:'F.AVG',fAmt:'F.AMT'};
const DXTP=['date:t,name:h,tag:h,qty:l,rowAmt:l,total:l!,tAmt:l,tAvg:l,gain:l!,price:rp,cAmt:rb,cAvg:rb','name:h,tag:h,date:l,qty:l!,total:l!,gain:l!,price:rt','date:t,name:h,total:m,tag:m,qty:m,price:rp,tAvg:rb','name:h,tAmt:l,tAvg:l!,rowAmt:l,qty:l!,total:l,gain:m,gainPct:m,price:rt,tag:rp,date:rb','name:h,tag:h,date:l,qty:l,total:l,price:rt','name:h,tag:h,price:rt,qty:l,total:l,tAmt:l,tAvg:l,gain:l','date:t,name:h,tag:h,qty:l,rowAmt:l,total:l!,tAmt:l,gain:l!,price:rp,cAmt:rb','date:t,name:h,total:m,tag:m,qty:m,gain:m,price:rp,cAmt:rb,cAvg:rb'];
const DXDZ={nameSize:20,labelSize:11,numSize:12,priceSize:22,boxSize:10.5,colW:78,lineGap:1,labelGap:4,pad:9,radius:9,pv:5};
const DXSZ=[{nameSize:18,numSize:14,labelSize:11,priceSize:20,boxSize:10,colW:112,pv:4,lineGap:1,radius:12,pad:10},{nameSize:18,priceSize:24,colW:50},{nameSize:15,priceSize:20,colW:50},{nameSize:17,priceSize:20,colW:50},{nameSize:14,priceSize:15,pad:7,numSize:11,colW:50},{nameSize:15,priceSize:24,colW:50},{nameSize:18,numSize:14,labelSize:11,priceSize:20,boxSize:10,colW:112,pv:4,lineGap:1,radius:12,pad:10},{nameSize:16,numSize:13,labelSize:10,priceSize:22,boxSize:10,colW:112,pv:6,lineGap:1,radius:12,pad:9}];
const DXTL=[{rowAmt:'AMT',rowAvg:'AVG'},,,,,,{rowAmt:'AMT',rowAvg:'AVG'},{cAmt:'T',cAvg:'A',qty:'Quantity',total:'Total',date:'Date'}];
const DXSL=[['t','Top line'],['h','Name row'],['l','Left lines'],['m','Middle'],['rt','Right top'],['rp','Right pill'],['rb','Right bottom']];
const DXCOL={buyC:'#1f9d4d',sellC:'#c62828',cName:'',cLabel:'',cNum:'',cBuy:'',cSell:'',cBox:'',cGp:'#1f9d4d',cGn:'#c62828'};
const DXSW=['#1f9d4d','#c62828','#888780','#378ADD','#EF9F27','#7F77DD','#0F9B9B','#D4537E'];
const dxIdx=l=>DXL.indexOf(l);
function dxPf(t){const f={},o={};DXTP[t].split(',').forEach(x=>{const a=x.split(':');f[a[0]]=[a[1].replace('!',''),1,a[1].slice(-1)==='!'?1:0]});
  Object.keys(f).forEach(k=>{o[k]=f[k];if(k==='total')['tAmt','tAvg'].forEach(x=>{if(!f[x])o[x]=['l',0,0]})});
  o.fAvg=['rb',(t===0||t===6||t===7)?1:0,0];o.fAmt=['rb',0,0];DXFK.forEach(k=>{if(!o[k])o[k]=['l',0,0]});return o}
function dxNew(l,old){const t=dxIdx(l),o=Object.assign({},DXDZ,DXSZ[t]);o.lay=l;o.ver=7;o.f=dxPf(t);o.lab=Object.assign({},DXLB,DXTL[t]||{});
  o.cu=(old&&old.cu)||[];Object.keys(DXCOL).forEach(k=>{o[k]=(old&&old[k]!==undefined)?old[k]:DXCOL[k]});return o}
function dxMig(x){if(!x||x.ver===7)return;const v=x.ver||0;x.ver=7;try{const f=x.f;
  if(v<3){if(f&&f.tag&&f.tag[0]==='t'){const n={};Object.keys(f).forEach(k=>{if(k==='tag')return;n[k]=f[k];if(k==='name')n.tag=['h',f.tag[1],f.tag[2]]});if(!n.tag)n.tag=['h',f.tag[1],f.tag[2]];x.f=n}
    if(x.lineGap===4||x.lineGap===7||x.lineGap===2)x.lineGap=1;if(x.pad===12||x.pad===13)x.pad=x.pad===12?9:10;if(x.colW===150)x.colW=112;if(x.pv===9||x.pv===7)x.pv=4}
  if(x.lay==='ds'&&x.f){if(x.f.rowAvg)x.f.rowAvg[1]=0;if(v===4){['tAvg','cAvg'].forEach(k=>{if(x.f[k])x.f[k][1]=1})}}if(x.f&&!x.f.fAmt){const on=x.lay==='ds'||x.lay==='dl'||x.lay==='ph';x.f.fAmt=['rb',on?1:0,0]}if(x.lab&&!x.lab.fAmt)x.lab.fAmt='F.AMT';if(x.f&&!x.f.fAvg){const on=x.lay==='ds'||x.lay==='dl'||x.lay==='ph';const n={};Object.keys(x.f).forEach(k=>{if(k==='fAmt')n.fAvg=['rb',on?1:0,0];n[k]=x.f[k]});if(!n.fAvg)n.fAvg=['rb',on?1:0,0];if(n.fAmt)n.fAmt[1]=0;x.f=n}if(x.lab&&!x.lab.fAvg)x.lab.fAvg='F.AVG'}catch(e){}}
function dxEnsure(){if(dxIdx(design.lay)>=0&&(!design.dx||design.dx.lay!==design.lay)){design.dx=dxNew(design.lay,design.dx);saveDesign()}else if(design.dx&&design.dx.ver!==7){dxMig(design.dx);saveDesign()}}
const dxF2=n=>(Math.round(n*100)/100).toFixed(2),dxSg=x=>(x>=0?'+':'')+dxF2(x);
function dxItems(S){const a=Object.keys(S.f).map(k=>{const x=S.f[k];return{k,s:x[0],show:x[1],br:x[2]}});(S.cu||[]).forEach((o,i)=>a.push({k:'c'+i,c:1,s:o.slot,show:o.show,br:o.br,lab:o.lab,v:o.val}));return a}
function dxCard(c){
  const S=design.dx,ty=c.ty,B=ty==='b',Sl=ty==='s',d=c.d||{},p=c.p,q=c.q,t=dxIdx(design.lay);
  const gp=(d.gain!=null&&q>0&&p!=null&&(p-d.gain/q)>0)?d.gain/(q*(p-d.gain/q))*100:null;
  const V={name:c.name,tag:B?'Buy':Sl?'Sell':ty==='n'?'Net':'',date:c.date,qty:c.qty,rowAmt:(p!=null&&q!=null)?dxF2(p*q):null,rowAvg:p!=null?dxF2(p):null,total:c.tot,
    tAmt:d.amt!==undefined?dxF2(d.amt):null,tAvg:d.avg!=null?dxF2(d.avg):null,cAmt:d.amt!==undefined?dxF2(d.amt):null,cAvg:d.avg!=null?dxF2(d.avg):null,
    gain:Sl&&d.gain!=null?dxSg(d.gain):null,gainPct:Sl&&gp!==null?dxSg(gp)+'%':null,price:c.price,fAvg:(B&&c.dt!=null&&p!=null)?dxF2(p*(1+cpPct(c.dt)/100)):null,fAmt:(B&&c.dt!=null&&p!=null&&q!=null)?dxF2(p*q*(1+cpPct(c.dt)/100)):null};
  const pcol=B?S.buyC:Sl?S.sellC:'';
  const itm=(o,s,kk)=>{kk=kk||1;const v=o.c?o.v:V[o.k];if(v===null||v===undefined||v==='')return'';
    const inl=(s==='rb'||s==='rp'),fs=inl?'font-size:'+(o.k==='price'?S.priceSize:S.boxSize)+'px;':'';
    if(o.k==='name')return`<span class="it dnm" style="font-size:${S.nameSize}px">${v}</span>`;
    if(o.k==='tag')return`<span class="it tag ${B?'b':'s'}">${v}</span>`;
    if(o.k==='price')return`<span class="it dpr" style="${inl?fs:'font-size:'+S.priceSize+'px;'}${pcol?'color:'+pcol:''}">${v}</span>`;
    const gc=(o.k==='gain'||o.k==='gainPct')?'color:'+(String(v)[0]==='-'?S.cGn:S.cGp)+';':'';
    const lab=esc(o.c?o.lab:dxLab(o.k,S.lab[o.k],ty));
    return`<span class="it" style="${fs}"><span class="lb"${inl?'':` style="font-size:${S.labelSize*kk}px"`}>${lab}</span><span class="nu" style="${gc}${inl?'':'font-size:'+(S.numSize*kk)+'px'}">${esc(v)}</span></span>`};
  const it=dxItems(S);
  const sl=(s,cl)=>{const lines=[];let cur=null;it.forEach(i=>{if(i.s!==s||!i.show)return;if(!cur||(i.br&&cur.length)){cur=[];lines.push(cur)}cur.push(i)});let o='';lines.forEach(ln=>{const kk=1,xs=ln.map(i=>itm(i,s,kk)).filter(Boolean);if(!xs.length)return;if(o)o+='<i class="nl"></i>';o+=(s==='l'&&xs.length>1)?`<span class="ln">${xs.join('')}</span>`:xs.join('')});return o?`<div class="sl ${cl}">${o}</div>`:''};
  const L=sl('t','col')+sl('h','hd')+sl('l','col'),M=sl('m','M'),R=sl('rt','rt')+sl('rp','rp')+sl('rb','rb'),cc=B?S.cBuy:Sl?S.cSell:'';
  const vars=[['--c-l',S.cLabel],['--c-n',S.cName],['--c-u',S.cNum],['--bc',S.buyC],['--sc',S.sellC],['--lg',S.lineGap+'px'],['--gl',S.labelGap+'px'],['--cbx',S.cBox],['--pv',S.pv+'px'],['--ty',(S.tagY==null?-5:S.tagY)+'px']].filter(x=>x[1]).map(x=>x[0]+':'+x[1]).join(';');
  return`<div class="item dsx ${t===6?'t1 t7':'t'+(t+1)}${B?' dbuy':Sl?' dsell':''}${c.cls.replace(' sell','')}" data-i="${c.gi2}" style="${c.st}padding:${S.pad}px;border-radius:${S.radius}px;${cc?'background:'+cc+';':''}${vars}"><div class="L">${L}${c.xt||''}</div>${M}${R?`<div class="R" style="flex:none;width:${cpColW(S)}px;min-width:${cpColW(S)}px">${R}</div>`:''}${c.tools}</div>`;
}
/* ===== Daily card, Future card, F.Avg ===== */
const CPDF=[['ltp','Last price (LTP)'],['chg','Change'],['pct','Change %'],['high','High'],['low','Low'],['ycp','Yesterday close'],['vol','Volume'],['trade','Trades'],['val','Value (mn)'],['gain','My open gain']];
const CPFF=[['qty','Quantity left'],['famt','F.Amt (total)'],['favg','F.Avg (break-even price)'],['live','Live price'],['gap','Gap to F.Avg']];
const CPACC='#2563eb';
const cpAcc=()=>design.cpa||CPACC;
function cpD(){const d=design.dly=design.dly||{};if(d.on===undefined)d.on=1;if(d.min===undefined)d.min=0;if(!d.f)d.f={ltp:1,chg:1,pct:1,high:1,low:1,ycp:0,vol:1,trade:0,val:0,gain:1};return d}
function cpFu(){const d=design.fut=design.fut||{};if(d.on===undefined)d.on=1;if(d.min===undefined)d.min=0;if(d.base===undefined)d.base=7;if(d.step===undefined)d.step=1;if(d.every===undefined)d.every=2;if(!d.f)d.f={qty:1,famt:1,favg:1,live:1,gap:1};return d}
const cpColW=S=>(TH.prb_w>0)?TH.prb_w:Math.round(S.colW*((TH.prb_s||100)/100));
function cpMonths(a,b){const x=new Date(a),y=new Date(b);let m=(y.getUTCFullYear()-x.getUTCFullYear())*12+y.getUTCMonth()-x.getUTCMonth();if(y.getUTCDate()<x.getUTCDate())m--;return Math.max(0,m)}
function cpPct(t){const u=cpFu(),n=new Date(),now=Date.UTC(n.getFullYear(),n.getMonth(),n.getDate());return u.base+(t?Math.floor(cpMonths(t,now)/Math.max(1,u.every))*u.step:0)}
function cpLive(){const m=new Map();let a=[];try{a=JSON.parse(localStorage.getItem('ds_lt_cache')||'[]')||[]}catch(e){}
 a.forEach(x=>{if(x&&x.code)m.set(String(x.code).trim().toUpperCase(),x)});return m}
function cpStamp(){try{return JSON.parse(localStorage.getItem('ds_lt_time')||'""')||''}catch(e){return ''}}
const cpF=(v,d)=>v==null||isNaN(v)?'–':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const cpS=(v,d)=>v==null||isNaN(v)?'–':(v>0?'+':'')+cpF(v,d);
const cpTd=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return p(d.getDate())+'-'+p(d.getMonth()+1)+'-'+String(d.getFullYear()).slice(2)};
const cpLotsStr=L=>L.map(x=>x.q+','+x.p+','+(x.d||0)).join('|');
const cpLotsParse=s=>String(s||'').split('|').filter(Boolean).map(z=>{const a=z.split(',');return{q:+a[0],p:+a[1],d:+a[2]}});
const cpBtn=(t,min,ref)=>`<span class="cpbt">${ref?'<button type="button" data-cpref="1" title="Refresh live prices">⟳</button>':''}<button type="button" data-cpmin="${t}" title="${min?'Expand':'Minimize'}">${min?'▸':'▾'}</button></span>`;
function cpDailyIn(nm,lots,x){
 const D=cpD(),F=D.f,m=!!D.min,stamp=cpStamp();
 const hd=`<div class="dt"><span>DAILY · ${cpTd()}${stamp?' · '+esc(stamp):''}</span>${cpBtn('dly',m,1)}</div><div class="nm">${esc(nm)}</div>`;
 if(!x)return `<div class="cpl">${hd}${m?'':'<div class="cpm">No live price yet. Tap ⟳ or open Table › Daily data.</div>'}</div>`;
 const up=x.chg>0?' up':x.chg<0?' dn':'',nq=lots.reduce((s,l)=>s+l.q,0),cost=lots.reduce((s,l)=>s+l.q*l.p,0),bits=[];
 const B=(k,l,v)=>{if(F[k]&&v!=null)bits.push(`<span>${l} <b>${v}</b></span>`)};
 if(!m){B('high','High',x.high?cpF(x.high,2):null);B('low','Low',x.low?cpF(x.low,2):null);B('ycp','YCP',cpF(x.ycp,2));B('vol','Vol',x.vol?cpF(x.vol,0):null);B('trade','Trades',x.trade?cpF(x.trade,0):null);B('val','Value',x.val?cpF(x.val,2)+' mn':null)}
 let g='';if(!m&&F.gain&&nq>0){const gv=nq*x.ltp-cost,gp=cost?gv/cost*100:0;g=`<div class="cpm">Open gain <b class="${gv>=0?'up':'dn'}">${cpS(gv,2)} (${cpS(gp,2)}%)</b></div>`}
 const R=[];if(F.ltp)R.push(`<div class="cpp${up}">${cpF(x.ltp,2)}</div>`);
 const cc=[];if(F.chg)cc.push(cpS(x.chg,2));if(F.pct)cc.push((F.chg?'(':'')+cpS(x.pct,2)+'%'+(F.chg?')':''));
 if(cc.length)R.push(`<div class="cpc${up}">${x.chg>0?'▲':x.chg<0?'▼':'▬'} ${cc.join(' ')}</div>`);
 return `<div class="cpl">${hd}${bits.length?`<div class="cpm">${bits.join('')}</div>`:''}${g}</div><div class="cpr">${R.join('')}</div>`}
function cpFutIn(nm,lots,x){
 const U=cpFu(),F=U.f,m=!!U.min,nq=lots.reduce((s,l)=>s+l.q,0),fa=lots.reduce((s,l)=>s+l.q*l.p*(1+cpPct(l.d)/100),0),fv=nq>0?fa/nq:null;
 const hd=`<div class="dt"><span>FUTURE · +${U.base}% · +${U.step}%/${U.every}mo</span>${cpBtn('fut',m)}</div><div class="nm">${esc(nm)}</div>`,bits=[];
 if(!m){if(F.qty)bits.push(`<span>Qty <b>${cpF(nq,2).replace(/\.00$/,'')}</b></span>`);if(F.famt)bits.push(`<span>F.Amt <b>${cpF(fa,2)}</b></span>`)}
 let lv='';if(!m&&x&&fv&&x.ltp){const gap=x.ltp-fv,gp=gap/fv*100,t=[];if(F.live)t.push(`Live <b>${cpF(x.ltp,2)}</b>`);if(F.gap)t.push(`Gap <b class="${gap>=0?'up':'dn'}">${cpS(gap,2)} (${cpS(gp,2)}%)</b>`);if(t.length)lv=`<div class="cpm">${t.join(' · ')}</div>`}
 return `<div class="cpl">${hd}${bits.length?`<div class="cpm">${bits.join('')}</div>`:''}${lv}</div><div class="cpr">${F.favg?`<div class="cpp">${cpF(fv,2)}</div><div class="cpc">F.Avg</div>`:''}</div>`}
const cpAt=(K,nm,lots,st,c,m)=>`<div class="item cpcard ${c}${m?' min':''}" data-lt="${escA(K)}" data-nm="${escA(nm)}" data-lots="${cpLotsStr(lots)}" style="${st}--cpa:${cpAcc()};">`;
function cpFutCard(k,nm,st,lots){const K=String(k).trim().toUpperCase();return cpAt(K,nm,lots,st,'fut',cpFu().min)+cpFutIn(nm,lots,cpLive().get(K))+'</div>'}
function cpDlyCard(k,nm,st,lots){const K=String(k).trim().toUpperCase();return cpAt(K,nm,lots,st,'dly',cpD().min)+cpDailyIn(nm,lots,cpLive().get(K))+'</div>'}
function cpRefreshLive(){if(document.hidden)return;const m=cpLive();document.querySelectorAll('#list .cpcard[data-lt]').forEach(el=>{const L=cpLotsParse(el.dataset.lots),x=m.get(el.dataset.lt),h=el.classList.contains('fut')?cpFutIn(el.dataset.nm,L,x):cpDailyIn(el.dataset.nm,L,x);if(el.innerHTML!==h)el.innerHTML=h})}
window.addEventListener('ltdata',cpRefreshLive);setInterval(cpRefreshLive,4000);
function cpFit(){requestAnimationFrame(()=>{document.querySelectorAll('#list .dsx .ln').forEach(n=>{n.style.zoom='';const L=n.closest('.L');if(!L)return;const av=L.clientWidth,nd=n.scrollWidth;if(av>0&&nd>av)n.style.zoom=String(Math.max(.6,av/nd-.01))})})}
window.addEventListener('resize',cpFit);
function dxLab(k,l,ty){l=l==null?'':String(l);if(k==='rowAmt'||k==='rowAvg'){const b=l.replace(/^T\./i,'');return ty==='b'?'BT.'+b:ty==='s'?'ST.'+b:b}return l}
function cpSyncUI(){const D=cpD(),U=cpFu(),$$=id=>document.getElementById(id);if(!$$('cpDf'))return;
 const cb=(a,t,k,on)=>`<label><input type="checkbox" data-${t}="${k}"${on?' checked':''}> ${a}</label>`;
 $$('cpDf').innerHTML=CPDF.map(x=>cb(x[1],'cpd',x[0],D.f[x[0]])).join('');
 $$('cpFf').innerHTML=CPFF.map(x=>cb(x[1],'cpf',x[0],U.f[x[0]])).join('');
 $$('cpDon').value=D.on?'1':'0';$$('cpFon').value=U.on?'1':'0';$$('cpDmin').value=D.min?'1':'0';$$('cpFmin').value=U.min?'1':'0';
 $$('cpFb').value=U.base;$$('cpFs').value=U.step;$$('cpFe').value=U.every;$$('cpCol').value=cpAcc()}
function cpWire(){const $$=id=>document.getElementById(id);if(!$$('cpDf'))return;
 const ch=()=>{saveDesign();if(rows.length)render()};
 $$('cpDf').addEventListener('change',e=>{const k=e.target.dataset.cpd;if(!k)return;cpD().f[k]=e.target.checked?1:0;ch()});
 $$('cpFf').addEventListener('change',e=>{const k=e.target.dataset.cpf;if(!k)return;cpFu().f[k]=e.target.checked?1:0;ch()});
 $$('cpDon').onchange=()=>{cpD().on=+$$('cpDon').value;ch()};$$('cpFon').onchange=()=>{cpFu().on=+$$('cpFon').value;ch()};
 $$('cpDmin').onchange=()=>{cpD().min=+$$('cpDmin').value;ch()};$$('cpFmin').onchange=()=>{cpFu().min=+$$('cpFmin').value;ch()};
 $$('cpCol').oninput=()=>{design.cpa=$$('cpCol').value;ch()};$$('cpColR').onclick=()=>{delete design.cpa;cpSyncUI();ch()};
 [['cpFb','base',0],['cpFs','step',0],['cpFe','every',1]].forEach(([id,k,mn])=>{$$(id).oninput=()=>{const v=parseFloat($$(id).value);if(isNaN(v)||v<mn)return;cpFu()[k]=v;ch()}});
 $$('cshowS').addEventListener('change',e=>{const k=e.target&&e.target.dataset&&e.target.dataset.sk;if(!k)return;design.show=design.show||{};design.show[k]=e.target.checked;saveDesign();if(rows.length)render()});
 $$('list').addEventListener('click',e=>{const cc=e.target.closest('.cpcard.min');if(!cc||e.target.closest('button'))return;const now=Date.now(),k=cc.dataset.lt+'|'+(cc.classList.contains('dly')?'dly':'fut');
  if(window.__cpT&&window.__cpT.k===k&&now-window.__cpT.t<420){window.__cpT=null;e.stopPropagation();e.preventDefault();(cc.classList.contains('dly')?cpD():cpFu()).on=0;saveDesign();cpSyncUI();render()}else window.__cpT={k,t:now}},true);
 $$('list').addEventListener('click',e=>{const b=e.target.closest('.cpcard button');if(!b)return;e.stopPropagation();e.preventDefault();
  if(b.dataset.cpmin){const o=b.dataset.cpmin==='dly'?cpD():cpFu();o.min=o.min?0:1;saveDesign();cpSyncUI();render()}
  else if(b.dataset.cpref){try{window.__ltRefresh&&window.__ltRefresh()}catch(er){}}},true);
 try{let lw=0;new ResizeObserver(()=>{const w=$$('list').clientWidth;if(w!==lw){lw=w;cpFit()}}).observe($$('list'))}catch(e){}
 if(!localStorage.getItem('ds_lt_cache'))setTimeout(()=>{try{window.__ltRefresh&&window.__ltRefresh()}catch(e){}},2500);
 cpSyncUI()}

const DXG=[
 ['Fields',[['F']]],
 ['Size and spacing',[['s','nameSize','Name size',8,28],['s','labelSize','Label text size',7,16],['s','numSize','Number size',7,22],['s','priceSize','Price text size',8,32],['s','pv','Price box height',0,16],['s','colW','Price box width',40,160],['s','boxSize','T.AMT/T.AVG box text size',6,18],['s','lineGap','Line gap',0,14],['s','labelGap','Label gap',0,10],['s','pad','Card padding',2,20],['s','radius','Corner radius',0,24],['s','tagY','Buy/Sell tag up / down',-8,8]]],
 ['Colors',[['w','buyC','Buy price'],['w','sellC','Sell price'],['k','cName','Name'],['k','cLabel','Label'],['k','cNum','Number'],['k','cBuy','Buy card'],['k','cSell','Sell card'],['k','cBox','Pill / box'],['k','cGp','Gain +'],['k','cGn','Gain −']]]
];
let dxOpen=1;
function dxOptsH(a,v){return a.map(x=>`<option value="${x[0]}"${x[0]===v?' selected':''}>${x[1]}</option>`).join('')}
function dxFrow(id,sh,lab,slot,br,val,del){return`<div class="dxfr"><input type="checkbox" data-f="${id}" data-p="show"${sh?' checked':''}><input class="dxli" data-f="${id}" data-p="lab" value="${escA(lab)}">${val!==null?`<input class="dxli" data-f="${id}" data-p="val" value="${escA(val)}">`:''}<select data-f="${id}" data-p="slot">${dxOptsH(DXSL,slot)}</select><label><input type="checkbox" data-f="${id}" data-p="br"${br?' checked':''}>↵</label>${del?`<button type="button" data-del="${id.slice(1)}">×</button>`:''}</div>`}
function renderDsOpts(){
  const box=$('dsOpts'),fb=$('dsFlds');if(!box)return;const on=dxIdx(design.lay)>=0&&design.dx;box.style.display=on?'block':'none';if(fb)fb.style.display=on?'block':'none';if(!on){box.innerHTML='';if(fb)fb.innerHTML='';return}
  const S=design.dx;let h='',fh='';
  DXG.forEach((g,i)=>{const F=i===0&&fb;let h0=h;h='';if(!F)h+=`<button type="button" class="dxgh" data-g="${i}">${g[0]} ▸</button>`;h+=`<div class="dxgb${F||i===dxOpen?' open':''}" data-gi="${i}">`;
    g[1].forEach(o=>{const k=o[1];
      if(o[0]==='F'){h+='<div class="dxnote">✓ show · label · where · ↵ new line</div>';Object.keys(S.f).forEach(k2=>{const x=S.f[k2];h+=dxFrow(k2,x[1],S.lab[k2],x[0],x[2],null,0)});(S.cu||[]).forEach((c,j)=>{h+=dxFrow('c'+j,c.show,c.lab,c.slot,c.br,c.val,1)});
        h+=`<div class="dxfr"><b>Add</b><input id="dxNl" class="dxli" placeholder="Label"><input id="dxNv" class="dxli" placeholder="Text / number"><select id="dxNs">${dxOptsH(DXSL,'l')}</select><button type="button" id="dxNa">Add</button></div>`}
      if(o[0]==='s'){const v=S[k];h+=`<div class="dxct"><label>${o[2]}</label><input type="range" step="0.5" data-k="${k}" min="${o[3]}" max="${o[4]}" value="${v}"><em>${v}</em></div>`}
      if(o[0]==='w'){const v=S[k];h+=`<div class="dxct"><label>${o[2]}</label><div class="dxsw">${DXSW.map(c=>`<i data-w="${k}" data-c="${c}" style="background:${c}" class="${c===v?'on':''}"></i>`).join('')}</div></div>`}
      if(o[0]==='k'){const v=S[k];h+=`<div class="dxct"><label>${o[2]}</label><input type="color" data-k="${k}" value="${v||'#888888'}"><button type="button" data-kr="${k}">×</button></div>`}
      if(o[0]==='r'){const v=design[k]||o[4];h+=`<div class="dxct"><label>${o[2]}</label><select data-r="${k}">${dxOptsH(o[3],v)}</select></div>`}});
    h+='</div>';if(F){fh=h;h=h0}else h=h0+h});
  box.innerHTML=h;if(fb)fb.innerHTML=fh}
let _dxR=0,_dxT=0;
function dxSave(){clearTimeout(_dxT);_dxT=setTimeout(saveDesign,300);if(_dxR)return;_dxR=requestAnimationFrame(()=>{_dxR=0;if(rows.length)render()})}
function dxWire(){['dsOpts','dsFlds'].forEach(dxWire1)}
function dxWire1(id){const o=$(id);if(!o)return;
  o.addEventListener('click',e=>{const t=e.target,S=design.dx;if(!S)return;
    if(t.dataset.g!==undefined){const i=+t.dataset.g;dxOpen=(dxOpen===i)?-1:i;o.querySelectorAll('.dxgb').forEach(x=>x.classList.toggle('open',+x.dataset.gi===dxOpen));return}
    if(t.dataset.w){S[t.dataset.w]=t.dataset.c;t.parentNode.querySelectorAll('i').forEach(x=>x.classList.toggle('on',x===t));dxSave();return}
    if(t.dataset.kr){S[t.dataset.kr]='';renderDsOpts();dxSave();return}
    if(t.dataset.del!==undefined){S.cu.splice(+t.dataset.del,1);renderDsOpts();dxSave();return}
    if(t.id==='dxNa'){const l=$('dxNl').value.trim(),v=$('dxNv').value.trim();if(!l&&!v)return;S.cu=S.cu||[];S.cu.push({lab:l,val:v,slot:$('dxNs').value,show:1,br:0});renderDsOpts();dxSave()}});
  o.addEventListener('input',e=>{const t=e.target,S=design.dx;if(!S)return;const f=t.dataset.f,k=t.dataset.k,v=t.type==='checkbox'?(t.checked?1:0):t.value;
    if(f){const p=t.dataset.p;if(f[0]==='c'&&S.cu[+f.slice(1)])S.cu[+f.slice(1)][p]=v;else if(p==='lab')S.lab[f]=v;else S.f[f][{slot:0,show:1,br:2}[p]]=v;dxSave();return}
    if(t.dataset.r){design[t.dataset.r]=t.value;saveDesign();if(rows.length)refresh();return}
    if(!k)return;S[k]=t.type==='range'?+v:v;if(t.type==='range')t.nextSibling.textContent=v;dxSave()});
}

function gnPer(){const s=$('gPer');if(!s)return;const m=window.__gM||[];const v=design.gPer||'latest';
  s.innerHTML='<option value="latest">Latest month</option><option value="all">All</option>'+m.filter(x=>x!=='0000-00').map(x=>{const n=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+x.slice(5)-1]+' '+x.slice(0,4);return`<option value="${x}">${n}</option>`}).join('');
  s.value=[...s.options].some(o=>o.value===v)?v:'latest'}
function renderGn(){if(!$('gPin'))return;
  $('gPin').value=design.gPin==='off'?'off':'on';$('gOn').value=design.gOn==='off'?'off':'on';$('gBy').value=design.gBy==='date'?'date':'month';
  $('gTot').value=design.gTot==='off'?'off':'on';$('gM').value=design.gainM||'low';$('gSA').value=design.sellAt||'price';$('gOrd').value=design.cOrd==='new'?'new':'old';
  gnPer();document.body.classList.toggle('tbpin',design.gPin!=='off')}
function gnWire(){
  const set=(id,key,re)=>{const e=$(id);if(!e)return;e.onchange=()=>{design[key]=e.value;saveDesign();if(id==='gPin')document.body.classList.toggle('tbpin',e.value!=='off');else if(rows.length){id==='gOrd'?refresh():render()}}};
  set('gPin','gPin');set('gOn','gOn');set('gBy','gBy');set('gPer','gPer');set('gTot','gTot');set('gM','gainM');set('gSA','sellAt');set('gOrd','cOrd');
  $('list').addEventListener('click',e=>{const m=e.target.closest('[data-gmin]');const t=e.target.closest('[data-gtog]');if(!m&&!t)return;e.stopImmediatePropagation();e.preventDefault();if(t)design.gPer=(design.gPer==='all')?'latest':'all';else design.gMin=(design.gMin===false);saveDesign();render();try{renderGn()}catch(_){}},true);
}
function gnToast(m){let t=$('gnToast');if(!t){t=document.createElement('div');t.id='gnToast';document.body.appendChild(t)}t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>{t.style.display='none'},2600)}
