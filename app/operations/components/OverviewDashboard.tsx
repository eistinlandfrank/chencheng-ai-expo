'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Cpu,
  MapPin,
  Navigation,
  Search,
  Star,
  Users,
  Waypoints,
} from 'lucide-react';
import DataDrivenHeatmap from '@/components/DataDrivenHeatmap';
import {
  computeHeatScore,
  infrastructure,
  popularRoutes,
  searchKeywords,
  showcaseAlerts,
  showcaseBooths,
  type ShowcaseBooth,
} from '@/lib/venue-showcase-data';
import type { ClosedGroup, OpsNotice, OpsTicket } from '@/lib/state-types';

function walkHeat(booths: ShowcaseBooth[]): ShowcaseBooth[] {
  const next = booths.map((booth) => {
    if (booth.companyName === '待布展') return booth;
    return {
      ...booth,
      currentDensity: Math.min(0.98, Math.max(0.12, booth.currentDensity + (Math.random() - 0.5) * 0.06)),
      visitorCount: booth.visitorCount + (Math.random() > 0.45 ? 1 : 0),
      businessLeads: booth.businessLeads + (Math.random() > 0.92 ? 1 : 0),
    };
  });
  const maxVisitors = Math.max(...next.map((booth) => booth.visitorCount), 1);
  const maxLeads = Math.max(...next.map((booth) => booth.businessLeads), 1);
  return next.map((booth) => ({
    ...booth,
    heatScore: Number(computeHeatScore(booth, maxVisitors, maxLeads).toFixed(4)),
  }));
}

type OverviewDashboardProps = {
  closedGroups: ClosedGroup[];
  notices: OpsNotice[];
  tickets: OpsTicket[];
  onTab: (tab: 'map' | 'notices' | 'tickets' | 'analytics') => void;
  onSelectBooth?: (booth: ShowcaseBooth) => void;
};

const kpiIcons = {
  users: Users,
  nav: Navigation,
  star: Star,
  search: Search,
} as const;

