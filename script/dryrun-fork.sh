#!/usr/bin/env bash
# Full mainnet dry run on an anvil fork of Robinhood Chain.
#
# Rehearses the ENTIRE launch against the real, live Pons contracts (which do
# not exist on the Robinhood testnet — a fork is the only faithful rehearsal):
#   nonce 0   launchToken on the real Pons V2 factory → assert CA == prediction
#   nonces 1-11  Deploy.s.sol suite → assert every address matches the plan
#   then the whole economic loop: curve trade → fee sweep (impersonated Pons
#   operator) → sweepAndHarvest 80/20 → keeper buyback → card mint with a real
#   EIP-712 permit → stake → 12h warp → claim.
#
# Requires: .env with PRIVATE_KEY (deployer), foundry. Safe: talks only to a
# local fork; the sole external traffic is anvil lazily reading mainnet state.
set -euo pipefail
cd "$(dirname "$0")/.."
source .env

PORT=8547
RPC="http://localhost:$PORT"
FORK_URL="${RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"

DEPLOYER=0x9d70e087EF8f50d2d30cE0577291D44F5083B015
FACTORY=$PONS_V2_FACTORY
PRED_TOKEN=$GPU_TOKEN
PRED_CURVE=$CURVE
PRED_FEE_ROUTER=$EXPECTED_FEE_ROUTER
ECONOMICS=0xa9fc75d4203a33fe660e8fa32c74c3aa41c1fda4bf23d3a39b6bc22a1f8b1ca7

# FRESH random wallets every run. Never use anvil's well-known dev accounts on
# a mainnet fork: their private keys are public, and on the real chain drainer
# bots hold EIP-7702 delegations on them — the fork inherits that code, and
# anything sent to them auto-forwards to the drainer. Found the hard way.
new_wallet() { cast wallet new --json | python3 -c "import json,sys; w=json.load(sys.stdin)[0]; print(w['address'], w['private_key'])"; }
read -r OPS OPS_PK < <(new_wallet)
read -r KEEPER KEEPER_PK < <(new_wallet)
read -r SIGNER SIGNER_PK < <(new_wallet)
read -r TRADER TRADER_PK < <(new_wallet)
read -r TREASURY _ < <(new_wallet)

pass() { echo "  ✔ $1"; }
py() { python3 -c "print($1)"; }
fail() { echo "  ✘ $1"; exit 1; }
assert_eq() { [ "$(echo "$1" | tr 'A-F' 'a-f')" = "$(echo "$2" | tr 'A-F' 'a-f')" ] && pass "$3" || fail "$3 (got $1, want $2)"; }

echo "── fork"
anvil --fork-url "$FORK_URL" --port $PORT --silent >/tmp/anvil-dryrun.log 2>&1 &
ANVIL_PID=$!
trap '[ "${KEEP_ANVIL:-0}" = "1" ] || kill $ANVIL_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do cast chain-id --rpc-url $RPC >/dev/null 2>&1 && break; sleep 1; done
echo "  forked block $(cast block-number --rpc-url $RPC), chain $(cast chain-id --rpc-url $RPC)"

for a in $DEPLOYER $OPS $KEEPER $TRADER; do cast rpc anvil_setBalance $a 0x8AC7230489E80000 --rpc-url $RPC >/dev/null; done
[ "$(cast nonce $DEPLOYER --rpc-url $RPC)" = "0" ] || fail "deployer nonce must be 0"

echo "── nonce 0: launch \$GPU on the real Pons V2 factory"
cast send $FACTORY \
  "launchToken((string,string,string,string,(string,string,string,string,string),address,uint16,bool,bytes32,bytes32),uint256,address)" \
  "(\"GPU\",\"GPU\",\"\",\"\",(\"\",\"\",\"\",\"\",\"\"),$PRED_FEE_ROUTER,0,true,$ECONOMICS,0x0000000000000000000000000000000000000000000000000000000000000000)" \
  0 0x0000000000000000000000000000000000000000 \
  --value 500000000000000 --private-key $PRIVATE_KEY --rpc-url $RPC >/dev/null
assert_eq "$(cast call $PRED_TOKEN 'symbol()(string)' --rpc-url $RPC | tr -d '"')" "GPU" "token CA matches prediction: $PRED_TOKEN"
assert_eq "$(cast call $PRED_CURVE 'deployer()(address)' --rpc-url $RPC)" "$PRED_FEE_ROUTER" "curve creator-fee recipient pinned to future FeeRouter"

