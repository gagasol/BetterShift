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
CREATE INDEX `absences_endDate_idx` ON `absences` (`end_date`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	`severity` text DEFAULT 'info' NOT NULL,
	`is_user_visible` integer DEFAULT false NOT NULL,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_userId_timestamp_idx` ON `audit_logs` (`user_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_timestamp_idx` ON `audit_logs` (`action`,`timestamp`);--> statement-breakpoint
CREATE INDEX `audit_logs_userVisible_userId_timestamp_idx` ON `audit_logs` (`is_user_visible`,`user_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `calendar_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`token` text NOT NULL,
	`name` text,
	`permission` text DEFAULT 'read' NOT NULL,
	`expires_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_used_at` integer,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_access_tokens_token_unique` ON `calendar_access_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `calendar_access_tokens_token_idx` ON `calendar_access_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `calendar_access_tokens_calendarId_isActive_idx` ON `calendar_access_tokens` (`calendar_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `calendar_access_tokens_createdBy_idx` ON `calendar_access_tokens` (`created_by`);--> statement-breakpoint
CREATE TABLE `calendar_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`color` text,
	`default_start_time` text DEFAULT '09:00',
	`default_end_time` text DEFAULT '17:00',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calendar_locations_calendarId_idx` ON `calendar_locations` (`calendar_id`);--> statement-breakpoint
CREATE INDEX `calendar_locations_order_idx` ON `calendar_locations` (`order`);--> statement-breakpoint
CREATE TABLE `calendar_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`date` integer NOT NULL,
	`note` text NOT NULL,
	`type` text DEFAULT 'note' NOT NULL,
	`color` text,
	`recurring_pattern` text DEFAULT 'none' NOT NULL,
	`recurring_interval` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `calendar_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`user_id` text NOT NULL,
	`permission` text DEFAULT 'read' NOT NULL,
	`shared_by` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shared_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calendar_shares_calendarId_idx` ON `calendar_shares` (`calendar_id`);--> statement-breakpoint
CREATE INDEX `calendar_shares_userId_idx` ON `calendar_shares` (`user_id`);--> statement-breakpoint
CREATE TABLE `calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`default_start_time` text DEFAULT '09:00',
	`default_end_time` text DEFAULT '17:00',
	`owner_id` text,
	`guest_permission` text DEFAULT 'none' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `calendars_ownerId_idx` ON `calendars` (`owner_id`);--> statement-breakpoint
CREATE TABLE `employee_calendar_settings` (
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
CREATE INDEX `employee_calendar_settings_calendarId_idx` ON `employee_calendar_settings` (`calendar_id`);--> statement-breakpoint
CREATE INDEX `employee_calendar_settings_userId_idx` ON `employee_calendar_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `external_syncs` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`name` text NOT NULL,
	`sync_type` text DEFAULT 'icloud' NOT NULL,
	`calendar_url` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`display_mode` text DEFAULT 'normal' NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	`hide_from_stats` integer DEFAULT false NOT NULL,
	`auto_sync_interval` integer DEFAULT 0 NOT NULL,
	`is_one_time_import` integer DEFAULT false NOT NULL,
	`last_synced_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `shift_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`title` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`notes` text,
	`is_secondary` integer DEFAULT false NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`hide_from_stats` integer DEFAULT false NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`location_id` text,
	`user_id` text,
	`preset_id` text,
	`date` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`title` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`notes` text,
	`is_all_day` integer DEFAULT false NOT NULL,
	`is_secondary` integer DEFAULT false NOT NULL,
	`external_event_id` text,
	`external_sync_id` text,
	`synced_from_external` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `calendar_locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`preset_id`) REFERENCES `shift_presets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`external_sync_id`) REFERENCES `external_syncs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`external_sync_id` text NOT NULL,
	`external_sync_name` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`shifts_created` integer DEFAULT 0 NOT NULL,
	`shifts_updated` integer DEFAULT 0 NOT NULL,
	`shifts_deleted` integer DEFAULT 0 NOT NULL,
	`sync_type` text DEFAULT 'auto' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`synced_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`external_sync_id`) REFERENCES `external_syncs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_calendar_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`calendar_id` text NOT NULL,
	`status` text DEFAULT 'subscribed' NOT NULL,
	`source` text DEFAULT 'guest' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_calendar_subscriptions_userId_idx` ON `user_calendar_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_calendar_subscriptions_calendarId_idx` ON `user_calendar_subscriptions` (`calendar_id`);--> statement-breakpoint
CREATE INDEX `user_calendar_subscriptions_status_idx` ON `user_calendar_subscriptions` (`status`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer
);
