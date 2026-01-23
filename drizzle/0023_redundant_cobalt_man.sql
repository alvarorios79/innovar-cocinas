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
ALTER TABLE `projectPayments` ADD CONSTRAINT `projectPayments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectPayments` ADD CONSTRAINT `projectPayments_registeredBy_users_id_fk` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;