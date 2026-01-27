ALTER TABLE `quotations` ADD `discountPercent` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotations` ADD `discountAmount` decimal(12,2) DEFAULT '0';