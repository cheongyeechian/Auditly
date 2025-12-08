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
import { base, bsc, mainnet, polygon, scroll, arbitrum, type Chain } from "viem/chains";
import type { AnalysisResponse, FindingDetail, HolderRecord, IndicatorKey, RiskStatus, SupportedChain } from "@/types/analysis";

interface AnalyzeInput {
  chain: string;
  address: string;
  addressType?: AddressKind;
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
    chainId: number;
  };
}

interface ExplorerContractInfo {
  isVerified: boolean;
  abi: Abi | null;
  implementation: string | null;
  proxy: boolean;
  contractCreator: string | null;
  proxyAdmin: string | null;
  contractName: string | null;
  sourceCode: string | null;
}

interface TokenProfile {
  tokenName: string | null;
  priceUsd: number | null;
  holderCount: number | null;
  totalSupply: string | null;
  decimals: number | null;
}

interface ContractCreationInfo {
  contractCreator: string | null;
}

type AddressKind = "token" | "contract" | "auto";

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
      baseUrl: "https://api.etherscan.io/v2/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["ETHERSCAN_API_KEY"],
      chainId: 1,
    },
  },
  base: {
    slug: "base",
    displayName: "Base",
    chain: base,
    rpcUrl:`https://base-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: "https://api.etherscan.io/v2/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["ETHERSCAN_API_KEY"],
      chainId: 8453,
    },
  },
  polygon: {
    slug: "polygon",
    displayName: "Polygon",
    chain: polygon,
    rpcUrl:`https://polygon-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["ALCHEMY_POLYGON_RPC_URL", "ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: "https://api.etherscan.io/v2/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["ETHERSCAN_API_KEY"],
      chainId: 137,
    },
  },
  bsc: {
    slug: "bsc",
    displayName: "BNB Smart Chain",
    chain: bsc,
    rpcUrl: `https://bnb-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["BSC_RPC_URL", "ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: "https://api.etherscan.io/v2/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["ETHERSCAN_API_KEY"],
      chainId: 56,
    },
  },
  scroll: {
    slug: "scroll",
    displayName: "Scroll",
    chain: scroll,
    rpcUrl: `https://scroll-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: "https://api.etherscan.io/v2/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["ETHERSCAN_API_KEY"],
      chainId: 534352,
    },
  },
  arbitrum: {
    slug: "arbitrum",
    displayName: "Arbitrum",
    chain: arbitrum,
    rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${defaultAlchemyKey}`,
    rpcEnvHints: ["ALCHEMY_API_KEY"],
    explorer: {
      baseUrl: "https://api.etherscan.io/v2/api",
      apiKey: process.env.ETHERSCAN_API_KEY,
      apiEnvHints: ["ETHERSCAN_API_KEY"],
      chainId: 42161,
    },
  },
};

function buildExplorerUrl(config: ChainConfig, params: Record<string, string | number | undefined>) {
  const url = new URL(config.explorer.baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set("chainid", String(config.explorer.chainId));
  if (config.explorer.apiKey) {
    url.searchParams.set("apikey", config.explorer.apiKey);
  }
  return url;
}

function normalizeAddressKind(value?: string | null): AddressKind {
  if (!value) return "auto";
  const normalized = value.toLowerCase();
  if (normalized === "token") return "token";
  if (normalized === "contract") return "contract";
  return "auto";
}

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

// ============================================================================
// BYTECODE-BASED DETECTION (Cannot be obfuscated by renaming functions)
// These are 4-byte function selectors computed from keccak256 of signatures
// ============================================================================

// Known dangerous function selectors (first 4 bytes of keccak256 hash)
// These detect the ACTUAL function regardless of what it's named
const DANGEROUS_SELECTORS: Record<string, { name: string; risk: "high" | "medium"; description: string }> = {
  // Minting functions
  "40c10f19": { name: "mint(address,uint256)", risk: "high", description: "Can create new tokens" },
  "a0712d68": { name: "mint(uint256)", risk: "high", description: "Can create new tokens" },
  "4e6ec247": { name: "mint(address,uint256,bytes)", risk: "high", description: "Can create new tokens" },
  
  // Burning functions  
  "42966c68": { name: "burn(uint256)", risk: "medium", description: "Can destroy tokens" },
  "9dc29fac": { name: "burn(address,uint256)", risk: "high", description: "Can burn tokens from any address" },
  "79cc6790": { name: "burnFrom(address,uint256)", risk: "high", description: "Can burn tokens from any address" },
  
  // Pause functions
  "8456cb59": { name: "pause()", risk: "medium", description: "Can pause all transfers" },
  "3f4ba83a": { name: "unpause()", risk: "medium", description: "Can control transfer pausing" },
  "5c975abb": { name: "paused()", risk: "medium", description: "Has pause mechanism" },
  
  // Blacklist/Whitelist functions
  "44337ea1": { name: "blacklist(address)", risk: "high", description: "Can blacklist addresses" },
  "537df3b6": { name: "unBlacklist(address)", risk: "high", description: "Has blacklist mechanism" },
  "fe575a87": { name: "isBlacklisted(address)", risk: "medium", description: "Has blacklist mechanism" },
  "e47d6060": { name: "isBlackListed(address)", risk: "medium", description: "Has blacklist mechanism" },
  
  // Ownership functions
  "f2fde38b": { name: "transferOwnership(address)", risk: "medium", description: "Ownership can be transferred" },
  "715018a6": { name: "renounceOwnership()", risk: "medium", description: "Has ownership controls" },
  "8da5cb5b": { name: "owner()", risk: "medium", description: "Has owner role" },
  
  // Proxy/Upgrade functions
  "3659cfe6": { name: "upgradeTo(address)", risk: "high", description: "Contract can be upgraded" },
  "4f1ef286": { name: "upgradeToAndCall(address,bytes)", risk: "high", description: "Contract can be upgraded" },
  "5c60da1b": { name: "implementation()", risk: "medium", description: "Uses proxy pattern" },
  "f851a440": { name: "admin()", risk: "medium", description: "Has admin role" },
  
  // Fee/Tax functions
  "c0246668": { name: "setFee(address,bool)", risk: "medium", description: "Can modify fees" },
  "8c0b5e22": { name: "setMaxTxAmount(uint256)", risk: "medium", description: "Can limit transactions" },
  "e01af92c": { name: "setTaxFee(uint256)", risk: "medium", description: "Can modify tax fees" },
  
  // Emergency/Withdrawal functions
  "db2e21bc": { name: "emergencyWithdraw()", risk: "high", description: "Emergency fund withdrawal" },
  "5312ea8e": { name: "emergencyWithdraw(uint256)", risk: "high", description: "Emergency fund withdrawal" },
  "00f714ce": { name: "withdraw(uint256,address)", risk: "high", description: "Can withdraw funds" },
  "2e1a7d4d": { name: "withdraw(uint256)", risk: "medium", description: "Can withdraw funds" },
  "51cff8d9": { name: "withdraw(address)", risk: "high", description: "Can withdraw to any address" },
  
  // Self-destruct (checked via opcode, but also via function)
  "83197ef0": { name: "destroy()", risk: "high", description: "Can destroy contract" },
  "41c0e1b5": { name: "kill()", risk: "high", description: "Can destroy contract" },
  
  // Approve max / infinite approval traps
  "095ea7b3": { name: "approve(address,uint256)", risk: "medium", description: "Standard approve (check for max uint)" },
  "39509351": { name: "increaseAllowance(address,uint256)", risk: "medium", description: "Can increase allowance" },
  
  // Hidden fee/router manipulation
  "c9567bf9": { name: "openTrading()", risk: "medium", description: "Trading can be enabled/disabled" },
  "c49b9a80": { name: "setSwapAndLiquifyEnabled(bool)", risk: "medium", description: "Can manipulate liquidity" },
  "8ee88c53": { name: "setMaxWalletSize(uint256)", risk: "medium", description: "Can limit wallet holdings" },
  
  // Delegate call (can execute arbitrary code)
  "5c19a95c": { name: "delegate(address)", risk: "high", description: "Can delegate to external contract" },
};

// Dangerous opcodes in bytecode (these cannot be renamed)
const DANGEROUS_OPCODES: Record<string, { name: string; risk: "high" | "medium"; description: string }> = {
  "ff": { name: "SELFDESTRUCT", risk: "high", description: "Contract can be destroyed" },
  "f4": { name: "DELEGATECALL", risk: "high", description: "Can execute external code" },
  "fa": { name: "STATICCALL", risk: "medium", description: "Makes external calls" },
  "f2": { name: "CALLCODE", risk: "high", description: "Deprecated dangerous opcode" },
};

// Patterns in source code that indicate risk (for AI/source analysis)
const SOURCE_CODE_PATTERNS: Record<string, { risk: "high" | "medium"; description: string }> = {
  "selfdestruct": { risk: "high", description: "Contract can be destroyed" },
  "delegatecall": { risk: "high", description: "Can execute arbitrary external code" },
  "tx.origin": { risk: "medium", description: "Uses tx.origin (phishing vulnerability)" },
  "assembly": { risk: "medium", description: "Contains inline assembly" },
  "block.timestamp": { risk: "medium", description: "Relies on block timestamp (manipulatable)" },
  "transfer(": { risk: "medium", description: "Uses transfer (gas limit issues)" },
};

/**
 * Analyze source code for dangerous patterns
 * This is used alongside AI analysis for verified contracts
 */
export function analyzeSourceCodePatterns(sourceCode: string): Array<{ pattern: string; risk: "high" | "medium"; description: string }> {
  if (!sourceCode) return [];
  
  const findings: Array<{ pattern: string; risk: "high" | "medium"; description: string }> = [];
  const lowerSource = sourceCode.toLowerCase();
  
  for (const [pattern, info] of Object.entries(SOURCE_CODE_PATTERNS)) {
    if (lowerSource.includes(pattern.toLowerCase())) {
      findings.push({
        pattern,
        ...info,
      });
    }
  }
  
  return findings;
}

export async function analyzeContract(input: AnalyzeInput): Promise<AnalysisResponse> {
  const chainKey = normalizeChain(input.chain);
  if (!chainKey) {
    throw new AnalyzerError("Unsupported chain", 400);
  }

  if (!input?.address || !isAddress(input.address)) {
    throw new AnalyzerError("Invalid or missing address", 400);
  }

  const requestedKind = normalizeAddressKind(input.addressType);
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
  if (requestedKind === "contract" && (!bytecode || bytecode === "0x")) {
    throw new AnalyzerError("This address does not contain contract bytecode. Enter a deployed contract address.", 400);
  }

  const [explorerInfo, tokenProfile, contractCreation] = await Promise.all([
    fetchContractInfo(chainKey, checksumAddress),
    fetchTokenProfile(chainKey, checksumAddress),
    fetchContractCreation(chainKey, checksumAddress),
  ]);

  const totalSupplyFormatted =
    typeof totalSupply === "bigint" && typeof decimals === "number"
      ? formatUnits(totalSupply, decimals)
      : null;

  const autoTokenEvidence =
    Boolean(tokenProfile?.totalSupply) ||
    typeof decimals === "number" ||
    Boolean(symbol) ||
    Boolean(name) ||
    Boolean(totalSupplyFormatted);

  let resolvedKind: "token" | "contract";
  if (requestedKind === "auto") {
    resolvedKind = autoTokenEvidence ? "token" : "contract";
  } else if (requestedKind === "token" && !autoTokenEvidence) {
    throw new AnalyzerError(
      "Check the address network or switch to contract mode to continue.",
      400,
    );
  } else if (requestedKind === "contract") {
    resolvedKind = "contract";
  } else {
    resolvedKind = "token";
  }

  const shouldCollectTokenMetrics = resolvedKind === "token";
  const holders: HolderRecord[] = [];

  const findings = runFindings({
    bytecode,
    abi: explorerInfo?.abi ?? null,
    explorerInfo,
    holders,
    totalSupplyFormatted,
    isTokenContract: shouldCollectTokenMetrics,
  });

  const scoringIndicators: IndicatorKey[] = ["verifiedSource", "proxy", "ownerPrivileges", "dangerousFunctions"];
  const totalPenalty = scoringIndicators.reduce((sum, key) => sum + (findings[key]?.penalty ?? 0), 0);
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

  const holdersStats = shouldCollectTokenMetrics
    ? summarizeHolders(holders, {
        holderCountOverride: tokenProfile?.holderCount ?? null,
        deployer: deployerAddress,
        owner: ownerAddress,
      })
    : {
        holderCount: null,
        topHolderPercent: null,
        topTenPercent: null,
        deployerPercent: null,
        ownerPercent: null,
      };

  const tokenSection = shouldCollectTokenMetrics
    ? {
        name: tokenProfile?.tokenName ?? name ?? explorerInfo?.contractName ?? null,
        symbol: symbol ?? null,
        decimals: decimals ?? null,
        totalSupply: totalSupply ? totalSupply.toString() : tokenProfile?.totalSupply ?? null,
        totalSupplyFormatted: totalSupplyFormatted ?? tokenProfile?.totalSupply ?? null,
        priceUsd: tokenProfile?.priceUsd ?? null,
      }
    : {
        name: explorerInfo?.contractName ?? name ?? null,
        symbol: symbol ?? null,
        decimals: null,
        totalSupply: null,
        totalSupplyFormatted: null,
        priceUsd: null,
      };

  return {
    chain: config.displayName,
    token: tokenSection,
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
      totalSupply: shouldCollectTokenMetrics
        ? totalSupply
          ? totalSupply.toString()
          : tokenProfile?.totalSupply ?? null
        : null,
      totalSupplyFormatted: shouldCollectTokenMetrics ? tokenSection.totalSupplyFormatted : null,
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
      addressType: resolvedKind,
      contractName: explorerInfo?.contractName ?? null,
      isVerified: explorerInfo?.isVerified ?? false,
      sourceCode: explorerInfo?.sourceCode ?? null,
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
  if (normalized === "scroll") return "scroll";
  if (normalized === "arbitrum") return "arbitrum";
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
  const url = buildExplorerUrl(config, {
    module: "contract",
    action: "getsourcecode",
    address,
  });

  try {
    console.log("[fetchContractInfo] Fetching:", url.toString());
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[fetchContractInfo] Explorer API error: ${res.status} ${res.statusText}`);
      return null;
    }
    const json = (await res.json()) as ExplorerResponse<ExplorerSourceResult[]>;
    console.log("[fetchContractInfo] Response status:", json.status, "message:", json.message);
    
    if (!json.result || !Array.isArray(json.result) || !json.result[0]) {
      console.log("[fetchContractInfo] No result array or empty result");
      return null;
    }

    const entry = json.result[0] as ExplorerSourceResult;
    const abiNotVerifiedMsg = "Contract source code not verified";
    const hasValidAbi = entry.ABI && entry.ABI !== abiNotVerifiedMsg && entry.ABI.trim() !== "";
    const hasSourceCode = entry.SourceCode && entry.SourceCode.trim() !== "";
    const isVerified = Boolean(hasValidAbi || hasSourceCode);
    const abi = hasValidAbi ? safeParseAbi(entry.ABI) : null;

    console.log("[fetchContractInfo] Contract:", entry.ContractName, "| Verified:", isVerified, "| hasABI:", hasValidAbi, "| hasSource:", hasSourceCode);

    if (isVerified && hasSourceCode) {
      console.log("[fetchContractInfo] Source Code:", entry.SourceCode);
    }

    return {
      isVerified,
      abi,
      implementation: entry.Implementation || null,
      proxy: entry.Proxy === "1",
      contractCreator: entry.ContractCreator ? safeAddress(entry.ContractCreator) : null,
      proxyAdmin: entry.ProxyCreator ? safeAddress(entry.ProxyCreator) : null,
      contractName: entry.ContractName || null,
      sourceCode: hasSourceCode ? entry.SourceCode : null,
    };
  } catch (error) {
    console.error("[fetchContractInfo] failed", error);
    return null;
  }
}

