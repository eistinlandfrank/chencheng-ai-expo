'use client';

import { useState, useCallback } from 'react';
import type { Booth, ScheduleItem, NearbyPoi, ExternalLink, ZoneOverride } from '../../shared/types';
import { readAdminData, writeAdminData } from '../../shared/storage';
import ZONES from '../../shared/zones';

type EntryTab = 'booths' | 'schedule' | 'pois' | 'links' | 'zones' | 'import';

export default function DataEntryPanel() {
  const [tab, setTab] = useState<EntryTab>('booths');
  const [data, setData] = useState(() => readAdminData());
  const [jsonInput, setJsonInput] = useState('');
  const [importMsg, setImportMsg] = useState('');

  const save = useCallback((newData: typeof data) => {
    setData(newData);
    writeAdminData(newData);
  }, []);

  // === 摊位 ===
  const addBooth = () => {
    const booth: Booth = {
      boothId: `booth-${Date.now()}`,
      zoneId: 'sponsor',
      name: '',
      status: 'unknown',
      todayHours: '',
      summary: '',
      offers: [],
      interaction: 'none',
      audienceAllowed: true,
      photoUrl: null,
      updatedAt: new Date().toISOString(),
      updatedBy: 'ops',
    };
    save({ ...data, booths: [...data.booths, booth] });
  };

  const updateBooth = (idx: number, patch: Partial<Booth>) => {
    const booths = [...data.booths];
    booths[idx] = { ...booths[idx], ...patch, updatedAt: new Date().toISOString() };
    save({ ...data, booths });
  };

  const removeBooth = (idx: number) => {
    save({ ...data, booths: data.booths.filter((_, i) => i !== idx) });
  };

  // === 日程 ===
  const addSchedule = () => {
    const item: ScheduleItem = {
      id: `sch-${Date.now()}`,
      date: '30',
      start: '09:30',
      end: '12:30',
      title: '',
      audience: true,
    };
    save({ ...data, schedule: [...data.schedule, item] });
  };

  const updateSchedule = (idx: number, patch: Partial<ScheduleItem>) => {
    const schedule = [...data.schedule];
    schedule[idx] = { ...schedule[idx], ...patch };
    save({ ...data, schedule });
  };

  const removeSchedule = (idx: number) => {
    save({ ...data, schedule: data.schedule.filter((_, i) => i !== idx) });
  };

  // === POI ===
  const addPoi = () => {
    const poi: NearbyPoi = {
      id: `poi-${Date.now()}`,
      name: '',
      kind: 'other',
      audienceAllowed: true,
    };
    save({ ...data, pois: [...data.pois, poi] });
  };

  const updatePoi = (idx: number, patch: Partial<NearbyPoi>) => {
    const pois = [...data.pois];
    pois[idx] = { ...pois[idx], ...patch };
    save({ ...data, pois });
  };

  const removePoi = (idx: number) => {
    save({ ...data, pois: data.pois.filter((_, i) => i !== idx) });
  };

  // === 外链 ===
  const addLink = () => {
    const link: ExternalLink = {
      id: `link-${Date.now()}`,
      title: '',
      url: '',
      category: 'general',
    };
    save({ ...data, links: [...data.links, link] });
  };

  const updateLink = (idx: number, patch: Partial<ExternalLink>) => {
    const links = [...data.links];
    links[idx] = { ...links[idx], ...patch };
    save({ ...data, links });
  };

  const removeLink = (idx: number) => {
    save({ ...data, links: data.links.filter((_, i) => i !== idx) });
  };

  // === JSON 导入 ===
  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.booths) save({ ...data, booths: [...data.booths, ...parsed.booths] });
      if (parsed.schedule) save({ ...data, schedule: [...data.schedule, ...parsed.schedule] });
      if (parsed.pois) save({ ...data, pois: [...data.pois, ...parsed.pois] });
      if (parsed.links) save({ ...data, links: [...data.links, ...parsed.links] });
      setImportMsg('导入成功');
      setJsonInput('');
    } catch {
      setImportMsg('JSON 解析失败，请检查格式');
    }
  };

  const TABS: { key: EntryTab; label: string }[] = [
    { key: 'booths', label: '摊位/展商' },
    { key: 'schedule', label: '公开日程' },
    { key: 'pois', label: '额外 POI' },
    { key: 'links', label: '外链' },
    { key: 'zones', label: '分区覆盖' },
    { key: 'import', label: 'JSON 导入' },
  ];

  return (
    <div className="ad-entry">
      <div className="ad-entry-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`ad-entry-tab ${tab === t.key ? 'ad-entry-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ad-entry-content">
        {tab === 'booths' && (
          <div>
            <button className="ad-add-btn" onClick={addBooth}>+ 添加摊位</button>
            {data.booths.map((b, i) => (
              <div key={b.boothId} className="ad-form-card">
                <div className="ad-form-row">
                  <label>所属分区</label>
                  <select value={b.zoneId} onChange={e => updateBooth(i, { zoneId: e.target.value })}>
                    {ZONES.filter(z => z.category !== 'corridor').map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ad-form-row">
                  <label>名称</label>
                  <input value={b.name} onChange={e => updateBooth(i, { name: e.target.value })} placeholder="留空也合法" />
                </div>
                <div className="ad-form-row">
                  <label>状态</label>
                  <select value={b.status} onChange={e => updateBooth(i, { status: e.target.value as Booth['status'] })}>
                    <option value="open">开放</option>
                    <option value="busy">繁忙</option>
                    <option value="break">休息</option>
                    <option value="closed">关闭</option>
                    <option value="unknown">未知</option>
                  </select>
                </div>
                <div className="ad-form-row">
                  <label>时段</label>
                  <input value={b.todayHours} onChange={e => updateBooth(i, { todayHours: e.target.value })} placeholder="如 10:00-18:30" />
                </div>
                <div className="ad-form-row">
                  <label>简介</label>
                  <input value={b.summary} onChange={e => updateBooth(i, { summary: e.target.value })} />
                </div>
                <div className="ad-form-row">
                  <label>观众可见</label>
                  <input type="checkbox" checked={b.audienceAllowed} onChange={e => updateBooth(i, { audienceAllowed: e.target.checked })} />
                </div>
                <button className="ad-remove-btn" onClick={() => removeBooth(i)}>删除</button>
              </div>
            ))}
            {data.booths.length === 0 && <div className="ad-empty">暂无摊位，空数组合法</div>}
          </div>
        )}

        {tab === 'schedule' && (
          <div>
            <button className="ad-add-btn" onClick={addSchedule}>+ 添加日程</button>
            {data.schedule.map((s, i) => (
              <div key={s.id} className="ad-form-card">
                <div className="ad-form-row">
                  <label>日期</label>
                  <input value={s.date} onChange={e => updateSchedule(i, { date: e.target.value })} placeholder="如 30" />
                </div>
                <div className="ad-form-row">
                  <label>开始</label>
                  <input value={s.start} onChange={e => updateSchedule(i, { start: e.target.value })} placeholder="09:30" />
                </div>
                <div className="ad-form-row">
                  <label>结束</label>
                  <input value={s.end} onChange={e => updateSchedule(i, { end: e.target.value })} placeholder="12:30" />
                </div>
                <div className="ad-form-row">
                  <label>标题</label>
                  <input value={s.title} onChange={e => updateSchedule(i, { title: e.target.value })} />
                </div>
                <div className="ad-form-row">
                  <label>对观众</label>
                  <input type="checkbox" checked={s.audience} onChange={e => updateSchedule(i, { audience: e.target.checked })} />
                </div>
                <button className="ad-remove-btn" onClick={() => removeSchedule(i)}>删除</button>
              </div>
            ))}
            {data.schedule.length === 0 && <div className="ad-empty">暂无日程，空数组合法</div>}
          </div>
        )}

        {tab === 'pois' && (
          <div>
            <button className="ad-add-btn" onClick={addPoi}>+ 添加 POI</button>
            {data.pois.map((p, i) => (
              <div key={p.id} className="ad-form-card">
                <div className="ad-form-row">
                  <label>名称</label>
                  <input value={p.name} onChange={e => updatePoi(i, { name: e.target.value })} />
                </div>
                <div className="ad-form-row">
                  <label>类型</label>
                  <select value={p.kind} onChange={e => updatePoi(i, { kind: e.target.value as NearbyPoi['kind'] })}>
                    <option value="toilet">卫生间</option>
                    <option value="cafe">咖啡</option>
                    <option value="charge">充电</option>
                    <option value="desk">服务台</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="ad-form-row">
                  <label>观众可见</label>
                  <input type="checkbox" checked={p.audienceAllowed} onChange={e => updatePoi(i, { audienceAllowed: e.target.checked })} />
                </div>
                <button className="ad-remove-btn" onClick={() => removePoi(i)}>删除</button>
              </div>
            ))}
            {data.pois.length === 0 && <div className="ad-empty">暂无 POI，附近列表不出现这些 chip</div>}
          </div>
        )}

        {tab === 'links' && (
          <div>
            <button className="ad-add-btn" onClick={addLink}>+ 添加外链</button>
            {data.links.map((l, i) => (
              <div key={l.id} className="ad-form-card">
                <div className="ad-form-row">
                  <label>标题</label>
                  <input value={l.title} onChange={e => updateLink(i, { title: e.target.value })} />
                </div>
                <div className="ad-form-row">
                  <label>URL</label>
                  <input value={l.url} onChange={e => updateLink(i, { url: e.target.value })} placeholder="https://" />
                </div>
                <button className="ad-remove-btn" onClick={() => removeLink(i)}>删除</button>
              </div>
            ))}
            {data.links.length === 0 && <div className="ad-empty">暂无外链，按钮隐藏或显示「见 shenicest.com」</div>}
          </div>
        )}

        {tab === 'zones' && (
          <div className="ad-zone-overrides">
            <p className="ad-hint">分区覆盖功能：可修改分区对观众的可见性和备注。数据按 zoneId 合并。</p>
            <div className="ad-zone-table">
              {ZONES.filter(z => z.category !== 'corridor').map(z => (
                <div key={z.id} className="ad-zone-row">
                  <span className="ad-zone-id">{z.id}</span>
                  <span className="ad-zone-name">{z.name}</span>
                  <span className={z.audienceVisible ? 'ad-vis-yes' : 'ad-vis-no'}>
                    {z.audienceVisible ? '观众可见' : '不可见'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'import' && (
          <div className="ad-import">
            <p className="ad-hint">粘贴 JSON 数据导入。格式：{`{"booths":[...],"schedule":[...],"pois":[...],"links":[...]}`}</p>
            <textarea
              className="ad-json-input"
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='{"booths": [], "schedule": []}'
              rows={10}
            />
            <button className="ad-add-btn" onClick={handleImport}>导入</button>
            {importMsg && <div className="ad-import-msg">{importMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
