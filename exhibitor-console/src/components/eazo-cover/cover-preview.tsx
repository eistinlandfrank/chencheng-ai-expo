"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

// Deterministic, privacy-safe preview data — never real user data, never imported by product routes.
const COVER_PREVIEW_DATA = {
  boothName: "智能教育机器人",
  metrics: [
    { label: "今日预约", value: "186" },
    { label: "导览触达", value: "43" },
    { label: "预约数", value: "8" },
    { label: "线索数", value: "12" },
  ],
  appt: { time: "16:00", name: "赵先生", topic: "商务合作 · 2人到访" },
};

/**
 * Autonomous ~4s loop demonstrating the core interaction:
 * an appointment is received → reception completes → a lead is generated.
 * No auth, no product handlers, no storage.
 */
export function CoverPreview() {
  const [phase, setPhase] = useState(0); // 0 idle, 1 converting, 2 lead created
  const [leadCount, setLeadCount] = useState(12);

  useEffect(() => {
    const seq = [
      { at: 1200, run: () => setPhase(1) },
      { at: 2200, run: () => { setPhase(2); setLeadCount(13); } },
      { at: 4000, run: () => { setPhase(0); setLeadCount(12); } },
    ];
    const timers = seq.map((s) => setTimeout(s.run, s.at));
    const loop = setInterval(() => {
      setPhase(0);
      setLeadCount(12);
      seq.forEach((s) => setTimeout(s.run, s.at));
    }, 4200);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, []);

  return (
    <div
      className="flex h-full w-full flex-col justify-center px-5"
      style={{
        fontFamily: "Inter, sans-serif",
        background:
          "radial-gradient(120% 60% at 50% -10%, rgba(27,79,216,0.08), transparent 60%), linear-gradient(180deg,#fff,#f5f7fb)",
        color: "#1a1a1a",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.09em", color: "#1b4fd8", textTransform: "uppercase" }}>
        T-E05 · EXHIBITOR
      </div>
      <h1 style={{ margin: "4px 0 14px", fontSize: 22, fontWeight: 700 }}>{COVER_PREVIEW_DATA.boothName}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: "1px solid rgba(26,26,26,.12)", borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.9)" }}>
        {COVER_PREVIEW_DATA.metrics.map((m, i) => {
          const isLead = i === 3;
          return (
            <div key={m.label} style={{ padding: "12px 6px", borderRight: i < 3 ? "1px solid rgba(26,26,26,.12)" : undefined }}>
              <div style={{ fontSize: 10, color: "#6b7280" }}>{m.label}</div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 22,
                  fontWeight: 700,
                  color: isLead && phase === 2 ? "#1b4fd8" : "#1a1a1a",
                  transition: "color .3s, transform .3s",
                  transform: isLead && phase === 2 ? "scale(1.12)" : "none",
                }}
              >
                {isLead ? leadCount : m.value}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18, borderRadius: 15, border: "1px solid rgba(26,26,26,.12)", background: "#fff", padding: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#003060" }}>{COVER_PREVIEW_DATA.appt.time}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 14 }}>{COVER_PREVIEW_DATA.appt.name}</b>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{COVER_PREVIEW_DATA.appt.topic}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              transition: "all .35s",
              border: phase === 2 ? "1px solid #edf3ff" : "1px solid rgba(27,79,216,.25)",
              background: phase === 2 ? "#edf3ff" : "#fff",
              color: "#1b4fd8",
              opacity: phase === 1 ? 0.6 : 1,
            }}
          >
            {phase === 2 ? (
              <>
                <CheckCircle2 size={14} /> 已生成线索 <ArrowRight size={12} />
              </>
            ) : (
              <>
                接待完成 · 生成线索 <ArrowRight size={12} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
