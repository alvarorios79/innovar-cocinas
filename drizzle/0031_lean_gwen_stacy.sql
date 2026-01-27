ALTER TABLE `kitchenQuotations` ADD `hasPaintedDoors` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsUpperQty` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsUpperPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsLowerQty` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsLowerPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsPantryQty` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsPantryPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsDrawerQty` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsDrawerPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsSpiceQty` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsSpicePrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsGolaQty` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsGolaPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `kitchenQuotations` ADD `paintedDoorsTotalPrice` decimal(12,2);