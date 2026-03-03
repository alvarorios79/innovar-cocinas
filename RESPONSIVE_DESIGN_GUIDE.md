# Guía de Responsive Design Obligatorio
**Versión:** 1.0  
**Fecha:** 2026-02-23  
**Aplicable a:** Todas las nuevas funcionalidades

---

## 📱 BREAKPOINTS ESTÁNDAR

```css
/* Mobile First */
- Móvil: 0px - 640px (sm)
- Tablet: 641px - 1024px (md)
- Laptop: 1025px - 1536px (lg)
- Desktop: 1537px+ (xl)
```

**En Tailwind:**
```css
/* Default: Mobile */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

---

## ✅ CHECKLIST RESPONSIVE OBLIGATORIO

**Antes de marcar una feature como completada, DEBE pasar:**

- [ ] Vista móvil (≤640px) - Sin overflow horizontal
- [ ] Vista tablet (641-1024px) - Elementos bien distribuidos
- [ ] Vista laptop (1025-1536px) - Espaciado correcto
- [ ] Vista desktop (>1536px) - Máximo ancho respetado
- [ ] Textos legibles en todas las vistas
- [ ] Botones clickeables en móvil (mín. 44x44px)
- [ ] Modales no se salen de pantalla
- [ ] Tablas tienen scroll horizontal en móvil
- [ ] Imágenes responsive (max-w-full)
- [ ] Formularios funcionan en móvil

---

## 🚫 PROHIBIDO

### Widths Fijos en Píxeles
```tsx
// ❌ PROHIBIDO
<div className="w-[300px]">...</div>
<div className="w-[500px]">...</div>
<div style={{ width: "400px" }}>...</div>

// ✅ PERMITIDO
<div className="w-full md:w-1/2 lg:w-1/3">...</div>
<div className="max-w-2xl mx-auto">...</div>
```

### Heights Fijos sin Scroll
```tsx
// ❌ PROHIBIDO
<div className="h-[600px] overflow-hidden">...</div>

// ✅ PERMITIDO
<div className="max-h-screen overflow-y-auto">...</div>
```

### Grillas sin Responsividad
```tsx
// ❌ PROHIBIDO
<div className="grid grid-cols-4 gap-4">...</div>

// ✅ PERMITIDO
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">...</div>
```

---

## ✅ PATRONES RECOMENDADOS

### 1. Grillas Responsive
```tsx
// ✅ CORRECTO
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>{item.name}</Card>
  ))}
</div>
```

### 2. Flexbox Responsive
```tsx
// ✅ CORRECTO
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Contenido 1</div>
  <div className="flex-1">Contenido 2</div>
</div>
```

### 3. Tablas Responsive
```tsx
// ✅ CORRECTO
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

### 4. Modales Responsive
```tsx
// ✅ CORRECTO
<DialogContent className="max-h-screen overflow-y-auto w-full md:w-auto">
  <DialogHeader>...</DialogHeader>
  <div className="space-y-4">...</div>
</DialogContent>
```

### 5. Textos Largos
```tsx
// ✅ CORRECTO
<p className="break-words text-sm md:text-base">
  {longText}
</p>
```

### 6. Imágenes Responsive
```tsx
// ✅ CORRECTO
<img 
  src={image} 
  alt="Description"
  className="w-full h-auto object-cover"
/>
```

### 7. Padding/Margin Responsive
```tsx
// ✅ CORRECTO
<div className="p-4 md:p-6 lg:p-8">
  Contenido con padding responsive
</div>
```

### 8. Texto Responsive
```tsx
// ✅ CORRECTO
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Título
</h1>
```

---

## 📋 COMPONENTES COMUNES

### Card
```tsx
// ✅ CORRECTO
<Card className="w-full md:w-auto">
  <CardHeader>...</CardHeader>
  <CardContent className="space-y-4">...</CardContent>
</Card>
```

### Button
```tsx
// ✅ CORRECTO
<Button className="w-full md:w-auto">
  Acción
</Button>
```

### Input
```tsx
// ✅ CORRECTO
<Input 
  className="w-full"
  placeholder="Ingresa algo..."
/>
```

### Select
```tsx
// ✅ CORRECTO
<Select>
  <SelectTrigger className="w-full md:w-[180px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>...</SelectContent>
</Select>
```

### Dialog
```tsx
// ✅ CORRECTO
<Dialog>
  <DialogContent className="max-h-screen overflow-y-auto">
    <DialogHeader>...</DialogHeader>
    <div className="space-y-4">...</div>
  </DialogContent>
</Dialog>
```

---

