# RIG on Robinhood Chain — Protocol Deep Dive & Funding Architecture

*Source concept: https://www.ponsrig.xyz/ ("GPU" — a Solana mining game, never launched: 0 mints, 0 miners, all counters at zero). Target: EVM port on Robinhood Chain, 10,000-card mint at $5, token launched on Pons.*

---

## 1. The original protocol, completely mapped

### Core loop
> burn $GPU → mint card → slot into rig → mine $GPU → claim → spend into upgrades → mine harder

Players buy NFT graphics cards, slot them into a virtual rig, and the cards "mine" $GPU continuously. **The token is never emitted — every $GPU a miner earns was bought on the open market with money other players spent.** This is the single most important design fact: the protocol is a revenue-share machine dressed as a mining game.

### The token
- 1,000,000,000 fixed supply, launched on Pump.fun, mint authority revoked in the launch transaction.
- No treasury unlock, no team allocation, no emission. The game can only *buy* and *burn* it.
- Dual role: reward asset (streamed to miners) and burn currency (consumed by mints, workshop, gates).

### The 70/30 rule (applies to every single revenue stream)
| Source | Original price | 70% → miners' buyback pot | 30% → project |
|---|---|---|---|
| Card mint | 0.35 SOL (max 8/tx) | 0.245 SOL | 0.105 SOL |
| Overclock fee | `baseMH × 0.004 SOL × 2^level` | 70% | 30% |
| Fusion fee | `baseMH × 0.001 SOL` | 70% | 30% |
| Rack purchase | `0.875 SOL × n` | 70% | 30% |
| Secondary royalties | via RoyaltyRouter | 70% | 30% |

### Card tiers
| Tier | Model | Base MH/s | Mint odds |
|---|---|---|---|
| T1 Common | Spud GT 210 | 10 | 52% |
| T2 Uncommon | Miner MX 450 | 25 | 26% |
| T3 Rare | Volt VX 3060 | 60 | 13% |
| T4 Epic | Blaze BZ 4080 | 150 | 7% |
| T5 Legendary | Quantum QX 9090 | 400 | 2% |
| T6 Mythic | Singularity ∞ | 1,000 | fusion only (2× Quantum) |
| T7 "Forged" | (listed on /gpus, undocumented) | ? | presumably fusion of 2× Singularity |

Expected value per mint: `0.52×10 + 0.26×25 + 0.13×60 + 0.07×150 + 0.02×400 = 38 MH/s` (site confirms "average card produces 38 MH/s").

