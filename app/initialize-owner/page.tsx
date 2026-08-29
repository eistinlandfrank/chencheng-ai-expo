import { redirect } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { claimInitialOwner } from '@/db/access';

export const dynamic = 'force-dynamic';

export default async function InitializeOwnerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const runtime = env as unknown as Record<string, string | undefined>;
  const userId = runtime.INITIAL_OWNER_USER_ID?.trim();
  const email = runtime.INITIAL_OWNER_EMAIL?.trim();
  const fullName = runtime.INITIAL_OWNER_NAME?.trim() || null;
  if (!userId || !email) redirect('/access-denied');
  const user = { userId, email, fullName, displayName: fullName ?? email };
  if (!await claimInitialOwner(user, token)) redirect('/access-denied');
  redirect('/operations');
}
