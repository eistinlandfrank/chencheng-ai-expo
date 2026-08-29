import { requireUser } from '@/app/auth';
import ReservationsClient from './ReservationsClient';

export const dynamic = 'force-dynamic';

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ place_id?: string }> }) {
  const { place_id: placeId = '' } = await searchParams;
  if (process.env.NODE_ENV !== 'development') {
    const returnTo = placeId ? `/reservations?place_id=${encodeURIComponent(placeId)}` : '/reservations';
    await requireUser(returnTo);
  }
  return <ReservationsClient placeId={placeId} />;
}
