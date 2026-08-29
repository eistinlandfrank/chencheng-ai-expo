import { redirect } from 'next/navigation';
import { getUser, safeReturnPath } from '@/app/auth';
import LoginClient from './LoginClient';
import type { PortalId } from '@/components/PortalSwitcher';
import { publicPortalShowcaseEnabled } from '@/lib/showcase';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const returnTo = safeReturnPath((await searchParams).return_to ?? '/exhibitor');
  if (publicPortalShowcaseEnabled()) redirect(returnTo);
  if (await getUser()) redirect(returnTo);
  const activePortal: PortalId = returnTo.startsWith('/operations') ? 'operations' : 'exhibitor';
  return <LoginClient returnTo={returnTo} activePortal={activePortal} />;
}
