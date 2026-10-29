/* Card skins: 35 styles (1-12 classic set, 13-35 new colour/shape skins).
   A style can be applied to Everything, one card type (Content / Average / Daily / Future) or one share.
   design.sk = {t:{c,s,d,f}, sh:{NAME:n}} ; design.style stays the default for Content cards. */
const SKN=STYLES.concat(['Clean Minimal','Soft Mint','Dark Navy','Accent Bar','Round Border','Corner Block','Soft Purple','Color Tag','Dark Outline','Glass','Pill Round','Dark Minimal','Red Bar','Blue Outline','Deep Green','Lavender','Top Line','Dark Green Bar','Soft Yellow','Dark Teal','Midnight Purple','Royal Blue','Sunset Plum']);
let skTarget='all',skShare='';
const SKT=[['all','Everything'],['c','Content'],['s','Average'],['d','Daily'],['f','Future'],['share','Share']];
function skEnsure(){if(!design.sk||typeof design.sk!=='object')design.sk={t:{},sh:{}};if(!design.sk.t)design.sk.t={};if(!design.sk.sh)design.sk.sh={}}
function skShareKey(el){
  if(el.dataset.lt)return String(el.dataset.lt).trim().toUpperCase();
  if(el.dataset.g)return String(el.dataset.g).trim().toUpperCase();
  if(el.dataset.i!==undefined&&map.n>=0){const r=rows[+el.dataset.i];if(r)return nameKeyG(r)}
  return '';
}
function applySkins(){
  skEnsure();const S=design.sk;
  document.querySelectorAll('#list .item').forEach(el=>{
    if(el.classList.contains('ed'))return;
    let n=0;const key=skShareKey(el);
    if(key&&S.sh[key])n=S.sh[key];
    if(!n){const t=el.classList.contains('cpcard')?(el.classList.contains('fut')?'f':'d'):(el.classList.contains('sum')?'s':'c');n=S.t[t]||(t==='c'?(design.style||1):0)}
    el.className=el.className.replace(/\bsk\d+\b/g,'').replace(/\s+/g,' ').trim()+(n?' sk'+n:'');
  });
}
function skCur(){
  skEnsure();const S=design.sk;
  if(skTarget==='all')return design.style||1;
  if(skTarget==='share')return skShare?(S.sh[skShare]||0):-1;
  if(skTarget==='c')return S.t.c||design.style||1;
  return S.t[skTarget]||0;
}
function skUI(){
  const bar=$('skBar'),g=$('sgal');if(!bar||!g)return;
  skEnsure();
  const names=[],seen=new Set();
  if(map.n>=0)baseRows.forEach(r=>{const k=nameKeyG(r);if(!seen.has(k)){seen.add(k);names.push([k,String(cell(r,map.n))])}});
  if(skTarget==='share'&&!names.some(x=>x[0]===skShare))skShare=names.length?names[0][0]:'';
  bar.innerHTML='<div class="sec">Apply style to</div><div class="skt">'+SKT.map(([k,l])=>`<button class="alt sm${skTarget===k?' on':''}" data-sk="${k}">${l}</button>`).join('')+'</div>'+
    (skTarget==='share'?(names.length?`<select id="skSh">${names.map(([k,l])=>`<option value="${escA(k)}"${k===skShare?' selected':''}>${esc(l)}</option>`).join('')}</select>`:'<div class="mut">Add data first to pick a share.</div>'):'')+
    '<div class="sec">Card style</div>';
  const h0=design.all!=null?PAL[design.all].h:215,cur=skCur();
  const tile=(n,nm)=>`<div class="stile${cur===n?' on':''}" data-s="${n}"><div class="stg"><div class="item${n?' sk'+n:''}" style="--h:${h0};--bg:hsl(${h0},85%,96%);--bgh:hsl(${h0},90%,91%);--pr:hsl(${h0},75%,86%)"><div><div class="dt">Date: 13-10-26</div><div class="nm">NAME</div></div><div class="mid"><div class="lbl">Quantity</div><div class="q">5</div></div><div class="pr">4.80</div></div></div><div class="sn">${n?n+'. ':''}${nm}</div></div>`;
  let h=skTarget==='all'?'':tile(0,skTarget==='c'?'Same as Everything':'Default');
  SKN.forEach((nm,i)=>{const n=i+1;if(skTarget==='s'&&n<=12)return;h+=tile(n,nm)});
  g.innerHTML=h;
}
function skPick(n){
  skEnsure();const S=design.sk,t=skTarget;
  if(t==='all'){design.style=n||1;S.t.c=0;['s','d','f'].forEach(k=>{S.t[k]=n>=13?n:0})}
  else if(t==='c'){S.t.c=(n&&n!==design.style)?n:0}
  else if(t==='share'){if(!skShare)return;if(n)S.sh[skShare]=n;else delete S.sh[skShare]}
  else S.t[t]=n;
  designChanged();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('#skBar [data-sk]');if(b){skTarget=b.dataset.sk;skUI();return}
  const t=e.target.closest('#sgal .stile');if(t){skPick(+t.dataset.s)}
});
document.addEventListener('change',e=>{if(e.target.id==='skSh'){skShare=e.target.value;skUI()}});
