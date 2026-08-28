import { ENTRANCES, type ExpoDataset, type Exhibitor, type Point, type Poi, type VenueEvent } from './data';

export type PlannerInput = {
  query: string;
  startTime: string;
  endTime: string;
  entranceId: string;
  lessWalking: boolean;
  mealNeeded: boolean;
  mealBudget: number;
  dietary: string;
};

export type MatchResult = {
  exhibitor: Exhibitor;
  score: number;
  reasons: string[];
  matchedKeywords: string[];
  distance: number;
};

export type PlanStop = {
  uid: string;
  sourceId: string;
  type: 'exhibitor' | 'event' | 'food';
  booth: string;
  title: string;
  subtitle: string;
  start: string;
  end: string;
  position: Point;
  score: number;
  reasons: string[];
  status: 'pending' | 'arrived' | 'completed' | 'skipped';
};

export type GeneratedPlan = {
  id: string;
  createdAt: string;
  input: PlannerInput;
  keywords: string[];
  matches: MatchResult[];
  stops: PlanStop[];
  walkingMeters: number;
  estimatedMinutes: number;
  warnings: string[];
};

const SYNONYMS: Record<string, string[]> = {
  '环保':['环保','绿色','可持续','低碳','可降解','循环'],
  '包装':['包装','包材','盒子','瓶子','材料'],
  '美妆':['美妆','护肤','化妆品','日化'],
  '投资':['投资','融资','基金','资本','投资人'],
  'AI':['AI','人工智能','大模型','智能'],
  '营销':['营销','增长','内容','私域','品牌'],
  '供应链':['供应链','仓储','物流','采购'],
  '出海':['出海','跨境','海外','国际'],
  '设计':['设计','视觉','创意','工业设计'],
  '渠道':['渠道','零售','选品','经销'],
  '调研':['调研','洞察','消费者','用户研究'],
};

export function toMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function toTime(value: number) {
  const normalized = Math.max(0, Math.min(value, 23 * 60 + 59));
  return `${String(Math.floor(normalized / 60)).padStart(2,'0')}:${String(normalized % 60).padStart(2,'0')}`;
}

export function distance(a: Point, b: Point) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 8.5);
}

export function extractKeywords(query: string) {
  const normalized = query.trim().toLowerCase();
  const found = Object.entries(SYNONYMS)
    .filter(([, words]) => words.some((word) => normalized.includes(word.toLowerCase())))
    .map(([canonical]) => canonical);
  return [...new Set(found)];
}

function keywordHit(query: string, keywords: string[]) {
  const normalized = query.toLowerCase();
  return keywords.filter((keyword) => {
    const words = SYNONYMS[keyword] ?? [keyword];
    return words.some((word) => normalized.includes(word.toLowerCase()));
  });
}

export function rankExhibitors(dataset: ExpoDataset, input: PlannerInput): MatchResult[] {
  const intentKeywords = extractKeywords(input.query);
  const entrance = ENTRANCES.find((item) => item.id === input.entranceId) ?? ENTRANCES[0];
  return dataset.exhibitors.map((exhibitor) => {
    const allText = `${exhibitor.name} ${exhibitor.category} ${exhibitor.offers.join(' ')} ${exhibitor.wants.join(' ')} ${exhibitor.keywords.join(' ')} ${exhibitor.intro}`;
    const direct = keywordHit(input.query, exhibitor.keywords);
    const canonical = intentKeywords.filter((keyword) => keywordHit(allText, [keyword]).length > 0);
    const matched = [...new Set([...direct, ...canonical])];
    const queryTerms = input.query.split(/[，。！？、,\s]+/).filter((term) => term.length >= 2);
    const literalHits = queryTerms.filter((term) => allText.toLowerCase().includes(term.toLowerCase()));
    const dist = distance(entrance.position, exhibitor.position);
    let score = 30 + matched.length * 13 + Math.min(literalHits.length * 7, 21);
    if (/供应商|采购|找.*企业/.test(input.query) && exhibitor.category !== '投资机构') score += 8;
    if (/投资|融资/.test(input.query) && exhibitor.category === '投资机构') score += 24;
    if (/设计/.test(input.query) && exhibitor.category === '设计服务') score += 15;
    if (input.lessWalking) score -= Math.min(16, Math.round(dist / 70));
    score = Math.max(18, Math.min(98, score));
    const reasons = matched.slice(0,3).map((keyword) => `与你的“${keyword}”目标匹配`);
    if (exhibitor.wants.some((want) => /品牌|采购|创始人/.test(want))) reasons.push(`对方希望对接：${exhibitor.wants.slice(0,2).join('、')}`);
    reasons.push(`${exhibitor.availability[0]}–${exhibitor.availability[1]} 可接待`);
    return { exhibitor, score, reasons: reasons.slice(0,3), matchedKeywords: matched, distance: dist };
  }).sort((a,b) => b.score - a.score || a.distance - b.distance);
}

