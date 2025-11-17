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
  const baseClass =
    "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs";
  if (status === "pass")
    return (
      <span className={`${baseClass} text-[var(--pass)]`}>
        <CheckCircle2 className="h-4 w-4" /> PASS
      </span>
    );
  if (status === "warn")
    return (
      <span className={`${baseClass} text-[var(--warn)]`}>
        <AlertTriangle className="h-4 w-4" /> WARN
      </span>
    );
  return (
    <span className={`${baseClass} text-[var(--fail)]`}>
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
    <section aria-label="Key indicators" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, status]) => (
        <article
          key={key}
          className="rounded-2xl border border-white/10 bg-black/90 p-5 text-white shadow-[0px_12px_30px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                {TITLES[key]}
              </h3>
              <p className="mt-1 text-xs text-white/70">{hints[key]}</p>
            </div>
            <Badge status={status} />
          </div>
          <div className="mt-4">
            <ExplainDrawer title={TITLES[key]} content={explanations[key]} />
          </div>
        </article>
      ))}
    </section>
  );
}


