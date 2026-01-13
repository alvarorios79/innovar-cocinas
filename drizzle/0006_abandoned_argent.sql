ALTER TABLE `priorEstimates` ADD `linearLength` decimal(10,2);--> statement-breakpoint
ALTER TABLE `priorEstimates` ADD `height` decimal(10,2);--> statement-breakpoint
ALTER TABLE `priorEstimates` DROP COLUMN `measurements`;