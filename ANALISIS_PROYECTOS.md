# Análisis del Sistema de Proyectos - INNOVAR Cocinas

## Estado Actual del Sistema

### Flujo de Estados de Proyecto (Ya Implementado)

El sistema ya tiene un flujo completo de estados definido en el esquema:

```
1. cotizacion_enviada      → Cotización enviada, esperando respuesta
2. cotizacion_aprobada     → Cliente aprobó cotización, esperando adelanto
3. adelanto_recibido       → Adelanto recibido, inicia diseño (3 días hábiles)
4. en_diseno               → Diseñador trabajando
5. pendiente_cliente       → Esperando aprobación del cliente (5 días máx)
6. aprobacion_final        → Cliente aprobó diseño, inician 25 días hábiles
7. despiece                → Realizando despiece
8. corte                   → En producción - etapa corte
9. enchape                 → En producción - etapa enchape
10. ensamble               → En producción - etapa ensamble
11. listo_instalacion      → Listo para instalar
12. instalacion_programada → Instalación programada en calendario
13. entregado              → Proyecto completado
```

### Portal del Cliente (Ya Implementado)

El portal del cliente (`/portal`) ya tiene:

✅ **Funcionalidades existentes:**
- Ver lista de proyectos del cliente
- Barra de progreso visual del proyecto
- Estados con iconos y colores
- Fecha estimada de instalación
- Fecha de instalación programada
- Botón para aprobar/rechazar diseño (estado `pendiente_cliente`)
- Subir fotos de referencia
- Ver fotos del proceso por etapa (inicial, diseño, corte, enchape, ensamble, final)
- Ver materiales y herrajes seleccionados

❌ **Funcionalidades faltantes:**
- Aprobar/rechazar cotizaciones directamente desde el portal
- Ver el despiece enviado por el diseñador
- Notificaciones en tiempo real de cambios de estado
- Timeline visual del proyecto con fechas de cada etapa

### Esquema de Base de Datos (Ya Implementado)

**Tabla `projects`:**
- Todos los estados del flujo
- Fechas clave: cotización enviada, aprobada, adelanto recibido, diseño entregado, aprobación cliente
- Archivos de diseño 3D y despiece
- Responsables (creador, diseñador)

**Tabla `projectPhotos`:**
- Fotos organizadas por etapa (inicial, diseño, corte, enchape, ensamble, final)
- Categorías (cotización, medidas, diseños, avance, instalación, entrega)
- Subcategorías detalladas

**Tabla `projectStatusHistory`:**
- Historial de cambios de estado
- Quién cambió el estado y cuándo
- Notas de cada cambio

**Tabla `projectDetails`:**
- Medidas especiales
- Notas importantes
- Fotos de referencia

---

## Propuestas de Mejora

### 1. Aprobar/Rechazar Cotizaciones desde el Portal

**Estado actual:** El cliente solo puede ver las cotizaciones, no puede aprobarlas.

**Mejora propuesta:**
- Agregar botones "Aprobar" y "Rechazar" en la sección de cotizaciones del portal
- Al aprobar, crear automáticamente el proyecto y cambiar estado de cotización a "approved"
- Al rechazar, pedir motivo y cambiar estado a "rejected"

### 2. Mejorar la Visualización del Estado en Tiempo Real

**Estado actual:** El portal muestra el estado pero no es muy visual.

**Mejora propuesta:**
- Agregar un timeline vertical/horizontal que muestre todas las etapas
- Marcar las etapas completadas con check verde
- Mostrar la etapa actual resaltada
- Mostrar fechas de cada etapa completada

### 3. Ver Despiece Enviado por el Diseñador

**Estado actual:** El campo `despieceFiles` existe pero no se muestra al cliente.

**Mejora propuesta:**
- En el estado `pendiente_cliente`, mostrar los archivos de despiece
- Permitir al cliente descargar/ver los archivos antes de aprobar

### 4. Notificaciones de Cambio de Estado

**Estado actual:** No hay notificaciones automáticas.

**Mejora propuesta:**
- Enviar notificación push cuando el proyecto cambie de estado
- Enviar email cuando se requiera acción del cliente
- Mostrar badge de "Acción requerida" en el portal

### 5. Flujo Completo según tu Descripción

Tu flujo descrito:
```
1. Cotización aprobada
2. Medidas enviadas al diseñador
3. Diseñador crea proyecto y despieces
4. Despieces enviados al cliente para aprobación
5. Cliente aprueba → Inicia producción
6. Producción: Corte → Enchape → Armado
7. Instalación
8. Entrega
```

**Comparación con el sistema actual:**

| Tu Flujo | Estado en Sistema | ¿Implementado? |
|----------|-------------------|----------------|
| Cotización aprobada | cotizacion_aprobada | ✅ Sí |
| Medidas al diseñador | adelanto_recibido / en_diseno | ✅ Sí |
| Diseñador crea proyecto | en_diseno | ✅ Sí |
| Despieces al cliente | pendiente_cliente | ✅ Sí (pero falta mostrar archivos) |
| Cliente aprueba | aprobacion_final | ✅ Sí |
| Corte | corte | ✅ Sí |
| Enchape | enchape | ✅ Sí |
| Armado/Ensamble | ensamble | ✅ Sí |
| Instalación | listo_instalacion / instalacion_programada | ✅ Sí |
| Entrega | entregado | ✅ Sí |

---

## Resumen de Acciones Recomendadas

### Prioridad Alta (Funcionalidad Core)
1. **Aprobar/rechazar cotizaciones desde el portal** - Permite al cliente actuar sin llamar
2. **Mostrar archivos de despiece** - El cliente necesita ver esto para aprobar

### Prioridad Media (Mejora UX)
3. **Timeline visual del proyecto** - Mejor visualización del progreso
4. **Notificaciones de cambio de estado** - Mantener al cliente informado

### Prioridad Baja (Nice to have)
5. **Historial de cambios visible** - Ver cuándo cambió cada estado
6. **Chat/mensajes integrados** - Ya tienes email y planeas WhatsApp

---

## Conclusión

El sistema ya tiene una base sólida con el flujo de estados completo. Las mejoras principales son:
1. Permitir al cliente aprobar cotizaciones desde el portal
2. Mostrar los archivos de despiece para que el cliente pueda aprobar
3. Mejorar la visualización con un timeline más claro

¿Por cuál quieres que empecemos?
