// Keep an original copy of newly imported documents so PDF and Excel can be viewed offline.
// Existing saved imports have only extracted rows, so they show a data fallback.
const DOC_DB='ShareReader_OriginalFiles_v1';
let docEphemeral=new Map();
function dbOpen(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('File storage unavailable'));return}const q=indexedDB.open(DOC_DB,1);q.onupgradeneeded=()=>q.result.createObjectStore('files');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error||new Error('Database unavailable'))})}
async function putDocBinary(k,f){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(f,k);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>{db.close();rej(tx.error)}})}
async function getDocBinary(k){
 if(docEphemeral.has(k))return docEphemeral.get(k);
 try{const db=await dbOpen();const f=await new Promise((res,rej)=>{const tx=db.transaction('files','readonly');const q=tx.objectStore('files').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error);tx.oncomplete=()=>db.close()});if(f)return f}catch(e){}
 try{const stored=localStorage.getItem('ds_original_'+k);if(stored){const a=stored.split('|');const raw=atob(a.slice(1).join('|')),buf=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)buf[i]=raw.charCodeAt(i);return new Blob([buf],{type:a[0]||'application/octet-stream'})}}catch(e){}
 return null;
}
async function saveDocBackup(k,f){
 if(f.size>1100000)return false; // Small-file fallback only; do not exhaust localStorage.
 try{const raw=new Uint8Array(await f.arrayBuffer());let str='';for(let i=0;i<raw.length;i+=8192)str+=String.fromCharCode(...raw.subarray(i,i+8192));localStorage.setItem('ds_original_'+k,(f.type||'application/octet-stream')+'|'+btoa(str));return true}catch(e){return false}
}

async function delDocBinary(k){docEphemeral.delete(k);try{localStorage.removeItem('ds_original_'+k)}catch(e){}try{const db=await dbOpen();const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(k);tx.oncomplete=()=>db.close()}catch(e){console.warn('Cannot remove document binary',e)}}
async function loadAndStore(f){
 const projectAtStart=pi, name=f.name, old=store.find(s=>s.name===name);const ext=docExt(name);
 if(ext==='doc')return load(f);
 // Preserve the original import workflow; viewer persistence runs only on successful import or supported standalone preview formats.
 await load(f);
 const project=projects[projectAtStart];if(!project)return;
 const s=project.store.find(x=>x.name===name&&x!==old);
 const previewable=['pdf','xls','xlsx','xlsb','xlsm','ods','csv','tsv','txt','md','json','html','htm','xml','docx','rtf','log','png','jpg','jpeg','webp'].includes(ext);
 if(!s&&!previewable)return;
 const isPdfOrImage=['pdf','png','jpg','jpeg','webp'].includes(ext);
 if(!s&&!isPdfOrImage)return; // Do not add meaningless viewer-only entries for unparsed spreadsheet/text files.
 const key='doc-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 let saved=true;
 try{await putDocBinary(key,f)}catch(e){saved=await saveDocBackup(key,f);if(!saved)docEphemeral.set(key,f);console.warn('IndexedDB storage unavailable; using backup or temporary preview',e)}
 const oldOnly=(project.viewerFiles||[]).filter(x=>x.name===name);
 oldOnly.forEach(x=>{if(x.docKey)delDocBinary(x.docKey)});
 project.viewerFiles=(project.viewerFiles||[]).filter(x=>x.name!==name);
 if(s){if(old?.docKey)delDocBinary(old.docKey);s.docKey=key;s.previewPersisted=saved;}
 else project.viewerFiles.push({name,docKey:key,size:f.size,addedAt:new Date().toISOString(),previewPersisted:saved});
 persist();renderLibrary();
 if(!saved)$('msg').textContent='File preview is available until the app closes. This device could not save the original.';
}

