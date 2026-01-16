# InnovarCitas - Lista de Tareas

## Completadas
- [x] Hacer que campos "Forma de la cocina" y "Tipo de mesón" solo se muestren cuando tipo de trabajo = "Cocina Integral"
- [x] Cambiar nombre de PWA a "InnovarCitas"
- [x] Regenerar iconos PWA con logotipo más grande
- [x] Cambiar campo "Medidas específicas" a dos campos numéricos: Largo lineal y Alto
- [x] Implementar validación de disponibilidad horaria para evitar citas duplicadas en la misma hora
- [x] Auto-llenar datos de usuario registrado en formularios (nombre, email, teléfono, dirección)
- [x] Corregir error de query undefined en clients.getMyProfile
- [x] Restaurar rol super_admin para usuario mcfy8jgnym@privaterelay.appleid.com
- [x] Diagnosticar y corregir problema de carga de rol super_admin en sesión
- [x] Verificar por qué el usuario sigue sin permisos de super_admin después del fix
- [x] Implementar autenticación con email y contraseña para crear usuarios con credenciales compartibles
- [x] Corregir campo de contraseña que no aparece en formulario de crear usuario
- [x] Diagnosticar por qué el sistema no reconoce al usuario como super_admin en el contexto de autenticación
- [x] Corregir problema de acceso al Panel Admin (condición solo verificaba "admin", no "super_admin")
- [x] Limpiar usuarios de prueba de la base de datos (68 usuarios eliminados)

## Pendientes
- [x] Eliminar console.log de debug del código
- [x] Revisar y ajustar diseño responsive para móviles (320px-767px)
- [x] Revisar y ajustar diseño responsive para tablets/iPads (768px-1024px)
- [x] Ejecutar tests completos y verificar que todos pasen (69/69 tests pasaron)

## Módulo de Gestión de Proyectos

### Base de datos y roles
- [x] Agregar nuevos roles: diseñador, jefe_taller, operario
- [x] Crear tabla de proyectos con estados (pendiente, aprobado_diseño, en_diseño, pendiente_cliente, corte, enchape, ensamble, listo_instalacion, entregado)
- [x] Crear tabla de fotos de proyecto (por etapa)
- [x] Crear tabla de detalles del proyecto (medidas especiales, notas importantes)
- [x] Crear tabla de tareas con asignación y permisos

### Backend (tRPC)
- [x] Procedimientos CRUD para proyectos
- [x] Procedimientos para cambio de estado de proyecto
- [x] Procedimientos para subir fotos por etapa
- [x] Procedimientos para detalles del proyecto
- [x] Procedimientos CRUD para tareas
- [x] Lógica de permisos de asignación de tareas por rol

### Panel Admin - Gestión de Proyectos
- [x] Vista de lista de proyectos con filtros por estado
- [x] Formulario de creación de proyecto (medidas, fotos iniciales)
- [x] Vista detalle de proyecto con todas las etapas
- [x] Botones para cambiar estado del proyecto
- [x] Sección de subida de fotos por etapa

### Sistema de Tareas
- [x] Vista de "Mis tareas pendientes" para todos los roles
- [x] Formulario de creación de tarea (descripción, asignado, proyecto, fecha límite, prioridad)
- [x] Lógica de permisos: quién puede asignar a quién
- [x] Marcar tareas como completadas

### Portal del Cliente
- [x] Vista de seguimiento de proyecto con estado actual
- [x] Galería de fotos por etapa de producción
- [x] Botón aprobar/rechazar diseño 3D
- [x] Timeline visual del progreso (barra de progreso)

### Vistas por Rol
- [x] Vista Diseñador: proyectos aprobados para diseño, subir diseños 3D
- [x] Vista Jefe de Taller: supervisión de producción, subir fotos, gestionar operarios
- [x] Vista Operario: proyectos en producción, subir fotos de avance

