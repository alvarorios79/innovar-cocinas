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

- [x] Filtrar subcategorías en sección Fotos según la categoría seleccionada

- [x] Filtrar carpetas de etapas según la categoría seleccionada en Fotos

- [x] Corregir mapeo de categorías a carpetas en Fotos (Cotización→Documento, Medidas→Fotos Iniciales+Dibujo, Diseños→Renders+Despieces+Detalles, Instalación→Proceso)

- [x] Implementar permisos de subida de fotos por rol y carpeta
- [x] Implementar permisos de visualización de fotos por rol y carpeta

- [x] Crear paleta de colores corporativos basada en verde turquesa
- [x] Mejorar diseño responsivo para móvil, tablet y escritorio
- [x] Corregir textos que se sobreponen en diferentes pantallas

## Bug Fixes - Enero 16
- [x] Corregir subida de fotos en Materiales (usar S3 en lugar de Base64)
- [x] Agregar indicador de carga mientras se sube la foto

- [ ] Corregir error de disponibilidad de horarios en calendario de citas (todos aparecen ocupados)


## Bug Fixes - Enero 18
- [x] Corregir error de disponibilidad de horarios en calendario de citas (problema de zona horaria UTC vs Colombia)
- [x] Mejorar visualización del calendario: días disponibles en verde, no disponibles en rojo
- [x] Corregir envío de fecha y hora como strings separados para evitar problemas de zona horaria

- [x] Bloquear visualmente los horarios ocupados para que no se puedan seleccionar (ya estaba implementado)
- [ ] Permitir seleccionar múltiples tipos de trabajo en el formulario de citas

## Selección Múltiple para Eliminación Masiva

- [x] Agregar checkboxes individuales en tabla de citas (Admin.tsx)
- [x] Agregar checkbox "Seleccionar todo" en tabla de citas
- [x] Agregar botón de eliminación masiva para citas
- [x] Agregar checkboxes individuales en tabla de asesoramientos (Admin.tsx)
- [x] Agregar checkbox "Seleccionar todo" en tabla de asesoramientos
- [x] Agregar botón de eliminación masiva para asesoramientos
- [x] Agregar checkboxes individuales en tabla de cotizaciones (Admin.tsx)
- [x] Agregar checkbox "Seleccionar todo" en tabla de cotizaciones
- [x] Agregar botón de eliminación masiva para cotizaciones
- [x] Usar endpoints existentes para eliminación (no se necesitan nuevos endpoints)
- [x] Agregar confirmación antes de eliminar múltiples registros
- [x] Escribir tests para eliminación masiva de citas
- [x] Escribir tests para eliminación masiva de asesoramientos
- [x] Escribir tests para eliminación masiva de cotizaciones

## Selección Múltiple en Tareas

- [x] Agregar estados para selección múltiple en Tasks.tsx
- [x] Agregar funciones helper para manejar selección múltiple
- [x] Agregar checkboxes individuales en tabla de tareas
- [x] Agregar checkbox "Seleccionar todo" en tabla de tareas
- [x] Agregar botón de eliminación masiva para tareas
- [x] Agregar confirmación antes de eliminar múltiples tareas
- [x] Escribir tests para eliminación masiva de tareas

## Limpieza de Datos de Prueba

- [x] Consultar usuarios existentes en la base de datos
- [x] Identificar usuarios de prueba vs usuarios reales
- [x] Eliminar usuarios de prueba manteniendo usuarios de la aplicación
- [x] Consultar clientes existentes en la base de datos
- [x] Identificar clientes de prueba vs clientes reales
- [x] Eliminar clientes de prueba manteniendo clientes reales
- [x] Verificar que los datos reales se mantuvieron correctamente

## Restauración de Roles de Usuario

- [x] Consultar usuarios actuales para verificar el estado
- [x] Verificar si los usuarios con emails específicos aún existen
- [x] Restaurar o actualizar rol de diseñador (alejoile300@gmail.com)
- [x] Restaurar o actualizar rol de comercial (martha79s@hotmail.com)
- [x] Identificar o crear usuario para jefe de taller (no existen, deben crearse desde Panel Admin)
- [x] Identificar o crear usuario para operario (no existen, deben crearse desde Panel Admin)
- [x] Verificar que todos los roles del equipo estén correctos

## Creación de Usuario Jefe de Taller

- [x] Crear usuario Luis Cardoso con email jefe.taller@innovar.temp
- [x] Asignar rol jefe_taller
- [x] Configurar contraseña Innovar2024*
- [x] Verificar que el usuario se creó correctamente

## Creación de Usuario Operario y Visualización de Roles

- [x] Crear usuario Daniel Beltran con email operario@innovar.temp
- [x] Asignar rol operario
- [x] Configurar contraseña Innovar2024*
- [x] Verificar que el usuario se creó correctamente
- [x] Verificar que todos los roles aparezcan en la interfaz de Gestión de Usuarios

## Reorganización y Limpieza de Usuarios

- [x] Modificar interfaz para agrupar equipo de trabajo arriba
- [x] Agregar separador visual entre equipo y usuarios normales
- [x] Cambiar color morado del diseñador por cyan
- [x] Consultar usuarios de prueba innecesarios
- [x] Eliminar usuarios de prueba manteniendo solo equipo real y clientes registrados (albetan1530@gmail.com)
- [x] Verificar que la lista se muestra correctamente organizada

## Selección Múltiple para Eliminación de Usuarios

- [x] Agregar estados para selección múltiple de usuarios
- [x] Agregar checkbox "Seleccionar todos" en sección de Equipo de Trabajo
- [x] Agregar checkbox "Seleccionar todos" en sección de Usuarios Registrados
- [x] Agregar checkboxes individuales para cada usuario
- [x] Agregar botón de eliminación masiva
- [x] Agregar confirmación antes de eliminar múltiples usuarios

## Botón Mostrar/Ocultar Contraseña en Crear Usuario

- [x] Agregar estado para controlar visibilidad de contraseña
- [x] Agregar botón de ojo en campo de contraseña del formulario
- [x] Implementar toggle entre tipo "password" y "text"

## Corrección de Conversión de Zona Horaria en Citas

- [x] Investigar código del formulario de agendar cita (Home.tsx)
- [x] Investigar código de visualización en Panel Admin (Admin.tsx)
- [x] Identificar dónde ocurre la conversión incorrecta de zona horaria
- [x] Corregir la conversión para que se guarde y muestre correctamente
- [x] Probar creando una cita con horario específico (ej: 8:00 AM)
- [x] Verificar que el horario se muestre igual en Panel Admin

## Establecer Contraseña para Super Admin

- [x] Generar hash de contraseña Innovar2026*
- [x] Actualizar usuario mcfy8jgnym@privaterelay.appleid.com con nueva contraseña
- [x] Verificar que el usuario puede acceder con la nueva contraseña

## Corrección de Visualización en Portal del Cliente

- [x] Investigar por qué las citas creadas no aparecen en el portal del usuario
- [x] Verificar la consulta que trae las citas del usuario actual
- [x] Corregir la lógica de asociación entre usuario y cliente
- [x] Implementar visualización de proyectos en portal del cliente (ya existía)
- [x] Implementar visualización de cotizaciones en portal del cliente (ya existía)
- [x] Implementar visualización de estimados previos en portal del cliente (ya existía)
- [ ] Probar creando una cita como usuario y verificar que aparece en portal
- [ ] Verificar que todos los datos (citas, proyectos, cotizaciones, estimados) se muestran correctamente

## Corrección de Asociación Cliente-Usuario

- [x] Diagnosticar problema: citas creadas por usuarios autenticados no aparecen en su portal
- [x] Implementar asociación automática de cliente con userId al crear cita desde Home.tsx
- [x] Modificar getOrCreateByWhatsApp para asociar cliente con usuario autenticado
- [x] Agregar función updateClient en db.ts para actualizar cliente existente
- [x] Implementar lógica: si cliente existe sin userId, asociarlo al usuario autenticado
- [x] Crear tests completos para verificar asociación cliente-usuario (3 tests pasando)
- [x] Verificar que getMyAppointments muestra citas del usuario correctamente
- [x] Verificar que getMyProjects muestra proyectos del usuario correctamente
- [x] Verificar que getMyQuotations muestra cotizaciones del usuario correctamente
- [x] Verificar que getMyEstimates muestra estimados del usuario correctamente
- [x] Todos los tests del proyecto pasando (266 tests)

## Problema Reportado: Cita no aparece en portal de Alvaro Pruebas

