# 🍳 Especificación Completa - COCINAS

**Última actualización:** 20 de enero de 2026

---

## 📋 Estructura del Item COCINA

Una cotización de cocina es **UN SOLO ITEM** que incluye todos los componentes:

---

## 1. FORMA DE LA COCINA

Opciones:
- En L
- En U
- Lineal

**Nota:** Solo informativo, no afecta el precio.

---

## 2. MUEBLES LINEALES

### **Muebles Inferiores**
- Precio: **$900,000/ml**
- Se descuentan los anchos de muebles especiales del metraje total

### **Muebles Superiores**
- Precio: **$900,000/ml**
- Mismo metraje que los muebles inferiores (después de descontar especiales)

**Ejemplo:**
```
Metraje total de pared: 5.00 m
Muebles especiales:
  - Nicho nevera 75cm: -0.75 m
  - Alacena 50cm: -0.50 m
Metraje resultante: 3.75 ml

Muebles inferiores: 3.75 ml × $900,000 = $3,375,000
Muebles superiores: 3.75 ml × $900,000 = $3,375,000
```

---

## 3. MUEBLES ESPECIALES

Estos muebles van de piso a techo y **se descuentan del metraje lineal**:

| Mueble | Ancho | Precio |
|--------|-------|--------|
| Nicho para nevecon (grande) | 100 cm | $1,200,000 |
| Nicho para nevera estándar/pequeña | 75 cm | $1,200,000 |
| Alacena con entrepaños | 50 cm | $1,250,000 |
| Alacena para herraje | 50 cm | $900,000 |
| Torre de hornos | 70 cm | $1,350,000 |

**Nota:** La alacena para herraje requiere agregar el herraje por separado ($500,000 temporal).

---

## 4. MESÓN PRINCIPAL

### **Tipos de Mesón**
- **Quarzone:** $850,000/ml (fondo estándar 60 cm)
- **Sinterizado:** $1,200,000/ml (fondo estándar 60 cm)

### **Metros Lineales**
- Mismo metraje que los muebles inferiores (después de descontar especiales)

### **Recargos por Fondo**

| Fondo | Recargo |
|-------|---------|
| Hasta 60 cm | Precio base |
| 61 cm - 90 cm | ☐ Aplicar +30% |
| 91 cm - 120 cm | ☐ Aplicar ×2 (doble) |
| Más de 120 cm | Cálculo manual |

**Ejemplos:**

**Mesón Quarzone 4.5 ml × 70 cm fondo (61-90 cm):**
```
Precio base: $850,000/ml
☑ Recargo 30%: $255,000/ml
Precio final: $1,105,000/ml
Total: 4.5 ml × $1,105,000 = $4,972,500
```

**Mesón Sinterizado 3 ml × 100 cm fondo (91-120 cm):**
```
Precio base: $1,200,000/ml
☑ Precio doble ×2: $2,400,000/ml
Total: 3 ml × $2,400,000 = $7,200,000
```

---

## 5. ISLA (Opcional)

### **Componentes:**
1. **Muebles:** X ml × $900,000
2. **Mesón superior:** X ml × precio según tipo y fondo
3. **☐ Laterales** (checkbox):
   - Si está marcado, suma automáticamente:
     - **Mesón lateral:** 1.80 ml × precio según tipo
     - **Regrueso:** 0.90 ml × precio según tipo

**Ejemplo:**
```
Isla de 2 ml con laterales, mesón Quarzone:

Muebles: 2 ml × $900,000 = $1,800,000
Mesón superior: 2 ml × $850,000 = $1,700,000
☑ Laterales:
  - Mesón lateral: 1.80 ml × $850,000 = $1,530,000
  - Regrueso: 0.90 ml × $850,000 = $765,000

TOTAL ISLA: $5,795,000
```

---

## 6. BARRA (Opcional)

### **Componentes:**
1. **Muebles:** X ml × $900,000
2. **Mesón superior:** X ml × precio según tipo y fondo
3. **☐ Lateral** (checkbox):
   - Si está marcado, suma automáticamente:
     - **Mesón lateral:** 0.90 ml × precio según tipo (fijo)

**Ejemplo:**
```
Barra de 1.5 ml con lateral, mesón Sinterizado:

Muebles: 1.5 ml × $900,000 = $1,350,000
Mesón superior: 1.5 ml × $1,200,000 = $1,800,000
☑ Lateral:
  - Mesón lateral: 0.90 ml × $1,200,000 = $1,080,000

TOTAL BARRA: $4,230,000
```

