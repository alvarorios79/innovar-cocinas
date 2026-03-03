ALTER TABLE `appointments` ADD `dataOrigin` enum('manual','system') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `dataOrigin` enum('manual','system') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `dataOrigin` enum('manual','system') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `dataOrigin` enum('manual','system') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `dataOrigin` enum('manual','system') DEFAULT 'manual' NOT NULL;