CREATE TABLE `financialAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` enum('deliveredWithOutstanding','lowCollectionRate') NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 0,
	`lastTriggeredAt` timestamp,
	`lastMessageSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `financialAlerts_alertType_idx` ON `financialAlerts` (`alertType`);--> statement-breakpoint
CREATE INDEX `financialAlerts_isActive_idx` ON `financialAlerts` (`isActive`);