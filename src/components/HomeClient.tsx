"use client";

import { useEffect, useRef, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import RiskScoreCard from "@/components/RiskScoreCard";
import IndicatorsGrid from "@/components/IndicatorsGrid";
import TopHoldersTable from "@/components/TopHoldersTable";
import SecurityFindings from "@/components/SecurityFindings";
import { HolderInformation, ProxyAddresses, TokenOverview } from "@/components/OverviewCards";
import SummaryBlock from "@/components/SummaryBlock";
import { GradientCard } from "@/components/ui/GradientCard";
import { ChevronDown } from "lucide-react";
import type { AnalysisResponse, IndicatorKey } from "@/types/analysis";

type Status = "pass" | "warn" | "fail";

const INDICATOR_ORDER: IndicatorKey[] = [
  "verifiedSource",
  "proxy",
  "ownerPrivileges",
  "dangerousFunctions",
  "liquidity",
  "holderDistribution",
];

const INDICATOR_COPY: Record<IndicatorKey, { title: string; description: string }> = {
  verifiedSource: {
    title: "Verified Source",
    description: "Verification enables the community to audit the exact deployed bytecode.",
  },
  proxy: {
    title: "Proxy / Upgradeable",
    description: "Upgradeable contracts can change logic after deployment.",
  },
  ownerPrivileges: {
    title: "Owner Privileges",
    description: "Owner-only controls such as pause or blacklist impacts how tokens can move.",
  },
  dangerousFunctions: {
    title: "Dangerous Functions",
    description: "Mint/burn and emergency withdraw functions can alter supply or drain funds.",
  },
  liquidity: {
    title: "Liquidity Status",
    description: "Locked and distributed liquidity reduces rug risk.",
  },
  holderDistribution: {
    title: "Holder Distribution",
    description: "Large holder concentration can manipulate price or halt trading.",
  },
};

const CHAIN_OPTIONS = [
  { label: "Ethereum", value: "ethereum" },
  { label: "Base", value: "base" },
  { label: "BSC", value: "bsc" },
  { label: "Polygon", value: "polygon" },
] as const;

const MARKETING_INDICATORS = INDICATOR_ORDER.map((key) => ({
  title: INDICATOR_COPY[key].title,
  description: INDICATOR_COPY[key].description,
}));

export default function HomeClient() {
  const [address, setAddress] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<(typeof CHAIN_OPTIONS)[number]>(CHAIN_OPTIONS[0]);
  const [isChainMenuOpen, setIsChainMenuOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chainDropdownRef = useRef<HTMLDivElement | null>(null);
  const hasAddress = Boolean(address);
  const selectedChainValue = selectedChain.value;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(event.target as Node)) {
        setIsChainMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const controller = new AbortController();

    async function runAnalysis() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chain: selectedChainValue, address }),
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to analyze contract.");
        }
        if (!cancelled) {
          setAnalysis(payload as AnalysisResponse);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        console.error(err);
        setAnalysis(null);
        setError(err instanceof Error ? err.message : "Unexpected error while analyzing.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    runAnalysis();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [address, selectedChainValue]);

  const indicatorItems = INDICATOR_ORDER.map((key) => {
    const copy = INDICATOR_COPY[key];
    const datum = analysis?.findings?.[key];
    return {
      key,
      title: copy.title,
      status: backendStatusToClient(datum?.status),
      hint: datum?.reason ?? "Awaiting analysis...",
      explanation: datum?.explanation ?? copy.description,
    };
  });

  const securityRows = analysis
    ? INDICATOR_ORDER.map((key) => {
        const finding = analysis.findings[key];
        return {
          title: INDICATOR_COPY[key].title,
          category: finding.category,
          description: finding.reason,
          status: backendStatusToClient(finding.status),
        };
      })
    : [];

  const holders = analysis?.holders?.top ?? [];
  const metadata = analysis?.metadata;
  const holderStats = analysis?.holders;
  const priceUsd = analysis?.token?.priceUsd ?? null;

  const badgeLabel = analysis
    ? `${analysis.riskScore?.label ?? "Unknown"} Risk`
    : isLoading
      ? "Scanning..."
      : "Awaiting scan";
  const badgeColor = analysis
    ? (analysis.riskScore?.label ?? "Low") === "Low"
      ? "text-green-400"
      : analysis.riskScore?.label === "Medium"
        ? "text-amber-300"
        : "text-red-400"
    : isLoading
      ? "text-amber-300"
      : "text-white/70";

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 py-8 md:py-10 transition-all duration-300">
      <div className={`flex w-full flex-col items-center gap-6 ${hasAddress ? "" : "text-center"}`}>
        <div className="text-lg uppercase tracking-wide text-[#ffa730]">Audit with</div>
        <h1
          className={`text-center text-[80px] font-semibold text-[#ffa730] transition-all duration-300 md:text-[90px]`}
        >
          Auditly
        </h1>
        <div className="w-full max-w-2xl flex flex-col gap-3">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:w-auto">
              <div ref={chainDropdownRef} className="relative w-full md:w-52">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isChainMenuOpen}
                  onClick={() => setIsChainMenuOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-[#ffa730] bg-black/90 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#ffa730] shadow-[0_0_25px_rgba(255,167,48,0.2)] transition hover:border-[#ffb85b] hover:text-[#ffb85b] focus:outline-none focus:ring-2 focus:ring-[#ffa730]/60"
                >
                  {selectedChain.label}
                  <span className={`transition ${isChainMenuOpen ? "rotate-180" : ""}`}><ChevronDown className="w-4 h-4" /></span>
                </button>
                {isChainMenuOpen ? (
                  <ul
                    role="listbox"
                    aria-activedescendant={`chain-${selectedChain.value}`}
                    className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[#ffa730]/60 bg-black/95 text-sm text-white shadow-[0px_20px_45px_rgba(0,0,0,0.45)] backdrop-blur"
                  >
                    {CHAIN_OPTIONS.map((option) => (
                      <li key={option.value}>
                        <button
                          id={`chain-${option.value}`}
                          role="option"
                          aria-selected={option.value === selectedChain.value}
                          className={`flex w-full items-center justify-between hover:bg-[#ffa730]/10 hover:text-[#ffa730] px-4 py-3 uppercase tracking-wide transition ${
                            option.value === selectedChain.value
                              ? "bg-[#ffa730]/10 text-[#ffa730]"
                              : "text-white/80 hover:bg-white/5"
                          }`}
                          onClick={() => {
                            setSelectedChain(option);
                            setIsChainMenuOpen(false);
                          }}
                        >
                          {option.label}
                          {option.value === selectedChain.value ? <span className="text-xs">●</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="flex-1">
              <AddressSearch defaultValue="0x1111111111111111111111111111111111111111" onSubmit={setAddress} />
            </div>
          </div>
          <p className="text-center text-sm text-white/60 md:text-left">
            Currently scanning on <span className="font-semibold text-[#ffa730]">{selectedChain.label}</span>
          </p>
        </div>
      </div>

      {!hasAddress ? (
        <div className="w-full space-y-10">
          <section className="w-full rounded-3xl border border-white/15 bg-black/60 p-6 text-white shadow-[0px_12px_30px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-6">
              <div className="flex-col space-y-3">
                <p className="text-md uppercase tracking-wide text-[#ffa730]">How it works</p>
                <h2 className="text-3xl font-semibold">See on-chain red flags in seconds</h2>
                <p className="text-white/70">
                  Paste any token contract address and we&apos;ll run automated checks on liquidity, upgradeability,
                  privileged roles, and more. 
                </p>
              </div>
              <div className="flex-col">
                <video
                  className="aspect-video w-full rounded-2xl border border-white/15 bg-black object-cover"
                  src="/demo.mov"
                  controls
                  playsInline
                  loop
                  autoPlay
                  muted
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </section>

          <section className="w-full rounded-3xl border border-white/15 bg-black/60 p-6 text-white shadow-[0px_12px_30px_rgba(0,0,0,0.35)]">
            <p className="text-md uppercase tracking-wide text-[#ffa730]">Life saver</p>
            <h2 className="mt-2 text-3xl font-semibold">Important indicator you should know about</h2>
            <p className="mt-2 text-white/70">
              You should know about these important indicators before you invest.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {MARKETING_INDICATORS.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {hasAddress ? (
        <section className="w-full space-y-6" aria-label="Risk summary">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1">
              <span className="text-xs text-white/70">Overall</span>
              <span className={`text-xs font-semibold ${badgeColor}`}>{badgeLabel}</span>
            </div>
            {error ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {isLoading ? (
              <div className="text-sm text-white/60">Fetching latest on-chain data...</div>
            ) : null}
          </div>
          {/* Header row: token info | centered risk | mistake form */}
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            <GradientCard title="Token" contentClassName="mt-2 space-y-1">
              <div className="text-sm text-white/80">{analysis?.token?.name ?? "Unknown token"}</div>
              <div className="text-sm font-medium text-white">{analysis?.token?.symbol ?? "N/A"}</div>
              <div className="pt-2 text-sm text-white/60">Price (USD)</div>
              <div className="text-sm text-white">
                {typeof priceUsd === "number" ? `$${priceUsd.toFixed(4)}` : "Unknown"}
              </div>
            </GradientCard>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <RiskScoreCard
                  score={analysis?.riskScore?.score ?? 0}
                  label={(analysis?.riskScore?.label ?? "Low") as "Low" | "Medium" | "High"}
                />
              </div>
            </div>
          </div>
          <div>
            <SummaryBlock address={address!} summary={analysis?.summary ?? null} />
          </div>
                    
           {/* Content row: big findings table | right-side stacked cards */}
          <div className="">
            <div className="lg:col-span-2">
              <SecurityFindings rows={securityRows} />
            </div>
          </div>
          
          <div>
              <IndicatorsGrid items={indicatorItems} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <TokenOverview address={address!} deployer={metadata?.deployer ?? null} token={analysis?.token} />
            <ProxyAddresses
              implementation={metadata?.proxyImplementation ?? null}
              owner={metadata?.proxyAdmin ?? metadata?.ownerAddress ?? null}
            />
            <HolderInformation
              holderCount={holderStats?.holderCount ?? null}
              totalSupply={holderStats?.totalSupplyFormatted ?? holderStats?.totalSupply ?? null}
              deployerShare={holderStats?.deployerPercent ?? null}
              ownerShare={holderStats?.ownerPercent ?? null}
              topTenPercent={holderStats?.topTenPercent ?? null}
            />
          </div>

          {/* Extras */}
          <div>
              <TopHoldersTable holders={holders} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function backendStatusToClient(status?: "PASS" | "WARN" | "FAIL"): Status {
  if (status === "PASS") return "pass";
  if (status === "FAIL") return "fail";
  return "warn";
}
