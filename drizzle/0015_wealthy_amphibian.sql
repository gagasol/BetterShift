CREATE TABLE `absences` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`user_id` text,
	`user_name` text NOT NULL,
	`type` text DEFAULT 'absence' NOT NULL,
	`reason` text,
	`is_recurring` integer DEFAULT false NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`is_all_day` integer DEFAULT true NOT NULL,
	`start_time` text DEFAULT '08:00',
	`end_time` text DEFAULT '17:00',
	`recurring_days` text,
	`status` text DEFAULT 'approved' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `absences_calendarId_idx` ON `absences` (`calendar_id`);--> statement-breakpoint
CREATE INDEX `absences_userId_idx` ON `absences` (`user_id`);--> statement-breakpoint
CREATE INDEX `absences_startDate_idx` ON `absences` (`start_date`);--> statement-breakpoint
CREATE INDEX `absences_endDate_idx` ON `absences` (`end_date`);