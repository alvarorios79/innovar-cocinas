ALTER TABLE `priorEstimates` ADD `kitchenShape` enum('L','U','lineal');--> statement-breakpoint
ALTER TABLE `priorEstimates` ADD `measurements` text;--> statement-breakpoint
ALTER TABLE `priorEstimates` ADD `materialType` enum('quarzone','sinterizado');--> statement-breakpoint
ALTER TABLE `priorEstimates` DROP COLUMN `length`;--> statement-breakpoint
ALTER TABLE `priorEstimates` DROP COLUMN `width`;--> statement-breakpoint
ALTER TABLE `priorEstimates` DROP COLUMN `height`;--> statement-breakpoint
ALTER TABLE `priorEstimates` DROP COLUMN `counterTopType`;