- [x] Investigar por qué la cita creada por Alvaro Pruebas aparece en Panel Admin pero no en su portal personal
- [x] Verificar datos del usuario Alvaro Pruebas en la base de datos
- [x] Verificar cliente asociado al usuario Alvaro Pruebas
- [x] Verificar la cita creada y su relación con el cliente
- [x] Diagnosticar por qué getMyAppointments no devuelve la cita
- [x] Confirmar que el backend devuelve la cita correctamente
- [x] Verificar que el código de asociación cliente-usuario funciona correctamente

## Sistema de Notificaciones por Email

### Fase 1: Configuración Base
- [x] Investigar servicios de email disponibles (Resend, SendGrid, AWS SES, Mailgun)
- [x] Seleccionar servicio de email más adecuado para el proyecto (Resend)
- [ ] Crear cuenta y obtener API key del servicio seleccionado (requiere acción del usuario)
- [x] Configurar variables de entorno para el servicio de email (RESEND_API_KEY, EMAIL_FROM)
- [x] Crear módulo base de envío de emails (server/email.ts)
- [x] Implementar función sendEmail con manejo de errores y reintentos
- [x] Crear plantilla base HTML para emails con branding de INNOVAR

### Fase 2: Plantillas de Email
- [x] Crear plantilla de bienvenida para nuevos usuarios registrados
- [x] Crear plantilla de notificación de nueva tarea asignada
- [x] Crear plantilla de recordatorio de tarea próxima a vencer
- [x] Crear plantilla de cambio de estado de proyecto
- [x] Crear plantilla de cotización enviada
- [x] Crear plantilla de diseño listo para aprobación
- [x] Crear plantilla de proyecto listo para instalación
- [x] Crear plantilla de cita confirmada/reagendada
- [x] Crear plantilla de recordatorio de cita (24h antes)
- [ ] Crear plantilla de recuperación de contraseña (pendiente)

### Fase 3: Integración con Sistema Existente
- [ ] Integrar email en sistema de notificaciones (cuando se crea notificación) (pendiente)
- [x] Integrar email en sistema de tareas (cuando se asigna tarea)
- [ ] Integrar email en sistema de recordatorios (recordatorios vencidos) (pendiente)
- [ ] Integrar email en cambios de estado de proyecto (pendiente)
- [ ] Integrar email en envío de cotizaciones (pendiente)
- [x] Integrar email en confirmación de citas
- [ ] Agregar preferencias de notificación por email en perfil de usuario (pendiente)

### Fase 4: Registro Automático al Crear Cita
- [ ] Hacer campo email obligatorio en formulario de cita (Home.tsx) (pendiente - email ya es requerido en backend)
- [x] Modificar endpoint appointments.create para crear usuario automáticamente
- [x] Generar contraseña temporal aleatoria segura
- [x] Crear usuario con email y contraseña temporal
- [x] Asociar cliente con usuario recién creado
- [x] Enviar email de bienvenida con credenciales y enlace al portal
- [ ] Agregar opción "Cambiar contraseña" en perfil de usuario (pendiente)
- [ ] Forzar cambio de contraseña en primer login (opcional) (pendiente)

### Fase 5: Testing y Validación
- [x] Crear tests para módulo de envío de emails
- [x] Crear tests para registro automático de usuarios (3 tests pasando)
- [ ] Verificar que todos los emails se envían correctamente (requiere RESEND_API_KEY)
- [x] Verificar que las plantillas se renderizan correctamente
- [x] Probar flujo completo de registro automático al crear cita
- [ ] Verificar que usuario puede iniciar sesión con credenciales enviadas (requiere prueba manual)
- [ ] Verificar que todas las notificaciones llegan por email (requiere RESEND_API_KEY)

### Fase 6: Documentación
- [ ] Documentar configuración del servicio de email
- [ ] Documentar plantillas de email disponibles
- [ ] Documentar flujo de registro automático
- [ ] Actualizar README con instrucciones de configuración de email

## Sistema de Cotizaciones

### Base de Datos
- [x] Crear tabla quotations (id, quotationNumber, clientId, vendorName, workType, status, validUntil, createdAt, updatedAt)
- [x] Crear tabla quotation_items (id, quotationId, itemNumber, description, quantity, unitPrice, totalPrice)
- [x] Configurar numeración automática iniciando en COT-2026-620

### Backend (tRPC)
- [x] Crear endpoints CRUD para cotizaciones (create, update, delete, getAll, getById)
- [x] Crear endpoint para generar PDF de cotización
- [x] Crear endpoint para enviar cotización por email con PDF adjunto
- [x] Crear endpoint para cambiar estado de cotización (draft, sent, approved, rejected)
- [x] Implementar permisos: solo super_admin y admin pueden acceder

### Generación de PDF
- [x] Copiar logo oficial a directorio del proyecto
- [x] Crear módulo Python para generación de PDF con diseño aprobado
- [x] Integrar datos dinámicos de la base de datos
- [x] Implementar formato de moneda colombiana ($15.435.000)
- [x] Incluir todos los términos y condiciones

### Frontend - Panel Admin
- [x] Crear nueva pestaña "Cotizaciones" en Panel Admin (solo visible para super_admin y admin)
- [x] Crear página de lista de cotizaciones con filtros por estado
- [x] Crear formulario de nueva cotización con:
  - Select de cliente
  - Select de vendedor (Alvaro Gutierrez / Martha Serna)
  - Input de trabajo (texto libre)
  - Items dinámicos (agregar/eliminar)
- [x] Implementar botones: Guardar Borrador, Generar PDF, Enviar por Email
- [ ] Crear vista de detalle/edición de cotización
- [ ] Implementar cambio de estado (Aprobada/Rechazada)
- [ ] Agregar botón de eliminar cotización con confirmación

### Email
- [x] Crear plantilla de email para envío de cotización
- [x] Integrar con Resend para envío con PDF adjunto
- [ ] Incluir enlace al portal del cliente en el email

### Tests
- [ ] Tests de creación de cotización
- [ ] Tests de generación de PDF
- [ ] Tests de permisos de acceso
- [ ] Tests de envío por email
- [ ] Verificar que todos los tests pasen

### Catálogo de Precios (Configurables después)
- [ ] Cocinas: $900,000/ml
- [ ] Muebles altos: Nicho nevera $1,200,000, Despensa con entrepaños $1,250,000, etc.
- [ ] Mesones: Cuarzo $850,000/ml, Sinterizado $1,200,000/ml
- [ ] Puertas: 4 tipos con precios específicos
- [ ] Closets: 3 tipos con precios/m²
- [ ] Centros TV: $2,800,000
- [ ] LED: $180,000/ml
- [ ] Vidrio ahumado: Largo $600,000, Corto $450,000
- [ ] Herrajes: 11 tipos a $500,000 (temporal)
- [ ] Costos fijos: $600,000 (transporte + imprevistos)

## Corrección de Errores

- [x] Corregir error "Failed to fetch" en página principal
- [x] Verificar que todos los endpoints tRPC estén funcionando correctamente

## Integración de Navegación

- [x] Agregar link de Cotizaciones en Panel Admin
- [x] Verificar que sea visible solo para super_admin y admin
- [x] Probar navegación completa

## Edición de Cotizaciones

- [x] Agregar botón "Editar" en cotizaciones con estado borrador
- [x] Cargar datos de cotización existente en el formulario
- [x] Permitir modificar items existentes
- [x] Permitir agregar/eliminar items
- [x] Actualizar totales al editar
- [x] Guardar cambios en la base de datos

## Corrección Error PDF

- [x] Corregir error "Dynamic require of child_process is not supported"
- [x] Asegurar que generación de PDF se ejecute solo en backend
- [x] Probar descarga de PDF desde frontend

## Diagnóstico Error PDF

- [x] Revisar logs del servidor para identificar error específico
- [x] Verificar que el script Python existe y es ejecutable
- [x] Probar ejecución manual del script Python
- [x] Corregir error identificado

## Investigación Error Persistente PDF

- [x] Crear cotización de prueba desde el frontend
- [x] Intentar generar PDF y capturar error exacto
- [x] Revisar logs del servidor en tiempo real
- [x] Verificar que los datos lleguen correctamente al endpoint
- [x] Probar con diferentes datos de cotización
- [x] Implementar solución definitiva


## Migración a PDFKit

- [x] Instalar pdfkit y dependencias
- [x] Crear generador de PDF en Node.js con PDFKit
- [x] Replicar diseño aprobado (logo, colores, tablas, términos)
- [x] Actualizar endpoint para usar nuevo generador
- [x] Probar generación de PDF
- [ ] Eliminar código Python obsoleto


## Corrección __dirname en PDFKit

