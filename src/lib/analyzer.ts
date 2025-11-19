import {
  type Abi,
  type AbiFunction,
  type Address,
  type Hex,
  type PublicClient,
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
} from "viem";
import { base, bsc, mainnet, polygon, type Chain } from "viem/chains";
import type {
  AnalysisResponse,
  FindingDetail,
  HolderRecord,
  IndicatorKey,
  RiskStatus,
  SupportedChain,
} from "@/types/analysis";

interface AnalyzeInput {
  chain: string;
  address: string;
}

interface ChainConfig {
  slug: SupportedChain;
  displayName: string;
  chain: Chain;
  rpcUrl?: string;
  rpcEnvHints: string[];
  explorer: {
    baseUrl: string;
    apiKey?: string;
    apiEnvHints: string[];
  };
}

interface ExplorerContractInfo {
  isVerified: boolean;
  abi: Abi | null;
  implementation: string | null;
  proxy: boolean;
  contractCreator: string | null;
  proxyAdmin: string | null;
}

type RawHolderRow = {
  address: string | null;
  percent: number;
  tag?: string | null;
};

interface TokenProfile {
  priceUsd: number | null;
  holderCount: number | null;
  totalSupply: string | null;
  decimals: number | null;
}

interface ContractCreationInfo {
  contractCreator: string | null;
}

class AnalyzerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AnalyzerError";
    this.statusCode = statusCode;
  }
}

const defaultAlchemyKey = process.env.ALCHEMY_API_KEY;

const chainConfigs: Record<SupportedChain, ChainConfig> = {
  ethereum: {
    slug: "ethereum",
    displayName: "Ethereum",
    chain: mainnet,
    rpcUrl:`https://eth-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["ALCHEMY_ETHEREUM_RPC_URL", "ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: `https://api.etherscan.io/v2/api?chainid=1&action=balance&apikey=${process.env.ETHERSCAN_API_KEY}`,
      apiKey: process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["ETHERSCAN_API_KEY"],
    },
  },
  base: {
    slug: "base",
    displayName: "Base",
    chain: base,
    rpcUrl:`https://base-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: `https://api.basescan.org/v2/api?chainid=8453&action=balance&apikey=${process.env.ETHERSCAN_API_KEY}`,
      apiKey: process.env.BASESCAN_API_KEY ?? process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["BASESCAN_API_KEY", "ETHERSCAN_API_KEY"],
    },
  },
  polygon: {
    slug: "polygon",
    displayName: "Polygon",
    chain: polygon,
    rpcUrl:`https://polygon-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["ALCHEMY_POLYGON_RPC_URL", "ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: `https://api.polygonscan.com/v2/api?chainid=137&action=balance&apikey=${process.env.ETHERSCAN_API_KEY}`,
      apiKey: process.env.POLYGONSCAN_API_KEY ?? process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["POLYGONSCAN_API_KEY", "ETHERSCAN_API_KEY"],
    },
  },
  bsc: {
    slug: "bsc",
    displayName: "BNB Smart Chain",
    chain: bsc,
    rpcUrl: `https://bnb-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["BSC_RPC_URL", "ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: `https://api.bscscan.com/v2/api?chainid=56&action=balance&apikey=${process.env.ETHERSCAN_API_KEY}`,
      apiKey: process.env.BSCSCAN_API_KEY ?? process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["BSCSCAN_API_KEY", "ETHERSCAN_API_KEY"],
    },
  },
};

const indicatorMetadata: Record<
  IndicatorKey,
  {
    title: string;
    category: string;
    explanation: string;
    goodMessage: string;
    maxPenalty: number;
  }
> = {
  verifiedSource: {
    title: "Verified Source",
    category: "Code Security",
    explanation: "Verified source code allows anyone to audit and diff the contract.",
    goodMessage: "Contract source is verified on the explorer.",
    maxPenalty: 30,
  },
  proxy: {
    title: "Proxy / Upgradeable",
    category: "Proxy Security",
    explanation: "Upgradeable contracts can change logic after deployment.",
    goodMessage: "No proxy pattern detected.",
    maxPenalty: 15,
  },
  ownerPrivileges: {
    title: "Owner Privileges",
    category: "Admin Controls",
    explanation: "Owner-only functions can change fees, pause transfers or restrict wallets.",
    goodMessage: "No high-impact owner-only functions detected.",
    maxPenalty: 20,
  },
  dangerousFunctions: {
    title: "Dangerous Functions",
    category: "Red Flags",
    explanation: "Functions like mint, burn or emergency withdraw can impact supply or funds.",
    goodMessage: "No red-flag functions detected.",
    maxPenalty: 30,
  },
  liquidity: {
    title: "Liquidity Status",
    category: "Market Safety",
    explanation: "Centralized LP ownership can make rugs easier.",
    goodMessage: "Liquidity ownership looks diversified.",
    maxPenalty: 20,
  },
  holderDistribution: {
    title: "Holder Distribution",
    category: "Supply Concentration",
    explanation: "Whales that control supply can move markets or pause trading.",
    goodMessage: "No single holder controls a large share of supply.",
    maxPenalty: 25,
  },
};