async function fetchTokenProfile(chain: SupportedChain, address: Address): Promise<TokenProfile | null> {
  const config = chainConfigs[chain];
  const url = buildExplorerUrl(config, {
    module: "token",
    action: "tokeninfo",
    contractaddress: address,
  });

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as ExplorerResponse<ExplorerTokenInfoResult[]>;
    if (json.status === "0" || !Array.isArray(json.result) || !json.result[0]) return null;
    const info = json.result[0];
    return {
      tokenName: info.tokenName ?? info.symbol ?? null,
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
  const url = buildExplorerUrl(config, {
    module: "contract",
    action: "getcontractcreation",
    contractaddresses: address,
  });

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
  isTokenContract: boolean;
}): Record<IndicatorKey, FindingDetail> {
  const verifiedSource = analyzeVerifiedSource(context.explorerInfo);
  const proxy = analyzeProxy(context.explorerInfo, context.bytecode);
  const ownerPrivileges = analyzeOwnerPrivileges(context.abi, context.bytecode);
  const dangerousFunctions = analyzeDangerousFunctions(context.abi, context.bytecode, ownerPrivileges);
  return {
    verifiedSource,
    proxy,
    ownerPrivileges,
    dangerousFunctions,
  };
}

function analyzeVerifiedSource(info: ExplorerContractInfo | null): FindingDetail {
  const metadata = indicatorMetadata.verifiedSource;
  const hasParsedAbi = Boolean(info?.abi && Array.isArray(info.abi) && info.abi.length);
  const isVerified = Boolean(info?.isVerified || hasParsedAbi);

  if (isVerified) {
    return buildFinding("verifiedSource", "PASS", {
      reason: "Contract source is verified on the explorer.",
      penalty: 0,
    });
  }

  if (!info) {
    return buildFinding("verifiedSource", "WARN", {
      reason: "Could not confirm verification status from explorer.",
      penalty: 10,
    });
  }

  return buildFinding("verifiedSource", "FAIL", {
    reason: "Source is not verified; code cannot be audited easily.",
    penalty: metadata.maxPenalty,
  });
}