- [x] Reemplazar __dirname con import.meta.url para módulos ES
- [x] Probar generación de PDF con logo


## Ajuste de Costos Fijos en Cotizaciones

- [x] Actualizar frontend para incluir costos fijos en el total del ítem cocina
- [x] Actualizar generador de PDF para no mostrar línea separada de costos fijos
- [x] Actualizar cálculo de total (solo suma de items, sin costos fijos adicionales)
- [x] Probar generación de PDF con nuevo formato


## Checkbox de Costos Fijos en Items

- [x] Agregar campo includesFixedCosts a tabla quotation_items
- [x] Agregar checkbox en formulario de items
- [x] Implementar suma automática de $600,000 al marcar checkbox
- [x] Actualizar PDF para mostrar nota cuando item incluye costos fijos
- [x] Probar creación y edición de cotizaciones con checkbox


## Configuración de Resend para Envío de Cotizaciones

- [x] Configurar RESEND_API_KEY en variables de entorno
- [x] Configurar EMAIL_FROM (ventas@cocinasintegralespereira.co)
- [x] Validar credenciales con test automatizado
- [x] Reiniciar servidor para cargar nuevas variables


## Corrección de Lógica de Costos Fijos en Cotizaciones

- [x] Corregir cálculo de totales en endpoint quotations.create (verificar checkbox)
- [x] Corregir cálculo de totales en endpoint quotations.update (verificar checkbox)
- [x] Actualizar campo fixedCosts en base de datos según lógica correcta
- [x] Modificar generador de PDF para mostrar costos fijos condicionalmente
- [ ] Agregar validación en frontend (solo un item puede tener checkbox marcado)
- [x] Crear tests para ambos escenarios (con y sin checkbox)
- [ ] Probar generación de PDF en ambos casos
- [ ] Probar envío de email con cotizaciones de prueba


## Corrección de Error de Validación en Edición de Cotizaciones

- [x] Corregir schema de validación en endpoints create y update para aceptar totalPrice como string o número


## Reestructuración Completa del Sistema de Cotizaciones

- [ ] Actualizar schema: agregar itemType, itemSubtype, includeInTotal
- [ ] Migrar base de datos con nuevos campos
- [ ] Actualizar backend: validación de tipos y subtipos
- [ ] Actualizar backend: cálculo de subtotal con includeInTotal
- [ ] Actualizar frontend: dropdown de tipo de item (Cocina, Closet, Puerta, Centro TV, Mesón Quarzone, Mesón Sinterizado, Luz LED)
- [ ] Actualizar frontend: dropdown condicional de subtipo (Closet: Estándar/Fondo más corto/Empotrado, Puerta: Batiente 50-85/Batiente 85-110/Corrediza pequeña/Corrediza grande)
- [ ] Actualizar frontend: checkbox "Incluir en total"
- [ ] Actualizar frontend: validación de reglas (solo un item con costos fijos, al menos un item que sume)
- [ ] Actualizar PDF: mostrar tipo y subtipo de cada item
- [ ] Actualizar PDF: marcar items informativos
- [ ] Eliminar campo workType del encabezado de cotización
- [ ] Probar todos los casos de uso


## Implementación de Sistema de Cotizaciones - COCINAS

### Base de Datos
- [ ] Crear schema para estructura de cocinas (forma, muebles, mesón, isla, barra, etc.)
- [ ] Migrar base de datos

### Backend
- [ ] Crear endpoints para cotizaciones de cocinas
- [ ] Implementar lógica de cálculo automático
- [ ] Validaciones de datos

### Frontend
- [ ] Formulario de cotización de cocinas
- [ ] Campos: forma, muebles inferiores/superiores, muebles especiales
- [ ] Sección de mesón con checkboxes de recargo
- [ ] Sección de isla con checkbox de laterales
- [ ] Sección de barra con checkbox de lateral
- [ ] Campo de luz LED
- [ ] Cálculo automático de totales
- [ ] Mostrar desglose de precios

### PDF
- [ ] Actualizar generador de PDF para mostrar estructura de cocinas
- [ ] Desglose detallado de componentes
- [ ] Total con transporte e imprevistos

### Testing
- [ ] Probar cálculos con diferentes configuraciones
- [ ] Verificar PDF generado


## Reestructuración de Sistema de Cotizaciones

### Preparación
- [x] Documentar catálogo completo de precios (CATALOGO_PRECIOS.md)
- [x] Documentar especificación de cocinas (ESPECIFICACION_COCINAS.md)
- [x] Actualizar schema de base de datos con nuevos campos (productType, transportCost)
- [x] Crear tabla kitchenQuotations para cotizaciones de cocinas
- [x] Recrear tablas quotations y quotationItems con nueva estructura

### Backend
- [x] Actualizar backend (routers, db.ts) con nuevos nombres de campos
- [x] Actualizar generadores de PDF con nuevos nombres de campos
- [x] Corregir todas las referencias de workType a productType
- [x] Corregir todas las referencias de fixedCosts a transportCost

### Frontend
- [x] Actualizar frontend (Quotations.tsx, Portal.tsx) con nuevos nombres
- [x] Corregir todas las referencias de workType a productType

### Base de Datos
- [x] Ejecutar migración de base de datos (tablas recreadas exitosamente)


## Implementación de Formulario de Cotización de Cocinas

### Backend
- [ ] Crear endpoints tRPC para cotizaciones de cocinas (create, update, get, list)
- [ ] Implementar lógica de cálculo automático de totales
- [ ] Validar datos de entrada con Zod

### Frontend
- [ ] Crear componente KitchenQuotationForm con todos los campos
- [ ] Implementar cálculo automático de metros lineales (descontando muebles especiales)
- [ ] Implementar cálculo de recargos de mesón según fondo
- [ ] Implementar cálculo de isla con laterales
- [ ] Implementar cálculo de barra con lateral
- [ ] Mostrar preview de totales en tiempo real

### Integración
- [ ] Conectar formulario con backend
- [ ] Actualizar generador de PDF para cocinas
- [ ] Probar flujo completo de creación de cotización


## Selector de Tipo de Producto en Cotizaciones

- [x] Agregar dropdown de tipo de producto en formulario de cotizaciones (Cocina, Closet, Puerta, Centro TV, Mesón Quarzone, Mesón Sinterizado, Luz LED)
- [ ] Mostrar campos específicos según el tipo seleccionado
- [ ] Actualizar PDF para mostrar el tipo de producto


## Mover Tipo de Producto a Items

- [x] Eliminar campo productType del encabezado de cotización
- [x] Agregar campo itemType a cada item individual
- [x] Actualizar interfaz QuotationItem para incluir itemType
- [x] Modificar formulario para mostrar selector de tipo en cada item
- [ ] Actualizar backend para guardar itemType en quotationItems
- [ ] Actualizar PDF para mostrar tipo de cada item

## Sistema de Cotizaciones de Cocinas Integrales

### Formulario Dinámico de Cocinas
- [x] Implementar campos dinámicos cuando itemType = "cocina"
- [x] Campo selector de forma (L, U, Lineal)
- [x] Campo de metraje total de cocina (ml)
- [x] Checkboxes de muebles especiales con descuento automático de metraje
- [x] Sección de mesón principal con tipo, ml, y recargos por fondo
- [x] Sección de isla (opcional) con muebles, mesón y checkbox de laterales
- [x] Sección de barra (opcional) con muebles, mesón y checkbox de lateral
- [x] Campo de luz LED (ml)
- [x] Cálculo automático de totales según especificación
- [x] Validaciones de metraje y recargos
- [x] Actualizar backend para guardar configuración de cocina (itemType + kitchenConfig JSON)
- [ ] Actualizar PDF para mostrar desglose completo de cocina
- [x] Tests de cálculos automáticos (13 tests pasando)

## Bug: Descuento de metraje en cocinas

- [x] Corregir lógica de cálculo de metraje resultante: solo descontar anchos de muebles especiales cuando están SELECCIONADOS (checkbox marcado)
- [x] Solución implementada: calcular metraje resultante directamente en el render con lógica correcta
- [x] El metraje resultante determina los metros lineales de muebles inferiores, superiores y mesón
- [x] 13 tests backend verificados y pasando correctamente

## Mejoras UX Formulario de Cocinas

- [x] Hacer campos opcionales: si no se llenan, no se incluyen en el cálculo (isla, barra, LED, muebles especiales)
- [x] Corregir superposición visual entre tipo de mesón y campo de metraje (grid 2 columnas en lugar de 3)
- [x] El metraje resultante se usa automáticamente para mesón (eliminado campo de metros manual)
- [x] El metraje de LED es opcional e independiente (placeholder mejorado)
- [x] Agregar campo visual "Muebles Superiores: X.XX ml" que muestre el mismo valor que metraje resultante
- [x] Mostrar desglose completo: Muebles Inferiores, Muebles Superiores, Mesón Principal (todos con metraje resultante)
- [x] 13 tests verificados y pasando

