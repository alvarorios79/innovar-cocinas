# ANÁLISIS TÉCNICO: Flujo Cotización ↔ Proyecto

**Fecha:** 13 de febrero de 2026  
**Módulo:** INNOVAR Cocinas - Gestión de Cotizaciones y Proyectos  
**Alcance:** Relación entre tablas, flujo de datos, riesgos potenciales

---

## 1. ESTRUCTURA DE DATOS

### 1.1 Tabla `quotations`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Primary Key |
| `quotationNumber` | VARCHAR | COT-2026-001 (único) |
| `clientId` | INT | FK → clients |
| `subtotal` | DECIMAL | Suma de ítems |
| `transportCost` | DECIMAL | Costo de transporte (default 600,000) |
| `discountPercent` | DECIMAL | Porcentaje de descuento (0-100) |
| `discountAmount` | DECIMAL | Monto del descuento calculado |
| `total` | DECIMAL | **Precio final de la cotización** |
| `status` | ENUM | draft, sent, approved, rejected |
| `isLocked` | BOOLEAN | Bloqueo para evitar edición |
| `customDescriptions` | JSON | Descripciones personalizadas por ítem |
| `generalNotes` | TEXT | Notas generales del PDF |
| `updatedAt` | TIMESTAMP | Última actualización |

### 1.2 Tabla `projects`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Primary Key |
| `quotationId` | INT | FK → quotations (opcional, puede ser NULL) |
| `clientId` | INT | FK → clients |
| `name` | VARCHAR | Nombre del proyecto |
| `status` | ENUM | contacto, cotizacion_enviada, cotizacion_aprobada, ... |
| `totalAmount` | DECIMAL | **Precio total del proyecto (copiado de cotización)** |
| `advanceAmount` | DECIMAL | Monto del adelanto |
| `quotationPdfUrl` | TEXT | URL del PDF de cotización aprobada |
| `updatedAt` | TIMESTAMP | Última actualización |

---

## 2. FLUJO ACTUAL: CREAR PROYECTO DESDE COTIZACIÓN

### 2.1 Paso a Paso (Endpoint: `quotations.createProject`)

**Ubicación:** `server/routers/quotations.ts` líneas 2302-2390

```
ENTRADA: { quotationId: number }
```

**Validaciones previas:**
1. ✅ Usuario debe tener rol: admin, super_admin o comercial
2. ✅ Cotización debe existir
3. ✅ NO debe existir proyecto previo para esta cotización
4. ✅ Cliente debe existir

**Datos copiados del proyecto:**
```typescript
const projectId = await db.createProject({
  quotationId: quotation.id,              // Referencia FK
  clientId: quotation.clientId,           // Copia
  name: projectName,                      // Generado: COT-2026-001 - Cliente
  workType: workTypeMap[quotation.productType], // Mapeo
  status: "cotizacion_aprobada",          // Estado inicial
  quotationApprovedAt: new Date(),        // Timestamp
  createdBy: ctx.user.id,                 // Usuario actual
  tentativeInstallDate: tentativeDate,    // Calculado (25 días hábiles)
  isInstallDateOfficial: false,           // Default
  totalAmount: quotation.total,           // ⚠️ COPIA DEL PRECIO
  designerId: autoAssignedDesignerId,     // Asignación automática
});
```

**Acciones post-creación:**
1. ✅ Crear historial de estado del proyecto
2. ✅ Actualizar estado de cotización a "approved"
3. ✅ Notificar a admins y comerciales

---

## 3. RELACIÓN ENTRE TABLAS

### 3.1 Tipo de Relación
- **Tipo:** One-to-One (1:1) con referencia FK
- **Dirección:** `projects.quotationId` → `quotations.id`
- **Cardinalidad:** Un proyecto puede tener UNA cotización, pero una cotización puede tener CERO O UN proyecto

### 3.2 Integridad Referencial
```sql
ALTER TABLE projects 
  ADD CONSTRAINT fk_quotationId 
  FOREIGN KEY (quotationId) REFERENCES quotations(id);
```

**Comportamiento:** Sin `ON DELETE CASCADE` → Si se elimina cotización, proyecto queda huérfano

