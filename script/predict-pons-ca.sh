#!/usr/bin/env bash
# Predict the exact $GPU token + bonding curve addresses the Pons V2 factory
# will deploy, by simulating the real launchToken call as our wallet (eth_call
# with a balance override — the wallet needs no funds to predict).
#
# The result is CREATE2-deterministic and front-run-proof (the salt is
# namespaced to the initiating wallet), but it is only FINAL for byte-identical
# inputs. Changing ANY of these changes the address:
#   - name/symbol/logo/description/socials
#   - creatorFeeRecipient, creatorTaxBps, buybackEnabled, salt
#   - the sending wallet
#   - factory-owner economics (pin them: EXPECTED_ECONOMICS from
#     previewLaunchEconomics; a mismatch then reverts instead of drifting)
set -euo pipefail

RPC="${RPC:-https://rpc.mainnet.chain.robinhood.com}"
FACTORY="${PONS_V2_FACTORY:-0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e}"
DEPLOYER="${DEPLOYER:?set DEPLOYER to the wallet that will send launchToken}"

NAME="${TOKEN_NAME:-GPU}"
SYMBOL="${TOKEN_SYMBOL:-GPU}"
LOGO="${TOKEN_LOGO:-}"
DESCRIPTION="${TOKEN_DESCRIPTION:-}"
TWITTER="${SOCIAL_TWITTER:-}"
TELEGRAM="${SOCIAL_TELEGRAM:-}"
DISCORD="${SOCIAL_DISCORD:-}"
WEBSITE="${SOCIAL_WEBSITE:-}"
FARCASTER="${SOCIAL_FARCASTER:-}"
FEE_RECIPIENT="${CREATOR_FEE_RECIPIENT:?set CREATOR_FEE_RECIPIENT (the PonsFeeRouter address, deployer nonce 3)}"
CREATOR_TAX_BPS="${CREATOR_TAX_BPS:-0}"
BUYBACK_ENABLED="${BUYBACK_ENABLED:-true}"
SALT="${LAUNCH_SALT:-0x0000000000000000000000000000000000000000000000000000000000000000}"
LAUNCH_CONFIG_ID="${LAUNCH_CONFIG_ID:-0}"
PAIR_TOKEN="${PAIR_TOKEN:-0x0000000000000000000000000000000000000000}" # 0x0 = native ETH curve

LAUNCH_FEE=$(cast call "$FACTORY" "launchFee()(uint256)" --rpc-url "$RPC")
ECONOMICS="${EXPECTED_ECONOMICS:-$(cast call "$FACTORY" "previewLaunchEconomics(uint256,address)(bytes32)" "$LAUNCH_CONFIG_ID" "$PAIR_TOKEN" --rpc-url "$RPC")}"

echo "factory:           $FACTORY"
echo "deployer wallet:   $DEPLOYER"
echo "launch fee:        $LAUNCH_FEE wei"
echo "economics pin:     $ECONOMICS"
echo "params:            name=$NAME symbol=$SYMBOL tax=${CREATOR_TAX_BPS}bps salt=$SALT"
echo "fee recipient:     $FEE_RECIPIENT"
echo

RESULT=$(cast call "$FACTORY" \
  "launchToken((string,string,string,string,(string,string,string,string,string),address,uint16,bool,bytes32,bytes32),uint256,address)(address,address)" \
  "(\"$NAME\",\"$SYMBOL\",\"$LOGO\",\"$DESCRIPTION\",(\"$TWITTER\",\"$TELEGRAM\",\"$DISCORD\",\"$WEBSITE\",\"$FARCASTER\"),$FEE_RECIPIENT,$CREATOR_TAX_BPS,$BUYBACK_ENABLED,$ECONOMICS,$SALT)" \
  "$LAUNCH_CONFIG_ID" "$PAIR_TOKEN" \
  --value "${LAUNCH_FEE%% *}" --from "$DEPLOYER" \
  --override-balance "$DEPLOYER:1000000000000000000" \
  --rpc-url "$RPC")

TOKEN=$(echo "$RESULT" | sed -n 1p)
CURVE=$(echo "$RESULT" | sed -n 2p)
echo "predicted \$GPU token: $TOKEN"
echo "predicted curve:      $CURVE"