## Bug: Validación de formulario de cotizaciones

- [x] El formulario no permite guardar cotización y muestra error "Completa todos los items"
- [x] No indica qué campos específicos faltan por completar
- [x] Está exigiendo campos opcionales (isla, barra, LED) que deberían ser opcionales
- [x] Para cocinas, solo debería exigir: forma, metraje total, tipo de mesón
- [x] Mejorar mensaje de error para indicar exactamente qué falta (ahora muestra "Item X: campo específico")

## Bug: Error al guardar cotización - productType inválido

- [x] Al guardar cotización muestra error: "Invalid option: expected one of \"cocina\"|\"closet\"|\"puerta\"|\"centro_tv\"|\"otro\""
- [x] Causa real: La columna productType NO EXISTÍA en la tabla quotations de la base de datos
- [x] Solución: Agregar columna productType a la base de datos con ALTER TABLE
- [x] Actualizar schema de Drizzle para incluir valor por defecto "otro"

## Bug: Error al insertar cotización en base de datos

- [x] Error: "Failed query: insert into `quotations`..." con valores `default` que fallan
- [x] Causa: Desincronización entre schema de Drizzle y estructura real de la base de datos
- [x] Problemas encontrados: columna workType extra, fixedCosts vs transportCost, createdBy nullable
- [x] Solución: Eliminar workType, renombrar fixedCosts a transportCost, hacer createdBy NOT NULL

## Bug: Cálculo de metraje resultante no funciona

- [x] El metraje resultante no descuenta los anchos de muebles especiales cuando se marcan
- [x] El mesón no usa automáticamente el metraje resultante
- [x] Debe restar: nicho nevecon (1.0m), nicho nevera (0.75m), alacenas (0.5m), torre hornos (0.7m)
- [x] El metraje resultante debe aplicarse a: muebles inferiores, muebles superiores, mesón principal
- [x] Solución: La lógica de cálculo estaba correcta, se agregó debug para verificar y ahora funciona correctamente

## PDF de Cotización con Desglose Completo de Cocinas

- [x] Revisar generador de PDF actual
- [x] Implementar desglose detallado para cocinas:
  - [x] Mostrar forma de la cocina (L, U, Lineal)
  - [x] Mostrar muebles lineales inferiores y superiores con metraje
  - [x] Listar muebles especiales seleccionados (sin precios individuales)
  - [x] Mostrar mesón principal con tipo, metraje y recargos por fondo
  - [x] Mostrar isla (si aplica) con muebles, mesón y laterales
  - [x] Mostrar barra (si aplica) con muebles, mesón y lateral
  - [x] Mostrar luz LED (si aplica) con metraje
  - [x] Mostrar transporte e imprevistos
- [x] Solo mostrar precio global en columna Total (sin precios individuales)
- [x] Probar generación de PDF con cotización de cocina completa (listo para prueba del usuario)

## Correcciones PDF de Cotización

- [x] Cambiar correo electrónico a ventas@cocinasintegralespereira.co
- [x] Actualizar cuenta bancaria a "Cuenta de Ahorros Bancolombia # 11533034332"
- [x] Corregir palabras superpuestas en el PDF (ajustadas posiciones Y)
- [x] Probar PDF corregido con cotización de cocina (listo para prueba del usuario)

## Correcciones Adicionales PDF

- [x] Eliminar línea de "Transporte e imprevistos" del PDF (ya está incluido en precio total del item)
- [x] Corregir superposición del precio total para que sea legible (ajustado rectángulo y texto)
- [x] Probar PDF con cotización completa (listo para prueba del usuario)

## Bugs Reportados

- [x] Total en PDF sigue sobrepuesto - aumentado espaciado a 40px y altura de rectángulo a 32px
- [x] Error al editar o ver cotización - agregadas validaciones para kitchenConfig undefined

## Bug: Total en PDF cortado en dos líneas

- [x] El valor del total se corta y los últimos 3 dígitos aparecen en segunda línea (ej: "18.600." en primera línea, "000" en segunda)
- [x] Aumentar ancho del rectángulo del total (de 182 a 212px) y mover posición X (de 380 a 350)
- [x] Ajustar posición y alineación del texto del total con width: 195px para que quepa completo

## Bug: Error al editar/ver cotización persiste

- [x] Error "Cannot read properties of undefined (reading 'nichoNevecon')" persiste
- [x] Falta validación de specialModules en calculateKitchenTotal (líneas 381-385, 400-404)
- [x] Agregar validación `config.specialModules?.` en todos los accesos dentro de calculateKitchenTotal

## Bug CRÍTICO: Estructura incompleta de kitchenConfig

- [x] Error persiste: ahora "Cannot read properties of undefined (reading 'type')" - falta countertop
- [x] Problema: Solo agregué specialModules pero faltan otros campos (countertop, island, bar, etc.)
- [x] Solución: Asegurar que TODA la estructura de kitchenConfig tenga valores por defecto para TODOS los campos (shape, totalMeters, specialModules, countertop, island, bar, ledLighting)

- [ ] Al abrir cotización existente para editar, todos los valores aparecen en 0 o desmarcados
- [ ] Metraje de cocina en 0, muebles especiales desmarcados, mesón vacío
- [ ] Los valores SÍ están guardados en la base de datos pero no se cargan correctamente al editar
- [ ] Problema: La lógica de valores por defecto está sobrescribiendo los valores reales de la BD

- [ ] Al hacer clic en "Editar" cotización, el formulario aparece vacío (como nuevo)
- [ ] Debería pre-llenar todos los campos con los datos guardados (cliente, vendedor, items)
- [ ] Usuario espera poder MODIFICAR datos existentes, no empezar desde cero
## Bug: Valores de kitchenConfig en 0 al editar cotización

- [x] Al abrir cotización existente para editar, todos los valores aparecen en 0 o desmarcados
- [x] Metraje de cocina en 0, muebles especiales desmarcados, mesón vacío
- [x] Los valores SÍ están guardados en la base de datos pero no se cargan correctamente al editar
- [x] Problema 1: kitchenConfig viene como STRING de la BD (necesita JSON.parse) - CORREGIDO en backend
- [x] Problema 2: Operador || sobrescribe valores 0 y false - CORREGIDO usando ?? en frontend

## Bug: Formulario de edición aparece vacío

- [x] Al hacer clic en "Editar" cotización, el formulario aparece vacío (como nuevo)
- [x] Debería pre-llenar todos los campos con los datos guardados (cliente, vendedor, items)
- [x] Usuario espera poder MODIFICAR datos existentes, no empezar desde cero
- [x] CORREGIDO: Backend parsea JSON, frontend usa ?? para preservar valores

## Bug: Precio no se actualiza al editar cotización - RESUELTO

- [x] Al editar cotización y cambiar valores (metraje, muebles especiales, etc.)
- [x] Al guardar, el precio total NO se recalculaba
- [x] La cotización conservaba el precio anterior en lugar de calcular el nuevo
- [x] CAUSA: Frontend enviaba totalPrice anterior sin recalcular
- [x] SOLUCIÓN: Recalcular totalPrice de todos los items de cocina en handleSubmit antes de enviar mutación
- [ ] Al editar cotización y cambiar valores (metraje, muebles especiales, etc.)
- [ ] Al guardar, el precio total NO se recalcula
- [ ] La cotización conserva el precio anterior en lugar de calcular el nuevo
- [ ] Usuario espera que el precio se actualice automáticamente según los cambios

## Bug: Precio no se actualiza al editar cotización - RESUELTO

- [x] Al editar cotización y cambiar valores (metraje, muebles especiales, etc.)
- [x] Al guardar, el precio total NO se recalculaba
- [x] La cotización conservaba el precio anterior en lugar de calcular el nuevo
- [x] CAUSA: Frontend enviaba totalPrice anterior sin recalcular
- [x] SOLUCIÓN: Recalcular totalPrice de todos los items de cocina en handleSubmit antes de enviar mutación

## Bug: Error al guardar cotización - campos vacíos - RESUELTO

