import { useState, type ReactNode } from "react";
import { addresses, links, TIERS, KEEPER_ADDRESS } from "../config";

const SECTIONS = [
  ["overview", "Overview"],
  ["token", "$GPU token"],
  ["cards", "The cards"],
  ["mining", "Mining & the rig"],
  ["stream", "The reward stream"],
  ["money", "Where the money goes"],
  ["upgrades", "Overclock & fusion"],
  ["workshop", "Workshop"],
  ["trust", "Trust & contracts"],
  ["fairness", "Fairness & randomness"],
  ["risks", "Risks"],
] as const;

function Addr({ a }: { a?: string }) {
  return (
    <a
      href={`${links.explorer}/address/${a}`}
      target="_blank"
      rel="noreferrer"
      className="num break-all text-[12px] text-accent hover:underline"
    >
      {a}
    </a>
  );
}

function H({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-lg font-bold tracking-tight text-ink">
      {children}
    </h2>
  );
}

function P({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[14px] leading-7 text-muted ${className}`}>{children}</p>;
}

export function Docs() {
  const [active, setActive] = useState<string>("overview");

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-10">
        <div className="label">documentation</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">How The Rig works</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted">
          Every moving part of the protocol, in plain terms — what you're buying, how it earns, where
          every dollar flows, and what can and can't happen to your assets.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-[200px_1fr]">
        {/* TOC */}
        <nav className="hidden md:block">
          <div className="sticky top-24 space-y-1">
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#/docs#${id}`}
                onClick={() => setActive(id)}
                className={`label block py-1.5 transition-colors ${active === id ? "text-accent" : "hover:text-ink"}`}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        {/* content */}
        <div className="max-w-2xl space-y-12">
          <section className="space-y-3">
            <H id="overview">Overview</H>
            <P>
              The Rig is a mining game on Robinhood Chain. You mint an NFT graphics card for $5, slot
              it into your rig, and it earns <b className="text-ink">$GPU</b> for as long as it's
              plugged in. Earnings stream every second, split across all staked cards in proportion to
              their hashrate.
            </P>
            <P>
              The one idea that makes it different from every "staking" token:{" "}
              <b className="text-ink">$GPU is never minted as a reward.</b> Every token paid to a miner
              was bought on the open market with real ETH that other players spent. Payouts are
              purchases, not promises — so the reward pool can never print itself into collapse.
            </P>
          </section>

          <section className="space-y-3">
            <H id="token">$GPU token</H>
            <ul className="space-y-2 text-[14px] leading-7 text-muted">
              <li>• Fixed supply: <span className="num text-ink">1,000,000,000</span>, launched on Pons.</li>
              <li>• The game contracts <b className="text-ink">cannot mint</b> $GPU — they can only buy it and burn it.</li>
              <li>• Two jobs: the reward asset miners earn, and the burn currency the mint consumes.</li>
              <li>• Trades on a locked Uniswap v4 pool (graduated off the Pons bonding curve).</li>
            </ul>
            <div className="panel p-4">
              <div className="label mb-1">contract address</div>
              <Addr a={addresses.gpu} />
            </div>
          </section>

          <section className="space-y-3">
            <H id="cards">The cards</H>
            <P>
              Each card is an ERC-721 NFT with an on-chain hashrate (measured in MH/s). Higher tiers
              hash faster and earn a bigger slice of the stream. Mint odds are fixed and enforced
              on-chain:
            </P>
            <div className="panel overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="label px-4 py-3 font-normal">tier</th>
                    <th className="label px-4 py-3 font-normal">card</th>
                    <th className="label px-4 py-3 text-right font-normal">MH/s</th>
                    <th className="label px-4 py-3 text-right font-normal">mint odds</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t.name} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-3" style={{ color: t.color }}>{t.rarity}</td>
                      <td className="px-4 py-3 text-ink">{t.name}</td>
                      <td className="num px-4 py-3 text-right text-ink">{t.mh.toLocaleString()}</td>
                      <td className="num px-4 py-3 text-right text-muted">{t.odds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              The top two tiers can't be minted — they're forged through fusion (see below). Only
              10,000 cards will ever be made, and fusion permanently shrinks that number. The
              collection address (view it on OpenSea):
            </P>
            <div className="panel p-4">
              <Addr a={addresses.card} />
              <a href={links.openSea} target="_blank" rel="noreferrer" className="label mt-2 block hover:text-accent">
                view collection on opensea ↗
              </a>
            </div>
          </section>

          <section className="space-y-3">
            <H id="mining">Mining & the rig</H>
            <P>
              Minting puts a card in your wallet, where it earns nothing. To mine, you{" "}
              <b className="text-ink">plug it into the rig</b> (stake it). Your room starts with 4
              slots; each rack adds 4 more, up to 52 slots with 12 racks. Racks are bought with ETH,
              and 70% of the cost flows to miners like every other fee.
            </P>
            <P>
              Staked cards earn continuously. Unplug any time to move a card back to your wallet (you
              must do this before overclocking, fusing, or selling it). The rig contract has no owner
              and no withdraw function — once your card is staked, only you can pull it out.
            </P>
          </section>

          <section className="space-y-3">
            <H id="stream">The reward stream</H>
            <P>
              Bought-back $GPU is released to miners over rolling 12-hour windows (a Synthetix-style
              drip). Every staked card accrues every second, in proportion to its share of total
              network hashrate:
            </P>
            <div className="panel p-4">
              <div className="num text-[13px] text-accent">your rate = stream × (your MH ÷ network MH)</div>
            </div>
            <P>
              As more cards come online, each one earns a smaller slice — that's the game's natural
              difficulty. If the rig is ever empty, the stream pauses instead of burning off, so time
              never steals from miners. Claim your accrued $GPU whenever you like.
            </P>
          </section>

          <section className="space-y-3">
            <H id="money">Where the money goes</H>
            <P>Nothing is hidden. Every inflow is on-chain, and most of the routing is hardcoded into contracts that no one owns.</P>
            <div className="panel overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="label px-4 py-3 font-normal">source</th>
                    <th className="label px-4 py-3 text-right font-normal">miners' pot</th>
                    <th className="label px-4 py-3 text-right font-normal">treasury</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Card mints ($5)", "70%", "30%"],
                    ["Overclocks, fusions, racks", "70%", "30%"],
                    ["$GPU trading fee (4% per trade, our share)", "30%", "70%"],
                    ["Secondary royalties (5% of sales)", "70%", "30%"],
                  ].map((r) => (
                    <tr key={r[0]} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-3 text-ink">{r[0]}</td>
                      <td className="num px-4 py-3 text-right text-accent">{r[1]}</td>
                      <td className="num px-4 py-3 text-right text-amber">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              <b className="text-ink">The burn gate:</b> every mint also burns 12,500 $GPU from your
              wallet, sent to a dead address inside the mint transaction. At a full 10,000 mint that's
              125,000,000 $GPU destroyed — 12.5% of all supply, gone forever, benefiting every holder.
            </P>
            <P>
              <b className="text-ink">The 4% trade fee</b> is 1% base pool fee plus a 3% creator tax.
              Our share of it is harvested from the Pons fee escrow and split 30% to the miners' pot
              (buybacks) and 70% to the project treasury.
            </P>
          </section>

          <section className="space-y-3">
            <H id="upgrades">Overclock & fusion</H>
            <P>
              <b className="text-ink">Overclock</b> raises a card's hashrate by +20% per level, up to
              +100% at level 5. The cost doubles each level and scales with the card's base power. The
              card must be in your wallet (unplugged) to overclock.
            </P>
            <P>
              <b className="text-ink">Fusion</b> combines two identical-tier cards plus a small fee
              into one card of the next tier, at level 0. Both inputs are burned forever — fusion is
              the only path to the Singularity ∞ and beyond, and it permanently shrinks the
              collection while concentrating hashrate.
            </P>
          </section>

          <section className="space-y-3">
            <H id="workshop">Workshop</H>
            <P>
              The workshop is pure cosmetics. Burn $GPU to reroll a card's appearance — chassis,
              color, accent, finish, lights, decal, screen — or burn again to seal it permanently.
              Hashrate, earnings, rank and rarity are never touched. Burned tokens go straight to the
              dead address; the workshop never holds a balance.
            </P>
          </section>

          <section className="space-y-3">
            <H id="trust">Trust & contracts</H>
            <P>The protocol is deliberately hard to abuse. Here's exactly who can do what:</P>
            <ul className="space-y-2 text-[14px] leading-7 text-muted">
              <li>• <b className="text-ink">The Rig</b> has no owner — no pause, no parameter changes, no withdraw. Staked cards are untouchable by anyone but their owner.</li>
              <li>• <b className="text-ink">The keeper</b> has one privilege: buy $GPU with the pot, bounded by a minimum output and verified by balance change. It cannot pay itself or move your cards.</li>
              <li>• <b className="text-ink">The royalty router</b> has no owner at all — a hardcoded split, anyone can trigger it.</li>
              <li>• The team's surface is limited to art metadata, the permit signer, and a band-limited burn dial — none of which can touch cards or the miners' pot.</li>
            </ul>
            <div className="panel space-y-3 p-4">
              {[
                ["$GPU token", addresses.gpu],
                ["Card collection", addresses.card],
                ["Shop (mint)", addresses.shop],
                ["Rig (staking)", addresses.rig],
                ["Buyback vault (holds the pot)", addresses.vault],
                ["Buyback wallet (executes every buy)", KEEPER_ADDRESS],
                ["Fee router", addresses.feeRouter],
              ].map(([label, a]) => (
                <div key={label as string}>
                  <div className="label mb-0.5">{label}</div>
                  <Addr a={a as string} />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <H id="fairness">Fairness & randomness</H>
            <P>
              Your tier is decided before your transaction exists. When you mint, the site signs a
              permit containing a sealed random seed; your tiers are then derived on-chain from
              keccak(seed, your address, serial). Anyone can recompute their roll afterwards from the
              public seed, and neither you nor the team can steer a roll once the permit is signed.
            </P>
            <P>
              There are no mint caps, cooldowns, or allowlists — contracts can't mint (only real
              wallets can), and each permit is single-use. Mint as many as you want, whenever you
              want, until the 10,000 are gone.
            </P>
          </section>

          <section className="space-y-3">
            <H id="risks">Risks</H>
            <P>
              This is a game, not an investment product, and nothing here is financial advice. Yield
              floats with real activity — if minting, upgrading, and trading slow down, the stream
              thins, and no one can print tokens to fake it. The code is public but{" "}
              <b className="text-ink">unaudited</b>. There is smart-contract risk, market risk, and
              the ordinary risk that a game economy depends on people wanting to play.
            </P>
            <P className="text-ink">Only spend what you are happy to lose.</P>
            <div className="flex gap-4 pt-2">
              <a href={links.github} target="_blank" rel="noreferrer" className="btn-ghost">READ THE CODE</a>
              <a href="#/" className="btn-primary">← BACK TO THE RIG</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
