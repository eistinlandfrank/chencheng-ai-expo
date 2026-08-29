import { NextRequest, NextResponse } from 'next/server';
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  requestNetworkAddress,
  requestOriginAllowed,
  setSessionCookies,
} from '@/app/auth';
import { authRateAllowed, completeLogin } from '@/db/auth';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!requestOriginAllowed(request)) return NextResponse.json({ code: 'INVALID_ORIGIN', message: '登录验证失败，请重新尝试', request_id: requestId }, { status: 403 });
  if (!await authRateAllowed(`login-verify:${requestNetworkAddress(request)}`, 20, 5 * 60)) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: '尝试次数过多，请稍后再试', request_id: requestId }, { status: 429 });
  }
  let payload: { response?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '登录验证失败，请重新尝试', request_id: requestId }, { status: 400 });
  }
  try {
    const browserToken = request.cookies.get(CHALLENGE_COOKIE)?.value ?? '';
    const result = payload.response
      ? await completeLogin(browserToken, payload.response as Parameters<typeof completeLogin>[1])
      : null;
    if (!result) return NextResponse.json({ code: 'AUTHENTICATION_FAILED', message: '未能验证通行密钥，请重新尝试', request_id: requestId }, { status: 401 });
    const response = NextResponse.json({ request_id: requestId, ok: true });
    setSessionCookies(response, result);
    clearChallengeCookie(response);
    return response;
  } catch {
    return NextResponse.json({ code: 'AUTHENTICATION_FAILED', message: '未能验证通行密钥，请重新尝试', request_id: requestId }, { status: 401 });
  }
}