- [x] Error al guardar cotización: "Failed query: insert into quotationItems"
- [x] Campos description, quantity, unitPrice llegaban vacíos para items de cocina
- [x] BD requiere description y quantity NOT NULL
- [x] SOLUCIÓN Frontend: Agregar valores por defecto "Cocina integral" y "1" en handleSubmit
- [x] SOLUCIÓN Backend: Agregar fallback values en endpoints create y update
- [ ] Error al guardar cotización: "Failed query: insert into quotationItems"
- [ ] Campos description, quantity, unitPrice llegan vacíos para items de cocina
- [ ] BD requiere description y quantity NOT NULL
- [ ] Para cocinas estos campos no son necesarios (info está en kitchenConfig)
- [ ] Necesita valores por defecto para items de cocina

## Bug: Error al guardar cotización - campos vacíos - RESUELTO

- [x] Error al guardar cotización: "Failed query: insert into quotationItems"
- [x] Campos description, quantity, unitPrice llegaban vacíos para items de cocina
- [x] BD requiere description y quantity NOT NULL
- [x] SOLUCIÓN Frontend: Agregar valores por defecto "Cocina integral" y "1" en handleSubmit
- [x] SOLUCIÓN Backend: Agregar fallback values en endpoints create y update

## Bug: Precio no se guarda al editar cotización

- [ ] Al editar cotización y cambiar valores, el precio se actualiza en el formulario
- [ ] Al guardar, el mensaje dice "Cotización actualizada exitosamente"
- [ ] Pero al volver a la lista, la cotización guardada conserva el precio anterior
- [ ] El precio calculado no se está guardando en la base de datos

## Bug: Duplicación de $600,000 en precio total

- [x] Al guardar cotización, el precio tiene $600,000 de más
- [x] Frontend suma $600,000 si checkbox "Incluye transporte" está marcado
- [x] Backend TAMBIÉN suma $600,000 al total de la cotización
- [x] Resultado: $600,000 se suma DOS VECES
- [x] Necesita corregir para que solo se sume UNA vez

## Bug: Error al enviar email con PDF
- [x] Al hacer clic en "Enviar Email" aparece error: "Dynamic require of 'child_process' is not supported"
- [x] El problema está en la generación del PDF adjunto
- [x] Necesita usar librería compatible con el entorno del servidor

## Mejora: Desglose detallado en PDF de cotización
- [x] Agregar descripción detallada de componentes de cocina en el PDF
- [x] Incluir: metraje de muebles inferiores/superiores, tipo de mesón, muebles especiales, LED, isla, barra
- [x] Mostrar toda la información sin precios individuales, solo precio total

## Bug: Botones desaparecidos en panel de cotizaciones
- [x] Los botones "Editar" y "Enviar Email" no aparecen en la lista de cotizaciones
- [x] Verificar si es problema de cache o código
- [x] Restaurar botones y funcionalidad
- [x] Eliminar línea "Transporte e imprevistos incluidos" del desglose en PDF
- [x] Agregar NIT 10021456-1 debajo de "INNOVAR COCINAS DE DISEÑO" en PDF
- [x] Corregir espaciado en encabezado del PDF (dirección encimada con teléfono)
- [x] Implementar vista previa del PDF antes de enviar por email
- [x] Vista previa de PDF corregida - Content-Disposition inline

- [x] Agregar "herrajes" como nuevo tipo de producto en cotizaciones

- [x] Agregar "herrajes" al selector visual de tipo de producto en formulario

- [ ] Agregar campo precio a catálogo de herrajes
- [ ] Crear selector de herrajes con checkboxes y cantidades
- [ ] Implementar suma automática de herrajes seleccionados

## Sistema de Catálogo de Herrajes con Precios

### Backend - Base de Datos y API
- [x] Agregar campo "price" (decimal) a tabla hardwareCatalog
- [x] Actualizar funciones createHardwareItem y updateHardwareItem para soportar precio
- [x] Actualizar endpoints tRPC create y update para aceptar campo price
- [x] Consolidar imports duplicados en db.ts (hardwareCatalog, projectHardwareSelections)
- [x] Crear tests para verificar funcionalidad de precios (7 tests pasando)

### Frontend - Gestión de Catálogo
- [ ] Crear página de administración de catálogo de herrajes (/admin/hardware-catalog)
- [ ] Implementar tabla con lista de herrajes filtrable por categoría
- [ ] Formulario para crear nuevo herraje con precio
- [ ] Formulario para editar herraje existente con precio
- [ ] Botón para eliminar herraje
- [ ] Subida de foto para cada herraje

### Integración en Cotizaciones
- [ ] Mostrar selector de herrajes cuando tipo de item = "herrajes"
- [ ] Filtrar herrajes por categoría según productType de la cotización
  - cocina → mostrar herrajes de categoría "cocinas"
  - closet → mostrar herrajes de categoría "closets"
  - puerta → mostrar herrajes de categoría "puertas"
- [ ] Checkbox list para seleccionar múltiples herrajes
- [ ] Input de cantidad para cada herraje seleccionado
- [ ] Cálculo automático de precio total (suma de precio × cantidad)
- [ ] Guardar configuración de herrajes seleccionados en quotationItem
- [ ] Mostrar herrajes seleccionados en vista de cotización
- [ ] Incluir herrajes en PDF de cotización

### Tests
- [ ] Test de creación de herraje con precio
- [ ] Test de actualización de precio de herraje
- [ ] Test de obtención de herrajes por categoría
- [ ] Test de cálculo de precio total con múltiples herrajes

## Implementación Completa de Sistema de Herrajes con Precios

### Fase 1: Campo de Precio en Formulario de Herrajes
- [x] Agregar campo de precio en formulario de creación/edición de herrajes (Admin.tsx)
- [x] Mostrar precio en tarjetas del catálogo de herrajes
- [x] Validación de precio (número positivo, formato decimal)

### Fase 2: Schema y Precio Histórico
- [x] Agregar campo priceAtQuotation a tabla projectHardwareSelections
- [x] Actualizar funciones de db.ts para manejar precio histórico
- [x] Migrar schema con pnpm db:push

### Fase 3: Selector de Herrajes en Cotizaciones
- [x] Crear sección condicional para itemType === "herrajes" en Quotations.tsx
- [x] Implementar filtro por categoría (cocina/closet/puerta) según contexto
- [x] Crear lista de herrajes con checkboxes y campos de cantidad
- [x] Mostrar precio unitario y subtotal por herraje
- [ ] Guardar selecciones en projectHardwareSelections con precio histórico

### Fase 4: Cálculo Automático de Precios
- [x] Función para calcular subtotal por herraje (precio × cantidad)
- [x] Función para calcular total de herrajes seleccionados
- [x] Integrar con cálculo total de la cotización
- [ ] Actualizar endpoints tRPC para guardar/cargar selecciones

### Fase 5: Testing y Validación
- [ ] Crear test para selección de herrajes en cotizaciones
- [ ] Probar flujo completo: crear herraje → agregar precio → cotizar → calcular
- [ ] Verificar que precio histórico se guarda correctamente
- [ ] Validar que cambios de precio no afectan cotizaciones anteriores

## Mostrar Herrajes en PDF de Cotización

- [x] Buscar archivo de generación de PDF de cotizaciones
- [x] Analizar estructura del template HTML
- [x] Agregar sección de herrajes seleccionados con tabla (nombre, cantidad, precio unitario, subtotal)
- [x] Incluir total de herrajes en el cálculo total de la cotización
- [x] Agregar campo hardwareSelections al schema de quotationItems
- [x] Aplicar migración de base de datos
- [ ] Probar generación de PDF con cotización tipo "herrajes"

## Bug: Filtro de Categoría de Herrajes

- [x] Diagnosticar por qué herrajes de closet aparecen en selector de cocinas
- [x] Revisar lógica de filtrado en HardwareSelectorForQuotation
- [x] Verificar que categorías en base de datos coincidan con las del filtro
- [x] Corregir filtro para que solo muestre herrajes de la categoría correcta (ahora filtra en backend)
- [ ] Probar con herrajes de cocina, closet y puerta

## Bug: Herrajes se crean con categoría incorrecta

- [x] Revisar formulario de creación en HardwareCatalogAdmin.tsx
- [x] Verificar que el valor de form.category se esté enviando correctamente
- [x] Revisar endpoint create en routers.ts
- [x] Verificar función createHardwareItem en db.ts
- [x] Agregar logs para rastrear el valor de category durante la creación
- [x] Hacer que resetForm use la categoría seleccionada en el filtro
- [x] Hacer selector de categoría más visible con fondo azul y mensaje de confirmación

## Persistencia de Selecciones de Herrajes en Cotizaciones

### Backend - Guardar Selecciones
- [x] Actualizar endpoint createQuotation para guardar hardwareSelections en quotationItems
- [x] Actualizar endpoint updateQuotation para actualizar hardwareSelections
- [ ] Guardar cada herraje en projectHardwareSelections con precio histórico (opcional)
- [x] Validar que hardwareSelections sea un array válido antes de guardar

