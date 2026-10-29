/* ===== Files page, hideable menu, scan/preview, web link, share ===== */
(function(){
  const pv={kind:'',file:null,text:'',web:false,url:''};window.__pv=pv;
  let lastSel=[],lastSpan=null,editMode=false;
  const note=t=>{$('msg').textContent=t||''};
  const stamp=()=>new Date().toISOString().slice(0,16).replace('T',' ').replace(':','-');
  // bottom menu show/hide
  $('navTog').onclick=()=>document.body.classList.toggle('nav-hid');
  // preview box
  function pvOpen(title,html){navAuto(false);setTab('scrap');$('pvBody').classList.remove('empty','pvimg','pvxl');$('pvBox').querySelector('.pvhd').classList.remove('vid','edok','zmok');$('pvFmt').style.display='none';if($('pvImgBar'))$('pvImgBar').style.display='none';$('pvBox').style.display='block';$('pvTitle').textContent=title;$('pvBody').innerHTML=html||'';try{$('pvBox').scrollIntoView({block:'nearest'})}catch(e){}pvFit()}
  function pvFit(){const bx=$('pvBox'),b=$('pvBody');try{document.body.classList.toggle('pvon',!!(bx&&b&&bx.style.display!=='none'&&!b.classList.contains('empty')))}catch(e){}if(!bx||!b||bx.style.display==='none')return;
    const nav=$('docBottom'),fm=$('pvFmt'),rc=$('pvRecent');
    // recent strip only shows while the viewer is empty, so the preview gets the whole page
    if(rc)rc.style.display=(b.classList.contains('empty')||rc.querySelector('.rc'))?'':'none';
    const vh=(window.visualViewport&&window.visualViewport.height)||innerHeight;
    let limit=vh;
    if(nav&&!document.body.classList.contains('nav-hid')&&getComputedStyle(nav).display!=='none'){const r=nav.getBoundingClientRect();if(r.height>0)limit=Math.min(limit,r.top)}
    else limit=vh-22;
    const vis=e=>e&&e.style.display!=='none'&&getComputedStyle(e).display!=='none'?e.getBoundingClientRect().height:0;
    const fh=vis(fm)+vis($('pvImgBar'))+vis($('pvRd')),rh=(rc&&rc.style.display!=='none')?rc.getBoundingClientRect().height+8:0;
    const mg=$('msg'),mh=(mg&&mg.textContent)?mg.getBoundingClientRect().height:0;
    const top=b.getBoundingClientRect().top;
    b.style.height=Math.max(220,Math.round(limit-fh-rh-top-mh-4))+'px';
    b.style.minHeight='0';b.style.maxHeight='none'}
  window.pvFit=pvFit;let lastW=innerWidth;
  (function(){let t;const re=()=>{clearTimeout(t);t=setTimeout(pvFit,120)};if(window.visualViewport)visualViewport.addEventListener('resize',re);new MutationObserver(re).observe($('pvBox'),{attributes:true,attributeFilter:['style']});const ib=$('pvImgBar');})();
  addEventListener('resize',()=>{if(innerWidth!==lastW){lastW=innerWidth;pvFit()}});
  addEventListener('orientationchange',()=>setTimeout(pvFit,300));
  $('navTog').addEventListener('click',()=>setTimeout(pvFit,60));
  const imgType=f=>{if(f.type&&/^image\//.test(f.type))return f.type;const e=((f.name||'').split('.').pop()||'').toLowerCase();return{jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',heic:'image/heic',heif:'image/heif',avif:'image/avif'}[e]||'image/jpeg'};
  window.__showImg=function(host,f,alt,onok){
    const im=document.createElement('img');im.alt=alt||'';im.style.cssText='max-width:100%;height:auto;display:block;margin:0 auto 8px;background:#fff;border-radius:6px';
    let blob;try{blob=new Blob([f],{type:imgType(f)})}catch(e){blob=f}
    let tried=0;
    const fail=()=>{createImageBitmap(blob).then(bm=>{const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);c.style.cssText='max-width:100%;height:auto;display:block;margin:0 auto 8px';im.replaceWith(c);onok&&onok(c,bm.width,bm.height)}).catch(()=>{const d=document.createElement('div');d.className='mut';d.style.padding='12px';d.textContent='This photo format cannot be shown here: '+(f.name||'');im.replaceWith(d)})};
    im.onload=()=>{onok&&onok(im,im.naturalWidth,im.naturalHeight)};
    im.onerror=()=>{if(tried++===0){const r=new FileReader();r.onload=()=>{im.src=r.result};r.onerror=fail;r.readAsDataURL(blob)}else fail()};
    try{im.dataset.u=URL.createObjectURL(blob);im.src=im.dataset.u}catch(e){im.onerror()}
    host.appendChild(im);return im};
  function pvClose(){navAuto(false);pv.kind='';pv.file=null;pv.text='';pv.web=false;if(pv.url){try{URL.revokeObjectURL(pv.url)}catch(e){}pv.url=''}$('pvBody').innerHTML='<div class="pvempty"><span>Preview</span><span style="font-size:1.1rem">👁</span></div>';$('pvBody').classList.add('empty');$('pvBody').classList.remove('pvimg','pvxl');$('pvBox').classList.remove('pvfs');$('pvBox').querySelector('.pvhd').classList.remove('edok','zmok');pv.edit=false;$('pvTitle').textContent='Viewer';$('pvFmt').style.display='none';$('pvBox').querySelector('.pvhd').classList.remove('vid');if($('pvImgBar'))$('pvImgBar').style.display='none';pv.cv=null;pv.ocr='';$('pvSel').style.display='none';$('pvBox').style.display='block';pvFit()}
  window.pvStart=function(k){
    if(k==='pdf'){pv.kind=k;pv.file=null;pv.text='';pv.web=false;pvOpen('PDF','');$('pvPdfIn').click();return}
    setTab('scrap');openCam(k);
  };
  $('pvBody').addEventListener('click',e=>{const b=e.target.closest('button[data-pick]');if(!b)return;(b.dataset.pick==='cam'?$('pvCamIn'):$('pvImgIn')).click()});
  $('pvX').onclick=pvClose;pvClose();
  async function pvPdf(f){
    editMode=false;lastSpan=null;{const kb=document.querySelector('#pvFmt [data-f=kb]');if(kb)kb.style.background=''}
    if(pv.io){try{pv.io.disconnect()}catch(e){}pv.io=null}
    const body=$('pvBody');body.innerHTML='<div class="mut">Loading…</div>';
    const pdf=await (await need('pdf'),pdfjsLib).getDocument({data:await f.arrayBuffer()}).promise;
    body.innerHTML='';const N=pdf.numPages,w=Math.max(260,body.clientWidth-6),dpr=Math.max(window.devicePixelRatio||1,2);
    let chain=Promise.resolve();
    const draw=wr=>{if(wr._d)return chain;wr._d=1;
      chain=chain.then(async()=>{if(wr._d!==1)return;const R=wr._r,c=R.c;c.width=R.v.width;c.height=R.v.height;await R.pg.render({canvasContext:c.getContext('2d'),viewport:R.v}).promise;wr._d=2}).catch(()=>{wr._d=0});return chain};
    const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>es.forEach(en=>{const wr=en.target;
      if(en.isIntersecting)draw(wr);else if(wr._d===2){const c=wr._r.c;c.width=1;c.height=1;wr._d=0}}),{root:body,rootMargin:'1500px 0px'}):null;
    pv.io=io;
    for(let i=1;i<=N;i++){
      const pg=await pdf.getPage(i),v0=pg.getViewport({scale:1}),sc=w/v0.width,v=pg.getViewport({scale:sc*dpr}),hh=v.height/dpr;
      const c=document.createElement('canvas');c.style.width=w+'px';c.style.height=hh+'px';
      const wr=document.createElement('div');wr.className='pvpg';wr.style.cssText='width:'+w+'px;height:'+hh+'px;background:#fff';wr._r={pg,v,c};wr.appendChild(c);
      if(pv.z&&pv.z!==1){wr.style.zoom=pv.z;wr.style.maxWidth='none'}
      body.appendChild(wr);
      try{const vv=pg.getViewport({scale:sc}),tc=await pg.getTextContent(),tl=document.createElement('div');tl.className='pvtl';wr.appendChild(tl);
        tc.items.forEach(it=>{if(!it.str||!it.str.trim())return;const t=pdfjsLib.Util.transform(vv.transform,it.transform),fs=Math.hypot(t[2],t[3]),sp=document.createElement('span');sp.textContent=it.str;sp.dataset.p=i;sp.style.cssText='left:'+t[4]+'px;top:'+(t[5]-fs)+'px;font-size:'+fs+'px;min-width:'+(it.width*sc)+'px';tl.appendChild(sp)})}catch(e){}
      if(i===1)await draw(wr);
      if(io)io.observe(wr);else draw(wr);
    }
    pvFit();try{document.dispatchEvent(new Event('pvpdf'))}catch(e){}
  }
  $('pvPdfIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;openV(f)};
  async function offlineQr(src){
    try{
      await need('qr');if(!window.DSQR)return null;
      let bm;try{bm=await createImageBitmap(src)}catch(e){bm=null}
      if(!bm&&src instanceof HTMLCanvasElement)bm=src;
      if(!bm)return null;
      const W0=bm.width,H0=bm.height;
      for(const mx of [1600,1100,700,2400]){
        const k=Math.min(1,mx/Math.max(W0,H0));if(mx===2400&&Math.max(W0,H0)<=1600)continue;
        const w=Math.max(1,Math.round(W0*k)),h=Math.max(1,Math.round(H0*k)),c=document.createElement('canvas');c.width=w;c.height=h;
        const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(bm,0,0,w,h);
        const d=x.getImageData(0,0,w,h).data,g=new Uint8ClampedArray(w*h);
        for(let i=0,j=0;j<g.length;i+=4,j++)g[j]=(d[i]*77+d[i+1]*150+d[i+2]*29)>>8;
        const t=window.DSQR.decodeGray(g,w,h);if(t)return t;
        await new Promise(r=>setTimeout(r,0));
      }
    }catch(e){}
    return null;
  }
  async function pvQrScan(k,c){
    const out=$('pvQrOut');if(!out)return;const label=k==='barcode'?'Barcode':'QR';
    out.innerHTML='<div class="mut">Reading '+label.toLowerCase()+'…</div>';pv.text='';
    const done=t=>{pv.text=t;out.innerHTML='<b>'+label+' text</b><pre></pre><div class="row" style="display:flex;gap:6px;margin-top:6px"><button type="button" class="alt sm" id="pvQrCp">Copy</button><button type="button" class="alt sm" id="pvQrAg">Scan again</button></div>';out.querySelector('pre').textContent=t;qrLinks(out,t);$('pvQrCp').onclick=()=>copyTxt(t);$('pvQrAg').onclick=()=>pvQrScan(k,pv.cv);try{out.scrollIntoView({block:'nearest'})}catch(_){}};
    try{
      if('BarcodeDetector' in window){let fm;try{fm=await BarcodeDetector.getSupportedFormats()}catch(_){}if(k!=='barcode')fm=['qr_code'];
        try{const r=await (fm&&fm.length?new BarcodeDetector({formats:fm}):new BarcodeDetector()).detect(c);if(r.length){done(r.map(x=>x.rawValue).join('\n'));return}}catch(_){}}
      if(k!=='barcode'){const t=await offlineQr(c);if(t){done(t);return}}
      if(!window.ZXing){await new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';sc.onload=ok;sc.onerror=()=>no(new Error('offline'));document.head.appendChild(sc)})}
      const hints=new Map();hints.set(ZXing.DecodeHintType.TRY_HARDER,true);const rd=new ZXing.BrowserMultiFormatReader(hints);
      const bl=await new Promise(ok=>c.toBlob(ok,'image/png')),u=URL.createObjectURL(bl);
      try{const res=await rd.decodeFromImageUrl(u);done(res.getText())}finally{URL.revokeObjectURL(u)}
    }catch(x){out.innerHTML='<div class="mut">No '+label.toLowerCase()+' found. Crop closer to the code, tap Magic, then tap Scan.</div>'}
  }
  async function pvQr(f,k,imEl){
    const out=document.createElement('div');out.className='pvqr';$('pvBody').appendChild(out);
    const label=k==='barcode'?'Barcode':'QR';out.textContent='Reading '+label.toLowerCase()+'…';
    const show=t=>{pv.text=t;out.innerHTML='<b>'+label+' text</b><pre></pre>';out.querySelector('pre').textContent=t;qrLinks(out,t)};
    try{
      if('BarcodeDetector' in window){
        let fm;try{fm=await BarcodeDetector.getSupportedFormats()}catch(_){}
        if(k!=='barcode')fm=['qr_code'];
        const bm=await createImageBitmap(f),r=await (fm&&fm.length?new BarcodeDetector({formats:fm}):new BarcodeDetector()).detect(bm);
        if(r.length){show(r.map(x=>x.rawValue).join('\n'));return}
      }
      // offline decoder (no internet)
      {const t=await offlineQr(f);if(t){show(t);return}}
      // fallback decoder (needs internet once)
      if(!window.ZXing){await new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';sc.onload=ok;sc.onerror=()=>no(new Error('offline'));document.head.appendChild(sc)})}
      const hints=new Map();hints.set(ZXing.DecodeHintType.TRY_HARDER,true);
      const rd=new ZXing.BrowserMultiFormatReader(hints);
      const u=URL.createObjectURL(f);
      try{const res=await rd.decodeFromImageUrl(u);show(res.getText())}finally{URL.revokeObjectURL(u)}
    }catch(x){out.textContent='No '+label.toLowerCase()+' found. Try a clearer, closer photo'+(x&&x.message==='offline'?' (or connect to internet once for the scanner).':'.')}
  }

  /* ---------- photo v4: auto crop, side panel, nav auto-hide ---------- */
  var navAutoOn=false;
  function navAuto(on){const b=document.body;if(on){if(!b.classList.contains('nav-hid')){b.classList.add('nav-hid');navAutoOn=true;setTimeout(pvFit,60)}}else if(navAutoOn){navAutoOn=false;b.classList.remove('nav-hid');setTimeout(pvFit,60)}}
  $('navTog').addEventListener('click',()=>{navAutoOn=false});
  const SV=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
  const BI={edt:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',crop:'<path d="M6 3v13a2 2 0 002 2h13M3 6h13a2 2 0 012 2v13"/>',rot:'<path d="M20 12a8 8 0 11-3-6.200M20 4v5h-5"/>',ocr:'<path d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3M8 12h8"/>',pen:'<path d="M4 20l1-4L16 5l3 3L8 19z"/>',undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',scn:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',sav:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',exp:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'};
  const BL=[['edt','Edit'],['crop','Crop'],['rot','Rotate'],['ocr','OCR'],['pen','Draw'],['undo','Undo'],['scn','Scan'],['sav','Save'],['exp','Export']];
  const ADV=[['acrop','Auto crop','<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><rect x="8" y="8" width="8" height="8" rx="1"/>'],['crop','Crop',BI.crop],['rot','Straighten','<path d="M3 12h18"/><path d="M6 17l12-10"/>'],['persp','Perspective','<path d="M7 5h10l3 14H4z"/>'],['light','Light','<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600L7 7M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400"/>'],['color','Color','<circle cx="9" cy="10" r="5"/><circle cx="15" cy="10" r="5"/><circle cx="12" cy="15" r="5"/>'],['fx','Filters','<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z"/>'],['bw','B&amp;W','<circle cx="12" cy="12" r="8"/><path d="M12 4v16"/>'],['detail','Detail','<path d="M12 4l8 14H4z"/>'],['skin','Retouch','<circle cx="12" cy="12" r="8"/><path d="M8.500 14c1 1.500 2.200 2 3.500 2s2.500-.5 3.500-2M9 9.500h.01M15 9.500h.01"/>'],['face','Face','<ellipse cx="12" cy="12" rx="6" ry="8"/><path d="M10 10h.01M14 10h.01M10 15c1 1 3 1 4 0"/>'],['brush','Brush','<path d="M4 20c3 0 4-1 4-3a3 3 0 013-3l8-9-3-1-9 8a3 3 0 00-3 3c0 2-1 3-1 5z"/>'],['pen','Draw',BI.pen],['shape','Shapes','<rect x="4" y="9" width="10" height="10" rx="1"/><circle cx="15" cy="9" r="5"/>'],['txt','Text','<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'],['stk','Stickers','<path d="M4 4h16v10l-6 6H4z"/><path d="M14 20v-6h6"/>'],['layers','Layers','<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>'],['frame','Frames','<rect x="4" y="4" width="16" height="16"/><rect x="8" y="8" width="8" height="8"/>'],['xpd','Expand','<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'],['size','Resize','<path d="M5 19L19 5M13 5h6v6M11 19H5v-6"/>'],['','All tools',BI.edt]];
  function advOpen(h){
    let P=document.getElementById('pvAdv');
    if(!P){P=document.createElement('div');P.id='pvAdv';document.body.appendChild(P)}
    P.innerHTML='<div class="avBk"></div><div class="avP"><div class="avH"><b>Edit</b><button type="button" data-t="__x" aria-label="Close">✕</button></div><div class="avL">'+ADV.map(a=>'<button type="button" data-t="'+a[0]+'">'+SV(a[2])+'<span>'+a[1]+'</span></button>').join('')+'</div></div>';
    const close=()=>{P.classList.remove('on')};
    P.querySelector('.avBk').onclick=close;
    P.querySelector('.avP').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.t;close();if(t==='__x')return;
      if(t==='acrop'){try{const bl=await new Promise(ok=>h.c.toBlob(ok,'image/jpeg',.95));const g=await dsCrop(new File([bl],h.base+'.jpg',{type:'image/jpeg'}));if(g)await peBack(g,h.k)}catch(er){note('Auto crop failed: '+(er&&er.message||er))}return}
      h.openEd(t)};
    requestAnimationFrame(()=>requestAnimationFrame(()=>P.classList.add('on')));
  }
  function dsCrop(file){return new Promise(async done=>{
    let src;try{src=await createImageBitmap(file)}catch(e){try{src=await new Promise((r,n)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>r(im);im.onerror=n;im.src=u})}catch(e2){done(file);return}}
    const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
    const W0=src.width||src.naturalWidth,H0=src.height||src.naturalHeight,k0=Math.min(1,2600/Math.max(W0,H0));
    let cv=mk(Math.round(W0*k0),Math.round(H0*k0));cv.getContext('2d').drawImage(src,0,0,cv.width,cv.height);
    const order=q=>{const sm=q.map(p=>p[0]+p[1]),df=q.map(p=>p[0]-p[1]);return[q[sm.indexOf(Math.min(...sm))],q[df.indexOf(Math.max(...df))],q[sm.indexOf(Math.max(...sm))],q[df.indexOf(Math.min(...df))]]};
    function autoQuad(c){
      const W=c.width,H=c.height,f=Math.min(1,200/Math.max(W,H)),w=Math.max(8,Math.round(W*f)),h=Math.max(8,Math.round(H*f));
      const t=mk(w,h),tx=t.getContext('2d');tx.drawImage(c,0,0,w,h);const d=tx.getImageData(0,0,w,h).data;let g=new Float32Array(w*h);
      for(let i=0;i<w*h;i++)g[i]=.3*d[i*4]+.59*d[i*4+1]+.11*d[i*4+2];
      for(let pass=0;pass<2;pass++){const b=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let a=0,n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const X=x+i,Y=y+j;if(X>=0&&Y>=0&&X<w&&Y<h){a+=g[Y*w+X];n++}}b[y*w+x]=a/n}g=b}
      const hs=new Array(256).fill(0);for(let i=0;i<w*h;i++)hs[Math.max(0,Math.min(255,g[i]|0))]++;
      let tot=w*h,sum=0;for(let i=0;i<256;i++)sum+=i*hs[i];let sB=0,wB=0,mx=-1,th=128;
      for(let i=0;i<256;i++){wB+=hs[i];if(!wB)continue;const wF=tot-wB;if(!wF)break;sB+=i*hs[i];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>mx){mx=v;th=i}}
      let bs=0,bn=0;for(let x=0;x<w;x++){bs+=g[x]+g[(h-1)*w+x];bn+=2}for(let y=0;y<h;y++){bs+=g[y*w]+g[y*w+w-1];bn+=2}
      const bright=(bs/bn)<=th;const fg=new Uint8Array(w*h);for(let i=0;i<w*h;i++)fg[i]=(bright?g[i]>th:g[i]<=th)?1:0;
      const seen=new Uint8Array(w*h);let best=null,bestN=0;const st=new Int32Array(w*h);
      for(let i0=0;i0<w*h;i0++){if(!fg[i0]||seen[i0])continue;let sp=0,n=0;const px=[];st[sp++]=i0;seen[i0]=1;
        while(sp){const i=st[--sp];px.push(i);n++;const x=i%w,y=(i-x)/w;if(x>0&&fg[i-1]&&!seen[i-1]){seen[i-1]=1;st[sp++]=i-1}if(x<w-1&&fg[i+1]&&!seen[i+1]){seen[i+1]=1;st[sp++]=i+1}if(y>0&&fg[i-w]&&!seen[i-w]){seen[i-w]=1;st[sp++]=i-w}if(y<h-1&&fg[i+w]&&!seen[i+w]){seen[i+w]=1;st[sp++]=i+w}}
        if(n>bestN){bestN=n;best=px}}
      const ins=Math.round(Math.min(W,H)*.04),fb=[[ins,ins],[W-ins,ins],[W-ins,H-ins],[ins,H-ins]];
      if(!best||bestN<w*h*.12||bestN>w*h*.97)return fb;
      let a=[1e9,0,0],b2=[-1e9,0,0],c2=[-1e9,0,0],d2=[1e9,0,0];
      for(const i of best){const x=i%w,y=(i-x)/w,s1=x+y,s2=x-y;if(s1<a[0])a=[s1,x,y];if(s1>c2[0])c2=[s1,x,y];if(s2>b2[0])b2=[s2,x,y];if(s2<d2[0])d2=[s2,x,y]}
      const q=[[a[1],a[2]],[b2[1],b2[2]],[c2[1],c2[2]],[d2[1],d2[2]]].map(p=>[Math.max(0,Math.min(W,p[0]/f)),Math.max(0,Math.min(H,p[1]/f))]);
      const ar=Math.abs((q[0][0]*q[1][1]-q[1][0]*q[0][1])+(q[1][0]*q[2][1]-q[2][0]*q[1][1])+(q[2][0]*q[3][1]-q[3][0]*q[2][1])+(q[3][0]*q[0][1]-q[0][0]*q[3][1]))/2;
      return ar<W*H*.1?fb:q}
    function warp(c,Q){
      const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
      let w=Math.round(Math.max(dist(Q[0],Q[1]),dist(Q[3],Q[2]))),h=Math.round(Math.max(dist(Q[0],Q[3]),dist(Q[1],Q[2])));
      const m=Math.min(1,2600/Math.max(w,h,1));w=Math.max(16,Math.round(w*m));h=Math.max(16,Math.round(h*m));
      const [x0,y0]=Q[0],[x1,y1]=Q[1],[x2,y2]=Q[2],[x3,y3]=Q[3];
      const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
      let g=den?(dx3*dy2-dx2*dy3)/den:0,hh=den?(dx1*dy3-dx3*dy1)/den:0;if(!isFinite(g))g=0;if(!isFinite(hh))hh=0;
      const A=x1-x0+g*x1,B=x3-x0+hh*x3,C=x0,D=y1-y0+g*y1,E=y3-y0+hh*y3,F=y0;
      const SW=c.width,SH=c.height,S=c.getContext('2d').getImageData(0,0,SW,SH).data,out=mk(w,h),ox=out.getContext('2d'),od=ox.createImageData(w,h),O=od.data;
      for(let y=0;y<h;y++){const v=(y+.5)/h;for(let x=0;x<w;x++){const u=(x+.5)/w,dn=g*u+hh*v+1;let X=(A*u+B*v+C)/dn-.5,Y=(D*u+E*v+F)/dn-.5;
        X=Math.max(0,Math.min(SW-1.001,X));Y=Math.max(0,Math.min(SH-1.001,Y));const xi=X|0,yi=Y|0,fx=X-xi,fy=Y-yi,i00=(yi*SW+xi)*4,i10=i00+4,i01=i00+SW*4,i11=i01+4,o=(y*w+x)*4;
        for(let k=0;k<3;k++)O[o+k]=S[i00+k]*(1-fx)*(1-fy)+S[i10+k]*fx*(1-fy)+S[i01+k]*(1-fx)*fy+S[i11+k]*fx*fy;O[o+3]=255}}
      ox.putImageData(od,0,0);return out}
    let Q=order(autoQuad(cv));
    const ov=document.createElement('div');ov.id='dsCrop';
    const ic=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
    ov.innerHTML='<div class="dcT"><button type="button" data-a="back" aria-label="Back">‹</button><b>Crop</b></div><div class="dcS"><canvas></canvas><svg class="dcP"><polygon/></svg></div><div class="dcB"><button type="button" data-a="rl">'+ic('<path d="M4 12a8 8 0 108-8H8M11 1L8 4l3 3"/>')+'<span>Rotate L</span></button><button type="button" data-a="rr">'+ic('<path d="M20 12a8 8 0 11-8-8h4M13 1l3 3-3 3"/>')+'<span>Rotate R</span></button><button type="button" data-a="nc">'+ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')+'<span>No Crop</span></button><button type="button" class="pri" data-a="next"><span>Next ›</span></button></div>';
    document.body.appendChild(ov);
    const st=ov.querySelector('.dcS'),cn=ov.querySelector('canvas'),sv=ov.querySelector('svg'),pg=ov.querySelector('polygon');let sc=1,hs=[];
    for(let i=0;i<8;i++){const d=document.createElement('i');d.className='dcH'+(i>3?' m':'');d.dataset.i=i;st.appendChild(d);hs.push(d)}
    const mids=()=>[0,1,2,3].map(i=>{const a=Q[i],b=Q[(i+1)%4];return[(a[0]+b[0])/2,(a[1]+b[1])/2]});
    function layout(){const sw=st.clientWidth-20,sh=st.clientHeight-20;sc=Math.min(sw/cv.width,sh/cv.height);const dw=Math.round(cv.width*sc),dh=Math.round(cv.height*sc);
      cn.width=cv.width;cn.height=cv.height;cn.getContext('2d').drawImage(cv,0,0);cn.style.cssText='width:'+dw+'px;height:'+dh+'px';
      const ox=(st.clientWidth-dw)/2,oy=(st.clientHeight-dh)/2;sv.style.cssText='left:'+ox+'px;top:'+oy+'px;width:'+dw+'px;height:'+dh+'px';cn.style.left=ox+'px';cn.style.top=oy+'px';sv.setAttribute('viewBox','0 0 '+dw+' '+dh);st._o=[ox,oy];draw()}
    function draw(){const [ox,oy]=st._o,M=mids(),all=Q.concat(M);pg.setAttribute('points',Q.map(p=>(p[0]*sc)+','+(p[1]*sc)).join(' '));all.forEach((p,i)=>{hs[i].style.left=(ox+p[0]*sc)+'px';hs[i].style.top=(oy+p[1]*sc)+'px'})}
    let drag=null;
    st.addEventListener('pointerdown',e=>{const h=e.target.closest('.dcH');if(!h)return;e.preventDefault();try{h.setPointerCapture(e.pointerId)}catch(_){}drag={i:+h.dataset.i,x:e.clientX,y:e.clientY,q:Q.map(p=>p.slice())}});
    st.addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();const dx=(e.clientX-drag.x)/sc,dy=(e.clientY-drag.y)/sc,cl=(v,m)=>Math.max(0,Math.min(m,v)),i=drag.i;
      if(i<4)Q[i]=[cl(drag.q[i][0]+dx,cv.width),cl(drag.q[i][1]+dy,cv.height)];
      else{const a=i-4,b=(a+1)%4;Q[a]=[cl(drag.q[a][0]+dx,cv.width),cl(drag.q[a][1]+dy,cv.height)];Q[b]=[cl(drag.q[b][0]+dx,cv.width),cl(drag.q[b][1]+dy,cv.height)]}draw()});
    const up=()=>{drag=null};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
    const rot=dir=>{const n=mk(cv.height,cv.width),x=n.getContext('2d'),Wo=cv.width,Ho=cv.height;x.translate(n.width/2,n.height/2);x.rotate(dir*Math.PI/2);x.drawImage(cv,-Wo/2,-Ho/2);
      Q=order(Q.map(p=>dir>0?[Ho-p[1],p[0]]:[p[1],Wo-p[0]]));cv=n;layout()};
    const fin=v=>{removeEventListener('resize',layout);ov.remove();done(v)};
    ov.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
      if(a==='back')return fin(null);if(a==='rl')return rot(-1);if(a==='rr')return rot(1);
      if(a==='nc')return fin(file);
      if(a==='next'){b.disabled=true;await new Promise(r=>setTimeout(r,30));try{const o=warp(cv,Q),bl=await new Promise(ok=>o.toBlob(ok,'image/jpeg',.92));fin(bl?new File([bl],((file.name||'photo').replace(/\.\w+$/,'')||'photo')+'.jpg',{type:'image/jpeg'}):file)}catch(er){fin(file)}}});
    addEventListener('resize',layout);requestAnimationFrame(layout);
  })}
  const TITLE={qr:'QR code',id:'ID card',photo:'Photo',barcode:'Barcode'};
  async function gotImg(f,k,orig){
    if(k==='photo'){const g=await dsCrop(f);if(!g)return;f=g}
    pv.kind=k;pv.file=f;pv.web=false;pv.text='';pv.ocr='';pv.cv=null;
    if(pv.url){try{URL.revokeObjectURL(pv.url)}catch(_){}pv.url=''}
    pvOpen(TITLE[k]||'Photo','');
    if(k==='qr'||k==='barcode'){const c=await pvImgEdit(f,k);if(c){const out=document.createElement('div');out.className='pvqr';out.id='pvQrOut';$('pvBody').appendChild(out);await pvQrScan(k,c)}try{const bm=await createImageBitmap(f),t=document.createElement('canvas');t.width=60;t.height=Math.max(1,Math.round(60*bm.height/bm.width));t.getContext('2d').drawImage(bm,0,0,t.width,t.height);const rf=orig||f;if(orig){const b2=await createImageBitmap(orig);t.height=Math.max(1,Math.round(60*b2.height/b2.width));t.getContext('2d').drawImage(b2,0,0,t.width,t.height)}addRecent({type:'img',name:rf.name,blob:rf,thumb:t.toDataURL('image/jpeg',.6)})}catch(_){}return}
    const r=await pvImgEdit(f,k);
    try{const bm=await createImageBitmap(f),t=document.createElement('canvas');t.width=60;t.height=Math.max(1,Math.round(60*bm.height/bm.width));t.getContext('2d').drawImage(bm,0,0,t.width,t.height);addRecent({type:'img',name:f.name,blob:f,thumb:t.toDataURL('image/jpeg',.6)})}catch(_){addRecent({type:'img',name:f.name,blob:f})}
    return r;
  }
  const onImg=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;gotImg(f,pv.kind&&TITLE[pv.kind]?pv.kind:'photo')};

  /* ---------- in-app camera (screenshot-style scanner) ---------- */
  const cam={ui:null,stream:null,mode:'photo',timer:0,busy:false};
  function camBuild(){
    if(cam.ui)return;
    const d=document.createElement('div');d.id='scanCam';
    d.innerHTML='<div class="scT"><button type="button" data-c="x" aria-label="Close">✕</button><b id="camT">Photo</b><button type="button" data-c="fl" id="camFl" aria-label="Flash" style="visibility:hidden">⚡</button></div>'+
    '<div class="scV"><video playsinline muted autoplay></video><div class="scG" id="camGd"></div><div class="scH" id="camH"></div></div>'+
    '<div class="scM"><button type="button" data-m="photo">Photo</button><button type="button" data-m="id">ID card</button><button type="button" data-m="qr">QR code</button><button type="button" data-m="barcode">Barcode</button></div>'+
    '<div class="scB"><span class="scL"><button type="button" class="scTh" id="camTh" data-c="th" aria-label="Last photo"><i>🖼</i></button></span><button type="button" class="scS" data-c="sh" aria-label="Capture"></button><button type="button" class="scL" data-c="gal"><i>🖼</i>Gallery / Files</button></div>';
    document.body.appendChild(d);cam.ui=d;cam.v=d.querySelector('video');
    d.onclick=e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.m){camMode(b.dataset.m);return}
      const c=b.dataset.c;
      if(c==='x')camClose();
      if(c==='sh')camSnap();
      if(c==='th'){camThOpen();return}
      if(c==='gal'){const k=cam.mode;camClose();pv.kind=k;(k==='qr'||k==='barcode'?$('pvQrIn'):$('pvImgIn')).click()}
      if(c==='fl'){const t=cam.stream&&cam.stream.getVideoTracks()[0];if(!t)return;cam.torch=!cam.torch;t.applyConstraints({advanced:[{torch:cam.torch}]}).catch(()=>{});b.style.opacity=cam.torch?1:.6}};
  }
  async function camThRefresh(){
    const b=$('camTh');if(!b)return;
    try{const all=await rAll(),r=all.find(x=>x.type==='img'&&(x.blob||x.thumb));
      if(cam.thUrl){try{URL.revokeObjectURL(cam.thUrl)}catch(_){}cam.thUrl=''}
      if(r){const u=r.blob?(cam.thUrl=URL.createObjectURL(r.blob)):r.thumb;b.style.backgroundImage='url("'+u+'")';b.classList.add('has');b.firstChild.style.display='none'}
      else{b.style.backgroundImage='';b.classList.remove('has');b.firstChild.style.display=''}}catch(e){}
  }
  async function camThOpen(){
    try{const all=await rAll(),r=all.find(x=>x.type==='img'&&x.blob);
      if(r){camClose();openV(new File([r.blob],r.name,{type:r.blob.type}));return}}catch(e){}
    const k=cam.mode;camClose();pv.kind=k;(k==='qr'||k==='barcode'?$('pvQrIn'):$('pvImgIn')).click();
  }
  function camMode(k){
    cam.mode=k;
    cam.ui.querySelectorAll('.scM button').forEach(b=>b.classList.toggle('on',b.dataset.m===k));
    $('camT').textContent=TITLE[k];
    const g=$('camGd');
    if(k==='id'){g.style.display='block';g.style.aspectRatio='1.586';g.style.height='';g.style.left=g.style.right='4%'}
    else if(k==='qr'){g.style.display='block';g.style.aspectRatio='1';g.style.left=g.style.right='5%'}
    else if(k==='barcode'){g.style.display='block';g.style.aspectRatio='2.4';g.style.left=g.style.right='4%'}
    else g.style.display='none';
    $('camH').textContent={photo:'Tap the white button to take a picture',id:'Fit the ID card inside the frame',qr:'Point at a QR code — it is read automatically',barcode:'Point at a barcode — it is read automatically'}[k];
    camScan();
  }
  function camBox(){ // frame rectangle in video pixels (object-fit:cover mapping)
    const v=cam.v,vw=v.videoWidth,vh=v.videoHeight,R=v.getBoundingClientRect(),G=$('camGd').getBoundingClientRect(),sc=Math.max(R.width/vw,R.height/vh),ox=(R.width-vw*sc)/2,oy=(R.height-vh*sc)/2;
    let sx=Math.max(0,(G.left-R.left-ox)/sc),sy=Math.max(0,(G.top-R.top-oy)/sc);
    return {sx,sy,sw:Math.min(vw-sx,G.width/sc),sh:Math.min(vh-sy,G.height/sc)}}
  function camScan(){
    clearInterval(cam.timer);cam.timer=0;
    if((cam.mode!=='qr'&&cam.mode!=='barcode')||!('BarcodeDetector' in window))return;
    let det;try{det=new BarcodeDetector(cam.mode==='qr'?{formats:['qr_code']}:undefined)}catch(e){try{det=new BarcodeDetector()}catch(_){return}}
    cam.timer=setInterval(async()=>{if(cam.busy||!cam.v.videoWidth)return;cam.busy=true;
      try{let src=cam.v;if(cam.mode==='qr'||cam.mode==='barcode'){const b=camBox(),cc=document.createElement('canvas');cc.width=Math.max(1,Math.round(b.sw));cc.height=Math.max(1,Math.round(b.sh));cc.getContext('2d').drawImage(cam.v,b.sx,b.sy,b.sw,b.sh,0,0,cc.width,cc.height);src=cc}const r=await det.detect(src);if(r.length){clearInterval(cam.timer);try{navigator.vibrate&&navigator.vibrate(60)}catch(_){}camSnap()}}catch(e){}cam.busy=false},450)
  }
  function camClose(){
    clearInterval(cam.timer);cam.timer=0;
    if(cam.stream){cam.stream.getTracks().forEach(t=>t.stop());cam.stream=null}
    if(cam.ui){cam.ui.style.display='none';cam.v.srcObject=null}
    cam.torch=false;
  }
  async function camSnap(){
    const v=cam.v;if(!v.videoWidth)return;
    const k=cam.mode,vw=v.videoWidth,vh=v.videoHeight,c=document.createElement('canvas');
    let sx=0,sy=0,sw=vw,sh=vh,box=null;
    if(k==='id'||k==='qr'||k==='barcode'){ // crop to the on-screen frame (object-fit:cover mapping)
      box=camBox();sx=box.sx;sy=box.sy;sw=box.sw;sh=box.sh;
    }
    c.width=Math.round(sw);c.height=Math.round(sh);c.getContext('2d').drawImage(v,sx,sy,sw,sh,0,0,c.width,c.height);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));
    const orig=null; // box-er bhitorer chhobi-i preview ar Recent-e jay
    if(box&&k!=='id'){const fc=document.createElement('canvas');fc.width=vw;fc.height=vh;fc.getContext('2d').drawImage(v,0,0);const fb=await new Promise(r=>fc.toBlob(r,'image/jpeg',.92));orig=new File([fb],k+' full '+stamp()+'.jpg',{type:'image/jpeg'})}
    camClose();
    gotImg(new File([blob],(k==='id'?'ID card':k==='photo'?'Photo':k)+' '+stamp()+'.jpg',{type:'image/jpeg'}),k,orig);
  }
  async function openCam(k){
    if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){pv.kind=k;$('pvCamIn').click();return}
    camBuild();cam.ui.style.display='flex';camMode(k);camThRefresh();
    try{
      cam.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
      cam.v.srcObject=cam.stream;await cam.v.play().catch(()=>{});
      const t=cam.stream.getVideoTracks()[0],cp=t.getCapabilities?t.getCapabilities():{};$('camFl').style.visibility=cp.torch?'visible':'hidden';
      camScan();
    }catch(e){camClose();pv.kind=k;note('Camera not available here — opening the phone camera.');$('pvCamIn').click()}
  }
  window.pvOpenCam=openCam;

  /* ---------- photo editor + OCR ---------- */
  function fileB64(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=no;r.readAsDataURL(f)})}
  async function outFile(f,share){
    const A=window.Android,b=await fileB64(f);
    if(share){
      if(A&&A.shareFile){A.shareFile(f.name,f.type,b);return}
      try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e&&e.name==='AbortError')return}
    }
    if(A&&A.save){A.save(f.name,f.type,b);note('Saved: '+f.name);return}
    const u=URL.createObjectURL(f),a=document.createElement('a');a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);note('Saved: '+f.name);
  }
  async function peBack(ef,k){
    pv.file=ef;pvOpen(TITLE[k]||'Photo','');pv.file=ef;
    const c=await pvImgEdit(ef,k);
    if(c&&(k==='qr'||k==='barcode')){const out=document.createElement('div');out.className='pvqr';out.id='pvQrOut';$('pvBody').appendChild(out);await pvQrScan(k,c)}
    return c}
  function ibar(){
    let b=$('pvImgBar');if(b)return b;
    b=document.createElement('div');b.id='pvImgBar';
    b.innerHTML=BL.map(a=>'<button type="button" data-i="'+a[0]+'"'+(a[0]==='edt'?' class="edtb"':'')+(a[0]==='scn'?' style="display:none"':'')+'>'+SV(BI[a[0]])+'<small>'+a[1]+'</small></button>').join('')+
    '<span class="sub" id="pvExS"><button data-i="x-jpg"><span>JPG</span></button><button data-i="x-png"><span>PNG</span></button><button data-i="x-pdf"><span>PDF</span></button><button data-i="x-shr"><span>Share</span></button></span>'+
    '<span class="sub" id="pvSub"><input type="color" id="pvCo" value="#dd0000"><input type="text" id="pvTx" placeholder="Text to add"></span>';
    $('pvFmt').after(b);return b;
  }
  const cvCopy=c=>{const n=document.createElement('canvas');n.width=c.width;n.height=c.height;n.getContext('2d').drawImage(c,0,0);return n};
  async function pvImgEdit(f,k){
    const body=$('pvBody');body.innerHTML='<div class="mut">Loading…</div>';
    let src;
    try{src=await createImageBitmap(f)}catch(e){try{src=await new Promise((ok,no)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=u})}catch(e2){}}
    if(!src){body.innerHTML='';const im=window.__showImg(body,f,f.name||'');pv.url=im.dataset.u||'';return null}
    const W=src.width||src.naturalWidth,H=src.height||src.naturalHeight,kk=Math.min(1,2600/Math.max(W,H));
    const c=document.createElement('canvas');c.width=Math.round(W*kk);c.height=Math.round(H*kk);c.getContext('2d').drawImage(src,0,0,c.width,c.height);
    body.innerHTML='';body.classList.add('pvimg');c.style.cssText='max-width:100%;height:auto;display:block;margin:0 auto 8px;background:#fff;border-radius:6px;touch-action:auto';body.appendChild(c);
    pv.cv=c;pv.kind=k;
    const bar=ibar();bar.style.display='flex';if(k==='photo'||k==='id')navAuto(true);
    {const sc=bar.querySelector('[data-i=scn]');if(sc)sc.style.display=(k==='qr'||k==='barcode')?'':'none';const es=$('pvExS');if(es)es.style.display='none';const eb=bar.querySelector('[data-i=exp]');if(eb)eb.classList.remove('on')}
    const isQ=(k==='qr'||k==='barcode'),rescan=()=>{if(isQ)setTimeout(()=>pvQrScan(k,c),60)};
    const base=((f.name||'photo').replace(/\.\w+$/,'')||'photo').replace(/[\\/:*?"<>|]+/g,'_');
    pvFit();
    const ie={c,st:[],mode:'',dn:0};
    const sync=()=>{c.toBlob(bl=>{if(bl){pv.file=new File([bl],(f.name||'photo').replace(/\.\w+$/,'')+(/\.jpe?g$/i.test(f.name||'')?'':'')+'.jpg',{type:'image/jpeg'})}},'image/jpeg',.92)};
    const push=()=>{ie.st.push(cvCopy(c));if(ie.st.length>10)ie.st.shift()};
    const setMode=m=>{ie.mode=(ie.mode===m?'':m);bar.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.i===ie.mode));
      c.style.touchAction=['pen','crop','ers'].includes(ie.mode)?'none':'auto';$('pvSub').style.display=(ie.mode==='pen'||ie.mode==='txt')?'flex':'none';$('pvTx').style.display=ie.mode==='txt'?'':'none';
      note({pen:'Draw with your finger.',crop:'Drag a box to crop.',ers:'Drag a box to erase.',txt:'Type text, then tap where to put it.'}[ie.mode]||'')};
    const levels=fn=>{push();const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4)fn(a,i);x.putImageData(d,0,0);sync()};
    const clamp=v=>v<0?0:v>255?255:v;
    const pt=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
    let s0,snap;const x=()=>c.getContext('2d');
    c.onpointerdown=e=>{const m=ie.mode;if(!m)return;e.preventDefault();s0=pt(e);const col=$('pvCo').value,ctx=x();
      if(m==='txt'){push();ctx.fillStyle=col;ctx.font='bold '+Math.round(c.width/26)+'px sans-serif';ctx.textBaseline='middle';ctx.fillText($('pvTx').value||'Text',s0[0],s0[1]);sync();return}
      try{c.setPointerCapture(e.pointerId)}catch(_){}
      ie.dn=1;push();snap=ctx.getImageData(0,0,c.width,c.height);
      if(m==='pen'){ctx.strokeStyle=col;ctx.lineWidth=Math.max(3,c.width/220);ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(s0[0],s0[1]);ctx.lineTo(s0[0]+.1,s0[1]);ctx.stroke()}};
    c.onpointermove=e=>{if(!ie.dn)return;const q=pt(e),ctx=x();
      if(ie.mode==='pen'){ctx.lineTo(q[0],q[1]);ctx.stroke()}else{ctx.putImageData(snap,0,0);ctx.save();ctx.setLineDash([12,8]);ctx.lineWidth=Math.max(2,c.width/300);ctx.strokeStyle='#07f';ctx.strokeRect(s0[0],s0[1],q[0]-s0[0],q[1]-s0[1]);ctx.restore()}};
    c.onpointerup=e=>{if(!ie.dn)return;ie.dn=0;if(ie.mode==='pen'){sync();return}
      const ctx=x();ctx.putImageData(snap,0,0);const q=pt(e),X=Math.max(0,Math.min(s0[0],q[0])),Y=Math.max(0,Math.min(s0[1],q[1])),Wd=Math.min(c.width-X,Math.abs(q[0]-s0[0])),Hd=Math.min(c.height-Y,Math.abs(q[1]-s0[1]));
      if(Wd<8||Hd<8){ie.st.pop();return}
      if(ie.mode==='ers'){let r=0,g=0,bl=0;const ps=[[X-4,Y-4],[X+Wd+4,Y-4],[X-4,Y+Hd+4],[X+Wd+4,Y+Hd+4],[X+Wd/2,Y-4],[X+Wd/2,Y+Hd+4],[X-4,Y+Hd/2],[X+Wd+4,Y+Hd/2]];
        ps.forEach(a=>{const d=ctx.getImageData(Math.max(0,Math.min(c.width-1,a[0]|0)),Math.max(0,Math.min(c.height-1,a[1]|0)),1,1).data;r+=d[0];g+=d[1];bl+=d[2]});ctx.fillStyle='rgb('+(r/8|0)+','+(g/8|0)+','+(bl/8|0)+')';ctx.fillRect(X,Y,Wd,Hd);sync()}
      if(ie.mode==='crop'){const d=ctx.getImageData(X,Y,Wd,Hd);c.width=Wd|0;c.height=Hd|0;x().putImageData(d,0,0);sync();setMode('crop');rescan();pvFit()}};
    const openEd=async(tool,x)=>{
      try{
        const bl=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.95));if(!bl){note('Could not open the editor.');return}
        window.__peOpen(new File([bl],base+'.jpg',{type:'image/jpeg'}),Object.assign({tool:tool||''},x||{},{
          onUse:async ef=>{window.__peClose();await peBack(ef,k)},
          onOcr:async ef=>{window.__peClose();const cc=await peBack(ef,k);if(cc)runOcr(cc)},
          onSave:ef=>outFile(ef,false)}));
      }catch(er){note('Editor failed: '+(er&&er.message||er))}};
    bar.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const i=b.dataset.i;
      if(i==='crop'&&isQ){setMode('crop');return} // QR/Barcode: instant in-place crop, no editor to load
      if(i==='crop'||i==='pen'){openEd(i);return}
      if(['ers','txt'].includes(i)){setMode(i);return}
      if(i==='rot'){openEd('rot');return}
      if(i==='rotq'){push();const n=document.createElement('canvas');n.width=c.height;n.height=c.width;const q=n.getContext('2d');q.translate(n.width/2,n.height/2);q.rotate(Math.PI/2);q.drawImage(c,-c.width/2,-c.height/2);c.width=n.width;c.height=n.height;x().drawImage(n,0,0);sync();rescan();return}
      if(i==='mag'){levels((a,j)=>{a[j]=clamp((a[j]-128)*1.35+138);a[j+1]=clamp((a[j+1]-128)*1.35+138);a[j+2]=clamp((a[j+2]-128)*1.35+138)});rescan();return}
      if(i==='bw'){levels((a,j)=>{const g=clamp((.3*a[j]+.59*a[j+1]+.11*a[j+2]-128)*1.7+165);a[j]=a[j+1]=a[j+2]=g});rescan();return}
      if(i==='undo'){const p=ie.st.pop();if(p){c.width=p.width;c.height=p.height;x().drawImage(p,0,0);sync();rescan()}return}
      if(i==='ocr'){openEd('ocr',{auto:1});return}
      if(i==='edt'){advOpen({c,k,base,openEd});return}
      if(i==='scn'){pvQrScan(k,c);return}
      if(i==='exp'){const es=$('pvExS'),on=es.style.display!=='flex';es.style.display=on?'flex':'none';b.classList.toggle('on',on);pvFit();if(on)setTimeout(()=>{bar.scrollTo?bar.scrollTo({left:bar.scrollWidth,behavior:'smooth'}):0},50);return}
      if(i==='sav'||i.indexOf('x-')===0){
        const fmt=i==='sav'?'jpg':i.slice(2);
        try{
          if(fmt==='pdf'){
            await need('jspdf');const J=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;if(!J){note('PDF tool not loaded.');return}
            const o=c.width>=c.height?'l':'p',doc=new J({orientation:o,unit:'pt',format:[c.width*.75,c.height*.75]});
            doc.addImage(c.toDataURL('image/jpeg',.92),'JPEG',0,0,c.width*.75,c.height*.75);
            const ab=doc.output('arraybuffer');await outFile(new File([ab],base+'.pdf',{type:'application/pdf'}),false);return}
          const type=fmt==='png'?'image/png':'image/jpeg',ext=fmt==='png'?'png':'jpg';
          const bl=await new Promise(ok=>c.toBlob(ok,type,.92));if(!bl){note('Could not save.');return}
          await outFile(new File([bl],base+'-edited.'+ext,{type}),fmt==='shr');
        }catch(er){note('Save failed: '+(er&&er.message||er))}
      }};
    return c;
  }
  function loadScript(u){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('Could not load the OCR engine. Connect to the internet once.'));document.head.appendChild(s)})}
  async function runOcr(c){
    const body=$('pvBody');let p=$('pvOcr');
    if(!p){p=document.createElement('div');p.id='pvOcr';p.className='pvocr';
      p.innerHTML='<div class="row"><b>OCR text</b><select id="pvLang"><option value="eng">English</option><option value="ben+eng">বাংলা + English</option><option value="ben">বাংলা</option></select><button type="button" class="alt sm" id="pvOcrGo">Read again</button><button type="button" class="alt sm" id="pvOcrCp">Copy</button><button type="button" class="sm" id="pvOcrUse">Use ➤</button></div><div class="mut" id="pvOcrSt"></div><textarea id="pvOcrTx" placeholder="Text from the photo appears here. You can edit it."></textarea>';
      body.appendChild(p);
      $('pvOcrGo').onclick=()=>runOcr(pv.cv);
      $('pvLang').onchange=()=>runOcr(pv.cv);
      $('pvOcrTx').oninput=()=>{pv.ocr=pv.text=$('pvOcrTx').value};
      $('pvOcrCp').onclick=()=>{const t=$('pvOcrTx').value;if(t.trim())copyTxt(t);else note('Nothing to copy.')};
      $('pvOcrUse').onclick=()=>{const t=$('pvOcrTx').value;if(!t.trim()){note('No text yet.');return}pasteData(t);pvClose();setTab('show')};
    }
    try{p.scrollIntoView({block:'nearest'})}catch(_){}
    const st=$('pvOcrSt');st.textContent='Starting OCR…';
    try{
      if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
      const r=await Tesseract.recognize(cvCopy(c),$('pvLang').value,{logger:m=>{if(m&&m.status)st.textContent=(m.status.replace(/_/g,' '))+(m.progress?' '+Math.round(m.progress*100)+'%':'')}});
      const t=(r.data.text||'').trim();$('pvOcrTx').value=t;pv.ocr=pv.text=t;st.textContent=t?'Done. Edit the text if needed, then Copy or Use ➤.':'No text found. Try Magic or B&W, or crop closer.';
    }catch(e){st.textContent='OCR failed: '+(e&&e.message||e)}
  }
  $('pvImgIn').onchange=onImg;$('pvCamIn').onchange=onImg;
  async function qrHas(c,k){try{if('BarcodeDetector' in window){const r=await new BarcodeDetector(k==='barcode'?undefined:{formats:['qr_code']}).detect(c);if(r.length)return true}}catch(_){}try{if(k!=='barcode'&&await offlineQr(c))return true}catch(_){}return false}
  async function qrPickFile(f,k){
    if(/pdf/i.test(f.type||'')||/\.pdf$/i.test(f.name||'')){
      try{
        note('Reading PDF…');
        const pdf=await (await need('pdf'),pdfjsLib).getDocument({data:await f.arrayBuffer()}).promise;let first=null;
        for(let i=1;i<=Math.min(pdf.numPages,12);i++){
          const pg=await pdf.getPage(i),vp=pg.getViewport({scale:2}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
          await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
          const bl=await new Promise(ok=>c.toBlob(ok,'image/png')),ff=new File([bl],(f.name||'file').replace(/\.pdf$/i,'')+'-p'+i+'.png',{type:'image/png'});
          if(!first)first=ff;
          if(await qrHas(c,k)){note('');gotImg(ff,k);return}
        }
        note('');if(first)gotImg(first,k);
      }catch(e){note('This PDF could not be read.')}
      return}
    gotImg(f,k)}
  $('pvQrIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;qrPickFile(f,pv.kind==='barcode'?'barcode':'qr')};
  function qrLinks(out,t){
    const T=String(t).trim(),sch=T.match(/^([a-z][a-z0-9+.-]{1,20}):/i);
    if(sch&&!/^https?$/i.test(sch[1])&&!/\s/.test(T)){ // FIDO:/ (passkey), mailto:, tel:, geo: ... -> let Android open it
      const b2=document.createElement('button');b2.type='button';b2.className='alt sm';b2.style.cssText='margin-top:8px;text-align:left;white-space:normal;color:var(--ac);font-weight:700';
      b2.textContent='▶ Open ('+sch[1].toUpperCase()+')';
      b2.onclick=()=>{if(window.Android&&Android.openUri)Android.openUri(T);else location.href=T};out.appendChild(b2);return}
    const m=T.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi);if(!m)return;
    const box=document.createElement('div');box.style.cssText='display:flex;flex-direction:column;gap:6px;margin-top:8px';
    [...new Set(m)].forEach(u=>{const b=document.createElement('button');b.type='button';b.className='alt sm';b.style.cssText='text-align:left;word-break:break-all;white-space:normal;color:var(--ac);text-decoration:underline';b.textContent='🔗 '+u;
      b.onclick=()=>{$('urlIn').value=u;$('urlGo').click()};box.appendChild(b)});
    out.appendChild(box)}
  // web page
  const b64text=b=>{const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder('utf-8').decode(u)};
  let seq=0;const cbs={};
  window.__urlRes=(id,ok,p)=>{const c=cbs[id];delete cbs[id];if(c)c(ok,b64text(p))};
  const getPage=u=>new Promise((res,rej)=>{
    if(window.Android&&window.Android.fetchUrl){const id=++seq;cbs[id]=(ok,t)=>ok?res(t):rej(new Error(t));window.Android.fetchUrl(u,String(id));return}
    const tryF=[u,'https://corsproxy.io/?'+encodeURIComponent(u),'https://api.allorigins.win/raw?url='+encodeURIComponent(u),'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)];
    (async()=>{let er;for(const x of tryF){try{const r=await fetch(x);if(!r.ok)throw new Error('HTTP '+r.status);const t=await r.text();if(t.trim())return res(t)}catch(e){er=e}}rej(er||new Error('blocked'))})();
  });
  function cleanHtml(html){
    const d=new DOMParser().parseFromString(html,'text/html');
    d.querySelectorAll('script,style,link,meta,iframe,object,embed,noscript,svg,canvas,video,audio,form,button,input,select,textarea,nav,footer,aside,img,picture,head').forEach(e=>e.remove());
    d.querySelectorAll('*').forEach(e=>{[...e.attributes].forEach(a=>{if(a.name!=='colspan'&&a.name!=='rowspan')e.removeAttribute(a.name)})});
    return d.body?d.body.innerHTML:'';
  }
  window.__browserSend=(u,t)=>{t=String(t||'').trim();if(!t){note('Nothing to send.');return}try{if(window.__prWaiting&&window.__prWaiting()){window.__prGot(t);return}pasteData(t);pvClose();setTab('show')}catch(e){note('Send failed: '+(e.message||e))}};
  async function dsSelStart(){try{await need('sel');const c=$('pvWebC');if(!c)return;
    window.DSSel.init({root:c,onMode:(on)=>{const f=$('pvFr');c.style.display=on?'block':'none';if(f)f.style.display=on?'none':''},send:(t)=>window.__browserSend(location.href,t),share:(t)=>{const A=window.Android;if(A&&A.shareText)A.shareText(t);else if(navigator.share)navigator.share({text:t}).catch(()=>{});else copyTxt(t)},openUrl:(u)=>window.open(u,'_blank')})}catch(e){}}
  async function pvWeb(){
    let u=$('urlIn').value.trim();if(!u)return;
    if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(u))u=(/\s/.test(u)||u.indexOf('.')<0)?'https://www.google.com/search?q='+encodeURIComponent(u):'https://'+u;
    if(window.Android&&window.Android.openBrowser){
      try{addRecent({type:'web',name:new URL(u).hostname.replace(/^www\./,''),url:u})}catch(e){}
      try{window.Android.openBrowser(u);return}catch(e){}
    }
    const vi=vidInfo(u);if(vi){pvVideo(u,vi);return}
    pv.kind='web';pv.file=null;pv.web=false;pvOpen(u,'<div class="mut">Loading page…</div>');
    try{
      const html=await getPage(u);
      $('pvBody').innerHTML='<div class="pvweb" id="pvWebC" style="display:none"></div><iframe id="pvFr" class="pvfr" sandbox="allow-same-origin"></iframe>';
      $('pvWebC').innerHTML=cleanHtml(html);pv.web=true;pv.text=$('pvWebC').innerText||'';dsSelStart();try{addRecent({type:'web',name:new URL(u).hostname.replace(/^www\./,''),url:u})}catch(e){}
      const dd=new DOMParser().parseFromString(html,'text/html');dd.querySelectorAll('script,iframe,object,embed,noscript,form').forEach(e=>e.remove());dd.querySelectorAll('*').forEach(e=>[...e.attributes].forEach(a=>{if(/^on/i.test(a.name))e.removeAttribute(a.name)}));
      const bs=dd.createElement('base');bs.href=u;dd.head.prepend(bs);$('pvFr').srcdoc='<!doctype html>'+dd.documentElement.outerHTML;
    }catch(x){pv.web=true;pv.text='';
      $('pvBody').innerHTML='<div class="pvweb" id="pvWebC" style="display:none;white-space:pre-wrap;padding:8px"></div><img id="pvShot" alt="" style="width:100%;display:block;background:#fff;border-radius:6px"><div id="pvSN" class="mut" style="padding:6px">Loading page…</div>';
      const im=$('pvShot');im.onload=()=>{$('pvSN').style.display='none'};im.onerror=()=>{im.style.display='none';$('pvSN').style.display='none';$('pvWebC').style.display='block'};
      im.src='https://image.thum.io/get/width/900/noanimate/'+u;
      try{try{addRecent({type:'web',name:new URL(u).hostname.replace(/^www\./,''),url:u})}catch(e){}
        const r=await fetch('https://r.jina.ai/'+u);let t=await r.text();
        t=t.replace(/^\|\s*[-: |]+\|\s*$/gm,'').split('\n').map(l=>/^\|.*\|\s*$/.test(l)?l.replace(/^\|\s*|\s*\|\s*$/g,'').split(/\s*\|\s*/).join('\t'):l).join('\n');
        $('pvWebC').textContent=t;pv.text=t}catch(e2){if(im.style.display==='none')$('pvBody').innerHTML='<div class="mut" style="padding:8px">This site blocks viewing here ('+esc(x.message||x)+'). It will work inside the Android app, or copy the text and use Paste.</div>'}}
  }
  window.pvWeb=pvWeb;
  /* ---------- video links: preview, download, transcript ---------- */
  function vidInfo(u){let x;try{x=new URL(u)}catch(e){return null}
    const h=x.hostname.replace(/^(www|m|mbasic|web|music)\./,'');
    if(h==='youtu.be'){const id=x.pathname.slice(1).split('/')[0];return /^[\w-]{6,}$/.test(id)?{k:'yt',id}:null}
    if(h==='youtube.com'||h==='youtube-nocookie.com'){let id=x.searchParams.get('v');const m=x.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/);if(m)id=m[2];return id&&/^[\w-]{6,}$/.test(id)?{k:'yt',id}:null}
    if(h==='fb.watch')return{k:'fb'};
    if(h==='facebook.com'||h==='fb.com'){if(/\/(watch|reel|reels|videos|share\/[vr])(\/|$)/.test(x.pathname)||x.searchParams.get('v'))return{k:'fb'}}
    if(/\.(mp4|webm|mov|m4v|ogv)$/i.test(x.pathname))return{k:'file'};
    return null}
  window.__vidInfo=vidInfo;
  function pvVideo(u,vi){
    pv.kind='video';pv.file=null;pv.web=false;pv.text='';pv.vurl=u;pv.vi=vi;
    pvOpen({yt:'YouTube',fb:'Facebook video',file:'Video'}[vi.k],'');
    $('pvBox').querySelector('.pvhd').classList.add('vid');
    const body=$('pvBody');body.innerHTML='';
    const box=document.createElement('div');box.className='pvvid'+(vi.k==='fb'?' p':'');
    if(vi.k==='file'){const v=document.createElement('video');v.controls=true;v.playsInline=true;v.src=u;box.appendChild(v)}
    else{const f=document.createElement('iframe');
      f.src=vi.k==='yt'?'https://www.youtube.com/embed/'+vi.id+'?playsinline=1&rel=0':'https://www.facebook.com/plugins/video.php?height=560&show_text=false&width=476&href='+encodeURIComponent(u);
      f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';box.appendChild(f)}
    body.appendChild(box);
    const n=document.createElement('div');n.className='pvvn';n.innerHTML='Not playing? <a href="'+esc(u)+'" target="_blank" rel="noopener">Open the video link</a>. Use ⬇ to download and 📝 for the transcript.';body.appendChild(n);
    const th=vi.k==='yt'?'https://i.ytimg.com/vi/'+vi.id+'/mqdefault.jpg':'';
    try{addRecent({type:'video',name:(vi.k==='yt'?'YouTube ':vi.k==='fb'?'Facebook ':'Video ')+(vi.id||new URL(u).pathname.split('/').filter(Boolean).pop()||''),url:u,thumb:th})}catch(e){}
    pvFit();
  }
  const vpanel=(id,html)=>{let p=$(id);if(!p){p=document.createElement('div');p.id=id;p.className='pvvp';$('pvBody').appendChild(p)}p.innerHTML=html;try{p.scrollIntoView({block:'nearest'})}catch(_){}return p};
  function dlAnchor(url,name){const a=document.createElement('a');a.href=url;a.download=name||'video';a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
  async function vidDownload(){
    const u=pv.vurl,vi=pv.vi;if(!u)return;const A=window.Android;
    if(A&&A.downloadVideo){try{A.downloadVideo(u);note('Download started…');return}catch(e){}}
    if(vi.k==='file'){dlAnchor(u,u.split('/').pop().split('?')[0]);note('Download started…');return}
    let ep='';try{ep=localStorage.getItem('ds_vdl')||''}catch(e){}
    if(!ep){
      const p=vpanel('pvDlP','<b>Download video</b><div class="mut" style="margin:4px 0">A web page cannot download YouTube or Facebook videos by itself. Paste the address of your download server (a Cobalt-compatible API) once. Download only videos you have the right to save.</div><input type="url" id="pvDlEp" placeholder="https://your-server.example/"><div class="row"><button type="button" class="sm" id="pvDlSave">Save &amp; download</button></div>');
      $('pvDlSave').onclick=()=>{const v=$('pvDlEp').value.trim();if(!/^https?:\/\//i.test(v)){note('Enter a full address starting with https://');return}try{localStorage.setItem('ds_vdl',v)}catch(e){}p.remove();vidDownload()};
      return}
    const p=vpanel('pvDlP','<div class="mut" id="pvDlSt">Asking the download server…</div><div class="row"><button type="button" class="alt sm" id="pvDlCh">Change server</button></div>');
    $('pvDlCh').onclick=()=>{try{localStorage.removeItem('ds_vdl')}catch(e){}p.remove();vidDownload()};
    try{
      const r=await fetch(ep,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({url:u,videoQuality:'720',filenameStyle:'basic'})});
      const j=await r.json();
      if(j.url&&['tunnel','redirect','stream','success'].includes(j.status)){$('pvDlSt').textContent='Downloading…';dlAnchor(j.url,j.filename||'video.mp4');return}
      if(j.status==='picker'&&j.picker&&j.picker[0]){dlAnchor(j.picker[0].url,'video.mp4');return}
      $('pvDlSt').textContent='The server could not download this video'+(j.error&&j.error.code?' ('+j.error.code+')':'')+'.';
    }catch(e){$('pvDlSt').textContent='Could not reach the download server: '+(e&&e.message||e)}
  }
  function ytTracks(html){
    const i=html.indexOf('"captionTracks":');if(i<0)return[];
    const j=html.indexOf('[',i);let d=0,ins=false,es=false,k=j;
    for(;k<html.length;k++){const ch=html[k];if(ins){if(es)es=false;else if(ch==='\\')es=true;else if(ch==='"')ins=false;continue}
      if(ch==='"')ins=true;else if(ch==='[')d++;else if(ch===']'){d--;if(!d)break}}
    try{return JSON.parse(html.slice(j,k+1))}catch(e){return[]}}
  const tkName=t=>(t.name&&(t.name.simpleText||(t.name.runs&&t.name.runs.map(r=>r.text).join(''))))||t.languageCode||'Captions';
  const mmss=ms=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
  function capText(raw,stamps){
    let ev=[];
    if(/^\s*\{/.test(raw)){try{ev=(JSON.parse(raw).events||[]).filter(e=>e.segs).map(e=>({t:e.tStartMs||0,x:e.segs.map(g=>g.utf8||'').join('').replace(/\n/g,' ').trim()}))}catch(e){}}
    else{const d=new DOMParser().parseFromString(raw,'text/xml');ev=[...d.getElementsByTagName('text')].map(n=>({t:Math.round(parseFloat(n.getAttribute('start')||0)*1000),x:(n.textContent||'').replace(/\s+/g,' ').trim()}))}
    ev=ev.filter(e=>e.x);
    if(stamps)return ev.map(e=>'['+mmss(e.t)+'] '+e.x).join('\n');
    return ev.map((e,i)=>e.x+((i+1)%12===0?'\n\n':' ')).join('').trim();
  }
  window.__capText=capText;window.__ytTracks=ytTracks;
  async function vidTranscript(){
    const vi=pv.vi;if(!vi)return;
    if(vi.k!=='yt'){vpanel('pvTrP','<b>Transcript</b><div class="mut" style="margin-top:4px">'+(vi.k==='fb'?'Facebook does not share captions with this app, so a transcript is only available for YouTube videos.':'Transcript is available for YouTube videos with captions.')+'</div>');return}
    const p=vpanel('pvTrP','<div class="mut" id="pvTrSt">Getting captions…</div>');
    try{
      const html=await getPage('https://www.youtube.com/watch?v='+vi.id+'&hl=en');
      const tr=ytTracks(html);
      if(!tr.length){$('pvTrSt').textContent=/consent|before you continue/i.test(html)&&!/ytInitialPlayerResponse/.test(html)?'YouTube asked for consent, so captions could not be read. Try inside the Android app.':'This video has no captions to read.';return}
      p.innerHTML='<div class="row"><b>Transcript</b><select id="pvTrLg"></select><label style="font-size:.8rem"><input type="checkbox" id="pvTrTs"> Time</label></div><div class="mut" id="pvTrSt"></div><textarea id="pvTrTx" placeholder="Transcript"></textarea><div class="row"><button type="button" class="alt sm" id="pvTrCp">Copy</button><button type="button" class="sm" id="pvTrUse">Use ➤</button></div>';
      const sel=$('pvTrLg');tr.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=tkName(t)+(t.kind==='asr'?' (auto)':'');sel.appendChild(o)});
      const pref=['bn','en'];let bi=0,bs=1e9;tr.forEach((t,i)=>{const pi=pref.indexOf((t.languageCode||'').slice(0,2));const sc=(pi<0?5:pi)*2+(t.kind==='asr'?1:0);if(sc<bs){bs=sc;bi=i}});sel.value=bi;
      let raw='';
      const show=()=>{const t=capText(raw,$('pvTrTs').checked);$('pvTrTx').value=t;pv.text=t;$('pvTrSt').textContent=t?'':'No text found in these captions.'};
      const load=async()=>{$('pvTrSt').textContent='Loading…';const t=tr[+sel.value];let url=t.baseUrl.replace(/&fmt=\w+/,'')+'&fmt=json3';
        try{raw=await getPage(url);if(!raw.trim())throw 0}catch(e){raw=await getPage(t.baseUrl.replace(/&fmt=\w+/,''))}show()};
      sel.onchange=load;$('pvTrTs').onchange=show;
      $('pvTrTx').oninput=()=>{pv.text=$('pvTrTx').value};
      $('pvTrCp').onclick=()=>{const t=$('pvTrTx').value;if(t.trim())copyTxt(t);else note('Nothing to copy.')};
      $('pvTrUse').onclick=()=>{const t=$('pvTrTx').value;if(!t.trim()){note('No transcript yet.');return}pasteData(t);pvClose();setTab('show')};
      await load();
    }catch(e){const st=$('pvTrSt');if(st)st.textContent='Could not get the transcript: '+(e&&e.message||e)}
  }
  $('pvDl').onclick=vidDownload;$('pvTr').onclick=vidTranscript;

  $('urlGo').onclick=pvWeb;
  $('urlIn').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();pvWeb()}};
  $('urlIn').addEventListener('paste',()=>setTimeout(()=>{if(/^(https?:\/\/|www\.)\S+$/i.test($('urlIn').value.trim()))pvWeb()},60));
  function webText(){
    const fr=$('pvFr');if(fr&&fr.contentWindow){const fs=String(fr.contentWindow.getSelection()||'');if(fs.trim())return fs}
    const sel=window.getSelection?window.getSelection():null,s=sel?String(sel):'';
    if(s.trim()&&sel.anchorNode&&$('pvBody').contains(sel.anchorNode))return s;
    const c=$('pvWebC');if(!c)return '';
    const tb=[...c.querySelectorAll('table')].sort((a,b)=>b.rows.length-a.rows.length);
    if(tb.length&&tb[0].rows.length>1)return [...tb[0].rows].map(r=>[...r.cells].map(x=>x.innerText.trim().replace(/\s+/g,' ')).join('\t')).join('\n');
    return c.innerText||'';
  }
  const curText=()=>pv.kind==='xls'?xsTsv():pv.web?webText():(pv.text||'');
  function copyTxt(t){
    let ok=false;
    try{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(e){}
    if(!ok&&navigator.clipboard){navigator.clipboard.writeText(t).then(()=>note('Copied.'),()=>note('Copy failed.'));return}
    note(ok?'Copied.':'Copy failed.');
  }
  $('pvCopy').onclick=()=>{const t=curText();if(!t.trim()){note('Nothing to copy.');return}copyTxt(t)};
  $('pvShare').onclick=()=>{
    const A=window.Android;
    if(pv.file&&A&&A.shareFile){const r=new FileReader();r.onload=()=>{const b=String(r.result).split(',')[1]||'';A.shareFile(pv.file.name||('file-'+stamp()),pv.file.type||'application/octet-stream',b)};r.readAsDataURL(pv.file);return}
    if(pv.kind==='video'&&!(pv.text||'').trim()&&pv.vurl){const u=pv.vurl;if(A&&A.shareText){A.shareText(u);return}if(navigator.share){navigator.share({text:u}).catch(()=>{});return}copyTxt(u);return}
    const t=curText();if(!t.trim()){note('Nothing to share.');return}
    if(A&&A.shareText){A.shareText(t);return}
    if(navigator.share){navigator.share({text:t}).catch(()=>{});return}
    copyTxt(t);
  };
  let sendDest='show';
  const sendGo=async()=>{
    const k=pv.kind,PJ=!!(window.__prWaiting&&window.__prWaiting());
    /* PJ = Compare > Projected is waiting for data: text goes to the Projected page, files go to the app and the page loads them */
    const PD=t=>{PJ?window.__prGot(t):pasteData(t)},SG=app=>{if(PJ){if(app)window.__prApp()}else setTab(sendDest)};
    try{
      if(k==='pdf'&&pv.file){const et=window.__pdfEditedText();if(et){PD(et);pvClose();SG();return}note('Reading PDF…');await loadAndStore(pv.file);pvClose();SG(1);return}
      if((k==='photo'||k==='id')&&pv.file){
        if(PJ&&!(pv.ocr||'').trim()){note('This photo has no text yet. Tap OCR first, then Send.');return}
        const ot=(pv.ocr||'').trim(),f0=pv.file,ext=((f0.type||'image/jpeg').split('/')[1]||'jpg').replace('jpeg','jpg');
        const f=new File([f0],(k==='id'?'ID card ':'Photo ')+stamp()+'.'+ext,{type:f0.type||'image/jpeg'});
        try{await loadAndStore(f)}catch(e){}
        pvClose();
        if(ot){PD(ot);SG();return}
        setTab('files');note('Saved in Files. Tip: tap OCR in the viewer to read the text.');return;
      }
      if(k==='qr'||k==='barcode'){
        const t=(pv.text||'').trim();if(!t){note('No '+k+' text to send.');return}
        if(/^https?:\/\//i.test(t)){$('urlIn').value=t;pvWeb();return}
        PD(t);pvClose();SG();return;
      }
      if(k==='video'){const t=(pv.text||'').trim();if(!t){note('Tap 📝 to get the transcript first, then Send.');return}PD(t);pvClose();SG();return}
      if(k==='xls'&&pv.file){note('Reading file…');await need('xlsx');await loadAndStore(xsFile());pvClose();SG(1);return}
      if(pv.web){const t=webText();if(!t.trim()){note('Nothing to send. Select some text or open a page with a table.');return}PD(t);pvClose();SG();return}
    }catch(x){note('Send failed: '+(x.message||x))}
  };
  $('pvSend').onclick=()=>{sendDest='show';sendGo()};
  // PDF edit tools
  const PE=()=>[...$('pvBody').querySelectorAll('.pvtl span')];
  function selSpans(){const g=getSelection();if(g.rangeCount&&!g.isCollapsed){const r=g.getRangeAt(0);return PE().filter(x=>r.intersectsNode(x))}const a=document.activeElement;return a&&a.dataset&&a.dataset.p?[a]:[]}
  function nearSpan(e){const t=e.target.closest&&e.target.closest('.pvtl span');if(t)return t;
    const wr=e.target.closest&&e.target.closest('.pvpg');if(!wr)return null;let best=null,bd=1e9;
    wr.querySelectorAll('.pvtl span').forEach(sp=>{const r=sp.getBoundingClientRect();if(!r.width)return;
      const dx=e.clientX<r.left?r.left-e.clientX:e.clientX>r.right?e.clientX-r.right:0,dy=e.clientY<r.top?r.top-e.clientY:e.clientY>r.bottom?e.clientY-r.bottom:0;
      if(dx>12||dy>10)return;const d=dx*dx+dy*dy*2;if(d<bd){bd=d;best=sp}});return best}
  $('pvBody').addEventListener('click',e=>{if(pv.kind!=='pdf')return;const x=nearSpan(e);if(!x)return;
    if(lastSpan&&lastSpan!==x)lastSpan.classList.remove('sel');lastSpan=x;x.classList.add('sel');
    if(editMode){mark(x);x.contentEditable='true';x.focus();const g=getSelection();let r=null;try{r=document.caretRangeFromPoint(e.clientX,e.clientY)}catch(_){}
      if(!(r&&x.contains(r.startContainer))){r=document.createRange();r.selectNodeContents(x);r.collapse(false)}g.removeAllRanges();g.addRange(r)}});
  document.addEventListener('selectionchange',()=>{const m=$('pvSel'),g=getSelection();if(pv.kind!=='pdf'||!g.rangeCount||g.isCollapsed){m.style.display='none';return}const ss=selSpans();if(!ss.length){m.style.display='none';return}lastSel=ss;const b=g.getRangeAt(0).getBoundingClientRect();m.style.display='flex';m.style.left=Math.max(4,Math.min(innerWidth-200,b.left+b.width/2-95))+'px';m.style.top=Math.max(4,b.top-48)+'px'});
  const mark=x=>{x.dataset.ed=1;x.classList.add('ed')};
  $('pvSel').onpointerdown=e=>e.preventDefault();
  $('pvSel').onclick=e=>{const k=e.target.dataset.s;if(!k)return;const ss=lastSel;
    if(k==='c')copyTxt(ss.map(x=>x.textContent).join(' '));
    if(k==='d')ss.forEach(x=>{mark(x);x.textContent=''});
    if(k==='e'){ss.forEach(x=>{mark(x);x.contentEditable='true'});if(ss[0])ss[0].focus()}
    getSelection().removeAllRanges();$('pvSel').style.display='none'};
  const COL=['#000000','#d11a1a','#1565d8','#0a8a3a'];
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#pvFmt [data-f=min],#pvShEd [data-x=mn]');if(!b)return;e.stopPropagation();e.preventDefault();
    const on=document.body.classList.toggle('edmin');document.querySelectorAll('#pvFmt [data-f=min],#pvShEd [data-x=mn]').forEach(x=>{x.textContent=on?'▴':'▾';x.title=on?'Show panel':'Minimize panel'});setTimeout(pvFit,30)},true);
  $('pvFmt').onpointerdown=e=>e.preventDefault();
  $('pvFmt').onclick=e=>{const b=e.target.closest('button');if(!b)return;const f=b.dataset.f;
    if(f==='min')return;
    if(f==='u'){lastSpan=null;if(pv.file)pvPdf(pv.file);return}
    const t=selSpans().length?selSpans():(lastSpan?[lastSpan]:lastSel);
    if(f==='kb'){editMode=!editMode;b.style.background=editMode?'rgba(47,111,228,.2)':'';const tt=$('pvTitle');if(editMode){b.dataset.t=tt.textContent;tt.textContent='✏ Tap text to edit'}else tt.textContent=b.dataset.t||'PDF';if(editMode&&t[0]){mark(t[0]);t[0].contentEditable='true';t[0].focus()}return}
    t.forEach(x=>{mark(x);x.contentEditable='true';
      if(f==='b')x.style.fontWeight=x.style.fontWeight==='700'?'400':'700';
      if(f==='i')x.style.fontStyle=x.style.fontStyle==='italic'?'normal':'italic';
      if(f==='sz')x.style.fontSize=(parseFloat(x.style.fontSize)+1)+'px';
      if(f==='c'){const n=(COL.indexOf(x.dataset.c||COL[0])+1)%COL.length;x.dataset.c=COL[n];x.style.color=COL[n];b.firstChild.style.background=COL[n]}})};
  function pdfText(){const L=[];PE().forEach(x=>{const t=x.textContent.trim();if(!t)return;const y=parseFloat(x.style.top)+parseFloat(x.style.fontSize),pg=+x.dataset.p;let l=L.find(l=>l.p===pg&&Math.abs(l.y-y)<3);if(!l)L.push(l={p:pg,y,c:[]});l.c.push([parseFloat(x.style.left),t])});L.sort((a,b)=>a.p-b.p||a.y-b.y);return L.map(l=>l.c.sort((a,b)=>a[0]-b[0]).map(c=>c[1]).join('\t')).join('\n')}
  window.__pdfEditedText=()=>$('pvBody').querySelector('.pvtl span[data-ed]')?pdfText():'';
  // Recent strip (IndexedDB)
  const idb=()=>new Promise((res,rej)=>{const q=indexedDB.open('dsRecent',1);q.onupgradeneeded=()=>q.result.createObjectStore('r',{keyPath:'id'});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const rAll=async()=>{try{const d=await idb();return await new Promise(r=>{const q=d.transaction('r').objectStore('r').getAll();q.onsuccess=()=>r((q.result||[]).sort((a,b)=>b.ts-a.ts));q.onerror=()=>r([])})}catch(e){return[]}};
  const rTx=async f=>{try{const d=await idb();await new Promise(r=>{const t=d.transaction('r','readwrite');f(t.objectStore('r'));t.oncomplete=r;t.onerror=r})}catch(e){}};
  async function addRecent(o){o.id=o.type+':'+(o.url||o.name)+((!o.url&&o.blob&&o.blob.size!=null)?':'+o.blob.size+':'+(o.blob.lastModified||''):'');o.ts=Date.now();if(o.blob&&o.blob.size>15e6)delete o.blob;
    const old=(await rAll()).find(x=>x.id===o.id);if(old&&!o.thumb&&old.thumb)o.thumb=old.thumb;
    await rTx(st=>st.put(o));if(!(await rAll()).some(x=>x.id===o.id)){delete o.blob;await rTx(st=>st.put(o))}const all=await rAll();if(all.length>30)await rTx(st=>all.slice(30).forEach(x=>st.delete(x.id)));await renderRecent();pvFit()}
  async function renderRecent(){const box=$('pvRecent'),all=await rAll();box.innerHTML='';
    if(!all.length){box.innerHTML='<span class="hint">Recent files, text and websites appear here.</span>';pvFit();return}
    all.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='rc';b.dataset.id=r.id;
      const lab={pdf:'PDF',docx:'DOC',xls:'XLS',txt:'TXT',web:'🌐',img:'🖼',video:'▶'}[r.type]||'FILE';
      b.innerHTML='<span class="th">'+(r.thumb?'<img src="'+r.thumb+'" onerror="this.replaceWith(document.createTextNode(\'▶\'))">':lab)+'</span><em>'+esc(r.name)+'</em><span class="x" data-del="1">✕</span>';box.appendChild(b)});pvFit()}
  $('pvRecent').onclick=async e=>{const b=e.target.closest('.rc');if(!b)return;const r=(await rAll()).find(x=>x.id===b.dataset.id);if(!r)return;
    if(e.target.dataset.del){await rTx(st=>st.delete(r.id));renderRecent();return}
    if(r.type==='web'||r.type==='video'){$('urlIn').value=r.url;pvWeb();return}
    if(r.blob)openV(new File([r.blob],r.name,{type:r.blob.type}))};
  renderRecent();try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
  // Word viewer
  async function pvDocx(f){
    const zip=await (await need('zip'),JSZip).loadAsync(await f.arrayBuffer()),W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',G=(n,t)=>[...n.getElementsByTagNameNS(W,t)];
    const d=new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'),'text/xml');
    const par=p=>G(p,'r').map(r=>{let h=esc(G(r,'t').map(e=>e.textContent).join(''));if(G(r,'b').length)h='<b>'+h+'</b>';if(G(r,'i').length)h='<i>'+h+'</i>';return h}).join('');
    const tbl=t=>'<table>'+G(t,'tr').map(r=>'<tr>'+G(r,'tc').map(c=>'<td>'+G(c,'p').map(par).join(' ')+'</td>').join('')+'</tr>').join('')+'</table>';
    let h='';[...G(d,'body')[0].children].forEach(n=>{if(n.localName==='p')h+='<p>'+par(n)+'</p>';else if(n.localName==='tbl')h+=tbl(n)});
    $('pvBody').innerHTML='<div class="pvweb" id="pvWebC" style="background:#fff;color:#111;padding:10px;border-radius:6px">'+h+'</div>';pv.web=true;pv.text=$('pvWebC').innerText||'';
  }
  const colL=n=>{let t='';n++;while(n>0){const m=(n-1)%26;t=String.fromCharCode(65+m)+t;n=Math.floor((n-1)/26)}return t};
  const XS={names:[],data:[],cur:0,r:-1,c:-1,dirty:false,edit:false,hist:[],redo:[],mode:'fr',cd:0,lf:''};
  function xsRender(keep){
    const A=XS.data[XS.cur]||(XS.data[XS.cur]=[['']]),MAXR=1000,R=Math.min(A.length,MAXR);
    let C=0;for(let i=0;i<R;i++)C=Math.max(C,A[i].length);C=Math.min(Math.max(C,1),60);
    let h='<table class="pvxt"><tr><th class="cn"></th>';
    for(let c=0;c<C;c++)h+='<th class="ch">'+colL(c)+'</th>';h+='</tr>';
    for(let r=0;r<R;r++){h+='<tr><th class="rn">'+(r+1)+'</th>';for(let c=0;c<C;c++)h+='<td data-r="'+r+'" data-c="'+c+'"'+(r===XS.r&&c===XS.c?' class="cs"':'')+(XS.edit?' contenteditable="true"':'')+'>'+esc(String(A[r][c]??''))+'</td>';h+='</tr>'}
    h+='</table>'+(A.length>MAXR?'<div class="mut" style="padding:4px 8px">Showing first '+MAXR+' of '+A.length+' rows (Send brings everything)</div>':'');
    const g=$('pvShBody');if(!g)return;const st=keep?g.scrollTop:0,sl=keep?g.scrollLeft:0;
    g.innerHTML='<div id="pvShIn" style="--z:'+(pv.z||1)+'">'+h+'</div>';g.scrollTop=st;g.scrollLeft=sl;
    $('pvShTabs').innerHTML=XS.names.map((x,j)=>'<button type="button" class="'+(j===XS.cur?'on':'')+'" data-i="'+j+'">'+esc(x)+'</button>').join('');
    $('pvShEd').style.display=XS.edit?'flex':'none';if(!XS.edit)$('pvShFr').style.display='none';
  }
  async function pvSheet(f,e){
    if(typeof XLSX==='undefined')throw new Error('Excel library not available');
    await need('xlsx');const wb=(e==='csv'||e==='tsv')?XLSX.read(await f.text(),{type:'string'}):XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});
    const nm=wb.SheetNames;if(!nm.length)throw new Error('No sheets');
    XS.names=nm.slice();XS.data=nm.map(n=>{const A=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''});return A.length?A:[['']]});
    XS.cur=0;XS.r=XS.c=-1;XS.dirty=false;XS.edit=false;XS.hist=[];XS.redo=[];XS.lf='';
    const body=$('pvBody');body.classList.add('pvxl');
    body.innerHTML='<div id="pvShBody" class="pvweb pvshgrid"></div><div id="pvShFr" class="pvsed" style="display:none"><input id="pvFa"><input id="pvFb" placeholder="Replace with"><button type="button" id="pvFo" data-x="ok">Replace all</button></div><div id="pvShEd" class="pvsed" style="display:none"><button type="button" data-x="mn" title="Minimize panel">▾</button><button type="button" data-x="un" title="Undo">↶</button><button type="button" data-x="re" title="Redo">↷</button><button type="button" data-x="ar">＋Row</button><button type="button" data-x="ac">＋Col</button><button type="button" data-x="dr">−Row</button><button type="button" data-x="dc">−Col</button><button type="button" data-x="dp">⧉ Row</button><button type="button" data-x="cl">⌫ Cell</button><button type="button" data-x="su">A→Z</button><button type="button" data-x="sd">Z→A</button><button type="button" data-x="fr">🔍 Find</button><button type="button" data-x="as">＋Sheet</button><button type="button" data-x="rn">✎ Sheet</button><button type="button" data-x="ds">🗑 Sheet</button></div><div id="pvShTabs" class="pvsht"></div>';
    pv.web=false;pv.text='';xsRender(false);xsAutoFit();
  }
  const snapNow=()=>structuredClone({names:XS.names,data:XS.data,cur:XS.cur});
  function snap(){try{XS.hist.push(snapNow());if(XS.hist.length>30)XS.hist.shift();XS.redo=[]}catch(e){}}
  function xsBar(m){const b=$('pvShFr');if(b.style.display==='flex'&&XS.mode===m){b.style.display='none';return}
    XS.mode=m;b.style.display='flex';$('pvFa').placeholder=m==='fr'?'Find':'New sheet name';$('pvFa').value=m==='rn'?XS.names[XS.cur]:'';
    $('pvFb').style.display=m==='fr'?'':'none';$('pvFb').value='';$('pvFo').textContent=m==='fr'?'Replace all':'Rename'}
  function xsBarOk(){const A=XS.data[XS.cur];
    if(XS.mode==='fr'){const a=$('pvFa').value,bv=$('pvFb').value;if(!a){note('Type the text to find.');return}
      snap();let n=0;A.forEach(r=>{for(let i=0;i<r.length;i++){const v=String(r[i]??'');if(v.includes(a)){r[i]=v.split(a).join(bv);n++}}});
      XS.dirty=true;note(n+' cell(s) changed.');xsRender(true)}
    else{const nn=$('pvFa').value.trim().slice(0,31);if(!nn||XS.names.some((x,j)=>j!==XS.cur&&x===nn)){note('Use a different sheet name.');return}
      snap();XS.names[XS.cur]=nn;XS.dirty=true;$('pvShFr').style.display='none';xsRender(true)}}
  function xsOp(x){
    const A=XS.data[XS.cur];let C=0;A.forEach(r=>{C=Math.max(C,r.length)});
    if(x==='un'||x==='re'){const from=x==='un'?XS.hist:XS.redo,to=x==='un'?XS.redo:XS.hist;
      if(!from.length){note('Nothing to '+(x==='un'?'undo':'redo')+'.');return}
      to.push(snapNow());const o=from.pop();XS.names=o.names;XS.data=o.data;XS.cur=Math.min(o.cur,o.names.length-1);XS.r=XS.c=-1;XS.dirty=true;xsRender(true);return}
    if(x==='fr'||x==='rn'){xsBar(x);return}
    if(x==='ok'){xsBarOk();return}
    const need=k=>{if((k==='r'&&XS.r<0)||(k==='c'&&XS.c<0)||(k==='rc'&&(XS.r<0||XS.c<0))){note('Tap a cell first.');return false}return true};
    if(x==='ar'){snap();A.splice((XS.r<0?A.length-1:XS.r)+1,0,[])}
    else if(x==='ac'){snap();const at=(XS.c<0?C-1:XS.c)+1;A.forEach(r=>{while(r.length<at)r.push('');r.splice(at,0,'')})}
    else if(x==='dr'){if(!need('r'))return;snap();A.splice(XS.r,1);if(!A.length)A.push(['']);XS.r=-1}
    else if(x==='dc'){if(!need('c'))return;snap();A.forEach(r=>r.splice(XS.c,1));XS.c=-1}
    else if(x==='dp'){if(!need('r'))return;snap();A.splice(XS.r+1,0,A[XS.r].slice())}
    else if(x==='cl'){if(!need('rc'))return;snap();A[XS.r][XS.c]=''}
    else if(x==='su'||x==='sd'){if(!need('c'))return;snap();const k=XS.c,d=x==='su'?1:-1,hd=A.shift();
      const nv=v=>{const t=String(v??'').replace(/,/g,'').trim();return t!==''&&!isNaN(+t)?+t:null};
      A.sort((p,q)=>{const a=p[k]??'',b=q[k]??'',na=nv(a),nb=nv(b);if(na!==null&&nb!==null)return(na-nb)*d;return String(a).localeCompare(String(b),undefined,{numeric:true})*d});A.unshift(hd)}
    else if(x==='as'){snap();let n=XS.names.length+1;while(XS.names.includes('Sheet'+n))n++;XS.names.push('Sheet'+n);XS.data.push([['']]);XS.cur=XS.names.length-1;XS.r=XS.c=-1}
    else if(x==='ds'){if(XS.names.length<2){note('A file needs at least one sheet.');return}
      if(!XS.cd){XS.cd=1;note('Tap "Del sheet" again to delete "'+XS.names[XS.cur]+'".');setTimeout(()=>{XS.cd=0},3000);return}
      XS.cd=0;snap();XS.names.splice(XS.cur,1);XS.data.splice(XS.cur,1);XS.cur=Math.max(0,XS.cur-1);XS.r=XS.c=-1;note('')}
    XS.dirty=true;xsRender(true);
  }
  function xsSel(td){const o=$('pvBody').querySelector('td.cs');if(o&&o!==td)o.classList.remove('cs');td.classList.add('cs');XS.r=+td.dataset.r;XS.c=+td.dataset.c}
  function xsTsv(){return (XS.data[XS.cur]||[]).map(r=>Array.from(r,v=>String(v??'').replace(/[\t\r\n]+/g,' ')).join('\t')).join('\n')}
  function xsFile(){
    if(!XS.dirty)return pv.file;
    const wb=XLSX.utils.book_new();
    XS.data.forEach((A,i)=>{const B=A.map(r=>Array.from(r,v=>{if(typeof v==='string'){const t=v.trim();if(/^-?\d+(\.\d+)?$/.test(t)&&!/^-?0\d/.test(t))return +t}return v}));
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(B),(XS.names[i]||'Sheet'+(i+1)).slice(0,31))});
    const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    return new File([out],(pv.file.name.replace(/\.[^.]+$/,'')||'sheet')+'.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  $('pvBody').addEventListener('click',e=>{if(pv.kind!=='xls')return;
    const tb=e.target.closest('#pvShTabs button');if(tb){XS.cur=+tb.dataset.i;XS.r=XS.c=-1;xsRender(false);xsAutoFit();return}
    const eb=e.target.closest('#pvShEd button,#pvShFr button');if(eb){xsOp(eb.dataset.x);return}
    const td=e.target.closest('td[data-r]');if(td)xsSel(td)});
  $('pvBody').addEventListener('focusin',e=>{if(pv.kind!=='xls')return;const td=e.target.closest&&e.target.closest('td[data-r]');if(td){const k=td.dataset.r+','+td.dataset.c+','+XS.cur;if(XS.edit&&XS.lf!==k){XS.lf=k;snap()}xsSel(td)}});
  $('pvBody').addEventListener('input',e=>{
    if(pv.kind==='xls'){const td=e.target.closest('td[data-r]');if(!td)return;const r=+td.dataset.r,c=+td.dataset.c,A=XS.data[XS.cur];while(A.length<=r)A.push([]);A[r][c]=td.textContent;XS.dirty=true;return}
    if(e.target.closest&&e.target.closest('#pvWebC')&&['txt','doc','docx'].includes(pv.kind))pv.text=$('pvWebC').innerText});
  // edit / zoom / full screen
  function setEdit(on){pv.edit=on;$('pvEd').classList.toggle('on',on);
    if(pv.kind==='pdf'){$('pvFmt').style.display=on?'flex':'none';
      if(!on&&editMode){editMode=false;lastSpan=null;const kb=document.querySelector('#pvFmt [data-f=kb]');if(kb){kb.style.background='';if(kb.dataset.t)$('pvTitle').textContent=kb.dataset.t}}
      pvFit();return}
    if(pv.kind==='xls'){XS.edit=on;xsRender(true);return}
    const c=$('pvWebC');if(c){c.contentEditable=on?'true':'false';if(on)c.focus()}}
  $('pvEd').onclick=()=>setEdit(!pv.edit);
  function xsAutoFit(){const g=$('pvShBody'),i=$('pvShIn');if(!g||!i)return;i.style.setProperty('--z',1);const t=i.firstElementChild,tw=t?Math.max(t.scrollWidth,t.offsetWidth):0,cw=g.clientWidth-2;if(!tw||cw<50)return;pvZoom(Math.max(.35,Math.min(1.25,Math.floor(cw/tw*100)/100)))}
  window.xsAutoFit=xsAutoFit;
  function pvZoom(z){pv.z=Math.max(.35,Math.min(4,z));$('pvZl').textContent=Math.round(pv.z*100)+'%';
    if(pv.kind==='xls'){const i=$('pvShIn');if(i)i.style.setProperty('--z',pv.z)}
    else if(pv.kind==='pdf')$('pvBody').querySelectorAll('.pvpg').forEach(x=>{x.style.zoom=pv.z;x.style.maxWidth='none'})}
  window.pvZoom=pvZoom;
  $('pvZi').onclick=()=>pvZoom((pv.z||1)+.25);$('pvZo').onclick=()=>pvZoom((pv.z||1)-.25);$('pvZr').onclick=()=>{if(pv.kind==='xls')xsAutoFit();else pvZoom(1)};
  $('pvFs').onclick=()=>{const b=$('pvBox'),on=b.classList.toggle('pvfs');$('pvFs').textContent=on?'⤡':'⛶';pvFit()};
  async function pvDocLegacy(f){
    const u=new Uint8Array(await f.arrayBuffer());
    const grab=(txt)=>(txt.match(/[^\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]{6,}/g)||[]).filter(x=>/[\p{L}\p{N}]/u.test(x)&&!/^[\W_]+$/u.test(x));
    const a=grab(new TextDecoder('utf-16le').decode(u.slice(0,u.length-(u.length%2)))).join('\n'),b=grab(new TextDecoder('windows-1252').decode(u)).join('\n');
    const t=(a.length>b.length?a:b).replace(/\r/g,'\n').slice(0,200000);
    $('pvBody').innerHTML='<div class="pvweb" id="pvWebC" style="white-space:pre-wrap;background:#fff;color:#111;padding:10px;border-radius:6px"></div>';
    $('pvWebC').textContent=t||'No readable text found in this old .doc file. Save it as .docx and open again.';pv.web=true;pv.text=t;
  }
  const openV0=f=>{const e=(f.name.split('.').pop()||'').toLowerCase();
    if(['xlsx','xls','xlsm','xlsb','ods','csv','tsv'].includes(e)){pv.kind='xls';pv.file=f;pv.web=false;pvOpen('Excel · '+f.name,'<div class="mut">Loading…</div>');pvSheet(f,e).then(()=>addRecent({type:'xls',name:f.name,blob:f})).catch(x=>{$('pvBody').innerHTML='<div class="mut">Could not open this file: '+esc(x.message||x)+'</div>'});return true}
    if(e==='doc'){pv.kind='doc';pv.file=f;pvOpen('Word · '+f.name,'<div class="mut">Loading…</div>');pvDocLegacy(f).then(()=>addRecent({type:'docx',name:f.name,blob:f})).catch(x=>{$('pvBody').innerHTML='<div class="mut">Could not open this Word file: '+esc(x.message||x)+'</div>'});return true}
    if(e==='pdf'){pv.kind='pdf';pv.file=f;pv.web=false;pvOpen('PDF · '+f.name,'<div class="mut">Loading…</div>');pvPdf(f).then(()=>{let th='';try{const c=$('pvBody').querySelector('canvas'),t=document.createElement('canvas');t.width=60;t.height=Math.round(60*c.height/c.width);t.getContext('2d').drawImage(c,0,0,t.width,t.height);th=t.toDataURL('image/jpeg',.6)}catch(e){}addRecent({type:'pdf',name:f.name,blob:f,thumb:th})}).catch(x=>{$('pvBody').innerHTML='<div class="mut">Could not preview this PDF: '+esc(x.message||x)+'</div>'});return true}
    if(e==='docx'){pv.kind='docx';pv.file=f;pvOpen('Word · '+f.name,'<div class="mut">Loading…</div>');pvDocx(f).then(()=>addRecent({type:'docx',name:f.name,blob:f})).catch(x=>{$('pvBody').innerHTML='<div class="mut">Could not open this Word file: '+esc(x.message||x)+'</div>'});return true}
    if(['txt','md','log','json','xml','ini','cfg','yml','yaml','html','htm'].includes(e)){pv.kind='txt';pv.file=f;pvOpen('Text · '+f.name,'<div class="mut">Loading…</div>');f.text().then(t=>{$('pvBody').innerHTML='<div class="pvweb" id="pvWebC" style="white-space:pre-wrap;background:#fff;color:#111;padding:10px;border-radius:6px"></div>';$('pvWebC').textContent=t;pv.web=true;pv.text=t;addRecent({type:'txt',name:f.name,blob:f})});return true}
    if(['png','jpg','jpeg','webp','gif','bmp','heic','heif','avif'].includes(e)||(f.type||'').startsWith('image/')){pv.kind='photo';pv.file=f;pv.web=false;if(pv.url){try{URL.revokeObjectURL(pv.url)}catch(_){}}pv.url='';pv.ocr='';pvOpen('Photo · '+f.name,'');pvImgEdit(f,'photo').then(c=>{if(!c)return;let th='';try{const t=document.createElement('canvas');t.width=60;t.height=Math.round(60*c.height/c.width);t.getContext('2d').drawImage(c,0,0,t.width,t.height);th=t.toDataURL('image/jpeg',.6)}catch(_){}addRecent({type:'img',name:f.name,blob:f,thumb:th})});return true}
    return false};
  const openV=f=>{const r=openV0(f);if(r){const k=pv.kind,hd=$('pvBox').querySelector('.pvhd');
    pv.edit=false;pv.z=1;$('pvEd').classList.remove('on');$('pvZl').textContent='100%';
    hd.classList.toggle('edok',['xls','txt','doc','docx','pdf'].includes(k));hd.classList.toggle('zmok',k==='pdf'||k==='xls');pvFit()}return r};
  $('file').addEventListener('change',e=>{const fs=e.target.files;if(fs&&fs.length===1&&openV(fs[0])){e.stopImmediatePropagation();e.target.value=''}},true);
  $('drop').addEventListener('drop',e=>{const fs=e.dataTransfer&&e.dataTransfer.files;if(fs&&fs.length===1&&openV(fs[0])){e.stopImmediatePropagation();e.preventDefault()}},true);
  // Share Excel / PDF from the Export menu
  $('shX').onclick=()=>{window.__shareNext=true;$('xl').click()};
  $('shP').onclick=()=>{window.__shareNext=true;$('pd').click()};
})();

