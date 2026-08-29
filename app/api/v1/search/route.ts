import { NextRequest, NextResponse } from 'next/server';
import { readState } from '@/db/state';
import { defaultOpsState } from '@/lib/state-types';
import { edges, findRoute, searchPlaces, venue, type PlaceKind } from '@/lib/venue';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let payload: { query?: string; kind?: PlaceKind | 'all'; start_node_id?: string; wheelchair?: boolean };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId, details: null }, { status: 400 });
  }
  const query = String(payload.query ?? '').slice(0, 120);
  const startNodeId = payload.start_node_id;
  const live = await readState(`ops:${venue.eventId}`, defaultOpsState);
  const closedEdgeIds = edges.filter((edge) => live.value.closedGroups.includes(edge.group as 'north-main' | 'south-main')).map((edge) => edge.id);
  const results = searchPlaces(query, payload.kind).filter((place) => place.kind === 'gate' || live.value.openPlaceIds.includes(place.id)).map((place) => {
    const route = live.value.reviewedMapVersion === venue.mapVersion && live.value.mapStatus === 'published' && startNodeId
      ? findRoute(startNodeId, place.nodeId, { closedEdgeIds, wheelchair: Boolean(payload.wheelchair) })
      : null;
    return {
      ...place,
      accessible: venue.accessibilityVerified && place.accessible,
      route: route ? { distance_meters: route.distanceMeters, duration_minutes: route.durationMinutes } : null,
    };
  });
  return NextResponse.json({ request_id: requestId, map_version: venue.mapVersion, map_status: live.value.reviewedMapVersion === venue.mapVersion ? live.value.mapStatus : 'draft', results });
}
