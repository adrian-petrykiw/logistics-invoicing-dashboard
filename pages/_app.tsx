import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { Toaster } from "react-hot-toast";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { AppProps } from "next/app";
import { clusterApiUrl } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { ParticleAdapter } from "@solana/wallet-adapter-wallets";
import { ParticleNetwork } from "@particle-network/auth";
import { ReactQueryProvider } from "@/components/layout/ReactQueryProvider";
import { QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { Layout } from "@/components/layout/Layout";
import "@solana/wallet-adapter-react-ui/styles.css";
import "../styles/globals.css";

const initializeParticle = (): ParticleNetwork | undefined => {
  if (typeof window === "undefined") return undefined;

  if (!window.particle) {
    window.particle = new ParticleNetwork({
      projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID!,
      clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY!,
      appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID!,
      chainName: "solana",
      chainId: 101,
    });
  }

  return window.particle;
};

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter(); // Use hook instead of import
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      })
  );

  useEffect(() => {
    initializeParticle();
  }, []);

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const onError = useCallback((error: WalletError) => {
    console.error(error);
  }, []);

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
            displayWalletEntry: false,
            uiMode: "light",
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

  const isLandingPage = router.pathname === "/";

  return (
    <ReactQueryProvider
      client={queryClient}
      dehydratedState={pageProps.dehydratedState}
    >
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} onError={onError} autoConnect>
          <WalletModalProvider>
            {isLandingPage ? (
              <Component {...pageProps} />
            ) : (
              <Layout>
                <Component {...pageProps} />
              </Layout>
            )}
            <Toaster
              position="top-right"
              toastOptions={{
                className: "bg-tertiary text-primary",
                duration: 4000,
              }}
            />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ReactQueryProvider>
  );
}

export default MyApp;
