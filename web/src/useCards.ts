import { useReadContract, useReadContracts } from "wagmi";
import { addresses } from "./config";
import { cardAbi, rigStakeAbi } from "./abi";
import { TIERS } from "./config";

export type CardInfo = {
  serial: number;
  tier: number;
  level: number;
  mh: number;
  staked: boolean;
};

/** No ERC721Enumerable on-chain, so we scan serials 1..nextSerial-1 and read
 *  ownerOf + stakerOf via multicall. Fine at launch scale; swap for an indexer
 *  (events → cache) as supply grows toward 10,000. */
export function useCards(user?: `0x${string}`) {
  const { data: nextSerial } = useReadContract({
    address: addresses.card,
    abi: cardAbi,
    functionName: "nextSerial",
    query: { refetchInterval: 45_000 },
  });

  const count = nextSerial ? Number(nextSerial) - 1 : 0;
  const serials = Array.from({ length: count }, (_, i) => i + 1);

  const ownerCalls = serials.map((s) => ({
    address: addresses.card,
    abi: cardAbi,
    functionName: "ownerOf" as const,
    args: [BigInt(s)] as const,
  }));
  const stakerCalls = serials.map((s) => ({
    address: addresses.rig,
    abi: rigStakeAbi,
    functionName: "stakerOf" as const,
    args: [BigInt(s)] as const,
  }));

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [...ownerCalls, ...stakerCalls],
    query: { enabled: !!user && count > 0, refetchInterval: 25_000 },
  });

  const mine: number[] = [];
  if (data && user) {
    const u = user.toLowerCase();
    for (let i = 0; i < count; i++) {
      const owner = (data[i]?.result as string | undefined)?.toLowerCase();
      const staker = (data[count + i]?.result as string | undefined)?.toLowerCase();
      if (owner === u || staker === u) mine.push(serials[i]);
    }
  }

  const metaCalls = mine.flatMap((s) => [
    { address: addresses.card, abi: cardAbi, functionName: "cards" as const, args: [BigInt(s)] as const },
    { address: addresses.rig, abi: rigStakeAbi, functionName: "stakerOf" as const, args: [BigInt(s)] as const },
  ]);
  const { data: meta } = useReadContracts({
    contracts: metaCalls,
    query: { enabled: mine.length > 0, refetchInterval: 25_000 },
  });

  const cards: CardInfo[] = [];
  if (meta && user) {
    const u = user.toLowerCase();
    mine.forEach((serial, i) => {
      const c = meta[i * 2]?.result as readonly [number, number, boolean] | undefined;
      const staker = (meta[i * 2 + 1]?.result as string | undefined)?.toLowerCase();
      if (!c) return;
      const [tier, level] = c;
      const baseMH = TIERS[tier - 1]?.mh ?? 0;
      cards.push({ serial, tier, level, mh: Math.floor((baseMH * (100 + 20 * level)) / 100), staked: staker === u });
    });
  }

  cards.sort((a, b) => b.mh - a.mh);
  return { cards, isLoading, refetch };
}
