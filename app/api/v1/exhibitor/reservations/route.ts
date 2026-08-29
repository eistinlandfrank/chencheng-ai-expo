import { NextRequest, NextResponse } from 'next/server';
import { authenticatedWriteAllowed, getRequestAuthSession } from '@/app/auth';
import { ensureExhibitorAccess } from '@/db/access';
import { listExhibitorReservations, updateExhibitorReservation, type ReservationRecord } from '@/db/reservations';
import { publicPortalShowcaseEnabled } from '@/lib/showcase';

async function authorize(request: NextRequest) {
  const session = await getRequestAuthSession(request);
  if (!session) return { session: null, membership: null };
  const membership = await ensureExhibitorAccess(session.user, 'reservation.manage');
  return { session, membership };
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (publicPortalShowcaseEnabled()) return NextResponse.json({ request_id: requestId, reservations: [], read_only: true });
  const { session, membership } = await authorize(request);
  if (!session) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN', message: '当前账号没有展位预约权限', request_id: requestId }, { status: 403 });
  return NextResponse.json({ request_id: requestId, reservations: await listExhibitorReservations(membership.organizationId, membership.placeId) });
}

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const { session, membership } = await authorize(request);
  if (!session) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN', message: '当前账号没有展位预约权限', request_id: requestId }, { status: 403 });
  if (!await authenticatedWriteAllowed(request, session)) return NextResponse.json({ code: 'CSRF_FAILED', message: '页面验证已过期，请刷新后重试', request_id: requestId }, { status: 403 });
  let payload: { reservation_id?: string; status?: ReservationRecord['status'] };
  try { payload = await request.json(); } catch { return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId }, { status: 400 }); }
  if (!payload.reservation_id || !['confirmed', 'arrived', 'completed', 'no_show', 'cancelled'].includes(String(payload.status))) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '操作内容不完整', request_id: requestId }, { status: 422 });
  if (!await updateExhibitorReservation(membership.organizationId, membership.placeId, payload.reservation_id, payload.status!, session.user.userId)) return NextResponse.json({ code: 'RESERVATION_NOT_EDITABLE', message: '该预约当前不能执行此操作', request_id: requestId }, { status: 409 });
  return NextResponse.json({ request_id: requestId, reservations: await listExhibitorReservations(membership.organizationId, membership.placeId) });
}
