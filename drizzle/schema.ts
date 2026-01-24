import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

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
 * Cotizaciones - Tabla principal
 * Arquitectura robusta que soporta múltiples tipos de productos
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotationNumber", { length: 50 }).notNull().unique(), // COT-2026-001
  clientId: int("clientId").notNull().references(() => clients.id),
  vendorName: varchar("vendorName", { length: 255 }).notNull(),
  productType: mysqlEnum("productType", ["cocina", "closet", "puerta", "centro_tv", "herrajes", "mesones", "otro"]).default("otro").notNull(),
  status: mysqlEnum("status", ["draft", "sent", "approved", "rejected"]).default("draft").notNull(),
  validUntil: timestamp("validUntil"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  transportCost: decimal("transportCost", { precision: 12, scale: 2 }).default("600000").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  pdfUrl: text("pdfUrl"),
  sentAt: timestamp("sentAt"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

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
  // URL del comprobante de pago del adelanto
  advanceReceiptUrl: text("advanceReceiptUrl"),
  // URL del PDF de la cotización aprobada
  quotationPdfUrl: text("quotationPdfUrl"),
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
    "modelado",
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
  price: decimal("price", { precision: 12, scale: 2 }).default("0").notNull(),
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
  quantity: int("quantity").default(1).notNull(), // Cantidad seleccionada
  priceAtQuotation: decimal("priceAtQuotation", { precision: 10, scale: 2 }), // Precio histórico al momento de la cotización
  selectedOption: text("selectedOption"), // Opción específica seleccionada
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectHardwareSelection = typeof projectHardwareSelections.$inferSelect;
export type InsertProjectHardwareSelection = typeof projectHardwareSelections.$inferInsert;


/**
/**
 * Cotizaciones de Cocinas - Estructura detallada
 * Todos los componentes de una cocina integral
 */
export const kitchenQuotations = mysqlTable("kitchenQuotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  
  // Forma de la cocina
  shape: mysqlEnum("shape", ["L", "U", "lineal"]).notNull(),
  
  // Metraje
  totalMeters: decimal("totalMeters", { precision: 10, scale: 2 }).notNull(),
  resultingMeters: decimal("resultingMeters", { precision: 10, scale: 2 }).notNull(),
  
  // Muebles lineales
  lowerCabinetsMeters: decimal("lowerCabinetsMeters", { precision: 10, scale: 2 }).notNull(),
  lowerCabinetsPrice: decimal("lowerCabinetsPrice", { precision: 12, scale: 2 }).notNull(),
  upperCabinetsMeters: decimal("upperCabinetsMeters", { precision: 10, scale: 2 }).notNull(),
  upperCabinetsPrice: decimal("upperCabinetsPrice", { precision: 12, scale: 2 }).notNull(),
  
  // Muebles especiales
  hasNichoNevecon: boolean("hasNichoNevecon").default(false).notNull(),
  nichoNeveconPrice: decimal("nichoNeveconPrice", { precision: 12, scale: 2 }),
  hasNichoNeveraStandard: boolean("hasNichoNeveraStandard").default(false).notNull(),
  nichoNeveraStandardPrice: decimal("nichoNeveraStandardPrice", { precision: 12, scale: 2 }),
  hasAlacenaEntrepanos: boolean("hasAlacenaEntrepanos").default(false).notNull(),
  alacenaEntrepanosPrice: decimal("alacenaEntrepanosPrice", { precision: 12, scale: 2 }),
  hasAlacenaHerraje: boolean("hasAlacenaHerraje").default(false).notNull(),
  alacenaHerrajePrice: decimal("alacenaHerrajePrice", { precision: 12, scale: 2 }),
  hasHerrajeItem: boolean("hasHerrajeItem").default(false).notNull(),
  herrajePrice: decimal("herrajePrice", { precision: 12, scale: 2 }),
  hasTorreHornos: boolean("hasTorreHornos").default(false).notNull(),
  torreHornosPrice: decimal("torreHornosPrice", { precision: 12, scale: 2 }),
  
  // Mesón principal
  countertopType: mysqlEnum("countertopType", ["quarzone", "sinterizado"]).notNull(),
  countertopMeters: decimal("countertopMeters", { precision: 10, scale: 2 }).notNull(),
  countertopSurcharge30: boolean("countertopSurcharge30").default(false).notNull(),
  countertopDouble: boolean("countertopDouble").default(false).notNull(),
  countertopPrice: decimal("countertopPrice", { precision: 12, scale: 2 }).notNull(),
  
  // Isla
  hasIsland: boolean("hasIsland").default(false).notNull(),
  islandCabinetsMeters: decimal("islandCabinetsMeters", { precision: 10, scale: 2 }),
  islandCabinetsPrice: decimal("islandCabinetsPrice", { precision: 12, scale: 2 }),
  islandCountertopMeters: decimal("islandCountertopMeters", { precision: 10, scale: 2 }),
  islandCountertopType: mysqlEnum("islandCountertopType", ["quarzone", "sinterizado"]),
  islandCountertopPrice: decimal("islandCountertopPrice", { precision: 12, scale: 2 }),
  islandHasLaterals: boolean("islandHasLaterals").default(false).notNull(),
  islandLateralPrice: decimal("islandLateralPrice", { precision: 12, scale: 2 }),
  islandRegruesoPrice: decimal("islandRegruesoPrice", { precision: 12, scale: 2 }),
  islandTotalPrice: decimal("islandTotalPrice", { precision: 12, scale: 2 }),
  
  // Barra
  hasBar: boolean("hasBar").default(false).notNull(),
  barCabinetsMeters: decimal("barCabinetsMeters", { precision: 10, scale: 2 }),
  barCabinetsPrice: decimal("barCabinetsPrice", { precision: 12, scale: 2 }),
  barCountertopMeters: decimal("barCountertopMeters", { precision: 10, scale: 2 }),
  barCountertopType: mysqlEnum("barCountertopType", ["quarzone", "sinterizado"]),
  barCountertopPrice: decimal("barCountertopPrice", { precision: 12, scale: 2 }),
  barHasLateral: boolean("barHasLateral").default(false).notNull(),
  barLateralPrice: decimal("barLateralPrice", { precision: 12, scale: 2 }),
  barTotalPrice: decimal("barTotalPrice", { precision: 12, scale: 2 }),
  
  // Luz LED
  hasLed: boolean("hasLed").default(false).notNull(),
  ledMeters: decimal("ledMeters", { precision: 10, scale: 2 }),
  ledPrice: decimal("ledPrice", { precision: 12, scale: 2 }),
  
  // Costos fijos
  transportCost: decimal("transportCost", { precision: 12, scale: 2 }).default("600000").notNull(),
  
  // Total
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KitchenQuotation = typeof kitchenQuotations.$inferSelect;
export type InsertKitchenQuotation = typeof kitchenQuotations.$inferInsert;

// Tabla de items de cotizaciones
export const quotationItems = mysqlTable("quotationItems", {
  id: int("id").primaryKey().autoincrement(),
  quotationId: int("quotationId").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  itemNumber: int("itemNumber").notNull(),
  itemType: varchar("itemType", { length: 50 }).notNull(),
  description: text("description").notNull(),
  quantity: varchar("quantity", { length: 50 }).notNull(),
  unitPrice: varchar("unitPrice", { length: 50 }),
  totalPrice: varchar("totalPrice", { length: 50 }).notNull(),
  includesFixedCosts: boolean("includesFixedCosts").default(false).notNull(),
  fixedCostsAmount: int("fixedCostsAmount"),
  kitchenConfig: json("kitchenConfig"),
  hardwareSelections: json("hardwareSelections"), // Array de { hardwareId, name, price, quantity, subtotal }
  closetConfig: json("closetConfig"), // { type, width, height, doorType, squareMeters, pricePerSquareMeter, subtotal }
  doorConfig: json("doorConfig"), // { type, widthRange, width, height, quantity, hardwareColor, pricePerUnit, subtotal, notes }
  tvCenterConfig: json("tvCenterConfig"), // { width, basePrice, hasHighGloss, hasLedLights, floatingShelves, equipmentSpaces, includeTransport, transportCost, notes, subtotal }
  countertopConfig: json("countertopConfig"), // { material, tipo, metrosLineales, fondo, precioML, incluyeLaterales, incluyeRegrueso, alturaLateral, subtotalMeson, subtotalLaterales, subtotalRegrueso, subtotalLavaplatos, total, notes, includeTransport, transportCost }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;


/**
 * Historial de pagos de proyectos
 */
export const projectPayments = mysqlTable("projectPayments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["adelanto", "saldo_final", "abono", "otro"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("paymentDate").notNull(),
  receiptUrl: text("receiptUrl"),
  notes: text("notes"),
  registeredBy: int("registeredBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectPayment = typeof projectPayments.$inferSelect;
export type InsertProjectPayment = typeof projectPayments.$inferInsert;
