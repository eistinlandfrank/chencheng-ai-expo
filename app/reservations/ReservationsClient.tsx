'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, ChevronLeft, Clock3, ShieldCheck, Users } from 'lucide-react';
import Brand from '@/components/Brand';

type Reservation = {
  id: string;
  activity_title: string;
  slot_start_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
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

const statusLabels = { pending: '待展商确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };

export default function ReservationsClient({ displayName, placeId }: { displayName: string; placeId: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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
    const response = await fetch('/api/v1/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ place_id: offering.placeId, consent }) });
    const payload = await response.json() as { reservation?: Reservation; message?: string };
    if (!response.ok) return setMessage(payload.message ?? '预约失败，请重试');
    setMessage('预约已提交，等待展商确认');
    setConsent(false);
    await load();
  }

  async function cancel(reservationId: string) {
    const response = await fetch('/api/v1/reservations', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reservation_id: reservationId, action: 'cancel' }) });
    const payload = await response.json() as { reservations?: Reservation[]; message?: string };
    if (!response.ok) return setMessage(payload.message ?? '取消失败，请重试');
    setReservations(payload.reservations ?? []);
    setMessage('预约已取消');
  }

  const activeForOffering = offering ? reservations.find((item) => item.slot_start_at === offering.start && item.status !== 'cancelled') : null;

  return <main className="reservation-page"><section className="reservation-shell"><header><Link href="/" aria-label="返回观众端"><ChevronLeft size={22} /></Link><Brand compact /><span>{displayName.slice(0, 1)}</span></header><div className="reservation-content"><div className="reservation-heading"><span>我的预约</span><h1>活动预约</h1><p>查看状态、提交预约或取消尚未完成的预约。</p></div>{offering && <section className="reservation-offering"><div className="card-head"><div><h2>{offering.title}</h2><p>{offering.boothTitle}</p></div><span className={`status-pill ${offering.status === 'confirmed' ? 'published' : 'review'}`}>{offering.status === 'confirmed' ? '可预约' : offering.status === 'delayed' ? '活动延迟' : '活动取消'}</span></div><div className="reservation-facts"><span><CalendarDays size={18} />{new Date(offering.start).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span><span><Clock3 size={18} />{offering.duration} 分钟</span><span><Users size={18} />{offering.capacity > 0 ? `限 ${offering.capacity} 人` : '不限人数'}</span></div>{activeForOffering ? <div className="reservation-confirmed"><CheckCircle2 size={21} /><span><strong>{statusLabels[activeForOffering.status]}</strong><small>可在下方预约记录中查看或取消</small></span></div> : offering.status !== 'cancelled' && <><label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>授权本次预约</strong><small>将姓名与账号邮箱提供给“{offering.boothTitle}”，仅用于本场活动确认与现场接待。</small></span></label><button className="primary-wide" type="button" disabled={!consent} onClick={reserve}>提交预约</button></>}</section>}{message && <p className="reservation-message">{message}</p>}<section className="reservation-list"><div className="card-head"><div><h2>预约记录</h2><p>{reservations.length} 条</p></div></div>{loading ? <p className="reservation-empty">正在加载预约…</p> : reservations.length ? reservations.map((item) => <article key={item.id}><span><CalendarDays size={19} /></span><div><strong>{item.activity_title}</strong><p>{new Date(item.slot_start_at).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</p></div><span className={`status-pill ${item.status === 'confirmed' || item.status === 'completed' ? 'published' : item.status === 'cancelled' ? 'cancelled' : 'review'}`}>{statusLabels[item.status]}</span>{['pending', 'confirmed'].includes(item.status) && <button type="button" onClick={() => cancel(item.id)}>取消</button>}</article>) : <p className="reservation-empty">暂无预约记录</p>}</section><div className="privacy-note"><ShieldCheck size={18} />仅在您明确提交预约后，指定展商才能看到本次预约所需信息。</div></div></section></main>;
}
