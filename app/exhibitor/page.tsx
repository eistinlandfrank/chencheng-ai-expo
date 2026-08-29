import ExhibitorClient from './ExhibitorClient';
import { requireUser } from '@/app/auth';
import { ensureExhibitorAccess } from '@/db/access';
import { publicPortalShowcaseEnabled } from '@/lib/showcase';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ExhibitorPage() {
  if (publicPortalShowcaseEnabled()) {
    return <ExhibitorClient displayName="公开演示" readOnly />;
  }
  if (process.env.NODE_ENV === 'development') {
    return <ExhibitorClient displayName="本地展商账号" />;
  }
  const user = await requireUser('/exhibitor');
  const membership = await ensureExhibitorAccess(user);
  if (!membership) redirect('/access-denied');
  return <ExhibitorClient displayName={user.displayName} />;
}
