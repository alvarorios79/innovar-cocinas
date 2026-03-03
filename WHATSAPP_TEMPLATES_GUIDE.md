# 📋 Guía Oficial de Plantillas WhatsApp - INNOVAR Cocinas

## Estado Actual de Plantillas

### ✅ PLANTILLA 1: COTIZACIÓN ENVIADA (APPROVED)

**Nombre exacto:** `cotizacion_enviada_innovar`  
**Categoría:** Utility  
**Idioma:** es  
**Estado:** ✅ APPROVED  

**Body:**
```
Hola {{1}}, recibimos tu solicitud para la cotización {{2}}. Pronto recibirás los detalles.
```

**Variables:**
- {{1}} = Nombre del cliente
- {{2}} = Número de cotización

**Uso actual:** Automático cuando se envía cotización por WhatsApp  
**Implementación:** `server/routers/quotations.ts` → `sendByWhatsApp()`

---

### ⏳ PLANTILLA 2: AVANCE DE PROYECTO (SUBMITTED)

**Nombre exacto:** `avance_proyecto_innovar`  
**Categoría:** Marketing  
**Idioma:** es  
**Estado:** ⏳ SUBMITTED (Enviada a Meta el 3 de marzo, esperar aprobación 24-48h)  

**Body:**
```
Hola amigo {{1}}, tu proyecto {{2}} ha avanzado a la etapa de {{3}}, puedes ver el avance aquí {{4}} gracias.
```

**Variables:**
- {{1}} = Nombre del cliente
- {{2}} = Código del proyecto
- {{3}} = Nombre de la etapa
- {{4}} = URL de galería

**Uso futuro:** Cuando proyecto cambia de estado (diseño → producción → instalación)  
**Integración:** `project.statusChanged` event  
**Implementación:** Pendiente

---

### ⏳ PLANTILLA 3: PROYECTO ENTREGADO (SUBMITTED)

**Nombre exacto:** `proyecto_entregado_innovar`  
**Categoría:** Marketing  
**Idioma:** es  
**Estado:** ⏳ SUBMITTED (Enviada a Meta el 3 de marzo, esperar aprobación 24-48h)  

**Body:**
```
Hola {{1}}, tu proyecto {{2}} ha sido entregado exitosamente. Gracias por tu confianza.
```

**Variables:**
- {{1}} = Nombre del cliente
- {{2}} = Código del proyecto

**Uso futuro:** Cuando proyecto se marca como entregado  
**Integración:** `project.delivered` event  
**Implementación:** Pendiente

---

## 🎯 Cómo Crear Plantillas en Meta Business Manager

### Paso a Paso

1. **Accede a Meta Business Manager**
   - https://business.facebook.com/wa/manage/

2. **Busca "Message Templates"**
   - En el menú izquierdo, busca "Templates" o "Message Templates"

3. **Haz click en "Create Template"**
   - Botón azul en la esquina superior derecha

4. **Configura la plantilla**
   - **Nombre:** Copia EXACTAMENTE del registro anterior
   - **Idioma:** Español (es)
   - **Categoría:** Utility
   - **Body:** Copia EXACTAMENTE el texto con {{variables}}

5. **Agrega variables**
   - Meta detectará automáticamente {{1}}, {{2}}, etc.
   - Verifica que estén numeradas correctamente

6. **Envía para aprobación**
   - Haz click en "Submit"
   - Meta revisará en 24-48 horas

7. **Actualiza el estado**
   - Una vez aprobada, cambia status a "APPROVED" en `whatsapp-templates-registry.ts`

---

## ⚠️ Validaciones Obligatorias

Antes de usar cualquier plantilla, verificar:

- ✅ **Nombre coincide EXACTAMENTE** con Meta
- ✅ **Idioma es exactamente "es"** (no es_CO, no es_MX)
- ✅ **Sin encabezados** (no agregar títulos)
- ✅ **Sin botones** (solo texto)
- ✅ **Sin emojis** (Meta rechaza)
- ✅ **Categoría es UTILITY**
- ✅ **Status es APPROVED** en Meta

---

## 🔗 Integración Futura

### Plantilla 2: Avance de Proyecto

```typescript
// En server/business-events.ts
async function handleProjectStatusChanged(payload: any) {
  const { projectId, clientId, newStatus } = payload;
  
  // Obtener datos del proyecto y cliente
  // Enviar plantilla avance_proyecto_innovar
  await sendQuotationTemplate(
    clientPhone,
    clientName,
    projectCode,
    stageName,
    galleryUrl
  );
}
```

### Plantilla 3: Proyecto Entregado

```typescript
// En server/business-events.ts
async function handleProjectDelivered(payload: any) {
  const { projectId, clientId } = payload;
  
  // Obtener datos del proyecto y cliente
  // Enviar plantilla proyecto_entregado_innovar
  await sendQuotationTemplate(
    clientPhone,
    clientName,
    projectCode
  );
}
```

---

## 📊 Resumen

| Plantilla | Nombre | Estado | Uso |
|-----------|--------|--------|-----|
| Cotización | `cotizacion_enviada_innovar` | ✅ APPROVED | Activo |
| Avance | `avance_proyecto_innovar` | ⏳ SUBMITTED | Esperar aprobación |
| Entregado | `proyecto_entregado_innovar` | ⏳ SUBMITTED | Esperar aprobación |

---

## 📝 Notas Importantes

1. **NO modificar nombres** sin actualizar Meta primero
2. **NO cambiar variables** sin aprobar en Meta
3. **NO usar plantillas PENDING** en producción
4. **Siempre validar status** antes de enviar
5. **Documentar cambios** en este archivo

---

**Última actualización:** 2026-03-03  
**Responsable:** Sistema INNOVAR Cocinas  
**Archivo de configuración:** `server/whatsapp-templates-registry.ts`
