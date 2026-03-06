CREATE TABLE `cleanupAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableName` varchar(100) NOT NULL,
	`recordsDeleted` int NOT NULL,
	`executedBy` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`cleanupSessionId` varchar(255),
	`details` json
);
--> statement-breakpoint
ALTER TABLE `cleanupAuditLog` ADD CONSTRAINT `cleanupAuditLog_executedBy_users_id_fk` FOREIGN KEY (`executedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cleanupAuditLog_executedBy_idx` ON `cleanupAuditLog` (`executedBy`);--> statement-breakpoint
CREATE INDEX `cleanupAuditLog_timestamp_idx` ON `cleanupAuditLog` (`timestamp`);--> statement-breakpoint
CREATE INDEX `cleanupAuditLog_cleanupSessionId_idx` ON `cleanupAuditLog` (`cleanupSessionId`);