---

## 4. RESPUESTAS A PREGUNTAS CONCRETAS

### ❓ Pregunta 1: ¿Si se edita la cotización después de crear el proyecto, se actualiza automáticamente?

**RESPUESTA: NO. El proyecto NO se actualiza automáticamente.**

**Evidencia técnica:**
- El campo `totalAmount` en `projects` es una **COPIA** del valor `total` de `quotations` en el momento de creación
- No existe trigger, vista materializada ni listener que sincronice cambios
- La edición de cotización solo modifica la tabla `quotations`
- El proyecto mantiene los valores originales

**Ejemplo:**
```
MOMENTO 1: Crear cotización
  quotations.total = 5,000,000
  
MOMENTO 2: Crear proyecto desde cotización
  projects.totalAmount = 5,000,000 (COPIA)
  
MOMENTO 3: Editar cotización (cambiar precio)
  quotations.total = 4,500,000 (ACTUALIZADO)
  projects.totalAmount = 5,000,000 (SIN CAMBIOS)
  
RESULTADO: ⚠️ DESINCRONIZACIÓN
```

### ❓ Pregunta 2: ¿La tarjeta de Información financiera refleja esos cambios?

**RESPUESTA: NO. Refleja los valores del proyecto, no de la cotización.**

**Lógica en frontend:**
- La tarjeta "Información financiera" en `Projects.tsx` lee de `projects.totalAmount`
- No consulta la cotización vinculada
- Por lo tanto, muestra siempre el valor original copiado

**Código relevante:**
```typescript
// En Projects.tsx - renderiza desde project.totalAmount
<span className="text-2xl font-bold">{formatCurrency(project.totalAmount)}</span>
```

### ❓ Pregunta 3: ¿Existe algún bloqueo, desacople o snapshot entre cotización y proyecto?

**RESPUESTA: SÍ, existe desacople intencional (snapshot).**

**Mecanismo:**
1. **Snapshot:** Al crear proyecto, se copia `quotation.total` → `project.totalAmount`
2. **Desacople:** Después de eso, no hay sincronización
3. **Bloqueo parcial:** La cotización se marca como `status = "approved"`, pero NO se bloquea (`isLocked = false`)
4. **Resultado:** Cotización puede seguir siendo editada sin afectar proyecto

**Beneficio:** Permite editar cotización sin afectar proyecto en ejecución  
**Riesgo:** Cotización y proyecto pueden divergir

### ❓ Pregunta 4: ¿Cuál es la fuente de verdad para el precio del proyecto?

**RESPUESTA: El proyecto tiene su propia fuente de verdad (`projects.totalAmount`).**

| Aspecto | Fuente |
|--------|--------|
| Precio mostrado en tarjeta financiera | `projects.totalAmount` |
| Precio para cálculos de adelanto | `projects.totalAmount` |
| Precio en reportes de proyecto | `projects.totalAmount` |
| Precio en cotización original | `quotations.total` |

**Conclusión:** Después de crear proyecto, la cotización es solo referencia histórica.

### ❓ Pregunta 5: ¿Es posible que cotización y proyecto queden desincronizados?

**RESPUESTA: SÍ, es muy probable.**

**Escenario de desincronización:**

```
PASO 1: Cliente solicita cotización
  - Se crea COT-2026-001 con total = 5,000,000

PASO 2: Se envía y cliente aprueba
  - quotations.status = "approved"

PASO 3: Se crea proyecto desde cotización
  - projects.totalAmount = 5,000,000
  - projects.quotationId = 1
  - projects.status = "cotizacion_aprobada"

PASO 4: Comercial edita cotización (error de cálculo)
  - quotations.total = 4,500,000 (cambio de 500,000)
  - quotations.isLocked = false (NO está bloqueada)
  - quotations.updatedAt = 2026-02-13 20:30:00

PASO 5: Proyecto continúa con precio original
  - projects.totalAmount = 5,000,000 (SIN CAMBIOS)
  - projects.updatedAt = 2026-02-13 20:10:00 (anterior)

RESULTADO: ⚠️ DIVERGENCIA
  - Cotización: 4,500,000
  - Proyecto: 5,000,000
  - Diferencia: 500,000 (sin sincronizar)
```

