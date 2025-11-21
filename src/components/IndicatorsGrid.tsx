"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import ExplainDrawer from "./ExplainDrawer";

type Status = "pass" | "warn" | "fail";
type IndicatorCard = {
  key: string;
  title: string;
  status: Status;
  hint: string;
  explanation: string;
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

export default function IndicatorsGrid({ items }: { items: IndicatorCard[] }) {
  return (
    <section aria-label="Key indicators" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.key}
          className="rounded-2xl border border-white/20 bg-black/90 p-5 text-white shadow-[0px_12px_30px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-white/70">{item.hint}</p>
            </div>
            <Badge status={item.status} />
          </div>
          <div className="mt-4">
            <ExplainDrawer title={item.title} content={item.explanation} />
          </div>
        </article>
      ))}
    </section>
  );
}


