CREATE TABLE `kitchenQuotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`shape` enum('L','U','lineal') NOT NULL,
	`totalMeters` decimal(10,2) NOT NULL,
	`resultingMeters` decimal(10,2) NOT NULL,
	`lowerCabinetsMeters` decimal(10,2) NOT NULL,
	`lowerCabinetsPrice` decimal(12,2) NOT NULL,
	`upperCabinetsMeters` decimal(10,2) NOT NULL,
	`upperCabinetsPrice` decimal(12,2) NOT NULL,
	`hasNichoNevecon` boolean NOT NULL DEFAULT false,
	`nichoNeveconPrice` decimal(12,2),
	`hasNichoNeveraStandard` boolean NOT NULL DEFAULT false,
	`nichoNeveraStandardPrice` decimal(12,2),
	`hasAlacenaEntrepanos` boolean NOT NULL DEFAULT false,
	`alacenaEntrepanosPrice` decimal(12,2),
	`hasAlacenaHerraje` boolean NOT NULL DEFAULT false,
	`alacenaHerrajePrice` decimal(12,2),
	`hasHerrajeItem` boolean NOT NULL DEFAULT false,
	`herrajePrice` decimal(12,2),
	`hasTorreHornos` boolean NOT NULL DEFAULT false,
	`torreHornosPrice` decimal(12,2),
	`countertopType` enum('quarzone','sinterizado') NOT NULL,
	`countertopMeters` decimal(10,2) NOT NULL,
	`countertopSurcharge30` boolean NOT NULL DEFAULT false,
	`countertopDouble` boolean NOT NULL DEFAULT false,
	`countertopPrice` decimal(12,2) NOT NULL,
	`hasIsland` boolean NOT NULL DEFAULT false,
	`islandCabinetsMeters` decimal(10,2),
	`islandCabinetsPrice` decimal(12,2),
	`islandCountertopMeters` decimal(10,2),
	`islandCountertopType` enum('quarzone','sinterizado'),
	`islandCountertopPrice` decimal(12,2),
	`islandHasLaterals` boolean NOT NULL DEFAULT false,
	`islandLateralPrice` decimal(12,2),
	`islandRegruesoPrice` decimal(12,2),
	`islandTotalPrice` decimal(12,2),
	`hasBar` boolean NOT NULL DEFAULT false,
	`barCabinetsMeters` decimal(10,2),
	`barCabinetsPrice` decimal(12,2),
	`barCountertopMeters` decimal(10,2),
	`barCountertopType` enum('quarzone','sinterizado'),
	`barCountertopPrice` decimal(12,2),
	`barHasLateral` boolean NOT NULL DEFAULT false,
	`barLateralPrice` decimal(12,2),
	`barTotalPrice` decimal(12,2),
	`hasLed` boolean NOT NULL DEFAULT false,
	`ledMeters` decimal(10,2),
	`ledPrice` decimal(12,2),
	`transportCost` decimal(12,2) NOT NULL DEFAULT '600000',
	`subtotal` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kitchenQuotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`itemNumber` int NOT NULL,
	`itemType` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`quantity` varchar(50) NOT NULL,
	`unitPrice` varchar(50),
	`totalPrice` varchar(50) NOT NULL,
	`includesFixedCosts` boolean NOT NULL DEFAULT false,
	`fixedCostsAmount` int,
	`kitchenConfig` json,
	`hardwareSelections` json,
	`closetConfig` json,
	`doorConfig` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quotations` DROP FOREIGN KEY `quotations_appointmentId_appointments_id_fk`;
--> statement-breakpoint
ALTER TABLE `quotations` MODIFY COLUMN `status` enum('draft','sent','approved','rejected') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `hardwareCatalog` ADD `price` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `projectHardwareSelections` ADD `quantity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `projectHardwareSelections` ADD `priceAtQuotation` decimal(10,2);--> statement-breakpoint
ALTER TABLE `quotations` ADD `quotationNumber` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `vendorName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `productType` enum('cocina','closet','puerta','centro_tv','herrajes','otro') DEFAULT 'otro' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `subtotal` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `transportCost` decimal(12,2) DEFAULT '600000' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `total` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `pdfUrl` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `sentAt` timestamp;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`);--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD CONSTRAINT `kitchenQuotations_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotationItems` ADD CONSTRAINT `quotationItems_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `appointmentId`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `workType`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `kitchenShape`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `measurements`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `materialType`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `materials`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `totalPrice`;--> statement-breakpoint
ALTER TABLE `quotations` DROP COLUMN `sentViaWhatsApp`;