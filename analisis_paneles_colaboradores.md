# Análisis de Paneles de Colaboradores - INNOVAR Cocinas Integrales

**Fecha:** 30 de enero de 2026  
**Autor:** Manus AI

---

## Resumen Ejecutivo

Este documento presenta un análisis completo de los paneles de colaboradores del sistema INNOVAR Cocinas Integrales, incluyendo los roles disponibles, sus permisos, las notificaciones que reciben y las mejoras propuestas para optimizar la experiencia de cada usuario.

---

## 1. Roles del Sistema

El sistema cuenta con **7 roles** definidos en la base de datos:

| Rol | Descripción | Panel Principal | Acceso a Proyectos |
|-----|-------------|-----------------|-------------------|
| **super_admin** | CEO/Dueño del negocio | Admin.tsx | Completo |
| **admin** | Administrador general | Admin.tsx | Completo |
| **comercial** | Gestión comercial y ventas | Comercial.tsx | Lectura + Programar instalaciones |
| **disenador** | Diseñador 3D | Projects.tsx + Portal.tsx | Solo proyectos asignados |
| **jefe_taller** | Jefe de producción | Projects.tsx | Producción + Fotos |
| **operario** | Operario de producción | Projects.tsx | Solo producción + Fotos |
| **user** | Cliente final | Portal.tsx | Solo sus proyectos |

---

## 2. Análisis por Rol

### 2.1 Super Admin / Admin

**Panel:** `/admin`

**Funcionalidades actuales:**
- Gestión completa de citas y asesoramientos
- Gestión de cotizaciones (crear, enviar, eliminar)
- Gestión de clientes
- Gestión de usuarios (crear, editar roles, resetear contraseñas, eliminar)
- Acceso al catálogo de herrajes
- Panel de recordatorios
- Selección múltiple para eliminación masiva
- Búsqueda y ordenamiento de clientes

**Notificaciones que recibe:**
- Cotización aprobada por cliente
- Cotización rechazada por cliente
- Proyecto creado
- Plazo de diseño próximo a vencer
- Plazo de entrega próximo
- Pago del 40% pendiente

**Permisos de asignación de tareas:**
- Super Admin: Puede asignar a todos los roles
- Admin: Puede asignar a diseñador, jefe_taller, operario

**Mejoras propuestas:**
1. **Dashboard de métricas:** Agregar panel con KPIs (proyectos activos, cotizaciones pendientes, ingresos del mes)
2. **Filtros avanzados:** Agregar filtros por fecha, estado y responsable en todas las listas
3. **Exportación de datos:** Permitir exportar listas a Excel/CSV
4. **Auditoría:** Registro de acciones de todos los usuarios para trazabilidad
5. **Notificación de cumpleaños de equipo:** Alertar sobre cumpleaños del equipo de trabajo

---

### 2.2 Comercial

**Panel:** `/comercial`

**Funcionalidades actuales:**
- Vista de citas del día y pendientes
- Vista de cotizaciones (borradores y activas)
- Cotizaciones por vencer (próximos 3 días)
- Proyectos activos con estados
- Proyectos en ensamble para programar instalación
- Próximas instalaciones programadas
- Cumpleaños de clientes (próximos 7 días)
- Tareas asignadas
- Botón de WhatsApp para felicitaciones de cumpleaños
- Frase motivacional diaria

**Notificaciones que recibe:**
- Coordinar instalación (cuando proyecto llega a listo_instalacion)
- Cotización aprobada/rechazada
- Proyecto creado

**Permisos de asignación de tareas:**
- No puede asignar tareas (según la lógica actual)

**Mejoras propuestas:**
1. **Acceso a crear cotizaciones:** Actualmente solo puede ver, debería poder crear y editar cotizaciones
2. **Seguimiento de clientes:** Panel de CRM básico con historial de contactos
3. **Notificación de citas próximas:** Recibir alerta 1 hora antes de cada cita
4. **Indicador de cotizaciones vencidas:** Mostrar cotizaciones que ya vencieron para seguimiento
5. **Métricas de ventas:** Dashboard con cotizaciones aprobadas/rechazadas del mes
6. **Permisos de tareas:** Permitir asignar tareas a diseñador y jefe_taller
7. **Acceso a crear clientes:** Botón rápido para crear clientes desde el panel

---

### 2.3 Diseñador

**Panel:** `/projects` (filtrado por proyectos asignados)

