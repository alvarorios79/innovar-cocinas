# INNOVAR Cocinas - Estructura Completa de la Aplicación

## Rutas y Páginas

| Ruta | Componente | Acceso | Descripción |
|------|-----------|--------|-------------|
| `/` | Home.tsx | Público | Landing page + formulario de agendamiento de citas |
| `/login` | Login.tsx | Público | Inicio de sesión |
| `/register` | Register.tsx | Público | Registro de usuarios |
| `/forgot-password` | ForgotPassword.tsx | Público | Recuperación de contraseña |
| `/reset-password` | ResetPassword.tsx | Público | Restablecer contraseña |
| `/gallery` | PublicGallery.tsx | Público | Galería pública de proyectos |
| `/portal` | Portal.tsx | Cliente (user) | Portal del cliente: mis citas, cotizaciones, proyectos, estimados |
| `/admin` | Admin.tsx | Admin/Super Admin | Panel de administración: clientes, cotizaciones, usuarios, herrajes |
| `/comercial` | Comercial.tsx | Comercial | Panel comercial |
| `/projects` | Projects.tsx | Equipo | Lista de proyectos |
| `/projects/:id` | ProjectDetail.tsx | Equipo | Detalle de proyecto |
| `/tasks` | Tasks.tsx | Equipo | Sistema de tareas |
| `/calendar` | InstallationCalendar.tsx | Equipo | Calendario de instalaciones |
| `/appointments-calendar` | AppointmentsCalendar.tsx | Admin | Calendario de citas |
| `/quotations` | Quotations.tsx | Equipo | Cotizaciones |
| `/pricing-config` | PricingConfig.tsx | Admin | Configuración de precios |
| `/accounting` | Accounting.tsx | Admin | Contabilidad (gastos) |

## Roles del Sistema

| Rol | Código | Descripción |
|-----|--------|-------------|
| Cliente | `user` | Clientes que agendan citas y ven su portal |
| Admin | `admin` | Administrador comercial |
| Super Admin | `super_admin` | Administrador total |
| Comercial | `comercial` | Equipo comercial |
| Diseñador | `disenador` | Diseñador 3D (acceso limitado a datos del cliente) |
| Jefe de Taller | `jefe_taller` | Jefe de producción |
| Operario | `operario` | Operario de producción |

## Componentes Principales

### Layout y Navegación
- `DashboardLayout.tsx` - Layout con sidebar para panel de admin
- `MobileNav.tsx` - Navegación móvil
- `WhatsAppButton.tsx` - Botón flotante de WhatsApp
- `NotificationBell.tsx` - Campana de notificaciones

### Citas
- `VisualCalendar.tsx` - Calendario visual con restricciones (días permitidos: Mar/Jue/Vie, festivos, horarios)
- `AppointmentScheduler.tsx` - Programador de citas

### Proyectos
- `ProjectCard.tsx` - Tarjeta de proyecto
- `ProjectInlineDetail.tsx` - Detalle inline del proyecto
- `ProjectTimeline.tsx` - Timeline de seguimiento del proyecto
- `PhotoUploader.tsx` - Subida de fotos por etapa
- `DesignerChecklist.tsx` - Checklist del diseñador
- `ProductionCalendar.tsx` - Calendario de producción
- `OperarioDashboard.tsx` - Dashboard del operario
- `OperatorDailyProjects.tsx` - Proyectos diarios del operario

### Cotizaciones
- `KitchenConfigurator.tsx` - Configurador de cocinas
- `ClosetConfigurator.tsx` - Configurador de closets
- `DoorConfigurator.tsx` - Configurador de puertas
- `TVCenterConfigurator.tsx` - Configurador de centros de TV
- `CountertopConfigurator.tsx` - Configurador de mesones
- `HardwareSelector.tsx` - Selector de herrajes
- `HardwareSelectorForQuotation.tsx` - Selector de herrajes para cotización
- `HardwareCatalogAdmin.tsx` - Admin del catálogo de herrajes
- `PDFContentEditor.tsx` - Editor de contenido PDF
- `PDFPreviewDialog.tsx` - Vista previa de PDF
- `PDFPreviewBeforeSave.tsx` - Vista previa antes de guardar

