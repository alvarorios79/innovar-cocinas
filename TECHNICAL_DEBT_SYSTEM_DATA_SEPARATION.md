# Technical Debt: Separación Visual Manual vs System

**Estado:** Pendiente  
**Prioridad:** Media  
**Fecha de Creación:** 2026-02-23  
**Última Actualización:** 2026-02-23

---

## Descripción

Implementar separación visual o filtro por `dataOrigin` en listas grandes cuando se realice refactorización estructural de archivos principales.

**Objetivo:** Diferenciar visualmente registros reales (manual) de registros de prueba (system) para mejorar UX y evitar confusiones.

---

## Contexto

El sistema ya tiene:
- ✅ Campo `dataOrigin` en todas las tablas principales
- ✅ Valores: "manual" (reales) | "system" (prueba)
- ✅ Función `system.cleanupData` que elimina registros system
- ✅ Lógica de separación validada en tests

**Falta:** Separación visual en UI

---

## Archivos Afectados (Grandes - Requieren Refactorización)

| Archivo | Líneas | Clientes | Proyectos | Cotizaciones | Citas |
|---------|--------|----------|-----------|--------------|-------|
| Admin.tsx | 108KB | ✅ | ❌ | ❌ | ❌ |
| Projects.tsx | 112KB | ❌ | ✅ | ❌ | ❌ |
| Quotations.tsx | 187KB | ❌ | ❌ | ✅ | ❌ |
| AppointmentsCalendar.tsx | 26KB | ❌ | ❌ | ❌ | ✅ |

---

## Implementación Propuesta

### Opción A: Separación Visual Simple (Recomendada)

```tsx
// 1. Separar en memoria
const manualItems = filteredItems.filter(i => i.dataOrigin !== "system");
const systemItems = filteredItems.filter(i => i.dataOrigin === "system");

// 2. Renderizar 2 secciones
<div className="space-y-8">
  {/* Sección Reales */}
  {manualItems.length > 0 && (
    <div>
      <h3>🔵 Registros Reales ({manualItems.length})</h3>
      {manualItems.map(...)}
    </div>
  )}
  
  {/* Sección Prueba */}
  {systemItems.length > 0 && (
    <div className="bg-muted/30 rounded-lg p-4">
      <h3>🧪 Registros de Prueba ({systemItems.length})</h3>
      {systemItems.map(...)}
    </div>
  )}
</div>
```

### Opción B: Filtro Selector (Alternativa)

Agregar toggle/selector para mostrar solo reales, solo prueba, o ambos.

---

## Validación Requerida

Antes de implementar, confirmar:

- [ ] `dataOrigin` está correctamente poblado en BD
- [ ] `system.cleanupData` elimina registros system sin errores
- [ ] Filtros existentes siguen funcionando
- [ ] Paginación no se rompe
- [ ] Búsqueda sigue funcionando
- [ ] Edición/eliminación funciona en ambas secciones

---

## Próximos Pasos

1. **Refactorizar Admin.tsx** - Extraer lógica de clientes a componente reutilizable
2. **Aplicar separación visual** - Implementar en Admin.tsx primero
3. **Replicar en Projects.tsx** - Usar mismo patrón
4. **Replicar en Quotations.tsx** - Usar mismo patrón
5. **Replicar en AppointmentsCalendar.tsx** - Usar mismo patrón

---

## Notas

- No modificar backend ni lógica de datos
- Cambio es puramente visual
- Mantener todas las funcionalidades existentes
- Considerar crear componente reutilizable `DataOriginSeparator`

---

## Referencias

- Checkpoint: 87daf973 (Refinamiento Visual Profesional)
- Auditoría: RESPONSIVE_NAVIGATION_AUDIT.md
- Política: RESPONSIVE_DESIGN_GUIDE.md
