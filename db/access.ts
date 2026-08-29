import { env } from '@/db/runtime';
import {
  createActivation,
  ensureAuthTables,
  type AuthUser,
  type MembershipRole,
} from '@/db/auth';
import { venue } from '@/lib/venue';

export type Permission =
  | 'ops.read'
  | 'map.edit'
  | 'map.review'
  | 'map.publish'
  | 'catalog.manage'
  | 'live_state.manage'
  | 'notice.publish'
  | 'ticket.dispatch'
  | 'analytics.ops.read'
  | 'audit.read'
  | 'member.ops.manage'
  | 'exhibitor.read'
  | 'booth.content.write'
  | 'activity.manage'
  | 'reservation.manage'
  | 'ticket.create'
  | 'analytics.exhibitor.read'
  | 'member.exhibitor.manage';

export type Membership = {
  role: MembershipRole;
  organizationId: string | null;
  placeId: string | null;
  permissions: Permission[];
};

const tenantId = 'tenant-thousand-hackathon';

const rolePermissions: Record<MembershipRole, Permission[]> = {
  venue_admin: ['ops.read', 'map.edit', 'map.review', 'map.publish', 'catalog.manage', 'live_state.manage', 'notice.publish', 'ticket.dispatch', 'analytics.ops.read', 'audit.read', 'member.ops.manage'],
  organizer_admin: ['ops.read', 'catalog.manage', 'notice.publish', 'analytics.ops.read'],
  map_editor: ['ops.read', 'map.edit'],
  map_reviewer: ['ops.read', 'map.review', 'map.publish'],
  dispatcher: ['ops.read', 'live_state.manage', 'ticket.dispatch'],
  notice_publisher: ['ops.read', 'notice.publish'],
  audit_viewer: ['ops.read', 'audit.read'],
  exhibitor_admin: ['exhibitor.read', 'booth.content.write', 'activity.manage', 'reservation.manage', 'ticket.create', 'analytics.exhibitor.read', 'member.exhibitor.manage'],
  content_editor: ['exhibitor.read', 'booth.content.write', 'activity.manage', 'ticket.create'],
  reception_staff: ['exhibitor.read', 'reservation.manage', 'ticket.create'],
  analytics_viewer: ['exhibitor.read', 'analytics.exhibitor.read'],
};

function isMembershipRole(value: string): value is MembershipRole {
  return value in rolePermissions;
}

async function membershipsForUser(userId: string) {
  await ensureAuthTables();
  const rows = await env.DB.prepare(`SELECT role, organization_id, place_id
    FROM app_memberships
    WHERE tenant_id = ? AND event_id = ? AND user_id = ? AND status = 'active' AND disabled_at IS NULL`)
    .bind(tenantId, venue.eventId, userId).all<{ role: string; organization_id: string | null; place_id: string | null }>();
  return rows.results.filter((row) => isMembershipRole(row.role)).map((row) => ({
    role: row.role as MembershipRole,
    organizationId: row.organization_id,
    placeId: row.place_id,
    permissions: rolePermissions[row.role as MembershipRole],
  }));
}

export async function ensureOperationsAccess(user: AuthUser, permission: Permission = 'ops.read') {
  return (await membershipsForUser(user.userId)).find((membership) =>
    membership.permissions.includes(permission) && membership.permissions.includes('ops.read')) ?? null;
}

export async function ensureExhibitorAccess(user: AuthUser, permission: Permission = 'exhibitor.read') {
  return (await membershipsForUser(user.userId)).find((membership) =>
    membership.permissions.includes(permission)
    && membership.permissions.includes('exhibitor.read')
    && Boolean(membership.organizationId)
    && Boolean(membership.placeId)) ?? null;
}

export async function listOperationsMembers() {
  await ensureAuthTables();
  const members = await env.DB.prepare(`SELECT m.user_id, u.email_normalized AS email_snapshot,
      u.display_name, m.role, m.created_at
    FROM app_memberships m JOIN auth_users u ON u.id = m.user_id
    WHERE m.tenant_id = ? AND m.event_id = ? AND m.status = 'active'
      AND m.role IN ('venue_admin','organizer_admin','map_editor','map_reviewer','dispatcher','notice_publisher','audit_viewer')
    ORDER BY m.created_at`)
    .bind(tenantId, venue.eventId).all<{ user_id: string; email_snapshot: string; display_name: string; role: string; created_at: string }>();
  const pending = await env.DB.prepare(`SELECT id, email_normalized, role, expires_at AS created_at
    FROM auth_activations
    WHERE tenant_id = ? AND event_id = ? AND consumed_at IS NULL AND expires_at > ?
      AND role IN ('venue_admin','organizer_admin','map_editor','map_reviewer','dispatcher','notice_publisher','audit_viewer')
    ORDER BY created_at`)
    .bind(tenantId, venue.eventId, new Date().toISOString())
    .all<{ id: string; email_normalized: string; role: string; created_at: string }>();
  return { members: members.results, pending: pending.results };
}

export async function inviteOperationsMember(email: string, actorId: string, role: MembershipRole = 'venue_admin') {
  if (!['venue_admin', 'organizer_admin', 'map_editor', 'map_reviewer', 'dispatcher', 'notice_publisher', 'audit_viewer'].includes(role)) {
    throw new Error('ROLE_INVALID');
  }
  return createActivation({ email, role, actorId });
}
