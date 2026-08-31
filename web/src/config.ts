const addr = (v: string | undefined) =>
  v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as `0x${string}`) : undefined;

/** Contract addresses land here after the Robinhood Chain deployment. Until then the
 *  site runs in pre-launch mode: every counter reads zero, exactly like day zero. */
export const addresses = {
  shop: addr(import.meta.env.VITE_SHOP_ADDRESS),
  rig: addr(import.meta.env.VITE_RIG_ADDRESS),
  card: addr(import.meta.env.VITE_CARD_ADDRESS),
  gpu: addr(import.meta.env.VITE_GPU_ADDRESS),
};

export const signerUrl: string = import.meta.env.VITE_SIGNER_URL ?? "";

export const deployed = Boolean(addresses.shop && addresses.rig);

/** Deterministic deployment address for the card collection (deployer nonce 4) —
 *  OpenSea indexes Robinhood Chain natively, so this resolves once we deploy. */
const PREDICTED_CARD = "0xA35eC0E14fB2b325CcA9EB0Caf3E9CBDB1A8ACB6";

export const openSeaUrl = `https://opensea.io/assets/robinhood/${(addresses.card ?? PREDICTED_CARD).toLowerCase()}`;

export const links = {
  openSea: openSeaUrl,
  github: "https://github.com/HannaPrints/The-Rig",
  docs: "https://github.com/HannaPrints/The-Rig/blob/main/docs/DEEPDIVE.md",
  explorer: "https://robinhoodchain.blockscout.com",
  x: "https://x.com/TheRigRH",
  site: "https://www.therig.sh",
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