### Supply mechanics
- Hard cap 2,500 cards, enforced in-contract ("the site stops signing mints at 2,500").
- "Made" vs "living" tracked separately: fusion permanently retires two cards and creates one — the living supply only shrinks. Power concentrates over time.
- **Burn gate at mint**: 50,000 $GPU burned per mint (no escrow — burned from the minter's balance inside the mint tx). At cap: 2,500 × 50,000 = 125M = 12.5% of total supply burned. The burn amount is a single retunable dial, band-limited at deploy (1,000–200,000) so it can never hit zero or become absurd.

### The stream (payout engine)
- Synthetix-style drip: `rate = ($GPU unstreamed + newly bought) ÷ 12 hours`.
- Every staked card accrues **every second, pro-rata by hashrate**: `your rate = stream × your MH ÷ network MH`.
- Purchase-to-payout window: 12 hours. New buybacks fold into the next window.
- Stream pauses when the rig is empty — "time never steals from miners."
- Competitive dilution is the difficulty mechanism: more cards online → each earns less.

### The keeper (buyback bot)
- Sole privilege: swap pot SOL → $GPU (via Jupiter) into the rig vault. One fixed output mint address.
- Bounded by **minimum output + price-impact ceiling** — "refuses any buy whose price impact is over its ceiling" (anti-slippage-waste, also means buybacks ladder in during dumps rather than market-buying into thin books).
- Verified by vault balance delta, so a malicious route simply reverts. Cannot redirect funds or touch staked cards.

### Upgrades
- **Overclock**: +20% of base hashrate per level, max +100% at level 5. Cost doubles per level. Card must be unslotted; rig re-reads hashrate on reinsertion.
- **Fusion**: 2 identical-tier cards + fee → 1 next-tier card at level 0 (overclock levels are lost — a real sacrifice).
- **Racks**: room starts with 4 slots; each rack adds 4; max 12 racks = 52 slots; price scales with rack count.
- **Workshop**: pure cosmetics. Burn $GPU to reroll chassis/color/accent/finish/lights/decal/screen; burn again to seal permanently. Tokens go to `0x…dEaD`; workshop never holds a balance. No gameplay effect.
- **Hold gate**: must *hold* (not spend) 100,000 $GPU to use workshop or overclock. Mining, claiming, shelving, selling are never gated.

### Anti-bot (three layers)
1. `mint()` refuses contracts (EOA-only) — kills tier-sniping revert bots.
2. EIP-712 permit signed by the site behind a bot check; 5-minute deadline; on-chain nonce burn.
3. Global throttle: 400 mints/hour on-chain + 30s per-wallet cooldown. "Sold out in 10 minutes is mathematically impossible" — the mint is a marathon by design.

### Trust model
- **Rig contract: no owner.** No pause, no parameter changes, no withdraw function.
- **Keeper: one privilege** (buy the token), bounded and verifiable.
- **Collection owner surface**: metadata URI, throttle tuning, royalty config, sweeping the project's 30% — cannot touch cards or the miners' 70%.
- **RoyaltyRouter: no owner at all.** Hardcoded 70/30, immutable addresses, permissionless flush.
- Randomness: slot-derived pseudo-randomness (recent blockhash + payer + serial) — tier assignment only.

> **Notable:** the original docs are already written in EVM idiom — `mint()` refusing contracts, EIP-712 permits, burns to `0x…dEaD`. Your friend designed this with EVM semantics in mind. The port is nearly 1:1.

---

## 2. Why the Pons version is economically *stronger* than the original

The original is a **closed loop**: miners are paid exclusively from other players' spend (mints, fees). When mint/upgrade activity slows, yield decays toward zero. That's the known weakness of every mining game.

Your version adds an **exogenous revenue stream**: the token's own trading volume.

**Pons mechanics (verified):**
- Non-custodial launchpad, exclusive to Robinhood Chain. Fixed 1B supply per launch (same as the original $GPU — convenient). Launch fee 0.0005 ETH. Tradeable from block one.
- V2 runs on a **Uniswap v4 hook with an ETH-denominated bonding curve**.
- Every trade pays a **1% pool fee → 70% to creator, 30% to protocol** (80% of the protocol's cut buys back $PONS).
- **V2 pays creator fees in ETH, in real time** — no need to dump our own token to fund operations, and ETH is exactly what the buyback keeper spends.

**The flywheel:**
```
trading volume → 0.7% of volume in ETH → buyback vault → keeper buys $GPU
   → streamed to rigs → visible yield → more mints/overclocks/fusions
   → more token demand (burn gates + speculation) → more volume → …
```

**Recursive rebate:** the keeper's buybacks route through our own Pons pool — so every $1 of buyback pays the 1% fee and returns $0.007 to us. Buybacks are self-discounting and *count as volume*, which feeds leaderboard/trending visibility on Pons.

---

## 3. EVM architecture (Robinhood Chain)

Chain facts: public EVM L2 on Arbitrum Orbit (Nitro stack), mainnet live July 1, 2026, ETH gas, permissionless deployment. Day-one partners: **Uniswap v4** (where Pons pools live), **Chainlink**, Alchemy, BitGo. Tokenized stocks/ETFs live on-chain.

### Contract set (6 contracts)

1. **`RigCard` (ERC-721)** — tier, serial, overclock level, sealed-cosmetics flag on-chain; art via metadata URI (owner-swappable for migrations, as in the original). `fuse()` burns two, mints one.
2. **`Shop`** — mint at $5 (ETH-priced via Chainlink ETH/USD so the sticker stays $5), max 8/tx, 10,000 cap, EIP-712 permit gate, global throttle + wallet cooldown. Splits every payment 70/30 at the point of receipt.
3. **`Rig`** — staking + Synthetix `StakingRewards` accumulator (this is literally the drip model the original cites). "Per-second streaming" is just `rewardPerToken` math — zero gas between claims. `notifyRewardAmount()` restarts the 12h window, rolling unstreamed remainder forward, exactly like the original. Weight = effective MH (base × overclock multiplier). No owner.
4. **`BuybackVault` + keeper bot** — receives: 70% of all Shop/upgrade fees, claimed Pons creator fees (ETH), 70% of royalties. Keeper's only call: `buy(minOut, maxImpact)` swapping ETH → $GPU through the Pons/Uniswap v4 pool, then `notifyRewardAmount` on the Rig. Enforce min-output + price-impact ceiling on-chain; verify by vault delta.
5. **`RoyaltyRouter`** — ERC-2981, no owner, hardcoded 70/30, permissionless `flush()`.
6. **`Workshop`** — burn $GPU to `0x…dEaD` for reroll/seal; band-limited price dials; 100k hold-gate check (`balanceOf`, not transfer).

### Two Solana→EVM traps to not copy blindly

- **Randomness:** the original uses recent-blockhash randomness. On Arbitrum-stack chains `block.prevrandao` is a **constant** and blockhashes are sequencer-influenced — do not port this. Cheapest correct fix: you already sign an EIP-712 permit per mint — **embed a server-generated random seed in the permit** and mix it with `msg.sender` + serial on-chain. Zero extra gas, zero oracle cost, and the site can't retroactively cheat because the permit commits the seed before the tier is computed. (Chainlink VRF is available on-chain if you want maximal trustlessness later; at $5/card, permit-seed is proportionate.)
- **Royalties:** on Solana, Magic Eden enforces royalties; on EVM they're opt-in per marketplace. Treat secondary royalties as a bonus, not a pillar. The primary engine is the Pons fee anyway.

Gas reality on Orbit: keeper runs 2–4 tx/day (buyback + notify per 12h window) at effectively pennies. Claim/stake/mint are all cheap for users. Streaming costs nothing because it's accumulator math.

---

## 4. Rescaling the numbers: 2,500 × 0.35 SOL → 10,000 × $5

Keep every ratio anchored to the mint price (original formulas are all mint-relative):

| Parameter | Original | Yours ($5 mint) |
|---|---|---|
| Supply | 2,500 | 10,000 |
| Mint price | 0.35 SOL | $5 in ETH (Chainlink-pegged) |
| Mint split | 0.245 / 0.105 SOL | $3.50 buybacks / $1.50 project |
| Overclock | `baseMH × 0.004 SOL × 2^lvl` | `baseMH × $0.0571 × 2^lvl` (= mint/87.5) |
| Fusion | `baseMH × 0.001 SOL` | `baseMH × $0.0143` (= mint/350) |
| Rack n | `0.875 SOL × n` | `$12.50 × n` (= 2.5 × mint) |
| Mint burn gate | 50,000 $GPU (12.5% at cap) | 12,500 $GPU keeps the identical 12.5%-of-supply burn at cap; band 250–50,000 |
| Full network | 2,500 × 38 = 95,000 MH | 10,000 × 38 = **380,000 MH** |

Worked examples at your scale: overclocking a Common to L5 costs ~$35 total; a Legendary to L5 ~$1,417 (the whale sink); fusing 2 Quantums → Singularity costs $5.71 + sacrifices a card's worth of supply; maxing racks (52 slots) costs $975 total.

**The "free mint" tension:** the original requires burning $GPU *at mint* — that's the mint's buy-pressure engine, but it contradicts "$5 free mint" (users must first buy 12,500 $GPU off the curve). Recommendation: **keep the burn gate but launch the token 5–7 days before the mint**, when 12,500 $GPU costs cents on the fresh Pons curve. Early minters get a nearly-free burn; the mechanic (and the 125M cumulative burn) stays intact; the act of acquiring the burn amount bootstraps your Pons volume before a single card exists. If you'd rather have a pure $5 mint, drop the burn for genesis only and keep all post-mint burns (workshop, hold-gates) — but you lose the strongest day-one buy-pressure loop.

---

## 5. Funding the tech: full revenue & cost model

### Revenue streams
1. **Mint (one-time):** 10,000 × $5 = **$50,000** → $35,000 seeds the first buyback windows, $15,000 to project ops.
2. **Pons creator fee (recurring, the real engine):** 0.7% of all $GPU trading volume, paid in ETH, claimable continuously.
3. **In-game fees (recurring):** overclocks, fusions, racks, workshop — 70/30 like everything else.
4. **Secondary royalties:** 70/30 through the router; treat as bonus on EVM.
5. **Buyback rebate:** 0.7% of every buyback returns via the creator fee.

### Recommended split of the Pons creator fee (hardcode it in a router, mirror the trust model)
- **80% → BuybackVault** (miner yield)
- **20% → ops multisig** (infra, art, audits, growth)

Publishing this split as an immutable contract is itself marketing — it's the same "the code can't rug you" posture the original's docs are built on.

### Volume scenarios (creator fee = 0.7% of volume; 80% of that to miners)
| $GPU volume/day | Creator fee/day | To miners/day | To ops/day | Avg card (38 MH) earns/day | Payback on $5 |
|---|---|---|---|---|---|
| $50k (quiet) | $350 | $280 | $70 | $0.028 | ~6 months |
| $250k (steady) | $1,750 | $1,400 | $350 | $0.14 | ~5 weeks |
| $1M (hot) | $7,000 | $5,600 | $1,400 | $0.56 | ~9 days |
| $5M (launch mania) | $35,000 | $28,000 | $7,000 | $2.80 | ~2 days |

(Per-MH: divide miners/day by 380,000. A Legendary at 400 MH earns ~10.5× the average card. Yield floats with volume — the protocol **never owes anyone a fixed return**, which is why it can't go insolvent: payouts are purchases, not liabilities.)

### Cost side
| Item | Cost |
|---|---|
| RPC (Alchemy, on-chain from day one) | $0–300/mo |
| Indexer (SQD/Subsquid supports Robinhood Chain; or self-hosted Ponder) | $0–100/mo |
| Frontend hosting + domain | $20–50/mo |
| Keeper bot + permit-signing service (small VPS, HSM/KMS for the signer key) | $30–60/mo |
| Keeper gas (2–4 tx/day on Orbit) | ~$1–5/mo |
| Chainlink ETH/USD feed reads | negligible (read-only) |
| **Recurring total** | **≈ $150–500/mo** |
| Generative art set (7 tiers × cosmetics matrix) | $2–10k one-time |
| Audit (6 contracts, this scope) | $15–40k tier-1 firm, or ~$5–10k via contest (Code4rena/Sherlock) |
| Pons launch fee | 0.0005 ETH |

The $15k project share of the mint alone covers a contest-grade audit plus a year of infra. Everything after that, the 30% fee share and 20% of creator fees fund ops with a wide margin. **The tech is cheap; the payouts fund themselves.**

---

## 6. Launch sequence

1. **T-4 weeks:** contracts on Robinhood testnet (live since Feb 2026); art; audit begins.
2. **T-1 week:** launch $GPU on Pons (0.0005 ETH). Announce the mint-burn requirement immediately — acquiring 12,500 $GPU becomes the pre-mint meta and seeds volume/fee revenue *before* the mint.
3. **T-0:** open the shop. Throttle math: 400 mints/hr global means a 10,000 sellout takes ≥25 hours by construction — a marathon mint that stays on timelines for a full day. First buyback window starts with the first 70% deposits; miners see the stream ticking within 12 hours of mint #1.
4. **T+1 week:** enable overclock + fusion (staggered feature drops keep attention cycles going).
5. **Ongoing:** keeper claims Pons ETH fees on a cadence (e.g., every window), folds them into buybacks; publish the vault address and a live "paid to miners" counter exactly like the original's /network page.

---

## 7. Risks & honest notes

- **Securities shape.** NFTs sold with an expectation of yield derived from the team's efforts is Howey-shaped, and you're deploying on a chain operated by a US broker-dealer where scrutiny will be above baseline. The original's own disclaimer ("only spend what you are happy to lose") is the right spirit, but get actual counsel before mint, especially around the words "free mint," "earnings," and "payouts" in marketing copy.
- **Volume dependency.** The upgrade over the original is real, but it swaps mint-dependency for volume-dependency. If trading dies, yield decays to whatever in-game fee flow remains. Never market a fixed APR.
- **Pons dependency.** Creator fees live in their v4 hook. Confirm at launch: claim mechanics, whether creators receive any allocation (pump.fun-style launchpads typically don't — which actually matches the original's "no team allocation" ethos perfectly), and what happens to fee routing if Pons upgrades again. Uniswap's pools.trade is competing hard on the same chain — a fallback plan if Pons loses is worth a paragraph in your internal docs.
- **Randomness and royalties** — see §3; don't port the Solana approaches.
- **The friend.** The site is live, branded, and has finished docs and art direction. "Never went through with it" isn't the same as "abandoned to anyone who wants it" — get their blessing in writing, ideally cut them in. Cheapest insurance you'll ever buy, and "built with the original creator" is better marketing than a fork accusation on launch day.