### Mejoras adicionales
- [x] Permitir que Super Admin y Admin/Comercial aprueben diseño en nombre del cliente

## Subida Directa de Fotos

### Backend
- [x] Crear endpoint de subida de archivos a S3
- [x] Validar tipos de archivo (solo imágenes)
- [x] Limitar tamaño máximo de archivo (10MB)

### Frontend
- [x] Crear componente PhotoUploader con vista previa
- [x] Implementar compresión de imágenes en el cliente
- [x] Agregar indicador de progreso de subida
- [x] Soporte para múltiples fotos

### Integración
- [x] Integrar en página de Proyectos (para todos los roles de trabajo)
- [x] Integrar en Portal del Cliente (para fotos de referencia)

## PWA y Notificaciones Push

### Configuración PWA
- [x] Crear manifest.json con iconos y configuración (ya existía)
- [x] Implementar service worker para cache y offline (actualizado con push)
- [x] Agregar prompt de instalación de la app (NotificationBell solicita permiso)

### Notificaciones Push
- [x] Configurar Web Push API
- [x] Crear endpoint para registrar suscripciones
- [x] Implementar envío de notificaciones desde el servidor
- [x] Agregar badge con contador de notificaciones

## Galería con Zoom

- [x] Crear componente ImageViewer con zoom
- [x] Implementar navegación entre fotos (anterior/siguiente)
- [x] Agregar gestos táctiles para zoom en móviles
- [x] Integrar en página de Proyectos y Portal del Cliente

## Exportar Proyecto a PDF

- [x] Crear endpoint para generar HTML del proyecto
- [x] Incluir información del proyecto, cliente y estado
- [x] Incluir fotos de cada etapa
- [x] Incluir timeline de cambios de estado
- [x] Agregar botón de descarga en la interfaz

## Notificaciones por WhatsApp

### Servicio de Mensajes
- [x] Crear plantillas de mensaje para cada estado del proyecto
- [x] Generar enlaces de WhatsApp con mensaje pre-escrito
- [x] Incluir enlace al portal del cliente en los mensajes

### Integración
- [x] Enviar WhatsApp automático al cambiar estado del proyecto
- [x] Agregar botón para enviar WhatsApp manual desde el detalle del proyecto
- [x] Opción de personalizar mensaje antes de enviar

### Plantillas de Mensajes
- [x] Mensaje de bienvenida (proyecto creado)
- [x] Mensaje de diseño listo para aprobación
- [x] Mensaje de inicio de producción (corte, enchape, ensamble)
- [x] Mensaje de proyecto listo para instalación
- [x] Mensaje de proyecto entregado

## Ruta INNOVAR - Flujo Completo

### Base de Datos
- [x] Agregar estados de cotización (enviada, aprobada, rechazada)
- [x] Agregar campo de fecha de adelanto recibido
- [x] Agregar campo de fecha de aprobación final del diseño
- [x] Agregar campo de fecha estimada de instalación (25 días hábiles)
- [x] Crear tabla de festivos colombianos

### Cálculo de Días Hábiles
- [x] Implementar función para calcular días hábiles (sin sáb, dom, festivos)
- [x] Cargar festivos colombianos 2024-2026
- [x] Calcular automáticamente fecha de entrega (25 días hábiles desde aprobación)

### Sistema de Recordatorios
- [x] Recordatorio: Cotización sin respuesta (2 días) → Comercial
- [x] Recordatorio: Adelanto recibido, diseño pendiente (3 días) → Diseñador
- [x] Recordatorio: Diseño sin aprobar (5 días) → Comercial
- [x] Recordatorio: Producción retrasada (20 días) → Jefe Taller
- [x] Recordatorio: Instalación próxima (3 días antes) → Jefe Taller
### Calendario de Instalaciones
- [x] Vista de calendario mensual con instalaciones programadas
- [x] Evitar cruces de instalaciones en el mismo día (alerta visual)
- [x] Mostrar disponibilidad (L-V completo, Sáb medio día, Dom/Festivos no)
- [x] Programar instalación desde el detalle del proyecto (vía calendario)

