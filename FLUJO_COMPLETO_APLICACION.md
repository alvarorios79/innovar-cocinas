# 🔄 Diagrama de Flujo Completo - INNOVAR Cocinas

## 1. FLUJO GENERAL DE LA APLICACIÓN

```mermaid
graph TD
    A["🌐 Usuario Accede a INNOVAR"] --> B{¿Autenticado?}
    B -->|No| C["🔐 Pantalla de Login"]
    C --> D["OAuth: Apple/Google/Email"]
    D --> E["✅ Sesión Creada"]
    B -->|Sí| E
    E --> F{¿Rol del Usuario?}
    
    F -->|Super Admin| G["📊 Panel Admin Completo"]
    F -->|Admin| H["📋 Panel Admin Restringido"]
    F -->|Comercial| I["💼 Panel Comercial"]
    F -->|Diseñador| J["🎨 Panel Diseñador"]
    F -->|Jefe Taller| K["🔧 Panel Taller"]
    F -->|Operario| L["👷 Panel Operario"]
    F -->|Usuario| M["👤 Mi Cuenta"]
    
    G --> N["Acceso a Todos los Módulos"]
    H --> O["Acceso a Módulos 1-8"]
    I --> P["Clientes, Proyectos, Cotizaciones, Pagos"]
    J --> Q["Proyectos, Cotizaciones, Catálogos"]
    K --> R["Proyectos, Pagos, Gastos, Tareas"]
    L --> S["Solo Lectura"]
    M --> T["Perfil y Datos Personales"]
```

---

## 2. FLUJO DE CLIENTE

```mermaid
graph TD
    A["👤 Cliente Nuevo"] --> B["📋 Crear Cliente"]
    B --> C["Registrar Datos Básicos"]
    C --> D["📞 Contacto por WhatsApp"]
    D --> E{¿Solicita Asesoría?}
    
    E -->|Sí| F["📝 Crear Solicitud de Asesoría"]
    F --> G["Asignar a Comercial"]
    G --> H["📞 Contacto Comercial"]
    H --> I{¿Interesado?}
    
    I -->|No| J["❌ Rechazar"]
    I -->|Sí| K["✅ Aceptar"]
    
    K --> L["📊 Crear Estimado Previo"]
    L --> M["💰 Calcular Presupuesto Inicial"]
    M --> N["📧 Enviar Presupuesto"]
    N --> O{¿Cliente Aprueba?}
    
    O -->|No| P["🔄 Revisar Presupuesto"]
    P --> N
    O -->|Sí| Q["✅ Proyecto Creado"]
    
    J --> R["📁 Archivo de Cliente"]
    Q --> R
```

---

## 3. FLUJO DE PROYECTO

```mermaid
graph TD
    A["✅ Proyecto Creado"] --> B["📋 Estado: Contacto"]
    B --> C["💼 Asignar a Comercial"]
    C --> D["📧 Enviar Cotización"]
    D --> E["📋 Estado: Cotización Enviada"]
    E --> F{¿Cliente Responde?}
    
    F -->|No| G["⏰ Recordatorio Automático"]
    G --> F
    F -->|Sí| H{¿Aprueba?}
    
    H -->|No| I["❌ Rechazado"]
    H -->|Sí| J["✅ Cotización Aprobada"]
    
    I --> Z1["📁 Archivo"]
    J --> K["💰 Registrar Adelanto"]
    K --> L["📋 Estado: Adelanto Recibido"]
    L --> M["🎨 Asignar a Diseñador"]
    M --> N["📋 Estado: En Diseño"]
    N --> O["🖼️ Crear Modelado 3D"]
    O --> P["📋 Estado: Pendiente Modelado"]
    P --> Q["📧 Enviar Renders"]
    Q --> R["📋 Estado: Pendiente Render"]
    R --> S{¿Cliente Aprueba?}
    
    S -->|No| T["🔄 Solicitar Revisión"]
    T --> U["📋 Revisión #N"]
    U --> O
    S -->|Sí| V["✅ Renders Aprobados"]
    
    V --> W["📋 Estado: Aprobación Final"]
    W --> X["📄 Generar Despiece"]
    X --> Y["📋 Estado: Despiece"]
    Y --> Z["🔧 Enviar a Taller"]
    Z --> AA["📋 Estado: Corte"]
    AA --> AB["📋 Estado: Enchape"]
    AB --> AC["📋 Estado: Ensamble"]
    AC --> AD["📋 Estado: Listo para Instalación"]
    AD --> AE["📅 Programar Cita de Instalación"]
    AE --> AF["🚚 Instalación"]
    AF --> AG["📋 Estado: Entregado"]
    AG --> AH["💰 Registrar Saldo Final"]
    AH --> AI["✅ Proyecto Completado"]
    
    Z1 --> AJ["📁 Archivo"]
    AI --> AJ
```