const erc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const satisfies Abi;

const OWNER_PRIVILEGE_KEYWORDS = ["settax", "setfee", "setmax", "setlimit", "pause", "unpause", "blacklist", "whitelist"];
const HIGH_OWNER_PRIVILEGES = ["blacklist", "whitelist"];

const DANGEROUS_FUNCTION_KEYWORDS = ["mint", "burn", "withdraw", "emergencywithdraw", "rug", "swapandliquify", "delegatecall"];
const CRITICAL_DANGEROUS_KEYWORDS = ["emergencywithdraw", "rug", "swapandliquify", "delegatecall"];

export async function analyzeContract(input: AnalyzeInput): Promise<AnalysisResponse> {
  const chainKey = normalizeChain(input.chain);
  if (!chainKey) {
    throw new AnalyzerError("Unsupported chain", 400);
  }

  if (!input?.address || !isAddress(input.address)) {
    throw new AnalyzerError("Invalid or missing address", 400);
  }

  const checksumAddress = getAddress(input.address);
  const config = chainConfigs[chainKey];

  if (!config.rpcUrl) {
    throw new AnalyzerError(
      `RPC URL missing for ${config.displayName}. Set ${config.rpcEnvHints.join(" or ")}.`,
      500,
    );
  }

  if (!config.explorer.apiKey) {
    throw new AnalyzerError(
      `Explorer API key missing for ${config.displayName}. Set ${config.explorer.apiEnvHints.join(" or ")}.`,
      500,
    );
  }

  const client = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const [bytecode, name, symbol, decimals, totalSupply] = await Promise.all([
    safeGetBytecode(client, checksumAddress),
    safeReadContract<string>(client, checksumAddress, "name"),
    safeReadContract<string>(client, checksumAddress, "symbol"),
    safeReadContract<number>(client, checksumAddress, "decimals"),
    safeReadContract<bigint>(client, checksumAddress, "totalSupply"),
  ]);

  const [explorerInfo, holders, tokenProfile, contractCreation] = await Promise.all([
    fetchContractInfo(chainKey, checksumAddress),
    fetchTopHolders(chainKey, checksumAddress),
    fetchTokenProfile(chainKey, checksumAddress),
    fetchContractCreation(chainKey, checksumAddress),
  ]);

  const totalSupplyFormatted =
    typeof totalSupply === "bigint" && typeof decimals === "number"
      ? formatUnits(totalSupply, decimals)
      : null;

  const findings = runFindings({
    bytecode,
    abi: explorerInfo?.abi ?? null,
    explorerInfo,
    holders,
    totalSupplyFormatted,
  });

  const totalPenalty = Object.values(findings).reduce((sum, item) => sum + item.penalty, 0);
  const score = Math.max(0, 100 - totalPenalty);
  const label = scoreToLabel(score);

  const keyFindings = Object.values(findings)
    .filter((f) => f.status !== "PASS")
    .map((f) => f.reason);

  const goodSigns = Object.entries(findings)
    .filter(([, f]) => f.status === "PASS")
    .map(([key]) => indicatorMetadata[key as IndicatorKey].goodMessage);

  const deployerAddress = contractCreation?.contractCreator ?? explorerInfo?.contractCreator ?? null;
  const ownerAddress = explorerInfo?.proxyAdmin ?? deployerAddress ?? null;

  const holdersStats = summarizeHolders(holders, {
    holderCountOverride: tokenProfile?.holderCount ?? null,
    deployer: deployerAddress,
    owner: ownerAddress,
  });

  return {
    chain: config.displayName,
    token: {
      name: name ?? null,
      symbol: symbol ?? null,
      decimals: decimals ?? null,
      totalSupply: totalSupply ? totalSupply.toString() : null,
      totalSupplyFormatted,
      priceUsd: tokenProfile?.priceUsd ?? null,
    },
    riskScore: {
      score,
      label,
    },
    summary: {
      rating: `${label} Risk`,
      keyFindings: keyFindings.length ? keyFindings : ["No critical issues detected."],
      goodSigns: goodSigns.length ? goodSigns : ["Insufficient data for positive signals."],
    },
    findings,
    holders: {
      holderCount: holdersStats.holderCount,
      totalSupply: totalSupply ? totalSupply.toString() : tokenProfile?.totalSupply ?? null,
      totalSupplyFormatted: totalSupplyFormatted ?? tokenProfile?.totalSupply ?? null,
      topHolderPercent: holdersStats.topHolderPercent,
      topTenPercent: holdersStats.topTenPercent,
      deployerPercent: holdersStats.deployerPercent,
      ownerPercent: holdersStats.ownerPercent,
      top: holders,
    },
    metadata: {
      chainLabel: config.displayName,
      deployer: deployerAddress,
      ownerAddress,
      proxyImplementation: explorerInfo?.implementation ?? null,
      proxyAdmin: explorerInfo?.proxyAdmin ?? null,
    },
  };
}