### Backend - Cargar Selecciones
- [x] Actualizar endpoint getQuotation para incluir hardwareSelections
- [x] Parsear JSON de hardwareSelections al cargar cotización
- [ ] Incluir herrajes en respuesta de listado de cotizaciones (no necesario)

### Frontend - Integración
- [x] Cargar hardwareSelections al abrir cotización para editar
- [x] Poblar estado de selectedHardware con datos guardados
- [ ] Mantener sincronización entre formulario y datos guardados (automático)
- [ ] Mostrar herrajes guardados en vista de detalle de cotización (opcional)

### Pruebas
- [ ] Crear cotización con herrajes y verificar que se guarden
- [ ] Editar cotización y verificar que herrajes se mantengan
- [ ] Generar PDF y verificar que herrajes aparezcan correctamente
- [ ] Cambiar precio de herraje y verificar que cotizaciones viejas mantengan precio original

## Mejoras Visuales - Panel Admin y Cotizaciones

### Vista de Cotizaciones
- [x] Reducir espacios innecesarios en la tabla de cotizaciones
- [x] Optimizar layout para mostrar más información en menos espacio
- [x] Mejorar diseño de tarjetas/filas de cotizaciones (gradiente cyan, tarjetas compactas)
- [x] Ajustar padding y márgenes para aprovechar mejor el espacio

### Menú de Pestañas del Panel Admin
- [x] Agregar colores distintivos a cada pestaña (sin morado)
- [x] Citas: Color azul (blue-500)
- [x] Asesorías: Color naranja (orange-500)
- [x] Cotizaciones: Color cyan (cyan-500)
- [x] Clientes: Color verde (green-500)
- [x] Usuarios: Color gris (slate-500)
- [x] Herrajes: Color rosa (rose-500)
- [x] Aplicar colores en estado activo e hover con transiciones

## Selección Múltiple de Clientes

- [x] Agregar estado selectedClients en Admin.tsx
- [x] Agregar checkbox "Seleccionar todos" en header de tabla de clientes
- [x] Agregar checkbox individual por cada cliente
- [x] Implementar botón "Eliminar seleccionados" cuando hay clientes seleccionados
- [x] Agregar confirmación antes de eliminar múltiples clientes
- [x] Implementar endpoint o lógica para eliminar múltiples clientes (usa mutation existente)

## Eliminación en Cascada de Clientes

- [x] Actualizar endpoint deleteClient para eliminar registros relacionados antes de eliminar cliente
- [x] Eliminar citas del cliente (appointments)
- [x] Eliminar asesorías del cliente (advisory_requests)
- [x] Eliminar cotizaciones del cliente (quotations y quotationItems)
- [x] Eliminar proyectos del cliente (projects y tablas relacionadas)
- [ ] Probar eliminación de cliente con registros relacionados

## Limpieza de Console.log Temporales

- [x] Buscar todos los console.log en routers.ts
- [x] Buscar todos los console.log en db.ts
- [x] Eliminar logs temporales agregados durante desarrollo de herrajes
- [x] Verificar que no queden logs de debug en el código

## Barra de Búsqueda en Clientes

- [x] Agregar estado searchQuery en Admin.tsx para la sección de clientes
- [x] Agregar input de búsqueda con ícono de lupa
- [x] Implementar lógica de filtrado por nombre, teléfono o email
- [x] Mostrar contador de resultados filtrados
- [x] Aplicar estilos consistentes con el resto de la interfaz

## Ordenamiento de Lista de Clientes

- [x] Agregar estado sortBy en Admin.tsx para la sección de clientes
- [x] Crear selector desplegable con opciones: "Nombre (A-Z)", "Nombre (Z-A)", "Más recientes", "Más antiguos"
- [x] Implementar lógica de ordenamiento que se aplique después del filtrado
- [x] Mantener ordenamiento al cambiar búsqueda
- [x] Aplicar estilos consistentes al selector

## Colores Fijos en Contadores del Panel Admin

- [x] Agregar color de fondo azul al contador de Citas
- [x] Agregar color de fondo naranja al contador de Asesorías
- [x] Agregar color de fondo cyan al contador de Cotizaciones
- [x] Agregar color de fondo verde al contador de Clientes
- [x] Mantener consistencia con colores de las pestañas

## Colores Fijos en Tarjetas de Estadísticas Superiores

- [x] Buscar tarjetas de estadísticas en la parte superior del Panel Admin
- [x] Agregar color de fondo azul a la tarjeta de Citas
- [x] Agregar color de fondo naranja a la tarjeta de Asesorías
- [x] Agregar color de fondo cyan a la tarjeta de Cotizaciones
- [x] Agregar color de fondo verde a la tarjeta de Clientes
- [x] Revertir badges agregados en las pestañas (no eran necesarios)

## Bug: Modal de Herrajes sin Scroll

- [x] Agregar scroll al DialogContent del modal de herrajes
- [x] Fijar botones de acción (Guardar/Cancelar) en la parte inferior (automático con scroll)
- [ ] Probar con contenido largo (descripción extensa)
- [ ] Verificar que el botón Guardar sea siempre accesible

## Color en Tarjeta de Recordatorios

- [x] Buscar tarjeta de Recordatorios en Admin.tsx
- [x] Agregar color de fondo amarillo/amber con gradiente
- [x] Agregar color al ícono de Bell (amber-600)
- [x] Mantener consistencia con estilo de otras tarjetas de estadísticas

## Bug: Selector de Herrajes en Cotizaciones No Funciona

- [x] Revisar componente HardwareSelectorForQuotation.tsx
- [x] Verificar que los checkboxes de selección funcionen correctamente
- [x] Verificar que los campos de cantidad sean editables
- [x] Corregir lógica de onChange para selectedHardware
- [x] Agregar inicialización de hardwareSelections en addItem (era undefined)
- [ ] Probar selección y cantidad en cotización tipo "herrajes"
- [ ] Bug persiste en cotizaciones nuevas - revisar renderizado del componente
- [ ] Verificar que el componente HardwareSelectorForQuotation se esté renderizando
- [ ] Agregar logs para verificar props recibidas

## Bug: PDF de Cotización de Herrajes Vacío
- [ ] Investigar por qué el PDF de cotizaciones de herrajes se genera vacío (0 bytes)
- [ ] Verificar endpoint de generación de PDF
- [ ] Corregir generación de PDF para items de tipo herrajes


## Lógica de Transporte e Imprevistos (Aclaración)
- [x] Cocina: transporte incluido automáticamente (implícito, no se puede desactivar)
- [x] Otros productos (Closet, Puerta, Herrajes, etc.): checkbox de transporte disponible pero desactivado por defecto
- [x] El usuario activa el checkbox manualmente si la cotización NO incluye cocina

- [x] Hacer que el monto de transporte sea editable (no fijo en $600,000) cuando se activa el checkbox

- [x] Bug: El transporte ($600,000) se suma automáticamente al total aunque no esté marcado el checkbox


## Configurador de Closets - Implementación Completa
- [x] Crear componente ClosetConfigurator.tsx con 3 tipos (Estándar $750k/M², Especial $650k/M², Empotrado $900k/M²)
- [x] Agregar campos de ancho y alto con cálculo automático de M²
- [x] Agregar selector de tipo de puertas (Corredizas/Batientes)
- [x] Integrar en Quotations.tsx para renderizar cuando itemType === "closet"
- [x] Actualizar schema con campo closetConfig
- [x] Actualizar backend para guardar y procesar closetConfig
- [x] Generar descripción detallada en PDF con especificaciones del closet
- [x] Probar flujo completo: crear cotización → generar PDF


## Bug: Error React #185 en producción
- [x] Identificar causa del error en ClosetConfigurator (onChange en dependencias del useEffect)
- [x] Corregir el problema (remover onChange de dependencias)
- [x] Probar en desarrollo y producción (corrección aplicada, requiere actualización de caché)


## Bug: Validación de descripción para closets
- [x] Ajustar validación para que closets no requieran descripción manual
- [x] Probar creación de cotización con closets


## Bug: Pérdida de datos de closetConfig al editar cotización
- [x] Identificar por qué closetConfig no se carga al editar (faltaba en handleEdit)
- [x] Corregir la carga de datos agregando closetConfig y fixedCostsAmount
- [x] Probar edición de cotización con closet


## Campo de Notas en Configurador de Closets
- [x] Agregar campo notes a la interfaz ClosetConfig
- [x] Actualizar componente ClosetConfigurator con textarea de notas
- [x] Actualizar backend para guardar notas (ya se guarda en closetConfig JSON)
- [x] Incluir notas en la descripción del PDF