---

## 4. FLUJO DE COTIZACIÓN

```mermaid
graph TD
    A["📝 Crear Cotización"] --> B["Seleccionar Cliente"]
    B --> C["Seleccionar Tipo de Producto"]
    C --> D{¿Tipo?}
    
    D -->|Cocina| E["🍳 Configurar Cocina"]
    D -->|Closet| F["🚪 Configurar Closet"]
    D -->|Puerta| G["🚪 Configurar Puerta"]
    D -->|Centro TV| H["📺 Configurar Centro TV"]
    
    E --> I["Seleccionar Forma: L, U, Lineal"]
    I --> J["Ingresar Medidas"]
    J --> K["Seleccionar Materiales"]
    K --> L["Seleccionar Hardware"]
    L --> M["Calcular Precio"]
    
    F --> N["Ingresar Dimensiones"]
    N --> K
    G --> O["Seleccionar Tipo"]
    O --> K
    H --> P["Ingresar Medidas"]
    P --> K
    
    M --> Q["Agregar Costos Fijos"]
    Q --> R["Agregar Transporte"]
    R --> S["Calcular Subtotal"]
    S --> T["Aplicar Descuento"]
    T --> U["Calcular Total"]
    U --> V["📋 Estado: Draft"]
    V --> W["Generar PDF"]
    W --> X["Bloquear Cotización"]
    X --> Y["📋 Estado: Enviada"]
    Y --> Z["📧 Enviar al Cliente"]
    Z --> AA["📱 Opción: WhatsApp"]
    AA --> AB{¿Respuesta del Cliente?}
    
    AB -->|Aprobada| AC["✅ Cotización Aprobada"]
    AB -->|Rechazada| AD["❌ Cotización Rechazada"]
    AB -->|Revisión| AE["🔄 Crear Nueva Versión"]
    AE --> V
    
    AC --> AF["Crear Proyecto"]
    AD --> AG["Archivo"]
    AF --> AH["📁 Proyecto Iniciado"]
    AG --> AI["📁 Archivo"]
```

---

## 5. FLUJO DE PAGOS

```mermaid
graph TD
    A["💰 Proyecto Creado"] --> B["Monto Total: $X"]
    B --> C["Adelanto Requerido: 50%"]
    C --> D["📧 Solicitar Adelanto"]
    D --> E{¿Adelanto Recibido?}
    
    E -->|No| F["⏰ Recordatorio"]
    F --> E
    E -->|Sí| G["✅ Registrar Adelanto"]
    G --> H["Saldo Pendiente: 50%"]
    H --> I["Continuar Proyecto"]
    I --> J["🎨 Diseño"]
    J --> K["🔧 Producción"]
    K --> L["🚚 Instalación"]
    L --> M["📧 Solicitar Saldo Final"]
    M --> N{¿Saldo Recibido?}
    
    N -->|No| O["⏰ Recordatorio"]
    O --> N
    N -->|Sí| P["✅ Registrar Saldo"]
    P --> Q["Saldo Pendiente: $0"]
    Q --> R["✅ Proyecto Pagado"]
    
    R --> S{¿Aplicar Descuento?}
    S -->|Sí| T["💸 Registrar Descuento"]
    T --> U["Recalcular Precio Neto"]
    S -->|No| U
    
    U --> V["💵 Precio NETO Final"]
    V --> W["Elegible para Cierre Contable"]
    W --> X["📊 Incluir en Cierre"]
```

---

## 6. FLUJO DE GASTOS

```mermaid
graph TD
    A["💼 Proyecto en Producción"] --> B["Registrar Gasto de Proyecto"]
    B --> C["Seleccionar Categoría"]
    C --> D["Ingresar Monto"]
    D --> E["Adjuntar Recibo"]
    E --> F["✅ Gasto Registrado"]
    F --> G["Asociado al Proyecto"]
    
    H["🏢 Operación Diaria"] --> I["Registrar Gasto Operativo"]
    I --> J["Seleccionar Categoría"]
    J --> K["Arriendo, Energía, Agua, etc."]
    K --> L["Ingresar Monto"]
    L --> M["Adjuntar Recibo"]
    M --> N["✅ Gasto Registrado"]
    N --> O["Gasto General del Negocio"]
    
    F --> P["📊 Cálculo de Ganancia"]
    O --> P
    P --> Q["Ganancia = Precio Neto - Gastos Proyecto"]
    Q --> R["Margen de Ganancia %"]
    R --> S["Elegible para Cierre Contable"]
```