echo "── mock ETH/USD feed (from a side account — deployer nonces stay pristine)"
FEED=$(forge create test/mocks/Mocks.sol:MockFeed --private-key $OPS_PK --rpc-url $RPC --broadcast --constructor-args 400000000000 2>/dev/null | awk '/Deployed to:/{print $3}')
echo "  feed: $FEED"

echo "── nonces 1-11: Deploy.s.sol with the fee-router pin check"
GPU_TOKEN=$PRED_TOKEN CURVE=$PRED_CURVE FEE_ESCROW=$FEE_ESCROW ETH_USD_FEED=$FEED \
KEEPER=$KEEPER SIGNER=$SIGNER TREASURY=$TREASURY EXPECTED_FEE_ROUTER=$PRED_FEE_ROUTER \
forge script script/Deploy.s.sol --rpc-url $RPC --private-key $PRIVATE_KEY --broadcast >/tmp/dryrun-deploy.log 2>&1 || { tail -5 /tmp/dryrun-deploy.log; fail "suite deploy"; }
VAULT=$(awk '/BuybackVault:/{print $2}' /tmp/dryrun-deploy.log)
SHOP=$(awk '/Shop:/{print $2}' /tmp/dryrun-deploy.log)
RIG=$(awk '/  Rig:/{print $2}' /tmp/dryrun-deploy.log)
CARD=$(awk '/RigCard:/{print $2}' /tmp/dryrun-deploy.log)
FEE_ROUTER=$(awk '/PonsFeeRouter:/{print $2}' /tmp/dryrun-deploy.log)
assert_eq "$FEE_ROUTER" "$PRED_FEE_ROUTER" "FeeRouter landed on the pinned address"
for pair in "0x98739E2bF978A856c681b98f0A8415E091eA5CF2:$(awk '/PonsCurveAdapter:/{print $2}' /tmp/dryrun-deploy.log):adapter" \
            "0xcA1654Fa5815Db81674655830d4356D0A212c221:$VAULT:vault" \
            "0xA35eC0E14fB2b325CcA9EB0Caf3E9CBDB1A8ACB6:$CARD:card" \
            "0x7aa6c2a24834d86E153155ac12C99FA622A41Cd6:$SHOP:shop" \
            "0x95C29bC5b83b662b335094E468911192DbBa0088:$RIG:rig"; do
  IFS=: read -r want got name <<< "$pair"; assert_eq "$got" "$want" "$name matches plan"
done

echo "── economic loop: trader buys 1 ETH of \$GPU on the real curve"
cast send $PRED_CURVE "buy(uint256,uint256,address)" 1000000000000000000 1 $TRADER \
  --value 1ether --private-key $TRADER_PK --rpc-url $RPC >/dev/null
pass "trader holds $(cast call $PRED_TOKEN 'balanceOf(address)(uint256)' $TRADER --rpc-url $RPC | awk '{print $1}') \$GPU"

echo "── fee sweep: impersonate Pons's fee-sweep operator, then sweepAndHarvest"
HOOK=$(cast call $PRED_CURVE "feePolicy()(address)" --rpc-url $RPC)
OPERATOR=$(cast call $HOOK "feeSweepOperator()(address)" --rpc-url $RPC)
cast rpc anvil_impersonateAccount $OPERATOR --rpc-url $RPC >/dev/null
cast rpc anvil_setBalance $OPERATOR 0xDE0B6B3A7640000 --rpc-url $RPC >/dev/null
TB_BEFORE=$(cast balance $TREASURY --rpc-url $RPC)
cast send $PRED_CURVE "sweepFees(uint256)" 1 --from $OPERATOR --unlocked --rpc-url $RPC >/dev/null
OWED=$(cast call $FEE_ESCROW "balanceOf(address)(uint256)" $FEE_ROUTER --rpc-url $RPC | awk '{print $1}')
[ "$OWED" != "0" ] && pass "escrow credits FeeRouter: $OWED wei of creator fees" || fail "no creator fees in escrow"
cast send $FEE_ROUTER "sweepAndHarvest()" --private-key $KEEPER_PK --rpc-url $RPC --json > /tmp/harvest.json
VB=$(cast balance $VAULT --rpc-url $RPC); TB=$(cast balance $TREASURY --rpc-url $RPC)
TDELTA=$(py "$TB - $TB_BEFORE")
[ "$(py "$VB * 2 == $TDELTA * 8")" = "True" ] && pass "harvested → vault $VB wei (80%), treasury +$TDELTA wei (20%) — exact split" || fail "80/20 split (vault $VB, treasury +$TDELTA)"

