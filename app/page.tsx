'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Accessibility,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Coffee,
  Compass,
  Heart,
  Home,
  Info,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  X,
} from 'lucide-react';
import Brand from '@/components/Brand';
import InterestGuide from '@/components/InterestGuide';
import Modal from '@/components/Modal';
import Toast, { type ToastState } from '@/components/Toast';
import VenueMap from '@/components/VenueMap';
import { edges, findRoute, getPlace, nodes, places, venue, type VenuePlace } from '@/lib/venue';
import type { ClosedGroup, OpsNotice } from '@/lib/state-types';

type View = 'home' | 'map' | 'itinerary' | 'profile';
type StopState = 'planned' | 'enroute' | 'arrived' | 'completed' | 'skipped' | 'cancelled';
type Stop = { id: string; placeId: string; time: string; dwellMinutes: number; state: StopState; walkMeters: number; fixed?: boolean; risk?: string };
type PublicActivity = { title: string; start: string; duration: number; capacity: number; language: string; status: 'confirmed' | 'delayed' | 'cancelled' };
type PublicPlaceOverride = { name: string; summary: string; tags: string[]; status: 'open' | 'closed'; status_label: string; reservations_enabled?: boolean; activity?: PublicActivity | null };

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'map', label: '地图', icon: MapIcon },
  { id: 'itinerary', label: '行程', icon: CalendarDays },
  { id: 'profile', label: '我的', icon: CircleUserRound },
];

const quickActions = [
  { id: 'booth', label: '找展位', icon: Search },
  { id: 'route', label: '路线规划', icon: Route },
  { id: 'plan', label: '时间规划', icon: Clock3 },
  { id: 'nearby', label: '附近服务', icon: Coffee },
  { id: 'today', label: '今日活动', icon: CalendarDays },
  { id: 'accessible', label: '无障碍路线', icon: Accessibility },
];

const interestValues = ['硬件', '软件', '创客', '合作伙伴', '活动'] as const;

const stopLabels: Record<StopState, string> = {
  planned: '计划中',
  enroute: '前往中',
  arrived: '已到达',
  completed: '已完成',
  skipped: '已跳过',
  cancelled: '已取消',
};

function addMinutes(time: string, amount: number) {
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + amount;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function availableMinutes(start: string, end: string) {
  return toMinutes(end) - toMinutes(start);
}

const anchorNodes: Record<string, string> = {
  'anchor-lower-entry': 'gate-south',
  'anchor-south-entry': 'gate-south',
  'gate-south': 'gate-south',
  'anchor-upper-entry': 'gate-upper',
  'gate-upper': 'gate-upper',
};

function trackVisitorEvent(eventName: string, placeId?: string, properties?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return;
  void fetch('/api/v1/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ event_name: eventName, client_event_id: crypto.randomUUID(), place_id: placeId, map_version: venue.mapVersion, properties }),
  }).catch(() => undefined);
}

