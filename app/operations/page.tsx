import OperationsClient from './OperationsClient';
import { requireUser } from '@/app/auth';
import { ensureOperationsAccess } from '@/db/access';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const user = await requireUser('/operations');
  const membership = await ensureOperationsAccess(user);
  if (!membership) redirect('/access-denied');
  return <OperationsClient displayName={user.displayName} />;
}
