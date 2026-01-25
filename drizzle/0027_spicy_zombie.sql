ALTER TABLE `projects` ADD `tentativeInstallDate` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `isInstallDateOfficial` boolean DEFAULT false;