---

## 7. FLUJO DE CIERRE CONTABLE

```mermaid
graph TD
    A["📅 Fin de Período"] --> B["Crear Cierre Contable"]
    B --> C["Seleccionar Período"]
    C --> D["Filtrar Proyectos Elegibles"]
    D --> E["Criterios:"]
    E --> F["✅ Archivado"]
    E --> G["✅ Entregado"]
    E --> H["✅ Pagado Completamente"]
    E --> I["✅ dataOrigin = manual"]
    E --> J["✅ No Eliminado"]
    
    F --> K["Calcular Precio NETO"]
    G --> K
    H --> K
    I --> K
    J --> K
    
    K --> L["Precio Original - Descuentos + Recargos"]
    L --> M["Incluir Gastos de Proyecto"]
    M --> N["Calcular Ganancia por Proyecto"]
    N --> O["Sumar Gastos Operativos"]
    O --> P["Calcular Totales"]
    P --> Q["Total Ventas Netas"]
    P --> R["Total Gastos"]
    P --> S["Total Ganancia"]
    
    Q --> T["📋 Estado: Draft"]
    R --> T
    S --> T
    
    T --> U["Revisar Detalles"]
    U --> V{¿Datos Correctos?}
    
    V -->|No| W["Editar Cierre"]
    W --> U
    V -->|Sí| X["Confirmar Cierre"]
    
    X --> Y["📋 Estado: Confirmed"]
    Y --> Z["Registrar en Auditoría"]
    Z --> AA["✅ Cierre Completado"]
    AA --> AB["📊 Análisis Financiero"]
    AB --> AC["Reportes"]
```

---

## 8. FLUJO DE TAREAS Y RECORDATORIOS

```mermaid
graph TD
    A["📋 Proyecto Creado"] --> B["Sistema Genera Tareas Automáticas"]
    B --> C["Tarea: Enviar Cotización"]
    B --> D["Tarea: Diseño Pendiente"]
    B --> E["Tarea: Aprobación Cliente"]
    B --> F["Tarea: Producción"]
    B --> G["Tarea: Instalación"]
    
    C --> H["Asignar a Comercial"]
    D --> I["Asignar a Diseñador"]
    E --> J["Asignar a Comercial"]
    F --> K["Asignar a Jefe Taller"]
    G --> L["Asignar a Jefe Taller"]
    
    H --> M["📅 Fecha Vencimiento"]
    I --> M
    J --> M
    K --> M
    L --> M
    
    M --> N{¿Tarea Vencida?}
    N -->|Sí| O["🔔 Recordatorio Automático"]
    O --> P["Notificación Push"]
    P --> Q["Email"]
    Q --> R["WhatsApp"]
    
    N -->|No| S["⏳ Pendiente"]
    
    R --> T["Marcar como Completada"]
    S --> T
    T --> U["✅ Tarea Completada"]
    U --> V["Siguiente Tarea"]
```

---

## 9. FLUJO DE NOTIFICACIONES

```mermaid
graph TD
    A["🔔 Evento del Sistema"] --> B{¿Tipo de Evento?}
    
    B -->|Proyecto| C["Cambio de Estado"]
    B -->|Tarea| D["Tarea Asignada/Vencida"]
    B -->|Cotización| E["Cotización Enviada/Aprobada"]
    B -->|Pago| F["Pago Recibido/Pendiente"]
    B -->|Sistema| G["Alerta/Notificación"]
    
    C --> H["Crear Notificación"]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I["Guardar en BD"]
    I --> J["Enviar Push?"]
    J -->|Sí| K["Buscar Suscripciones Activas"]
    K --> L["Enviar Notificación Push"]
    L --> M["Registrar Envío"]
    
    J -->|No| N["Solo en BD"]
    
    M --> O["Usuario Recibe Notificación"]
    N --> O
    O --> P["Click en Notificación"]
    P --> Q["Ir a Recurso Relacionado"]
    Q --> R["Marcar como Leída"]
```

---

## 10. FLUJO DE AUDITORÍA

