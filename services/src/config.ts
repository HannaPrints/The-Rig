import { defineChain } from "viem";

export const robinhoodChain = defineChain({
  id: Number(process.env.CHAIN_ID ?? 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  // shared
  rpcUrl: process.env.RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com",

  // signer service
  signerPk: () => required("SIGNER_PK") as `0x${string}`,
  shopAddress: () => required("SHOP_ADDRESS") as `0x${string}`,
  signerPort: Number(process.env.SIGNER_PORT ?? 8787),
  permitTtlSeconds: Number(process.env.PERMIT_TTL_SECONDS ?? 300), // 5-minute deadline

  // keeper service
  keeperPk: () => required("KEEPER_PK") as `0x${string}`,
  vaultAddress: () => required("VAULT_ADDRESS") as `0x${string}`,
  // "curve" until $GPU graduates off the Pons bonding curve, then "univ3"/v4
  quoteMode: (process.env.QUOTE_MODE ?? "curve") as "curve" | "univ3",
  curveAddress: () => required("CURVE_ADDRESS") as `0x${string}`,
  feeRouterAddress: () => (process.env.FEE_ROUTER_ADDRESS ?? "") as `0x${string}` | "",
  quoterAddress: () => required("QUOTER_ADDRESS") as `0x${string}`,
  gpuAddress: () => required("GPU_TOKEN") as `0x${string}`,
  wethAddress: () => required("WETH_ADDRESS") as `0x${string}`,
  poolFee: Number(process.env.POOL_FEE ?? 10_000), // Pons pools charge 1%
  intervalMs: Number(process.env.KEEPER_INTERVAL_MS ?? 12 * 60 * 60 * 1000), // one 12h window
  minEthWei: BigInt(process.env.MIN_ETH_WEI ?? 50_000_000_000_000_000n), // 0.05 ETH floor
  maxImpactBps: Number(process.env.MAX_IMPACT_BPS ?? 300), // refuse buys > 3% price impact
  slippageBps: Number(process.env.SLIPPAGE_BPS ?? 100), // minOut cushion vs quote
};
