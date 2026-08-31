import { defineChain } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    // The public RPC sends a broken CORS header, so browser reads go through our
    // same-origin /api/rpc proxy by default. Override with VITE_RPC_URL only if
    // you have a provider (Alchemy/dRPC) that serves correct CORS directly.
    default: {
      http: [
        import.meta.env.VITE_RPC_URL ||
          (typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : "https://rpc.mainnet.chain.robinhood.com"),
      ],
    },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});
