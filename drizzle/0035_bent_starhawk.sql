ALTER TABLE `quotations` ADD `isLocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `lockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `quotations` ADD `lockedBy` int;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_lockedBy_users_id_fk` FOREIGN KEY (`lockedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;