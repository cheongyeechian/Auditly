"use client";

import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import RiskScoreCard from "@/components/RiskScoreCard";
import IndicatorsGrid from "@/components/IndicatorsGrid";
import TopHoldersTable from "@/components/TopHoldersTable";
import SecurityFindings from "@/components/SecurityFindings";
import { HolderInformation, ProxyAddresses, TokenOverview } from "@/components/OverviewCards";

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
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      <h1 className="text-2xl md:text-[60px] font-semibold text-center text-[#ffa730]">Risk Checker</h1>
      <div className="w-full max-w-xl">
        <AddressSearch defaultValue="0x1111111111111111111111111111111111111111" onSubmit={setAddress} />
      </div>

      {address ? (
        <section className="w-full space-y-6" aria-label="Risk summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1">
              <span className="text-xs text-white/70">Overall</span>
              <span className="text-xs font-semibold text-green-400">Low Risk</span>
            </div>
            <div className="text-xs text-white/70">
              <a className="underline hover:text-white" href={`https://gopluslabs.io/token-security/1/${address}`} target="_blank" rel="noreferrer">GoPlus</a>
              <span className="px-2">•</span>
              <a className="underline hover:text-white" href={`https://solidityscan.com/quickscan/${address}/etherscan/mainnet`} target="_blank" rel="noreferrer">SolidityScan</a>
              <span className="px-2">•</span>
              <a className="underline hover:text-white" href={`https://www.hashdit.io/token-scanner/eth/${address}`} target="_blank" rel="noreferrer">HashDit</a>
            </div>
          </div>
          {/* Header row: token info | centered risk | mistake form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Token</h3>
              <div className="text-xs text-white/70">Liquid staked Ether 2.0</div>
              <div className="text-sm font-medium">STETH</div>
              <div className="mt-3 text-xs text-white/60">Price (USD)</div>
              <div className="text-sm">Unknown</div>
            </section>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <RiskScoreCard score={90} label="Low" />
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> High Risk 0</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ffa730]" /> Medium Risk 1</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400" /> No Risk 5</span>
                </div>
              </div>
            </div>
            <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Mistake Form</h3>
              <p className="text-xs text-white/70">Believe there is a mistake? Fill out this form.</p>
              <button className="mt-3 px-3 py-2 rounded-md bg-white/10 text-white text-xs">Open</button>
            </section>
          </div>

          {/* Content row: big findings table | right-side stacked cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              <SecurityFindings />
            </div>
            <div className="space-y-4">
              <TokenOverview address={address} deployer="0x55B...8F0FA" />
              <ProxyAddresses implementation="0x171445...6D17EB" owner="N/A" />
              <HolderInformation />
            </div>
          </div>

          {/* Extras */}
          <div>
            <IndicatorsGrid indicators={sampleIndicators} hints={sampleHints} explanations={sampleExplanations} />
            <div className="mt-4">
              <TopHoldersTable holders={sampleHolders} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}


