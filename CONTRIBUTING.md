# Guía de Contribución

Gracias por tu interés en contribuir a INNOVAR Cocinas Integrales. Este documento proporciona directrices para contribuir al proyecto.

## 🎯 Principios

- **Calidad primero**: El código debe ser limpio, bien documentado y testeado
- **Type safety**: Usar TypeScript en todo el proyecto
- **Testing**: Toda nueva funcionalidad debe incluir tests
- **Documentación**: Actualizar documentación relevante

## 🔄 Flujo de Trabajo

### 1. Fork y Clonar
```bash
git clone https://github.com/alvarorios79/innovar-cocinas.git
cd innovar-cocinas
```

### 2. Crear Rama de Feature
```bash
git checkout -b feature/descripcion-corta
```

Nombres de rama recomendados:
- `feature/nueva-funcionalidad`
- `fix/descripcion-bug`
- `docs/actualizacion-documentacion`
- `refactor/mejora-codigo`

### 3. Hacer Cambios

#### Para Backend (server/)
1. Actualizar schema en `drizzle/schema.ts` si es necesario
2. Ejecutar `pnpm db:push` para migraciones
3. Agregar helpers en `server/db.ts`
4. Crear/actualizar procedimientos en `server/routers.ts`
5. Escribir tests en `server/*.test.ts`

#### Para Frontend (client/)
1. Crear componentes en `client/src/components/`
2. Crear páginas en `client/src/pages/`
3. Usar hooks tRPC para datos
4. Mantener estilos consistentes con Tailwind
5. Asegurar responsividad

### 4. Commit y Push
```bash
git add .
git commit -m "feat: descripción clara del cambio"
git push origin feature/descripcion-corta
```

Formato de commits (Conventional Commits):
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan funcionalidad)
- `refactor:` Refactorización de código
- `perf:` Mejoras de performance
- `test:` Agregar o actualizar tests

### 5. Pull Request
1. Abre un PR contra la rama `main`
2. Describe los cambios claramente
3. Referencia issues relacionados (#123)
4. Asegúrate de que todos los tests pasen

## ✅ Checklist Antes de Enviar PR

- [ ] Código sigue el estilo del proyecto
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada
- [ ] No hay errores TypeScript
- [ ] Cambios de base de datos incluyen migraciones
- [ ] Commits tienen mensajes descriptivos

## 📋 Estándares de Código

### TypeScript
```typescript
// ✅ Bien
const getUserById = async (id: string): Promise<User> => {
  return db.query.users.findFirst({ where: eq(users.id, id) });
};

// ❌ Mal
const getUserById = async (id) => {
  return db.query.users.findFirst({ where: eq(users.id, id) });
};
```

### React Components
```typescript
// ✅ Bien
export const UserCard: React.FC<UserCardProps> = ({ user, onDelete }) => {
  return (
    <div className="p-4 border rounded">
      <h3>{user.name}</h3>
      <button onClick={() => onDelete(user.id)}>Eliminar</button>
    </div>
  );
};

// ❌ Mal
const UserCard = (props) => {
  return <div>{props.user.name}</div>;
};
```

### Tailwind CSS
```jsx
// ✅ Bien - Clases semánticas
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h3 className="text-lg font-semibold text-gray-900">Título</h3>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Acción
  </button>
</div>

// ❌ Mal - Demasiadas clases sin estructura
<div className="flex p-4">
  <h3>Título</h3>
  <button>Acción</button>
</div>
```

## 🧪 Testing

### Escribir Tests
```typescript
import { describe, it, expect } from 'vitest';
import { calculateTotal } from './pricing';

describe('calculateTotal', () => {
  it('should calculate total with discount', () => {
    const result = calculateTotal(1000, 0.1);
    expect(result).toBe(900);
  });

  it('should handle zero discount', () => {
    const result = calculateTotal(1000, 0);
    expect(result).toBe(1000);
  });
});
```

### Ejecutar Tests
```bash
pnpm test                 # Ejecutar todos
pnpm test:watch          # Modo watch
pnpm test -- --coverage  # Con coverage
```

## 📚 Documentación

### Actualizar README
Si tu cambio afecta:
- Instalación → Actualizar sección "Instalación"
- Nuevas features → Agregar a "Características"
- Comandos → Actualizar sección "Comandos"

### Comentarios en Código
```typescript
/**
 * Calcula el total de una cotización con descuento
 * @param basePrice - Precio base en COP
 * @param discountPercent - Porcentaje de descuento (0-1)
 * @returns Total después de aplicar descuento
 */
export const calculateTotal = (basePrice: number, discountPercent: number): number => {
  return basePrice * (1 - discountPercent);
};
```

## 🐛 Reportar Bugs

Usa GitHub Issues con este formato:

```markdown
**Descripción del Bug**
Descripción clara y concisa

**Pasos para Reproducir**
1. Ir a...
2. Hacer clic en...
3. Ver error

**Comportamiento Esperado**
Qué debería pasar

**Comportamiento Actual**
Qué está pasando

**Capturas de Pantalla**
Si aplica

**Entorno**
- OS: [ej: macOS 14.1]
- Browser: [ej: Chrome 120]
- Node: [ej: 18.17.0]
```

## 💡 Sugerencias de Features

Abre una GitHub Issue con:
- Descripción clara de la feature
- Caso de uso
- Beneficios esperados
- Ejemplos si es posible

## 🔍 Revisión de Código

Los PRs serán revisados considerando:
- Calidad del código
- Cobertura de tests
- Documentación
- Performance
- Seguridad

## 📞 Preguntas

Si tienes preguntas:
1. Revisa la documentación existente
2. Busca issues similares
3. Abre una nueva issue con la etiqueta `question`

---

¡Gracias por contribuir! 🎉
