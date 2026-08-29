import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureExhibitorAccess } from '@/db/access';
import { readState, StateConflictError, writeState } from '@/db/state';
import { defaultExhibitorState, defaultOpsState, type ExhibitorState, type ExhibitorTicket, type OpsTicket } from '@/lib/state-types';
import { venue } from '@/lib/venue';

const tenantId = 'tenant-thousand-hackathon';

function exhibitorTicketsFromOps(tickets: OpsTicket[], organizationId: string, placeId: string): ExhibitorTicket[] {
  const statusLabels: Record<string, string> = { '待分派': '已提交', '处理中': '处理中', '待确认': '待确认', '已完成': '已完成' };
  return tickets
    .filter((ticket) => ticket.source === 'exhibitor' && ticket.organizationId === organizationId && ticket.placeId === placeId)
    .map((ticket) => ({
      id: ticket.id,
      category: ticket.category,
      priority: ticket.priority,
      description: ticket.description,
      status: statusLabels[ticket.status] ?? ticket.status,
      createdAt: ticket.createdAt,
      location: ticket.location,
    }));
}

function normalizeState(input: unknown, current: ExhibitorState): ExhibitorState | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<ExhibitorState>;
  if (!['draft', 'review', 'published'].includes(String(candidate.profileStatus))) return null;
  return {
    profileStatus: current.profileStatus,
    boothTitle: String(candidate.boothTitle ?? '').trim().slice(0, 80),
    intro: String(candidate.intro ?? '').trim().slice(0, 1000),
    tags: String(candidate.tags ?? '').trim().slice(0, 300),
    receptionStatus: ['pending', 'open', 'busy', 'closed'].includes(String(candidate.receptionStatus)) ? candidate.receptionStatus as ExhibitorState['receptionStatus'] : 'pending',
    reservationsEnabled: Boolean(candidate.reservationsEnabled),
    activityStatus: ['draft', 'confirmed', 'delayed', 'cancelled'].includes(String(candidate.activityStatus)) ? candidate.activityStatus as ExhibitorState['activityStatus'] : 'draft',
    activityTitle: String(candidate.activityTitle ?? '').trim().slice(0, 100),
    activityStart: String(candidate.activityStart ?? '').trim().slice(0, 40),
    activityDuration: Math.min(240, Math.max(5, Number(candidate.activityDuration) || 30)),
    activityCapacity: Math.min(10000, Math.max(0, Number(candidate.activityCapacity) || 0)),
    activityLanguage: String(candidate.activityLanguage ?? '中文').trim().slice(0, 30),
    publishedProfile: current.publishedProfile,
    tickets: [],
  };
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId, details: null }, { status: 401 });
  const membership = await ensureExhibitorAccess(user);
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN', message: '当前账号尚未绑定展位', request_id: requestId, details: null }, { status: 403 });
  const state = await readState(`exhibitor:${venue.eventId}:${membership.organizationId}:${membership.placeId}`, defaultExhibitorState);
  const ops = await readState(`ops:${venue.eventId}`, defaultOpsState);
  return NextResponse.json({ request_id: requestId, ...state, value: { ...state.value, tickets: exhibitorTicketsFromOps(ops.value.tickets, membership.organizationId, membership.placeId) } });
}

export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId, details: null }, { status: 401 });
  const membership = await ensureExhibitorAccess(user);
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN', message: '当前账号尚未绑定展位', request_id: requestId, details: null }, { status: 403 });
  let payload: { state?: unknown; action?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId, details: null }, { status: 400 });
  }
  const stateKey = `exhibitor:${venue.eventId}:${membership.organizationId}:${membership.placeId}`;
  const existing = await readState(stateKey, defaultExhibitorState);
  const state = normalizeState(payload.state, existing.value);
  if (!state || !state.boothTitle || !state.intro) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '请补全展位标题与简介', request_id: requestId, details: null }, { status: 422 });
  const action = String(payload.action ?? 'exhibitor_state_updated').slice(0, 80);
  if (action === 'service_ticket_created') {
    const opsRecord = await readState(`ops:${venue.eventId}`, defaultOpsState);
    const candidate = (payload.state as Partial<ExhibitorState>).tickets?.find((ticket) => !opsRecord.value.tickets.some((current) => current.id === ticket.id));
    if (!candidate) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '工单内容不完整', request_id: requestId, details: null }, { status: 422 });
    const ticket: OpsTicket = {
      id: crypto.randomUUID(),
      category: String(candidate.category ?? '').trim().slice(0, 50),
      priority: String(candidate.priority ?? '普通').trim().slice(0, 20),
      description: String(candidate.description ?? '').trim().slice(0, 1000),
      location: String(candidate.location ?? '').trim().slice(0, 120),
      status: '待分派',
      assignee: '未分派',
      source: 'exhibitor',
      createdAt: new Date().toISOString(),
      organizationId: membership.organizationId,
      placeId: membership.placeId,
    };
    if (!ticket.category || !ticket.description || !ticket.location) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '请补全工单内容', request_id: requestId, details: null }, { status: 422 });
    let savedOps;
    try {
      savedOps = await writeState({ key: `ops:${venue.eventId}`, tenantId, eventId: venue.eventId, scope: 'operations', ownerId: tenantId, actorId: user.userId, action: 'exhibitor_service_ticket_received', value: { ...opsRecord.value, tickets: [ticket, ...opsRecord.value.tickets].slice(0, 200) }, expectedRevision: opsRecord.revision });
    } catch (writeError) {
      if (writeError instanceof StateConflictError) return NextResponse.json({ code: 'STATE_CONFLICT', message: '服务队列已更新，请重新提交', request_id: requestId, details: null }, { status: 409 });
      throw writeError;
    }
    return NextResponse.json({ request_id: requestId, ...existing, value: { ...existing.value, tickets: exhibitorTicketsFromOps(savedOps.value.tickets, membership.organizationId, membership.placeId) } });
  }
  if (action === 'booth_profile_submitted') state.profileStatus = 'review';
  else if (action === 'booth_profile_saved') state.profileStatus = 'draft';
  else if (!['reception_status_updated', 'reservation_availability_updated', 'program_session_saved', 'program_session_status_updated'].includes(action)) {
    return NextResponse.json({ code: 'ACTION_NOT_SUPPORTED', message: '当前操作不受支持', request_id: requestId, details: null }, { status: 422 });
  }
  let saved;
  try {
    saved = await writeState({ key: stateKey, tenantId, eventId: venue.eventId, scope: 'exhibitor', ownerId: membership.organizationId, actorId: user.userId, action, value: state, expectedRevision: existing.revision });
  } catch (writeError) {
    if (writeError instanceof StateConflictError) return NextResponse.json({ code: 'STATE_CONFLICT', message: '展位内容已更新，请刷新后重试', request_id: requestId, details: null }, { status: 409 });
    throw writeError;
  }
  const ops = await readState(`ops:${venue.eventId}`, defaultOpsState);
  return NextResponse.json({ request_id: requestId, ...saved, value: { ...saved.value, tickets: exhibitorTicketsFromOps(ops.value.tickets, membership.organizationId, membership.placeId) } });
}