export function isAnalyzerError(error: unknown): error is AnalyzerError {
  return error instanceof AnalyzerError;
}

function normalizeChain(chain?: string): SupportedChain | null {
  if (!chain) return "ethereum";
  const normalized = chain.toLowerCase();
  if (normalized === "eth" || normalized === "ethereum") return "ethereum";
  if (normalized === "base") return "base";
  if (normalized === "polygon" || normalized === "matic") return "polygon";
  if (normalized === "bsc" || normalized === "bnb") return "bsc";
  return null;
}

async function safeGetBytecode(client: PublicClient, address: Address): Promise<Hex | null> {
  try {
    return (await client.getBytecode({ address })) ?? null;
  } catch {
    return null;
  }
}

async function safeReadContract<T>(
  client: PublicClient,
  address: Address,
  functionName: "name" | "symbol" | "decimals" | "totalSupply",
): Promise<T | null> {
  try {
    return (await client.readContract({
      abi: erc20Abi,
      address,
      functionName,
    })) as T;
  } catch {
    return null;
  }
}

async function fetchContractInfo(chain: SupportedChain, address: Address): Promise<ExplorerContractInfo | null> {
  const config = chainConfigs[chain];
  const url = new URL(config.explorer.baseUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", config.explorer.apiKey ?? "");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as ExplorerResponse<ExplorerSourceResult[]>;
  if (!json.result || !Array.isArray(json.result) || !json.result[0]) {
    return null;
  }

  const entry = json.result[0] as ExplorerSourceResult;
  const abi =
    entry.ABI && entry.ABI !== "Contract source code not verified"
      ? safeParseAbi(entry.ABI)
      : null;

  return {
    isVerified: entry.ABI !== "Contract source code not verified",
    abi,
    implementation: entry.Implementation || null,
    proxy: entry.Proxy === "1",
    contractCreator: entry.ContractCreator ? safeAddress(entry.ContractCreator) : null,
    proxyAdmin: entry.ProxyCreator ? safeAddress(entry.ProxyCreator) : null,
  };
}

async function fetchTopHolders(chain: SupportedChain, address: Address): Promise<HolderRecord[]> {
  const config = chainConfigs[chain];
  const url = new URL(config.explorer.baseUrl);
  url.searchParams.set("module", "token");
  url.searchParams.set("action", "tokenholderlist");
  url.searchParams.set("contractaddress", address);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "10");
  url.searchParams.set("apikey", config.explorer.apiKey ?? "");

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as ExplorerResponse<ExplorerHolderResult[]>;
    if (json.status === "0" || !Array.isArray(json.result)) return [];
    const parsed: RawHolderRow[] = json.result.map((row) => ({
      address: safeAddress(row.TokenHolderAddress ?? row.HolderAddress ?? row.Address) ?? null,
      percent: toNumber(row.Percentage),
      tag: row.TokenHolderAddressTag ?? row.AddressTag ?? null,
    }));

    return parsed
      .filter((row): row is RawHolderRow & { address: string } => Boolean(row.address))
      .map((row) => ({
        address: row.address,
        percent: row.percent,
        tag: row.tag ?? null,
      }));
  } catch {
    return [];
  }
}

