import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = () => ({
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  ...timestamps(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  startAt: text('start_at'),
  endAt: text('end_at'),
  status: text('status').notNull().default('draft'),
  ...timestamps(),
}, (table) => [index('idx_events_tenant_status').on(table.tenantId, table.status)]);

export const mapVersions = sqliteTable('map_versions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  eventId: text('event_id').notNull().references(() => events.id),
  version: text('version').notNull(),
  status: text('status').notNull().default('draft'),
  floorLabel: text('floor_label'),
  transformJson: text('transform_json').notNull(),
  publishedAt: text('published_at'),
  ...timestamps(),
}, (table) => [uniqueIndex('uidx_map_versions_event_version').on(table.eventId, table.version)]);

export const zones = sqliteTable('zones', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  mapVersionId: text('map_version_id').notNull().references(() => mapVersions.id),
  name: text('name').notNull(),
  category: text('category').notNull(),
  polygonJson: text('polygon_json').notNull(),
  scenario: text('scenario'),
  status: text('status').notNull().default('active'),
  ...timestamps(),
}, (table) => [index('idx_zones_event_map').on(table.eventId, table.mapVersionId)]);

export const exhibitors = sqliteTable('exhibitors', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull().references(() => events.id),
  orgName: text('org_name').notNull(),
  status: text('status').notNull().default('active'),
  ...timestamps(),
}, (table) => [index('idx_exhibitors_event').on(table.eventId)]);

export const booths = sqliteTable('booths', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull().references(() => events.id),
  mapVersionId: text('map_version_id').notNull().references(() => mapVersions.id),
  exhibitorId: text('exhibitor_id').references(() => exhibitors.id),
  code: text('code').notNull(),
  zoneId: text('zone_id').references(() => zones.id),
  polygonJson: text('polygon_json').notNull(),
  entranceNodeId: text('entrance_node_id'),
  status: text('status').notNull().default('active'),
  ...timestamps(),
}, (table) => [
  uniqueIndex('uidx_booths_event_code').on(table.eventId, table.code),
  index('idx_booths_event_status').on(table.eventId, table.status),
]);

export const boothProfiles = sqliteTable('booth_profiles', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  boothId: text('booth_id').notNull().references(() => booths.id),
  contentVersion: integer('content_version').notNull().default(1),
  title: text('title').notNull(),
  intro: text('intro').notNull(),
  tagsJson: text('tags_json').notNull(),
  languagesJson: text('languages_json').notNull(),
  dwellMinutes: integer('dwell_minutes'),
  status: text('status').notNull().default('draft'),
  ...timestamps(),
}, (table) => [uniqueIndex('uidx_booth_profiles_booth_version').on(table.boothId, table.contentVersion)]);

export const routeNodes = sqliteTable('route_nodes', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  mapVersionId: text('map_version_id').notNull().references(() => mapVersions.id),
  type: text('type').notNull(),
  label: text('label').notNull(),
  xMeters: real('x_meters').notNull(),
  yMeters: real('y_meters').notNull(),
  accessible: integer('accessible', { mode: 'boolean' }).notNull().default(true),
  ...timestamps(),
}, (table) => [index('idx_route_nodes_map').on(table.mapVersionId)]);

export const routeEdges = sqliteTable('route_edges', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  mapVersionId: text('map_version_id').notNull().references(() => mapVersions.id),
  fromId: text('from_id').notNull().references(() => routeNodes.id),
  toId: text('to_id').notNull().references(() => routeNodes.id),
  distanceMeters: real('distance_meters').notNull(),
  direction: text('direction').notNull().default('both'),
  accessible: integer('accessible', { mode: 'boolean' }).notNull().default(true),
  attributesJson: text('attributes_json').notNull().default('{}'),
  status: text('status').notNull().default('open'),
  ...timestamps(),
}, (table) => [
  index('idx_route_edges_map_from').on(table.mapVersionId, table.fromId),
  index('idx_route_edges_map_to').on(table.mapVersionId, table.toId),
]);

