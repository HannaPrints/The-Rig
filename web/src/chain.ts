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
  // Multicall3 (verified deployed) — lets wagmi aggregate the card scan and all
  // simultaneous reads into a single eth_call instead of one request per read.
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});
