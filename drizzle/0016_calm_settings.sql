ALTER TABLE `calendars` ADD `default_start_time` text DEFAULT '09:00';
--> statement-breakpoint
ALTER TABLE `calendars` ADD `default_end_time` text DEFAULT '17:00';
--> statement-breakpoint
ALTER TABLE `calendar_locations` ADD `default_start_time` text DEFAULT '09:00';
--> statement-breakpoint
ALTER TABLE `calendar_locations` ADD `default_end_time` text DEFAULT '17:00';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `employee_calendar_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`user_id` text NOT NULL,
	`preferred_work_days` text,
	`max_hours_per_month` real,
	`preferred_hours_per_month` real,
	`min_hours_per_month` real,
	`can_work_alone` integer DEFAULT true NOT NULL,
	`fixed_shifts` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `employee_calendar_settings_calendarId_idx` ON `employee_calendar_settings` (`calendar_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `employee_calendar_settings_userId_idx` ON `employee_calendar_settings` (`user_id`);
