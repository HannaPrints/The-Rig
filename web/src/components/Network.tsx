import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { addresses, deployed } from "../config";
import { shopAbi, rigAbi, cardAbi } from "../abi";

function fmt(v: bigint | undefined, decimals = 0): string {
  if (v === undefined) return "0";
  const n = Number(decimals ? formatUnits(v, decimals) : v);
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="panel p-4">
      <div className="glow text-2xl text-phosphor">
        {value}
        {unit && <span className="ml-1 text-sm text-phosphor-dim">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] tracking-widest text-ink">{label}</div>
    </div>
  );
}

export function Network() {
  const q = { query: { enabled: deployed } };
  const { data: made } = useReadContract({ address: addresses.shop, abi: shopAbi, functionName: "madeCount", ...q });
  const { data: living } = useReadContract({ address: addresses.card, abi: cardAbi, functionName: "livingCount", ...q });
  const { data: weight } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalWeight", ...q });
  const { data: paid } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalPaidOut", ...q });
  const { data: streamed } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalStreamed", ...q });

  return (
    <section id="network" className="py-12">
      <h2 className="panel-title mb-6 text-sm">▚ NETWORK</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="CARDS MADE" value={fmt(made)} />
        <Stat label="CARDS LIVING" value={fmt(living)} />
        <Stat label="NETWORK POWER" value={fmt(weight)} unit="MH/s" />
        <Stat label="$GPU STREAMED" value={fmt(streamed, 18)} />
        <Stat label="$GPU PAID OUT" value={fmt(paid, 18)} />
      </div>
      {!deployed && (
        <p className="mt-4 text-xs text-phosphor-dim">
          nothing minted yet — the shop opens when the contracts go live on Robinhood Chain.
        </p>
      )}
    </section>
  );
}
