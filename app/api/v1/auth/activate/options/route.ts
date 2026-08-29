import { NextRequest, NextResponse } from 'next/server';
import { requestNetworkAddress, requestOriginAllowed, setChallengeCookie } from '@/app/auth';
import { authRateAllowed, normalizeEmail, registrationOptions, validEmail } from '@/db/auth';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!requestOriginAllowed(request)) return NextResponse.json({ code: 'INVALID_ORIGIN', message: '无法开始激活，请刷新页面后重试', request_id: requestId }, { status: 403 });
  let payload: { email?: string; code?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '请输入邮箱和激活码', request_id: requestId }, { status: 400 });
  }
  const email = normalizeEmail(String(payload.email ?? ''));
  const code = String(payload.code ?? '').trim();
  if (!validEmail(email) || code.length < 16) return NextResponse.json({ code: 'ACTIVATION_INVALID', message: '邮箱或激活码无效', request_id: requestId }, { status: 422 });
  const network = requestNetworkAddress(request);
  if (!await authRateAllowed(`activation:${network}:${email}`, 8, 15 * 60)) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: '尝试次数过多，请稍后再试', request_id: requestId }, { status: 429 });
  }
  try {
    const result = await registrationOptions(email, code);
    if (!result) return NextResponse.json({ code: 'ACTIVATION_INVALID', message: '邮箱或激活码无效，或激活码已过期', request_id: requestId }, { status: 401 });
    const response = NextResponse.json({ request_id: requestId, options: result.options });
    setChallengeCookie(response, result.browserToken);
    return response;
  } catch {
    return NextResponse.json({ code: 'ACTIVATION_UNAVAILABLE', message: '暂时无法激活账号，请稍后重试', request_id: requestId }, { status: 503 });
  }
}
