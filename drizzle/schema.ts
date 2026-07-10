import { pgTable, index, foreignKey, serial, integer, bigint, text, decimal, timestamp, varchar, date, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const drizzleMigrations = pgTable("__drizzle_migrations__", {
	id: serial('id').primaryKey(),
	hash: text().notNull(),
	createdAt: bigint("created_at", { mode: "number" }),
},
(table) => [
	index("id").on(table.id),
]);

export const accountingClosureOperationalExpenses = pgTable("accounting_op_expenses", {
	id: serial('id').primaryKey(),
	closureId: integer().notNull().references(() => accountingClosures.id, { onDelete: "cascade", name: "fk_acoe_closure" }),
	expenseId: integer().notNull().references(() => expenses.id, { name: "fk_acoe_expense" }),
	category: text().notNull(),
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
	id: serial('id').primaryKey(),
	closureId: integer().notNull().references(() => accountingClosures.id, { onDelete: "cascade" } ),
	projectId: integer().notNull().references(() => projects.id),
	projectName: varchar({ length: 255 }).notNull(),
	projectValue: decimal({ precision: 15, scale: 2 }).notNull(),
	totalPaid: decimal({ precision: 15, scale: 2 }).notNull(),
	totalExpenses: decimal({ precision: 15, scale: 2 }).notNull(),
	profit: decimal({ precision: 15, scale: 2 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("accountingClosureProjects_closureId_idx").on(table.closureId),
	index("accountingClosureProjects_projectId_idx").on(table.projectId),
]);

export const accountingClosures = pgTable("accountingClosures", {
	id: serial('id').primaryKey(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodStart: date().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	periodEnd: date().notNull(),
	status: text().default('draft').notNull(),
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
	id: serial('id').primaryKey(),
	clientId: integer().notNull().references(() => clients.id),
	workType: text().notNull(),
	status: text().default('pendiente').notNull(),
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
	id: serial('id').primaryKey(),
	appointmentId: integer().notNull().references(() => appointments.id, { onDelete: "cascade" } ),
	workType: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("appointmentWorkTypes_appointmentId_idx").on(table.appointmentId),
]);

export const appointments = pgTable("appointments", {
	id: serial('id').primaryKey(),
	clientId: integer().notNull().references(() => clients.id),
	scheduledDate: timestamp({ mode: 'string' }),
	status: text().default('pendiente').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	dataOrigin: text().default('manual').notNull(),
	assignedMedidorId: integer().references(() => users.id),
},
(table) => [
	index("appointments_clientId_idx").on(table.clientId),
	index("appointments_scheduledDate_idx").on(table.scheduledDate),
	index("appointments_status_idx").on(table.status),
	index("appointments_client_status_idx").on(table.clientId, table.status),
	index("appointments_assignedMedidor_idx").on(table.assignedMedidorId),
]);

export const auditLogs = pgTable("auditLogs", {
	id: serial('id').primaryKey(),
	userId: integer().notNull().references(() => users.id),
	action: text().notNull(),
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
	id: serial('id').primaryKey(),
	backupName: varchar({ length: 255 }).notNull(),
	backupType: text().notNull(),
	s3Key: varchar({ length: 500 }).notNull(),
	s3Url: text().notNull(),
	fileSize: bigint({ mode: "number" }),
	rowCounts: json(),
	checksums: json(),
	status: text().default('pending').notNull(),
	verificationStatus: text().default('not_verified').notNull(),
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
	id: serial('id').primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	type: text().notNull(),
	revisionNumber: integer().notNull(),
	clientName: varchar({ length: 255 }).notNull(),
	changes: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("clientRevisionHistory_projectId_idx").on(table.projectId),
]);

export const clients = pgTable("clients", {
	id: serial('id').primaryKey(),
	userId: integer().references(() => users.id),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }),
	whatsappPhone: varchar({ length: 20 }).notNull(),
	address: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	internalManagement: integer().default(0).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	dataOrigin: text().default('manual').notNull(),
},
(table) => [
	index("clients_userId_idx").on(table.userId),
	index("clients_whatsappPhone_idx").on(table.whatsappPhone),
]);

export const closureAuditLog = pgTable("closureAuditLog", {
	id: serial('id').primaryKey(),
	closureId: integer().notNull().references(() => accountingClosures.id, { onDelete: "cascade" } ),
	action: text().notNull(),
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
	id: serial('id').primaryKey(),
	date: timestamp({ mode: 'string' }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	year: integer().notNull(),
},
(table) => [
	index("colombianHolidays_year_idx").on(table.year),
	index("colombianHolidays_date_idx").on(table.date),
]);

export const expenses = pgTable("expenses", {
	id: serial('id').primaryKey(),
	expenseType: text().notNull(),
	projectId: integer().references(() => projects.id, { onDelete: "set null" } ),
	projectClientName: varchar({ length: 255 }),
	operativeCategory: text(),
	description: text().notNull(),
	amount: decimal({ precision: 12, scale: 2 }).notNull(),
	expenseDate: timestamp({ mode: 'string' }).notNull(),
	supportUrl: text(),
	supportFileName: varchar({ length: 255 }),
	createdBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	generalCategory: text().notNull(),
	subcategory: varchar({ length: 255 }),
	receiptUrl: text(),
	deletedAt: timestamp({ mode: 'string' }),
	dataOrigin: text().default('manual').notNull(),
},
(table) => [
	index("expenses_projectId_idx").on(table.projectId),
	index("expenses_expenseDate_idx").on(table.expenseDate),
	index("expenses_expenseType_idx").on(table.expenseType),
]);

export const financialAlerts = pgTable("financialAlerts", {
	id: serial('id').primaryKey(),
	alertType: text().notNull(),
	isActive: integer().default(0).notNull(),
	lastTriggeredAt: timestamp({ mode: 'string' }),
	lastMessageSentAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("financialAlerts_alertType_unique").on(table.alertType),
]);

export const financialSettings = pgTable("financialSettings", {
	id: serial('id').primaryKey(),
	outstandingThresholdPercent: integer().default(40).notNull(),
	collectionThresholdPercent: integer().default(70).notNull(),
	lowProfitThresholdPercent: integer().default(10).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const hardwareCatalog = pgTable("hardwareCatalog", {
	id: serial('id').primaryKey(),
	category: text().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	options: text(),
	photoUrl: text(),
	sortOrder: integer().default(0).notNull(),
	active: integer().default(1).notNull(),
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
	id: serial('id').primaryKey(),
	quotationId: integer().notNull(),
	shape: text().notNull(),
	totalMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	resultingMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	lowerCabinetsMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	lowerCabinetsPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	upperCabinetsMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	upperCabinetsPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	hasNichoNevecon: integer().default(0).notNull(),
	nichoNeveconPrice: decimal({ precision: 12, scale: 2 }),
	hasNichoNeveraStandard: integer().default(0).notNull(),
	nichoNeveraStandardPrice: decimal({ precision: 12, scale: 2 }),
	hasAlacenaEntrepanos: integer().default(0).notNull(),
	alacenaEntrepanosPrice: decimal({ precision: 12, scale: 2 }),
	hasAlacenaHerraje: integer().default(0).notNull(),
	alacenaHerrajePrice: decimal({ precision: 12, scale: 2 }),
	hasHerrajeItem: integer().default(0).notNull(),
	herrajePrice: decimal({ precision: 12, scale: 2 }),
	hasTorreHornos: integer().default(0).notNull(),
	torreHornosPrice: decimal({ precision: 12, scale: 2 }),
	countertopType: text().notNull(),
	countertopMeters: decimal({ precision: 10, scale: 2 }).notNull(),
	countertopSurcharge30: integer().default(0).notNull(),
	countertopDouble: integer().default(0).notNull(),
	countertopPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	hasIsland: integer().default(0).notNull(),
	islandCabinetsMeters: decimal({ precision: 10, scale: 2 }),
	islandCabinetsPrice: decimal({ precision: 12, scale: 2 }),
	islandCountertopMeters: decimal({ precision: 10, scale: 2 }),
	islandCountertopType: text(),
	islandCountertopPrice: decimal({ precision: 12, scale: 2 }),
	islandHasLaterals: integer().default(0).notNull(),
	islandLateralPrice: decimal({ precision: 12, scale: 2 }),
	islandRegruesoPrice: decimal({ precision: 12, scale: 2 }),
	islandTotalPrice: decimal({ precision: 12, scale: 2 }),
	hasBar: integer().default(0).notNull(),
	barCabinetsMeters: decimal({ precision: 10, scale: 2 }),
	barCabinetsPrice: decimal({ precision: 12, scale: 2 }),
	barCountertopMeters: decimal({ precision: 10, scale: 2 }),
	barCountertopType: text(),
	barCountertopPrice: decimal({ precision: 12, scale: 2 }),
	barHasLateral: integer().default(0).notNull(),
	barLateralPrice: decimal({ precision: 12, scale: 2 }),
	barTotalPrice: decimal({ precision: 12, scale: 2 }),
	hasLed: integer().default(0).notNull(),
	ledMeters: decimal({ precision: 10, scale: 2 }),
	ledPrice: decimal({ precision: 12, scale: 2 }),
	transportCost: decimal({ precision: 12, scale: 2 }).default('600000').notNull(),
	subtotal: decimal({ precision: 12, scale: 2 }).notNull(),
	total: decimal({ precision: 12, scale: 2 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	hasPaintedDoors: integer().default(0).notNull(),
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
	id: serial('id').primaryKey(),
	userId: integer().notNull().references(() => users.id),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	type: text().default('sistema').notNull(),
	referenceId: integer(),
	referenceType: varchar({ length: 50 }),
	read: integer().default(0).notNull(),
	sentPush: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("notifications_userId_idx").on(table.userId),
	index("notifications_read_idx").on(table.read),
	index("notifications_user_read_idx").on(table.userId, table.read),
]);

export const payments = pgTable("payments", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	amount: decimal({ precision: 12, scale: 2 }).notNull(),
	type: text().notNull(),
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
	id: serial('id').primaryKey(),
	category: text().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	value: decimal({ precision: 12, scale: 2 }).notNull(),
	unit: varchar({ length: 50 }),
	sortOrder: integer().default(0).notNull(),
	active: integer().default(1).notNull(),
	updatedBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	descriptionTemplate: text(),
},
(table) => [
	index("code").on(table.code),
	index("pricingConfig_category_idx").on(table.category),
]);

export const pricingHistory = pgTable("pricingHistory", {
	id: serial('id').primaryKey(),
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
	id: serial('id').primaryKey(),
	clientId: integer().notNull().references(() => clients.id),
	workType: text().notNull(),
	additionalDetails: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	kitchenShape: text(),
	materialType: text(),
	linearLength: decimal({ precision: 10, scale: 2 }),
	height: decimal({ precision: 10, scale: 2 }),
},
(table) => [
	index("priorEstimates_clientId_idx").on(table.clientId),
]);

export const projectDetails = pgTable("projectDetails", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull().references(() => projects.id),
	type: text().notNull(),
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
	id: serial('id').primaryKey(),
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
	id: serial('id').primaryKey(),
	projectId: integer().notNull(),
	woodType: text(),
	woodColor: varchar({ length: 255 }),
	woodPhotoUrl: text(),
	countertopType: text(),
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
	id: serial('id').primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	type: text().notNull(),
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
	id: serial('id').primaryKey(),
	projectId: integer().notNull().references(() => projects.id),
	stage: text().notNull(),
	photoUrl: text().notNull(),
	description: text(),
	uploadedBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	category: text().default('medidas').notNull(),
	subcategory: text(),
},
(table) => [
	index("projectPhotos_projectId_idx").on(table.projectId),
	index("projectPhotos_category_idx").on(table.category),
	index("projectPhotos_project_category_idx").on(table.projectId, table.category),
]);

export const projectStatusHistory = pgTable("projectStatusHistory", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull().references(() => projects.id),
	fromStatus: varchar({ length: 50 }),
	toStatus: varchar({ length: 50 }).notNull(),
	changedBy: integer().notNull().references(() => users.id),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("projectStatusHistory_projectId_idx").on(table.projectId),
]);

export const projects = pgTable("projects", {
	id: serial('id').primaryKey(),
	quotationId: integer(),
	clientId: integer().notNull().references(() => clients.id),
	name: varchar({ length: 255 }).notNull(),
	workType: text().notNull(),
	status: text().default('contacto').notNull(),
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
	isInstallDateOfficial: integer().default(0),
	modeladoApprovedAt: timestamp({ mode: 'string' }),
	modeladoApprovedBy: varchar({ length: 255 }),
	rendersApprovedAt: timestamp({ mode: 'string' }),
	rendersApprovedBy: varchar({ length: 255 }),
	renderRevisionNumber: integer().default(0),
	modeladoRevisionNumber: integer().default(0),
	changesRequestedAt: timestamp({ mode: 'string' }),
	deletedAt: timestamp({ mode: 'string' }),
	currentApprovedQuotationId: integer(),
	dataOrigin: text().default('manual').notNull(),
	isArchived: integer().default(0).notNull(),
	skipDesignProcess: integer().default(0).notNull(),
	accountingClosureId: integer().references(() => accountingClosures.id),
	publicToken: varchar({ length: 64 }),
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

export const pushSubscriptions = pgTable("pushSubscriptions", {
	id: serial('id').primaryKey(),
	userId: integer().notNull().references(() => users.id),
	endpoint: text().notNull(),
	p256Dh: varchar({ length: 255 }).notNull(),
	auth: varchar({ length: 255 }).notNull(),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	isActive: integer().default(1).notNull(),
	lastUsedAt: timestamp({ mode: 'string' }),
	dataOrigin: text().default('manual').notNull(),
},
(table) => [
	index("pushSubscriptions_userId_idx").on(table.userId),
]);

export const quotationItems = pgTable("quotationItems", {
	id: serial('id').primaryKey(),
	quotationId: integer().notNull().references(() => quotations.id, { onDelete: "cascade" } ),
	itemNumber: integer().notNull(),
	itemType: varchar({ length: 50 }).default('otro').notNull(),
	description: text().notNull(),
	quantity: varchar({ length: 50 }).notNull(),
	unitPrice: varchar({ length: 50 }),
	totalPrice: decimal({ precision: 12, scale: 2 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	includesFixedCosts: integer().default(0).notNull(),
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
	id: serial('id').primaryKey(),
	quotationNumber: varchar({ length: 50 }).notNull(),
	clientId: integer().notNull().references(() => clients.id, { onDelete: "cascade" } ),
	vendorName: varchar({ length: 255 }).notNull(),
	productType: text().default('otro').notNull(),
	status: text().default('draft').notNull(),
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
	isLocked: integer().default(0).notNull(),
	lockedAt: timestamp({ mode: 'string' }),
	lockedBy: integer(),
	deletedAt: timestamp({ mode: 'string' }),
	parentQuotationId: integer(),
	isAdditional: integer().default(0).notNull(),
	baseQuotationId: integer(),
	versionNumber: integer().default(1).notNull(),
	isHistoricalCopy: integer().default(0).notNull(),
	clientResponseStatus: text(),
	clientResponseNotes: text(),
	clientResponseAt: timestamp({ mode: 'string' }),
	whatsappApiSentAt: timestamp({ mode: 'string' }),
	dataOrigin: text().default('manual').notNull(),
	isArchived: integer().default(0).notNull(),
},
(table) => [
	index("quotationNumber").on(table.quotationNumber),
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
	id: serial('id').primaryKey(),
	projectId: integer().references(() => projects.id),
	type: text().notNull(),
	assignedTo: integer().notNull().references(() => users.id),
	dueDate: timestamp({ mode: 'string' }).notNull(),
	status: text().default('pendiente').notNull(),
	message: text(),
	sentAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	scheduledFor: timestamp({ mode: 'string' }),
	sent: integer().default(0).notNull(),
},
(table) => [
	index("reminders_projectId_idx").on(table.projectId),
	index("reminders_assignedTo_idx").on(table.assignedTo),
	index("reminders_dueDate_idx").on(table.dueDate),
	index("reminders_status_idx").on(table.status),
]);

export const taskReminders = pgTable("taskReminders", {
	id: serial('id').primaryKey(),
	taskId: integer().notNull().references(() => tasks.id, { onDelete: "cascade" } ),
	sentBy: integer().notNull().references(() => users.id),
	sentTo: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
	id: serial('id').primaryKey(),
	projectId: integer().references(() => projects.id),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	priority: text().default('media').notNull(),
	status: text().default('pendiente').notNull(),
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
	dataOrigin: text().default('manual').notNull(),
},
(table) => [
	index("tasks_assignedTo_idx").on(table.assignedTo),
	index("tasks_status_idx").on(table.status),
	index("tasks_dueDate_idx").on(table.dueDate),
	index("tasks_projectId_idx").on(table.projectId),
	index("tasks_assigned_status_idx").on(table.assignedTo, table.status),
]);

export const users = pgTable("users", {
	id: serial('id').primaryKey(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: text().default('user').notNull(),
	phone: varchar({ length: 20 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).defaultNow().notNull(),
	passwordHash: varchar({ length: 255 }),
	passwordResetToken: varchar({ length: 100 }),
	passwordResetExpires: timestamp({ mode: 'string' }),
	birthDate: timestamp({ mode: 'string' }),
	dataOrigin: text().default('manual').notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	isTeamMember: integer().default(0).notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_role_idx").on(table.role),
	index("users_email_idx").on(table.email),
]);

// ── POSTVENTA ─────────────────────────────────────────────────────────────────
export const postventaReclamaciones = pgTable("postventaReclamaciones", {
	id: serial('id').primaryKey(),
	projectId: integer().notNull().references(() => projects.id, { onDelete: "cascade" }),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	// reclamacion = cliente reporta problema, seguimiento_30d = llamada de satisfacción, revision_anual = oferta de revisión al año
	type: text().default('reclamacion').notNull(),
	status: text().default('pendiente').notNull(),
	priority: text().default('media').notNull(),
	assignedTo: integer().references(() => users.id),
	createdBy: integer().notNull().references(() => users.id),
	resolvedBy: integer().references(() => users.id),
	resolvedAt: timestamp({ mode: 'string' }),
	resolvedNotes: text(),
	scheduledFor: timestamp({ mode: 'string' }), // fecha programada para seguimiento/revisión
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("postventa_projectId_idx").on(table.projectId),
	index("postventa_status_idx").on(table.status),
	index("postventa_type_idx").on(table.type),
	index("postventa_scheduledFor_idx").on(table.scheduledFor),
]);

// ── Módulo Contador ───────────────────────────────────────────────────────────
export const taxObligations = pgTable("taxObligations", {
	id: serial('id').primaryKey(),
	type: text().notNull(), // 'seguridad_social' | 'retencion' | 'ica' | 'iva'
	year: integer().notNull(),
	period: integer().notNull(),
	periodType: text().notNull(), // 'mensual' | 'bimestral' | 'cuatrimestral'
	dueDate: timestamp({ mode: 'string' }),
	status: text().default('pendiente').notNull(), // 'pendiente' | 'pagado' | 'declarado'
	amount: decimal({ precision: 14, scale: 2 }),
	notes: text(),
	completedAt: timestamp({ mode: 'string' }),
	completedBy: integer().references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const taxDocuments = pgTable("taxDocuments", {
	id: serial('id').primaryKey(),
	obligationType: text().notNull(), // 'seguridad_social' | 'retencion' | 'ica' | 'iva' | 'nomina' | 'otro'
	year: integer().notNull(),
	month: integer().notNull(),
	fileName: text().notNull(),
	fileUrl: text().notNull(),
	description: text(),
	uploadedBy: integer().references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

// ── Módulo Medidor — Levantamiento Técnico ────────────────────────────────────
export const technicalVisits = pgTable("technical_visits", {
	id: serial('id').primaryKey(),
	appointmentId: integer().references(() => appointments.id), // opcional — si viene de cita agendada
	clientId: integer().references(() => clients.id),           // opcional — si ya existe en el CRM
	createdBy: integer().notNull().references(() => users.id),
	status: text().default('borrador').notNull(),               // borrador | enviada | convertida
	workType: text().notNull(),                                 // cocina | closet | puertas | centro_tv
	// Datos del cliente (pre-llenados de cita o ingresados manualmente)
	clientName: varchar({ length: 255 }).notNull(),
	clientPhone: varchar({ length: 20 }),
	clientAddress: text(),
	visitCity: varchar({ length: 100 }),
	// GPS capturado al crear la visita
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
	// Medidas por tipo de trabajo (JSON flexible)
	measurements: json(),
	// Checklist técnico (JSON)
	checklist: json(),
	// Evaluación técnica
	technicalEvaluation: text(),                               // viable | requiere_revision | requiere_visita
	criticalObservations: text(),                              // observaciones críticas adicionales
	// Notas generales
	notes: text(),
	// Firma del cliente (base64 PNG — trazabilidad de visita)
	clientSignature: text(),
	clientSignedAt: timestamp({ mode: 'string' }),
	// Vinculación post-aprobación
	quotationId: integer().references(() => quotations.id),
	projectId: integer().references(() => projects.id),
	submittedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("technicalVisits_createdBy_idx").on(table.createdBy),
	index("technicalVisits_clientId_idx").on(table.clientId),
	index("technicalVisits_status_idx").on(table.status),
	index("technicalVisits_appointmentId_idx").on(table.appointmentId),
	index("technicalVisits_projectId_idx").on(table.projectId),
]);

export const technicalVisitPhotos = pgTable("technical_visit_photos", {
	id: serial('id').primaryKey(),
	visitId: integer().notNull().references(() => technicalVisits.id, { onDelete: 'cascade' }),
	url: text().notNull(),
	s3Key: text().notNull(),
	category: text().notNull(), // general | ventana | punto_hidraulico | punto_gas | tomacorrientes | detalle_tecnico
	caption: text(),
	uploadedBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("technicalVisitPhotos_visitId_idx").on(table.visitId),
]);

export const technicalVisitPdfs = pgTable("technical_visit_pdfs", {
	id: serial('id').primaryKey(),
	visitId: integer().notNull().references(() => technicalVisits.id, { onDelete: 'cascade' }),
	url: text().notNull(),
	s3Key: text().notNull(),
	originalFileName: text().notNull(),
	originalSizeBytes: integer(),
	compressedSizeBytes: integer(),
	savedPercent: integer().default(0),
	uploadedBy: integer().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("technicalVisitPdfs_visitId_idx").on(table.visitId),
]);
