'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, ChevronLeft, Clock3, ShieldCheck, Users } from 'lucide-react';
import Brand from '@/components/Brand';
import Modal from '@/components/Modal';
import { venue } from '@/lib/venue';

type Reservation = {
  id: string;
  activity_title: string;
  slot_start_at: string;
  status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';
  activity_status?: 'confirmed' | 'delayed' | 'cancelled' | null;
  change_message?: string | null;
  arrival_time: string;
  attendee_note: string;
};

type Offering = {
  placeId: string;
  boothTitle: string;
  title: string;
  start: string;
  duration: number;
  capacity: number;
  language: string;
  status: 'confirmed' | 'delayed' | 'cancelled';
};

const statusLabels = { pending: '待展商确认', confirmed: '已确认', arrived: '已到达', completed: '已完成', no_show: '未到场', cancelled: '已取消' };

type StoredItineraryStop = {
  time?: string;
  dwellMinutes?: number;
  state?: string;
};

function clockMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : null;
}

function shanghaiStartMinutes(value: string) {
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(value)) {
    const localTime = value.match(/T(\d{2}):(\d{2})/);
    return localTime ? Number(localTime[1]) * 60 + Number(localTime[2]) : null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(parsed)) parts[part.type] = part.value;
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function overlapsSavedItinerary(start: string, duration: number) {
  const reservationStart = shanghaiStartMinutes(start);
  if (reservationStart === null || !Number.isFinite(duration) || duration <= 0) return false;
  try {
    const saved = JSON.parse(window.localStorage.getItem('expo-visitor-state') ?? '{}') as { mapVersion?: string; itinerary?: StoredItineraryStop[] };
    if (saved.mapVersion !== venue.mapVersion || !Array.isArray(saved.itinerary)) return false;
    const reservationEnd = reservationStart + duration;
    return saved.itinerary.some((stop) => {
      if (stop.state === 'cancelled' || typeof stop.time !== 'string') return false;
      const stopStart = clockMinutes(stop.time);
      const stopDuration = Number(stop.dwellMinutes);
      if (stopStart === null || !Number.isFinite(stopDuration) || stopDuration <= 0) return false;
      return reservationStart < stopStart + stopDuration && reservationEnd > stopStart;
    });
  } catch {
    return false;
  }
}

