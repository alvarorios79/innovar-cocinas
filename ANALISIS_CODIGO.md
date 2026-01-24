# Análisis de Código y Flujo de Trabajo - INNOVAR Cocinas

## Resumen Ejecutivo

Se realizó un análisis completo del sistema para identificar errores, código basura e inconsistencias, así como oportunidades de mejora en el flujo de trabajo.

---

## 1. HALLAZGOS TÉCNICOS

### 1.1 Console.logs de Debug (LIMPIAR)

Se encontraron **31 console.log** que deberían eliminarse en producción:

| Archivo | Línea | Tipo |
|---------|-------|------|
| `server/routers.ts` | 2844 | DEBUG - financialInfo |
| `client/src/components/ProjectInlineDetail.tsx` | 131, 300, 302 | DEBUG - ProjectDetail |
| `client/src/pages/Admin.tsx` | 334, 337 | DEBUG - User/Role |
| `client/src/pages/Quotations.tsx` | 551, 554, 916, 917, 1221, 1594 | DEBUG - Items |

**Recomendación:** Eliminar todos los console.log de debug antes de producción.

### 1.2 Campos de Lavaplatos en Base de Datos (OBSOLETOS)

Campos `sinkMeasure` y `sinkPhotoUrl` en la tabla `projectMaterials` ya no se usan porque lavaplatos se movió a herrajes:

```typescript
// drizzle/schema.ts - Líneas 437-438
sinkMeasure: varchar("sinkMeasure", { length: 100 }),
sinkPhotoUrl: text("sinkPhotoUrl"),
```

**Recomendación:** Mantener los campos por compatibilidad con datos existentes, pero marcarlos como deprecated.

### 1.3 Función formatPrice Duplicada (4 veces)

La función `formatPrice` está definida en 4 archivos diferentes:

1. `CountertopConfigurator.tsx` (línea 177)
2. `Admin.tsx` (línea 395)
3. `Portal.tsx` (línea 193)
4. `Quotations.tsx` (línea 936)

**Recomendación:** Crear un archivo `client/src/lib/formatters.ts` con funciones de formateo reutilizables.

### 1.4 Archivos Muy Grandes (Refactorizar)

| Archivo | Líneas | Recomendación |
|---------|--------|---------------|
| `server/routers.ts` | 4,281 | Dividir en routers separados por dominio |
| `client/src/pages/Quotations.tsx` | 2,004 | Extraer componentes a archivos separados |
| `client/src/pages/Projects.tsx` | 1,815 | Extraer componentes a archivos separados |
| `server/db.ts` | 1,528 | Dividir por dominio (clients, projects, quotations) |

### 1.5 TODO Pendiente

```typescript
// client/src/pages/Admin.tsx:407
// TODO: Implementar nuevo formulario con items dinámicos
```

---

## 2. ANÁLISIS DEL FLUJO DE TRABAJO

### 2.1 Flujo Actual del Proyecto

```
1. Cliente agenda cita → 
2. Comercial visita y toma medidas → 
3. Se genera cotización → 
4. Cliente aprueba cotización → 
5. Cliente paga 60% adelanto → 
6. Diseñador tiene 3 días para entregar diseño → 
7. Cliente aprueba diseño (5 días máx) → 
8. Producción (25 días hábiles): despiece → corte → enchape → ensamble → 
9. Instalación programada → 
10. Cliente paga 40% restante → 
11. Entrega
```

### 2.2 Problemas Identificados en el Flujo

| Problema | Impacto | Solución Propuesta |
|----------|---------|-------------------|
| No hay botón para registrar pago del 40% | Admin debe editar BD manualmente | Agregar botón "Registrar Pago" en detalle del proyecto |
| No hay filtro de proyectos con saldo pendiente | Difícil seguimiento de cobros | Agregar filtro "Saldo Pendiente" en lista de proyectos |
| No hay alerta visual de cobro pendiente | Se pueden olvidar cobros | Mostrar indicador rojo en proyectos entregados sin pago completo |
| Recordatorios no se están enviando automáticamente | Deadlines se pueden pasar | Verificar y activar sistema de recordatorios |

### 2.3 Funcionalidades Faltantes según Requisitos

Basado en el conocimiento del sistema:

1. **Permisos del Diseñador** - Debe ver solo nombre y dirección del cliente (NO teléfono, NO cotización, NO recibo)
2. **Asignación de Tareas** - Validar que cada rol solo pueda asignar a los roles permitidos
3. **Recordatorios Automáticos** - Verificar que se envíen:
   - 2 días sin respuesta a cotización
   - 3 días para entregar diseño
   - 5 días esperando aprobación del cliente

---

## 3. MEJORAS RECOMENDADAS

### 3.1 Mejoras Inmediatas (Alta Prioridad)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Botón "Registrar Pago 40%" en proyectos | Bajo | Alto |
| 2 | Filtro de proyectos con saldo pendiente | Bajo | Alto |
| 3 | Eliminar console.logs de debug | Bajo | Medio |
| 4 | Indicador visual de cobro pendiente | Bajo | Alto |

### 3.2 Mejoras de Mediano Plazo

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 5 | Refactorizar routers.ts en módulos | Medio | Alto |
| 6 | Crear lib/formatters.ts centralizado | Bajo | Medio |
| 7 | Verificar sistema de recordatorios | Medio | Alto |
| 8 | Restringir permisos del diseñador | Medio | Medio |

### 3.3 Mejoras de Largo Plazo

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 9 | Dashboard de métricas (proyectos/mes, tiempo promedio, etc.) | Alto | Alto |
| 10 | Notificaciones por WhatsApp automáticas | Alto | Alto |
| 11 | Calendario de producción visual | Alto | Alto |
| 12 | App móvil para operarios | Alto | Medio |

---

## 4. CÓDIGO BASURA A ELIMINAR

### 4.1 Console.logs de Debug

```bash
# Archivos a limpiar:
server/routers.ts:2844
client/src/components/ProjectInlineDetail.tsx:131,300,302
client/src/pages/Admin.tsx:334,337
client/src/pages/Quotations.tsx:551,554,916,917,1221,1594
```

### 4.2 Campos Obsoletos (No eliminar, solo deprecar)

```typescript
// projectMaterials - campos de lavaplatos
sinkMeasure
sinkPhotoUrl
```

---

## 5. PRÓXIMOS PASOS RECOMENDADOS

1. **Implementar botón "Registrar Pago"** - Permitir registrar el pago del 40% restante
2. **Agregar filtro de saldo pendiente** - En lista de proyectos
3. **Limpiar console.logs** - Eliminar todos los logs de debug
4. **Verificar recordatorios** - Asegurar que se envíen automáticamente
5. **Refactorizar routers.ts** - Dividir en módulos por dominio

---

*Reporte generado el 24 de enero de 2026*
