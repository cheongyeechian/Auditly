"use client";

type TopHolder = { address: string; percent: number };

export default function TopHoldersTable({ holders }: { holders: TopHolder[] }) {
  return (
    <section aria-label="Top holders" className="rounded-lg border border-gray-200/30">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold">Top Holders</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left bg-white/20 dark:bg-zinc-900">
              <th className="px-4 py-2 font-medium">Address</th>
              <th className="px-4 py-2 font-medium">% Supply</th>
            </tr>
          </thead>
          <tbody>
            {holders.map((h) => (
              <tr key={h.address} className="border-t border-gray-200 dark:border-gray-800">
                <td className="px-4 py-2 font-mono">{h.address}</td>
                <td className="px-4 py-2">{h.percent.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


