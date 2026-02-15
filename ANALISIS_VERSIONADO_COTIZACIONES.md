# ANÁLISIS DE ARQUITECTURA: Versionado de Cotizaciones

**Fecha:** 13 de febrero de 2026  
**Objetivo:** Validar si el flujo de versionado encaja con arquitectura actual  
**Alcance:** Cambios mínimos necesarios para implementar  

---

## 1. ESTADO ACTUAL DEL SCHEMA

### 1.1 Tabla `quotations` - Campos relevantes

| Campo | Tipo | Actual | Necesario |
|-------|------|--------|-----------|
| `id` | INT | ✅ PK | ✅ |
| `quotationNumber` | VARCHAR | ✅ UNIQUE | ⚠️ Requiere cambio |
| `clientId` | INT | ✅ FK | ✅ |
| `status` | ENUM | ✅ draft/sent/approved/rejected | ✅ |
| `isLocked` | BOOLEAN | ✅ Existe | ✅ |
| `lockedAt` | TIMESTAMP | ✅ Existe | ✅ |
| `lockedBy` | INT | ✅ Existe | ✅ |
| `total` | DECIMAL | ✅ Existe | ✅ |
| `parentQuotationId` | INT | ❌ NO existe | ⚠️ Necesario |
| `isAdditional` | BOOLEAN | ❌ NO existe | ⚠️ Necesario |
| `baseQuotationId` | INT | ❌ NO existe | ⚠️ Necesario |

### 1.2 Tabla `projects` - Campos relevantes

| Campo | Tipo | Actual | Necesario |
|-------|------|--------|-----------|
| `id` | INT | ✅ PK | ✅ |
| `quotationId` | INT | ✅ FK | ✅ |
| `totalAmount` | DECIMAL | ✅ Existe | ✅ |
| `currentApprovedQuotationId` | INT | ❌ NO existe | ⚠️ Necesario |

---

## 2. CAMBIOS MÍNIMOS NECESARIOS

### 2.1 Schema - Cambios requeridos

**Cambio 1: Remover UNIQUE de quotationNumber**
```sql
-- Actual: quotationNumber VARCHAR(50) UNIQUE
-- Nuevo: quotationNumber VARCHAR(50) (sin UNIQUE)
-- Razón: Múltiples versiones pueden tener números similares (COT-2026-001, COT-2026-001-v2, etc.)
```

**Cambio 2: Agregar campos de versionado a quotations**
```sql
ALTER TABLE quotations ADD COLUMN (
  parentQuotationId INT REFERENCES quotations(id),  -- Cotización anterior (si es versión)
  isAdditional BOOLEAN DEFAULT false,               -- Es cotización adicional/versión
  baseQuotationId INT REFERENCES quotations(id),    -- Cotización base original
  versionNumber INT DEFAULT 1                       -- Número de versión (1, 2, 3...)
);
```

**Cambio 3: Agregar campo a projects**
```sql
ALTER TABLE projects ADD COLUMN (
  currentApprovedQuotationId INT REFERENCES quotations(id)  -- Última cotización aprobada
);
```

### 2.2 Router - Cambios requeridos

**Cambio 1: Extender endpoint `updateQuotation`**
- Agregar validación: Si `status = "approved"`, bloquear edición
- Si `isLocked = true`, rechazar con error claro

**Cambio 2: Crear endpoint `createAdditionalQuotation`**
- Input: `{ baseQuotationId: number, newItems: [...], notes: string }`
- Lógica:
  - Obtener cotización base aprobada
  - Crear nueva cotización con `parentQuotationId` y `baseQuotationId`
  - Copiar todos los ítems de base + agregar nuevos
  - Calcular nuevo total
  - Generar nuevo número: COT-2026-001-v2

**Cambio 3: Extender endpoint `createProjectFromQuotation`**
- Agregar campo `currentApprovedQuotationId` al crear proyecto
- Mantener referencia a cotización base

**Cambio 4: Crear endpoint `updateProjectQuotation`**
- Input: `{ projectId: number, newApprovedQuotationId: number }`
- Lógica:
  - Validar que nueva cotización esté aprobada
  - Actualizar `projects.currentApprovedQuotationId`
  - Actualizar `projects.totalAmount` con nuevo total
  - Crear historial de cambio

### 2.3 Frontend - Cambios requeridos

**Cambio 1: Quotations.tsx**
- Agregar validación: Si `isLocked = true`, deshabilitar botón Editar
- Mostrar badge "Bloqueada" en cotizaciones aprobadas
- Agregar botón "Crear versión adicional" en cotizaciones aprobadas

**Cambio 2: Crear componente `CreateAdditionalQuotation`**
- Modal para crear cotización adicional
- Mostrar cotización base aprobada
- Permitir agregar nuevos ítems
- Mostrar total actualizado

**Cambio 3: Projects.tsx**
- Mostrar "Última cotización aprobada" en tarjeta financiera
- Agregar botón "Ver cotizaciones" para listar versiones
- Mostrar historial de cotizaciones vinculadas

---

## 3. FLUJO TÉCNICO PROPUESTO

### 3.1 Crear proyecto desde cotización aprobada

