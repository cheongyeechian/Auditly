"use client";

import { GradientCard } from "@/components/ui/GradientCard";

export type SummaryData = {
  rating: string;
  keyFindings: string[];
  goodSigns: string[];
};

export default function SummaryBlock({
  address,
  summary,
}: {
  address: string;
  summary?: SummaryData | null;
}) {
  const title = summary?.rating ?? "Risk Summary";
  const keyFindings = summary?.keyFindings?.length ? summary.keyFindings : ["Awaiting analysis results."];
  const goodSigns = summary?.goodSigns?.length ? summary.goodSigns : ["No positives yet."];

  return (
    <GradientCard title="Summary">
      <div className="text-sm md:text-base text-white/80 whitespace-pre-line">
        {`Address ${address} · ${title}`}
      </div>
      <div className="mt-3">
        <p className="text-sm md:text-lg lg:text-xl font-semibold text-white">Key Findings:</p>
        <ul className="mt-1 text-sm md:text-base text-white/80 list-disc pl-5 space-y-1">
          {keyFindings.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="mt-3">
        <p className="text-sm md:text-lg lg:text-xl font-semibold text-white">Good Signs:</p>
        <ul className="mt-1 text-sm md:text-base text-white/80 list-disc pl-5 space-y-1">
          {goodSigns.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      </div>
    </GradientCard>
  );
}


