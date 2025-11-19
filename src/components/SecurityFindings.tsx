"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { GradientCard } from "@/components/ui/GradientCard";

export type SecurityFindingRow = {
  title: string;
  category: string;
  description: string;
  status: "pass" | "warn" | "fail";
};

export default function SecurityFindings({ rows }: { rows: SecurityFindingRow[] }) {
  return (
    <GradientCard
      title="Security Findings"
      icon={<span className="i-lucide-shield text-white/80" />}
      contentClassName="mt-0"
      aria-label="Security Findings"
    >
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur">
        {rows.length ? (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/70">
                <th className="px-4 py-2 font-medium">Finding</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.title}-${i}`} className="border-t border-white/10 text-white/90">
                  <td className="px-4 py-3 flex items-center gap-2">
                    {row.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--pass)]" />
                    ) : row.status === "warn" ? (
                      <AlertTriangle className="h-4 w-4 text-[var(--warn)]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[var(--fail)]" />
                    )}
                    {row.title}
                  </td>
                  <td className="px-4 py-3 text-white/70">{row.category}</td>
                  <td className="px-4 py-3">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-6 text-sm text-white/70">No findings yet. Submit an address to view results.</div>
        )}
      </div>
    </GradientCard>
  );
}