function analyzeProxy(info: ExplorerContractInfo | null, bytecode: Hex | null = null): FindingDetail {
  const metadata = indicatorMetadata.proxy;
  
  // ===== METHOD 1: Etherscan proxy detection =====
  const etherscanProxy = info?.proxy === true;
  
  // ===== METHOD 2: Bytecode selector detection for proxy patterns =====
  // These selectors indicate upgradeable proxy patterns
  const proxySelectors = [
    "3659cfe6", // upgradeTo(address)
    "4f1ef286", // upgradeToAndCall(address,bytes)
    "5c60da1b", // implementation()
    "f851a440", // admin()
    "8f283970", // changeAdmin(address)
    "3659cfe6", // upgradeTo(address) - UUPS
    "52d1902d", // proxiableUUID() - UUPS
  ];
  
  const bytecodeHex = bytecode ? bytecode.toLowerCase().replace("0x", "") : "";
  const detectedProxySelectors = proxySelectors.filter((sel) => bytecodeHex.includes(sel));
  
  // Also check for EIP-1967 storage slots (proxy implementation slot)
  // 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
  const eip1967Slot = "360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const hasEip1967 = bytecodeHex.includes(eip1967Slot.slice(0, 16)); // Check first part
  
  const bytecodeProxy = detectedProxySelectors.length > 0 || hasEip1967;
  const isProxy = etherscanProxy || bytecodeProxy;
  
  if (!isProxy) {
    return buildFinding("proxy", "PASS", {
      reason: "No proxy pattern detected in Etherscan data or bytecode.",
      penalty: 0,
    });
  }

  // Build evidence
  const evidence: Record<string, unknown> = {
    etherscanProxy,
    bytecodeProxyDetected: bytecodeProxy,
  };
  if (info?.implementation) evidence.implementation = info.implementation;
  if (info?.proxyAdmin) evidence.admin = info.proxyAdmin;
  if (detectedProxySelectors.length) {
    evidence.proxySelectors = detectedProxySelectors.map((sel) => {
      const info = DANGEROUS_SELECTORS[sel];
      return info ? info.name : sel;
    });
  }

  const hasOwner = Boolean(info?.proxyAdmin && info.proxyAdmin !== "0x0000000000000000000000000000000000000000");
  const hasUpgradeFunction = detectedProxySelectors.some((sel) => 
    sel === "3659cfe6" || sel === "4f1ef286"
  );
  
  if (hasUpgradeFunction && hasOwner) {
    return buildFinding("proxy", "WARN", {
      reason: "Upgradeable proxy with active admin - contract logic can be changed.",
      penalty: Math.min(15, metadata.maxPenalty),
      evidence,
    });
  }
  
  if (hasUpgradeFunction) {
    return buildFinding("proxy", "WARN", {
      reason: "Upgrade functions detected in bytecode - contract may be upgradeable.",
      penalty: 12,
      evidence,
    });
  }

  const penalty = hasOwner ? Math.min(12, metadata.maxPenalty) : 5;
  return buildFinding("proxy", "WARN", {
    reason: hasOwner 
      ? "Proxy detected with active admin." 
      : "Proxy detected, admin appears renounced.",
    penalty,
    evidence,
  });
}

