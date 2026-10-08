/* Impresión DTE. A4 usa el PDF oficial; térmico usa /wsds/getticket del mismo DTE de Facturacion.cl. */
(()=>{
 'use strict';
 let A;let jobSequence=0;const activeUrls=new Set(),pendingEmissions=new Map();
 function progressStart(label='Emitiendo documento tributario…'){
  let host=document.querySelector('[data-dte-progress-overlay]');
  if(!host){host=document.createElement('div');host.setAttribute('data-dte-progress-overlay','');host.className='dte-progress-overlay';host.innerHTML='<div class="dte-progress-card" role="status" aria-live="polite"><div class="dte-progress-title">Procesando documento</div><div class="dte-progress-text"></div><div class="dte-progress-track"><i></i></div><small>No cierres esta ventana. SiasCloud está esperando la confirmación de Facturacion.cl.</small></div>';document.body.appendChild(host);}
  host.hidden=false;host.classList.add('active');const text=host.querySelector('.dte-progress-text'),bar=host.querySelector('.dte-progress-track i');text.textContent=label;let value=8;bar.style.width=value+'%';clearInterval(host._timer);host._timer=setInterval(()=>{value=Math.min(90,value+(value<55?7:value<78?3:1));bar.style.width=value+'%';},260);return host;
 }
 function progressStep(host,label,value){if(!host)return;const text=host.querySelector('.dte-progress-text'),bar=host.querySelector('.dte-progress-track i');if(text&&label)text.textContent=label;if(bar&&value!=null)bar.style.width=Math.max(0,Math.min(100,value))+'%';}
 function progressDone(host,label='Documento listo para abrir'){
  if(!host)return;clearInterval(host._timer);progressStep(host,label,100);setTimeout(()=>{host.classList.remove('active');host.hidden=true;},320);
 }
 function progressFail(host,label='No se pudo completar la emisión'){
  if(!host)return;clearInterval(host._timer);progressStep(host,label,100);host.classList.add('error');setTimeout(()=>{host.classList.remove('active','error');host.hidden=true;},1100);
 }
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function view(options={}){
  const host=document.createElement('section');host.className='sias-print-job';
  host.innerHTML='<div data-print-info hidden><div class="sias-print-heading"><strong></strong><button type="button" class="icon-btn" data-pdf-close aria-label="Cerrar aviso de impresión">×</button></div><p data-pdf-status role="status"></p><div class="sias-print-actions"><button type="button" class="btn secondary small" data-pdf-print hidden>Reimprimir</button><button type="button" class="btn secondary small" data-pdf-retry hidden>Consultar documento</button><button type="button" class="btn secondary small" data-pdf-refresh hidden>Actualizar PDF</button><a class="btn secondary small" data-pdf-download hidden download="Documento.pdf">PDF</a></div></div><iframe data-sias-print-frame tabindex="-1" aria-hidden="true"></iframe>';
  host.querySelector('strong').textContent=options.title||'Documento';
  const frame=host.querySelector('iframe');frame.title=options.title||'Documento para imprimir';
  const v={id:++jobSequence,popup:null,host,frame,company:A.state.me?.companyId,token:A.state.token,autoPrint:options.autoPrint!==false,printRequested:false,ready:false,discarded:false,nativePdf:false,pdfBytes:null,pdfName:'Documento.pdf'};
  host.querySelector('[data-pdf-close]').onclick=()=>host.querySelector('[data-print-info]').hidden=true;
  host.querySelector('[data-pdf-print]').onclick=()=>{
   if(v.viewerEntry&&window.SiasDocumentViewer){
    window.SiasDocumentViewer.open(v.viewerEntry);return;
   }
   if(v.pdfUrl&&window.SiasDocumentViewer){
    window.SiasDocumentViewer.open({url:v.pdfUrl,kind:'pdf',title:v.pdfName,downloadName:v.pdfName});return;
   }
   requestPrint(v,frame.contentWindow,true);
  };
  document.body.appendChild(host);
  v.cleanupTimer=setTimeout(()=>discard(v),900000);
  return v;
 }
 function message(v,text,reveal=false){if(v.discarded)return;v.host.querySelector('[data-pdf-status]').textContent=text;if(reveal)v.host.querySelector('[data-print-info]').hidden=false;}
 function release(url){if(activeUrls.delete(url))URL.revokeObjectURL(url);}
 function assertContext(v){if(v.company!==A.state.me?.companyId||v.token!==A.state.token)throw new Error('La sesión o la empresa activa cambió. Abre el documento nuevamente.');}
 function discard(v){if(!v||v.discarded)return;v.discarded=true;clearTimeout(v.cleanupTimer);clearTimeout(v.noticeTimer);if(v.pdfUrl)release(v.pdfUrl);v.host.remove();}
 function openPdfNative(v){
  if(!v.pdfUrl) return false;
  if(window.SiasDocumentViewer){
   return window.SiasDocumentViewer.open({url:v.pdfUrl,kind:'pdf',title:v.pdfName,downloadName:v.pdfName});
  }
  const link=v.host.querySelector('[data-pdf-download]');
  if(link){link.hidden=false;link.textContent='Guardar PDF';}
  return false;
 }
 function requestPrint(v,target,manual=false){
  if(v.discarded||!v.ready||!target||(!manual&&(!v.autoPrint||v.printRequested)))return;
  try{
   assertContext(v);v.printRequested=true;
   const btn=v.host.querySelector('[data-pdf-print]');btn.hidden=false;btn.textContent='Reimprimir';
   // Nunca asignar onafterprint ni leer/escribir propiedades del visor PDF externo.
   // En documentos HTML propios, print() funciona directamente. En el PDF oficial,
   // Chrome puede aislar el visor: si lo hace, se abre el mismo Blob en el visor nativo.
   target.focus();target.print();
   v.host.querySelector('[data-print-info]').hidden=false;
   clearTimeout(v.noticeTimer);v.noticeTimer=setTimeout(()=>{if(!v.discarded)v.host.querySelector('[data-print-info]').hidden=true;},12000);
  }
  catch(error){
   v.printRequested=false;
   if(v.pdfUrl&&openPdfNative(v)){
    message(v,'PDF oficial abierto. Usa Imprimir en el visor del navegador.',true);
    return;
   }
   message(v,'Documento listo. Pulsa Imprimir para continuar.',true);
   const btn=v.host.querySelector('[data-pdf-print]');btn.hidden=false;btn.textContent='Imprimir';
   console.warn('[SiasCloud print] El navegador bloqueó la impresión automática:',error);
  }
 }
 function showHtml(html,v,caption='Documento listo'){
  assertContext(v);if(v.discarded)return false;
  const frame=v.frame;v.ready=false;
  // El visor aporta la única barra de acciones; se oculta la del HTML embebido.
  const previewHtml=html.replace(/<\/head>/i,'<style id="sias-preview-toolbar">body>.toolbar{display:none!important}</style></head>');
  const loadInternal=()=>{
   frame.onload=()=>{if(v.discarded||frame.contentDocument?.querySelector('meta[name="sias-print-job"]')?.content!==String(v.id))return;v.ready=true;requestPrint(v,frame.contentWindow);};
   frame.removeAttribute('src');frame.srcdoc=html.replace(/<head>/i,`<head><meta name="sias-print-job" content="${v.id}">`);
  };
  const loadViewer=()=>{
   if(!window.SiasDocumentViewer){loadInternal();return;}
   v.viewerEntry={html:previewHtml,kind:'html',title:caption};
   window.SiasDocumentViewer.open(v.viewerEntry);
   v.ready=true;message(v,caption+' · vista previa dentro de SiasCloud');
  };
  v.host.querySelector('[data-pdf-download]').hidden=true;
  v.host.querySelector('[data-pdf-refresh]').hidden=true;
  v.host.querySelector('[data-pdf-retry]').hidden=true;
  if(window.SiasDesktop?.isDesktop){
   const fileName=(caption||'Documento').replace(/[\/:*?"<>|]+/g,'_')+'.html';
   window.SiasDesktop.openHtml(previewHtml,fileName,{title:caption}).then(opened=>{
    if(opened){v.ready=true;v.viewerEntry=window.SiasDocumentViewer?.current||null;message(v,caption+' · vista previa dentro de SiasCloud');}
    else loadViewer();
   }).catch(error=>{
    console.warn('[SiasCloud Desktop] Usando visor HTML integrado:',error);
    loadViewer();
   });
   return true;
  }
  loadViewer();return true;
 }
 async function preferred(dte={}){try{const r=await A.erpCall('printing.config.get'),f=r.formats||{},type=String(dte.document_type||'');return f.tributary?.[type]||(A.state.route==='pos'?(f.defaults?.pos||'80MM'):(f.defaults?.tributary||'A4'));}catch{try{const r=await A.erpCall('billing.config.get'),c=r.config||{};return A.state.route==='pos'?(c.pos_dte_print_format||'80MM'):(c.dte_print_format||'A4');}catch{return 'A4';}}}
 function pdfCaption(dte){return `DTE A4 oficial · folio ${dte.folio||'confirmado'} · Teléfono de emisión: ${dte.recipient_phone||'Sin registro'}`;}
 async function refreshA4(dte,v,button){
  if(button.disabled)return;button.disabled=true;message(v,'Actualizando el PDF oficial del mismo folio…');
  try{await showA4(dte,v,true);}catch(error){message(v,A.errorText(error));}finally{button.disabled=false;}
 }
 async function showA4(dte,v,refresh=false){
  // Reintentos breves: máximo 450 ms adicionales. Si Facturacion.cl aún no tiene el PDF,
  // no frenamos la caja; el usuario puede actualizar el mismo folio sin volver a emitir.
  for(let attempt=0;attempt<3;attempt++){
   if(v.discarded)return false;
   try{assertContext(v);message(v,`DTE emitido · folio ${dte.folio||'confirmado'}. Preparando A4 oficial…`);const r=await A.erpCall('billing.pdf',{id:dte.id,...(refresh?{refresh:true}:{})});assertContext(v);Object.assign(dte,r.document||{});
    const base64=String(r.pdf_base64||'').replace(/^data:application\/pdf;base64,/i,'').replace(/\s/g,'');if(base64.length>41943040)throw new Error('El PDF supera el tamaño admitido.');const raw=atob(base64);if(!raw.startsWith('%PDF-'))throw new Error('El proveedor devolvió un PDF inválido.');
    const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));activeUrls.add(url);
    const frame=v.frame,link=v.host.querySelector('[data-pdf-download]'),fileName='DTE_'+(dte.folio||'emitido')+'.pdf';v.ready=false;
    v.pdfBytes=bytes;v.pdfName=fileName;v.nativePdf=false;
    let nativeOpened=false;
    if(window.SiasDesktop?.isDesktop){
     try{nativeOpened=await window.SiasDesktop.openPdf(bytes,fileName,{title:pdfCaption(dte)});v.nativePdf=!!nativeOpened;}
     catch(error){console.warn('[SiasCloud Desktop] No se pudo usar archivo local, abriendo PDF dentro del ERP:',error);}
    }
    let viewerOpened=!!nativeOpened;
    if(!viewerOpened&&window.SiasDocumentViewer){
     viewerOpened=window.SiasDocumentViewer.open({url,kind:'pdf',title:pdfCaption(dte),downloadName:fileName});
    }
    v.viewerEntry=viewerOpened?(window.SiasDocumentViewer?.current||{url,kind:'pdf',title:pdfCaption(dte),downloadName:fileName}):null;
    frame.onload=()=>{if(v.discarded)return;v.ready=true;if(!viewerOpened)requestPrint(v,frame.contentWindow);};
    frame.removeAttribute('srcdoc');
    if(viewerOpened){frame.removeAttribute('src');v.ready=true;}else{frame.src=url;}
    link.href=url;link.download=fileName;link.hidden=false;
    v.host.querySelector('[data-pdf-retry]').hidden=true;
    message(v,viewerOpened?pdfCaption(dte)+' · vista previa dentro de SiasCloud':pdfCaption(dte),!viewerOpened);
    const printBtn=v.host.querySelector('[data-pdf-print]');
    if(viewerOpened){printBtn.hidden=false;printBtn.textContent='Ver PDF';}
    const reload=v.host.querySelector('[data-pdf-refresh]');reload.hidden=false;reload.onclick=()=>refreshA4(dte,v,reload);
    if(v.pdfUrl)release(v.pdfUrl);v.pdfUrl=url;setTimeout(()=>release(url),900000);return true;
   }catch(error){if(attempt<2&&/PDF_NO_DISPONIBLE|PDF.*(?:pendiente|no.*disponible)/i.test(error.message)){message(v,'DTE emitido. Sincronizando PDF oficial…');await new Promise(r=>setTimeout(r,150*(attempt+1)));continue;}throw error;}
  }
 }
 function thermalHtml(ticket,format){
  const phone=String(ticket.recipient_phone||'').trim(),digits=phone.replace(/\D/g,''),printed=String(ticket.head_text||'')+' '+String(ticket.foot_text||'');
  const extraPhone=phone&&(!digits||!printed.replace(/\D/g,'').includes(digits))?`<p class="provider recipient-phone">Teléfono: ${safe(phone)}</p>`:'';
  const is58=format==='58MM',paper=is58?'58mm':'80mm',content=is58?'52mm':'72mm',font=is58?'8.4px':'10.5px',company=(A.state.me?.companies||[]).find(c=>c.id===A.state.me?.companyId)||{},logo=(company.show_logo_documents!==false&&company.logo_url)?company.logo_url:'';return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DTE ${safe(ticket.folio||'')} · ${paper}</title><style>@page{size:${paper} auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}body{font-family:"Courier New",monospace}.toolbar{position:sticky;top:0;display:flex;gap:8px;justify-content:center;padding:10px;background:#eef3f9;border-bottom:1px solid #ccd6e2;font:13px system-ui;z-index:2}.toolbar button{border:0;border-radius:8px;padding:9px 14px;background:#1769d2;color:#fff;font-weight:700;cursor:pointer}.ticket{width:${content};margin:0 auto;padding:${is58?'2.5mm 1.5mm 5mm':'3mm 2mm 6mm'};overflow:hidden}.company-logo{display:block;max-width:${is58?'34mm':'48mm'};max-height:${is58?'15mm':'20mm'};object-fit:contain;margin:0 auto 3mm}.provider{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font-size:${font};line-height:1.25}.ted{display:flex;justify-content:center;width:100%;margin:${is58?'3mm':'4mm'} 0}.ted svg{display:block;width:100%;max-width:100%;height:auto}.meta{text-align:center;font:700 ${is58?'7.5px':'9px'} Arial,sans-serif;margin:2mm 0}.warning{font:8px Arial,sans-serif;text-align:center;margin-top:2mm}@media print{.toolbar{display:none}.ticket{margin:0 auto}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir ${paper}</button></div><main class="ticket">${logo?`<img class="company-logo" src="${safe(logo)}" alt="Logotipo de ${safe(company.trade_name||company.legal_name||'empresa')}">`:''}<pre class="provider">${safe(ticket.head_text||'')}</pre>${extraPhone}<div class="ted">${ticket.ted_svg||''}</div><pre class="provider">${safe(ticket.foot_text||'')}</pre><div class="meta">DTE ${safe(ticket.document_type)} · Folio ${safe(ticket.folio)} · ${safe(ticket.environment||'')}</div><div class="warning">Representación térmica del mismo DTE emitido por Facturacion.cl. No genera un nuevo folio.</div></main></body></html>`;}
 async function showThermal(dte,v,format){assertContext(v);message(v,`DTE emitido · folio ${dte.folio||'confirmado'}. Consultando ticket térmico oficial…`);const ticket=await A.erpCall('billing.ticket',{id:dte.id,format});assertContext(v);return showHtml(thermalHtml(ticket,format),v,`Ticket ${format==='58MM'?'57/58 mm':'80 mm'} · mismo DTE folio ${ticket.folio}`);}
 async function show(dte,v=view(),format){
  if(!dte?.id){message(v,'No se encontró el DTE emitido.',true);return false;}
  if(dte?.status&&dte.status!=='EMITIDO'){
   message(v,'Sincronizando el estado del DTE con Facturacion.cl…');
   try{const sync=await A.erpCall('billing.reconcile',{id:dte.id});Object.assign(dte,sync.document||{});}
   catch(error){message(v,'No se pudo sincronizar todavía: '+A.errorText(error),true);}
   if(dte.status!=='EMITIDO'){message(v,'La emisión sigue pendiente de confirmación. SiasCloud conservará el mismo intento y no generará otro folio.',true);return false;}
  }
  const selected=(format||await preferred(dte)).toUpperCase();
  try{
   if(selected==='A4')return await showA4(dte,v);
   try{return await showThermal(dte,v,selected==='58MM'?'58MM':'80MM');}
   catch(error){
    const text=String(error?.message||error);
    if(!/TICKET[ _]TERMICO[ _](?:NO[ _]HABILITADO|PDF417[ _]NO[ _]GENERADO)|FETICKET|BETICKET|m[oó]dulo.*(?:no|sin).*(?:habilit|activ)|no.*(?:habilit|activ).*m[oó]dulo/i.test(text))throw error;
    message(v,'El formato térmico no está habilitado. Abriendo el PDF oficial del mismo folio…',true);
    return await showA4(dte,v);
   }
  }catch(error){
   message(v,'El documento ya fue emitido. No se pudo preparar esta impresión: '+A.errorText(error)+'. No se volverá a emitir.',true);
   const retry=v.host.querySelector('[data-pdf-retry]');
   if(retry){retry.hidden=false;retry.onclick=async()=>{A.setBusy?.(retry,true,'Consultando…');try{await show(dte,v,selected);}finally{A.setBusy?.(retry,false);}};}
   return false;
  }
 }
 async function recipient(payload){
  try{const r=await A.erpCall('billing.recipient.get',payload);if(r.phone_field_ready!==true)throw new Error('Actualización de documentos tributarios pendiente. Actualiza el backend de SiasCloud.');return r;}
  catch(error){if(/Acción ERP no reconocida|ACCION_NO_EXISTE/.test(error.message||''))throw new Error('Actualización de documentos tributarios pendiente. Actualiza el backend de SiasCloud.');throw error;}
 }
 async function performEmission(payload,format,options={}){const v=options.view||view(options),progress=progressStart('Validando receptor y preparando DTE…');try{
  // Prefetch de configuración en paralelo para no agregar latencia después de emitir.
  const formatPromise=format?Promise.resolve(format):preferred({document_type:payload.document_type});
  // El POS ya cargó el teléfono en el modal. El backend valida el receptor al emitir.
  const phone=Object.prototype.hasOwnProperty.call(payload,'recipient_phone')?String(payload.recipient_phone??'').trim():(await recipient({document_id:payload.document_id})).phone;assertContext(v);
  progressStep(progress,'Enviando DTE a Facturacion.cl…',34);
  const result=await A.erpCall('billing.facturacioncl.issue',{...payload,recipient_phone:phone});
  progressStep(progress,`DTE emitido${result.document?.folio?` · folio ${result.document.folio}`:''}. Preparando impresión…`,74);
  const fmt=String(format||await formatPromise).toUpperCase();result.pdf_opened=await show(result.document,v,fmt);
  progressDone(progress,result.pdf_opened?'Documento listo para abrir / imprimir':'DTE emitido. Opciones de impresión listas');return result;
 }catch(error){progressFail(progress,'La emisión no quedó confirmada');message(v,'La emisión no está confirmada: '+A.errorText(error)+'. Revisa el historial antes de volver a emitir.',true);throw error;}}
 function emit(payload,format,options={}){
  const key=JSON.stringify([A.state.token,A.state.me?.companyId,payload.document_id,payload.document_type,payload.request_key||'MAIN']);
  const running=pendingEmissions.get(key);
  if(running){if(options.view&&options.view!==running.view)discard(options.view);return running.promise;}
  const operation=performEmission(payload,format,options).finally(()=>pendingEmissions.delete(key));
  pendingEmissions.set(key,{promise:operation,view:options.view});return operation;
 }
 window.SiasDtePdf={init:api=>{A=api;},emit,recipient,prepare:view,discard,showHtml,open:(id,format,options={})=>show({id,status:'EMITIDO'},options.view||view(options),format)};
})();