```mermaid
graph TD
    A["👤 Usuario Realiza Acción"] --> B{¿Acción Registrable?}
    
    B -->|Crear| C["INSERT en auditLogs"]
    B -->|Actualizar| D["UPDATE en auditLogs"]
    B -->|Eliminar| E["DELETE en auditLogs"]
    B -->|Restaurar| F["RESTORE en auditLogs"]
    
    C --> G["Registrar Cambios"]
    D --> G
    E --> G
    F --> G
    
    G --> H["Guardar Datos"]
    H --> I["userId"]
    H --> J["action"]
    H --> K["tableName"]
    H --> L["recordId"]
    H --> M["changes JSON"]
    H --> N["ipAddress"]
    H --> O["userAgent"]
    H --> P["timestamp"]
    
    I --> Q["✅ Auditoría Registrada"]
    J --> Q
    K --> Q
    L --> Q
    M --> Q
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R["Disponible para Reportes"]
    R --> S["Admin puede Ver Historial"]
    S --> T["Exportar Auditoría"]
```

---

## 11. FLUJO DE BACKUPS

```mermaid
graph TD
    A["⏰ Programación Diaria"] --> B["Iniciar Backup Automático"]
    B --> C["Conectar a BD"]
    C --> D["Exportar Todas las Tablas"]
    D --> E["Calcular Checksums"]
    E --> F["Comprimir Datos"]
    F --> G["Subir a S3"]
    G --> H["Guardar Metadatos"]
    H --> I["Status: Completed"]
    
    J["👤 Admin Solicita Backup Manual"] --> K["Crear Backup Manual"]
    K --> L["Nombre Personalizado"]
    L --> M["Iniciar Proceso"]
    M --> C
    
    I --> N["Verificar Integridad"]
    N --> O["Validar Checksums"]
    O --> P{¿Válido?}
    
    P -->|Sí| Q["Status: Verified"]
    P -->|No| R["Status: Failed"]
    
    Q --> S["Backup Listo para Restaurar"]
    R --> T["Notificar Admin"]
    
    S --> U{¿Necesita Restaurar?}
    U -->|Sí| V["Descargar desde S3"]
    V --> W["Restaurar BD"]
    W --> X["Verificar Integridad"]
    X --> Y["✅ Restauración Completada"]
    U -->|No| Z["Mantener en S3"]
```

---

## 12. FLUJO DE AUTENTICACIÓN

```mermaid
graph TD
    A["👤 Usuario Accede"] --> B["Redirigir a OAuth"]
    B --> C{¿Proveedor?}
    
    C -->|Apple| D["🍎 Apple OAuth"]
    C -->|Google| E["🔵 Google OAuth"]
    C -->|Email| F["📧 Email/Password"]
    
    D --> G["Obtener Token"]
    E --> G
    F --> H["Validar Credenciales"]
    H --> G
    
    G --> I["Buscar Usuario en BD"]
    I --> J{¿Existe?}
    
    J -->|No| K["Crear Usuario Nuevo"]
    K --> L["Asignar Rol: user"]
    L --> M["Guardar en BD"]
    J -->|Sí| N["Actualizar lastSignedIn"]
    
    M --> O["Generar JWT Token"]
    N --> O
    
    O --> P["Guardar en Cookie"]
    P --> Q["Crear Sesión"]
    Q --> R["Redirigir a Dashboard"]
    R --> S["✅ Autenticado"]
```

---

## 13. FLUJO DE BÚSQUEDA Y FILTROS

```mermaid
graph TD
    A["👤 Usuario Abre Listado"] --> B["Cargar Datos Iniciales"]
    B --> C["Mostrar Página 1"]
    C --> D["Usuario Aplica Filtro"]
    D --> E{¿Tipo de Filtro?}
    
    E -->|Búsqueda| F["Ingresar Texto"]
    E -->|Selector| G["Seleccionar Opción"]
    E -->|Rango Fecha| H["Seleccionar Fechas"]
    E -->|Estado| I["Seleccionar Estado"]
    
    F --> J["Ejecutar Query"]
    G --> J
    H --> J
    I --> J
    
    J --> K["Aplicar WHERE Conditions"]
    K --> L["Contar Total de Resultados"]
    L --> M["Paginar Resultados"]
    M --> N["Mostrar Página 1 Filtrada"]
    N --> O["Mostrar Total de Resultados"]
    O --> P["Usuario Navega Páginas"]
    P --> Q["Cargar Página Siguiente"]
    Q --> R["Mostrar Resultados"]
```

---

## 14. FLUJO DE EXPORTACIÓN

