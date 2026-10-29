function applyDesign(){
  if(design.sellV!==2){design.sellV=2;design.sellAt='price';try{saveDesign()}catch(e){}}
  if(design.tmodeV!==2){design.tmodeV=2;if(design.tmode==='buy')design.tmode='net';try{saveDesign()}catch(e){}}
  {const MG={stack:"ds",compact:"cr",tile:"ti",ledger:"ds",strip:"ds",broker:"br"};if(MG[design.lay])design.lay=MG[design.lay]}
  if(!design.fcols)design.fcols=5;if(design.fcV!==3){design.fcV=3;design.fcols=5;try{saveDesign()}catch(e){}}if(!design.font)design.font='auto';if(!design.lay)design.lay='classic';
  if(!design.fst)design.fst='pill';if(!design.pgs)design.pgs='mini';if(!design.sOn)design.sOn='on';$('pager').classList.toggle('mini',design.pgs==='mini');$('res').classList.toggle('fpill',design.fst==='pill');
  $('res').style.setProperty('--fc',String(design.fcols));
  $('list').className=[design.size==='s'?'fs-s':'',design.size==='l'?'fs-l':'',design.corner==='square'?'sq':'',design.shadow==='off'?'ns':'','st'+(design.style||1),design.lay&&design.lay!=='classic'&&design.lay!=='port'?'ly-'+design.lay:'',design.font&&design.font!=='auto'?'ft-'+design.font:''].filter(Boolean).join(' ');
  [['dCard','card'],['dPrice','price'],['dSum','sum'],['dSize','size'],['dCorner','corner'],['dShadow','shadow'],['dTpos','tpos'],['sOn','sOn'],['dBuy','buy'],['dGcol','gcol'],['dFc','fcols'],['dFst','fst'],['dPgs','pgs'],['dLay','lay'],['dFont','font'],['dTot','tot'],['dTotm','tmode'],['dQlbl','qlbl'],['dPer','per'],['dPager','pager']].forEach(([id,k])=>{$(id).value=design[k]});
  PER=design.per==='all'?1e9:(+design.per||20);
  try{dxEnsure();renderDsOpts();renderGn()}catch(e){console.error(e)}
}
const PAL=[{n:'Mint',h:150},{n:'Green',h:120},{n:'Lime',h:75},{n:'Yellow',h:50},{n:'Orange',h:28},{n:'Red',h:5},{n:'Pink',h:335},{n:'Purple',h:285},{n:'Violet',h:255},{n:'Blue',h:215},{n:'Sky',h:195},{n:'Teal',h:172}];
const STYLES=['Classic','Flat','Outline','Accent bar','Soft gradient','Bold fill','Dark','Minimal line','Ticket','Neon','Portfolio','Pastel paper'];
const swc=h=>`hsl(${h},70%,78%)`;
const nameKeyG=r=>String(r[map.n]).trim().toUpperCase();
function renderShowUI(){
  const g=(t,ks)=>`<div class="sec">${t}</div>`+ks.map(k=>`<label><input type="checkbox" data-sk="${k}"${sh(k)?' checked':''}> ${SHL[k]}</label>`).join('');
  $('cshow').innerHTML=g('Single cards',['t_date','t_qty','t_price','t_ramt','t_ravg','t_rlbl','t_totlbl','t_tag','t_extra','t_val','t_vsl']);if($('cshowS'))$('cshowS').innerHTML=g('Total / Average card',['s_cost','s_avg','s_qty','s_mkt','s_pl','s_plp','s_last','s_chg','s_bq','s_sq','s_bv','s_sv','s_cnt','s_first','s_lastd','s_min','s_max']);try{cpSyncUI()}catch(e){}
}
function renderDesignUI(){
  renderShowUI();
  const h0=design.all!=null?PAL[design.all].h:215;
  try{skUI()}catch(e){console.error(e)}
  $('cpal').innerHTML=PAL.map((c,i)=>`<button class="sw${design.all===i?' on':''}" data-i="${i}" title="${c.n}" style="background:${swc(c.h)}"></button>`).join('');
  const names=[],seen=new Set();
  if(map.n>=0)baseRows.forEach(r=>{const k=nameKeyG(r);if(!seen.has(k)){seen.add(k);names.push([k,cell(r,map.n)])}});
  $('cnames').innerHTML=names.map(([k,l])=>{const v=design.names[k];return `<div class="cn"><span class="cnl" title="${escA(l)}">${esc(l)}</span><select data-k="${escA(k)}"><option value="">Auto</option>${PAL.map((c,i)=>`<option value="${i}"${v===i?' selected':''}>${c.n}</option>`).join('')}</select><span class="dot" style="background:${v!==undefined?swc(PAL[v].h):'#ddd'}"></span></div>`}).join('')||'<div class="mut">No cards yet</div>';
}
function designChanged(){saveDesign();applyDesign();renderDesignUI();if(rows.length)render()}
const THD={tx_con:false,tx_c:'#111111',tx_bgon:false,tx_bg:'#fff3b0',dt_bgon:false,dt_bg:'#fff3b0',nm_bgon:false,nm_bg:'#fff3b0',lbl_bgon:false,lbl_bg:'#fff3b0',q_bgon:false,q_bg:'#fff3b0',fam:'',dt_s:100,dt_w:'',dt_con:false,dt_c:'#475569',nm_s:100,nm_w:'',nm_con:false,nm_c:'#0f172a',lbl_s:100,lbl_w:'',lbl_con:false,lbl_c:'#475569',q_s:100,q_w:'',q_con:false,q_c:'#0f172a',pr_s:100,pr_w:'',pr_con:false,pr_c:'#0f172a',bg_con:false,bg_c:'#bfdbfe',bg_tint:88,bg_tone:0,bg_shade:0,bd_w:1,bd_con:false,bd_c:'#94a3b8',rad:12,pad:3,gap:5,sh_on:false,sh_y:2,sh_b:4,sh_o:12,sh_c:'#000000',pr_bgon:false,pr_bg:'#d5f7e8',pr_rad:12,s_bgon:false,s_bg:'#ffffff',s_con:false,s_c:'#0b1730',s_bdon:false,s_bd:'#cfe0ff',s_rad:14,s_nms:100,s_nmw:'',s_dts:100,s_qs:100,s_ps:100,s_prbgon:false,s_prbg:'#e4edff',s_prcon:false,s_prc:'#1b2fd0',s_sh:false,s_shb:14,s_sho:14,f_rad:10,f_lblS:100,f_lblW:'',f_lblcon:false,f_lblc:'#334155',f_selS:100,f_one:false,f_c:'#2563eb',f_alpha:12,f_sh:false,f_shb:8,f_sho:15,prb_h:0,prb_w:0,prb_s:100};
let TH=Object.assign({},THD);
const TKEY='ds_theme_v1';
const FAM={sys:'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',poppins:"'Poppins',system-ui,sans-serif",serif:'Georgia,"Times New Roman",serif',mono:'ui-monospace,Menlo,Consolas,"Courier New",monospace',round:'"Trebuchet MS","Segoe UI",system-ui,sans-serif',cond:'"Arial Narrow","Roboto Condensed",Impact,sans-serif'};
const hexRgb=x=>{x=String(x).replace('#','');if(x.length===3)x=x.split('').map(c=>c+c).join('');return[parseInt(x.slice(0,2),16)||0,parseInt(x.slice(2,4),16)||0,parseInt(x.slice(4,6),16)||0]};
const hslRgb=(h,s,l)=>{s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return[f(0),f(8),f(4)].map(v=>Math.round(v*255))};
const mixRgb=(a,b,p)=>a.map((v,i)=>Math.round(v*(1-p)+b[i]*p));
const rgbStr=a=>`rgb(${a[0]},${a[1]},${a[2]})`;
function cardBg(h){let c=TH.bg_con?hexRgb(TH.bg_c):hslRgb(h,80,55);c=mixRgb(c,[128,128,128],TH.bg_tone/100);c=mixRgb(c,[0,0,0],TH.bg_shade/100);return mixRgb(c,[255,255,255],TH.bg_tint/100)}
function themeCss(){
  const css=[],T=TH;
  if(T.fam)css.push(`#list .item{font-family:${FAM[T.fam]||'inherit'}}`);
  const base={dt:'clamp(.62rem,2.2vw,.8rem)',nm:'clamp(.8rem,3vw,1rem)',lbl:'clamp(.65rem,2.4vw,.85rem)',q:'clamp(.8rem,3vw,1rem)',pr:'clamp(.85rem,3.4vw,1.05rem)'};
  const BX='border-radius:7px;padding:1px 7px;width:fit-content;max-width:100%';
  if(T.tx_con)css.push(`#list .item :is(.dt,.nm,.lbl,.q,.pfk,.pfk b,.pfp){color:${T.tx_c}}`);
  if(T.tx_bgon)css.push(`#list .item :is(.dt,.nm,.lbl,.q){background:${T.tx_bg};${BX}}`);
  css.push(`#list .item .mid :is(.lbl,.q){margin-left:auto;margin-right:auto}`);
  Object.keys(base).forEach(e=>{
    if(e!=='pr'&&T[e+'_bgon'])css.push(`#list .item .${e}{background:${T[e+'_bg']};${BX}}`);
    const p=[];
    {const sc=(T[e+'_s']/100)*(e==='pr'?T.prb_s/100:1);if(sc!==1)p.push(`font-size:calc(${base[e]}*${sc})`)}
    if(T[e+'_w'])p.push(`font-weight:${T[e+'_w']}`);
    if(T[e+'_con'])p.push(`color:${T[e+'_c']}`);
    if(p.length)css.push(`#list .item .${e}{${p.join(';')}}`);
  });
  if(T.pr_bgon)css.push(`#list .item .pr{background:${T.pr_bg}}`);
  if(T.pr_rad!==12)css.push(`#list .item .pr{border-radius:${T.pr_rad}px}`);
  if(T.prb_s!==100){const k=T.prb_s/100;css.push(`#list .item:not(.sum) .pr{padding:calc(clamp(4px,1.2vw,6px)*${k}) calc(6px*${k})}`);css.push(`#list .item.sum .prs .pr{padding:calc(3px*${k}) calc(6px*${k})}`)}
  if(T.prb_h>0)css.push(`#list .item:not(.sum) .pr{height:${T.prb_h}px;padding-top:0;padding-bottom:0;display:flex;align-items:center;justify-content:center}`);
  if(T.prb_w>0)css.push(`#list{--prw:${T.prb_w}px}`);
  else if(T.prb_s!==100){css.push(`#list{--prw:${Math.round(88*T.prb_s/100)}px}`);css.push(`@media (max-width:420px){#list{--prw:${Math.round(76*T.prb_s/100)}px}}`)}
  const cp=[];
  if(T.bd_w!==1||T.bd_con){cp.push(`border-width:${T.bd_w}px;border-style:solid`);if(T.bd_con)cp.push(`border-color:${T.bd_c}`)}
  if(T.rad!==12)cp.push(`border-radius:${T.rad}px`);
  if(T.pad!==3)cp.push(`padding:${T.pad}px 10px`);
  if(cp.length)css.push(`#list .item:not(.sum){${cp.join(';')}}`);
  if(T.gap!==5)css.push(`#list .item{margin-bottom:${T.gap}px}`);
  if(T.sh_on)css.push(`#list .item{box-shadow:0 ${T.sh_y}px ${T.sh_b}px rgba(${hexRgb(T.sh_c).join(',')},${T.sh_o/100})}`);
  if(T.f_rad!==10)css.push(`#res .mcols label,#res #dbox{border-radius:${T.f_rad}px}`);
  const lp=[];
  if(T.f_lblS!==100)lp.push(`font-size:calc(.7rem*${T.f_lblS/100})`);
  if(T.f_lblW)lp.push(`font-weight:${T.f_lblW}`);
  if(T.f_lblcon)lp.push(`color:${T.f_lblc}`);
  if(lp.length)css.push(`#res .mcols label{${lp.join(';')}}`);
  if(T.f_selS!==100)css.push(`#res .mcols select{font-size:calc(.75rem*${T.f_selS/100})}`);
  if(T.f_one)css.push(`#res .mcols label{--c:${hexRgb(T.f_c).join(',')}}`);
  if(T.f_alpha!==12)css.push(`#res .mcols label{background:rgba(var(--c),${T.f_alpha/100})}`);
  if(T.f_sh)css.push(`#res .mcols label,#res #dbox{box-shadow:0 2px ${T.f_shb}px rgba(0,0,0,${T.f_sho/100})}`);
  const sp=[];
  if(T.s_bgon)sp.push(`background:${T.s_bg}`);
  if(T.s_con)sp.push(`color:${T.s_c}`);
  if(T.s_bdon)sp.push(`border:1px solid ${T.s_bd}`);
  if(T.s_rad!==14)sp.push(`border-radius:${T.s_rad}px`);
  if(T.s_sh)sp.push(`box-shadow:0 4px ${T.s_shb}px rgba(0,0,0,${T.s_sho/100})`);
  if(sp.length)css.push(`#list .item.sum{${sp.join(';')}}`);
  if(T.s_con)css.push(`#list .item.sum .dt,#list .item.sum .lbl,#list .item.sum .nm,#list .item.sum .q{color:${T.s_c}}`);
  if(T.s_dts!==100)css.push(`#list .item.sum .dt,#list .item.sum .lbl{font-size:calc(.75rem*${T.s_dts/100})}`);
  if(T.s_nms!==100)css.push(`#list .item.sum .nm{font-size:calc(clamp(.8rem,3vw,1rem)*${T.s_nms/100})}`);
  if(T.s_nmw)css.push(`#list .item.sum .nm{font-weight:${T.s_nmw}}`);
  if(T.s_qs!==100)css.push(`#list .item.sum .q{font-size:calc(clamp(.8rem,3vw,1rem)*${T.s_qs/100})}`);
  if(T.s_ps!==100)css.push(`#list .item.sum .pr{font-size:calc(clamp(.85rem,3.4vw,1.05rem)*${(T.s_ps/100)*(T.pr_s/100)*(T.prb_s/100)})}`);
  if(T.s_prbgon)css.push(`#list .item.sum .pr{background:${T.s_prbg}}`);
  if(T.s_prcon)css.push(`#list .item.sum .pr{color:${T.s_prc}}`);
  return css.join('\n');
}
function applyTheme(){
  let st=document.getElementById('themeCss');
  if(!st){st=document.createElement('style');st.id='themeCss';document.head.appendChild(st)}
  st.textContent=themeCss();
}
function saveTheme(){try{localStorage.setItem(TKEY,JSON.stringify(TH))}catch(e){}}
let thRaf=0;
function thChanged(){saveTheme();applyTheme();if(thRaf)cancelAnimationFrame(thRaf);thRaf=requestAnimationFrame(()=>{thRaf=0;if(rows.length)render()})}
function renderAdv(){
  const S=(k,l,min,max,step,u)=>`<label class="ctl"><span style="min-width:100px">${l}</span><input type="range" min="${min}" max="${max}" step="${step||1}" value="${TH[k]}" data-k="${k}" data-u="${u||''}"><span class="val">${TH[k]}${u||''}</span></label>`;
  const R=(k,l,o)=>`<div class="ctl"><span style="min-width:100px">${l}</span><div class="rg">${o.map(([v,t])=>`<label><input type="radio" name="th_${k}" value="${v}" data-k="${k}"${String(TH[k])===String(v)?' checked':''}>${t}</label>`).join('')}</div></div>`;
  const K=(k,l)=>`<label class="ctl"><input type="checkbox" data-k="${k}"${TH[k]?' checked':''}> ${l}</label>`;
  const P=(k,l)=>`<label class="ctl"><span style="min-width:100px">${l}</span><input type="color" data-k="${k}" value="${TH[k]}"></label>`;
  const G=(t,b)=>`<details><summary>${t}</summary>${b}</details>`;
  const W=[['','Auto'],['300','Light'],['400','Normal'],['600','Semi'],['700','Bold'],['800','Black']];
  const E=(e,t)=>G(t,S(e+'_s','Size',50,200,5,'%')+R(e+'_w','Weight',W)+K(e+'_con','Use custom color')+P(e+'_c','Color'));
  $('cadv').innerHTML=
    G('Font family',R('fam','Family',[['','Auto'],['sys','System'],['poppins','Poppins'],['serif','Serif'],['mono','Mono'],['round','Rounded'],['cond','Condensed']]))+
    E('dt','Text: Date line')+E('nm','Text: Name')+E('lbl','Text: Quantity label')+E('q','Text: Quantity value')+E('pr','Text: Price')+
    G('Card background',K('bg_con','Use custom color')+P('bg_c','Color')+S('bg_tint','Tint (lighter)',0,100,1,'%')+S('bg_tone','Tone (grayer)',0,100,1,'%')+S('bg_shade','Shade (darker)',0,100,1,'%'))+
    G('Card shape & border',S('bd_w','Border width',0,6,1,'px')+K('bd_con','Use custom border color')+P('bd_c','Border color')+S('rad','Corner radius',0,30,1,'px')+S('pad','Inner padding',0,14,1,'px')+S('gap','Gap between cards',0,24,1,'px'))+
    G('Card shadow',K('sh_on','Custom shadow')+S('sh_y','Offset',0,20,1,'px')+S('sh_b','Blur',0,40,1,'px')+S('sh_o','Opacity',0,60,1,'%')+P('sh_c','Color'))+
    G('Price box',K('pr_bgon','Use custom background')+P('pr_bg','Background')+S('pr_rad','Corner radius',0,30,1,'px'))+
    G('Total / Average card',K('s_bgon','Custom background')+P('s_bg','Background')+K('s_con','Custom text color')+P('s_c','Text color')+K('s_bdon','Custom border')+P('s_bd','Border color')+S('s_rad','Corner radius',0,30,1,'px')+S('s_dts','Small text size',60,200,5,'%')+S('s_nms','Name size',50,200,5,'%')+R('s_nmw','Name weight',W)+S('s_qs','Quantity size',50,200,5,'%')+S('s_ps','Price size',50,200,5,'%')+K('s_prbgon','Custom price box color')+P('s_prbg','Price box')+K('s_prcon','Custom price text color')+P('s_prc','Price text')+K('s_sh','Custom shadow')+S('s_shb','Shadow blur',0,40,1,'px')+S('s_sho','Shadow opacity',0,60,1,'%'))+
    G('Filters',S('f_rad','Box radius',0,24,1,'px')+S('f_lblS','Label size',60,180,5,'%')+R('f_lblW','Label weight',W)+K('f_lblcon','Custom label color')+P('f_lblc','Label color')+S('f_selS','Dropdown text size',60,180,5,'%')+K('f_one','One color for all boxes')+P('f_c','Box color')+S('f_alpha','Box tint',0,40,1,'%')+K('f_sh','Box shadow')+S('f_shb','Shadow blur',0,30,1,'px')+S('f_sho','Shadow opacity',0,50,1,'%'))+
    `<div style="margin-top:8px"><button class="alt sm" id="thReset">Reset all customization</button></div>`;
  const TX=(e,t)=>G(t,K(e+'_con','Custom text color')+P(e+'_c','Text color')+K(e+'_bgon','Box behind text')+P(e+'_bg','Box color'));
  $('cquick2').innerHTML=G('All text',K('tx_con','Custom text color')+P('tx_c','Text color')+K('tx_bgon','Box behind text')+P('tx_bg','Box color'))+TX('dt','Date')+TX('nm','Name')+TX('lbl','Quantity / Total label')+TX('q','Quantity / Total value')+TX('pr','Price');
  $('cquick').innerHTML=S('prb_s','Size (bigger / smaller)',40,200,5,'%')+S('prb_h','Height (0 = auto)',0,90,1,'px')+S('prb_w','Width (0 = auto)',0,200,2,'px');
}
const FCOL=['236,72,153','20,184,166','234,179,8','99,102,241','244,63,94','14,165,233','132,204,22','249,115,22'];
const nz=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
function fidx(f){const s=fsrc[f];let ci=s?header.indexOf(s):-1;if(ci<0)ci=header.indexOf('x:'+f);return ci}
function fval(r,f){const ci=fidx(f);return ci>=0?(r[ci]??''):''}
function setFval(row,f,val){const ci=fidx(f);if(ci>=0)setCell(row,ci,val)}
function hkeyNow(){return store.length?store[0].header.join('|'):['Name','Quantity','Price','Date','Type',...fields.filter(f=>!fsrc[f]).map(f=>'x:'+f)].join('|')}
function afterFieldChange(){hkey=hkeyNow();fkey=null;refresh();fillSel()}
function ensureX(name){store.forEach(s=>{if(s.header.indexOf('x:'+name)<0){s.header.push('x:'+name);s.rows.forEach(r=>r.push(''))}})}
function guessSrc(name){
  const n=nz(name);if(n.length<2)return '';
  const used=[map.d,map.n,map.q,map.p,map.t];
  for(let i=0;i<header.length;i++){const h=header[i];if(String(h).startsWith('x:')||used.includes(i))continue;const z=nz(h);if(z.length>=3&&(z.includes(n)||n.includes(z)))return h}
  return '';
}
function collectX(root){const o={};root.querySelectorAll('input[data-xf]').forEach(i=>{if(i.value.trim()!=='')o[i.dataset.xf]=i.value.trim()});return o}
function clearX(root){root.querySelectorAll('input[data-xf]').forEach(i=>{i.value=''})}
function fieldUI(){
  const h=fields.map(f=>`<span class="xf"><input data-xf="${escA(f)}" placeholder="${escA(f)}"><button class="alt" data-xdel="${escA(f)}" title="Delete field">×</button></span>`).join('')+`<span class="xnew"><input data-xnew placeholder="New field"><button class="alt" data-xadd title="Add a new field">+ Field</button></span><button class="alt" data-xall title="Add every other file column as a field">+ File columns</button>`;
  ['axf','cxf'].forEach(id=>{const el=$(id);if(el)el.innerHTML=h});
}
function fillFieldBoxes(){
  const fb=$('fbox');if(!fb)return;
  fb.innerHTML=fields.map((f,k)=>{
    const cur=fsrc[f]&&header.indexOf(fsrc[f])>=0?fsrc[f]:'';
    return `<label style="--c:${FCOL[k%FCOL.length]}">${esc(f)}<select data-fs="${escA(f)}"><option value="">— none (type by hand)</option>${header.filter(h=>!String(h).startsWith('x:')).map(h=>`<option value="${escA(h)}"${h===cur?' selected':''}>${esc(h)}</option>`).join('')}</select></label>`;
  }).join('');
}
function addField(name){
  name=String(name||'').replace(/\s+/g,' ').trim().slice(0,24);
  if(!name||fields.includes(name)){$('msg').textContent=name?'Field already exists.':'Type a field name first.';return}
  $('msg').textContent='';
  const g=store.length?guessSrc(name):'';
  fields.push(name);
  if(g)fsrc[name]=g;else ensureX(name);
  afterFieldChange();
}
function delField(name){
  const k=fields.indexOf(name);if(k<0)return;
  fields.splice(k,1);delete fsrc[name];
  store.forEach(s=>{const i=s.header.indexOf('x:'+name);if(i>=0){s.header.splice(i,1);s.rows.forEach(r=>r.splice(i,1))}});
  manual.forEach(m=>{if(m.x)delete m.x[name]});
  afterFieldChange();
}
/* after an upload: the ledger columns Amount / Comm. / Debit / Credit / Ledger Balance become card fields automatically (delete one with × in Fields) */
const AUTOF=['Amount','Comm.','Debit','Credit','Ledger Balance'];
function autoFields(){
  if(!store.length)return;
  const used=[map.d,map.n,map.q,map.p,map.t];let added=0;
  header.forEach((h,i)=>{if(!AUTOF.includes(h)||used.includes(i)||fields.includes(h))return;fields.push(h);fsrc[h]=h;added++});
  if(added)afterFieldChange();
}
function addAllCols(){
  if(!store.length){$('msg').textContent='Upload a file first.';return}
  const used=[map.d,map.n,map.q,map.p,map.t];let added=0;
  header.forEach((h,i)=>{
    if(String(h).startsWith('x:')||used.includes(i))return;
    const label=String(h).replace(/\s*\(.*?\)\s*/g,' ').replace(/[.:]+\s*$/,'').replace(/\s+/g,' ').trim().slice(0,24);
    if(!label||fields.includes(label))return;
    fields.push(label);fsrc[label]=h;added++;
  });
  $('msg').textContent=added?'':'No more columns to add.';
  if(added)afterFieldChange();
}
function fieldEvt(e){
  const a=e.target.closest('button[data-xadd]'),d=e.target.closest('button[data-xdel]'),all=e.target.closest('button[data-xall]');
  if(a){const inp=a.parentElement.querySelector('input[data-xnew]');addField(inp?inp.value:'')}
  else if(d)delField(d.dataset.xdel);
  else if(all)addAllCols();
}
let presets={};
const PRKEY='ds_presets_v1';
const designDefault=()=>({card:'group',price:'group',sum:'modern',size:'m',corner:'round',shadow:'on',all:null,names:{},style:1,tpos:'top',buy:'mid',gcol:false,fcols:5,fcV:3,lay:'ds',font:'auto',tot:'col',tmode:'net',qlbl:'Quantity',per:'20',pager:'show',show:{}});
function savePresets(){try{localStorage.setItem(PRKEY,JSON.stringify(presets))}catch(e){}}
function renderPresets(){
  const names=Object.keys(presets);
  $('cpre').innerHTML=`<div class="crow"><input id="pName" placeholder="Preset name" style="padding:5px 8px;font-size:.8rem;border:1px solid var(--bd);border-radius:7px;background:var(--card);color:var(--tx);flex:1;min-width:120px"><button class="alt sm" id="pSave">Save current</button></div>`+(names.length?`<div class="plist">${names.map(n=>`<div class="pi"><span title="${escA(n)}">${esc(n)}</span><button class="alt sm" data-pa="${escA(n)}">Apply</button><button class="alt sm" data-pd="${escA(n)}">Delete</button></div>`).join('')}</div>`:'<div class="mut" style="font-size:.75rem;margin-top:4px">No presets saved yet.</div>');
}
function applyPreset(n){
  const p=presets[n];if(!p)return;
  design=Object.assign(designDefault(),JSON.parse(JSON.stringify(p.design||{})));
  TH=Object.assign({},THD,p.TH||{});
  saveDesign();saveTheme();applyDesign();applyTheme();renderDesignUI();renderAdv();
  if(rows.length)render();
}
