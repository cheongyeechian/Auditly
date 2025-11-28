"use client";

import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import AddressSearch from "@/components/AddressSearch";
import RiskScoreCard from "@/components/RiskScoreCard";
import IndicatorsGrid from "@/components/IndicatorsGrid";
import TopHoldersTable from "@/components/TopHoldersTable";
import SecurityFindings from "@/components/SecurityFindings";
import { HolderInformation, ProxyAddresses, TokenOverview } from "@/components/OverviewCards";
import SummaryBlock from "@/components/SummaryBlock";
import { GradientCard } from "@/components/ui/GradientCard";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient";
import { GridPattern } from "@/components/ui/GridPattern";
import { ChevronDown, ShieldCheck, AlertTriangle } from "lucide-react";
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

const ANALYSIS_MODES = [
  { label: "Token", value: "token" },
  { label: "Contract", value: "contract" },
] as const;

type AnalysisMode = (typeof ANALYSIS_MODES)[number]["value"];

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
  const [isExporting, setIsExporting] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("token");
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
          body: JSON.stringify({ chain: selectedChainValue, address, addressType: analysisMode }),
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
  }, [address, selectedChainValue, analysisMode]);

  useEffect(() => {
    const sourceCode = analysis?.metadata?.sourceCode;
    const isVerified = analysis?.metadata?.isVerified;
    if (!sourceCode || !isVerified || !address) {
      setAiInsight(null);
      setAiStatus("idle");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    async function runAiInsight() {
      try {
        setAiStatus("loading");
        const response = await fetch("/api/contract-code-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceCode,
            contractName: analysis?.metadata?.contractName ?? analysis?.token?.name ?? null,
            address,
          }),
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to generate AI summary.");
        }
        if (!cancelled) {
          setAiInsight(payload.summary ?? null);
          setAiStatus("ready");
          console.log("[AI Contract Summary]", payload.summary);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        console.error(err);
        if (!cancelled) {
          setAiStatus("error");
          setAiInsight(null);
        }
      }
    }

    runAiInsight();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [analysis?.metadata?.sourceCode, analysis?.metadata?.isVerified, analysis?.metadata?.contractName, analysis?.token?.name, address]);

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

  const metadata = analysis?.metadata;
  const holderStats = analysis?.holders;
  const priceUsd = analysis?.token?.priceUsd ?? null;
  const resolvedAddressType = metadata?.addressType ?? (analysisMode === "contract" ? "contract" : "token");
  const holders = resolvedAddressType === "token" ? analysis?.holders?.top ?? [] : [];

  // Detect if the token doesn't exist (only applies when analyzing as token)
  const tokenNotFound =
    resolvedAddressType === "token" &&
    !isLoading &&
    !error &&
    analysis &&
    !analysis.token?.name &&
    !analysis.token?.symbol &&
    !analysis.token?.totalSupply;

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

  const handleExportReport = async () => {
    if (!analysis || !address) return;
    setIsExporting(true);
    try {
      const doc = generateReportPdf({
        analysis,
        indicatorItems,
        securityRows,
        address,
        chainLabel: selectedChain.label,
        aiInsight,
      });
      const filename = `auditly-${analysis.token?.symbol ?? address}-report.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error(err);
      window.alert("Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden  text-white selection:bg-[#ffa730]/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#ffa730]/15 via-black/0 to-black/0" />
        <GridPattern
          width={50}
          height={50}
          x={-1}
          y={-1}
          className="opacity-[0.2] [mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
        />
      </div>
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-6 py-8 md:py-10 transition-all duration-300 px-4">
      <div className={`flex w-full flex-col items-center gap-6 ${hasAddress ? "" : "text-center"}`}>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ffa730]/30 bg-[#ffa730]/10 px-4 py-1.5 backdrop-blur-sm">
          <ShieldCheck className="h-4 w-4 text-[#ffa730]" />
          <span className="text-sm font-medium uppercase tracking-wide text-[#ffa730]">Audit with Confidence</span>
        </div>
        <h1
          className={`text-center text-[80px] font-bold tracking-tighter bg-gradient-to-b from-[#ffa730] via-[#ffcf7a] to-[#ffa730] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,167,48,0.3)] transition-all duration-300 md:text-[100px]`}
        >
          Auditly
        </h1>
        <div className="w-full max-w-2xl flex flex-col gap-3">
                    <div className="flex flex-col gap-2 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
            <p className="text-center md:text-left">
              Currently scanning on <span className="font-semibold text-[#ffa730]">{selectedChain.label}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-white/50">Analyze as</span>
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                {ANALYSIS_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    aria-pressed={analysisMode === mode.value}
                    onClick={() => setAnalysisMode(mode.value)}
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-2xl transition ${
                      analysisMode === mode.value
                        ? "bg-[#ffa730]/80 text-black shadow"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:w-auto">
              <div ref={chainDropdownRef} className="relative w-full md:w-52">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isChainMenuOpen}
                  onClick={() => setIsChainMenuOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#ffa730] shadow-lg backdrop-blur-md transition hover:bg-white/10 hover:border-[#ffa730]/50 focus:outline-none focus:ring-2 focus:ring-[#ffa730]/50"
                >
                  {selectedChain.label}
                  <span className={`transition ${isChainMenuOpen ? "rotate-180" : ""}`}><ChevronDown className="w-4 h-4" /></span>
                </button>
                {isChainMenuOpen ? (
                  <ul
                    role="listbox"
                    aria-activedescendant={`chain-${selectedChain.value}`}
                    className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 text-sm text-white shadow-2xl backdrop-blur-xl"
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

        </div>
      </div>

      {!hasAddress ? (
        <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards">
          <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl backdrop-blur-md transition-all duration-500 hover:border-[#ffa730]/20">
            <div className="flex flex-col gap-8">
              <div className="flex-col space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-1 bg-[#ffa730] rounded-full" />
                    <p className="text-md uppercase tracking-wide text-[#ffa730] font-semibold">How it works</p>
                </div>
                <h2 className="text-4xl font-bold tracking-tight">See on-chain red flags in seconds</h2>
                <p className="text-lg text-white/60 max-w-2xl leading-relaxed">
                  Paste any token contract address and we&apos;ll run automated checks on liquidity, upgradeability,
                  privileged roles, and more. 
                </p>
              </div>
              <div className="flex-col group relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none z-10" />
                <video
                  className="aspect-video w-full object-cover opacity-90 transition-opacity duration-500 group-hover:opacity-100"
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

          <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl backdrop-blur-md transition-all duration-500 hover:border-[#ffa730]/20">
             <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-[#ffa730]" />
                <p className="text-md uppercase tracking-wide text-[#ffa730] font-semibold">Life saver</p>
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Important indicators you should know about</h2>
            <p className="mt-4 text-lg text-white/60 max-w-2xl">
              You should know about these important indicators before you invest.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {MARKETING_INDICATORS.map((item) => (
                <article
                  key={item.title}
                  className="group relative rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:border-[#ffa730]/30 hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ffa730]/0 to-[#ffa730]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-[#ffa730] transition-colors">{item.title}</h3>
                  <p className="mt-3 text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {hasAddress ? (
        <section className="w-full space-y-6" aria-label="Risk summary">
          {tokenNotFound ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-4 text-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-100">Token Not Found</p>
                  <p className="text-sm text-amber-200/80 mt-1">
                    The address you entered does not appear to be a valid ERC-20 token contract on {selectedChain.label}.
                    Please double-check the address and make sure you&apos;re on the correct chain.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1">
                      <span className="text-xs text-white/70">Overall</span>
                      <span className={`text-xs font-semibold ${badgeColor}`}>{badgeLabel}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
                      <span>Analyzing</span>
                      <span className="text-[#ffa730] font-semibold">{resolvedAddressType}</span>
                    </div>
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
                <button
                  type="button"
                  onClick={handleExportReport}
                  disabled={!analysis || isExporting || !!tokenNotFound}
                  className="inline-flex items-center justify-center rounded-2xl border border-[#ffa730]/40 bg-[#ffa730]/10 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-[#ffa730] shadow-lg transition hover:bg-[#ffa730]/20 hover:border-[#ffa730]/70 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
                >
                  {isExporting ? "Preparing PDF..." : "Export PDF"}
                </button>
              </div>
              {resolvedAddressType === "contract" ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <p className="font-semibold text-white">
                    {metadata?.isVerified ? "✅ Verified contract" : "❌ Unverified contract"}
                  </p>
                  <p className="text-white/60">
                    {metadata?.sourceCode
                      ? "Source code fetched from explorer and ready for deeper review."
                      : "Explorer did not return verified source code; unable to read contract code."}
                  </p>
                </div>
              ) : null}
              {/* Header row: token info | centered risk | mistake form */}
              <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
                <GradientCard
                  title={resolvedAddressType === "contract" ? "Contract" : "Token"}
                  contentClassName="mt-2 space-y-1"
                >
                  <div className="text-sm text-white/80">
                    {analysis?.token?.name ??
                      metadata?.contractName ??
                      (resolvedAddressType === "contract" ? "Unknown contract" : "Unknown token")}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {analysis?.token?.symbol ?? (resolvedAddressType === "contract" ? "N/A" : "N/A")}
                  </div>
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
            <SummaryBlock address={address!} summary={analysis?.summary ?? null} aiInsight={aiInsight} aiStatus={aiStatus} />
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
                <TokenOverview
                  address={address!}
                  deployer={metadata?.deployer ?? null}
                  token={analysis?.token}
                  variant={resolvedAddressType === "contract" ? "contract" : "token"}
                  contractName={metadata?.contractName ?? analysis?.token?.name ?? null}
                  isVerified={metadata?.isVerified}
                  sourceAvailable={Boolean(metadata?.sourceCode)}
                />
                <ProxyAddresses
                  implementation={metadata?.proxyImplementation ?? null}
                  owner={metadata?.proxyAdmin ?? metadata?.ownerAddress ?? null}
                />
                {resolvedAddressType === "token" ? (
                  <HolderInformation
                    holderCount={holderStats?.holderCount ?? null}
                    totalSupply={holderStats?.totalSupplyFormatted ?? holderStats?.totalSupply ?? null}
                    deployerShare={holderStats?.deployerPercent ?? null}
                    ownerShare={holderStats?.ownerPercent ?? null}
                    topTenPercent={holderStats?.topTenPercent ?? null}
                  />
                ) : (
                  <div className="rounded-2xl border border-white/20 bg-black/90 p-5 text-sm text-white/70">
                    Holder metrics are only shown for fungible tokens.
                  </div>
                )}
              </div>

              {/* Extras */}
              {resolvedAddressType === "token" && holders.length ? (
                <div>
                  <TopHoldersTable holders={holders} />
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}
      </div>
    </div>
  );
}

function backendStatusToClient(status?: "PASS" | "WARN" | "FAIL"): Status {
  if (status === "PASS") return "pass";
  if (status === "FAIL") return "fail";
  return "warn";
}

type IndicatorItemForExport = {
  key: IndicatorKey;
  title: string;
  status: Status;
  hint?: string;
  explanation?: string;
};

type SecurityRow = {
  title: string;
  category: string;
  description: string;
  status: Status;
};

function generateReportPdf({
  analysis,
  indicatorItems,
  securityRows,
  address,
  chainLabel,
  aiInsight,
}: {
  analysis: AnalysisResponse;
  indicatorItems: IndicatorItemForExport[];
  securityRows: SecurityRow[];
  address: string;
  chainLabel: string;
  aiInsight: string | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  let cursorY = margin;
  
  // Brand Colors
  const colors = {
    primary: [255, 167, 48], // #ffa730 - Brand Orange
    primaryLight: [255, 248, 235], // Very light orange for backgrounds
    secondary: [27, 20, 7], // Dark background equivalent
    text: [30, 30, 30], // Dark text
    textLight: [100, 100, 100],
    success: [34, 197, 94], // Green
    warning: [245, 158, 11], // Amber
    error: [239, 68, 68], // Red
    border: [230, 230, 230],
  };

  const ensureSpace = (height: number) => {
    if (cursorY + height > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  const addHeader = () => {
    // Top Bar
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 8, "F");
    
    cursorY += 25;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Auditly Report", margin, cursorY);
    
    // Date and Chain info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    const now = new Date().toLocaleString();
    doc.text(`Generated: ${now}`, pageWidth - margin, cursorY - 8, { align: "right" });
    doc.text(`${chainLabel} Network`, pageWidth - margin, cursorY + 5, { align: "right" });
    
    cursorY += 25;
    
    // Address Box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.roundedRect(margin, cursorY, usableWidth, 30, 4, 4, "FD");
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(address, margin + 10, cursorY + 19);
    
    cursorY += 50;
  };

  addHeader();

  // --- Risk Score Section ---
  const riskLabel = analysis.riskScore?.label ?? "Unknown";
  const riskScore = analysis.riskScore?.score ?? 0;
  let riskColor = colors.success;
  if (riskLabel === "Medium") riskColor = colors.warning;
  if (riskLabel === "High") riskColor = colors.error;

  // Risk Card Background
  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.roundedRect(margin, cursorY, usableWidth, 60, 6, 6, "F");
  
  // Score Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RISK SCORE", margin + 20, cursorY + 37);
  
  // Score Value
  doc.setFontSize(32);
  doc.text(`${riskScore}/100`, pageWidth - margin - 20, cursorY + 40, { align: "right" });
  
  // Score Label
  doc.setFontSize(14);
  doc.text(riskLabel.toUpperCase(), pageWidth - margin - 140, cursorY + 37, { align: "right" });
  
  cursorY += 90;


  // Helper for section titles
  const addSectionTitle = (title: string) => {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(title, margin, cursorY);
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(2);
    doc.line(margin, cursorY + 8, margin + 40, cursorY + 8); 
    cursorY += 30;
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]); 
  };

  // --- Token Info ---
  addSectionTitle("Asset Overview");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  const infoData = [
    [`Name: ${analysis.token?.name ?? "Unknown"}`, `Symbol: ${analysis.token?.symbol ?? "N/A"}`],
    [`Price: ${formatNumber(analysis.token?.priceUsd)}`, `Supply: ${analysis.token?.totalSupplyFormatted ?? "N/A"}`],
    [`Type: ${analysis.metadata?.addressType === "contract" ? "Contract" : "Token"}`, `Verified: ${analysis.metadata?.isVerified ? "Yes" : "No"}`]
  ];

  // Simple grid layout for info
  infoData.forEach(row => {
    doc.text(row[0], margin, cursorY);
    doc.text(row[1], margin + usableWidth / 2, cursorY);
    cursorY += 20;
  });
  cursorY += 20;

  // --- AI Insight Section ---
  if (aiInsight) {
    addSectionTitle("AI Smart Contract Analysis");
    
    // AI Insight Card
    doc.setFillColor(colors.primaryLight[0], colors.primaryLight[1], colors.primaryLight[2]);
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    
    // Prepare text first to calculate height
    const aiLines = aiInsight
        .split(/\n/)
        .map(line => 
          line
            .replace(/^[\s*•\-]+/, "") // Remove existing bullets
            .replace(/^\*\*/, "").replace(/\*\*$/, "") // Remove markdown bold
            .trim()
        )
        .filter(line => {
           if (line.length === 0) return false;
           if (/^[\s*]+$/.test(line)) return false;
           if (/^(here'?s?|this is|the following|below|i found|security analysis|potential risks)/i.test(line)) return false;
           if (/focusing (solely )?on/i.test(line)) return false;
           if (/provided smart contract/i.test(line)) return false;
           return true;
        });

    const cardPadding = 15;
    const textWidth = usableWidth - (cardPadding * 2);
    let totalTextHeight = 0;
    const lineSpacing = 18;
    
    // Calculate height
    const processedLines = aiLines.map(line => {
        const wrapped = doc.splitTextToSize(line, textWidth - 10); // -10 for bullet indent
        const h = wrapped.length * 14; // font size approx height
        totalTextHeight += h + 8; // +8 for paragraph gap
        return wrapped;
    });

    const boxHeight = totalTextHeight + (cardPadding * 2);
    
    ensureSpace(boxHeight);

    // Draw the box
    doc.roundedRect(margin, cursorY, usableWidth, boxHeight, 6, 6, "F");
    doc.setLineWidth(1);
    doc.roundedRect(margin, cursorY, usableWidth, boxHeight, 6, 6, "S"); // Border

    let textCursor = cursorY + cardPadding + 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    // Draw Title inside box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("AI GENERATED INSIGHTS", margin + cardPadding, textCursor - 5);
    textCursor += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    processedLines.forEach((wrappedText: string[]) => {
        // Draw custom bullet
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.circle(margin + cardPadding + 3, textCursor - 4, 2, "F");
        
        doc.text(wrappedText, margin + cardPadding + 12, textCursor);
        textCursor += (wrappedText.length * 14) + 8;
    });

    cursorY += boxHeight + 30;
  }

  // --- Key Findings ---
  addSectionTitle("Key Security Findings");
  
  const findings = analysis.summary?.keyFindings?.filter(f => f.trim()) ?? [];
  if (findings.length === 0) {
     doc.setFont("helvetica", "italic");
     doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
     doc.text("No major security exposures detected.", margin, cursorY);
     cursorY += 20;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    findings.forEach(item => {
        const text = item;
        const split = doc.splitTextToSize(text, usableWidth - 20);
        ensureSpace(split.length * 16);
        
        // Bullet
        doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2]);
        doc.circle(margin + 4, cursorY - 4, 2.5, "F");
        
        doc.text(split, margin + 15, cursorY);
        cursorY += split.length * 16 + 8;
    });
  }
  cursorY += 20;

  // --- Detailed Indicators ---
  addSectionTitle("Detailed Analysis");
  
  indicatorItems.forEach(item => {
    ensureSpace(60);
    
    // Status Indicator logic
    let statusColor = colors.textLight;
    let statusText = "UNKNOWN";
    
    if (item.status === "pass") { statusColor = colors.success; statusText = "PASS"; }
    else if (item.status === "fail") { statusColor = colors.error; statusText = "HIGH RISK"; }
    else if (item.status === "warn") { statusColor = colors.warning; statusText = "WARNING"; }

    // Row Background
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(margin, cursorY - 15, usableWidth, 30, 4, 4, "F"); // Fix height/radius/style

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(item.title, margin, cursorY);
    
    doc.setFontSize(11);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusText, pageWidth - margin, cursorY, { align: "right" });
    
    cursorY += 18;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const desc = item.hint || item.explanation || "No details.";
    const splitDesc = doc.splitTextToSize(desc, usableWidth);
    doc.text(splitDesc, margin, cursorY);
    
    cursorY += splitDesc.length * 14 + 15;
    
    // Thin Divider
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(1);
    doc.line(margin, cursorY - 10, pageWidth - margin, cursorY - 10);
  });

  // --- Footer ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer Line
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(2);
    doc.line(0, pageHeight - 6, pageWidth, pageHeight - 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount} | Generated by Auditly`, pageWidth / 2, pageHeight - 20, { align: "center" });
  }

  return doc;
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(2)}`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(2)}%`;
}
