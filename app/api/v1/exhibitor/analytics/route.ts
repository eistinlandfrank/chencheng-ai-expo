import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureExhibitorAccess } from '@/db/access';
import { getExhibitorAnalytics } from '@/db/analytics';

export async function GET() {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  const membership = await ensureExhibitorAccess(user);
  if (!membership?.organizationId || !membership.placeId) return NextResponse.json({ code: 'FORBIDDEN_SCOPE', message: '当前账号没有展位分析权限', request_id: requestId }, { status: 403 });
  return NextResponse.json({ request_id: requestId, analytics: await getExhibitorAnalytics(membership.placeId) });
}