async function fetchTokenProfile(chain: SupportedChain, address: Address): Promise<TokenProfile | null> {
  const config = chainConfigs[chain];
  const url = new URL(config.explorer.baseUrl);
  url.searchParams.set("module", "token");
  url.searchParams.set("action", "tokeninfo");
  url.searchParams.set("contractaddress", address);
  url.searchParams.set("apikey", config.explorer.apiKey ?? "");

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as ExplorerResponse<ExplorerTokenInfoResult[]>;
    if (json.status === "0" || !Array.isArray(json.result) || !json.result[0]) return null;
    const info = json.result[0];
    return {
      priceUsd: toOptionalNumber(info.tokenPriceUSD ?? info.tokenPriceUsd ?? info.priceUsd),
      holderCount: toOptionalNumber(info.holderCount ?? info.holders),
      totalSupply: info.totalSupply ?? null,
      decimals: toOptionalNumber(info.decimals ?? info.divisor),
    };
  } catch {
    return null;
  }
}

async function fetchContractCreation(chain: SupportedChain, address: Address): Promise<ContractCreationInfo | null> {
  const config = chainConfigs[chain];
  const url = new URL(config.explorer.baseUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getcontractcreation");
  url.searchParams.set("contractaddresses", address);
  url.searchParams.set("apikey", config.explorer.apiKey ?? "");

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as ExplorerResponse<ExplorerContractCreationResult[]>;
    if (json.status === "0" || !Array.isArray(json.result) || !json.result[0]) return null;
    return {
      contractCreator: safeAddress(json.result[0].contractCreator),
    };
  } catch {
    return null;
  }
}

function runFindings(context: {
  bytecode: Hex | null;
  abi: Abi | null;
  explorerInfo: ExplorerContractInfo | null;
  holders: HolderRecord[];
  totalSupplyFormatted: string | null;
}): Record<IndicatorKey, FindingDetail> {
  const verifiedSource = analyzeVerifiedSource(context.explorerInfo);
  const proxy = analyzeProxy(context.explorerInfo);
  const ownerPrivileges = analyzeOwnerPrivileges(context.abi);
  const dangerousFunctions = analyzeDangerousFunctions(context.abi, context.bytecode, ownerPrivileges);
  const liquidity = analyzeLiquidity(context.holders);
  const holderDistribution = analyzeHolderDistribution(context.holders);

  return {
    verifiedSource,
    proxy,
    ownerPrivileges,
    dangerousFunctions,
    liquidity,
    holderDistribution,
  };
}

function analyzeVerifiedSource(info: ExplorerContractInfo | null): FindingDetail {
  const metadata = indicatorMetadata.verifiedSource;
  const isVerified = Boolean(info?.abi && Array.isArray(info.abi) && info.abi.length);
  if (isVerified) {
    return buildFinding("verifiedSource", "PASS", {
      reason: "Contract source is verified on the explorer.",
      penalty: 0,
    });
  }
  return buildFinding("verifiedSource", "FAIL", {
    reason: "Source is not verified; code cannot be audited easily.",
    penalty: metadata.maxPenalty,
  });
}

function analyzeProxy(info: ExplorerContractInfo | null): FindingDetail {
  const metadata = indicatorMetadata.proxy;
  if (!info?.proxy) {
    return buildFinding("proxy", "PASS", {
      reason: "No proxy pattern detected.",
      penalty: 0,
    });
  }

  const hasOwner = Boolean(info.proxyAdmin && info.proxyAdmin !== "0x0000000000000000000000000000000000000000");
  const penalty = hasOwner ? Math.min(12, metadata.maxPenalty) : 5;
  const status: RiskStatus = hasOwner ? "WARN" : "WARN";
  const reason = hasOwner
    ? "Upgradeable proxy with admin that can change logic at any time."
    : "Proxy detected, but admin address appears renounced.";

  return buildFinding("proxy", status, {
    reason,
    penalty,
    evidence: {
      implementation: info.implementation,
      admin: info.proxyAdmin,
    },
  });
}