```
1. Usuario hace clic en "Crear proyecto" en cotización aprobada
2. Backend:
   - Validar: quotation.status = "approved"
   - Validar: quotation.isLocked = true
   - Crear proyecto con:
     - quotationId = cotización base
     - currentApprovedQuotationId = cotización actual
     - totalAmount = cotización.total
3. Frontend: Mostrar confirmación y redirigir a proyecto
```

### 3.2 Crear cotización adicional

```
1. Usuario hace clic en "Crear versión adicional" en cotización aprobada
2. Modal abre con:
   - Cotización base (solo lectura)
   - Nuevos ítems (editable)
   - Total actualizado (calculado)
3. Usuario guarda
4. Backend:
   - Crear nueva cotización con:
     - parentQuotationId = cotización anterior
     - baseQuotationId = cotización base original
     - isAdditional = true
     - versionNumber = versionNumber + 1
     - quotationNumber = COT-2026-001-v2
   - Generar PDF con ambas secciones
5. Frontend: Mostrar nueva cotización en lista
```

### 3.3 Aprobar cotización adicional

```
1. Usuario aprueba nueva cotización
2. Backend:
   - Validar: quotation.status = "draft" o "sent"
   - Cambiar status a "approved"
   - Bloquear: isLocked = true, lockedAt = now(), lockedBy = user.id
   - SI existe proyecto vinculado:
     - Actualizar projects.currentApprovedQuotationId = nueva cotización
     - Actualizar projects.totalAmount = nueva cotización.total
3. Frontend: Mostrar confirmación
```

---

## 4. MINI-FASES PROPUESTAS

### Mini-Fase 1: Cambios de schema y migraciones
- Agregar campos a quotations
- Agregar campos a projects
- Crear índices necesarios
- Migración sin pérdida de datos

### Mini-Fase 2: Backend - Bloqueo de cotizaciones aprobadas
- Extender validación en updateQuotation
- Validar isLocked antes de permitir edición
- Crear endpoint para bloquear manualmente

### Mini-Fase 3: Backend - Crear cotización adicional
- Endpoint createAdditionalQuotation
- Lógica de copia de ítems
- Generación de número de versión
- Generación de PDF con ambas secciones

### Mini-Fase 4: Backend - Actualizar proyecto con nueva cotización
- Endpoint updateProjectQuotation
- Lógica de sincronización
- Historial de cambios

### Mini-Fase 5: Frontend - UI de bloqueo y versiones
- Badge "Bloqueada" en cotizaciones
- Botón "Crear versión adicional"
- Modal para crear versión
- Validación en formulario de edición

### Mini-Fase 6: Frontend - Mostrar historial de cotizaciones en proyecto
- Tarjeta "Cotizaciones vinculadas"
- Listar todas las versiones
- Mostrar cuál es la vigente

### Mini-Fase 7: Validación, pruebas y checkpoint final
- Validación visual (desktop, tablet, móvil)
- Pruebas de flujo completo
- Checkpoint final

---

## 5. COMPATIBILIDAD CON ARQUITECTURA ACTUAL

### ✅ Lo que encaja perfectamente:
1. ✅ Schema permite agregar campos sin romper existentes
2. ✅ Router puede extenderse con nuevos endpoints
3. ✅ Frontend puede agregar nuevos componentes sin afectar existentes
4. ✅ Paginación (Prioridad 2) no se ve afectada
5. ✅ Contabilidad no se ve afectada

### ⚠️ Lo que requiere cuidado:
1. ⚠️ Cambiar quotationNumber de UNIQUE a NO UNIQUE (migración segura)
2. ⚠️ Validar que updateQuotation no permita editar bloqueadas
3. ⚠️ Generar números de versión de forma consistente

### ❌ Lo que NO se afecta:
1. ❌ Módulo de Contabilidad (completamente independiente)
2. ❌ Módulo de Proyectos (solo lectura de cotización)
3. ❌ Módulo de Citas (sin relación)
4. ❌ Módulo de Clientes (sin cambios)

---

## 6. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Severidad | Mitigación |
|--------|-------------|-----------|-----------|
| Cotizaciones huérfanas | Baja | Media | Validar FK antes de operaciones |
| Sincronización fallida | Media | Alta | Usar transacciones en updateProjectQuotation |
| Números duplicados | Baja | Alta | Generar con timestamp + secuencia |
| PDF inconsistente | Media | Media | Validar estructura antes de generar |

---

## 7. CONCLUSIÓN

✅ **El flujo de versionado ENCAJA PERFECTAMENTE con la arquitectura actual.**

**Cambios mínimos necesarios:**
1. 3 campos nuevos en schema (parentQuotationId, isAdditional, baseQuotationId, versionNumber)
2. 1 campo nuevo en projects (currentApprovedQuotationId)
3. 3 nuevos endpoints en router
4. Validación adicional en updateQuotation
5. Nuevos componentes en frontend (modal, badges, historial)

**Impacto en sistema existente:** CERO (solo extensión, sin modificación)

**Complejidad:** MEDIA (7 mini-fases, ~2-3 semanas de desarrollo)

**Riesgo:** BAJO (cambios aislados, con checkpoints)

---

**Próximo paso:** Esperar confirmación del usuario para iniciar Mini-Fase 1.

