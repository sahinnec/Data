let PER=20;
let store=[],baseRows=[],header=[],rows=[],page=0,map={d:-1,n:-1,q:-1,p:-1,t:-1},hkey='',tf='all';
const $=id=>document.getElementById(id);
/* Lazy libs: heavy files load only when first needed (fast start) */
const LIBS={sel:['libs/smartsel.js'],pdf:['libs/pdf.min.js','libs/pdf.worker.min.js'],xlsx:['libs/xlsx.full.min.js'],jspdf:['libs/jspdf.umd.min.js'],zip:['libs/jszip.min.js'],qr:['libs/qrdec.js']},_lp={};
const CDN={'libs/pdf.min.js':'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','libs/pdf.worker.min.js':'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','libs/xlsx.full.min.js':'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','libs/jspdf.umd.min.js':'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','libs/jszip.min.js':'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'};
function need(k){
  if(_lp[k])return _lp[k];
  return _lp[k]=(async()=>{
    let cdn=false;
    const ld=u=>new Promise((ok,no)=>{const e=document.createElement('script');e.src=u;e.onload=ok;e.onerror=()=>{e.remove();no(new Error('Cannot load '+u))};document.head.appendChild(e)});
    for(const u of LIBS[k]){
      try{await ld(u)}catch(er){ /* local file missing (e.g. single-file web preview): try the online copy */
        const c=CDN[u];if(!c)throw er;
        try{await ld(c);cdn=true}catch(e2){throw new Error('Cannot load '+u+' (online copy failed too)')}}}
    if(k==='pdf'&&window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc=cdn?CDN['libs/pdf.worker.min.js']:'libs/pdf.worker.min.js';
  })().catch(e=>{delete _lp[k];try{gnToast('Error: '+e.message)}catch(_){}throw e});
}
window.need=need;

$('drop').onclick=()=>$('file').click();
$('file').onchange=e=>{loadAll(e.target.files);e.target.value=''};
['dragover','dragenter'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.add('over')}));
['dragleave','drop'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.remove('over')}));
$('drop').addEventListener('drop',e=>loadAll(e.dataTransfer.files));
