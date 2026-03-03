# Dependencias del Sistema - INNOVAR Cocinas

Este documento describe las dependencias entre los diferentes componentes del sistema para evitar que modificaciones en un área afecten otras funcionalidades.

---

## Arquitectura General

El sistema INNOVAR Cocinas está construido con una arquitectura de tres capas que se comunican de manera específica. La capa de presentación (Frontend) se comunica exclusivamente con la capa de lógica de negocio (Backend) a través de tRPC, y esta última accede a la capa de datos mediante Drizzle ORM.

| Capa | Tecnología | Ubicación |
|------|------------|-----------|
| Frontend | React 19 + Tailwind 4 | `client/src/` |
| Backend | Express + tRPC | `server/` |
| Base de Datos | MySQL/TiDB | `drizzle/schema.ts` |
| Storage | S3/CloudFront | `server/storage.ts` |

---

## Mapa de Dependencias por Módulo

### 1. Autenticación

El módulo de autenticación es la base de todo el sistema y afecta a todos los demás módulos.

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `server/password-auth.ts` | `drizzle/schema.ts` (users) | `server/routers.ts` (auth) |
| `server/_core/context.ts` | `server/_core/sdk.ts` | Todos los procedimientos protectedProcedure |
| `server/_core/cookies.ts` | - | `server/routers.ts` (auth) |

**Impacto de cambios:** Si se modifica la autenticación, TODOS los procedimientos protegidos pueden verse afectados.

---

### 2. Proyectos (Núcleo del Negocio)

El módulo de proyectos es el más complejo y tiene múltiples dependencias.

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `drizzle/schema.ts` (projects) | - | Todos los módulos de proyecto |
| `server/db.ts` (getProjectById, etc.) | `drizzle/schema.ts` | `server/routers.ts` (projects) |
| `server/routers.ts` (projects) | `db.ts`, `reminders-service.ts`, `business-days.ts` | Frontend (Projects.tsx, Portal.tsx) |
| `server/reminders-service.ts` | `db.ts`, `business-days.ts` | `server/routers.ts` (al cambiar estado) |
| `server/business-days.ts` | `drizzle/schema.ts` (holidays) | `reminders-service.ts`, `routers.ts` |

**Cadena de dependencias crítica:**
```
Cambio de estado de proyecto
    → createRemindersForStatusChange()
    → addBusinessDays()
    → Consulta de festivos
    → Creación de recordatorios
```

**Impacto de cambios:** Modificar el flujo de estados afecta recordatorios, notificaciones y fechas de entrega.

---

### 3. Cotizaciones y Pagos

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `drizzle/schema.ts` (quotations) | `projects`, `clients` | `server/routers.ts` (quotations) |
| `drizzle/schema.ts` (projectPayments) | `projects` | `server/routers.ts` (projectPayments) |
| `server/routers.ts` (quotations) | `db.ts`, `pricing` | Frontend (Quotations.tsx) |

**Impacto de cambios:** Los cálculos de cotización afectan directamente los pagos y el flujo financiero.

---

### 4. Tareas y Recordatorios

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `drizzle/schema.ts` (tasks) | `users`, `projects` | `server/routers.ts` (tasks) |
| `drizzle/schema.ts` (reminders) | `users`, `projects` | `server/routers.ts` (reminders) |
| `server/reminders-service.ts` | `db.ts`, `business-days.ts` | Cambios de estado de proyecto |

**Cadena de dependencias:**
```
Creación de tarea
    → Validación de permisos por rol
    → Notificación por email
    → Actualización de contadores
```

---

### 5. Citas y Disponibilidad

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `drizzle/schema.ts` (appointments) | `clients` | `server/routers.ts` (appointments) |
| `server/availability.ts` | `drizzle/schema.ts` (appointments) | `server/routers.ts` (appointments, availability) |

**Impacto de cambios:** Modificar la lógica de disponibilidad puede causar citas duplicadas.

---

### 6. Fotos y Storage

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `server/storage.ts` | API de Manus (BUILT_IN_FORGE_API) | `server/routers.ts` (upload, projectPhotos) |
| `drizzle/schema.ts` (projectPhotos) | `projects` | `server/routers.ts` (projectPhotos) |
| `client/src/components/LazyImage.tsx` | URLs de CloudFront | Todas las galerías de fotos |
| `client/src/components/FileViewer.tsx` | `LazyImage.tsx` | Visor de fotos y PDFs |