setTab('scrap');

try{window.Android&&window.Android.ready&&window.Android.ready()}catch(e){}

(function(){
  dxWire();gnWire();renderGn();
  const nav=k=>{const n=document.querySelector('#docBottom [data-nav="'+k+'"]');if(n)n.click()};
  const openCust=()=>{nav('show');setTimeout(()=>{const c=$('custB');if(c&&$('cust').style.display==='none')c.click()},60)};
  const hb=$('homeBox');
  let clrArm=0;
  hb.addEventListener('click',e=>{const b=e.target.closest('[data-hm]');if(!b)return;const[t,k]=b.dataset.hm.split(':');
    try{
      if(t==='nav')nav(k);
      else if(t==='add'){const a=document.querySelector('#docAddMenu [data-add="'+k+'"]');if(a)a.click();else gnToast('This option is not available')}
      else if(t==='go'){const el=$(k);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}
      else if(t==='btn'){
        if(k==='clr'){window.__clrForce=1;$('clr').click();window.__clrForce=0;gnToast('All data cleared');return}
        if(!(rows&&rows.length)){gnToast('No data yet. Import a file first.');return}
        const x=$(k);if(x)x.click()}
    }catch(err){console.error(err);gnToast('Something went wrong: '+(err&&err.message||err))}});
  const hs=$('hmSearch');hs.addEventListener('input',()=>{const d=$('docSearch');if(d){d.value=hs.value;d.dispatchEvent(new Event('input',{bubbles:true}))}});
  $('hmFiles').onclick=()=>{setTab('files')};
})();
