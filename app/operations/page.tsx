import OperationsClient from './OperationsClient';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { ensureOperationsAccess } from '@/db/access';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  if (process.env.NODE_ENV === 'development') return <OperationsClient displayName="本地运营账号" />;
  const user = await requireChatGPTUser('/operations');
  const membership = await ensureOperationsAccess(user);
  if (!membership) redirect('/access-denied');
  return <OperationsClient displayName={user.displayName} />;
}
