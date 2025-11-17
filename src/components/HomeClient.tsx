"use client";

import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import RiskScoreCard from "@/components/RiskScoreCard";
import IndicatorsGrid from "@/components/IndicatorsGrid";
import TopHoldersTable from "@/components/TopHoldersTable";
import SecurityFindings from "@/components/SecurityFindings";
import { HolderInformation, ProxyAddresses, TokenOverview } from "@/components/OverviewCards";
import SummaryBlock from "@/components/SummaryBlock";
import { GradientCard } from "@/components/ui/GradientCard";

type Status = "pass" | "warn" | "fail";
type Indicators = {
  verifiedSource: Status;
  proxy: Status;
  ownerPrivileges: Status;
  dangerousFunctions: Status;
  liquidity: Status;
  holderDistribution: Status;
};

export default function HomeClient() {
  const [address, setAddress] = useState<string | null>(null);
  const hasAddress = Boolean(address);

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

  return (
    <div
      className={`w-full max-w-5xl mx-auto flex flex-col items-center gap-6 transition-all duration-300 ${
        hasAddress ? "py-8 md:py-10" : "min-h-screen justify-center"
      }`}
    >
      <div className={`flex w-full flex-col items-center gap-6 ${hasAddress ? "" : " text-center"}`}>
        <h1
          className={`text-center text-2xl font-semibold text-[#ffa730] transition-all duration-300 ${
            hasAddress ? "md:text-[72px]" : "md:text-[100px]"
          }`}
        >
          Risk Checker
        </h1>
        <div className="w-full max-w-xl">
          <AddressSearch defaultValue="0x1111111111111111111111111111111111111111" onSubmit={setAddress} />
        </div>
      </div>

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


