import { redirect } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { claimInitialOwner } from '@/db/access';

export const dynamic = 'force-dynamic';

export default async function InitializeOwnerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const user = await requireChatGPTUser(`/initialize-owner?token=${encodeURIComponent(token)}`);
  if (!await claimInitialOwner(user, token)) redirect('/access-denied');
  redirect('/operations');
}
