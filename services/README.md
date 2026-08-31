# The Rig — off-chain services

Two small processes. Neither ever custodies user funds.

## Permit signer (`npm run signer`)

Issues the EIP-712 `MintPermit` the Shop requires. The permit is both the bot gate
(hand-out sits behind `passesBotCheck` — wire Turnstile/hCaptcha there) and the
**committed randomness**: the `seed` is generated before the mint executes and tiers
derive on-chain from `keccak(seed, minter, serial)`. Nobody can steer a roll after
the fact, and anyone can re-verify their tiers from the public seed.

| Env | Meaning |
|---|---|
| `SIGNER_PK` | dedicated hot key (rotate via `Shop.setSigner` if it leaks) |
| `SHOP_ADDRESS` | deployed Shop |
| `CHAIN_ID` | default `4663` (Robinhood Chain mainnet) |
| `SIGNER_PORT` | default `8787` |

`POST /permit {"to": "0x…", "qty": 1..50}` → `{seed, nonce, deadline, signature}`. No mint caps or cooldowns exist on-chain; the service only rate-limits enough to stay standing.

## Buyback keeper (`npm run keeper`)

Every 12-hour window: pot ETH → open-market $GPU → `Rig.notifyRewardAmount`.
Pons creator fees are **not** auto-claimed — they sit in the Pons escrow until ops
manually calls `feeRouter.sweepAndHarvest()` (30% pot / 70% treasury).
Implements the impact ceiling by probing the pool's marginal price and halving the
buy until average execution is within `MAX_IMPACT_BPS`, so deep pots ladder across
windows instead of donating slippage. The vault re-verifies output by balance delta
on-chain; the keeper key can only trigger buys, never withdraw.

| Env | Meaning |
|---|---|
| `KEEPER_PK` | keeper hot key (only privilege: trigger buys) |
| `VAULT_ADDRESS` / `GPU_TOKEN` / `WETH_ADDRESS` / `QUOTER_ADDRESS` | wiring |
| `POOL_FEE` | default `10000` (the Pons 1% tier) |
| `MAX_IMPACT_BPS` | default `300` |
| `SLIPPAGE_BPS` | default `100` |
| `KEEPER_INTERVAL_MS` | default 12h |
| `MIN_ETH_WEI` | default 0.05 ETH — dust floor |

```bash
cd services && npm install && npm run typecheck
```
