import { NextResponse } from 'next/server';
import { readState } from '@/db/state';
import { defaultExhibitorState, defaultOpsState } from '@/lib/state-types';
import { venue } from '@/lib/venue';

export async function GET() {
  const requestId = crypto.randomUUID();
  const record = await readState(`ops:${venue.eventId}`, defaultOpsState);
  const exhibitor = await readState(`exhibitor:${venue.eventId}:org-hardware-robot:robot-dev`, defaultExhibitorState);
  const publishedProfile = exhibitor.value.publishedProfile;
  const profilePublic = record.value.openPlaceIds.includes('robot-dev') && Boolean(publishedProfile);
  const activityStartsAt = exhibitor.value.activityStart
    ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(exhibitor.value.activityStart) ? exhibitor.value.activityStart : `${exhibitor.value.activityStart}${/T\d\d:\d\d$/.test(exhibitor.value.activityStart) ? ':00' : ''}+08:00`)
    : null;
  const activityCurrent = Boolean(activityStartsAt && !Number.isNaN(activityStartsAt.getTime()) && activityStartsAt.getTime() + exhibitor.value.activityDuration * 60_000 > Date.now());
  return NextResponse.json({
    request_id: requestId,
    map_version: venue.mapVersion,
    updated_at: record.updatedAt || null,
    state: {
      map_status: record.value.reviewedMapVersion === venue.mapVersion ? record.value.mapStatus : 'draft',
      closed_groups: record.value.closedGroups,
      open_place_ids: record.value.openPlaceIds,
      notices: record.value.notices.filter((notice) => notice.status === '已发布' && notice.audience === '全体观众').slice(0, 10),
      place_overrides: profilePublic ? {
        'robot-dev': {
          name: publishedProfile!.boothTitle,
          summary: publishedProfile!.intro,
          tags: publishedProfile!.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          status: ['open', 'busy'].includes(exhibitor.value.receptionStatus) ? 'open' : 'closed',
          status_label: exhibitor.value.receptionStatus === 'open' ? '已确认开放' : exhibitor.value.receptionStatus === 'busy' ? '接待繁忙' : exhibitor.value.receptionStatus === 'closed' ? '暂停接待' : '等待现场确认',
          reservations_enabled: exhibitor.value.reservationsEnabled && activityCurrent && exhibitor.value.activityStatus !== 'cancelled',
          activity: activityCurrent && exhibitor.value.activityTitle && exhibitor.value.activityStart && exhibitor.value.activityStatus !== 'draft' ? {
            title: exhibitor.value.activityTitle,
            start: exhibitor.value.activityStart,
            duration: exhibitor.value.activityDuration,
            capacity: exhibitor.value.activityCapacity,
            language: exhibitor.value.activityLanguage,
            status: exhibitor.value.activityStatus,
          } : null,
        },
      } : {},
    },
  });
}
