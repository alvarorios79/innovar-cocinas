CREATE TABLE `closureAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`closureId` int NOT NULL,
	`action` enum('created','confirmed','deleted') NOT NULL,
	`performedBy` int NOT NULL,
	`actionDetails` json,
	`timestamp` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`ipAddress` varchar(45),
	`userAgent` text
);
--> statement-breakpoint
ALTER TABLE `closureAuditLog` ADD CONSTRAINT `closureAuditLog_closureId_accountingClosures_id_fk` FOREIGN KEY (`closureId`) REFERENCES `accountingClosures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `closureAuditLog` ADD CONSTRAINT `closureAuditLog_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `closureAuditLog_closureId_idx` ON `closureAuditLog` (`closureId`);--> statement-breakpoint
CREATE INDEX `closureAuditLog_performedBy_idx` ON `closureAuditLog` (`performedBy`);--> statement-breakpoint
CREATE INDEX `closureAuditLog_action_idx` ON `closureAuditLog` (`action`);--> statement-breakpoint
CREATE INDEX `closureAuditLog_timestamp_idx` ON `closureAuditLog` (`timestamp`);