// Document library reads original project/store data. New imports also keep originals in IndexedDB for offline preview.
function docFolderSVG(){return '<svg viewBox="0 0 28 26" fill="none" aria-hidden="true"><path d="M2 8a3 3 0 0 1 3-3h7l2.8 3H23a3 3 0 0 1 3 3v11a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 2 22Z" fill="currentColor" opacity=".2"/><path d="M2 8a3 3 0 0 1 3-3h7l2.8 3H23a3 3 0 0 1 3 3v11a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 2 22Z" stroke="currentColor" stroke-width="1.5"/></svg>'}
function docExt(s){return (String(s).match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase()||'data'}
function docType(s){const x=docExt(s);if(x==='pdf')return ['pdf','PDF'];if(['xlsx','xls','xlsb','xlsm','ods','csv','tsv'].includes(x))return ['excel',x==='csv'?'CSV':'XLS'];return ['text',x==='docx'?'DOC':x==='json'?'JSON':'TXT']}
function docSize(s){const n=Number(s.size)||0;return n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?Math.round(n/1024)+' KB':n?String(n)+' B':''}
function docWhen(s){if(!s.addedAt)return 'Saved data';const d=new Date(s.addedAt);if(isNaN(d.getTime()))return 'Saved data';return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}
function renderLibrary(){
  if(!$('docFolders')||!$('docFiles'))return;
  const term=($('docSearch').value||'').trim().toLowerCase();
  const frows=projects.map((p,i)=>({p,i,count:(p.store||[]).length+(p.viewerFiles||[]).length+(p.manual?.length?1:0)}));
  if(docFolder!=='all'&&(Number(docFolder)<0||Number(docFolder)>=projects.length))docFolder='all';
  $('docFolders').innerHTML=frows.filter(f=>!term||f.p.name.toLowerCase().includes(term)||f.p.store.some(s=>s.name.toLowerCase().includes(term))||(f.p.viewerFiles||[]).some(s=>s.name.toLowerCase().includes(term)))
    .map(({p,i,count})=>`<button class="doc-folder${String(i)===docFolder?' active':''}" data-folder="${i}" title="${escA(p.name)}" aria-pressed="${String(i)===docFolder}">${docFolderSVG()}<span>${esc(p.name)}</span><small>${count} ${count===1?'file':'files'}</small></button>`).join('')||'<div class="doc-empty" style="grid-column:1/-1">No matching folders</div>';
  $('docAll').textContent=docFolder==='all'?'All folders':'Show all';
  $('docListTitle').textContent=docFolder==='all'?'Recent files':projects[+docFolder].name;
  $('docSort').textContent=docReverse?'Oldest first ↑':'Newest first ↓';
  const list=[];
  projects.forEach((p,i)=>{
    if(docFolder!=='all'&&docFolder!==String(i))return;
    (p.store||[]).forEach((s,j)=>{if(!term||p.name.toLowerCase().includes(term)||s.name.toLowerCase().includes(term))list.push({p,i,s,j,stamp:Date.parse(s.addedAt)||0})});
    (p.viewerFiles||[]).forEach((s,j)=>{if(!term||p.name.toLowerCase().includes(term)||s.name.toLowerCase().includes(term))list.push({p,i,s,j:'v'+j,stamp:Date.parse(s.addedAt)||0})});
    if((p.manual||[]).length&&(!term||p.name.toLowerCase().includes(term)||'manual entries'.includes(term)))list.push({p,i,s:{name:'Manual entries',rows:p.manual,addedAt:''},j:-1,stamp:0});
  });
  list.sort((a,b)=>docReverse?a.stamp-b.stamp:b.stamp-a.stamp);
  $('docFiles').innerHTML=list.map(({p,i,s,j})=>{
    const [typ,fmt]=j===-1?['text','DATA']:docType(s.name);
    const id=i+':'+j,menu=docMenu===id,del=docDeleteConfirm===id;
    const n=Array.isArray(s.rows)?s.rows.length:0;
    const info=[docWhen(s),j===-1?'Manual data':String(j).startsWith('v')?'Preview only':n+' '+(n===1?'row':'rows'),docSize(s)].filter(Boolean).join(' · ');
    return `<div class="doc-file"><button class="doc-file-main" data-doc-open="${i}:${j}" title="View ${escA(s.name)}"><span class="doc-file-icon ${typ}" aria-hidden="true"><b>${fmt}</b></span><span class="doc-file-text"><span class="doc-file-name">${esc(s.name)}</span><span class="doc-file-meta">${esc(info)}</span><span class="doc-tags"><span class="doc-tag">${esc(p.name)}</span><span class="doc-tag">${j===-1?'Manual':'Imported'}</span></span></span></button><div class="doc-file-tools"><button class="doc-file-more" aria-label="Options for ${escA(s.name)}" aria-expanded="${menu}" data-doc-more="${id}">⋮</button>${menu?`<div class="doc-file-actions"><button class="alt" data-doc-open="${i}:${j}">View</button>${String(j).startsWith('v')?'':`<button class="alt" data-doc-data="${i}:${j}">Data</button>`}<button class="alt danger" data-doc-delete="${id}">${del?'Confirm remove':'Remove'}</button></div>`:''}</div></div>`;
  }).join('')||`<div class="doc-empty"><strong>${term?'No matches found':'No files yet'}</strong>${term?'Try a different search.':'Tap + Import to add a file.'}<div><button data-doc-import>Import a file</button></div></div>`;
}
function closeAddMenu(lock){const m=$('docAddMenu');if(lock)window.__menuLock=Date.now();if(m){m.style.setProperty('display','none','important');$('docPlus').setAttribute('aria-expanded','false')}}
function docAdd(action){
  closeAddMenu(true);
  if(action==='note'){try{window.__ntNew()}catch(e){gnToast('Note khulche na')}return}
  if(action==='auth'){try{window.__authOpen()}catch(e){gnToast('Authentication khulche na')}return}
  if(['qr','id','pdf','photo','barcode'].includes(action)){pvStart(action);return}
  if(action!=='file'&&action!=='card'&&curTab!=='scrap'&&!(action==='folder'&&curTab==='files'))setTab('scrap');
  if(action==='folder'){if(!document.body.classList.contains('files-page')){$('pNew').click();return}$('docCreate').style.display='block';$('docNewName').focus();return}
  if(action==='file'){docImportReturn=!!document.body.classList.contains('files-page');$('file').click();return}
  if(action==='paste'){$('pasteB').click();return}
  if(action==='card'){window.__openAddCard();return}
}
$('docBottom').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='docPlus'){
    if(Date.now()-(window.__menuLock||0)<900){closeAddMenu();return}const open=$('docAddMenu').style.display==='none';if(open)$('docAddMenu').style.setProperty('display','block','important');else closeAddMenu();b.setAttribute('aria-expanded',String(open));return;
  }
  if(b.dataset.nav)setTab(b.dataset.nav);
};
$('docAddMenu').onclick=e=>{const b=e.target.closest('button[data-add]');if(b)docAdd(b.dataset.add)};
$('file').addEventListener('change',()=>closeAddMenu(true),true);
['focus','pageshow'].forEach(ev=>window.addEventListener(ev,()=>{closeAddMenu(true);setTimeout(()=>closeAddMenu(),350)}));
document.addEventListener('visibilitychange',()=>closeAddMenu(true));
document.addEventListener('touchstart',e=>{if(!e.target.closest('#docAddMenu,#docPlus'))closeAddMenu()},{passive:true});
$('docSearch').oninput=renderLibrary;
$('docSort').onclick=()=>{docReverse=!docReverse;renderLibrary()};
$('docAll').onclick=()=>{docFolder='all';renderLibrary()};
$('docFolders').onclick=e=>{const b=e.target.closest('button[data-folder]');if(!b)return;docFolder=docFolder===b.dataset.folder?'all':b.dataset.folder;renderLibrary()};
$('docFiles').onclick=e=>{
  const more=e.target.closest('button[data-doc-more]');if(more){docMenu=docMenu===more.dataset.docMore?'':more.dataset.docMore;docDeleteConfirm='';renderLibrary();return}
  const del=e.target.closest('button[data-doc-delete]');if(del){
    const id=del.dataset.docDelete;
    if(docDeleteConfirm!==id){docDeleteConfirm=id;renderLibrary();return}
    const [ia,ja]=id.split(':'),i=Number(ia),j=ja.startsWith('v')?Number(ja.slice(1)):Number(ja);
    if(!projects[i])return;
    if(ja.startsWith('v')){const d=(projects[i].viewerFiles||[])[j];if(d?.docKey)delDocBinary(d.docKey);projects[i].viewerFiles.splice(j,1)}
    else if(j===-1){projects[i].manual=[];if(pi===i)manual=projects[i].manual}
    else if(projects[i].store[j]){if(projects[i].store[j].docKey)delDocBinary(projects[i].store[j].docKey);projects[i].store.splice(j,1);if(pi===i)store=projects[i].store}
    docMenu='';docDeleteConfirm='';
    if(pi===i)merge();else{persist();renderLibrary()}
    return;
  }
  const data=e.target.closest('button[data-doc-data]');if(data){const [i,j]=data.dataset.docData.split(':').map(Number);if(!projects[i])return;cfSet(false);switchTo(i);setTab('show');return}
  const open=e.target.closest('button[data-doc-open]');if(open){const [i,j]=open.dataset.docOpen.split(':');openDocViewer(+i,j.startsWith('v')?+j.slice(1):+j,j.startsWith('v'));return}
  if(e.target.closest('button[data-doc-import]'))docAdd('file');
};
$('docCreateCancel').onclick=()=>{$('docCreate').style.display='none';$('docNewName').value=''};
$('docCreateSave').onclick=()=>{
  const name=$('docNewName').value.trim();if(!name){$('docNewName').focus();return}
  sync();projects.push({name,store:[],manual:[]});
  const i=projects.length-1;
  $('docNewName').value='';$('docCreate').style.display='none';persist();docFolder=String(i);renderLibrary();
};
$('docNewName').onkeydown=e=>{if(e.key==='Enter')$('docCreateSave').click()};

