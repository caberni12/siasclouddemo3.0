SIASCLOUD ERP 3.3.0 · ENTREGA ACTUALIZADA HASTA 2026-10-05
============================================================

Esta ZIP reemplaza las entregas/hotfix anteriores como base de trabajo actual.

INCLUYE
- ERP principal.
- POS y continuidad de operación.
- Campana de notificaciones con apertura inmediata y refresco en segundo plano.
- Maestro de Productos con eliminación protegida.
- Galería/álbum de hasta 12 imágenes adicionales por producto.
- Zoom/visor de imágenes en Maestro, POS, Tienda y Portal Mayorista.
- Tienda pública con header, carrusel full-screen, tarjetas comerciales, footer, redes y WhatsApp.
- Carrusel con encuadre natural para evitar imágenes excesivamente recortadas.
- Portal Mayorista.
- Integración DTE existente.
- SQL maestro de SiasCloud 3.3.0.
- Migración 3.2.16 -> 3.3.0.
- SQL auxiliar para vincular las 50 imágenes DEMO ya cargadas en Supabase Storage.

IMÁGENES DEMO EN SUPABASE
- Bucket: siascloud-public
- Carpeta: products/
- Se conserva el nombre original por SKU.
- Archivo SQL: ACTUALIZACION_IMAGENES_DEMO_SUPABASE.sql
- CSV de referencia: datos/Supabase_50_URLS_PRODUCTOS.csv

PARA VINCULAR LAS 50 FOTOS
1. Abre Supabase > SQL Editor.
2. Ejecuta ACTUALIZACION_IMAGENES_DEMO_SUPABASE.sql.
3. Revisa la vista previa de los 50 productos y ejecuta el bloque UPDATE.
4. Recarga SiasCloud con Ctrl+F5.

DESPLIEGUE COMPLETO
- Frontend: reemplazar los archivos planos del repositorio GitHub.
- Backend: supabase/functions/siascloud-erp/index.ts
- Instalación nueva: SQL_MAESTRO_SIASCLOUD_V3_3_0.sql
- Actualización desde 3.2.16: MIGRACION_3_2_16_A_3_3_0.sql

No es necesario volver a subir las imágenes al repositorio GitHub: ya están alojadas en Supabase Storage.

HOTFIX VISUAL POS
- El catálogo ocupa toda la altura hasta la franja inferior, sin hueco blanco.
- Las columnas del ticket y del catálogo comparten la misma altura.
- Los productos mantienen su información y se desplazan dentro del catálogo.
- Ventas, stock y precios conservan su proceso actual.
- Móvil conserva comportamiento compacto.
- Buscador de productos en el encabezado principal cuando hay espacio.
- Botón Caja y cierre y avisos compactos dentro del ticket de la izquierda.
- Acceso rápido Cobrar arriba, junto a Caja y cierre, con total y atajo F4.
- El botón superior y el inferior abren el mismo formulario de cobro.
- Ambos se bloquean durante la preparación del cobro y respetan la caja,
  los permisos y las solicitudes pendientes de verificar.
- En móvil el acceso rápido aparece en la barra superior del POS.
- Ticket y catálogo comienzan a la misma altura, con títulos alineados.
- Ambos paneles quedan pegados al encabezado superior, sin margen encima.
- En ventanas estrechas, el buscador vuelve a la barra del POS.
- Para esta corrección reemplazar index.html, pos.css y pos.js en GitHub.
- El CSS y JavaScript del POS llevan nuevas referencias de caché. Recargar con Ctrl+F5.

AJUSTE IMPRESIÓN 2026-10-06
Para actualizar desde SiasCloud_ERP_3_3_0_HOTFIX_IMPRESION_DIRECTA_POS_ESTABLE_20261006, reemplaza el frontend del paquete y recarga completamente el navegador. No es necesario ejecutar SQL ni desplegar otra vez la función Supabase para este ajuste.
El POS abre el cobro con los valores guardados y Cobrar e imprimir solicita la impresión sin otro visor del ERP. El navegador conserva su diálogo de impresora.
Detalles y límites de prueba: LEEME_HOTFIX_IMPRESION_DIRECTA_2026_10_06.txt.
