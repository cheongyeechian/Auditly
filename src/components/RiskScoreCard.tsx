"use client";

import { useMemo } from "react";

export default function RiskScoreCard({ score, label }: { score: number; label: "Low" | "Medium" | "High" }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const severityColor = useMemo(() => {
    if (clamped >= 67) return "text-green-600";
    if (clamped >= 34) return "text-yellow-600";
    return "text-red-600";
  }, [clamped]);

  // Simple gauge using CSS conic-gradient
  const angle = (clamped / 100) * 180; // half circle
  const hue = clamped >= 67 ? 140 : clamped >= 34 ? 40 : 0;
  const gaugeStyle: React.CSSProperties = {
    background: `conic-gradient(hsl(${hue} 70% 45%) ${angle}deg, rgba(0,0,0,0.1) ${angle}deg)`
  };

  return (
     <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-sm" aria-label="Risk score">
      <div className="flex items-center gap-6">
        <div className="relative w-40  overflow-hidden" aria-hidden>
          <div className="w-40 h-40 rounded-full -translate-y-10 shadow-inner" style={gaugeStyle} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-semibold text-white">
            {clamped}
          </div>
        </div>
        <div className="flex flex-col">
          <span className={`text-base font-semibold ${severityColor}`}>{label} risk</span>
          <span className="text-xs text-white/60">Score out of 100</span>
        </div>
      </div>
    </section>
  );
}



