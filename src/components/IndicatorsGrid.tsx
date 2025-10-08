"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import ExplainDrawer from "./ExplainDrawer";

type Status = "pass" | "warn" | "fail";
type Indicators = {
  verifiedSource: Status;
  proxy: Status;
  ownerPrivileges: Status;
  dangerousFunctions: Status;
  liquidity: Status;
  holderDistribution: Status;
};

const TITLES: Record<keyof Indicators, string> = {
  verifiedSource: "Verified Source",
  proxy: "Proxy / Upgradeable",
  ownerPrivileges: "Owner Privileges",
  dangerousFunctions: "Dangerous Functions",
  liquidity: "Liquidity Status",
  holderDistribution: "Holder Distribution",
};

function Badge({ status }: { status: Status }) {
  if (status === "pass") return (
    <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded text-xs">
      <CheckCircle2 className="h-4 w-4" /> PASS
    </span>
  );
  if (status === "warn") return (
    <span className="inline-flex items-center gap-1 text-yellow-800 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded text-xs">
      <AlertTriangle className="h-4 w-4" /> WARN
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded text-xs">
      <XCircle className="h-4 w-4" /> FAIL
    </span>
  );
}

export default function IndicatorsGrid({
  indicators,
  hints,
  explanations,
}: {
  indicators: Indicators;
  hints: Record<keyof Indicators, string>;
  explanations: Record<keyof Indicators, string>;
}) {
  const entries = Object.entries(indicators) as [keyof Indicators, Status][];
  return (
    <section aria-label="Key indicators" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {entries.map(([key, status]) => (
        <article key={key} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">{TITLES[key]}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{hints[key]}</p>
            </div>
            <Badge status={status} />
          </div>
          <div className="mt-2">
            <ExplainDrawer title={TITLES[key]} content={explanations[key]} />
          </div>
        </article>
      ))}
    </section>
  );
}


