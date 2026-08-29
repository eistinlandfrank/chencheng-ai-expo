'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Search } from 'lucide-react';
import {
  categoryOptions,
  occupiedBooths,
  showcaseActivities,
  showcaseBooths,
  statusLabels,
  type BoothCol,
  type BoothStatus,
} from '@/lib/venue-showcase-data';

const COLS: Array<BoothCol | 'all'> = ['all', 'A', 'B', 'C', 'D', 'E'];
const activityLabels: Record<string, string> = {
  scheduled: '已排期',
  live: '进行中',
  delayed: '延迟',
  ended: '已结束',
};

export default function CatalogActivitiesPanel() {
  const [query, setQuery] = useState('');
  const [col, setCol] = useState<BoothCol | 'all'>('all');
  const [category, setCategory] = useState('全部赛道');

  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('zh-CN');
    return occupiedBooths.filter((booth) => {
      if (col !== 'all' && booth.col !== col) return false;
      if (category !== '全部赛道' && booth.category !== category) return false;
      if (!needle) return true;
      return `${booth.id} ${booth.companyName} ${booth.offers} ${booth.owner}`.toLocaleLowerCase('zh-CN').includes(needle);
    });
  }, [category, col, query]);

  const statusCount = (status: BoothStatus) => occupiedBooths.filter((booth) => booth.status === status).length;

  return (
    <div className="catalog-showcase">
      <header className="page-heading">
        <div>
          <span>供需匹配与排期管理</span>
          <h1>展位与活动</h1>
          <p>按 A–E 区域和赛道检索在场展商；活动排期含容量与预约数。</p>
        </div>
      </header>
      <div className="catalog-summary">
        <article><span><small>在场展商</small><strong>{occupiedBooths.length}</strong></span></article>
        <article><span><small>就绪接待</small><strong>{statusCount('ready')}</strong></span></article>
        <article><span><small>忙碌中</small><strong>{statusCount('busy')}</strong></span></article>
        <article><span><small>标准展位</small><strong>{showcaseBooths.length}</strong></span></article>
      </div>

      <section className="panel-card catalog-table">
        <div className="table-toolbar catalog-toolbar">
          <div className="filter-tabs">
            {COLS.map((item) => (
              <button className={col === item ? 'active' : ''} key={item} type="button" onClick={() => setCol(item)}>
                {item === 'all' ? '全部区域' : `${item}区`}
              </button>
            ))}
          </div>
          <label>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索展位号、企业或供给" />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="data-table showcase-table">
          <div className="table-head"><span>展位</span><span>企业</span><span>赛道</span><span>供给 / 需求</span><span>负责人</span><span>接待</span></div>
          {rows.map((booth) => (
            <div className="table-row" key={booth.id}>
              <span><strong>{booth.id}</strong></span>
              <span>{booth.companyName}</span>
              <span>{booth.category}</span>
              <span className="offer-cell">{booth.offers}{booth.wants ? ` · 求 ${booth.wants}` : ''}</span>
              <span>{booth.owner}</span>
              <span className={`status-pill ${booth.status === 'ready' ? 'published' : booth.status === 'busy' ? 'review' : 'draft'}`}>{statusLabels[booth.status]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card activity-board">
        <div className="card-head">
          <div>
            <h2>展位现场活动</h2>
            <p>Workshop、新品发布与主论坛路演</p>
          </div>
        </div>
        <div className="activity-list">
          {showcaseActivities.map((item) => (
            <article key={item.id}>
              <time>
                <strong>{item.start}</strong>
                <small>{item.end}</small>
              </time>
              <div>
                <small>{item.placeLabel} · {activityLabels[item.status]}{item.delayMinutes ? ` ${item.delayMinutes} 分钟` : ''}</small>
                <strong>{item.title}</strong>
                <p><CalendarClock size={13} /> 容量 {item.capacity} · 已约 {item.reserved}</p>
              </div>
              <span className={`status-pill ${item.status === 'live' ? 'published' : item.status === 'delayed' ? 'review' : 'draft'}`}>{activityLabels[item.status]}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
