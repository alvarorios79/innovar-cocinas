ALTER TABLE `pushSubscriptions` DROP FOREIGN KEY `pushSubscriptions_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD `isActive` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD `lastUsedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD `dataOrigin` enum('manual','system') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD CONSTRAINT `pushSubscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pushSubscriptions_endpoint_idx` ON `pushSubscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `pushSubscriptions_isActive_idx` ON `pushSubscriptions` (`isActive`);--> statement-breakpoint
CREATE INDEX `pushSubscriptions_createdAt_idx` ON `pushSubscriptions` (`createdAt`);