'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Navigation,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  TicketCheck,
  Users,
  Wrench,
} from 'lucide-react';
import Brand from '@/components/Brand';
import LogoutButton from '@/components/LogoutButton';
import Modal from '@/components/Modal';
import Toast, { type ToastState } from '@/components/Toast';
import { protectedJsonHeaders } from '@/lib/csrf';
import { defaultExhibitorState, type ExhibitorState, type ExhibitorTicket as Ticket } from '@/lib/state-types';

type Tab = 'dashboard' | 'booth' | 'visitors' | 'activities' | 'tickets' | 'analytics' | 'team';

const nav: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { id: 'booth', label: '我的展位', icon: Building2 },
  { id: 'visitors', label: '预约与访客', icon: Users },
  { id: 'activities', label: '活动', icon: CalendarDays },
  { id: 'tickets', label: '场馆服务', icon: Wrench },
  { id: 'analytics', label: '数据分析', icon: BarChart3 },
  { id: 'team', label: '团队与设置', icon: Settings },
];

export default function ExhibitorPortal({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [profileStatus, setProfileStatus] = useState<'draft' | 'review' | 'published'>('draft');
  const [boothTitle, setBoothTitle] = useState('硬件机器人开发区');
  const [intro, setIntro] = useState('面向参赛团队提供硬件机器人开发协作空间与专线网络支持。');
  const [tags, setTags] = useState('机器人, 硬件开发, 专线网络');
  const [receptionStatus, setReceptionStatus] = useState<ExhibitorState['receptionStatus']>('pending');
  const [reservationsEnabled, setReservationsEnabled] = useState(false);
  const [activityStatus, setActivityStatus] = useState<ExhibitorState['activityStatus']>('draft');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityStart, setActivityStart] = useState('');
  const [activityDuration, setActivityDuration] = useState(30);
  const [activityCapacity, setActivityCapacity] = useState(0);
  const [activityLanguage, setActivityLanguage] = useState('中文');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/v1/exhibitor/state', { cache: 'no-store' });
        if (!response.ok) throw new Error('load_failed');
        const payload = await response.json() as { value: ExhibitorState };
        if (!active) return;
        setProfileStatus(payload.value.profileStatus);
        setBoothTitle(payload.value.boothTitle);
        setIntro(payload.value.intro);
        setTags(payload.value.tags);
        setReceptionStatus(payload.value.receptionStatus);
        setReservationsEnabled(payload.value.reservationsEnabled);
        setActivityStatus(payload.value.activityStatus);
        setActivityTitle(payload.value.activityTitle);
        setActivityStart(payload.value.activityStart);
        setActivityDuration(payload.value.activityDuration);
        setActivityCapacity(payload.value.activityCapacity);
        setActivityLanguage(payload.value.activityLanguage);
        setTickets(payload.value.tickets);
      } catch {
        if (active && process.env.NODE_ENV !== 'development') setToast({ message: '无法加载最新展位数据，请刷新重试', type: 'warning' });
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  function notify(message: string, type: NonNullable<ToastState>['type'] = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3300);
  }

  function snapshot(overrides: Partial<ExhibitorState> = {}): ExhibitorState {
    return { ...defaultExhibitorState, profileStatus, boothTitle, intro, tags, receptionStatus, reservationsEnabled, activityStatus, activityTitle, activityStart, activityDuration, activityCapacity, activityLanguage, tickets, ...overrides };
  }

  async function saveState(next: ExhibitorState, action: string) {
    try {
      const response = await fetch('/api/v1/exhibitor/state', { method: 'PUT', headers: protectedJsonHeaders(), body: JSON.stringify({ state: next, action }) });
      if (!response.ok) {
        const responseBody = await response.text();
        let errorMessage = responseBody.trim();
        try {
          const parsed = JSON.parse(responseBody) as { message?: unknown };
          if (typeof parsed.message === 'string' && parsed.message) errorMessage = parsed.message;
        } catch {}
        throw new Error(errorMessage || '保存失败');
      }
      const payload = await response.json() as { value: ExhibitorState };
      return payload.value;
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存失败，请重试', 'warning');
      return null;
    }
  }

  async function saveProfile(nextStatus: ExhibitorState['profileStatus']) {
    const next = snapshot({ profileStatus: nextStatus });
    if (!await saveState(next, nextStatus === 'review' ? 'booth_profile_submitted' : 'booth_profile_saved')) return;
    setProfileStatus(nextStatus);
    notify(nextStatus === 'review' ? '内容已提交审核' : '草稿已保存');
  }

  async function updateSetting<K extends 'receptionStatus' | 'reservationsEnabled' | 'activityStatus'>(key: K, value: ExhibitorState[K], action: string, successMessage: string) {
    if (!await saveState(snapshot({ [key]: value }), action)) return;
    if (key === 'receptionStatus') setReceptionStatus(value as ExhibitorState['receptionStatus']);
    if (key === 'reservationsEnabled') setReservationsEnabled(value as boolean);
    if (key === 'activityStatus') setActivityStatus(value as ExhibitorState['activityStatus']);
    notify(successMessage, value === 'cancelled' || value === 'delayed' ? 'warning' : 'success');
  }

  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = snapshot({
      activityTitle: String(form.get('activityTitle') ?? '').trim(),
      activityStart: String(form.get('activityStart') ?? ''),
      activityDuration: Number(form.get('activityDuration')),
      activityCapacity: Number(form.get('activityCapacity')),
      activityLanguage: String(form.get('activityLanguage') ?? '中文'),
      activityStatus: 'confirmed',
    });
    if (!next.activityTitle || !next.activityStart) {
      notify('请填写活动名称与开始时间', 'warning');
      return;
    }
    const saved = await saveState(next, 'program_session_saved');
    if (!saved) return;
    setActivityTitle(saved.activityTitle);
    setActivityStart(saved.activityStart);
    setActivityDuration(saved.activityDuration);
    setActivityCapacity(saved.activityCapacity);
    setActivityLanguage(saved.activityLanguage);
    setActivityStatus(saved.activityStatus);
    notify('活动安排已保存');
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ticket: Ticket = {
      id: crypto.randomUUID(),
      category: String(form.get('category')),
      priority: String(form.get('priority')),
      description: String(form.get('description')),
      status: '已提交',
      createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      location: '项目开发区 · 硬件机器人开发区',
    };
    const nextTickets = [ticket, ...tickets];
    const saved = await saveState(snapshot({ tickets: nextTickets }), 'service_ticket_created');
    if (!saved) return;
    setTickets(saved.tickets);
    setTicketOpen(false);
    notify('工单已提交，场馆服务人员将尽快受理');
  }

  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <Brand href="/exhibitor" />
        <div className="portal-role"><span><Building2 size={18} /></span><div><small>参展商工作台</small><strong>硬件机器人开发区</strong></div></div>
        <nav aria-label="参展商导航">{nav.map(({ id, label, icon: Icon }) => <button className={tab === id ? 'active' : ''} key={id} type="button" onClick={() => setTab(id)}><Icon size={19} />{label}</button>)}</nav>
        <div className="sidebar-help"><MessageSquareText size={20} /><strong>需要场馆协助？</strong><p>网络、电力、设备与物料问题都可以提交工单。</p><button type="button" onClick={() => setTicketOpen(true)}>提交工单</button></div>
        <Link className="back-to-visitor" href="/">返回观众端</Link>
      </aside>

      <section className="portal-main">
        <header className="portal-topbar"><div className="event-switcher"><small>当前展会</small><strong>千人黑客松 · 8月30日</strong></div><div className="topbar-actions"><div className="account-button"><span>展</span><div><strong>{displayName}</strong><small>展位管理员</small></div></div><LogoutButton compact /></div></header>
        <div className="portal-content">
          {tab === 'dashboard' && <ExhibitorDashboard onTab={setTab} onTicket={() => setTicketOpen(true)} profileStatus={profileStatus} receptionStatus={receptionStatus} activityStatus={activityStatus} activityTitle={activityTitle} activityStart={activityStart} activityDuration={activityDuration} ticketCount={tickets.length} />}
          {tab === 'booth' && (
            <section>
              <PageHeading eyebrow="展位内容" title="我的展位" description="观众将在搜索、详情和行程中看到已发布的内容。" action={<div className="heading-actions"><button type="button" onClick={() => saveProfile('draft')}><Save size={17} />保存草稿</button><button className="primary" type="button" onClick={() => saveProfile('review')}><Send size={17} />提交审核</button></div>} />
              <div className="content-grid two-one">
                <form className="editor-card" onSubmit={(event) => { event.preventDefault(); void saveProfile('draft'); }}>
                  <div className="card-head"><div><h2>公开内容</h2><p>带星号的内容将用于观众搜索与详情展示。</p></div><StatusPill status={profileStatus} /></div>
                  <label><span>展位标题 *</span><input value={boothTitle} onChange={(event) => { setBoothTitle(event.target.value); setProfileStatus('draft'); }} /></label>
                  <label><span>简介 *</span><textarea rows={5} value={intro} onChange={(event) => { setIntro(event.target.value); setProfileStatus('draft'); }} /><small>{intro.length}/300</small></label>
                  <label><span>标签</span><input value={tags} onChange={(event) => { setTags(event.target.value); setProfileStatus('draft'); }} /><small>用逗号分隔，建议 3–6 个</small></label>
                  <label><span>现场接待状态</span><select value={receptionStatus} onChange={(event) => void updateSetting('receptionStatus', event.target.value as ExhibitorState['receptionStatus'], 'reception_status_updated', '接待状态已更新')}><option value="pending">待设置</option><option value="open">可接待</option><option value="busy">繁忙</option><option value="closed">暂停接待</option></select></label>
                </form>
                <aside className="preview-stack"><div className="preview-card"><div className="card-head"><div><h2>观众端预览</h2><p>内容以发布版本为准</p></div><Eye size={18} /></div><div className="booth-preview-cover"><Building2 size={35} /></div><span className="category-tag">硬件</span><h3>{boothTitle || '请输入展位标题'}</h3><p>{intro || '请输入展位简介'}</p><div className="tag-list">{tags.split(',').filter(Boolean).map((tag) => <span key={tag}>{tag.trim()}</span>)}</div><div className="preview-location"><MapPin size={17} /><span><strong>项目开发区</strong><small>位置由场馆运营维护</small></span></div></div><div className="locked-card"><ShieldCheck size={21} /><div><strong>场地图形与入口已锁定</strong><p>如需调整物理位置或通道入口，请提交场馆服务工单。</p><button type="button" onClick={() => setTicketOpen(true)}>提交位置变更工单</button></div></div></aside>
              </div>
            </section>
          )}
          {tab === 'visitors' && <ReservationsView enabled={reservationsEnabled} activityConfigured={Boolean(activityTitle && activityStart && ['confirmed', 'delayed'].includes(activityStatus))} onGoActivity={() => setTab('activities')} onToggle={(enabled) => updateSetting('reservationsEnabled', enabled, 'reservation_availability_updated', enabled ? '活动预约已开放' : '活动预约已暂停')} />}
          {tab === 'activities' && <ActivitiesView status={activityStatus} title={activityTitle} start={activityStart} duration={activityDuration} capacity={activityCapacity} language={activityLanguage} onTitle={(value) => { setActivityTitle(value); setActivityStatus('draft'); }} onStart={(value) => { setActivityStart(value); setActivityStatus('draft'); }} onDuration={(value) => { setActivityDuration(value); setActivityStatus('draft'); }} onCapacity={(value) => { setActivityCapacity(value); setActivityStatus('draft'); }} onLanguage={(value) => { setActivityLanguage(value); setActivityStatus('draft'); }} onSave={saveActivity} onStatus={(status) => updateSetting('activityStatus', status, 'program_session_status_updated', status === 'confirmed' ? '活动状态已确认' : status === 'delayed' ? '活动已标记延迟' : '活动已取消')} />}
          {tab === 'tickets' && <TicketsView tickets={tickets} onCreate={() => setTicketOpen(true)} />}
          {tab === 'analytics' && <ExhibitorAnalyticsView />}
          {tab === 'team' && <TeamView displayName={displayName} />}
        </div>
      </section>

      <Modal open={ticketOpen} title="提交场馆服务工单" onClose={() => setTicketOpen(false)}>
        <form className="ticket-form" onSubmit={createTicket}><label><span>问题类型</span><select name="category" required><option value="网络">网络</option><option value="电力">电力</option><option value="设备">设备</option><option value="物料">物料</option><option value="清洁">清洁</option><option value="安保">安保</option><option value="位置变更">位置变更</option></select></label><div className="form-row"><label><span>位置</span><input value="项目开发区 · 硬件机器人开发区" readOnly /></label><label><span>紧急度</span><select name="priority"><option value="普通">普通</option><option value="紧急">紧急</option></select></label></div><label><span>问题描述</span><textarea name="description" rows={5} placeholder="请描述现场问题、影响范围和期望处理时间" required /></label><button className="primary-wide" type="submit"><Send size={18} />提交工单</button></form>
      </Modal>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function StatusPill({ status }: { status: 'draft' | 'review' | 'published' }) {
  const labels = { draft: '草稿', review: '审核中', published: '已发布' };
  return <span className={`status-pill ${status}`}>{labels[status]}</span>;
}

