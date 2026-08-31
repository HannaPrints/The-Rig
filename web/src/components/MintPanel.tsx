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
      <h2 className="panel-title text-sm">▚ SHOP</h2>

      {!deployed ? (
        <div className="mt-6 space-y-3">
          <div className="glow-amber text-lg text-amber">SHOP OPENS SOON</div>
          <p className="text-xs leading-6 text-ink">
            10,000 cards at $5. 400 mints per hour, on-chain — a sellout takes 25+ hours by
            construction, so nobody needs to be first in line. 70% of every mint goes straight
            to the miners' pot.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            {[1, 2, 4, 8].map((n) => (
              <button
                key={n}
                onClick={() => setQty(n)}
                className={`border px-3 py-1.5 text-xs ${
                  qty === n
                    ? "border-phosphor bg-phosphor text-void"
                    : "border-phosphor-dim text-phosphor hover:border-phosphor"
                }`}
              >
                ×{n}
              </button>
            ))}
          </div>

          <div className="space-y-1 text-xs text-ink">
            <div>
              price: <span className="text-phosphor">{price !== undefined ? `${formatEther(price)} ETH` : "…"}</span>{" "}
              <span className="text-phosphor-dim">(${qty * 5})</span>
            </div>
            <div>
              burn gate:{" "}
              <span className="text-amber">
                {burnPerMint !== undefined ? `${formatEther(burnNeeded)} $GPU → 0x…dEaD` : "…"}
              </span>
            </div>
          </div>

          {!isConnected ? (
            <p className="text-xs text-phosphor-dim">connect a wallet to mint</p>
          ) : needsApproval ? (
            <button
              onClick={approve}
              disabled={busy}
              className="w-full border-2 border-amber py-3 text-xs font-bold tracking-widest text-amber hover:bg-amber hover:text-void disabled:opacity-40"
            >
              {busy ? "…" : "APPROVE $GPU BURN"}
            </button>
          ) : (
            <button
              onClick={mint}
              disabled={busy}
              className="glow w-full border-2 border-phosphor py-3 text-xs font-bold tracking-widest text-phosphor hover:bg-phosphor hover:text-void disabled:opacity-40"
            >
              {busy ? "…" : `MINT ×${qty}`}
            </button>
          )}

          {status && <p className="text-xs text-phosphor-dim">{status}</p>}
        </div>
      )}
    </div>
  );
}