const docPreview={project:0,index:0,standalone:false,pdf:null,page:1,scale:1,sheet:0,wb:null,file:null,ticket:0};
function viewerClose(){docPreview.ticket++;if(docPreview.u){try{URL.revokeObjectURL(docPreview.u)}catch(e){}docPreview.u=''}if(docPreview.pdf){try{docPreview.pdf.destroy()}catch(e){}}docPreview.pdf=null;docPreview.wb=null;docPreview.file=null;}
function viewerMessage(message){$('docViewContent').innerHTML='<div class="doc-view-msg">'+esc(message)+'</div>'}
function viewTool(html){$('docViewToolbar').style.display=html?'flex':'none';$('docViewToolbar').innerHTML=html}
function showParsedRows(s){
 const h=(s.header||[]).map(x=>String(x));const r=(s.rows||[]);
 if(!r.length&&!h.length){viewerMessage('Original file is not available for preview. Import this document again to view the original.');return}
 $('docViewNotice').textContent='Showing saved extracted data. Re-import this file to view its original pages or workbook.';
 const row=[h,...r.slice(0,1500)];
 $('docViewContent').innerHTML='<div style="overflow:auto"><table><tbody>'+row.map((cells,i)=>'<tr>'+cells.map(x=>i===0?'<th>'+esc(String(x??''))+'</th>':'<td>'+esc(String(x??''))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(r.length>1500?'<p class="mut">Showing first 1500 rows</p>':'');
}
async function openDocViewer(i,j,standalone=false){
 const p=projects[i];if(!p)return;
 const s=standalone?p.viewerFiles?.[j]:j===-1?{name:'Manual entries',header:['Date','Name','Quantity','Price','Type'],rows:(p.manual||[]).map(m=>[m.d,m.n,m.q,m.p,m.t])}:p.store?.[j];
 if(!s)return;
 viewerClose();const ticket=docPreview.ticket;
 docPreview.project=i;docPreview.index=j;docPreview.standalone=standalone;docPreview.page=1;docPreview.scale=1;docPreview.sheet=0;
 $('docViewer').style.display='flex';$('docViewTitle').textContent=s.name;
 $('docViewData').style.display=standalone?'none':'';
 $('docViewNotice').textContent='';viewTool('');viewerMessage('Opening document…');
 if(!s.docKey){showParsedRows(s);return}
 try{
  const file=await getDocBinary(s.docKey);if(ticket!==docPreview.ticket)return;
  if(!file){showParsedRows(s);return}
  docPreview.file=file;
  const ext=docExt(s.name);
  if(ext==='pdf'){
    docPreview.pdf=await (await need('pdf'),pdfjsLib).getDocument({data:await file.arrayBuffer()}).promise;
    if(ticket!==docPreview.ticket)return;
    await renderDocPdf();
  }else if(['xls','xlsx','xlsm','xlsb','ods','csv','tsv'].includes(ext)){
    docPreview.wb=(await need('xlsx'),XLSX).read(await file.arrayBuffer(),{type:'array',cellDates:true});
    if(ticket!==docPreview.ticket)return;
    renderDocSheet();
  }else if(['png','jpg','jpeg','webp','gif','bmp','heic','heif','avif'].includes(ext)){
    $('docViewContent').replaceChildren();const im=window.__showImg($('docViewContent'),file,s.name);docPreview.u=im.dataset.u||'';
  }else if(ext==='docx'){
    const rr=await docxRows(await file.arrayBuffer());if(ticket!==docPreview.ticket)return;
    const pre=document.createElement('pre');pre.textContent=rr.map(row=>row.join(' | ')).join('\n')||'No readable text';$('docViewContent').replaceChildren(pre);
  }else{
    const txt=await file.text();if(ticket!==docPreview.ticket)return;
    const pre=document.createElement('pre');pre.textContent=txt.slice(0,1000000);$('docViewContent').replaceChildren(pre);
  }
 }catch(e){console.error('Viewer',e);viewTool('');$('docViewNotice').textContent='Cannot display original file.';showParsedRows(s)}
}
async function renderDocPdf(){
 if(!docPreview.pdf)return;
 const ticket=docPreview.ticket,p=docPreview.page,pdf=docPreview.pdf;
 viewTool('<button data-pdf="prev"'+(p<=1?' disabled':'')+'>‹ Prev</button><span>'+p+' / '+pdf.numPages+'</span><button data-pdf="next"'+(p>=pdf.numPages?' disabled':'')+'>Next ›</button><button data-pdf="minus">−</button><span>'+Math.round(docPreview.scale*100)+'%</span><button data-pdf="plus">+</button>');
 try{
  const page=await pdf.getPage(p);if(ticket!==docPreview.ticket)return;
  const viewport=page.getViewport({scale:docPreview.scale});
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d');cv.width=Math.ceil(viewport.width);cv.height=Math.ceil(viewport.height);
  $('docViewContent').replaceChildren(cv);await page.render({canvasContext:ctx,viewport}).promise;
 }catch(e){if(ticket===docPreview.ticket)viewerMessage('Could not render this PDF page.')}
}
function renderDocSheet(){
 const wb=docPreview.wb;if(!wb)return;
 const safe=wb.SheetNames.map((n,i)=>'<option value="'+i+'"'+(i===docPreview.sheet?' selected':'')+'>'+esc(n)+'</option>').join('');
 viewTool('<label>Sheet <select id="docSheetSel">'+safe+'</select></label>');
 const name=wb.SheetNames[docPreview.sheet],ws=wb.Sheets[name],a=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
 const rows=a.slice(0,2000),maxC=Math.min(100,Math.max(0,...rows.map(r=>r.length)));
 $('docViewContent').innerHTML='<div style="overflow:auto"><table><tbody>'+rows.map((r,i)=>'<tr>'+Array.from({length:maxC},(_,j)=>'<td>'+esc(String(r[j]??''))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(a.length>2000?'<p class="mut">Showing first 2000 rows in this sheet.</p>':'');
 $('docSheetSel').onchange=e=>{docPreview.sheet=+e.target.value;renderDocSheet()};
}
$('docViewBack').onclick=()=>{$('docViewer').style.display='none';viewerClose()};
$('docViewData').onclick=()=>{const i=docPreview.project;$('docViewer').style.display='none';viewerClose();cfSet(false);switchTo(i);setTab('show')};
$('docViewToolbar').onclick=e=>{const b=e.target.closest('[data-pdf]');if(!b||!docPreview.pdf)return;
 const n=docPreview.pdf.numPages;
 if(b.dataset.pdf==='prev')docPreview.page=Math.max(1,docPreview.page-1);
 if(b.dataset.pdf==='next')docPreview.page=Math.min(n,docPreview.page+1);
 if(b.dataset.pdf==='minus')docPreview.scale=Math.max(.5,+(docPreview.scale-.25).toFixed(2));
 if(b.dataset.pdf==='plus')docPreview.scale=Math.min(3,+(docPreview.scale+.25).toFixed(2));
 renderDocPdf();
};

$('docPanelImport').onclick=()=>docAdd('file');
$('docPanelFolder').onclick=()=>docAdd('folder');
document.addEventListener('click',e=>{if(!e.target.closest('#docAddMenu,#docPlus'))closeAddMenu()});
