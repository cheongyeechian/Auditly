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
    <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4" aria-label="Risk score">
      <div className="flex items-center gap-4">
        <div className="relative w-28 h-14 overflow-hidden" aria-hidden>
          <div className="w-28 h-28 rounded-full -translate-y-7" style={gaugeStyle} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold">
            {clamped}
          </div>
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${severityColor}`}>{label} risk</span>
          <span className="text-xs text-gray-500">Score out of 100</span>
        </div>
      </div>
    </section>
  );
}