export default function OverviewDashboard({ closedGroups, notices, tickets, onTab, onSelectBooth }: OverviewDashboardProps) {
  const [booths, setBooths] = useState(showcaseBooths);
  const [visitors, setVisitors] = useState(8642);
  const [routes, setRoutes] = useState(2318);
  const [matches, setMatches] = useState(324);
  const [keywords, setKeywords] = useState(searchKeywords);
  const [routeRanks, setRouteRanks] = useState(popularRoutes);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBooths((current) => walkHeat(current));
      setVisitors((value) => value + 1 + Math.floor(Math.random() * 4));
      setRoutes((value) => value + (Math.random() > 0.35 ? 1 : 0));
      setMatches((value) => value + (Math.random() > 0.72 ? 1 : 0));
      setKeywords((current) => current.map((item) => ({
        ...item,
        count: item.count + (Math.random() > 0.55 ? Math.floor(Math.random() * 3) : 0),
      })));
      setRouteRanks((current) => current.map((item) => ({
        ...item,
        uses: item.uses + (Math.random() > 0.6 ? 1 : 0),
      })));
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  const hottest = booths.reduce((best, booth) => (booth.heatScore > best.heatScore ? booth : best), booths[0]);
  const keywordMax = Math.max(...keywords.map((item) => item.count), 1);
  const liveKpis = [
    { id: 'visitors', label: '今日访客', value: visitors.toLocaleString('zh-CN'), delta: 12.5, up: true, note: '实时累加', icon: 'users' as const },
    { id: 'routes', label: '路线生成次数', value: routes.toLocaleString('zh-CN'), delta: 18.7, up: true, note: '实时累加', icon: 'nav' as const },
    { id: 'hot', label: '热门展位', value: hottest?.id ?? 'T-E05', delta: null, up: true, note: hottest ? `${hottest.companyName} · 当前最热` : '当前最受欢迎展位', icon: 'star' as const },
    { id: 'matches', label: '供需撮合', value: String(matches), delta: 8.3, up: true, note: '实时累加', icon: 'search' as const },
  ];
  const liveAlerts = [
    ...showcaseAlerts,
    ...closedGroups.map((group) => ({
      id: `closed-${group}`,
      level: 'warning' as const,
      title: '通道临时关闭',
      detail: group === 'north-main' ? '上侧主疏散通道已关闭，路线已改绕' : '下侧主疏散通道已关闭，路线已改绕',
      time: '现场',
    })),
  ].slice(0, 3);
  const openTickets = tickets.filter((ticket) => ticket.status !== '已完成').length;

  return (
    <section className="overview-dash">
      <div className="kpi-row">
        {liveKpis.map((kpi) => {
          const Icon = kpiIcons[kpi.icon];
          return (
            <article className={`kpi-card kpi-${kpi.id}`} key={kpi.id}>
              <div>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                {kpi.delta === null ? (
                  <small>{kpi.note}</small>
                ) : (
                  <small className={kpi.up ? 'up' : 'down'}>
                    {kpi.note} · 较昨日 {kpi.up ? '↑' : '↓'} {kpi.delta}%
                  </small>
                )}
              </div>
              <span className="kpi-icon"><Icon size={20} /></span>
            </article>
          );
        })}
      </div>

      <div className="overview-main">
        <DataDrivenHeatmap booths={booths} onSelect={onSelectBooth} />
        <aside className="overview-side">
          <section className="rank-card">
            <header>
              <div>
                <h2>热门搜索关键词</h2>
                <p>商机雷达 · 人找商机</p>
              </div>
              <span>TOP10</span>
            </header>
            <ol>
              {keywords.map((item) => (
                <li key={item.keyword}>
                  <b className={item.rank <= 3 ? 'hot' : ''}>{item.rank}</b>
                  <span>{item.keyword}</span>
                  <span className="bar"><i style={{ width: `${Math.max(12, (item.count / keywordMax) * 100)}%` }} /></span>
                  <em>{item.count.toLocaleString('zh-CN')}</em>
                </li>
              ))}
            </ol>
          </section>
          <section className="rank-card routes">
            <header>
              <div>
                <h2>热门商机动线</h2>
                <p>从入口到高价值展位</p>
              </div>
              <span>TOP5</span>
            </header>
            <ol>
              {routeRanks.map((item) => (
                <li key={item.rank}>
                  <b className={item.rank === 1 ? 'hot' : ''}>{item.rank}</b>
                  <span>{item.label}</span>
                  <em>使用 {item.uses}</em>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <div className="overview-bottom">
        <section className="alert-strip">
          <header>
            <h2>实时通知与预警</h2>
            <button type="button" onClick={() => onTab('notices')}>查看全部 <ChevronRight size={14} /></button>
          </header>
          <div className="alert-grid">
            {liveAlerts.map((alert) => (
              <article className={`alert-card ${alert.level}`} key={alert.id}>
                <span>{alert.level === 'danger' ? '!' : alert.level === 'warning' ? '△' : 'i'}</span>
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                  <small>{alert.time}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="sys-strip">
          <header>
            <h2>系统状态</h2>
            <small>全部正常</small>
          </header>
          <div className="sys-grid">
            {infrastructure.map((item) => (
              <div key={item.id}>
                <i />
                <strong>{item.label}</strong>
                <span>{item.status}</span>
              </div>
            ))}
          </div>
          <footer>
            <span><Cpu size={13} /> AI 基础设施健康</span>
            <button type="button" onClick={() => onTab('map')}>
              <Waypoints size={13} /> 场馆地图
            </button>
            <button type="button" onClick={() => onTab('tickets')}>
              <Bell size={13} /> 工单 {openTickets}
            </button>
            {notices[0] && (
              <button type="button" onClick={() => onTab('notices')}>
                <MapPin size={13} /> {notices[0].title}
              </button>
            )}
          </footer>
        </section>
      </div>
    </section>
  );
}
