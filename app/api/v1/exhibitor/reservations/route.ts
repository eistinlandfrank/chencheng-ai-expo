import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureExhibitorAccess } from '@/db/access';
import { listExhibitorReservations, updateExhibitorReservation, type ReservationRecord } from '@/db/reservations';

async function authorize() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const membership = await ensureExhibitorAccess(user);
  if (!membership?.organizationId || !membership.placeId) return null;
  return { ...membership, userId: user.userId };
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const membership = await authorize();
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN', message: '当前账号没有展位预约权限', request_id: requestId }, { status: 403 });
  return NextResponse.json({ request_id: requestId, reservations: await listExhibitorReservations(membership.organizationId, membership.placeId) });
}

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const membership = await authorize();
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN', message: '当前账号没有展位预约权限', request_id: requestId }, { status: 403 });
  let payload: { reservation_id?: string; status?: ReservationRecord['status'] };
  try { payload = await request.json(); } catch { return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId }, { status: 400 }); }
  if (!payload.reservation_id || !['confirmed', 'arrived', 'completed', 'no_show', 'cancelled'].includes(String(payload.status))) return NextResponse.json({ code: 'VALIDATION_FAILED', message: '操作内容不完整', request_id: requestId }, { status: 422 });
  if (!await updateExhibitorReservation(membership.organizationId, membership.placeId, payload.reservation_id, payload.status!, membership.userId)) return NextResponse.json({ code: 'RESERVATION_NOT_EDITABLE', message: '该预约当前不能执行此操作', request_id: requestId }, { status: 409 });
  return NextResponse.json({ request_id: requestId, reservations: await listExhibitorReservations(membership.organizationId, membership.placeId) });
}
