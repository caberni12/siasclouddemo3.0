/* POS visual y cobros: módulo independiente. */
(()=>{
  'use strict';
  let A,viewSequence=0,releaseHeaderSearch=()=>{};
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const C=window.SiasRetailCore,api=(action,p={})=>A.erpCall(action,p),money=v=>A.money(v),qty=v=>A.fmtQty(v);
  const uid=()=>crypto.randomUUID();
  const status={DRAFT:'Borrador',POSTED:'Confirmado',VOID:'Anulado',OPEN:'Abierta',CLOSED:'Cerrado'};
  const methods={CASH:'Efectivo',CARD:'Tarjeta',TRANSFER:'Transferencia',CLIENT_CREDIT:'Crédito cliente',OTHER:'Otro'};
  const badge=(s,ok=true)=>`<span class="badge ${ok?'ok':'warn'}">${E(status[s]||s)}</span>`;
  const button=(label,id,primary=false)=>`<button type="button" id="${id}" class="btn ${primary?'primary':'secondary'}">${E(label)}</button>`;
  const options=(rows,value='',empty='Seleccionar…')=>`<option value="">${E(empty)}</option>`+rows.map(x=>`<option value="${E(x.id)}" ${x.id===value?'selected':''}>${E(x.name||x.legal_name)}${x.rut?' · '+E(x.rut):''}</option>`).join('');
  const guarded=fn=>async e=>{const b=e?.currentTarget;try{if(b?.tagName==='BUTTON')A.setBusy(b,true);await fn(e);}catch(err){A.toast(A.errorText(err),true);}finally{if(b?.tagName==='BUTTON'&&b.isConnected)A.setBusy(b,false);}};
  const on=(id,fn)=>$(id)?.addEventListener('click',guarded(fn));
  function readModal(title,html){A.openModal(title,html,async()=>{},'Cerrar');const b=$('#modalActions .primary');b.type='button';b.onclick=()=>A.closeModal(true);$('#modalCancel').classList.add('hidden');}
  const cartState={company:null,lines:[],customer:'',warehouse:'',priceList:'',seller:'',category:'',customerRow:null,data:null,sourceOrderId:'',sourceOrderNumber:''};
  const captureUnits=p=>{const units=[C.normalizeUnit(p.unit)];if(units[0]==='KG')units.push('GR');if(units[0]==='GR')units.push('KG');if(p.pack_quantity&&units[0]!=='CAJA')units.push('CAJA');if(p.pack_quantity&&p.pallet_boxes&&units[0]!=='PALLET')units.push('PALLET');return units;};
  // El buscador conserva sus eventos al pasar al encabezado; vuelve al POS
  // cuando la ventana es estrecha y se retira al abandonar este módulo.
  function mountHeaderSearch(root){
    const header=$('#app .topbar'),host=$('#posHeaderSearch'),home=$('.pos-topbar',root),wrap=$('.pos-search-wrap',root),content=$('#content'),ticket=$('.pos-sale',root),ticketHead=$('.pos-ticket-head',root);
    if(!header||!host||!home||!wrap||!content||!ticket||!ticketHead)return;
    const notes=[...root.children].filter(el=>el.matches('.pos-pending-note'));
    const locations=[home,...notes].map(el=>{const marker=document.createComment('POS responsive');el.before(marker);return{el,marker};});
    let active=true;
    const desktop=window.matchMedia('(min-width:1101px)'),columns=window.matchMedia('(min-width:821px)');
    const sync=()=>{
      if(!active||!root.isConnected)return;
      if(columns.matches){
        if(home.parentElement!==ticketHead)ticketHead.append(home);
        if(notes.some(el=>el.parentElement!==ticket))ticketHead.after(...notes);
      }else locations.forEach(({el,marker})=>{if(el.parentElement!==root)marker.after(el);});
      const style=getComputedStyle(header),fixed=[...header.children].filter(el=>el!==host&&getComputedStyle(el).display!=='none');
      const available=header.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-fixed.reduce((sum,el)=>sum+el.getBoundingClientRect().width,0)-(parseFloat(style.columnGap)||0)*fixed.length;
      const useHeader=desktop.matches&&available>=200;
      if(useHeader){if(wrap.parentElement!==host)host.append(wrap);host.classList.remove('hidden');}
      else{if(wrap.parentElement!==home)home.append(wrap);host.classList.add('hidden');}
      root.classList.toggle('pos-search-in-header',useHeader);
    };
    const resize=new ResizeObserver(sync);
    resize.observe(header);
    [...header.children].filter(el=>el!==host).forEach(el=>resize.observe(el));
    const observer=new MutationObserver(()=>{if(!root.isConnected)release();});
    const release=()=>{
      if(!active)return;
      active=false;resize.disconnect();observer.disconnect();desktop.removeEventListener('change',sync);columns.removeEventListener('change',sync);
      if(wrap.parentElement===host)home.append(wrap);
      locations.forEach(({el,marker})=>{marker.after(el);marker.remove();});
      host.classList.add('hidden');root.classList.remove('pos-search-in-header');
      if(releaseHeaderSearch===release)releaseHeaderSearch=()=>{};
    };
    observer.observe(content,{childList:true});
    desktop.addEventListener('change',sync);
    columns.addEventListener('change',sync);
    releaseHeaderSearch=release;
    sync();
  }
  const pendingKey=()=>`sias_pos_pending_v2:${A.state.me.companyId}:${A.state.me.user.id}`;
  const cartKey=(company=A.state.me.companyId)=>`sias_pos_cart_v2:${company}:${A.state.me.user.id}`;
  function pending(){try{return JSON.parse(localStorage.getItem(pendingKey())||'null');}catch{return null;}}
  function clearPending(key=pendingKey()){try{localStorage.removeItem(key)}catch{}}
  function saveCartDraft(){
    if(!A?.state?.me||!cartState.company)return;
    const meaningful=cartState.lines.length||cartState.customer||cartState.priceList||cartState.seller||cartState.category;
    if(!meaningful){try{localStorage.removeItem(cartKey(cartState.company));}catch{}return;}
    const data={company:cartState.company,lines:cartState.lines,customer:cartState.customer,warehouse:cartState.warehouse,priceList:cartState.priceList,seller:cartState.seller,category:cartState.category,customerRow:cartState.customerRow,sourceOrderId:cartState.sourceOrderId,sourceOrderNumber:cartState.sourceOrderNumber,saved_at:Date.now()};
    try{localStorage.setItem(cartKey(cartState.company),JSON.stringify(data));}catch{}
  }
  function restoreCartDraft(company){
    try{const raw=localStorage.getItem(cartKey(company));if(!raw)return false;const d=JSON.parse(raw);if(!d||Date.now()-Number(d.saved_at||0)>14*24*60*60*1000){localStorage.removeItem(cartKey(company));return false;}Object.assign(cartState,{company,lines:Array.isArray(d.lines)?d.lines:[],customer:String(d.customer||''),warehouse:String(d.warehouse||''),priceList:String(d.priceList||''),seller:String(d.seller||''),category:String(d.category||''),customerRow:d.customerRow||null,sourceOrderId:String(d.sourceOrderId||''),sourceOrderNumber:String(d.sourceOrderNumber||'')});return true;}catch{return false;}
  }
  function clearCartDraft(reset=true){try{localStorage.removeItem(cartKey(cartState.company||A.state.me.companyId));}catch{}if(reset)Object.assign(cartState,{company:A.state.me.companyId,lines:[],customer:'',warehouse:'',priceList:'',seller:'',category:'',customerRow:null,data:null,sourceOrderId:'',sourceOrderNumber:''});}
  async function completeCheckout(r,after={}){
    const storageKey=after.companyId&&after.userId?`sias_pos_pending_v2:${after.companyId}:${after.userId}`:pendingKey();
    clearPending(storageKey);
    if(after.companyId&&after.userId){try{localStorage.removeItem(`sias_pos_cart_v2:${after.companyId}:${after.userId}`);}catch{}}
    if(after.companyId&&(after.companyId!==A.state.me?.companyId||after.userId!==A.state.me?.user.id)){
      if(after.printView)window.SiasDtePdf.discard(after.printView);
      A.toast(`Venta ${r.document.number} registrada en la empresa anterior. Consulta su documento para imprimir.`);
      return;
    }
    clearCartDraft(true);A.closeModal(true);
    A.toast(`Venta ${r.document.number} registrada · vuelto ${money(r.change||0)}`);
    // La impresión empieza antes del refresco del catálogo, que se hace una sola vez.
    const printOptions={view:after.printView,autoPrint:true,fromPosCheckout:true};
    const printing=after.dteType?window.SiasOperations.issueConfigured(r.document.id,after.dteType,after.printFormat,after.recipientPhone,printOptions):after.printReceipt?window.SiasOperations.printDocument(r.document.id,after.printFormat||'POS_AUTO',printOptions):Promise.resolve();
    const refresh=(A.state.route==='pos'?pos():Promise.resolve()).catch(e=>A.toast('Venta registrada. No se pudo actualizar el catálogo: '+A.errorText(e),true));
    try{await printing;}catch(e){A.toast('La venta quedó registrada. '+A.errorText(e),true);}
    await refresh;
  }
  async function retryCheckout(){
    const saved=pending();if(!saved)return;
    const {print_after:after={},...request}=saved;
    const printView=(after.dteType||after.printReceipt)?window.SiasDtePdf.prepare({autoPrint:true,title:after.dteType?'Documento tributario':'Comprobante de venta'}):null;
    try{const r=await api('pos.checkout',request);await completeCheckout(r,{...after,printView});}
    catch(e){if(printView)window.SiasDtePdf.discard(printView);A.toast(A.errorText(e),true);}
  }
  async function cancelPending(){const p=pending();if(!p)return;const r=await api('pos.cancel',{request_key:p.request_key});if(r.document){await completeCheckout(r);return;}clearPending();clearCartDraft(true);await pos();A.toast('Cobro pendiente descartado');}
  async function pos(){
    const view=++viewSequence;
    const company=A.state.me.companyId;if(cartState.company!==company){Object.assign(cartState,{company,lines:[],customer:'',warehouse:'',priceList:'',seller:'',category:'',customerRow:null,data:null,sourceOrderId:'',sourceOrderNumber:''});restoreCartDraft(company);}
    const data=await api('pos.catalog',{warehouse_id:cartState.warehouse,price_list_id:cartState.priceList});
    if(view!==viewSequence||A.state.route!=='pos'||A.state.me?.companyId!==company)return;
    cartState.data=data;
    if(cartState.customerRow?.id===cartState.customer&&!data.customers.some(c=>c.id===cartState.customer))data.customers.unshift(cartState.customerRow);
    cartState.warehouse=data.warehouse_id||cartState.warehouse||data.warehouses[0]?.id||'';
    const waiting=pending(),session=data.session,activeCashier=session?data.staff.find(s=>s.id===session.cashier_id):null,cashierName=activeCashier?.name||(session?A.state.me.user.full_name:'');
    releaseHeaderSearch();
    const chargeDisabled=Boolean(waiting||!session||!A.can('POS_MANAGE'));
    $('#content').innerHTML=`<div class="pos-workspace"><div class="pos-topbar"><div><span class="pos-mark">▦</span><strong>Punto de venta</strong><small>Venta rápida</small></div><div class="pos-search-wrap"><span aria-hidden="true">⌕</span><input class="pos-search" id="posSearch" aria-label="Buscar producto o escanear código" placeholder="Buscar producto, SKU o código de barras…" autocomplete="off" ${waiting?'disabled':''}></div><div class="pos-quick-actions">${button('Caja','posCash')}${button('Traer pedido','posLoadOrder')}<button type="button" class="btn primary pos-charge-quick" id="posChargeQuick" aria-label="Cobrar venta desde acceso rápido" aria-keyshortcuts="F4" title="Cobrar venta (F4)" ${chargeDisabled?'disabled':''}><span>Cobrar</span><strong id="posChargeQuickAmount" aria-hidden="true"></strong><kbd aria-hidden="true">F4</kbd></button></div></div>`+
      (waiting?`<div class="retail-note warn pos-pending-note"><strong>Hay un cobro pendiente de verificar.</strong><p>Reintenta para recuperar la misma venta o descarta la solicitud de forma segura.</p><div class="retail-actions">${button('Reintentar cobro','posRetry',true)}${button('Descartar cobro pendiente','posCancelPending')}</div></div>`:'')+
      `<div class="pos-layout pos-reference"><section class="card pos-sale"><div class="pos-ticket-head"><div><small>TICKET ACTUAL</small><h3>Venta rápida</h3></div><div class="pos-ticket-meta"><span class="badge" id="posLineCount">0 artículos</span>${cartState.sourceOrderId?`<span class="badge ok" title="Pedido cargado para facturación">Pedido ${E(cartState.sourceOrderNumber||'')}</span>`:''}${data.stock_policy?.allow_negative_stock?`<button type="button" class="pos-stock-policy" id="posStockPolicy" title="Venta sin stock habilitada: se permite cerrar ventas aunque el stock quede negativo." aria-label="Información: venta sin stock habilitada"><span aria-hidden="true">ⓘ</span> Venta sin stock</button>`:''}</div></div><div class="pos-controls"><div class="pos-customer-field"><div class="pos-control-heading"><label for="posCustomer">Cliente</label>${A.can('CUSTOMER_MANAGE')?`<button type="button" id="posNewCustomer" class="btn secondary small" aria-label="Crear cliente sin salir del punto de venta" ${waiting?'disabled':''}>+ Nuevo cliente</button>`:''}</div><div class="pos-customer-search"><input id="posCustomerSearch" type="search" placeholder="Buscar por nombre, RUT o teléfono…" aria-label="Buscar cliente" role="combobox" aria-autocomplete="list" aria-controls="posCustomerResults" aria-expanded="false" autocomplete="off" ${waiting?'disabled':''}><div id="posCustomerResults" class="pos-customer-results" role="listbox" aria-label="Clientes encontrados" hidden></div></div><select id="posCustomer" ${waiting?'disabled':''}>${options(data.customers,cartState.customer)}</select></div><label><span class="pos-control-heading">Vendedor</span><select id="posSeller" ${waiting?'disabled':''}>${options(data.staff.filter(s=>s.roles.includes('SELLER')),cartState.seller,'Sin asignar')}</select></label></div><div class="pos-lines" id="posLines"></div><div class="pos-ticket-footer"><div class="pos-summary"><div><span>Neto + exento</span><b id="posNet"></b></div><div><span>IVA incluido</span><b id="posTax"></b></div></div><div class="pos-total"><span>Total a pagar</span><strong id="posTotal"></strong></div><button type="button" class="btn primary pos-charge" id="posCharge" aria-label="Cobrar" aria-keyshortcuts="F4" ${chargeDisabled?'disabled':''}><span>Cobrar</span><strong id="posChargeAmount" aria-hidden="true"></strong></button><div class="pos-ticket-actions">${button('Vaciar ticket','posClear')}<span>F2 buscar · F4 cobrar</span></div></div></section><section class="card pos-catalog"><div class="pos-catalog-head"><div><h3>Catálogo</h3><small class="master-help" id="posCatalogCount"></small></div><div class="pos-controls"><label>Bodega<select id="posWarehouse" ${waiting?'disabled':''}>${options(data.warehouses,cartState.warehouse)}</select></label><label>Lista de precios<select id="posPriceList" ${waiting||cartState.lines.length?'disabled':''}>${options(data.lists,cartState.priceList,'Precio de venta')}</select></label></div></div><div class="pos-categories" id="posCategories" role="group" aria-label="Categorías"></div><div class="pos-products" id="posProducts"></div></section></div><div class="pos-session">${session?badge('OPEN')+'<strong>'+E(session.register_code)+'</strong> · '+E(A.fmtDate(session.opened_at))+`<span class="pos-cashier-pill">Cajero: <strong>${E(cashierName||'Sin asignar')}</strong></span>`:badge('Caja cerrada',false)+'<span>Abre una caja para cobrar.</span>'}${!session&&A.can('POS_MANAGE')?button('Abrir caja','posOpenCash',true):''}<span class="pos-session-end">SiasCloud · ${E((A.state.me.companies||[]).find(c=>c.id===company)?.trade_name||'Venta por unidad, peso y empaque')}</span></div></div>`;
    const root=$('.pos-workspace'),isCurrent=()=>root.isConnected&&view===viewSequence&&A.state.route==='pos'&&A.state.me?.companyId===company;
    const searchInput=$('#posSearch',root),chargeButtons=[$('#posCharge',root),$('#posChargeQuick',root)];
    const syncChargeAmounts=()=>{if(isCurrent())chargeButtons.forEach(b=>{const amount=$('strong',b);if(amount)amount.textContent=money(C.totals(cartState.lines));});};
    let openingCharge=false;
    const startCharge=async()=>{
      if(!isCurrent()||openingCharge||chargeDisabled||$('#modal')?.open)return;
      openingCharge=true;
      chargeButtons.forEach(b=>A.setBusy(b,true,'Abriendo…'));
      try{await charge(session);}catch(err){A.toast(A.errorText(err),true);}
      finally{openingCharge=false;chargeButtons.forEach(b=>{if(b.isConnected)A.setBusy(b,false);});syncChargeAmounts();}
    };
    chargeButtons.forEach(b=>b.addEventListener('click',startCharge));
    mountHeaderSearch(root);
    let products=data.products,searchSequence=0,timer;
    const catalogProducts=[...data.products];
    const normalizeSearch=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const compactSearch=v=>normalizeSearch(v).replace(/\s+/g,'');
    const editDistance=(a,b,max=2)=>{
      if(Math.abs(a.length-b.length)>max)return max+1;
      let prev=Array.from({length:b.length+1},(_,i)=>i);
      for(let i=1;i<=a.length;i++){
        const cur=[i];let rowMin=i;
        for(let j=1;j<=b.length;j++){const cost=a[i-1]===b[j-1]?0:1;cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost);rowMin=Math.min(rowMin,cur[j]);}
        if(rowMin>max)return max+1;prev=cur;
      }
      return prev[b.length];
    };
    const fuzzyScore=(p,raw)=>{
      const q=normalizeSearch(raw);if(!q)return 1;
      const qCompact=compactSearch(raw),tokens=q.split(/\s+/).filter(Boolean);
      const name=normalizeSearch(p.name),sku=normalizeSearch(p.sku),barcode=normalizeSearch(p.barcode),category=normalizeSearch(p.category),description=normalizeSearch(p.description);
      const compactName=name.replace(/\s+/g,''),all=[name,sku,barcode,category,description].filter(Boolean).join(' '),words=all.split(/\s+/).filter(Boolean);
      if(q===barcode||q===sku)return 2000;
      if(qCompact&&(qCompact===compactSearch(p.barcode)||qCompact===compactSearch(p.sku)))return 1950;
      let score=0;
      if(name===q)score=Math.max(score,1500);
      if(name.startsWith(q))score=Math.max(score,1250);
      if(compactName.includes(qCompact))score=Math.max(score,1100);
      if(sku.startsWith(q)||barcode.startsWith(q))score=Math.max(score,1050);
      if(all.includes(q))score=Math.max(score,900);
      let matched=0;
      for(const t of tokens){
        let best=0;
        if(all.includes(t))best=160;
        else if(words.some(w=>w.startsWith(t)))best=135;
        else if(t.length>=4&&words.some(w=>Math.abs(w.length-t.length)<=2&&editDistance(w,t,2)<=Math.min(2,Math.floor(t.length/4))))best=95;
        if(best){matched++;score+=best;}
      }
      if(tokens.length&&matched===tokens.length)score+=400;
      else if(tokens.length>1&&matched<Math.ceil(tokens.length*.67))return 0;
      return score;
    };
    const localSearch=(text,source=catalogProducts)=>{
      const q=normalizeSearch(text);
      const pool=(cartState.category&&q?source.filter(p=>p.category===cartState.category):source);
      if(!q)return cartState.category?pool.filter(p=>p.category===cartState.category):pool;
      return pool.map((p,i)=>({p,score:fuzzyScore(p,text),i})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.p);
    };
    const categories=data.categories||[...new Set(data.products.map(p=>p.category).filter(Boolean))].sort();
    $('#posCategories').innerHTML=['',...categories].map((c,i)=>`<button type="button" class="pos-category ${c===(cartState.category||'')?'active':''}" data-pos-category="${E(c)}" aria-pressed="${c===(cartState.category||'')}" style="--category-accent:${['#389bdf','#a98adb','#e5a850','#48b7a7','#e47e94'][i%5]}" ${waiting?'disabled':''}>${E(c||'Todos')}</button>`).join('');
    const drawProducts=()=>{if(!isCurrent())return;const host=$('#posProducts',root);host.innerHTML=products.map(p=>`<article class="pos-product ${waiting?'is-disabled':''}" data-pos-product="${E(p.id)}" tabindex="${waiting?'-1':'0'}" role="button" aria-label="Agregar ${E(p.name)} a la venta" aria-disabled="${waiting?'true':'false'}"><b class="pos-product-price">${money(p.price)}</b><div class="pos-product-image">${p.image_url?`<img alt="${E(p.name)}" src="${E(p.image_url)}" loading="lazy">`:`<span class="pos-product-placeholder" aria-hidden="true">${E((p.name||'P').slice(0,2).toUpperCase())}</span>`}</div>${p.image_url?`<button type="button" class="pos-product-view" data-pos-view="${E(p.id)}" ${waiting?'disabled':''}>Ver</button>`:''}<strong>${E(p.name)}</strong><small>${E(p.sku||p.barcode||'')} · ${E(C.normalizeUnit(p.unit))}</small><span class="pos-product-category">${E(p.category||'Sin categoría')}</span><span class="pos-stock ${p.stock_total>0?'':'empty-stock'}">Stock ${qty(p.stock_total)}</span><span class="pos-product-corner" aria-hidden="true">+</span></article>`).join('')||'<div class="empty">No se encontraron productos.</div>';$('#posCatalogCount').textContent=`${products.length} productos · precios por unidad base`;host.onclick=e=>{const viewBtn=e.target.closest('[data-pos-view]');if(viewBtn){e.preventDefault();e.stopPropagation();const p=products.find(p=>p.id===viewBtn.dataset.posView);window.SiasOperations?.zoomProductImage?.(p);return;}const card=e.target.closest('[data-pos-product]');if(!card||waiting)return;Promise.resolve(capture(products.find(p=>p.id===card.dataset.posProduct))).catch(err=>A.toast(A.errorText(err),true));};host.onkeydown=e=>{const card=e.target.closest('[data-pos-product]');if(!card||waiting||e.target.closest('[data-pos-view]'))return;if(e.key==='Enter'||e.key===' '){e.preventDefault();Promise.resolve(capture(products.find(p=>p.id===card.dataset.posProduct))).catch(err=>A.toast(A.errorText(err),true));}};};
    const drawLines=()=>{
      if(!isCurrent())return;const orderLocked=Boolean(cartState.sourceOrderId);
      $('#posLines').innerHTML=cartState.lines.map(x=>`<div class="pos-line"><div><strong>${E(x.name)}</strong><small>${E(x.sku||'')} · ${money(x.unit_price)} / ${E(x.unit)}</small></div><div class="pos-line-quantity"><input type="number" data-pos-qty="${E(x.product_id)}" aria-label="Cantidad de ${E(x.name)}" min="0.0001" max="1000000" step="0.0001" value="${x.quantity}" ${waiting||orderLocked?'disabled':''}><small>${E(x.unit)}</small>${captureUnits(data.products.find(p=>p.id===x.product_id)||x).length>1?`<button type="button" class="pos-capture-extra" data-pos-capture="${E(x.product_id)}" title="Agregar otra cantidad, peso o empaque" aria-label="Agregar otra cantidad o empaque de ${E(x.name)}" ${waiting?'disabled':''}>+ Cantidad</button>`:''}</div><div class="line-total">${money(Math.round(x.quantity*x.unit_price))}</div><button type="button" class="icon-btn" data-pos-remove="${E(x.product_id)}" aria-label="Quitar ${E(x.name)}" ${waiting||orderLocked?'disabled':''}>×</button></div>`).join('')||'<div class="retail-line-empty"><span class="pos-empty-icon" aria-hidden="true">▤</span><strong>Tu ticket está vacío</strong><p>Selecciona un producto o escanea su código para comenzar.</p></div>';
      const total=C.totals(cartState.lines);let tax=0;for(const x of cartState.lines){const pr=[...products,...data.products].find(p=>p.id===x.product_id)||x,lineTotal=Math.round(x.quantity*x.unit_price),rate=Number(pr.tax_rate??19);if(!pr.exempt)tax+=lineTotal-Math.round(lineTotal/(1+rate/100));}
      $('#posTotal').textContent=money(total);syncChargeAmounts();$('#posNet').textContent=money(total-tax);$('#posTax').textContent=money(tax);$('#posLineCount').textContent=`${cartState.lines.length} artículos`;
      $('#posPriceList').disabled=Boolean(waiting||cartState.lines.length);
      $$('[data-pos-remove]').forEach(b=>b.addEventListener('click',()=>{cartState.lines=cartState.lines.filter(x=>x.product_id!==b.dataset.posRemove);drawLines();}));
      $$('[data-pos-qty]').forEach(input=>input.addEventListener('change',()=>{try{const line=cartState.lines.find(x=>x.product_id===input.dataset.posQty),pr=[...products,...data.products].find(p=>p.id===line.product_id);line.quantity=C.toBase(pr||line,input.value,line.unit);drawLines();}catch(e){A.toast(A.errorText(e),true);drawLines();}}));
      $$('[data-pos-capture]',root).forEach(b=>b.addEventListener('click',guarded(()=>capture(data.products.find(p=>p.id===b.dataset.posCapture),true))));
      saveCartDraft();
    };
    $$('[data-pos-category]').forEach(b=>b.addEventListener('click',guarded(async()=>{cartState.category=b.dataset.posCategory;saveCartDraft();$$('[data-pos-category]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});await query(searchInput.value);}))); 
    async function capture(p,prompt=false){if(!p)return;if(cartState.sourceOrderId)throw new Error('El ticket está vinculado a un pedido. Vacíalo para crear una venta diferente.');const available=captureUnits(p);
      if(!prompt&&available[0]==='UN'){cartState.lines=C.addCapture(cartState.lines,p,1,'UN',p.price);saveCartDraft();drawLines();const card=$(`[data-pos-product="${CSS.escape(String(p.id))}"]`,root);if(card){card.classList.remove('is-added');void card.offsetWidth;card.classList.add('is-added');setTimeout(()=>card.classList.remove('is-added'),420);}return;}
      A.openModal(`Agregar ${p.name}`,`<div class="retail-form"><div class="document-hero"><div><h3>${E(p.name)}</h3><span>${money(p.price)} / ${E(p.unit)}</span></div></div><div class="form-grid"><label>Cantidad / peso<input name="quantity" id="captureQuantity" type="number" min="0.0001" step="0.0001" value="1" required autofocus></label><label>Unidad<select name="input_unit" id="captureUnit">${available.map(u=>`<option>${E(u)}</option>`).join('')}</select></label></div><div class="pos-total"><span id="captureBase"></span><strong id="captureAmount"></strong></div></div>`,async fd=>{cartState.lines=C.addCapture(cartState.lines,p,fd.get('quantity'),fd.get('input_unit'),p.price);saveCartDraft();return {toast:'Producto agregado',skipRender:true,afterSave:()=>drawLines()};},'Agregar');
      const recalc=()=>{try{const amount=C.toBase(p,$('#captureQuantity').value,$('#captureUnit').value);$('#captureBase').textContent=`${qty(amount)} ${C.normalizeUnit(p.unit)}`;$('#captureAmount').textContent=money(Math.round(amount*p.price));}catch{$('#captureAmount').textContent='Revisa la cantidad';}};$('#captureQuantity').addEventListener('input',recalc);$('#captureUnit').addEventListener('change',recalc);recalc();$('#captureQuantity').select();}
    const applyLocalSearch=text=>{products=localSearch(text);drawProducts();return products;};
    const query=async (text,all=false)=>{
      const seq=++searchSequence,q=String(text||'').trim();
      if(!isCurrent())return [];
      if(all&&cartState.category){cartState.category='';$$('[data-pos-category]',root).forEach(b=>{const active=b.dataset.posCategory==='';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
      const local=applyLocalSearch(q);
      const r=await api('pos.catalog',{search:q,warehouse_id:cartState.warehouse,price_list_id:cartState.priceList,category:all?'':cartState.category});
      if(seq!==searchSequence||!isCurrent()||searchInput.value.trim()!==q)return products;
      for(const p of r.products||[]){const i=catalogProducts.findIndex(x=>x.id===p.id);if(i<0)catalogProducts.push(p);else catalogProducts[i]=p;}
      const merged=new Map([...local,...(r.products||[])].map(p=>[p.id,p]));
      products=localSearch(q,[...merged.values()]);drawProducts();return products;
    };
    searchInput.addEventListener('input',e=>{
      clearTimeout(timer);searchSequence++;
      const value=e.target.value;applyLocalSearch(value);
      if(value.trim().length>=2)timer=setTimeout(()=>query(value).catch(err=>{if(isCurrent())A.toast(A.errorText(err),true);}),160);
    });
    searchInput.addEventListener('keydown',guarded(async e=>{
      if(e.key==='Escape'){e.preventDefault();searchSequence++;e.target.value='';clearTimeout(timer);applyLocalSearch('');return;}
      if(e.key!=='Enter')return;
      e.preventDefault();clearTimeout(timer);
      const q=e.target.value.trim();if(!q)return;
      const exact=products.filter(p=>[p.sku,p.barcode].some(v=>v&&compactSearch(v)===compactSearch(q)));
      if(exact.length===1){await capture(exact[0]);e.target.value='';applyLocalSearch('');return;}
      await query(q,true);
      if(!isCurrent()||e.target.value.trim()!==q)return;
      if(products.length===1){await capture(products[0]);e.target.value='';applyLocalSearch('');return;}
      A.toast(products.length?`${products.length} coincidencias. Selecciona el producto.`:'No encontré coincidencias. Prueba con parte del nombre, SKU o código.',!products.length);
    }));
    function loadOrderModal(){
      A.openModal('Traer pedido a facturación',`<div class="form-stack"><div class="source-strip"><strong>Buscar pedido</strong><span>Ingresa el folio/número del pedido. Al cargarlo, se conservarán cliente, productos, cantidades y precios.</span></div><div class="form-grid"><label class="full">Número de pedido<input id="posOrderQuery" type="search" placeholder="Ej. PED-000123" autocomplete="off"></label></div><div class="toolbar-actions"><button type="button" class="btn primary" id="posOrderSearch">Consultar pedido</button></div><div id="posOrderResults" class="list"><span class="muted">Escribe el número y consulta.</span></div></div>`,async()=>({skipRender:true}),'Cerrar');
      const search=async()=>{
        const q=$('#posOrderQuery')?.value.trim();if(!q)throw new Error('Ingresa el número del pedido');
        const b=$('#posOrderSearch');A.setBusy(b,true,'Buscando…');
        try{
          const r=await api('pos.order.lookup',{query:q}),rows=r.rows||[],host=$('#posOrderResults');
          host.innerHTML=rows.length?rows.map(x=>`<div class="list-item"><div><strong>${E(x.number)}</strong><small class="cell-sub">${E(x.sias_customers?.legal_name||'Cliente')} · ${money(x.total)} · ${E(x.status)}</small>${x.already_billed?`<small class="cell-sub danger-text">Ya facturado en ${E(x.already_billed.number||'venta existente')}</small>`:''}</div><button type="button" class="btn ${x.already_billed?'secondary':'primary'} small" data-pos-order="${E(x.id)}" ${x.already_billed?'disabled':''}>${x.already_billed?'Facturado':'Cargar'}</button></div>`).join(''):'<div class="empty">No encontré pedidos con ese número.</div>';
          $$('[data-pos-order]',host).forEach(btn=>btn.addEventListener('click',guarded(async()=>{
            const detail=await api('documents.get',{id:btn.dataset.posOrder}),d=detail.document,items=detail.items||[];
            if(d.document_type!=='ORDER'||d.status==='VOID')throw new Error('El pedido no está disponible');
            if(!items.length)throw new Error('El pedido no tiene productos');
            cartState.customer=d.customer_id||'';cartState.customerRow=d.sias_customers||data.customers.find(c=>c.id===d.customer_id)||null;
            cartState.warehouse=d.warehouse_id||cartState.warehouse;cartState.priceList='';cartState.sourceOrderId=d.id;cartState.sourceOrderNumber=d.number||'';
            cartState.lines=items.map(it=>({product_id:it.product_id,name:it.description,sku:it.sku||'',unit:it.unit||'UN',quantity:Number(it.quantity),unit_price:Number(it.unit_price)}));
            saveCartDraft();A.closeModal(true);await pos();A.toast(`Pedido ${d.number} cargado para facturación`);
          })));
        }finally{if(b?.isConnected)A.setBusy(b,false);}
      };
      $('#posOrderSearch')?.addEventListener('click',guarded(search));
      $('#posOrderQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search().catch(err=>A.toast(A.errorText(err),true));}});
      setTimeout(()=>$('#posOrderQuery')?.focus(),0);
    }
    $('#posWarehouse').addEventListener('change',guarded(async e=>{cartState.warehouse=e.target.value;saveCartDraft();await pos();}));$('#posPriceList').addEventListener('change',guarded(async e=>{cartState.priceList=e.target.value;saveCartDraft();await pos();}));$('#posCustomer').addEventListener('change',e=>{if(cartState.sourceOrderId&&e.target.value!==cartState.customer){A.toast('El cliente está fijado por el pedido. Vacía el ticket para cambiarlo.',true);e.target.value=cartState.customer;return;}cartState.customer=e.target.value;cartState.customerRow=data.customers.find(c=>c.id===cartState.customer)||null;saveCartDraft();});$('#posSeller').addEventListener('change',e=>{cartState.seller=e.target.value;saveCartDraft();});
    on('#posLoadOrder',()=>{if(waiting)return;loadOrderModal();});on('#posNewCustomer',()=>{if(waiting||!A.can('CUSTOMER_MANAGE'))return;A.customerModal({}, {title:'Nuevo cliente para esta venta',saveLabel:'Crear y seleccionar',toast:'Cliente creado y seleccionado',onSaved:row=>{if(A.state.me.companyId===company){cartState.customer=row.id;cartState.customerRow=row;saveCartDraft();}}});});on('#posClear',()=>{if(waiting)return;cartState.lines=[];cartState.sourceOrderId='';cartState.sourceOrderNumber='';saveCartDraft();drawLines();});on('#posCash',()=>A.navigate('cash'));$('#posStockPolicy',root)?.addEventListener('click',()=>A.toast('Venta sin stock habilitada: se permite cerrar ventas aunque el stock quede negativo.'));on('#posOpenCash',A.openCash);on('#posRetry',retryCheckout);on('#posCancelPending',cancelPending);window.SiasPosCustomers.bind({root,A,customers:data.customers,isCurrent,onSelect:c=>{cartState.customer=c.id;cartState.customerRow=c;saveCartDraft();}});products=localSearch('');drawProducts();drawLines();
  }
  async function charge(session){
    if(!cartState.lines.length)throw new Error('Agrega productos');if(!cartState.customer)throw new Error('Selecciona el cliente');if(!cartState.warehouse)throw new Error('Selecciona la bodega');
    const chargeCustomer=cartState.customer,chargeCompany=A.state.me.companyId;
    const [creditData,printData,recipientData]=await Promise.all([
      A.can('CREDIT_VIEW')&&A.can('CREDIT_MANAGE')?api('credits.list',{customer_id:chargeCustomer,available:true}):Promise.resolve({rows:[]}),
      api('printing.config.get').catch(()=>({formats:{}})),
      A.can('BILLING_MANAGE')?window.SiasDtePdf.recipient({customer_id:chargeCustomer}):Promise.resolve({phone:''})
    ]);
    if(chargeCustomer!==cartState.customer||chargeCompany!==A.state.me.companyId||A.state.route!=='pos')throw new Error('La venta cambió. Abre el cobro nuevamente.');
    const sale={customer:chargeCustomer,warehouse:cartState.warehouse,priceList:cartState.priceList,seller:cartState.seller,lines:cartState.lines.map(x=>({...x}))};
    if(!sale.lines.length)throw new Error('Agrega productos');
    const total=C.totals(sale.lines),credits=(creditData.rows||[]).filter(x=>x.environment===cartState.data.environment),printCfg=printData.formats||{},recipientPhone=recipientData.phone||'';
    const defaultDte=Number(printCfg.issuance?.POS||39),paperFor=t=>printCfg.tributary?.[String(t)]||printCfg.defaults?.pos||'80MM';
    A.openModal('Cobrar venta',`<div class="retail-form"><div class="pos-total"><span>Total de la venta</span><strong>${money(total)}</strong></div><small class="master-help">Cliente: ${E(cartState.customerRow?.legal_name||'')}</small>${credits.length?`<div class="form-section"><h4>Crédito disponible del cliente</h4>${credits.map(c=>`<div class="credit-pay-row"><span>Nota ${E(c.dte?.folio||'')}<small>Saldo ${money(c.balance)} · ${E(c.environment)} · el saldo se descontará al confirmar</small></span><div class="credit-use-control"><input type="number" data-credit-payment="${E(c.id)}" min="0" max="${Math.min(c.balance,total)}" step="1" value="0" aria-label="Usar saldo de nota ${E(c.dte?.folio||'')}"><button type="button" class="btn secondary small" data-use-credit="${E(c.id)}">Usar máximo</button></div></div>`).join('')}</div>`:''}<div class="form-section"><div class="toolbar"><h4>Medios de pago</h4>${button('Agregar medio','chargeAdd')}</div><div id="chargePayments"></div></div><label>Efectivo recibido<input id="chargeReceived" type="number" min="0" step="1" value="${total}"></label><div class="settlement-check" id="chargeCheck"></div><div class="settlement-check"><span>Vuelto</span><strong id="chargeChange"></strong></div>${A.can('BILLING_MANAGE')?`<details class="form-section pos-print-options"><summary><strong id="chargePrintSummary"></strong><span>Cambiar</span></summary><div class="form-grid"><label>Emitir como<select id="chargeDteType"><option value="0">No emitir DTE</option>${[[39,'39 · Boleta electrónica'],[41,'41 · Boleta exenta'],[33,'33 · Factura electrónica'],[34,'34 · Factura exenta']].map(([v,l])=>`<option value="${v}" ${defaultDte===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Imprimir en<select id="chargeDteFormat"><option value="A4">A4</option><option value="80MM">80 mm</option><option value="58MM">57/58 mm</option></select></label><label>Teléfono<input id="chargeRecipientPhone" type="tel" maxlength="80" autocomplete="tel" value="${E(recipientPhone)}" placeholder="+56 9 1234 5678"><small>Se enviará con el documento tributario.</small></label></div></details>`:''}</div>`,async()=>{
      const payments=$$('.payment-row').map(row=>({method:$('select',row).value,amount:Number($('input',row).value),request_key:uid()})).filter(x=>x.amount>0);
      const used=$$('[data-credit-payment]').map(input=>({credit_id:input.dataset.creditPayment,amount:Number(input.value),request_key:uid()})).filter(x=>x.amount>0);C.settlement(total,payments,used);
      const received=Number($('#chargeReceived').value),cash=payments.filter(x=>x.method==='CASH').reduce((s,x)=>s+x.amount,0);if(cash&&(!Number.isSafeInteger(received)||received<cash))throw new Error('El efectivo recibido no cubre el pago');
      if(chargeCompany!==A.state.me.companyId)throw new Error('La empresa activa cambió. Abre el cobro nuevamente.');
      const p={request_key:uid(),cash_session_id:session.id,customer_id:sale.customer,warehouse_id:sale.warehouse,price_list_id:sale.priceList||null,seller_id:sale.seller||null,source_document_id:cartState.sourceOrderId||null,items:sale.lines.map(x=>({product_id:x.product_id,quantity:x.quantity,input_unit:x.unit,unit_price:x.unit_price})),payments,credits:used,cash_received:received};
      const dteType=A.can('BILLING_MANAGE')?Number($('#chargeDteType')?.value||0):0;
      const printFormat=dteType?($('#chargeDteFormat')?.value||paperFor(dteType)):(printCfg.system?.POS_RECEIPT||printCfg.defaults?.pos||'80MM');
      const after={dteType,printFormat,recipientPhone:$('#chargeRecipientPhone')?.value.trim(),printReceipt:!dteType,companyId:chargeCompany,userId:A.state.me.user.id};
      const storageKey=pendingKey();localStorage.setItem(storageKey,JSON.stringify({...p,print_after:after}));
      // Preparar la impresión dentro del POS evita ventanas y vistas intermedias.
      const printView=window.SiasDtePdf.prepare({autoPrint:true,title:dteType?'Documento tributario':'Comprobante de venta'});
      try{const r=await api('pos.checkout',p);clearPending(storageKey);return {toast:'Venta y pagos registrados',skipRender:true,afterSave:()=>completeCheckout(r,{...after,printView})};}
      catch(e){window.SiasDtePdf.discard(printView);return {toast:'Cobro pendiente de verificar',skipRender:true,afterSave:async()=>{A.toast(A.errorText(e),true);await pos();}};}
    },'Cobrar e imprimir');
    if(A.can('BILLING_MANAGE')){const summary=()=>{const type=$('#chargeDteType'),paper=$('#chargeDteFormat'),label=$('#chargePrintSummary');if(label)label.textContent=(Number(type.value)?type.selectedOptions[0].textContent.replace(/^\d+ · /,''):'Comprobante interno')+' · '+(Number(type.value)?paper.selectedOptions[0]?.textContent:(printCfg.system?.POS_RECEIPT||printCfg.defaults?.pos||'80MM').replace('MM',' mm'));};const syncDtePaper=()=>{const t=Number($('#chargeDteType')?.value||0),sel=$('#chargeDteFormat');if(sel){sel.disabled=!t;if(t)sel.value=paperFor(t);}summary();};$('#chargeDteType')?.addEventListener('change',syncDtePaper);$('#chargeDteFormat')?.addEventListener('change',summary);syncDtePaper();}
    const recalc=()=>{const paid=$$('.payment-row').reduce((s,row)=>s+Number($('input',row).value||0),0)+$$('[data-credit-payment]').reduce((s,input)=>s+Number(input.value||0),0),cash=$$('.payment-row').filter(row=>$('select',row).value==='CASH').reduce((s,row)=>s+Number($('input',row).value||0),0);$('#chargeCheck').classList.toggle('invalid',paid!==total);$('#chargeCheck').innerHTML=`<span>${paid===total?'Pago completo':'Pendiente '+money(total-paid)}</span><strong>${money(paid)}</strong>`;$('#chargeChange').textContent=money(Math.max(0,Number($('#chargeReceived').value||0)-cash));};
    const rebalanceAfterCredit=()=>{const creditUsed=$$('[data-credit-payment]').reduce((s,input)=>s+Number(input.value||0),0),rows=$$('.payment-row');if(rows.length){const first=rows[0],amount=$('input',first);if(amount)amount.value=String(Math.max(0,total-creditUsed-rows.slice(1).reduce((s,row)=>s+Number($('input',row).value||0),0)));}recalc();};
    const add=(method='CASH',amount=0)=>{const row=document.createElement('div');row.className='payment-row';row.innerHTML=`<select aria-label="Medio de pago">${['CASH','CARD','TRANSFER'].map(m=>`<option value="${m}" ${m===method?'selected':''}>${methods[m]}</option>`).join('')}</select><input type="number" min="0" step="1" value="${amount}" aria-label="Monto del pago"><button type="button" class="icon-btn" aria-label="Quitar medio de pago">×</button>`;$('#chargePayments').appendChild(row);row.addEventListener('input',recalc);row.addEventListener('change',recalc);$('button',row).addEventListener('click',()=>{row.remove();recalc();});};on('#chargeAdd',()=>{add();recalc();});$$('[data-credit-payment]').forEach(input=>input.addEventListener('input',rebalanceAfterCredit));$$('[data-use-credit]').forEach(btn=>btn.addEventListener('click',()=>{const input=$(`[data-credit-payment="${CSS.escape(btn.dataset.useCredit)}"]`),others=$$('[data-credit-payment]').filter(x=>x!==input).reduce((s,x)=>s+Number(x.value||0),0);if(input)input.value=String(Math.max(0,Math.min(Number(input.max||0),total-others)));rebalanceAfterCredit();}));$('#chargeReceived').addEventListener('input',recalc);add('CASH',total);recalc();
  }
  window.SiasPos={init:value=>{A=value;document.addEventListener('keydown',e=>{if(A.state.route!=='pos'||$('#modal')?.open)return;if(e.key==='F2'){e.preventDefault();$('#posSearch')?.focus();}if(e.key==='F4'){e.preventDefault();$('#posCharge')?.click();}});},render:pos};
})();
