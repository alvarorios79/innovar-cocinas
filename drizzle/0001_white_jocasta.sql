CREATE TABLE `advisoryRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`status` enum('pendiente','contactado','completado') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advisoryRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`scheduledDate` timestamp,
	`status` enum('pendiente','confirmada','completada','cancelada') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`whatsappPhone` varchar(20) NOT NULL,
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priorEstimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`length` decimal(10,2),
	`width` decimal(10,2),
	`height` decimal(10,2),
	`counterTopType` enum('cuarzo','sinterizado'),
	`additionalDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priorEstimates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`appointmentId` int,
	`workType` enum('cocina','closet','puertas','centro_tv') NOT NULL,
	`description` text NOT NULL,
	`materials` text,
	`totalPrice` decimal(12,2) NOT NULL,
	`validUntil` timestamp,
	`status` enum('borrador','enviada','aceptada','rechazada') NOT NULL DEFAULT 'borrador',
	`sentViaWhatsApp` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `advisoryRequests` ADD CONSTRAINT `advisoryRequests_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `priorEstimates` ADD CONSTRAINT `priorEstimates_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;