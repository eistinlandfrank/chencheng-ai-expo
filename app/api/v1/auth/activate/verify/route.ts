import { NextRequest, NextResponse } from 'next/server';
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  requestNetworkAddress,
  requestOriginAllowed,
  setSessionCookies,
} from '@/app/auth';
import { authRateAllowed, completeActivation } from '@/db/auth';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!requestOriginAllowed(request)) return NextResponse.json({ code: 'INVALID_ORIGIN', message: '账号激活失败，请重新尝试', request_id: requestId }, { status: 403 });
  if (!await authRateAllowed(`activation-verify:${requestNetworkAddress(request)}`, 12, 15 * 60)) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: '尝试次数过多，请稍后再试', request_id: requestId }, { status: 429 });
  }
  let payload: { response?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '账号激活失败，请重新尝试', request_id: requestId }, { status: 400 });
  }
  try {
    const browserToken = request.cookies.get(CHALLENGE_COOKIE)?.value ?? '';
    const result = payload.response
      ? await completeActivation(browserToken, payload.response as Parameters<typeof completeActivation>[1])
      : null;
    if (!result) return NextResponse.json({ code: 'ACTIVATION_FAILED', message: '账号激活失败，请重新获取激活码', request_id: requestId }, { status: 401 });
    const destination = result.role.startsWith('exhibitor') || ['content_editor', 'reception_staff', 'analytics_viewer'].includes(result.role)
      ? '/exhibitor'
      : '/operations';
    const response = NextResponse.json({ request_id: requestId, ok: true, destination });
    setSessionCookies(response, result);
    clearChallengeCookie(response);
    return response;
  } catch {
    return NextResponse.json({ code: 'ACTIVATION_FAILED', message: '账号激活失败，请重新获取激活码', request_id: requestId }, { status: 401 });
  }
}
