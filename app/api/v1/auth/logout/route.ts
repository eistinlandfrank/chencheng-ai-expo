import { NextRequest, NextResponse } from 'next/server';
import { authenticatedWriteAllowed, clearSessionCookies, getRequestAuthSession, SESSION_COOKIE } from '@/app/auth';
import { revokeSession } from '@/db/auth';

export async function POST(request: NextRequest) {
  const session = await getRequestAuthSession(request);
  if (!session) {
    const response = NextResponse.json({ ok: true });
    clearSessionCookies(response);
    return response;
  }
  if (!await authenticatedWriteAllowed(request, session)) {
    return NextResponse.json({ code: 'CSRF_FAILED', message: '无法退出登录，请刷新页面后重试' }, { status: 403 });
  }
  await revokeSession(request.cookies.get(SESSION_COOKIE)?.value ?? '', session.user.userId);
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
