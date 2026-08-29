import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuthSession } from '@/app/auth';
import { ensureExhibitorAccess } from '@/db/access';
import { getExhibitorAnalytics } from '@/db/analytics';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const session = await getRequestAuthSession(request);
  if (!session) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  const membership = await ensureExhibitorAccess(session.user, 'analytics.exhibitor.read');
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN_SCOPE', message: '当前账号没有展位分析权限', request_id: requestId }, { status: 403 });
  return NextResponse.json({ request_id: requestId, analytics: await getExhibitorAnalytics(membership.placeId) });
}
