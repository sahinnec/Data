(function(){
  const _st=window.setTab;
  window.__navHome=false;
  window.setTab=function(t){
    const r=_st.apply(this,arguments);
    if(t==='files')document.body.classList.toggle('fview',!window.__navHome);
    window.__navHome=false;
    return r};
  // tapping the Home tab always shows Home; any other jump to Files (Save, folders…) shows the file list
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#docBottom [data-nav=files]');if(b)window.__navHome=true},true);
  const hs=document.getElementById('hmSearch');
  if(hs)hs.addEventListener('input',()=>{if(hs.value.trim()&&!document.body.classList.contains('fview')){document.body.classList.add('fview')}});
})();