export const positioningAnchors = sqliteTable('positioning_anchors', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  mapVersionId: text('map_version_id').notNull(),
  nodeId: text('node_id').notNull().references(() => routeNodes.id),
  code: text('code').notNull(),
  label: text('label').notNull(),
  status: text('status').notNull().default('active'),
  ...timestamps(),
}, (table) => [uniqueIndex('uidx_anchors_event_code').on(table.eventId, table.code)]);

export const visitorSessions = sqliteTable('visitor_sessions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  anonymousIdHash: text('anonymous_id_hash').notNull(),
  currentAnchorId: text('current_anchor_id').references(() => positioningAnchors.id),
  mapVersionId: text('map_version_id').notNull(),
  preferencesJson: text('preferences_json').notNull().default('{}'),
  expiresAt: text('expires_at').notNull(),
  ...timestamps(),
}, (table) => [index('idx_visitor_sessions_event_expiry').on(table.eventId, table.expiresAt)]);

export const itineraries = sqliteTable('itineraries', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  sessionId: text('session_id').notNull().references(() => visitorSessions.id),
  mapVersionId: text('map_version_id').notNull(),
  version: integer('version').notNull().default(1),
  state: text('state').notNull().default('planned'),
  startAt: text('start_at').notNull(),
  leaveBy: text('leave_by').notNull(),
  preferencesJson: text('preferences_json').notNull(),
  ...timestamps(),
}, (table) => [index('idx_itineraries_session_state').on(table.sessionId, table.state)]);

export const itineraryStops = sqliteTable('itinerary_stops', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  itineraryId: text('itinerary_id').notNull().references(() => itineraries.id),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  sequence: integer('sequence').notNull(),
  state: text('state').notNull().default('planned'),
  plannedArrivalAt: text('planned_arrival_at').notNull(),
  dwellMinutes: integer('dwell_minutes').notNull(),
  walkDistanceMeters: real('walk_distance_meters').notNull(),
  ...timestamps(),
}, (table) => [uniqueIndex('uidx_itinerary_stops_sequence').on(table.itineraryId, table.sequence)]);

export const favorites = sqliteTable('favorites', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  sessionId: text('session_id').notNull().references(() => visitorSessions.id),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('uidx_favorites_session_entity').on(table.sessionId, table.entityType, table.entityId)]);

export const reservations = sqliteTable('reservations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  boothId: text('booth_id').notNull().references(() => booths.id),
  sessionId: text('session_id').notNull().references(() => visitorSessions.id),
  slotStartAt: text('slot_start_at').notNull(),
  slotEndAt: text('slot_end_at').notNull(),
  status: text('status').notNull().default('pending'),
  contactEncrypted: text('contact_encrypted'),
  ...timestamps(),
}, (table) => [index('idx_reservations_booth_slot').on(table.boothId, table.slotStartAt)]);

export const consents = sqliteTable('consents', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  sessionId: text('session_id').notNull(),
  purpose: text('purpose').notNull(),
  recipientId: text('recipient_id').notNull(),
  scopeJson: text('scope_json').notNull(),
  version: text('version').notNull(),
  grantedAt: text('granted_at').notNull(),
  revokedAt: text('revoked_at'),
});

export const serviceTickets = sqliteTable('service_tickets', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  organizationId: text('organization_id'),
  locationId: text('location_id').notNull(),
  category: text('category').notNull(),
  priority: text('priority').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('submitted'),
  assigneeId: text('assignee_id'),
  ...timestamps(),
}, (table) => [index('idx_service_tickets_event_status_priority').on(table.eventId, table.status, table.priority)]);

export const notices = sqliteTable('notices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  audienceJson: text('audience_json').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('draft'),
  publishAt: text('publish_at'),
  createdBy: text('created_by').notNull(),
  ...timestamps(),
}, (table) => [index('idx_notices_event_status_publish').on(table.eventId, table.status, table.publishAt)]);

