CREATE TABLE `accountingClosureOperationalExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`closureId` int NOT NULL,
	`expenseId` int NOT NULL,
	`category` enum('arriendo','energia','agua','internet','mantenimiento','herramientas','jardineria','reparaciones','transporte','papeleria','aseo','otro') NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `accountingClosureOperationalExpenses` ADD CONSTRAINT `accountingClosureOperationalExpenses_closureId_accountingClosures_id_fk` FOREIGN KEY (`closureId`) REFERENCES `accountingClosures`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accountingClosureOperationalExpenses` ADD CONSTRAINT `accountingClosureOperationalExpenses_expenseId_expenses_id_fk` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accountingClosureOperationalExpenses_closureId_idx` ON `accountingClosureOperationalExpenses` (`closureId`);--> statement-breakpoint
CREATE INDEX `accountingClosureOperationalExpenses_expenseId_idx` ON `accountingClosureOperationalExpenses` (`expenseId`);--> statement-breakpoint
CREATE INDEX `accountingClosureOperationalExpenses_category_idx` ON `accountingClosureOperationalExpenses` (`category`);