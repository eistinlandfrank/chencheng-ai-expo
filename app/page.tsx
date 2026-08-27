'use client';

import { useMemo, useState } from 'react';

type ViewMode = 'visitor' | 'organizer';

type Stop = {
  id: string;
  time: string;
  title: string;
  meta: string;
  kind: 'business' | 'event' | 'meal';
  status: string;
};

const samplePrompt = '我下午只有两个半小时，想找做美妆环保包装的供应商，也想认识消费领域投资人。不要走太多路，17点前吃饭，人均80元以内。';

const recommendations = [
  { id: 'A12', score: 92, type: '供应商', name: '青禾循环包装', offer: '甘蔗浆模塑 · 小批量打样', reason: '你的“环保美妆包装”需求与其供给直接匹配', available: '14:00–15:00', distance: '步行 6 分钟', accent: 'lime' },
  { id: 'B07', score: 86, type: '材料伙伴', name: '沐川生物材料', offer: '可降解涂层 · 食品级认证', reason: '能补充包装方案的防水与阻隔能力', available: '14:30–16:30', distance: '步行 4 分钟', accent: 'mint' },
  { id: 'C21', score: 81, type: '投资机构', name: '澄明消费基金', offer: '消费科技 · A轮前投资', reason: '关注可持续消费，现场负责人可预约', available: '15:30 / 16:00', distance: '步行 8 分钟', accent: 'orange' },
];

const originalStops: Stop[] = [
  { id: 'A12', time: '14:10', title: '青禾循环包装', meta: '预计交流 25 分钟', kind: 'business', status: '已确认在场' },
  { id: 'B07', time: '14:45', title: '沐川生物材料', meta: '预计交流 20 分钟', kind: 'business', status: '可直接前往' },
  { id: 'C21', time: '15:30', title: '澄明消费基金', meta: '预约交流 20 分钟', kind: 'business', status: '待对方确认' },
  { id: 'F02', time: '16:10', title: '场馆二层 · 京味小馆', meta: '人均 ¥68 · 无需出馆', kind: 'meal', status: '当前无需排队' },
];

const replannedStops: Stop[] = [
  { id: 'A12', time: '14:10', title: '青禾循环包装', meta: '预计交流 25 分钟', kind: 'business', status: '已确认在场' },
  { id: 'B07', time: '14:45', title: '沐川生物材料', meta: '预计交流 20 分钟', kind: 'business', status: '可直接前往' },
  { id: 'F02', time: '15:25', title: '场馆二层 · 京味小馆', meta: '人均 ¥68 · 无需出馆', kind: 'meal', status: '已为你提前' },
  { id: 'C21', time: '16:00', title: '澄明消费基金', meta: '预约交流 20 分钟', kind: 'business', status: '新时段已锁定' },
];

function deriveTags(text: string) {
  const tags = [];
  if (/包装|材料|供应/.test(text)) tags.push('环保包装供应商');
  if (/投资|融资|基金/.test(text)) tags.push('消费投资人');
  if (/论坛|活动|分享/.test(text)) tags.push('主题活动');
  if (/少走|距离|步行/.test(text)) tags.push('低步行强度');
  if (/吃|饭|餐/.test(text)) tags.push('17:00 前用餐');
  return tags.length ? tags : ['高价值商机', '有限时间', '可执行路线'];
}

