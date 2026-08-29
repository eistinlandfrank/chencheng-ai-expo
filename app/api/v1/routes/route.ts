import { NextRequest, NextResponse } from 'next/server';
import { readState } from '@/db/state';
import { defaultOpsState } from '@/lib/state-types';
import { edges, findRoute, nodes, places, venue } from '@/lib/venue';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const live = await readState(`ops:${venue.eventId}`, defaultOpsState);
  if (live.value.reviewedMapVersion !== venue.mapVersion || live.value.mapStatus !== 'published') {
    return NextResponse.json({ code: 'MAP_NOT_PUBLISHED', message: '场馆地图尚未完成现场复核，请稍后再试', request_id: requestId, details: null }, { status: 409 });
  }
  let payload: { from_node_id?: string; to_node_id?: string; closed_edge_ids?: string[]; wheelchair?: boolean };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId, details: null }, { status: 400 });
  }
  const knownNodes = new Set(nodes.map((node) => node.id));
  if (!payload.from_node_id || !payload.to_node_id || !knownNodes.has(payload.from_node_id) || !knownNodes.has(payload.to_node_id)) {
    return NextResponse.json({ code: 'ROUTE_ENDPOINT_INVALID', message: '起点或终点无效，请重新确认位置', request_id: requestId, details: null }, { status: 422 });
  }
  const allowedTargets = new Set(places.filter((place) => place.kind === 'gate' || live.value.openPlaceIds.includes(place.id)).map((place) => place.nodeId));
  if (!allowedTargets.has(payload.to_node_id)) {
    return NextResponse.json({ code: 'DESTINATION_NOT_OPEN', message: '该地点尚未确认开放', request_id: requestId, details: null }, { status: 409 });
  }
  const closedEdgeIds = edges.filter((edge) => live.value.closedGroups.includes(edge.group as 'north-main' | 'south-main')).map((edge) => edge.id);
  const requestedClosedEdges = payload.closed_edge_ids ?? [];
  const route = findRoute(payload.from_node_id, payload.to_node_id, { closedEdgeIds: [...closedEdgeIds, ...requestedClosedEdges], wheelchair: Boolean(payload.wheelchair) });
  if (!route) {
    return NextResponse.json({ code: 'ROUTE_NOT_FOUND', message: '当前没有满足条件的可通行路线', request_id: requestId, details: null }, { status: 404 });
  }
  return NextResponse.json({ request_id: requestId, map_version: venue.mapVersion, route: {
    node_ids: route.nodeIds,
    edge_ids: route.edgeIds,
    polyline: route.polyline,
    distance_meters: route.distanceMeters,
    duration_minutes: route.durationMinutes,
    instructions: route.instructions,
  } });
}
