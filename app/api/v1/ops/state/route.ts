import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureOperationsAccess } from '@/db/access';
import { readState, StateConflictError, writeState } from '@/db/state';
import {
  defaultOpsState,
  defaultExhibitorState,
  emptyMapFieldChecks,
  type ClosedGroup,
  type MapFieldChecks,
  type OpsState,
} from '@/lib/state-types';
import { places, validateVenueGraph, venue } from '@/lib/venue';

const tenantId = 'tenant-thousand-hackathon';
const stateKey = `ops:${venue.eventId}`;
const checkKeys: Array<keyof MapFieldChecks> = ['orientation', 'floor', 'connections', 'accessibility', 'obstacles'];

function error(requestId: string, code: string, message: string, status: number) {
  return NextResponse.json({ code, message, request_id: requestId, details: null }, { status });
}

function normalizeChecks(input: unknown): MapFieldChecks | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<MapFieldChecks>;
  return Object.fromEntries(checkKeys.map((key) => [key, Boolean(candidate[key])])) as MapFieldChecks;
}

function normalizeState(input: unknown, current: OpsState): OpsState | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<OpsState>;
  const validGroups = new Set<ClosedGroup>(['north-main', 'south-main']);
  const knownPlaceIds = new Set(places.map((place) => place.id));
  return {
    closedGroups: Array.isArray(candidate.closedGroups)
      ? candidate.closedGroups.filter((item): item is ClosedGroup => validGroups.has(item as ClosedGroup))
      : current.closedGroups,
    notices: Array.isArray(candidate.notices)
      ? candidate.notices.slice(0, 100).map((notice) => ({
          id: Number(notice.id),
          title: String(notice.title ?? '').trim().slice(0, 100),
          content: String(notice.content ?? '').trim().slice(0, 1000),
          audience: String(notice.audience ?? '').trim().slice(0, 80),
          status: String(notice.status ?? '已发布').slice(0, 20),
          createdAt: String(notice.createdAt ?? '').slice(0, 40),
        })).filter((notice) => Number.isFinite(notice.id) && notice.title && notice.content)
      : current.notices,
    tickets: Array.isArray(candidate.tickets)
      ? candidate.tickets.slice(0, 200).map((ticket) => ({
          id: String(ticket.id ?? '').slice(0, 80),
          category: String(ticket.category ?? '').trim().slice(0, 50),
          location: String(ticket.location ?? '').trim().slice(0, 120),
          priority: String(ticket.priority ?? '普通').trim().slice(0, 20),
          status: String(ticket.status ?? '待分派').trim().slice(0, 20),
          assignee: String(ticket.assignee ?? '未分派').trim().slice(0, 80),
          description: String(ticket.description ?? '').trim().slice(0, 1000),
          source: ticket.source === 'exhibitor' ? 'exhibitor' as const : 'operations' as const,
          createdAt: String(ticket.createdAt ?? '').slice(0, 40),
        })).filter((ticket) => ticket.id && ticket.category && ticket.location && ticket.description)
      : current.tickets,
    openPlaceIds: Array.isArray(candidate.openPlaceIds)
      ? candidate.openPlaceIds.filter((id): id is string => typeof id === 'string' && knownPlaceIds.has(id))
      : current.openPlaceIds,
    mapStatus: current.mapStatus,
    reviewedMapVersion: current.reviewedMapVersion,
    submittedBy: current.submittedBy,
    mapReviews: current.mapReviews,
  };
}

function currentReview(state: OpsState, userId: string) {
  return state.mapReviews.find((review) => review.actorId === userId)?.checks ?? emptyMapFieldChecks;
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return error(requestId, 'UNAUTHENTICATED', '请登录后继续', 401);
  if (!await ensureOperationsAccess(user)) return error(requestId, 'FORBIDDEN_SCOPE', '当前账号没有场馆运营权限', 403);
  const state = await readState(stateKey, defaultOpsState);
  const exhibitor = await readState(`exhibitor:${venue.eventId}:org-hardware-robot:robot-dev`, defaultExhibitorState);
  const value = state.value.reviewedMapVersion === venue.mapVersion ? state.value : { ...state.value, mapStatus: 'draft' as const, reviewedMapVersion: venue.mapVersion, submittedBy: '', mapReviews: [] };
  return NextResponse.json({ request_id: requestId, ...state, value, current_review: currentReview(value, user.userId), can_review: value.submittedBy !== user.userId, graph_validation: validateVenueGraph(), content_review: { profile_status: exhibitor.value.profileStatus } });
}

