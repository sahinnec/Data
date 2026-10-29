/* Projected page (Compare > Projected): chart + forecast + checklist page (source = #prSrc in index.html, shown in an iframe).
   Data in:  1) preview > Send (➤) while "From preview" is waiting  2) "App data" (Cards/Table rows)  3) paste inside the page.
   Hooks:    window.__prOpen(text?) , window.__prWaiting() , window.__prGot(text) , window.__prApp() */
(function(){
  const $=id=>document.getElementById(id),toast=m=>{try{window.gnToast&&gnToast(m)}catch(e){}};
  let fr=null,wait=false;

  function dark(){try{const m=(getComputedStyle(document.body).backgroundColor.match(/\d+/g)||[255,255,255]).map(Number);return (m[0]*.3+m[1]*.59+m[2]*.11)<110}catch(e){return false}}
  function frameDoc(cb){ /* run cb(window) once the page inside the iframe is ready */
    if(!fr)return;
    const go=()=>{try{cb(fr.contentWindow)}catch(e){toast('Projected: '+e.message)}};
    if(fr.dataset.ready==='1')go();else fr.addEventListener('load',go,{once:true});
  }
  function build(){
    if(fr)return;
    const src=$('prSrc').textContent.replace(/<\\\/script/g,'</script');
    fr=document.createElement('iframe');fr.id='prF';fr.title='Projected';
    fr.addEventListener('load',()=>{
      fr.dataset.ready='1';
      try{fr.contentDocument.documentElement.setAttribute('data-theme',dark()?'dark':'light')}catch(e){}
    });
    fr.srcdoc=src;$('prW').appendChild(fr);
  }
  let show=function(){
    build();wait=false;mark();
    $('prS').style.display='flex';
    try{document.body.style.overflow='hidden'}catch(e){}
    try{fr.contentDocument&&fr.contentDocument.documentElement.setAttribute('data-theme',dark()?'dark':'light')}catch(e){}
  }
  let hide=function(){$('prS').style.display='none';try{document.body.style.overflow=''}catch(e){}}

  /* open the page, optionally with text to load */
  window.__prOpen=function(text){
    show();
    if(text&&String(text).trim())frameDoc(w=>{const n=w.__prLoad(text);if(n>1)toast('Pick the name at the top of the chart page.')});
  };
  let mark=()=>{const b=$('pvSend');if(b){b.classList.toggle('prwait',wait);b.title=wait?'Send to Projected':'Send to Data Show'}};
  window.__prWaiting=()=>wait;

  /* called by preview > Send while waiting: text goes here instead of Cards */
  window.__prGot=function(text){
    wait=false;mark();
    if(!String(text||'').trim()){toast('Nothing to send.');return false}
    try{pvClose()}catch(e){}
    window.__prOpen(text);
    return true;
  };

  /* data already in the app (Cards / Table rows): Date, Name, Price, Qty */
  window.__prAppText=function(){
    try{
      if(!baseRows||!baseRows.length||map.d<0||map.p<0)return '';
      const L=['Date\tName\tPrice\tQty'];
      baseRows.forEach(r=>{
        const t=pDate(r[map.d]);if(t===null)return;
        const p=num(r[map.p]);if(p===null)return;
        const nm=map.n>=0?String(r[map.n]==null?'':r[map.n]).replace(/\s+/g,'_'):'';
        const q=map.q>=0?num(r[map.q]):null;
        L.push([new Date(t).toISOString().slice(0,10),nm||'ALL',p,q===null?0:q].join('\t'));
      });
      return L.length>1?L.join('\n'):'';
    }catch(e){return ''}
  };
  window.__prApp=function(){
    const t=window.__prAppText();
    if(!t){toast('No dated price data in the app yet. Use From preview or paste inside the page.');window.__prOpen();return false}
    window.__prOpen(t);return true;
  };

  /* buttons */
  const open=$('prOpen');
  if(open)open.onclick=()=>window.__prOpen();
  $('prB').onclick=()=>{wait=false;mark();hide()};
  $('prApp').onclick=()=>window.__prApp();
  $('prPv').onclick=()=>{ /* go to the Preview box; the next ➤ Send comes back here */
    hide();wait=true;mark();
    try{setTab('scrap')}catch(e){}
    toast('Open a file, photo, PDF or web page, then tap ➤ Send. It comes to Projected.');
  };
  /* Session memory: Android may recreate the app while the in-app browser / a file picker is on top
     (page reloads, JS state is lost). Remember tab, Projected-open and "waiting for preview" in localStorage
     for 30 min and restore them on start, so Send from the browser still reaches Projected. */
  const SS='ds_sess_v1';
  const sess=()=>{try{const cur=(typeof curTab==='string')?curTab:'';localStorage.setItem(SS,JSON.stringify({t:Date.now(),tab:cur,pr:$('prS').style.display==='flex',wait:wait}))}catch(e){}};
  try{const _s=window.setTab;if(typeof _s==='function'&&!_s.__ps){const w=function(t){const r=_s.apply(this,arguments);sess();return r};w.__ps=1;window.setTab=w}}catch(e){}
  ['mark','show','hide'].forEach(()=>0);
  const _show=show,_hide=hide;
  show=function(){_show();sess()};hide=function(){_hide();sess()};
  const _mark=mark;
  mark=function(){_mark();sess()};
  window.addEventListener('pagehide',sess);
  setTimeout(()=>{try{
    const o=JSON.parse(localStorage.getItem(SS)||'null');
    if(!o||Date.now()-o.t>30*60*1000)return;
    if(o.pr){window.__prOpen();return}
    if(o.wait){wait=true;_mark();try{setTab('scrap')}catch(e){}toast('Projected data এর জন্য অপেক্ষা করছে। ➤ Send চাপুন।');sess();return}
    if(o.tab&&o.tab!=='scrap'&&typeof setTab==='function')setTab(o.tab);
  }catch(e){}},700);

  /* closing the preview (✕) cancels the waiting state */
  const x=$('pvX');if(x)x.addEventListener('click',()=>{wait=false;mark()});
})();
