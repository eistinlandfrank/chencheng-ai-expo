import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { recordAnalyticsEvent } from '@/db/analytics';
import { cancelMyReservation, createReservation, listMyReservations, modifyMyReservation } from '@/db/reservations';
import { readState } from '@/db/state';
import { defaultExhibitorState, defaultOpsState } from '@/lib/state-types';
import { venue } from '@/lib/venue';

async function getOffering(placeId: string) {
  if (placeId !== 'robot-dev') return null;
  const [ops, exhibitor] = await Promise.all([
    readState(`ops:${venue.eventId}`, defaultOpsState),
    readState(`exhibitor:${venue.eventId}:org-hardware-robot:robot-dev`, defaultExhibitorState),
  ]);
  if (!ops.value.openPlaceIds.includes(placeId) || !exhibitor.value.publishedProfile || !exhibitor.value.reservationsEnabled) return null;
  if (!exhibitor.value.activityTitle || !exhibitor.value.activityStart || exhibitor.value.activityStatus === 'draft') return null;
  const localStart = exhibitor.value.activityStart.match(/[zZ]|[+-]\d\d:\d\d$/)
    ? new Date(exhibitor.value.activityStart)
    : new Date(`${exhibitor.value.activityStart}${/T\d\d:\d\d$/.test(exhibitor.value.activityStart) ? ':00' : ''}+08:00`);
  if (Number.isNaN(localStart.getTime()) || localStart.getTime() + exhibitor.value.activityDuration * 60_000 <= Date.now()) return null;
  return {
    organizationId: 'org-hardware-robot',
    placeId,
    boothTitle: exhibitor.value.publishedProfile.boothTitle,
    title: exhibitor.value.activityTitle,
    start: exhibitor.value.activityStart,
    duration: exhibitor.value.activityDuration,
    capacity: exhibitor.value.activityCapacity,
    language: exhibitor.value.activityLanguage,
    status: exhibitor.value.activityStatus,
  };
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  const placeId = request.nextUrl.searchParams.get('place_id') ?? '';
  const [reservations, offering] = await Promise.all([listMyReservations(user.userId), placeId ? getOffering(placeId) : Promise.resolve(null)]);
  return NextResponse.json({ request_id: requestId, offering, reservations });
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  let payload: { place_id?: string; consent?: boolean };
  try { payload = await request.json(); } catch { return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId }, { status: 400 }); }
  if (!payload.consent) return NextResponse.json({ code: 'CONSENT_REQUIRED', message: '请确认预约授权范围', request_id: requestId }, { status: 422 });
  const offering = await getOffering(String(payload.place_id ?? ''));
  if (!offering || offering.status === 'cancelled') return NextResponse.json({ code: 'RESERVATION_UNAVAILABLE', message: '该活动当前不可预约', request_id: requestId }, { status: 409 });
  try {
    const result = await createReservation(user, offering);
    if (result.created) {
      await Promise.all([
        recordAnalyticsEvent({ eventName: 'reservation_created', role: 'visitor', userId: user.userId, organizationId: offering.organizationId, placeId: offering.placeId, requestId }),
        recordAnalyticsEvent({ eventName: 'consent_granted', role: 'visitor', userId: user.userId, organizationId: offering.organizationId, placeId: offering.placeId, requestId }),
      ]);
    }
    const reservation = result.reservation ? {
      id: result.reservation.id,
      activity_title: result.reservation.activity_title,
      slot_start_at: result.reservation.slot_start_at,
      status: result.reservation.status,
    } : null;
    return NextResponse.json({ request_id: requestId, reservation });
  } catch (error) {
    if (error instanceof Error && error.message === 'RESERVATION_FULL') return NextResponse.json({ code: 'RESERVATION_FULL', message: '该场次预约已满', request_id: requestId }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  let payload: { reservation_id?: string; action?: string; arrival_time?: string; attendee_note?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId }, { status: 400 }); }
  if (!payload.reservation_id || !['cancel', 'modify'].includes(String(payload.action))) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '操作内容不完整', request_id: requestId }, { status: 422 });
  if (payload.action === 'modify' && (
    (payload.arrival_time !== undefined && typeof payload.arrival_time !== 'string')
    || (payload.attendee_note !== undefined && typeof payload.attendee_note !== 'string')
    || (typeof payload.attendee_note === 'string' && payload.attendee_note.trim().length > 200)
  )) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '接待备注不能超过 200 个字', request_id: requestId }, { status: 422 });
  let updated: boolean;
  try {
    updated = payload.action === 'modify'
      ? await modifyMyReservation(user, payload.reservation_id, { arrivalTime: String(payload.arrival_time ?? ''), attendeeNote: String(payload.attendee_note ?? '') })
      : await cancelMyReservation(user.userId, payload.reservation_id);
  } catch (error) {
    if (error instanceof Error && error.message === 'RESERVATION_MODIFICATION_INVALID') return NextResponse.json({ code: 'RESERVATION_MODIFICATION_INVALID', message: '预计到达时间必须在活动时段内', request_id: requestId }, { status: 422 });
    if (error instanceof Error && error.message === 'RESERVATION_MODIFICATION_UNCHANGED') return NextResponse.json({ code: 'RESERVATION_MODIFICATION_UNCHANGED', message: '请先修改预计到达时间或接待备注', request_id: requestId }, { status: 422 });
    throw error;
  }
  if (!updated) return NextResponse.json({ code: 'RESERVATION_NOT_EDITABLE', message: payload.action === 'modify' ? '该预约当前无法修改' : '该预约当前无法取消', request_id: requestId }, { status: 409 });
  return NextResponse.json({ request_id: requestId, reservations: await listMyReservations(user.userId) });
}
