async function loadAll(fs){closeAddMenu(true);for(const f of Array.from(fs))await loadAndStore(f);closeAddMenu(true);docImportReturn=false;if(document.body.classList.contains('files-page'))renderLibrary()}
async function load(f){
  if((f.type||'').startsWith('image/')){$('msg').textContent='ছবি (Screenshot) পড়া এই অ্যাপে নেই, PDF বা Excel দিন।';return}
  const ext=(f.name.split('.').pop()||'').toLowerCase();
  const isPdf=f.type==='application/pdf'||ext==='pdf';
  const isX=['xlsx','xls','xlsm','xlsb','ods','csv'].includes(ext);
  if(!isPdf&&!isX){await loadOther(f,ext);return}
  if(isX){
    $('msg').textContent='পড়া হচ্ছে: '+f.name;
    try{await need('xlsx');
      const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rg=XLSX.utils.decode_range(ws['!ref']||'A1:A1');
      const out=[];
      for(let r=rg.s.r;r<=rg.e.r;r++){
        const row=[];
        for(let c=rg.s.c;c<=rg.e.c;c++){
          const cl=ws[XLSX.utils.encode_cell({r,c})];
          if(!cl)row.push('');
          else if(cl.t==='d')row.push(new Date(cl.v.getTime()+12*3600*1000).toISOString().slice(0,10));
          else if(cl.t==='n')row.push(String(cl.w??cl.v).trim());
          else row.push(String(cl.v).trim());
        }
        if(row.some(x=>x!==''))out.push(row);
      }
      const cnt=out.map(r=>r.filter(x=>x!=='').length);
      const th=Math.max(2,Math.ceil(Math.max(0,...cnt)*0.6));
      addFile(f.name,out.filter((r,i)=>cnt[i]>=th),{size:f.size});
    }catch(err){console.error(err);$('msg').textContent=f.name+': Excel পড়া যায়নি।'}
    return;
  }
  $('msg').textContent='পড়া হচ্ছে: '+f.name;
  try{
    const pdf=await (await need('pdf'),pdfjsLib).getDocument({data:await f.arrayBuffer()}).promise;
    let all=[],raw=[];
    for(let p=1;p<=pdf.numPages;p++){
      const tc=await(await pdf.getPage(p)).getTextContent();
      all=all.concat(fixRows(cardRows(tc.items)||toRows(tc.items)));
      toRows(tc.items).forEach(r=>{r=r.map(x=>String(x).replace(/\s+/g,' ').trim()).filter(Boolean);if(r.length)raw.push(r)});
    }
    /* broker portfolio statement (LankaBangla / First Capital / Midway): replaces the saved portfolio opening, never adds a second copy */
    let st=null;try{st=window.__stmtOpen&&window.__stmtOpen(raw)}catch(e){console.error(e)}
    if(st){$('msg').textContent=st.note||'';return}
    addFile(f.name,all,{size:f.size,pdf:true});
  }catch(err){console.error(err);$('msg').textContent=f.name+': পড়া যায়নি (scanned/image PDF হলে text পাওয়া যাবে না)।'}
}

