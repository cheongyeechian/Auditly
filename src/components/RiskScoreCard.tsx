"use client";

import { useMemo, type CSSProperties } from "react";
import { GradientCard } from "@/components/ui/GradientCard";

export default function RiskScoreCard({
  score,
  label
}: {
  score: number;
  label: "Low" | "Medium" | "High";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  const severityColor = useMemo(() => {
    if (clamped >= 67) return "text-green-300";
    if (clamped >= 34) return "text-amber-300";
    return "text-red-300";
  }, [clamped]);

  // full 360-degree fill
  const angle = (clamped / 100) * 360;

  // Pure gold mirror ring + track
  const gaugeStyle: CSSProperties = {
    backgroundImage: `
      conic-gradient(
        from 90deg,
        #facc15 0deg,
        #fbbf24 ${angle * 0.4}deg,
        #f59e0b ${angle}deg,
        rgba(255,255,255,0.08) ${angle}deg,
        rgba(255,255,255,0.03) 360deg
      )
    `,
    boxShadow:
      "0 0 25px rgba(0,0,0,0.55), 0 0 45px rgba(0,0,0,0.85), inset 0 0 10px rgba(0,0,0,0.65)",
    transform: "rotate(-90deg)" // rotate so 0° is at top
  };

  return (
    <GradientCard title="Risk Score" aria-label="Risk score" contentClassName="mt-6">
      <div className="flex items-center gap-6">
        {/* Donut gauge */}
        <div className="relative w-32 h-32" aria-hidden>
          {/* Outer gold ring */}
          <div className="absolute inset-0 rounded-full" style={gaugeStyle} />

          {/* Black center */}
          <div className="absolute inset-4 rounded-full bg-black shadow-[inset_0_0_18px_rgba(0,0,0,0.8)] flex items-center justify-center">
            <span className="text-3xl font-semibold text-amber-100 drop-shadow-[0_0_6px_rgba(0,0,0,0.7)]">
              {clamped}
            </span>
          </div>

          {/* Mirror highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-full mix-blend-screen opacity-70 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.4),transparent_60%)]" />
        </div>

        {/* Labels */}
        <div className="flex flex-col">
          <span className={`text-base font-semibold uppercase tracking-wide ${severityColor}`}>
            {label} risk
          </span>
          <span className="text-xs text-white/70">Score out of 100</span>
        </div>
      </div>
    </GradientCard>
  );
}
