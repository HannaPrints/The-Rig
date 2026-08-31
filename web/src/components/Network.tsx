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
    <div className="px-6 py-7 first:pl-0 last:pr-0">
      <div className="num text-[26px] leading-none text-ink">
        {value}
        {unit && <span className="ml-1.5 text-sm text-muted">{unit}</span>}
      </div>
      <div className="label mt-2.5">{label}</div>
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
    <section id="network" className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">Network</h2>
        {!deployed && <span className="label">pre-launch — every counter reads zero</span>}
      </div>
      <div className="grid grid-cols-2 divide-line border-y border-line sm:grid-cols-3 sm:divide-x lg:grid-cols-5">
        <Stat label="cards made" value={fmt(made)} />
        <Stat label="cards living" value={fmt(living)} />
        <Stat label="network power" value={fmt(weight)} unit="MH/s" />
        <Stat label="$GPU streamed" value={fmt(streamed, 18)} />
        <Stat label="$GPU paid out" value={fmt(paid, 18)} />
      </div>
    </section>
  );
}
