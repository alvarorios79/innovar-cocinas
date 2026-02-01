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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;