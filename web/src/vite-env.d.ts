/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOP_ADDRESS?: string;
  readonly VITE_RIG_ADDRESS?: string;
  readonly VITE_CARD_ADDRESS?: string;
  readonly VITE_GPU_ADDRESS?: string;
  readonly VITE_SIGNER_URL?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_VAULT_ADDRESS?: string;
  readonly VITE_FEEROUTER_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
