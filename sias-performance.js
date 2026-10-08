/* SIASCLOUD v3.3.0 rendimiento adaptable: no fuerza drivers de GPU ni reserva RAM del sistema. */
(()=>{'use strict';
 const gb=Number(navigator.deviceMemory||0),cores=Number(navigator.hardwareConcurrency||0);
 const constrained=Boolean((gb&&gb<=2)||(cores&&cores<=2));
 if(constrained)document.documentElement.classList.add('sias-eco');
 window.SiasPerformance=Object.freeze({mode:constrained?'economico':'automatico',deviceMemoryGb:gb||null,logicalCores:cores||null,
   // Browser/Windows administran los procesos y la aceleracion segun la GPU disponible.
   acceleration:'administrada-por-el-navegador'});
})();