### Materiales
- `MaterialsForm.tsx` - Formulario de materiales
- `ClientMaterialsView.tsx` - Vista de materiales para el cliente

### Otros
- `TeamDashboard.tsx` - Dashboard del equipo
- `DailyMotivation.tsx` - Motivación diaria
- `RemindersPanel.tsx` - Panel de recordatorios
- `ImageViewer.tsx` / `FileViewer.tsx` - Visualizadores
- `LazyImage.tsx` / `WatermarkedImage.tsx` - Imágenes optimizadas

## Tablas de Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema (todos los roles) |
| `clients` | Clientes de INNOVAR |
| `appointments` | Citas agendadas |
| `appointmentWorkTypes` | Tipos de trabajo por cita (muchos a muchos) |
| `advisoryRequests` | Solicitudes de asesoría telefónica |
| `priorEstimates` | Estimados previos |
| `quotations` | Cotizaciones |
| `quotationItems` | Items de cotización |
| `kitchenQuotations` | Detalle de cotización de cocinas |
| `projects` | Proyectos de fabricación |
| `projectPhotos` | Fotos por etapa del proyecto |
| `projectDetails` | Detalles importantes del proyecto |
| `projectMaterials` | Materiales del proyecto |
| `projectHardwareSelections` | Herrajes seleccionados |
| `projectPayments` | Pagos del proyecto |
| `projectStatusHistory` | Historial de cambios de estado |
| `tasks` | Sistema de tareas |
| `notifications` | Notificaciones del sistema |
| `pushSubscriptions` | Suscripciones push |
| `reminders` | Recordatorios automáticos |
| `colombianHolidays` | Festivos colombianos |
| `hardwareCatalog` | Catálogo de herrajes |
| `pricingConfig` | Configuración de precios |
| `pricingHistory` | Historial de cambios de precios |
| `expenses` | Gastos (contabilidad) |
| `clientRevisionHistory` | Historial de revisiones del cliente |

## Flujos de Citas (Reagendamiento)

### Lugares donde se puede reagendar:
1. **Portal del cliente** (`Portal.tsx` línea ~930-966) - Botón "Reagendar" en la sección "Mis Citas"
   - USA: `trpc.appointments.reschedule` mutation
   - PROBLEMA: Usa `<Input type="datetime-local">` sin restricciones
2. **Calendario de citas admin** (`AppointmentsCalendar.tsx`) - Diálogo de edición de fecha
   - USA: `trpc.appointments.updateDate` mutation
   - CORREGIDO: Ya usa `VisualCalendar`

## Archivos del Servidor

### Servicios principales
- `routers.ts` - Router principal tRPC (todas las procedures)
- `db.ts` - Helpers de base de datos
- `availability.ts` - Lógica de disponibilidad de horarios
- `business-days.ts` - Cálculo de días hábiles

### Comunicaciones
- `whatsapp-cloud.ts` - WhatsApp Cloud API (plantillas)
- `whatsapp.ts` - WhatsApp helpers
- `whatsapp-notifications.ts` - Notificaciones WhatsApp
- `whatsapp-team-notifications.ts` - Notificaciones al equipo
- `email.ts` - Servicio de email
- `email-templates.ts` - Plantillas de email
- `push-notifications.ts` - Notificaciones push

### PDF y Cotizaciones
- `pdf-generator.ts` / `pdf-generator-pdfkit.ts` - Generadores de PDF
- `quotation-pdf-generator.ts` - PDF de cotizaciones
- `pdf-storage.ts` - Almacenamiento de PDFs

### Servicios automáticos
- `appointment-reminder-service.ts` - Recordatorios de citas
- `deadline-reminders.ts` - Recordatorios de plazos
- `reminders-service.ts` - Servicio de recordatorios
- `task-auto-reminders.ts` - Recordatorios automáticos de tareas
- `overdue-changes-service.ts` - Servicio de cambios vencidos
- `birthday-service.ts` - Servicio de cumpleaños

### Autenticación
- `password-auth.ts` - Autenticación por contraseña
- `password-generator.ts` - Generador de contraseñas

### Utilidades
- `image-utils.ts` - Utilidades de imagen
- `storage.ts` - S3 storage helpers
