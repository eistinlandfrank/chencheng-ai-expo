CREATE TABLE `app_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email_snapshot` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`organization_id` text,
	`place_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_memberships_user_event` ON `app_memberships` (`user_id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_app_memberships_event_role_user` ON `app_memberships` (`event_id`,`role`,`user_id`);--> statement-breakpoint
CREATE TABLE `app_pending_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`email_normalized` text NOT NULL,
	`role` text NOT NULL,
	`invited_by` text NOT NULL,
	`created_at` text NOT NULL,
	`consumed_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_app_pending_event_email_role` ON `app_pending_memberships` (`event_id`,`email_normalized`,`role`);