"use client";

export function TokenOverview({ address, deployer }: { address: string; deployer: string }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur">
      <header className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Token Overview</h3>
      </header>
      <div className="px-4 py-3 text-sm text-white/80 space-y-2">
        <div>
          <div className="text-white/60">Contract Address</div>
          <div className="font-mono break-all">{address}</div>
        </div>
        <div>
          <div className="text-white/60">Contract Deployer</div>
          <div className="font-mono break-all">{deployer}</div>
        </div>
      </div>
    </section>
  );
}

export function ProxyAddresses({ implementation, owner }: { implementation: string; owner: string }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur">
      <header className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Proxy Addresses</h3>
      </header>
      <div className="px-4 py-3 text-sm text-white/80 space-y-2">
        <div>
          <div className="text-white/60">Implementation Address</div>
          <div className="font-mono break-all">{implementation}</div>
        </div>
        <div>
          <div className="text-white/60">Proxy Owner Address</div>
          <div className="font-mono break-all">{owner}</div>
        </div>
      </div>
    </section>
  );
}

export function HolderInformation() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur">
      <header className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Holder Information</h3>
      </header>
      <div className="px-4 py-3 text-sm text-white/80 space-y-2">
        <div className="flex items-center justify-between"><span className="text-white/60">Token Holders</span><span>563,612</span></div>
        <div className="flex items-center justify-between"><span className="text-white/60">Total Supply</span><span>8,589,707.079</span></div>
        <div className="flex items-center justify-between"><span className="text-white/60">Deployer Balance</span><span>0.00 (0.00%)</span></div>
        <div className="flex items-center justify-between"><span className="text-white/60">Owner Balance</span><span>0.00 (0.00%)</span></div>
        <div className="flex items-center justify-between"><span className="text-white/60">Top 10 EOA Concentration</span><span>4.25%</span></div>
      </div>
    </section>
  );
}


