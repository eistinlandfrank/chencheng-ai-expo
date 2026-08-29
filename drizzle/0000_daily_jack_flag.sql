CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`request_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_event_created` ON `audit_logs` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `booth_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`booth_id` text NOT NULL,
	`content_version` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`intro` text NOT NULL,
	`tags_json` text NOT NULL,
	`languages_json` text NOT NULL,
	`dwell_minutes` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`booth_id`) REFERENCES `booths`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_booth_profiles_booth_version` ON `booth_profiles` (`booth_id`,`content_version`);--> statement-breakpoint
CREATE TABLE `booths` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`map_version_id` text NOT NULL,
	`exhibitor_id` text,
	`code` text NOT NULL,
	`zone_id` text,
	`polygon_json` text NOT NULL,
	`entrance_node_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`map_version_id`) REFERENCES `map_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exhibitor_id`) REFERENCES `exhibitors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_booths_event_code` ON `booths` (`event_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_booths_event_status` ON `booths` (`event_id`,`status`);--> statement-breakpoint
CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`session_id` text NOT NULL,
	`purpose` text NOT NULL,
	`recipient_id` text NOT NULL,
	`scope_json` text NOT NULL,
	`version` text NOT NULL,
	`granted_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`start_at` text,
	`end_at` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_events_tenant_status` ON `events` (`tenant_id`,`status`);--> statement-breakpoint
CREATE TABLE `exhibitors` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`org_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_exhibitors_event` ON `exhibitors` (`event_id`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`session_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `visitor_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_favorites_session_entity` ON `favorites` (`session_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `itineraries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`session_id` text NOT NULL,
	`map_version_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`state` text DEFAULT 'planned' NOT NULL,
	`start_at` text NOT NULL,
	`leave_by` text NOT NULL,
	`preferences_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `visitor_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_itineraries_session_state` ON `itineraries` (`session_id`,`state`);--> statement-breakpoint
CREATE TABLE `itinerary_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`itinerary_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`state` text DEFAULT 'planned' NOT NULL,
	`planned_arrival_at` text NOT NULL,
	`dwell_minutes` integer NOT NULL,
	`walk_distance_meters` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_itinerary_stops_sequence` ON `itinerary_stops` (`itinerary_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `live_edge_states` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`edge_id` text NOT NULL,
	`status` text NOT NULL,
	`congestion_factor` real DEFAULT 1 NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`edge_id`) REFERENCES `route_edges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_live_edge_states_event_edge` ON `live_edge_states` (`event_id`,`edge_id`);--> statement-breakpoint
CREATE TABLE `map_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`version` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`floor_label` text,
	`transform_json` text NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_map_versions_event_version` ON `map_versions` (`event_id`,`version`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`audience_json` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`publish_at` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notices_event_status_publish` ON `notices` (`event_id`,`status`,`publish_at`);--> statement-breakpoint
CREATE TABLE `positioning_anchors` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`map_version_id` text NOT NULL,
	`node_id` text NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `route_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_anchors_event_code` ON `positioning_anchors` (`event_id`,`code`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`booth_id` text NOT NULL,
	`session_id` text NOT NULL,
	`slot_start_at` text NOT NULL,
	`slot_end_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`contact_encrypted` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`booth_id`) REFERENCES `booths`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `visitor_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reservations_booth_slot` ON `reservations` (`booth_id`,`slot_start_at`);--> statement-breakpoint
CREATE TABLE `route_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`map_version_id` text NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`distance_meters` real NOT NULL,
	`direction` text DEFAULT 'both' NOT NULL,
	`accessible` integer DEFAULT true NOT NULL,
	`attributes_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`map_version_id`) REFERENCES `map_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_id`) REFERENCES `route_nodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_id`) REFERENCES `route_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_route_edges_map_from` ON `route_edges` (`map_version_id`,`from_id`);--> statement-breakpoint
CREATE INDEX `idx_route_edges_map_to` ON `route_edges` (`map_version_id`,`to_id`);--> statement-breakpoint
CREATE TABLE `route_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`map_version_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`x_meters` real NOT NULL,
	`y_meters` real NOT NULL,
	`accessible` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`map_version_id`) REFERENCES `map_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_route_nodes_map` ON `route_nodes` (`map_version_id`);--> statement-breakpoint
CREATE TABLE `service_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`organization_id` text,
	`location_id` text NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`assignee_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_service_tickets_event_status_priority` ON `service_tickets` (`event_id`,`status`,`priority`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitor_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`anonymous_id_hash` text NOT NULL,
	`current_anchor_id` text,
	`map_version_id` text NOT NULL,
	`preferences_json` text DEFAULT '{}' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`current_anchor_id`) REFERENCES `positioning_anchors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_visitor_sessions_event_expiry` ON `visitor_sessions` (`event_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`map_version_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`polygon_json` text NOT NULL,
	`scenario` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`map_version_id`) REFERENCES `map_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_zones_event_map` ON `zones` (`event_id`,`map_version_id`);