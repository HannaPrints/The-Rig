import { defineChain } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    // Set VITE_RPC_URL to a dedicated endpoint (Alchemy/dRPC/QuickNode) for
    // production — the public RPC is rate-limited and not meant for app traffic.
    default: { http: [import.meta.env.VITE_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});
