import { NextRequest, NextResponse } from 'next/server';
import { analyticsRateAllowed, clientAnalyticsEventNames, recordAnalyticsEvent, type ClientAnalyticsEventName } from '@/db/analytics';
import { places, venue } from '@/lib/venue';

const allowedEvents = new Set<ClientAnalyticsEventName>(clientAnalyticsEventNames);
const placeIds = new Set(places.map((place) => place.id));
const placeRequired = new Set<ClientAnalyticsEventName>(['booth_viewed', 'itinerary_stop_added', 'route_started', 'stop_arrived', 'stop_completed']);

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let payload: { event_name?: string; client_event_id?: string; place_id?: string; map_version?: string; properties?: Record<string, unknown> };
  try { payload = await request.json(); } catch { return NextResponse.json({ code: 'INVALID_JSON', request_id: requestId }, { status: 400 }); }
  if (!allowedEvents.has(payload.event_name as ClientAnalyticsEventName)) return NextResponse.json({ code: 'EVENT_NOT_ALLOWED', request_id: requestId }, { status: 422 });
  const clientEventId = String(payload.client_event_id ?? '');
  if (clientEventId.length < 16 || clientEventId.length > 100) return NextResponse.json({ code: 'INVALID_EVENT', request_id: requestId }, { status: 422 });
  const existingSession = request.cookies.get('expo_analytics_sid')?.value;
  const anonymousId = existingSession && existingSession.length >= 16 && existingSession.length <= 100 ? existingSession : crypto.randomUUID();
  if (!await analyticsRateAllowed(anonymousId)) return NextResponse.json({ code: 'RATE_LIMITED', request_id: requestId }, { status: 429 });
  const placeId = payload.place_id && placeIds.has(payload.place_id) ? payload.place_id : undefined;
  if (placeRequired.has(payload.event_name as ClientAnalyticsEventName) && !placeId) return NextResponse.json({ code: 'PLACE_REQUIRED', request_id: requestId }, { status: 422 });
  await recordAnalyticsEvent({ eventName: payload.event_name as ClientAnalyticsEventName, role: 'visitor', anonymousId, placeId, requestId, dedupKey: clientEventId, mapVersion: payload.map_version === venue.mapVersion ? payload.map_version : venue.mapVersion, properties: payload.properties });
  const response = NextResponse.json({ request_id: requestId }, { status: 202 });
  if (!existingSession) response.cookies.set('expo_analytics_sid', anonymousId, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 24 * 60 * 60 });
  return response;
}