function analyzeOwnerPrivileges(abi: Abi | null): FindingDetail {
  const metadata = indicatorMetadata.ownerPrivileges;
  if (!abi) {
    return buildFinding("ownerPrivileges", "WARN", {
      reason: "Cannot inspect owner-only functions because ABI is unavailable.",
      penalty: 10,
    });
  }

  const functionNames = getFunctionNames(abi);
  const matches = functionNames.filter((name) =>
    OWNER_PRIVILEGE_KEYWORDS.some((kw) => name.includes(kw)),
  );
  const highRiskMatches = matches.filter((name) =>
    HIGH_OWNER_PRIVILEGES.some((kw) => name.includes(kw)),
  );

  if (highRiskMatches.length) {
    return buildFinding("ownerPrivileges", "WARN", {
      reason: `Owner can ${describeKeywords(highRiskMatches)}.`,
      penalty: Math.min(18, metadata.maxPenalty),
    });
  }

  if (matches.length) {
    return buildFinding("ownerPrivileges", "WARN", {
      reason: `Admin functions detected (${describeKeywords(matches)}).`,
      penalty: 8,
    });
  }

  return buildFinding("ownerPrivileges", "PASS", {
    reason: "No sensitive owner-only functions detected.",
    penalty: 0,
  });
}

function analyzeDangerousFunctions(abi: Abi | null, bytecode: Hex | null, ownerFinding?: FindingDetail): FindingDetail {
  const metadata = indicatorMetadata.dangerousFunctions;
  if (!abi && !bytecode) {
    return buildFinding("dangerousFunctions", "WARN", {
      reason: "Bytecode/ABI unavailable, cannot scan for red-flag functions.",
      penalty: 12,
    });
  }

  const functionNames = abi ? getFunctionNames(abi) : [];
  const matches = functionNames.filter((name) =>
    DANGEROUS_FUNCTION_KEYWORDS.some((kw) => name.startsWith(kw)),
  );
  const criticalMatches = matches.filter((name) =>
    CRITICAL_DANGEROUS_KEYWORDS.some((kw) => name.startsWith(kw)),
  );
  const ownerOverlap = matches.filter((name) =>
    OWNER_PRIVILEGE_KEYWORDS.some((kw) => name.startsWith(kw)),
  );

  const selfDestructDetected = hasOpcode(bytecode, "ff") || hasOpcode(bytecode, "fe");

  if (selfDestructDetected || criticalMatches.length) {
    return buildFinding("dangerousFunctions", "FAIL", {
      reason: "Critical red-flag functions present (selfdestruct/delegate/emergency withdraw).",
      penalty: metadata.maxPenalty,
    });
  }

  if (!matches.length) {
    return buildFinding("dangerousFunctions", "PASS", {
      reason: "No obvious red-flag functions detected.",
      penalty: 0,
    });
  }

  if (ownerOverlap.length === matches.length && ownerFinding && ownerFinding.status !== "PASS") {
    return buildFinding("dangerousFunctions", "PASS", {
      reason: "Only owner-admin functions detected; already penalized under owner privileges.",
      penalty: 0,
    });
  }

  if (matches.length) {
    return buildFinding("dangerousFunctions", "WARN", {
      reason: `Supply-changing functions detected (${describeKeywords(matches)}).`,
      penalty: 12,
    });
  }

  return buildFinding("dangerousFunctions", "PASS", {
    reason: "No obvious red-flag functions detected.",
    penalty: 0,
  });
}

function analyzeLiquidity(holders: HolderRecord[]): FindingDetail {
  const metadata = indicatorMetadata.liquidity;
  if (!holders.length) {
    return buildFinding("liquidity", "WARN", {
      reason: "Liquidity holder data not available.",
      penalty: 10,
    });
  }

  const lpHolder = holders.find((holder) =>
    holder.tag ? /lp|liquidity|uni|pancake|pair/i.test(holder.tag) : false,
  );

  if (!lpHolder) {
    return buildFinding("liquidity", "WARN", {
      reason: "Could not identify LP ownership; assume unlocked.",
      penalty: 10,
    });
  }

  if (lpHolder.percent >= 50) {
    return buildFinding("liquidity", "FAIL", {
      reason: "Single wallet controls more than 50% of LP tokens.",
      penalty: metadata.maxPenalty,
    });
  }

  if (lpHolder.percent >= 20) {
    return buildFinding("liquidity", "WARN", {
      reason: "LP ownership is concentrated (20-50%).",
      penalty: 10,
    });
  }

  return buildFinding("liquidity", "PASS", {
    reason: "LP tokens appear distributed.",
    penalty: 0,
  });
}

