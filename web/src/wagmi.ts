import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodChain } from "./chain";

export const config = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  // Batch simultaneous eth_calls into a single JSON-RPC HTTP request, and only
  // watch new blocks every 12s — the public RPC is rate-limited, and the UI's
  // client-side counters give the "live" feel without hammering it.
  transports: {
    [robinhoodChain.id]: http(undefined, { batch: { wait: 250 } }),
  },
  pollingInterval: 12_000,
  batch: { multicall: true },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
