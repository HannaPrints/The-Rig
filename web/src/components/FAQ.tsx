const ITEMS: { q: string; a: string }[] = [
  {
    q: "What exactly am I buying for $5?",
    a: "An NFT graphics card on Robinhood Chain with an on-chain hashrate (10 to 400 MH/s at mint, up to 2,500 via fusion). Slot it into the rig contract and it earns a share of every $GPU buyback, every second, for as long as it's staked. Unstake, sell it on OpenSea, or fuse it — it's yours.",
  },
  {
    q: "Where does the yield actually come from?",
    a: "From other people spending real money: 70% of every mint, overclock, fusion and rack purchase — plus 30% of $GPU's own trading-fee creator share and 70% of the 5% secondary royalty — buys $GPU on the open market and streams it to staked cards pro-rata by hashrate. $GPU is never minted as a reward. If activity slows, yield slows. That's the honest deal.",
  },
  {
    q: "What's the burn gate?",
    a: "Minting a card burns 12,500 $GPU from your wallet on top of the $5 — sent to 0x…dEaD inside the mint transaction itself. At the full 10,000 mint that's 125,000,000 $GPU destroyed, 12.5% of total supply. Buy pressure and deflation, built into the front door.",
  },
  {
    q: "Can the team rug this?",
    a: "The Rig staking contract has no owner — no pause switch, no parameter changes, no withdraw function. The buyback keeper's only privilege is buying $GPU, verified on-chain by balance delta. The royalty router has no owner at all. The team's surface is limited to things like art URIs, the permit signer, and a band-limited burn dial — none of it can touch staked cards or the miners' pot. Read the contracts; they're public.",
  },
  {
    q: "How do I know my tier roll is fair?",
    a: "Your randomness is committed before your transaction exists: the mint permit the site signs contains a sealed seed, and your tiers derive from keccak(seed, your address, serial) — pure math anyone can recompute afterwards. Neither you nor we can steer a roll once the permit is signed. Odds are fixed: 52 / 26 / 13 / 7 / 2.",
  },
  {
    q: "Is there a mint limit or cooldown?",
    a: "No. No hourly caps, no wallet cooldowns, no allowlist games. Mint 1 or mint 500 — the only per-transaction bound is 50 cards, purely for gas, and you can send as many transactions as you like until the 10,000 run out.",
  },
  {
    q: "What's fusion and why does it matter?",
    a: "Two identical-tier cards plus a small fee forge one card of the next tier at level zero. The inputs are burned forever — only 10,000 cards will ever be made and fusion only shrinks that number. It's also the only road to the Singularity (1,000 MH/s) and whatever sits above it.",
  },
  {
    q: "What are the risks?",
    a: "All of them. Unaudited until the audit ships, yield that floats with real activity, a token with a live market, smart-contract risk, and a game economy that depends on people wanting to play. This is a game, not an investment product, and nothing here is financial advice. Only spend what you are happy to lose.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
      <h2 className="mb-8 text-xl font-bold tracking-tight">Questions you should be asking</h2>
      <div className="divide-y divide-line border-y border-line">
        {ITEMS.map((it) => (
          <details key={it.q} className="faq group">
            <summary className="flex cursor-pointer items-baseline justify-between gap-4 py-4 text-[14px] font-semibold text-ink transition-colors hover:text-accent">
              {it.q}
              <span className="num shrink-0 text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-5 text-[13px] leading-6 text-muted">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
