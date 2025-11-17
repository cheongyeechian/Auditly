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

type Status = "pass" | "warn" | "fail";
type Indicators = {
  verifiedSource: Status;
  proxy: Status;
  ownerPrivileges: Status;
  dangerousFunctions: Status;
  liquidity: Status;
  holderDistribution: Status;
};

const INDICATOR_TITLES: Record<keyof Indicators, string> = {
  verifiedSource: "Verified Source",
  proxy: "Proxy / Upgradeable",
  ownerPrivileges: "Owner Privileges",
  dangerousFunctions: "Dangerous Functions",
  liquidity: "Liquidity Status",
  holderDistribution: "Holder Distribution",
};

const CHAINS = ["Ethereum", "Base", "BSC", "Polygon"];

export default function HomeClient() {
  const [address, setAddress] = useState<string | null>(null);
  const hasAddress = Boolean(address);
  const [selectedChain, setSelectedChain] = useState<string>(CHAINS[0]);
  const [isChainMenuOpen, setIsChainMenuOpen] = useState(false);
  const chainDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(event.target as Node)) {
        setIsChainMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sampleIndicators: Indicators = {
    verifiedSource: "pass",
    proxy: "warn",
    ownerPrivileges: "pass",
    dangerousFunctions: "fail",
    liquidity: "pass",
    holderDistribution: "warn",
  };

  const sampleHints: Record<keyof Indicators, string> = {
    verifiedSource: "Contract source is verified.",
    proxy: "Upgradeable pattern detected.",
    ownerPrivileges: "Limited admin controls.",
    dangerousFunctions: "Mint/burn/pause present.",
    liquidity: "Liquidity appears locked.",
    holderDistribution: "Top holder owns notable share.",
  };

  const sampleExplanations: Record<keyof Indicators, string> = {
    verifiedSource: "Verification enables community review.",
    proxy: "Upgradeability can change logic after deploy.",
    ownerPrivileges: "Admin rights can impact transfers or fees.",
    dangerousFunctions: "Supply-changing functions can affect price.",
    liquidity: "Locked liquidity reduces rug risk.",
    holderDistribution: "Concentration can enable manipulation.",
  };

  const sampleHolders: { address: string; percent: number }[] = [
    { address: "0x00000000000000000000000000000000000000a1", percent: 35.2 },
    { address: "0x00000000000000000000000000000000000000b2", percent: 18.7 },
    { address: "0x00000000000000000000000000000000000000c3", percent: 9.5 },
    { address: "0x00000000000000000000000000000000000000d4", percent: 3.1 },
  ];

  const indicatorDetails = (Object.keys(sampleExplanations) as (keyof Indicators)[]).map((key) => ({
    title: INDICATOR_TITLES[key],
    description: sampleExplanations[key],
  }));

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
                  {selectedChain}
                  <span className={`transition ${isChainMenuOpen ? "rotate-180" : ""}`}><ChevronDown className="w-4 h-4" /></span>
                </button>
                {isChainMenuOpen ? (
                  <ul
                    role="listbox"
                    aria-activedescendant={`chain-${selectedChain}`}
                    className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[#ffa730]/60 bg-black/95 text-sm text-white shadow-[0px_20px_45px_rgba(0,0,0,0.45)] backdrop-blur"
                  >
                    {CHAINS.map((chain) => (
                      <li key={chain}>
                        <button
                          id={`chain-${chain}`}
                          role="option"
                          aria-selected={chain === selectedChain}
                          className={`flex w-full items-center justify-between hover:bg-[#ffa730]/10 hover:text-[#ffa730] px-4 py-3 uppercase tracking-wide transition ${
                            chain === selectedChain ? "bg-[#ffa730]/10 text-[#ffa730]" : "text-white/80 hover:bg-white/5"
                          }`}
                          onClick={() => {
                            setSelectedChain(chain);
                            setIsChainMenuOpen(false);
                          }}
                        >
                          {chain}
                          {chain === selectedChain ? <span className="text-xs">●</span> : null}
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
            Currently scanning on <span className="font-semibold text-[#ffa730]">{selectedChain}</span>
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
              {indicatorDetails.map((item) => (
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1">
              <span className="text-xs text-white/70">Overall</span>
              <span className="text-xs font-semibold text-green-400">Low Risk</span>
            </div>
          </div>
          {/* Header row: token info | centered risk | mistake form */}
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            <GradientCard title="Token" contentClassName="mt-2 space-y-1">
              <div className="text-sm text-white/80">Liquid staked Ether 2.0</div>
              <div className="text-sm font-medium text-white">STETH</div>
              <div className="pt-2 text-sm text-white/60">Price (USD)</div>
              <div className="text-sm text-white">Unknown</div>
            </GradientCard>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <RiskScoreCard score={90} label="Low" />
              </div>
            </div>
          </div>
          <div>
            <SummaryBlock address={address!} label="Low" />
          </div>
                    
           {/* Content row: big findings table | right-side stacked cards */}
          <div className="">
            <div className="lg:col-span-2">
              <SecurityFindings />
            </div>
          </div>
          
          <div>
              <IndicatorsGrid indicators={sampleIndicators} hints={sampleHints} explanations={sampleExplanations} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <TokenOverview address={address!} deployer="0x55B...8F0FA" />
            <ProxyAddresses implementation="0x171445...6D17EB" owner="N/A" />
            <HolderInformation />
          </div>

          {/* Extras */}
          <div>
              <TopHoldersTable holders={sampleHolders} />
          </div>
        </section>
      ) : null}
    </div>
  );
}