## Bug: Error "Cannot read properties of undefined (reading 'price')"
- [x] Identificar línea exacta donde ocurre el error (línea 81: CLOSET_TYPES[type].price)
- [x] Agregar validaciones de seguridad (usar closetType con fallback a estandar)
- [x] Probar con cotizaciones existentes y nuevas


## Bug CRÍTICO: Error 'price' persiste al editar cotizaciones con closets
- [x] Verificar cómo se parsea closetConfig desde JSON en handleEdit
- [x] Asegurar que type tenga valor por defecto 'estandar' (no 'standard') si viene undefined
- [x] Probar edición de cotización existente con closet


## Bug: Medidas del closet aparecen en 0 al editar
- [ ] Verificar si closetConfig se guarda correctamente en la base de datos
- [ ] Verificar si closetConfig se parsea correctamente al cargar para editar
- [ ] Corregir la carga de medidas (width, height) desde la base de datos


## Bug: Medidas del closet aparecen en 0 al editar
- [x] Verificar si closetConfig se guarda correctamente en la base de datos
- [x] Verificar si closetConfig se parsea correctamente al cargar para editar
- [x] Corregir la carga de medidas (width, height) desde la base de datos - SOLUCIONADO: faltaba parsear closetConfig en getQuotationById (routers.ts línea 925-927)


## Configurador de Puertas
- [x] Crear componente DoorConfigurator con tipos (batientes/corredizas) y rangos de precio
- [x] Agregar opción de color de accesorios (aluminio/negro) para chapa, bisagras y tope
- [x] Altura máxima de 2.40m
- [x] Integrar configurador en formulario de cotizaciones (tipo "puerta")
- [x] Actualizar backend para guardar doorConfig en base de datos
- [x] Actualizar parseo de doorConfig al cargar cotización para editar
- [x] Actualizar generación de PDF con especificaciones de puertas
- [x] Corregir carga de doorConfig en handleEdit (datos se borraban al editar)
- [ ] Probar flujo completo de crear, editar y generar PDF de cotización de puertas


## Reestructuración Configurador de Puertas - Lista Múltiple
- [x] Cambiar estructura de doorConfig de puerta única a lista de puertas (doors[])
- [x] Cada puerta con: tipo (batiente/corrediza), ancho, altura, color accesorios, dintel (sí/no), ubicación
- [x] Botón "Agregar puerta" para añadir más puertas a la lista
- [x] Botón "Eliminar" en cada puerta individual
- [x] Cálculo automático del subtotal por puerta y total general
- [x] Actualizar backend para guardar/cargar lista de puertas
- [x] Actualizar PDF para mostrar todas las puertas con sus especificaciones
- [x] Actualizar handleEdit para cargar lista de puertas correctamente (con compatibilidad hacia atrás)


## Mejora: Cantidad por puerta
- [x] Agregar campo de cantidad a cada puerta individual
- [x] Actualizar cálculo de subtotal (precio × cantidad)
- [x] Actualizar PDF para mostrar cantidad por puerta


## Mejora visual: Configurador de puertas
- [x] Corregir sobreposición de campos y textos
- [x] Mejorar distribución de campos en grid responsivo (5 columnas en desktop, 2 en tablet, 1 en móvil)
- [x] Mejorar legibilidad del resumen de cada puerta
- [x] Agregar iconos y mejor jerarquía visual
- [x] Mejorar separación entre secciones


## Mejora: Notas individuales por puerta
- [x] Agregar campo de notas a cada puerta individual
- [x] Actualizar handleEdit para cargar notas de cada puerta
- [x] Actualizar PDF para mostrar notas de cada puerta


## Bug: Texto superpuesto y márgenes excesivos en configurador de puertas
- [x] Corregir superposición de texto con números
- [x] Quitar márgenes innecesarios
- [x] Mejorar espaciado general
- [x] Diseño compacto con grid de 6 columnas
- [x] Notas en línea con checkbox de dintel


## Mejora: Transporte e imprevistos en configurador de puertas
- [x] Agregar checkbox de transporte e imprevistos
- [x] Campo de monto editable (valor por defecto $150,000)
- [x] Incluir en el cálculo del total
- [x] Mostrar en el PDF
- [x] Cargar correctamente al editar cotización


## Bug: Rediseño configurador de puertas - campos superpuestos
- [x] Aumentar espaciado entre campos (gap-4 en lugar de gap-2)
- [x] Separar campos en 3 filas claras: medidas, accesorios, notas
- [x] Agregar labels visibles para cada campo con texto más grande
- [x] Mejorar legibilidad general con fondos diferenciados
- [x] Resumen de precio más claro con desglose visible


## Filtros en lista de cotizaciones
- [x] Agregar filtro por cliente (búsqueda por nombre)
- [x] Agregar filtro por estado (borrador, enviada, aprobada, rechazada)
- [x] Agregar filtro por rango de fechas (desde - hasta)
- [x] Implementar lógica de filtrado en el frontend
- [x] Botón para limpiar filtros
- [x] Contador de resultados filtrados


## Configurador de Centros de TV
- [x] Crear componente TVCenterConfigurator
- [x] Medida base 1.60m = $2,800,000
- [x] Opción de ancho personalizado (1.20m a 2.40m con precios ajustados)
- [x] Opción alto brillo (+$350,000)
- [x] Opción luces LED (+$250,000)
- [x] Espacios especiales para equipos (+$150,000 c/u)
- [x] Cantidad de repisas flotantes (base 2, +$100,000 por adicional)
- [x] Transporte e imprevistos (checkbox con monto editable)
- [x] Notas adicionales
- [x] Integrar en formulario de cotizaciones
- [x] Actualizar backend para guardar tvCenterConfig
- [x] Actualizar PDF con especificaciones detalladas


## Bug: Centro de TV no genera descripción automática
- [x] Agregar generación automática de descripción cuando se selecciona Centro de TV
- [x] Agregar validación específica para centro_tv en handleSubmit
- [x] Similar a como funciona con closets, puertas y cocinas


## Unificación visual de configuradores
- [x] Revisar estilo de TVCenterConfigurator como referencia (color púrpura)
- [x] Actualizar ClosetConfigurator con el mismo estilo (color azul)
- [x] Actualizar DoorConfigurator con el mismo estilo (color naranja)
- [x] Mantener funcionalidad intacta, solo cambiar aspecto visual
- [x] Estructura unificada: header con icono, secciones con fondo coloreado, resumen de precio al final


## Unificación visual de Cocinas y Herrajes
- [x] Crear componente KitchenConfigurator separado con estilo unificado (verde/turquesa)
- [x] Actualizar HardwareSelectorForQuotation con estilo unificado (gris/slate)
- [x] Mantener funcionalidad intacta


## Mejora: Configurador de Cocinas
- [x] Agregar campo de notas adicionales (ya existía)
- [x] Cambiar color de turquesa a esmeralda (verde intenso)


## Bug: Unificar diseño de configurador de Cocinas con Centro de TV
- [x] Aplicar el mismo estilo visual del TVCenterConfigurator al KitchenConfigurator
- [x] Usar secciones con fondo coloreado consistentes (emerald-50, gray-50)
- [x] Mejorar checkboxes con el componente Checkbox de shadcn/ui
- [x] Agregar iconos a las opciones (Refrigerator, LayoutGrid, UtensilsCrossed, Lightbulb)
- [x] Resumen de precio con desglose similar al de Centro de TV


## Vista previa del PDF antes de guardar
- [x] Crear endpoint previewPDF para generar PDF de vista previa
- [x] Agregar botón "Vista Previa" en la lista de cotizaciones
- [x] Crear componente PDFPreviewBeforeSave para mostrar el PDF
- [x] Opciones de descargar o cerrar desde la vista previa


## Visor de PDF con react-pdf (sin descarga)
- [x] Instalar react-pdf y dependencias
- [x] Configurar worker de PDF.js (usando unpkg CDN)
- [x] Actualizar PDFPreviewBeforeSave para usar react-pdf
- [x] Agregar controles de zoom y navegación de páginas


## Bug: PDF se ve cortado en el visor
- [x] Ajustar tamaño del contenedor del visor (95vw x 95vh)
- [x] Ajustar escalado inicial para que quepa completo (80%)
- [x] Mejorar scroll para ver todo el documento
- [x] Agregar botón "Ajustar al ancho" para escalar automáticamente
- [x] Desactivar capas de texto/anotaciones para mejor rendimiento


