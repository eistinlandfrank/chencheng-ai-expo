'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  GitBranch,
  Layers3,
  LayoutDashboard,
  Map,
  MapPin,
  Megaphone,
  Menu,
  PanelLeftClose,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SquareActivity,
  TriangleAlert,
  Users,
  Waypoints,
  Wrench,
} from 'lucide-react';
import Brand from '@/components/Brand';
import Modal from '@/components/Modal';
import Toast, { type ToastState } from '@/components/Toast';
import VenueMap from '@/components/VenueMap';
import { edges, nodes, places, venue } from '@/lib/venue';
import { emptyMapFieldChecks, type ClosedGroup, type MapFieldChecks, type OpsNotice as Notice, type OpsState, type OpsTicket } from '@/lib/state-types';

type OpsTab = 'overview' | 'map' | 'catalog' | 'live' | 'notices' | 'tickets' | 'analytics' | 'accounts' | 'settings';

const opsNav: Array<{ id: OpsTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: '运营总览', icon: LayoutDashboard },
  { id: 'map', label: '地图与路线', icon: Map },
  { id: 'catalog', label: '展位与活动', icon: Building2 },
  { id: 'live', label: '实时现场', icon: SquareActivity },
  { id: 'notices', label: '通知', icon: Megaphone },
  { id: 'tickets', label: '工单调度', icon: Wrench },
  { id: 'analytics', label: '分析', icon: BarChart3 },
  { id: 'accounts', label: '账号权限', icon: Users },
  { id: 'settings', label: '系统设置', icon: Settings },
];

