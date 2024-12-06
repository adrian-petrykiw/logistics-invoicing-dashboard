import { FC, PropsWithChildren, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ParticleAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import toast from "react-hot-toast";

const WalletProviderComponent: FC<PropsWithChildren> = ({ children }) => {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";

  const wallets = useMemo(
    () => [
      new ParticleAdapter({
        config: {
          projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID!,
          clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY!,
          appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID!,
          chainName: "solana",
          chainId: 101,
          wallet: {
            displayWalletEntry: true,
            uiMode: "dark",
            customStyle: {
              light: {
                colorAccent: "#1A1A1A",
                colorPrimary: "#1A1A1A",
                primaryButtonTextColor: "#FFFFFF",
              },
            },
          },
        },
        login: {
          preferredAuthType: "email",
          supportAuthTypes: "email,google",
          hideLoading: false,
        },
      }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true} // We can keep this true now
        onError={(error) => {
          // Only show error if it's not from Phantom
          if (!error.message?.includes("User rejected the request")) {
            console.error("Wallet error:", error);
            toast.error("Wallet error: Please try reconnecting");
          }
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProviderComponent;
