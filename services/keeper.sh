#!/usr/bin/env bash
# Single-instance keeper manager. Usage: ./keeper.sh {start|stop|restart|status|log}
# Reads config from ../.env. Uses a pidfile + pkill by script path so duplicates
# can't pile up (they have, repeatedly — the process shows as `node … src/keeper.ts`,
# so match on that path, not "tsx").
set -euo pipefail
cd "$(dirname "$0")"
PIDFILE=/tmp/therig-keeper.pid
LOG=/tmp/keeper.log
MATCH='src/keeper.ts'

set -a; source ../.env; set +a

running() { pgrep -f "node.*$MATCH" | head -1; }

stop() {
  for pid in $(pgrep -f "node.*$MATCH"); do kill -9 "$pid" 2>/dev/null || true; done
  rm -f "$PIDFILE"; sleep 2
  echo "stopped."
}

start() {
  if [ -n "$(running)" ]; then echo "already running (pid $(running)) — use restart"; exit 0; fi
  setsid bash -c "cd '$PWD' && \
    RPC_URL='$RPC_URL' KEEPER_PK='$KEEPER_PK' VAULT_ADDRESS='$VAULT_ADDRESS' \
    CURVE_ADDRESS='$CURVE_ADDRESS' GPU_TOKEN='$GPU_TOKEN' WETH_ADDRESS='$WETH_ADDRESS' \
    FEE_ROUTER_ADDRESS='$FEE_ROUTER_ADDRESS' FEE_ESCROW='$FEE_ESCROW' \
    TREASURY_PK='$TREASURY_PK' SWEEP_TO='$SWEEP_TO' ADAPTER_ADDRESS='$ADAPTER_ADDRESS' \
    QUOTE_MODE='${QUOTE_MODE:-adapter}' KEEPER_INTERVAL_MS='${KEEPER_INTERVAL_MS:-120000}' \
    MIN_ETH_WEI='${MIN_ETH_WEI:-10000000000000000}' \
    exec npx tsx src/keeper.ts" >"$LOG" 2>&1 < /dev/null &
  disown || true
  sleep 12
  echo "started (pid $(running || echo '?')). tail -f $LOG"
}

case "${1:-status}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) pid=$(running); [ -n "$pid" ] && echo "running (pid $pid)" || echo "not running"; tail -3 "$LOG" 2>/dev/null | tr -d '\0' ;;
  log) tail -f "$LOG" ;;
  *) echo "usage: $0 {start|stop|restart|status|log}"; exit 1 ;;
esac