export default function OperationsPortal({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<OpsTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [closedGroups, setClosedGroups] = useState<ClosedGroup[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [corridorOpen, setCorridorOpen] = useState(false);
  const [mapReviewState, setMapReviewState] = useState<OpsState['mapStatus']>('draft');
  const [verifications, setVerifications] = useState<MapFieldChecks>(emptyMapFieldChecks);
  const [mapReviews, setMapReviews] = useState<OpsState['mapReviews']>([]);
  const [submittedBy, setSubmittedBy] = useState('');
  const [canReview, setCanReview] = useState(true);
  const [graphValidation, setGraphValidation] = useState<{ valid: boolean; issues: string[] }>({ valid: false, issues: [] });
  const [openPlaceIds, setOpenPlaceIds] = useState<string[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tickets, setTickets] = useState<OpsTicket[]>([]);
  const [profileReviewStatus, setProfileReviewStatus] = useState<'draft' | 'review' | 'published'>('draft');
  const [toast, setToast] = useState<ToastState>(null);

  const configuredAreaCount = useMemo(() => places.filter((place) => place.kind !== 'gate').length, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/v1/ops/state', { cache: 'no-store' });
        if (!response.ok) throw new Error('load_failed');
          const payload = await response.json() as { value: OpsState; current_review: MapFieldChecks; can_review: boolean; graph_validation: { valid: boolean; issues: string[] }; content_review?: { profile_status: 'draft' | 'review' | 'published' } };
        if (!active) return;
        setClosedGroups(payload.value.closedGroups);
        setNotices(payload.value.notices);
        setTickets(payload.value.tickets);
          setMapReviewState(payload.value.mapStatus);
          setVerifications(payload.current_review);
          setMapReviews(payload.value.mapReviews);
          setSubmittedBy(payload.value.submittedBy);
          setCanReview(payload.can_review);
          setOpenPlaceIds(payload.value.openPlaceIds);
          setGraphValidation(payload.graph_validation);
          setProfileReviewStatus(payload.content_review?.profile_status ?? 'draft');
      } catch {
        if (active && process.env.NODE_ENV !== 'development') setToast({ message: '无法加载最新运营数据，请刷新重试', type: 'warning' });
      }
    };
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  function notify(message: string, type: NonNullable<ToastState>['type'] = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3400);
  }

  async function saveState(next: OpsState, action: string, verification?: MapFieldChecks) {
    try {
        const response = await fetch('/api/v1/ops/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: next, action, verification }) });
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(error?.message ?? '保存失败');
      }
        const payload = await response.json() as { value: OpsState; current_review: MapFieldChecks; can_review: boolean; graph_validation: { valid: boolean; issues: string[] }; content_review?: { profile_status: 'draft' | 'review' | 'published' } };
        setMapReviews(payload.value.mapReviews);
        setSubmittedBy(payload.value.submittedBy);
        setCanReview(payload.can_review);
        setVerifications(payload.current_review);
        setGraphValidation(payload.graph_validation);
        if (payload.content_review) setProfileReviewStatus(payload.content_review.profile_status);
        return payload.value;
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存失败，请重试', 'warning');
        return null;
    }
  }

  function snapshot(overrides: Partial<OpsState> = {}): OpsState {
    return { closedGroups, notices, tickets, openPlaceIds, mapStatus: mapReviewState, reviewedMapVersion: venue.mapVersion, submittedBy, mapReviews, ...overrides };
  }

  async function updateCorridor(group: ClosedGroup, closed: boolean) {
    const nextGroups = closed ? [...new Set([...closedGroups, group])] : closedGroups.filter((item) => item !== group);
    const saved = await saveState(snapshot({ closedGroups: nextGroups }), closed ? 'route_group_closed' : 'route_group_reopened');
    if (!saved) return;
    setClosedGroups(saved.closedGroups);
    setCorridorOpen(false);
    notify(closed ? '通道已关闭，新路线会立即避开该路段' : '通道已恢复开放', closed ? 'warning' : 'success');
  }

  async function createNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title'));
    const audience = '全体观众';
    const content = String(data.get('content'));
    const nextNotices = [{ id: Date.now(), title, content, audience, status: '已发布', createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }, ...notices];
    const saved = await saveState(snapshot({ notices: nextNotices }), 'notice_published');
    if (!saved) return;
    setNotices(saved.notices);
    setNoticeOpen(false);
    notify('通知已发布');
  }

  async function createOpsTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextTickets = [{ id: crypto.randomUUID(), category: String(data.get('category')), location: String(data.get('location')), priority: String(data.get('priority')), description: String(data.get('description')), status: '待分派', assignee: '未分派', source: 'operations' as const, createdAt: new Date().toISOString() }, ...tickets];
    const saved = await saveState(snapshot({ tickets: nextTickets }), 'service_ticket_created');
    if (!saved) return;
    setTickets(saved.tickets);
    setTicketOpen(false);
    notify('工单已创建');
  }

  async function submitMapReview() {
    const saved = await saveState(snapshot(), 'map_review_submitted');
    if (!saved) return;
    setMapReviewState(saved.mapStatus);
    notify('地图草稿已提交现场复核');
  }

  async function toggleVerification(key: keyof MapFieldChecks) {
    const next = { ...verifications, [key]: !verifications[key] };
    const saved = await saveState(snapshot(), 'map_verification_updated', next);
    if (!saved) return;
    setVerifications(next);
    setMapReviewState(saved.mapStatus);
  }

  async function publishMap() {
    if (!Object.values(verifications).every(Boolean)) {
      notify('请先完成全部现场复核', 'warning');
      return;
    }
    const saved = await saveState(snapshot(), 'map_version_published');
    if (!saved) return;
    setMapReviewState(saved.mapStatus);
    notify('地图版本已发布，观众端导航现已开放');
  }

  async function togglePlaceAvailability(placeId: string) {
    const next = openPlaceIds.includes(placeId) ? openPlaceIds.filter((id) => id !== placeId) : [...openPlaceIds, placeId];
    const saved = await saveState(snapshot({ openPlaceIds: next }), 'place_availability_updated');
    if (!saved) return;
    setOpenPlaceIds(saved.openPlaceIds);
    notify(openPlaceIds.includes(placeId) ? '该地点已暂停推荐' : '该地点已开放搜索与行程');
  }

  async function publishBoothProfile() {
    const saved = await saveState(snapshot(), 'booth_profile_published');
    if (!saved) return;
    setProfileReviewStatus('published');
    notify('展位内容已审核并发布');
  }

  async function advanceTicket(ticketId: string) {
    const nextTickets = tickets.map((ticket) => {
      if (ticket.id !== ticketId) return ticket;
      if (ticket.status === '待分派') return { ...ticket, status: '处理中', assignee: displayName };
      if (ticket.status === '处理中') return { ...ticket, status: '待确认' };
      return { ...ticket, status: '已完成' };
    });
    const saved = await saveState(snapshot({ tickets: nextTickets }), 'service_ticket_status_updated');
    if (!saved) return;
    setTickets(saved.tickets);
    notify('工单状态已更新');
  }

  return (
    <main className={`portal-shell ops-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <aside className="portal-sidebar ops-sidebar">
        <div className="sidebar-logo-row"><Brand href="/operations" /><button type="button" onClick={() => setSidebarOpen(false)} aria-label="收起侧栏"><PanelLeftClose size={18} /></button></div>
        <div className="portal-role"><span><ShieldCheck size={18} /></span><div><small>场馆运营中心</small><strong>主会场</strong></div></div>
        <nav aria-label="运营端导航">{opsNav.map(({ id, label, icon: Icon }) => <button className={tab === id ? 'active' : ''} key={id} type="button" onClick={() => setTab(id)}><Icon size={19} />{label}</button>)}</nav>
        <div className="system-health"><span className={mapReviewState === 'published' ? 'live-dot' : 'state-dot pending'} /><div><strong>{mapReviewState === 'published' ? '地图导航已开放' : '地图等待复核'}</strong><small>版本 {venue.mapVersion}</small></div><ChevronRight size={16} /></div>
        <Link className="back-to-visitor" href="/">返回观众端</Link>
      </aside>

      <section className="portal-main">
          <header className="portal-topbar ops-topbar"><div className="ops-title"><button className="menu-toggle" type="button" onClick={() => setSidebarOpen((value) => !value)} aria-label="切换侧栏"><Menu size={20} /></button><div><small>Expo Service AI</small><strong>{opsNav.find((item) => item.id === tab)?.label}</strong></div></div><div className="event-switcher"><small>当前展会</small><strong>千人黑客松 · 主会场</strong></div><div className="topbar-actions"><div className="account-button"><span>运</span><div><strong>{displayName}</strong><small>场馆管理员</small></div></div></div></header>

        <div className="portal-content ops-content">
          {tab === 'overview' && <Overview configuredAreaCount={configuredAreaCount} closedGroups={closedGroups} mapStatus={mapReviewState} notices={notices} tickets={tickets} onTab={setTab} onCorridor={() => setCorridorOpen(true)} onNotice={() => setNoticeOpen(true)} onTicket={() => setTicketOpen(true)} />}
          {tab === 'map' && <MapManagement closedGroups={closedGroups} reviewState={mapReviewState} verifications={verifications} canReview={canReview} reviewCount={new Set(mapReviews.filter((review) => review.actorId !== submittedBy && Object.values(review.checks).every(Boolean)).map((review) => review.actorId)).size} graphValidation={graphValidation} onReview={submitMapReview} onToggleVerification={toggleVerification} onPublish={publishMap} notify={notify} />}
          {tab === 'catalog' && <>{profileReviewStatus === 'review' && <div className="policy-banner"><ClipboardCheck size={20} /><div><strong>有展位内容等待审核</strong><p>审核通过后，新内容会替换观众端当前公开版本。</p></div><button type="button" onClick={() => void publishBoothProfile()}>审核并发布</button></div>}<CatalogManagement openPlaceIds={openPlaceIds} onToggle={togglePlaceAvailability} /></>}
          {tab === 'live' && <LiveOperations closedGroups={closedGroups} mapStatus={mapReviewState} onCorridor={() => setCorridorOpen(true)} />}
          {tab === 'notices' && <NoticesView notices={notices} onCreate={() => setNoticeOpen(true)} />}
          {tab === 'tickets' && <TicketDispatch tickets={tickets} onCreate={() => setTicketOpen(true)} onAdvance={advanceTicket} />}
          {tab === 'analytics' && <OperationsAnalyticsView />}
          {tab === 'accounts' && <AccountsView />}
          {tab === 'settings' && <SystemSettingsView mapStatus={mapReviewState} />}
        </div>
      </section>

      <Modal open={corridorOpen} title="更新通道状态" onClose={() => setCorridorOpen(false)}>
        <div className="corridor-form"><div className="warning-note"><TriangleAlert size={20} /><span>状态变化会写入现场状态；新生成的路线将立即避开关闭路段。</span></div>{([['north-main', '上侧主疏散通道'], ['south-main', '下侧主疏散通道']] as const).map(([id, label]) => <article key={id}><div><Waypoints size={21} /><span><strong>{label}</strong><small>{closedGroups.includes(id) ? '临时关闭' : '未关闭'}</small></span></div><div>{closedGroups.includes(id) ? <button type="button" onClick={() => updateCorridor(id, false)}>恢复开放</button> : <button className="danger-outline" type="button" onClick={() => updateCorridor(id, true)}>临时关闭</button>}</div></article>)}</div>
      </Modal>

      <Modal open={noticeOpen} title="发布通知" onClose={() => setNoticeOpen(false)}>
        <form className="ticket-form" onSubmit={createNotice}><label><span>通知标题</span><input name="title" placeholder="例如：下侧通道临时关闭" required /></label><label><span>显示范围</span><input value="全体观众" readOnly /></label><label><span>通知内容</span><textarea name="content" rows={5} placeholder="说明发生了什么，以及用户下一步应如何行动" required /></label><div className="approval-note"><ClipboardCheck size={18} />发布后将写入审计记录，并显示在观众端消息中心。</div><button className="primary-wide" type="submit"><Send size={18} />发布通知</button></form>
      </Modal>

      <Modal open={ticketOpen} title="创建调度工单" onClose={() => setTicketOpen(false)}>
        <form className="ticket-form" onSubmit={createOpsTicket}><div className="form-row"><label><span>问题类型</span><select name="category"><option>网络</option><option>电力</option><option>设备</option><option>物料</option><option>清洁</option><option>安保</option></select></label><label><span>紧急度</span><select name="priority"><option>普通</option><option>紧急</option></select></label></div><label><span>位置</span><input name="location" placeholder="选择区域或输入现场标识" required /></label><label><span>问题描述</span><textarea name="description" rows={5} placeholder="描述影响范围与现场情况" required /></label><button className="primary-wide" type="submit"><Plus size={18} />创建工单</button></form>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function Overview({ configuredAreaCount, closedGroups, mapStatus, notices, tickets, onTab, onCorridor, onNotice, onTicket }: { configuredAreaCount: number; closedGroups: ClosedGroup[]; mapStatus: OpsState['mapStatus']; notices: Notice[]; tickets: OpsTicket[]; onTab: (tab: OpsTab) => void; onCorridor: () => void; onNotice: () => void; onTicket: () => void }) {
  const activeTickets = tickets.filter((ticket) => ticket.status !== '已完成');
  const metrics = [
    { label: '已配置地点', value: String(configuredAreaCount), note: '区域与现场服务', icon: MapPin },
    { label: '关闭通道', value: String(closedGroups.length), note: '当前现场状态', icon: Waypoints },
    { label: '处理中工单', value: String(activeTickets.length), note: '未完成队列', icon: Wrench },
    { label: '已发布通知', value: String(notices.filter((notice) => notice.status === '已发布').length), note: '当前记录', icon: Megaphone },
  ];
  return <section><PageHeading eyebrow="千人黑客松 · 主会场" title="运营总览" description="地图、现场状态、通知与工单的统一工作台。" action={<div className="heading-actions"><button type="button" onClick={onCorridor}><Waypoints size={17} />通道状态</button><button className="primary" type="button" onClick={onNotice}><Megaphone size={17} />发布通知</button></div>} /><div className="metric-grid ops-metrics">{metrics.map(({ label, value, note, icon: Icon }) => <article key={label}><div><span>{label}</span><small>{note}</small></div><strong>{value}</strong><Icon size={20} /></article>)}</div><div className="ops-overview-grid"><section className="map-operations-card"><div className="card-head"><div><h2>场馆地图</h2><p>{venue.mapVersion} · 主厅 {venue.widthMeters} × {venue.heightMeters} 米</p></div><div className="map-status-row"><span className={`status-pill ${mapStatus === 'published' ? 'published' : 'review'}`}>{mapStatus === 'published' ? '已发布' : mapStatus === 'review' ? '审核中' : '草稿'}</span><button type="button" onClick={() => onTab('map')}>地图管理 <ChevronRight size={15} /></button></div></div><VenueMap closedGroups={closedGroups} showEditorGrid /><div className="map-summary"><span><Waypoints size={16} />2 条主疏散通道</span><span><GitBranch size={16} />{edges.length} 条通行边</span><span><MapPin size={16} />{nodes.length} 个导航节点</span><span><CircleAlert size={16} />{closedGroups.length} 条关闭</span></div></section><aside className="ops-side-stack"><section className="action-panel"><div className="card-head"><div><h2>快捷操作</h2><p>常用现场工作</p></div></div><div className="ops-quick-grid"><button type="button" onClick={onCorridor}><span><Waypoints size={20} /></span>关闭通道</button><button type="button" onClick={onNotice}><span><Megaphone size={20} /></span>发布通知</button><button type="button" onClick={onTicket}><span><Wrench size={20} /></span>创建工单</button><button type="button" onClick={() => onTab('map')}><span><RotateCcw size={20} /></span>地图版本</button></div></section><section className="attention-panel"><div className="card-head"><div><h2>现场核验</h2><p>地图发布前逐项完成</p></div><span className="count-badge">5</span></div><button type="button" onClick={() => onTab('map')}><TriangleAlert size={17} /><span><strong>双人现场复核</strong><small>朝向、楼层、连接、无障碍与障碍物</small></span><ChevronRight size={16} /></button><button type="button" onClick={() => onTab('map')}><Layers3 size={17} /><span><strong>版本发布状态</strong><small>{mapStatus === 'published' ? '当前版本已发布' : mapStatus === 'review' ? '等待完整复核' : '尚未提交复核'}</small></span><ChevronRight size={16} /></button><button type="button" onClick={() => onTab('map')}><ClipboardCheck size={17} /><span><strong>现场变化复查</strong><small>桌椅、围栏与排队线</small></span><ChevronRight size={16} /></button></section></aside></div><div className="ops-lower-grid"><section className="panel-card"><div className="card-head"><div><h2>工单调度</h2><p>{activeTickets.length ? `${activeTickets.length} 张待处理` : '暂无待处理工单'}</p></div><button type="button" onClick={() => onTab('tickets')}>查看队列</button></div>{activeTickets.length ? <div className="ticket-list compact">{activeTickets.slice(0, 3).map((ticket) => <article key={ticket.id}><span className="ticket-icon"><Wrench size={20} /></span><div><small>{ticket.priority} · {ticket.location}</small><strong>{ticket.category}</strong><p>{ticket.description}</p></div><span className="status-pill draft">{ticket.status}</span></article>)}</div> : <div className="empty-inline"><Wrench size={27} /><div><strong>现场服务队列为空</strong><p>新工单会按紧急度和位置进入调度队列。</p></div></div>}</section><section className="panel-card"><div className="card-head"><div><h2>服务状态</h2><p>以当前保存状态为准</p></div><span className={`status-pill ${mapStatus === 'published' ? 'published' : 'review'}`}>{mapStatus === 'published' ? '导航开放' : '待复核'}</span></div><div className="service-status-grid"><div><span className={mapStatus === 'published' ? 'live-dot' : 'state-dot pending'} /><strong>地图数据</strong><small>{mapStatus === 'published' ? '已发布' : '待复核'}</small></div><div><span className={mapStatus === 'published' ? 'live-dot' : 'state-dot pending'} /><strong>路线服务</strong><small>{mapStatus === 'published' ? '已开放' : '未开放'}</small></div><div><span className={notices.length ? 'live-dot' : 'state-dot pending'} /><strong>通知记录</strong><small>{notices.length ? `${notices.length} 条` : '暂无'}</small></div></div></section></div></section>;
}

function MapManagement({ closedGroups, reviewState, verifications, canReview, reviewCount, graphValidation, onReview, onToggleVerification, onPublish, notify }: { closedGroups: ClosedGroup[]; reviewState: OpsState['mapStatus']; verifications: MapFieldChecks; canReview: boolean; reviewCount: number; graphValidation: { valid: boolean; issues: string[] }; onReview: () => void; onToggleVerification: (key: keyof MapFieldChecks) => void; onPublish: () => void; notify: (message: string, type?: NonNullable<ToastState>['type']) => void }) {
  const [layer, setLayer] = useState<'all' | 'base' | 'zones' | 'routes' | 'anchors'>('all');
  const checks: Array<{ key: keyof MapFieldChecks; title: string; note: string }> = [
    { key: 'orientation', title: '朝向与通口命名', note: '逐一核对现场标识' },
    { key: 'floor', title: '楼层名称', note: '核对楼层与主会场名称' },
    { key: 'connections', title: '通道连接与净空', note: '逐段走查接入点与柱位' },
    { key: 'accessibility', title: '无障碍条件', note: '核对门宽、坡道与通道净宽' },
    { key: 'obstacles', title: '临时障碍', note: '核对桌椅、围栏与排队线' },
  ];
  const verifiedCount = Object.values(verifications).filter(Boolean).length;
  const statusLabel = reviewState === 'published' ? '已发布' : reviewState === 'review' ? '等待审核' : '草稿';
  const readiness = Math.round(((verifiedCount + Math.min(reviewCount, 2) + (graphValidation.valid ? 1 : 0)) / 8) * 100);
  return <section>
    <PageHeading eyebrow="地图版本与通行图" title="地图与路线" description="发布前必须完成图形校验和两名管理员的独立现场复核。" action={reviewState === 'draft' ? <button className="primary heading-primary" type="button" onClick={onReview}><Send size={17} />提交现场复核</button> : <span className={`status-pill ${reviewState === 'published' ? 'published' : 'review'}`}>{statusLabel}</span>} />
    <div className="map-editor-layout">
      <aside className="layer-panel"><div className="card-head"><div><h2>图层</h2><p>主会场 · {venue.mapVersion}</p></div><SlidersHorizontal size={18} /></div>{([['all', '全部图层', Layers3], ['base', '场馆边界与柱', Map], ['zones', '区域与设施', Building2], ['routes', '待核验通行图', GitBranch], ['anchors', '入口、出口与锚点', MapPin]] as const).map(([id, label, Icon]) => { const LayerIcon = Icon as typeof Map; return <button className={layer === id ? 'active' : ''} key={id} type="button" onClick={() => setLayer(id)}><LayerIcon size={18} />{label}<span className="visibility-dot" /></button>; })}<div className="layer-footer"><span className={`status-pill ${reviewState === 'published' ? 'published' : reviewState === 'review' ? 'review' : 'draft'}`}>{statusLabel}</span></div></aside>
      <section className="editor-surface"><div className="editor-toolbar"><div><span className={`status-pill ${graphValidation.valid ? 'published' : 'review'}`}>{graphValidation.valid ? '图形校验通过' : '图形校验未通过'}</span></div><div><button type="button" onClick={() => notify(graphValidation.valid ? '边界、节点引用与静态连通性校验通过' : graphValidation.issues[0] ?? '图形校验未通过', graphValidation.valid ? 'success' : 'warning')}><RefreshCw size={17} />查看校验结果</button></div></div><VenueMap closedGroups={closedGroups} showEditorGrid visibleLayer={layer} /><div className="editor-footer"><span>宽 226.8 m</span><span>高 33.2 m</span><span>单位：米</span><span>通行线仅在现场双人复核后发布</span></div></section>
      <aside className="validation-panel"><div className="card-head"><div><h2>现场复核</h2><p>{verifiedCount}/5 本人完成 · {reviewCount}/2 人完整复核</p></div>{verifiedCount === 5 ? <CheckCircle2 size={19} /> : <TriangleAlert size={19} />}</div><div className="validation-score"><strong>{readiness}</strong><span>发布准备度</span><i><b style={{ width: `${readiness}%` }} /></i></div><ul><li className={graphValidation.valid ? 'pass' : ''}>{graphValidation.valid ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}<span><strong>自动图形校验</strong><small>{graphValidation.valid ? '边界、引用与静态连通性通过' : graphValidation.issues[0] ?? '等待校验'}</small></span></li>{checks.map((check) => <li className={verifications[check.key] ? 'pass' : ''} key={check.key}><button type="button" disabled={!canReview} onClick={() => onToggleVerification(check.key)}>{verifications[check.key] ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}<span><strong>{check.title}</strong><small>{canReview ? verifications[check.key] ? '本人已现场确认' : check.note : '提交人不能复核同一版本'}</small></span></button></li>)}</ul><div className="approval-note"><ShieldCheck size={17} />{canReview ? '两名不同管理员均完成五项现场复核后，服务端才允许发布。' : '您提交了当前版本，请由另外两名管理员分别完成现场复核。'}</div><button className="primary-wide" type="button" onClick={onPublish} disabled={!graphValidation.valid || verifiedCount !== 5 || reviewCount < 2 || reviewState === 'published'}><ShieldCheck size={17} />{reviewState === 'published' ? '当前版本已发布' : reviewCount < 2 ? '等待第二人复核' : '发布地图'}</button></aside>
    </div>
  </section>;
}

function CatalogManagement({ openPlaceIds, onToggle }: { openPlaceIds: string[]; onToggle: (placeId: string) => void }) {
  const [query, setQuery] = useState('');
  const manageablePlaces = places.filter((place) => place.kind !== 'gate');
  const filtered = manageablePlaces.filter((place) => [place.name, place.code, place.category, place.zone].join(' ').includes(query.trim()));
  const openCount = manageablePlaces.filter((place) => openPlaceIds.includes(place.id)).length;
  return <section><PageHeading eyebrow="区域、服务与活动主数据" title="地点开放状态" description="只有经运营确认开放的地点才会进入观众搜索、导航和行程。" /><div className="catalog-summary"><article><Building2 size={22} /><span><small>全部地点</small><strong>{manageablePlaces.length}</strong></span></article><article><CheckCircle2 size={22} /><span><small>已确认开放</small><strong>{openCount}</strong></span></article><article><CircleAlert size={22} /><span><small>待确认</small><strong>{manageablePlaces.length - openCount}</strong></span></article></div><section className="panel-card catalog-table"><div className="table-toolbar"><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或场馆标识" /></label></div><div className="data-table"><div className="table-head"><span>名称</span><span>标识</span><span>类型</span><span>位置</span><span>状态</span><span /></div>{filtered.map((place) => { const open = openPlaceIds.includes(place.id); return <div className="table-row" key={place.id}><span><MapPin size={17} /><strong>{place.name}</strong></span><span>{place.code}</span><span>{place.category}</span><span>{place.zone}</span><span className={`status-pill ${open ? 'published' : 'review'}`}>{open ? '已确认开放' : '待现场确认'}</span><button type="button" onClick={() => onToggle(place.id)} aria-label={open ? '暂停推荐' : '确认开放'}>{open ? '暂停' : '开放'}</button></div>; })}</div></section></section>;
}

function LiveOperations({ closedGroups, mapStatus, onCorridor }: { closedGroups: ClosedGroup[]; mapStatus: OpsState['mapStatus']; onCorridor: () => void }) {
  return <section><PageHeading eyebrow="通道与设施状态" title="实时现场" description="状态变化会写入现场状态，并作用于观众端后续路线。" action={<button className="primary heading-primary" type="button" onClick={onCorridor}><Waypoints size={17} />更新通道</button>} /><div className="live-layout"><section className="map-operations-card"><div className="card-head"><div><h2>现场通行状态</h2><p>{mapStatus === 'published' ? '地图已发布' : '地图尚未发布'}</p></div><span className={closedGroups.length ? 'status-pill review' : mapStatus === 'published' ? 'status-pill published' : 'status-pill draft'}>{closedGroups.length ? `${closedGroups.length} 条关闭` : mapStatus === 'published' ? '暂无关闭' : '等待复核'}</span></div><VenueMap closedGroups={closedGroups} /><div className="map-legend"><span><i className="open" />未关闭</span><span><i className="closed" />临时关闭</span><span><i className="restricted" />动态区域</span></div></section><aside className="live-side"><section className="panel-card"><div className="card-head"><div><h2>导航发布状态</h2><p>当前地图版本</p></div></div><div className="impact-zero"><ShieldCheck size={28} /><strong>{mapStatus === 'published' ? '导航已开放' : '导航尚未开放'}</strong><p>{mapStatus === 'published' ? '观众端仅使用当前已发布版本。' : '完成双人现场复核并发布后，观众端才显示路线。'}</p></div></section><section className="panel-card corridor-list"><div className="card-head"><div><h2>主疏散通道</h2><p>2 条</p></div></div>{([['north-main', '上侧主疏散通道'], ['south-main', '下侧主疏散通道']] as const).map(([id, label]) => <div key={id}><span className={closedGroups.includes(id) ? 'state-dot closed' : 'state-dot pending'} /><span><strong>{label}</strong><small>{closedGroups.includes(id) ? '临时关闭' : mapStatus === 'published' ? '未关闭' : '待现场复核'}</small></span><button type="button" onClick={onCorridor}>管理</button></div>)}</section></aside></div></section>;
}

function NoticesView({ notices, onCreate }: { notices: Notice[]; onCreate: () => void }) {
  return <section><PageHeading eyebrow="观众消息" title="通知" description="向全体观众发布现场变化与行动提示。" action={<button className="primary heading-primary" type="button" onClick={onCreate}><Plus size={17} />发布通知</button>} />{notices.length ? <div className="notice-list">{notices.map((notice) => <article key={notice.id}><span className="notice-icon"><Megaphone size={20} /></span><div><small>{notice.createdAt} · {notice.audience}</small><strong>{notice.title}</strong><p>{notice.content}</p></div><span className="status-pill published">{notice.status}</span></article>)}</div> : <div className="large-empty portal-empty"><span><Megaphone size={31} /></span><h1>暂无已发布通知</h1><p>发布后的现场提醒会显示在观众端消息中心。</p><button type="button" onClick={onCreate}>发布第一条通知</button></div>}</section>;
}

function TicketDispatch({ tickets, onCreate, onAdvance }: { tickets: OpsTicket[]; onCreate: () => void; onAdvance: (ticketId: string) => void }) {
  const columns = [
    { status: '待分派', next: '接单' },
    { status: '处理中', next: '提交确认' },
    { status: '待确认', next: '完成' },
    { status: '已完成', next: '' },
  ];
  return <section><PageHeading eyebrow="现场服务闭环" title="工单调度" description="按位置与紧急度处理，并记录每次状态变化。" action={<button className="primary heading-primary" type="button" onClick={onCreate}><Plus size={17} />创建工单</button>} />{tickets.length ? <div className="ticket-board">{columns.map((column) => { const items = tickets.filter((ticket) => ticket.status === column.status); return <div className={`board-column ${items.length ? '' : 'empty'}`} key={column.status}><header><span>{column.status}</span><b>{items.length}</b></header>{items.length ? items.map((ticket) => <article key={ticket.id}><div><small>{ticket.priority} · {ticket.source === 'exhibitor' ? '展商提交' : '运营创建'}</small><strong>{ticket.category}</strong><p><MapPin size={14} />{ticket.location}</p><small>{ticket.description}</small></div>{column.next && <button type="button" onClick={() => onAdvance(ticket.id)}>{column.next}</button>}</article>) : <div><ClipboardCheck size={25} /><p>当前没有{column.status}工单</p></div>}</div>; })}</div> : <div className="large-empty portal-empty"><span><Wrench size={31} /></span><h1>现场服务队列为空</h1><p>新工单将按紧急度和位置进入调度队列。</p><button type="button" onClick={onCreate}>创建工单</button></div>}</section>;
}

type AnalyticsMetric = { value: number | null; suppressed: boolean };
type OperationsAnalytics = {
  range: { label: string; since: string; until: string };
  metrics: Record<'active_sessions' | 'searches' | 'no_result_searches' | 'booth_views' | 'routes_started' | 'arrivals' | 'reservations', AnalyticsMetric>;
  keywords: Array<{ keyword: string; total: number }>;
};

function OperationsAnalyticsView() {
  const [analytics, setAnalytics] = useState<OperationsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/ops/analytics', { cache: 'no-store' });
      const payload = await response.json() as { analytics?: OperationsAnalytics; message?: string };
      if (!response.ok || !payload.analytics) throw new Error(payload.message ?? '分析数据加载失败');
      setAnalytics(payload.analytics);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '分析数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (loading) return <section><PageHeading eyebrow="匿名聚合数据" title="分析" description="汇总最近 24 小时的观众操作。" /><div className="large-empty portal-empty"><span><BarChart3 size={31} /></span><h1>正在汇总数据</h1></div></section>;
  if (!analytics) return <section><PageHeading eyebrow="匿名聚合数据" title="分析" description="汇总最近 24 小时的观众操作。" /><div className="large-empty portal-empty"><span><BarChart3 size={31} /></span><h1>暂时无法加载分析</h1><p>{message}</p><button type="button" onClick={() => { setLoading(true); void load(); }}>重新加载</button></div></section>;
  const cards = [
    ['active_sessions', '活跃会话', '去重匿名会话', Users],
    ['searches', '搜索提交', '操作次数', Search],
    ['no_result_searches', '无结果搜索', '操作次数', CircleAlert],
    ['booth_views', '详情浏览', '操作次数', Building2],
    ['routes_started', '启动导航', '操作次数', Waypoints],
    ['arrivals', '确认到达', '操作次数', MapPin],
    ['reservations', '活动预约', '成功创建', ClipboardCheck],
  ] as const;
  return <section><PageHeading eyebrow="匿名聚合数据" title="分析" description="汇总观众发现、规划、导航与预约行为，不展示个人轨迹。" /><div className="analytics-range"><BarChart3 size={17} /><span><strong>{analytics.range.label}</strong><small>{new Date(analytics.range.until).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} 更新 · 除活跃会话外均为操作次数</small></span></div><div className="metric-grid analytics-metrics">{cards.map(([key, label, note, Icon]) => <article key={key}><div><span>{label}</span><small>{note}</small></div><strong>{analytics.metrics[key].value ?? '已保护'}</strong><Icon size={20} /></article>)}</div><div className="content-grid two-one analytics-lower"><section className="panel-card"><div className="card-head"><div><h2>观众操作漏斗</h2><p>同一会话可能产生多次操作</p></div></div><div className="ops-funnel">{cards.slice(3).map(([key, label], index) => <div key={key}><span>{index + 1}</span><strong>{label}</strong><b>{analytics.metrics[key].value ?? '已保护'}</b></div>)}</div></section><aside className="panel-card"><div className="card-head"><div><h2>热门搜索词</h2><p>至少出现 3 次才显示</p></div></div>{analytics.keywords.length ? <ol className="keyword-list">{analytics.keywords.map((item) => <li key={item.keyword}><span>{item.keyword}</span><strong>{item.total}</strong></li>)}</ol> : <div className="empty-inline analytics-empty"><Search size={25} /><div><strong>暂无可展示搜索词</strong><p>达到最小聚合数量后显示。</p></div></div>}</aside></div></section>;
}

type AuditEntry = { id: string; actor_label: string; action: string; changed_fields: string[]; created_at: string };
const auditFieldLabels: Record<string, string> = {
  boothTitle: '展位标题', intro: '展位简介', tags: '展位标签', profileStatus: '内容状态',
  receptionStatus: '接待状态', reservationsEnabled: '预约开关', activityStatus: '活动状态',
  activityTitle: '活动标题', activityStart: '活动时间', activityDuration: '活动时长', activityCapacity: '活动名额',
  closedGroups: '通道状态', notices: '观众通知', tickets: '服务工单', openPlaceIds: '地点开放状态',
  mapStatus: '地图发布状态', reviewedMapVersion: '地图版本', mapReviews: '现场复核', submittedBy: '提交人',
  members: '运营成员',
};
const auditActionLabels: Record<string, string> = {
  booth_profile_saved: '保存了展位内容草稿',
  booth_profile_submitted: '提交了展位内容审核',
  booth_profile_published: '发布了展位内容',
  reception_status_updated: '更新了现场接待状态',
  reservation_availability_updated: '更新了活动预约状态',
  program_session_saved: '保存了活动安排',
  program_session_status_updated: '更新了活动现场状态',
  exhibitor_service_ticket_received: '接收了展商服务工单',
  service_ticket_created: '创建了服务工单',
  service_ticket_status_updated: '更新了服务工单状态',
  notice_published: '发布了观众通知',
  activity_change_notice_published: '发布了活动变更通知',
  route_group_closed: '关闭了现场通道',
  route_group_reopened: '恢复了现场通道',
  map_review_submitted: '提交了地图现场复核',
  map_verification_updated: '更新了地图复核结果',
  map_version_published: '发布了场馆地图版本',
  place_availability_updated: '更新了地点开放状态',
  operations_member_invited: '邀请了场馆管理员',
  operations_member_joined: '场馆管理员已接受邀请',
};

function SystemSettingsView({ mapStatus }: { mapStatus: OpsState['mapStatus'] }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/api/v1/ops/audit', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<{ entries: AuditEntry[] }> : Promise.reject())
      .then((payload) => { if (active) setEntries(payload.entries); })
      .catch(() => { if (active) setMessage('操作记录加载失败，请刷新重试'); });
    return () => { active = false; };
  }, []);
  return <section><PageHeading eyebrow="运行规则与操作记录" title="系统设置" description="查看当前活动的发布门禁、隐私规则和最近操作。" /><div className="settings-grid system-rule-grid"><section className="panel-card settings-section"><ShieldCheck size={24} /><h2>地图发布</h2><p>必须由两名不同管理员完成五项现场复核。</p><span className={`status-pill ${mapStatus === 'published' ? 'published' : 'review'}`}>{mapStatus === 'published' ? '导航已开放' : '等待完整复核'}</span></section><section className="panel-card settings-section"><Users size={24} /><h2>观众隐私</h2><p>核心浏览保持匿名；预约时单独请求最小必要授权。</p><span className="status-pill published">最小化采集</span></section><section className="panel-card settings-section"><BarChart3 size={24} /><h2>分析保护</h2><p>分析使用匿名聚合数据，小样本不展示具体数值。</p><span className="status-pill published">聚合展示</span></section></div><section className="panel-card audit-panel"><div className="card-head"><div><h2>最近操作</h2><p>内容、地图、通知与工单的变更记录</p></div></div>{message ? <p className="form-message">{message}</p> : entries.length ? <div className="audit-list">{entries.map((entry) => <article key={entry.id}><span><ClipboardCheck size={18} /></span><div><strong>{auditActionLabels[entry.action] ?? '记录了一项运营变更'}</strong><p>{entry.changed_fields.length ? entry.changed_fields.map((field) => auditFieldLabels[field] ?? '相关信息').join('、') : '记录已保存'} · {entry.actor_label} · {new Date(entry.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p></div></article>)}</div> : <div className="table-empty compact"><ClipboardCheck size={29} /><h2>暂无操作记录</h2><p>首次保存内容或现场状态后会显示在这里。</p></div>}</section></section>;
}

function AccountsView() {
  const [members, setMembers] = useState<Array<{ user_id: string; email_snapshot: string; display_name: string }>>([]);
  const [pending, setPending] = useState<Array<{ id: string; email_normalized: string }>>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/api/v1/ops/members', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ members: typeof members; pending: typeof pending }> : Promise.reject()).then((payload) => { if (active) { setMembers(payload.members); setPending(payload.pending); } }).catch(() => { if (active) setMessage('成员列表加载失败，请刷新重试'); });
    return () => { active = false; };
  }, []);
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '');
    const response = await fetch('/api/v1/ops/members', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    const payload = await response.json() as { members?: typeof members; pending?: typeof pending; message?: string };
    if (!response.ok) return setMessage(payload.message ?? '邀请失败，请重试');
    setMembers(payload.members ?? []);
    setPending(payload.pending ?? []);
    setMessage('邀请已创建，对方登录后将绑定场馆管理员角色');
    event.currentTarget.reset();
  }
  return <section><PageHeading eyebrow="最小权限与审计" title="账号权限" description="场馆管理员可独立复核地图；同一账号不能替代第二位复核人。" /><div className="content-grid two-one"><section className="panel-card"><div className="card-head"><div><h2>运营成员</h2><p>{members.length} 名已绑定 · {pending.length} 个待接受邀请</p></div></div>{members.map((member) => <div className="member-row" key={member.user_id}><span className="member-avatar">运</span><div><strong>{member.display_name}</strong><p>{member.email_snapshot} · 场馆管理员</p></div><span className="status-pill published">已启用</span></div>)}{pending.map((invite) => <div className="member-row" key={invite.id}><span className="member-avatar">待</span><div><strong>{invite.email_normalized}</strong><p>等待该账号登录接受绑定</p></div><span className="status-pill review">待接受</span></div>)}</section><aside className="panel-card permission-card"><ShieldCheck size={25} /><h2>邀请场馆管理员</h2><form className="invite-form" onSubmit={invite}><label><span>账号邮箱</span><input name="email" type="email" required placeholder="name@example.com" /></label><button className="primary-wide" type="submit"><Plus size={17} />发送邀请</button></form>{message && <p className="form-message">{message}</p>}</aside></div></section>;
}