function formatActivityStart(value: string) {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: '' };
  return {
    date: new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date),
  };
}

function shanghaiDateTimeMinimum(now = new Date()) {
  const values: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)) values[part.type] = part.value;
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function ExhibitorDashboard({ onTab, onTicket, profileStatus, receptionStatus, activityStatus, activityTitle, activityStart, activityDuration, ticketCount }: { onTab: (tab: Tab) => void; onTicket: () => void; profileStatus: 'draft' | 'review' | 'published'; receptionStatus: ExhibitorState['receptionStatus']; activityStatus: ExhibitorState['activityStatus']; activityTitle: string; activityStart: string; activityDuration: number; ticketCount: number }) {
  const receptionLabel = { pending: '待设置', open: '可接待', busy: '繁忙', closed: '暂停接待' }[receptionStatus];
  const activityLabel = { draft: '待配置', confirmed: '已确认', delayed: '已延迟', cancelled: '已取消' }[activityStatus];
  const profileLabel = profileStatus === 'draft' ? '草稿' : profileStatus === 'review' ? '审核中' : '已发布';
  const activityDate = formatActivityStart(activityStart);
  const readiness = [profileStatus !== 'draft', receptionStatus !== 'pending', Boolean(activityTitle && activityStart && activityStatus !== 'draft')];
  const readinessCount = readiness.filter(Boolean).length;
  const metrics = [
    { label: '公开内容', value: profileLabel, note: '观众端资料', icon: FileText },
    { label: '接待状态', value: receptionLabel, note: '现场服务', icon: Building2 },
    { label: '活动安排', value: activityLabel, note: activityTitle || '尚未配置', icon: CalendarDays },
    { label: '服务工单', value: String(ticketCount), note: '已提交记录', icon: Wrench },
  ];
  return <section><PageHeading eyebrow="8月30日 · 展位准备" title="工作台" description="查看展位内容、活动安排与场馆服务进度。" action={<button className="primary heading-primary" type="button" onClick={onTicket}><Plus size={17} />提交工单</button>} /><div className="welcome-strip"><div><span className={receptionStatus === 'open' ? 'live-dot' : 'state-dot pending'} /><div><small>当前展位</small><strong>硬件机器人开发区</strong><p>项目开发区 · 位置由场馆运营维护</p></div></div><div className="strip-status"><span>接待状态</span><strong>{receptionLabel}</strong></div><button type="button" onClick={() => onTab('booth')}>管理展位 <ChevronRight size={16} /></button></div><div className="metric-grid">{metrics.map(({ label, value, note, icon: Icon }) => <article key={label}><div><span>{label}</span><small>{note}</small></div><strong>{value}</strong><Icon size={20} /></article>)}</div><div className="content-grid two-one"><section className="panel-card"><div className="card-head"><div><h2>活动安排</h2><p>{activityDate.date || '尚未设置时间'}</p></div><button type="button" onClick={() => onTab('activities')}>管理活动</button></div>{activityTitle && activityStart ? <div className="schedule-row"><time><strong>{activityDate.time}</strong><small>开始</small></time><span /><div><strong>{activityTitle}</strong><p>规划时长 {activityDuration} 分钟 · 项目开发区</p></div><span className={activityStatus === 'confirmed' ? 'status-pill published' : 'status-pill review'}>{activityLabel}</span></div> : <div className="empty-inline"><CalendarDays size={27} /><div><strong>尚未配置活动</strong><p>填写活动名称与开始时间后即可保存。</p></div></div>}</section><aside className="dashboard-column"><section className="readiness-card"><div className="readiness-head"><span><CheckCircle2 size={21} /></span><div><small>公开准备</small><strong>{readinessCount} / 3 项</strong></div></div><div className="readiness-bar"><span style={{ width: `${Math.round(readinessCount / 3 * 100)}%` }} /></div><ul><li className={readiness[0] ? 'done' : ''}>{readiness[0] ? <CheckCircle2 size={16} /> : <FileText size={16} />}公开内容已提交</li><li className={readiness[1] ? 'done' : ''}>{readiness[1] ? <CheckCircle2 size={16} /> : <Building2 size={16} />}接待状态已设置</li><li className={readiness[2] ? 'done' : ''}>{readiness[2] ? <CheckCircle2 size={16} /> : <CalendarDays size={16} />}活动安排已确认</li></ul><button type="button" onClick={() => onTab(readiness[0] && readiness[1] ? 'activities' : 'booth')}>继续完善</button></section><section className="profile-state-card"><div><FileText size={20} /><span><small>公开内容</small><strong>{profileStatus === 'draft' ? '草稿待提交' : profileStatus === 'review' ? '等待审核' : '已发布'}</strong></span></div><button type="button" onClick={() => onTab('booth')}>查看</button></section></aside></div></section>;
}

