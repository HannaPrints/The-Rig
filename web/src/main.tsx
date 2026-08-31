import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./wagmi";
import App from "./App";
import "./index.css";

// staleTime dedupes identical reads across components (e.g. madeCount used in
// Hero + Network + MintPanel → one fetch), and we don't refetch on focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 12_000, refetchOnWindowFocus: false, retry: 2 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
