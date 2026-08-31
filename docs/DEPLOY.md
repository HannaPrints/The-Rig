# Mainnet deployment runbook — Robinhood Chain (4663)

Everything below was verified against the **live** Pons V2 factory and Robinhood Chain
mainnet on 2026-08-31. Deployer wallet: `0x9d70e087EF8f50d2d30cE0577291D44F5083B015`.

## Predicted addresses

The Pons V2 factory deploys via CREATE2 with a salt **namespaced to the initiating
wallet** — nobody can front-run or squat these. Predicted by simulating the real
`launchToken` against the live factory (`script/predict-pons-ca.sh`):

| What | Address | How it's fixed |
|---|---|---|
| **$GPU token** | `0x3Da22F970a0a048d3830fDE22b94017B83a3802E` | **LIVE** — landed exactly as predicted, block 51064610, tx `0x986fd73b…0641` |
| **Bonding curve** | `0x40D74bcb15e90Af01A54301F1F0f9D1E86F4DF8B` | **LIVE** — fee recipient verified = FeeRouter pin |
| PonsCurveAdapter | `0x98739E2bF978A856c681b98f0A8415E091eA5CF2` | our nonce 1 |
| BuybackVault | `0xcA1654Fa5815Db81674655830d4356D0A212c221` | our nonce 2 |
| **PonsFeeRouter** | `0x1C92372E0f2D0eD1CF716632734f041C57f60a8F` | our nonce 3 — **pinned as creatorFeeRecipient at launch, before it exists** |
| RigCard | `0xA35eC0E14fB2b325CcA9EB0Caf3E9CBDB1A8ACB6` | our nonce 4 |
| Shop | `0x7aa6c2a24834d86E153155ac12C99FA622A41Cd6` | our nonce 5 |
| Rig | `0x95C29bC5b83b662b335094E468911192DbBa0088` | our nonce 6 |
| Workshop | `0x1446eC2ee7211064B20F4aE347e28A605ff867ea` | our nonce 8 |
| RoyaltyRouter | `0x23fB77A88cAFB1fB35513dfdd70c3319625377bC` | our nonce 10 |

### What invalidates the token/curve prediction

Byte-identical inputs or a different address. Recompute (`script/predict-pons-ca.sh`) if ANY of these change:

- token metadata — **FROZEN 2026-08-31**, stored in `.env`: name `GPU`, symbol `GPU`,
  logo `https://www.therig.sh/logo.svg`, the one-line description, twitter
  `https://x.com/TheRigRH`, website `https://www.therig.sh` (telegram/discord/farcaster
  empty). One changed character = different CA.
- `creatorFeeRecipient` (pinned: the FeeRouter above), `creatorTaxBps` (**300 — +3%
  creator tax on the 1% pool fee = 4% total per trade, tax leg 100% to our FeeRouter**),
  `buybackEnabled` (true), `salt` (0x0), launch config id (0), pair token (native ETH)
- the sending wallet, or any nonce spent from it before the planned sequence
- Pons-owner economics. Pin them: pass `expectedEconomics` (currently
  `0xa9fc75d4203a33fe660e8fa32c74c3aa41c1fda4bf23d3a39b6bc22a1f8b1ca7` from
  `previewLaunchEconomics(0, 0x0)`) so a re-peg **reverts the launch instead of
  silently changing the address**.

### What invalidates our nonce-derived addresses

Any transaction from the deployer before/besides the planned sequence. **Do not use
this wallet for anything else.** The Deploy script `require`s the FeeRouter lands on
`EXPECTED_FEE_ROUTER` and reverts otherwise.

## Live Pons/chain constants (verified on-chain)

| Constant | Value |
|---|---|
| Pons V2 factory | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` (`launchEnabled: true`) |
| Pons fee escrow | `0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e` |
| Launch fee | 0.0005 ETH (must be exact `msg.value`) |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| Curve economics (config 0) | 1B supply, 1% curve fee, 1.68 ETH phantom reserve, **graduates at 4.2 ETH** (~71.4% of supply reaches the locked v4 pool) |
| Pons V1 factory (CREATE2, `…bbbb` vanity, Uniswap v3) | `0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB` — `launchEnabled: false`, whitelist-only; not our path |

## Key hygiene

The deployer key is a **disposable hot key**: fund it with gas only (~0.02 ETH + 0.0005
launch fee), never hold protocol funds on it. Generate **separate** SIGNER and KEEPER
hot keys (they can be rotated on-chain: `Shop.setSigner`, `vault.setKeeper`). TREASURY
should be a multisig. After step 3, transfer `RigCard`/`Shop`/`Workshop` ownership to
the multisig too — the Rig and RoyaltyRouter have no owner to transfer.

## Sequence

**0. Prepare** — bridge gas ETH to the deployer; create SIGNER/KEEPER keys and the
TREASURY multisig; freeze final token metadata; re-run the prediction and update
`.env` + this table:

```bash
source .env
DEPLOYER=0x9d70e087EF8f50d2d30cE0577291D44F5083B015 \
CREATOR_FEE_RECIPIENT=$EXPECTED_FEE_ROUTER \
TOKEN_DESCRIPTION="…final copy…" SOCIAL_WEBSITE="…" \
  ./script/predict-pons-ca.sh
