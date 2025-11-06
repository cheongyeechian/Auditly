"use client";

export default function SummaryBlock({ label = "Medium", address }: { label?: "Low" | "Medium" | "High"; address: string }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <h3 className="text-sm font-semibold text-white mb-2">Summary</h3>
      <div className="text-sm text-white/80 whitespace-pre-line">
        {`Overall Risk Rating: ${label} Risk`}
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-white/90">Key Findings:</p>
        <ul className="mt-1 text-sm text-white/80 list-disc pl-5 space-y-1">
          <li>Contract is upgradeable (owner can change logic)</li>
          <li>Owner can pause transfers</li>
          <li>Top wallet holds 17% supply</li>
        </ul>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-white/90">Good Signs:</p>
        <ul className="mt-1 text-sm text-white/80 list-disc pl-5 space-y-1">
          <li>Contract source is verified</li>
          <li>No self-destruct detected</li>
          <li>Liquidity is locked for 365 days</li>
        </ul>
      </div>
    </section>
  );
}


