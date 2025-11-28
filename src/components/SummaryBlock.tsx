"use client";

export type SummaryData = {
  rating: string;
  keyFindings: string[];
  goodSigns: string[];
};

type AiStatus = "idle" | "loading" | "ready" | "error";

export default function SummaryBlock({
  address,
  summary,
  aiInsight,
  aiStatus = "idle",
}: {
  address: string;
  summary?: SummaryData | null;
  aiInsight?: string | null;
  aiStatus?: AiStatus;
}) {
  const trimmedFindings = summary?.keyFindings?.filter((item) => item?.trim()) ?? [];
  const trimmedGood = summary?.goodSigns?.filter((item) => item?.trim()) ?? [];

  const keyFindings = trimmedFindings.length ? trimmedFindings : ["Awaiting analysis results."];
  const goodSigns = trimmedGood.length ? trimmedGood : ["No positives yet."];
  const exposures = trimmedFindings.length;

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const isClean = exposures === 0;
  const rating = summary?.rating ?? (isClean ? "Clean" : "Review Required");

  const headline = isClean
    ? "No exposures found"
    : exposures === 1
      ? "1 exposure detected"
      : `${exposures} exposures detected`;

  const bodyCopy = isClean
    ? `Great news! We checked ${shortAddress} against known risk indicators and found no active leaks. We'll keep watching and alert you if this address shows up in a future breach.`
    : `Heads up! We found ${exposures} concerning signal${exposures > 1 ? "s" : ""} for ${shortAddress}. Review the details below and proceed with caution.`;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#f6d488]/20 bg-gradient-to-br from-[#1b1407] via-[#080604] to-black p-6 md:p-8 text-white shadow-[0_25px_70px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f6d488]/20 via-transparent to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center">
        <div className="flex-1 space-y-4">
          <p className="text-md font-semibold uppercase tracking-[0.5em] text-[#f6d488]/80">Summary</p>
          <h2 className="text-2xl font-bold md:text-3xl">{headline}</h2>
          <p className="text-sm md:text-base text-white/80">{bodyCopy}</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">
            <span className="text-[#f6d488]">{rating}</span>
            <span className="text-white/60">{isClean ? "Monitoring" : "Action needed"}</span>
          </div>
          
        </div>
      </div>
      <div className="relative z-10 mt-10 grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Key Findings</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {keyFindings.map((item, idx) => (
                <li key={`${item}-${idx}`} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f6d488]" />
                  <span className="text-white/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {aiStatus !== "idle" ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">AI Contract Review</p>
              {aiStatus === "loading" ? (
                <p className="mt-2 text-white/60">Gemini is reviewing the verified source code…</p>
              ) : aiStatus === "error" ? (
                <p className="mt-2 text-red-300">Could not generate AI summary.</p>
              ) : aiInsight ? (
                <ul className="mt-3 space-y-2">
                  {aiInsight
                    .split(/\n/)
                    .map((line) => 
                      line
                        .replace(/^[\s*•\-]+/, "") // Remove leading bullets/dashes/asterisks
                        .replace(/^\*\*/, "")      // Remove leading bold markdown
                        .replace(/\*\*$/, "")      // Remove trailing bold markdown
                        .trim()
                    )
                    .filter((line) => {
                      // Filter out empty lines and unwanted content
                      if (line.length === 0) return false;
                      if (/^[\s*]+$/.test(line)) return false; // Only asterisks/spaces
                      if (/^(here'?s?|this is|the following|below|i found|security analysis|potential risks)/i.test(line)) return false;
                      if (/focusing (solely )?on/i.test(line)) return false;
                      if (/provided smart contract/i.test(line)) return false;
                      return true;
                    })
                    .map((line, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                        <span className="text-white/80">{line}</span>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Good Signs</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            {goodSigns.map((item, idx) => (
              <li key={`${item}-${idx}`} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}


