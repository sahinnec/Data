function b64(buf){const u=new Uint8Array(buf);let t='';for(let i=0;i<u.length;i+=0x8000)t+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(t)}
function mimeOf(n){return /\.xlsx$/i.test(n)?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':/\.pdf$/i.test(n)?'application/pdf':/\.csv$/i.test(n)?'text/csv':/\.jpe?g$/i.test(n)?'image/jpeg':/\.png$/i.test(n)?'image/png':'application/octet-stream'}
async function save(filename,data){
  try{
    {const sm=window.__shareNext;window.__shareNext=false;if(sm&&window.Android&&window.Android.shareFile){window.Android.shareFile(filename,mimeOf(filename),b64(data));return}}
    if(window.Android&&window.Android.save){window.Android.save(filename,mimeOf(filename),b64(data));return}
    const blob=new Blob([data],{type:mimeOf(filename)});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
  }catch(e){$('msg').textContent='Download হয়নি: '+((e&&e.message)||e)}
}
async function hasDl(){return true}
function overlay(title,node){
  let o=document.getElementById('ov');if(o)o.remove();
  o=document.createElement('div');o.id='ov';
  o.style.cssText='position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.78);overflow:auto;padding:12px;-webkit-overflow-scrolling:touch';
  const bar=document.createElement('div');
  bar.style.cssText='position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:8px;color:#fff;font-size:.85rem;margin-bottom:8px';
  const sp=document.createElement('span');sp.textContent=title;
  const x=document.createElement('button');x.textContent='Close';x.style.padding='4px 12px';x.onclick=()=>o.remove();
  bar.appendChild(sp);bar.appendChild(x);o.appendChild(bar);o.appendChild(node);
  document.body.appendChild(o);return o;
}
function showImg(list){
  const im=document.createElement('img');
  im.style.cssText='width:100%;max-width:760px;background:#fff;display:block;margin:0 auto';
  im.src=cardsCanvas(list).toDataURL('image/png');
  overlay('Press and hold the image to save it',im);
}
function showText(txt){
  const ta=document.createElement('textarea');
  ta.value=txt;ta.readOnly=true;
  ta.style.cssText='width:100%;height:70vh;font-size:.8rem;white-space:pre';
  overlay('Select all and copy',ta);ta.focus();ta.select();
}
function tableTsv(){return [header.map(h=>String(h).replace(/^x:/,'')).join('\t'),...rows.map(r=>header.map((_,i)=>String(r[i]??'').replace(/[\t\r\n]+/g,' ')).join('\t'))].join('\n')}
function csvEsc(v){v=String(v??'');return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function hueOf(r,gi){
  const key=String(r[map.n]).trim().toUpperCase(),ov=design.names[key];
  const hi=ov!==undefined?ov:(design.all!=null?design.all:null);
  return hi!==null?PAL[hi].h:Math.round((gi.get(key)||0)*137.508+150)%360;
}
function cardsCanvas(list){
  const S=2,W=760,pad=14,gap=8;
  const gi=new Map();if(map.n>=0)baseRows.forEach(r=>{const k=String(r[map.n]).trim().toUpperCase();if(!gi.has(k))gi.set(k,gi.size)});
  const xt=r=>fields.map(f=>[f,fval(r,f)]).filter(x=>String(x[1]??'')!=='');
  const hs=list.map(r=>(typeOf(r)?64:58)+(xt(r).length?20:0));
  const total=pad*2+hs.reduce((a,b)=>a+b+gap,0)-gap;
  const cv=document.createElement('canvas');cv.width=W*S;cv.height=Math.max(60,total)*S;
  const c=cv.getContext('2d');c.scale(S,S);
  c.fillStyle='#ffffff';c.fillRect(0,0,W,Math.max(60,total));
  const rr=(x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};
  const ff=FAM[TH.fam]||FAM.sys;
  let y=pad;
  list.forEach((r,i)=>{
    const h=hs[i],hue=hueOf(r,gi);
    const bg=design.card==='group'?rgbStr(cardBg(hue)):'#ffffff';
    rr(pad,y,W-pad*2,h,12);c.fillStyle=bg;c.fill();c.strokeStyle='rgba(0,0,0,0.10)';c.lineWidth=1;c.stroke();
    c.fillStyle='#475569';c.font=`12px ${ff}`;c.textAlign='left';c.textBaseline='alphabetic';
    c.fillText('Date: '+fmtDate(cell(r,map.d)),pad+14,y+22);
    c.fillStyle='#111111';c.font=`600 18px ${ff}`;c.fillText(String(cell(r,map.n)),pad+14,y+44);
    const tyc=typeOf(r);
    if(map.q>=0){
      c.textAlign='center';c.fillStyle='#475569';c.font=`12px ${ff}`;c.fillText('Quantity',390,y+(tyc?19:22));
      c.fillStyle='#111111';c.font=`600 17px ${ff}`;c.fillText(String(cell(r,map.q)),390,y+(tyc?38:44));
    }
    if(tyc){
      const tl=tyc==='b'?'Buy':tyc==='s'?'Sell':'Net',tw=44,ty0=map.q>=0?y+44:y+(h-16)/2;
      rr(390-tw/2,ty0,tw,16,8);c.fillStyle=tyc==='b'?'rgba(22,163,74,.18)':tyc==='s'?'rgba(220,38,38,.16)':'rgba(37,99,235,.15)';c.fill();
      c.fillStyle=tyc==='b'?'#15803d':tyc==='s'?'#b91c1c':'#1d4ed8';c.font=`700 11px ${ff}`;c.textAlign='center';c.fillText(tl,390,ty0+12);
    }
    const px=W-pad-14-110,py=y+10,ph=38;
    const prBg=design.price==='group'?`hsl(${hue},75%,86%)`:design.price==='blue'?'#dbe7ff':'#d5f7e8';
    rr(px,py,110,ph,12);c.fillStyle=prBg;c.fill();
    c.fillStyle=design.price==='blue'?'#1d3fd1':'#111111';c.font=`700 19px ${ff}`;c.textAlign='center';
    c.fillText(String(cell(r,map.p)),px+55,py+26);
    const x2=xt(r);
    if(x2.length){c.textAlign='left';c.fillStyle='#334155';c.font=`12px ${ff}`;c.fillText(x2.map(a=>a[0]+': '+a[1]).join('   '),pad+14,y+h-8)}
    y+=h+gap;
  });
  return cv;
}
async function exportImage(type){
  const R0=rows,TG=window.__selTag;
  if(!(await hasDl())){showImg(R0.slice(0,150));return}
  const mime=type==='png'?'image/png':'image/jpeg',CH=150,total=Math.max(1,Math.ceil(R0.length/CH));
  for(let k=0;k<total;k++){
    const cv=cardsCanvas(R0.slice(k*CH,(k+1)*CH));
    const blob=await new Promise(res=>cv.toBlob(res,mime,0.92));
    const buf=await blob.arrayBuffer();
    window.__selTag=TG;const nm=pfile(type==='png'?'png':'jpg').replace(/(\.\w+)$/,total>1?'-'+(k+1)+'$1':'$1');
    window.__selTag=false;await save(nm,buf);
  }
}
function tablePdf(cols,data){
  const{jsPDF}=window.jspdf;
  const land=cols.length>6;
  const d=new jsPDF({unit:'mm',format:'a4',orientation:land?'landscape':'portrait'});
  const PW=land?297:210,PH=land?210:297,M=10,cw=(PW-M*2)/Math.max(1,cols.length),rh=6;
  const maxc=Math.max(6,Math.floor(cw/1.75));
  let y=M+4;
  const head=()=>{d.setFont('helvetica','bold');d.setFontSize(8);d.setFillColor(230,236,248);d.rect(M,y-4.2,PW-M*2,rh,'F');cols.forEach((c,i)=>d.text(String(c).slice(0,maxc),M+i*cw+1.5,y));y+=rh;d.setFont('helvetica','normal')};
  head();
  data.forEach((r,k)=>{
    if(y>PH-M){d.addPage();y=M+4;head()}
    if(k%2===1){d.setFillColor(247,249,252);d.rect(M,y-4.2,PW-M*2,rh,'F')}
    d.setFontSize(8);
    r.forEach((v,i)=>d.text(String(v??'').slice(0,maxc),M+i*cw+1.5,y));
    y+=rh;
  });
  return d;
}
function buildTablePdf(){
  const cols=['Date','Name',...(map.q>=0?['Quantity']:[]),'Price',...fields];
  return tablePdf(cols,rows.map(r=>[fmtDate(cell(r,map.d)),cell(r,map.n),...(map.q>=0?[cell(r,map.q)]:[]),cell(r,map.p),...fields.map(f=>fval(r,f))].map(v=>String(v??''))));
}
$('xl').onclick=async()=>{await need('xlsx');
  const ws=XLSX.utils.aoa_to_sheet([header.map(h=>String(h).replace(/^x:/,'')),...rows]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Data Show');
  save(pfile('xlsx'),XLSX.write(wb,{bookType:'xlsx',type:'array'}));
};

function buildPdf(){
  const{jsPDF}=window.jspdf;const d=new jsPDF({unit:'mm',format:'a4'});
  const H=3,G=0.3,X=10,W=190;let y=12;
  d.setLineWidth(0.1);
  rows.forEach(r=>{
    if(y+H+0.3>287){d.addPage();y=12}
    d.setFillColor(222,226,234);d.roundedRect(X+0.2,y+0.25,W-0.4,H,1.2,1.2,'F');
    d.setDrawColor(222,227,238);d.setFillColor(255,255,255);d.roundedRect(X,y,W,H,1.2,1.2,'FD');
    d.setTextColor(17,17,17);d.setFont('helvetica','normal');
    d.setFontSize(5);d.text('Date: '+fmtDate(cell(r,map.d)),X+3,y+2.2);
    d.setFontSize(6);d.text(String(cell(r,map.n)).toUpperCase().slice(0,34),X+20,y+2.2);
    if(map.q>=0){d.setFontSize(4);d.text('Quantity',X+90,y+2.2,{align:'right'});
    d.setFontSize(6);d.text(String(cell(r,map.q)),X+92,y+2.2)}
    d.setFillColor(213,247,232);d.roundedRect(X+130,y+0.3,54,H-0.6,1.2,1.2,'F');
    d.setFontSize(7);d.text(String(cell(r,map.p)),X+157,y+2.4,{align:'center'});
    y+=H+G;
  });
  return d;
}
$('pd').onclick=async()=>{await need('jspdf');save(pfile('pdf'),buildPdf().output('arraybuffer'))};
$('mF').onchange=()=>{tf=$('mF').value;sortRows();page=0;render()};
$('files').onchange=e=>{
  const t=e.target;if(!t||t.type!=='date')return;
  const s=store[+t.dataset.k];if(!s)return;
  let dc=dateCol(s);
  if(dc<0){dc=s.header.length;s.header.push('Date');s.rows.forEach(r=>r.push(''))}
  s.rows.forEach(r=>{r[dc]=t.value});
  refresh();
};
$('files').onclick=$('pfiles').onclick=e=>{
  const b=e.target.closest('button[data-a]');if(!b)return;
  if(b.dataset.a==='rm')store.splice(+b.dataset.k,1);else manual=[];
  editIdx=-1;$('msg').textContent='';refresh();
};
document.addEventListener('click',e=>{if(selRow&&!e.composedPath().includes($('list'))){selRow=null;render()}});
