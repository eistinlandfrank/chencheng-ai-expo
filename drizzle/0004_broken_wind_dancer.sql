CREATE TABLE `app_analytics_rate_limits` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_analytics_rate_expiry` ON `app_analytics_rate_limits` (`expires_at`);--> statement-breakpoint
ALTER TABLE `app_reservation_updates` ADD `change_message` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_reservations` ADD `contact_expires_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_reservations` ADD `activity_status` text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_reservations` ADD `change_message` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_reservations` ADD `arrival_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_reservations` ADD `attendee_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_reservations` ADD `last_transition_id` text;--> statement-breakpoint
ALTER TABLE `app_state` ADD `write_token` text DEFAULT '' NOT NULL;
