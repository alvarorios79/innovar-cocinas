ALTER TABLE `tasks` ADD `lastReminderSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `tasks` ADD `lastReminderSentBy` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `reminderCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_lastReminderSentBy_users_id_fk` FOREIGN KEY (`lastReminderSentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;