type BoothReservation = {
  id: string;
  email_snapshot: string | null;
  display_name: string;
  activity_title: string;
  slot_start_at: string;
  arrival_time: string;
  attendee_note: string;
  status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';
};

const reservationStatusLabels: Record<BoothReservation['status'], string> = {
  pending: '待确认',
  confirmed: '已确认',
  arrived: '已到达',
  completed: '已完成',
  no_show: '未到场',
  cancelled: '已取消',
};

function ReservationsView({ enabled, activityConfigured, onGoActivity, onToggle }: { enabled: boolean; activityConfigured: boolean; onGoActivity: () => void; onToggle: (enabled: boolean) => Promise<void> | void }) {
  const [reservations, setReservations] = useState<BoothReservation[]>([]);
  const [filter, setFilter] = useState<'all' | BoothReservation['status']>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [message, setMessage] = useState('');

  const loadReservations = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/exhibitor/reservations', { cache: 'no-store' });
      const payload = await response.json() as { reservations?: BoothReservation[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? '预约记录加载失败');
      setReservations(payload.reservations ?? []);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '预约记录加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReservations(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReservations]);

  async function updateReservation(id: string, status: BoothReservation['status']) {
    setUpdatingId(id);
    setMessage('');
    try {
      const response = await fetch('/api/v1/exhibitor/reservations', { method: 'PATCH', headers: protectedJsonHeaders(), body: JSON.stringify({ reservation_id: id, status }) });
      const payload = await response.json() as { reservations?: BoothReservation[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? '预约状态更新失败');
      setReservations(payload.reservations ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '预约状态更新失败');
    } finally {
      setUpdatingId('');
    }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const visibleReservations = reservations.filter((item) => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesQuery = !normalizedQuery || `${item.display_name} ${item.email_snapshot ?? ''} ${item.activity_title}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });
  const pendingCount = reservations.filter((item) => item.status === 'pending').length;
  const confirmedCount = reservations.filter((item) => item.status === 'confirmed').length;
  const completedCount = reservations.filter((item) => item.status === 'completed').length;

  return <section><PageHeading eyebrow="活动接待" title="预约与访客" description="确认活动预约并跟进到场状态。" action={<div className="heading-actions"><button type="button" onClick={onGoActivity}><CalendarDays size={17} />活动安排</button><button className={enabled ? '' : 'primary'} type="button" disabled={!activityConfigured && !enabled} onClick={() => void onToggle(!enabled)}>{enabled ? '暂停预约' : '开放预约'}</button></div>} />{!activityConfigured && <div className="policy-banner reservation-policy"><CalendarDays size={20} /><div><strong>请先确认活动安排</strong><p>活动名称与开始时间确认后，才可向观众开放预约。</p></div><button type="button" onClick={onGoActivity}>前往设置</button></div>}<div className="metric-grid reservation-metrics"><article><div><span>全部预约</span><small>当前活动记录</small></div><strong>{reservations.length}</strong><Users size={20} /></article><article><div><span>待确认</span><small>需要处理</small></div><strong>{pendingCount}</strong><Clock3 size={20} /></article><article><div><span>已确认</span><small>等待到场</small></div><strong>{confirmedCount}</strong><TicketCheck size={20} /></article><article><div><span>已完成</span><small>已完成接待</small></div><strong>{completedCount}</strong><CheckCircle2 size={20} /></article></div><section className="panel-card reservation-management"><div className="table-toolbar"><div className="filter-tabs" aria-label="预约状态筛选">{([['all', '全部'], ['pending', '待确认'], ['confirmed', '已确认'], ['arrived', '已到达'], ['no_show', '未到场'], ['completed', '已完成']] as const).map(([value, label]) => <button className={filter === value ? 'active' : ''} key={value} type="button" onClick={() => setFilter(value)}>{label}</button>)}</div><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或账号邮箱" aria-label="搜索预约" /></label></div>{message && <p className="form-message">{message}</p>}{loading ? <div className="table-empty compact"><Users size={29} /><h2>正在加载预约</h2></div> : visibleReservations.length ? <div className="booth-reservation-list">{visibleReservations.map((item) => <article key={item.id}><span className="visitor-avatar">{(item.display_name || '访').slice(0, 1)}</span><div><strong>{item.display_name || '已授权访客'}</strong><p>{item.email_snapshot?.trim() || '联系方式已脱敏'}</p><small>{item.activity_title} · {new Date(item.slot_start_at).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</small>{item.arrival_time && <small>预计 {item.arrival_time} 到达</small>}{item.attendee_note && <small>接待备注：{item.attendee_note}</small>}</div><span className={`status-pill ${item.status === 'confirmed' || item.status === 'arrived' || item.status === 'completed' ? 'published' : item.status === 'cancelled' ? 'cancelled' : 'review'}`}>{reservationStatusLabels[item.status]}</span><div className="reservation-row-actions">{item.status === 'pending' && <button type="button" disabled={updatingId === item.id} onClick={() => void updateReservation(item.id, 'confirmed')}>确认</button>}{item.status === 'confirmed' && <><button type="button" disabled={updatingId === item.id} onClick={() => void updateReservation(item.id, 'arrived')}>到达</button><button type="button" disabled={updatingId === item.id} onClick={() => void updateReservation(item.id, 'no_show')}>未到场</button></>}{item.status === 'arrived' && <button type="button" disabled={updatingId === item.id} onClick={() => void updateReservation(item.id, 'completed')}>完成</button>}{['pending', 'confirmed'].includes(item.status) && <button className="danger-outline" type="button" disabled={updatingId === item.id} onClick={() => void updateReservation(item.id, 'cancelled')}>取消</button>}</div></article>)}</div> : <div className="table-empty compact"><Users size={29} /><h2>{reservations.length ? '没有符合条件的预约' : '暂无预约记录'}</h2><p>{reservations.length ? '调整筛选条件或搜索内容。' : enabled ? '观众提交预约后将显示在这里。' : '开放预约后，观众可在活动详情中提交。'}</p></div>}</section><div className="privacy-note reservation-privacy"><ShieldCheck size={18} />姓名与账号邮箱仅用于本场活动确认与现场接待，活动结束 7 天后自动脱敏。</div></section>;
}

function ActivitiesView({ status, title, start, duration, capacity, language, onTitle, onStart, onDuration, onCapacity, onLanguage, onSave, onStatus }: { status: ExhibitorState['activityStatus']; title: string; start: string; duration: number; capacity: number; language: string; onTitle: (value: string) => void; onStart: (value: string) => void; onDuration: (value: number) => void; onCapacity: (value: number) => void; onLanguage: (value: string) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onStatus: (status: ExhibitorState['activityStatus']) => void }) {
  const labels = { draft: '草稿', confirmed: '已确认', delayed: '已延迟', cancelled: '已取消' };
  const formatted = formatActivityStart(start);
  const configured = Boolean(title.trim() && start);
  const [minimumStart, setMinimumStart] = useState('');

  useEffect(() => {
    const refresh = () => setMinimumStart(shanghaiDateTimeMinimum());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return <section><PageHeading eyebrow="演示与活动" title="活动管理" description="维护活动名称、开始时间、时长和现场状态。" /><div className="content-grid two-one"><form className="editor-card" onSubmit={onSave}><div className="card-head"><div><h2>活动安排</h2><p>保存后可继续更新现场状态。</p></div><span className={`status-pill ${status === 'confirmed' ? 'published' : status === 'draft' ? 'draft' : 'review'}`}>{labels[status]}</span></div><label><span>活动名称 *</span><input name="activityTitle" value={title} onChange={(event) => onTitle(event.target.value)} maxLength={100} required placeholder="例如：项目演示" /></label><label><span>开始时间 *</span><input name="activityStart" type="datetime-local" min={minimumStart || undefined} value={start} onChange={(event) => onStart(event.target.value)} required /></label><div className="form-row"><label><span>规划时长</span><select name="activityDuration" value={duration} onChange={(event) => onDuration(Number(event.target.value))}><option value="15">15 分钟</option><option value="30">30 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option><option value="90">90 分钟</option></select></label><label><span>现场容量</span><input name="activityCapacity" type="number" min="0" max="10000" value={capacity} onChange={(event) => onCapacity(Number(event.target.value))} /><small>不限制时填写 0</small></label></div><label><span>活动语言</span><select name="activityLanguage" value={language} onChange={(event) => onLanguage(event.target.value)}><option value="中文">中文</option><option value="英文">英文</option><option value="中英文">中英文</option></select></label><button className="primary-wide" type="submit"><Save size={18} />保存并确认活动</button></form><aside className="preview-stack">{configured ? <div className="activity-card"><div className="activity-date"><strong>{new Date(start).getDate()}</strong><span>{new Date(start).getMonth() + 1}月</span></div><div className="activity-main"><div><span className="category-tag">现场活动</span><h2>{title}</h2><p><Clock3 size={15} />{formatted.date} {formatted.time} · {duration} 分钟</p><p><MapPin size={15} />项目开发区 · {capacity > 0 ? `容量 ${capacity} 人` : '不限人数'} · {language}</p></div><span className={`status-pill ${status === 'confirmed' ? 'published' : status === 'draft' ? 'draft' : 'review'}`}>{labels[status]}</span></div>{status !== 'draft' && <div className="activity-actions"><button type="button" onClick={() => onStatus('confirmed')}>确认</button><button type="button" onClick={() => onStatus('delayed')}>标记延迟</button><button type="button" onClick={() => onStatus('cancelled')}>取消</button></div>}</div> : <div className="large-empty portal-empty"><span><CalendarDays size={31} /></span><h1>尚未配置活动</h1><p>填写活动名称与开始时间后保存。</p></div>}</aside></div></section>;
}

function TicketsView({ tickets, onCreate }: { tickets: Ticket[]; onCreate: () => void }) {
  return <section><PageHeading eyebrow="场馆支持" title="场馆服务" description="跟踪网络、电力、设备、物料与场地问题的处理进度。" action={<button className="primary heading-primary" type="button" onClick={onCreate}><Plus size={17} />提交工单</button>} />{tickets.length ? <div className="ticket-list">{tickets.map((ticket) => <article key={ticket.id}><span className="ticket-icon"><Wrench size={20} /></span><div><small>{ticket.id} · {ticket.createdAt}</small><strong>{ticket.category}</strong><p>{ticket.description}</p></div><span className="priority">{ticket.priority}</span><span className="status-pill draft">{ticket.status}</span><ChevronRight size={18} /></article>)}</div> : <div className="large-empty portal-empty"><span><Wrench size={31} /></span><h1>暂无服务工单</h1><p>需要网络、电力、物料或场地支持时，可以直接提交。</p><button type="button" onClick={onCreate}>提交第一张工单</button></div>}</section>;
}

type ProtectedMetric = { value: number | null; suppressed: boolean };
type ExhibitorAnalytics = {
  range: { label: string; since: string; until: string };
  funnel: Record<'booth_views' | 'itinerary_adds' | 'routes_started' | 'arrivals' | 'reservations', ProtectedMetric>;
};

function ExhibitorAnalyticsView() {
  const [analytics, setAnalytics] = useState<ExhibitorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/exhibitor/analytics', { cache: 'no-store' });
      const payload = await response.json() as { analytics?: ExhibitorAnalytics; message?: string };
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
  const steps = analytics ? [
    ['booth_views', '详情浏览', Eye],
    ['itinerary_adds', '加入行程', CalendarDays],
    ['routes_started', '启动导航', Navigation],
    ['arrivals', '确认到达', MapPin],
    ['reservations', '活动预约', TicketCheck],
  ] as const : [];
  return <section><PageHeading eyebrow="匿名聚合数据" title="数据分析" description="只统计本展位最近 24 小时的有效操作，不展示个人轨迹。" />{loading ? <div className="large-empty portal-empty"><span><BarChart3 size={31} /></span><h1>正在汇总数据</h1></div> : analytics ? <><div className="analytics-range"><Clock3 size={17} /><span><strong>{analytics.range.label}</strong><small>{new Date(analytics.range.until).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} 更新 · 每项为操作次数</small></span></div><section className="panel-card analytics-funnel"><div className="card-head"><div><h2>观众转化漏斗</h2><p>从详情浏览到活动预约</p></div></div>{steps.map(([key, label, Icon], index) => { const current = analytics.funnel[key]; return <article key={key}><span className="funnel-index">{index + 1}</span><Icon size={20} /><div><strong>{label}</strong><small>{current.suppressed ? '数据量较小时隐藏具体数值' : '本时间范围内的操作次数'}</small></div><b>{current.value === null ? '已保护' : current.value}</b></article>; })}</section><div className="privacy-note reservation-privacy"><ShieldCheck size={18} />当某项只有 1–2 条记录时隐藏具体数值，避免通过小样本推断个人行为。</div></> : <div className="large-empty portal-empty"><span><BarChart3 size={31} /></span><h1>暂时无法加载分析</h1><p>{message}</p><button type="button" onClick={() => { setLoading(true); void load(); }}>重新加载</button></div>}</section>;
}

function TeamView({ displayName }: { displayName: string }) {
  return <section><PageHeading eyebrow="成员与权限" title="团队与设置" description="成员只可访问所属组织与展位范围内的数据。" /><div className="content-grid two-one"><section className="panel-card"><div className="card-head"><div><h2>当前成员</h2><p>已绑定本展位</p></div></div><div className="member-row"><span className="member-avatar">展</span><div><strong>{displayName}</strong><p>展位管理员 · 本展位</p></div><span className="status-pill published">已启用</span></div></section><aside className="panel-card permission-card"><ShieldCheck size={25} /><h2>权限范围</h2><ul><li><CheckCircle2 size={16} />管理本展位公开内容</li><li><CheckCircle2 size={16} />管理活动与预约</li><li><CheckCircle2 size={16} />更新现场接待状态</li><li><CheckCircle2 size={16} />提交场馆服务工单</li></ul></aside></div></section>;
}
