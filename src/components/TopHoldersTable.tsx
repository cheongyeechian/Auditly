"use client";

import { GradientCard } from "@/components/ui/GradientCard";

type TopHolder = { address: string; percent: number };

export default function TopHoldersTable({ holders }: { holders: TopHolder[] }) {
  return (
    <GradientCard title="Top Holders" aria-label="Top holders" contentClassName="mt-0">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70">
              <th className="px-4 py-2 font-medium">Address</th>
              <th className="px-4 py-2 font-medium">% Supply</th>
            </tr>
          </thead>
          <tbody>
            {holders.map((h) => (
              <tr key={h.address} className="border-t border-white/10">
                <td className="px-4 py-2 font-mono text-white/90">{h.address}</td>
                <td className="px-4 py-2 text-white/90">{h.percent.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GradientCard>
  );
}


