import { redirect } from 'next/navigation';
import { getUser, safeReturnPath } from '@/app/auth';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const returnTo = safeReturnPath((await searchParams).return_to ?? '/');
  if (await getUser()) redirect(returnTo);
  return <LoginClient returnTo={returnTo} />;
}
