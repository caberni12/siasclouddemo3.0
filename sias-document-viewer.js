/* SiasCloud ERP 3.3.0 · Vista previa integrada: nunca abre un navegador externo. */
(() => {
  'use strict';
  let dialog, frame, label, status, printButton, downloadLink, current = null;
  let previousFocus = null, loaded = false;

  function create() {
    if (dialog) return;
    const css = document.createElement('style');
    css.id = 'sias-document-viewer-style';
    css.textContent = `
      dialog.sias-document-viewer{box-sizing:border-box;position:fixed;inset:0;margin:auto;width:min(1240px,calc(100vw - 22px));height:min(960px,calc(100dvh - 22px));max-width:none;max-height:none;padding:0;border:1px solid #c5d4e9;border-radius:17px;background:#f3f7fc;box-shadow:0 25px 80px #0f254766;color:#142c4a;overflow:hidden}
      dialog.sias-document-viewer::backdrop{background:rgba(11,25,48,.72);backdrop-filter:blur(4px)}
      .sias-dv-shell{height:100%;min-height:0;display:flex;flex-direction:column;font:14px system-ui,Segoe UI,Arial,sans-serif}
      .sias-dv-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 16px;background:#fff;border-bottom:1px solid #dae4f2;flex-shrink:0}
      .sias-dv-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:750;font-size:15px}
      .sias-dv-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
      .sias-dv-btn{border:1px solid #c5d5e9;border-radius:9px;padding:9px 14px;background:#fff;color:#183957;font:600 13px system-ui,Segoe UI,Arial,sans-serif;cursor:pointer;text-decoration:none;white-space:nowrap}
      .sias-dv-btn:focus-visible{outline:3px solid #8db7ff;outline-offset:2px}
      .sias-dv-btn[disabled]{opacity:.5;cursor:wait}
      .sias-dv-btn.primary{background:#1466d8;border-color:#1466d8;color:white}
      .sias-dv-btn.close{font-size:19px;line-height:1;padding:7px 12px}
      .sias-dv-status{flex-shrink:0;padding:5px 15px;min-height:24px;background:#ecf2fa;color:#38516e;font-size:12px}
      .sias-dv-frame{width:100%;flex:1;min-height:0;display:block;border:0;background:white}
      @media(max-width:650px){dialog.sias-document-viewer{height:calc(100dvh - 10px);width:calc(100vw - 10px);border-radius:9px}.sias-dv-bar{padding:9px;gap:8px;flex-wrap:wrap}.sias-dv-title{width:100%;font-size:13px}.sias-dv-actions{width:100%;gap:5px}.sias-dv-btn{flex:1;padding:9px 7px;font-size:12px}}
    `;
    document.head.appendChild(css);
    dialog = document.createElement('dialog');
    dialog.className = 'sias-document-viewer';
    dialog.setAttribute('aria-label', 'Vista previa de documentos SiasCloud');
    dialog.innerHTML = '<div class="sias-dv-shell"><header class="sias-dv-bar"><strong class="sias-dv-title"></strong><div class="sias-dv-actions"><button type="button" class="sias-dv-btn primary" data-dv-print>Imprimir</button><a class="sias-dv-btn" data-dv-download hidden>Guardar PDF</a><button type="button" class="sias-dv-btn close" data-dv-close aria-label="Cerrar vista previa">×</button></div></header><div class="sias-dv-status" role="status" aria-live="polite">Cargando documento…</div><iframe class="sias-dv-frame" title="Vista previa del documento" referrerpolicy="no-referrer"></iframe></div>';
    document.body.appendChild(dialog);
    frame = dialog.querySelector('iframe');
    label = dialog.querySelector('.sias-dv-title');
    status = dialog.querySelector('.sias-dv-status');
    printButton = dialog.querySelector('[data-dv-print]');
    downloadLink = dialog.querySelector('[data-dv-download]');
    dialog.querySelector('[data-dv-close]').addEventListener('click', () => dialog.close());
    printButton.addEventListener('click', () => print());
    frame.addEventListener('load', () => {
      if (!dialog.open || !current) return;
      if (current.url && frame.getAttribute('src') !== current.url) return;
      if (current.html && frame.getAttribute('srcdoc') !== current.html) return;
      loaded = true;
      printButton.disabled = false;
      status.textContent = 'Vista previa lista · Imprimir o cerrar para volver al módulo.';
    });
    dialog.addEventListener('close', () => {
      // El archivo permanece disponible para abrirlo otra vez sin repetir la emisión.
      frame.removeAttribute('src');
      frame.removeAttribute('srcdoc');
      loaded = false;
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
      previousFocus = null;
    });
    document.addEventListener('keydown', e => {
      if (!dialog?.open || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'p') return;
      e.preventDefault();
      print();
    }, true);
  }

  function open(entry) {
    if (!entry || (!entry.url && !entry.html)) throw new Error('No se recibió ningún documento para visualizar.');
    create();
    // No se acepta código HTML como nombre ni se inserta el título como HTML.
    const data = {title:String(entry.title || 'Documento').slice(0,160), kind:entry.kind === 'pdf' ? 'pdf' : 'html', url:entry.url || null, html:entry.html || null, downloadName:entry.downloadName || null};
    if (!dialog.open) previousFocus = document.activeElement;
    current = data;
    loaded = false;
    printButton.disabled = true;
    label.textContent = data.title;
    status.textContent = 'Cargando vista previa…';
    downloadLink.hidden = !(data.kind === 'pdf' && data.url);
    if (!downloadLink.hidden) {
      downloadLink.href = data.url;
      downloadLink.download = String(data.downloadName || 'Documento.pdf').replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_');
    }
    frame.removeAttribute('src');
    frame.removeAttribute('srcdoc');
    if (!dialog.open) dialog.showModal();
    if (data.html) frame.srcdoc = data.html;
    else frame.src = data.url;
    return true;
  }

  async function print() {
    if (!dialog?.open || !current) return false;
    if (!loaded) {
      status.textContent = 'El documento todavía se está cargando.';
      return false;
    }
    try {
      const win = frame.contentWindow;
      if (!win) throw new Error('Visor no disponible');
      // La impresión usa el archivo ya preparado, jamás el endpoint de emisión.
      if (current.kind === 'html') {
        const inner = frame.contentDocument;
        if (inner) {
          await Promise.race([
            Promise.allSettled([
              inner.fonts?.ready || Promise.resolve(),
              ...Array.from(inner.images).map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
                img.addEventListener('load', resolve, {once:true});
                img.addEventListener('error', resolve, {once:true});
              }))
            ]),
            new Promise(resolve => setTimeout(resolve, 3500))
          ]);
        }
      }
      win.focus();
      win.print();
      status.textContent = 'Impresión solicitada. Puedes volver al documento o cerrarlo.';
      return true;
    } catch (err) {
      status.textContent = current.kind === 'pdf'
        ? 'Usa el icono Imprimir de la barra del PDF dentro de esta vista previa.'
        : 'No se pudo iniciar la impresión. Revisa los permisos de impresión del navegador.';
      console.warn('[SiasCloud visor integrado] Impresión no disponible:', err);
      return false;
    }
  }
  function reopen() { return current ? open(current) : false; }
  function close() { if (dialog?.open) dialog.close(); }
  window.SiasDocumentViewer = {open, reopen, print, close, get isOpen() {return Boolean(dialog?.open);}, get current() {return current ? {...current} : null;}};
})();