### Interfaz de Usuario
- [x] Actualizar flujo de estados del proyecto según Ruta INNOVAR
- [x] Mostrar fecha estimada de entrega en el proyecto
- [x] Panel de recordatorios pendientes para cada rol
- [x] Vista de timeline del proyecto con fechas clave (Card "Fechas del Proyecto")
## Simplificación de Autenticación

- [x] Eliminar paso de verificación por código de email
- [x] Permitir inicio de sesión directo con email y contraseña
- [x] Crear página de login con email/contraseña (/login)
- [x] Implementar endpoint loginWithPassword en tRPC
- [x] Verificar sesión funciona correctamente con usuarios con contraseña
- [x] Martha Serna (martha79s@hotmail.com) puede iniciar sesión exitosamente

## Optimización Responsive

### Análisis y mejoras generales
- [x] Revisar y optimizar navegación principal para móviles (menú hamburguesa)
- [x] Optimizar Home page para todos los dispositivos
- [x] Optimizar página de Proyectos para móviles y tablets
- [x] Optimizar Portal del Cliente para todos los dispositivos
- [x] Optimizar Panel Admin para tablets y móviles
- [x] Optimizar página de Tareas para todos los dispositivos
- [x] Optimizar Calendario de Instalaciones para móviles y tablets
- [x] Optimizar página de Login
- [x] Verificar formularios en todos los tamaños de pantalla
- [x] Pruebas finales en móvil, tablet y desktop

## Registro de Clientes y Recuperación de Contraseña

### Problema de Registro
- [x] Corregir flujo de registro para clientes nuevos (actualmente asume que ya están registrados)
- [x] Crear página de registro separada para nuevos usuarios (/register)
- [x] Implementar endpoint de registro con email y contraseña (auth.register)
- [x] Crear registro de cliente asociado automáticamente al registrarse
- [x] Validación de contraseña en tiempo real (mayúscula, minúscula, número, 8+ caracteres)

### Olvidé mi Contraseña
- [x] Crear página de recuperación de contraseña (/forgot-password)
- [x] Implementar endpoint para solicitar recuperación (auth.requestPasswordReset)
- [x] Implementar endpoint para restablecer contraseña con token (auth.resetPassword)
- [x] Crear página para restablecer contraseña (/reset-password)
- [x] Enviar enlace de recuperación por WhatsApp
- [x] Agregar enlace "Olvidé mi contraseña" en página de login
- [x] Tests para registro y recuperación (11 tests pasando)

## Fecha Estimada de Entrega y Panel de Recordatorios

### Fecha Estimada de Entrega en Proyectos
- [x] Verificar que el campo estimatedInstallDate existe en el schema de proyectos
- [x] Mostrar fecha estimada en la vista de proyectos para clientes (Portal.tsx)
- [x] Mostrar fecha estimada en la lista de proyectos (Projects.tsx)
- [x] Mostrar fecha estimada en el detalle del proyecto (Card "Fechas del Proyecto")
- [x] Mostrar indicador visual si la fecha está próxima (amarillo) o vencida (rojo)
- [x] Mostrar fecha de instalación programada (azul)
- [x] Mostrar fecha de entrega cuando el proyecto está completado (verde)

### Panel de Recordatorios Pendientes
- [x] Crear endpoint reminders.getMyReminders para obtener recordatorios del usuario
- [x] Crear endpoint reminders.complete para marcar como completado
- [x] Crear endpoint reminders.getSummary para resumen de recordatorios
- [x] Crear componente RemindersPanel con vista compacta y expandida
- [x] Filtrar recordatorios según el rol del usuario (asignados a cada usuario)
- [x] Mostrar panel en Panel Admin
- [x] Mostrar panel en página de Tareas (modo compacto)
- [x] Indicadores visuales para recordatorios vencidos (rojo, animación)
- [x] Botón de WhatsApp para contactar cliente desde recordatorio
- [x] Enlace directo al proyecto desde recordatorio
- [x] Tests para el router de recordatorios (12 tests pasando)


