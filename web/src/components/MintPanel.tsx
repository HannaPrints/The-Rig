import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, maxUint256 } from "viem";
import { addresses, deployed, signerUrl } from "../config";
import { shopAbi, erc20Abi } from "../abi";

type Permit = {
  seed: `0x${string}`;
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
};

export function MintPanel() {
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<string>("");
  const { address, isConnected } = useAccount();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: price } = useReadContract({
    address: addresses.shop,
    abi: shopAbi,
    functionName: "mintPriceWei",
    args: [BigInt(qty)],
    query: { enabled: deployed },
  });
  const { data: burnPerMint } = useReadContract({
    address: addresses.shop,
    abi: shopAbi,
    functionName: "burnPerMint",
    query: { enabled: deployed },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.gpu,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && addresses.shop ? [address, addresses.shop] : undefined,
    query: { enabled: deployed && !!address && !!addresses.gpu },
  });

  const burnNeeded = (burnPerMint ?? 0n) * BigInt(qty);
  const needsApproval = burnNeeded > 0n && (allowance ?? 0n) < burnNeeded;
  const busy = isPending || confirming;

  async function approve() {
    if (!addresses.gpu || !addresses.shop) return;
    setStatus("approving $GPU burn…");
    await writeContractAsync({
      address: addresses.gpu,
      abi: erc20Abi,
      functionName: "approve",
      args: [addresses.shop, maxUint256],
    });
    await refetchAllowance();
    setStatus("approved — ready to mint");
  }

  async function mint() {
    if (!addresses.shop || !address || price === undefined) return;
    try {
      setStatus("requesting mint permit…");
      const res = await fetch(`${signerUrl}/permit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: address, qty }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "permit refused");
      const p = (await res.json()) as Permit;

      setStatus("minting…");
      await writeContractAsync({
        address: addresses.shop,
        abi: shopAbi,
        functionName: "mint",
        args: [BigInt(qty), p.seed, BigInt(p.nonce), BigInt(p.deadline), p.signature],
        value: price,
      });
      setStatus(`minted ${qty} card${qty > 1 ? "s" : ""} — check your rig`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "mint failed");
    }
  }

  return (
    <div className="panel p-6">
      <div className="label mb-6 text-ink">shop</div>

      {!deployed ? (
        <div className="space-y-3">
          <div className="text-lg font-semibold text-amber">Opens with mainnet</div>
          <p className="text-[13px] leading-6 text-muted">
            10,000 cards at $5. No cooldowns and no hourly caps — mint as many as you want, whenever
            you want. 70% of every mint goes straight to the miners' pot.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            {[1, 5, 10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() => setQty(n)}
                className={`num px-3 py-1.5 text-xs transition-colors ${
                  qty === n
                    ? "bg-accent text-void"
                    : "border border-line text-ink hover:border-accent-dim hover:text-accent"
                }`}
              >
                ×{n}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">price</span>
              <span className="num text-ink">
                {price !== undefined ? `${formatEther(price)} ETH` : "…"}{" "}
                <span className="text-muted">(${qty * 5})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">burn gate</span>
              <span className="num text-amber">
                {burnPerMint !== undefined ? `${formatEther(burnNeeded)} $GPU → 0x…dEaD` : "…"}
              </span>
            </div>
          </div>

          {!isConnected ? (
            <p className="label">connect a wallet to mint</p>
          ) : needsApproval ? (
            <button onClick={approve} disabled={busy} className="btn-ghost w-full text-amber">
              {busy ? "…" : "APPROVE $GPU BURN"}
            </button>
          ) : (
            <button onClick={mint} disabled={busy} className="btn-primary w-full">
              {busy ? "…" : `MINT ×${qty}`}
            </button>
          )}

          {status && <p className="label normal-case tracking-normal">{status}</p>}
        </div>
      )}
    </div>
  );
}