---

## 5. RIESGOS POTENCIALES DEL FLUJO ACTUAL

### 🔴 RIESGO CRÍTICO: Desincronización de precios

**Descripción:** Después de crear proyecto, ediciones a la cotización no se reflejan en el proyecto.

**Impacto:**
- ❌ Proyecto con precio incorrecto
- ❌ Adelanto calculado sobre precio desactualizado
- ❌ Reportes financieros inconsistentes
- ❌ Confusión entre equipo y cliente

**Probabilidad:** ALTA (cotización no está bloqueada)

**Severidad:** CRÍTICA (afecta finanzas)

---

### 🟡 RIESGO MODERADO: Cotización editable después de aprobada

**Descripción:** Cotización aprobada (`status = "approved"`) puede seguir siendo editada.

**Impacto:**
- ❌ Historial de cambios no registrado
- ❌ Cambios no auditables
- ❌ Cliente no se entera de cambios

**Probabilidad:** MEDIA (depende de disciplina del equipo)

**Severidad:** MODERADA (afecta auditoría)

---

### 🟡 RIESGO MODERADO: Falta de sincronización bidireccional

**Descripción:** Si se edita proyecto, cotización no se actualiza (y viceversa).

**Impacto:**
- ❌ Múltiples fuentes de verdad
- ❌ Confusión sobre qué versión es correcta

**Probabilidad:** MEDIA

**Severidad:** MODERADA

---

### 🟢 RIESGO BAJO: Referencia huérfana

**Descripción:** Si se elimina cotización, proyecto queda sin referencia (FK sin CASCADE).

**Impacto:**
- ⚠️ Proyecto pierde vínculo histórico
- ⚠️ No se puede recuperar datos originales de cotización

**Probabilidad:** BAJA (no hay flujo de eliminación)

**Severidad:** BAJA (solo afecta trazabilidad)

---

## 6. ESTADO ACTUAL DEL SISTEMA

### ✅ Lo que funciona correctamente:
1. ✅ Creación de proyecto desde cotización aprobada
2. � Copia de datos financieros al momento de creación
3. ✅ Asignación automática de diseñador
4. ✅ Historial de estado del proyecto
5. ✅ Notificaciones a equipo

### ⚠️ Lo que necesita atención:
1. ⚠️ Cotización aprobada sigue siendo editable
2. ⚠️ Cambios a cotización NO se sincronizan con proyecto
3. ⚠️ No hay bloqueo automático de cotización al crear proyecto
4. ⚠️ No hay auditoría de cambios en cotización

### ❌ Lo que NO existe:
1. ❌ Sincronización automática de precios
2. ❌ Bloqueo de cotización al crear proyecto
3. ❌ Validación de consistencia
4. ❌ Historial de cambios en cotización

---

## 7. OPCIONES DE SOLUCIÓN

### Opción A: Mantener estado actual (Snapshot)
**Ventaja:** Permite editar cotización sin afectar proyecto  
**Desventaja:** Riesgo de desincronización  
**Recomendación:** Agregar bloqueo manual de cotización

### Opción B: Bloquear cotización al crear proyecto
**Ventaja:** Evita cambios accidentales  
**Desventaja:** Menos flexibilidad  
**Recomendación:** Permitir desbloqueo con confirmación

### Opción C: Sincronización automática
**Ventaja:** Siempre consistentes  
**Desventaja:** Cambios inesperados en proyecto  
**Recomendación:** Solo para campos específicos (precio)

---

## 8. CONCLUSIÓN

**El flujo actual es un SNAPSHOT (copia) sin sincronización.**

- ✅ Funciona correctamente para crear proyecto
- ⚠️ Riesgo de divergencia entre cotización y proyecto
- ❌ No hay protección contra ediciones no autorizadas
- 🔴 Requiere decisión sobre política de sincronización

**Próximo paso:** Esperar confirmación del usuario sobre qué enfoque adoptar.

---

**Documento preparado por:** Sistema de Análisis Técnico  
**Versión:** 1.0  
**Estado:** LISTO PARA REVISIÓN
