ALTER TABLE `appointments` MODIFY COLUMN `dataOrigin` enum('manual','system','test') NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `dataOrigin` enum('manual','system','test') NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `dataOrigin` enum('manual','system','test') NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `quotations` MODIFY COLUMN `dataOrigin` enum('manual','system','test') NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `dataOrigin` enum('manual','system','test') NOT NULL DEFAULT 'manual';