function buildPlan(startNodeId: string, startTime: string, leaveBy: string, interests: string[], wheelchair: boolean, closedEdgeIds: string[], allowedPlaceIds: string[], fixedPlaceId?: string, fixedTime?: string): Stop[] {
  const candidates = [
    interests.includes('硬件') ? 'robot-dev' : null,
    interests.includes('软件') ? 'coding' : null,
    interests.includes('创客') ? '3d-print' : null,
    interests.includes('合作伙伴') ? 'sponsor' : null,
    interests.includes('活动') ? 'ceremony-rest' : null,
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  const duration = availableMinutes(startTime, leaveBy);
  let currentNode = startNodeId;
  let elapsed = 0;
  const result: Stop[] = [];

  if (fixedPlaceId && fixedTime) {
    const fixedPlace = getPlace(fixedPlaceId);
    if (!fixedPlace || !allowedPlaceIds.includes(fixedPlaceId)) return [];
    const fixedRoute = findRoute(currentNode, fixedPlace.nodeId, { wheelchair, closedEdgeIds });
    if (!fixedRoute) return [];
    const fixedOffset = availableMinutes(startTime, fixedTime);
    const dwell = fixedPlace.dwellMinutes ?? 15;
    if (fixedOffset < fixedRoute.durationMinutes || fixedOffset + dwell + 10 > duration) return [];
    result.push({ id: `${fixedPlace.id}-fixed`, placeId: fixedPlace.id, time: fixedTime, dwellMinutes: dwell, state: 'planned', walkMeters: fixedRoute.distanceMeters, fixed: true });
    currentNode = fixedPlace.nodeId;
    elapsed = fixedOffset + dwell;
  }

  for (const placeId of candidates) {
    if (!allowedPlaceIds.includes(placeId)) continue;
    if (placeId === fixedPlaceId) continue;
    const place = getPlace(placeId);
    if (!place) continue;
    const route = findRoute(currentNode, place.nodeId, { wheelchair, closedEdgeIds });
    if (!route) continue;
    const dwell = place.dwellMinutes ?? 15;
    const cost = route.durationMinutes + dwell;
    if (elapsed + cost + 10 > duration) continue;
    elapsed += route.durationMinutes;
    result.push({ id: `${place.id}-${result.length}`, placeId, time: addMinutes(startTime, elapsed), dwellMinutes: dwell, state: 'planned', walkMeters: route.distanceMeters });
    elapsed += dwell;
    currentNode = place.nodeId;
  }
  return result;
}

function reflowStops(stops: Stop[], startNodeId: string, startTime: string, leaveBy: string, wheelchair: boolean, closedEdgeIds: string[]) {
  let cursor = startNodeId;
  let elapsed = 0;
  return stops.map((stop) => {
    const place = getPlace(stop.placeId);
    if (!place || stop.state === 'cancelled' || stop.state === 'skipped') return stop;
    if (stop.state === 'completed') {
      cursor = place.nodeId;
      return stop;
    }
    const route = findRoute(cursor, place.nodeId, { wheelchair, closedEdgeIds });
    if (!route) return { ...stop, walkMeters: 0, risk: '当前不可达' };
    elapsed += route.durationMinutes;
    const predictedTime = addMinutes(startTime, elapsed);
    const nextTime = stop.fixed ? stop.time : predictedTime;
    const lateForFixed = stop.fixed && toMinutes(predictedTime) > toMinutes(stop.time);
    if (stop.fixed) elapsed = Math.max(elapsed, availableMinutes(startTime, stop.time));
    elapsed += stop.dwellMinutes;
    const leaveRisk = elapsed + 10 > availableMinutes(startTime, leaveBy);
    const activityRisk = stop.risk?.startsWith('活动') ? stop.risk : undefined;
    const next = { ...stop, time: nextTime, walkMeters: route.distanceMeters, risk: activityRisk ?? (lateForFixed ? '固定安排可能迟到' : leaveRisk ? '可能超过离场时间' : undefined) };
    cursor = place.nodeId;
    return next;
  });
}

export default function VisitorApp() {
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchKind, setSearchKind] = useState<'all' | 'zone' | 'service' | 'gate'>('all');
  const [searchCategory, setSearchCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState<VenuePlace | null>(null);
  const [targetPlaceId, setTargetPlaceId] = useState('robot-dev');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'qr' | 'manual' | 'saved' | null>(null);
  const [mapStatus, setMapStatus] = useState<'draft' | 'review' | 'published'>('review');
  const [closedGroups, setClosedGroups] = useState<ClosedGroup[]>([]);
  const [openPlaceIds, setOpenPlaceIds] = useState<string[]>([]);
  const [notices, setNotices] = useState<OpsNotice[]>([]);
  const [placeOverrides, setPlaceOverrides] = useState<Record<string, PublicPlaceOverride>>({});
  const [navigationActive, setNavigationActive] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [itinerary, setItinerary] = useState<Stop[]>([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [interestGuideOpen, setInterestGuideOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [duration, setDuration] = useState(90);
  const [startTime, setStartTime] = useState('09:30');
  const [leaveBy, setLeaveBy] = useState('11:00');
  const [fixedPlaceId, setFixedPlaceId] = useState('');
  const [fixedTime, setFixedTime] = useState('10:15');
  const [interests, setInterests] = useState<string[]>(['硬件', '软件']);
  const [wheelchair, setWheelchair] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const previousClosureKey = useRef<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem('expo-visitor-state');
      let savedNodeId: string | null = null;
      if (saved) {
        try {
          const state = JSON.parse(saved) as { favorites?: string[]; itinerary?: Stop[]; wheelchair?: boolean; currentNodeId?: string; mapVersion?: string; interests?: string[]; duration?: number };
          setFavorites(state.favorites ?? []);
          setItinerary(state.mapVersion === venue.mapVersion ? state.itinerary ?? [] : []);
          setWheelchair(venue.accessibilityVerified && Boolean(state.wheelchair));
          const savedInterests = (state.interests ?? []).filter((value) => interestValues.includes(value as typeof interestValues[number]));
          if (savedInterests.length) setInterests(savedInterests);
          if ([60, 90, 120].includes(state.duration ?? 0)) {
            const savedDuration = state.duration as 60 | 90 | 120;
            setDuration(savedDuration);
            setLeaveBy(addMinutes('09:30', savedDuration));
          }
          savedNodeId = state.currentNodeId && nodes.some((node) => node.id === state.currentNodeId) ? state.currentNodeId : null;
        } catch {
          window.localStorage.removeItem('expo-visitor-state');
        }
      }
      const reservedFixed = window.localStorage.getItem('expo-reservation-fixed');
      if (reservedFixed) {
        try {
          const reservation = JSON.parse(reservedFixed) as { placeId?: string; start?: string; duration?: number; status?: string; mapVersion?: string };
          const reservedPlace = reservation.placeId ? getPlace(reservation.placeId) : null;
          const reservedTime = reservation.start?.match(/T(\d{2}:\d{2})/)?.[1];
          if (reservation.mapVersion === venue.mapVersion && reservedPlace && reservedTime && !['cancelled', 'completed'].includes(String(reservation.status))) {
            const reservedMinutes = toMinutes(reservedTime);
            const windowStart = Math.max(0, reservedMinutes - 30);
            const windowEnd = Math.min(23 * 60 + 59, reservedMinutes + Math.max(5, Number(reservation.duration) || 30) + 10);
            setFixedPlaceId(reservedPlace.id);
            setFixedTime(reservedTime);
            setStartTime(addMinutes('00:00', windowStart));
            setLeaveBy(addMinutes('00:00', windowEnd));
            setDuration(windowEnd - windowStart);
          } else {
            window.localStorage.removeItem('expo-reservation-fixed');
          }
        } catch {
          window.localStorage.removeItem('expo-reservation-fixed');
        }
      }
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('event_id');
      const anchorId = params.get('anchor_id');
      const qrNodeId = anchorId ? anchorNodes[anchorId] : null;
      if (anchorId && eventId === venue.eventId && qrNodeId) {
        setCurrentNodeId(qrNodeId);
        setLocationSource('qr');
        trackVisitorEvent('position_confirmed', undefined, { source: 'qr' });
      } else if (savedNodeId) {
        setCurrentNodeId(savedNodeId);
        setLocationSource('saved');
      } else if (anchorId || eventId) {
        setToast({ message: '定位标识无效，请手动确认当前位置', type: 'warning' });
      }
      trackVisitorEvent('visitor_session_started');
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem('expo-visitor-state', JSON.stringify({ favorites, itinerary, wheelchair, currentNodeId, interests, duration, mapVersion: venue.mapVersion }));
  }, [favorites, itinerary, wheelchair, currentNodeId, interests, duration, storageReady]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/v1/live-state', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json() as { map_version?: string; state?: { map_status?: 'draft' | 'review' | 'published'; closed_groups?: ClosedGroup[]; open_place_ids?: string[]; notices?: OpsNotice[]; place_overrides?: Record<string, PublicPlaceOverride> } };
        if (!active) return;
        const responseMatchesMap = payload.map_version === venue.mapVersion;
        const nextMapStatus = responseMatchesMap ? payload.state?.map_status ?? 'review' : 'review';
        const nextClosedGroups = payload.state?.closed_groups ?? [];
        setMapStatus(nextMapStatus);
        setClosedGroups(responseMatchesMap ? nextClosedGroups : []);
        setOpenPlaceIds(responseMatchesMap ? payload.state?.open_place_ids ?? [] : []);
        setNotices(payload.state?.notices ?? []);
        setPlaceOverrides(responseMatchesMap ? payload.state?.place_overrides ?? {} : {});
        window.localStorage.setItem('expo-live-cache', JSON.stringify({ mapVersion: payload.map_version ?? '', mapStatus: nextMapStatus, closedGroups: responseMatchesMap ? nextClosedGroups : [], openPlaceIds: responseMatchesMap ? payload.state?.open_place_ids ?? [] : [], notices: payload.state?.notices ?? [], placeOverrides: responseMatchesMap ? payload.state?.place_overrides ?? {} : {} }));
      } catch {
        if (!active) return;
        try {
          const cached = JSON.parse(window.localStorage.getItem('expo-live-cache') ?? '{}') as {
            mapVersion?: string;
            mapStatus?: 'draft' | 'review' | 'published';
            closedGroups?: ClosedGroup[];
            openPlaceIds?: string[];
            notices?: OpsNotice[];
            placeOverrides?: Record<string, PublicPlaceOverride>;
          };
          const cacheMatchesMap = cached.mapVersion === venue.mapVersion;
          setMapStatus(cacheMatchesMap ? cached.mapStatus ?? 'review' : 'review');
          setClosedGroups(cacheMatchesMap ? cached.closedGroups ?? [] : []);
          setOpenPlaceIds(cacheMatchesMap ? cached.openPlaceIds ?? [] : []);
          setNotices(cached.notices ?? []);
          setPlaceOverrides(cacheMatchesMap ? cached.placeOverrides ?? {} : {});
        } catch {
          setMapStatus('review');
          setClosedGroups([]);
          setOpenPlaceIds([]);
          setNotices([]);
          setPlaceOverrides({});
        }
      } finally {
        if (active) setLiveReady(true);
      }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const key = [...closedGroups].sort().join(',');
    if (previousClosureKey.current === null) {
      previousClosureKey.current = key;
      return;
    }
    if (previousClosureKey.current === key) return;
    previousClosureKey.current = key;
    const timer = window.setTimeout(() => {
      setToast({ message: mapStatus === 'published' ? '现场通道状态已变化，行程与路线已重新计算' : '现场通道状态已变化，导航仍在等待复核', type: 'warning' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [closedGroups, mapStatus]);

  const effectivePlaces = useMemo(() => places.map((place) => {
    const override = placeOverrides[place.id];
    return override ? { ...place, name: override.name, summary: override.summary, tags: override.tags, status: override.status, statusLabel: override.status_label } : place;
  }), [placeOverrides]);
  const searchCategories = useMemo(() => ['all', ...Array.from(new Set(effectivePlaces.map((place) => place.category))).sort((a, b) => a.localeCompare(b, 'zh-CN'))], [effectivePlaces]);
  const placeById = useMemo(() => new Map(effectivePlaces.map((place) => [place.id, place])), [effectivePlaces]);
  const availablePlaceIds = useMemo(() => openPlaceIds.filter((id) => placeOverrides[id]?.status !== 'closed'), [openPlaceIds, placeOverrides]);
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    return effectivePlaces.filter((place) => {
      if (favoritesOnly && !favorites.includes(place.id)) return false;
      if (searchKind !== 'all' && place.kind !== searchKind) return false;
      if (searchCategory !== 'all' && place.category !== searchCategory) return false;
      if (place.kind !== 'gate' && !availablePlaceIds.includes(place.id)) return false;
      return !normalized || [place.name, place.code, place.category, place.zone, place.summary, ...place.tags, placeOverrides[place.id]?.activity?.title ?? ''].join(' ').toLocaleLowerCase('zh-CN').includes(normalized);
    });
  }, [availablePlaceIds, effectivePlaces, favorites, favoritesOnly, placeOverrides, query, searchCategory, searchKind]);
  const targetPlace = placeById.get(availablePlaceIds.includes(targetPlaceId) ? targetPlaceId : availablePlaceIds[0] ?? '') ?? null;
  const currentLocation = currentNodeId ? nodes.find((node) => node.id === currentNodeId) ?? null : null;
  const closedEdgeIds = useMemo(() => edges.filter((edge) => closedGroups.includes(edge.group as ClosedGroup)).map((edge) => edge.id), [closedGroups]);
  const route = useMemo(() => mapStatus === 'published' && currentNodeId && targetPlace ? findRoute(currentNodeId, targetPlace.nodeId, { wheelchair, closedEdgeIds }) : null, [mapStatus, currentNodeId, targetPlace, wheelchair, closedEdgeIds]);
  const completedCount = itinerary.filter((stop) => stop.state === 'completed').length;
  const activeStop = itinerary.find((stop) => ['enroute', 'arrived'].includes(stop.state));
  const openPlaces = useMemo(() => availablePlaceIds.map((id) => placeById.get(id)).filter((place): place is VenuePlace => Boolean(place)), [availablePlaceIds, placeById]);
  const selectedActivity = selectedPlace ? placeOverrides[selectedPlace.id]?.activity ?? null : null;

  useEffect(() => {
    if (!liveReady) return;
    const timer = window.setTimeout(() => {
      if (mapStatus !== 'published') {
        setNavigationActive(false);
        if (!venue.accessibilityVerified) setWheelchair(false);
      }
      setItinerary((current) => {
        const safeStops = current.map((stop) => {
          if (!availablePlaceIds.includes(stop.placeId)) return { ...stop, state: 'cancelled' as const, walkMeters: 0, risk: '地点当前未开放' };
          if (mapStatus !== 'published') return { ...stop, state: stop.state === 'enroute' ? 'planned' as const : stop.state, walkMeters: 0, risk: '地图等待现场复核' };
          const activity = placeOverrides[stop.placeId]?.activity;
          if (activity?.status === 'cancelled') return { ...stop, state: 'cancelled' as const, walkMeters: 0, risk: '活动已取消' };
          if (activity?.status === 'delayed') {
            const updatedTime = activity.start.match(/T(\d{2}:\d{2})/)?.[1];
            return { ...stop, time: stop.fixed && updatedTime ? updatedTime : stop.time, risk: '活动已延迟，请确认最新时间' };
          }
          if (['completed', 'skipped'].includes(stop.state)) return stop;
          return stop;
        });
        return mapStatus === 'published' && currentNodeId ? reflowStops(safeStops, currentNodeId, startTime, leaveBy, wheelchair, closedEdgeIds) : safeStops;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [availablePlaceIds, closedEdgeIds, currentNodeId, leaveBy, liveReady, mapStatus, placeOverrides, startTime, wheelchair]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setFavoritesOnly(false);
    setSearchKind('all');
    setSearchCategory('all');
    setSearchOpen(true);
    trackVisitorEvent('search_submitted', undefined, { query, result_count: searchResults.length });
    if (searchResults.length === 0) trackVisitorEvent('search_no_result', undefined, { query });
  }

  function viewPlace(place: VenuePlace) {
    setSelectedPlace(place);
    if (place.kind !== 'gate') trackVisitorEvent('booth_viewed', place.id);
  }

  function showToast(message: string, type: NonNullable<ToastState>['type'] = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3400);
  }

  function openInterestGuide() {
    setPlanOpen(false);
    setInterestGuideOpen(true);
  }

  function applyInterestGuide(nextInterests: string[], nextDuration: 60 | 90 | 120) {
    setInterests(nextInterests);
    setDuration(nextDuration);
    setLeaveBy(addMinutes(startTime, nextDuration));
    setInterestGuideOpen(false);
    setPlanOpen(true);
    trackVisitorEvent('plan_preferences_configured', undefined, {
      interest_count: nextInterests.length,
      duration_minutes: nextDuration,
    });
    showToast('偏好已填写，请继续确认时间和固定安排');
  }

  function accessibilityAvailable() {
    if (venue.accessibilityVerified) return true;
    setWheelchair(false);
    showToast('无障碍路线信息尚待现场核验', 'warning');
    return false;
  }

  async function shareContent(title: string, text: string) {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.href });
        showToast('已打开分享');
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        showToast('内容已复制');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      showToast('暂时无法分享，请稍后重试', 'warning');
    }
  }

  async function scanQrImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (image: ImageBitmap) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!Detector) {
      showToast('请使用手机相机扫描场馆定位二维码', 'info');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const results = await new Detector({ formats: ['qr_code'] }).detect(bitmap);
      bitmap.close();
      const value = results[0]?.rawValue;
      if (!value) throw new Error('not_found');
      const url = new URL(value, window.location.origin);
      const nodeId = url.searchParams.get('anchor_id');
      const eventId = url.searchParams.get('event_id');
      const resolved = nodeId ? anchorNodes[nodeId] : null;
      if (eventId !== venue.eventId || !resolved) throw new Error('invalid_anchor');
      setCurrentNodeId(resolved);
      setLocationSource('qr');
      setLocationOpen(false);
      trackVisitorEvent('position_confirmed', undefined, { source: 'qr' });
      showToast('当前位置已通过现场二维码确认');
    } catch {
      showToast('未识别到有效的场馆定位二维码', 'warning');
    }
  }

  function clearLocalData() {
    setFavorites([]);
    setItinerary([]);
    setCurrentNodeId(null);
    setLocationSource(null);
    setFixedPlaceId('');
    setInterests([]);
    setDuration(90);
    setLeaveBy(addMinutes(startTime, 90));
    window.localStorage.removeItem('expo-visitor-state');
    window.localStorage.removeItem('expo-reservation-fixed');
    window.localStorage.removeItem('expo-live-cache');
    setPrivacyOpen(false);
    showToast('本机行程、收藏与位置记录已清除', 'info');
  }

  function toggleFavorite(placeId: string) {
    setFavorites((current) => current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId]);
    showToast(favorites.includes(placeId) ? '已取消收藏' : '已加入收藏');
  }

  function addToItinerary(place: VenuePlace) {
    if (itinerary.some((stop) => stop.placeId === place.id && !['skipped', 'cancelled'].includes(stop.state))) {
      showToast('该地点已在行程中', 'info');
      return;
    }
    if (!currentNodeId) {
      setLocationOpen(true);
      showToast('请先确认当前位置', 'warning');
      return;
    }
    if (mapStatus !== 'published' || !availablePlaceIds.includes(place.id)) {
      showToast('该地点或路线尚未完成现场确认，暂不能加入行程', 'warning');
      return;
    }
    const last = itinerary.at(-1);
    const previousPlace = last ? placeById.get(last.placeId) ?? null : null;
    const segment = findRoute(previousPlace?.nodeId ?? currentNodeId, place.nodeId, { wheelchair, closedEdgeIds });
    if (!segment) {
      showToast('当前没有满足条件的可通行路线', 'warning');
      return;
    }
    const time = last ? addMinutes(last.time, last.dwellMinutes + segment.durationMinutes) : addMinutes(startTime, segment.durationMinutes);
    const next = reflowStops([...itinerary, { id: `${place.id}-${Date.now()}`, placeId: place.id, time, dwellMinutes: place.dwellMinutes ?? 15, state: 'planned', walkMeters: segment.distanceMeters }], currentNodeId, startTime, leaveBy, wheelchair, closedEdgeIds);
    if (next.some((stop) => stop.risk)) {
      showToast('加入后可能与固定安排或离场时间冲突', 'warning');
      return;
    }
    setItinerary(next);
    trackVisitorEvent('itinerary_stop_added', place.id);
    showToast(`${place.name}已加入行程`);
  }

  function navigateTo(place: VenuePlace) {
    if (!currentNodeId) {
      setLocationOpen(true);
      showToast('请先扫码或手动确认当前位置', 'warning');
      return;
    }
    if (mapStatus !== 'published') {
      showToast('场馆地图尚未完成现场复核，导航暂未开放', 'warning');
      return;
    }
    if (!availablePlaceIds.includes(place.id)) {
      showToast('该地点尚未确认开放', 'warning');
      return;
    }
    const result = findRoute(currentNodeId, place.nodeId, { wheelchair, closedEdgeIds });
    if (!result) {
      showToast('当前没有满足条件的可通行路线，请联系现场服务人员', 'warning');
      return;
    }
    setTargetPlaceId(place.id);
    setSelectedPlace(null);
    setSearchOpen(false);
    setView('map');
    setNavigationActive(true);
    trackVisitorEvent('route_started', place.id);
    showToast(`路线已更新：前往${place.name}`);
  }

  function createPlan() {
    if (!currentNodeId) {
      setPlanOpen(false);
      setLocationOpen(true);
      showToast('请先确认行程起点', 'warning');
      return;
    }
    if (mapStatus !== 'published') {
      showToast('场馆地图通过现场复核后即可生成可执行行程', 'warning');
      return;
    }
    if (availableMinutes(startTime, leaveBy) <= 20) {
      showToast('离场时间需晚于开始时间，并留出至少 20 分钟', 'warning');
      return;
    }
    const plan = buildPlan(currentNodeId, startTime, leaveBy, interests, wheelchair, closedEdgeIds, availablePlaceIds, fixedPlaceId || undefined, fixedPlaceId ? fixedTime : undefined);
    if (fixedPlaceId && !plan.some((stop) => stop.fixed)) {
      showToast('固定安排无法在当前起点与离场时间内到达，请调整时间', 'warning');
      return;
    }
    setItinerary(plan);
    if (plan.length) {
      trackVisitorEvent('itinerary_created', undefined, { stop_count: plan.length });
      plan.forEach((stop) => trackVisitorEvent('itinerary_stop_added', stop.placeId));
    }
    setPlanOpen(false);
    setView('itinerary');
    showToast(plan.length ? `已安排 ${plan.length} 站，预留 10 分钟离场缓冲` : '现有时间不足，请延长参观时间或减少目标', plan.length ? 'success' : 'warning');
  }

  function updateStop(stopId: string, nextState: StopState) {
    if (nextState === 'enroute' && mapStatus !== 'published') {
      showToast('地图尚未完成现场复核，暂时不能开始导航', 'warning');
      return;
    }
    setItinerary((current) => {
      const updated = current.map((stop) => stop.id === stopId ? { ...stop, state: nextState } : stop);
      return currentNodeId && mapStatus === 'published' ? reflowStops(updated, currentNodeId, startTime, leaveBy, wheelchair, closedEdgeIds) : updated;
    });
    const stop = itinerary.find((item) => item.id === stopId);
    if (!stop) return;
    const place = placeById.get(stop.placeId) ?? null;
    if (nextState === 'enroute' && place) navigateTo(place);
    if (nextState === 'arrived') trackVisitorEvent('stop_arrived', stop.placeId);
    if (nextState === 'skipped') showToast(mapStatus === 'published' ? '已跳过该站，后续到达时间已更新' : '已跳过该站，地图复核后将重新计算时间', 'info');
    if (nextState === 'completed') {
      trackVisitorEvent('stop_completed', stop.placeId);
      showToast('这一站已完成');
    }
  }

  function extendStop(stopId: string) {
    setItinerary((current) => {
      const updated = current.map((item) => item.id === stopId ? { ...item, dwellMinutes: item.dwellMinutes + 5 } : item);
      return currentNodeId && mapStatus === 'published' ? reflowStops(updated, currentNodeId, startTime, leaveBy, wheelchair, closedEdgeIds) : updated;
    });
    showToast(mapStatus === 'published' ? '已延长 5 分钟，后续到达时间已更新' : '已延长 5 分钟，地图复核后将重新计算时间', 'info');
  }

  function chooseLocation(nodeId: string) {
    const location = nodes.find((node) => node.id === nodeId);
    if (!location) return;
    setCurrentNodeId(nodeId);
    setLocationSource('manual');
    setNavigationActive(false);
    setLocationOpen(false);
    trackVisitorEvent('position_confirmed', undefined, { source: 'manual' });
    showToast(`当前位置已设为${location.label}`);
  }

  function validateItinerary() {
    if (mapStatus !== 'published') {
      showToast('地图尚未完成现场复核，当前不展示路线校验结果', 'warning');
      return;
    }
    if (!currentNodeId) {
      setLocationOpen(true);
      showToast('请先确认当前位置', 'warning');
      return;
    }
    const recalculated = reflowStops(itinerary, currentNodeId, startTime, leaveBy, wheelchair, closedEdgeIds);
    const unreachable = recalculated.some((stop) => !['skipped', 'cancelled', 'completed'].includes(stop.state) && stop.walkMeters === 0);
    setItinerary(recalculated);
    const risky = recalculated.some((stop) => Boolean(stop.risk));
    showToast(unreachable || risky ? '行程存在不可达、迟到或离场风险，请调整' : '路线、固定安排与离场时间均已校验', unreachable || risky ? 'warning' : 'success');
  }

  function handleQuickAction(actionId: string) {
    if (actionId === 'plan') return setPlanOpen(true);
    if (actionId === 'route') return setView('map');
    if (actionId === 'accessible') {
      if (!accessibilityAvailable()) return;
      setWheelchair(true);
      setView('map');
      showToast('已切换为无障碍路线', 'info');
      return;
    }
    if (actionId === 'nearby') {
      setFavoritesOnly(false);
      setSearchKind('service');
      setSearchCategory('all');
      setQuery('');
      return setSearchOpen(true);
    }
    if (actionId === 'today') {
      setFavoritesOnly(false);
      setQuery('活动');
      setSearchKind('zone');
      setSearchCategory('all');
      return setSearchOpen(true);
    }
    setSearchKind('zone');
    setSearchCategory('all');
    setFavoritesOnly(false);
    setQuery('');
    setSearchOpen(true);
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = assistantQuestion.trim();
    if (!question || assistantLoading) return;
    setAssistantLoading(true);
    setAssistantAnswer('');
    try {
      const response = await fetch('/api/v1/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const result = await response.json() as { answer?: string; message?: string };
      if (!response.ok || !result.answer) throw new Error(result.message ?? 'unavailable');
      setAssistantAnswer(result.answer);
      trackVisitorEvent('assistant_answered');
    } catch {
      setAssistantAnswer('展会助手暂不可用，请稍后再试；现场信息请以公告和服务台为准。');
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <main className="visitor-stage">
      <div className="stage-brand"><Brand /><p>扫码定位 · 智能规划 · 室内导航</p></div>
      <section className="visitor-app" aria-label="Expo Service AI 观众端">
        <header className="mobile-header">
          <Brand compact />
          <div className="header-actions">
            <button type="button" onClick={() => setMessagesOpen(true)} aria-label="消息"><Bell size={19} />{notices.length > 0 && <span className="notify-dot" />}</button>
          </div>
        </header>

        <div className="visitor-scroll">
          {view === 'home' && (
            <section className="home-screen">
              <div className="home-column home-welcome">
                <section className="visitor-hero">
                  <div className="hero-copy">
                    <p className="hero-kicker">千人黑客松 · 8 月 30 日</p>
                    <h1>上午好，<br />一起高效逛遍主会场</h1>
                    <p>我会根据你的时间和兴趣，沿可通行路线安排每一站。</p>
                  </div>
                  <div className="hero-orbit" aria-hidden="true"><span className="hero-bot"><i /><i /></span></div>
                  <button className="location-pill" type="button" onClick={() => setLocationOpen(true)}>
                    <LocateFixed size={17} /><span><small>{currentLocation ? '你位于' : '当前位置'}</small><strong>{currentLocation ? `${currentLocation.label} · ${locationSource === 'qr' ? '扫码确认' : '手动确认'}` : '尚未确认 · 点击选择'}</strong></span><ChevronRight size={17} />
                  </button>
                </section>

                {mapStatus !== 'published' && <section className="map-review-note"><ShieldCheck size={18} /><span><strong>地图等待现场复核</strong><small>完成朝向、楼层与临时障碍确认后开放导航。</small></span></section>}

                <button className="assistant-entry" type="button" onClick={() => setAssistantOpen(true)}>
                <span><Sparkles size={20} /></span><div><strong>智能展会助手</strong><small>咨询网站功能与展会服务；未复核现场信息会提示你查看公告。</small></div><ChevronRight size={18} />
                </button>
              </div>

              <div className="home-column home-discovery">
              <section className="home-search-card">
                  <h2>你想去哪里？</h2>
                  <form className="main-search" onSubmit={submitSearch}>
                    <Search size={20} aria-hidden="true" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索区域、活动或现场服务" aria-label="搜索区域、活动或现场服务" />
                    <button type="submit" aria-label="开始搜索"><Navigation size={20} /></button>
                  </form>
                  <div className="quick-actions">
                    {quickActions.map(({ id, label, icon: Icon }) => (
                      <button key={id} type="button" onClick={() => handleQuickAction(id)}><span><Icon size={20} /></span>{label}</button>
                    ))}
                </div>
              </section>

              <section className="interest-guide-card">
                <span className="interest-guide-icon"><Sparkles size={22} /></span>
                <div className="interest-guide-copy">
                  <small>兴趣推荐</small>
                  <strong>用 3 步整理参观偏好</strong>
                  <p>先确定关注方向和可用时间，地图发布后再计算真实路线。</p>
                  <div>{interests.length ? interests.slice(0, 4).map((interest) => <span key={interest}>{interest}</span>) : <span>尚未设置</span>}</div>
                </div>
                <button type="button" onClick={openInterestGuide}>开始设置<ChevronRight size={16} /></button>
              </section>

              {notices[0] && <section className="event-alert"><span className="alert-date"><Bell size={20} /></span><div><strong>{notices[0].title}</strong><p>{notices[0].content}</p></div><button type="button" onClick={() => setMessagesOpen(true)} aria-label="查看通知"><ChevronRight size={18} /></button></section>}
              </div>

              <section className="home-section">
                <div className="section-title-row"><div><span>推荐路线</span><h2>{currentLocation ? `从${currentLocation.label}开始` : '确认位置后生成'}</h2></div><button type="button" onClick={() => setView('map')}>查看地图 <ChevronRight size={15} /></button></div>
                <div className="route-card">
                  <VenueMap route={route} routesEnabled={mapStatus === 'published'} selectedPlaceId={targetPlace?.id} className="mini" />
                  <div className="route-card-meta">
                    <div><span className="green-pin"><Navigation size={18} /></span><div><small>{targetPlace ? '已确认开放地点' : '等待运营确认'}</small><strong>{targetPlace?.name ?? '暂无可推荐地点'}</strong><p>{route?.instructions[0] ?? (mapStatus === 'published' ? '确认开放地点后可规划路线' : '完成现场双人复核后开放导航')}</p></div></div>
                    <dl><div><dt>估算距离</dt><dd>{route ? `约 ${Math.round(route.distanceMeters)} 米` : '—'}</dd></div><div><dt>估算步行</dt><dd>{route ? `约 ${route.durationMinutes} 分钟` : '—'}</dd></div></dl>
                    <button type="button" disabled={!targetPlace || mapStatus !== 'published'} onClick={() => targetPlace && navigateTo(targetPlace)}><Navigation size={18} />{mapStatus === 'published' ? '开始导航' : '等待地图复核'}</button>
                  </div>
                </div>
              </section>

              <section className="home-section plan-glance">
                <div className="section-title-row"><div><span>我的安排</span><h2>{itinerary.length ? `${itinerary.length} 站参观计划` : '还没有行程'}</h2></div><button type="button" onClick={() => itinerary.length ? setView('itinerary') : setPlanOpen(true)}>{itinerary.length ? '查看行程' : '立即规划'} <ChevronRight size={15} /></button></div>
                {itinerary.length ? (
                  <div className="glance-stops">{itinerary.slice(0, 3).map((stop) => { const place = placeById.get(stop.placeId); return <div key={stop.id}><time>{mapStatus === 'published' ? stop.time : '待复核'}</time><span /><p><strong>{place?.name}</strong><small>约 {stop.dwellMinutes} 分钟</small></p></div>; })}</div>
                ) : (
                  <button className="empty-plan-card" type="button" onClick={() => setPlanOpen(true)}><Sparkles size={23} /><span><strong>按兴趣和可用时间生成路线</strong><small>只安排已确认开放的地点，并预留离场缓冲</small></span><ChevronRight size={18} /></button>
                )}
              </section>
            </section>
          )}

          {view === 'map' && (
            <section className="map-screen">
              <header className="screen-header"><button type="button" onClick={() => setView('home')} aria-label="返回"><ChevronLeft /></button><div><span>室内导航</span><strong>{navigationActive && mapStatus === 'published' ? `前往${targetPlace?.name}` : '场馆地图'}</strong></div><button type="button" onClick={() => void shareContent('Expo Service AI 路线', mapStatus === 'published' && targetPlace ? `前往${targetPlace.name}` : '场馆地图等待现场复核')} aria-label="分享路线"><Share2 /></button></header>
              {navigationActive && mapStatus === 'published' && route && (
                <div className="next-instruction"><span><Navigation size={21} /></span><div><small>下一步</small><strong>{route.instructions[0]}</strong></div><button type="button" onClick={() => setNavigationActive(false)}>退出</button></div>
              )}
              <div className="full-map-wrap">
                <VenueMap route={route} routesEnabled={mapStatus === 'published'} selectedPlaceId={targetPlace?.id} onSelectPlace={(id) => { const place = placeById.get(id); if (place) viewPlace(place); }} />
                <div className="map-fab-stack">
                  <button type="button" onClick={() => setLocationOpen(true)} aria-label="校准位置"><LocateFixed size={20} /></button>
                  <button className={venue.accessibilityVerified && wheelchair ? 'active' : ''} type="button" aria-disabled={!venue.accessibilityVerified} onClick={() => { if (!accessibilityAvailable()) return; setWheelchair((value) => !value); }} aria-label={venue.accessibilityVerified ? '切换无障碍路线' : '无障碍路线待现场核验'}><Accessibility size={20} /></button>
                  <button type="button" onClick={validateItinerary} aria-label="重新计算"><RefreshCw size={20} /></button>
                </div>
              </div>
              <div className="navigation-sheet">
                <div className="sheet-handle" />
                <div className="destination-row"><div><span className="green-pin"><MapPin size={19} /></span><div><small>目的地</small><strong>{targetPlace?.name ?? '请选择目的地'}</strong><p>{targetPlace?.zone}</p></div></div><button type="button" disabled={!targetPlace} onClick={() => targetPlace && viewPlace(targetPlace)}>详情</button></div>
                {route && <div className="nav-metrics"><div><span>估算步行</span><strong>约 {route.durationMinutes} 分钟</strong></div><div><span>估算距离</span><strong>约 {Math.round(route.distanceMeters)} 米</strong></div><div><span>路线</span><strong>{venue.accessibilityVerified && wheelchair ? '无障碍' : '少走路'}</strong></div></div>}
                <ol className="instruction-list">{route?.instructions.map((instruction, index) => <li key={instruction}><span>{index + 1}</span>{instruction}</li>)}</ol>
                {(!navigationActive || mapStatus !== 'published') && <button className="primary-wide" type="button" disabled={!targetPlace || mapStatus !== 'published'} onClick={() => targetPlace && navigateTo(targetPlace)}><Navigation size={19} />{mapStatus === 'published' ? '开始导航' : '地图待现场复核'}</button>}
              </div>
            </section>
          )}

          {view === 'itinerary' && (
            <section className="itinerary-screen">
              <header className="screen-header plain"><button type="button" onClick={() => setView('home')} aria-label="返回"><ChevronLeft /></button><div><strong>我的行程</strong></div><button type="button" onClick={() => void shareContent('Expo Service AI 行程', itinerary.map((stop) => `${mapStatus === 'published' ? stop.time : '待复核'} ${placeById.get(stop.placeId)?.name ?? ''}`).join('\n'))} aria-label="分享行程"><Share2 /></button></header>
              {itinerary.length ? (
                <>
                  <div className="progress-card">
                    <div className="progress-ring" style={{ '--progress': `${Math.round((completedCount / itinerary.length) * 100)}%` } as React.CSSProperties}><strong>{Math.round((completedCount / itinerary.length) * 100)}%</strong><span>行程进度</span></div>
                    <div className="progress-copy"><span>今日行程</span><h1>{mapStatus !== 'published' ? '地图等待现场复核' : completedCount ? '继续保持，下一站已准备好' : '路线已排好，随时可以出发'}</h1><p>{itinerary.length} 个地点 · {itinerary.reduce((sum, stop) => sum + stop.dwellMinutes, 0)} 分钟停留</p></div>
                  </div>
                  <div className="itinerary-actions"><button type="button" onClick={() => setPlanOpen(true)}><TimerReset size={17} />重新规划</button><button type="button" onClick={validateItinerary}><ShieldCheck size={17} />校验行程</button></div>
                  <ol className="itinerary-list">
                    {itinerary.map((stop, index) => {
                      const place = placeById.get(stop.placeId);
                      return (
                        <li className={`stop-card state-${stop.state}`} key={stop.id}>
                          <time>{mapStatus === 'published' ? stop.time : '待复核'}</time><span className="timeline-node">{stop.state === 'completed' ? <Check size={13} /> : index + 1}</span>
                          <div className="stop-body"><div className="stop-head"><div><small>{place?.code} · {place?.zone}</small><strong>{place?.name}{stop.fixed ? ' · 固定安排' : ''}</strong></div><span className="state-label">{stopLabels[stop.state]}</span></div><p>{place?.summary}</p>{stop.risk && <p className="stop-risk">{stop.risk}</p>}<div className="stop-foot"><span><Clock3 size={14} />停留约 {stop.dwellMinutes} 分钟</span>{mapStatus === 'published' && stop.walkMeters > 0 && <span><Navigation size={14} />约 {Math.round(stop.walkMeters)} 米</span>}</div>
                            {stop.state === 'planned' && <div className="stop-buttons"><button type="button" onClick={() => updateStop(stop.id, 'skipped')}>跳过</button><button type="button" disabled={mapStatus !== 'published'} onClick={() => updateStop(stop.id, 'enroute')}><Navigation size={15} />{mapStatus === 'published' ? '前往' : '等待复核'}</button></div>}
                            {stop.state === 'enroute' && <div className="stop-buttons"><button type="button" onClick={() => updateStop(stop.id, 'skipped')}>跳过</button><button type="button" onClick={() => updateStop(stop.id, 'arrived')}><MapPin size={15} />我已到达</button></div>}
                            {stop.state === 'arrived' && <div className="stop-buttons"><button type="button" onClick={() => extendStop(stop.id)}>延长 5 分钟</button><button type="button" onClick={() => updateStop(stop.id, 'completed')}><CheckCircle2 size={15} />完成</button></div>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {activeStop && mapStatus === 'published' && <button className="sticky-navigation" type="button" onClick={() => setView('map')}><Navigation size={20} />继续导航</button>}
                </>
              ) : (
                <div className="large-empty"><span><CalendarDays size={31} /></span><h1>还没有行程</h1><p>告诉我你的可用时间和兴趣，我会安排可执行的参观顺序。</p><button type="button" onClick={() => setPlanOpen(true)}>开始规划</button></div>
              )}
            </section>
          )}

          {view === 'profile' && (
            <section className="profile-screen">
              <header className="profile-hero"><Brand compact /><div className="anonymous-avatar"><CircleUserRound size={35} /></div><h1>匿名访客</h1><p>无需注册也可以使用地图与行程</p><span><ShieldCheck size={14} />行程、收藏与位置保存在本机</span></header>
              <div className="profile-stats"><button type="button" onClick={() => { setSearchKind('all'); setSearchCategory('all'); setQuery(''); setFavoritesOnly(true); setSearchOpen(true); }}><strong>{favorites.length}</strong><span>我的收藏</span></button><button type="button" onClick={() => setView('itinerary')}><strong>{itinerary.length}</strong><span>行程地点</span></button></div>
              <section className="setting-card"><h2>出行偏好</h2><label><span><Accessibility size={20} /><span><strong>无障碍路线</strong><small>现场核验完成后开放</small></span></span><input type="checkbox" disabled={!venue.accessibilityVerified} checked={venue.accessibilityVerified && wheelchair} onChange={(event) => setWheelchair(event.target.checked)} /></label></section>
              <section className="setting-card links"><h2>服务与设置</h2><Link href="/reservations"><span><CalendarDays size={20} />我的预约</span><ChevronRight size={18} /></Link><button type="button" onClick={() => setLocationOpen(true)}><span><LocateFixed size={20} />当前位置与校准</span><ChevronRight size={18} /></button><button type="button" onClick={() => setMessagesOpen(true)}><span><Bell size={20} />消息中心</span><ChevronRight size={18} /></button><button type="button" onClick={() => setPrivacyOpen(true)}><span><Settings2 size={20} />隐私与本机数据</span><ChevronRight size={18} /></button></section>
              <button className="delete-session" type="button" onClick={clearLocalData}>清除本机记录</button>
              <footer className="visitor-footer"><Link href="/exhibitor">参展商入口</Link><span>·</span><Link href="/operations">场馆运营入口</Link></footer>
            </section>
          )}
        </div>

        <nav className="mobile-bottom-nav" aria-label="主要导航">
          {navItems.map(({ id, label, icon: Icon }) => <button className={view === id ? 'active' : ''} key={id} type="button" onClick={() => setView(id)}><Icon size={22} /><span>{label}</span>{id === 'itinerary' && itinerary.length > 0 && <b>{itinerary.length}</b>}</button>)}
        </nav>
      </section>

      <Modal open={searchOpen} title={favoritesOnly ? '我的收藏' : '搜索展位与服务'} onClose={() => setSearchOpen(false)} wide>
        <div className="modal-search"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入名称、编号或关键词" aria-label="输入名称、编号或关键词" />{query && <button type="button" onClick={() => setQuery('')} aria-label="清空"><X size={17} /></button>}</div>
        <div className="filter-tabs">{([['all', '全部'], ['zone', '展位与活动'], ['service', '现场服务']] as const).map(([id, label]) => <button className={searchKind === id ? 'active' : ''} key={id} type="button" onClick={() => { setFavoritesOnly(false); setSearchKind(id); setSearchCategory('all'); }}>{label}</button>)}</div>
        {searchKind !== 'gate' && <div className="category-tabs" aria-label="按类别筛选">{searchCategories.map((category) => <button className={searchCategory === category ? 'active' : ''} key={category} type="button" onClick={() => { setFavoritesOnly(false); setSearchCategory(category); }}>{category === 'all' ? '全部类别' : category}</button>)}</div>}
        <div className="search-results">
          {searchResults.length ? searchResults.map((place) => {
            const result = currentNodeId && mapStatus === 'published' ? findRoute(currentNodeId, place.nodeId, { wheelchair, closedEdgeIds }) : null;
            return <article className="search-result-card" key={place.id}><button className="result-main" type="button" onClick={() => viewPlace(place)}><span className={`place-icon kind-${place.kind}`}>{place.kind === 'service' ? <Info size={20} /> : <MapPin size={20} />}</span><div><div className="result-title"><strong>{place.name}</strong><span>{place.code}</span></div><p>{place.summary}</p><small>{place.zone} · {place.kind === 'gate' ? '定位通口' : '已确认开放'}{result ? ` · ${Math.round(result.distanceMeters)} 米` : ''}</small></div></button><div className="result-actions">{place.kind === 'gate' ? <button type="button" onClick={() => { chooseLocation(place.nodeId); setSearchOpen(false); }}><LocateFixed size={16} />设为当前位置</button> : <><button type="button" onClick={() => toggleFavorite(place.id)} aria-label={favorites.includes(place.id) ? '取消收藏' : '收藏'}><Heart size={18} fill={favorites.includes(place.id) ? 'currentColor' : 'none'} /></button><button type="button" onClick={() => addToItinerary(place)}>加入行程</button><button type="button" onClick={() => navigateTo(place)}><Navigation size={16} />导航</button></>}</div></article>;
          }) : <div className="search-empty"><Search size={30} /><h3>没有找到匹配内容</h3><p>试试展位名称、服务类型或现场标识编号。</p><button type="button" onClick={() => { setFavoritesOnly(false); setSearchCategory('all'); setSearchKind('service'); setQuery(''); }}>查看现场服务</button></div>}
        </div>
      </Modal>

      <Modal open={Boolean(selectedPlace)} title={selectedPlace?.name ?? '地点详情'} onClose={() => setSelectedPlace(null)}>
        {selectedPlace && <div className="place-detail"><div className={`detail-cover kind-${selectedPlace.kind}`}><MapPin size={34} /><span>{selectedPlace.code}</span></div><div className="detail-title"><div><span>{selectedPlace.category}</span><h3>{selectedPlace.name}</h3><p>{selectedPlace.zone} · {selectedPlace.kind === 'gate' ? '定位通口' : availablePlaceIds.includes(selectedPlace.id) ? selectedPlace.statusLabel : '待现场确认'}</p></div>{selectedPlace.kind !== 'gate' && <button type="button" onClick={() => toggleFavorite(selectedPlace.id)} aria-label="收藏"><Heart size={21} fill={favorites.includes(selectedPlace.id) ? 'currentColor' : 'none'} /></button>}</div><p className="detail-intro">{selectedPlace.summary}</p><div className="tag-row">{selectedPlace.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><dl className="detail-grid"><div><dt>位置</dt><dd>{selectedPlace.zone}</dd></div><div><dt>规划停留</dt><dd>{selectedPlace.dwellMinutes ? `约 ${selectedPlace.dwellMinutes} 分钟` : '按需'}</dd></div><div><dt>无障碍</dt><dd>待现场核验</dd></div><div><dt>开放状态</dt><dd>{selectedPlace.kind === 'gate' ? '可用于定位' : availablePlaceIds.includes(selectedPlace.id) ? selectedPlace.statusLabel : '待现场确认'}</dd></div></dl>{selectedActivity && <div className="schedule-note"><CalendarDays size={18} /><span><small>{selectedActivity.status === 'confirmed' ? '已确认活动' : selectedActivity.status === 'delayed' ? '活动延迟' : '活动取消'}</small><strong>{selectedActivity.title} · {new Date(selectedActivity.start).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} · {selectedActivity.duration} 分钟</strong></span></div>}{selectedActivity && placeOverrides[selectedPlace.id]?.reservations_enabled && selectedActivity.status !== 'cancelled' && <Link className="reservation-cta" href={`/reservations?place_id=${encodeURIComponent(selectedPlace.id)}`}><CalendarDays size={17} />预约本场活动</Link>}<div className="detail-actions">{selectedPlace.kind === 'gate' ? <button type="button" onClick={() => { chooseLocation(selectedPlace.nodeId); setSelectedPlace(null); }}>设为当前位置</button> : <><button type="button" disabled={!availablePlaceIds.includes(selectedPlace.id)} onClick={() => addToItinerary(selectedPlace)}>加入行程</button><button type="button" disabled={!availablePlaceIds.includes(selectedPlace.id) || mapStatus !== 'published'} onClick={() => navigateTo(selectedPlace)}><Navigation size={18} />导航前往</button></>}</div></div>}
      </Modal>

      <Modal open={interestGuideOpen} title="设置参观偏好" onClose={() => setInterestGuideOpen(false)}>
        <InterestGuide onComplete={applyInterestGuide} />
      </Modal>

      <Modal open={planOpen} title="规划参观行程" onClose={() => setPlanOpen(false)}>
        <div className="plan-form"><button className="guided-choice-button" type="button" onClick={openInterestGuide}><span><Sparkles size={19} /><span><strong>三步设置参观偏好</strong><small>快速选择方向与可用时间</small></span></span><ChevronRight size={18} /></button><div className="form-row"><label><span>开始时间</span><input type="time" value={startTime} onChange={(event) => { setStartTime(event.target.value); setLeaveBy(addMinutes(event.target.value, duration)); }} /></label><label><span>必须离场</span><input type="time" value={leaveBy} onChange={(event) => { setLeaveBy(event.target.value); setDuration(Math.max(0, availableMinutes(startTime, event.target.value))); }} /></label></div><fieldset><legend>可用时间</legend><div className="choice-row">{[60, 90, 120].map((value) => <button className={duration === value ? 'active' : ''} type="button" key={value} onClick={() => { setDuration(value); setLeaveBy(addMinutes(startTime, value)); }}>{value} 分钟</button>)}</div></fieldset><label><span>固定安排（可选）</span><select value={fixedPlaceId} onChange={(event) => setFixedPlaceId(event.target.value)}><option value="">不添加固定安排</option>{openPlaces.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>{fixedPlaceId && <label><span>固定开始时间</span><input type="time" value={fixedTime} onChange={(event) => setFixedTime(event.target.value)} /></label>}<fieldset><legend>感兴趣的方向</legend><div className="interest-grid">{interestValues.map((item) => <label key={item}><input type="checkbox" checked={interests.includes(item)} onChange={() => setInterests((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} /><span>{item}</span></label>)}</div></fieldset><div className="plan-toggles"><label><span><Accessibility size={18} />无障碍路线待核验</span><input type="checkbox" disabled={!venue.accessibilityVerified} checked={venue.accessibilityVerified && wheelchair} onChange={(event) => setWheelchair(event.target.checked)} /></label></div><div className="buffer-note"><ShieldCheck size={18} /><span>{mapStatus === 'published' ? '仅使用已发布通行边与已确认开放地点，并预留 10 分钟离场缓冲。' : '地图完成现场双人复核并发布后，才能生成可执行行程。'}</span></div><button className="primary-wide" type="button" disabled={mapStatus !== 'published' || openPlaces.length === 0} onClick={createPlan}><Sparkles size={19} />生成行程</button></div>
      </Modal>

      <Modal open={locationOpen} title="确认当前位置" onClose={() => setLocationOpen(false)}>
        <div className="location-options"><div className="current-anchor"><LocateFixed size={24} /><span><small>当前位置</small><strong>{currentLocation?.label ?? '尚未确认'}</strong><p>{locationSource === 'qr' ? '已通过现场定位标识确认' : currentLocation ? '已在本机确认' : '请选择入口或重新扫码'}</p></span>{currentLocation ? <CheckCircle2 size={20} /> : <CircleUserRound size={20} />}</div><button type="button" onClick={() => chooseLocation('gate-south')}><MapPin size={19} /><span><strong>图下入口</strong><small>主会场图下侧外部通口</small></span>{currentNodeId === 'gate-south' && <Check size={17} />}</button><button type="button" onClick={() => chooseLocation('gate-upper')}><MapPin size={19} /><span><strong>图上入口</strong><small>主会场图上侧外部通口</small></span>{currentNodeId === 'gate-upper' && <Check size={17} />}</button><button type="button" onClick={() => qrInputRef.current?.click()}><LocateFixed size={19} /><span><strong>扫描定位二维码</strong><small>拍摄或选择场馆定位二维码</small></span><ChevronRight size={17} /></button><button type="button" onClick={() => { setFavoritesOnly(false); setSearchKind('gate'); setSearchCategory('all'); setQuery(''); setLocationOpen(false); setSearchOpen(true); }}><Compass size={19} /><span><strong>查看全部通口</strong><small>从已配置入口与出口中选择</small></span><ChevronRight size={17} /></button><input ref={qrInputRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => void scanQrImage(event)} /></div>
      </Modal>

      <Modal open={messagesOpen} title="消息中心" onClose={() => setMessagesOpen(false)}>
        <div className="message-center">{notices.length ? notices.map((notice) => <article key={notice.id}><small>{notice.createdAt} · {notice.audience}</small><strong>{notice.title}</strong><p>{notice.content}</p></article>) : <div className="search-empty"><Bell size={30} /><h3>暂无消息</h3><p>通道变化、活动调整与闭馆提醒会显示在这里。</p></div>}</div>
      </Modal>

      <Modal open={assistantOpen} title="智能展会助手" onClose={() => setAssistantOpen(false)}>
        <div className="assistant-panel">
          <p className="assistant-disclaimer"><ShieldCheck size={16} />仅发送你的问题，不会读取位置或行程。路线、距离与现场状态须以已发布公告为准。</p>
          {assistantAnswer && <article className="assistant-answer" aria-live="polite"><Sparkles size={17} /><p>{assistantAnswer}</p></article>}
          <form className="assistant-form" onSubmit={askAssistant}>
            <label><span>想咨询什么？</span><textarea value={assistantQuestion} maxLength={500} rows={4} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="例如：如何使用搜索、预约或消息中心？" /></label>
            <button className="primary-wide" type="submit" disabled={!assistantQuestion.trim() || assistantLoading}>{assistantLoading ? '正在回答…' : '发送问题'}</button>
          </form>
        </div>
      </Modal>

      <Modal open={privacyOpen} title="隐私与本机数据" onClose={() => setPrivacyOpen(false)}>
        <div className="privacy-panel"><ShieldCheck size={28} /><h3>匿名使用，无需提供身份信息</h3><p>收藏、行程、偏好与手动确认的位置保存在当前设备；现场通知会短期缓存。为改善现场服务，操作次数按短期匿名会话汇总；系统会在后续产生新操作时清理已超过 48 小时的原始记录，因此实际清理时间可能晚于 48 小时。小样本不会显示具体数值，预约时会另行说明授权范围。</p><button className="primary-wide" type="button" onClick={clearLocalData}>清除本机数据</button></div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}
