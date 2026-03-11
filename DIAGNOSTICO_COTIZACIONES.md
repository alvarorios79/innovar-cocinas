# Diagnóstico: Visualización de Cotizaciones

## Problema Reportado
La página de Cotizaciones solo muestra 1 cotización en lugar de las 388 que existen en la base de datos.

## Hallazgos

### 1. Base de Datos
- **Total de cotizaciones:** 388 (confirmado en Panel CEO)
- **Cotizaciones únicas por número base:** 15 (confirmado por consulta SQL)
- Esto significa que hay múltiples versiones de cada cotización (ej: "2025-001", "2025-001-v2", "2025-001-v3", etc.)

### 2. Función `getAllQuotationsGroupedByBase()`
**Ubicación:** `server/db.ts` líneas 1205-1290

**Propósito:** Agrupar cotizaciones por número base y retornar estructura esperada por el frontend

**Estructura retornada:**
```javascript
{
  baseQuotationId: number,
  quotationNumber: string,
  client: object | null,
  status: string,
  createdAt: date,
  activeVersion: object,
  versions: array
}
```

**Problema identificado:** La función intenta acceder a `quot.client` que no existe en el resultado de la consulta SQL.

### 3. Endpoint `listPaginatedGrouped`
**Ubicación:** `server/routers/quotations.ts` líneas 276-323

**Correcciones aplicadas:**
1. ✅ Removido mapeo incorrecto que intentaba acceder a `group.clientId` (que no existe)
2. ✅ Agregado mapeo correcto de clientes usando `getAllClients()` y `clientMap`
3. ✅ Agregado logging para diagnosticar el flujo de datos

### 4. Parámetro `archived`
**Problema identificado:** Lógica de filtrado por `isArchived` estaba limitando resultados

**Corrección aplicada:**
- Cuando `archived === false` (pestaña "Activas"): Mostrar TODAS las cotizaciones (sin filtrar por isArchived)
- Cuando `archived === true` (pestaña "Archivadas"): Mostrar solo las archivadas (isArchived = 1)

### 5. Frontend
**Ubicación:** `client/src/pages/Quotations.tsx`

**Cambios realizados:**
1. ✅ Agregado console.log para diagnosticar cuántas cotizaciones se reciben
2. ✅ Verificado que el parámetro `archived` se pasa correctamente

## Próximos Pasos para Investigación

1. **Revisar logs del servidor** para ver qué retorna `getAllQuotationsGroupedByBase()`:
   - `allQuotations.length` (total de cotizaciones obtenidas)
   - `grouped.length` (total de grupos después de agrupar)
   - Primeros 3 grupos para verificar estructura

2. **Verificar si el problema está en:**
   - La consulta SQL (no retorna todas las cotizaciones)
   - La lógica de agrupación (agrupa incorrectamente)
   - La paginación (limita los resultados)

3. **Posibles causas:**
   - El filtro `whereConditions` está filtrando más de lo esperado
   - La función `orderBy` está causando un problema
   - Hay un problema con la paginación

## Cambios Realizados

### server/db.ts
- Línea 1216-1224: Modificada lógica de filtrado por `isArchived`
- Línea 1231-1234: Agregados logs para diagnosticar `allQuotations`
- Línea 1280-1281: Agregados logs para diagnosticar `grouped`

### server/routers/quotations.ts
- Línea 296-308: Reescrito endpoint para mapear correctamente clientes
- Línea 310-315: Agregados logs de diagnóstico

### client/src/pages/Quotations.tsx
- Línea 1546-1551: Agregados console.log para diagnosticar datos del frontend

## Notas Importantes

- El sistema de separación de datos (`dataOrigin = 'manual'`) está funcionando correctamente
- El filtro `deletedAt IS NULL` está funcionando correctamente
- El cliente se está mostrando correctamente después de la corrección del mapeo
- La paginación está configurada para 50 cotizaciones por página

## Recomendaciones

1. Ejecutar la consulta SQL directamente para verificar cuántas cotizaciones retorna con los filtros actuales
2. Revisar los logs del servidor para ver los valores de `allQuotations.length` y `grouped.length`
3. Verificar si hay un problema con la ordenación por `quotationNumber` (podría haber valores NULL o formato inesperado)
4. Considerar agregar índices en la columna `quotationNumber` para mejorar el rendimiento
