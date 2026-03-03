DROP TABLE `advisoryRequests`;--> statement-breakpoint
DROP TABLE `appointmentWorkTypes`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
DROP TABLE `client_revision_history`;--> statement-breakpoint
DROP TABLE `clients`;--> statement-breakpoint
DROP TABLE `colombianHolidays`;--> statement-breakpoint
DROP TABLE `__drizzle_migrations__`;--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
DROP TABLE `financialAlerts`;--> statement-breakpoint
DROP TABLE `financialSettings`;--> statement-breakpoint
DROP TABLE `hardwareCatalog`;--> statement-breakpoint
DROP TABLE `kitchenQuotations`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
DROP TABLE `payments`;--> statement-breakpoint
DROP TABLE `pricingConfig`;--> statement-breakpoint
DROP TABLE `pricingHistory`;--> statement-breakpoint
DROP TABLE `priorEstimates`;--> statement-breakpoint
DROP TABLE `projectDetails`;--> statement-breakpoint
DROP TABLE `projectHardwareSelections`;--> statement-breakpoint
DROP TABLE `projectMaterials`;--> statement-breakpoint
DROP TABLE `projectPhotos`;--> statement-breakpoint
DROP TABLE `projectStatusHistory`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
DROP TABLE `pushSubscriptions`;--> statement-breakpoint
DROP TABLE `quotationItems`;--> statement-breakpoint
DROP TABLE `quotations`;--> statement-breakpoint
DROP TABLE `reminders`;--> statement-breakpoint
DROP TABLE `taskReminders`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
DROP INDEX `users_openId_unique` ON `users`;--> statement-breakpoint
DROP INDEX `users_role_idx` ON `users`;--> statement-breakpoint
DROP INDEX `users_email_idx` ON `users`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_openId_unique` UNIQUE(`openId`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordHash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordResetToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordResetExpires`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `birthDate`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `dataOrigin`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `deletedAt`;