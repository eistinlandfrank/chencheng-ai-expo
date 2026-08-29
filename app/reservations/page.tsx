import { requireChatGPTUser } from '@/app/chatgpt-auth';
import ReservationsClient from './ReservationsClient';

export const dynamic = 'force-dynamic';

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ place_id?: string }> }) {
  const { place_id: placeId = '' } = await searchParams;
  const returnTo = placeId ? `/reservations?place_id=${encodeURIComponent(placeId)}` : '/reservations';
  const user = await requireChatGPTUser(returnTo);
  return <ReservationsClient displayName={user.displayName} placeId={placeId} />;
}