export default function Home() {
  const [prompt, setPrompt] = useState(samplePrompt);
  const [viewMode, setViewMode] = useState<ViewMode>('visitor');
  const [planning, setPlanning] = useState(false);
  const [planned, setPlanned] = useState(false);
  const [replanned, setReplanned] = useState(false);
  const [saved, setSaved] = useState<string[]>(['A12', 'B07', 'C21']);
  const [selectedBooth, setSelectedBooth] = useState('A12');
  const [checkedIn, setCheckedIn] = useState(false);
  const [followupReady, setFollowupReady] = useState(false);
  const [toast, setToast] = useState('');

  const tags = useMemo(() => deriveTags(prompt), [prompt]);
  const stops = replanned ? replannedStops : originalStops;
  const selected = recommendations.find((item) => item.id === selectedBooth) ?? recommendations[0];

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function handlePlan() {
    if (!prompt.trim()) {
      notify('先告诉我你今天最想完成什么');
      return;
    }
    setPlanning(true);
    window.setTimeout(() => {
      setPlanning(false);
      setPlanned(true);
      window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 60);
    }, 900);
  }

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function switchMode(mode: ViewMode) {
    setViewMode(mode);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 30);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={() => switchMode('visitor')} aria-label="辰程 AI 首页">
          <span className="brand-mark">辰</span>
          <span><strong>辰程 AI</strong><small>EXPO ACTION AGENT</small></span>
        </button>
        <nav className="desktop-nav" aria-label="主导航">
          <button className={viewMode === 'visitor' ? 'active' : ''} type="button" onClick={() => switchMode('visitor')}>观众行程</button>
          <button type="button" onClick={() => { switchMode('visitor'); window.setTimeout(() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }), 80); }}>发现商机</button>
          <button type="button" onClick={() => { switchMode('visitor'); window.setTimeout(() => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' }), 80); }}>场馆地图</button>
        </nav>
        <div className="top-actions">
          <button className="organizer-entry" type="button" onClick={() => switchMode(viewMode === 'organizer' ? 'visitor' : 'organizer')}>{viewMode === 'organizer' ? '返回观众端' : '运营端'}</button>
          <div className="live-pill"><i /> 场馆数据已同步</div>
        </div>
      </header>

      {viewMode === 'visitor' ? (
        <>
          <section className="hero" id="top">
            <div className="hero-copy">
              <div className="eyebrow"><span>01</span> YOUR DAY, ORCHESTRATED</div>
              <h1>把一个展会，变成一条<br /><em>可以执行的路线。</em></h1>
              <p className="lead">说出你今天想完成的事。AI 会替你找到人、排好时间、规划路线，并把每一次推荐推进到真实会面。</p>

              <div className="intent-card" id="plan">
                <div className="intent-head"><label htmlFor="intent">今天来展会，最想完成什么？</label><span>AI 正在听</span></div>
                <textarea id="intent" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} placeholder="例如：我有2小时，想找3家包装供应商……" />
                <div className="quick-row">
                  {['找供应商', '找投资人', '听一场论坛', '少走路'].map((item) => (
                    <button key={item} type="button" onClick={() => setPrompt((value) => value.includes(item) ? value : `${value} ${item}`)}>{item}</button>
                  ))}
                </div>
                <button className="primary-action" type="button" onClick={handlePlan} disabled={planning}>
                  <span>{planning ? '正在理解需求并规划…' : '生成我的今日行程'}</span><b>{planning ? '···' : '↗'}</b>
                </button>
              </div>
            </div>

            <aside className={`day-card ${planned ? 'is-planned' : ''}`} aria-live="polite">
              <div className="day-card-head">
                <div><small>AUG 27 · THU</small><h2>{planned ? '你的半日行程' : '行程预览'}</h2></div>
                <span className="score">92<small>最高匹配度</small></span>
              </div>
              <div className="route-map" aria-label="场馆路线预览">
                <div className="map-grid" />
                <div className="booth booth-a">A12</div><div className="booth booth-b">B07</div><div className="booth booth-c">C21</div>
                <div className="route-line route-one" /><div className="route-line route-two" /><span className="you-are-here">你</span>
              </div>
              <ol className="mini-timeline">
                {stops.slice(0, 3).map((stop, index) => (
                  <li key={`${stop.id}-${stop.time}`}><time>{stop.time}</time><span><b>{stop.id} {stop.title}</b><small>{stop.status}</small></span><i>0{index + 1}</i></li>
                ))}
              </ol>
              <div className="day-summary"><span><b>3</b> 个高价值目标</span><span><b>{replanned ? '1.0km' : '1.2km'}</b> 预计步行</span><span><b>42min</b> 节省时间</span></div>
            </aside>
          </section>

          <section className={`results ${planned ? 'results-visible' : ''}`} id="results" aria-hidden={!planned}>
            <div className="section-wrap">
              <div className="result-intro">
                <div><div className="eyebrow light"><span>02</span> INTENT → ACTION</div><h2>AI 已经理解你的目标</h2></div>
                <div className="constraint-row">{tags.map((tag) => <span key={tag}>✓ {tag}</span>)}<span>✓ 14:00–17:00</span><span>✓ 预算 ¥80</span></div>
              </div>

              <div className="section-title" id="discover">
                <div><small>SMART MATCHING</small><h3>最值得去的 3 个地方</h3></div>
                <p>不是关键词相似，而是需求、供给、时间与位置同时成立。</p>
              </div>
              <div className="recommendation-grid">
                {recommendations.map((item, index) => (
                  <article className={`recommendation-card accent-${item.accent}`} key={item.id}>
                    <div className="rec-top"><span className="rec-index">0{index + 1}</span><span className="rec-score">{item.score}<small>% MATCH</small></span></div>
                    <div className="rec-type">{item.type} · {item.id}</div><h4>{item.name}</h4><p className="rec-offer">{item.offer}</p>
                    <div className="reason-box"><small>为什么推荐</small><p>{item.reason}</p></div>
                    <div className="rec-meta"><span>◷ {item.available}</span><span>⌁ {item.distance}</span></div>
                    <button className={saved.includes(item.id) ? 'saved' : ''} type="button" onClick={() => toggleSaved(item.id)}>{saved.includes(item.id) ? '已加入行程 ✓' : '加入行程 +'}</button>
                  </article>
                ))}
              </div>

              <div className="route-section" id="map">
                <div className="route-panel">
                  <div className="route-panel-head"><div><small>YOUR ROUTE</small><h3>{replanned ? '更新后的行程' : '你的半日行程'}</h3></div><span>{replanned ? '1.0 km' : '1.2 km'} · 约 2.5 小时</span></div>
                  <ol className="full-timeline">
                    {stops.map((stop, index) => (
                      <li className={stop.kind} key={`${stop.id}-${stop.time}`}>
                        <time>{stop.time}</time><div className="timeline-node">{stop.kind === 'meal' ? '食' : index + 1}</div>
                        <div className="stop-copy"><div><span>{stop.id}</span><small>{stop.status}</small></div><h4>{stop.title}</h4><p>{stop.meta}</p></div>
                        {stop.kind === 'business' && <button type="button" onClick={() => { setSelectedBooth(stop.id); document.getElementById('map-canvas')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>地图</button>}
                      </li>
                    ))}
                  </ol>
                  {!replanned ? (
                    <div className="change-alert"><span>!</span><div><b>C21 负责人临时推迟至 16:00</b><small>原行程将产生 30 分钟等待</small></div><button type="button" onClick={() => { setReplanned(true); notify('行程已重新规划，预计少走 200 米'); }}>一键重排</button></div>
                  ) : (
                    <div className="success-alert"><span>✓</span><div><b>已重新规划</b><small>用餐提前，C21 新时段已锁定，共少走 200 米</small></div></div>
                  )}
                </div>

                <div className="map-panel" id="map-canvas">
                  <div className="map-toolbar"><div><small>NATIONAL CONVENTION CENTER</small><b>一层 · A/B/C 展区</b></div><div><button type="button">－</button><button type="button">＋</button></div></div>
                  <div className={`big-map ${replanned ? 'map-replanned' : ''}`}>
                    <div className="big-grid" />
                    {['A03','A08','A12','B02','B07','B11','C04','C13','C21','F02'].map((booth) => (
                      <button key={booth} type="button" className={`map-booth map-${booth.toLowerCase()} ${selectedBooth === booth ? 'selected' : ''} ${['A12','B07','C21','F02'].includes(booth) ? 'on-route' : ''}`} onClick={() => setSelectedBooth(booth)}>{booth}</button>
                    ))}
                    <div className="path p1" /><div className="path p2" /><div className="path p3" /><div className="path p4" />
                    <span className="map-user">你</span>
                    <div className="map-detail"><small>当前目标 · {selected.id}</small><b>{selected.name}</b><span>{selected.distance} · {selected.available}</span><button type="button" onClick={() => notify(`已开始前往 ${selected.id}`)}>开始导航 →</button></div>
                  </div>
                  <div className="map-legend"><span><i className="legend-user" />你的位置</span><span><i className="legend-route" />推荐路线</span><span><i className="legend-booth" />目标展位</span></div>
                </div>
              </div>

              <section className="meeting-section">
                <div className="meeting-copy"><div className="eyebrow"><span>03</span> MEET → CONVERT</div><h3>抵达不是终点，<br />让一次交流留下下一步。</h3><p>到达展位后扫码确认。AI 会给出会谈开场、记录双方承诺，并生成可发送的跟进信息。</p></div>
                <div className="meeting-card">
                  <div className="meeting-person"><span>林</span><div><small>A12 · 青禾循环包装</small><b>林悦 / 商务负责人</b></div><i>{checkedIn ? '会面中' : '现场可接待'}</i></div>
                  {!checkedIn ? (
                    <><div className="qr-placeholder"><div className="qr-grid">{Array.from({ length: 25 }).map((_, i) => <i key={i} className={i % 3 === 0 || i % 7 === 0 ? 'dark' : ''} />)}</div><span>扫描展位二维码<br />确认双方已到场</span></div><button className="meeting-action" type="button" onClick={() => { setCheckedIn(true); notify('已确认到达 A12'); }}>模拟扫码到场</button></>
                  ) : !followupReady ? (
                    <div className="conversation-panel"><small>AI 建议从这里开始</small><h4>“你们的小批量打样最低可以做到多少件？”</h4><textarea defaultValue="双方讨论了 5000 件起订的小批量试产，展商承诺两天内发送材料样册，我方需要补充包装尺寸。" rows={4} /><button className="meeting-action" type="button" onClick={() => setFollowupReady(true)}>结束会面并生成下一步</button></div>
                  ) : (
                    <div className="followup-panel"><span>✓</span><h4>会面纪要已生成</h4><ul><li>展商：8月29日前发送材料样册</li><li>你方：发送包装尺寸与预计采购量</li><li>线索阶段：有效需求 / 建议本周跟进</li></ul><button className="meeting-action" type="button" onClick={() => notify('跟进消息已复制')}>复制跟进消息</button></div>
                  )}
                </div>
              </section>
            </div>
          </section>

          <section className="pre-footer"><span>辰程 AI</span><h2>让真正互相需要的人，<br />在正确的时间抵达彼此。</h2><button type="button" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); document.getElementById('intent')?.focus(); }}>重新规划一天 ↗</button></section>
        </>
      ) : (
        <OrganizerDashboard onBack={() => switchMode('visitor')} />
      )}

      <nav className="mobile-nav" aria-label="移动端导航">
        <button className={viewMode === 'visitor' ? 'active' : ''} type="button" onClick={() => switchMode('visitor')}><span>⌁</span>行程</button>
        <button type="button" onClick={() => { switchMode('visitor'); window.setTimeout(() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }), 80); }}><span>◎</span>商机</button>
        <button type="button" onClick={() => { switchMode('visitor'); window.setTimeout(() => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' }), 80); }}><span>▦</span>地图</button>
        <button className={viewMode === 'organizer' ? 'active' : ''} type="button" onClick={() => switchMode('organizer')}><span>◫</span>运营</button>
      </nav>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function OrganizerDashboard({ onBack }: { onBack: () => void }) {
  const metrics = [
    { label: '需求提交', value: '1,284', delta: '+18.2%' },
    { label: '接受推荐', value: '892', delta: '+12.4%' },
    { label: '确认到场', value: '516', delta: '+23.1%' },
    { label: '有效会面', value: '384', delta: '+31.6%' },
  ];
  return (
    <section className="dashboard-page">
      <div className="dashboard-head"><div><div className="eyebrow"><span>OPS</span> LIVE OPERATION CENTER</div><h1>商机转化驾驶舱</h1><p>把展会从“来了多少人”，推进到“发生了多少次有效连接”。</p></div><button type="button" onClick={onBack}>查看观众体验 →</button></div>
      <div className="metric-grid">{metrics.map((item) => <article key={item.label}><small>{item.label}</small><strong>{item.value}</strong><span>↗ {item.delta}</span></article>)}</div>
      <div className="dashboard-grid">
        <article className="dash-card funnel-card"><div className="dash-title"><div><small>CONVERSION FUNNEL</small><h3>从推荐到真实会面</h3></div><span>今日 · 实时</span></div>
          <div className="funnel-chart">
            {[['推荐曝光','1,284','100%'],['接受推荐','892','69%'],['生成行程','704','55%'],['确认到场','516','40%'],['有效会面','384','30%'],['创建跟进','271','21%']].map((row, index) => <div key={row[0]}><span>{row[0]}</span><i style={{ width: `${100 - index * 13}%` }} /><b>{row[1]}</b><small>{row[2]}</small></div>)}
          </div>
        </article>
        <article className="dash-card heat-card"><div className="dash-title"><div><small>LIVE FLOOR</small><h3>场馆实时热度</h3></div><span className="green-dot">运行正常</span></div>
          <div className="heat-map"><div className="heat-grid" /><i className="heat h1" /><i className="heat h2" /><i className="heat h3" /><i className="heat h4" /><span className="zone z1">A区 · 76%</span><span className="zone z2">B区 · 48%</span><span className="zone z3">C区 · 62%</span></div>
          <p className="heat-note"><b>AI 分流建议</b>A区将在 20 分钟后达到峰值，建议将 14% 的可替代推荐分流至 B 区。</p>
        </article>
        <article className="dash-card demand-card"><div className="dash-title"><div><small>DEMAND SIGNALS</small><h3>正在发生的需求</h3></div><span>共 437 条</span></div>
          <div className="demand-list">{[['环保包装','128','+24%'],['AI 营销服务','94','+17%'],['渠道合作','76','+9%'],['消费投资','61','+31%'],['出海合规','43','+12%']].map((item, index) => <div key={item[0]}><i>{index + 1}</i><span>{item[0]}</span><b>{item[1]}</b><small>{item[2]}</small></div>)}</div>
        </article>
        <article className="dash-card insight-card"><div className="dash-title"><div><small>AI INSIGHT</small><h3>今天值得关注</h3></div><span>3 条</span></div>
          <div className="insights"><div><span>01</span><p><b>高意向需求未被满足</b>有 36 位观众寻找“小批量环保包装”，当前仅 2 家展商可承接。</p></div><div><span>02</span><p><b>C区会面转化率最高</b>虽然客流低于 A 区，但有效会面率高出 18%，建议增加定向导流。</p></div><div><span>03</span><p><b>17:00 后跟进率显著下降</b>建议在会面后 10 分钟内自动提醒双方确认下一步。</p></div></div>
        </article>
      </div>
    </section>
  );
}
