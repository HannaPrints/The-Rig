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
      <h2 className="panel-title text-sm">▚ MY RIG</h2>

      {!deployed ? (
        <p className="mt-6 text-xs leading-6 text-ink">
          your rig lives here: staked cards, live hashrate, and a claim button that pays out a
          stream accruing <span className="text-phosphor">every second</span>. earnings float with
          the buyback pot — the rig never owes anyone a fixed return, which is exactly why it can
          never go under.
        </p>
      ) : !isConnected ? (
        <p className="mt-6 text-xs text-phosphor-dim">connect a wallet to see your rig</p>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="glow text-2xl text-phosphor">{(weight ?? 0n).toString()}</div>
              <div className="text-[11px] tracking-widest text-ink">MH/s PLUGGED IN</div>
            </div>
            <div>
              <div className="glow text-2xl text-phosphor">
                {Number(formatUnits(earned ?? 0n, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] tracking-widest text-ink">$GPU CLAIMABLE</div>
            </div>
          </div>
          <button
            onClick={claim}
            disabled={isPending || confirming || (earned ?? 0n) === 0n}
            className="glow w-full border-2 border-phosphor py-3 text-xs font-bold tracking-widest text-phosphor hover:bg-phosphor hover:text-void disabled:opacity-40"
          >
            {isPending || confirming ? "…" : "CLAIM"}
          </button>
        </div>
      )}
    </div>
  );
}
