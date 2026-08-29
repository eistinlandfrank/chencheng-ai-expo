import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { recordAnalyticsEvent } from '@/db/analytics';
import { cancelMyReservation, createReservation, listMyReservations } from '@/db/reservations';
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
  let payload: { reservation_id?: string; action?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId }, { status: 400 }); }
  if (payload.action !== 'cancel' || !payload.reservation_id) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '操作内容不完整', request_id: requestId }, { status: 422 });
  if (!await cancelMyReservation(user.userId, payload.reservation_id)) return NextResponse.json({ code: 'RESERVATION_NOT_EDITABLE', message: '该预约当前无法取消', request_id: requestId }, { status: 409 });
  return NextResponse.json({ request_id: requestId, reservations: await listMyReservations(user.userId) });
}
