CREATE TABLE `advisoryRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`status` enum('pendiente','contactado','completado') NOT NULL DEFAULT 'pendiente',
	`preferredCallTime` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advisoryRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointmentWorkTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointmentWorkTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`scheduledDate` timestamp,
	`status` enum('pendiente','confirmada','completada','cancelada') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_revision_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('modelado_3d','renders') NOT NULL,
	`revisionNumber` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`changes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_revision_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`whatsappPhone` varchar(20) NOT NULL,
	`address` text,
	`internalManagement` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `colombianHolidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`name` varchar(255) NOT NULL,
	`year` int NOT NULL,
	CONSTRAINT `colombianHolidays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseType` enum('materiales_proyecto','gasto_operativo') NOT NULL,
	`projectId` int,
	`projectClientName` varchar(255),
	`generalCategory` enum('materiales','mano_de_obra','alquiler','servicios','transporte','mantenimiento','otros') NOT NULL,
	`subcategory` varchar(255),
	`operativeCategory` enum('arriendo','energia','agua','internet','mantenimiento','herramientas','jardineria','reparaciones','transporte','papeleria','aseo','otro'),
	`description` text NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`supportUrl` text,
	`supportFileName` varchar(255),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hardwareCatalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('cocinas','closets','puertas') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`options` text,
	`photoUrl` text,
	`price` decimal(12,2) NOT NULL DEFAULT '0',
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hardwareCatalog_id` PRIMARY KEY(`id`)
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
	`hasNichoNevecon` boolean NOT NULL DEFAULT false,
	`nichoNeveconPrice` decimal(12,2),
	`hasNichoNeveraStandard` boolean NOT NULL DEFAULT false,
	`nichoNeveraStandardPrice` decimal(12,2),
	`hasAlacenaEntrepanos` boolean NOT NULL DEFAULT false,
	`alacenaEntrepanosPrice` decimal(12,2),
	`hasAlacenaHerraje` boolean NOT NULL DEFAULT false,
	`alacenaHerrajePrice` decimal(12,2),
	`hasHerrajeItem` boolean NOT NULL DEFAULT false,
	`herrajePrice` decimal(12,2),
	`hasTorreHornos` boolean NOT NULL DEFAULT false,
	`torreHornosPrice` decimal(12,2),
	`countertopType` enum('quarzone','sinterizado') NOT NULL,
	`countertopMeters` decimal(10,2) NOT NULL,
	`countertopSurcharge30` boolean NOT NULL DEFAULT false,
	`countertopDouble` boolean NOT NULL DEFAULT false,
	`countertopPrice` decimal(12,2) NOT NULL,
	`hasIsland` boolean NOT NULL DEFAULT false,
	`islandCabinetsMeters` decimal(10,2),
	`islandCabinetsPrice` decimal(12,2),
	`islandCountertopMeters` decimal(10,2),
	`islandCountertopType` enum('quarzone','sinterizado'),
	`islandCountertopPrice` decimal(12,2),
	`islandHasLaterals` boolean NOT NULL DEFAULT false,
	`islandLateralPrice` decimal(12,2),
	`islandRegruesoPrice` decimal(12,2),
	`islandTotalPrice` decimal(12,2),
	`hasBar` boolean NOT NULL DEFAULT false,
	`barCabinetsMeters` decimal(10,2),
	`barCabinetsPrice` decimal(12,2),
	`barCountertopMeters` decimal(10,2),
	`barCountertopType` enum('quarzone','sinterizado'),
	`barCountertopPrice` decimal(12,2),
	`barHasLateral` boolean NOT NULL DEFAULT false,
	`barLateralPrice` decimal(12,2),
	`barTotalPrice` decimal(12,2),
	`hasLed` boolean NOT NULL DEFAULT false,
	`ledMeters` decimal(10,2),
	`ledPrice` decimal(12,2),
	`hasPaintedDoors` boolean NOT NULL DEFAULT false,
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
	`paintedDoorsTotalPrice` decimal(12,2),
	`transportCost` decimal(12,2) NOT NULL DEFAULT '600000',
	`subtotal` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kitchenQuotations_id` PRIMARY KEY(`id`)
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
	`read` boolean NOT NULL DEFAULT false,
	`sentPush` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricingConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('cocina_base','mesones','muebles_especiales','extras','puertas_tapas','herrajes','closets','puertas_producto','centros_tv','otros','acabados_especiales') NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`value` decimal(12,2) NOT NULL,
	`unit` varchar(50),
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricingConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricingConfig_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `pricingHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pricingConfigId` int NOT NULL,
	`previousValue` decimal(12,2) NOT NULL,
	`newValue` decimal(12,2) NOT NULL,
	`changedBy` int NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pricingHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priorEstimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`kitchenShape` enum('L','U','lineal'),
	`linearLength` decimal(10,2),
	`height` decimal(10,2),
	`materialType` enum('quarzone','sinterizado'),
	`additionalDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priorEstimates_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectDetails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectHardwareSelections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`hardwareId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`priceAtQuotation` decimal(10,2),
	`selectedOption` text,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectHardwareSelections_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('adelanto','saldo_final','abono','otro') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`receiptUrl` text,
	`notes` text,
	`registeredBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`stage` enum('inicial','diseno','corte','enchape','ensamble','final') NOT NULL,
	`category` enum('cotizacion','medidas','disenos','avance','instalacion','entrega') NOT NULL DEFAULT 'medidas',
	`subcategory` enum('fotos_iniciales','dibujo','renders','despieces','detalles','modelado_3d','corte','enchape','armado','proceso_instalacion','fotos_finales','documento_cotizacion'),
	`photoUrl` text NOT NULL,
	`description` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fromStatus` varchar(50),
	`toStatus` varchar(50) NOT NULL,
	`changedBy` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectStatusHistory_id` PRIMARY KEY(`id`)
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
	`design3dFiles` text,
	`despieceFiles` text,
	`quotationSentAt` timestamp,
	`quotationApprovedAt` timestamp,
	`advanceReceivedAt` timestamp,
	`currentApprovedQuotationId` int,
	`totalAmount` decimal(12,2),
	`advanceAmount` decimal(12,2),
	`advanceReceiptUrl` text,
	`quotationPdfUrl` text,
	`designDeadline` timestamp,
	`designDeliveredAt` timestamp,
	`clientApprovedAt` timestamp,
	`clientApprovalNotes` text,
	`modeladoApprovedAt` timestamp,
	`modeladoApprovedBy` varchar(255),
	`rendersApprovedAt` timestamp,
	`rendersApprovedBy` varchar(255),
	`modeladoRevisionNumber` int DEFAULT 0,
	`renderRevisionNumber` int DEFAULT 0,
	`changesRequestedAt` timestamp,
	`selectedColors` text,
	`selectedMaterials` text,
	`tentativeInstallDate` timestamp,
	`isInstallDateOfficial` boolean DEFAULT false,
	`estimatedInstallDate` timestamp,
	`scheduledInstallDate` timestamp,
	`installDurationDays` int DEFAULT 1,
	`deliveredAt` timestamp,
	`createdBy` int NOT NULL,
	`designerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pushSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pushSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`itemNumber` int NOT NULL,
	`itemType` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`quantity` varchar(50) NOT NULL,
	`unitPrice` varchar(50),
	`totalPrice` varchar(50) NOT NULL,
	`includesFixedCosts` boolean NOT NULL DEFAULT false,
	`fixedCostsAmount` int,
	`kitchenConfig` json,
	`hardwareSelections` json,
	`closetConfig` json,
	`doorConfig` json,
	`tvCenterConfig` json,
	`countertopConfig` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationItems_id` PRIMARY KEY(`id`)
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
	`discountPercent` decimal(5,2) DEFAULT '0',
	`discountAmount` decimal(12,2) DEFAULT '0',
	`total` decimal(12,2) NOT NULL,
	`pdfUrl` text,
	`customDescriptions` json,
	`generalNotes` text,
	`sentAt` timestamp,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`isLocked` boolean NOT NULL DEFAULT false,
	`lockedAt` timestamp,
	`lockedBy` int,
	`parentQuotationId` int,
	`isAdditional` boolean NOT NULL DEFAULT false,
	`baseQuotationId` int,
	`versionNumber` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('cotizacion_sin_respuesta','diseno_pendiente','aprobacion_pendiente','produccion_retrasada','instalacion_proxima') NOT NULL,
	`assignedTo` int NOT NULL,
	`dueDate` timestamp NOT NULL,
	`status` enum('pendiente','enviado','completado','cancelado') NOT NULL DEFAULT 'pendiente',
	`message` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
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
	`lastReminderSentAt` timestamp,
	`lastReminderSentBy` int,
	`reminderCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`passwordHash` varchar(255),
	`passwordResetToken` varchar(100),
	`passwordResetExpires` timestamp,
	`role` enum('user','admin','super_admin','comercial','disenador','jefe_taller','operario') NOT NULL DEFAULT 'user',
	`phone` varchar(20),
	`birthDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `advisoryRequests` ADD CONSTRAINT `advisoryRequests_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointmentWorkTypes` ADD CONSTRAINT `appointmentWorkTypes_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_revision_history` ADD CONSTRAINT `client_revision_history_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD CONSTRAINT `kitchenQuotations_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pricingConfig` ADD CONSTRAINT `pricingConfig_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pricingHistory` ADD CONSTRAINT `pricingHistory_pricingConfigId_pricingConfig_id_fk` FOREIGN KEY (`pricingConfigId`) REFERENCES `pricingConfig`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pricingHistory` ADD CONSTRAINT `pricingHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `priorEstimates` ADD CONSTRAINT `priorEstimates_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectDetails` ADD CONSTRAINT `projectDetails_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectDetails` ADD CONSTRAINT `projectDetails_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectHardwareSelections` ADD CONSTRAINT `projectHardwareSelections_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectHardwareSelections` ADD CONSTRAINT `projectHardwareSelections_hardwareId_hardwareCatalog_id_fk` FOREIGN KEY (`hardwareId`) REFERENCES `hardwareCatalog`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectHardwareSelections` ADD CONSTRAINT `projectHardwareSelections_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMaterials` ADD CONSTRAINT `projectMaterials_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectMaterials` ADD CONSTRAINT `projectMaterials_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPayments` ADD CONSTRAINT `projectPayments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPayments` ADD CONSTRAINT `projectPayments_registeredBy_users_id_fk` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPhotos` ADD CONSTRAINT `projectPhotos_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPhotos` ADD CONSTRAINT `projectPhotos_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectStatusHistory` ADD CONSTRAINT `projectStatusHistory_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectStatusHistory` ADD CONSTRAINT `projectStatusHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_designerId_users_id_fk` FOREIGN KEY (`designerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD CONSTRAINT `pushSubscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotationItems` ADD CONSTRAINT `quotationItems_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_lockedBy_users_id_fk` FOREIGN KEY (`lockedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_lastReminderSentBy_users_id_fk` FOREIGN KEY (`lastReminderSentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX `expenses_projectId_idx` ON `expenses` (`projectId`);--> statement-breakpoint
CREATE INDEX `expenses_expenseDate_idx` ON `expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `expenses_expenseType_idx` ON `expenses` (`expenseType`);--> statement-breakpoint
CREATE INDEX `hardwareCatalog_category_idx` ON `hardwareCatalog` (`category`);--> statement-breakpoint
CREATE INDEX `hardwareCatalog_active_idx` ON `hardwareCatalog` (`active`);--> statement-breakpoint
CREATE INDEX `kitchenQuotations_quotationId_idx` ON `kitchenQuotations` (`quotationId`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`read`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`read`);--> statement-breakpoint
CREATE INDEX `pricingConfig_category_idx` ON `pricingConfig` (`category`);--> statement-breakpoint
CREATE INDEX `pricingHistory_pricingConfigId_idx` ON `pricingHistory` (`pricingConfigId`);--> statement-breakpoint
CREATE INDEX `priorEstimates_clientId_idx` ON `priorEstimates` (`clientId`);--> statement-breakpoint
CREATE INDEX `projectDetails_projectId_idx` ON `projectDetails` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectHardwareSelections_projectId_idx` ON `projectHardwareSelections` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectHardwareSelections_hardwareId_idx` ON `projectHardwareSelections` (`hardwareId`);--> statement-breakpoint
CREATE INDEX `projectMaterials_projectId_idx` ON `projectMaterials` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectPayments_projectId_idx` ON `projectPayments` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectPhotos_projectId_idx` ON `projectPhotos` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectPhotos_category_idx` ON `projectPhotos` (`category`);--> statement-breakpoint
CREATE INDEX `projectPhotos_project_category_idx` ON `projectPhotos` (`projectId`,`category`);--> statement-breakpoint
CREATE INDEX `projectStatusHistory_projectId_idx` ON `projectStatusHistory` (`projectId`);--> statement-breakpoint
CREATE INDEX `projects_clientId_idx` ON `projects` (`clientId`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_createdAt_idx` ON `projects` (`createdAt`);--> statement-breakpoint
CREATE INDEX `projects_quotationId_idx` ON `projects` (`quotationId`);--> statement-breakpoint
CREATE INDEX `projects_designerId_idx` ON `projects` (`designerId`);--> statement-breakpoint
CREATE INDEX `projects_createdBy_idx` ON `projects` (`createdBy`);--> statement-breakpoint
CREATE INDEX `pushSubscriptions_userId_idx` ON `pushSubscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `quotationItems_quotationId_idx` ON `quotationItems` (`quotationId`);--> statement-breakpoint
CREATE INDEX `quotations_clientId_idx` ON `quotations` (`clientId`);--> statement-breakpoint
CREATE INDEX `quotations_status_idx` ON `quotations` (`status`);--> statement-breakpoint
CREATE INDEX `quotations_createdBy_idx` ON `quotations` (`createdBy`);--> statement-breakpoint
CREATE INDEX `quotations_createdAt_idx` ON `quotations` (`createdAt`);--> statement-breakpoint
CREATE INDEX `reminders_projectId_idx` ON `reminders` (`projectId`);--> statement-breakpoint
CREATE INDEX `reminders_assignedTo_idx` ON `reminders` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `reminders_dueDate_idx` ON `reminders` (`dueDate`);--> statement-breakpoint
CREATE INDEX `reminders_status_idx` ON `reminders` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_assignedTo_idx` ON `tasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_dueDate_idx` ON `tasks` (`dueDate`);--> statement-breakpoint
CREATE INDEX `tasks_projectId_idx` ON `tasks` (`projectId`);--> statement-breakpoint
CREATE INDEX `tasks_assigned_status_idx` ON `tasks` (`assignedTo`,`status`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);