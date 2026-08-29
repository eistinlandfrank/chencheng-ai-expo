CREATE TABLE `app_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_key` text NOT NULL,
	`after_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_audit_event_created` ON `app_audit` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `app_state` (
	`key` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`scope` text NOT NULL,
	`owner_id` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_state_event_scope` ON `app_state` (`event_id`,`scope`);