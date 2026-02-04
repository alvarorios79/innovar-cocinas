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
ALTER TABLE `client_revision_history` ADD CONSTRAINT `client_revision_history_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;