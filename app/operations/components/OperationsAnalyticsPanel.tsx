'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  CircleAlert,
  ClipboardCheck,
  Coins,
  Flame,
  MapPin,
  Search,
  TrendingUp,
  Users,
  Waypoints,
} from 'lucide-react';
import {
  boothCommercials,
  commercialSummary,
  demoAnalytics,
  pricingModel,
  trafficTierLabels,
  zoneCommercials,
  type TrafficTier,
} from '@/lib/venue-showcase-data';

type AnalyticsMetric = { value: number | null; suppressed: boolean };
type OperationsAnalytics = {
  range: { label: string; since: string; until: string };
  metrics: Record<'active_sessions' | 'searches' | 'no_result_searches' | 'booth_views' | 'routes_started' | 'arrivals' | 'reservations', AnalyticsMetric>;
  keywords: Array<{ keyword: string; total: number }>;
};

const yuan = (value: number) => `¥${value.toLocaleString('zh-CN')}`;
const maxZoneRevenue = Math.max(...zoneCommercials.map((zone) => zone.revenue), 1);
const maxBoothVisitors = Math.max(...boothCommercials.map((item) => item.visitorCount), 1);

export default function OperationsAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<OperationsAnalytics>(demoAnalytics);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/ops/analytics', { cache: 'no-store' });
      const payload = await response.json() as { analytics?: OperationsAnalytics; message?: string };
      if (!response.ok || !payload.analytics) throw new Error(payload.message ?? '分析数据加载失败');
      setAnalytics(payload.analytics);
    } catch {
      setAnalytics(demoAnalytics);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const cards = [
    ['active_sessions', '活跃会话', '去重匿名会话', Users],
    ['searches', '搜索提交', '操作次数', Search],
    ['no_result_searches', '无结果搜索', '操作次数', CircleAlert],
    ['booth_views', '详情浏览', '操作次数', Building2],
    ['routes_started', '启动导航', '操作次数', Waypoints],
    ['arrivals', '确认到达', '操作次数', MapPin],
    ['reservations', '活动预约', '成功创建', ClipboardCheck],
  ] as const;

  return (
    <section className="analytics-commerce">
      <header className="page-heading">
        <div>
          <span>客流即货值</span>
          <h1>运营分析</h1>
          <p>按展位到访人次结算：人多的展位收费更高，热区溢价可直接进入下届招展报价。</p>
        </div>
      </header>

      <div className="analytics-range">
        <BarChart3 size={17} />
        <span>
          <strong>{analytics.range.label} · 客流计价演示</strong>
          <small>基础位费 {yuan(pricingModel.baseFee)} + {yuan(pricingModel.perVisitor)}/人次 + {yuan(pricingModel.perLead)}/意向；到访前 {pricingModel.hotCount} 名再加 {Math.round(pricingModel.hotPremium * 100)}% 热区溢价</small>
        </span>
      </div>

      <div className="kpi-row commerce-kpis">
        <article className="kpi-card">
          <div>
            <span>本期客流计价</span>
            <strong>{yuan(commercialSummary.revenue)}</strong>
            <small>25 个在场展位按人次结算</small>
          </div>
          <span className="kpi-icon"><Coins size={20} /></span>
        </article>
        <article className="kpi-card kpi-hot">
          <div>
            <span>热区溢价展位</span>
            <strong>{commercialSummary.hotCount}</strong>
            <small>到访最高的 {pricingModel.hotCount} 个位 +25%</small>
          </div>
          <span className="kpi-icon"><Flame size={20} /></span>
        </article>
        <article className="kpi-card">
          <div>
            <span>最高单价</span>
            <strong>{commercialSummary.top ? yuan(commercialSummary.top.fee) : '—'}</strong>
            <small>{commercialSummary.top ? `${commercialSummary.top.id} ${commercialSummary.top.companyName}` : ''}</small>
          </div>
          <span className="kpi-icon"><TrendingUp size={20} /></span>
        </article>
        <article className="kpi-card">
          <div>
            <span>累计到访人次</span>
            <strong>{commercialSummary.visitors.toLocaleString('zh-CN')}</strong>
            <small>空置 {commercialSummary.vacant} 个可按冷区招商</small>
          </div>
          <span className="kpi-icon"><Users size={20} /></span>
        </article>
      </div>

      <div className="commerce-grid">
        <section className="panel-card traffic-table">
          <div className="card-head">
            <div>
              <h2>展位客流与计价</h2>
              <p>按今日到访排序 · 人越多，展位费越高</p>
            </div>
          </div>
          <div className="data-table">
            <div className="table-head traffic-head">
              <span>序</span><span>展位</span><span>企业</span><span>到访</span><span>驻留</span><span>意向</span><span>档位</span><span>本期展位费</span>
            </div>
            {boothCommercials.map((item, index) => (
              <div className={`table-row traffic-row ${item.tier === 'S' ? 'hot' : ''}`} key={item.id}>
                <span>{index + 1}</span>
                <span><strong>{item.id}</strong></span>
                <span>{item.companyName}</span>
                <span className="traffic-bar-cell">
                  {item.visitorCount.toLocaleString('zh-CN')}
                  <i style={{ width: `${Math.max(8, (item.visitorCount / maxBoothVisitors) * 100)}%` }} />
                </span>
                <span>{item.avgDwellMinutes} 分</span>
                <span>{item.businessLeads}</span>
                <span className={`tier-pill tier-${item.tier}`}>{trafficTierLabels[item.tier as TrafficTier]}</span>
                <span className="fee-cell">{yuan(item.fee)}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="commerce-side">
          <section className="panel-card">
            <div className="card-head">
              <div>
                <h2>分区域收入</h2>
                <p>A–E 列按客流汇总</p>
              </div>
            </div>
            <ul className="zone-revenue">
              {zoneCommercials.map((zone) => (
                <li key={zone.col}>
                  <strong>{zone.label}</strong>
                  <span className="bar"><i style={{ width: `${Math.max(10, (zone.revenue / maxZoneRevenue) * 100)}%` }} /></span>
                  <em>{yuan(zone.revenue)}</em>
                  <small>{zone.visitors.toLocaleString('zh-CN')} 人次 · {zone.booths} 家</small>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel-card pricing-card">
            <div className="card-head">
              <div>
                <h2>计价规则</h2>
                <p>给主办的商业模式</p>
              </div>
            </div>
            <ol className="pricing-steps">
              <li>标准展位先收基础位费 {yuan(pricingModel.baseFee)}</li>
              <li>再按现场到访 {yuan(pricingModel.perVisitor)} / 人次加收</li>
              <li>促成意向再加 {yuan(pricingModel.perLead)} / 条</li>
              <li>到访前 {pricingModel.hotCount} 名展位加收 {Math.round(pricingModel.hotPremium * 100)}% 热区溢价</li>
              <li>冷区可下调招商品牌，用价格把人流填满</li>
            </ol>
          </section>
        </aside>
      </div>

      <div className="metric-grid analytics-metrics">
        {cards.map(([key, label, note, Icon]) => (
          <article key={key}>
            <div><span>{label}</span><small>{note}</small></div>
            <strong>{analytics.metrics[key].value?.toLocaleString('zh-CN') ?? '已保护'}</strong>
            <Icon size={20} />
          </article>
        ))}
      </div>

      <div className="content-grid two-one analytics-lower">
        <section className="panel-card">
          <div className="card-head">
            <div>
              <h2>观众操作漏斗</h2>
              <p>同一会话可能产生多次操作</p>
            </div>
          </div>
          <div className="ops-funnel">
            {cards.slice(3).map(([key, label], index) => (
              <div key={key}>
                <span>{index + 1}</span>
                <strong>{label}</strong>
                <b>{analytics.metrics[key].value?.toLocaleString('zh-CN') ?? '已保护'}</b>
              </div>
            ))}
          </div>
        </section>
        <aside className="panel-card">
          <div className="card-head">
            <div>
              <h2>热门搜索词</h2>
              <p>至少出现 3 次才显示</p>
            </div>
          </div>
          {analytics.keywords.length ? (
            <ol className="keyword-list">
              {analytics.keywords.map((item) => (
                <li key={item.keyword}><span>{item.keyword}</span><strong>{item.total.toLocaleString('zh-CN')}</strong></li>
              ))}
            </ol>
          ) : (
            <div className="empty-inline analytics-empty"><Search size={25} /><div><strong>暂无可展示搜索词</strong><p>达到最小聚合数量后显示。</p></div></div>
          )}
        </aside>
      </div>
    </section>
  );
}
