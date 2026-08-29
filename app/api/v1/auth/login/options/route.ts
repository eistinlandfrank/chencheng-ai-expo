import { NextRequest, NextResponse } from 'next/server';
import { requestNetworkAddress, requestOriginAllowed, setChallengeCookie } from '@/app/auth';
import { authRateAllowed, loginOptions } from '@/db/auth';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!requestOriginAllowed(request)) return NextResponse.json({ code: 'INVALID_ORIGIN', message: '无法开始登录，请刷新页面后重试', request_id: requestId }, { status: 403 });
  if (!await authRateAllowed(`login-options:${requestNetworkAddress(request)}`, 20, 5 * 60)) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: '尝试次数过多，请稍后再试', request_id: requestId }, { status: 429 });
  }
  try {
    const result = await loginOptions();
    const response = NextResponse.json({ request_id: requestId, options: result.options });
    setChallengeCookie(response, result.browserToken);
    return response;
  } catch {
    return NextResponse.json({ code: 'LOGIN_UNAVAILABLE', message: '暂时无法登录，请稍后重试', request_id: requestId }, { status: 503 });
  }
}