```mermaid
graph TD
    A["👤 Usuario en Listado"] --> B["Click Botón Exportar"]
    B --> C{¿Formato?}
    
    C -->|CSV| D["Generar CSV"]
    C -->|Excel| E["Generar Excel"]
    C -->|PDF| F["Generar PDF"]
    
    D --> G["Obtener Datos Filtrados"]
    E --> G
    F --> G
    
    G --> H["Aplicar Filtros Actuales"]
    H --> I["Incluir Todas las Columnas"]
    I --> J["Formatear Datos"]
    J --> K["Generar Archivo"]
    K --> L["Descargar"]
    L --> M["✅ Descargado"]
```

---

## 15. FLUJO DE IMPORTACIÓN

```mermaid
graph TD
    A["👤 Admin Abre Importar"] --> B["Seleccionar Archivo"]
    B --> C["Subir Archivo"]
    C --> D{¿Formato Válido?}
    
    D -->|No| E["❌ Error: Formato No Válido"]
    D -->|Sí| F["Leer Archivo"]
    
    F --> G["Parsear Datos"]
    G --> H["Validar Cada Fila"]
    H --> I{¿Datos Válidos?}
    
    I -->|No| J["Mostrar Errores"]
    J --> K["Permitir Corrección"]
    K --> B
    I -->|Sí| L["Confirmar Importación"]
    L --> M{¿Sobrescribir?}
    
    M -->|No| N["Insertar Nuevos Registros"]
    M -->|Sí| O["Actualizar Registros Existentes"]
    
    N --> P["Guardar en BD"]
    O --> P
    P --> Q["Registrar en Auditoría"]
    Q --> R["✅ Importación Completada"]
    R --> S["Mostrar Resumen"]
```

---

## 16. FLUJO DE PERMISOS

```mermaid
graph TD
    A["👤 Usuario Intenta Acción"] --> B["Verificar Rol"]
    B --> C{¿Rol Permitido?}
    
    C -->|No| D["❌ Acceso Denegado"]
    D --> E["Mostrar Mensaje de Error"]
    E --> F["Registrar Intento en Auditoría"]
    
    C -->|Sí| G["Verificar Permisos Específicos"]
    G --> H{¿Permiso?}
    
    H -->|No| I["❌ Acción No Permitida"]
    I --> E
    H -->|Sí| J["Ejecutar Acción"]
    J --> K["Registrar en Auditoría"]
    K --> L["✅ Acción Completada"]
```

---

## 17. FLUJO DE ERRORES

```mermaid
graph TD
    A["⚠️ Error en Sistema"] --> B{¿Tipo de Error?}
    
    B -->|Validación| C["Error de Entrada"]
    B -->|BD| D["Error de Base de Datos"]
    B -->|API| E["Error de API"]
    B -->|Sistema| F["Error del Sistema"]
    
    C --> G["Mostrar Mensaje Amigable"]
    D --> H["Registrar Error en Logs"]
    E --> H
    F --> H
    
    H --> I["Notificar a Admin"]
    I --> J["Mostrar Página de Error"]
    J --> K["Opción: Reintentar"]
    K --> L["Opción: Volver al Inicio"]
    L --> M["✅ Usuario Informado"]
```

---

## 18. FLUJO DE SINCRONIZACIÓN DE DATOS

```mermaid
graph TD
    A["🔄 Cambio en BD"] --> B["Trigger en Base de Datos"]
    B --> C["Notificar a Aplicación"]
    C --> D["Actualizar Caché"]
    D --> E["Invalidar Queries Relacionadas"]
    E --> F["Notificar a Clientes Conectados"]
    F --> G["Actualizar UI en Tiempo Real"]
    G --> H["✅ Sincronizado"]
```

---

## 19. FLUJO DE ALERTAS FINANCIERAS

```mermaid
graph TD
    A["📊 Sistema Monitorea"] --> B["Proyectos Entregados"]
    B --> C{¿Dinero Pendiente?}
    
    C -->|Sí| D["Calcular % Pendiente"]
    D --> E{¿Mayor que Umbral?}
    E -->|Sí| F["🚨 Alerta: Pendiente Alto"]
    E -->|No| G["✅ Normal"]
    
    F --> H["Crear Notificación"]
    H --> I["Enviar a Admin/Comercial"]
    I --> J["Registrar Alerta"]
    
    C -->|No| K["✅ Pagado Completamente"]
    
    L["📊 Calcular Tasa Cobranza"] --> M["Total Pagado / Total Proyectos"]
    M --> N{¿Menor que Umbral?}
    N -->|Sí| O["🚨 Alerta: Cobranza Baja"]
    N -->|No| P["✅ Normal"]
    
    O --> Q["Crear Notificación"]
    Q --> I
```

