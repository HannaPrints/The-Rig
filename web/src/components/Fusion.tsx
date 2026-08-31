import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { addresses, deployed, TIERS } from "../config";
import { shopFuseAbi } from "../abi";
import { useCards, type CardInfo } from "../useCards";

export function Fusion() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: pendingHash });
  const [pick, setPick] = useState<number[]>([]);
  const [status, setStatus] = useState<{ msg: string; kind: "info" | "ok" | "err" } | null>(null);

  const { cards, refetch } = useCards(address);
  // fusable = in-wallet (not staked), tier < 7 (T7 is the top)
  const fusable = cards.filter((c) => !c.staked && c.tier < 7);

  // group by tier so the user sees viable pairs at a glance
  const byTier = new Map<number, CardInfo[]>();
  for (const c of fusable) {
    if (!byTier.has(c.tier)) byTier.set(c.tier, []);
    byTier.get(c.tier)!.push(c);
  }
  const tiers = [...byTier.entries()].sort((a, b) => b[0] - a[0]);

  const pickTier = pick.length ? cards.find((c) => c.serial === pick[0])?.tier : undefined;
  const { data: fee } = useReadContract({
    address: addresses.shop, abi: shopFuseAbi, functionName: "fusionPriceWei",
    args: pickTier ? [pickTier] : undefined, query: { enabled: deployed && !!pickTier },
  });

  function toggle(c: CardInfo) {
    setPick((prev) => {
      if (prev.includes(c.serial)) return prev.filter((s) => s !== c.serial);
      // only allow selecting a second card of the SAME tier; new tier resets
      const firstTier = prev.length ? cards.find((x) => x.serial === prev[0])?.tier : undefined;
      if (firstTier !== undefined && firstTier !== c.tier) return [c.serial];
      return [...prev, c.serial].slice(0, 2);
    });
  }

  async function fuse() {
    if (pick.length !== 2 || !addresses.shop || fee === undefined) return;
    try {
      setStatus({ msg: "forging…", kind: "info" });
      const hash = await writeContractAsync({
        address: addresses.shop, abi: shopFuseAbi, functionName: "fuse",
        args: [BigInt(pick[0]), BigInt(pick[1])], value: fee,
      });
      setPendingHash(hash);
      setStatus({ msg: "forging — confirming…", kind: "info" });
      await new Promise((r) => setTimeout(r, 3500));
      await refetch();
      setPick([]);
      setPendingHash(undefined);
      setStatus({ msg: `forged a ${TIERS[(pickTier ?? 1)]?.name ?? "higher"} card ✦`, kind: "ok" });
    } catch (e) {
      setStatus({ msg: e instanceof Error ? e.message.split("\n")[0] : "fusion failed", kind: "err" });
    }
  }

  const busy = isPending || confirming;
  const nextTier = pickTier ? TIERS[pickTier] : undefined; // pickTier is 1-indexed; TIERS[pickTier] = next

  return (
    <div className="panel p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="label text-ink">shop · fusion</div>
        <div className="num text-[11px] text-muted">2 → 1 · supply shrinks</div>
      </div>
      <p className="mb-5 text-[12px] leading-6 text-muted">
        Combine two identical cards into one of the next tier. Both inputs are burned forever — the
        only path to Singularity ∞ and beyond.
      </p>

      {!isConnected ? (
        <p className="label">connect a wallet to fuse</p>
      ) : fusable.length < 2 ? (
        <p className="text-[13px] leading-6 text-muted">
          You need two unstaked cards of the same tier. Cards must be in your wallet (unplug them
          from the rig first).
        </p>
      ) : (
        <div className="space-y-5">
          {tiers.map(([tier, list]) => {
            const color = TIERS[tier - 1]?.color ?? "#9fb4a6";
            return (
              <div key={tier}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label" style={{ color }}>
                    {TIERS[tier - 1]?.name}
                  </span>
                  <span className="num text-[10px] text-muted">
                    {list.length} owned{list.length < 2 ? " · need 2" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {list.map((c) => {
                    const sel = pick.includes(c.serial);
                    return (
                      <button
                        key={c.serial}
                        onClick={() => toggle(c)}
                        disabled={list.length < 2}
                        className={`num border py-2 text-[11px] transition-colors disabled:opacity-40 ${
                          sel ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:border-accent-dim"
                        }`}
                      >
                        #{c.serial}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* forge preview */}
          {pick.length === 2 && nextTier && (
            <div className="border border-line bg-raised p-4">
              <div className="flex items-center justify-center gap-3 text-[13px]">
                <span className="num text-muted">#{pick[0]}</span>
                <span className="num text-muted">+</span>
                <span className="num text-muted">#{pick[1]}</span>
                <span className="text-accent">→</span>
                <span style={{ color: nextTier.color }}>{nextTier.name}</span>
                <span className="num text-muted">({nextTier.mh} MH/s)</span>
              </div>
              <div className="mt-2 text-center text-[11px] text-muted">
                fee {fee !== undefined ? `${(+formatEther(fee)).toFixed(5)} ETH` : "…"} · 70% to miners
              </div>
            </div>
          )}

          <button
            onClick={fuse}
            disabled={busy || pick.length !== 2}
            className="btn-primary w-full"
          >
            {busy ? "FORGING…" : pick.length === 2 ? "FORGE ✦" : "SELECT TWO OF THE SAME TIER"}
          </button>

          {status && (
            <p className={`text-center text-[12px] ${status.kind === "err" ? "text-danger" : status.kind === "ok" ? "text-accent" : "text-muted"}`}>
              {status.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
