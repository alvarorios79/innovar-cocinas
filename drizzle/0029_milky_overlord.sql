ALTER TABLE `projects` ADD `modeladoApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `modeladoApprovedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `rendersApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `rendersApprovedBy` varchar(255);