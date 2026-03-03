CREATE TABLE `advisoryRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`status` enum('pendiente','contactado','completado') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`preferredCallTime` text
);
--> statement-breakpoint
CREATE TABLE `appointmentWorkTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`scheduledDate` timestamp,
	`status` enum('pendiente','confirmada','completada','cancelada') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`dataOrigin` enum('manual','system') NOT NULL DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE `client_revision_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('modelado_3d','renders') NOT NULL,
	`revisionNumber` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`changes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`whatsappPhone` varchar(20) NOT NULL,
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`internalManagement` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`dataOrigin` enum('manual','system') NOT NULL DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE `colombianHolidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`name` varchar(255) NOT NULL,
	`year` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `__drizzle_migrations__` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`hash` text NOT NULL,
	`created_at` bigint
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseType` enum('materiales_proyecto','gasto_operativo') NOT NULL,
	`projectId` int,
	`projectClientName` varchar(255),
	`operativeCategory` enum('arriendo','energia','agua','internet','mantenimiento','herramientas','jardineria','reparaciones','transporte','papeleria','aseo','otro'),
	`description` text NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`supportUrl` text,
	`supportFileName` varchar(255),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`generalCategory` enum('materiales','mano_de_obra','alquiler','servicios','transporte','mantenimiento','otros') NOT NULL,
	`subcategory` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `financialAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` enum('deliveredWithOutstanding','lowCollectionRate') NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 0,
	`lastTriggeredAt` timestamp,
	`lastMessageSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `financialSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outstandingThresholdPercent` int NOT NULL DEFAULT 40,
	`collectionThresholdPercent` int NOT NULL DEFAULT 70,
	`lowProfitThresholdPercent` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hardwareCatalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('cocinas','closets','puertas') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`options` text,
	`photoUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`price` decimal(12,2) NOT NULL DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE `kitchenQuotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`shape` enum('L','U','lineal') NOT NULL,
	`totalMeters` decimal(10,2) NOT NULL,
	`resultingMeters` decimal(10,2) NOT NULL,
	`lowerCabinetsMeters` decimal(10,2) NOT NULL,
	`lowerCabinetsPrice` decimal(12,2) NOT NULL,
	`upperCabinetsMeters` decimal(10,2) NOT NULL,
	`upperCabinetsPrice` decimal(12,2) NOT NULL,
	`hasNichoNevecon` tinyint NOT NULL DEFAULT 0,
	`nichoNeveconPrice` decimal(12,2),
	`hasNichoNeveraStandard` tinyint NOT NULL DEFAULT 0,
	`nichoNeveraStandardPrice` decimal(12,2),
	`hasAlacenaEntrepanos` tinyint NOT NULL DEFAULT 0,
	`alacenaEntrepanosPrice` decimal(12,2),
	`hasAlacenaHerraje` tinyint NOT NULL DEFAULT 0,
	`alacenaHerrajePrice` decimal(12,2),
	`hasHerrajeItem` tinyint NOT NULL DEFAULT 0,
	`herrajePrice` decimal(12,2),
	`hasTorreHornos` tinyint NOT NULL DEFAULT 0,
	`torreHornosPrice` decimal(12,2),
	`countertopType` enum('quarzone','sinterizado') NOT NULL,
	`countertopMeters` decimal(10,2) NOT NULL,
	`countertopSurcharge30` tinyint NOT NULL DEFAULT 0,
	`countertopDouble` tinyint NOT NULL DEFAULT 0,
	`countertopPrice` decimal(12,2) NOT NULL,
	`hasIsland` tinyint NOT NULL DEFAULT 0,
	`islandCabinetsMeters` decimal(10,2),
	`islandCabinetsPrice` decimal(12,2),
	`islandCountertopMeters` decimal(10,2),
	`islandCountertopType` enum('quarzone','sinterizado'),
	`islandCountertopPrice` decimal(12,2),
	`islandHasLaterals` tinyint NOT NULL DEFAULT 0,
	`islandLateralPrice` decimal(12,2),
	`islandRegruesoPrice` decimal(12,2),
	`islandTotalPrice` decimal(12,2),
	`hasBar` tinyint NOT NULL DEFAULT 0,
	`barCabinetsMeters` decimal(10,2),
	`barCabinetsPrice` decimal(12,2),
	`barCountertopMeters` decimal(10,2),
	`barCountertopType` enum('quarzone','sinterizado'),
	`barCountertopPrice` decimal(12,2),
	`barHasLateral` tinyint NOT NULL DEFAULT 0,
	`barLateralPrice` decimal(12,2),
	`barTotalPrice` decimal(12,2),
	`hasLed` tinyint NOT NULL DEFAULT 0,
	`ledMeters` decimal(10,2),
	`ledPrice` decimal(12,2),
	`transportCost` decimal(12,2) NOT NULL DEFAULT '600000',
	`subtotal` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`hasPaintedDoors` tinyint NOT NULL DEFAULT 0,
	`paintedDoorsUpperQty` int DEFAULT 0,
	`paintedDoorsUpperPrice` decimal(12,2),
	`paintedDoorsLowerQty` int DEFAULT 0,
	`paintedDoorsLowerPrice` decimal(12,2),
	`paintedDoorsPantryQty` int DEFAULT 0,
	`paintedDoorsPantryPrice` decimal(12,2),
	`paintedDoorsDrawerQty` int DEFAULT 0,
	`paintedDoorsDrawerPrice` decimal(12,2),
	`paintedDoorsSpiceQty` int DEFAULT 0,
	`paintedDoorsSpicePrice` decimal(12,2),
	`paintedDoorsGolaQty` int DEFAULT 0,
	`paintedDoorsGolaPrice` decimal(12,2),
	`paintedDoorsTotalPrice` decimal(12,2)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` enum('proyecto','tarea','cita','cotizacion','sistema') NOT NULL DEFAULT 'sistema',
	`referenceId` int,
	`referenceType` varchar(50),
	`read` tinyint NOT NULL DEFAULT 0,
	`sentPush` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`type` enum('advance','final','partial','other') NOT NULL,
	`receivedAt` timestamp NOT NULL,
	`method` varchar(100),
	`notes` text,
	`registeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `pricingConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('cocina_base','mesones','muebles_especiales','extras','puertas_tapas','herrajes','closets','puertas_producto','centros_tv','otros','acabados_especiales') NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`descriptionTemplate` text,
	`value` decimal(12,2) NOT NULL,
	`unit` varchar(50),
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` tinyint NOT NULL DEFAULT 1,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `pricingHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pricingConfigId` int NOT NULL,
	`previousValue` decimal(12,2) NOT NULL,
	`newValue` decimal(12,2) NOT NULL,
	`changedBy` int NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `priorEstimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`additionalDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`kitchenShape` enum('L','U','lineal'),
	`materialType` enum('quarzone','sinterizado'),
	`linearLength` decimal(10,2),
	`height` decimal(10,2)
);
--> statement-breakpoint
CREATE TABLE `projectDetails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('medida_especial','nota_importante','foto_referencia') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`photoUrl` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `projectHardwareSelections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`hardwareId` int NOT NULL,
	`selectedOption` text,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`quantity` int NOT NULL DEFAULT 1,
	`priceAtQuotation` decimal(10,2)
);
--> statement-breakpoint
CREATE TABLE `projectMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`woodType` enum('rh','estandar'),
	`woodColor` varchar(255),
	`woodPhotoUrl` text,
	`countertopType` enum('granito','cuarzo','sinterizado'),
	`countertopName` varchar(255),
	`countertopPhotoUrl` text,
	`sinkMeasure` varchar(100),
	`sinkPhotoUrl` text,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `projectPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`stage` enum('inicial','diseno','corte','enchape','ensamble','final') NOT NULL,
	`photoUrl` text NOT NULL,
	`description` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`category` enum('cotizacion','medidas','disenos','avance','instalacion','entrega') NOT NULL DEFAULT 'medidas',
	`subcategory` enum('fotos_iniciales','dibujo','renders','despieces','detalles','modelado','modelado_3d','corte','enchape','armado','proceso_instalacion','fotos_finales','documento_cotizacion')
);
--> statement-breakpoint
CREATE TABLE `projectStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fromStatus` varchar(50),
	`toStatus` varchar(50) NOT NULL,
	`changedBy` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int,
	`clientId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`status` enum('contacto','cotizacion_enviada','cotizacion_aprobada','adelanto_recibido','en_diseno','pendiente_modelado','pendiente_render','aprobacion_final','despiece','corte','enchape','ensamble','listo_instalacion','entregado') NOT NULL DEFAULT 'contacto',
	`initialMeasurements` text,
	`design3DFiles` text,
	`despieceFiles` text,
	`clientApprovedAt` timestamp,
	`clientApprovalNotes` text,
	`createdBy` int NOT NULL,
	`designerId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`quotationApprovedAt` timestamp,
	`advanceReceivedAt` timestamp,
	`totalAmount` decimal(12,2),
	`advanceAmount` decimal(12,2),
	`designDeadline` timestamp,
	`designDeliveredAt` timestamp,
	`selectedColors` text,
	`selectedMaterials` text,
	`estimatedInstallDate` timestamp,
	`scheduledInstallDate` timestamp,
	`installDurationDays` int DEFAULT 1,
	`deliveredAt` timestamp,
	`advance_receipt_url` text,
	`quotationPdfUrl` text,
	`tentativeInstallDate` timestamp,
	`isInstallDateOfficial` tinyint DEFAULT 0,
	`modeladoApprovedAt` timestamp,
	`modeladoApprovedBy` varchar(255),
	`rendersApprovedAt` timestamp,
	`rendersApprovedBy` varchar(255),
	`renderRevisionNumber` int DEFAULT 0,
	`modeladoRevisionNumber` int DEFAULT 0,
	`changesRequestedAt` timestamp,
	`deletedAt` timestamp,
	`currentApprovedQuotationId` int,
	`dataOrigin` enum('manual','system') NOT NULL DEFAULT 'manual',
	`isArchived` tinyint NOT NULL DEFAULT 0,
	`skipDesignProcess` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `pushSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256Dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `quotationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`itemNumber` int NOT NULL,
	`itemType` varchar(50) NOT NULL DEFAULT 'otro',
	`description` text NOT NULL,
	`quantity` varchar(50) NOT NULL,
	`unitPrice` varchar(50),
	`totalPrice` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`includesFixedCosts` tinyint NOT NULL DEFAULT 0,
	`kitchenConfig` json,
	`hardwareSelections` json,
	`closetConfig` json,
	`fixedCostsAmount` decimal(12,2) DEFAULT '600000',
	`doorConfig` json,
	`tvCenterConfig` json,
	`countertopConfig` json
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationNumber` varchar(50) NOT NULL,
	`clientId` int NOT NULL,
	`vendorName` varchar(255) NOT NULL,
	`productType` enum('cocina','closet','puerta','centro_tv','herrajes','mesones','acabados_especiales','otro') NOT NULL DEFAULT 'otro',
	`status` enum('draft','sent','approved','rejected') NOT NULL DEFAULT 'draft',
	`validUntil` timestamp,
	`subtotal` decimal(12,2) NOT NULL,
	`transportCost` decimal(12,2) NOT NULL DEFAULT '600000',
	`total` decimal(12,2) NOT NULL,
	`pdfUrl` text,
	`sentAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`customDescriptions` json,
	`generalNotes` text,
	`discountPercent` decimal(5,2) DEFAULT '0',
	`discountAmount` decimal(15,2) DEFAULT '0',
	`isLocked` tinyint NOT NULL DEFAULT 0,
	`lockedAt` timestamp,
	`lockedBy` int,
	`parentQuotationId` int,
	`isAdditional` tinyint NOT NULL DEFAULT 0,
	`baseQuotationId` int,
	`versionNumber` int NOT NULL DEFAULT 1,
	`clientResponseStatus` enum('aprobado','rechazado','revision'),
	`clientResponseNotes` text,
	`clientResponseAt` timestamp,
	`whatsappApiSentAt` timestamp,
	`deletedAt` timestamp,
	`dataOrigin` enum('manual','system') NOT NULL DEFAULT 'manual',
	`isArchived` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`type` enum('cotizacion_sin_respuesta','diseno_pendiente','aprobacion_pendiente','produccion_retrasada','instalacion_proxima') NOT NULL,
	`assignedTo` int NOT NULL,
	`dueDate` timestamp NOT NULL,
	`status` enum('pendiente','enviado','completado','cancelado') NOT NULL DEFAULT 'pendiente',
	`message` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `taskReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`sentBy` int NOT NULL,
	`sentTo` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('alta','media','baja') NOT NULL DEFAULT 'media',
	`status` enum('pendiente','en_progreso','completada') NOT NULL DEFAULT 'pendiente',
	`dueDate` timestamp,
	`assignedTo` int NOT NULL,
	`assignedBy` int NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastReminderSentAt` timestamp,
	`lastReminderSentBy` int,
	`reminderCount` int NOT NULL DEFAULT 0,
	`deletedAt` timestamp
);
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin','comercial','disenador','jefe_taller','operario') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetToken` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `birthDate` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `dataOrigin` enum('manual','system') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `advisoryRequests` ADD CONSTRAINT `advisoryRequests_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointmentWorkTypes` ADD CONSTRAINT `appointmentWorkTypes_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_revision_history` ADD CONSTRAINT `client_revision_history_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_registeredBy_users_id_fk` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `priorEstimates` ADD CONSTRAINT `priorEstimates_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectDetails` ADD CONSTRAINT `projectDetails_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectDetails` ADD CONSTRAINT `projectDetails_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPhotos` ADD CONSTRAINT `projectPhotos_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPhotos` ADD CONSTRAINT `projectPhotos_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectStatusHistory` ADD CONSTRAINT `projectStatusHistory_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectStatusHistory` ADD CONSTRAINT `projectStatusHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_designerId_users_id_fk` FOREIGN KEY (`designerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD CONSTRAINT `pushSubscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotationItems` ADD CONSTRAINT `quotationItems_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskReminders` ADD CONSTRAINT `taskReminders_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskReminders` ADD CONSTRAINT `taskReminders_sentBy_users_id_fk` FOREIGN KEY (`sentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskReminders` ADD CONSTRAINT `taskReminders_sentTo_users_id_fk` FOREIGN KEY (`sentTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `advisoryRequests_clientId_idx` ON `advisoryRequests` (`clientId`);--> statement-breakpoint
CREATE INDEX `advisoryRequests_status_idx` ON `advisoryRequests` (`status`);--> statement-breakpoint
CREATE INDEX `appointmentWorkTypes_appointmentId_idx` ON `appointmentWorkTypes` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `appointments_clientId_idx` ON `appointments` (`clientId`);--> statement-breakpoint
CREATE INDEX `appointments_scheduledDate_idx` ON `appointments` (`scheduledDate`);--> statement-breakpoint
CREATE INDEX `appointments_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `appointments_client_status_idx` ON `appointments` (`clientId`,`status`);--> statement-breakpoint
CREATE INDEX `clientRevisionHistory_projectId_idx` ON `client_revision_history` (`projectId`);--> statement-breakpoint
CREATE INDEX `clients_userId_idx` ON `clients` (`userId`);--> statement-breakpoint
CREATE INDEX `clients_whatsappPhone_idx` ON `clients` (`whatsappPhone`);--> statement-breakpoint
CREATE INDEX `colombianHolidays_year_idx` ON `colombianHolidays` (`year`);--> statement-breakpoint
CREATE INDEX `colombianHolidays_date_idx` ON `colombianHolidays` (`date`);--> statement-breakpoint
CREATE INDEX `id` ON `__drizzle_migrations__` (`id`);--> statement-breakpoint
CREATE INDEX `expenses_projectId_idx` ON `expenses` (`projectId`);--> statement-breakpoint
CREATE INDEX `expenses_expenseDate_idx` ON `expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `expenses_expenseType_idx` ON `expenses` (`expenseType`);--> statement-breakpoint
CREATE INDEX `financialAlerts_alertType_idx` ON `financialAlerts` (`alertType`);--> statement-breakpoint
CREATE INDEX `financialAlerts_isActive_idx` ON `financialAlerts` (`isActive`);--> statement-breakpoint
CREATE INDEX `hardwareCatalog_category_idx` ON `hardwareCatalog` (`category`);--> statement-breakpoint
CREATE INDEX `hardwareCatalog_active_idx` ON `hardwareCatalog` (`active`);--> statement-breakpoint
CREATE INDEX `kitchenQuotations_quotationId_idx` ON `kitchenQuotations` (`quotationId`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`read`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`read`);--> statement-breakpoint
CREATE INDEX `payments_projectId_idx` ON `payments` (`projectId`);--> statement-breakpoint
CREATE INDEX `payments_receivedAt_idx` ON `payments` (`receivedAt`);--> statement-breakpoint
CREATE INDEX `code` ON `pricingConfig` (`code`);--> statement-breakpoint
CREATE INDEX `pricingConfig_category_idx` ON `pricingConfig` (`category`);--> statement-breakpoint
CREATE INDEX `pricingHistory_pricingConfigId_idx` ON `pricingHistory` (`pricingConfigId`);--> statement-breakpoint
CREATE INDEX `priorEstimates_clientId_idx` ON `priorEstimates` (`clientId`);--> statement-breakpoint
CREATE INDEX `projectDetails_projectId_idx` ON `projectDetails` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectHardwareSelections_projectId_idx` ON `projectHardwareSelections` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectHardwareSelections_hardwareId_idx` ON `projectHardwareSelections` (`hardwareId`);--> statement-breakpoint
CREATE INDEX `projectMaterials_projectId_idx` ON `projectMaterials` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectPhotos_projectId_idx` ON `projectPhotos` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectPhotos_category_idx` ON `projectPhotos` (`category`);--> statement-breakpoint
CREATE INDEX `projectPhotos_project_category_idx` ON `projectPhotos` (`projectId`,`category`);--> statement-breakpoint
CREATE INDEX `projectStatusHistory_projectId_idx` ON `projectStatusHistory` (`projectId`);--> statement-breakpoint
CREATE INDEX `projects_quotationId_quotations_id_fk` ON `projects` (`quotationId`);--> statement-breakpoint
CREATE INDEX `projects_clientId_idx` ON `projects` (`clientId`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_createdAt_idx` ON `projects` (`createdAt`);--> statement-breakpoint
CREATE INDEX `projects_quotationId_idx` ON `projects` (`quotationId`);--> statement-breakpoint
CREATE INDEX `projects_designerId_idx` ON `projects` (`designerId`);--> statement-breakpoint
CREATE INDEX `projects_createdBy_idx` ON `projects` (`createdBy`);--> statement-breakpoint
CREATE INDEX `pushSubscriptions_userId_idx` ON `pushSubscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `quotationItems_quotationId_idx` ON `quotationItems` (`quotationId`);--> statement-breakpoint
CREATE INDEX `quotationNumber` ON `quotations` (`quotationNumber`);--> statement-breakpoint
CREATE INDEX `quotations_clientId_idx` ON `quotations` (`clientId`);--> statement-breakpoint
CREATE INDEX `quotations_status_idx` ON `quotations` (`status`);--> statement-breakpoint
CREATE INDEX `quotations_createdBy_idx` ON `quotations` (`createdBy`);--> statement-breakpoint
CREATE INDEX `quotations_createdAt_idx` ON `quotations` (`createdAt`);--> statement-breakpoint
CREATE INDEX `quotations_clientResponseStatus_idx` ON `quotations` (`clientResponseStatus`);--> statement-breakpoint
CREATE INDEX `reminders_projectId_idx` ON `reminders` (`projectId`);--> statement-breakpoint
CREATE INDEX `reminders_assignedTo_idx` ON `reminders` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `reminders_dueDate_idx` ON `reminders` (`dueDate`);--> statement-breakpoint
CREATE INDEX `reminders_status_idx` ON `reminders` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_assignedTo_idx` ON `tasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_dueDate_idx` ON `tasks` (`dueDate`);--> statement-breakpoint
CREATE INDEX `tasks_projectId_idx` ON `tasks` (`projectId`);--> statement-breakpoint
CREATE INDEX `tasks_assigned_status_idx` ON `tasks` (`assignedTo`,`status`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);