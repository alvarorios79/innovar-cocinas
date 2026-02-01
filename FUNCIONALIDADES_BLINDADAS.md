# Funcionalidades Blindadas - INNOVAR Cocinas

Este documento define las funcionalidades críticas del sistema que deben ser protegidas y no modificadas sin una revisión exhaustiva.

## Estado de Tests

**Total de archivos de test:** 46
**Total de tests:** 453 pasando, 1 saltado
**Última ejecución:** 1 de febrero de 2026

---

## Módulos del Sistema y Cobertura de Tests

### 1. Autenticación y Usuarios (CRÍTICO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| Login con contraseña | `password-auth.test.ts` | ✅ 11 tests | CRÍTICO |
| Logout | `auth.logout.test.ts` | ✅ 1 test | CRÍTICO |
| Registro de usuarios | `auth.register.test.ts` | ✅ Cubierto | CRÍTICO |
| Reset de contraseña | `resetPassword.test.ts` | ✅ 4 tests | CRÍTICO |
| Gestión de usuarios | `userManagement.test.ts` | ✅ 4 tests | CRÍTICO |
| Creación de usuarios | `userManagement.create.test.ts` | ✅ Cubierto | CRÍTICO |
| Jerarquía de roles | `userManagement.hierarchy.test.ts` | ✅ Cubierto | CRÍTICO |

**⚠️ REGLA DE BLINDAJE:** No modificar los archivos `password-auth.ts`, `auth.ts`, ni los procedimientos de autenticación sin ejecutar todos los tests de autenticación.

---

### 2. Gestión de Proyectos (CRÍTICO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| CRUD de proyectos | `projects.test.ts` | ✅ Cubierto | CRÍTICO |
| Actualización de fecha estimada | `projects.updateEstimatedDate.test.ts` | ✅ Cubierto | ALTO |
| Ruta INNOVAR (flujo completo) | `ruta-innovar.test.ts` | ✅ Cubierto | CRÍTICO |
| Subida de fotos | `upload.test.ts` | ✅ Cubierto | ALTO |
| Categorías de archivos | `file-categories.test.ts` | ✅ Cubierto | MEDIO |
| Permisos de fotos | `photo-upload-permissions.test.ts` | ✅ Cubierto | ALTO |
| Permisos comercial | `comercial-photo-permissions.test.ts` | ✅ Cubierto | ALTO |

**⚠️ REGLA DE BLINDAJE:** Cualquier cambio en el flujo de estados del proyecto debe pasar por `ruta-innovar.test.ts`.

---

### 3. Cotizaciones y Pagos (CRÍTICO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| Cotizaciones | `quotations.test.ts` | ✅ 2 tests | CRÍTICO |
| Edición de cotizaciones | `quotations-edit.test.ts` | ✅ Cubierto | ALTO |
| Descuentos | `quotations-discount.test.ts` | ✅ Cubierto | ALTO |
| Costos fijos | `quotations.fixedcosts.test.ts` | ✅ Cubierto | ALTO |
| PDF automático | `quotation-pdf-auto.test.ts` | ✅ Cubierto | MEDIO |
| Pagos de proyecto | `projectPayments.test.ts` | ✅ Cubierto | CRÍTICO |
| Recordatorio de pago | `payment-reminder.test.ts` | ✅ 4 tests | ALTO |

**⚠️ REGLA DE BLINDAJE:** Los cálculos de cotización y pagos son críticos para el negocio. No modificar sin tests.

---

### 4. Citas y Disponibilidad (ALTO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| CRUD de citas | `appointments.test.ts` | ✅ Cubierto | ALTO |
| Disponibilidad horaria | `appointments.availability.test.ts` | ✅ Cubierto | ALTO |
| Zona horaria | `appointments.timezone.test.ts` | ✅ 2 tests | MEDIO |
| Hora preferida de llamada | `advisory.preferredCallTime.test.ts` | ✅ 4 tests | MEDIO |

**⚠️ REGLA DE BLINDAJE:** La lógica de disponibilidad evita citas duplicadas. No modificar `availability.ts`.

---

### 5. Tareas y Recordatorios (ALTO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| Tareas | `tasks.jefeTaller.test.ts` | ✅ Cubierto | ALTO |
| Notificaciones de tareas | `tasks.notification.test.ts` | ✅ 5 tests | ALTO |
| Reasignación masiva | `tasks.bulkReassign.test.ts` | ✅ Cubierto | MEDIO |
| Recordatorios | `reminders.test.ts` | ✅ Cubierto | ALTO |
| Recordatorios automáticos | `reminders-auto.test.ts` | ✅ Cubierto | ALTO |

