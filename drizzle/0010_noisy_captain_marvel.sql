CREATE TABLE `colombianHolidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`name` varchar(255) NOT NULL,
	`year` int NOT NULL,
	CONSTRAINT `colombianHolidays_id` PRIMARY KEY(`id`)
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
ALTER TABLE `projects` MODIFY COLUMN `status` enum('cotizacion_enviada','cotizacion_aprobada','adelanto_recibido','en_diseno','pendiente_cliente','aprobacion_final','despiece','corte','enchape','ensamble','listo_instalacion','instalacion_programada','entregado') NOT NULL DEFAULT 'cotizacion_enviada';--> statement-breakpoint
ALTER TABLE `projects` ADD `quotationSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `quotationApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `advanceReceivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `advanceAmount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `projects` ADD `designDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `designDeliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `selectedColors` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `selectedMaterials` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `estimatedInstallDate` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `scheduledInstallDate` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `installDurationDays` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `projects` ADD `deliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;