import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureOperationsAccess, inviteOperationsMember, listOperationsMembers } from '@/db/access';

function error(requestId: string, code: string, message: string, status: number) {
  return NextResponse.json({ code, message, request_id: requestId, details: null }, { status });
}

async function authorize(requestId: string) {
  const user = await getChatGPTUser();
  if (!user) return { response: error(requestId, 'UNAUTHENTICATED', '请登录后继续', 401) };
  if (!await ensureOperationsAccess(user)) return { response: error(requestId, 'FORBIDDEN_SCOPE', '当前账号没有场馆运营权限', 403) };
  return { user };
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const authorized = await authorize(requestId);
  if ('response' in authorized) return authorized.response;
  return NextResponse.json({ request_id: requestId, ...await listOperationsMembers() });
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const authorized = await authorize(requestId);
  if ('response' in authorized) return authorized.response;
  let payload: { email?: string };
  try {
    payload = await request.json();
  } catch {
    return error(requestId, 'INVALID_JSON', '请求内容格式不正确', 400);
  }
  const email = String(payload.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(requestId, 'VALIDATION_FAILED', '请输入有效邮箱', 422);
  await inviteOperationsMember(email, authorized.user.userId);
  return NextResponse.json({ request_id: requestId, ...await listOperationsMembers() });
}
