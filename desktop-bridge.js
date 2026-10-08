/* SiasCloud Desktop Lite: native loopback bridge; no external frontend libraries. */
(() => {
  'use strict';
  const candidate = location.protocol === 'http:' && location.hostname === '127.0.0.1' && !!location.port;
  const originalFetch = window.fetch.bind(window);
  let token = '', verified = false, checked = false;
  const id = [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
  const ready = candidate ? (async () => {
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 5000);
    try {
      const response = await originalFetch('/__siascloud/health', {cache:'no-store', signal:abort.signal});
      const result = await response.json();
      verified = response.ok && result.native === true && result.app === 'SiasCloud ERP' && /^[a-f0-9]{64}$/.test(result.token || '');
      if (verified) token = result.token;
      return verified;
    } catch { return false; } finally { checked = true; clearTimeout(timer); }
  })() : Promise.resolve(false);
  const headersFor = type => ({'Content-Type':type, 'X-SiasCloud-Token':token});
  const messages = {
    PDF_INVALIDO:'El servicio devolvió un PDF inválido.',
    DOCUMENTO_VACIO:'El documento está vacío.',
    DOCUMENTO_INCOMPLETO:'El documento no se recibió completo. Consulta el mismo documento en el historial.',
    NO_SE_PUDO_GUARDAR_DOCUMENTO:'No se pudo guardar el documento. Revisa el espacio disponible.',
    VISOR_NO_DISPONIBLE:'No se pudo abrir la ventana del documento.',
    SESION_LOCAL_NO_AUTORIZADA:'La conexión de escritorio cambió. Cierra y vuelve a abrir SiasCloud.'
  };
  async function readResult(response) {
    let data; try { data = await response.json(); } catch { throw new Error('El servicio de escritorio no respondió correctamente.'); }
    if (!response.ok || !data.ok) throw new Error(messages[data.error] || data.message || data.error || 'No se pudo abrir el documento.');
    return data;
  }
  // Route exactly the configured function through the fixed native HTTPS endpoint.
  // Do not retry an emission or transaction after timeout or network failure.
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    const cfg = window.SIASCLOUD_CONFIG;
    const remote = cfg?.fixedConnection && cfg?.functionsBaseUrl && `${cfg.functionsBaseUrl.replace(/\/$/, '')}/siascloud-erp`;
    if (candidate && remote && url === remote && await ready) {
      const request = new Request(input, init);
      if (request.method !== 'POST') return originalFetch(input, init);
      const headers = new Headers(request.headers); headers.set('X-SiasCloud-Token', token);
      return originalFetch('/__siascloud/api', {method:'POST', headers, body:await request.arrayBuffer(), cache:'no-store', signal:request.signal});
    }
    return originalFetch(input, init);
  };
  const cleanName = (value, ext) => (String(value || 'Documento').replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').replace(/\.(pdf|html)$/i, '').trim().slice(0,120) || 'Documento') + ext;
  // El servicio local guarda el documento una sola vez y devuelve su URL.
  // Nunca usamos window.open, ShellExecute, ni "open=1".
  async function openDocument(route, body, type, name, options = {}) {
    if (!candidate || (checked && !verified)) return false;
    if (!(await ready)) return false;
    if (!window.SiasDocumentViewer) return false;
    const params = new URLSearchParams({name, open:'0', autoprint:'0'});
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 60000);
    try {
      const data = await readResult(await originalFetch(`${route}?${params}`, {
        method:'POST', headers:headersFor(type), body, cache:'no-store', signal:abort.signal
      }));
      const url = new URL(data.viewer_url, location.origin);
      if (url.origin !== location.origin || url.pathname !== '/__siascloud/document') {
        throw new Error('La ruta del documento no es válida.');
      }
      // PDF oficial o HTML propio: ambos quedan en un modal de la ventana principal.
      return window.SiasDocumentViewer.open({
        url:url.href, kind:type.startsWith('application/pdf')?'pdf':'html',
        title:options.title || name, downloadName:name
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('La apertura tardó demasiado. Consulta el mismo documento en el historial.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function openPdf(value, name = 'Documento.pdf', options = {}) {
    const bytes = value instanceof Uint8Array ? value : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer,value.byteOffset,value.byteLength) : new Uint8Array(value || []);
    if (bytes.length < 5 || String.fromCharCode(...bytes.subarray(0,5)) !== '%PDF-') return Promise.reject(new Error('El PDF está vacío o no es válido.'));
    return openDocument('/__siascloud/open-pdf',bytes,'application/pdf',cleanName(name,'.pdf'),options);
  }
  function openHtml(value, name = 'Documento.html', options = {}) {
    if (!String(value || '').trim()) return Promise.reject(new Error('El documento está vacío.'));
    const copy = new DOMParser().parseFromString(String(value),'text/html');
    let base = copy.querySelector('base');
    if (!base) { base = copy.createElement('base'); copy.head.prepend(base); }
    base.href = `${location.origin}/`;
    copy.querySelectorAll('script[data-sias-desktop-viewer]').forEach(script => script.remove());
    const bridge = copy.createElement('script'); bridge.src = `${location.origin}/desktop-bridge.js`; bridge.dataset.siasDesktopViewer = '1';
    copy.body.appendChild(bridge);
    return openDocument('/__siascloud/open-html','<!doctype html>\n' + copy.documentElement.outerHTML,'text/html; charset=utf-8',cleanName(name,'.html'),options);
  }
  async function heartbeat(release = false) {
    if (!(await ready)) return;
    try { await originalFetch(`/__siascloud/${release ? 'release' : 'ping'}?id=${id}`, {method:'POST', headers:headersFor('text/plain'), body:'', cache:'no-store', keepalive:release}); } catch {}
  }
  ready.then(ok => { if (ok) { heartbeat(); setInterval(heartbeat,20000); } });
  window.addEventListener('pagehide',() => heartbeat(true));
  window.addEventListener('pageshow',() => heartbeat());
  window.SiasDesktop = {get isDesktop() {return candidate && (!checked || verified);}, openPdf, openHtml, health:() => ready};
})();