---

## 20. FLUJO GENERAL DE DATOS

```mermaid
graph LR
    A["👤 Cliente"] -->|Contacto| B["📋 Cliente"]
    B -->|Solicita| C["📝 Cotización"]
    C -->|Aprueba| D["🎯 Proyecto"]
    D -->|Adelanto| E["💰 Pago 1"]
    E -->|Diseño| F["🎨 Diseño"]
    F -->|Producción| G["🔧 Producción"]
    G -->|Gastos| H["💼 Gastos"]
    H -->|Saldo| I["💰 Pago 2"]
    I -->|Instalación| J["🚚 Instalación"]
    J -->|Entrega| K["✅ Proyecto Completado"]
    K -->|Cierre| L["📊 Cierre Contable"]
    L -->|Análisis| M["📈 Reportes"]
    
    B -->|Auditoría| N["🔐 Auditoría"]
    C -->|Auditoría| N
    D -->|Auditoría| N
    E -->|Auditoría| N
    F -->|Auditoría| N
    G -->|Auditoría| N
    H -->|Auditoría| N
    I -->|Auditoría| N
    J -->|Auditoría| N
    K -->|Auditoría| N
    L -->|Auditoría| N
    
    N -->|Backup| O["💾 Backup"]
    O -->|Restauración| P["🔄 Recuperación"]
```

---

# 📊 RESUMEN DE FLUJOS

| Flujo | Inicio | Fin | Pasos | Actores |
|-------|--------|-----|-------|---------|
| 1. General | Login | Dashboard | 7 | Usuario |
| 2. Cliente | Nuevo | Proyecto | 10 | Comercial |
| 3. Proyecto | Creación | Entrega | 15 | Múltiples |
| 4. Cotización | Creación | Aprobación | 20 | Comercial/Cliente |
| 5. Pagos | Adelanto | Cierre | 8 | Comercial/Admin |
| 6. Gastos | Registro | Cierre | 6 | Múltiples |
| 7. Cierre | Creación | Confirmación | 12 | Admin |
| 8. Tareas | Creación | Completación | 8 | Múltiples |
| 9. Notificaciones | Evento | Lectura | 7 | Usuario |
| 10. Auditoría | Acción | Registro | 5 | Sistema |
| 11. Backups | Programación | Verificación | 10 | Sistema |
| 12. Autenticación | Acceso | Sesión | 10 | Usuario |
| 13. Búsqueda | Filtro | Resultados | 6 | Usuario |
| 14. Exportación | Solicitud | Descarga | 7 | Usuario |
| 15. Importación | Archivo | Confirmación | 10 | Admin |
| 16. Permisos | Acción | Ejecución | 6 | Sistema |
| 17. Errores | Excepción | Resolución | 7 | Sistema |
| 18. Sincronización | Cambio | Actualización | 6 | Sistema |
| 19. Alertas | Monitoreo | Notificación | 8 | Sistema |
| 20. Datos | Cliente | Reportes | 12 | Múltiples |

---

## 🎯 PUNTOS CLAVE DEL FLUJO

### 1. **Entrada al Sistema**
- Autenticación OAuth (Apple, Google, Email)
- Asignación automática de rol
- Redirección a dashboard según rol

### 2. **Ciclo de Proyecto**
- Cliente → Cotización → Proyecto → Producción → Instalación → Cierre

### 3. **Flujos Paralelos**
- Diseño, Producción, Pagos ocurren simultáneamente
- Sistema genera tareas automáticas
- Recordatorios automáticos para vencimientos

### 4. **Control Financiero**
- Precio NETO = Original - Descuentos + Recargos
- Gastos asociados a proyectos
- Cierre contable con auditoría completa

### 5. **Seguridad**
- Auditoría de todas las acciones
- Backups automáticos diarios
- Verificación de integridad
- Permisos granulares por rol

### 6. **Notificaciones**
- Push automático
- Email
- WhatsApp
- En-app

### 7. **Reportes**
- Exportación a CSV/Excel/PDF
- Análisis financiero
- Tendencias
- Comparativas

---

**Diagrama Generado**: Abril 2026
**Versión**: 1.0
**Aplicación**: INNOVAR Cocinas Integrales
