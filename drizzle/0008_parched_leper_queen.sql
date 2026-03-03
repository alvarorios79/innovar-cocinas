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
ALTER TABLE `payments` ADD CONSTRAINT `payments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_registeredBy_users_id_fk` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payments_projectId_idx` ON `payments` (`projectId`);--> statement-breakpoint
CREATE INDEX `payments_receivedAt_idx` ON `payments` (`receivedAt`);