function splitDelim(l,d){
  const out=[];let cur='',q=false;
  for(let i=0;i<l.length;i++){const c=l[i];
    if(c==='"'){if(q&&l[i+1]==='"'){cur+='"';i++}else q=!q}
    else if(c===d&&!q){out.push(cur.trim());cur=''}
    else cur+=c}
  out.push(cur.trim());return out;
}
function textRows(text){
  const lines=String(text).replace(/\u00a0/g,' ').split(/\r?\n/).filter(l=>l.trim()!=='');
  const smp=lines.slice(0,40);
  let del=null;
  for(const d of ['\t','|',';',',']){const c=smp.filter(l=>l.includes(d)).length;if(c>=Math.max(2,smp.length*0.6)){del=d;break}}
  return lines.map(l=>{
    let r=del?splitDelim(l,del):l.trim().split(/\s{2,}/).map(x=>x.trim());
    if(r.length===1){const m=r[0].match(/^(.*\S)\s+(-?[\d,]*\.?\d+)$/);if(m)r=[m[1],m[2]]}
    return r;
  });
}
function jsonRows(text){
  let j=JSON.parse(text);
  if(!Array.isArray(j)){const a=Object.values(j).find(Array.isArray);j=a||[j]}
  if(j.length&&j[0]&&typeof j[0]==='object'&&!Array.isArray(j[0])){
    const keys=[];j.forEach(o=>Object.keys(o||{}).forEach(k=>{if(!keys.includes(k))keys.push(k)}));
    return [keys,...j.map(o=>keys.map(k=>{const v=o?o[k]:undefined;return v===undefined||v===null?'':(typeof v==='object'?JSON.stringify(v):String(v))}))];
  }
  return j.map(r=>Array.isArray(r)?r.map(x=>String(x??'')):[String(r)]);
}
function htmlRows(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const trs=[...doc.querySelectorAll('tr')];
  if(trs.length){
    return trs.map(tr=>[...tr.children].filter(c=>/^(TD|TH)$/i.test(c.tagName)).map(c=>c.textContent.replace(/\s+/g,' ').trim())).filter(r=>r.some(x=>x!==''));
  }
  return textRows((doc.body&&(doc.body.innerText||doc.body.textContent))||'');
}
async function docxRows(ab){
  await need('zip');
  const zip=await JSZip.loadAsync(ab);
  const fl=zip.file('word/document.xml');if(!fl)throw new Error('not a .docx file');
  const doc=new DOMParser().parseFromString(await fl.async('string'),'application/xml');
  const gt=n=>{let o='';const w=x=>{for(const c of x.childNodes){if(c.nodeType!==1)continue;const ln=c.localName;if(ln==='t')o+=c.textContent;else if(ln==='tab')o+='\t';else if(ln==='br'||ln==='cr')o+='\n';else w(c)}};w(n);return o};
  const body=doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','body')[0];
  const out=[];
  if(!body)return out;
  for(const el of body.childNodes){
    if(el.nodeType!==1)continue;
    if(el.localName==='p'){
      gt(el).replace(/\u00a0/g,' ').split('\n').forEach(l=>{if(l.trim())out.push(l.includes('\t')?l.split('\t').map(x=>x.trim()):l.trim().split(/\s{2,}/).map(x=>x.trim()))});
    }else if(el.localName==='tbl'){
      for(const tr of el.childNodes){
        if(tr.localName!=='tr')continue;
        const cells=[];
        for(const tc of tr.childNodes){if(tc.localName==='tc')cells.push(gt(tc).replace(/\s+/g,' ').trim())}
        if(cells.some(x=>x!==''))out.push(cells);
      }
    }
  }
  return out;
}
async function loadOther(f,ext){
  $('msg').textContent='Reading: '+f.name;
  try{
    let r;
    if(ext==='doc'){$('msg').textContent=f.name+': old .doc format is not supported. Save it as .docx, or copy the text and use Paste.';return}
    else if(ext==='docx')r=await docxRows(await f.arrayBuffer());
    else if(ext==='json')r=jsonRows(await f.text());
    else if(ext==='html'||ext==='htm')r=htmlRows(await f.text());
    else{
      let t=await f.text();
      if(ext==='rtf')t=t.replace(/\\par[d]?/g,'\n').replace(/\\'[0-9a-f]{2}/gi,' ').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'');
      if(t.indexOf('\u0000')>=0){$('msg').textContent=f.name+': this file type cannot be read.';return}
      r=textRows(t);
    }
    addFile(f.name,fixRows(r),{size:f.size});
  }catch(err){console.error(err);$('msg').textContent=f.name+': could not read this file.'}
}
let pasteN=0;
/* price-history page copied as one long column list (Date list, then 8 numbers per day: CP, Chg, %, Vol, Bull, Bear, Neutral, Value) */
function vertHistory(text){
  const L=String(text).split(/\r?\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
  const dre=/^\d{1,2} [A-Za-z]{3,9}\.? \d{2,4}$/,nre=/^-?[\d,]*\.?\d+$/;
  let bs=-1,bl=0;for(let i=0;i<L.length;){if(!dre.test(L[i])||pDate(L[i])===null){i++;continue}let j=i;while(j<L.length&&dre.test(L[j])&&pDate(L[j])!==null)j++;if(j-i>bl){bl=j-i;bs=i}i=j}
  if(bl<5)return null;
  const N=bl,nums=[];for(let i=bs+N;i<L.length&&nre.test(L[i]);i++)nums.push(parseFloat(L[i].replace(/,/g,'')));
  const K=8;if(nums.length<N*K)return null;
  const raw=L.slice(bs+N,bs+N+N*K),rows=[];let ok=0;
  for(let r=0;r<N;r++){const c=raw.slice(r*K,r*K+K),v=nums.slice(r*K,r*K+K);if(Math.abs(v[3]-(v[4]+v[5]+v[6]))<=1)ok++;rows.push(c)}
  if(ok<N*.8)return null; // not this layout: Vol must equal Bull+Bear+Neutral
  const nm=(L.slice(0,bs).find(x=>/^[A-Z][A-Z0-9]{2,}$/.test(x)&&!/^(CP|CHG|VOL|DATE|BULL|BEAR|NEUTRAL|VALUE)$/.test(x)))||'Share';
  const days=L.slice(bs,bs+N);
  return [['Name','Date','Price','Chg','%','Volume','Bull','Bear','Neutral','Turnover'],...days.map((d,i)=>[nm,d,...rows[i]]).sort((a,b)=>pDate(b[1])-pDate(a[1]))];
}
function pasteData(text){
  try{const vh=vertHistory(text);if(vh){addFile('Pasted '+(++pasteN),vh);return}}catch(e){console.error(e)}
  /* pasted / sent text that is a broker portfolio statement: update the saved portfolio instead of adding a second copy */
  try{const st=window.__stmtOpen&&window.__stmtOpen(String(text).split(/\r?\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean).map(l=>[l]));if(st){$('msg').textContent=st.note||'';return}}catch(e){console.error(e)}
  const r=fixRows(textRows(text));
  addFile('Pasted '+(++pasteN),r);
}
const isN=s=>/^-?[\d,]*\.?\d+$/.test(s);
function cardRows(items){
  const t=items.map(i=>({s:i.str.trim(),x:i.transform[4],y:i.transform[5],w:i.width})).filter(i=>i.s!=='');
  const ds=t.filter(i=>/^date:/i.test(i.s)).sort((a,b)=>b.y-a.y);
  if(!ds.length)return null;
  const recs=ds.map((d,k)=>{
    const lo=k+1<ds.length?ds[k+1].y+1:-1e9;
    const grp=t.filter(i=>i!==d&&i.y<=d.y+1&&i.y>lo);
    const lab=grp.find(i=>/^quantity:?$/i.test(i.s));
    const nums=grp.filter(i=>isN(i.s)).sort((a,b)=>b.x-a.x);
    const txt=grp.filter(i=>!isN(i.s)&&i!==lab).sort((a,b)=>a.x-b.x);
    const p=nums[0],rest=nums.slice(1);
    let q='';
    if(rest.length){const c=lab?lab.x+lab.w/2:0;q=(lab?rest.sort((a,b)=>Math.abs(a.x+a.w/2-c)-Math.abs(b.x+b.w/2-c)):rest)[0].s}
    /* name = the share code only; card labels (TT, TT_amount, T.Amt, Total, Quantity: ...) are skipped */
    const nm=txt.filter(i=>!/:\s*$/.test(i.s)&&isShareName(i.s,null));
    return{n:nm.length?nm[0].s:'',p:p?p.s:'',q,d:d.s.replace(/^date:\s*/i,'')};
  }).filter(r=>r.n||r.p);
  const hasQ=recs.some(r=>r.q!=='');
  return [['Name',...(hasQ?['Quantity']:[]),'Price','Date'],...recs.map(r=>[r.n,...(hasQ?[r.q]:[]),r.p,r.d])];
}
