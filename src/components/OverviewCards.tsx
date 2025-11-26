"use client";

function CardContainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/20 bg-black/90 p-5 text-white shadow-[0px_12px_30px_rgba(0,0,0,0.35)]">
      <header className="mb-4">
        <h3 className="text-sm md:text-lg font-semibold text-white uppercase tracking-wide">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

export function TokenOverview({
  address,
  deployer,
  token,
  variant = "token",
  contractName,
  isVerified,
  sourceAvailable,
}: {
  address: string;
  deployer: string | null;
  token?: { name?: string | null; symbol?: string | null };
  variant?: "token" | "contract";
  contractName?: string | null;
  isVerified?: boolean;
  sourceAvailable?: boolean;
}) {
  const title = variant === "contract" ? "Contract Overview" : "Token Overview";
  const displayName =
    variant === "contract"
      ? contractName ?? token?.name ?? "Unknown contract"
      : token?.name ?? "Unknown token";
  return (
    <CardContainer title={title}>
      <div className="space-y-3 text-sm text-white/80">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">
            {variant === "contract" ? "Contract" : "Token"}
          </div>
          <div className="text-white">
            {displayName}{" "}
            {variant === "token" && token?.symbol ? `(${token.symbol})` : ""}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Contract Address</div>
          <div className="font-mono break-all text-white">{address}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Contract Deployer</div>
          <div className="font-mono break-all text-white">{deployer ?? "Unknown"}</div>
        </div>
        {variant === "contract" ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <p className="uppercase tracking-wide text-white/60">Verified</p>
              <p className="font-semibold text-white">{isVerified ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <p className="uppercase tracking-wide text-white/60">Source</p>
              <p className="font-semibold text-white">{sourceAvailable ? "Loaded" : "Unavailable"}</p>
            </div>
          </div>
        ) : null}
      </div>
    </CardContainer>
  );
}

export function ProxyAddresses({
  implementation,
  owner,
}: {
  implementation: string | null;
  owner: string | null;
}) {
  return (
    <CardContainer title="Proxy Addresses">
      <div className="space-y-3 text-sm text-white/80">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Implementation Address</div>
          <div className="font-mono break-all text-white">{implementation ?? "N/A"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Proxy Owner Address</div>
          <div className="font-mono break-all text-white">{owner ?? "N/A"}</div>
        </div>
      </div>
    </CardContainer>
  );
}

export function HolderInformation({
  holderCount,
  totalSupply,
  deployerShare,
  ownerShare,
  topTenPercent,
}: {
  holderCount?: number | null;
  totalSupply?: string | null;
  deployerShare?: number | null;
  ownerShare?: number | null;
  topTenPercent?: number | null;
}) {
  const formatPercent = (value: number | null | undefined) => (typeof value === "number" ? `${value.toFixed(2)}%` : "N/A");
  return (
    <CardContainer title="Holder Information">
      <div className="space-y-3 text-sm text-white/80">
        <div className="flex items-center justify-between">
          <span className="text-white/60">Token Holders</span>
          <span className="text-white">{holderCount ?? "Unknown"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Total Supply</span>
          <span className="text-white">{totalSupply ?? "Unknown"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Deployer Balance</span>
          <span className="text-white">{formatPercent(deployerShare)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Owner Balance</span>
          <span className="text-white">{formatPercent(ownerShare)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Top 10 EOA Concentration</span>
          <span className="text-white">{formatPercent(topTenPercent)}</span>
        </div>
      </div>
    </CardContainer>
  );
}