function analyzeOwnerPrivileges(abi: Abi | null, bytecode: Hex | null = null): FindingDetail {
  const metadata = indicatorMetadata.ownerPrivileges;
  
  // ===== METHOD 1: Keyword-based detection from ABI =====
  const functionNames = abi ? getFunctionNames(abi) : [];
  const keywordMatches = functionNames.filter((name) =>
    OWNER_PRIVILEGE_KEYWORDS.some((kw) => name.includes(kw)),
  );
  const highRiskKeywordMatches = keywordMatches.filter((name) =>
    HIGH_OWNER_PRIVILEGES.some((kw) => name.includes(kw)),
  );

  // ===== METHOD 2: Bytecode selector detection (CANNOT be bypassed) =====
  const ownerSelectors = [
    "f2fde38b", // transferOwnership(address)
    "715018a6", // renounceOwnership()
    "8da5cb5b", // owner()
    "8456cb59", // pause()
    "3f4ba83a", // unpause()
    "44337ea1", // blacklist(address)
    "537df3b6", // unBlacklist(address)
    "c0246668", // setFee(address,bool)
    "8c0b5e22", // setMaxTxAmount(uint256)
    "e01af92c", // setTaxFee(uint256)
    "8ee88c53", // setMaxWalletSize(uint256)
  ];
  
  const highRiskOwnerSelectors = [
    "44337ea1", // blacklist(address)
    "537df3b6", // unBlacklist(address)
  ];
  
  const bytecodeHex = bytecode ? bytecode.toLowerCase().replace("0x", "") : "";
  const detectedSelectors = ownerSelectors.filter((sel) => bytecodeHex.includes(sel));
  const detectedHighRiskSelectors = highRiskOwnerSelectors.filter((sel) => bytecodeHex.includes(sel));

  // Build evidence
  const evidence: Record<string, unknown> = {};
  if (keywordMatches.length) evidence.keywordMatches = keywordMatches;
  if (detectedSelectors.length) {
    evidence.detectedSelectors = detectedSelectors.map((sel) => {
      const info = DANGEROUS_SELECTORS[sel];
      return info ? info.name : sel;
    });
  }

  // Determine risk level
  const hasHighRisk = highRiskKeywordMatches.length > 0 || detectedHighRiskSelectors.length > 0;
  const hasMediumRisk = keywordMatches.length > 0 || detectedSelectors.length > 0;

  if (hasHighRisk) {
    const reasons = [];
    if (detectedHighRiskSelectors.length) reasons.push("blacklist/whitelist capability detected in bytecode");
    if (highRiskKeywordMatches.length) reasons.push(`functions: ${describeKeywords(highRiskKeywordMatches)}`);
    return buildFinding("ownerPrivileges", "WARN", {
      reason: `Owner can restrict addresses: ${reasons.join("; ")}`,
      penalty: Math.min(18, metadata.maxPenalty),
      evidence,
    });
  }

  if (hasMediumRisk) {
    const count = Math.max(keywordMatches.length, detectedSelectors.length);
    return buildFinding("ownerPrivileges", "WARN", {
      reason: `${count} admin function(s) detected via bytecode/ABI analysis.`,
      penalty: 8,
      evidence,
    });
  }

  if (!abi && !bytecode) {
    return buildFinding("ownerPrivileges", "WARN", {
      reason: "Cannot inspect owner-only functions because ABI and bytecode unavailable.",
      penalty: 10,
    });
  }

  return buildFinding("ownerPrivileges", "PASS", {
    reason: "No sensitive owner-only functions detected in bytecode or ABI.",
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

  // ===== METHOD 1: Keyword-based detection (can be bypassed by renaming) =====
  const functionNames = abi ? getFunctionNames(abi) : [];
  const keywordMatches = functionNames.filter((name) =>
    DANGEROUS_FUNCTION_KEYWORDS.some((kw) => name.startsWith(kw)),
  );

  // ===== METHOD 2: Bytecode selector detection (CANNOT be bypassed) =====
  const selectorFindings = detectSelectorsInBytecode(bytecode);
  const highRiskSelectors = selectorFindings.filter((f) => f.risk === "high");
  const mediumRiskSelectors = selectorFindings.filter((f) => f.risk === "medium");

  // ===== METHOD 3: Dangerous opcode detection (CANNOT be bypassed) =====
  const opcodeFindings = detectDangerousOpcodes(bytecode);
  const highRiskOpcodes = opcodeFindings.filter((f) => f.risk === "high");

  // Combine all findings
  const allHighRisk = [...highRiskSelectors, ...highRiskOpcodes];
  const allMediumRisk = mediumRiskSelectors;

  // Build evidence for transparency
  const evidence: Record<string, unknown> = {};
  if (selectorFindings.length) {
    evidence.detectedFunctions = selectorFindings.map((f) => ({
      signature: f.name,
      risk: f.risk,
      description: f.description,
    }));
  }
  if (opcodeFindings.length) {
    evidence.dangerousOpcodes = opcodeFindings.map((f) => ({
      opcode: f.name,
      risk: f.risk,
      description: f.description,
    }));
  }
  if (keywordMatches.length) {
    evidence.keywordMatches = keywordMatches;
  }

  // Determine risk level based on findings
  if (allHighRisk.length >= 2) {
    const descriptions = allHighRisk.slice(0, 3).map((f) => f.description).join("; ");
    return buildFinding("dangerousFunctions", "FAIL", {
      reason: `${descriptions}`,
      penalty: metadata.maxPenalty,
      evidence,
    });
  }

  if (allHighRisk.length === 1) {
    return buildFinding("dangerousFunctions", "WARN", {
      reason: `High-risk capability: ${allHighRisk[0].description}`,
      penalty: 18,
      evidence,
    });
  }

  if (allMediumRisk.length >= 3) {
    const descriptions = allMediumRisk.slice(0, 3).map((f) => f.description).join("; ");
    return buildFinding("dangerousFunctions", "WARN", {
      reason: `Multiple admin capabilities: ${descriptions}`,
      penalty: 12,
      evidence,
    });
  }

  if (allMediumRisk.length > 0 || keywordMatches.length > 0) {
    const desc = allMediumRisk.length 
      ? allMediumRisk[0].description 
      : `Functions: ${describeKeywords(keywordMatches)}`;
    return buildFinding("dangerousFunctions", "WARN", {
      reason: `Admin capability detected: ${desc}`,
      penalty: 8,
      evidence,
    });
  }

  return buildFinding("dangerousFunctions", "PASS", {
    reason: "No dangerous function selectors or opcodes detected in bytecode.",
    penalty: 0,
  });
}

/**
 * Detect known dangerous function selectors in bytecode
 * This works by scanning for 4-byte function selectors which are
 * computed from keccak256 hash of function signatures - cannot be renamed
 */
function detectSelectorsInBytecode(bytecode: Hex | null): Array<{ name: string; risk: "high" | "medium"; description: string }> {
  if (!bytecode) return [];
  
  const findings: Array<{ name: string; risk: "high" | "medium"; description: string }> = [];
  const bytecodeHex = bytecode.toLowerCase().replace("0x", "");
  
  // Function selectors appear after PUSH4 opcode (0x63) in bytecode
  // They are also often found in the dispatcher section
  for (const [selector, info] of Object.entries(DANGEROUS_SELECTORS)) {
    // Check if selector exists in bytecode (function selectors are 4 bytes = 8 hex chars)
    if (bytecodeHex.includes(selector.toLowerCase())) {
      findings.push(info);
    }
  }
  
  return findings;
}

/**
 * Detect dangerous opcodes in bytecode
 * These are actual EVM instructions that cannot be hidden
 */
function detectDangerousOpcodes(bytecode: Hex | null): Array<{ name: string; risk: "high" | "medium"; description: string }> {
  if (!bytecode) return [];
  
  const findings: Array<{ name: string; risk: "high" | "medium"; description: string }> = [];
  const bytecodeHex = bytecode.toLowerCase().replace("0x", "");
  
  for (const [opcode, info] of Object.entries(DANGEROUS_OPCODES)) {
    // Opcodes need to be checked more carefully - they're single bytes
    // SELFDESTRUCT (0xff) and DELEGATECALL (0xf4) are particularly dangerous
    if (opcode === "ff" && bytecodeHex.includes("ff")) {
      // Additional check: ff could be part of data, but if it appears
      // in certain patterns it's more likely to be SELFDESTRUCT
      findings.push(info);
    } else if (opcode === "f4" && bytecodeHex.includes("f4")) {
      findings.push(info);
    } else if (opcode === "f2" && bytecodeHex.includes("f2")) {
      findings.push(info);
    }
  }
  
  return findings;
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

