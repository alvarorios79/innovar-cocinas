CREATE TABLE `postventaReclamaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('reclamacion','seguimiento_30d','revision_anual') NOT NULL DEFAULT 'reclamacion',
	`status` enum('pendiente','en_revision','resuelto','no_procede') NOT NULL DEFAULT 'pendiente',
	`priority` enum('alta','media','baja') NOT NULL DEFAULT 'media',
	`assignedTo` int,
	`createdBy` int NOT NULL,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`resolvedNotes` text,
	`scheduledFor` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `postventaReclamaciones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `postventaReclamaciones` ADD CONSTRAINT `postventaReclamaciones_projectId_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `postventaReclamaciones` ADD CONSTRAINT `postventaReclamaciones_assignedTo_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `postventaReclamaciones` ADD CONSTRAINT `postventaReclamaciones_createdBy_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `postventaReclamaciones` ADD CONSTRAINT `postventaReclamaciones_resolvedBy_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX `postventa_projectId_idx` ON `postventaReclamaciones` (`projectId`);
--> statement-breakpoint
CREATE INDEX `postventa_status_idx` ON `postventaReclamaciones` (`status`);
--> statement-breakpoint
CREATE INDEX `postventa_type_idx` ON `postventaReclamaciones` (`type`);
--> statement-breakpoint
CREATE INDEX `postventa_scheduledFor_idx` ON `postventaReclamaciones` (`scheduledFor`);
