CREATE TABLE `accountingClosureProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`closureId` int NOT NULL,
	`projectId` int NOT NULL,
	`projectName` varchar(255) NOT NULL,
	`projectValue` decimal(15,2) NOT NULL,
	`totalPaid` decimal(15,2) NOT NULL,
	`totalExpenses` decimal(15,2) NOT NULL,
	`profit` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `accountingClosures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`status` enum('draft','confirmed') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`confirmedBy` int,
	`totalSales` decimal(15,2) NOT NULL DEFAULT '0',
	`totalExpenses` decimal(15,2) NOT NULL DEFAULT '0',
	`totalProfit` decimal(15,2) NOT NULL DEFAULT '0',
	`projectCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`confirmedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `accountingClosureProjects` ADD CONSTRAINT `accountingClosureProjects_closureId_accountingClosures_id_fk` FOREIGN KEY (`closureId`) REFERENCES `accountingClosures`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accountingClosureProjects` ADD CONSTRAINT `accountingClosureProjects_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accountingClosures` ADD CONSTRAINT `accountingClosures_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accountingClosureProjects_closureId_idx` ON `accountingClosureProjects` (`closureId`);--> statement-breakpoint
CREATE INDEX `accountingClosureProjects_projectId_idx` ON `accountingClosureProjects` (`projectId`);--> statement-breakpoint
CREATE INDEX `accountingClosures_status_idx` ON `accountingClosures` (`status`);--> statement-breakpoint
CREATE INDEX `accountingClosures_createdBy_idx` ON `accountingClosures` (`createdBy`);--> statement-breakpoint
CREATE INDEX `accountingClosures_periodStart_idx` ON `accountingClosures` (`periodStart`);--> statement-breakpoint
CREATE INDEX `accountingClosures_periodEnd_idx` ON `accountingClosures` (`periodEnd`);