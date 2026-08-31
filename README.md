# The Rig ⛏️

**A mining game on Robinhood Chain. Mint a graphics card for $5, slot it into your rig, and it earns $GPU for as long as it's plugged in.**

Building this fully in public. Every contract, every decision, every number — right here.

## How it works

- **10,000 graphics cards**, $5 each. Every card has a hashrate. Higher tier = more power:

  | Tier | Card | MH/s | Odds |
  |---|---|---|---|
  | Common | Spud GT 210 | 10 | 52% |
  | Uncommon | Miner MX 450 | 25 | 26% |
  | Rare | Volt VX 3060 | 60 | 13% |
  | Epic | Blaze BZ 4080 | 150 | 7% |
  | Legendary | Quantum QX 9090 | 400 | 2% |
  | Mythic | Singularity ∞ | 1,000 | fusion only |
  | Forged | ??? | 2,500 | fusion only |

- **One stream, every second, pro-rata by hashrate.** Rewards drip over rolling 12-hour windows. The stream pauses when the rig is empty — time never steals from miners.
- **$GPU is never minted. Only bought.** 70% of every mint, every overclock, every fusion, every rack, and 70% of the token's own trading fees buy $GPU on the open market and stream it straight to miners. The other 30% funds the project.
- **Overclock** (+20% hashrate per level, up to +100%), **fuse** two identical cards into the next tier (supply only shrinks), buy **racks** to expand your room from 4 to 52 slots.
- **Burn gate:** every mint burns 12,500 $GPU from your wallet. At full mint that's 125,000,000 — 12.5% of everything that will ever exist, gone.
- **$GPU launches on [Pons](https://pons.fun)** — 1B fixed supply, and 70% of the 1% pool fee flows back into miner buybacks forever. Volume is yield.

## Trust model

- The **Rig** has no owner. No pause, no parameter changes, no withdraw function.
- The **keeper** has one privilege: buy $GPU with the pot and hand it to the rig. Bounded by minimum output, verified by balance delta. It cannot pay itself and it cannot withdraw.
- The **RoyaltyRouter** has no owner at all — hardcoded 70/30, permissionless flush.
- Tier randomness is **committed in the signed mint permit before your tiers are computed** — reproducible by anyone, riggable by no one.
- Anti-bot by construction: contracts can't mint, permits expire in 5 minutes, 400 mints/hour on-chain, 30s wallet cooldown. A sellout takes 25+ hours, mathematically.

## Contracts

| Contract | Role |
|---|---|
| `RigCard` | ERC-721 cards: tiers, overclock levels, fusion, sealed cosmetics |
| `Shop` | Mints, overclocks, fusions, racks — every payment splits 70/30 at receipt |
| `Rig` | Staking + the 12-hour drip (Synthetix-style, per-second, pro-rata by MH) |
| `BuybackVault` | The miners' pot — ETH in, open-market $GPU out, into the stream |
| `RoyaltyRouter` | Ownerless 70/30 royalty splitter |
| `Workshop` | Cosmetics: burn $GPU to reroll or seal. Gameplay untouched |

```bash
forge build
forge test
```

Deploy (Robinhood Chain): `forge script script/Deploy.s.sol --rpc-url $RPC --broadcast` with `GPU_TOKEN`, `ETH_USD_FEED`, `SWAP_ADAPTER`, `KEEPER`, `SIGNER`, `TREASURY` set.

## Status

- [x] Protocol deep dive & economic model — [docs/DEEPDIVE.md](docs/DEEPDIVE.md)
- [x] Core contracts + test suite (26 tests)
- [ ] Pons pool swap adapter (Uniswap v4 hook integration)
- [ ] Keeper bot + permit signer service
- [ ] Robinhood Chain testnet deployment
- [ ] Audit
- [ ] Art
- [ ] $GPU launch on Pons
- [ ] Mint

## Not financial advice

Unaudited. Unlaunched. This is a game — only spend what you are happy to lose.