## Recordatorios Automáticos y Edición de Fechas

### Recordatorios Automáticos
- [x] Verificar que createRemindersForStatusChange se llama al cambiar estado
- [x] Probar flujo completo: cotización → adelanto → diseño → producción → instalación (13 tests)
- [x] Verificar que los recordatorios se cancelan al avanzar de estado
- [x] Confirmar que cada rol recibe sus recordatorios correspondientes:
  - cotizacion_sin_respuesta: 2 días hábiles → admin/comercial
  - diseno_pendiente: 3 días hábiles → diseñador
  - aprobacion_pendiente: 5 días hábiles → admin/comercial
  - produccion_retrasada: 20 días hábiles → jefe_taller
  - instalacion_proxima: 3 días antes → jefe_taller

### Edición de Fecha Estimada
- [x] Agregar botón de editar fecha (lápiz) en Card "Fechas del Proyecto"
- [x] Crear endpoint projects.updateEstimatedDate
- [x] Permitir solo a admin/super_admin/jefe_taller editar la fecha
- [x] Mostrar selector de fecha con calendario y campo de motivo opcional
- [x] Registrar cambios en el historial del proyecto
- [x] Actualizar la vista después de guardar
- [x] Tests para permisos y actualización (11 tests)

## Corrección del Logo

- [x] Revisar configuración actual del logo en la aplicación
- [x] Corregir iconos de la PWA (icon-192.png, icon-512.png, favicon.png)
- [x] Usar el símbolo completo de la N de INNOVAR con márgenes reducidos
- [x] Los usuarios con la app instalada recibirán la actualización automáticamente


## Soporte para Archivos PDF