export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return error(requestId, 'UNAUTHENTICATED', '请登录后继续', 401);
  if (!await ensureOperationsAccess(user)) return error(requestId, 'FORBIDDEN_SCOPE', '当前账号没有场馆运营权限', 403);

  let payload: { state?: unknown; action?: string; verification?: unknown };
  try {
    payload = await request.json();
  } catch {
    return error(requestId, 'INVALID_JSON', '请求内容格式不正确', 400);
  }

  const existing = await readState(stateKey, defaultOpsState);
  const current = existing.value.reviewedMapVersion === venue.mapVersion ? existing.value : { ...existing.value, mapStatus: 'draft' as const, reviewedMapVersion: venue.mapVersion, submittedBy: '', mapReviews: [] };
  const normalized = normalizeState(payload.state, current);
  if (!normalized) return error(requestId, 'VALIDATION_FAILED', '提交内容不完整', 422);
  const action = String(payload.action ?? 'ops_state_updated').slice(0, 80);
  let next: OpsState = current;

  if (action === 'route_group_closed' || action === 'route_group_reopened') {
    const changedGroups = (['north-main', 'south-main'] as ClosedGroup[]).filter((group) => current.closedGroups.includes(group) !== normalized.closedGroups.includes(group));
    if (changedGroups.length !== 1) return error(requestId, 'STATE_CONFLICT', '通道状态已变化，请刷新后重试', 409);
    next = { ...current, closedGroups: normalized.closedGroups };
  } else if (action === 'notice_published') {
    const candidate = normalized.notices.find((notice) => !current.notices.some((item) => item.id === notice.id));
    if (!candidate) return error(requestId, 'VALIDATION_FAILED', '请填写完整通知内容', 422);
    const notice = { ...candidate, id: Date.now(), audience: '全体观众', status: '已发布', createdAt: new Date().toISOString() };
    next = { ...current, notices: [notice, ...current.notices].slice(0, 100) };
  } else if (action === 'service_ticket_created') {
    const candidate = normalized.tickets.find((ticket) => !current.tickets.some((item) => item.id === ticket.id));
    if (!candidate) return error(requestId, 'VALIDATION_FAILED', '请填写完整工单内容', 422);
    const ticket = { ...candidate, id: crypto.randomUUID(), status: '待分派', assignee: '未分派', source: 'operations' as const, createdAt: new Date().toISOString() };
    next = { ...current, tickets: [ticket, ...current.tickets].slice(0, 200) };
  } else if (action === 'service_ticket_status_updated') {
    const changed = current.tickets.filter((ticket) => {
      const candidate = normalized.tickets.find((item) => item.id === ticket.id);
      return candidate && (candidate.status !== ticket.status || candidate.assignee !== ticket.assignee);
    });
    if (changed.length !== 1) return error(requestId, 'STATE_CONFLICT', '工单状态已变化，请刷新后重试', 409);
    const before = changed[0];
    const candidate = normalized.tickets.find((ticket) => ticket.id === before.id)!;
    const transitions: Record<string, string> = { '待分派': '处理中', '处理中': '待确认', '待确认': '已完成' };
    if (candidate.status !== transitions[before.status]) return error(requestId, 'INVALID_TRANSITION', '当前工单不能执行此状态变更', 409);
    next = { ...current, tickets: current.tickets.map((ticket) => ticket.id === before.id ? { ...ticket, status: candidate.status, assignee: before.status === '待分派' ? user.displayName : ticket.assignee } : ticket) };
  } else if (action === 'map_review_submitted') {
    next = { ...current, mapStatus: 'review', reviewedMapVersion: venue.mapVersion, submittedBy: user.userId, mapReviews: [] };
  } else if (action === 'map_verification_updated') {
    if (current.submittedBy === user.userId) return error(requestId, 'SUBMITTER_CANNOT_REVIEW', '地图提交人不能复核同一版本，请由其他管理员完成', 409);
    const checks = normalizeChecks(payload.verification);
    if (!checks) return error(requestId, 'VALIDATION_FAILED', '现场复核内容不完整', 422);
    const review = { actorId: user.userId, actorLabel: user.displayName, checks, reviewedAt: new Date().toISOString() };
    next = { ...current, mapStatus: 'review', reviewedMapVersion: venue.mapVersion, mapReviews: [...current.mapReviews.filter((item) => item.actorId !== user.userId), review] };
  } else if (action === 'map_version_published') {
    const graph = validateVenueGraph();
    const completeReviews = current.mapReviews.filter((review) => review.actorId !== current.submittedBy && checkKeys.every((key) => review.checks[key]));
    if (!graph.valid) return error(requestId, 'MAP_VALIDATION_FAILED', '通行图自动校验未通过', 422);
    if (new Set(completeReviews.map((review) => review.actorId)).size < 2) {
      return error(requestId, 'SECOND_REVIEW_REQUIRED', '需要另一名场馆管理员完成独立现场复核', 409);
    }
    next = { ...current, mapStatus: 'published', reviewedMapVersion: venue.mapVersion, mapReviews: current.mapReviews };
  } else if (action === 'place_availability_updated') {
    const changedPlaces = places.map((place) => place.id).filter((id) => current.openPlaceIds.includes(id) !== normalized.openPlaceIds.includes(id));
    if (changedPlaces.length !== 1) return error(requestId, 'STATE_CONFLICT', '地点状态已变化，请刷新后重试', 409);
    const placeId = changedPlaces[0];
    const opening = normalized.openPlaceIds.includes(placeId);
    if (opening && placeId === 'robot-dev') {
      const exhibitorKey = `exhibitor:${venue.eventId}:org-hardware-robot:robot-dev`;
      const exhibitor = await readState(exhibitorKey, defaultExhibitorState);
      if (!['review', 'published'].includes(exhibitor.value.profileStatus) && !exhibitor.value.publishedProfile) {
        return error(requestId, 'CONTENT_REVIEW_REQUIRED', '该展位尚未提交公开内容审核', 409);
      }
      if (exhibitor.value.profileStatus === 'review' || !exhibitor.value.publishedProfile) {
        try {
          await writeState({ key: exhibitorKey, tenantId, eventId: venue.eventId, scope: 'exhibitor', ownerId: 'org-hardware-robot', actorId: user.userId, action: 'booth_profile_published', value: { ...exhibitor.value, profileStatus: 'published', publishedProfile: { boothTitle: exhibitor.value.boothTitle, intro: exhibitor.value.intro, tags: exhibitor.value.tags, publishedAt: new Date().toISOString() } }, expectedRevision: exhibitor.revision });
        } catch (writeError) {
          if (writeError instanceof StateConflictError) return error(requestId, 'STATE_CONFLICT', '展位内容已变化，请刷新后重试', 409);
          throw writeError;
        }
      }
    }
    next = { ...current, openPlaceIds: opening ? [...current.openPlaceIds, placeId] : current.openPlaceIds.filter((id) => id !== placeId) };
  } else if (action === 'booth_profile_published') {
    const exhibitorKey = `exhibitor:${venue.eventId}:org-hardware-robot:robot-dev`;
    const exhibitor = await readState(exhibitorKey, defaultExhibitorState);
    if (exhibitor.value.profileStatus !== 'review') return error(requestId, 'CONTENT_REVIEW_REQUIRED', '当前没有待发布的展位内容', 409);
    try {
      const published = await writeState({
        key: exhibitorKey,
        tenantId,
        eventId: venue.eventId,
        scope: 'exhibitor',
        ownerId: 'org-hardware-robot',
        actorId: user.userId,
        action,
        value: { ...exhibitor.value, profileStatus: 'published' as const, publishedProfile: { boothTitle: exhibitor.value.boothTitle, intro: exhibitor.value.intro, tags: exhibitor.value.tags, publishedAt: new Date().toISOString() } },
        expectedRevision: exhibitor.revision,
      });
      return NextResponse.json({ request_id: requestId, ...existing, value: current, current_review: currentReview(current, user.userId), can_review: current.submittedBy !== user.userId, graph_validation: validateVenueGraph(), content_review: { profile_status: published.value.profileStatus } });
    } catch (writeError) {
      if (writeError instanceof StateConflictError) return error(requestId, 'STATE_CONFLICT', '展位内容已变化，请刷新后重试', 409);
      throw writeError;
    }
  } else {
    return error(requestId, 'ACTION_NOT_SUPPORTED', '当前操作不受支持', 422);
  }

  let saved;
  try {
    saved = await writeState({ key: stateKey, tenantId, eventId: venue.eventId, scope: 'operations', ownerId: tenantId, actorId: user.userId, action, value: next, expectedRevision: existing.revision });
  } catch (writeError) {
    if (writeError instanceof StateConflictError) return error(requestId, 'STATE_CONFLICT', '数据已被其他成员更新，请刷新后重试', 409);
    throw writeError;
  }
  return NextResponse.json({ request_id: requestId, ...saved, current_review: currentReview(saved.value, user.userId), can_review: saved.value.submittedBy !== user.userId, graph_validation: validateVenueGraph() });
}
