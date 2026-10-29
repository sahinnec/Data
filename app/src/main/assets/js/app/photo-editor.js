(function(){
  window.__peClose=function(){const f=document.getElementById('peFrame');if(f)f.remove()};
  window.__peOpen=function(file,o){
    window.__peClose();
    const src=document.getElementById('peSrc').textContent.replace(/<\\\/script/g,'</script');
    const fr=document.createElement('iframe');fr.id='peFrame';
    fr.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;border:0;z-index:99990;background:#000';
    fr.onload=function(){
      try{
        const w=fr.contentWindow,d=w.document;
        let dark=false;try{const m=(getComputedStyle(document.body).backgroundColor.match(/\d+/g)||[255,255,255]).map(Number);dark=(m[0]*.3+m[1]*.59+m[2]*.11)<110}catch(e){}
        d.documentElement.setAttribute('data-theme',dark?'dark':'light');
        w.DSPhotoEd.open([file],Object.assign({},o,{onClose:window.__peClose}));
      }catch(e){window.__peClose();try{window.gnToast&&gnToast('Editor error: '+e.message)}catch(_){}}
    };
    fr.srcdoc=src;document.body.appendChild(fr);
  };
})();