**⚠️ REGLA DE BLINDAJE:** Los recordatorios automáticos dependen de `reminders-service.ts`. Verificar después de cambios.

---

### 6. Clientes (ALTO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| Auto-llenado de datos | `clients.autofill.test.ts` | ✅ 3 tests | MEDIO |
| Asociación usuario-cliente | `client-user-association.test.ts` | ✅ Cubierto | ALTO |
| Auto-registro | `auto-registration.test.ts` | ✅ Cubierto | ALTO |
| Vista de materiales | `clientMaterialsView.test.ts` | ✅ Cubierto | MEDIO |

---

### 7. Notificaciones y Comunicación (MEDIO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| Notificaciones push | `notifications.test.ts` | ✅ Cubierto | MEDIO |
| WhatsApp | `whatsapp.test.ts` | ✅ Cubierto | MEDIO |
| WhatsApp Cloud | `whatsapp-cloud.test.ts` | ✅ Cubierto | MEDIO |
| Email de diseño listo | `design-ready-email.test.ts` | ✅ Cubierto | MEDIO |
| Validación Resend | `resend.validation.test.ts` | ✅ 1 test | MEDIO |

---

### 8. Cálculos de Cocina (MEDIO)

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| Cálculos de cocina | `kitchen-calculations.test.ts` | ✅ Cubierto | MEDIO |
| Formas especiales | `kitchen-special-shapes.test.ts` | ✅ Cubierto | MEDIO |
| Catálogo de herrajes | `hardware-catalog.test.ts` | ✅ Cubierto | BAJO |

---

### 9. Otros

| Funcionalidad | Archivo de Test | Estado | Prioridad |
|---------------|-----------------|--------|-----------|
| Eliminación masiva | `bulk-delete.test.ts` | ✅ Cubierto | MEDIO |
| Eliminación | `delete.test.ts` | ✅ Cubierto | MEDIO |
| Cumpleaños | `birthday.test.ts` | ✅ Cubierto | BAJO |
| Permisos comercial | `comercial-permissions.test.ts` | ✅ Cubierto | ALTO |

---

## Reglas de Blindaje

### Antes de cualquier modificación:

1. **Ejecutar tests relacionados:**
   ```bash
   pnpm test <nombre-del-archivo>.test.ts
   ```

2. **Ejecutar suite completa antes de commit:**
   ```bash
   pnpm test
   ```

3. **Verificar que todos los tests pasen (453/453)**

### Archivos que NUNCA deben modificarse sin revisión:

| Archivo | Razón |
|---------|-------|
| `server/password-auth.ts` | Autenticación crítica |
| `server/availability.ts` | Evita citas duplicadas |
| `server/reminders-service.ts` | Recordatorios automáticos |
| `server/business-days.ts` | Cálculo de fechas de entrega |
| `drizzle/schema.ts` | Estructura de base de datos |

### Proceso de modificación segura:

1. **Crear checkpoint** antes de empezar
2. **Identificar tests afectados** por el cambio
3. **Ejecutar tests** antes y después del cambio
4. **Si algún test falla**, revertir con `webdev_rollback_checkpoint`
5. **Crear nuevo checkpoint** después de verificar

---

## Funcionalidades sin cobertura de tests (RIESGO)

Las siguientes funcionalidades NO tienen tests dedicados y son más vulnerables a regresiones:

| Funcionalidad | Router | Riesgo |
|---------------|--------|--------|
| Galería pública | `publicGallery` | MEDIO |
| Materiales de proyecto | `projectMaterials` | MEDIO |
| Precios | `pricing` | ALTO |
| PDF de proyecto | `pdf` | BAJO |
| Detalles de proyecto | `projectDetails` | MEDIO |

**Recomendación:** Agregar tests para estas funcionalidades en futuras iteraciones.

---

## Historial de Cambios Críticos

| Fecha | Cambio | Tests Afectados | Resultado |
|-------|--------|-----------------|-----------|
| 1 feb 2026 | Panel de producción para jefe_taller | Ninguno nuevo | ✅ OK |
| 31 ene 2026 | Quitar Centro de Control para jefe_taller | Ninguno nuevo | ✅ OK |

---

*Documento creado: 1 de febrero de 2026*
*Última actualización: 1 de febrero de 2026*
