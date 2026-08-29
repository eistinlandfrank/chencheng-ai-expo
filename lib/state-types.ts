export type ClosedGroup = 'north-main' | 'south-main';

export type OpsNotice = {
  id: number;
  title: string;
  content: string;
  audience: string;
  status: string;
  createdAt: string;
};

export type OpsTicket = {
  id: string;
  category: string;
  location: string;
  priority: string;
  status: string;
  assignee: string;
  description: string;
  source: 'operations' | 'exhibitor';
  createdAt: string;
  organizationId?: string;
  placeId?: string;
};

export type MapFieldChecks = {
  orientation: boolean;
  floor: boolean;
  connections: boolean;
  accessibility: boolean;
  obstacles: boolean;
};

export type MapReview = {
  actorId: string;
  actorLabel: string;
  checks: MapFieldChecks;
  reviewedAt: string;
};

export type OpsState = {
  closedGroups: ClosedGroup[];
  notices: OpsNotice[];
  tickets: OpsTicket[];
  openPlaceIds: string[];
  mapStatus: 'draft' | 'review' | 'published';
  reviewedMapVersion: string;
  mapReviews: MapReview[];
};

export const defaultOpsState: OpsState = {
  closedGroups: [],
  notices: [],
  tickets: [],
  openPlaceIds: [],
  mapStatus: 'draft',
  reviewedMapVersion: '',
  mapReviews: [],
};

export const emptyMapFieldChecks: MapFieldChecks = {
  orientation: false,
  floor: false,
  connections: false,
  accessibility: false,
  obstacles: false,
};

export type ExhibitorTicket = {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  createdAt: string;
  location: string;
};

export type PublishedBoothProfile = {
  boothTitle: string;
  intro: string;
  tags: string;
  publishedAt: string;
};

export type ExhibitorState = {
  profileStatus: 'draft' | 'review' | 'published';
  boothTitle: string;
  intro: string;
  tags: string;
  receptionStatus: 'pending' | 'open' | 'busy' | 'closed';
  reservationsEnabled: boolean;
  activityStatus: 'draft' | 'confirmed' | 'delayed' | 'cancelled';
  activityTitle: string;
  activityStart: string;
  activityDuration: number;
  activityCapacity: number;
  activityLanguage: string;
  publishedProfile: PublishedBoothProfile | null;
  tickets: ExhibitorTicket[];
};

export const defaultExhibitorState: ExhibitorState = {
  profileStatus: 'draft',
  boothTitle: '硬件机器人开发区',
  intro: '面向参赛团队提供硬件机器人开发协作空间与专线网络支持。',
  tags: '机器人, 硬件开发, 专线网络',
  receptionStatus: 'pending',
  reservationsEnabled: false,
  activityStatus: 'draft',
  activityTitle: '',
  activityStart: '',
  activityDuration: 30,
  activityCapacity: 0,
  activityLanguage: '中文',
  publishedProfile: null,
  tickets: [],
};
