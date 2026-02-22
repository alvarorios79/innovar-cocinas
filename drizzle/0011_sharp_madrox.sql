CREATE TABLE `financialSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outstandingThresholdPercent` int NOT NULL DEFAULT 40,
	`collectionThresholdPercent` int NOT NULL DEFAULT 70,
	`lowProfitThresholdPercent` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialSettings_id` PRIMARY KEY(`id`)
);
