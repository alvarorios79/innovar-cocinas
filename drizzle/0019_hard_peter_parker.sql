CREATE TABLE `backupMetadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupName` varchar(255) NOT NULL,
	`backupType` enum('daily','weekly','manual') NOT NULL,
	`s3Key` varchar(500) NOT NULL,
	`s3Url` text NOT NULL,
	`fileSize` bigint,
	`rowCounts` json,
	`checksums` json,
	`status` enum('pending','completed','failed','verified') NOT NULL DEFAULT 'pending',
	`verificationStatus` enum('not_verified','verified','failed') NOT NULL DEFAULT 'not_verified',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp,
	`verifiedAt` timestamp,
	`expiresAt` timestamp,
	`createdBy` int,
	`retentionDays` int NOT NULL DEFAULT 30,
	`dataOriginSummary` json
);
--> statement-breakpoint
ALTER TABLE `backupMetadata` ADD CONSTRAINT `backupMetadata_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `backupMetadata_status_idx` ON `backupMetadata` (`status`);--> statement-breakpoint
CREATE INDEX `backupMetadata_backupType_idx` ON `backupMetadata` (`backupType`);--> statement-breakpoint
CREATE INDEX `backupMetadata_createdAt_idx` ON `backupMetadata` (`createdAt`);--> statement-breakpoint
CREATE INDEX `backupMetadata_expiresAt_idx` ON `backupMetadata` (`expiresAt`);