function chooseEvent(events: VenueEvent[], keywords: string[], input: PlannerInput) {
  if (!/论坛|活动|分享|听|学习/.test(input.query)) return undefined;
  return events
    .map((event) => ({ event, hits: event.keywords.filter((keyword) => keywords.includes(keyword)).length }))
    .filter(({ event }) => toMinutes(event.start) >= toMinutes(input.startTime) && toMinutes(event.end) <= toMinutes(input.endTime))
    .sort((a,b) => b.hits - a.hits)[0]?.event;
}

function chooseMeal(pois: Poi[], input: PlannerInput) {
  if (!input.mealNeeded) return undefined;
  const dietary = input.dietary.trim();
  return pois.filter((poi) => poi.type === 'food' && (poi.price ?? 0) <= input.mealBudget)
    .map((poi) => ({ poi, dietaryHit: dietary && poi.tags.some((tag) => tag.includes(dietary)) ? 1 : 0 }))
    .sort((a,b) => b.dietaryHit - a.dietaryHit || (a.poi.price ?? 999) - (b.poi.price ?? 999))[0]?.poi;
}

export function generatePlan(dataset: ExpoDataset, input: PlannerInput): GeneratedPlan {
  const matches = rankExhibitors(dataset, input);
  const keywords = extractKeywords(input.query);
  const entrance = ENTRANCES.find((item) => item.id === input.entranceId) ?? ENTRANCES[0];
  const start = toMinutes(input.startTime);
  const end = toMinutes(input.endTime);
  const available = Math.max(0, end - start);
  const targetCount = available >= 210 ? 4 : available >= 130 ? 3 : 2;
  const candidates = matches.slice(0, Math.max(6,targetCount + 2));
  const ordered: MatchResult[] = [];
  const covered = new Set<string>();
  let cursor = entrance.position;
  const pool = [...candidates];
  while (ordered.length < targetCount && pool.length) {
    const value = (item: MatchResult) => {
      const newIntentHits = item.matchedKeywords.filter((keyword) => keywords.includes(keyword) && !covered.has(keyword)).length;
      const routePenalty = distance(cursor,item.exhibitor.position) / (input.lessWalking ? 75 : 150);
      return item.score + newIntentHits * 18 - routePenalty;
    };
    pool.sort((a,b) => value(b) - value(a));
    const next = pool.shift();
    if (!next) break;
    ordered.push(next);
    next.matchedKeywords.forEach((keyword) => covered.add(keyword));
    cursor = next.exhibitor.position;
  }
  if (input.lessWalking && ordered.length > 1) {
    const selected = ordered.splice(0);
    cursor = entrance.position;
    while (selected.length) {
      selected.sort((a,b) => distance(cursor,a.exhibitor.position) - distance(cursor,b.exhibitor.position));
      const nearest = selected.shift();
      if (!nearest) break;
      ordered.push(nearest);
      cursor = nearest.exhibitor.position;
    }
  }

  const fixedEvent = chooseEvent(dataset.events, keywords, input);
  const meal = chooseMeal(dataset.pois, input);
  const stops: PlanStop[] = [];
  let currentTime = start;
  let currentPoint = entrance.position;
  let walkingMeters = 0;

  const addExhibitor = (match: MatchResult) => {
    const walk = distance(currentPoint, match.exhibitor.position);
    const walkMinutes = Math.max(2, Math.ceil(walk / 65));
    currentTime += walkMinutes;
    const availableFrom = toMinutes(match.exhibitor.availability[0]);
    if (currentTime < availableFrom) currentTime = availableFrom;
    if (currentTime + 25 > Math.min(end,toMinutes(match.exhibitor.availability[1]))) return false;
    stops.push({ uid:`${match.exhibitor.id}-${Date.now()}-${stops.length}`, sourceId:match.exhibitor.id, type:'exhibitor', booth:match.exhibitor.booth, title:match.exhibitor.name, subtitle:`${match.exhibitor.contact} · ${match.exhibitor.role}`, start:toTime(currentTime), end:toTime(currentTime + 25), position:match.exhibitor.position, score:match.score, reasons:match.reasons, status:'pending' });
    currentTime += 25;
    currentPoint = match.exhibitor.position;
    walkingMeters += walk;
    return true;
  };

  const beforeEvent = fixedEvent ? ordered.filter((match) => toMinutes(fixedEvent.start) - currentTime >= 35).slice(0,2) : ordered;
  beforeEvent.forEach(addExhibitor);

  if (fixedEvent && toMinutes(fixedEvent.start) >= currentTime) {
    const walk = distance(currentPoint,fixedEvent.position);
    const arrive = currentTime + Math.ceil(walk / 65);
    if (arrive <= toMinutes(fixedEvent.start)) {
      stops.push({ uid:`${fixedEvent.id}-${Date.now()}`, sourceId:fixedEvent.id, type:'event', booth:fixedEvent.location, title:fixedEvent.title, subtitle:'固定时间活动', start:fixedEvent.start, end:fixedEvent.end, position:fixedEvent.position, score:80, reasons:['与你的学习目标相关','固定时间活动'], status:'pending' });
      currentTime = toMinutes(fixedEvent.end);
      currentPoint = fixedEvent.position;
      walkingMeters += walk;
    }
  }

  ordered.filter((item) => !stops.some((stop) => stop.sourceId === item.exhibitor.id)).forEach((item) => {
    if (stops.filter((stop) => stop.type === 'exhibitor').length < targetCount) addExhibitor(item);
  });

  if (meal && currentTime + 35 <= end) {
    const walk = distance(currentPoint,meal.position);
    currentTime += Math.ceil(walk / 65);
    stops.push({ uid:`${meal.id}-${Date.now()}`, sourceId:meal.id, type:'food', booth:meal.location, title:meal.name, subtitle:`人均约 ¥${meal.price} · ${meal.tags.join(' / ')}`, start:toTime(currentTime), end:toTime(currentTime + 35), position:meal.position, score:70, reasons:['符合预算和用餐时间','已纳入最短路线'], status:'pending' });
    currentTime += 35;
    walkingMeters += walk;
  }

  const warnings: string[] = [];
  if (!stops.length) warnings.push('当前时间范围内没有可执行的访问目标，请延长时间或更换入口。');
  if (keywords.length === 0) warnings.push('需求较宽泛，当前结果主要依据身份、距离和可接待时间排序。');
  if (meal && !stops.some((stop) => stop.type === 'food')) warnings.push('时间不足，未能把用餐安排加入行程。');

  return { id:`plan-${Date.now()}`, createdAt:new Date().toISOString(), input, keywords, matches, stops, walkingMeters, estimatedMinutes:Math.max(0,currentTime - start), warnings };
}