```

**1. Launch $GPU on Pons (deployer nonce 0).** Exact value, exact params from step 0:

```bash
source .env
ECONOMICS=$(cast call $PONS_V2_FACTORY "previewLaunchEconomics(uint256,address)(bytes32)" 0 0x0000000000000000000000000000000000000000 --rpc-url $RPC_URL)
# must equal 0xa9fc75d4203a33fe660e8fa32c74c3aa41c1fda4bf23d3a39b6bc22a1f8b1ca7 — if not, STOP and re-predict
cast send $PONS_V2_FACTORY \
  "launchToken((string,string,string,string,(string,string,string,string,string),address,uint16,bool,bytes32,bytes32),uint256,address)" \
  "(\"$TOKEN_NAME\",\"$TOKEN_SYMBOL\",\"$TOKEN_LOGO\",\"$TOKEN_DESCRIPTION\",(\"$SOCIAL_TWITTER\",\"\",\"\",\"$SOCIAL_WEBSITE\",\"\"),$EXPECTED_FEE_ROUTER,$CREATOR_TAX_BPS,true,$ECONOMICS,0x0000000000000000000000000000000000000000000000000000000000000000)" \
  0 0x0000000000000000000000000000000000000000 \
  --value 0.0005ether --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

Verify the emitted token address equals `GPU_TOKEN` in `.env` before continuing.

**2. Deploy the suite (nonces 1–11), one command:**

```bash
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

The script deploys in the load-bearing nonce order (adapter → vault → **feeRouter** →
card → shop → rig → wiring → workshop → royalties) and reverts if the FeeRouter
misses its pinned address.

**3. Post-deploy:** verify all contracts on Blockscout; transfer ownables to the
multisig; set `card.setContractURI(...)` (collection metadata OpenSea reads — the 5%
ERC-2981 royalty itself is set by the deploy script); fill service envs
(`SHOP_ADDRESS`, `VAULT_ADDRESS`); start `npm run signer` and `npm run keeper`; set
the site's `VITE_*` addresses and redeploy it.

## How the money flows after launch

```
$GPU trades on the curve (1% fee) ──► creator share accrues in the Pons escrow
        ops manually calls feeRouter.sweepAndHarvest()   (never automated;
        ├── ETH:     30% → BuybackVault, 70% → treasury   fees sit safely in
        └── fee-$GPU: 30% → BuybackVault, 70% → treasury  escrow until then)
in-game spend (mints/overclocks/fusions/racks): 70% → vault, 30% → treasury
secondary sales (OpenSea etc): 5% ERC-2981 royalty → RoyaltyRouter → 70/30 same way
BuybackVault.buy() ──► PonsCurveAdapter ──► curve ──► $GPU ──► Rig 12h stream
```

Two separate splits by design: in-game revenue keeps the original 70%-to-miners
identity; the token's trading-fee creator share routes 30% to miners / 70% to the
admin treasury. Buying through our own curve still pays the 1% fee, part of which
returns via the escrow.

## Graduation switchover (at 4.2 ETH raised)

The keeper detects `curve.graduated()` and halts with a loud log. Then:
1. Write + deploy the Uniswap v4 hook-pool adapter (the locked pool the curve seeds).
2. `vault.setAdapter(v4Adapter)` from gov.
3. Set `QUOTE_MODE=univ3` (v4 quoter) + `QUOTER_ADDRESS`, restart the keeper.

## Dry run — verified 2026-08-31 (`script/dryrun-fork.sh`)

The whole sequence rehearsed on an anvil fork of mainnet (the Robinhood testnet has
no Pons contracts — a fork is the only faithful rehearsal). All checks passed, three
independent fork blocks, same addresses every time:

- **launchToken on the real factory → token landed exactly on `0xf25E…F053`**, curve
  on `0xf16c…f5F1`, curve's fee recipient = the not-yet-deployed FeeRouter ✔
- Deploy.s.sol nonces 1–11 → all 8 contracts on their planned addresses, pin check ✔
- 1 ETH curve buy → creator fee escrowed in ETH after the buyback-and-lock slice
  (which buys $GPU off the curve and locks it — carved from the creator share,
  pre-graduation)
- operator sweep (impersonated) → manual `sweepAndHarvest()` → **exact 30/70**
  vault/treasury for both ETH and fee-$GPU ✔
- keeper `vault.buy` on the real curve → rig streaming ✔
- $5 mint with a real EIP-712 permit (0.00125 ETH at $4,000 feed), 12,500 $GPU burn
  gate — no cooldown, no hourly cap — card staked, 12h warp, **1.8M $GPU earned and
  claimed** ✔

Two findings the dry run surfaced (both fixed):

1. **Pre-graduation fee sweeps**: curve fees batch inside the curve. Pons's fee-sweep
   operator can sweep anytime; our FeeRouter (the curve's registered `deployer`) can
   sweep only while no buyback slice is pending — so `sweepAndHarvest()` sweeps
   best-effort and never blocks on the operator. Fees are never lost, only deferred
   to the next operator sweep.
2. **Never use anvil's well-known dev accounts on a mainnet fork.** Their keys are
   public and drainer bots hold EIP-7702 delegations on them on the real chain — the
   fork inherits that code and "treasury" auto-forwarded its ETH to a drainer until
   we switched to fresh random wallets. Same lesson applies to real ops keys.

## Open items

- ~~$GPU launch~~ **DONE 2026-08-31** — trading live on the Pons curve; fees accrue in
  the escrow for the FeeRouter address and are claimable once nonces 1–11 deploy.
- ~~Chainlink ETH/USD feed~~ **FOUND & VERIFIED**: `0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9`
  ("ETH / USD", 8 decimals, 24h heartbeat + deviation updates — matches the Shop's
  24h staleness window).
- **TREASURY address (blocking the suite deploy)** — must be a team-controlled
  multisig; it is immutable in Shop, PonsFeeRouter and RoyaltyRouter.
- Suite deploy = the deployer wallet's next 11 transactions, exactly. Nothing else
  from that wallet.
- Audit. Still unaudited; the mint should not open before it.
