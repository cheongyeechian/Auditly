"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

type Row = { icon: "ok" | "warn"; title: string; category: string; description: string };

const rows: Row[] = [
  { icon: "warn", title: "Proxy Contract", category: "Proxy Security", description: "This contract is an Admin Upgradeability Proxy" },
  { icon: "ok", title: "Verified Contract Source Code", category: "General Security", description: "This token contract is open source and verified" },
  { icon: "ok", title: "Token Cannot Self Destruct", category: "General Security", description: "No self-destruct function found" },
  { icon: "ok", title: "Owner/Deployer Token Balance: 0.00%", category: "General Security", description: "Low token concentration by owner" },
];

export default function SecurityFindings() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur" aria-label="Security Findings">
      <header className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <span className="i-lucide-shield text-white/80" />
        <h2 className="text-sm font-semibold text-white">Security Findings</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70">
              <th className="px-4 py-2 font-medium">Finding</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/10 text-white/90">
                <td className="px-4 py-3 flex items-center gap-2">
                  {r.icon === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[#ffa730]" />
                  )}
                  {r.title}
                </td>
                <td className="px-4 py-3 text-white/70">{r.category}</td>
                <td className="px-4 py-3">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


