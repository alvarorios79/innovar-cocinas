ALTER TABLE `reminders` ADD `scheduledFor` timestamp;--> statement-breakpoint
ALTER TABLE `reminders` ADD `sent` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isTeamMember` tinyint DEFAULT 0 NOT NULL;