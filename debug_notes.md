# Debug: Problema de permisos de fotos para rol comercial

## Hallazgo clave de la captura de pantalla:

En el formulario se muestra:
- **Categoría:** "Medidas" (con M mayúscula - esto es el LABEL del select, no el value)
- **Subcategoría:** "Fotos Iniciales"

El error dice: "No tienes permisos..."

## Análisis del código:

1. En Projects.tsx línea 1592-1593, los valores del Select son:
   - `<SelectItem value="cotizacion">Cotización</SelectItem>`
   - `<SelectItem value="medidas">Medidas</SelectItem>`

2. El value es "medidas" (minúscula), pero el label mostrado es "Medidas"

3. La función validatePhotoUploadPermission espera `["cotizacion", "medidas"]` en minúsculas

4. **PROBLEMA ENCONTRADO:** En la captura NO se ve el campo "Etapa" seleccionado!
   - El formulario requiere seleccionar Etapa primero
   - Si stage está vacío (""), el PhotoUploader NO se renderiza (línea 1649)
   - Pero el error aparece... ¿cómo?

## Hipótesis:
- El usuario puede estar usando un formulario diferente (ProjectInlineDetail.tsx?)
- O el error viene de otro lugar

## Próximo paso:
- Verificar si hay otro PhotoUploader en ProjectInlineDetail.tsx
- Verificar si el error viene del endpoint upload.image o projectPhotos.upload
