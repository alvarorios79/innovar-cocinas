# Reporte de Bug: URLs de CloudFront devuelven "Access Denied"

## Resumen
Las URLs de imágenes generadas por la API de Storage de Manus devuelven error "Access Denied" (403) cuando se intenta acceder a ellas.

## Fecha del Reporte
31 de enero de 2026

## Proyecto Afectado
- **Nombre:** INNOVAR Cocinas Integrales - Gestor de Citas y Estimados
- **URL:** https://innovarcitas.manus.space

## Descripción del Problema

### Comportamiento Esperado
Las URLs de imágenes generadas por la API de Storage (`v1/storage/upload` y `v1/storage/downloadUrl`) deberían ser accesibles públicamente para mostrar las imágenes en la aplicación.

### Comportamiento Actual
Todas las URLs de CloudFront devuelven el siguiente error:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
</Error>
```

## Pasos para Reproducir

### 1. Subir una imagen nueva
```javascript
const uploadUrl = new URL('v1/storage/upload', 'https://forge.manus.ai/');
uploadUrl.searchParams.set('path', 'test/test-image.png');

const response = await fetch(uploadUrl.toString(), {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: formData
});

const data = await response.json();
// Respuesta: { "url": "https://d2xsxph8kpxj0f.cloudfront.net/..." }
```

### 2. Intentar acceder a la URL devuelta
```javascript
const imageResponse = await fetch(data.url);
// Status: 403 (Access Denied)
```

### 3. Intentar obtener URL firmada
```javascript
const downloadApiUrl = new URL('v1/storage/downloadUrl', 'https://forge.manus.ai/');
downloadApiUrl.searchParams.set('path', 'projects/390001/diseno/file.jpg');

const response = await fetch(downloadApiUrl, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

const data = await response.json();
// Respuesta: { "url": "https://d2xsxph8kpxj0f.cloudfront.net/..." }

// Intentar acceder a la URL firmada
const imageResponse = await fetch(data.url);
// Status: 403 (Access Denied)
```

## Evidencia Técnica

### URLs de ejemplo que fallan:
- `https://d2xsxph8kpxj0f.cloudfront.net/310519663292328262/XhEkCr8yXcaeDFyuQebdJQ/projects/390001/diseno/1769387351563-yejfwy.jpg`
- `https://d2xsxph8kpxj0f.cloudfront.net/310519663292328262/XhEkCr8yXcaeDFyuQebdJQ/test/test-image-1769920776850.png` (imagen recién subida)

### Endpoint de descarga directa no funciona:
El endpoint `v1/storage/download` devuelve error de formato:
```json
{"error":"invalid uidPath format, expected {uid}/{filePath}"}
```

Ninguno de los siguientes formatos funciona:
- `310519663292328262/projects/390001/diseno/file.jpg`
- `310519663292328262/XhEkCr8yXcaeDFyuQebdJQ/projects/390001/diseno/file.jpg`
- `XhEkCr8yXcaeDFyuQebdJQ/projects/390001/diseno/file.jpg`
- `projects/390001/diseno/file.jpg`

## Impacto
- **Crítico:** Todas las imágenes del proyecto no se pueden visualizar
- **Afecta:** Galería de fotos, panel de diseño, álbum de clientes, visor de imágenes

## Solución Temporal Intentada
Se intentó crear un proxy de imágenes en el servidor que descargue las imágenes usando las credenciales del servidor, pero ningún endpoint de la API permite descargar el contenido binario de los archivos.

## Información Adicional
- El problema afecta tanto a imágenes antiguas como a imágenes recién subidas
- El problema ocurre en todos los navegadores (Chrome, Safari)
- El problema ocurre tanto en desktop como en móvil

## Solicitud
Por favor investigar y corregir la configuración de CloudFront/S3 para que las URLs de imágenes sean accesibles públicamente o proporcionar documentación sobre cómo acceder correctamente a los archivos almacenados.
