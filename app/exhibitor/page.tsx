import ExhibitorClient from './ExhibitorClient';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { ensureExhibitorAccess } from '@/db/access';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ExhibitorPage() {
  if (process.env.NODE_ENV === 'development') return <ExhibitorClient displayName="本地展商账号" />;
  const user = await requireChatGPTUser('/exhibitor');
  const membership = await ensureExhibitorAccess(user);
  if (!membership) redirect('/access-denied');
  return <ExhibitorClient displayName={user.displayName} />;
}
