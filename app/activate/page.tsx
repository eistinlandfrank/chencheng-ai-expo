import { redirect } from 'next/navigation';
import { getUser } from '@/app/auth';
import ActivateClient from './ActivateClient';

export const dynamic = 'force-dynamic';

export default async function ActivatePage() {
  if (await getUser()) redirect('/');
  return <ActivateClient />;
}
