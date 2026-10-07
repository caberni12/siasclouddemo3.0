/* SiasCloud Desktop Bridge - integra el frontend web con el visor nativo de Windows. */
(()=>{
  'use strict';
  const desktop = location.hostname === '127.0.0.1' && location.port === '18891';
  const cleanName=(value,ext)=>{
    let name=String(value||('Documento'+ext)).replace(/[\\/:*?"<>|\x00-\x1f]+/g,'_').trim();
    if(!name.toLowerCase().endsWith(ext)) name+=ext;
    return name.slice(0,160);
  };
  async function send(path,body,type){
    if(!desktop) return false;
    const r=await fetch(path,{method:'POST',headers:{'Content-Type':type,'X-SiasCloud-Desktop':'1'},body,cache:'no-store'});
    if(!r.ok){let detail='';try{detail=await r.text();}catch{}throw new Error(detail||`Windows no pudo abrir el documento (${r.status}).`);}
    return true;
  }
  async function openPdf(bytes,name='Documento.pdf'){
    const body=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]);
    if(!body.length) throw new Error('El PDF está vacío.');
    return send('/__siascloud/open-pdf?name='+encodeURIComponent(cleanName(name,'.pdf')),body,'application/pdf');
  }
  async function openHtml(html,name='Documento.html'){
    return send('/__siascloud/open-html?name='+encodeURIComponent(cleanName(name,'.html')),String(html||''),'text/html; charset=utf-8');
  }
  async function health(){
    if(!desktop)return false;
    try{const r=await fetch('/__siascloud/health',{cache:'no-store'});return r.ok;}catch{return false;}
  }
  window.SiasDesktop={isDesktop:desktop,openPdf,openHtml,health};
})();
