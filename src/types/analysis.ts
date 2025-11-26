export type SupportedChain = "ethereum" | "base" | "polygon" | "bsc";

export type IndicatorKey =
  | "verifiedSource"
  | "proxy"
  | "ownerPrivileges"
  | "dangerousFunctions"
  | "liquidity"
  | "holderDistribution";

export type RiskStatus = "PASS" | "WARN" | "FAIL";

export interface HolderRecord {
  address: string;
  percent: number;
  tag?: string | null;
}

export interface FindingDetail {
  key: IndicatorKey;
  title: string;
  category: string;
  status: RiskStatus;
  reason: string;
  penalty: number;
  hint: string;
  explanation: string;
  evidence?: Record<string, unknown>;
}

export interface AnalysisResponse {
  chain: string;
  token: {
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    totalSupply: string | null;
    totalSupplyFormatted: string | null;
    priceUsd: number | null;
  };
  riskScore: {
    score: number;
    label: "Low" | "Medium" | "High";
  };
  summary: {
    rating: string;
    keyFindings: string[];
    goodSigns: string[];
  };
  findings: Record<IndicatorKey, FindingDetail>;
  holders: {
    holderCount: number | null;
    totalSupply: string | null;
    totalSupplyFormatted: string | null;
    topHolderPercent: number | null;
    topTenPercent: number | null;
    deployerPercent: number | null;
    ownerPercent: number | null;
    top: HolderRecord[];
  };
  metadata: {
    chainLabel: string;
    deployer: string | null;
    ownerAddress: string | null;
    proxyImplementation: string | null;
    proxyAdmin: string | null;
    addressType: "token" | "contract";
    contractName: string | null;
    isVerified: boolean;
    sourceCode: string | null;
  };
}

