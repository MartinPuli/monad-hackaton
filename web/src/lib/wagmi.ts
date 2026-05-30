import { http, createConfig } from "wagmi";
import { monadTestnet } from "viem/chains";
import { injected } from "wagmi/connectors";

// Monad testnet (chainId 10143). Imported from viem/chains — do NOT define a custom chain.
export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
});

export const CHAIN = monadTestnet;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
