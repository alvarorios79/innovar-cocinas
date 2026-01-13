ALTER TABLE `quotations` ADD `kitchenShape` enum('L','U','lineal');--> statement-breakpoint
ALTER TABLE `quotations` ADD `measurements` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `materialType` enum('quarzone','sinterizado');