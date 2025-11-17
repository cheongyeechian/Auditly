"use client";

function CardContainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/90 p-5 text-white shadow-[0px_12px_30px_rgba(0,0,0,0.35)]">
      <header className="mb-4">
        <h3 className="text-sm md:text-lg font-semibold text-white uppercase tracking-wide">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

export function TokenOverview({ address, deployer }: { address: string; deployer: string }) {
  return (
    <CardContainer title="Token Overview">
      <div className="space-y-3 text-sm text-white/80">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Contract Address</div>
          <div className="font-mono break-all text-white">{address}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Contract Deployer</div>
          <div className="font-mono break-all text-white">{deployer}</div>
        </div>
      </div>
    </CardContainer>
  );
}

export function ProxyAddresses({ implementation, owner }: { implementation: string; owner: string }) {
  return (
    <CardContainer title="Proxy Addresses">
      <div className="space-y-3 text-sm text-white/80">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Implementation Address</div>
          <div className="font-mono break-all text-white">{implementation}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">Proxy Owner Address</div>
          <div className="font-mono break-all text-white">{owner}</div>
        </div>
      </div>
    </CardContainer>
  );
}

export function HolderInformation() {
  return (
    <CardContainer title="Holder Information">
      <div className="space-y-3 text-sm text-white/80">
        <div className="flex items-center justify-between">
          <span className="text-white/60">Token Holders</span>
          <span className="text-white">563,612</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Total Supply</span>
          <span className="text-white">8,589,707.079</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Deployer Balance</span>
          <span className="text-white">0.00 (0.00%)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Owner Balance</span>
          <span className="text-white">0.00 (0.00%)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Top 10 EOA Concentration</span>
          <span className="text-white">4.25%</span>
        </div>
      </div>
    </CardContainer>
  );
}


