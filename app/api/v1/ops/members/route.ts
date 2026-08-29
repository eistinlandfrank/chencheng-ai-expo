import { NextRequest, NextResponse } from 'next/server';
import { authenticatedWriteAllowed, getRequestAuthSession } from '@/app/auth';
import { ensureOperationsAccess, inviteOperationsMember, listOperationsMembers } from '@/db/access';
import type { MembershipRole } from '@/db/auth';

function error(requestId: string, code: string, message: string, status: number) {
  return NextResponse.json({ code, message, request_id: requestId, details: null }, { status });
}

async function authorize(request: NextRequest, requestId: string) {
  const session = await getRequestAuthSession(request);
  if (!session) return { response: error(requestId, 'UNAUTHENTICATED', '请登录后继续', 401) };
  if (!await ensureOperationsAccess(session.user, 'member.ops.manage')) return { response: error(requestId, 'FORBIDDEN_SCOPE', '当前账号没有成员管理权限', 403) };
  return { session };
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const authorized = await authorize(request, requestId);
  if ('response' in authorized) return authorized.response;
  return NextResponse.json({ request_id: requestId, ...await listOperationsMembers() });
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const authorized = await authorize(request, requestId);
  if ('response' in authorized) return authorized.response;
  if (!await authenticatedWriteAllowed(request, authorized.session)) return error(requestId, 'CSRF_FAILED', '页面验证已过期，请刷新后重试', 403);
  let payload: { email?: string; role?: MembershipRole };
  try {
    payload = await request.json();
  } catch {
    return error(requestId, 'INVALID_JSON', '请求内容格式不正确', 400);
  }
  const email = String(payload.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(requestId, 'VALIDATION_FAILED', '请输入有效邮箱', 422);
  const activation = await inviteOperationsMember(email, authorized.session.user.userId, payload.role ?? 'venue_admin');
  return NextResponse.json({ request_id: requestId, activation_code: activation.code, activation_expires_at: activation.expiresAt, ...await listOperationsMembers() });
}