function analyzeHolderDistribution(holders: HolderRecord[]): FindingDetail {
  const metadata = indicatorMetadata.holderDistribution;
  if (!holders.length) {
    return buildFinding("holderDistribution", "WARN", {
      reason: "Holder distribution unavailable.",
      penalty: 10,
    });
  }

  const topHolder = holders[0];
  if (topHolder.percent > 40) {
    return buildFinding("holderDistribution", "FAIL", {
      reason: "Single wallet controls over 40% of supply.",
      penalty: metadata.maxPenalty,
    });
  }
  if (topHolder.percent >= 20) {
    return buildFinding("holderDistribution", "WARN", {
      reason: "Top holder controls 20-40% of supply.",
      penalty: 10,
    });
  }
  return buildFinding("holderDistribution", "PASS", {
    reason: "No single holder owns more than 20% of supply.",
    penalty: 0,
  });
}

function summarizeHolders(
  holders: HolderRecord[],
  options?: { holderCountOverride?: number | null; deployer?: string | null; owner?: string | null },
) {
  const holderCount = options?.holderCountOverride ?? (holders.length ? holders.length : null);
  const topHolderPercent = holders[0]?.percent ?? null;
  const topTenPercent = holders.slice(0, 10).reduce((sum, holder) => sum + holder.percent, 0);

  const normalize = (address?: string | null) => (address ? address.toLowerCase() : null);
  const normalizedHolders = holders.map((holder) => ({
    ...holder,
    address: holder.address.toLowerCase(),
  }));

  const findPercent = (target: string | null) => {
    if (!target) return null;
    const match = normalizedHolders.find((holder) => holder.address === target);
    return match ? match.percent : null;
  };

  return {
    holderCount,
    topHolderPercent,
    topTenPercent: holders.length ? topTenPercent : null,
    deployerPercent: findPercent(normalize(options?.deployer ?? null)),
    ownerPercent: findPercent(normalize(options?.owner ?? null)),
  };
}

function buildFinding(
  key: IndicatorKey,
  status: RiskStatus,
  detail: { reason: string; penalty: number; evidence?: Record<string, unknown> },
): FindingDetail {
  const metadata = indicatorMetadata[key];
  const penalty = Math.min(detail.penalty, metadata.maxPenalty);
  return {
    key,
    title: metadata.title,
    category: metadata.category,
    status,
    reason: detail.reason,
    hint: detail.reason,
    penalty,
    explanation: metadata.explanation,
    evidence: detail.evidence,
  };
}

function getFunctionNames(abi: Abi): string[] {
  return abi
    .filter((item): item is AbiFunction => item.type === "function")
    .map((item) => item.name.toLowerCase());
}

function describeKeywords(matches: string[]): string {
  const unique = Array.from(new Set(matches));
  return unique
    .slice(0, 4)
    .map((match) => match.replace(/[^a-z0-9]/gi, ""))
    .join(", ");
}

function hasOpcode(bytecode: Hex | null, opcode: string) {
  if (!bytecode) return false;
  return bytecode.toLowerCase().includes(opcode);
}

function scoreToLabel(score: number): "Low" | "Medium" | "High" {
  if (score >= 80) return "Low";
  if (score >= 50) return "Medium";
  return "High";
}

function safeParseAbi(raw: string): Abi | null {
  try {
    return JSON.parse(raw) as Abi;
  } catch {
    return null;
  }
}

function safeAddress(value?: string | null): string | null {
  if (!value) return null;
  try {
    return getAddress(value as Address);
  } catch {
    return null;
  }
}

function toNumber(value?: string | number | null): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value?: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type ExplorerResponse<T> = {
  status: "0" | "1";
  message: string;
  result: T;
};

type ExplorerSourceResult = {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
  ContractCreator: string;
  ProxyCreator?: string;
};

type ExplorerHolderResult = {
  TokenHolderAddress?: string;
  TokenHolderAddressTag?: string | null;
  TokenHolderQuantity?: string;
  Percentage?: string;
  HolderAddress?: string;
  Address?: string;
  AddressTag?: string;
};

type ExplorerTokenInfoResult = {
  tokenName?: string;
  symbol?: string;
  totalSupply?: string;
  priceUsd?: string;
  tokenPriceUSD?: string;
  tokenPriceUsd?: string;
  holderCount?: string;
  holders?: string;
  divisor?: string;
  decimals?: string;
};

type ExplorerContractCreationResult = {
  contractAddress: string;
  contractCreator: string;
  txHash: string;
};

export { AnalyzerError };

