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
- Más espacio vertical antes de la franja azul inferior del POS.
- No cambia lógica de ventas, stock, precios ni botones.
- Móvil conserva comportamiento compacto.
