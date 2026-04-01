ALTER TABLE `accountingClosureProjects` ADD `originalPrice` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `accountingClosureProjects` ADD `discountsApplied` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `accountingClosureProjects` ADD `surchargesApplied` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `accountingClosureProjects` ADD `netPrice` decimal(15,2) DEFAULT '0' NOT NULL;