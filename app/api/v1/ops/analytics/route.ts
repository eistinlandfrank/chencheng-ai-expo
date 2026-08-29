import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuthSession } from '@/app/auth';
import { ensureOperationsAccess } from '@/db/access';
import { getOperationsAnalytics } from '@/db/analytics';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const session = await getRequestAuthSession(request);
  if (!session) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  if (!await ensureOperationsAccess(session.user, 'analytics.ops.read')) return NextResponse.json({ code: 'FORBIDDEN_SCOPE', message: '当前账号没有场馆分析权限', request_id: requestId }, { status: 403 });
  return NextResponse.json({ request_id: requestId, analytics: await getOperationsAnalytics() });
}
