import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Roles: user (cliente), admin, super_admin, comercial, diseñador, jefe_taller, operario
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordResetToken: varchar("passwordResetToken", { length: 100 }),
  passwordResetExpires: timestamp("passwordResetExpires"),
  role: mysqlEnum("role", ["user", "admin", "super_admin", "comercial", "disenador", "jefe_taller", "operario"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clientes de INNOVAR Cocinas
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  whatsappPhone: varchar("whatsappPhone", { length: 20 }).notNull(),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Citas agendadas por clientes
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  scheduledDate: timestamp("scheduledDate"),
  status: mysqlEnum("status", ["pendiente", "confirmada", "completada", "cancelada"]).default("pendiente").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Tipos de trabajo asociados a cada cita (relación muchos a muchos)
 */
export const appointmentWorkTypes = mysqlTable("appointmentWorkTypes", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppointmentWorkType = typeof appointmentWorkTypes.$inferSelect;
export type InsertAppointmentWorkType = typeof appointmentWorkTypes.$inferInsert;

/**
 * Solicitudes de asesoramiento telefónico
 */
export const advisoryRequests = mysqlTable("advisoryRequests", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  status: mysqlEnum("status", ["pendiente", "contactado", "completado"]).default("pendiente").notNull(),
  preferredCallTime: text("preferredCallTime"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdvisoryRequest = typeof advisoryRequests.$inferSelect;
export type InsertAdvisoryRequest = typeof advisoryRequests.$inferInsert;

/**
 * Estimados previos opcionales
 */
export const priorEstimates = mysqlTable("priorEstimates", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  kitchenShape: mysqlEnum("kitchenShape", ["L", "U", "lineal"]),
  linearLength: decimal("linearLength", { precision: 10, scale: 2 }),
  height: decimal("height", { precision: 10, scale: 2 }),
  materialType: mysqlEnum("materialType", ["quarzone", "sinterizado"]),
  additionalDetails: text("additionalDetails"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriorEstimate = typeof priorEstimates.$inferSelect;
export type InsertPriorEstimate = typeof priorEstimates.$inferInsert;

/**
 * Cotizaciones generadas por administradores
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotationNumber", { length: 50 }).notNull().unique(), // COT-2026-620
  clientId: int("clientId").notNull().references(() => clients.id),
  vendorName: varchar("vendorName", { length: 255 }).notNull(), // Alvaro Gutierrez / Martha Serna
  workType: text("workType").notNull(), // Texto libre: "Cocina Integral", "Puertas", etc.
  status: mysqlEnum("status", ["draft", "sent", "approved", "rejected"]).default("draft").notNull(),
  validUntil: timestamp("validUntil"), // Fecha + 7 días
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  fixedCosts: decimal("fixedCosts", { precision: 12, scale: 2 }).default("600000").notNull(), // Transporte + imprevistos
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  pdfUrl: text("pdfUrl"), // URL del PDF generado en S3
  sentAt: timestamp("sentAt"), // Fecha de envío
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * Items de cada cotización (estructura flexible)
 */
export const quotationItems = mysqlTable("quotationItems", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  itemNumber: int("itemNumber").notNull(), // 1, 2, 3...
  description: text("description").notNull(), // Descripción detallada con formato
  quantity: varchar("quantity", { length: 50 }).notNull(), // "1", "4.5 ml", etc.
  unitPrice: varchar("unitPrice", { length: 50 }), // "$850,000" o vacío
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;

/**
 * Proyectos de fabricación
 * Estados del flujo: pendiente → aprobado_diseno → en_diseno → pendiente_cliente → 
 *                    corte → enchape → ensamble → listo_instalacion → entregado
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").references(() => quotations.id),
  clientId: int("clientId").notNull().references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  status: mysqlEnum("status", [
    "cotizacion_enviada",  // Cotización enviada, esperando respuesta
    "cotizacion_aprobada", // Cliente aprobó cotización, esperando adelanto
    "adelanto_recibido",   // Adelanto recibido, inicia diseño (3 días hábiles)
    "en_diseno",           // Diseñador trabajando
    "pendiente_cliente",   // Esperando aprobación del cliente (5 días máx)
    "aprobacion_final",    // Cliente aprobó diseño, inician 25 días hábiles
    "despiece",            // Realizando despiece
    "corte",               // En producción - etapa corte
    "enchape",             // En producción - etapa enchape
    "ensamble",            // En producción - etapa ensamble
    "listo_instalacion",   // Listo para instalar
    "instalacion_programada", // Instalación programada en calendario
    "entregado"            // Proyecto completado
  ]).default("cotizacion_enviada").notNull(),
  
  // Medidas iniciales
  initialMeasurements: text("initialMeasurements"),
  // Archivos de diseño 3D (URLs separadas por coma)
  design3dFiles: text("design3dFiles"),
  // Archivos de despiece (URLs separadas por coma)
  despieceFiles: text("despieceFiles"),
  
  // === FECHAS CLAVE DE RUTA INNOVAR ===
  // Fecha de envío de cotización
  quotationSentAt: timestamp("quotationSentAt"),
  // Fecha de aprobación de cotización por el cliente
  quotationApprovedAt: timestamp("quotationApprovedAt"),
  // Fecha de recepción del adelanto (inicia contador de 3 días para diseño)
  advanceReceivedAt: timestamp("advanceReceivedAt"),
  // Monto del adelanto
  advanceAmount: decimal("advanceAmount", { precision: 12, scale: 2 }),
  // Fecha límite para entregar diseño (3 días hábiles desde adelanto)
  designDeadline: timestamp("designDeadline"),
  // Fecha de entrega del diseño al cliente
  designDeliveredAt: timestamp("designDeliveredAt"),
  // Fecha de aprobación final del cliente (inicia 25 días hábiles)
  clientApprovedAt: timestamp("clientApprovedAt"),
  clientApprovalNotes: text("clientApprovalNotes"),
  // Selección de colores y materiales
  selectedColors: text("selectedColors"),
  selectedMaterials: text("selectedMaterials"),
  // Fecha estimada de instalación (25 días hábiles desde aprobación final)
  estimatedInstallDate: timestamp("estimatedInstallDate"),
  // Fecha real programada de instalación
  scheduledInstallDate: timestamp("scheduledInstallDate"),
  // Duración estimada de instalación (en días)
  installDurationDays: int("installDurationDays").default(1),
  // Fecha de entrega real
  deliveredAt: timestamp("deliveredAt"),
  
  // Responsables
  createdBy: int("createdBy").notNull().references(() => users.id),
  designerId: int("designerId").references(() => users.id),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Fotos del proyecto organizadas por etapa
 */
export const projectPhotos = mysqlTable("projectPhotos", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  stage: mysqlEnum("stage", [
    "inicial",      // Fotos iniciales (medidas, sitio)
    "diseno",       // Fotos/renders del diseño
    "corte",        // Fotos de producción - corte
    "enchape",      // Fotos de producción - enchape
    "ensamble",     // Fotos de producción - ensamble
    "final"         // Fotos del producto terminado
  ]).notNull(),
  category: mysqlEnum("category", [
    "cotizacion",   // Documento de cotización
    "medidas",      // Documentos de medidas (GoodNotes, PDFs)
    "disenos",      // Diseños 3D, renders, planos
    "avance",       // Fotos de avance de producción
    "instalacion", // Fotos de instalación
    "entrega"       // Fotos de entrega final
  ]).default("medidas").notNull(),
  subcategory: mysqlEnum("subcategory", [
    // Medidas
    "fotos_iniciales",
    "dibujo",
    // Diseños
    "renders",
    "despieces",
    "detalles",
    // Avance
    "corte",
    "enchape",
    "armado",
    // Instalación
    "proceso_instalacion",
    // Entrega
    "fotos_finales",
    // Cotización
    "documento_cotizacion"
  ]),
  photoUrl: text("photoUrl").notNull(),
  description: text("description"),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectPhoto = typeof projectPhotos.$inferSelect;
export type InsertProjectPhoto = typeof projectPhotos.$inferInsert;

/**
 * Detalles importantes del proyecto
 * Visible para: Diseñador, Jefe de Taller, Operario
 * Contiene: medidas especiales, notas importantes, fotos de referencia
 */
export const projectDetails = mysqlTable("projectDetails", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  type: mysqlEnum("type", ["medida_especial", "nota_importante", "foto_referencia"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  photoUrl: text("photoUrl"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectDetail = typeof projectDetails.$inferSelect;
export type InsertProjectDetail = typeof projectDetails.$inferInsert;

/**
 * Sistema de tareas
 * Permisos de asignación:
 * - super_admin: puede asignar a todos
 * - admin: puede asignar a diseñador, jefe_taller, operario
 * - diseñador: puede asignar a jefe_taller, operario
 * - jefe_taller: puede asignar a admin, diseñador, operario
 * - operario: puede asignar a diseñador, jefe_taller
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").references(() => projects.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["alta", "media", "baja"]).default("media").notNull(),
  status: mysqlEnum("status", ["pendiente", "en_progreso", "completada"]).default("pendiente").notNull(),
  dueDate: timestamp("dueDate"),
  assignedTo: int("assignedTo").notNull().references(() => users.id),
  assignedBy: int("assignedBy").notNull().references(() => users.id),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Historial de cambios de estado del proyecto
 */
export const projectStatusHistory = mysqlTable("projectStatusHistory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  fromStatus: varchar("fromStatus", { length: 50 }),
  toStatus: varchar("toStatus", { length: 50 }).notNull(),
  changedBy: int("changedBy").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectStatusHistory = typeof projectStatusHistory.$inferSelect;
export type InsertProjectStatusHistory = typeof projectStatusHistory.$inferInsert;


/**
 * Suscripciones a notificaciones push
 */
export const pushSubscriptions = mysqlTable("pushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Notificaciones del sistema
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: mysqlEnum("type", ["proyecto", "tarea", "cita", "cotizacion", "sistema"]).default("sistema").notNull(),
  referenceId: int("referenceId"),
  referenceType: varchar("referenceType", { length: 50 }),
  read: boolean("read").default(false).notNull(),
  sentPush: boolean("sentPush").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Festivos colombianos para cálculo de días hábiles
 */
export const colombianHolidays = mysqlTable("colombianHolidays", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  year: int("year").notNull(),
});

export type ColombianHoliday = typeof colombianHolidays.$inferSelect;
export type InsertColombianHoliday = typeof colombianHolidays.$inferInsert;

/**
 * Recordatorios automáticos del sistema
 */
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  type: mysqlEnum("type", [
    "cotizacion_sin_respuesta",  // 2 días sin respuesta a cotización
    "diseno_pendiente",          // 3 días para entregar diseño
    "aprobacion_pendiente",      // 5 días esperando aprobación del cliente
    "produccion_retrasada",      // Producción retrasada
    "instalacion_proxima"        // Instalación próxima (3 días antes)
  ]).notNull(),
  assignedTo: int("assignedTo").notNull().references(() => users.id),
  dueDate: timestamp("dueDate").notNull(),
  status: mysqlEnum("status", ["pendiente", "enviado", "completado", "cancelado"]).default("pendiente").notNull(),
  message: text("message"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;


/**
 * Catálogo de herrajes con fotos fijas
 * Categorías: cocinas, closets, puertas
 */
export const hardwareCatalog = mysqlTable("hardwareCatalog", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["cocinas", "closets", "puertas"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  options: text("options"), // JSON con opciones disponibles
  photoUrl: text("photoUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HardwareCatalog = typeof hardwareCatalog.$inferSelect;
export type InsertHardwareCatalog = typeof hardwareCatalog.$inferInsert;

/**
 * Materiales base del proyecto (Madera, Mesón, Lavaplatos)
 */
export const projectMaterials = mysqlTable("projectMaterials", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  
  // Madera
  woodType: mysqlEnum("woodType", ["rh", "estandar"]),
  woodColor: varchar("woodColor", { length: 255 }),
  woodPhotoUrl: text("woodPhotoUrl"),
  
  // Mesón
  countertopType: mysqlEnum("countertopType", ["granito", "cuarzo", "sinterizado"]),
  countertopName: varchar("countertopName", { length: 255 }),
  countertopPhotoUrl: text("countertopPhotoUrl"),
  
  // Lavaplatos
  sinkMeasure: varchar("sinkMeasure", { length: 100 }),
  sinkPhotoUrl: text("sinkPhotoUrl"),
  
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectMaterial = typeof projectMaterials.$inferSelect;
export type InsertProjectMaterial = typeof projectMaterials.$inferInsert;

/**
 * Herrajes seleccionados para cada proyecto
 */
export const projectHardwareSelections = mysqlTable("projectHardwareSelections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  hardwareId: int("hardwareId").notNull().references(() => hardwareCatalog.id),
  selectedOption: text("selectedOption"), // Opción específica seleccionada
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectHardwareSelection = typeof projectHardwareSelections.$inferSelect;
export type InsertProjectHardwareSelection = typeof projectHardwareSelections.$inferInsert;