echo "── keeper buyback: vault ETH → \$GPU on the curve → 12h stream"
QUOTE=$(cast call $PRED_CURVE "buy(uint256,uint256,address)(uint256)" $VB 1 $VAULT --value $VB --from $VAULT --rpc-url $RPC | awk '{print $1}')
MINOUT=$(py "$QUOTE * 99 // 100")
cast send $VAULT "buy(uint256,uint256)" $VB $MINOUT --private-key $KEEPER_PK --rpc-url $RPC >/dev/null
RATE=$(cast call $RIG "rewardRate()(uint256)" --rpc-url $RPC | awk '{print $1}')
[ "$RATE" != "0" ] && pass "rig streaming at $RATE wei \$GPU/sec" || fail "stream not running"

echo "── mint: real EIP-712 permit → burn gate → 70/30 split"
cast send $PRED_TOKEN "approve(address,uint256)" $SHOP $(cast max-uint) --private-key $TRADER_PK --rpc-url $RPC >/dev/null
TS=$(cast block latest --field timestamp --rpc-url $RPC); DEADLINE=$((TS + 300))
TYPED=$(printf '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"MintPermit":[{"name":"to","type":"address"},{"name":"qty","type":"uint256"},{"name":"seed","type":"bytes32"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"primaryType":"MintPermit","domain":{"name":"TheRigShop","version":"1","chainId":4663,"verifyingContract":"%s"},"message":{"to":"%s","qty":1,"seed":"0x1111111111111111111111111111111111111111111111111111111111111111","nonce":1,"deadline":%s}}' "$SHOP" "$TRADER" "$DEADLINE")
SIG=$(cast wallet sign --data "$TYPED" --private-key $SIGNER_PK)
PRICE=$(cast call $SHOP "mintPriceWei(uint256)(uint256)" 1 --rpc-url $RPC | awk '{print $1}')
DEAD_BEFORE=$(cast call $PRED_TOKEN "balanceOf(address)(uint256)" 0x000000000000000000000000000000000000dEaD --rpc-url $RPC | awk '{print $1}')
cast send $SHOP "mint(uint256,bytes32,uint256,uint256,bytes)" 1 \
  0x1111111111111111111111111111111111111111111111111111111111111111 1 $DEADLINE $SIG \
  --value $PRICE --private-key $TRADER_PK --rpc-url $RPC >/dev/null
assert_eq "$(cast call $CARD 'ownerOf(uint256)(address)' 1 --rpc-url $RPC)" "$TRADER" "card #1 minted to trader ($PRICE wei = \$5 at \$4,000/ETH)"
DEAD_AFTER=$(cast call $PRED_TOKEN "balanceOf(address)(uint256)" 0x000000000000000000000000000000000000dEaD --rpc-url $RPC | awk '{print $1}')
[ "$(py "$DEAD_AFTER - $DEAD_BEFORE == 12500 * 10**18")" = "True" ] && pass "burn gate: 12,500 \$GPU → 0x…dEaD" || fail "burn gate"

echo "── stake → warp 12h → claim"
cast send $CARD "setApprovalForAll(address,bool)" $RIG true --private-key $TRADER_PK --rpc-url $RPC >/dev/null
cast send $RIG "stake(uint256[])" "[1]" --private-key $TRADER_PK --rpc-url $RPC >/dev/null
cast rpc evm_increaseTime 43200 --rpc-url $RPC >/dev/null && cast rpc evm_mine --rpc-url $RPC >/dev/null
EARNED=$(cast call $RIG "earned(address)(uint256)" $TRADER --rpc-url $RPC | awk '{print $1}')
[ "$EARNED" != "0" ] && pass "earned after 12h: $EARNED wei \$GPU" || fail "nothing earned"
BEFORE=$(cast call $PRED_TOKEN "balanceOf(address)(uint256)" $TRADER --rpc-url $RPC | awk '{print $1}')
cast send $RIG "claim()" --private-key $TRADER_PK --rpc-url $RPC >/dev/null
AFTER=$(cast call $PRED_TOKEN "balanceOf(address)(uint256)" $TRADER --rpc-url $RPC | awk '{print $1}')
[ "$(py "$AFTER > $BEFORE")" = "True" ] && pass "claimed $(py "$AFTER - $BEFORE") wei \$GPU to wallet" || fail "claim"

echo
echo "ALL CHECKS PASSED — the mainnet sequence is rehearsed end to end."