**Impacto de cambios:** Cambios en storage afectan TODAS las imágenes del sistema.

---

### 7. Notificaciones

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `server/whatsapp.ts` | - | `server/routers.ts`, `whatsapp-notifications.ts` |
| `server/whatsapp-notifications.ts` | `whatsapp.ts` | Cambios de estado de proyecto |
| `server/whatsapp-cloud.ts` | API de WhatsApp Cloud | Mensajes automáticos |
| `server/_core/notification.ts` | API de Manus | Notificaciones al owner |

---

## Dependencias del Frontend

### Componentes Críticos

| Componente | Depende de | Es usado por |
|------------|------------|--------------|
| `App.tsx` | Todos los componentes de páginas | - |
| `lib/trpc.ts` | `server/routers.ts` | Todos los componentes |
| `contexts/AuthContext.tsx` | `trpc.auth.me` | Todos los componentes protegidos |
| `components/DashboardLayout.tsx` | `AuthContext` | Páginas de admin |

### Páginas y sus Dependencias

| Página | Procedimientos tRPC | Componentes |
|--------|---------------------|-------------|
| `Projects.tsx` | `projects.*`, `projectPhotos.*` | `ProjectInlineDetail`, `LazyImage`, `FileViewer` |
| `Portal.tsx` | `projects.getClientProject`, `projectPhotos.*` | `WatermarkedImage`, `FileViewer` |
| `Quotations.tsx` | `quotations.*`, `pricing.*` | `QuotationPDF` |
| `Tasks.tsx` | `tasks.*`, `reminders.*` | `RemindersPanel` |
| `Calendar.tsx` | `projects.*`, `appointments.*` | Calendario de instalaciones |

---

## Reglas de Dependencia

### Antes de modificar un componente:

1. **Identificar dependencias ascendentes:** ¿Qué componentes dependen de este?
2. **Identificar dependencias descendentes:** ¿De qué componentes depende este?
3. **Ejecutar tests relacionados:** Todos los tests de los componentes afectados.

### Componentes con mayor impacto (modificar con extremo cuidado):

| Componente | Razón | Componentes afectados |
|------------|-------|----------------------|
| `drizzle/schema.ts` | Define toda la estructura de datos | TODO el sistema |
| `server/routers.ts` | Contiene toda la lógica de negocio | TODO el frontend |
| `server/db.ts` | Funciones de acceso a datos | Todos los routers |
| `server/_core/context.ts` | Contexto de autenticación | Todos los procedimientos |
| `server/availability.ts` | Lógica de disponibilidad | Citas y calendario |
| `server/reminders-service.ts` | Recordatorios automáticos | Proyectos y notificaciones |

---

## Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Projects │  │  Portal  │  │  Tasks   │  │ Calendar │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │  lib/trpc   │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │ tRPC
┌───────────────────────────┼─────────────────────────────────────┐
│                         BACKEND                                  │
│                    ┌──────┴──────┐                              │
│                    │  routers.ts │                              │
│                    └──────┬──────┘                              │
│       ┌───────────────────┼───────────────────┐                 │
│       │                   │                   │                 │
│  ┌────┴────┐        ┌─────┴─────┐       ┌────┴────┐            │
│  │  db.ts  │        │ services  │       │ storage │            │
│  └────┬────┘        └─────┬─────┘       └────┬────┘            │
│       │                   │                   │                 │
└───────┼───────────────────┼───────────────────┼─────────────────┘
        │                   │                   │
┌───────┼───────────────────┼───────────────────┼─────────────────┐
│       │              BASE DE DATOS            │    STORAGE      │
│  ┌────┴────┐                             ┌────┴────┐            │
│  │ MySQL   │                             │   S3    │            │
│  └─────────┘                             └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Modificación Segura

Antes de modificar cualquier componente, verificar:

| Paso | Acción | Comando |
|------|--------|---------|
| 1 | Crear checkpoint | `webdev_save_checkpoint` |
| 2 | Identificar dependencias | Consultar este documento |
| 3 | Ejecutar tests relacionados | `pnpm test <archivo>.test.ts` |
| 4 | Hacer la modificación | - |
| 5 | Ejecutar tests afectados | `pnpm test` |
| 6 | Verificar en navegador | Probar flujo completo |
| 7 | Crear nuevo checkpoint | `webdev_save_checkpoint` |

---

*Documento creado: 1 de febrero de 2026*
*Autor: Manus AI*
