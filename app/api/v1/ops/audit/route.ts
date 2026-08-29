import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureOperationsAccess } from '@/db/access';
import { listRecentAuditEntries } from '@/db/audit';

export async function GET() {
  const requestId = crypto.randomUUID();
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '请登录后继续', request_id: requestId }, { status: 401 });
  if (!await ensureOperationsAccess(user)) return NextResponse.json({ code: 'FORBIDDEN_SCOPE', message: '当前账号没有审计查看权限', request_id: requestId }, { status: 403 });
  return NextResponse.json({ request_id: requestId, entries: await listRecentAuditEntries() });
}