export const liveEdgeStates = sqliteTable('live_edge_states', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  edgeId: text('edge_id').notNull().references(() => routeEdges.id),
  status: text('status').notNull(),
  congestionFactor: real('congestion_factor').notNull().default(1),
  validFrom: text('valid_from').notNull(),
  validUntil: text('valid_until'),
  createdBy: text('created_by').notNull(),
  ...timestamps(),
}, (table) => [index('idx_live_edge_states_event_edge').on(table.eventId, table.edgeId)]);

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  requestId: text('request_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_audit_logs_event_created').on(table.eventId, table.createdAt)]);

export const appState = sqliteTable('app_state', {
  key: text('key').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  scope: text('scope').notNull(),
  ownerId: text('owner_id').notNull(),
  valueJson: text('value_json').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
}, (table) => [index('idx_app_state_event_scope').on(table.eventId, table.scope)]);

export const appAudit = sqliteTable('app_audit', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  resourceKey: text('resource_key').notNull(),
  afterJson: text('after_json').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_app_audit_event_created').on(table.eventId, table.createdAt)]);

export const appMemberships = sqliteTable('app_memberships', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  userId: text('user_id').notNull(),
  emailSnapshot: text('email_snapshot').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull(),
  organizationId: text('organization_id'),
  placeId: text('place_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_app_memberships_user_event').on(table.userId, table.eventId),
  uniqueIndex('uidx_app_memberships_event_role_user').on(table.eventId, table.role, table.userId),
]);

export const appPendingMemberships = sqliteTable('app_pending_memberships', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  emailNormalized: text('email_normalized').notNull(),
  role: text('role').notNull(),
  invitedBy: text('invited_by').notNull(),
  createdAt: text('created_at').notNull(),
  consumedBy: text('consumed_by'),
}, (table) => [uniqueIndex('uidx_app_pending_event_email_role').on(table.eventId, table.emailNormalized, table.role)]);

export const appReservations = sqliteTable('app_reservations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  userId: text('user_id').notNull(),
  emailSnapshot: text('email_snapshot').notNull(),
  displayName: text('display_name').notNull(),
  organizationId: text('organization_id').notNull(),
  placeId: text('place_id').notNull(),
  activityTitle: text('activity_title').notNull(),
  slotStartAt: text('slot_start_at').notNull(),
  slotEndAt: text('slot_end_at').notNull(),
  status: text('status').notNull().default('pending'),
  consentVersion: text('consent_version').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_app_reservations_org_place_status').on(table.eventId, table.organizationId, table.placeId, table.status),
  uniqueIndex('uidx_app_reservations_user_slot').on(table.eventId, table.userId, table.placeId, table.slotStartAt),
]);

export const appReservationUpdates = sqliteTable('app_reservation_updates', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(),
  reservationId: text('reservation_id').notNull(),
  actorId: text('actor_id').notNull(),
  fromStatus: text('from_status').notNull(),
  toStatus: text('to_status').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_app_reservation_updates_reservation').on(table.eventId, table.reservationId, table.createdAt)]);

export const appAnalyticsEvents = sqliteTable('app_analytics_events', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  eventId: text('event_id').notNull(),
  role: text('role').notNull(),
  anonymousIdHash: text('anonymous_id_hash'),
  userIdHash: text('user_id_hash'),
  organizationId: text('organization_id'),
  placeId: text('place_id'),
  eventName: text('event_name').notNull(),
  mapVersion: text('map_version').notNull(),
  requestId: text('request_id').notNull(),
  propertiesJson: text('properties_json').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_app_analytics_event_time').on(table.eventId, table.eventName, table.createdAt),
  index('idx_app_analytics_place_time').on(table.eventId, table.placeId, table.eventName, table.createdAt),
]);
