CREATE TABLE `calendar_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`color` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calendar_locations_calendarId_idx` ON `calendar_locations` (`calendar_id`);--> statement-breakpoint
CREATE INDEX `calendar_locations_order_idx` ON `calendar_locations` (`order`);--> statement-breakpoint
ALTER TABLE `shifts` ADD `location_id` text REFERENCES calendar_locations(id) ON DELETE set null;
