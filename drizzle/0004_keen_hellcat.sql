ALTER TABLE `quotations` ADD `clientResponseStatus` enum('aprobado','rechazado','revision');--> statement-breakpoint
ALTER TABLE `quotations` ADD `clientResponseNotes` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `clientResponseAt` timestamp;--> statement-breakpoint
CREATE INDEX `quotations_clientResponseStatus_idx` ON `quotations` (`clientResponseStatus`);--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `quotationSentAt`;