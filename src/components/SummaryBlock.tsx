"use client";

import { GradientCard } from "@/components/ui/GradientCard";

export default function SummaryBlock({ label = "Medium", address }: { label?: "Low" | "Medium" | "High"; address: string }) {
  return (
    <GradientCard title="Summary">
      <div className="text-sm md:text-base text-white/80 whitespace-pre-line">
        {`Overall Risk Rating: ${label} Risk`}
      </div>
      <div className="mt-3">
        <p className="text-sm md:text-lg lg:text-xl font-semibold text-white">Key Findings:</p>
        <ul className="mt-1 text-sm md:text-base text-white/80 list-disc pl-5 space-y-1">
          <li>Contract is upgradeable (owner can change logic)</li>
          <li>Owner can pause transfers</li>
          <li>Top wallet holds 17% supply</li>
        </ul>
      </div>
      <div className="mt-3">
        <p className="text-sm md:text-lg lg:text-xl font-semibold text-white">Good Signs:</p>
        <ul className="mt-1 text-sm md:text-base text-white/80 list-disc pl-5 space-y-1">
          <li>Contract source is verified</li>
          <li>No self-destruct detected</li>
          <li>Liquidity is locked for 365 days</li>
        </ul>
      </div>
    </GradientCard>
  );
}


