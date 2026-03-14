ALTER TABLE `projects` ADD `accountingClosureId` int;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_accountingClosureId_accountingClosures_id_fk` FOREIGN KEY (`accountingClosureId`) REFERENCES `accountingClosures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `projects_accountingClosureId_idx` ON `projects` (`accountingClosureId`);