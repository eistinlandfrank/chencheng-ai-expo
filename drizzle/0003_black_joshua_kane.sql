CREATE TABLE `app_analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`role` text NOT NULL,
	`anonymous_id_hash` text,
	`user_id_hash` text,
	`organization_id` text,
	`place_id` text,
	`event_name` text NOT NULL,
	`map_version` text NOT NULL,
	`request_id` text NOT NULL,
	`properties_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_analytics_event_time` ON `app_analytics_events` (`event_id`,`event_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_app_analytics_place_time` ON `app_analytics_events` (`event_id`,`place_id`,`event_name`,`created_at`);--> statement-breakpoint
CREATE TABLE `app_reservation_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`reservation_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_reservation_updates_reservation` ON `app_reservation_updates` (`event_id`,`reservation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `app_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email_snapshot` text NOT NULL,
	`display_name` text NOT NULL,
	`organization_id` text NOT NULL,
	`place_id` text NOT NULL,
	`activity_title` text NOT NULL,
	`slot_start_at` text NOT NULL,
	`slot_end_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_reservations_org_place_status` ON `app_reservations` (`event_id`,`organization_id`,`place_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_app_reservations_user_slot` ON `app_reservations` (`event_id`,`user_id`,`place_id`,`slot_start_at`);--> statement-breakpoint
ALTER TABLE `app_state` ADD `revision` integer DEFAULT 0 NOT NULL;