---

## 7. LUZ LED (Opcional)

- Precio: **$180,000/ml**
- Se cotiza por metros lineales de tira LED

**Ejemplo:**
```
Luz LED bajo muebles superiores: 3.75 ml × $180,000 = $675,000
```

---

## 8. TRANSPORTE E IMPREVISTOS

- Precio: **$600,000** (fijo)
- Se cobra **una sola vez** por item COCINA

---

## 📊 EJEMPLO COMPLETO DE COTIZACIÓN

**Cliente:** Juan Pérez  
**Proyecto:** Cocina Integral en L

### **Desglose:**

**1. Forma:** En L

**2. Muebles Lineales:**
- Metraje total: 5.00 m
- Descontar nicho nevera 75cm: -0.75 m
- Descontar alacena 50cm: -0.50 m
- **Metraje resultante:** 3.75 ml

- Muebles inferiores: 3.75 ml × $900,000 = $3,375,000
- Muebles superiores: 3.75 ml × $900,000 = $3,375,000

**3. Muebles Especiales:**
- Nicho nevera estándar 75cm: $1,200,000
- Alacena con entrepaños 50cm: $1,250,000

**4. Mesón Principal:**
- Tipo: Quarzone
- Metros: 3.75 ml
- Fondo: 70 cm (☑ Recargo 30%)
- Precio: 3.75 ml × $1,105,000 = $4,143,750

**5. Isla:**
- Muebles: 2 ml × $900,000 = $1,800,000
- Mesón superior Quarzone: 2 ml × $850,000 = $1,700,000
- ☑ Laterales:
  - Mesón lateral: 1.80 ml × $850,000 = $1,530,000
  - Regrueso: 0.90 ml × $850,000 = $765,000
- **Subtotal isla:** $5,795,000

**6. Luz LED:**
- 3.75 ml × $180,000 = $675,000

**7. Transporte e Imprevistos:**
- $600,000

---

### **TOTAL COCINA INTEGRAL:** $22,213,750

---

## 🔄 FLUJO DE CÁLCULO

1. Usuario ingresa metraje total de la cocina
2. Usuario selecciona muebles especiales (nicho, alacena, torre)
3. Sistema calcula automáticamente metraje resultante (total - anchos especiales)
4. Usuario ingresa datos de mesón (tipo, recargos)
5. Sistema calcula precio de mesón
6. Usuario ingresa datos de isla (si aplica) con checkbox de laterales
7. Sistema calcula precio de isla
8. Usuario ingresa datos de barra (si aplica) con checkbox de lateral
9. Sistema calcula precio de barra
10. Usuario ingresa metros de luz LED (si aplica)
11. Sistema suma todos los componentes + $600,000 fijos
12. **TOTAL COCINA**

---

## ✅ VALIDACIONES

1. Metraje total debe ser mayor a 0
2. Anchos de muebles especiales no pueden exceder el metraje total
3. Solo se puede marcar UN tipo de recargo de mesón (30% O ×2, no ambos)
4. Si hay isla, debe tener al menos 1 ml
5. Si hay barra, debe tener al menos 1 ml
6. Luz LED debe ser mayor a 0 si se incluye

---

## 📄 FORMATO EN PDF

```
COTIZACIÓN: COT-2026-XXX
Cliente: Juan Pérez
Fecha: 20 de enero de 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COCINA INTEGRAL EN L

Muebles Lineales:
  • Muebles inferiores (3.75 ml)          $3,375,000
  • Muebles superiores (3.75 ml)          $3,375,000

Muebles Especiales:
  • Nicho nevera estándar 75cm            $1,200,000
  • Alacena con entrepaños 50cm           $1,250,000

Mesón Principal:
  • Quarzone 3.75 ml (70cm fondo +30%)    $4,143,750

Isla:
  • Muebles 2 ml                          $1,800,000
  • Mesón superior Quarzone 2 ml          $1,700,000
  • Laterales (1.80 ml + 0.90 ml)         $2,295,000

Luz LED:
  • 3.75 ml                               $675,000

Transporte e Imprevistos:                 $600,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL COCINA INTEGRAL:                    $22,213,750

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
