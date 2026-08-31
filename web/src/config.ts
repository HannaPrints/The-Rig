const addr = (v: string | undefined, fallback: `0x${string}`) =>
  v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as `0x${string}`) : fallback;

/** LIVE on Robinhood Chain mainnet since 2026-08-31 — these addresses are
 *  immutable, so they're baked in as defaults (env can still override). */
export const addresses = {
  shop: addr(import.meta.env.VITE_SHOP_ADDRESS, "0x7aa6c2a24834d86E153155ac12C99FA622A41Cd6"),
  rig: addr(import.meta.env.VITE_RIG_ADDRESS, "0x95C29bC5b83b662b335094E468911192DbBa0088"),
  card: addr(import.meta.env.VITE_CARD_ADDRESS, "0xA35eC0E14fB2b325CcA9EB0Caf3E9CBDB1A8ACB6"),
  gpu: addr(import.meta.env.VITE_GPU_ADDRESS, "0x3Da22F970a0a048d3830fDE22b94017B83a3802E"),
  vault: addr(import.meta.env.VITE_VAULT_ADDRESS, "0xcA1654Fa5815Db81674655830d4356D0A212c221"),
  feeRouter: addr(import.meta.env.VITE_FEEROUTER_ADDRESS, "0x1C92372E0f2D0eD1CF716632734f041C57f60a8F"),
};

/** Empty = same-origin serverless function at /api/permit (ships with the site). */
export const signerUrl: string = import.meta.env.VITE_SIGNER_URL ?? "";
export const permitEndpoint = signerUrl ? `${signerUrl}/permit` : "/api/permit";

export const deployed = true;

export const openSeaUrl = `https://opensea.io/assets/robinhood/${addresses.card.toLowerCase()}`;

/** The EOA that executes buybacks — its transaction history IS the proof. */
export const KEEPER_ADDRESS = "0x16CFB325A74A0b52B7fCb2EcC5347abC3053bF9B";

const explorer = "https://robinhoodchain.blockscout.com";

export const links = {
  openSea: openSeaUrl,
  github: "https://github.com/HannaPrints/The-Rig",
  docs: "https://github.com/HannaPrints/The-Rig/blob/main/docs/DEEPDIVE.md",
  explorer,
  x: "https://x.com/TheRigRH",
  site: "https://www.therig.sh",
  // buyback proof: the keeper's tx list + the vault that holds the pot
  keeper: `${explorer}/address/${KEEPER_ADDRESS}`,
  vault: `${explorer}/address/${addresses.vault}`,
  gpuToken: `${explorer}/token/${addresses.gpu}`,
};

export const TIERS = [
  { name: "Spud GT 210", rarity: "Common", mh: 10, odds: "52%", color: "#9fb4a6" },
  { name: "Miner MX 450", rarity: "Uncommon", mh: 25, odds: "26%", color: "#3ce97e" },
  { name: "Volt VX 3060", rarity: "Rare", mh: 60, odds: "13%", color: "#5db2ff" },
  { name: "Blaze BZ 4080", rarity: "Epic", mh: 150, odds: "7%", color: "#c77dff" },
  { name: "Quantum QX 9090", rarity: "Legendary", mh: 400, odds: "2%", color: "#f0a850" },
  { name: "Singularity ∞", rarity: "Mythic", mh: 1000, odds: "fusion only", color: "#ff6b6b" },
  { name: "???", rarity: "Forged", mh: 2500, odds: "fusion only", color: "#ffffff" },
] as const;
