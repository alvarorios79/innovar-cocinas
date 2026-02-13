ALTER TABLE `appointments` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `clients` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `quotations` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tasks` ADD `deletedAt` timestamp;