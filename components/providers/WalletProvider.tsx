import { FC, PropsWithChildren, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ParticleAdapter } from "@solana/wallet-adapter-wallets";
import { WalletError } from "@solana/wallet-adapter-base";
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

  const onError = (error: WalletError) => {
    if (
      error.message.toLowerCase().includes("cancel") ||
      error.message.toLowerCase().includes("user rejected") ||
      error.name === "WalletConfigError"
    ) {
      console.log("User cancelled wallet operation:", error.message);
      return;
    }
    console.error("Wallet error:", error);
    toast.error("Wallet error: Please try reconnecting");
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider autoConnect={true} wallets={wallets} onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProviderComponent;
