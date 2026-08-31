import { useEffect, useRef, useState } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { addresses, deployed, links } from "../config";
import { shopAbi, rigAbi, cardAbi, vaultAbi, feeRouterAbi } from "../abi";

function useNum(v: bigint | undefined, decimals = 0): number {
  if (v === undefined) return 0;
  return Number(decimals ? formatUnits(v, decimals) : v);
}

/** Smoothly animates a displayed number toward `target`. */
function useEased(target: number, ms = 900): number {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  const start = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    from.current = val;
    start.current = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start.current) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(from.current + (target - from.current) * e);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

function fmt(n: number, max = 0): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { maximumFractionDigits: max });
}

function BigStat({
  label,
  value,
  sub,
  accent,
  verifyHref,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  verifyHref?: string;
}) {
  return (
    <div className="panel p-6">
      <div className="flex items-baseline justify-between">
        <div className="label">{label}</div>
        {verifyHref && (
          <a href={verifyHref} target="_blank" rel="noreferrer" className="label text-accent hover:underline">
            verify ↗
          </a>
        )}
      </div>
      <div className={`num mt-3 text-[32px] leading-none ${accent ? "text-accent" : "text-ink"}`}>{value}</div>
      {sub && <div className="num mt-2 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function Network() {
  const live = { query: { enabled: deployed, refetchInterval: 20_000 } };
  const { data: made } = useReadContract({ address: addresses.shop, abi: shopAbi, functionName: "madeCount", ...live });
  const { data: living } = useReadContract({ address: addresses.card, abi: cardAbi, functionName: "livingCount", ...live });
  const { data: weight } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalWeight", ...live });
  const { data: paid } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalPaidOut", ...live });
  const { data: streamed } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalStreamed", ...live });
  const { data: rate } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "rewardRate", ...live });
  const { data: finish } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "periodFinish", ...live });
  const { data: boughtBack } = useReadContract({ address: addresses.vault, abi: vaultAbi, functionName: "totalBoughtBack", ...live });
  const { data: ethRouted } = useReadContract({ address: addresses.feeRouter, abi: feeRouterAbi, functionName: "totalEthRouted", ...live });

  // client-side live ticking of "streamed so far": streamed already includes
  // deposits; between refetches, extrapolate at the current per-second rate
  // while the window is active.
  const streamedBase = useNum(streamed, 18);
  const rateNum = useNum(rate, 18);
  const finishTs = Number(finish ?? 0n);
  const [tickExtra, setTickExtra] = useState(0);
  const anchor = useRef({ base: streamedBase, at: Date.now() });
  useEffect(() => {
    anchor.current = { base: streamedBase, at: Date.now() };
    setTickExtra(0);
  }, [streamedBase]);
  useEffect(() => {
    if (!deployed) return;
    const id = setInterval(() => {
      const active = Date.now() / 1000 < finishTs;
      if (active && rateNum > 0) setTickExtra((Date.now() - anchor.current.at) / 1000 * rateNum);
    }, 250);
    return () => clearInterval(id);
  }, [rateNum, finishTs, deployed]);

  const streamedLive = useEased(streamedBase + tickExtra, 300);
  const hashrate = useEased(useNum(weight), 900);
  const buybacks = useEased(useNum(boughtBack, 18), 900);
  const paidNum = useEased(useNum(paid, 18), 900);
  const perSec = rateNum;
  const windowActive = Date.now() / 1000 < finishTs;

  return (
    <section id="network" className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Live network</h2>
        <span className="flex items-center gap-2">
          <span className={`status-dot ${windowActive ? "bg-accent" : "bg-amber"}`} />
          <span className="label">{windowActive ? "streaming" : deployed ? "idle" : "pre-launch"}</span>
        </span>
      </div>

      {/* hero row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <BigStat
          label="$GPU bought back for miners"
          value={fmt(buybacks)}
          sub={`${(useNum(ethRouted, 18)).toFixed(3)} ETH of fees routed in`}
          accent
          verifyHref={links.keeper}
        />
        <BigStat
          label="streaming right now"
          value={`${fmt(streamedLive, 2)}`}
          sub={windowActive ? `+${fmt(perSec, 2)} $GPU / sec` : "window idle — waiting on buybacks"}
        />
        <BigStat label="network hashrate" value={`${fmt(hashrate)}`} sub="MH/s plugged in" />
      </div>

      {/* secondary row */}
      <div className="mt-4 grid grid-cols-2 divide-line border-y border-line sm:grid-cols-4 sm:divide-x">
        <div className="px-6 py-6 first:pl-0">
          <div className="num text-[22px] text-ink">{fmt(useNum(made))}</div>
          <div className="label mt-2">cards made / 10,000</div>
        </div>
        <div className="px-6 py-6">
          <div className="num text-[22px] text-ink">{fmt(useNum(living))}</div>
          <div className="label mt-2">cards living</div>
        </div>
        <div className="px-6 py-6">
          <div className="num text-[22px] text-ink">{fmt(paidNum, 2)}</div>
          <div className="label mt-2">$GPU claimed by miners</div>
        </div>
        <div className="px-6 py-6">
          <div className="num text-[22px] text-ink">{(useNum(ethRouted, 18)).toFixed(3)}</div>
          <div className="label mt-2">ETH fees → protocol</div>
        </div>
      </div>

      {/* proof — the actual wallets, so nobody has to take the number on faith */}
      <div className="panel mt-4 p-5">
        <div className="label mb-2 text-ink">don't trust us — verify</div>
        <p className="mb-4 text-[13px] leading-6 text-muted">
          Every buyback is an on-chain transaction from the keeper wallet, and the $GPU it buys lands
          in the vault. Both are public — check the numbers above against the chain yourself.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href={links.keeper} target="_blank" rel="noreferrer" className="border border-line p-3 transition-colors hover:border-accent-dim">
            <div className="label mb-1 text-accent">buyback wallet ↗</div>
            <div className="num break-all text-[11px] text-muted">0x16CFB3…53bF9B</div>
            <div className="label mt-1 normal-case tracking-normal">every buy tx, timestamped</div>
          </a>
          <a href={links.vault} target="_blank" rel="noreferrer" className="border border-line p-3 transition-colors hover:border-accent-dim">
            <div className="label mb-1 text-accent">vault ↗</div>
            <div className="num break-all text-[11px] text-muted">0xcA1654…12c221</div>
            <div className="label mt-1 normal-case tracking-normal">holds the miners' pot</div>
          </a>
          <a href={links.gpuToken} target="_blank" rel="noreferrer" className="border border-line p-3 transition-colors hover:border-accent-dim">
            <div className="label mb-1 text-accent">$GPU token ↗</div>
            <div className="num break-all text-[11px] text-muted">0x3Da22F…3802E</div>
            <div className="label mt-1 normal-case tracking-normal">supply, holders, transfers</div>
          </a>
        </div>
      </div>

      {!deployed && <p className="mt-4 label">pre-launch — every counter reads zero</p>}
    </section>
  );
}