## 🔍 VALIDACIÓN EN DESARROLLO

### Herramientas
1. **Chrome DevTools** - Responsive Design Mode (F12)
2. **Firefox** - Responsive Design Mode (Ctrl+Shift+M)
3. **Safari** - Develop > Enter Responsive Design Mode
4. **Dispositivos reales** - Teléfono, tablet, laptop

### Pasos de Validación
1. Abrir DevTools
2. Activar Responsive Design Mode
3. Probar en: 320px, 640px, 768px, 1024px, 1280px, 1920px
4. Verificar:
   - Sin overflow horizontal
   - Textos legibles
   - Botones clickeables
   - Espaciado correcto
   - Imágenes bien escaladas

---

## 📐 TAMAÑOS MÍNIMOS

| Elemento | Tamaño Mínimo |
|----------|---------------|
| Botón | 44x44px (móvil) |
| Input | 44px altura |
| Select | 44px altura |
| Link | 44x44px área clickeable |
| Icono | 20x20px (mínimo) |
| Texto | 14px (móvil), 16px (desktop) |

---

## 🎯 EJEMPLOS COMPLETOS

### Página Responsive Completa
```tsx
export default function MyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container py-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
          Título
        </h1>
        <p className="text-muted-foreground mt-2">Subtítulo</p>
      </div>

      {/* Contenido */}
      <div className="container py-8">
        {/* Grilla responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map(item => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="break-words text-sm md:text-base">
                  {item.description}
                </p>
                <Button className="w-full md:w-auto">
                  Acción
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabla responsive */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm md:text-base">
            <thead>...</thead>
            <tbody>...</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚨 ANTI-PATRONES COMUNES

### ❌ Ancho fijo
```tsx
<div className="w-[500px]">...</div>
```

### ❌ Grid sin breakpoints
```tsx
<div className="grid grid-cols-4">...</div>
```

### ❌ Overflow sin scroll
```tsx
<div className="overflow-hidden">...</div>
```

### ❌ Padding fijo
```tsx
<div style={{ padding: "20px" }}>...</div>
```

### ❌ Texto sin break
```tsx
<p className="whitespace-nowrap">Texto muy largo...</p>
```

### ❌ Altura fija sin scroll
```tsx
<div className="h-[600px]">...</div>
```

---

## 📝 CHECKLIST POR TIPO DE COMPONENTE

### Nueva Página
- [ ] Mobile-first (0px)
- [ ] Tablet (768px)
- [ ] Laptop (1024px)
- [ ] Desktop (1920px)
- [ ] Sin overflow horizontal
- [ ] Navegación responsive
- [ ] Textos legibles

### Nueva Tarjeta (Card)
- [ ] Ancho responsive
- [ ] Padding responsive
- [ ] Contenido no desborda
- [ ] Imágenes escaladas
- [ ] Botones clickeables

### Nueva Tabla
- [ ] Scroll horizontal en móvil
- [ ] Headers visibles
- [ ] Datos legibles
- [ ] Acciones accesibles

### Nuevo Modal
- [ ] Max height con scroll
- [ ] Ancho responsive
- [ ] Botones accesibles
- [ ] Cierre visible

### Nuevo Formulario
- [ ] Inputs full-width en móvil
- [ ] Labels visibles
- [ ] Validación clara
- [ ] Botones clickeables

---

## 🔄 FLUJO DE DESARROLLO

1. **Diseñar mobile-first** - Empezar con 320px
2. **Implementar estructura** - HTML semántico
3. **Agregar estilos móvil** - Tailwind base
4. **Agregar breakpoints** - sm:, md:, lg:
5. **Validar en DevTools** - Todos los tamaños
6. **Validar en dispositivos reales** - Teléfono, tablet
7. **Marcar como completada** - Solo si pasa checklist

---

## 📚 RECURSOS

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mobile First Approach](https://www.nngroup.com/articles/mobile-first-web-design/)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## ⚠️ POLÍTICA DE CUMPLIMIENTO

**A partir de ahora:**

- ✅ Toda nueva funcionalidad DEBE ser responsive
- ✅ Toda nueva página DEBE pasar el checklist
- ✅ Toda nueva tarjeta DEBE ser mobile-friendly
- ✅ Toda nueva tabla DEBE tener scroll horizontal
- ✅ NO se aprueban cambios sin validación responsive

**Responsables:**
- Desarrollador: Implementar responsive
- Revisor: Validar en todos los tamaños
- QA: Probar en dispositivos reales

---

**Esta guía es obligatoria y debe cumplirse en todas las nuevas funcionalidades.**