## Configurador de Mesones (unificado)
- [x] Quitar items obsoletos: Luz LED, Mesón Quarzo, Mesón Sinterizado
- [x] Crear componente CountertopConfigurator con estilo visual similar a Centro de TV (color cyan)
- [x] Tipos: Mesón estándar, Isla, Barra
- [x] Material: Quarzo (editable, base $850,000) / Sinterizado (editable, base $1,200,000)
- [x] Fondo: 55-65cm (normal), 66-90cm (+30%), 91-120cm (doble)
- [x] Barra fondo 35-45cm: Quarzo $600,000, Sinterizado $1,000,000
- [x] Incluido: Pegado lavaplatos $130,000, salpicadero 10cm, regrueso visto
- [x] Isla: laterales fijos 1.8 ML + regrueso 0.9 ML (aplica recargo por fondo)
- [x] Barra: 1 lateral seleccionable (90cm, 100cm, 110cm)
- [x] Notas especiales y transporte e imprevistos
- [x] Integrar en Quotations.tsx
- [x] Actualizar backend y PDF


## Corrección Configurador de Mesones

- [x] Agregar 'mesones' al enum productType en el esquema de base de datos
- [x] Agregar 'mesones' al enum productType en el router de tRPC (create y update)
- [x] Verificar que el componente CountertopConfigurator muestra opciones de Isla y Barra
- [x] Probar creación de cotización con tipo Mesones (Barra) - COT-2026-627 creada exitosamente


## Corrección Isla y Barra en Configurador de Mesones

- [x] Mesón Estándar: Mantiene pegado lavaplatos, lavaplatos, salpicadero y regrueso en el visto
- [x] Isla: Solo regrueso en el visto (NO lleva pegado lavaplatos, lavaplatos, ni salpicadero)
- [x] Barra: Salpicadero y regrueso en los vistos (NO lleva pegado lavaplatos ni lavaplatos)
- [x] Actualizar cálculos de precio para no incluir lavaplatos en Isla y Barra


## Corrección Salpicadero Bajo vs Alto en Mesones

- [x] Cambiar "Salpicadero alto 10cm" a "Salpicadero bajo 10cm" (incluido en el precio)
- [x] Agregar opción de "Salpicadero alto" que duplica el metraje del mesón (se cobra aparte)
- [x] Actualizar cálculos de precio para incluir el costo del salpicadero alto cuando se seleccione
- [x] Aplicar esta lógica a Mesón Estándar y Barra (Isla no lleva salpicadero)


## Mejoras Configurador de Mesones - Múltiples Mesones

- [ ] Salpicadero alto excluye salpicadero bajo de la descripción de incluidos
- [ ] Implementar sistema de múltiples mesones (sub-ítems) dentro del configurador
- [ ] Botón "Agregar Mesón" para añadir mesón estándar, isla o barra adicional
- [ ] Cada sub-mesón con su propia configuración independiente
- [ ] Total consolidado de todos los mesones
- [ ] Botón para eliminar sub-mesones individuales


## Mejoras Configurador de Mesones (Enero 2026)

- [x] Salpicadero alto excluye salpicadero bajo de la descripción
- [x] Botón "Agregar Mesón" para múltiples mesones en una cotización
- [x] Soporte para Mesón Estándar + Isla + Barra en la misma cotización
- [x] Resumen de precio con desglose por mesón y total
- [x] Opciones de Isla (Laterales, Regrueso) funcionan correctamente
- [x] Cada mesón tiene configuración independiente con botón de eliminar


## Corrección UI Configurador de Mesones

- [x] Acomodar botones de agregar mesón (Mesón, Isla, Barra) dentro del recuadro del configurador


## Mejoras Vista Previa PDF de Cotizaciones

- [x] Mostrar desglose de múltiples mesones correctamente en el PDF
- [x] Aumentar tamaño de la vista previa del PDF al 100%


## Auditoría Completa del Proyecto

### Análisis de Estructura
- [x] Revisar estructura de archivos y carpetas
- [x] Analizar dependencias del package.json
- [x] Verificar imports no utilizados

### Revisión de Rutas
- [x] Auditar rutas del frontend (App.tsx)
- [x] Auditar rutas del backend (routers.ts)
- [x] Verificar consistencia entre rutas y componentes

### Detección de Errores
- [x] Buscar errores de TypeScript
- [x] Identificar código muerto o no utilizado
- [x] Verificar manejo de errores en API calls

### Análisis de Mejoras
- [x] Identificar mejoras de UX
- [x] Identificar mejoras de rendimiento
- [x] Identificar funcionalidades faltantes

### Limpieza de Código
- [x] Eliminar archivos no utilizados
- [x] Eliminar funciones/componentes muertos
- [x] Optimizar imports y dependencias


## Mejoras de Arquitectura y Calidad

### Modularización de routers.ts
- [ ] Crear carpeta server/routers/
- [ ] Extraer router de auth a server/routers/auth.ts
- [ ] Extraer router de clients a server/routers/clients.ts
- [ ] Extraer router de appointments a server/routers/appointments.ts
- [ ] Extraer router de quotations a server/routers/quotations.ts
- [ ] Extraer router de projects a server/routers/projects.ts
- [ ] Extraer router de tasks a server/routers/tasks.ts
- [ ] Extraer routers restantes
- [ ] Actualizar routers.ts principal para importar módulos

### Corrección de Tests
- [x] Corregir campo createdBy en tests de cotizaciones (299 tests pasando)

### Limpieza de Dependencias
- [x] Eliminar bcrypt y usar solo bcryptjs (bcrypt y @types/bcrypt removidos)


## Mejoras de Arquitectura - Fase 2

### Modularización de routers.ts
- [ ] Crear carpeta server/routers/
- [ ] Extraer router de auth a server/routers/auth.ts
- [ ] Extraer router de clients a server/routers/clients.ts
- [ ] Extraer router de appointments a server/routers/appointments.ts
- [ ] Extraer router de quotations a server/routers/quotations.ts
- [ ] Extraer router de projects a server/routers/projects.ts
- [ ] Extraer router de tasks a server/routers/tasks.ts
- [ ] Extraer routers restantes (reminders, system, projectPhotos, etc.)
- [ ] Actualizar routers.ts principal para importar y combinar módulos
- [ ] Verificar que todos los tests pasen después de la modularización

### Campo de Color/Referencia del Material en Mesones
- [ ] Agregar campo de color/referencia al configurador de mesones
- [ ] Incluir selector con colores comunes de Quarzo y Sinterizado
- [ ] Permitir entrada de texto libre para referencias específicas
- [ ] Mostrar color seleccionado en el resumen de precio
- [ ] Incluir color en la descripción del PDF de cotización

### Caché para Consultas Frecuentes
- [ ] Implementar caché para lista de clientes
- [ ] Implementar caché para lista de usuarios
- [ ] Agregar invalidación de caché al crear/editar/eliminar
- [ ] Verificar mejora de rendimiento


## Mejoras Portal del Cliente - Enero 2026

### Fase 1: Timeline y Aprobación de Cotizaciones
- [ ] Actualizar esquema BD con estados faltantes (adelanto_60, pago_final_40)
- [ ] Crear componente Timeline vertical para el portal del cliente
- [ ] Implementar aprobar/rechazar cotización desde el portal
- [ ] Notificar a Super Admin y Admin cuando cliente apruebe/rechace cotización

### Fase 2: Sistema de Notificaciones
- [ ] Notificaciones automáticas por cambio de estado de proyecto
- [ ] Notificar a Jefe Taller y Operario cuando inician 25 días hábiles
- [ ] Notificar a Cliente, Super Admin, Admin cuando diseñador entrega modelado (3 días plazo)

### Fase 3: Recordatorios de Plazos
- [ ] Recordatorio 3 días para diseñador (entregar modelado)
- [ ] Recordatorio 2 días para diseñador (cambios de render)
- [ ] Recordatorio 25 días hábiles para Jefe Taller y Operario
- [ ] Recordatorio 6 meses post-entrega para revisión de cocina


## Portal del Cliente - Aprobación de Cotizaciones

- [x] Mostrar botones aprobar/rechazar en cotizaciones enviadas del portal cliente
- [ ] Permitir ver detalles de cotización desde el portal cliente
- [ ] Crear proyecto automáticamente al aprobar cotización
- [ ] Verificar notificaciones al aprobar/rechazar cotización

## Creación Automática de Proyecto al Aprobar Cotización

- [x] Modificar endpoint clientApprove para crear proyecto automáticamente
- [x] Vincular proyecto con cotización aprobada
- [x] Establecer estado inicial del proyecto como "cotizacion_aprobada"
- [x] Notificar al comercial/admin sobre la aprobación