**Funcionalidades actuales:**
- Ver proyectos asignados (designerId)
- Subir fotos de modelado y renders
- Ver detalles del proyecto (medidas, notas)
- Avanzar estado del proyecto
- Enviar modelado/renders al cliente
- Solicitar nueva aprobación

**Restricciones de información (según requisitos):**
- Solo puede ver nombre y dirección del cliente
- NO debe ver: comprobante de pago, cotización, teléfono del cliente

**Notificaciones que recibe:**
- Cliente confirmado - Iniciar diseño
- Plazo de diseño próximo a vencer
- Cambios pendientes en renders (cuando cliente solicita cambios)

**Permisos de asignación de tareas:**
- Puede asignar a: jefe_taller, operario

**Mejoras propuestas:**
1. **Panel simplificado móvil:** Interfaz optimizada para móvil con acceso directo a proyectos
2. **Notificación de nuevo proyecto asignado:** Alerta inmediata cuando se le asigna un proyecto
3. **Contador de días restantes:** Mostrar días hábiles restantes para entregar diseño
4. **Galería de trabajos anteriores:** Acceso a renders de proyectos completados como referencia
5. **Chat interno con comercial:** Para consultas sobre especificaciones del cliente
6. **Notificación de aprobación de modelado:** Alerta cuando el cliente aprueba el modelado
7. **Notificación de aprobación de renders:** Alerta cuando el cliente aprueba los renders
8. **Historial de revisiones:** Ver todas las versiones de modelado/renders enviadas

---

### 2.4 Jefe de Taller

**Panel:** `/projects`

**Funcionalidades actuales:**
- Ver todos los proyectos en producción
- Subir fotos de avance (corte, enchape, ensamble)
- Avanzar estado del proyecto
- Ver detalles importantes del proyecto
- Asignar tareas

**Notificaciones que recibe:**
- Nuevo proyecto en producción (cuando pasa a despiece)
- Avance de producción por operario
- Plazo de entrega próximo

**Permisos de asignación de tareas:**
- Puede asignar a: admin, comercial, diseñador, operario

**Mejoras propuestas:**
1. **Vista de calendario de producción:** Ver todos los proyectos con fechas de entrega
2. **Notificación de proyecto urgente:** Alerta cuando un proyecto tiene menos de 3 días para entrega
3. **Panel de operarios:** Ver qué operario está trabajando en qué proyecto
4. **Checklist de producción:** Lista de verificación por etapa (corte, enchape, ensamble)
5. **Notificación de cambios en fecha de instalación:** Alerta cuando se reprograma una instalación
6. **Reporte de productividad:** Métricas de proyectos completados por semana/mes
7. **Alertas de materiales:** Notificación cuando faltan materiales para un proyecto

---

### 2.5 Operario

**Panel:** `/projects` (filtrado por etapa de producción)

**Funcionalidades actuales:**
- Ver proyectos en producción
- Subir fotos de avance
- Avanzar estado del proyecto (solo etapas de producción)
- Ver detalles importantes del proyecto

**Notificaciones que recibe:**
- Ninguna específica actualmente

**Permisos de asignación de tareas:**
- Puede asignar a: diseñador, jefe_taller

**Mejoras propuestas:**
1. **Notificación de nuevo proyecto asignado:** Alerta cuando hay un proyecto nuevo en su etapa
2. **Vista simplificada móvil:** Panel optimizado para uso en taller con fotos grandes
3. **Checklist de tareas por proyecto:** Lista de verificación de pasos a completar
4. **Notificación de prioridad:** Alerta cuando un proyecto es urgente
5. **Botón de "Problema":** Para reportar problemas o faltantes al jefe de taller
6. **Historial de fotos subidas:** Ver todas las fotos que ha subido por proyecto
7. **Notificación de tarea asignada:** Alerta cuando el jefe de taller le asigna una tarea

---

### 2.6 Cliente (User)

**Panel:** `/portal`

**Funcionalidades actuales:**
- Ver sus citas programadas
- Ver sus cotizaciones (aprobar/rechazar)
- Ver sus proyectos con progreso
- Aprobar/rechazar diseños (modelado y renders)
- Ver timeline del proyecto
- Subir fotos (si aplica)
- Reagendar citas

**Notificaciones que recibe:**
- Diseño listo para revisión
- Recordatorio de cita
- Cumpleaños

**Mejoras propuestas:**
1. **Notificación de avance de proyecto:** Alerta cuando el proyecto cambia de estado
2. **Chat con comercial:** Canal de comunicación directa
3. **Galería de fotos del proyecto:** Ver todas las fotos de su proyecto
4. **Notificación de instalación programada:** Alerta con fecha y hora de instalación
5. **Encuesta de satisfacción:** Al finalizar el proyecto
6. **Historial de pagos:** Ver pagos realizados y pendientes
7. **Documentos del proyecto:** Acceso a cotización, contrato, garantía

