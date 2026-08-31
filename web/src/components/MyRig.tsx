import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { addresses, deployed, TIERS } from "../config";
import { rigAbi, cardAbi, rigStakeAbi, shopRackAbi } from "../abi";
import { useCards, type CardInfo } from "../useCards";

function CardChip({ card, selected, onToggle }: { card: CardInfo; selected: boolean; onToggle: () => void }) {
  const color = TIERS[card.tier - 1]?.color ?? "#9fb4a6";
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between border px-3 py-2 text-left transition-colors ${
        selected ? "border-accent bg-accent/10" : "border-line hover:border-accent-dim"
      }`}
    >
      <span className="min-w-0">
        <span className="num text-[11px] text-muted">#{card.serial}</span>
        <span className="ml-2 truncate text-[12px]" style={{ color }}>
          {TIERS[card.tier - 1]?.name}
        </span>
        {card.level > 0 && <span className="num ml-1 text-[10px] text-amber">+{card.level * 20}%</span>}
      </span>
      <span className="num shrink-0 text-[12px] text-ink">{card.mh} MH/s</span>
    </button>
  );
}

export function MyRig() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [working, setWorking] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("");

  const { cards, refetch: refetchCards } = useCards(address);
  const walletCards = cards.filter((c) => !c.staked);
  const stakedCards = cards.filter((c) => c.staked);

  const q = { query: { enabled: deployed && !!address, refetchInterval: 20_000 } };
  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: addresses.rig, abi: rigAbi, functionName: "earned", args: address ? [address] : undefined, ...q,
  });
  const { data: weight } = useReadContract({
    address: addresses.rig, abi: rigAbi, functionName: "weightOf", args: address ? [address] : undefined, ...q,
  });
  const { data: slots } = useReadContract({
    address: addresses.shop, abi: shopRackAbi, functionName: "slotsOf", args: address ? [address] : undefined, ...q,
  });
  const { data: racks } = useReadContract({
    address: addresses.shop, abi: shopRackAbi, functionName: "racksOf", args: address ? [address] : undefined, ...q,
  });
  const { data: approved, refetch: refetchApproval } = useReadContract({
    address: addresses.card, abi: cardAbi, functionName: "isApprovedForAll",
    args: address && addresses.rig ? [address, addresses.rig] : undefined, ...q,
  });
  const { data: nextRackPrice } = useReadContract({
    address: addresses.shop, abi: shopRackAbi, functionName: "rackPriceWei",
    args: [(racks ?? 0n) + 1n], query: { enabled: deployed && (racks ?? 0n) < 12n },
  });

  const busy = working;
  const slotsTotal = Number(slots ?? 4n);
  const slotsFree = slotsTotal - stakedCards.length;

  async function run(fn: () => Promise<`0x${string}`>, msg: string, doneMsg = "") {
    if (!publicClient) return;
    setWorking(true);
    try {
      setStatus(msg);
      const hash = await fn();
      setStatus(`${msg} confirming…`);
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([refetchCards(), refetchEarned(), refetchApproval()]);
      setSelected(new Set());
      setStatus(doneMsg);
    } catch (e) {
      setStatus(e instanceof Error ? e.message.split("\n")[0] : "failed");
    } finally {
      setWorking(false);
    }
  }

  const toggle = (s: number) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });

  const selectedWallet = walletCards.filter((c) => selected.has(c.serial));
  const selectedStaked = stakedCards.filter((c) => selected.has(c.serial));

  async function stakeSelected() {
    if (!addresses.rig || !addresses.card || !publicClient) return;
    const ids = selectedWallet.map((c) => BigInt(c.serial));
    if (ids.length === 0) return setStatus("select cards to plug in first");
    if (ids.length > slotsFree) return setStatus(`only ${slotsFree} slots free — buy a rack or select fewer`);
    setWorking(true);
    try {
      // one-time approval, waited-for, then stake — no second tap
      if (!approved) {
        setStatus("approving the rig (one-time)…");
        const aHash = await writeContractAsync({
          address: addresses.card, abi: cardAbi, functionName: "setApprovalForAll", args: [addresses.rig, true],
        });
        setStatus("approving the rig — confirming…");
        await publicClient.waitForTransactionReceipt({ hash: aHash });
        await refetchApproval();
      }
      setStatus(`plugging in ${ids.length} card${ids.length > 1 ? "s" : ""}…`);
      const sHash = await writeContractAsync({
        address: addresses.rig, abi: rigStakeAbi, functionName: "stake", args: [ids],
      });
      setStatus("plugging in — confirming…");
      await publicClient.waitForTransactionReceipt({ hash: sHash });
      await Promise.all([refetchCards(), refetchEarned()]);
      setSelected(new Set());
      setStatus(`plugged in ${ids.length} — now earning`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message.split("\n")[0] : "failed");
    } finally {
      setWorking(false);
    }
  }

  async function unstakeSelected() {
    const ids = selectedStaked.map((c) => BigInt(c.serial));
    if (ids.length === 0 || !addresses.rig) return;
    await run(
      () => writeContractAsync({ address: addresses.rig!, abi: rigStakeAbi, functionName: "unstake", args: [ids] }),
      `unplugging ${ids.length}…`,
    );
  }

  async function claim() {
    if (!addresses.rig) return;
    await run(() => writeContractAsync({ address: addresses.rig!, abi: rigAbi, functionName: "claim" }), "claiming…");
  }

  async function buyRack() {
    if (!addresses.shop || nextRackPrice === undefined) return;
    await run(
      () => writeContractAsync({ address: addresses.shop!, abi: shopRackAbi, functionName: "buyRack", value: nextRackPrice }),
      "buying rack…",
    );
  }

  return (
    <div className="panel p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <div className="label text-ink">my rig</div>
        <div className="num text-[11px] text-muted">
          {stakedCards.length}/{slotsTotal} slots
        </div>
      </div>

      {!isConnected ? (
        <p className="label">connect a wallet to see your rig</p>
      ) : (
        <div className="space-y-6">
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

          <button onClick={claim} disabled={busy || (earned ?? 0n) === 0n} className="btn-primary w-full">
            {busy ? "…" : "CLAIM $GPU"}
          </button>

          {/* staked */}
          {stakedCards.length > 0 && (
            <div>
              <div className="label mb-2">plugged in ({stakedCards.length})</div>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {stakedCards.map((c) => (
                  <CardChip key={c.serial} card={c} selected={selected.has(c.serial)} onToggle={() => toggle(c.serial)} />
                ))}
              </div>
              {selectedStaked.length > 0 && (
                <button onClick={unstakeSelected} disabled={busy} className="btn-ghost mt-2 w-full">
                  {busy ? "…" : `UNPLUG ${selectedStaked.length}`}
                </button>
              )}
            </div>
          )}

          {/* wallet */}
          <div>
            <div className="label mb-2">
              in your wallet ({walletCards.length}) · {slotsFree} slot{slotsFree === 1 ? "" : "s"} free
            </div>
            {walletCards.length === 0 ? (
              <p className="text-[13px] text-muted">
                No unstaked cards. <a href="#mint" className="text-accent">Mint some →</a>
              </p>
            ) : (
              <>
                <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {walletCards.map((c) => (
                    <CardChip key={c.serial} card={c} selected={selected.has(c.serial)} onToggle={() => toggle(c.serial)} />
                  ))}
                </div>
                <button onClick={stakeSelected} disabled={busy || selectedWallet.length === 0} className="btn-primary mt-2 w-full">
                  {busy
                    ? "…"
                    : selectedWallet.length > 0
                      ? `PLUG IN ${selectedWallet.length}${!approved ? " (approve + stake)" : ""}`
                      : "SELECT CARDS TO PLUG IN"}
                </button>
              </>
            )}
          </div>

          {/* racks */}
          {(racks ?? 0n) < 12n && walletCards.length > slotsFree && (
            <button onClick={buyRack} disabled={busy} className="btn-ghost w-full text-amber">
              {busy || nextRackPrice === undefined
                ? "…"
                : `BUY RACK (+4 slots) — ${Number(formatUnits(nextRackPrice, 18)).toFixed(5)} ETH`}
            </button>
          )}

          {status && <p className="label normal-case tracking-normal">{status}</p>}
        </div>
      )}
    </div>
  );
}
