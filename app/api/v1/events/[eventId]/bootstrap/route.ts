import { NextRequest, NextResponse } from 'next/server';
import { readState } from '@/db/state';
import { defaultOpsState } from '@/lib/state-types';
import { places, venue } from '@/lib/venue';

export async function GET(_request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  const requestId = crypto.randomUUID();
  if (eventId !== venue.eventId) {
    return NextResponse.json({ code: 'EVENT_NOT_FOUND', message: '未找到该展会', request_id: requestId, details: null }, { status: 404 });
  }
  const live = await readState(`ops:${venue.eventId}`, defaultOpsState);
  return NextResponse.json({
    request_id: requestId,
    event: { id: venue.eventId, name: venue.name, timezone: venue.timezone, status: 'scheduled' },
    map: { version: venue.mapVersion, status: live.value.reviewedMapVersion === venue.mapVersion ? live.value.mapStatus : 'draft', width_meters: venue.widthMeters, height_meters: venue.heightMeters, floor_label: venue.floor },
    anchors: [{ id: 'anchor-lower-entry', label: '图下入口', node_id: 'gate-south', status: 'pending_review' }],
    categories: [...new Set(places.filter((place) => live.value.openPlaceIds.includes(place.id)).map((place) => place.category))],
    open_place_ids: live.value.openPlaceIds,
  });
}
