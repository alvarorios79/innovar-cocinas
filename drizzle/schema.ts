import { pgTable, pgEnum, index, bigint, integer, text, foreignKey, serial, decimal, timestamp, varchar, date, json, smallint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ── ENUMS ─────────────────────────────────────────────────────────────────────
export const workTypeEnum = pgEnum('work_type', ['cocina', 'closet', 'puertas', 'centro_tv']);
export const dataOriginEnum = pgEnum('data_origin', ['manual', 'system']);
export const dataOriginWithTestEnum = pgEnum('data_origin_with_test', ['manual', 'system', 'test']);
export const opExpenseCategoryEnum = pgEnum('op_expense_category', ['arriendo', 'energia', 'agua', 'internet', 'mantenimiento', 'herramientas', 'jardineria', 'reparaciones', 'transporte', 'papeleria', 'aseo', 'nomina', 'cortesia_cliente', 'gasolina_vehiculos', 'mantenimiento_moto', 'mantenimiento_bodega', 'mantenimiento_maquinaria', 'otro']);
export const closureStatusEnum = pgEnum('closure_status', ['draft', 'confirmed']);
export const advisoryStatusEnum = pgEnum('advisory_status', ['pendiente', 'contactado', 'completado']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['pendiente', 'confirmada', 'completada', 'cancelada']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete', 'restore']);
export const backupTypeEnum = pgEnum('backup_type', ['daily', 'weekly', 'manual']);
export const backupStatusEnum = pgEnum('backup_status', ['pending', 'completed', 'failed', 'verified']);
export const verificationStatusEnum = pgEnum('verification_status', ['not_verified', 'verified', 'failed']);
export const clientRevisionTypeEnum = pgEnum('client_revision_type', ['modelado_3d', 'renders']);
export const expenseTypeEnum = pgEnum('expense_type', ['materiales_proyecto', 'gasto_operativo']);
export const generalCategoryEnum = pgEnum('general_category', ['materiales', 'mano_de_obra', 'alquiler', 'servicios', 'transporte', 'mantenimiento', 'otros']);
export const financialAlertTypeEnum = pgEnum('financial_alert_type', ['deliveredWithOutstanding', 'lowCollectionRate']);
export const hardwareCategoryEnum = pgEnum('hardware_category', ['cocinas', 'closets', 'puertas']);
export const kitchenShapeEnum = pgEnum('kitchen_shape', ['L', 'U', 'lineal']);
export const countertopTypeEnum = pgEnum('countertop_type', ['quarzone', 'sinterizado']);
export const notificationTypeEnum = pgEnum('notification_type', ['proyecto', 'tarea', 'cita', 'cotizacion', 'sistema']);
export const paymentTypeEnum = pgEnum('payment_type', ['advance', 'final', 'partial', 'other']);
export const pricingCategoryEnum = pgEnum('pricing_category', ['cocina_base', 'mesones', 'muebles_especiales', 'extras', 'puertas_tapas', 'herrajes', 'closets', 'puertas_producto', 'centros_tv', 'otros', 'acabados_especiales']);
export const woodTypeEnum = pgEnum('wood_type', ['rh', 'estandar']);
export const countertopMaterialEnum = pgEnum('countertop_material', ['granito', 'cuarzo', 'sinterizado']);
export const projectPaymentTypeEnum = pgEnum('project_payment_type', ['adelanto', 'saldo_final', 'abono', 'otro']);
export const photoStageEnum = pgEnum('photo_stage', ['inicial', 'diseno', 'corte', 'enchape', 'ensamble', 'final']);
export const photoCategoryEnum = pgEnum('photo_category', ['cotizacion', 'medidas', 'disenos', 'avance', 'instalacion', 'entrega']);
export const photoSubcategoryEnum = pgEnum('photo_subcategory', ['fotos_iniciales', 'dibujo', 'renders', 'despieces', 'detalles', 'modelado', 'modelado_3d', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales', 'documento_cotizacion']);
export const projectStatusEnum = pgEnum('project_status', ['contacto', 'cotizacion_enviada', 'cotizacion_aprobada', 'adelanto_recibido', 'en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece', 'corte', 'enchape', 'ensamble', 'listo_instalacion', 'entregado']);
export const productTypeEnum = pgEnum('product_type', ['cocina', 'closet', 'puerta', 'centro_tv', 'herrajes', 'mesones', 'acabados_especiales', 'otro']);
export const quotationStatusEnum = pgEnum('quotation_status', ['draft', 'sent', 'approved', 'rejected']);
export const clientResponseStatusEnum = pgEnum('client_response_status', ['aprobado', 'rechazado', 'revision']);
export const reminderTypeEnum = pgEnum('reminder_type', ['cotizacion_sin_respuesta', 'diseno_pendiente', 'aprobacion_pendiente', 'produccion_retrasada', 'instalacion_proxima']);
export const reminderStatusEnum = pgEnum('reminder_status', ['pendiente', 'enviado', 'completado', 'cancelado']);
export const taskPriorityEnum = pgEnum('task_priority', ['alta', 'media', 'baja']);
export const taskStatusEnum = pgEnum('task_status', ['pendiente', 'en_progreso', 'completada']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'super_admin', 'comercial', 'disenador', 'jefe_taller', 'operario', 'medidor']);
export const closureAuditActionEnum = pgEnum('closure_audit_action', ['created', 'confirmed', 'deleted']);
export const projectDetailTypeEnum = pgEnum('project_detail_type', ['medida_especial', 'nota_importante', 'foto_referencia']);
export const postventaTypeEnum = pgEnum('postventa_type', ['reclamacion', 'seguimiento_30d', 'revision_anual']);
export const postventaStatusEnum = pgEnum('postventa_status', ['pendiente', 'en_revision', 'resuelto', 'no_procede']);

// ── TABLES ────────────────────────────────────────────────────────────────────

export const drizzleMigrations = pgTable("__drizzle_migrations__", {
	id: serial().primaryKey(),
	hash: text().notNull(),
	createdAt: bigint("created_at", { mode: "number" }),
},
(table) => [
	index("drizzle_id_idx").on(table.id),
]);

export const accountingClosureOperationalExpenses = pgTable("accounting_op_expenses", {
	id: serial().primaryKey(),
	closureId: integer().notNull().references(() => accountingClosures.id, { onDelete: "cascade" }),
	expenseId: integer().notNull().references(() => expenses.id),
	category: opExpenseCategoryEnum().notNull(),
	description: text().notNull(),
	amount: decimal({ precision: 12, scale: 2 }).notNull(),
	expenseDate: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("accountingClosureOperationalExpenses_closureId_idx").on(table.closureId),
	index("accountingClosureOperationalExpenses_expenseId_idx").on(table.expenseId),
	index("accountingClosureOperationalExpenses_category_idx").on(table.category),
]);

export const accountingClosureProjects = pgTable("accountingClosureProjects", {
	id: serial().primaryKey(),
	closureId: integer().notNull().references(() => accountingClosures.id, { onDelete: "cascade" }),
	projectId: integer().notNull().references(() => projects.id),
	projectName: varchar({ length: 255 }).notNull(),
	projectValue: decimal({ precision: 15, scale: 2 }).notNull(),
	totalPaid: decimal({ precision: 15, scale: 2 }).notNull(),
	totalExpenses: decimal({ precision: 15, scale: 2 }).notNull(),
	profit: decimal({ length: 15, scale: 2 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("accountingClosureProjects_closureId_idx").on(table.closureId),
	index("accountingClosureProjects_projectId_idx").on(table.projectId),
]);

export const accountingClosures = pgTable("accountingClosures", {
	id: serial().primaryKey(),
	periodStart: date({ mode: 'string' }).notNull(),
	periodEnd: date({ mode: 'string' }).notNull(),
	status: closureStatusEnum().default('draft').notNull(),
	createdBy: integer().notNull().references(() => users.id),
	confirmedBy: integer(),
	totalSales: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	totalExpenses: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	totalProfit: decimal({ precision: 15, scale: 2 }).default('0').notNull(),
	projectCount: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	confirmedAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("accountingClosures_status_idx").on(table.status),
	index("accountingClosures_createdBy_idx").on(table.createdBy),
	index("accountingClosures_periodStart_idx").on(table.periodStart),
	index("accountingClosures_periodEnd_idx").on(table.periodEnd),
]);

export const advisoryRequests = pgTable("advisoryRequests", {
	id: serial().primaryKey(),
	clientId: integer().notNull().references(() => clients.id),
	workType: workTypeEnum().notNull(),
	status: advisoryStatusEnum().default('pendiente').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	preferredCallTime: text(),
},
(table) => [
	index("advisoryRequests_clientId_idx").on(table.clientId),
	index("advisoryRequests_status_idx").on(table.status),
]);

export const appointmentWorkTypes = pgTable("appointmentWorkTypes", {
	id: serial().primaryKey(),
	appointmentId: integer().notNull().references(() => appointments.id, { onDelete: "cascade" }),
	workType: workTypeEnum().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("appointmentWorkTypes_appointmentId_idx").on(table.appointmentId),
]);

export const appointments = pgTable("appointments", {
	id: serial().primaryKey(),
	clientId: integer().notNull().references(() => clients.id),
	scheduledDate: timestamp({ mode: 'string' }),
	status: appointmentStatusEnum().default('pendiente').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	dataOrigin: dataOriginEnum().default('manual').notNull(),
},
(table) => [
	index("appointments_clientId_idx").on(table.clientId),
	index("appointments_scheduledDate_idx").on(table.scheduledDate),
	index("appointments_status_idx").on(table.status),
	index("appointments_client_status_idx").on(table.clientId, table.status),
]);

export const auditLogs = pgTable("auditLogs", {
	id: serial().primaryKey(),
	userId: integer().notNull().references(() => users.id),
	action: auditActionEnum().notNull(),
	tableName: varchar({ length: 100 }).notNull(),
	recordId: integer().notNull(),
	changes: json(),
	changesSummary: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
},
(table) => [
	index("auditLogs_userId_idx").on(table.userId),
	index("auditLogs_tableName_idx").on(table.tableName),
	index("auditLogs_recordId_idx").on(table.recordId),
	index("auditLogs_action_idx").on(table.action),
	index("auditLogs_createdAt_idx").on(table.createdAt),
	index("auditLogs_tableName_recordId_idx").on(table.tableName, table.recordId),
]);

export const backupMetadata = pgTable("backupMetadata", {
	id: serial().primaryKey(),
	backupName: varchar({ length: 255 }).notNull(),
	backupType: backupTypeEnum().notNull(),
	s3Key: varchar({ length: 500 }).notNull(),
	s3Url: text().notNull(),
	fileSize: bigint({ mode: "number" }),
	rowCounts: json(),
	checksums: json(),
	status: backupStatusEnum().default('pending').notNull(),
	verificationStatus: verificationStatusEnum().default('not_verified').notNull(),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp({ mode: 'string' }),
	verifiedAt: timestamp({ mode: 'string' }),
	expiresAt: timestamp({ mode: 'string' }),
	createdBy: integer().references(() => users.id),
	retentionDays: integer().default(30).notNull(),
	dataOriginSummary: json(),
},
(table) => [
	index("backupMetadata_status_idx").on(table.status),
	index("backupMetadata_backupType_idx").on(table.backupType),
	index("backupMetadata_createdAt_idx").on(table.createdAt),
	index("backupMetadata_expiresAt_idx").on(table.expiresAt),
]);

export const clientRevisionHistory = pgTable("client_revision_history", {
	id: serial().primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" }),
	type: clientRevisionTypeEnum().notNull(),
	revisionNumber: integer().notNull(),
	clientName: varchar({ length: 255 }).notNull(),
	changes: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("clientRevisionHistory_projectId_idx").on(table.projectId),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey(),
	userId: integer().references(() => users.id),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }),
	whatsappPhone: varchar({ length: 20 }).notNull(),
	address: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	internalManagement: smallint().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	dataOrigin: dataOriginEnum().default('manual').notNull(),
},
(table) => [
	index("clients_userId_idx").on(table.userId),
	index("clients_whatsappPhone_idx").on(table.whatsappPhone),
]);

export const closureAuditLog = pgTable("closureAuditLog", {
	id: serial().primaryKey(),
	closureId: integer().notNull().references(() => accountingClosures.id, { onDelete: "cascade" }),
	action: closureAuditActionEnum().notNull(),
	performedBy: integer().notNull().references(() => users.id),
	actionDetails: json(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
},
(table) => [
	index("closureAuditLog_closureId_idx").on(table.closureId),
	index("closureAuditLog_performedBy_idx").on(table.performedBy),
	index("closureAuditLog_action_idx").on(table.action),
	index("closureAuditLog_timestamp_idx").on(table.timestamp),
]);

export const colombianHolidays = pgTable("colombianHolidays", {
	id: serial().primaryKey(),
	date: timestamp({ mode: 'string' }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	year: integer().notNull(),
},
(table) => [
	index("colombianHolidays_year_idx").on(table.year),
	index("colombianHolidays_date_idx").on(table.date),
]);

export const expenses = pgTable("expenses", {
	id: serial().primaryKey(),
	expenseType: expenseTypeEnum().notNull(),
	projectId: integer().references(() => projects.id, { onDelete: "set null" }),
	projectClientName: varchar({ length: 255 }),
	operativeCategory: opExpenseCategoryEnum(),
	description: text().notNull(),
	amount: decimal({ precision: 12, scale: 2 }).notNull(),
	expenseDate: timestamp({ mode: 'string' }).notNull(),
	supportUrl: text(),
	supportFileName: varchar({ length: 255 }),
	createdBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	generalCategory: generalCategoryEnum().notNull(),
	subcategory: varchar({ length: 255 }),
	receiptUrl: text(),
	deletedAt: timestamp({ mode: 'string' }),
	dataOrigin: dataOriginWithTestEnum().default('manual').notNull(),
},
(table) => [
	index("expenses_projectId_idx").on(table.projectId),
	index("expenses_expenseDate_idx").on(table.expenseDate),
	index("expenses_expenseType_idx").on(table.expenseType),
]);

export const financialAlerts = pgTable("financialAlerts", {
	id: serial().primaryKey(),
	alertType: financialAlertTypeEnum().notNull(),
	isActive: smallint().default(0).notNull(),
	lastTriggeredAt: timestamp({ mode: 'string' }),
	lastMessageSentAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("financialAlerts_alertType_unique").on(table.alertType),
]);

export const financialSettings = pgTable("financialSettings", {
	id: serial().primaryKey(),
	outstandingThresholdPercent: integer().default(40).notNull(),
	collectionThresholdPercent: integer().default(70).notNull(),
	lowProfitThresholdPercent: integer().default(10).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const hardwareCatalog = pgTable("hardwareCatalog", {
	id: serial().primaryKey(),
	category: hardwareCategoryEnum().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	options: text(),
	photoUrl: text(),
	sortOrder: integer().default(0).notNull(),
	active: smallint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	price: decimal({ precision: 12, scale: 2 }).default('0').notNull(),
	unit: varchar({ length: 50 }).default('unidad').notNull(),
},
(table) => [
	index("hardwareCatalog_category_idx").on(table.category),
	index("hardwareCatalog_active_idx").on(table.active),
]);

export const kitchenQuotations = pgTable("kitchenQuotations", {
	id: serial().primaryKey(),
	quotationId: integer().notNull(),
	shape: kitchenShapeEnum().notNull(),
	totalMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	resultingMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	lowerCabinetsMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	lowerCabinetsPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	upperCabinetsMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	upperCabinetsPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	hasNichoNevecon: smallint().default(0).notNull(),
	nichoNeveconPrice: decimal({ precision: 12, scale: 2 }),
	hasNichoNeveraStandard: smallint().default(0).notNull(),
	nichoNeveraStandardPrice: decimal({ precision: 12, scale: 2 }),
	hasAlacenaEntrepanos: smallint().default(0).notNull(),
	alacenaEntrepanosPrice: decimal({ precision: 12, scale: 2 }),
	hasAlacenaHerraje: smallint().default(0).notNull(),
	alacenaHerrajePrice: decimal({ precision: 12, scale: 2 }),
	hasHerrajeItem: smallint().default(0).notNull(),
	herrajePrice: decimal({ precision: 12, scale: 2 }),
	hasTorreHornos: smallint().default(0).notNull(),
	torreHornosPrice: decimal({ precision: 12, scale: 2 }),
	countertopType: countertopTypeEnum().notNull(),
	countertopMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	countertopSurcharge30: smallint().default(0).notNull(),
	countertopDouble: smallint().default(0).notNull(),
	countertopPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	hasIsland: smallint().default(0).notNull(),
	islandCabinetsMeters: decimal({ precision: 10, scale: 2 }),
	islandCabinetsPrice: decimal({ precision: 12, scale: 2 }),
	islandCountertopMeters: decimal({ precision: 10, scale: 2 }),
	islandCountertopType: countertopTypeEnum(),
	islandCountertopPrice: decimal({ precision: 12, scale: 2 }),
	islandHasLaterals: smallint().default(0).notNull(),
	islandLateralPrice: decimal({ precision: 12, scale: 2 }),
	islandRegruesoPrice: decimal({ precision: 12, scale: 2 }),
	islandTotalPrice: decimal({ precision: 12, scale: 2 }),
	hasBar: smallint().default(0).notNull(),
	barCabinetsMeters: decimal({ precision: 10, scale: 2 }),
	barCabinetsPrice: decimal({ precision: 12, scale: 2 }),
	barCountertopMeters: decimal({ precision: 10, scale: 2 }),
	barCountertopType: countertopTypeEnum(),
	barCountertopPrice: decimal({ precision: 12, scale: 2 }),
	barHasLateral: smallint().default(0).notNull(),
	barLateralPrice: decimal({ precision: 12, scale: 2 }),
	barTotalPrice: decimal({ precision: 12, scale: 2 }),
	hasLed: smallint().default(0).notNull(),
	ledMeters: decimal({ precision: 10, scale: 2 }),
	ledPrice: decimal({ precision: 12, scale: 2 }),
	transportCost: decimal({ precision: 12, scale: 2 }).default('600000').notNull(),
	subtotal: decimal({ precision: 12, scale: 2 }).notNull(),
	total: decimal({ precision: 12, scale: 2 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	hasPaintedDoors: smallint().default(0).notNull(),
	paintedDoorsUpperQty: integer().default(0),
	paintedDoorsUpperPrice: decimal({ precision: 12, scale: 2 }),
	paintedDoorsLowerQty: integer().default(0),
	paintedDoorsLowerPrice: decimal({ precision: 12, scale: 2 }),
	paintedDoorsPantryQty: integer().default(0),
	paintedDoorsPantryPrice: decimal({ precision: 12, scale: 2 }),
	paintedDoorsDrawerQty: integer().default(0),
	paintedDoorsDrawerPrice: decimal({ precision: 12, scale: 2 }),
	paintedDoorsSpiceQty: integer().default(0),
	paintedDoorsSpicePrice: decimal({ precision: 12, scale: 2 }),
	paintedDoorsGolaQty: integer().default(0),
	paintedDoorsGolaPrice: decimal({ precision: 12, scale: 2 }),
	paintedDoorsTotalPrice: decimal({ precision: 12, scale: 2 }),
},
(table) => [
	index("kitchenQuotations_quotationId_idx").on(table.quotationId),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey(),
	userId: integer().notNull().references(() => users.id),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	type: notificationTypeEnum().default('sistema').notNull(),
	referenceId: integer(),
	referenceType: varchar({ length: 50 }),
	read: smallint().default(0).notNull(),
	sentPush: smallint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("notifications_userId_idx").on(table.userId),
	index("notifications_read_idx").on(table.read),
	index("notifications_user_read_idx").on(table.userId, table.read),
]);

export const payments = pgTable("payments", {
	id: serial().primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" }),
	amount: decimal({ precision: 12, scale: 2 }).notNull(),
	type: paymentTypeEnum().notNull(),
	receivedAt: timestamp({ mode: 'string' }).notNull(),
	method: varchar({ length: 100 }),
	notes: text(),
	registeredBy: integer().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	movementType: varchar({ length: 20 }).default('payment').notNull(),
},
(table) => [
	index("payments_projectId_idx").on(table.projectId),
	index("payments_receivedAt_idx").on(table.receivedAt),
]);

export const pricingConfig = pgTable("pricingConfig", {
	id: serial().primaryKey(),
	category: pricingCategoryEnum().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	value: decimal({ precision: 12, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }),
	sortOrder: integer().default(0).notNull(),
	active: smallint().default(1).notNull(),
	updatedBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	descriptionTemplate: text(),
},
(table) => [
	index("pricingConfig_code_idx").on(table.code),
	index("pricingConfig_category_idx").on(table.category),
]);

export const pricingHistory = pgTable("pricingHistory", {
	id: serial().primaryKey(),
	pricingConfigId: integer().notNull(),
	previousValue: decimal({ precision: 12, scale: 2 }).notNull(),
	newValue: decimal({ precision: 12, scale: 2 }).notNull(),
	changedBy: integer().notNull(),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("pricingHistory_pricingConfigId_idx").on(table.pricingConfigId),
]);

export const priorEstimates = pgTable("priorEstimates", {
	id: serial().primaryKey(),
	clientId: integer().notNull().references(() => clients.id),
	workType: workTypeEnum().notNull(),
	additionalDetails: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	kitchenShape: kitchenShapeEnum(),
	materialType: countertopTypeEnum(),
	linearLength: decimal({ precision: 10, scale: 2 }),
	height: decimal({ precision: 10, scale: 2 }),
},
(table) => [
	index("priorEstimates_clientId_idx").on(table.clientId),
]);

export const projectDetails = pgTable("projectDetails", {
	id: serial().primaryKey(),
	projectId: integer().notNull().references(() => projects.id),
	type: projectDetailTypeEnum().notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	photoUrl: text(),
	createdBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("projectDetails_projectId_idx").on(table.projectId),
]);

export const projectHardwareSelections = pgTable("projectHardwareSelections", {
	id: serial().primaryKey(),
	projectId: integer().notNull(),
	hardwareId: integer().notNull(),
	selectedOption: text(),
	notes: text(),
	createdBy: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	quantity: integer().default(1).notNull(),
	priceAtQuotation: decimal({ precision: 10, scale: 2 }),
},
(table) => [
	index("projectHardwareSelections_projectId_idx").on(table.projectId),
	index("projectHardwareSelections_hardwareId_idx").on(table.hardwareId),
]);

export const projectMaterials = pgTable("projectMaterials", {
	id: serial().primaryKey(),
	projectId: integer().notNull(),
	woodType: woodTypeEnum(),
	woodColor: varchar({ length: 255 }),
	woodPhotoUrl: text(),
	countertopType: countertopMaterialEnum(),
	countertopName: varchar({ length: 255 }),
	countertopPhotoUrl: text(),
	sinkMeasure: varchar({ length: 100 }),
	sinkPhotoUrl: text(),
	notes: text(),
	createdBy: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("projectMaterials_projectId_idx").on(table.projectId),
]);

export const projectPayments = pgTable("projectPayments", {
	id: serial().primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" }),
	type: projectPaymentTypeEnum().notNull(),
	amount: decimal({ precision: 12, scale: 2 }).notNull(),
	paymentDate: timestamp({ mode: 'string' }).notNull(),
	receiptUrl: text(),
	notes: text(),
	registeredBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("projectPayments_projectId_idx").on(table.projectId),
]);

export const projectPhotos = pgTable("projectPhotos", {
	id: serial().primaryKey(),
	projectId: integer().notNull().references(() => projects.id),
	stage: photoStageEnum().notNull(),
	photoUrl: text().notNull(),
	description: text(),
	uploadedBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	category: photoCategoryEnum().default('medidas').notNull(),
	subcategory: photoSubcategoryEnum(),
},
(table) => [
	index("projectPhotos_projectId_idx").on(table.projectId),
	index("projectPhotos_category_idx").on(table.category),
	index("projectPhotos_project_category_idx").on(table.projectId, table.category),
]);

export const projectStatusHistory = pgTable("projectStatusHistory", {
	id: serial().primaryKey(),
	projectId: integer().notNull().references(() => projects.id),
	fromStatus: varchar({ length: 50 }),
	toStatus: varchar({ length: 50 }).notNull(),
	changedBy: integer().notNull().references(() => users.id),
	notes: text(),
	evidenceUrl: text(), // URL del archivo adjunto como evidencia (captura WhatsApp, correo, etc.)
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("projectStatusHistory_projectId_idx").on(table.projectId),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey(),
	quotationId: integer(),
	clientId: integer().notNull().references(() => clients.id),
	name: varchar({ length: 255 }).notNull(),
	workType: workTypeEnum().notNull(),
	status: projectStatusEnum().default('contacto').notNull(),
	initialMeasurements: text(),
	design3DFiles: text(),
	despieceFiles: text(),
	clientApprovedAt: timestamp({ mode: 'string' }),
	clientApprovalNotes: text(),
	createdBy: integer().notNull().references(() => users.id),
	designerId: integer().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	quotationSentAt: timestamp({ mode: 'string' }),
	quotationApprovedAt: timestamp({ mode: 'string' }),
	advanceReceivedAt: timestamp({ mode: 'string' }),
	totalAmount: decimal({ precision: 12, scale: 2 }),
	advanceAmount: decimal({ precision: 12, scale: 2 }),
	designDeadline: timestamp({ mode: 'string' }),
	designDeliveredAt: timestamp({ mode: 'string' }),
	selectedColors: text(),
	selectedMaterials: text(),
	estimatedInstallDate: timestamp({ mode: 'string' }),
	scheduledInstallDate: timestamp({ mode: 'string' }),
	installDurationDays: integer().default(1),
	deliveredAt: timestamp({ mode: 'string' }),
	advanceReceiptUrl: text("advance_receipt_url"),
	quotationPdfUrl: text(),
	tentativeInstallDate: timestamp({ mode: 'string' }),
	isInstallDateOfficial: smallint().default(0),
	modeladoApprovedAt: timestamp({ mode: 'string' }),
	modeladoApprovedBy: varchar({ length: 255 }),
	rendersApprovedAt: timestamp({ mode: 'string' }),
	rendersApprovedBy: varchar({ length: 255 }),
	renderRevisionNumber: integer().default(0),
	modeladoRevisionNumber: integer().default(0),
	changesRequestedAt: timestamp({ mode: 'string' }),
	deletedAt: timestamp({ mode: 'string' }),
	currentApprovedQuotationId: integer(),
	dataOrigin: dataOriginEnum().default('manual').notNull(),
	isArchived: smallint().default(0).notNull(),
	skipDesignProcess: smallint().default(0).notNull(),
	accountingClosureId: integer().references(() => accountingClosures.id),
	publicToken: varchar({ length: 64 }),
	approvalReminderCount: integer().default(0),
},
(table) => [
	index("projects_quotationId_quotations_id_fk").on(table.quotationId),
	index("projects_clientId_idx").on(table.clientId),
	index("projects_status_idx").on(table.status),
	index("projects_createdAt_idx").on(table.createdAt),
	index("projects_quotationId_idx").on(table.quotationId),
	index("projects_designerId_idx").on(table.designerId),
	index("projects_createdBy_idx").on(table.createdBy),
	index("projects_accountingClosureId_idx").on(table.accountingClosureId),
	index("projects_publicToken_idx").on(table.publicToken),
]);

// ── VISITAS TÉCNICAS (Portal del Medidor) ────────────────────────────────────

export const visitStatusEnum = pgEnum('visit_status', ['borrador', 'enviada', 'convertida']);

export const technicalVisits = pgTable("technicalVisits", {
	id: serial().primaryKey(),
	// Datos del cliente (puede ser existente o nuevo)
	clientId: integer().references(() => clients.id),
	clientName: varchar({ length: 255 }).notNull(),
	clientPhone: varchar({ length: 50 }),
	clientAddress: text(),
	// Tipo de trabajo
	workType: workTypeEnum().notNull(),
	// Medidas en JSON (flexible por tipo de trabajo)
	measurements: json(),
	// Notas libres
	notes: text(),
	// Estado
	status: visitStatusEnum().default('borrador').notNull(),
	// Quién creó/asignó la visita (admin/comercial)
	createdBy: integer().notNull().references(() => users.id),
	// Medidor asignado para realizar la visita
	assignedTo: integer().references(() => users.id),
	// Fecha programada de la visita
	scheduledDate: timestamp({ mode: 'string' }),
	// Timestamps
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	// Cotización generada desde esta visita (nullable)
	quotationId: integer(),
},
(table) => [
	index("technicalVisits_createdBy_idx").on(table.createdBy),
	index("technicalVisits_status_idx").on(table.status),
	index("technicalVisits_clientId_idx").on(table.clientId),
	index("technicalVisits_assignedTo_idx").on(table.assignedTo),
]);

export const visitPhotos = pgTable("visitPhotos", {
	id: serial().primaryKey(),
	visitId: integer().notNull().references(() => technicalVisits.id, { onDelete: "cascade" }),
	photoUrl: text().notNull(),
	// 'foto' | 'pdf_plano' | 'pdf_medidas'
	category: varchar({ length: 50 }).default('foto'),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("visitPhotos_visitId_idx").on(table.visitId),
]);

export const pushSubscriptions = pgTable("pushSubscriptions", {
	id: serial().primaryKey(),
	userId: integer().notNull().references(() => users.id),
	endpoint: text().notNull(),
	p256Dh: varchar({ length: 255 }).notNull(),
	auth: varchar({ length: 255 }).notNull(),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	isActive: smallint().default(1).notNull(),
	lastUsedAt: timestamp({ mode: 'string' }),
	dataOrigin: dataOriginEnum().default('manual').notNull(),
},
(table) => [
	index("pushSubscriptions_userId_idx").on(table.userId),
]);

export const quotationItems = pgTable("quotationItems", {
	id: serial().primaryKey(),
	quotationId: integer().notNull().references(() => quotations.id, { onDelete: "cascade" }),
	itemNumber: integer().notNull(),
	itemType: varchar({ length: 50 }).default('otro').notNull(),
	description: text().notNull(),
	quantity: varchar({ length: 50 }).notNull(),
	unitPrice: varchar({ length: 50 }),
	totalPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	includesFixedCosts: smallint().default(0).notNull(),
	kitchenConfig: json(),
	hardwareSelections: json(),
	closetConfig: json(),
	fixedCostsAmount: decimal({ precision: 12, scale: 2 }).default('600000'),
	doorConfig: json(),
	tvCenterConfig: json(),
	countertopConfig: json(),
},
(table) => [
	index("quotationItems_quotationId_idx").on(table.quotationId),
]);

export const quotations = pgTable("quotations", {
	id: serial().primaryKey(),
	quotationNumber: varchar({ length: 50 }).notNull(),
	clientId: integer().notNull().references(() => clients.id, { onDelete: "cascade" }),
	vendorName: varchar({ length: 255 }).notNull(),
	productType: productTypeEnum().default('otro').notNull(),
	status: quotationStatusEnum().default('draft').notNull(),
	validUntil: timestamp({ mode: 'string' }),
	subtotal: decimal({ precision: 12, scale: 2 }).notNull(),
	transportCost: decimal({ precision: 12, scale: 2 }).default('600000').notNull(),
	total: decimal({ precision: 12, scale: 2 }).notNull(),
	pdfUrl: text(),
	sentAt: timestamp({ mode: 'string' }),
	createdBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	customDescriptions: json(),
	generalNotes: text(),
	discountPercent: decimal({ precision: 5, scale: 2 }).default('0'),
	discountAmount: decimal({ precision: 15, scale: 2 }).default('0'),
	isLocked: smallint().default(0).notNull(),
	lockedAt: timestamp({ mode: 'string' }),
	lockedBy: integer(),
	deletedAt: timestamp({ mode: 'string' }),
	parentQuotationId: integer(),
	isAdditional: smallint().default(0).notNull(),
	baseQuotationId: integer(),
	versionNumber: integer().default(1).notNull(),
	isHistoricalCopy: smallint().default(0).notNull(),
	clientResponseStatus: clientResponseStatusEnum(),
	clientResponseNotes: text(),
	clientResponseAt: timestamp({ mode: 'string' }),
	whatsappApiSentAt: timestamp({ mode: 'string' }),
	dataOrigin: dataOriginEnum().default('manual').notNull(),
	isArchived: smallint().default(0).notNull(),
},
(table) => [
	index("quotations_quotationNumber_idx").on(table.quotationNumber),
	index("quotations_clientId_idx").on(table.clientId),
	index("quotations_status_idx").on(table.status),
	index("quotations_createdBy_idx").on(table.createdBy),
	index("quotations_createdAt_idx").on(table.createdAt),
	index("quotations_parentQuotationId_idx").on(table.parentQuotationId),
	index("quotations_baseQuotationId_idx").on(table.baseQuotationId),
	foreignKey({
		columns: [table.parentQuotationId],
		foreignColumns: [table.id],
		name: "quotations_parentQuotationId_fk"
	}),
	foreignKey({
		columns: [table.baseQuotationId],
		foreignColumns: [table.id],
		name: "quotations_baseQuotationId_fk"
	}),
]);

export const reminders = pgTable("reminders", {
	id: serial().primaryKey(),
	projectId: integer().references(() => projects.id),
	type: reminderTypeEnum().notNull(),
	assignedTo: integer().notNull().references(() => users.id),
	dueDate: timestamp({ mode: 'string' }).notNull(),
	status: reminderStatusEnum().default('pendiente').notNull(),
	message: text(),
	sentAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	scheduledFor: timestamp({ mode: 'string' }),
	sent: smallint().default(0).notNull(),
},
(table) => [
	index("reminders_projectId_idx").on(table.projectId),
	index("reminders_assignedTo_idx").on(table.assignedTo),
	index("reminders_dueDate_idx").on(table.dueDate),
	index("reminders_status_idx").on(table.status),
]);

export const taskReminders = pgTable("taskReminders", {
	id: serial().primaryKey(),
	taskId: integer().notNull().references(() => tasks.id, { onDelete: "cascade" }),
	sentBy: integer().notNull().references(() => users.id),
	sentTo: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
	id: serial().primaryKey(),
	projectId: integer().references(() => projects.id),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	priority: taskPriorityEnum().default('media').notNull(),
	status: taskStatusEnum().default('pendiente').notNull(),
	dueDate: timestamp({ mode: 'string' }),
	assignedTo: integer().notNull().references(() => users.id),
	assignedBy: integer().notNull().references(() => users.id),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastReminderSentAt: timestamp({ mode: 'string' }),
	lastReminderSentBy: integer(),
	reminderCount: integer().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	dataOrigin: dataOriginEnum().default('manual').notNull(),
},
(table) => [
	index("tasks_assignedTo_idx").on(table.assignedTo),
	index("tasks_status_idx").on(table.status),
	index("tasks_dueDate_idx").on(table.dueDate),
	index("tasks_projectId_idx").on(table.projectId),
	index("tasks_assigned_status_idx").on(table.assignedTo, table.status),
]);

export const users = pgTable("users", {
	id: serial().primaryKey(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: userRoleEnum().default('user').notNull(),
	phone: varchar({ length: 20 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).defaultNow().notNull(),
	passwordHash: varchar({ length: 255 }),
	passwordResetToken: varchar({ length: 100 }),
	passwordResetExpires: timestamp({ mode: 'string' }),
	birthDate: timestamp({ mode: 'string' }),
	dataOrigin: dataOriginEnum().default('manual').notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	isTeamMember: smallint().default(0).notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_role_idx").on(table.role),
	index("users_email_idx").on(table.email),
]);

// ── POSTVENTA ─────────────────────────────────────────────────────────────────
export const postventaReclamaciones = pgTable("postventaReclamaciones", {
	id: serial().primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" }),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	type: postventaTypeEnum().default('reclamacion').notNull(),
	status: postventaStatusEnum().default('pendiente').notNull(),
	priority: taskPriorityEnum().default('media').notNull(),
	assignedTo: integer().references(() => users.id),
	createdBy: integer().notNull().references(() => users.id),
	resolvedBy: integer().references(() => users.id),
	resolvedAt: timestamp({ mode: 'string' }),
	resolvedNotes: text(),
	scheduledFor: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("postventa_projectId_idx").on(table.projectId),
	index("postventa_status_idx").on(table.status),
	index("postventa_type_idx").on(table.type),
	index("postventa_scheduledFor_idx").on(table.scheduledFor),
]);

// ── INFERRED TYPES ────────────────────────────────────────────────────────────
export type InsertUser = typeof users.$inferInsert;
export type InsertClient = typeof clients.$inferInsert;
export type InsertAppointment = typeof appointments.$inferInsert;
export type InsertAppointmentWorkType = typeof appointmentWorkTypes.$inferInsert;
export type InsertAdvisoryRequest = typeof advisoryRequests.$inferInsert;
export type InsertPriorEstimate = typeof priorEstimates.$inferInsert;
export type InsertQuotation = typeof quotations.$inferInsert;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;
export type InsertColombianHoliday = typeof colombianHolidays.$inferInsert;
export type InsertReminder = typeof reminders.$inferInsert;
export type InsertProject = typeof projects.$inferInsert;
export type InsertProjectPhoto = typeof projectPhotos.$inferInsert;
export type InsertProjectDetail = typeof projectDetails.$inferInsert;
export type InsertTask = typeof tasks.$inferInsert;
export type InsertProjectStatusHistory = typeof projectStatusHistory.$inferInsert;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export type InsertNotification = typeof notifications.$inferInsert;
export type InsertPayment = typeof payments.$inferInsert;
export type InsertPricingConfig = typeof pricingConfig.$inferInsert;
export type InsertPricingHistory = typeof pricingHistory.$inferInsert;
export type InsertExpense = typeof expenses.$inferInsert;
export type InsertClientRevisionHistory = typeof clientRevisionHistory.$inferInsert;
export type InsertFinancialAlert = typeof financialAlerts.$inferInsert;
export type InsertFinancialSettings = typeof financialSettings.$inferInsert;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertAccountingClosure = typeof accountingClosures.$inferInsert;
export type InsertAccountingClosureProject = typeof accountingClosureProjects.$inferInsert;
export type InsertAccountingClosureOperationalExpense = typeof accountingClosureOperationalExpenses.$inferInsert;
export type InsertClosureAuditLog = typeof closureAuditLog.$inferInsert;