export default function ReservationsClient({ displayName, placeId }: { displayName: string; placeId: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [attendeeNote, setAttendeeNote] = useState('');
  const [editError, setEditError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/reservations${placeId ? `?place_id=${encodeURIComponent(placeId)}` : ''}`, { cache: 'no-store' });
      const payload = await response.json() as { reservations?: Reservation[]; offering?: Offering | null; message?: string };
      if (!response.ok) throw new Error(payload.message ?? '预约信息加载失败');
      setReservations(payload.reservations ?? []);
      setOffering(payload.offering ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '预约信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function reserve() {
    if (!offering) return;
    setMessage('');
    if (overlapsSavedItinerary(offering.start, offering.duration)) {
      setMessage('预约时间与当前行程冲突，请先调整行程后再提交。');
      return;
    }
    try {
      const response = await fetch('/api/v1/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ place_id: offering.placeId, consent }) });
      const payload = await response.json() as { reservation?: Reservation; message?: string };
      if (!response.ok) return setMessage(payload.message ?? '预约失败，请重试');
      window.localStorage.setItem('expo-reservation-fixed', JSON.stringify({ placeId: offering.placeId, start: offering.start, duration: offering.duration, status: payload.reservation?.status ?? 'pending', mapVersion: venue.mapVersion }));
      setMessage('预约已提交，等待展商确认');
      setConsent(false);
      await load();
    } catch {
      setMessage('当前网络不可用，预约尚未提交，请联网后重试。');
    }
  }

  async function cancel(reservationId: string) {
    const cancelledReservation = reservations.find((item) => item.id === reservationId);
    try {
      const response = await fetch('/api/v1/reservations', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reservation_id: reservationId, action: 'cancel' }) });
      const payload = await response.json() as { reservations?: Reservation[]; message?: string };
      if (!response.ok) return setMessage(payload.message ?? '取消失败，请重试');
      if (cancelledReservation) {
        try {
          const fixed = JSON.parse(window.localStorage.getItem('expo-reservation-fixed') ?? '{}') as { start?: string };
          if (fixed.start === cancelledReservation.slot_start_at) window.localStorage.removeItem('expo-reservation-fixed');
        } catch {
          window.localStorage.removeItem('expo-reservation-fixed');
        }
      }
      setReservations(payload.reservations ?? []);
      setMessage('预约已取消');
    } catch {
      setMessage('当前网络不可用，预约尚未取消，请联网后重试。');
    }
  }

  function beginModify(reservation: Reservation) {
    setEditingId(reservation.id);
    setArrivalTime(reservation.arrival_time ?? '');
    setAttendeeNote(reservation.attendee_note ?? '');
    setEditError('');
  }

  async function modify() {
    if (!editingId) return;
    setEditError('');
    try {
      const response = await fetch('/api/v1/reservations', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reservation_id: editingId, action: 'modify', arrival_time: arrivalTime, attendee_note: attendeeNote }) });
      const payload = await response.json() as { reservations?: Reservation[]; message?: string };
      if (!response.ok) return setEditError(payload.message ?? '修改失败，请重试');
      setReservations(payload.reservations ?? []);
      setEditingId('');
      setMessage('预约信息已更新，原确认状态保持不变。');
    } catch {
      setEditError('当前网络不可用，预约尚未修改，请联网后重试。');
    }
  }

  const activeForOffering = offering ? reservations.find((item) => item.slot_start_at === offering.start && ['pending', 'confirmed', 'arrived'].includes(item.status)) : null;
  const changedReservations = reservations.filter((item) => item.activity_status === 'delayed' || item.activity_status === 'cancelled');

  useEffect(() => {
    if (offering && activeForOffering) {
      window.localStorage.setItem('expo-reservation-fixed', JSON.stringify({ placeId: offering.placeId, start: offering.start, duration: offering.duration, status: activeForOffering.status, mapVersion: venue.mapVersion }));
      return;
    }
    if (changedReservations.some((item) => item.activity_status === 'cancelled') || reservations.some((item) => ['completed', 'no_show', 'cancelled'].includes(item.status))) window.localStorage.removeItem('expo-reservation-fixed');
  }, [activeForOffering, changedReservations, offering, reservations]);

  return (
    <main className="reservation-page">
      <section className="reservation-shell">
        <header><Link href="/" aria-label="返回观众端"><ChevronLeft size={22} /></Link><Brand compact /><span>{displayName.slice(0, 1)}</span></header>
        <div className="reservation-content">
          <div className="reservation-heading"><span>我的预约</span><h1>活动预约</h1><p>查看状态、更新预约信息或取消尚未完成的预约。</p></div>
          {offering && (
            <section className="reservation-offering">
              <div className="card-head"><div><h2>{offering.title}</h2><p>{offering.boothTitle}</p></div><span className={`status-pill ${offering.status === 'confirmed' ? 'published' : 'review'}`}>{offering.status === 'confirmed' ? '可预约' : offering.status === 'delayed' ? '活动延迟' : '活动取消'}</span></div>
              <div className="reservation-facts"><span><CalendarDays size={18} />{new Date(offering.start).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span><span><Clock3 size={18} />{offering.duration} 分钟</span><span><Users size={18} />{offering.capacity > 0 ? `限 ${offering.capacity} 人` : '不限人数'}</span></div>
              {activeForOffering ? (
                <div className="reservation-confirmed"><CheckCircle2 size={21} /><span><strong>{statusLabels[activeForOffering.status]}</strong><small>可在下方预约记录中查看或取消</small></span></div>
              ) : offering.status !== 'cancelled' && (
                <>
                  <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>授权本次预约</strong><small>您的姓名与账号邮箱仅会提供给本活动主办方“{offering.boothTitle}”，用于确认预约与现场接待；活动结束 7 天后系统将自动脱敏。</small></span></label>
                  <button className="primary-wide" type="button" disabled={!consent} onClick={reserve}>提交预约</button>
                </>
              )}
            </section>
          )}
          {!loading && placeId && !offering && <div className="reservation-offering"><div className="card-head"><div><h2>当前不可预约</h2><p>活动可能尚未开放、已取消或已经结束。</p></div><span className="status-pill review">不可预约</span></div><Link className="reservation-cta" href="/">返回查看其他地点</Link></div>}
          {message && <p className="reservation-message">{message}</p>}
          <section className="reservation-list">
            <div className="card-head"><div><h2>预约记录</h2><p>{reservations.length} 条</p></div></div>
            {changedReservations.map((item) => (
              <div className="policy-banner reservation-policy" key={`change-${item.id}`}>
                <CalendarDays size={20} />
                <div>
                  <strong>{item.activity_status === 'cancelled' ? '活动已取消' : '活动安排有延迟'} · {item.activity_title}</strong>
                  <p>{item.change_message?.trim() || (item.activity_status === 'cancelled' ? '本场活动已取消，您无需按原预约到场。' : '主办方已调整活动安排，请留意最新开始时间。')}</p>
                </div>
              </div>
            ))}
            {loading ? (
              <p className="reservation-empty">正在加载预约…</p>
            ) : reservations.length ? reservations.map((item) => (
              <article key={item.id}>
                <span><CalendarDays size={19} /></span>
                <div><strong>{item.activity_title}</strong><p>{new Date(item.slot_start_at).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}{item.arrival_time ? ` · 预计 ${item.arrival_time} 到达` : ''}</p>{item.attendee_note && <p>{item.attendee_note}</p>}</div>
                <span className={`status-pill ${item.status === 'confirmed' || item.status === 'arrived' || item.status === 'completed' ? 'published' : item.status === 'cancelled' || item.status === 'no_show' ? 'cancelled' : 'review'}`}>{statusLabels[item.status]}</span>
                {['pending', 'confirmed'].includes(item.status) && <div className="reservation-row-actions"><button type="button" onClick={() => beginModify(item)}>修改预约</button><button className="danger-outline" type="button" onClick={() => cancel(item.id)}>取消</button></div>}
              </article>
            )) : <p className="reservation-empty">暂无预约记录</p>}
          </section>
          <div className="privacy-note"><ShieldCheck size={18} />姓名与账号邮箱仅提供给该活动主办方，用于确认预约与现场接待；活动结束 7 天后自动脱敏。</div>
        </div>
      </section>
      <Modal open={Boolean(editingId)} title="修改预约" onClose={() => { setEditingId(''); setEditError(''); }}>
        <form className="ticket-form" onSubmit={(event) => { event.preventDefault(); void modify(); }}>
          <label><span>预计到达时间（可选）</span><input type="time" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} /></label>
          <label><span>接待备注（可选）</span><textarea rows={4} maxLength={200} value={attendeeNote} onChange={(event) => setAttendeeNote(event.target.value)} placeholder="例如：希望安排无障碍接待，或说明到场需求" /><small>{attendeeNote.length}/200</small></label>
          <div className="privacy-note"><ShieldCheck size={18} />预计到达时间与备注仅提供给该活动主办方用于本次接待。</div>
          {editError && <p className="reservation-message" role="alert" aria-live="assertive">{editError}</p>}
          <button className="primary-wide" type="submit">保存修改</button>
        </form>
      </Modal>
    </main>
  );
}
