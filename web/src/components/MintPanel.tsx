import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { formatEther, formatUnits, maxUint256 } from "viem";
import { addresses, deployed, permitEndpoint, TIERS } from "../config";
import { shopAbi, erc20Abi } from "../abi";

type Permit = { seed: `0x${string}`; nonce: string; deadline: string; signature: `0x${string}` };

const MINT_ODDS = TIERS.slice(0, 5); // mintable tiers only

export function MintPanel() {
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<{ msg: string; kind: "info" | "ok" | "err" } | null>(null);
  const [working, setWorking] = useState(false);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: price } = useReadContract({
    address: addresses.shop, abi: shopAbi, functionName: "mintPriceWei", args: [BigInt(qty)],
    query: { enabled: deployed },
  });
  const { data: made } = useReadContract({
    address: addresses.shop, abi: shopAbi, functionName: "madeCount",
    query: { enabled: deployed, refetchInterval: 10_000 },
  });
  const { data: burnPerMint } = useReadContract({
    address: addresses.shop, abi: shopAbi, functionName: "burnPerMint", query: { enabled: deployed },
  });
  const { data: gpuBal } = useReadContract({
    address: addresses.gpu, abi: erc20Abi, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: deployed && !!address, refetchInterval: 10_000 },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.gpu, abi: erc20Abi, functionName: "allowance",
    args: address && addresses.shop ? [address, addresses.shop] : undefined,
    query: { enabled: deployed && !!address },
  });

  const burnNeeded = (burnPerMint ?? 0n) * BigInt(qty);
  const needsApproval = burnNeeded > 0n && (allowance ?? 0n) < burnNeeded;
  const shortGpu = burnNeeded > 0n && (gpuBal ?? 0n) < burnNeeded;
  const busy = working;
  const soldPct = Math.min(100, (Number(made ?? 0n) / 10_000) * 100);

  // One button, one click: approve (if needed, waiting for it to confirm) → then mint.
  async function mintFlow() {
    if (!addresses.shop || !addresses.gpu || !address || price === undefined || !publicClient) return;
    setWorking(true);
    try {
      if (needsApproval) {
        setStatus({ msg: "approving $GPU for the burn gate…", kind: "info" });
        const approveHash = await writeContractAsync({
          address: addresses.gpu, abi: erc20Abi, functionName: "approve", args: [addresses.shop, maxUint256],
        });
        setStatus({ msg: "confirming approval…", kind: "info" });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      setStatus({ msg: "requesting mint permit…", kind: "info" });
      const res = await fetch(permitEndpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: address, qty }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "permit refused");
      const p = (await res.json()) as Permit;

      setStatus({ msg: `minting ${qty} card${qty > 1 ? "s" : ""}…`, kind: "info" });
      const mintHash = await writeContractAsync({
        address: addresses.shop, abi: shopAbi, functionName: "mint",
        args: [BigInt(qty), p.seed, BigInt(p.nonce), BigInt(p.deadline), p.signature], value: price,
      });
      setStatus({ msg: "confirming mint…", kind: "info" });
      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      setStatus({ msg: `minted ${qty} card${qty > 1 ? "s" : ""} — plug them in below ↓`, kind: "ok" });
    } catch (e) {
      setStatus({ msg: e instanceof Error ? e.message.split("\n")[0] : "transaction failed", kind: "err" });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="panel flex flex-col p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <div className="label text-ink">shop · mint</div>
        <div className="num text-[11px] text-muted">{(made ?? 0n).toLocaleString()} / 10,000</div>
      </div>

      {/* sold progress */}
      <div className="mb-6 h-1.5 w-full overflow-hidden bg-line">
        <div className="h-full bg-accent transition-all" style={{ width: `${Math.max(1, soldPct)}%` }} />
      </div>

      {/* what you might pull */}
      <div className="mb-6">
        <div className="label mb-2.5">what you might pull</div>
        <div className="flex items-stretch gap-1">
          {MINT_ODDS.map((t) => (
            <div
              key={t.name}
              className="group relative flex-1 border-t-2 pt-2"
              style={{ borderColor: t.color }}
              title={`${t.name} · ${t.mh} MH/s · ${t.odds}`}
            >
              <div className="num text-[10px] text-muted">{t.odds}</div>
              <div className="mt-0.5 truncate text-[10px]" style={{ color: t.color }}>
                {t.rarity}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!deployed ? (
        <div className="space-y-2">
          <div className="text-lg font-semibold text-amber">Opens with mainnet</div>
          <p className="text-[13px] leading-6 text-muted">10,000 cards at $5. No caps, no cooldowns.</p>
        </div>
      ) : (
        <div className="mt-auto space-y-5">
          {/* quantity stepper */}
          <div>
            <div className="label mb-2">quantity</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-line">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2 text-ink transition-colors hover:text-accent"
                >
                  −
                </button>
                <span className="num w-12 text-center text-lg text-ink">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(50, q + 1))}
                  className="px-3.5 py-2 text-ink transition-colors hover:text-accent"
                >
                  +
                </button>
              </div>
              <div className="flex gap-1.5">
                {[5, 10, 25].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQty(n)}
                    className={`num border px-2.5 py-1 text-[11px] transition-colors ${
                      qty === n ? "border-accent text-accent" : "border-line text-muted hover:border-accent-dim"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* cost breakdown */}
          <div className="space-y-1.5 border-y border-line py-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">price ({qty} × $5)</span>
              <span className="num text-ink">{price !== undefined ? `${(+formatEther(price)).toFixed(5)} ETH` : "…"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">burn gate</span>
              <span className={`num ${shortGpu ? "text-danger" : "text-amber"}`}>
                {(+formatUnits(burnNeeded, 18)).toLocaleString()} $GPU
              </span>
            </div>
            {address && (
              <div className="flex justify-between">
                <span className="text-muted">your $GPU</span>
                <span className="num text-muted">{(+formatUnits(gpuBal ?? 0n, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>

          {/* CTA — one click handles approve (if needed) then mint */}
          {!isConnected ? (
            <p className="label text-center">connect a wallet to mint</p>
          ) : shortGpu ? (
            <div className="space-y-2">
              <a
                href={`https://www.thepons.xyz/token/${addresses.gpu}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary block text-center"
              >
                BUY $GPU FOR THE BURN →
              </a>
              <p className="label text-center normal-case tracking-normal text-danger">
                need {(+formatUnits(burnNeeded - (gpuBal ?? 0n), 18)).toLocaleString()} more $GPU to mint {qty}
              </p>
            </div>
          ) : (
            <button onClick={mintFlow} disabled={busy} className="btn-primary w-full">
              {busy
                ? (status?.msg.toUpperCase() ?? "WORKING…")
                : needsApproval
                  ? `APPROVE & MINT ${qty} — ${price !== undefined ? (+formatEther(price)).toFixed(4) : "…"} ETH`
                  : `MINT ${qty} — ${price !== undefined ? (+formatEther(price)).toFixed(4) : "…"} ETH`}
            </button>
          )}

          {status && (
            <p
              className={`text-center text-[12px] ${
                status.kind === "err" ? "text-danger" : status.kind === "ok" ? "text-accent" : "text-muted"
              }`}
            >
              {status.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
