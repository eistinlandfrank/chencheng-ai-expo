import ExhibitorClient from './ExhibitorClient';
import { requireUser } from '@/app/auth';
import { ensureExhibitorAccess } from '@/db/access';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ExhibitorPage() {
  const user = await requireUser('/exhibitor');
  const membership = await ensureExhibitorAccess(user);
  if (!membership) redirect('/access-denied');
  return <ExhibitorClient displayName={user.displayName} />;
}
