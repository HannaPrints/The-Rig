/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOP_ADDRESS?: string;
  readonly VITE_RIG_ADDRESS?: string;
  readonly VITE_CARD_ADDRESS?: string;
  readonly VITE_GPU_ADDRESS?: string;
  readonly VITE_SIGNER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
