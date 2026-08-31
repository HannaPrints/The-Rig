import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { addresses, deployed } from "../config";
import { rigAbi } from "../abi";

export function MyRig() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const enabled = deployed && !!address;
  const { data: weight } = useReadContract({
    address: addresses.rig,
    abi: rigAbi,
    functionName: "weightOf",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 5_000 },
  });
  const { data: earned, refetch } = useReadContract({
    address: addresses.rig,
    abi: rigAbi,
    functionName: "earned",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 5_000 },
  });

  async function claim() {
    if (!addresses.rig) return;
    await writeContractAsync({ address: addresses.rig, abi: rigAbi, functionName: "claim" });
    await refetch();
  }

  return (
    <div className="panel p-6">
      <div className="label mb-6 text-ink">my rig</div>

      {!deployed ? (
        <p className="text-[13px] leading-6 text-muted">
          Your rig lives here: staked cards, live hashrate, and a claim button paying out a stream
          that accrues <span className="text-ink">every second</span>. Earnings float with the
          buyback pot — the rig never owes anyone a fixed return, which is exactly why it can never
          go under.
        </p>
      ) : !isConnected ? (
        <p className="label">connect a wallet to see your rig</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="num text-2xl text-ink">{(weight ?? 0n).toLocaleString()}</div>
              <div className="label mt-1.5">mh/s plugged in</div>
            </div>
            <div>
              <div className="num text-2xl text-accent">
                {Number(formatUnits(earned ?? 0n, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </div>
              <div className="label mt-1.5">$gpu claimable</div>
            </div>
          </div>
          <button
            onClick={claim}
            disabled={isPending || confirming || (earned ?? 0n) === 0n}
            className="btn-primary w-full"
          >
            {isPending || confirming ? "…" : "CLAIM"}
          </button>
        </div>
      )}
    </div>
  );
}