- [x] Agregar soporte para subir archivos PDF además de imágenes
- [x] Permitir visualización de PDFs subidos (icono de PDF en preview)
- [x] Actualizar validación de tipos de archivo (image/* y application/pdf)
- [x] Actualizar texto de ayuda en el uploader
- [x] PDFs se suben sin compresión (solo imágenes se comprimen)


## Bug: Error al subir PDFs

- [x] Identificar causa del error en subida de PDFs (validación de contentType solo permitía image/*)
- [x] Corregir validación en el backend (ahora acepta image/* y application/pdf)
- [x] Corregir regex de base64 para PDFs (ahora usa /^data:[^;]+;base64,/ en lugar de /^data:image\/\w+;base64,/)
- [ ] Verificar que PDFs se suben correctamente (pendiente prueba del usuario)


## Visor Integrado de PDF y JPG

- [x] Crear componente FileViewer para visualizar PDFs y JPG
- [x] Implementar visor de imágenes con zoom, rotación y navegación
- [x] Implementar visor de PDF embebido usando iframe
- [x] Integrar visor en la galería de fotos del proyecto
- [x] Permitir abrir archivos en pantalla completa
- [x] Mostrar icono de PDF en miniaturas de la galería
- [x] Soporte para gestos táctiles (swipe, pinch-to-zoom)
- [x] Botón de descarga para todos los archivos


## Bug: Gestos táctiles no funcionan en iPad/móvil

- [x] Corregir pinch-to-zoom en iPad y teléfono
- [x] Agregar botones de zoom flotantes visibles en móviles (barra inferior)
- [x] Mejorar controles táctiles para dispositivos touch
- [x] Agregar botón de resetear vista
- [x] Agregar indicador de instrucciones ("Pellizca para zoom")
- [x] Toggle de controles al tocar la pantalla
- [x] Prevenir zoom nativo del navegador en el visor


## Bug: Pinch-to-zoom no funciona en iPad

- [x] Investigar compatibilidad de touch events en Safari iOS/iPadOS
- [x] Implementar solución usando @use-gesture/react (compatible con iOS y Android)
- [x] Pinch-to-zoom funcional en dispositivos táctiles
- [x] Doble tap para zoom rápido (2x) o resetear
- [x] Swipe horizontal para cambiar de imagen
- [x] Botones flotantes grandes para móviles
- [ ] Probar en iPad y Android real (pendiente usuario)


## Bug: PDFs no se pueden ampliar en iPad

- [x] Investigar opciones para zoom de PDF en dispositivos táctiles
- [x] Implementar visor de PDF con react-pdf (renderiza como canvas)
- [x] Zoom táctil funcional con pinch-to-zoom en PDFs
- [x] Navegación entre páginas del PDF con botones
- [x] Doble tap para zoom rápido en PDFs
- [ ] Probar en iPad (pendiente usuario)


## Bug: PDF no carga en el visor

- [x] Diagnosticar error de carga de PDF con react-pdf (CSS imports fallaban)
- [x] Implementar solución alternativa usando object tag nativo del navegador
- [x] Agregar zoom con gestos táctiles al contenedor del PDF
- [x] Agregar botón "Abrir PDF" para abrir en nueva pestaña (mejor experiencia en iOS)
- [x] Agregar botón de descarga
- [ ] Verificar que funciona en iPad (pendiente usuario)


## Categorías de Archivos

- [ ] Definir categorías: Medidas, Diseños, Fotos de Avance, Documentos, Otros
- [ ] Agregar campo de categoría al schema de project_photos
- [ ] Actualizar endpoint de upload para incluir categoría
- [ ] Agregar selector de categoría al subir archivos
- [ ] Implementar filtros por categoría en la galería
- [ ] Mostrar archivos agrupados por categoría


## Categorías de Archivos

### Backend
- [x] Agregar campo category al schema de projectPhotos (medidas, disenos, avance, materiales, instalacion, entrega, otros)
- [x] Ejecutar migración de base de datos (pnpm db:push)
- [x] Agregar endpoint getProjectPhotosByCategory en db.ts
- [x] Actualizar endpoint projectPhotos.upload para aceptar categoría
- [x] Agregar endpoint projectPhotos.getByCategory

### Frontend
- [x] Agregar selector de categoría en diálogo de subir fotos (Projects.tsx)
- [x] Agregar filtro por categoría en galería de fotos
- [x] Mostrar badge de categoría en cada foto de la galería
- [x] Actualizar Portal.tsx para enviar categoría por defecto


## Corrección de Errores

### Error en Creación de Tareas
- [x] Investigar error al crear nueva tarea en sección Tareas
- [x] Corregir el error identificado (SelectItem con value="" cambiado a value="none")
- [x] Verificar que la creación de tareas funciona correctamente

### Creación de Usuarios de Trabajo
- [x] Crear usuario Jefe de Taller (Luis Cardoso)
- [x] Crear usuario Operario (Daniel Beltran)

### Vista de Supervisión de Tareas
- [x] Agregar endpoint para obtener todas las tareas (super_admin y admin)
- [x] Modificar interfaz de Tareas con vista de supervisión
- [x] Agregar filtro por usuario asignado
- [x] Mostrar estadísticas por usuario

### Filtro de Usuarios Asignables
- [x] Modificar getAssignableUsers para mostrar solo equipo de trabajo (comercial, diseñador, jefe_taller, operario)

### Rol Comercial
- [x] Agregar rol comercial al schema
- [x] Actualizar permisos para incluir comercial
- [x] Cambiar rol de Martha Serna a comercial
- [x] Incluir comercial en usuarios asignables

### Sistema de Notificaciones de Tareas
- [x] Verificar tabla de notificaciones existente
- [x] Crear endpoint para obtener notificaciones del usuario (ya existía)
- [x] Modificar creación de tareas para generar notificación
- [x] Agregar indicador de notificaciones no leídas en la interfaz
- [x] Implementar panel de notificaciones con opción de marcar como leídas
- [x] Agregar navegación a tareas al hacer clic en notificación

### Corrección Selector Asignar a
- [x] Agregar rol diseñador al selector de usuarios asignables en Tareas (cambiado rol de Alejo a disenador)

- [x] Agregar super_admin a la lista de usuarios asignables

### Mejora de Acceso para Clientes
- [x] Agregar enlace "Inscríbete" debajo del botón "Iniciar Sesión" en página principal

### Limpieza de Usuarios de Prueba
- [x] Identificar usuarios super_admin de prueba (27 encontrados)
- [x] Eliminar usuarios super_admin excepto Alvaro Rios
- [x] Eliminar usuario duplicado de Martha

### Mejora Acceso Móvil
- [x] Mostrar botones Inscríbete e Iniciar Sesión visibles en header móvil (sin menú hamburguesa)

### Cambio de Contraseña desde Panel Admin
- [x] Crear endpoint para resetear contraseña (solo super_admin)
- [x] Agregar botón "Cambiar contraseña" en sección Usuarios
- [x] Mostrar contraseña temporal generada una sola vez

## Reestructuración Sección Fotos/Archivos

### Fase 1: Schema de Base de Datos
- [x] Agregar campo subcategory a projectPhotos
- [x] Crear tabla hardwareCatalog para catálogo de herrajes
- [x] Crear tabla projectMaterials para materiales de cada proyecto
- [x] Crear tabla projectHardwareSelections para herrajes seleccionados

### Fase 2: Catálogo de Herrajes
- [x] Crear endpoints CRUD para catálogo de herrajes
- [x] Crear panel admin para gestionar catálogo de herrajes
- [x] Implementar subida de fotos para cada herraje
- [x] Actualizar visualización en pestaña Materiales con fotos de herrajes
- [x] Permitir ver foto ampliada al hacer clic en herraje
- [x] Poblar catálogo inicial con herrajes de cocinas, closets y puertas (21 herrajes)
- [ ] Subir fotos fijas de herrajes (Cocinas, Closets, Puertas)

### Fase 3: Formulario de Materiales
- [x] Crear componente MaterialsForm (Madera, Mesón, Lavaplatos)
- [x] Crear componente HardwareSelector con checkboxes visuales
- [x] Integrar componentes en página de proyectos
- [x] Agregar pestaña Materiales en detalle de proyecto
- [ ] Implementar selector de herrajes con catálogo visual
- [ ] Guardar selecciones de materiales por proyecto

### Fase 4: Interfaz de Fotos con Subcategorías
- [x] Actualizar formulario de subida con subcategorías dinámicas por categoría
- [x] Actualizar galería para mostrar y filtrar por subcategorías
- [x] Implementar subcategorías: Cotización(1), Medidas(2), Diseños(3), Avance(3), Instalación(1), Entrega(1)
- [x] Actualizar categorías: Cotización, Medidas, Diseños, Avance, Instalación, Entrega
- [x] Agregar subcategorías: Medidas(Fotos Iniciales, Dibujo), Diseños(Renders, Despieces, Detalles), Avance(Corte, Enchape, Armado)
- [x] Actualizar filtros y galería

### Fase 5: Vista Cliente
- [x] Agregar sección Materiales en portal del cliente (expandible)
- [x] Mostrar materiales base (Madera, Mesón, Lavaplatos) en modo lectura
- [x] Mostrar herrajes seleccionados con fotos en modo lectura
- [x] Permitir ver foto ampliada al hacer clic en herraje


## Bug Fixes
- [x] Corregir error FORBIDDEN en página /admin para super_admin (quotations.list, appointments.updateStatus, advisory.updateStatus, quotations.send)

- [x] Corregir letra de nombres en fotos de herrajes para que se vea bien centrada
