CREATE TABLE `pricingConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('cocina_base','mesones','muebles_especiales','extras','puertas_tapas','herrajes','closets','puertas_producto','centros_tv','otros') NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`value` decimal(12,2) NOT NULL,
	`unit` varchar(50),
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricingConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricingConfig_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `pricingHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pricingConfigId` int NOT NULL,
	`previousValue` decimal(12,2) NOT NULL,
	`newValue` decimal(12,2) NOT NULL,
	`changedBy` int NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pricingHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pricingConfig` ADD CONSTRAINT `pricingConfig_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pricingHistory` ADD CONSTRAINT `pricingHistory_pricingConfigId_pricingConfig_id_fk` FOREIGN KEY (`pricingConfigId`) REFERENCES `pricingConfig`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pricingHistory` ADD CONSTRAINT `pricingHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;