---

## 3. Sistema de Notificaciones Actual

### 3.1 Tipos de Notificaciones

| Tipo | Descripción | Roles que la reciben |
|------|-------------|---------------------|
| proyecto | Cambios en proyectos | Admin, Comercial, Diseñador, Jefe Taller |
| tarea | Tareas asignadas/recordatorios | Todos los roles internos |
| cita | Recordatorios de citas | Admin, Comercial, Cliente |
| cotizacion | Cambios en cotizaciones | Admin, Comercial |
| sistema | Notificaciones generales | Todos |

### 3.2 Momentos de Notificación

**Notificaciones automáticas implementadas:**
- Cotización aprobada/rechazada por cliente
- Proyecto creado
- Cliente confirmado (adelanto recibido)
- Avance de producción por operario
- Proyecto listo para instalación
- Diseño entregado al cliente
- Proyecto en producción
- Pago del 40% pendiente
- Tarea asignada
- Recordatorio de tarea
- Recordatorio de cita (día anterior)
- Cumpleaños de usuarios
- Plazo de diseño próximo a vencer
- Plazo de entrega próximo

### 3.3 Notificaciones Faltantes

| Notificación | Rol Destino | Momento |
|--------------|-------------|---------|
| Nuevo proyecto asignado | Diseñador | Al asignar designerId |
| Modelado aprobado por cliente | Diseñador | Al aprobar modelado |
| Renders aprobados por cliente | Diseñador, Admin | Al aprobar renders |
| Cliente solicita cambios | Diseñador | Al rechazar diseño |
| Proyecto urgente (< 3 días) | Jefe Taller, Operario | Diariamente |
| Cita en 1 hora | Comercial | 1 hora antes |
| Cotización vencida | Comercial | Al vencer |
| Nuevo proyecto en producción | Operario | Al pasar a despiece |
| Instalación mañana | Cliente, Comercial | Día anterior |
| Proyecto completado | Cliente | Al entregar |

---

## 4. Matriz de Permisos de Tareas

| Rol Asignador | Puede Asignar a |
|---------------|-----------------|
| super_admin | Todos |
| admin | diseñador, jefe_taller, operario |
| comercial | (Sin permisos actualmente) |
| disenador | jefe_taller, operario |
| jefe_taller | admin, comercial, diseñador, operario |
| operario | diseñador, jefe_taller |

---

## 5. Resumen de Mejoras Prioritarias

### Alta Prioridad (Impacto inmediato)

1. **Notificación de nuevo proyecto asignado al diseñador** - Crítico para que el diseñador sepa cuándo empezar
2. **Notificación de aprobación/rechazo de diseños al diseñador** - Feedback inmediato del cliente
3. **Panel simplificado móvil para diseñador y operario** - Mejora la usabilidad en campo
4. **Notificación de proyecto urgente al jefe de taller** - Prevenir retrasos
5. **Acceso a crear cotizaciones para comercial** - Agilizar el proceso de ventas

### Media Prioridad (Mejora de experiencia)

6. **Dashboard de métricas para admin** - Visibilidad del negocio
7. **Checklist de producción para jefe de taller** - Control de calidad
8. **Chat interno entre roles** - Comunicación fluida
9. **Historial de revisiones para diseñador** - Trazabilidad de cambios
10. **Notificación de instalación al cliente** - Mejor experiencia del cliente

### Baja Prioridad (Nice to have)

11. **Exportación de datos a Excel** - Reportes externos
12. **Galería de trabajos anteriores** - Referencia para diseñadores
13. **Encuesta de satisfacción** - Feedback del cliente
14. **Reporte de productividad** - Métricas de equipo

---

## 6. Conclusiones

El sistema actual tiene una base sólida de roles y permisos, pero hay oportunidades significativas de mejora en:

1. **Comunicación interna:** Faltan notificaciones clave para el diseñador y operario
2. **Experiencia móvil:** Los paneles no están optimizados para uso en campo
3. **Visibilidad del negocio:** Faltan métricas y dashboards para la toma de decisiones
4. **Permisos del comercial:** El rol tiene menos permisos de los necesarios para su función

La implementación de las mejoras de alta prioridad tendría un impacto inmediato en la eficiencia operativa del equipo.

---

*Documento generado para INNOVAR Cocinas Integrales*
