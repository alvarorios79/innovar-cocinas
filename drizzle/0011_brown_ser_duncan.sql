ALTER TABLE `users` ADD `passwordResetToken` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetExpires` timestamp;