import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { analyticsRateAllowed, clientAnalyticsEventNames, recordAnalyticsEvent, type ClientAnalyticsEventName } from '@/db/analytics';
import { places, venue } from '@/lib/venue';

const allowedEvents = new Set<ClientAnalyticsEventName>(clientAnalyticsEventNames);
const placeIds = new Set(places.map((place) => place.id));
const placeRequired = new Set<ClientAnalyticsEventName>(['booth_viewed', 'itinerary_stop_added', 'route_started', 'stop_arrived', 'stop_completed']);

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function analyticsKey() {
  const secret = String((env as unknown as { ANALYTICS_SESSION_SECRET?: string }).ANALYTICS_SESSION_SECRET ?? '');
  if (secret.length < 32) throw new Error('ANALYTICS_SESSION_SECRET_MISSING');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signedSession(id: string) {
  const signature = await crypto.subtle.sign('HMAC', await analyticsKey(), new TextEncoder().encode(id));
  return `${id}.${base64Url(new Uint8Array(signature))}`;
}

async function verifiedSession(value: string | undefined) {
  if (!value) return null;
  const [id, signature, extra] = value.split('.');
  if (extra || !/^[0-9a-f-]{36}$/i.test(id) || !signature || signature.length > 100) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await analyticsKey(), fromBase64Url(signature), new TextEncoder().encode(id));
    return valid ? id : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let payload: { event_name?: string; client_event_id?: string; place_id?: string; map_version?: string; properties?: Record<string, unknown> };
  try { payload = await request.json(); } catch { return NextResponse.json({ code: 'INVALID_JSON', request_id: requestId }, { status: 400 }); }
  if (!allowedEvents.has(payload.event_name as ClientAnalyticsEventName)) return NextResponse.json({ code: 'EVENT_NOT_ALLOWED', request_id: requestId }, { status: 422 });
  const clientEventId = String(payload.client_event_id ?? '');
  if (clientEventId.length < 16 || clientEventId.length > 100) return NextResponse.json({ code: 'INVALID_EVENT', request_id: requestId }, { status: 422 });
  try { await analyticsKey(); } catch { return NextResponse.json({ code: 'ANALYTICS_UNAVAILABLE', request_id: requestId }, { status: 503 }); }
  const existingCookie = request.cookies.get('expo_analytics_sid')?.value;
  let anonymousId: string;
  try {
    anonymousId = await verifiedSession(existingCookie) ?? crypto.randomUUID();
  } catch {
    return NextResponse.json({ code: 'ANALYTICS_UNAVAILABLE', request_id: requestId }, { status: 503 });
  }
  const networkAddress = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!await analyticsRateAllowed(anonymousId, networkAddress)) return NextResponse.json({ code: 'RATE_LIMITED', request_id: requestId }, { status: 429 });
  const placeId = payload.place_id && placeIds.has(payload.place_id) ? payload.place_id : undefined;
  if (placeRequired.has(payload.event_name as ClientAnalyticsEventName) && !placeId) return NextResponse.json({ code: 'PLACE_REQUIRED', request_id: requestId }, { status: 422 });
  await recordAnalyticsEvent({ eventName: payload.event_name as ClientAnalyticsEventName, role: 'visitor', anonymousId, placeId, requestId, dedupKey: clientEventId, mapVersion: payload.map_version === venue.mapVersion ? payload.map_version : venue.mapVersion, properties: payload.properties });
  const response = NextResponse.json({ request_id: requestId }, { status: 202 });
  if (!await verifiedSession(existingCookie)) response.cookies.set('expo_analytics_sid', await signedSession(anonymousId), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 24 * 60 * 60 });
  return response;
}
