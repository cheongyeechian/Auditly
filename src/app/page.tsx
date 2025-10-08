import AddressSearch from "@/components/AddressSearch";
import RiskScoreCard from "@/components/RiskScoreCard";
import IndicatorsGrid from "@/components/IndicatorsGrid";
import TopHoldersTable from "@/components/TopHoldersTable";

type Status = "pass" | "warn" | "fail";
type Indicators = {
  verifiedSource: Status;
  proxy: Status;
  ownerPrivileges: Status;
  dangerousFunctions: Status;
  liquidity: Status;
  holderDistribution: Status;
};

export default function Home() {
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
    <div className="min-h-screen w-full flex flex-col items-center px-4 py-10 gap-6">
      <main className="w-full max-w-5xl flex flex-col items-center gap-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-center">On-Chain Risk Detection</h1>
        <div className="w-full max-w-xl">
          <AddressSearch defaultValue="0x1111111111111111111111111111111111111111" />
        </div>

        <section className="w-full space-y-4" aria-label="Risk summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <RiskScoreCard score={72} label="Low" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium">Address</p>
              <p className="font-mono break-all">0x1111111111111111111111111111111111111111</p>
              <p className="mt-2"><span className="font-medium">Type:</span> token</p>
            </div>
          </div>
          <IndicatorsGrid indicators={sampleIndicators} hints={sampleHints} explanations={sampleExplanations} />
          <TopHoldersTable holders={sampleHolders} />
        </section>
      </main>
    </div>
  );
}
