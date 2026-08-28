'use client';

import { readAdminData } from '../../shared/storage';

export default function ScheduleTab() {
  const data = readAdminData();
  const schedule = data.schedule.filter(s => s.audience);

  // 按日期分组的默认日程
  const defaultSchedule = [
    { date: '8月27–29日', items: [
      { time: '10:00–18:30', title: '展商区开放（28–29日）', note: '凭凭证入内' },
      { time: '全天', title: 'Workshop 区', note: '场次以现场为准' },
    ]},
    { date: '8月30日', items: [
      { time: '09:30–12:30', title: '初评与摆摊路演', note: '适合近距离看作品' },
      { time: '14:00', title: '产品发布会', note: '' },
      { time: '14:50–16:50', title: '终审路演', note: '' },
      { time: '17:40 起', title: '颁奖典礼', note: '' },
    ]},
  ];

  return (
    <div className="au-schedule">
      <h2 className="au-section-title">行程看点</h2>

      {/* 主办录入的日程 */}
      {schedule.length > 0 && (
        <div className="au-schedule-custom">
          {schedule.map(s => (
            <div key={s.id} className="au-timeline-card">
              <div className="au-timeline-time">{s.date} {s.start}–{s.end}</div>
              <div className="au-timeline-title">{s.title}</div>
              {s.zoneId && <div className="au-timeline-zone">区域：{s.zoneId}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 默认粗粒度日程 */}
      {defaultSchedule.map(day => (
        <div key={day.date} className="au-schedule-day">
          <h3 className="au-schedule-date">{day.date}</h3>
          <div className="au-timeline">
            {day.items.map((item, i) => (
              <div key={i} className="au-timeline-card">
                <div className="au-timeline-dot" />
                <div className="au-timeline-content">
                  <div className="au-timeline-time">{item.time}</div>
                  <div className="au-timeline-title">{item.title}</div>
                  {item.note && <div className="au-timeline-note">{item.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
