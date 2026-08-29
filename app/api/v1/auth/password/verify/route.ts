import { NextRequest, NextResponse } from 'next/server';
import {
  requestNetworkAddress,
  requestOriginAllowed,
  setSessionCookies,
} from '@/app/auth';
import {
  authRateAllowed,
  completePasswordLogin,
  normalizeEmail,
} from '@/db/auth';

const maximumBodyLength = 4_096;

function authenticationFailed(requestId: string) {
  return NextResponse.json({
    code: 'AUTHENTICATION_FAILED',
    message: '账号或密码不正确',
    request_id: requestId,
  }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!requestOriginAllowed(request)) {
    return NextResponse.json({ code: 'INVALID_ORIGIN', message: '登录验证失败，请刷新页面后重试', request_id: requestId }, { status: 403 });
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maximumBodyLength) {
    return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE', message: '登录请求无效', request_id: requestId }, { status: 413 });
  }

  let payload: { email?: unknown; password?: unknown };
  try {
    const rawBody = await request.text();
    if (rawBody.length > maximumBodyLength) {
      return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE', message: '登录请求无效', request_id: requestId }, { status: 413 });
    }
    payload = JSON.parse(rawBody) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '请输入账号和密码', request_id: requestId }, { status: 400 });
  }

  const email = normalizeEmail(String(payload.email ?? '')).slice(0, 254);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const network = requestNetworkAddress(request);
  const networkAllowed = await authRateAllowed(`password-login-network:${network}`, 30, 15 * 60);
  const accountAllowed = await authRateAllowed(`password-login-account:${network}:${email}`, 8, 15 * 60);
  if (!networkAllowed || !accountAllowed) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: '尝试次数过多，请稍后再试', request_id: requestId }, { status: 429 });
  }

  try {
    const result = await completePasswordLogin(email, password);
    if (!result) return authenticationFailed(requestId);
    const response = NextResponse.json({ request_id: requestId, ok: true });
    setSessionCookies(response, result);
    return response;
  } catch {
    return NextResponse.json({ code: 'LOGIN_UNAVAILABLE', message: '暂时无法登录，请稍后重试', request_id: requestId }, { status: 503 });
  }
}
